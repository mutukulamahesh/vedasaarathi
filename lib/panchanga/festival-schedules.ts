// Published / selected festival SCHEDULES - explicit dates for one named year
// at named locations, as opposed to the dynamic date-selection rules in
// festival-rules.ts (which compute a date from latitude/longitude/timezone).
//
// WHY THIS EXISTS. Bathukamma's nine named days are not chosen by any single
// tithi rule that every source agrees on. The research in
// docs/temp/bathukamma-2026-date-audit-2026-10-01.md (PR #12, revision 3)
// found documented conventions (tithi at sunrise, a strict nine-day count,
// an "evening Ashtami" view, and the Telangana Government's published date)
// that disagree with one another in some years and places. Rather than invent
// a universal algorithm, the product owner (Mahesh) chose an explicit 2026
// schedule. This module holds exactly that decision as DATA:
//
//   - ONE year (2026) only. There is deliberately no formula here: asking for
//     any other year finds no date, so the festival is simply not shown -
//     the same "no date, never a guess" behaviour as a deferred rule.
//   - Named locations only, matched by the saved location's own city,
//     region and country (the existing location model), plus a distance
//     check against that city's coordinates. NEVER by time zone alone:
//     the research showed a shared time zone is not a reliable proxy for a
//     shared observance date, and many unsupported cities share these zones.
//   - Each location carries its OWN basis, evidence status and source PER
//     DAY, so Hyderabad (only Saddula is named by the Telangana Government
//     2026 publication; 10 Oct is separately sourced; 11-17 Oct are
//     inferred) and the US cities
//     (Mahesh's selected sunrise-based nine-day schedule, a product decision
//     rather than a published source) are never blurred together.
//
// No ritual instructions, offerings, mantras, songs or timings live here -
// only names and dates. No observance time is computed or stored for any
// entry: the research established dates only.

import type { ReviewStatus } from "@/lib/content/review-status";

export type FestivalScheduleId = "bathukamma-2026";

/** The saved location's descriptive fields, as entered or confirmed by the
 * user (lib/location/model.ts ReadyLocation). */
export interface FestivalPlace {
  city: string;
  region: string;
  country: string;
}

/**
 * Evidence status for ONE schedule date at ONE location. Recorded per day,
 * because the days of one schedule can rest on different evidence (e.g. at
 * Hyderabad only Saddula is named by the government publication):
 * - "published-date": the date is stated outright by a named, dated
 *   official publication for that year and place.
 * - "separately-sourced": the date is established by a different, cited
 *   fact (e.g. Mahalaya Amavasya), NOT by the publication that sources the
 *   other days.
 * - "sequence-inferred": the date exists only because the named days are
 *   assumed to run on consecutive calendar days between two sourced
 *   endpoints. No source names this day.
 * - "product-selected": a date chosen as an explicit product decision from
 *   researched candidates. Not a published source and not independently
 *   validated.
 */
export type ScheduleEvidenceStatus =
  | "published-date" | "separately-sourced" | "sequence-inferred" | "product-selected";

/** The evidence behind one day at one location. */
export interface ScheduleDayEvidence {
  /** Plain statement of where THIS date comes from. */
  basis: string;
  evidenceStatus: ScheduleEvidenceStatus;
  /** Exact source URL for this date's basis. */
  provenanceUrl: string;
  /** ISO date the source was accessed. */
  accessedISO: string;
}

export interface ScheduleLocation {
  /** Stable id, also used in cache keys. */
  id: string;
  /** Display name for reviewer notes. */
  label: string;
  /** Normalised (see `normPlace`) accepted spellings of the city. */
  cityAliases: readonly string[];
  /** Normalised accepted spellings of the region/state. The location model
   * allows a blank region, so a blank region is accepted; a non-blank one
   * must match. */
  regionAliases: readonly string[];
  /** Normalised accepted spellings of the country. */
  countryAliases: readonly string[];
  /** Reference coordinates for the city (GeoNames cities15000, the same
   * dataset as public/geodata/places-v1.json). */
  latitude: number;
  longitude: number;
  /** A saved location farther than this from the reference point does not
   * match, even when the names do (a typo or a same-named place elsewhere). */
  maxDistanceKm: number;
  /** Evidence for each day (1..9) at this location - per day, never one
   * location-wide status copied onto every date. See `scheduleDayEvidence`. */
  dayEvidence: Readonly<Record<number, ScheduleDayEvidence>>;
  /** Sacred-content authority label (.claude/rules/sacred-content.md). No
   * date in this schedule has been reviewed by a priest, so every location
   * is REVIEW_REQUIRED; the difference in provenance between days and
   * locations is carried by each day's `evidenceStatus` and `basis`, never
   * by a stronger label. */
  reviewStatus: ReviewStatus;
}

export interface ScheduleDay {
  /** 1-based position in the named sequence. */
  day: number;
  /** Local civil date YYYY-MM-DD. */
  dateISO: string;
}

