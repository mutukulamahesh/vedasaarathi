// Maha Navami / Vijayadashami (Dussehra) 2026 at Hyderabad and Frisco.
//
// A real-user test found the app's rendered Calendar showing Hyderabad Maha
// Navami on 2026-10-20 and Vijayadashami on 2026-10-21 - one day later than
// festival-rules.ts's own recorded reference (2026-10-19 / 2026-10-20).
// Reproduced here through the actual engine, then re-verified directly
// against Drik Panchang (2026-09-28):
//
//   - Drik's day-panchang page for Hyderabad 2026-10-19
//     (https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1269843&date=19/10/2026)
//     gives "Ashtami upto 10:51 AM" / "Navami begins 10:51 AM" - the SAME
//     transition instant mhah-panchang computes for that boundary, to the
//     minute. This is NOT an ephemeris precision bug: both engines agree on
//     the astronomy.
//   - Hyderabad's 2026-10-19 sunrise is 06:10 AM, well before that 10:51 AM
//     transition, so Navami's first Hyderabad sunrise-prevalence is
//     genuinely 2026-10-20, not 2026-10-19 - exactly what
//     tithiAtSunriseFestivalDay computes below.
//   - Yet Drik's own monthly Telugu festival calendar
//     (https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2026&month=10,
//     re-fetched 2026-09-28, the same URL already on record) labels
//     2026-10-19 - not 10-20 - as Maha Navami, and 2026-10-20 - not 10-21 -
//     as Dussehra. Drik evidently does not assign these two festivals by
//     plain tithi-at-sunrise.
//
// Conclusion: the RULE METHOD (plain tithi-at-sunrise), not the astronomy,
// is wrong for these two festivals. Both are deferred in festival-rules.ts
// (method: "deferred") rather than shipping a confidently incorrect date -
// see that file's convention/deferredReason text on the maha-navami and
// vijayadashami entries for the full write-up. These fixtures exist so a
// FUTURE correct implementation has something concrete to validate against,
// and so a regression that silently un-defers either rule is caught.

import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
test.after(async () => {
  await vite.close();
});

const { tithiAtSunriseFestivalDay } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { FESTIVAL_RULES, festivalRule } = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");
const { computeCalendarMonth } = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");

const HYD_TZ = "Asia/Kolkata";
const FRISCO_TZ = "America/Chicago";
const HYD_LATLNG = { latitude: 17.385, longitude: 78.4867 };
const FRISCO_LATLNG = { latitude: 33.1507, longitude: -96.8236 };

const NAVAMI_RULE = { masaAmanta: "Ashvina", paksha: "Shukla", tithi: "Navami", fallbackPolicy: "none" };
const DASHAMI_RULE = { masaAmanta: "Ashvina", paksha: "Shukla", tithi: "Dashami", fallbackPolicy: "none" };
const SCAN_FROM_MS = Date.parse("2026-10-01T12:00:00Z");

/* ---- Reference fixtures: Drik Panchang's actual published dates, both
 * locations, re-verified 2026-09-28 (same URLs recorded in
 * festival-rules.ts). What a future correct rule implementation must
 * reproduce. ---- */
const DRIK_REFERENCE = {
  "maha-navami": { hyderabad: "2026-10-19", frisco: "2026-10-19" },
  vijayadashami: { hyderabad: "2026-10-20", frisco: "2026-10-20" },
};

test("reproduces the reported mismatch: plain tithi-at-sunrise computes Hyderabad Maha Navami one day AFTER Drik's reference", async () => {
  const m = await tithiAtSunriseFestivalDay({ dateMs: SCAN_FROM_MS, timezone: HYD_TZ, ...HYD_LATLNG }, NAVAMI_RULE, 60);
  assert.ok(m, "a match was found within the horizon");
  assert.equal(m.dateISO, "2026-10-20", "plain sunrise-tithi's computed date");
  assert.notEqual(m.dateISO, DRIK_REFERENCE["maha-navami"].hyderabad, "…which is confirmed NOT to equal Drik's own reference date - the exact mismatch a real-user test found");
});

