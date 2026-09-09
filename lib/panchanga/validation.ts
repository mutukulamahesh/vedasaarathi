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
  computePanchanga, nextFestivalDay, minutesOfDay, tithiKey, nakshatraKey,
  type PanchangaInput,
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

export interface FieldResult {
  field: "sunrise" | "sunset" | "tithi" | "nakshatra" | "festival";
  released: boolean;
  cases: {
    place: string;
    dateISO: string;
    computed: string;
    published: string;
    ok: boolean;
    deltaMin?: number;
    provenanceUrl: string;
    provenanceComplete: boolean;
  }[];
}

function inputFor(f: DayFixture): PanchangaInput {
  return {
    dateMs: Date.parse(`${f.dateISO}T12:00:00Z`),
    latitude: f.latitude,
    longitude: f.longitude,
    timezone: f.timezone,
  };
}

function publishedMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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

    // Tithi / Nakshatra are compared against the value at local sunrise.
    const tOk = tithiKey(p.tithiAtSunrise.name) === tithiKey(f.published.tithiAtSunrise)
      && p.pakshaAtSunrise.toLowerCase() === f.published.paksha.toLowerCase();
    tithi.cases.push({
      place: f.place, dateISO: f.dateISO,
      computed: `${p.pakshaAtSunrise} ${p.tithiAtSunrise.name}`,
      published: `${f.published.paksha} ${f.published.tithiAtSunrise}`, ok: tOk, ...prov,
    });

    const nOk = nakshatraKey(p.nakshatraAtSunrise.name) === nakshatraKey(f.published.nakshatraAtSunrise);
    nakshatra.cases.push({
      place: f.place, dateISO: f.dateISO,
      computed: p.nakshatraAtSunrise.name, published: f.published.nakshatraAtSunrise, ok: nOk, ...prov,
    });
  }

  for (const r of [sunrise, sunset, tithi, nakshatra]) r.released = r.cases.every((c) => c.ok);

  // Festival
  const festMatch = await nextFestivalDay(
    { ...FESTIVAL_FIXTURE.from, dateMs: Date.parse(`${FESTIVAL_FIXTURE.from.dateISO}T12:00:00Z`) },
    FESTIVAL_FIXTURE.rule,
  );
  const festOk = festMatch?.dateISO === FESTIVAL_FIXTURE.publishedDateISO;
  const festival: FieldResult = {
    field: "festival",
    released: Boolean(festOk),
    cases: [{
      place: FESTIVAL_FIXTURE.provenance.place, dateISO: FESTIVAL_FIXTURE.name,
      computed: festMatch?.dateISO ?? "(none found)",
      published: FESTIVAL_FIXTURE.publishedDateISO, ok: Boolean(festOk),
      provenanceUrl: FESTIVAL_FIXTURE.provenance.url,
      provenanceComplete: FESTIVAL_FIXTURE.provenance.complete,
    }],
  };

  const results = [sunrise, sunset, tithi, nakshatra, festival];
  const released = Object.fromEntries(results.map((r) => [r.field, r.released])) as Record<
    FieldResult["field"], boolean
  >;
  return { results, released };
}

/** Every fixture's provenance, for the reviewer report and the docs. */
export function panchangaProvenance(): FixtureProvenance[] {
  return [...DAY_FIXTURES.map((f) => f.provenance), FESTIVAL_FIXTURE.provenance];
}
