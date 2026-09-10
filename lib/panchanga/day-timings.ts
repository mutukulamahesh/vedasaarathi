// General daily periods — the "useful" and "traditionally avoided" times that
// apply to EVERYONE in a location on a given civil day.
//
// These are NOT personalised astrology. They are deterministic functions of the
// day's sunrise, sunset and weekday only:
//
//   - the day (sunrise → sunset) split into 8 equal parts gives Rahu Kalam,
//     Yamaganda and Gulika Kalam, each a fixed part-of-day index per weekday;
//   - the day split into 15 equal "muhurta" gives Abhijit Muhurta (the 8th,
//     around local solar noon), which the tradition treats as absent on
//     Wednesday;
//   - the night (≈ 24h − day) split into 15 gives the muhurta length used for
//     Brahma Muhurta (the two muhurta ending 1 muhurta before sunrise).
//
// Sunrise / sunset come from the engine (already DST-safe and host-timezone
// independent), so every period here inherits those properties and works
// offline. Overlaps between periods are real and are shown, not hidden.
//
// PROVENANCE (see DAY_TIMINGS_PROVENANCE):
//   Drik Panchang — Day Panchang (Aaj Ka Panchang), inauspicious-period section.
//   The weekday part-of-day tables and the Abhijit / Brahma constructions were
//   checked to the minute against Drik Panchang for Hyderabad (Thu 2026-09-10,
//   Wed 2026-09-09) and Frisco (Thu 2026-09-10). See tests/day-timings.test.mjs.

export type DayPeriodId =
  | "abhijit"
  | "brahma"
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
  /** Periods commonly treated as good for prayer / beginning something. */
  useful: DayPeriod[];
  /** Periods traditionally avoided for starting important activities. */
  avoid: DayPeriod[];
}

/* -------------------------------------------------------------------------- */
/* Weekday part-of-day tables (day divided into 8 equal parts, 1-indexed).    */
/* Index 0 = Sunday … 6 = Saturday. Values match Drik Panchang.               */
/* -------------------------------------------------------------------------- */

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
 * `nightMs` is the length of the following night; when omitted it is taken as
 * 24h − day, which matches Drik to the minute.
 */
export function computeDayTimings(
  sunriseMs: number,
  sunsetMs: number,
  weekday: number,
  nightMs = 86_400_000 - (sunsetMs - sunriseMs),
): DayTimings {
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
  // Brahma Muhurta — the two muhurta (night/15 each) ending one muhurta before
  // sunrise.
  const nightMuhurta = nightMs / 15;
  useful.unshift({
    id: "brahma",
    kind: "useful",
    startMs: Math.round(sunriseMs - 2 * nightMuhurta),
    endMs: Math.round(sunriseMs - nightMuhurta),
  });

  const avoid: DayPeriod[] = [
    { id: "rahu", kind: "avoid", ...eighth(sunriseMs, sunsetMs, RAHU_PART[wd]) },
    { id: "yamaganda", kind: "avoid", ...eighth(sunriseMs, sunsetMs, YAMAGANDA_PART[wd]) },
    { id: "gulika", kind: "avoid", ...eighth(sunriseMs, sunsetMs, GULIKA_PART[wd]) },
  ];

  return { useful, avoid };
}

/* -------------------------------------------------------------------------- */
/* Bilingual presentation — labels + what each period is commonly used /      */
/* avoided for. Kept here so the engine result carries no UI strings.        */
/* -------------------------------------------------------------------------- */

export interface DayPeriodText {
  labelEn: string;
  labelTe: string;
  /** Plain "what this period is for / why it is avoided", family language. */
  aboutEn: string;
  aboutTe: string;
}

export const DAY_PERIOD_TEXT: Record<DayPeriodId, DayPeriodText> = {
  brahma: {
    labelEn: "Brahma Muhurta",
    labelTe: "బ్రహ్మ ముహూర్తం",
    aboutEn:
      "The quiet period before sunrise. Traditionally kept for prayer, meditation and study — not a general “start any work” window.",
    aboutTe:
      "సూర్యోదయానికి ముందు ప్రశాంతమైన సమయం. ప్రార్థన, ధ్యానం, అధ్యయనానికి సంప్రదాయంగా ఉంచుతారు — ఇది సాధారణ పని మొదలుపెట్టే సమయం కాదు.",
  },
  abhijit: {
    labelEn: "Abhijit Muhurta",
    labelTe: "అభిజిత్ ముహూర్తం",
    aboutEn:
      "A short period around midday that many treat as generally favourable for beginning something when no better time is known. The tradition treats Wednesday as having no Abhijit Muhurta.",
    aboutTe:
      "మధ్యాహ్నం చుట్టూ ఉండే చిన్న సమయం. మంచి సమయం తెలియనప్పుడు ఏదైనా మొదలుపెట్టడానికి సాధారణంగా అనుకూలంగా భావిస్తారు. బుధవారం అభిజిత్ ముహూర్తం ఉండదని సంప్రదాయం.",
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

/** The one-line honesty statement that must accompany these timings. */
export const DAY_TIMINGS_SCOPE_EN =
  "General timings for everyone in this location. Not personalised and not astrology. Outside a period marked to avoid is not automatically “auspicious”, and there is no single “best time”.";
export const DAY_TIMINGS_SCOPE_TE =
  "ఈ ప్రాంతంలో అందరికీ సాధారణ సమయాలు. ఇది వ్యక్తిగతం కాదు, జ్యోతిష్యం కాదు. వదిలేయాల్సిన సమయం బయట ఉంటే అదే శుభం అని కాదు, ఒకే “ఉత్తమ సమయం” అంటూ ఏదీ లేదు.";

export const DAY_TIMINGS_PROVENANCE = {
  source: "Drik Panchang — Day Panchang (Aaj Ka Panchang), inauspicious-period section",
  url: "https://www.drikpanchang.com/panchang/day-panchang.html",
  accessedISO: "2026-09-10",
  convention:
    "Day (sunrise→sunset) in 8 equal parts: Rahu Kalam / Yamaganda / Gulika Kalam are a fixed part index per weekday. Abhijit Muhurta = the 8th of 15 equal day-muhurta (absent on Wednesday). Brahma Muhurta = the two night-muhurta (night/15 each) ending one muhurta before sunrise. Checked to the minute against Drik Panchang for Hyderabad and Frisco.",
} as const;

/** Future backlog only — NOT implemented here. Personalised timing that needs
 * birth details or an activity-specific rule. Kept as a named list so the app
 * can state plainly that it does not do this. */
export const DAY_TIMINGS_BACKLOG: readonly string[] = [
  "name-based timing",
  "birth-star (Janma Nakshatra) / Rashi based timing",
  "Tara Bala / Chandra Bala",
  "birth date/time/place astrology",
  "activity-specific personalised Muhurtham",
];
