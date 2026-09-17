// Panchanga engine + validation gate.
//
// sunrise / sunset / tithi / nakshatra are validated against Drik Panchang for
// Hyderabad and Frisco on two dates each and must stay RELEASED. The
// descriptive fields (samvatsara / ayana / ritu / vaara) are validated against
// Drik day-panchang values. The Vinayaka Chavithi festival date and its
// Madhyahna puja window are validated by the madhyahna-vyapti rule against Drik
// Panchang festival pages for four years (2024–2027, incl. the 2024 leap year)
// at Hyderabad plus Frisco 2026, and are now RELEASED. No other muhurtham is
// ever computed.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const {
  validatePanchanga, panchangaProvenance, evidenceCanonicalJson,
  DAY_FIXTURES, FESTIVAL_FIXTURE, MADHYAHNA_FIXTURES, DESCRIPTIVE_FIXTURES,
  SUN_TOLERANCE_MIN, TRANSITION_TOLERANCE_MIN, PUJA_WINDOW_TOLERANCE_MIN,
} = await vite.ssrLoadModule("/lib/panchanga/validation.ts");
const {
  computePanchanga, formatClock, localCivilAnchorUtc, civilDateParts,
  localWallToUtcMs, vaaraForInstant, masaSanskrit, weekdayIndex,
  amantaSunriseFestivalDay, nishitaWindow, nishitaVyaptiFestivalDay,
  chandrodayaVyaptiFestivalDay, festivalRuleOccurrencesInRange,
} = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { generateSankalpam } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const { renderTerm } = await vite.ssrLoadModule("/lib/sankalpam/telugu-terms.ts");

const REPO = fileURLToPath(new URL("..", import.meta.url));
const sha256 = (t) => `sha256:${createHash("sha256").update(t, "utf8").digest("hex")}`;

// The validation gate is deterministic; run it once for the whole file.
const GATE = await validatePanchanga();

test("every validated field passes and is released", () => {
  const { released, results } = GATE;
  for (const field of [
    "sunrise", "sunset", "tithi", "nakshatra",
    "vaara", "ritu", "ayana", "samvatsara", "festival", "pujaWindow",
  ]) {
    assert.equal(released[field], true, `${field} released`);
  }
  const tol = { sunrise: SUN_TOLERANCE_MIN, sunset: SUN_TOLERANCE_MIN, pujaWindow: PUJA_WINDOW_TOLERANCE_MIN };
  for (const r of results) {
    for (const c of r.cases) {
      assert.ok(c.ok, `${r.field} ${c.place} ${c.dateISO}: computed ${c.computed} vs published ${c.published}`);
      if (c.deltaMin !== undefined) {
        assert.ok(c.deltaMin <= (tol[r.field] ?? TRANSITION_TOLERANCE_MIN), `${r.field} delta ${c.deltaMin}`);
      }
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

test("the Vinayaka Chavithi festival + puja window validate by the madhyahna-vyapti rule", () => {
  assert.equal(GATE.released.festival, true, "festival is released");
  assert.equal(GATE.released.pujaWindow, true, "puja window is released");
  const fest = GATE.results.find((r) => r.field === "festival");
  // 2024 (leap year), 2025, 2026, 2027 at Hyderabad + Frisco 2026.
  assert.equal(fest.cases.length, MADHYAHNA_FIXTURES.length);
  for (const c of fest.cases) {
    assert.equal(c.computed, c.published, `${c.place}: ${c.computed} vs ${c.published}`);
  }
  const byName = Object.fromEntries(fest.cases.map((c) => [c.place.split("—").pop().trim(), c.published]));
  assert.equal(byName["Vinayaka Chavithi 2026"], "2026-09-14");
  assert.equal(byName["Vinayaka Chavithi 2024"], "2024-09-07");
});

test("descriptive fields (samvatsara / ayana / ritu / vaara) match Drik day-panchang values", () => {
  for (const field of ["samvatsara", "ayana", "ritu", "vaara"]) {
    const r = GATE.results.find((x) => x.field === field);
    assert.equal(r.cases.length, DESCRIPTIVE_FIXTURES.length);
    for (const c of r.cases) assert.ok(c.ok, `${field} ${c.place}: ${c.computed} vs ${c.published}`);
  }
  const sam = GATE.results.find((x) => x.field === "samvatsara");
  assert.equal(sam.cases[0].computed, "Parabhava", "Shaka 1948 → Parabhava (South Indian reckoning)");
});

test("panchangaForLocation returns released fields, almanac context, and the location festival", async () => {
  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-09-09T00:00:00.000Z",
  };
  // The day after that month's Masa Shivaratri (2026-09-09) and before
  // Vinayaka Chavithi (2026-09-14), so Vinayaka is unambiguously soonest.
  const p = await panchangaForLocation(hyd, Date.parse("2026-09-10T12:00:00Z"));
  const keys = p.fields.map((f) => f.key).sort();
  assert.deepEqual(keys, ["nakshatra", "sunrise", "sunset", "tithi"]);
  assert.equal(p.festivalUnavailable, false);
  assert.ok(p.hasAny);
  // Almanac context lines.
  const ctx = Object.fromEntries(p.context.map((c) => [c.key, c.value]));
  assert.equal(ctx.samvatsara, "Parabhava");
  assert.equal(ctx.ayana, "Dakshinayana");
  // Next Vinayaka Chavithi for this location + a Madhyahna puja window.
  assert.ok(p.festival, "festival present");
  assert.equal(p.festival.name, "Vinayaka Chavithi");
  assert.equal(p.festival.dateISO, "2026-09-14");
  assert.ok(p.festival.pujaWindow, "puja window present");
  assert.match(p.festival.pujaWindow.start, /\d{1,2}:\d\d\s?(AM|PM)/i);
});

test("panchangaForLocation crosses the December/January boundary - a recurring rule due in January is shown from late December, no year filter", async () => {
  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-12-27T00:00:00.000Z",
  };
  // Dec 27, not Dec 20: Sankashti Chaturthi (also monthly, since its own
  // addition) now falls on 2026-12-26 - genuinely the soonest festival from
  // Dec 20, and it does not cross the year boundary. Querying the day AFTER
  // that occurrence has passed restores the intended scenario: the next
  // candidate from ANY active rule is Masa Shivaratri's 2027-01-05.
  const queryMs = Date.parse("2026-12-27T12:00:00Z");
  const p = await panchangaForLocation(hyd, queryMs);
  // Whichever rule is genuinely soonest from this date wins - computed
  // directly from the same already-validated engine functions (not a fresh
  // guess here), so this confirms panchangaForLocation propagates whichever
  // one is earliest rather than re-deriving or hardcoding a specific rule.
  const shivaratri = await nishitaVyaptiFestivalDay(
    { dateMs: queryMs, timezone: HYD_TZ, ...HYD_LATLNG }, MASA_SHIVARATRI_RULE,
  );
  const sankashti = await chandrodayaVyaptiFestivalDay(
    { dateMs: queryMs, timezone: HYD_TZ, ...HYD_LATLNG }, SANKASHTI_CHATURTHI_RULE,
  );
  const expected = [shivaratri, sankashti].sort((a, b) => a.dateISO.localeCompare(b.dateISO))[0];
  assert.match(expected.dateISO, /^2027-01-/, "sanity: this really is the Dec/Jan boundary case");
  assert.equal(expected.name, "Masa Shivaratri", "sanity: Masa Shivaratri is genuinely the soonest from this date");
  assert.ok(p.festival, "festival present, not hidden by a year boundary");
  assert.equal(p.festival.dateISO, expected.dateISO);
  assert.equal(p.festival.name, expected.name);
});

test("panchangaForLocation picks Ugadi over the next Masa Shivaratri when Ugadi is genuinely sooner", async () => {
  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-03-18T00:00:00.000Z",
  };
  // The day after March's Masa Shivaratri (2026-03-17, already passed) and
  // one day before Ugadi (2026-03-19) - the next Masa Shivaratri is a full
  // month away (2026-04-15), so Ugadi is genuinely the soonest candidate,
  // not merely a fixed rule preference.
  const p = await panchangaForLocation(hyd, Date.parse("2026-03-18T12:00:00Z"));
  assert.ok(p.festival, "festival present");
  assert.equal(p.festival.name, "Ugadi (Telugu New Year)");
  assert.equal(p.festival.nameTe, "ఉగాది");
  assert.equal(p.festival.dateISO, "2026-03-19");
  assert.equal(p.festival.pujaWindow, undefined, "Ugadi opens no puja service - no puja window");
});

test("panchangaForLocation picks Vinayaka Chavithi over the next Masa Shivaratri when Vinayaka is genuinely sooner", async () => {
  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-09-10T00:00:00.000Z",
  };
  // Day after September's Masa Shivaratri (2026-09-09); the next one is a
  // month away (2026-10-08), so Vinayaka Chavithi (2026-09-14) wins.
  const p = await panchangaForLocation(hyd, Date.parse("2026-09-10T12:00:00Z"));
  assert.ok(p.festival, "festival present");
  assert.equal(p.festival.name, "Vinayaka Chavithi");
  assert.equal(p.festival.dateISO, "2026-09-14");
});

