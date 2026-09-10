// General daily periods — the "useful" and "traditionally avoided" times that
// apply to EVERYONE in a location on a given civil day. These are general
// traditional Panchanga timings, NOT personalised using birth details.
//
// Deterministic functions of the day's sunrise, sunset and weekday only:
//
//   - the day (sunrise → sunset) split into 8 equal parts gives Rahu Kalam,
//     Yamaganda and Gulika Kalam, each a fixed part-of-day index per weekday;
//   - the day split into 15 equal "muhurta" gives Abhijit Muhurta (the 8th,
//     around local solar noon), which the tradition treats as absent on
//     Wednesday.
//
// Sunrise / sunset come from the engine (already DST-safe and host-timezone
// independent), so every period here inherits those properties and works
// offline. Overlaps between periods are real and are shown, not hidden.
//
// BRAHMA MUHURTA IS DEFERRED — see DAY_TIMINGS_DEFERRED. Its documented
// conventions disagree (a fixed 2×48-min offset before sunrise vs a
// proportional two night-muhurta of night/15), the choice of adjacent night
// (previous sunset → this sunrise vs this sunset → next sunrise) is unsettled,
// and on DST-transition days the one comparison source (Drik Panchang) appears
// to use a nominal-24h approximation. Rather than display an approximate
// religious time, it is not shown until it can be sourced and independently
// validated.
//
// EVIDENCE (see DAY_TIMINGS_RULE_SOURCES / DAY_TIMINGS_OUTPUT_VALIDATION):
//   Rule provenance and computed-output comparison are recorded SEPARATELY.
//   Output comparison is currently SINGLE-SOURCE (Drik Panchang) — a reviewer
//   limitation until a second independent published panchang is compared.

export type DayPeriodId =
  | "abhijit"
  | "rahu"
  | "yamaganda"
  | "gulika";

export type DayPeriodKind = "useful" | "avoid";

export interface DayPeriod {
  id: DayPeriodId;
  kind: DayPeriodKind;
  /** UTC ms. */
  startMs: number;
  endMs: number;
}

export interface DayTimings {
  /** Periods commonly treated as generally favourable for beginning something
   * when no better time is known. */
  useful: DayPeriod[];
  /** Periods traditionally avoided for starting important activities. */
  avoid: DayPeriod[];
}

/* -------------------------------------------------------------------------- */
/* Weekday part-of-day tables (day divided into 8 equal parts, 1-indexed).    */
/* Index 0 = Sunday … 6 = Saturday.                                           */
/* -------------------------------------------------------------------------- */

// Rahu Kalam — independently documented (Wikipedia "Rāhukāla"): the 8 parts
// with Monday = 2nd, Saturday = 3rd, Friday = 4th, Wednesday = 5th, Thursday =
// 6th, Tuesday = 7th, Sunday = 8th.
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA_PART = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];

/** The n-th eighth-part of the day [sunrise, sunset], 1-indexed. */
function eighth(sunriseMs: number, sunsetMs: number, part: number): { startMs: number; endMs: number } {
  const unit = (sunsetMs - sunriseMs) / 8;
  return {
    startMs: Math.round(sunriseMs + (part - 1) * unit),
    endMs: Math.round(sunriseMs + part * unit),
  };
}

/**
 * The general day periods for a civil day with the given sunrise / sunset (UTC
 * ms) and weekday (0 = Sunday … 6 = Saturday).
 *
 * Missing or invalid sun times (non-finite, or sunset not after sunrise) yield
 * an empty result — nothing is shown rather than a nonsense period.
 */
export function computeDayTimings(
  sunriseMs: number,
  sunsetMs: number,
  weekday: number,
): DayTimings {
  if (
    !Number.isFinite(sunriseMs) ||
    !Number.isFinite(sunsetMs) ||
    sunsetMs <= sunriseMs
  ) {
    return { useful: [], avoid: [] };
  }

  const wd = ((weekday % 7) + 7) % 7;
  const dayMs = sunsetMs - sunriseMs;

  // Abhijit Muhurta — the 8th of 15 equal day-muhurta, around solar noon.
  // The tradition treats Wednesday as having no Abhijit Muhurta.
  const useful: DayPeriod[] = [];
  if (wd !== 3) {
    useful.push({
      id: "abhijit",
      kind: "useful",
      startMs: Math.round(sunriseMs + (7 * dayMs) / 15),
      endMs: Math.round(sunriseMs + (8 * dayMs) / 15),
    });
  }

  const avoid: DayPeriod[] = [
    { id: "rahu", kind: "avoid", ...eighth(sunriseMs, sunsetMs, RAHU_PART[wd]) },
    { id: "yamaganda", kind: "avoid", ...eighth(sunriseMs, sunsetMs, YAMAGANDA_PART[wd]) },
    { id: "gulika", kind: "avoid", ...eighth(sunriseMs, sunsetMs, GULIKA_PART[wd]) },
  ];

  return { useful, avoid };
}

