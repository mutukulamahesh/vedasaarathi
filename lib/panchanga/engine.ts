// Panchanga engine — sunrise, sunset, current Tithi and current Nakshatra for a
// saved location, plus the applicable-festival calculation.
//
// LIBRARY  mhah-panchang 1.2.0 (MPL-2.0, https://www.npmjs.com/package/mhah-panchang)
//
// ASTRONOMICAL CONVENTIONS (documented so results can be checked)
// - Sunrise / sunset: mhah-panchang.sunTimer() uses the SunCalc algorithm
//   (V. Agafonkin). Sunrise = the moment the sun's upper limb reaches the
//   standard −0.833° altitude (−0.5° apparent radius − 0.333° mean
//   refraction); no observer-elevation term is applied here (sea-level
//   horizon). Returns a UTC Date. We convert to the location's IANA time zone
//   for display with Intl (DST-correct).
// - Civil-date anchoring: every calculation is anchored to LOCAL NOON on the
//   requested civil date (localCivilAnchorUtc), resolved with a two-pass
//   Intl-offset computation. This is correct for every UTC offset including
//   UTC+14 (Pacific/Kiritimati) and UTC−11 (Pacific/Pago_Pago) and on DST
//   transition days — it is never a bare "12:00 UTC".
// - Tithi / Nakshatra: sidereal, computed from the Moon–Sun / Moon
//   longitudes with a Lahiri-family ayanamsa. For 2026 the library reports
//   ayanamsa ≈ 24°14′, i.e. the Chitrapaksha (Lahiri) family. calculate()
//   returns the element spanning the given instant together with its start and
//   end times. We compute BOTH: the element active at the current instant (what
//   the Home card shows) and the element prevailing at local sunrise (the
//   drik-panchang "day" value, used by the validation fixtures). An element is
//   never presented as current once its end time has passed.
// - This is NOT the drik-ganita of any one published panchang; expect sun
//   times within a couple of minutes and, near a tithi/nakshatra boundary, an
//   occasional one-step difference. Each displayed field is gated on a
//   validation fixture (see ./validation.ts).
// - Festival: the calendar day is derived by scanning forward for the target
//   lunar month + paksha + tithi. It is NOT a muhurtham and no puja timing is
//   computed. See ./validation.ts — the Vinayaka Chavithi fixture currently
//   FAILS (madhyahna-vyapti rule not modelled), so the festival day is not
//   displayed.

// mhah-panchang is loaded lazily as its own chunk: it is only needed once a
// location is saved, and keeping it out of the initial client graph avoids a
// rollup hang while bundling its CJS build.
interface NamedSpan {
  name_en_IN: string;
  end: string | number | Date;
}
interface NamedSpanFull extends NamedSpan {
  start: string | number | Date;
}
type Engine = {
  calculate: (d: Date) => {
    Tithi: NamedSpanFull; Nakshatra: NamedSpanFull; Paksha: { name_en_IN: string };
  };
  calendar: (
    d: Date, lat: number, lng: number,
  ) => { Masa?: { name_en_IN?: string; name?: string } };
  sunTimer: (d: Date, lat: number, lng: number) => { sunRise: Date; sunSet: Date };
};

let enginePromise: Promise<Engine> | null = null;

async function getEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = import("mhah-panchang").then(
      (m) => new m.MhahPanchang() as unknown as Engine,
    );
  }
  return enginePromise;
}

export interface PanchangaInput {
  /** Instant to evaluate (ms since epoch). */
  dateMs: number;
  latitude: number;
  longitude: number;
  /** IANA zone, e.g. "Asia/Kolkata". Used only for formatting. */
  timezone: string;
}

export interface PanchangaElement {
  /** English (India) name, e.g. "Chaturthi", "Ashlesha". */
  name: string;
  /** When this element began (UTC). */
  startsAt: Date;
  /** When this element ends (UTC). */
  endsAt: Date;
}

export interface PanchangaResult {
  sunrise: Date;
  sunset: Date;
  /** The instant this result was computed for (UTC ms). */
  atMs: number;
  /** Tithi + Nakshatra + Paksha active at `atMs` (the current instant). */
  tithi: PanchangaElement;
  nakshatra: PanchangaElement;
  paksha: string;
  /** Tithi + Nakshatra + Paksha prevailing at local sunrise (the drik-panchang
   * "day" value; kept for the festival calc and the validation fixtures). */
  tithiAtSunrise: PanchangaElement;
  nakshatraAtSunrise: PanchangaElement;
  pakshaAtSunrise: string;
  masa: string;
}

