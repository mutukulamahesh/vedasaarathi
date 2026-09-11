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
  /** 0-based element index within the lunar month (Tithi 0..29) / cycle
   * (Nakshatra 0..26). Depends ONLY on the instant, not the host time zone. */
  ino?: number;
  end: string | number | Date;
}
interface NamedSpanFull extends NamedSpan {
  start: string | number | Date;
}
type Engine = {
  calculate: (d: Date) => {
    Tithi: NamedSpanFull; Nakshatra: NamedSpanFull; Paksha: { name_en_IN: string };
    Day?: { ino?: number; name_en_UK?: string };
  };
  calendar: (
    d: Date, lat: number, lng: number,
  ) => {
    Masa?: { ino?: number; name_en_IN?: string; name?: string };
    MoonMasa?: { ino?: number; name_en_IN?: string; isLeapMonth?: boolean };
    Ritu?: { ino?: number; name_en_UK?: string };
  };
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
  /** Weekday (vaara), Sanskrit — e.g. "Budhavara". */
  vaara: string;
  /** Season (ritu), Vedic (lunar-month) reckoning — e.g. "Varsha". */
  ritu: string;
  /** Half-year (ayana) — "Uttarayana" or "Dakshinayana", from the 6-ritu split. */
  ayana: string;
  /** Samvatsara in the 60-year cycle, South Indian (Shaka-based) reckoning —
   * e.g. "Parabhava". The North Indian / Vikrama cycle names a different year;
   * callers must present that as a tradition difference, not a correction. */
  samvatsara: string;
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

/* -------------------------------------------------------------------------- */
/* Tithi / Nakshatra boundaries — found by bisection in UTC-ms space.         */
/* -------------------------------------------------------------------------- */
//
// mhah-panchang builds its own Tithi/Nakshatra `.start` / `.end` with
// `new Date(y, mo, da, h, m, s)` — a HOST-local constructor — from UT
// components it first shifted by the host offset it read off the input Date.
// On a UTC host the two shifts cancel; on any other host (Node with TZ set, or
// a browser whose user is not in the saved location's zone) the timestamp is
// wrong by the host offset, and by a further hour when the boundary and the
// input straddle a host DST transition — and it is unrecoverable once the
// library has folded a nonexistent (spring-forward) wall time.
//
// The library's element INDEX at an instant, by contrast, depends ONLY on that
// instant (its internal Julian arithmetic self-corrects for whatever zone the
// input Date is read in — verified across UTC / IST / Chicago / Kiritimati /
// Pago Pago). So the boundary is found by bisecting that index in pure UTC-ms
// space: no host-local Date construction, and ambiguous / nonexistent DST wall
// times never arise.

/** The bisection loop stops once the bracket is this narrow. NOTE: this is the
 * loop's own step, NOT the achieved output precision. `indexAt` is evaluated
 * through `memoCalculate`, which buckets every probe to the nearest 100 ms, so
 * two probes less than 100 ms apart return the same index and the effective
 * boundary resolution is ~100 ms, not 8 ms. That is still far under the
 * 5-minute release tolerance and well below the one-minute display rounding, so
 * the extra loop iterations below 100 ms only cost a little time — they do not
 * buy real precision. Do not cite "8 ms" as the boundary accuracy. */
const BOUNDARY_STEP_MS = 8;
/** A Tithi lasts ~19h58m–26h47m; a Nakshatra span ~19h–27h. 30h brackets both. */
const MAX_ELEMENT_SPAN_MS = 30 * 3_600_000;

type IndexAt = (utcMs: number) => number;

/** Forward crossing: the instant the element holding index `k` at `fromMs`
 * ends. Returned as the midpoint of the final bracket. */
function forwardBoundary(indexAt: IndexAt, fromMs: number, k: number): number {
  let lo = fromMs;
  let hi = fromMs + MAX_ELEMENT_SPAN_MS;
  if (indexAt(hi) === k) return hi; // element longer than the bracket — clamp
  while (hi - lo > BOUNDARY_STEP_MS) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (indexAt(mid) === k) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** Backward crossing: the instant the element holding index `k` at `atMs`
 * began. Returned as the midpoint of the final bracket. */
function backwardBoundary(indexAt: IndexAt, atMs: number, k: number): number {
  let lo = atMs - MAX_ELEMENT_SPAN_MS;
  let hi = atMs;
  if (indexAt(lo) === k) return lo; // element longer than the bracket — clamp
  while (hi - lo > BOUNDARY_STEP_MS) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (indexAt(mid) === k) hi = mid;
    else lo = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** The element (Tithi / Nakshatra) spanning `withinMs`, with true-UTC bounds. */
function elementBounds(name: string, indexAt: IndexAt, withinMs: number): PanchangaElement {
  const k = indexAt(withinMs);
  return {
    name: String(name),
    startsAt: new Date(backwardBoundary(indexAt, withinMs, k)),
    endsAt: new Date(forwardBoundary(indexAt, withinMs, k)),
  };
}

/** A memoised `engine.calculate` keyed to 100 ms buckets. This bounds the number
 * of real library calls during a month of bisections, but it also caps the
 * boundary resolution: every probe is snapped to `Math.round(utcMs / 100) * 100`
 * before the library sees it, so the bisection cannot distinguish instants
 * closer than 100 ms and BOUNDARY_STEP_MS (8 ms) is not the true output
 * precision. ~100 ms is still far tighter than any displayed or released value
 * (minute rounding; 5-minute release tolerance). */
function memoCalculate(engine: Engine) {
  const cache = new Map<number, ReturnType<Engine["calculate"]>>();
  return (utcMs: number) => {
    const key = Math.round(utcMs / 100);
    let v = cache.get(key);
    if (v === undefined) {
      v = engine.calculate(new Date(key * 100));
      cache.set(key, v);
    }
    return v;
  };
}

/* -------------------------------------------------------------------------- */
/* Descriptive Panchanga fields (vaara / ritu / ayana / samvatsara)          */
/* -------------------------------------------------------------------------- */

// 0 = Sunday … 6 = Saturday.
const VAARA_SANSKRIT = [
  "Bhanuvara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara",
];

/**
 * mhah-panchang's month names (`Masa.name_en_IN`) are the ODIA romanisations
 * ("Baisakha", "Srabana", "Bhadraba", "Aswina", …) — the library is
 * Odia-oriented. The Sankalpam and the Home almanac use the Sanskrit / Telugu
 * name, so a displayed "Bhadraba" is really Bhadrapada (భాద్రపద). Keyed by the
 * mhah name, lower-cased; anything unmapped is passed through unchanged.
 */
const MASA_SANSKRIT: Record<string, string> = {
  baisakha: "Vaishakha",
  jyestha: "Jyeshtha",
  asadha: "Ashadha",
  srabana: "Shravana",
  bhadraba: "Bhadrapada",
  aswina: "Ashvina",
  karttika: "Kartika",
  margasira: "Margashirsha",
  pausa: "Pausha",
  magha: "Magha",
  phalguna: "Phalguna",
  chaitra: "Chaitra",
};

/** The Sanskrit month name for a mhah-panchang (Odia) `Masa.name_en_IN`. */
export function masaSanskrit(mhahName: string): string {
  return MASA_SANSKRIT[mhahName.trim().toLowerCase()] ?? mhahName.trim();
}

/** Weekday index (0 = Sunday) of a proleptic-Gregorian Y-M-D. Pure arithmetic,
 * never the host/browser time zone. */
export function weekdayIndex(y: number, mo: number, da: number): number {
  return new Date(Date.UTC(y, mo - 1, da)).getUTCDay();
}

/** Vaara (Sanskrit weekday) for the civil date `dateMs` falls on in `timezone`.
 * Time-zone-independent: derived from the location's own civil date, never from
 * a library weekday that would follow the host clock. */
export function vaaraForInstant(dateMs: number, timezone: string): string {
  const { y, mo, da } = civilDateParts(dateMs, timezone);
  return VAARA_SANSKRIT[weekdayIndex(y, mo, da)] ?? "";
}

// mhah-panchang Ritu.ino: 0 = Vasanta … 5 = Shishira (Vedic / lunar-month ritu).
const RITU_SANSKRIT = ["Vasanta", "Grishma", "Varsha", "Sharad", "Hemanta", "Shishira"];

/** Ayana from the six-ritu split: Shishira, Vasanta, Grishma → Uttarayana;
 *  Varsha, Sharad, Hemanta → Dakshinayana. This is the traditional ritu-based
 *  boundary; a solar-sankranti panchang can differ by a few days near the
 *  Makara / Karka Sankranti. */
export function ayanaFromRitu(rituIno: number): string {
  return [5, 0, 1].includes(rituIno) ? "Uttarayana" : "Dakshinayana";
}

/** The 60 samvatsara names, Prabhava = index 1 (index 0 unused; 60 = Akshaya). */
export const SAMVATSARA_NAMES = [
  "", "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati", "Angirasa", "Shrimukha",
  "Bhava", "Yuva", "Dhata", "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrisha",
  "Chitrabhanu", "Svabhanu", "Tarana", "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari",
  "Virodhi", "Vikrita", "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukha",
  "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit", "Shobhakrit",
  "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Kilaka", "Saumya", "Sadharana",
  "Virodhikrit", "Paridhavi", "Pramadi", "Ananda", "Rakshasa", "Nala", "Pingala",
  "Kalayukta", "Siddharthi", "Raudra", "Durmati", "Dundubhi", "Rudhirodgari",
  "Raktakshi", "Krodhana", "Akshaya",
];

/**
 * The South Indian (Shaka-based) samvatsara for the civil date of `input`.
 *
 * The samvatsara rolls over at Chaitra Shukla Pratipada (Ugadi). Elapsed Shaka
 * years = Gregorian year − 78 on/after Ugadi, − 79 before it. Within the
 * ambiguous month of March the lunar month decides (Chaitra ⇒ new year begun).
 * name index = ((elapsedShaka + 12) mod 60), with 0 mapped to 60 (Akshaya).
 * Validated against Drik Panchang Shaka Samvatsara values (see ./validation.ts).
 */
export async function southIndianSamvatsara(input: PanchangaInput): Promise<string> {
  const engine = await getEngine();
  const { y, mo } = civilDateParts(input.dateMs, input.timezone);
  let elapsedShaka: number;
  if (mo >= 4) elapsedShaka = y - 78;
  else if (mo <= 2) elapsedShaka = y - 79;
  else {
    const cal = engine.calendar(new Date(input.dateMs), input.latitude, input.longitude);
    const lunarMonthIno = Number(cal.MoonMasa?.ino ?? cal.Masa?.ino ?? 11);
    elapsedShaka = lunarMonthIno === 0 ? y - 78 : y - 79;
  }
  const idx = ((elapsedShaka + 12) % 60 + 60) % 60 || 60;
  return SAMVATSARA_NAMES[idx];
}

/**
 * Sunrise/sunset for the civil day of `dateMs`, plus the Tithi/Nakshatra/Paksha
 * active at `dateMs` itself AND the ones prevailing at that day's local sunrise.
 */
export async function computePanchanga(input: PanchangaInput): Promise<PanchangaResult> {
  const engine = await getEngine();
  const { sunrise, sunset } = await sunTimes(input);
  const calcAt = memoCalculate(engine);
  const now = calcAt(input.dateMs);
  const srMs = sunrise.getTime();
  const atSunrise = calcAt(srMs);
  const cal = engine.calendar(sunrise, input.latitude, input.longitude);
  const rituIno = Number(cal.Ritu?.ino ?? 2);

  const tithiIndexAt: IndexAt = (ms) => Number(calcAt(ms).Tithi.ino ?? -1);
  const nakIndexAt: IndexAt = (ms) => Number(calcAt(ms).Nakshatra.ino ?? -1);

  return {
    sunrise,
    sunset,
    atMs: input.dateMs,
    tithi: elementBounds(now.Tithi.name_en_IN, tithiIndexAt, input.dateMs),
    nakshatra: elementBounds(now.Nakshatra.name_en_IN, nakIndexAt, input.dateMs),
    paksha: String(now.Paksha.name_en_IN),
    tithiAtSunrise: elementBounds(atSunrise.Tithi.name_en_IN, tithiIndexAt, srMs),
    nakshatraAtSunrise: elementBounds(atSunrise.Nakshatra.name_en_IN, nakIndexAt, srMs),
    pakshaAtSunrise: String(atSunrise.Paksha.name_en_IN),
    masa: masaSanskrit(String(cal.Masa?.name_en_IN ?? cal.Masa?.name ?? "")),
    // Weekday from the LOCATION's civil date, not the library's host-clock one.
    vaara: vaaraForInstant(srMs, input.timezone),
    ritu: RITU_SANSKRIT[rituIno] ?? "",
    ayana: ayanaFromRitu(rituIno),
    samvatsara: await southIndianSamvatsara(input),
  };
}

/* -------------------------------------------------------------------------- */
/* Madhyahna-vyapti festival rule (Vinayaka Chavithi / Ganesha Chaturthi)    */
/* -------------------------------------------------------------------------- */

/** The Madhyahna kala for the civil day of `input`: the middle fifth of the
 *  day, [sunrise + 2·D/5, sunrise + 3·D/5] where D = sunset − sunrise. This is
 *  Drik Panchang's own five-part day division. */
export async function madhyahnaWindow(
  input: PanchangaInput,
): Promise<{ startMs: number; endMs: number; sunriseMs: number; sunsetMs: number }> {
  const { sunrise, sunset } = await sunTimes(input);
  const sr = sunrise.getTime();
  const ss = sunset.getTime();
  const day = ss - sr;
  return { startMs: sr + (day * 2) / 5, endMs: sr + (day * 3) / 5, sunriseMs: sr, sunsetMs: ss };
}

export interface MadhyahnaFestival {
  name: string;
  /** Telugu name, when the rule carries one. */
  nameTe?: string;
  /** Local civil date (YYYY-MM-DD) in `input.timezone`. */
  dateISO: string;
  /** Whole days from `input.dateMs` (0 = today). */
  inDays: number;
  /** The location-aware puja window: madhyahna ∩ the qualifying tithi span. */
  pujaWindow: { startMs: number; endMs: number };
}

/**
 * The Vinayaka Chavithi day by the madhyahna-vyapti rule: the first day on
 * which the target (Shukla Chaturthi, in `rule.masa`) tithi is present at any
 * instant of that day's Madhyahna kala. A forward scan returns the earliest
 * qualifying day, which is also the Dharma Sindhu पूर्वैव ("take the earlier")
 * resolution when two consecutive days both catch madhyahna.
 *
 * The puja window is madhyahna ∩ the Chaturthi tithi span, matching Drik
 * Panchang's "Madhyahna Ganesha Puja Muhurat". This is a calendar + tithi-span
 * calculation, never a general muhurtham engine.
 */
export async function madhyahnaVyaptiFestivalDay(
  input: PanchangaInput,
  rule: FestivalRule,
  horizonDays = 400,
  opts: {
    /** Called at the top of every horizon-day iteration. Throw to cancel, or
     * return a promise to yield the main thread between days. */
    onIteration?: (dayIndex: number) => void | Promise<void>;
  } = {},
): Promise<MadhyahnaFestival | null> {
  const engine = await getEngine();
  const start = civilDateParts(input.dateMs, input.timezone);
  const targetTithi = tithiKey(rule.tithi);
  const calcAt = memoCalculate(engine);
  const tithiIndexAt: IndexAt = (ms) => Number(calcAt(ms).Tithi.ino ?? -1);

  for (let i = 0; i < horizonDays; i += 1) {
    await opts.onIteration?.(i);
    const dayMs = localWallToUtcMs(start.y, start.mo, start.da + i, 12, 0, 0, input.timezone);
    const dayInput: PanchangaInput = { ...input, dateMs: dayMs };
    const mw = await madhyahnaWindow(dayInput);
    const cal = engine.calendar(new Date(mw.startMs), input.latitude, input.longitude);
    if (String(cal.Masa?.name_en_IN ?? "") !== rule.masa) continue;

    // Sample the tithi at both ends of the (~30-minute) madhyahna window. The
    // target overlaps madhyahna if either end is inside it, or if it opens
    // inside (previous tithi at start, next tithi at end).
    const atStart = engine.calculate(new Date(mw.startMs));
    const atEnd = engine.calculate(new Date(mw.endMs));
    const startKey = tithiKey(atStart.Tithi.name_en_IN);
    const endKey = tithiKey(atEnd.Tithi.name_en_IN);
    const shukla = (t: { Paksha: { name_en_IN: string } }) =>
      String(t.Paksha.name_en_IN).toLowerCase() === rule.paksha.toLowerCase();

    let tithiWithinMs: number | null = null;
    if (startKey === targetTithi && shukla(atStart)) tithiWithinMs = mw.startMs;
    else if (endKey === targetTithi && shukla(atEnd)) tithiWithinMs = mw.endMs;

    if (tithiWithinMs === null) continue;

    const iso = new Intl.DateTimeFormat("en-CA", {
      timeZone: input.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(dayMs));
    // True-UTC span of the qualifying Chaturthi tithi (bisected on the index,
    // never the library's host-local .start/.end).
    const span = elementBounds("", tithiIndexAt, tithiWithinMs);
    const tStart = span.startsAt.getTime();
    const tEnd = span.endsAt.getTime();
    return {
      name: rule.name,
      nameTe: rule.nameTe,
      dateISO: iso,
      inDays: i,
      pujaWindow: {
        startMs: Math.max(mw.startMs, tStart),
        endMs: Math.min(mw.endMs, tEnd),
      },
    };
  }
  return null;
}

export interface FestivalRule {
  name: string;
  /** Telugu name, when the caller's rule object carries one (structurally -
   * the richer festival-rules.ts FestivalRule satisfies this narrower shape). */
  nameTe?: string;
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
