// Validation fixtures for the Panchanga engine, against independent published
// references (Drik Panchang, https://www.drikpanchang.com).
//
// A field is RELEASED for display only if the engine reproduces every fixture
// for that field within tolerance. Anything that fails stays hidden — the Home
// card shows its honest "not calculated" state instead. See ./engine.ts for
// the astronomical conventions.
//
// Tolerances
// - Sunrise / sunset: ±3 minutes (SunCalc geometric vs drik-ganita; observed
//   max difference in the fixtures below is 2 minutes).
// - Tithi / Nakshatra / Paksha: normalised exact name match, compared against
//   the value prevailing at that day's local SUNRISE (the drik-panchang "day"
//   value), not the current instant.
//
// PROVENANCE  Every fixture carries a `provenance` block: the source, the exact
// URL fetched, the access date, the selected location (with the Drik Panchang
// geoname-id), the time zone, and the reference values quoted verbatim from the
// page. `complete: true` means all of that was captured; `complete: false`
// means the exact evidence could not be recovered and the fixture provenance is
// incomplete. Links are never invented.
//
// Festival: the Vinayaka Chavithi fixture FAILS on purpose and is recorded so.
// Drik Panchang places Ganesha Chaturthi 2026 on 14 Sep (Chaturthi begins
// 07:06 AM on 14 Sep, just after sunrise; drik applies the madhyahna-vyapti
// rule). A plain "Chaturthi prevails at sunrise" scan lands on 15 Sep. Until a
// madhyahna rule is modelled and validated, the festival day is not displayed
// and no muhurtham is ever computed.

import {
  computePanchanga, minutesOfDay, localWallToUtcMs,
  tithiKey, nakshatraKey, madhyahnaVyaptiFestivalDay, type PanchangaInput,
} from "./engine";

export interface FixtureProvenance {
  source: string;
  /** The exact page fetched. Never invented. */
  url: string;
  /** ISO date the page was accessed. */
  accessedISO: string;
  /** Selected location, including the Drik Panchang geoname-id. */
  place: string;
  timezone: string;
  /** Reference values, quoted verbatim from the page. */
  referenceValues: Record<string, string>;
  /** false when the exact evidence above could not be fully recovered. */
  complete: boolean;
  note?: string;
}

export interface DayFixture {
  place: string;
  dateISO: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Values used for the comparison. Times are local wall clock "HH:MM". */
  published: {
    sunrise: string;
    sunset: string;
    tithiAtSunrise: string;
    nakshatraAtSunrise: string;
    paksha: string;
    /** Published local end date+time of the sunrise Tithi / Nakshatra,
     * "YYYY-MM-DD HH:MM" in this fixture's timezone (from Drik Panchang). */
    transitions: { tithiEndsLocal: string; nakshatraEndsLocal: string };
  };
  provenance: FixtureProvenance;
}

const DP_DAY = "https://www.drikpanchang.com/panchang/day-panchang.html";

