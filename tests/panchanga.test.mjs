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

const {
  validatePanchanga, panchangaProvenance, DAY_FIXTURES, FESTIVAL_FIXTURE, SUN_TOLERANCE_MIN,
} = await vite.ssrLoadModule("/lib/panchanga/validation.ts");
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

test("engine: Hyderabad 2026-09-09 sunrise + the sunrise-time Tithi/Nakshatra match the fixture", async () => {
  const p = await computePanchanga({
    dateMs: Date.parse("2026-09-09T12:00:00Z"),
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  });
  assert.match(formatClock(p.sunrise, "Asia/Kolkata"), /^6:0[34] AM$/);
  assert.match(p.tithiAtSunrise.name, /Trayoda/);
  assert.equal(p.nakshatraAtSunrise.name, "Ashlesha");
  assert.equal(p.pakshaAtSunrise, "Krishna");
  assert.equal(p.atMs, Date.parse("2026-09-09T12:00:00Z"));
});

// Drik Panchang, Hyderabad 2026-09-09: Trayodashi ends 12:30 PM IST,
// Ashlesha ends 03:14 PM IST.
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "x",
};
const at = (istHHMM) => {
  const [h, m] = istHHMM.split(":").map(Number);
  return Date.UTC(2026, 8, 9, h - 5, m - 30); // IST = UTC+5:30
};

test("current Tithi is the element active at the instant — before and after a transition", async () => {
  const before = await panchangaForLocation(HYD, at("12:29"));
  const after = await panchangaForLocation(HYD, at("12:31"));
  const tithi = (p) => p.fields.find((f) => f.key === "tithi");
  assert.match(tithi(before).value, /Trayoda/, "12:29 IST → Trayodashi");
  assert.match(tithi(after).value, /Chaturda/, "12:31 IST → Chaturdashi");
  assert.notEqual(tithi(before).value, tithi(after).value);
  // the sunrise value is retained on the post-transition card
  assert.match(tithi(after).atSunrise, /Trayoda/);
});

test("current Nakshatra is the element active at the instant — before and after a transition", async () => {
  const before = await panchangaForLocation(HYD, at("15:13"));
  const after = await panchangaForLocation(HYD, at("15:15"));
  const nak = (p) => p.fields.find((f) => f.key === "nakshatra");
  assert.equal(nak(before).value, "Ashlesha", "3:13 PM IST → Ashlesha");
  assert.equal(nak(after).value, "Magha", "3:15 PM IST → Magha");
  assert.match(nak(after).atSunrise, /Ashlesha/);
});

test("an element is never shown as current after its end time", async () => {
  for (const istHHMM of ["06:30", "12:29", "12:31", "15:15", "22:00"]) {
    const p = await panchangaForLocation(HYD, at(istHHMM));
    for (const f of p.fields) {
      if (f.key !== "tithi" && f.key !== "nakshatra") continue;
      // endsAt reads as a future time; "tomorrow"/"on <date>" when it crosses midnight
      assert.ok(
        typeof f.endsAt === "string" && f.endsAt.length > 0,
        `${f.key} at ${istHHMM} has an end-time string`,
      );
    }
  }
});

test("an end time that crosses local midnight is labelled 'tomorrow' or dated", async () => {
  // 12:31 IST: Chaturdashi runs until 10:33 AM the NEXT local day.
  const p = await panchangaForLocation(HYD, at("12:31"));
  const tithi = p.fields.find((f) => f.key === "tithi");
  assert.match(tithi.endsAt, /tomorrow$|on \w{3}, \d/, `end reads: "${tithi.endsAt}"`);
  // 12:29 IST: Trayodashi ends the same day — plain clock time, no "tomorrow".
  const same = await panchangaForLocation(HYD, at("12:29"));
  assert.doesNotMatch(same.fields.find((f) => f.key === "tithi").endsAt, /tomorrow|on \w{3}/);
});

test("the fixture set covers Hyderabad and Frisco on two dates each", () => {
  const places = new Set(DAY_FIXTURES.map((f) => f.place));
  assert.ok(places.has("Hyderabad, India"));
  assert.ok(places.has("Frisco, Texas, USA"));
  assert.equal(DAY_FIXTURES.length, 4);
  assert.equal(FESTIVAL_FIXTURE.publishedDateISO, "2026-09-14");
});

test("every fixture carries exact validation provenance", () => {
  for (const p of panchangaProvenance()) {
    assert.ok(p.source && p.source.length > 0, "source named");
    assert.match(p.url, /^https:\/\/www\.drikpanchang\.com\//, "a real source URL");
    assert.match(p.accessedISO, /^\d{4}-\d\d-\d\d$/, "an access date");
    assert.match(p.place, /geoname-id \d+/, "selected location with geoname-id");
    assert.ok(p.timezone && p.timezone.includes("/"), "an IANA timezone");
    assert.ok(Object.keys(p.referenceValues).length >= 3, "verbatim reference values");
    assert.equal(typeof p.complete, "boolean");
  }
  // Every fixture's provenance is complete (evidence was recovered).
  assert.ok(panchangaProvenance().every((p) => p.complete === true));
  // The GATE cases surface the provenance url + completeness.
  for (const r of GATE.results) {
    for (const c of r.cases) {
      assert.match(c.provenanceUrl, /^https:\/\/www\.drikpanchang\.com\//);
      assert.equal(c.provenanceComplete, true);
    }
  }
});
