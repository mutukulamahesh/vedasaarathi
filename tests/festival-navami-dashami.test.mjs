// Durga Ashtami / Maha Navami / Vijayadashami (Dussehra) — Hyderabad and
// Frisco, 2026 and 2027.
//
// These three were deferred (method: "deferred") because plain
// tithi-at-sunrise computed Hyderabad Maha Navami/Vijayadashami dates one day
// later than Drik Panchang's own festival calendar, and Durga Ashtami was
// suspected (not confirmed) to be a kshaya tithi at Hyderabad. A 2026-09-29
// re-investigation, independently verified against Drik's own DEDICATED
// per-festival date/time pages (not the monthly grid, not this app's own
// output) for both locations and both years, found:
//
//   - Durga Ashtami IS correctly plain tithi-at-sunrise after all - the
//     "likely kshaya" hypothesis was based on the less precise monthly grid
//     and is not borne out by exact begin/end-time evidence.
//   - Maha Navami and Vijayadashami need a new "aparahna-vyapti" rule
//     (presence during the Aparahna kala, the fourth fifth of daylight) -
//     confirmed to the minute against Drik's own displayed "Aparahna Puja
//     Time".
//
// Full evidence table, source URLs, and the masa-matching bug caught and
// fixed during implementation (the raw same-instant masa field is
// solar-sankranti-based and flips mid-Navaratri some years - fixed by
// matching the Amanta masa instead) are recorded in
// docs/temp/navratri-festival-dates-2026-09-29.md.
//
// This file flips from the prior version's "asserts absence" (while the
// three stayed deferred) to "asserts correct presence and dates", and adds
// Durga Ashtami and 2027 coverage that did not exist before.

import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
test.after(async () => {
  await vite.close();
});

const { festivalRuleOccurrence } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { festivalRule, displayedFestivalRules } = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");
const { computeCalendarMonth } = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");

const HYD_TZ = "Asia/Kolkata";
const FRISCO_TZ = "America/Chicago";
const HYD_LATLNG = { latitude: 17.385, longitude: 78.4867 };
const FRISCO_LATLNG = { latitude: 33.1507, longitude: -96.8236 };

/* ---- Reference fixtures: Drik Panchang's dedicated per-festival date/time
 * pages (NOT the monthly grid, NOT this app's own output), independently
 * verified 2026-09-29. See docs/temp/navratri-festival-dates-2026-09-29.md
 * for the full evidence, including the exact Tithi begin/end times each of
 * these was derived from. ---- */
const DRIK_REFERENCE = {
  "durga-ashtami": {
    "2026": { hyderabad: "2026-10-19", frisco: "2026-10-18" },
    "2027": { hyderabad: "2027-10-07", frisco: "2027-10-07" },
  },
  "maha-navami": {
    "2026": { hyderabad: "2026-10-19", frisco: "2026-10-19" },
    "2027": { hyderabad: "2027-10-08", frisco: "2027-10-08" },
  },
  vijayadashami: {
    "2026": { hyderabad: "2026-10-20", frisco: "2026-10-20" },
    "2027": { hyderabad: "2027-10-09", frisco: "2027-10-09" },
  },
};

const SCAN_FROM = {
  "2026": Date.parse("2026-09-17T12:00:00Z"),
  "2027": Date.parse("2027-09-17T12:00:00Z"),
};

async function occurrenceFor(ruleId, timezone, latlng, year) {
  const rule = festivalRule(ruleId);
  const input = { dateMs: SCAN_FROM[year], timezone, ...latlng };
  const m = await festivalRuleOccurrence(input, rule, 210);
  return m?.dateISO ?? null;
}

for (const ruleId of ["durga-ashtami", "maha-navami", "vijayadashami"]) {
  for (const year of ["2026", "2027"]) {
    test(`${ruleId} ${year}: Hyderabad matches Drik's dedicated-page reference`, async () => {
      const got = await occurrenceFor(ruleId, HYD_TZ, HYD_LATLNG, year);
      assert.equal(got, DRIK_REFERENCE[ruleId][year].hyderabad);
    });
    test(`${ruleId} ${year}: Frisco matches Drik's dedicated-page reference`, async () => {
      const got = await occurrenceFor(ruleId, FRISCO_TZ, FRISCO_LATLNG, year);
      assert.equal(got, DRIK_REFERENCE[ruleId][year].frisco);
    });
  }
}

