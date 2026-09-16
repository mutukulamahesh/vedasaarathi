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
  /** Purnimanta lunar month (month ends at Purnima) — unchanged from before
   * this field existed; every existing consumer (Sankalpam, the Vinayaka
   * Chavithi festival rule) keeps reading this one. NOT a true lunar-boundary
   * bisection — see the doc comment on `amantaMasaFromMoonMasa` for the
   * concrete limitation this shares. */
  masa: string;
  /** Amanta lunar month (month ends at Amavasya) — the Telugu/South Indian
   * convention. Equal to `masa` throughout Shukla Paksha (the two conventions
   * cannot differ then); only diverges during Krishna Paksha. See
   * `amantaMasaFromMoonMasa`. */
  masaAmanta: string;
  /** True when `masaAmanta` is an Adhika (intercalary/leap) month — inserted
   * because no solar sankranti fell within its span. An Adhika month repeats
   * the SAME name as the regular (Nija) month immediately following it. */
  isAdhikaMasa: boolean;
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
  /** Telugu name, when the caller's rule carries one. */
  nameTe?: string;
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

// mhah-panchang's OWN `Masa.name_en_IN` array order (see
// node_modules/mhah-panchang MhahLocalConstant: `this.Masa.name_en_IN`),
// starting at Baisakha and ending at Chaitra. `MoonMasa`'s raw index is
// taken from this SAME array — `Object.keys` on MASA_SANSKRIT preserves
// this exact insertion order, so no separate array is redeclared.
const MHAH_MASA_ORDER = Object.keys(MASA_SANSKRIT);

/**
 * The Amanta (South Indian / Telugu-family) lunar month, derived from
 * mhah-panchang's own `calendar().MoonMasa` — a genuine new-moon-to-new-moon
 * lunar-month bisection with real Adhika-masa (leap month) detection, unlike
 * `Masa` (the LEGACY field, historically labelled "Purnimanta" in this
 * codebase but NOT actually a Purnimanta calculation): `Masa` is only the
 * solar Raasi prevailing AT TODAY's sunrise (`getCalendarRaasi` on the
 * current instant) — no lunar-month-boundary logic of any kind. It coincides
 * with genuine Purnimanta for most of an ordinary month by coincidence, not
 * by construction, and is CONFIRMED WRONG (reads a full month early) during
 * an Adhika-masa stretch: 24–25 June 2026, the Nija Jyeshtha immediately
 * following that year's Adhika Jyeshtha, against a direct drikpanchang.com
 * fetch. Because Sankalpam's spoken month name (`panchangaToSlots` →
 * `ctx.masa`) reads this same field, that mismatch is a live, active defect
 * in what a family hears during that window today — not merely a
 * theoretical gap. `Masa` is left exactly as-is in this change (Sankalpam
 * and the Vinayaka Chavithi festival rule both still depend on it
 * unchanged); replacing its source is a separate, bounded follow-up — see
 * the migration-points list in
 * docs/temp/amanta-masa-validation-2026-09-14.md.
 *
 * mhah-panchang's own `getMasa()` (dist/mhah-panchang.esm.js): for a REGULAR
 * (non-leap) lunar month, `MoonMasa` is named ONE ENTRY AHEAD, in its own
 * name array, of the Raasi actually prevailing at that month's own new-moon
 * start (`n_maasa = currentSolarMonth + 1`); for a LEAP (Adhika) month — one
 * with no solar sankranti inside its span — it is named WITHOUT that shift
 * (`n_maasa = currentSolarMonth`). The traditional Amanta convention names a
 * lunar month after the Raasi prevailing at ITS OWN START in both cases — so
 * a regular month's raw name must be shifted back one entry to recover that
 * value; a leap month's raw name is already correct as-is, and (correctly)
 * repeats the SAME name as the regular (Nija) month immediately following it.
 *
 * Verified against drikpanchang.com/panchang/day-panchang.html (direct
 * fetches of the live page, not search summaries or this engine's own
 * output) for Hyderabad and Frisco, Shukla and Krishna Paksha, a
 * new-moon month boundary, the 2026 Adhika Jyeshtha window (both its leap
 * and its following Nija occurrence), and the 2026 Ugadi year rollover —
 * every case matched exactly. See
 * docs/temp/amanta-masa-validation-2026-09-14.md for the full table.
 *
 * KSHAYA (omitted) MASA — NOT SUPPORTED, and not detectable from this
 * library's public API. `getMasa()`'s leap test is a bare equality,
 * `currentSolarMonth === nextSolarMonth`; it distinguishes "zero sankranti
 * in this lunar month" (Adhika) from "not zero", but NOT "exactly one"
 * (an ordinary month) from "two" (a Kshaya month — two sankrantis inside one
 * synodic month, which requires a compound/merged month name and normally
 * co-occurs with an Adhika month elsewhere in the same lunar year to
 * rebalance the count). The library never exposes `currentSolarMonth` /
 * `nextSolarMonth` themselves — only the already-collapsed `n_maasa` /
 * `is_leap_month` — so a "gap of two" cannot be reconstructed from the
 * public `MoonMasa` object at all without re-deriving the Raasi at both
 * synodic-month boundaries independently of the library (not attempted
 * here). A Kshaya month would silently produce a plausible-looking but
 * WRONG `masaAmanta` name with `isAdhikaMasa: false` — no error, no
 * warning. No claim about Kshaya masa's frequency, a past date, or a next
 * occurrence is made here — none has been independently verified for this
 * codebase, and none is needed to establish the actual limitation: this
 * implementation has NOT been tested against any real Kshaya-masa date,
 * found or otherwise, and its behaviour on one is unverified. Recorded
 * here as an explicit, unresolved
 * limitation, not silently claimed as covered.
 */