/* -------------------------------------------------------------------------- */
/* Bilingual presentation                                                    */
/* -------------------------------------------------------------------------- */

export interface DayPeriodText {
  labelEn: string;
  labelTe: string;
  /** Plain "what this period is for / why it is avoided", family language. */
  aboutEn: string;
  aboutTe: string;
}

export const DAY_PERIOD_TEXT: Record<DayPeriodId, DayPeriodText> = {
  abhijit: {
    labelEn: "Abhijit Muhurta",
    labelTe: "అభిజిత్ ముహూర్తం",
    aboutEn:
      "A short period around midday that the tradition treats as generally favourable for beginning something when no better time is known. There is no Abhijit Muhurta on Wednesday.",
    aboutTe:
      "మధ్యాహ్నం చుట్టూ ఉండే చిన్న సమయం. మంచి సమయం తెలియనప్పుడు ఏదైనా మొదలుపెట్టడానికి సాధారణంగా అనుకూలంగా భావిస్తారు. బుధవారం అభిజిత్ ముహూర్తం ఉండదు.",
  },
  rahu: {
    labelEn: "Rahu Kalam",
    labelTe: "రాహు కాలం",
    aboutEn:
      "A period each day (its time depends on the weekday) traditionally avoided for starting important or auspicious activities. Work already in progress is not stopped.",
    aboutTe:
      "ప్రతి రోజు ఒక సమయం (వారాన్ని బట్టి మారుతుంది). ముఖ్యమైన లేదా శుభ కార్యాలు మొదలుపెట్టడానికి సంప్రదాయంగా వదిలేస్తారు. ఇప్పటికే జరుగుతున్న పని ఆపరు.",
  },
  yamaganda: {
    labelEn: "Yamaganda",
    labelTe: "యమగండం",
    aboutEn:
      "Another weekday-based period traditionally avoided for beginning important activities.",
    aboutTe:
      "ముఖ్యమైన పనులు మొదలుపెట్టడానికి సంప్రదాయంగా వదిలేసే మరో వార ఆధారిత సమయం.",
  },
  gulika: {
    labelEn: "Gulika Kalam",
    labelTe: "గుళిక కాలం",
    aboutEn:
      "A weekday-based period traditionally avoided for starting new or important work.",
    aboutTe:
      "కొత్త లేదా ముఖ్యమైన పని మొదలుపెట్టడానికి సంప్రదాయంగా వదిలేసే వార ఆధారిత సమయం.",
  },
};

/** The one-line statement that must accompany these timings. */
export const DAY_TIMINGS_SCOPE_EN =
  "General traditional Panchanga timings for this location. These are not personalised using birth details. A time outside the periods marked to avoid is not automatically auspicious, and there is no single “best time”.";
export const DAY_TIMINGS_SCOPE_TE =
  "ఈ ప్రాంతానికి సాధారణ సంప్రదాయ పంచాంగ సమయాలు. ఇవి పుట్టిన వివరాలతో వ్యక్తిగతంగా లెక్కించినవి కావు. వదిలేయాల్సిన సమయాల బయట ఉన్న సమయం అదే శుభం అని కాదు, ఒకే “ఉత్తమ సమయం” అంటూ ఏదీ లేదు.";

/* -------------------------------------------------------------------------- */
/* Evidence — rule provenance and output comparison, recorded SEPARATELY     */
/* -------------------------------------------------------------------------- */

export interface DayPeriodRuleSource {
  ruleEn: string;
  /** Independent published statement(s) of the RULE (not the computed output). */
  ruleRefs: readonly string[];
}

