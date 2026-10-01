// Bathukamma 2026 - the selected nine-day schedule (festival-schedules.ts),
// wired through the shared festival dispatcher into Calendar, Home and
// Search.
//
// What this proves, from the real modules (no re-derived expectations):
//   - the nine entries exist once each, with exact English + Telugu names,
//     in order, as "published-schedule" rules (never deferred, never a puja);
//   - each of the nine supported locations - matched by its saved city,
//     region and country (the location model), never by time zone - gets all
//     nine on 10..18 Oct 2026, once each, with no observance time;
//   - Hyderabad's provenance (Telangana Government 2026 schedule) and the US
//     cities' provenance (the product owner's selected schedule) stay
//     distinct, and none is labelled priest-reviewed;
//   - an unsupported location (including same-zone US cities, a same-named
//     city elsewhere, a mismatched region, wrong coordinates, or no place at
//     all) and any other year (2025, 2027) get NO Bathukamma date;
//   - Saddula (18 Oct) and Durga Ashtami (19 Oct) coexist at Hyderabad;
//   - Home's bounded selection and Search both work with the new entries;
//   - the calendar cache key and cached-month check include the resolved
//     schedule location, and CALENDAR_ENGINE_VERSION was bumped (cal-17).

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const rules = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");
const schedules = await vite.ssrLoadModule("/lib/panchanga/festival-schedules.ts");
const calendar = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");
const engine = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { searchFestivals } = await vite.ssrLoadModule("/lib/search/index.ts");
const cache = await vite.ssrLoadModule("/lib/storage/calendar-cache.ts");

const EXPECTED = [
  ["bathukamma-begins", 1, "Engili Poola Bathukamma", "ఎంగిలిపూల బతుకమ్మ", "2026-10-10"],
  ["bathukamma-atukula", 2, "Atukula Bathukamma", "అటుకుల బతుకమ్మ", "2026-10-11"],
  ["bathukamma-muddapappu", 3, "Muddapappu Bathukamma", "ముద్దపప్పు బతుకమ్మ", "2026-10-12"],
  ["bathukamma-nanabiyyam", 4, "Nanabiyyam Bathukamma", "నానబియ్యం బతుకమ్మ", "2026-10-13"],
  ["bathukamma-atla", 5, "Atla Bathukamma", "అట్ల బతుకమ్మ", "2026-10-14"],
  ["bathukamma-aligina", 6, "Aligina Bathukamma", "అలిగిన బతుకమ్మ", "2026-10-15"],
  ["bathukamma-vepakayala", 7, "Vepakayala Bathukamma", "వేపకాయల బతుకమ్మ", "2026-10-16"],
  ["bathukamma-vennamuddala", 8, "Vennamuddala Bathukamma", "వెన్నముద్దల బతుకమ్మ", "2026-10-17"],
  ["bathukamma-saddula", 9, "Saddula Bathukamma", "సద్దుల బతుకమ్మ", "2026-10-18"],
];
const IDS = EXPECTED.map((e) => e[0]);
const isBathukamma = (f) => IDS.includes(f.ruleId);