export interface FestivalSchedule {
  id: FestivalScheduleId;
  /** The ONE year these dates belong to. */
  year: number;
  locations: readonly ScheduleLocation[];
  /** Day number -> date. The same dates apply at every supported location
   * for this schedule (a product decision, documented per location's own
   * `basis`); a location not listed has no dates at all. */
  days: readonly ScheduleDay[];
  /** One short family-facing sentence (EN / TE) shown where the Calendar
   * shows festival details. The detailed basis lives per location. */
  familyNote: string;
  familyNoteTe: string;
  /** The research document this schedule was decided from. */
  researchReference: string;
}

const US = ["united states", "united states of america", "usa", "us", "u s", "u s a", "america"];

const SELECTED_US_BASIS =
  "Dates follow the selected sunrise-based nine-day Bathukamma schedule for " +
  "2026 (10-18 Oct), a product decision by the VedaSaarathi product owner. " +
  "It is not a published source, not a temple or government schedule, and " +
  "not a universal ruling. Research (PR #12) found that for US cities day 1 " +
  "could be 9 or 10 Oct depending on the convention, and that the evening-" +
  "Ashtami view could place the last day on 17 Oct in Pacific-time cities; " +
  "this schedule uses 10-18 Oct. Drik Panchang was one input to that " +
  "research, not the source of these dates.";

/** The research PR this selection was made from (its report is
 * docs/temp/bathukamma-2026-date-audit-2026-10-01.md on that PR's branch). */
const SELECTED_US_URL = "https://github.com/mutukulamahesh/vedasaarathi/pull/12";

/** The evidence for `day` at `loc`, or null when that day has none. */
export function scheduleDayEvidence(loc: ScheduleLocation, day: number): ScheduleDayEvidence | null {
  return loc.dayEvidence[day] ?? null;
}

const NINE_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** The same evidence for every one of the nine days. */
function sameForAllDays(e: ScheduleDayEvidence): Record<number, ScheduleDayEvidence> {
  return Object.fromEntries(NINE_DAYS.map((d) => [d, e]));
}

const RESEARCH_URL = "https://github.com/mutukulamahesh/vedasaarathi/pull/12";

/** Hyderabad: each day carries its own, different evidence. ONLY Saddula
 * (day 9) is named by the Telangana Government publication. */
const HYDERABAD_DAY_EVIDENCE: Record<number, ScheduleDayEvidence> = {
  ...sameForAllDays({
    basis:
      "Inferred, not published: this date is one of the consecutive days " +
      "between the separately sourced start (10 Oct, Mahalaya Amavasya) and " +
      "the government-published final day (Saddula Bathukamma, 18 Oct), " +
      "assuming the nine named days run on consecutive dates. No Telangana " +
      "Government publication names this day (PR #12 research, revision 2).",
    evidenceStatus: "sequence-inferred",
    provenanceUrl: RESEARCH_URL,
    accessedISO: "2026-10-01",
  }),
  1: {
    basis:
      "Separately sourced: 10 Oct 2026 is Mahalaya Amavasya at Hyderabad " +
      "under every convention checked in the PR #12 research. This date is " +
      "NOT named by the Telangana Government publication, which names only " +
      "Saddula Bathukamma (18 Oct).",
    evidenceStatus: "separately-sourced",
    provenanceUrl: RESEARCH_URL,
    accessedISO: "2026-10-01",
  },
  9: {
    basis:
      "Published: the Telangana Government's 2026 holiday list names " +
      "Saddula Bathukamma on 18 Oct 2026. This is the only day of the nine " +
      "that the publication names.",
    evidenceStatus: "published-date",
    provenanceUrl: "https://www.telangana.gov.in/downloads/calendar-2026/",
    accessedISO: "2026-10-01",
  },
};

function usLocation(
  id: string, label: string, city: readonly string[], region: readonly string[],
  latitude: number, longitude: number,
): ScheduleLocation {
  return {
    id, label, cityAliases: city, regionAliases: region, countryAliases: US,
    latitude, longitude, maxDistanceKm: 60,
    dayEvidence: sameForAllDays({
      basis: SELECTED_US_BASIS,
      evidenceStatus: "product-selected",
      provenanceUrl: SELECTED_US_URL,
      accessedISO: "2026-10-01",
    }),
    reviewStatus: "REVIEW_REQUIRED",
  };
}

