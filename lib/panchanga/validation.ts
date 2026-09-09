// Validation fixtures for the Panchanga engine, against independent published
// references (Drik Panchang day panchang, https://www.drikpanchang.com).
//
// A field is RELEASED for display only if the engine reproduces every fixture
// for that field within tolerance. Anything that fails stays hidden — the Home
// card shows its honest "not calculated" state instead. See ./engine.ts for
// the astronomical conventions.
//
// Tolerances
// - Sunrise / sunset: ±3 minutes (SunCalc geometric vs drik-ganita; observed
//   max difference in the fixtures below is 2 minutes).
// - Tithi / Nakshatra / Paksha: normalised exact name match at local sunrise.
//
// Festival: the Vinayaka Chavithi fixture FAILS on purpose and is recorded so.
// Drik Panchang places Ganesha Chaturthi 2026 on 14 Sep (madhyahna-vyapti
// rule); a plain "Chaturthi prevails at sunrise" scan lands on 15 Sep. Until a
// madhyahna rule is modelled and validated, the festival day is not displayed
// and no muhurtham is ever computed.

import {
  computePanchanga, nextFestivalDay, minutesOfDay, tithiKey, nakshatraKey,
  type PanchangaInput,
} from "./engine";

export interface DayFixture {
  place: string;
  dateISO: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Published values (Drik Panchang). Times are local wall clock "HH:MM". */
  published: {
    sunrise: string;
    sunset: string;
    tithiAtSunrise: string;
    nakshatraAtSunrise: string;
    paksha: string;
  };
}

/** Hyderabad + Frisco, two dates each (one of them across the US DST change). */
export const DAY_FIXTURES: readonly DayFixture[] = [
  {
    place: "Hyderabad, India", dateISO: "2026-09-09",
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    published: {
      sunrise: "06:03", sunset: "18:23",
      tithiAtSunrise: "Trayodashi", nakshatraAtSunrise: "Ashlesha", paksha: "Krishna",
    },
  },
  {
    place: "Hyderabad, India", dateISO: "2026-11-01",
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    published: {
      sunrise: "06:15", sunset: "17:45",
      tithiAtSunrise: "Saptami", nakshatraAtSunrise: "Pushya", paksha: "Krishna",
    },
  },
  {
    place: "Frisco, Texas, USA", dateISO: "2026-09-09",
    latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
    published: {
      sunrise: "07:07", sunset: "19:42",
      tithiAtSunrise: "Chaturdashi", nakshatraAtSunrise: "Magha", paksha: "Krishna",
    },
  },
  {
    place: "Frisco, Texas, USA", dateISO: "2026-11-01",
    latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
    published: {
      sunrise: "06:46", sunset: "17:36",
      tithiAtSunrise: "Ashtami", nakshatraAtSunrise: "Pushya", paksha: "Krishna",
    },
  },
];

export const SUN_TOLERANCE_MIN = 3;

export interface FestivalFixture {
  name: string;
  /** For the forward scan. */
  from: { dateISO: string; latitude: number; longitude: number; timezone: string };
  rule: { name: string; masa: string; paksha: string; tithi: string };
  /** Published festival date (Drik Panchang). */
  publishedDateISO: string;
}

export const FESTIVAL_FIXTURE: FestivalFixture = {
  name: "Vinayaka Chavithi (Ganesha Chaturthi) 2026",
  from: { dateISO: "2026-09-01", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" },
  rule: { name: "Vinayaka Chavithi", masa: "Bhadraba", paksha: "Shukla", tithi: "Chaturthi" },
  publishedDateISO: "2026-09-14",
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

    const srMin = minutesOfDay(p.sunrise, f.timezone);
    const ssMin = minutesOfDay(p.sunset, f.timezone);
    const srDelta = Math.abs(srMin - publishedMinutes(f.published.sunrise));
    const ssDelta = Math.abs(ssMin - publishedMinutes(f.published.sunset));
    const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

    sunrise.cases.push({
      place: f.place, dateISO: f.dateISO, computed: fmt(srMin),
      published: f.published.sunrise, ok: srDelta <= SUN_TOLERANCE_MIN, deltaMin: srDelta,
    });
    sunset.cases.push({
      place: f.place, dateISO: f.dateISO, computed: fmt(ssMin),
      published: f.published.sunset, ok: ssDelta <= SUN_TOLERANCE_MIN, deltaMin: ssDelta,
    });

    const tOk = tithiKey(p.tithi.name) === tithiKey(f.published.tithiAtSunrise)
      && p.paksha.toLowerCase() === f.published.paksha.toLowerCase();
    tithi.cases.push({
      place: f.place, dateISO: f.dateISO,
      computed: `${p.paksha} ${p.tithi.name}`,
      published: `${f.published.paksha} ${f.published.tithiAtSunrise}`, ok: tOk,
    });

    const nOk = nakshatraKey(p.nakshatra.name) === nakshatraKey(f.published.nakshatraAtSunrise);
    nakshatra.cases.push({
      place: f.place, dateISO: f.dateISO,
      computed: p.nakshatra.name, published: f.published.nakshatraAtSunrise, ok: nOk,
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
      place: FESTIVAL_FIXTURE.from.timezone, dateISO: FESTIVAL_FIXTURE.name,
      computed: festMatch?.dateISO ?? "(none found)",
      published: FESTIVAL_FIXTURE.publishedDateISO, ok: Boolean(festOk),
    }],
  };

  const results = [sunrise, sunset, tithi, nakshatra, festival];
  const released = Object.fromEntries(results.map((r) => [r.field, r.released])) as Record<
    FieldResult["field"], boolean
  >;
  return { results, released };
}
