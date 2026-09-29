// Release coverage contract: the major festivals a family expects to see
// across the app's currently-supported horizon must never silently
// disappear from the Calendar.
//
// Direct motivation: Durga Ashtami, Maha Navami, and Vijayadashami were
// deferred (removed from Calendar entirely) for over a week while the
// correct observance-day convention was investigated - a defensible choice
// for a single festival's genuinely unresolved convention, but a real risk
// if it happened silently, or to more than one festival at once, or without
// anyone noticing until a family opened October's Calendar expecting to see
// Dussehra. This test is the tripwire: it asserts PRESENCE of each named
// major festival (an occurrence exists, with a real ISO date, inside the
// supported horizon), never a specific calculated date or the rule method
// used to find it - a UI/coverage test, not a calculation test. The
// per-festival date/method correctness lives in each rule's own dedicated
// test file (e.g. tests/festival-navami-dashami.test.mjs for these three).
//
// Horizon: the Phase 1 release window start (2026-09-17, see
// docs/temp/festival-calendar-v1-spec-2026-09-17.md) through just past
// Ugadi 2027 (~2027-04-07) - the horizon named explicitly in the task this
// test was added for. A festival whose only occurrence in this window was
// silently dropped (a bad `method: "deferred"` edit, a masa-string typo, a
// horizon regression, an accidental `familyVisible: false`) fails this test
// at both locations independently.

import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
test.after(async () => {
  await vite.close();
});

const { festivalRuleOccurrencesInRange } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { festivalRule } = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");

const HYD_TZ = "Asia/Kolkata";
const FRISCO_TZ = "America/Chicago";
const HYD_LATLNG = { latitude: 17.385, longitude: 78.4867 };
const FRISCO_LATLNG = { latitude: 33.1507, longitude: -96.8236 };

// 2026-09-17 (Phase 1 release-window start) through ~2027-04-10, safely past
// Ugadi 2027 (~2027-04-07) and safely short of the NEXT Navratri (~Oct
// 2027), so no rule can appear twice inside this window.
const ORIGIN_MS = Date.parse("2026-09-17T12:00:00Z");
const HORIZON_DAYS = 210;

// The eight major festivals the task names as the minimum required
// coverage. Mapped to this catalogue's rule ids (display names differ
// slightly, e.g. "Diwali / Lakshmi Puja" for "Diwali").
const REQUIRED = [
  { label: "Navratri begins", ruleId: "navratri-begins" },
  { label: "Durga Ashtami", ruleId: "durga-ashtami" },
  { label: "Maha Navami", ruleId: "maha-navami" },
  { label: "Vijayadashami", ruleId: "vijayadashami" },
  { label: "Diwali", ruleId: "diwali-lakshmi-puja" },
  { label: "Makara Sankranti", ruleId: "makara-sankranti" },
  { label: "Maha Shivaratri", ruleId: "maha-shivaratri" },
  { label: "Ugadi", ruleId: "ugadi" },
];

for (const { label, ruleId } of REQUIRED) {
  test(`catalogue sanity: "${label}" (${ruleId}) exists and is not deferred`, () => {
    const rule = festivalRule(ruleId);
    assert.ok(rule, `no rule with id "${ruleId}" found in FESTIVAL_RULES - has it been renamed or removed?`);
    assert.notEqual(rule.method, "deferred", `"${label}" (${ruleId}) must not be deferred - it is one of the required release-coverage festivals`);
  });

  for (const [locLabel, timezone, latlng] of [["Hyderabad", HYD_TZ, HYD_LATLNG], ["Frisco", FRISCO_TZ, FRISCO_LATLNG]]) {
    test(`release coverage: "${label}" has at least one occurrence for ${locLabel} within the supported horizon (2026-09-17 through ~2027-04-10)`, async () => {
      const rule = festivalRule(ruleId);
      const input = { dateMs: ORIGIN_MS, timezone, ...latlng };
      const occurrences = await festivalRuleOccurrencesInRange(input, rule, HORIZON_DAYS);
      assert.ok(
        occurrences.length >= 1,
        `expected at least one "${label}" occurrence for ${locLabel} in the horizon, found none`,
      );
      for (const occ of occurrences) {
        assert.match(occ.dateISO, /^\d{4}-\d{2}-\d{2}$/, `occurrence dateISO must be a real ISO date, got "${occ.dateISO}"`);
      }
    });
  }
}

test("every required festival is reachable through the same catalogue accessor the app's Calendar and search actually use (displayedFestivalRules)", async () => {
  const { displayedFestivalRules } = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");
  const displayedIds = new Set(displayedFestivalRules().map((r) => r.id));
  for (const { label, ruleId } of REQUIRED) {
    assert.ok(displayedIds.has(ruleId), `"${label}" (${ruleId}) must be in displayedFestivalRules() - Calendar and search both read from it`);
  }
});