export interface FestivalMatch {
  name: string;
  /** Local civil date, ISO (YYYY-MM-DD). */
  dateISO: string;
  /** Whole days from `dateMs` (0 = today, negative = past). */
  inDays: number;
}

const MS_PER_DAY = 86_400_000;

/* -------------------------------------------------------------------------- */
/* Time-zone-aware civil-date anchoring                                       */
/* -------------------------------------------------------------------------- */

/** The civil Y/M/D of `utcMs` in `timeZone`. */
export function civilDateParts(utcMs: number, timeZone: string): { y: number; mo: number; da: number } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? "0");
  return { y: get("year"), mo: get("month"), da: get("day") };
}

/** Offset (ms) of `timeZone` from UTC at instant `utcMs`: local wall clock − UTC.
 * Positive east of UTC. DST-correct because it is evaluated at the instant. */
export function tzOffsetMs(utcMs: number, timeZone: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? "0");
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return asUtc - utcMs;
}

/**
 * The UTC instant that is local wall-clock `y-mo-da hh:mm:ss` in `timeZone`.
 * Two refinement passes resolve the offset even on a DST-transition day.
 */
export function localWallToUtcMs(
  y: number, mo: number, da: number, hh: number, mi: number, ss: number, timeZone: string,
): number {
  const naive = Date.UTC(y, mo - 1, da, hh, mi, ss);
  let guess = naive;
  for (let i = 0; i < 2; i += 1) guess = naive - tzOffsetMs(guess, timeZone);
  return guess;
}

/** The UTC instant of local `hour`:00 on the civil date of `dateMs` in
 * `timeZone`. Correct for every offset, including UTC+14 / UTC−11 and DST
 * days — never a bare "12:00 UTC". */
export function localCivilAnchorUtc(input: PanchangaInput, hour = 12): Date {
  const { y, mo, da } = civilDateParts(input.dateMs, input.timezone);
  return new Date(localWallToUtcMs(y, mo, da, hour, 0, 0, input.timezone));
}

/** Sunrise/sunset (UTC Date) for the REQUESTED local civil date of `dateMs`. */
export async function sunTimes(input: PanchangaInput): Promise<{ sunrise: Date; sunset: Date }> {
  const engine = await getEngine();
  const anchor = localCivilAnchorUtc(input);
  const t = engine.sunTimer(anchor, input.latitude, input.longitude);
  return { sunrise: t.sunRise as Date, sunset: t.sunSet as Date };
}

function elementOf(span: NamedSpanFull): PanchangaElement {
  return {
    name: String(span.name_en_IN),
    startsAt: new Date(span.start),
    endsAt: new Date(span.end),
  };
}

/**
 * Sunrise/sunset for the civil day of `dateMs`, plus the Tithi/Nakshatra/Paksha
 * active at `dateMs` itself AND the ones prevailing at that day's local sunrise.
 */
export async function computePanchanga(input: PanchangaInput): Promise<PanchangaResult> {
  const engine = await getEngine();
  const { sunrise, sunset } = await sunTimes(input);
  const now = engine.calculate(new Date(input.dateMs));
  const atSunrise = engine.calculate(sunrise);
  const cal = engine.calendar(sunrise, input.latitude, input.longitude);
  return {
    sunrise,
    sunset,
    atMs: input.dateMs,
    tithi: elementOf(now.Tithi),
    nakshatra: elementOf(now.Nakshatra),
    paksha: String(now.Paksha.name_en_IN),
    tithiAtSunrise: elementOf(atSunrise.Tithi),
    nakshatraAtSunrise: elementOf(atSunrise.Nakshatra),
    pakshaAtSunrise: String(atSunrise.Paksha.name_en_IN),
    masa: String(cal.Masa?.name_en_IN ?? cal.Masa?.name ?? ""),
  };
}

export interface FestivalRule {
  name: string;
  /** English (India) masa name from mhah-panchang, e.g. "Bhadraba". */
  masa: string;
  /** "Shukla" or "Krishna". */
  paksha: string;
  /** English (India) tithi name, e.g. "Chavithi" / "Chaturthi". */
  tithi: string;
}

/**
 * The next civil day (from `dateMs`, inclusive) on which `rule` holds at that
 * day's local sunrise, within `horizonDays`. This is a calendar-day
 * calculation only — never a muhurtham.
 */