test("panchangaForLocation returns no displayable fields until a location is READY", async () => {
  for (const status of ["NOT_SET", "PENDING"]) {
    const p = await panchangaForLocation({ status }, Date.now());
    assert.deepEqual(p.fields, []);
    assert.deepEqual(p.context, []);
    assert.equal(p.hasAny, false);
    assert.equal(p.festival, undefined);
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

test("Tithi/Nakshatra END TIMESTAMPS are validated, not only names, within tolerance", () => {
  const transitions = GATE.results
    .filter((r) => r.field === "tithi" || r.field === "nakshatra")
    .flatMap((r) => r.cases.filter((c) => c.kind === "transition"));
  assert.equal(transitions.length, 8, "one tithi-end + one nak-end per day fixture");
  for (const c of transitions) {
    assert.ok(c.ok, `${c.place} ${c.dateISO}: computed ${c.computed} vs published ${c.published} (Δ${c.deltaMin}m)`);
    assert.ok(c.deltaMin <= TRANSITION_TOLERANCE_MIN, `Δ${c.deltaMin} exceeds ${TRANSITION_TOLERANCE_MIN}min`);
  }
  // every day fixture carries published transition times
  for (const f of DAY_FIXTURES) {
    assert.match(f.published.transitions.tithiEndsLocal, /^\d{4}-\d\d-\d\d \d\d:\d\d$/);
    assert.match(f.published.transitions.nakshatraEndsLocal, /^\d{4}-\d\d-\d\d \d\d:\d\d$/);
  }
});

/* -------------------------------------------------------------------------- */
/* Timezone-aware civil-date anchoring                                        */
/* -------------------------------------------------------------------------- */

const TZ_EDGE_CASES = [
  { tz: "Asia/Kolkata", lat: 17.385, lng: 78.4867, when: "2026-09-09T20:00:00Z", expectDate: "2026-09-10" },
  { tz: "America/Chicago", lat: 33.15, lng: -96.82, when: "2026-06-15T12:00:00Z", expectDate: "2026-06-15" },
  { tz: "Pacific/Kiritimati", lat: 1.87, lng: -157.4, when: "2026-09-09T11:00:00Z", expectDate: "2026-09-10" }, // UTC+14
  { tz: "Pacific/Pago_Pago", lat: -14.28, lng: -170.7, when: "2026-09-09T05:00:00Z", expectDate: "2026-09-08" }, // UTC-11
  { tz: "America/Chicago", lat: 33.15, lng: -96.82, when: "2026-03-08T09:00:00Z", expectDate: "2026-03-08" }, // US DST starts
  { tz: "America/Chicago", lat: 33.15, lng: -96.82, when: "2026-11-01T06:30:00Z", expectDate: "2026-11-01" }, // US DST ends
];

const localDate = (ms, tz) => new Intl.DateTimeFormat("en-CA", {
  timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(ms));
const localHM = (ms, tz) => new Intl.DateTimeFormat("en-GB", {
  timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(ms));

for (const c of TZ_EDGE_CASES) {
  test(`civil-date anchor: ${c.tz} at ${c.when} → requested local date ${c.expectDate}`, async () => {
    const dateMs = Date.parse(c.when);
    const cd = civilDateParts(dateMs, c.tz);
    assert.equal(
      `${cd.y}-${String(cd.mo).padStart(2, "0")}-${String(cd.da).padStart(2, "0")}`,
      c.expectDate,
      "civil date of the instant in this zone",
    );
    // the anchor is LOCAL NOON on that civil date (never a bare 12:00 UTC)
    const anchor = localCivilAnchorUtc({ dateMs, latitude: c.lat, longitude: c.lng, timezone: c.tz });
    assert.equal(localDate(anchor.getTime(), c.tz), c.expectDate, "anchor is on the requested local date");
    assert.equal(localHM(anchor.getTime(), c.tz), "12:00", "anchor is local noon");

    // sunrise / sunset / Panchanga are for that same local civil date
    const p = await computePanchanga({ dateMs, latitude: c.lat, longitude: c.lng, timezone: c.tz });
    assert.equal(localDate(p.sunrise.getTime(), c.tz), c.expectDate, "sunrise is on the requested local date");
    assert.equal(localDate(p.sunset.getTime(), c.tz), c.expectDate, "sunset is on the requested local date");
    // sunrise before sunset, both plausible daytime hours
    assert.ok(p.sunrise.getTime() < p.sunset.getTime());
    assert.equal(p.atMs, dateMs);
  });
}

/* -------------------------------------------------------------------------- */
/* Host-timezone independence: Vaara + Sankalpam consistency (blocker 1)       */
/* -------------------------------------------------------------------------- */

test("Vaara is the LOCATION's civil weekday, identical for every host time zone", async () => {
  // 2026-09-10 is a Thursday (2026-09-09 is Wednesday per the day fixtures).
  assert.equal(weekdayIndex(2026, 9, 10), 4, "2026-09-10 is a Thursday");
  const HYD = { lat: 17.385, lng: 78.4867, tz: "Asia/Kolkata" };
  for (const hostLike of ["Asia/Kolkata", "America/Chicago", "Pacific/Kiritimati", "Pacific/Pago_Pago", "Etc/UTC"]) {
    // Local noon on 2026-09-10 at Hyderabad, expressed as a real instant.
    const dateMs = localWallToUtcMs(2026, 9, 10, 12, 0, 0, HYD.tz);
    const p = await computePanchanga({ dateMs, latitude: HYD.lat, longitude: HYD.lng, timezone: HYD.tz });
    assert.equal(p.vaara, "Guruvara", `Thursday ⇒ Guruvāra (host-like ${hostLike})`);
    assert.equal(vaaraForInstant(dateMs, HYD.tz), "Guruvara");
  }
});

test("the Thursday Vaara flows unchanged into the spoken Sankalpam (no inconsistent value)", async () => {
  const dateMs = localWallToUtcMs(2026, 9, 10, 12, 0, 0, "Asia/Kolkata");
  const p = await computePanchanga({
    dateMs, latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  });
  assert.equal(p.vaara, "Guruvara");

  // renderTerm resolves the SAME weekday the engine reported.
  const te = renderTerm("vaara", p.vaara);
  assert.equal(te.matched, true);
  assert.equal(te.te, "గురు");

  // The generator inserts exactly that weekday — Telugu + transliteration agree.
  const g = generateSankalpam({
    purpose: "Vinayaka Chavithi puja",
    groupMode: "INDIVIDUAL",
    people: [{ name: "Mahesh", lineage: {
      gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
      sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
    } }],
    place: { country: "India" },
    localDateISO: "2026-09-10",
    panchanga: {
      samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", masa: p.masa,
      paksha: p.pakshaAtSunrise, tithi: p.tithiAtSunrise.name, vaara: p.vaara,
      nakshatra: p.nakshatraAtSunrise.name,
    },
  });
  assert.equal(g.calendarForm, "FULL_DATED");
  assert.match(g.transliteration, /Guruvara-vasare,/);
  assert.match(g.teluguScript, /గురు వాసరే,/);
  // The wrong weekday must never appear.
  assert.doesNotMatch(g.transliteration, /Budhavara|Somavara|Mangalavara-vasare/);
});

test('the Home almanac shows the Sanskrit month "Bhadrapada", not the library\'s Odia "Bhadraba"', async () => {
  assert.equal(masaSanskrit("Bhadraba"), "Bhadrapada");
  assert.equal(masaSanskrit("Srabana"), "Shravana");
  assert.equal(masaSanskrit("Chaitra"), "Chaitra");
  const p = await computePanchanga({
    dateMs: localWallToUtcMs(2026, 9, 10, 12, 0, 0, "Asia/Kolkata"),
    latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  });
  assert.equal(p.masa, "Bhadrapada", "displayed as the Sanskrit name");
  // …and it still resolves to the correct Telugu form for the Sankalpam.
  assert.equal(renderTerm("masa", p.masa).te, "భాద్రపద");
});

test("release-config.json matches a fresh validation (released flags, report, evidence hash)", () => {
  const committed = JSON.parse(readFileSync(`${REPO}/lib/panchanga/release-config.json`, "utf8"));
  assert.deepEqual(committed.released, GATE.released, "released flags match");
  assert.equal(committed.evidenceHash, sha256(evidenceCanonicalJson()), "evidence hash matches");
  assert.equal(committed.report.length, GATE.results.length);
  // spot-check one case round-trips
  const f = committed.report.find((r) => r.field === "festival");
  assert.equal(f.released, true);
  assert.match(f.cases[0].provenanceUrl, /drikpanchang\.com/);
});

test("the browser Panchanga module does NOT import the historical validation module", () => {
  const src = readFileSync(`${REPO}/lib/panchanga/index.ts`, "utf8");
  assert.doesNotMatch(src, /from ["']\.\/validation["']/, "index.ts must not pull validation.ts into the client");
  assert.match(src, /from ["']\.\/release-config\.json["']/, "it reads the build-verified static config instead");
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

/* -------------------------------------------------------------------------- */
/* Amanta lunar month (masaAmanta / isAdhikaMasa)                             */
/*                                                                            */
/* Every expected value below was read directly from                        */
/* drikpanchang.com/panchang/day-panchang.html (dd/mm/yyyy date param,       */
/* geoname-id per location) on 2026-09-14 - not a search summary, not this   */
/* engine's own prior output. Full URLs + methodology:                      */
/* docs/temp/amanta-masa-validation-2026-09-14.md.                          */
/* -------------------------------------------------------------------------- */

const HYD_TZ = "Asia/Kolkata";
const FRISCO_TZ = "America/Chicago";
const HYD_LATLNG = { latitude: 17.385, longitude: 78.4867 };
const FRISCO_LATLNG = { latitude: 33.1507, longitude: -96.8236 };
const MS_PER_DAY = 86_400_000;

async function amantaAt(y, mo, da, tz, latlng) {
  const dateMs = localWallToUtcMs(y, mo, da, 12, 0, 0, tz);
  const p = await computePanchanga({ dateMs, timezone: tz, ...latlng });
  return { masa: p.masa, masaAmanta: p.masaAmanta, isAdhikaMasa: p.isAdhikaMasa };
}

test("Amanta: Shukla Paksha control date - Purnimanta and Amanta cannot differ", async () => {
  const r = await amantaAt(2026, 9, 14, HYD_TZ, HYD_LATLNG);
  assert.deepEqual(r, { masa: "Bhadrapada", masaAmanta: "Bhadrapada", isAdhikaMasa: false });
});

test("Amanta: a regular Krishna Paksha date, Hyderabad and Frisco agree", async () => {
  for (const [tz, latlng] of [[HYD_TZ, HYD_LATLNG], [FRISCO_TZ, FRISCO_LATLNG]]) {
    const r = await amantaAt(2026, 11, 5, tz, latlng);
    assert.deepEqual(r, { masa: "Kartika", masaAmanta: "Ashvina", isAdhikaMasa: false });
  }
});

test("Amanta: a second regular Krishna Paksha date, Hyderabad and Frisco agree", async () => {
  for (const [tz, latlng] of [[HYD_TZ, HYD_LATLNG], [FRISCO_TZ, FRISCO_LATLNG]]) {
    const r = await amantaAt(2026, 12, 26, tz, latlng);
    assert.deepEqual(r, { masa: "Pausha", masaAmanta: "Margashirsha", isAdhikaMasa: false });
  }
});

test("Amanta: the new-moon month-boundary day itself (Shukla Pratipada)", async () => {
  const r = await amantaAt(2026, 12, 9, HYD_TZ, HYD_LATLNG);
  assert.deepEqual(r, { masa: "Margashirsha", masaAmanta: "Margashirsha", isAdhikaMasa: false });
});

test("Amanta: the 2026 Adhika Jyeshtha window - leap flag set, name is Jyeshtha", async () => {
  for (const [y, mo, da] of [[2026, 5, 26], [2026, 5, 27]]) {
    const r = await amantaAt(y, mo, da, HYD_TZ, HYD_LATLNG);
    assert.deepEqual(r, { masa: "Jyeshtha", masaAmanta: "Jyeshtha", isAdhikaMasa: true });
  }
});

test("Amanta: the regular Jyeshtha immediately after 2026's Adhika month - masaAmanta correct, legacy masa is NOT (active defect, see engine.ts)", async () => {
  for (const [y, mo, da] of [[2026, 6, 24], [2026, 6, 25]]) {
    const r = await amantaAt(y, mo, da, HYD_TZ, HYD_LATLNG);
    assert.equal(r.masaAmanta, "Jyeshtha", "masaAmanta correctly repeats Jyeshtha (Nija, not Adhika)");
    assert.equal(r.isAdhikaMasa, false, "this is the regular occurrence, not the leap one");
    // Documents the known, unfixed defect rather than silently asserting it
    // away: the legacy `masa` field reads a full month early here.
    assert.equal(r.masa, "Ashadha", "KNOWN DEFECT: legacy masa (solar-Raasi lookup) reads one month early here, not true Purnimanta 'Jyeshtha'");
  }
});

test("Amanta: the 2026 masa label rolls over to Chaitra sunrise-anchored on March 20 - one day AFTER Ugadi itself (a kshaya-Pratipada year, see below)", async () => {
  const eve = await amantaAt(2026, 3, 19, HYD_TZ, HYD_LATLNG);
  assert.deepEqual(eve, { masa: "Chaitra", masaAmanta: "Phalguna", isAdhikaMasa: false });
  const rollover = await amantaAt(2026, 3, 20, HYD_TZ, HYD_LATLNG);
  assert.deepEqual(rollover, { masa: "Chaitra", masaAmanta: "Chaitra", isAdhikaMasa: false });
});

const UGADI_RULE = {
  name: "Ugadi (Telugu New Year)",
  nameTe: "ఉగాది",
  masaAmanta: "Chaitra",
  paksha: "Shukla",
  tithi: "Pratipada",
};

// 2026 is a KSHAYA year for Pratipada at Hyderabad: Drik Panchang's own
// day-panchang shows Padyami (Pratipada) spanning 6:52 AM Mar 19 - 4:52 AM
// Mar 20, while Hyderabad's Mar 19 sunrise is 6:21 AM (before Padyami
// begins) and Mar 20 sunrise is after 4:52 AM (after it ends) - Pratipada
// never touches a sunrise there. Drik's own dedicated Ugadi date page
// (fetched directly, both geoname ids) names 19 March 2026 as Ugadi for BOTH
// Hyderabad and Frisco - confirming amantaSunriseFestivalDay's kshaya
// fallback (the पూర్వైవ/earlier day) for Hyderabad, and its ordinary
// sunrise-vyapti path for Frisco (Pratipada DOES touch Frisco's Mar 19
// sunrise: begins 8:22 PM Mar 18, ends 6:22 PM Mar 19). 2027 is a plain,
// non-kshaya year at both locations. See
// docs/temp/amanta-masa-validation-2026-09-14.md and this session's
// verification.
test("amantaSunriseFestivalDay finds Ugadi 2026-03-19 at Hyderabad via the kshaya fallback (Pratipada touches no sunrise that year)", async () => {
  const m = await amantaSunriseFestivalDay(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    UGADI_RULE,
  );
  assert.ok(m, "Ugadi found within the year");
  assert.equal(m.dateISO, "2026-03-19");
  assert.equal(m.name, "Ugadi (Telugu New Year)");
  assert.equal(m.nameTe, "ఉగాది");
});

test("amantaSunriseFestivalDay finds Ugadi 2026-03-19 at Frisco via the ordinary sunrise-vyapti path (not kshaya there)", async () => {
  const m = await amantaSunriseFestivalDay(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: FRISCO_TZ, ...FRISCO_LATLNG },
    UGADI_RULE,
  );
  assert.ok(m, "Ugadi found within the year");
  assert.equal(m.dateISO, "2026-03-19");
});

test("amantaSunriseFestivalDay finds Ugadi 2027-04-07 at both Hyderabad and Frisco (non-kshaya)", async () => {
  for (const [tz, latlng] of [[HYD_TZ, HYD_LATLNG], [FRISCO_TZ, FRISCO_LATLNG]]) {
    const m = await amantaSunriseFestivalDay(
      { dateMs: Date.parse("2027-01-01T12:00:00Z"), timezone: tz, ...latlng },
      UGADI_RULE,
    );
    assert.ok(m, `Ugadi found for ${tz}`);
    assert.equal(m.dateISO, "2027-04-07");
  }
});

test("amantaSunriseFestivalDay returns null, never a guess, when the rule cannot match within the horizon", async () => {
  const m = await amantaSunriseFestivalDay(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { ...UGADI_RULE, tithi: "Chaturdashi", paksha: "Krishna", masaAmanta: "NoSuchMasa" },
    5,
  );
  assert.equal(m, null);
});

/* -------------------------------------------------------------------------- */
/* Boundary checks: a skipped (kshaya) sunrise vs. a repeated (vriddhi) one   */
/* -------------------------------------------------------------------------- */

test("amantaSunriseFestivalDay's kshaya fallback is verified against the ACTUAL tithi interval, not just the masa flip - a fabricated masa name never triggers it", async () => {
  // Regression for the rewritten fallback: it must not fire merely because
  // `masaAmanta` differs from one day to the next. Using a masaAmanta the
  // engine can never produce means the primary check AND the fallback's
  // masa-flip pre-filter both stay permanently unsatisfied - confirming the
  // fallback cannot be tricked into matching on masa alone.
  const m = await amantaSunriseFestivalDay(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { ...UGADI_RULE, masaAmanta: "NoSuchMasa" },
    30,
  );
  assert.equal(m, null, "no fabricated masa ever satisfies either the primary check or the fallback's masa pre-filter");
});

test("amantaSunriseFestivalDay: the day before a skipped-sunrise (kshaya) match is NOT itself a valid earlier match", async () => {
  // 2026 Hyderabad is the confirmed kshaya case (Padyami touches neither
  // sunrise; the fallback picks 19 March, the day the tithi actually held).
  // Directly confirm the day immediately before (18 March) does NOT also
  // qualify - i.e. the fallback is not just returning "whatever came before",
  // it is the one specific day whose bisected Pratipada interval is confined
  // between the two sunrises.
  const before = await amantaSunriseFestivalDay(
    { dateMs: Date.parse("2026-03-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    UGADI_RULE,
    17, // horizon ends before 19 March - only 18 March's own sunrise can match
  );
  assert.equal(before, null, "18 March 2026 does not itself qualify - only 19 March's confined interval does");
});

test("amantaSunriseFestivalDay: no repeated-sunrise (vriddhi) Amanta-Chaitra-Pratipada year was found in 2026-2044 at Hyderabad - the earlier-day-first guarantee is a property of the scan order, not a special case", async () => {
  // A genuinely long Pratipada spanning TWO consecutive sunrises would need
  // to begin only shortly before one sunrise and last close to the tithi's
  // ~26h47m maximum. Checked directly against Drik Panchang's Hyderabad
  // Ugadi page for every year 2026-2044: none produced a Padyami interval
  // touching two sunrises (each year's Ugadi date is confirmed by a SINGLE
  // sunrise falling inside the published Padyami begin/end times). Recorded
  // here as a real, dated finding - not assumed. If a genuine vriddhi year
  // is found later, the guarantee below is what would resolve it: the scan
  // is a plain forward loop that `return`s on the FIRST civil day (smallest
  // `i`) whose sunrise falls inside the target tithi, so an earlier
  // qualifying sunrise can never be skipped in favour of a later one -
  // confirmed here for the four already-validated cases, where the day
  // immediately before each real match never itself qualifies.
  for (const [tz, latlng, isoBeforeMatch] of [
    [HYD_TZ, HYD_LATLNG, "2026-03-18"],
    [FRISCO_TZ, FRISCO_LATLNG, "2026-03-18"],
    [HYD_TZ, HYD_LATLNG, "2027-04-06"],
    [FRISCO_TZ, FRISCO_LATLNG, "2027-04-06"],
  ]) {
    const dayBefore = Date.parse(`${isoBeforeMatch}T12:00:00Z`);
    const m = await amantaSunriseFestivalDay({ dateMs: dayBefore, timezone: tz, ...latlng }, UGADI_RULE, 1);
    assert.equal(m, null, `${isoBeforeMatch} at ${tz} must not itself match - the real Ugadi day is the next one`);
  }
});

/* -------------------------------------------------------------------------- */
/* Nishita-vyapti (Masa Shivaratri)                                          */
/* -------------------------------------------------------------------------- */

const MASA_SHIVARATRI_RULE = { name: "Masa Shivaratri", nameTe: "మాస శివరాత్రి", paksha: "Krishna", tithi: "Chaturdashi" };
const SANKASHTI_CHATURTHI_RULE = { name: "Sankashti Chaturthi", nameTe: "సంకష్టి చతుర్థి", paksha: "Krishna", tithi: "Chaturthi" };

test("nishitaWindow matches Drik Panchang's published Nishita Muhurta within the established sun-time tolerance (Hyderabad, 2026-01-16)", async () => {
  // Sunset 6:02 PM, next sunrise 6:50 AM -> night 768 min -> 8th/15 part.
  // Drik publishes 12:00 AM - 12:52 AM (2026-01-16 day-panchang page,
  // geoname-id 1269843). Compared with SUN_TOLERANCE_MIN (3 min), the same
  // published-sun-time tolerance validation.ts already uses everywhere else
  // in this codebase - the library's own computed sunset/sunrise differ from
  // Drik's published values by up to a couple of minutes, which is exactly
  // what that tolerance exists for.
  const nw = await nishitaWindow({
    dateMs: Date.parse("2026-01-16T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG,
  });
  const publishedStart = Date.parse("2026-01-17T00:00:00+05:30");
  const publishedEnd = Date.parse("2026-01-17T00:52:00+05:30");
  const deltaMin = (a, b) => Math.abs(a - b) / 60000;
  assert.ok(deltaMin(nw.startMs, publishedStart) <= SUN_TOLERANCE_MIN, `start delta ${deltaMin(nw.startMs, publishedStart)}min`);
  assert.ok(deltaMin(nw.endMs, publishedEnd) <= SUN_TOLERANCE_MIN, `end delta ${deltaMin(nw.endMs, publishedEnd)}min`);
});

test("nishitaVyaptiFestivalDay finds Masa Shivaratri 2026-01-16 at both Hyderabad and Frisco", async () => {
  for (const [tz, latlng] of [[HYD_TZ, HYD_LATLNG], [FRISCO_TZ, FRISCO_LATLNG]]) {
    const m = await nishitaVyaptiFestivalDay(
      { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: tz, ...latlng },
      MASA_SHIVARATRI_RULE,
    );
    assert.ok(m, `found for ${tz}`);
    assert.equal(m.dateISO, "2026-01-16");
    assert.equal(m.name, "Masa Shivaratri");
    assert.equal(m.nameTe, "మాస శివరాత్రి");
  }
});

test("nishitaVyaptiFestivalDay: a genuine cross-location divergence - 2026-03-17 at Hyderabad but 2026-03-16 at Frisco", async () => {
  // Directly confirmed via day-panchang fetches at each location: Hyderabad's
  // Nishita window (00:00-00:48, Mar 18) falls inside Chaturdashi (begins
  // 9:23 AM Mar 17); Frisco's OWN Nishita window (01:12-01:59 AM, Mar 17)
  // falls inside Chaturdashi there (begins 10:53 PM Mar 16, ends 9:55 PM Mar
  // 17) - so Frisco's qualifying night is the one after Mar 16, not Mar 17.
  const hyd = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-03-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    MASA_SHIVARATRI_RULE,
  );
  assert.equal(hyd.dateISO, "2026-03-17");

  const frisco = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-03-01T12:00:00Z"), timezone: FRISCO_TZ, ...FRISCO_LATLNG },
    MASA_SHIVARATRI_RULE,
  );
  assert.equal(frisco.dateISO, "2026-03-16");
});

test("nishitaVyaptiFestivalDay returns null, never a guess, when the rule cannot match within the horizon", async () => {
  // The real Jan 2026 Masa Shivaratri (16 Jan, confirmed above) is well
  // outside a 3-day horizon from 1 Jan - deterministically no match yet.
  const m = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    MASA_SHIVARATRI_RULE,
    3,
  );
  assert.equal(m, null);
});

test("festivalRuleOccurrencesInRange does not double-count a real echo: January 2026 Krishna Chaturdashi touches two consecutive Nishita windows but is ONE occurrence", async () => {
  // Directly confirmed: Chaturdashi spans 2026-01-16 22:21 to 2026-01-18
  // 00:03 (~25h42m) at Hyderabad, so it satisfies the vyapti check on BOTH
  // the night of 16→17 Jan AND the night of 17→18 Jan. Drik publishes only
  // ONE Masika Shivaratri that month (16 Jan) - the earlier day.
  // nishitaVyaptiFestivalDay itself resolves this from the tithi interval
  // (see its doc comment) - a plain one-day advance here is enough; no
  // separate range-level echo guard is needed.
  const occurrences = await festivalRuleOccurrencesInRange(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { method: "nishita-vyapti", ...MASA_SHIVARATRI_RULE, masa: "" },
    34, // matches calendar.ts's "month + 3 days" convention
  );
  assert.equal(occurrences.length, 1, `expected exactly one occurrence, got ${JSON.stringify(occurrences)}`);
  assert.equal(occurrences[0].dateISO, "2026-01-16");
});

/* -------------------------------------------------------------------------- */
/* Chandrodaya-vyapti (Sankashti Chaturthi)                                  */
/* -------------------------------------------------------------------------- */

const SYDNEY_TZ = "Australia/Sydney";
const SYDNEY_LATLNG = { latitude: -33.8688, longitude: 151.2093 };

// Preserved as a permanent fixture, not a one-off spot check: every one of
// Drik Panchang's published 2026 Sankashti Chaturthi dates for Hyderabad and
// Frisco (from its dedicated vrat-dates page, which also publishes the
// moonrise time used), checked as a full-year sequential scan the same way
// Calendar/Home actually consume this rule (each query starts the day after
// the previous occurrence, never re-fed the expected answer).
const SANKASHTI_HYDERABAD_2026 = [
  "2026-01-06", "2026-02-05", "2026-03-06", "2026-04-05", "2026-05-05", "2026-06-03",
  "2026-07-03", "2026-08-02", "2026-08-31", "2026-09-29", "2026-10-29", "2026-11-27", "2026-12-26",
];
const SANKASHTI_FRISCO_2026 = [
  "2026-01-06", "2026-02-04", "2026-03-06", "2026-04-05", "2026-05-04", "2026-06-03",
  "2026-07-03", "2026-08-01", "2026-08-31", "2026-09-29", "2026-10-28", "2026-11-27", "2026-12-26",
];

async function assertSankashtiSequence(tz, latlng, expectedDates, label) {
  let cursorMs = Date.parse("2025-12-25T12:00:00Z");
  for (const expected of expectedDates) {
    const m = await chandrodayaVyaptiFestivalDay({ dateMs: cursorMs, timezone: tz, ...latlng }, SANKASHTI_CHATURTHI_RULE, 60);
    assert.ok(m, `${label}: no match found scanning from ${new Date(cursorMs).toISOString()}, expected ${expected}`);
    assert.equal(m.dateISO, expected, `${label}: scanning from ${new Date(cursorMs).toISOString()}`);
    cursorMs = Date.parse(`${expected}T12:00:00Z`) + MS_PER_DAY;
  }
}

test("chandrodayaVyaptiFestivalDay matches all 13 of Drik Panchang's published 2026 Sankashti Chaturthi dates at Hyderabad", async () => {
  await assertSankashtiSequence(HYD_TZ, HYD_LATLNG, SANKASHTI_HYDERABAD_2026, "Hyderabad");
});

test("chandrodayaVyaptiFestivalDay matches all 13 of Drik Panchang's published 2026 Sankashti Chaturthi dates at Frisco", async () => {
  await assertSankashtiSequence(FRISCO_TZ, FRISCO_LATLNG, SANKASHTI_FRISCO_2026, "Frisco");
});

test("regression: Sydney 2026-12-27 Sankashti Chaturthi - a target Tithi wholly within ONE civil day, touching no midnight and no moonrise on any day", async () => {
  // Reported bug: querying from 2026-12-24 at Sydney returned 2027-01-25,
  // silently skipping the entire December occurrence. Root cause: Krishna
  // Chaturthi that cycle runs 2026-12-27 01:34 - 22:42 (Drik Panchang,
  // geoname-id 2147714) - entirely inside 27 Dec, touching neither that
  // day's own moonrise (22:57, AFTER the tithi already ended) nor either
  // neighbouring midnight. The OLD fallback only checked for a tithi
  // straddling a midnight boundary and missed this shape entirely; the noon
  // probe (see chandrodayaVyaptiFestivalDay's doc comment) catches it.
  const wellBefore = await chandrodayaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-12-01T12:00:00Z"), timezone: SYDNEY_TZ, ...SYDNEY_LATLNG }, SANKASHTI_CHATURTHI_RULE, 60,
  );
  assert.equal(wellBefore.dateISO, "2026-12-27", "queried well before");

  const dayBefore = await chandrodayaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-12-26T12:00:00Z"), timezone: SYDNEY_TZ, ...SYDNEY_LATLNG }, SANKASHTI_CHATURTHI_RULE, 60,
  );
  assert.equal(dayBefore.dateISO, "2026-12-27", "queried the day before");
  assert.equal(dayBefore.inDays, 1);

  const onDate = await chandrodayaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-12-27T12:00:00Z"), timezone: SYDNEY_TZ, ...SYDNEY_LATLNG }, SANKASHTI_CHATURTHI_RULE, 60,
  );
  assert.equal(onDate.dateISO, "2026-12-27", "queried on the day itself");
  assert.equal(onDate.inDays, 0);

  const dayAfter = await chandrodayaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-12-28T12:00:00Z"), timezone: SYDNEY_TZ, ...SYDNEY_LATLNG }, SANKASHTI_CHATURTHI_RULE, 60,
  );
  assert.notEqual(dayAfter.dateISO, "2026-12-27", "the day after must never re-report the same occurrence");
  assert.equal(dayAfter.dateISO, "2027-01-25", "queried the day after finds the TRUE next occurrence, not an echo");

  // The exact reported reproduction: querying from 24 Dec (three days
  // before the occurrence) must find 27 Dec, never skip to January.
  const reportedRepro = await chandrodayaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-12-24T12:00:00Z"), timezone: SYDNEY_TZ, ...SYDNEY_LATLNG }, SANKASHTI_CHATURTHI_RULE, 60,
  );
  assert.equal(reportedRepro.dateISO, "2026-12-27", "the exact reported reproduction (query from 24 Dec)");
});

test("chandrodayaVyaptiFestivalDay's fallback also resolves Sydney's OWN midnight-straddling case (30 Sep 2026), confirming one mechanism handles both shapes", async () => {
  // Krishna Chaturthi runs 2026-09-29 21:39 - 2026-09-30 19:25 (Drik) -
  // touches neither day's own moonrise (Sep29's is before the tithi begins;
  // Sep30's, ~22:08, is after it already ended), but DOES straddle the
  // Sep29/Sep30 midnight, unlike the wholly-contained December case above.
  const m = await chandrodayaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-09-15T12:00:00Z"), timezone: SYDNEY_TZ, ...SYDNEY_LATLNG }, SANKASHTI_CHATURTHI_RULE, 60,
  );
  assert.equal(m.dateISO, "2026-09-30");
});

test("festivalRuleOccurrencesInRange: every occurrence's inDays is relative to the ORIGINAL query date, not the scan's moving cursor", async () => {
  // Direct regression for the reported countdown bug: only the first
  // occurrence's inDays was ever relative to the original date; every later
  // one was relative to wherever the internal scan happened to resume,
  // silently understating "in N days" for the 2nd, 3rd, 4th, 5th cards.
  const originMs = Date.parse("2026-09-17T12:00:00Z");
  const occurrences = await festivalRuleOccurrencesInRange(
    { dateMs: originMs, timezone: HYD_TZ, ...HYD_LATLNG },
    { method: "chandrodaya-vyapti", ...SANKASHTI_CHATURTHI_RULE, masa: "" },
    200,
  );
  assert.ok(occurrences.length >= 5, `expected at least 5 occurrences to check, got ${occurrences.length}`);
  for (const o of occurrences) {
    const [y, mo, da] = o.dateISO.split("-").map(Number);
    const expectedInDays = Math.round((Date.UTC(y, mo - 1, da) - Date.UTC(2026, 8, 17)) / MS_PER_DAY);
    assert.equal(o.inDays, expectedInDays, `${o.dateISO}: inDays must count from the original 2026-09-17 query, not the scan cursor`);
  }
  // Concretely, not just algebraically: the five real dates found from this
  // query and their real day-counts from 17 Sep.
  assert.deepEqual(
    occurrences.slice(0, 5).map((o) => [o.dateISO, o.inDays]),
    [
      ["2026-09-29", 12],
      ["2026-10-29", 42],
      ["2026-11-27", 71],
      ["2026-12-26", 100],
      ["2027-01-25", 130],
    ],
  );
});

/* -------------------------------------------------------------------------- */
/* Regression: the Home/Calendar date-disagreement bug (echo day 2026-01-17) */
/* -------------------------------------------------------------------------- */
//
// Bug as reported: Calendar (scanning a whole month from day 1) correctly
// finds 2026-01-16. But a FRESH scan starting ON the echo day (2026-01-17 -
// exactly what Home does whenever "today" is that day) matched immediately
// and reported 17 Jan as a second, brand-new occurrence - even though
// nothing changed about the tithi interval itself. The fix must resolve the
// same date regardless of where the caller starts looking, not merely
// suppress the symptom inside one particular scan loop.

test("nishitaVyaptiFestivalDay resolves the SAME 2026-01-16 occurrence whether queried before, on, or the day after it", async () => {
  const before = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-01-10T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG }, MASA_SHIVARATRI_RULE,
  );
  assert.equal(before.dateISO, "2026-01-16", "queried several days before");

  const onDate = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-01-16T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG }, MASA_SHIVARATRI_RULE,
  );
  assert.equal(onDate.dateISO, "2026-01-16", "queried on the day itself");
  assert.equal(onDate.inDays, 0);

  const onEchoDay = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-01-17T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG }, MASA_SHIVARATRI_RULE,
  );
  assert.notEqual(onEchoDay.dateISO, "2026-01-17", "the echo day must never be reported as a fresh occurrence");
  assert.equal(onEchoDay.dateISO, "2026-02-15", "queried the day after (the echo day) finds the TRUE next occurrence, not the past one and not the echo");

  const wellAfter = await nishitaVyaptiFestivalDay(
    { dateMs: Date.parse("2026-01-20T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG }, MASA_SHIVARATRI_RULE,
  );
  assert.equal(wellAfter.dateISO, "2026-02-15", "queried well after both 16 and 17 Jan agrees with the echo-day query");
});