test("durga-ashtami is plain tithi-at-sunrise; maha-navami and vijayadashami are aparahna-vyapti - not one shared method", () => {
  assert.equal(festivalRule("durga-ashtami").method, "tithi-at-sunrise");
  assert.equal(festivalRule("maha-navami").method, "aparahna-vyapti");
  assert.equal(festivalRule("vijayadashami").method, "aparahna-vyapti");
});

test("all three are un-deferred, validated, and reference-matched - not shipped as a guess", () => {
  for (const id of ["durga-ashtami", "maha-navami", "vijayadashami"]) {
    const rule = festivalRule(id);
    assert.notEqual(rule.method, "deferred", `${id} must be un-deferred`);
    assert.equal(rule.validationStatus, "reference-matched", `${id} must be reference-matched, not a guess`);
  }
});

test("all three now appear in displayedFestivalRules() (the live source search and Calendar both read from)", () => {
  const ids = displayedFestivalRules().map((r) => r.id);
  assert.ok(ids.includes("durga-ashtami"));
  assert.ok(ids.includes("maha-navami"));
  assert.ok(ids.includes("vijayadashami"));
});

test("regression guard: maha-navami and vijayadashami match on the AMANTA masa, not the raw same-instant masa field", () => {
  // The raw same-instant `masa` field (cal.Masa.name_en_IN) is solar-sankranti-
  // based and flips from Ashvina to Kartika mid-Navaratri in some years -
  // matching on it produced a spurious match a full lunar month early before
  // this was caught (docs/temp/navratri-festival-dates-2026-09-29.md). The
  // Amanta name stays "Ashvina" the whole Navaratri window.
  assert.equal(festivalRule("maha-navami").masa, "Ashvina");
  assert.equal(festivalRule("vijayadashami").masa, "Ashvina");
});

test("the rendered October 2026 Hyderabad Calendar shows all three festivals, on the correct dates, alongside other October festivals", async () => {
  const monthResult = await computeCalendarMonth({ ...HYD_LATLNG, timezone: HYD_TZ, year: 2026, month: 10 });
  const byName = new Map(monthResult.festivalsAll.map((f) => [f.name, f]));
  assert.equal(byName.get("Durga Ashtami")?.dateISO, "2026-10-19", JSON.stringify([...byName.keys()]));
  assert.equal(byName.get("Maha Navami")?.dateISO, "2026-10-19");
  assert.equal(byName.get("Vijayadashami (Dussehra)")?.dateISO, "2026-10-20");
  assert.ok(monthResult.festivalsAll.length > 3, "other October festivals still appear alongside the restored three");
});

test("the rendered October 2026 Frisco Calendar shows all three festivals on the correct (Frisco-specific) dates", async () => {
  const monthResult = await computeCalendarMonth({ ...FRISCO_LATLNG, timezone: FRISCO_TZ, year: 2026, month: 10 });
  const byName = new Map(monthResult.festivalsAll.map((f) => [f.name, f]));
  assert.equal(byName.get("Durga Ashtami")?.dateISO, "2026-10-18", "Frisco's Ashtami date genuinely differs from Hyderabad's");
  assert.equal(byName.get("Maha Navami")?.dateISO, "2026-10-19");
  assert.equal(byName.get("Vijayadashami (Dussehra)")?.dateISO, "2026-10-20");
});

test("no duplicate cards: each of the three appears exactly once in the October 2026 Hyderabad month", async () => {
  const monthResult = await computeCalendarMonth({ ...HYD_LATLNG, timezone: HYD_TZ, year: 2026, month: 10 });
  for (const name of ["Durga Ashtami", "Maha Navami", "Vijayadashami (Dussehra)"]) {
    const count = monthResult.festivalsAll.filter((f) => f.name === name).length;
    assert.equal(count, 1, `${name} must appear exactly once, got ${count}`);
  }
});