export const BATHUKAMMA_2026: FestivalSchedule = {
  id: "bathukamma-2026",
  year: 2026,
  locations: [
    {
      id: "hyderabad",
      label: "Hyderabad, Telangana, India",
      cityAliases: ["hyderabad"],
      regionAliases: ["telangana", "tg", "ts"],
      countryAliases: ["india", "in", "bharat"],
      latitude: 17.384, longitude: 78.4564, maxDistanceKm: 60,
      dayEvidence: HYDERABAD_DAY_EVIDENCE,
      reviewStatus: "REVIEW_REQUIRED",
    },
    usLocation("frisco", "Frisco, Texas, USA", ["frisco"], ["texas", "tx"], 33.1507, -96.8236),
    usLocation("dallas", "Dallas, Texas, USA", ["dallas"], ["texas", "tx"], 32.7831, -96.8067),
    usLocation(
      "new-york", "New York City, New York, USA",
      ["new york city", "new york", "nyc"], ["new york", "ny", "new york state"],
      40.7143, -74.006,
    ),
    usLocation("chicago", "Chicago, Illinois, USA", ["chicago"], ["illinois", "il"], 41.85, -87.65),
    usLocation(
      "los-angeles", "Los Angeles, California, USA", ["los angeles"], ["california", "ca"],
      34.0522, -118.2437,
    ),
    usLocation(
      "san-francisco", "San Francisco, California, USA", ["san francisco"], ["california", "ca"],
      37.7749, -122.4194,
    ),
    usLocation(
      "san-jose", "San Jose, California, USA", ["san jose"], ["california", "ca"],
      37.3394, -121.895,
    ),
    usLocation(
      "seattle", "Seattle, Washington, USA", ["seattle"], ["washington", "wa", "washington state"],
      47.6062, -122.3321,
    ),
  ],
  days: [
    { day: 1, dateISO: "2026-10-10" },
    { day: 2, dateISO: "2026-10-11" },
    { day: 3, dateISO: "2026-10-12" },
    { day: 4, dateISO: "2026-10-13" },
    { day: 5, dateISO: "2026-10-14" },
    { day: 6, dateISO: "2026-10-15" },
    { day: 7, dateISO: "2026-10-16" },
    { day: 8, dateISO: "2026-10-17" },
    { day: 9, dateISO: "2026-10-18" },
  ],
  familyNote:
    "This calendar follows the selected nine-day Bathukamma schedule. Local " +
    "traditions and community celebration dates may differ.",
  familyNoteTe:
    "ఈ క్యాలెండర్ ఎంచుకున్న తొమ్మిది రోజుల బతుకమ్మ తేదీలను అనుసరిస్తుంది. " +
    "స్థానిక ఆచారాలు, సామూహిక వేడుకల తేదీలు వేరుగా ఉండవచ్చు.",
  researchReference: "docs/temp/bathukamma-2026-date-audit-2026-10-01.md (PR #12, revision 3)",
};

const SCHEDULES: Record<FestivalScheduleId, FestivalSchedule> = {
  "bathukamma-2026": BATHUKAMMA_2026,
};

export function festivalSchedule(id: FestivalScheduleId): FestivalSchedule {
  return SCHEDULES[id];
}

/** Lower-cases, trims, drops common punctuation and collapses whitespace -
 * so "San José", "san jose", "SAN JOSE," all compare equal. Accents are
 * folded too (é -> e). */
export function normPlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`.,!?:;()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Great-circle distance in km (haversine, mean Earth radius). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The schedule location this saved place belongs to, or null. ALL of these
 * must hold: the city is one of that location's accepted spellings; the
 * country is too; the region is blank or one of its spellings; and the saved
 * coordinates are within `maxDistanceKm` of the city. Time zone plays no
 * part. A missing place (no city/region/country available) never matches.
 */
export function resolveScheduleLocation(
  schedule: FestivalSchedule,
  place: FestivalPlace | undefined,
  latitude: number,
  longitude: number,
): ScheduleLocation | null {
  if (!place) return null;
  const city = normPlace(place.city ?? "");
  const region = normPlace(place.region ?? "");
  const country = normPlace(place.country ?? "");
  if (!city || !country) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  for (const loc of schedule.locations) {
    if (!loc.cityAliases.includes(city)) continue;
    if (!loc.countryAliases.includes(country)) continue;
    if (region && !loc.regionAliases.includes(region)) continue;
    if (distanceKm(latitude, longitude, loc.latitude, loc.longitude) > loc.maxDistanceKm) continue;
    return loc;
  }
  return null;
}

/** The date of `day` in this schedule, or null when the day is not listed. */
export function scheduleDate(schedule: FestivalSchedule, day: number): string | null {
  return schedule.days.find((d) => d.day === day)?.dateISO ?? null;
}

/** A short, stable key for caches: the resolved location id per schedule,
 * or "" when the place resolves to no schedule location at all. */
export function scheduleLocationKey(
  place: FestivalPlace | undefined,
  latitude: number,
  longitude: number,
): string {
  const parts: string[] = [];
  for (const schedule of Object.values(SCHEDULES)) {
    const loc = resolveScheduleLocation(schedule, place, latitude, longitude);
    if (loc) parts.push(`${schedule.id}:${loc.id}`);
  }
  return parts.join(",");
}