/** Hyderabad + Frisco, two dates each (2026-11-01 is across the US DST change). */
export const DAY_FIXTURES: readonly DayFixture[] = [
  {
    place: "Hyderabad, India", dateISO: "2026-09-09",
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    published: {
      sunrise: "06:03", sunset: "18:23",
      tithiAtSunrise: "Trayodashi", nakshatraAtSunrise: "Ashlesha", paksha: "Krishna",
      transitions: { tithiEndsLocal: "2026-09-09 12:30", nakshatraEndsLocal: "2026-09-09 15:14" },
    },
    provenance: {
      source: "Drik Panchang — Day Panchang",
      url: `${DP_DAY}?date=09/09/2026&geoname-id=1269843`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        sunrise: "06:03 AM",
        sunset: "06:23 PM",
        tithi: "Trayodashi (Krishna Trayodashi) ending at 12:30 PM, then Chaturdashi",
        nakshatra: "Ashlesha concluding at 03:14 PM, then Magha",
        lunarMonth: "Purnimanta: Bhadrapada; Amanta: Shravana",
        paksha: "Krishna Paksha",
      },
      complete: true,
    },
  },
  {
    place: "Hyderabad, India", dateISO: "2026-11-01",
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    published: {
      sunrise: "06:15", sunset: "17:45",
      tithiAtSunrise: "Saptami", nakshatraAtSunrise: "Pushya", paksha: "Krishna",
      transitions: { tithiEndsLocal: "2026-11-01 14:51", nakshatraEndsLocal: "2026-11-02 04:30" },
    },
    provenance: {
      source: "Drik Panchang — Day Panchang",
      url: `${DP_DAY}?date=01/11/2026&geoname-id=1269843`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        sunrise: "06:15 AM",
        sunset: "05:45 PM",
        tithi: "Saptami (Krishna Paksha) continues upto 02:51 PM, then Ashtami",
        nakshatra: "Pushya extends upto 04:30 AM, Nov 02, then Ashlesha",
        paksha: "Krishna Paksha",
      },
      complete: true,
    },
  },
  {
    place: "Frisco, Texas, USA", dateISO: "2026-09-09",
    latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
    published: {
      sunrise: "07:07", sunset: "19:42",
      tithiAtSunrise: "Chaturdashi", nakshatraAtSunrise: "Magha", paksha: "Krishna",
      transitions: { tithiEndsLocal: "2026-09-10 00:03", nakshatraEndsLocal: "2026-09-10 03:34" },
    },
    provenance: {
      source: "Drik Panchang — Day Panchang",
      url: `${DP_DAY}?date=09/09/2026&geoname-id=4692559`,
      accessedISO: "2026-09-09",
      place: "Frisco, Texas, United States (Drik Panchang geoname-id 4692559)",
      timezone: "America/Chicago",
      referenceValues: {
        sunrise: "07:07 AM",
        sunset: "07:42 PM",
        tithi: "Chaturdashi (Krishna Paksha) until 12:03 AM, Sep 10",
        nakshatra: "Magha until 03:34 AM, Sep 10",
        lunarMonth: "Purnimanta: Bhadrapada; Amanta: Shravana",
        paksha: "Krishna Paksha",
      },
      complete: true,
    },
  },
  {
    place: "Frisco, Texas, USA", dateISO: "2026-11-01",
    latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
    published: {
      sunrise: "06:46", sunset: "17:36",
      tithiAtSunrise: "Ashtami", nakshatraAtSunrise: "Pushya", paksha: "Krishna",
      transitions: { tithiEndsLocal: "2026-11-02 01:40", nakshatraEndsLocal: "2026-11-01 17:00" },
    },
    provenance: {
      source: "Drik Panchang — Day Panchang",
      url: `${DP_DAY}?date=01/11/2026&geoname-id=4692559`,
      accessedISO: "2026-09-09",
      place: "Frisco, Texas, United States (Drik Panchang geoname-id 4692559)",
      timezone: "America/Chicago",
      referenceValues: {
        sunrise: "06:46 AM",
        sunset: "05:36 PM",
        tithi: "Ashtami (Krishna Paksha) ending at 01:40 AM, Nov 02",
        nakshatra: "Pushya (ends at 05:00 PM), followed by Ashlesha",
        paksha: "Krishna Paksha",
        note: "1 Nov 2026 is when US daylight saving ends; times are CST.",
      },
      complete: true,
    },
  },
];

export const SUN_TOLERANCE_MIN = 3;

export interface FestivalFixture {
  name: string;
  from: { dateISO: string; latitude: number; longitude: number; timezone: string };
  rule: { name: string; masa: string; paksha: string; tithi: string };
  /** Published festival date (Drik Panchang). */
  publishedDateISO: string;
  provenance: FixtureProvenance;
}