export async function nextFestivalDay(
  input: PanchangaInput,
  rule: FestivalRule,
  horizonDays = 400,
): Promise<FestivalMatch | null> {
  const engine = await getEngine();
  const start = civilDateParts(input.dateMs, input.timezone);
  for (let i = 0; i < horizonDays; i += 1) {
    // Re-anchor each day to its own local noon (DST-safe), never +86.4e6 ms.
    const dayMs = localWallToUtcMs(start.y, start.mo, start.da + i, 12, 0, 0, input.timezone);
    const dayInput: PanchangaInput = { ...input, dateMs: dayMs };
    const p = await computePanchanga(dayInput);
    const cal = engine.calendar(p.sunrise, input.latitude, input.longitude);
    const masa = String(cal.Masa?.name_en_IN ?? "");
    const tithiName = tithiKey(p.tithiAtSunrise.name);
    if (masa === rule.masa && p.pakshaAtSunrise === rule.paksha && tithiName === tithiKey(rule.tithi)) {
      const iso = new Intl.DateTimeFormat("en-CA", {
        timeZone: input.timezone, year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date(dayInput.dateMs));
      return { name: rule.name, dateISO: iso, inDays: i };
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Name normalisation - the library and drik-panchang differ on spelling.    */
/* -------------------------------------------------------------------------- */

const TITHI_ALIASES: Record<string, string> = {
  padyami: "prathama", prathama: "prathama", pratipada: "prathama",
  vidhiya: "dwitiya", dwitiya: "dwitiya", dvitiya: "dwitiya",
  thadiya: "tritiya", tritiya: "tritiya", thadiga: "tritiya",
  chavithi: "chaturthi", chaturthi: "chaturthi",
  panchami: "panchami",
  shasti: "shashthi", shashthi: "shashthi", sashti: "shashthi",
  sapthami: "saptami", saptami: "saptami",
  ashtami: "ashtami",
  navami: "navami",
  dasami: "dashami", dashami: "dashami",
  ekadasi: "ekadashi", ekadashi: "ekadashi",
  dvadasi: "dwadashi", dwadashi: "dwadashi", dvadashi: "dwadashi",
  trayodasi: "trayodashi", trayodashi: "trayodashi",
  chaturdasi: "chaturdashi", chaturdashi: "chaturdashi",
  punnami: "purnima", purnima: "purnima", punnima: "purnima",
  amavasya: "amavasya", amavasai: "amavasya",
};

const NAK_ALIASES: Record<string, string> = {
  "krittika": "krittika", "kritika": "krittika",
  "aslesha": "ashlesha", "ashlesha": "ashlesha",
  "purva phalguni": "purva phalguni", "poorva phalguni": "purva phalguni",
  "uttara phalguni": "uttara phalguni",
  "purva ashadha": "purva ashadha", "poorvashada": "purva ashadha",
  "uttara ashadha": "uttara ashadha", "uttarashada": "uttara ashadha",
  "purva bhadrapada": "purva bhadrapada", "uttara bhadrapada": "uttara bhadrapada",
  "shravana": "shravana", "sravana": "shravana",
  "dhanishta": "dhanishta", "dhanistha": "dhanishta",
  "shatabhisha": "shatabhisha", "satabhisha": "shatabhisha",
};

const strip = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export const tithiKey = (name: string) => TITHI_ALIASES[strip(name)] ?? strip(name);
export const nakshatraKey = (name: string) => NAK_ALIASES[strip(name)] ?? strip(name);

/** Local wall-clock "h:mm AM/PM" for a UTC date in `timezone`. */
export function formatClock(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(date);
}

/** Local civil date "YYYY-MM-DD" for a UTC date in `timezone`. */
function localDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

/**
 * "3:14 PM" when `endsAt` falls on the same local day as `fromMs`;
 * "10:33 AM tomorrow" when it is the next local day;
 * "3:00 AM on Sat, 12 Sep" when it is further out.
 */
export function formatEndsAt(endsAt: Date, fromMs: number, timezone: string): string {
  const clock = formatClock(endsAt, timezone);
  const fromKey = localDateKey(new Date(fromMs), timezone);
  const endKey = localDateKey(endsAt, timezone);
  if (endKey === fromKey) return clock;

  const oneDayLater = localDateKey(new Date(fromMs + MS_PER_DAY), timezone);
  if (endKey === oneDayLater) return `${clock} tomorrow`;

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, weekday: "short", day: "numeric", month: "short",
  }).format(endsAt);
  return `${clock} on ${dateLabel}`;
}

/** Minutes past local midnight for a UTC date in `timezone` (for tolerance checks). */
export function minutesOfDay(date: Date, timezone: string): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const h = Number(p.find((x) => x.type === "hour")?.value ?? "0");
  const m = Number(p.find((x) => x.type === "minute")?.value ?? "0");
  return h * 60 + m;
}
