// Panchanga engine + validation gate.
//
// sunrise / sunset / tithi / nakshatra are validated against Drik Panchang for
// Hyderabad and Frisco on two dates each and must stay RELEASED. The Vinayaka
// Chavithi festival fixture is a KNOWN discrepancy (drik places it a day
// earlier via the madhyahna-vyapti rule) and must stay BLOCKED - the app never
// shows a festival day or any muhurtham until it validates.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { validatePanchanga, DAY_FIXTURES, FESTIVAL_FIXTURE, SUN_TOLERANCE_MIN } =
  await vite.ssrLoadModule("/lib/panchanga/validation.ts");
const { computePanchanga, formatClock } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");

// The validation gate is deterministic; run it once for the whole file.
const GATE = await validatePanchanga();

test("sunrise, sunset, tithi and nakshatra all pass validation (released)", () => {
  const { released, results } = GATE;
  assert.equal(released.sunrise, true);
  assert.equal(released.sunset, true);
  assert.equal(released.tithi, true);
  assert.equal(released.nakshatra, true);
  for (const r of results) {
    if (r.field === "festival") continue;
    for (const c of r.cases) {
      assert.ok(c.ok, `${r.field} ${c.place} ${c.dateISO}: computed ${c.computed} vs published ${c.published}`);
      if (c.deltaMin !== undefined) assert.ok(c.deltaMin <= SUN_TOLERANCE_MIN);
    }
  }
});

test("every day fixture matches its published sun times within tolerance", () => {
  const worst = Math.max(
    ...GATE.results.filter((r) => r.field === "sunrise" || r.field === "sunset")
      .flatMap((r) => r.cases.map((c) => c.deltaMin)),
  );
  assert.ok(worst <= SUN_TOLERANCE_MIN, `worst sun-time delta ${worst}min exceeds ${SUN_TOLERANCE_MIN}min`);
});

test("the Vinayaka Chavithi festival fixture is a documented, BLOCKED discrepancy", () => {
  assert.equal(GATE.released.festival, false, "festival must not be released");
  const fest = GATE.results.find((r) => r.field === "festival");
  assert.equal(fest.cases[0].ok, false);
  assert.equal(fest.cases[0].published, "2026-09-14", "published reference is 14 Sep 2026");
  assert.equal(fest.cases[0].computed, "2026-09-15", "the scan lands on 15 Sep (madhyahna rule not modelled)");
});

test("panchangaForLocation returns only released fields and marks the festival unavailable", async () => {
  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-09-09T00:00:00.000Z",
  };
  const p = await panchangaForLocation(hyd, Date.parse("2026-09-09T12:00:00Z"));
  const keys = p.fields.map((f) => f.key).sort();
  assert.deepEqual(keys, ["nakshatra", "sunrise", "sunset", "tithi"]);
  assert.equal(p.festivalUnavailable, true);
  assert.ok(p.hasAny);
  assert.ok(!JSON.stringify(p.fields).match(/muhurth|festival|chavithi/i));
});

test("panchangaForLocation returns no displayable fields until a location is READY", async () => {
  for (const status of ["NOT_SET", "PENDING"]) {
    const p = await panchangaForLocation({ status }, Date.now());
    assert.deepEqual(p.fields, []);
    assert.equal(p.hasAny, false);
    assert.equal(p.festivalUnavailable, true);
    assert.ok(Array.isArray(p.validation));
  }
});

test("engine: Hyderabad 2026-09-09 sunrise/tithi/nakshatra match the fixture directly", async () => {
  const p = await computePanchanga({
    dateMs: Date.parse("2026-09-09T12:00:00Z"),
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  });
  assert.match(formatClock(p.sunrise, "Asia/Kolkata"), /^6:0[34] AM$/);
  assert.match(p.tithi.name, /Trayoda/);
  assert.equal(p.nakshatra.name, "Ashlesha");
  assert.equal(p.paksha, "Krishna");
});

test("the fixture set covers Hyderabad and Frisco on two dates each", () => {
  const places = new Set(DAY_FIXTURES.map((f) => f.place));
  assert.ok(places.has("Hyderabad, India"));
  assert.ok(places.has("Frisco, Texas, USA"));
  assert.equal(DAY_FIXTURES.length, 4);
  assert.equal(FESTIVAL_FIXTURE.publishedDateISO, "2026-09-14");
});