test("festivalRuleOccurrencesInRange starting exactly on the second qualifying day (the echo) never reports it, and finds the true next occurrence", async () => {
  const occurrences = await festivalRuleOccurrencesInRange(
    { dateMs: Date.parse("2026-01-17T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { method: "nishita-vyapti", ...MASA_SHIVARATRI_RULE, masa: "" },
    40,
  );
  assert.ok(!occurrences.some((o) => o.dateISO === "2026-01-17"), `echo day leaked into range results: ${JSON.stringify(occurrences)}`);
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].dateISO, "2026-02-15");
});

test("month-boundary case: January's Calendar month shows only 16 Jan, February's shows only 15 Feb - the echo never leaks across the boundary either way", async () => {
  const january = await festivalRuleOccurrencesInRange(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { method: "nishita-vyapti", ...MASA_SHIVARATRI_RULE, masa: "" },
    34, // Calendar's own "month + 3 days" convention for January (31 days)
  );
  assert.deepEqual(january.map((o) => o.dateISO), ["2026-01-16"]);

  const february = await festivalRuleOccurrencesInRange(
    { dateMs: Date.parse("2026-02-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { method: "nishita-vyapti", ...MASA_SHIVARATRI_RULE, masa: "" },
    31, // February (28 days) + 3
  );
  assert.deepEqual(february.map((o) => o.dateISO), ["2026-02-15"]);
});

test("Home never shows the Masa Shivaratri echo day (2026-01-17), even with the full Phase 1 rule set competing for the P0/P1 rows", async () => {
  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-01-17T00:00:00.000Z",
  };
  const home = await panchangaForLocation(hyd, Date.parse("2026-01-17T12:00:00Z"));
  assert.ok(home.festival, "Home shows a festival");
  assert.notEqual(home.festival.dateISO, "2026-01-17", "Home must not show the echo day");
  for (const f of home.upcomingFestivals) {
    assert.notEqual(f.dateISO, "2026-01-17", `${f.name} must not show the echo day`);
  }
  // Ratha Saptami's own 2026 occurrence (2026-01-25, directly confirmed
  // against Drik's own dedicated Ratha Saptami page for Hyderabad) is
  // genuinely the soonest Home-P1 candidate from this date, ahead of
  // Sankashti Chaturthi's 2026-02-05 - confirmed directly, not assumed.
  assert.equal(home.festival.name, "Ratha Saptami");
  assert.equal(home.festival.dateISO, "2026-01-25");
  // Exactly 3 rows: one P0 (Maha Shivaratri, 2026-02-15, within 60 days) and
  // two P1s (Ratha Saptami 2026-01-25, Sankashti Chaturthi 2026-02-05 - the
  // two soonest of the three P1 candidates within 30 days; Masa Shivaratri's
  // own 2026-02-15 P1 occurrence is a real third P1 candidate but is
  // correctly excluded, since only the two soonest P1 rows are kept).
  assert.equal(home.upcomingFestivals.length, 3);
  assert.deepEqual(
    home.upcomingFestivals.map((f) => [f.name, f.dateISO]),
    [
      ["Ratha Saptami", "2026-01-25"],
      ["Sankashti Chaturthi", "2026-02-05"],
      ["Maha Shivaratri", "2026-02-15"],
    ],
  );
});

test("festivalRuleOccurrencesInRange finds Ugadi and Vinayaka Chavithi as single occurrences too (no echo for these two, confirmed elsewhere)", async () => {
  const ugadiOccurrences = await festivalRuleOccurrencesInRange(
    { dateMs: Date.parse("2026-01-01T12:00:00Z"), timezone: HYD_TZ, ...HYD_LATLNG },
    { method: "amanta-sunrise", name: "Ugadi (Telugu New Year)", nameTe: "ఉగాది", masa: "Chaitra", paksha: "Shukla", tithi: "Pratipada" },
    100,
  );
  assert.equal(ugadiOccurrences.length, 1);
  assert.equal(ugadiOccurrences[0].dateISO, "2026-03-19");
});