export const FESTIVAL_FIXTURE: FestivalFixture = {
  name: "Vinayaka Chavithi (Ganesha Chaturthi) 2026",
  from: { dateISO: "2026-09-01", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
  rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
  publishedDateISO: "2026-09-14",
  provenance: {
    source: "Drik Panchang — Ganesh Chaturthi date and puja time",
    url: "https://www.drikpanchang.com/festivals/ganesh-chaturthi/ganesh-chaturthi-date-time.html?geoname-id=1269843&year=2026",
    accessedISO: "2026-09-09",
    place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
    timezone: "Asia/Kolkata",
    referenceValues: {
      pageTitle: "2026 Ganesh Chaturthi date and puja time for Hyderabad, Telangana, India",
      date: "Monday, September 14, 2026",
      chaturthiBegins: "07:06 AM on Sep 14, 2026",
      chaturthiEnds: "07:44 AM on Sep 15, 2026",
    },
    complete: true,
    note:
      "Chaturthi begins 07:06 AM on 14 Sep (just after sunrise); Drik applies " +
      "madhyahna-vyapti, so the festival is 14 Sep. Our sunrise scan sees " +
      "Tritiya at sunrise on 14 Sep and picks 15 Sep — hence BLOCKED.",
  },
};

/* -------------------------------------------------------------------------- */
/* Descriptive-field fixtures: samvatsara / ayana / ritu / vaara.            */
/* -------------------------------------------------------------------------- */

export interface DescriptiveFixture {
  place: string;
  dateISO: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Values quoted from Drik Panchang. samvatsara = the South Indian
   * (Shaka-based) Samvatsara name; the North Indian / Vikrama cycle names a
   * different year and is recorded in `provenance.referenceValues`. ritu = the
   * Vedic (lunar-month) ritu. */
  published: { samvatsara: string; ayana: string; ritu: string; vaara: string };
  provenance: FixtureProvenance;
}

export const DESCRIPTIVE_FIXTURES: readonly DescriptiveFixture[] = [
  {
    place: "Hyderabad, India", dateISO: "2026-09-09",
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    published: { samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", vaara: "Budhavara" },
    provenance: {
      source: "Drik Panchang — Day Panchang",
      url: `${DP_DAY}?date=09/09/2026&geoname-id=1269843`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        shakaSamvat: "1948 Parabhava (Shaka-based / South Indian Samvatsara)",
        vikramaSamvata: "2083 Siddharthi (North Indian / Vikrama cycle — a different year name)",
        ayana: "Dakshinayana",
        rituVedic: "Varsha (Monsoon)",
        rituDrik: "Sharad (Autumn) — Drik's solar-reckoning ritu differs from the Vedic ritu",
        vaara: "Budhawara (Wednesday)",
      },
      complete: true,
      note:
        "Samvatsara and ritu are traditions that disagree. VedaSaarathi shows " +
        "the South Indian (Shaka) Samvatsara and the Vedic ritu, and records " +
        "the Vikrama-cycle name and Drik's solar ritu here.",
    },
  },
  {
    place: "Frisco, Texas, USA", dateISO: "2026-09-09",
    latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
    published: { samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", vaara: "Budhavara" },
    provenance: {
      source: "Drik Panchang — Day Panchang",
      url: `${DP_DAY}?date=09/09/2026&geoname-id=4692559`,
      accessedISO: "2026-09-09",
      place: "Frisco, Texas, United States (Drik Panchang geoname-id 4692559)",
      timezone: "America/Chicago",
      referenceValues: {
        shakaSamvat: "1948 Parabhava",
        vikramaSamvata: "2083 Siddharthi",
        ayana: "Dakshinayana",
        rituVedic: "Varsha (Monsoon)",
        vaara: "Budhawara (Wednesday)",
      },
      complete: true,
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Madhyahna-vyapti festival fixtures: festival date + puja window.          */
/* -------------------------------------------------------------------------- */

export interface MadhyahnaFixture {
  name: string;
  from: { dateISO: string; latitude: number; longitude: number; timezone: string };
  rule: { name: string; masa: string; paksha: string; tithi: string };
  /** Published festival date (Drik Panchang). */
  publishedDateISO: string;
  /** Published "Madhyahna Ganesha Puja Muhurat" local clock window, "HH:MM". */
  publishedPujaWindow: { start: string; end: string };
  provenance: FixtureProvenance;
}

const DP_GANESH = "https://www.drikpanchang.com/festivals/ganesh-chaturthi/ganesh-chaturthi-date-time.html";

/** Vinayaka Chavithi by madhyahna-vyapti: four consecutive years at Hyderabad
 * (2024 leap year included) plus Frisco 2026 (US Central time). Each carries
 * the Drik Panchang festival-page URL, access date, and verbatim values. */
export const MADHYAHNA_FIXTURES: readonly MadhyahnaFixture[] = [
  {
    name: "Vinayaka Chavithi 2024",
    from: { dateISO: "2024-08-20", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
    rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
    publishedDateISO: "2024-09-07",
    publishedPujaWindow: { start: "11:00", end: "13:28" },
    provenance: {
      source: "Drik Panchang — Ganesh Chaturthi date and puja time",
      url: `${DP_GANESH}?geoname-id=1269843&year=2024`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        date: "Saturday, September 7, 2024",
        madhyahnaMuhurat: "11:00 AM to 01:28 PM",
        chaturthiBegins: "03:01 PM on Sep 06, 2024",
        chaturthiEnds: "05:37 PM on Sep 07, 2024",
      },
      complete: true,
    },
  },
  {
    name: "Vinayaka Chavithi 2025",
    from: { dateISO: "2025-08-10", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
    rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
    publishedDateISO: "2025-08-27",
    publishedPujaWindow: { start: "11:02", end: "13:33" },
    provenance: {
      source: "Drik Panchang — Ganesh Chaturthi date and puja time",
      url: `${DP_GANESH}?geoname-id=1269843&year=2025`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        date: "Wednesday, August 27, 2025",
        madhyahnaMuhurat: "11:02 AM to 01:33 PM",
        chaturthiBegins: "01:54 PM on Aug 26, 2025",
        chaturthiEnds: "03:44 PM on Aug 27, 2025",
      },
      complete: true,
    },
  },
  {
    name: "Vinayaka Chavithi 2026",
    from: { dateISO: "2026-09-01", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
    rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
    publishedDateISO: "2026-09-14",
    publishedPujaWindow: { start: "10:58", end: "13:25" },
    provenance: {
      source: "Drik Panchang — Ganesh Chaturthi date and puja time",
      url: `${DP_GANESH}?geoname-id=1269843&year=2026`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        date: "Monday, September 14, 2026",
        madhyahnaMuhurat: "10:58 AM to 01:25 PM",
        chaturthiBegins: "07:06 AM on Sep 14, 2026",
        chaturthiEnds: "07:44 AM on Sep 15, 2026",
      },
      complete: true,
    },
  },
  {
    name: "Vinayaka Chavithi 2027",
    from: { dateISO: "2027-08-25", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
    rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
    publishedDateISO: "2027-09-04",
    // Drik truncates the muhurat end at the Chaturthi tithi end (12:25 PM).
    publishedPujaWindow: { start: "11:01", end: "12:25" },
    provenance: {
      source: "Drik Panchang — Ganesh Chaturthi date and puja time",
      url: `${DP_GANESH}?geoname-id=1269843&year=2027`,
      accessedISO: "2026-09-09",
      place: "Hyderabad, Telangana, India (Drik Panchang geoname-id 1269843)",
      timezone: "Asia/Kolkata",
      referenceValues: {
        date: "Saturday, September 4, 2027",
        madhyahnaMuhurat: "11:01 AM to 12:25 PM",
        chaturthiBegins: "02:18 PM on Sep 03, 2027",
        chaturthiEnds: "12:25 PM on Sep 04, 2027",
        note: "Muhurat end is clamped to the Chaturthi tithi end, not the madhyahna end.",
      },
      complete: true,
    },
  },
  {
    name: "Vinayaka Chavithi 2026 — Frisco",
    from: { dateISO: "2026-09-01", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" },
    rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
    publishedDateISO: "2026-09-14",
    publishedPujaWindow: { start: "12:08", end: "14:37" },
    provenance: {
      source: "Drik Panchang — Ganesh Chaturthi date and puja time",
      url: `${DP_GANESH}?geoname-id=4692559&year=2026`,
      accessedISO: "2026-09-09",
      place: "Frisco, Texas, United States (Drik Panchang geoname-id 4692559)",
      timezone: "America/Chicago",
      referenceValues: {
        date: "Monday, September 14, 2026",
        madhyahnaMuhurat: "12:08 PM to 02:37 PM",
        chaturthiBegins: "08:36 PM on September 13, 2026",
        chaturthiEnds: "09:14 PM on September 14, 2026",
      },
      complete: true,
    },
  },
];

/** Tolerance for a puja-window bound (madhyahna ∩ tithi span) vs Drik's
 * published Madhyahna Muhurat: ±5 minutes (sunrise/sunset are each ±3;
 * observed max in the fixtures above is 1 minute). */
export const PUJA_WINDOW_TOLERANCE_MIN = 5;

/** Documented tolerance for a Tithi / Nakshatra end-time (transition)
 * comparison: SunCalc/Lahiri-family vs drik-ganita. Observed max in the
 * fixtures below is under 1 minute. */
export const TRANSITION_TOLERANCE_MIN = 5;

export type { FieldResult } from "./report-types";
import type { FieldResult } from "./report-types";

function inputFor(f: DayFixture): PanchangaInput {
  return {
    // An instant in the middle of the requested civil day, in its own tz.
    dateMs: localWallToUtcMs(
      Number(f.dateISO.slice(0, 4)), Number(f.dateISO.slice(5, 7)), Number(f.dateISO.slice(8, 10)),
      12, 0, 0, f.timezone,
    ),
    latitude: f.latitude,
    longitude: f.longitude,
    timezone: f.timezone,
  };
}

function publishedMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "YYYY-MM-DD HH:MM" in `timezone` → UTC ms. */
function publishedLocalToUtcMs(local: string, timezone: string): number {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) throw new Error(`bad published local time: ${local}`);
  return localWallToUtcMs(+m[1], +m[2], +m[3], +m[4], +m[5], 0, timezone);
}

/** Run every fixture and report, per field, whether it is released for display. */
export async function validatePanchanga(): Promise<{
  results: FieldResult[];
  released: Record<FieldResult["field"], boolean>;
}> {
  const sunrise: FieldResult = { field: "sunrise", released: true, cases: [] };
  const sunset: FieldResult = { field: "sunset", released: true, cases: [] };
  const tithi: FieldResult = { field: "tithi", released: true, cases: [] };
  const nakshatra: FieldResult = { field: "nakshatra", released: true, cases: [] };

  for (const f of DAY_FIXTURES) {
    const p = await computePanchanga(inputFor(f));
    const prov = { provenanceUrl: f.provenance.url, provenanceComplete: f.provenance.complete };

    const srMin = minutesOfDay(p.sunrise, f.timezone);
    const ssMin = minutesOfDay(p.sunset, f.timezone);
    const srDelta = Math.abs(srMin - publishedMinutes(f.published.sunrise));
    const ssDelta = Math.abs(ssMin - publishedMinutes(f.published.sunset));
    const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

    sunrise.cases.push({
      place: f.place, dateISO: f.dateISO, computed: fmt(srMin),
      published: f.published.sunrise, ok: srDelta <= SUN_TOLERANCE_MIN, deltaMin: srDelta, ...prov,
    });
    sunset.cases.push({
      place: f.place, dateISO: f.dateISO, computed: fmt(ssMin),
      published: f.published.sunset, ok: ssDelta <= SUN_TOLERANCE_MIN, deltaMin: ssDelta, ...prov,
    });

    // Tithi / Nakshatra: (1) the name at local sunrise, (2) its end timestamp.
    const tOk = tithiKey(p.tithiAtSunrise.name) === tithiKey(f.published.tithiAtSunrise)
      && p.pakshaAtSunrise.toLowerCase() === f.published.paksha.toLowerCase();
    tithi.cases.push({
      place: f.place, dateISO: f.dateISO, kind: "name",
      computed: `${p.pakshaAtSunrise} ${p.tithiAtSunrise.name}`,
      published: `${f.published.paksha} ${f.published.tithiAtSunrise}`, ok: tOk, ...prov,
    });
    const nOk = nakshatraKey(p.nakshatraAtSunrise.name) === nakshatraKey(f.published.nakshatraAtSunrise);
    nakshatra.cases.push({
      place: f.place, dateISO: f.dateISO, kind: "name",
      computed: p.nakshatraAtSunrise.name, published: f.published.nakshatraAtSunrise, ok: nOk, ...prov,
    });

    const tEndPub = publishedLocalToUtcMs(f.published.transitions.tithiEndsLocal, f.timezone);
    const nEndPub = publishedLocalToUtcMs(f.published.transitions.nakshatraEndsLocal, f.timezone);
    const tEndDelta = Math.round(Math.abs(p.tithiAtSunrise.endsAt.getTime() - tEndPub) / 60_000);
    const nEndDelta = Math.round(Math.abs(p.nakshatraAtSunrise.endsAt.getTime() - nEndPub) / 60_000);
    const showLocal = (ms: number) => new Intl.DateTimeFormat("en-CA", {
      timeZone: f.timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(ms)).replace(",", "");
    tithi.cases.push({
      place: f.place, dateISO: f.dateISO, kind: "transition",
      computed: `ends ${showLocal(p.tithiAtSunrise.endsAt.getTime())}`,
      published: `ends ${f.published.transitions.tithiEndsLocal}`,
      ok: tEndDelta <= TRANSITION_TOLERANCE_MIN, deltaMin: tEndDelta, ...prov,
    });
    nakshatra.cases.push({
      place: f.place, dateISO: f.dateISO, kind: "transition",
      computed: `ends ${showLocal(p.nakshatraAtSunrise.endsAt.getTime())}`,
      published: `ends ${f.published.transitions.nakshatraEndsLocal}`,
      ok: nEndDelta <= TRANSITION_TOLERANCE_MIN, deltaMin: nEndDelta, ...prov,
    });
  }

  for (const r of [sunrise, sunset, tithi, nakshatra]) r.released = r.cases.every((c) => c.ok);

  // Descriptive fields: samvatsara / ayana / ritu / vaara.
  const vaara: FieldResult = { field: "vaara", released: true, cases: [] };
  const ritu: FieldResult = { field: "ritu", released: true, cases: [] };
  const ayana: FieldResult = { field: "ayana", released: true, cases: [] };
  const samvatsara: FieldResult = { field: "samvatsara", released: true, cases: [] };
  for (const f of DESCRIPTIVE_FIXTURES) {
    const p = await computePanchanga({
      dateMs: localWallToUtcMs(
        Number(f.dateISO.slice(0, 4)), Number(f.dateISO.slice(5, 7)), Number(f.dateISO.slice(8, 10)),
        12, 0, 0, f.timezone,
      ),
      latitude: f.latitude, longitude: f.longitude, timezone: f.timezone,
    });
    const prov = { provenanceUrl: f.provenance.url, provenanceComplete: f.provenance.complete };
    const eq = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const rows: Array<[FieldResult, string, string]> = [
      [vaara, p.vaara, f.published.vaara],
      [ritu, p.ritu, f.published.ritu],
      [ayana, p.ayana, f.published.ayana],
      [samvatsara, p.samvatsara, f.published.samvatsara],
    ];
    for (const [field, computed, published] of rows) {
      field.cases.push({
        place: f.place, dateISO: f.dateISO, kind: "value",
        computed, published, ok: eq(computed, published), ...prov,
      });
    }
  }
  for (const r of [vaara, ritu, ayana, samvatsara]) r.released = r.cases.every((c) => c.ok);

  // Festival + puja window by the madhyahna-vyapti rule.
  const festival: FieldResult = { field: "festival", released: true, cases: [] };
  const pujaWindow: FieldResult = { field: "pujaWindow", released: true, cases: [] };
  for (const f of MADHYAHNA_FIXTURES) {
    const m = await madhyahnaVyaptiFestivalDay(
      {
        dateMs: localWallToUtcMs(
          Number(f.from.dateISO.slice(0, 4)), Number(f.from.dateISO.slice(5, 7)),
          Number(f.from.dateISO.slice(8, 10)), 12, 0, 0, f.from.timezone,
        ),
        latitude: f.from.latitude, longitude: f.from.longitude, timezone: f.from.timezone,
      },
      f.rule,
    );
    const prov = { provenanceUrl: f.provenance.url, provenanceComplete: f.provenance.complete };
    const dateOk = m?.dateISO === f.publishedDateISO;
    festival.cases.push({
      place: `${f.provenance.place} — ${f.name}`, dateISO: f.publishedDateISO,
      computed: m?.dateISO ?? "(none found)", published: f.publishedDateISO,
      ok: Boolean(dateOk), ...prov,
    });
    const wfmt = (min: number) =>
      `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    if (m) {
      const sMin = minutesOfDay(new Date(m.pujaWindow.startMs), f.from.timezone);
      const eMin = minutesOfDay(new Date(m.pujaWindow.endMs), f.from.timezone);
      const sDelta = Math.abs(sMin - publishedMinutes(f.publishedPujaWindow.start));
      const eDelta = Math.abs(eMin - publishedMinutes(f.publishedPujaWindow.end));
      pujaWindow.cases.push({
        place: `${f.provenance.place} — ${f.name}`, dateISO: f.publishedDateISO, kind: "window",
        computed: `${wfmt(sMin)}–${wfmt(eMin)}`,
        published: `${f.publishedPujaWindow.start}–${f.publishedPujaWindow.end}`,
        ok: sDelta <= PUJA_WINDOW_TOLERANCE_MIN && eDelta <= PUJA_WINDOW_TOLERANCE_MIN,
        deltaMin: Math.max(sDelta, eDelta), ...prov,
      });
    } else {
      pujaWindow.cases.push({
        place: `${f.provenance.place} — ${f.name}`, dateISO: f.publishedDateISO, kind: "window",
        computed: "(no festival day found)",
        published: `${f.publishedPujaWindow.start}–${f.publishedPujaWindow.end}`,
        ok: false, ...prov,
      });
    }
  }
  festival.released = festival.cases.every((c) => c.ok);
  pujaWindow.released = pujaWindow.cases.every((c) => c.ok);

  const results = [
    sunrise, sunset, tithi, nakshatra, vaara, ritu, ayana, samvatsara, festival, pujaWindow,
  ];
  const released = Object.fromEntries(results.map((r) => [r.field, r.released])) as Record<
    FieldResult["field"], boolean
  >;
  return { results, released };
}

/** Every fixture's provenance, for the reviewer report and the docs. */
export function panchangaProvenance(): FixtureProvenance[] {
  return [
    ...DAY_FIXTURES.map((f) => f.provenance),
    ...DESCRIPTIVE_FIXTURES.map((f) => f.provenance),
    ...MADHYAHNA_FIXTURES.map((f) => f.provenance),
    FESTIVAL_FIXTURE.provenance,
  ];
}

/**
 * The exact evidence set behind the validation: every fixture's location,
 * timezone, published values, published transition times, and provenance
 * (source URL, access date, verbatim reference values). Canonically ordered so
 * a hash over it is stable. scripts/verify-panchanga.mjs hashes this into
 * release-config.json as `evidenceHash`.
 */
export function evidencePayload() {
  const day = DAY_FIXTURES.map((f) => ({
    place: f.place,
    dateISO: f.dateISO,
    latitude: f.latitude,
    longitude: f.longitude,
    timezone: f.timezone,
    published: f.published,
    provenance: f.provenance,
  }));
  return {
    schema: "vedasaarathi-panchanga-evidence-v2",
    sunToleranceMin: SUN_TOLERANCE_MIN,
    transitionToleranceMin: TRANSITION_TOLERANCE_MIN,
    pujaWindowToleranceMin: PUJA_WINDOW_TOLERANCE_MIN,
    dayFixtures: day,
    descriptiveFixtures: DESCRIPTIVE_FIXTURES.map((f) => ({
      place: f.place, dateISO: f.dateISO,
      latitude: f.latitude, longitude: f.longitude, timezone: f.timezone,
      published: f.published, provenance: f.provenance,
    })),
    madhyahnaFixtures: MADHYAHNA_FIXTURES.map((f) => ({
      name: f.name, from: f.from, rule: f.rule,
      publishedDateISO: f.publishedDateISO, publishedPujaWindow: f.publishedPujaWindow,
      provenance: f.provenance,
    })),
    // Historical record: the plain sunrise-scan fixture that the madhyahna rule
    // replaced. Kept so the evidence trail explains why the festival is now
    // released.
    supersededFestivalFixture: {
      name: FESTIVAL_FIXTURE.name,
      from: FESTIVAL_FIXTURE.from,
      rule: FESTIVAL_FIXTURE.rule,
      publishedDateISO: FESTIVAL_FIXTURE.publishedDateISO,
      provenance: FESTIVAL_FIXTURE.provenance,
    },
  };
}

/** Deterministic key-sorted JSON of the evidence payload (input to the hash). */
export function evidenceCanonicalJson(): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sort(evidencePayload()));
}