export const DAY_TIMINGS_RULE_SOURCES: Record<DayPeriodId, DayPeriodRuleSource> = {
  rahu: {
    ruleEn:
      "Daytime (sunrise→sunset) in 8 equal parts; the Rahu part is a fixed index per weekday — Sun 8, Mon 2, Tue 7, Wed 5, Thu 6, Fri 4, Sat 3.",
    ruleRefs: ["https://en.wikipedia.org/wiki/Rahu_kala (accessed 2026-09-10) — states the 8-part division and the exact weekday indices"],
  },
  yamaganda: {
    ruleEn:
      "Same 8-part daytime division; the Yamaganda part per weekday — Sun 5, Mon 4, Tue 3, Wed 2, Thu 1, Fri 7, Sat 6.",
    ruleRefs: ["Standard Panchanga inauspicious-period tables (e.g. Drik Panchang, mPanchang) state this weekday index set. No single independent rule reference was captured at authoring time — see the reviewer limitation."],
  },
  gulika: {
    ruleEn:
      "Same 8-part daytime division; the Gulika part per weekday — Sun 7, Mon 6, Tue 5, Wed 4, Thu 3, Fri 2, Sat 1.",
    ruleRefs: ["Standard Panchanga inauspicious-period tables state this weekday index set. No single independent rule reference was captured at authoring time — see the reviewer limitation."],
  },
  abhijit: {
    ruleEn:
      "Daytime in 15 equal muhurta; Abhijit is the 8th (centred on local solar noon). No Abhijit Muhurta on Wednesday.",
    ruleRefs: [
      "https://en.wikipedia.org/wiki/Muhurta (accessed 2026-09-10) — the 15 daytime muhurta and the midday muhurta",
      "Drik Panchang Day Panchang returns \"Abhijit Muhurta: None\" on Wednesday (accessed 2026-09-09)",
    ],
  },
};

export const DAY_TIMINGS_OUTPUT_VALIDATION = {
  method:
    "Computed start/end times compared to a published panchang's output, to the minute (±3 min tolerance), in tests/day-timings.test.mjs.",
  sources: [
    "Drik Panchang — Day Panchang: Hyderabad (geoname-id 1269843) Thu 2026-09-10 and Wed 2026-09-09; Frisco (geoname-id 4692559) Thu 2026-09-10 and Sun 2026-11-01 (US fall-back day).",
  ],
  url: "https://www.drikpanchang.com/panchang/day-panchang.html",
  accessedISO: "2026-09-10",
  independent: false,
  reviewerLimitation:
    "SINGLE-SOURCE output comparison (Drik Panchang only). Independent computed-output cross-checks (ProKerala, mPanchang) were rate-limited / blocked at authoring time. Treat the output validation as a single-source comparison, not independent validation, until a second published panchang is compared. The Rahu Kalam RULE is independently documented (Wikipedia); the Yamaganda / Gulika weekday indices are not yet backed by a single independent rule reference.",
} as const;

/** Not shown to families. Deferred until sourced and independently validated. */
export const DAY_TIMINGS_DEFERRED = {
  brahmaMuhurta:
    "Brahma Muhurta is NOT displayed. Its documented conventions disagree: a FIXED offset of two 48-minute muhurta before sunrise (Wikipedia \"Muhurta\": ~96 minutes) versus a PROPORTIONAL two muhurta of night/15. The applicable night is also unsettled (previous sunset → this sunrise, or this sunset → next sunrise). On DST-transition days the one comparison source (Drik Panchang) appears to use a nominal-24h night. Rather than show an approximate religious time, it is deferred until the convention and the adjacent-night definition can be sourced and independently validated.",
} as const;

/** Kept for the screens' short "About this calculation" line. */
export const DAY_TIMINGS_PROVENANCE = {
  convention:
    "Rahu Kalam / Yamaganda / Gulika Kalam: the daytime (sunrise→sunset) in 8 equal parts, a fixed part index per weekday. Abhijit Muhurta: the 8th of 15 equal daytime muhurta, around solar noon (none on Wednesday). Computed times were compared to a published panchang to the minute — see below. Brahma Muhurta is not shown (its convention is unresolved).",
  url: DAY_TIMINGS_OUTPUT_VALIDATION.url,
  accessedISO: DAY_TIMINGS_OUTPUT_VALIDATION.accessedISO,
  outputComparison: "Single-source comparison against Drik Panchang (not independent validation).",
} as const;

/** Future backlog only — NOT implemented. Personalised timing that needs birth
 * details or an activity-specific rule. */
export const DAY_TIMINGS_BACKLOG: readonly string[] = [
  "name-based timing",
  "birth-star (Janma Nakshatra) / Rashi based timing",
  "Tara Bala / Chandra Bala",
  "birth date/time/place astrology",
  "activity-specific personalised Muhurtham",
  "Brahma Muhurta (deferred — see DAY_TIMINGS_DEFERRED)",
];