test("reproduces the reported mismatch: plain tithi-at-sunrise computes Hyderabad Vijayadashami one day AFTER Drik's reference", async () => {
  const m = await tithiAtSunriseFestivalDay({ dateMs: SCAN_FROM_MS, timezone: HYD_TZ, ...HYD_LATLNG }, DASHAMI_RULE, 60);
  assert.ok(m, "a match was found within the horizon");
  assert.equal(m.dateISO, "2026-10-21", "plain sunrise-tithi's computed date");
  assert.notEqual(m.dateISO, DRIK_REFERENCE.vijayadashami.hyderabad, "…which is confirmed NOT to equal Drik's own reference date");
});

test("Frisco does NOT show the same mismatch: plain tithi-at-sunrise happens to match Drik's reference there for both festivals", async () => {
  const navami = await tithiAtSunriseFestivalDay({ dateMs: SCAN_FROM_MS, timezone: FRISCO_TZ, ...FRISCO_LATLNG }, NAVAMI_RULE, 60);
  const dashami = await tithiAtSunriseFestivalDay({ dateMs: SCAN_FROM_MS, timezone: FRISCO_TZ, ...FRISCO_LATLNG }, DASHAMI_RULE, 60);
  assert.equal(navami?.dateISO, DRIK_REFERENCE["maha-navami"].frisco, "Frisco Navami matches Drik's reference (Hyderabad does not - see the tests above)");
  assert.equal(dashami?.dateISO, DRIK_REFERENCE.vijayadashami.frisco, "Frisco Dashami matches Drik's reference");
});

test("maha-navami and vijayadashami are deferred in the catalogue, not computed - guards against un-deferring either without new evidence", () => {
  const navamiRule = festivalRule("maha-navami");
  const dashamiRule = festivalRule("vijayadashami");
  assert.equal(navamiRule.method, "deferred", "maha-navami must stay deferred until the correct method is independently verified");
  assert.equal(dashamiRule.method, "deferred", "vijayadashami must stay deferred until the correct method is independently verified");
  assert.equal(navamiRule.validationStatus, "unresolved");
  assert.equal(dashamiRule.validationStatus, "unresolved");
  assert.ok(navamiRule.deferredReason && navamiRule.deferredReason.length > 0, "the honest reason is recorded, not silent");
  assert.ok(dashamiRule.deferredReason && dashamiRule.deferredReason.length > 0);
});

test("a deferred rule is never scanned: every FESTIVAL_RULES entry with method 'deferred' skips straight past, exactly like durga-ashtami already does", () => {
  const deferred = FESTIVAL_RULES.filter((r) => r.method === "deferred").map((r) => r.id);
  assert.ok(deferred.includes("maha-navami"));
  assert.ok(deferred.includes("vijayadashami"));
  assert.ok(deferred.includes("durga-ashtami"), "the pre-existing precedent this fix follows");
});

test("the rendered October 2026 Hyderabad Calendar shows neither festival - no confidently incorrect date reaches a family, and Durga Ashtami stays absent too (same pre-existing edge case)", async () => {
  const monthResult = await computeCalendarMonth({ ...HYD_LATLNG, timezone: HYD_TZ, year: 2026, month: 10 });
  const names = monthResult.festivalsAll.map((f) => f.name);
  assert.ok(!names.includes("Maha Navami"), `Maha Navami must not appear: ${JSON.stringify(names)}`);
  assert.ok(!names.includes("Vijayadashami (Dussehra)"), `Vijayadashami must not appear: ${JSON.stringify(names)}`);
  assert.ok(!names.includes("Durga Ashtami"), "the pre-existing deferred entry stays absent too");
  // The month is not silently empty - real, unrelated October festivals
  // still compute normally, proving this is a targeted exclusion, not a
  // broken scan.
  assert.ok(monthResult.festivalsAll.length > 0, "other October festivals still appear");
});

test("the rendered October 2026 Frisco Calendar ALSO shows neither festival - deferral is location-independent, per rule, not a Hyderabad-only patch", async () => {
  const monthResult = await computeCalendarMonth({ ...FRISCO_LATLNG, timezone: FRISCO_TZ, year: 2026, month: 10 });
  const names = monthResult.festivalsAll.map((f) => f.name);
  assert.ok(!names.includes("Maha Navami"));
  assert.ok(!names.includes("Vijayadashami (Dussehra)"));
});