// The nine supported locations, as the app's own place list
// (public/geodata/places-v1.json) names them - i.e. what the location screen
// fills in - with that list's coordinates.
const SUPPORTED = [
  { id: "hyderabad", city: "Hyderabad", region: "Telangana", country: "India", latitude: 17.384, longitude: 78.4564, timezone: "Asia/Kolkata" },
  { id: "frisco", city: "Frisco", region: "Texas", country: "United States", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" },
  { id: "dallas", city: "Dallas", region: "Texas", country: "United States", latitude: 32.7831, longitude: -96.8067, timezone: "America/Chicago" },
  { id: "new-york", city: "New York City", region: "New York", country: "United States", latitude: 40.7143, longitude: -74.006, timezone: "America/New_York" },
  { id: "chicago", city: "Chicago", region: "Illinois", country: "United States", latitude: 41.85, longitude: -87.65, timezone: "America/Chicago" },
  { id: "los-angeles", city: "Los Angeles", region: "California", country: "United States", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { id: "san-francisco", city: "San Francisco", region: "California", country: "United States", latitude: 37.7749, longitude: -122.4194, timezone: "America/Los_Angeles" },
  { id: "san-jose", city: "San Jose", region: "California", country: "United States", latitude: 37.3394, longitude: -121.895, timezone: "America/Los_Angeles" },
  { id: "seattle", city: "Seattle", region: "Washington", country: "United States", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles" },
];

const placeOf = (l) => ({ city: l.city, region: l.region, country: l.country });
const monthQuery = (l, year, month, withPlace = true) => ({
  latitude: l.latitude, longitude: l.longitude, timezone: l.timezone, year, month,
  ...(withPlace ? { place: placeOf(l) } : {}),
});
const ready = (l) => ({
  status: "READY", latitude: l.latitude, longitude: l.longitude, timezone: l.timezone,
  city: l.city, region: l.region, country: l.country,
  source: "MANUAL", accuracyMeters: null, savedAt: "2026-09-30T00:00:00.000Z",
});

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

test("the nine Bathukamma entries exist exactly once each, in order, with exact English and Telugu names", () => {
  for (const [id, day, name, nameTe] of EXPECTED) {
    const matches = rules.FESTIVAL_RULES.filter((r) => r.id === id);
    assert.equal(matches.length, 1, `${id} appears exactly once`);
    const r = matches[0];
    assert.equal(r.method, "published-schedule");
    assert.equal(r.scheduleId, "bathukamma-2026");
    assert.equal(r.scheduleDay, day);
    assert.equal(r.name, name);
    assert.equal(r.nameTe, nameTe);
    assert.equal(r.pujaSlug, null, "dates only - no puja flow");
    assert.equal(r.category, "telugu");
    assert.match(r.regionTag, /Telangana-specific/);
    assert.equal(r.validationStatus, "product-selected");
  }
  // No other Bathukamma-like entry (e.g. a stray "start"/"finale" placeholder).
  const others = rules.FESTIVAL_RULES.filter(
    (r) => /bathukamma|బతుకమ్మ/i.test(`${r.id} ${r.name} ${r.nameTe}`) && !IDS.includes(r.id),
  );
  assert.deepEqual(others.map((r) => r.id), []);
  assert.ok(rules.deferredFestivalRules().every((r) => !IDS.includes(r.id)), "none is deferred");
});

test("the corrected day-1 / day-9 prose: Mahalaya Amavasya and Durgashtami, never Krishna Padyami / Krishna Navami", () => {
  const all = rules.FESTIVAL_RULES.filter((r) => IDS.includes(r.id))
    .map((r) => `${r.ruleName} ${r.convention}`).join(" ");
  assert.doesNotMatch(all, /Krishna Padyami|Krishna Navami/);
  assert.match(rules.festivalRule("bathukamma-begins").convention, /Mahalaya Amavasya/);
  assert.match(rules.festivalRule("bathukamma-saddula").convention, /Durgashtami \(Ashvayuja Shukla Ashtami\)/);
});

test("Aligina Bathukamma is described neutrally - no claim that everyone celebrates or everyone rests", () => {
  const c = rules.festivalRule("bathukamma-aligina").convention;
  assert.match(c, /Sources describe this day differently/);
  assert.doesNotMatch(c, /\beveryone\b|\ball families\b|\balways\b/i);
});

test("no ritual instructions, offerings, mantras or songs are attached to the entries", () => {
  for (const id of IDS) {
    const r = rules.festivalRule(id);
    assert.doesNotMatch(`${r.convention}`, /mantra|recite|sing |song|naivedyam|offer (?:it|the)/i, id);
  }
});

test("schedule provenance stays distinct per location; nothing is priest-reviewed or attributed to Drik as the source", () => {
  const s = schedules.BATHUKAMMA_2026;
  assert.equal(s.year, 2026);
  assert.deepEqual(s.days.map((d) => d.dateISO), EXPECTED.map((e) => e[4]));
  const hyd = s.locations.find((l) => l.id === "hyderabad");
  assert.equal(hyd.evidenceStatus, "published-date");
  assert.equal(hyd.provenanceUrl, "https://www.telangana.gov.in/downloads/calendar-2026/");
  assert.match(hyd.basis, /Telangana Government's 2026 schedule/);
  assert.match(hyd.basis, /names\s+only the final day/);
  for (const l of s.locations.filter((x) => x.id !== "hyderabad")) {
    assert.equal(l.evidenceStatus, "product-selected", l.id);
    assert.match(l.basis, /product decision/, l.id);
    assert.match(l.basis, /not a published source/, l.id);
    assert.match(l.basis, /Drik Panchang was one input to that\s+research, not the source/, l.id);
  }
  for (const l of s.locations) {
    assert.equal(l.reviewStatus, "REVIEW_REQUIRED", `${l.id} is not presented as reviewed`);
    assert.doesNotMatch(l.basis, /priest[- ]reviewed|priest[- ]approved/i);
  }
  assert.deepEqual(s.locations.map((l) => l.id).sort(), SUPPORTED.map((l) => l.id).sort());
  assert.equal(
    s.familyNote,
    "This calendar follows the selected nine-day Bathukamma schedule. Local traditions and community celebration dates may differ.",
  );
  assert.ok(s.familyNoteTe.includes("బతుకమ్మ"));
});

/* -------------------------------------------------------------------------- */
/* Calendar - supported locations                                            */
/* -------------------------------------------------------------------------- */

for (const loc of SUPPORTED) {
  test(`Calendar October 2026 at ${loc.city}: all nine on 10..18 Oct, once each, no observance time, location-specific source`, async () => {
    const m = await calendar.computeCalendarMonth(monthQuery(loc, 2026, 10));
    const b = m.festivals.filter(isBathukamma);
    assert.equal(b.length, 9, `nine Bathukamma cards at ${loc.city}`);
    for (const [id, , name, , dateISO] of EXPECTED) {
      const hits = b.filter((f) => f.ruleId === id);
      assert.equal(hits.length, 1, `${id} once at ${loc.city}`);
      assert.equal(hits[0].dateISO, dateISO, `${id} on ${dateISO} at ${loc.city}`);
      assert.equal(hits[0].name, name);
      assert.equal(hits[0].pujaWindow, null, "no fabricated observance time");
      assert.equal(hits[0].opensPuja, false);
      const day = m.days.find((d) => d.dateISO === dateISO);
      assert.equal(day.festivalSlugs.filter((sl) => sl === id).length, 1, "day marker once");
      if (loc.id === "hyderabad") {
        assert.equal(hits[0].provenanceUrl, "https://www.telangana.gov.in/downloads/calendar-2026/");
        assert.match(hits[0].convention, /Telangana Government's 2026 schedule/);
      } else {
        assert.equal(hits[0].provenanceUrl, "https://github.com/mutukulamahesh/vedasaarathi/pull/12");
        assert.match(hits[0].convention, /selected sunrise-based nine-day Bathukamma schedule/);
      }
      assert.match(hits[0].convention, /review status: REVIEW_REQUIRED/);
    }
    assert.equal(m.scheduleLocationKey, `bathukamma-2026:${loc.id}`);
  });
}

test("Hyderabad October 2026: Saddula (18 Oct) and Durga Ashtami (19 Oct) coexist; neither is dropped or merged", async () => {
  const m = await calendar.computeCalendarMonth(monthQuery(SUPPORTED[0], 2026, 10));
  const saddula = m.festivals.filter((f) => f.ruleId === "bathukamma-saddula");
  const ashtami = m.festivals.filter((f) => f.ruleId === "durga-ashtami");
  assert.deepEqual(saddula.map((f) => f.dateISO), ["2026-10-18"]);
  assert.deepEqual(ashtami.map((f) => f.dateISO), ["2026-10-19"], "existing Durga Ashtami unchanged");
  // Maha Navami / Vijayadashami / Navratri begins unchanged too.
  const dateOf = (id) => m.festivals.filter((f) => f.ruleId === id).map((f) => f.dateISO);
  assert.deepEqual(dateOf("maha-navami"), ["2026-10-19"]);
  assert.deepEqual(dateOf("vijayadashami"), ["2026-10-20"]);
  assert.deepEqual(dateOf("navratri-begins"), ["2026-10-11"]);
  const day19 = m.days.find((d) => d.dateISO === "2026-10-19");
  assert.ok(day19.festivalSlugs.includes("durga-ashtami"));
  assert.ok(!day19.festivalSlugs.some((s) => IDS.includes(s)));
});

/* -------------------------------------------------------------------------- */
/* Calendar - unsupported locations and other years                          */
/* -------------------------------------------------------------------------- */

const UNSUPPORTED = [
  ["Houston, TX (same zone as Dallas/Frisco/Chicago)", { city: "Houston", region: "Texas", country: "United States", latitude: 29.7633, longitude: -95.3633, timezone: "America/Chicago" }],
  ["Plano, TX (next to Dallas/Frisco)", { city: "Plano", region: "Texas", country: "United States", latitude: 33.0198, longitude: -96.6989, timezone: "America/Chicago" }],
  ["Sunnyvale, CA (Bay Area, not a listed city)", { city: "Sunnyvale", region: "California", country: "United States", latitude: 37.3688, longitude: -122.0363, timezone: "America/Los_Angeles" }],
  ["Portland, OR (same zone as Seattle)", { city: "Portland", region: "Oregon", country: "United States", latitude: 45.5234, longitude: -122.6762, timezone: "America/Los_Angeles" }],
  ["Hyderabad, Sindh, Pakistan (same city name)", { city: "Hyderabad", region: "Sindh", country: "Pakistan", latitude: 25.3969, longitude: 68.3772, timezone: "Asia/Karachi" }],
  ["Bengaluru, India (same zone as Hyderabad)", { city: "Bengaluru", region: "Karnataka", country: "India", latitude: 12.9719, longitude: 77.5937, timezone: "Asia/Kolkata" }],
  ["'Dallas' typed with Seattle coordinates", { city: "Dallas", region: "Texas", country: "United States", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles" }],
  ["Dallas with a mismatched region (Oregon)", { city: "Dallas", region: "Oregon", country: "United States", latitude: 32.7831, longitude: -96.8067, timezone: "America/Chicago" }],
];

for (const [label, loc] of UNSUPPORTED) {
  test(`unsupported location gets no Bathukamma date: ${label}`, async () => {
    const m = await calendar.computeCalendarMonth(monthQuery(loc, 2026, 10));
    assert.equal(m.festivals.filter(isBathukamma).length, 0);
    assert.equal(m.festivalsAll.filter(isBathukamma).length, 0);
    assert.equal(m.scheduleLocationKey, "");
  });
}

test("a supported city's coordinates WITHOUT a saved place (no city/region/country) get no Bathukamma date - never inferred from coordinates or time zone", async () => {
  const m = await calendar.computeCalendarMonth(monthQuery(SUPPORTED[1], 2026, 10, false));
  assert.equal(m.festivalsAll.filter(isBathukamma).length, 0);
});

test("name matching tolerates case, spacing, accents, abbreviations and a blank region (the region is optional in the location model)", () => {
  const s = schedules.BATHUKAMMA_2026;
  const r = (place, lat, lng) => schedules.resolveScheduleLocation(s, place, lat, lng)?.id ?? null;
  assert.equal(r({ city: "  HYDERABAD ", region: "TS", country: "india" }, 17.385, 78.4867), "hyderabad");
  assert.equal(r({ city: "Hyderabad", region: "", country: "India" }, 17.385, 78.4867), "hyderabad");
  assert.equal(r({ city: "San José", region: "CA", country: "USA" }, 37.3382, -121.8863), "san-jose");
  assert.equal(r({ city: "New York", region: "NY", country: "US" }, 40.7128, -74.006), "new-york");
  assert.equal(r({ city: "Seattle", region: "Washington", country: "Canada" }, 47.6062, -122.3321), null);
  assert.equal(r(undefined, 17.385, 78.4867), null);
});

for (const [year, label] of [[2025, "2025"], [2027, "2027"]]) {
  for (const loc of [SUPPORTED[0], SUPPORTED[1]]) {
    test(`other years never inherit the 2026 dates: ${loc.city}, October ${label}`, async () => {
      const m = await calendar.computeCalendarMonth(monthQuery(loc, year, 10));
      assert.equal(m.festivalsAll.filter(isBathukamma).length, 0);
    });
  }
}

test("other years: September 2027 at Hyderabad has no Bathukamma either (no formula carries the schedule forward)", async () => {
  const m = await calendar.computeCalendarMonth(monthQuery(SUPPORTED[0], 2027, 9));
  assert.equal(m.festivalsAll.filter(isBathukamma).length, 0);
});

/* -------------------------------------------------------------------------- */
/* Shared dispatcher (Search uses it directly)                               */
/* -------------------------------------------------------------------------- */

test("festivalRuleOccurrence: a supported place finds the date, an unsupported place / later year finds none", async () => {
  const saddula = rules.festivalRule("bathukamma-saddula");
  const hyd = SUPPORTED[0];
  const input = (dateMs, place) => ({ dateMs, latitude: hyd.latitude, longitude: hyd.longitude, timezone: hyd.timezone, place });
  const fromOct1 = Date.parse("2026-10-01T06:30:00Z");
  const m = await engine.festivalRuleOccurrence(input(fromOct1, placeOf(hyd)), saddula, 400);
  assert.equal(m.dateISO, "2026-10-18");
  assert.equal(m.inDays, 17);
  assert.equal(m.pujaWindow, undefined);
  assert.equal(await engine.festivalRuleOccurrence(input(fromOct1, undefined), saddula, 400), null);
  assert.equal(
    await engine.festivalRuleOccurrence(input(Date.parse("2026-10-19T06:30:00Z"), placeOf(hyd)), saddula, 400),
    null, "after 18 Oct 2026 there is no next date - never a 2027 guess",
  );
  assert.equal(
    await engine.festivalRuleOccurrence(input(fromOct1, placeOf(hyd)), saddula, 10),
    null, "outside the requested horizon",
  );
});

/* -------------------------------------------------------------------------- */
/* Home                                                                       */
/* -------------------------------------------------------------------------- */

test("Home (Hyderabad): bounded selection still holds with the new entries; today's Bathukamma day shows; past days never do", async () => {
  const hyd = ready(SUPPORTED[0]);
  const oct12 = await panchangaForLocation(hyd, Date.parse("2026-10-12T06:30:00Z")); // 12:00 IST
  const rows = oct12.upcomingFestivals;
  assert.ok(rows.length <= 3, "never more than three rows");
  assert.equal(new Set(rows.map((r) => r.ruleId)).size, rows.length, "one row per rule");
  const today = rows.find((r) => r.ruleId === "bathukamma-muddapappu");
  assert.ok(today, "today's Muddapappu Bathukamma is on Home");
  assert.equal(today.inDays, 0);
  assert.equal(today.nameTe, "ముద్దపప్పు బతుకమ్మ");
  assert.equal(today.pujaWindow, undefined, "no observance time");
  for (const r of rows) assert.ok(r.dateISO >= "2026-10-12", "nothing already passed");
  assert.ok(!rows.some((r) => ["bathukamma-begins", "bathukamma-atukula"].includes(r.ruleId)));

  const oct19 = await panchangaForLocation(hyd, Date.parse("2026-10-19T06:30:00Z"));
  assert.ok(!oct19.upcomingFestivals.some((r) => IDS.includes(r.ruleId)), "all nine passed by 19 Oct");
});

test("Home (Frisco) shows the schedule; Home (Houston, same zone) does not", async () => {
  const now = Date.parse("2026-10-14T17:00:00Z"); // 12:00 CDT
  const frisco = await panchangaForLocation(ready(SUPPORTED[1]), now);
  const atla = frisco.upcomingFestivals.find((r) => r.ruleId === "bathukamma-atla");
  assert.ok(atla, "Atla Bathukamma today at Frisco");
  assert.equal(atla.dateISO, "2026-10-14");
  const houston = await panchangaForLocation(ready(UNSUPPORTED[0][1]), now);
  assert.ok(!houston.upcomingFestivals.some((r) => IDS.includes(r.ruleId)));
});

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

test("Search finds the entries by English and Telugu name", () => {
  const en = searchFestivals("bathukamma").map((r) => r.ruleId);
  assert.deepEqual([...en].sort(), [...IDS].sort(), "'bathukamma' finds all nine");
  const te = searchFestivals("బతుకమ్మ").map((r) => r.ruleId);
  assert.deepEqual([...te].sort(), [...IDS].sort(), "'బతుకమ్మ' finds all nine");
  assert.equal(searchFestivals("saddula bathukamma")[0].ruleId, "bathukamma-saddula");
  assert.equal(searchFestivals("సద్దుల బతుకమ్మ")[0].ruleId, "bathukamma-saddula");
  assert.equal(searchFestivals("engili")[0].ruleId, "bathukamma-begins");
  assert.equal(searchFestivals("అలిగిన")[0].ruleId, "bathukamma-aligina");
});

/* -------------------------------------------------------------------------- */
/* Cache invalidation                                                         */
/* -------------------------------------------------------------------------- */

test("cache: version bumped to cal-17; the resolved schedule location is part of the key and of the cached-month check", async () => {
  assert.match(calendar.CALENDAR_ENGINE_VERSION, /^cal-17\+/);
  const hyd = SUPPORTED[0];
  const withPlace = calendar.calendarCacheKey(monthQuery(hyd, 2026, 10));
  const without = calendar.calendarCacheKey(monthQuery(hyd, 2026, 10, false));
  assert.equal(withPlace, `${without}|bathukamma-2026:hyderabad`);
  // Same coordinates saved under an unsupported name -> a different key.
  const renamed = calendar.calendarCacheKey({ ...monthQuery(hyd, 2026, 10), place: { city: "Secunderabad", region: "Telangana", country: "India" } });
  assert.equal(renamed, without);

  const month = await calendar.computeCalendarMonth(monthQuery(hyd, 2026, 10));
  assert.equal(cache.validateCachedMonth(month, monthQuery(hyd, 2026, 10)), true);
  assert.equal(
    cache.validateCachedMonth(month, monthQuery(hyd, 2026, 10, false)), false,
    "a month computed for the Hyderabad schedule location is not reused for a query that resolves to none",
  );
});