export function amantaMasaFromMoonMasa(
  moonMasa: { name_en_IN?: string; isLeapMonth?: boolean } | undefined,
): { masaAmanta: string; isAdhikaMasa: boolean } {
  const raw = String(moonMasa?.name_en_IN ?? "").trim().toLowerCase();
  const isAdhikaMasa = Boolean(moonMasa?.isLeapMonth);
  const idx = MHAH_MASA_ORDER.indexOf(raw);
  if (idx === -1) return { masaAmanta: "", isAdhikaMasa };
  const correctedIdx = isAdhikaMasa ? idx : (idx - 1 + MHAH_MASA_ORDER.length) % MHAH_MASA_ORDER.length;
  return { masaAmanta: masaSanskrit(MHAH_MASA_ORDER[correctedIdx]), isAdhikaMasa };
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
    ...amantaMasaFromMoonMasa(cal.MoonMasa),
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

export interface AmantaFestivalRule {
  name: string;
  nameTe?: string;
  /** Amanta (sunrise-anchored) masa name, e.g. "Chaitra" — `masaAmanta` from
   * `amantaMasaFromMoonMasa`, NOT the legacy same-instant `masa` field. */
  masaAmanta: string;
  /** "Shukla" or "Krishna". */
  paksha: string;
  /** English tithi name, e.g. "Pratipada". */
  tithi: string;
}

/**
 * The next civil day (from `dateMs`, inclusive) on which the AMANTA masa /
 * paksha / tithi prevailing at that day's local sunrise matches `rule`,
 * within `horizonDays`. This is the rule Ugadi (Telugu New Year — Amanta
 * Chaitra Shukla Pratipada) needs: unlike `nextFestivalDay` (which reads the
 * legacy `masa` field — a same-instant solar-Raasi lookup, NOT a true
 * lunar-boundary Amanta month; see `amantaMasaFromMoonMasa`'s doc comment),
 * this reads the validated `masaAmanta` field. Sunrise-anchored, never a
 * muhurtham.
 *
 * SUPPORTED FALLBACK, SPECIFIC TO THIS RULE: some years the target tithi
 * (Pratipada) is short enough to fall entirely between two sunrises,
 * touching neither - a real case, directly confirmed at Hyderabad in 2026
 * (Padyami/Pratipada spans 6:52 AM Mar 19 - 4:52 AM Mar 20; Hyderabad
 * sunrise that Mar 19 is 6:21 AM, before Padyami begins, so the tithi never
 * coincides with a sunrise). Detecting this is NOT inferred from the masa
 * label alone - the masa flip is only a cheap pre-filter for which day to
 * check. The actual target-tithi interval is independently bisected
 * (`elementBounds`, the same primitive used everywhere else in this file)
 * from a probe at the PREVIOUS civil day's local noon, and the match is
 * accepted only when that interval's true [start, end) bounds fall strictly
 * between the previous day's sunrise and this day's sunrise - i.e. the
 * target tithi is verified to touch NEITHER sunrise, not merely assumed to.
 * If the noon probe does not land inside the target tithi (a shorter-still
 * tithi that also misses noon), this returns no match for that boundary
 * rather than guessing a day. This matches Drik Panchang's own published
 * Hyderabad Ugadi date for 2026 (19 March, not 20) - the one confirmed case
 * of this fallback firing; not yet cross-checked against a second
 * independent kshaya year. This fallback is specific to the Amanta
 * masa/Pratipada mechanics of this function and is NOT a general
 * "prefer the earlier day" rule borrowed from elsewhere.
 */
export async function amantaSunriseFestivalDay(
  input: PanchangaInput,
  rule: AmantaFestivalRule,
  horizonDays = 400,
  opts: { onIteration?: (dayIndex: number) => void | Promise<void> } = {},
): Promise<FestivalMatch | null> {
  const engine = await getEngine();
  const start = civilDateParts(input.dateMs, input.timezone);
  const targetTithi = tithiKey(rule.tithi);
  const calcAt = memoCalculate(engine);
  const tithiIndexAt: IndexAt = (ms) => Number(calcAt(ms).Tithi.ino ?? -1);
  const isoFor = (ms: number) => new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ms));

  let prevMasaAmanta: string | null = null;
  let prevSunriseMs: number | null = null;
  for (let i = 0; i < horizonDays; i += 1) {
    await opts.onIteration?.(i);
    // Re-anchor each day to its own local noon (DST-safe), never +86.4e6 ms.
    const dayMs = localWallToUtcMs(start.y, start.mo, start.da + i, 12, 0, 0, input.timezone);
    const dayInput: PanchangaInput = { ...input, dateMs: dayMs };
    const { sunrise } = await sunTimes(dayInput);
    const sunriseMs = sunrise.getTime();
    // Deliberately NOT computePanchanga(): that also bisects the exact
    // current+sunrise Tithi/Nakshatra bounds and computes Samvatsara, all
    // unused here - a scan of hundreds of days only needs the masa/paksha/
    // tithi NAME at each sunrise. This direct pair of calls (memoised) is
    // roughly 3x faster per day, which matters because a rule whose
    // occurrence just passed can need a 200+ day scan to find the next one.
    const cal = engine.calendar(sunrise, input.latitude, input.longitude);
    const { masaAmanta } = amantaMasaFromMoonMasa(cal.MoonMasa);
    const atSunrise = calcAt(sunriseMs);
    const pakshaAtSunrise = String(atSunrise.Paksha.name_en_IN);
    const tithiName = tithiKey(atSunrise.Tithi.name_en_IN);

    if (
      masaAmanta === rule.masaAmanta
      && pakshaAtSunrise === rule.paksha
      && tithiName === targetTithi
    ) {
      return { name: rule.name, nameTe: rule.nameTe, dateISO: isoFor(dayMs), inDays: i };
    }

    // The masa just rolled over without ever matching the target tithi at a
    // sunrise - check whether the PREVIOUS civil day actually contained the
    // whole target-tithi interval, confined between the two sunrises. See
    // doc comment above; this only accepts an explicitly-verified interval,
    // never a guess from the masa flip alone.
    if (
      i > 0 && prevMasaAmanta !== null && prevSunriseMs !== null
      && prevMasaAmanta !== masaAmanta
      && masaAmanta === rule.masaAmanta && pakshaAtSunrise === rule.paksha
    ) {
      const prevDayMs = localWallToUtcMs(start.y, start.mo, start.da + i - 1, 12, 0, 0, input.timezone);
      const probe = calcAt(prevDayMs);
      const probeTithi = tithiKey(String(probe.Tithi.name_en_IN));
      const probePaksha = String(probe.Paksha.name_en_IN).toLowerCase();
      if (probeTithi === targetTithi && probePaksha === rule.paksha.toLowerCase()) {
        const span = elementBounds("", tithiIndexAt, prevDayMs);
        const confinedBetweenSunrises = span.startsAt.getTime() > prevSunriseMs
          && span.endsAt.getTime() < sunriseMs;
        if (confinedBetweenSunrises) {
          return { name: rule.name, nameTe: rule.nameTe, dateISO: isoFor(prevDayMs), inDays: i - 1 };
        }
      }
      // Probe missed the target tithi, or its verified interval touches a
      // sunrise after all - not the supported kshaya case. No match forced.
    }
    prevMasaAmanta = masaAmanta;
    prevSunriseMs = sunriseMs;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Nishita-vyapti festival rule (Masa Shivaratri)                            */
/* -------------------------------------------------------------------------- */

/**
 * The Nishita kala for the NIGHT following the civil day of `input`: the 8th
 * of 15 equal parts of [sunset(today), sunrise(tomorrow)] — the same 15-part
 * division day-timings.ts already uses for daytime Abhijit/Vijaya, applied to
 * the night instead. Directly confirmed against Drik Panchang's own
 * published "Nishita Muhurta": Hyderabad 2026-01-16 (sunset 6:02 PM, next
 * sunrise 6:50 AM → night 768 min → 8th/15 part = 12:00:24 AM–12:51:36 AM,
 * matching Drik's 12:00 AM–12:52 AM to the minute).
 */
export async function nishitaWindow(
  input: PanchangaInput,
): Promise<{ startMs: number; endMs: number; sunsetMs: number; nextSunriseMs: number }> {
  const { sunset } = await sunTimes(input);
  const today = civilDateParts(input.dateMs, input.timezone);
  const tomorrowMs = localWallToUtcMs(today.y, today.mo, today.da + 1, 12, 0, 0, input.timezone);
  const { sunrise: nextSunrise } = await sunTimes({ ...input, dateMs: tomorrowMs });
  const ss = sunset.getTime();
  const nsr = nextSunrise.getTime();
  const night = nsr - ss;
  return { startMs: ss + (night * 7) / 15, endMs: ss + (night * 8) / 15, sunsetMs: ss, nextSunriseMs: nsr };
}

export interface NishitaFestivalRule {
  name: string;
  nameTe?: string;
  /** "Shukla" or "Krishna". */
  paksha: string;
  /** English tithi name, e.g. "Chaturdashi". */
  tithi: string;
}

/**
 * The Masa (monthly) Shivaratri day by the nishita-vyapti rule: the first
 * civil day whose NIGHT's Nishita kala (see `nishitaWindow`) contains Krishna
 * Chaturdashi tithi. Unlike the madhyahna-vyapti rule (Vinayaka Chavithi),
 * this carries NO masa filter — Masa Shivaratri recurs every lunar month
 * (including an Adhika/leap month, confirmed on Drik's own "Adhika Masik
 * Shivaratri" listing for 2026-06-13), so any month's Krishna Chaturdashi
 * qualifies; scanning forward from `dateMs` and returning the first
 * NON-ECHO match is sufficient to find the correct upcoming occurrence
 * without needing to disambiguate a specific target month.
 *
 * ECHO GUARD, INDEPENDENT OF THE QUERY START DATE: Chaturdashi can last past
 * 24h, so it can satisfy this check on the day it genuinely qualifies AND on
 * the immediately following civil day (confirmed for real: Hyderabad's
 * January 2026 Krishna Chaturdashi spans 2026-01-16 22:21 to 2026-01-18
 * 00:03, touching both the 16→17 and 17→18 Nishita windows; Drik publishes
 * only 16 Jan). A day-based advance in a caller's own scan loop (e.g.
 * `festivalRuleOccurrencesInRange`) cannot fix this by itself — a FRESH scan
 * that starts ON the echo day (2026-01-17), as Home does whenever "today" IS
 * that day, would match immediately and report the echo as if it were a new
 * occurrence. So every candidate day here is checked against the day
 * immediately BEFORE it, even the very first day of the scan: if that prior
 * day also satisfies the same tithi/paksha condition, the current day is an
 * echo of that earlier, already-genuine occurrence — not a new one — and the
 * scan continues forward instead of returning it. This makes the resolved
 * date depend only on the tithi interval itself, never on where the caller
 * happened to start looking.
 *
 * Deliberately does NOT reuse madhyahna-vyapti's masa check: Krishna
 * Chaturdashi falls in Krishna Paksha, exactly where the legacy same-instant
 * `masa` field is documented to diverge from the true Amanta month (see
 * `amantaMasaFromMoonMasa`'s doc comment) — reusing that check here would
 * risk the same defect for no benefit, since no masa filter is needed at all.
 *
 * Validated by direct Drik Panchang day-panchang + Nishita Muhurta fetches:
 * 2026-01-16 (Hyderabad AND Frisco agree) and 2026-03-17 Hyderabad vs.
 * 2026-03-16 Frisco (a genuine cross-location divergence — confirmed by
 * checking each location's own Nishita window against its own Chaturdashi
 * span, not assumed).
 */
export async function nishitaVyaptiFestivalDay(
  input: PanchangaInput,
  rule: NishitaFestivalRule,
  horizonDays = 400,
  opts: { onIteration?: (dayIndex: number) => void | Promise<void> } = {},
): Promise<FestivalMatch | null> {
  const engine = await getEngine();
  const start = civilDateParts(input.dateMs, input.timezone);
  const targetTithi = tithiKey(rule.tithi);
  const targetPaksha = rule.paksha.toLowerCase();

  const matchesNishita = async (dayIndex: number): Promise<boolean> => {
    const dayMs = localWallToUtcMs(start.y, start.mo, start.da + dayIndex, 12, 0, 0, input.timezone);
    const nw = await nishitaWindow({ ...input, dateMs: dayMs });
    const atStart = engine.calculate(new Date(nw.startMs));
    const atEnd = engine.calculate(new Date(nw.endMs));
    const startKey = tithiKey(atStart.Tithi.name_en_IN);
    const endKey = tithiKey(atEnd.Tithi.name_en_IN);
    const paksha = (t: { Paksha: { name_en_IN: string } }) =>
      String(t.Paksha.name_en_IN).toLowerCase() === targetPaksha;
    return (startKey === targetTithi && paksha(atStart)) || (endKey === targetTithi && paksha(atEnd));
  };

  for (let i = 0; i < horizonDays; i += 1) {
    await opts.onIteration?.(i);
    if (!(await matchesNishita(i))) continue;

    // Confirmed candidate - but only a genuine occurrence if the day right
    // before it did NOT also match (see doc comment above). This check runs
    // even at i === 0: the day before the scan's own start may itself be a
    // real, already-past occurrence that day i is merely an echo of.
    if (await matchesNishita(i - 1)) continue;

    const dayMs = localWallToUtcMs(start.y, start.mo, start.da + i, 12, 0, 0, input.timezone);
    const iso = new Intl.DateTimeFormat("en-CA", {
      timeZone: input.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(dayMs));
    return { name: rule.name, nameTe: rule.nameTe, dateISO: iso, inDays: i };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Shared occurrence dispatcher - the ONE place that picks a method function */
/* -------------------------------------------------------------------------- */

/** The minimal shape a rule needs for `festivalRuleOccurrence` - the richer
 * festival-rules.ts `FestivalRule` satisfies this structurally. */
export interface DispatchableFestivalRule {
  method: string;
  name: string;
  nameTe?: string;
  masa: string;
  paksha: string;
  tithi: string;
}

export interface FestivalOccurrence {
  name: string;
  nameTe?: string;
  /** Local civil date, ISO (YYYY-MM-DD). */
  dateISO: string;
  /** Whole days from the scan's start date (0 = that day). */
  inDays: number;
  /** Only madhyahna-vyapti rules (a real puja window) carry this. */
  pujaWindow?: { startMs: number; endMs: number };
}

/**
 * Dispatches to the correct date-selection method for `rule.method` and
 * returns the next occurrence from `input.dateMs` (inclusive), or null if
 * none is found within `horizonDays` (or the method is "deferred" - never
 * scanned, never guessed). This is the ONE shared entry point both Home
 * (panchanga/index.ts) and Calendar (panchanga/calendar.ts) call, so both
 * consume identical occurrence results for the same rule + location + date -
 * never two independently hand-rolled scans that could quietly disagree.
 */
export async function festivalRuleOccurrence(
  input: PanchangaInput,
  rule: DispatchableFestivalRule,
  horizonDays = 400,
  opts: { onIteration?: (dayIndex: number) => void | Promise<void> } = {},
): Promise<FestivalOccurrence | null> {
  if (rule.method === "madhyahna-vyapti") {
    const m = await madhyahnaVyaptiFestivalDay(input, rule, horizonDays, opts);
    return m && { name: m.name, nameTe: m.nameTe, dateISO: m.dateISO, inDays: m.inDays, pujaWindow: m.pujaWindow };
  }
  if (rule.method === "amanta-sunrise") {
    const m = await amantaSunriseFestivalDay(
      input,
      { name: rule.name, nameTe: rule.nameTe, masaAmanta: rule.masa, paksha: rule.paksha, tithi: rule.tithi },
      horizonDays, opts,
    );
    return m && { name: m.name, nameTe: m.nameTe, dateISO: m.dateISO, inDays: m.inDays };
  }
  if (rule.method === "nishita-vyapti") {
    const m = await nishitaVyaptiFestivalDay(
      input,
      { name: rule.name, nameTe: rule.nameTe, paksha: rule.paksha, tithi: rule.tithi },
      horizonDays, opts,
    );
    return m && { name: m.name, nameTe: m.nameTe, dateISO: m.dateISO, inDays: m.inDays };
  }
  return null; // "deferred" (or any other unsupported method) - never guessed.
}

/**
 * ALL occurrences of `rule` found within the next `totalDays` days from
 * `input.dateMs` (inclusive), by repeatedly calling `festivalRuleOccurrence`
 * and advancing the scan past each match. A rule that recurs within the
 * window (e.g. Masa Shivaratri, roughly monthly) can surface more than one
 * occurrence; an annual rule (Ugadi, Vinayaka Chavithi) surfaces at most one.
 * This is what lets Calendar enumerate every occurrence in a month instead of
 * stopping after the first, while still sharing the exact same per-day
 * matching logic Home uses via `festivalRuleOccurrence`.
 *
 * ECHO SAFETY IS THE CALLEE'S JOB, NOT THIS LOOP'S: a tithi can last up to
 * ~26h47m — just over one civil day — so a vyapti window check can genuinely
 * be satisfied on the day a rule qualifies AND on the very next civil day
 * too (confirmed for real: Hyderabad's Krishna Chaturdashi spanning
 * 2026-01-16 22:21 to 2026-01-18 00:03 touches BOTH the 2026-01-16→17 and
 * 2026-01-17→18 Nishita windows). `festivalRuleOccurrence` (and the method
 * function it dispatches to, e.g. `nishitaVyaptiFestivalDay`) resolves this
 * itself, from the tithi interval, regardless of what civil day a scan
 * happens to start on — including a scan that restarts exactly on the echo
 * day, which is exactly what happens one day after every match here. So a
 * plain one-day advance past each match is enough: the next call already
 * will not re-report that match's echo as a new occurrence.
 */
export async function festivalRuleOccurrencesInRange(
  input: PanchangaInput,
  rule: DispatchableFestivalRule,
  totalDays: number,
  opts: { onIteration?: (dayIndex: number) => void | Promise<void> } = {},
): Promise<FestivalOccurrence[]> {
  const out: FestivalOccurrence[] = [];
  let cursor = input;
  let daysScanned = 0;
  while (daysScanned < totalDays) {
    const remaining = totalDays - daysScanned;
    const m = await festivalRuleOccurrence(cursor, rule, remaining, opts);
    if (!m) break;
    out.push(m);
    const advanceDays = m.inDays + 1;
    daysScanned += advanceDays;
    const { y, mo, da } = civilDateParts(cursor.dateMs, cursor.timezone);
    const nextMs = localWallToUtcMs(y, mo, da + advanceDays, 12, 0, 0, cursor.timezone);
    cursor = { ...cursor, dateMs: nextMs };
  }
  return out;
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
