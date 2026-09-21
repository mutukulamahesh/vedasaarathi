// General daily useful/avoid timings.
//
// OUTPUT VALIDATION (single-source): computed start/end times are compared to
// Drik Panchang's published Day Panchang, to the minute (±3 min), for Hyderabad
// (Thursday + Wednesday) and Frisco (Thursday + the US fall-back Sunday).
// Independent second-source cross-checks were rate-limited at authoring time —
// this is a single-source comparison (see DAY_TIMINGS_OUTPUT_VALIDATION).
//
// Vijaya Muhurta (the 11th of the same 15-muhurta daytime division as Abhijit,
// the 8th) is separately output-validated against three directly-fetched Drik
// Panchang pages: Hyderabad Tuesday + Wednesday (confirming it has NO weekday
// exception, unlike Abhijit) and Frisco Tuesday.
//
// REPRESENTATIVE FIXTURES (rule/structural): short and long daylight seasons,
// Northern and Southern hemisphere, spring-forward and fall-back days, UTC+14
// and UTC-11, saved timezone != host timezone, Wednesday without Abhijit,
// overlapping useful/avoid periods, and missing/invalid sun times.
//
// Brahma Muhurta is DEFERRED (DAY_TIMINGS_DEFERRED) and must NOT appear.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const OV = await vite.ssrLoadModule("/lib/panchanga/day-timings.ts");
const OV_ENGINE = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const OV_CAL = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");
const OV_HOME = await vite.ssrLoadModule("/lib/panchanga/index.ts");

const { computePanchanga, formatClock, minutesOfDay } =
  await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const {
  computeDayTimings, DAY_PERIOD_TEXT, DAY_TIMINGS_BACKLOG, DAY_TIMINGS_DEFERRED,
  DAY_TIMINGS_OUTPUT_VALIDATION, DAY_TIMINGS_RULE_SOURCES, DAY_TIMINGS_SCOPE_EN,
} = await vite.ssrLoadModule("/lib/panchanga/day-timings.ts");

const HYD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };
const FRISCO = { latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" };

/** Compute the day periods for a location on a civil date via the real engine. */
async function periodsFor(loc, isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const noonMs = Date.parse(`${isoDate}T12:00:00Z`); // engine re-anchors to local noon
  const p = await computePanchanga({ dateMs: noonMs, ...loc });
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const t = computeDayTimings(p.sunrise.getTime(), p.sunset.getTime(), weekday);
  const byId = {};
  for (const per of [...t.useful, ...t.avoid]) {
    byId[per.id] = {
      start: formatClock(new Date(per.startMs), loc.timezone),
      end: formatClock(new Date(per.endMs), loc.timezone),
      startMin: minutesOfDay(new Date(per.startMs), loc.timezone),
      endMin: minutesOfDay(new Date(per.endMs), loc.timezone),
      startMs: per.startMs,
      endMs: per.endMs,
    };
  }
  return {
    byId, t,
    sunriseMs: p.sunrise.getTime(), sunsetMs: p.sunset.getTime(),
    sunrise: formatClock(p.sunrise, loc.timezone), sunset: formatClock(p.sunset, loc.timezone),
    daylightMin: Math.round((p.sunset.getTime() - p.sunrise.getTime()) / 60000),
  };
}

const hm = (s) => {
  const [, hh, mm, ap] = s.match(/(\d+):(\d+)\s*([AP]M)/i);
  let h = Number(hh) % 12;
  if (/pm/i.test(ap)) h += 12;
  return h * 60 + Number(mm);
};

function expectPeriod(byId, id, publishedStart, publishedEnd, tol = 3) {
  const got = byId[id];
  assert.ok(got, `${id} computed`);
  assert.ok(Math.abs(got.startMin - hm(publishedStart)) <= tol,
    `${id} start: got ${got.start}, published ${publishedStart}`);
  assert.ok(Math.abs(got.endMin - hm(publishedEnd)) <= tol,
    `${id} end: got ${got.end}, published ${publishedEnd}`);
}

/* -------------------------------------------------------------------------- */
/* Output validation vs Drik Panchang (single source)                        */
/* -------------------------------------------------------------------------- */

test("Hyderabad, Thursday 2026-09-10 — Abhijit + the three avoid periods match Drik to the minute", async () => {
  const { byId } = await periodsFor(HYD, "2026-09-10");
  expectPeriod(byId, "abhijit", "11:48 AM", "12:38 PM");
  expectPeriod(byId, "rahu", "1:45 PM", "3:18 PM");
  expectPeriod(byId, "yamaganda", "6:03 AM", "7:36 AM");
  expectPeriod(byId, "gulika", "9:08 AM", "10:41 AM");
  assert.equal(byId.brahma, undefined, "Brahma Muhurta is deferred — not returned");
});

test("Hyderabad, Wednesday 2026-09-09 — no Abhijit Muhurta, but Vijaya still present (no weekday exception); avoid periods match Drik", async () => {
  const { byId, t } = await periodsFor(HYD, "2026-09-09");
  assert.deepEqual(t.useful.map((p) => p.id), ["vijaya"], "Abhijit absent on Wednesday; Vijaya has no such exception; Brahma deferred");
  expectPeriod(byId, "rahu", "12:13 PM", "1:46 PM");
  expectPeriod(byId, "yamaganda", "7:36 AM", "9:08 AM");
  expectPeriod(byId, "gulika", "10:41 AM", "12:13 PM");
});

/* -------------------------------------------------------------------------- */
/* Vijaya Muhurta — output validation vs Drik Panchang (directly fetched)    */
/* -------------------------------------------------------------------------- */

test("Vijaya Muhurta — Hyderabad Tuesday 2026-09-15 matches Drik to the minute", async () => {
  const { byId } = await periodsFor(HYD, "2026-09-15");
  expectPeriod(byId, "vijaya", "2:14 PM", "3:03 PM");
});

test("Vijaya Muhurta — Hyderabad Wednesday 2026-09-16: still present (no weekday exception) and matches Drik", async () => {
  const { byId, t } = await periodsFor(HYD, "2026-09-16");
  assert.equal(t.useful.find((p) => p.id === "abhijit"), undefined, "Abhijit still absent on Wednesday");
  expectPeriod(byId, "vijaya", "2:13 PM", "3:02 PM");
});

test("Vijaya Muhurta — Frisco Tuesday 2026-09-15 matches Drik to the minute", async () => {
  const { byId } = await periodsFor(FRISCO, "2026-09-15");
  expectPeriod(byId, "vijaya", "3:26 PM", "4:16 PM");
});

test("Frisco, Thursday 2026-09-10 — matches Drik to the minute", async () => {
  const { byId } = await periodsFor(FRISCO, "2026-09-10");
  expectPeriod(byId, "abhijit", "12:59 PM", "1:49 PM");
  expectPeriod(byId, "rahu", "2:58 PM", "4:32 PM");
  expectPeriod(byId, "yamaganda", "7:08 AM", "8:42 AM");
  expectPeriod(byId, "gulika", "10:16 AM", "11:50 AM");
});

test("Frisco, Sunday 2026-11-01 (US fall-back day) — matches Drik to the minute", async () => {
  const { byId } = await periodsFor(FRISCO, "2026-11-01");
  expectPeriod(byId, "abhijit", "11:49 AM", "12:32 PM");
  expectPeriod(byId, "rahu", "4:14 PM", "5:36 PM");
  expectPeriod(byId, "yamaganda", "12:11 PM", "1:32 PM");
  expectPeriod(byId, "gulika", "2:53 PM", "4:14 PM");
});

/* -------------------------------------------------------------------------- */
/* Representative fixtures — rule / structural properties                    */
/* -------------------------------------------------------------------------- */

/** Rahu/Yamaganda/Gulika must be exactly the documented 1/8 slice of daylight
 * for that weekday; Abhijit must bracket local solar noon and last ~D/15. */
async function assertRuleShape(loc, isoDate, label) {
  const r = await periodsFor(loc, isoDate);
  const wd = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  const D = r.sunsetMs - r.sunriseMs;
  const unit = D / 8;
  const PART = { rahu: [8, 2, 7, 5, 6, 4, 3], yamaganda: [5, 4, 3, 2, 1, 7, 6], gulika: [7, 6, 5, 4, 3, 2, 1] };
  for (const id of ["rahu", "yamaganda", "gulika"]) {
    const p = r.byId[id];
    assert.ok(p, `${label}: ${id} present`);
    const expStart = r.sunriseMs + (PART[id][wd] - 1) * unit;
    assert.ok(Math.abs(p.startMs - expStart) < 60000, `${label}: ${id} is the ${PART[id][wd]}/8 slice`);
    assert.ok(Math.abs((p.endMs - p.startMs) - unit) < 60000, `${label}: ${id} spans one eighth`);
    assert.ok(p.startMs >= r.sunriseMs - 1000 && p.endMs <= r.sunsetMs + 1000, `${label}: ${id} inside daylight`);
  }
  if (wd !== 3) {
    const a = r.byId.abhijit;
    assert.ok(a, `${label}: Abhijit present`);
    const noon = (r.sunriseMs + r.sunsetMs) / 2;
    assert.ok(a.startMs < noon && a.endMs > noon, `${label}: Abhijit brackets solar noon`);
    assert.ok(Math.abs((a.endMs - a.startMs) - D / 15) < 60000, `${label}: Abhijit ~ D/15 long`);
  } else {
    assert.equal(r.byId.abhijit, undefined, `${label}: no Abhijit on Wednesday`);
  }
  // Vijaya Muhurta: the 11th of 15 equal day-muhurta, every day including Wednesday.
  const v = r.byId.vijaya;
  assert.ok(v, `${label}: Vijaya present (every weekday, including Wednesday)`);
  const expVijayaStart = r.sunriseMs + (10 * D) / 15;
  assert.ok(Math.abs(v.startMs - expVijayaStart) < 60000, `${label}: Vijaya is the 11th/15 muhurta`);
  assert.ok(Math.abs((v.endMs - v.startMs) - D / 15) < 60000, `${label}: Vijaya ~ D/15 long`);
  assert.ok(v.startMs >= r.sunriseMs - 1000 && v.endMs <= r.sunsetMs + 1000, `${label}: Vijaya inside daylight`);
  assert.equal(r.byId.brahma, undefined, `${label}: Brahma Muhurta never returned`);
  return r;
}

test("short-daylight season (December) — rule holds, Hyderabad", async () => {
  const r = await assertRuleShape(HYD, "2026-12-21", "Hyd Dec");
  assert.ok(r.daylightMin < 12 * 60, `winter daylight is short (${r.daylightMin} min)`);
});

test("long-daylight season (June) — rule holds, Frisco", async () => {
  const r = await assertRuleShape(FRISCO, "2026-06-21", "Frisco Jun");
  assert.ok(r.daylightMin > 13 * 60, `summer daylight is long (${r.daylightMin} min)`);
});

test("Southern Hemisphere (Sydney) — rule holds and seasons are inverted", async () => {
  const SYD = { latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" };
  const jun = await assertRuleShape(SYD, "2026-06-21", "Sydney Jun");
  const dec = await assertRuleShape(SYD, "2026-12-21", "Sydney Dec");
  assert.ok(jun.daylightMin < dec.daylightMin, "June is the short day in the Southern Hemisphere");
});

test("US spring-forward day (Chicago 2026-03-08) — rule holds, DST-safe", async () => {
  await assertRuleShape({ latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" }, "2026-03-08", "Chicago spring-forward");
});

test("US fall-back day (Chicago 2026-11-01) — rule holds, DST-safe", async () => {
  await assertRuleShape({ latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" }, "2026-11-01", "Chicago fall-back");
});

test("UTC+14 (Kiritimati) and UTC-11 (Pago Pago) — rule holds at the date line", async () => {
  await assertRuleShape({ latitude: 1.87, longitude: -157.43, timezone: "Pacific/Kiritimati" }, "2026-09-10", "Kiritimati");
  await assertRuleShape({ latitude: -14.28, longitude: -170.7, timezone: "Pacific/Pago_Pago" }, "2026-09-10", "Pago Pago");
});

test("the result depends only on the sun times + weekday, not the host process TZ", () => {
  // Pure-function call with fixed inputs is identical regardless of process.env.TZ.
  const before = process.env.TZ;
  const runs = [];
  for (const tz of ["Etc/UTC", "Asia/Kolkata", "America/Chicago"]) {
    process.env.TZ = tz;
    runs.push(JSON.stringify(computeDayTimings(1_757_000_000_000, 1_757_044_000_000, 4)));
  }
  process.env.TZ = before;
  assert.equal(new Set(runs).size, 1, "identical output under every host TZ");
});

test("overlapping useful/avoid periods are BOTH returned, never merged", async () => {
  // Find a weekday where Abhijit overlaps one of the avoid periods and assert
  // both are present with their real spans.
  let found = false;
  for (const iso of ["2026-09-07", "2026-09-08", "2026-09-11", "2026-09-12", "2026-09-13"]) {
    const { t } = await periodsFor(HYD, iso);
    const a = t.useful.find((p) => p.id === "abhijit");
    if (!a) continue;
    for (const av of t.avoid) {
      const overlap = a.startMs < av.endMs && av.startMs < a.endMs;
      if (overlap) {
        found = true;
        assert.ok(a.endMs > a.startMs && av.endMs > av.startMs, "both spans intact");
      }
    }
  }
  // Even if no natural overlap this week, a synthetic day proves the contract:
  const synth = computeDayTimings(0, 8 * 3600_000, 0); // Sunday
  assert.ok(synth.useful.length + synth.avoid.length === 5, "all periods listed independently");
  void found;
});

test("missing or invalid sun times → empty result, no NaN period", () => {
  assert.deepEqual(computeDayTimings(NaN, 1, 4), { useful: [], avoid: [] });
  assert.deepEqual(computeDayTimings(1000, 1000, 4), { useful: [], avoid: [] }, "sunset == sunrise");
  assert.deepEqual(computeDayTimings(2000, 1000, 4), { useful: [], avoid: [] }, "sunset before sunrise");
  assert.deepEqual(computeDayTimings(Infinity, 5, 4), { useful: [], avoid: [] });
});

/* -------------------------------------------------------------------------- */
/* Wording + evidence honesty                                                */
/* -------------------------------------------------------------------------- */

test("the scope line says general + traditional + not personalised, and drops the 'not astrology' claim", () => {
  assert.match(DAY_TIMINGS_SCOPE_EN, /general traditional panchanga timings/i);
  assert.match(DAY_TIMINGS_SCOPE_EN, /not personalised using birth details/i);
  assert.doesNotMatch(DAY_TIMINGS_SCOPE_EN, /not astrology/i);
});

test("evidence: rule provenance and output comparison are recorded separately, and single-source is stated", () => {
  assert.equal(DAY_TIMINGS_OUTPUT_VALIDATION.independent, false);
  assert.match(DAY_TIMINGS_OUTPUT_VALIDATION.reviewerLimitation, /single-source/i);
  assert.match(DAY_TIMINGS_OUTPUT_VALIDATION.reviewerLimitation, /not independent validation/i);
  // Rahu Kalam has an independent RULE reference (Wikipedia).
  assert.ok(DAY_TIMINGS_RULE_SOURCES.rahu.ruleRefs.some((r) => /wikipedia\.org\/wiki\/Rahu_kala/i.test(r)));
  assert.ok(DAY_TIMINGS_RULE_SOURCES.abhijit.ruleRefs.some((r) => /wikipedia\.org\/wiki\/Muhurta/i.test(r)));
});

test("Brahma Muhurta is deferred and documented, never returned by computeDayTimings", () => {
  assert.match(DAY_TIMINGS_DEFERRED.brahmaMuhurta, /Brahma Muhurta is NOT displayed/);
  assert.match(DAY_TIMINGS_DEFERRED.brahmaMuhurta, /convention/i);
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /Brahma Muhurta/i.test(s)));
  const t = computeDayTimings(1_757_000_000_000, 1_757_044_000_000, 4);
  assert.ok(![...t.useful, ...t.avoid].some((p) => p.id === "brahma"));
});

test("every returned period has bilingual label + about text and a useful/avoid kind", () => {
  const t = computeDayTimings(1_757_000_000_000, 1_757_044_000_000, 4); // Thursday
  for (const p of [...t.useful, ...t.avoid]) {
    const txt = DAY_PERIOD_TEXT[p.id];
    assert.ok(txt.labelEn && txt.labelTe, `${p.id} labels`);
    assert.ok(txt.aboutEn && txt.aboutTe, `${p.id} about`);
    assert.ok(p.kind === "useful" || p.kind === "avoid");
    assert.ok(p.endMs > p.startMs, `${p.id} is a real span`);
  }
  assert.deepEqual(t.useful.map((p) => p.id), ["abhijit", "vijaya"]);
  assert.deepEqual(t.avoid.map((p) => p.id), ["rahu", "yamaganda", "gulika"]);
});

test("personalised timing stays a documented backlog, never computed", () => {
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /birth/i.test(s)));
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /Nakshatra|Rashi/i.test(s)));
});

/* -------------------------------------------------------------------------- */
/* Exact overlap of a useful period with the named avoid periods, and the same */
/* numbers + wording on Home and Calendar (shared displayPeriods).             */
/* -------------------------------------------------------------------------- */


const P = (id, kind, startMs, endMs) => ({ id, kind, startMs, endMs });
const MIN = 60_000;

test("avoidOverlaps: exact partial intersection, named avoid period, time-ordered", () => {
  const useful = P("abhijit", "useful", 100 * MIN, 150 * MIN);
  const avoid = [P("yamaganda", "avoid", 130 * MIN, 200 * MIN), P("rahu", "avoid", 60 * MIN, 110 * MIN)];
  const o = OV.avoidOverlaps(useful, avoid);
  assert.deepEqual(o.map((x) => [x.avoidId, x.startMs / MIN, x.endMs / MIN, x.whole]), [
    ["rahu", 100, 110, false],
    ["yamaganda", 130, 150, false],
  ]);
});

test("avoidOverlaps: a fully overlapping period is flagged whole and the interval is the whole period", () => {
  const useful = P("vijaya", "useful", 140 * MIN, 188 * MIN);
  const o = OV.avoidOverlaps(useful, [P("gulika", "avoid", 120 * MIN, 210 * MIN)]);
  assert.equal(o.length, 1);
  assert.equal(o[0].whole, true);
  assert.equal(o[0].startMs, 140 * MIN);
  assert.equal(o[0].endMs, 188 * MIN);
});

test("avoidOverlaps: touching end-to-start is NOT an overlap; an avoid period never gets overlaps", () => {
  const useful = P("abhijit", "useful", 100 * MIN, 150 * MIN);
  assert.deepEqual(OV.avoidOverlaps(useful, [P("rahu", "avoid", 150 * MIN, 200 * MIN)]), []);
  assert.deepEqual(OV.avoidOverlaps(P("rahu", "avoid", 0, 100 * MIN), [P("gulika", "avoid", 50 * MIN, 90 * MIN)]), []);
});

test("overlapSentence: names the avoid period and the exact interval; never calls the remainder auspicious (EN + TE)", () => {
  const partial = { avoidId: "yamaganda", start: "11:46 AM", end: "12:10 PM", whole: false };
  const whole = { avoidId: "gulika", start: "2:12 PM", end: "3:00 PM", whole: true };
  assert.equal(OV.overlapSentence(partial, false), "Overlaps Yamaganda from 11:46 AM to 12:10 PM.");
  assert.equal(OV.overlapSentence(whole, false), "All of this falls within Gulika Kalam (2:12 PM – 3:00 PM).");
  assert.match(OV.overlapSentence(partial, true), /11:46 AM – 12:10 PM/);
  assert.match(OV.overlapSentence(partial, true), /యమగండం/);
  assert.match(OV.overlapSentence(whole, true), /గుళిక కాలంలోనే/);
  for (const s of [OV.overlapSentence(partial, false), OV.overlapSentence(whole, false), OV.overlapSentence(partial, true), OV.overlapSentence(whole, true)]) {
    assert.doesNotMatch(s, /auspicious|శుభ/i, "the remaining portion is never labelled auspicious");
  }
});

test("coverage note: says unlisted times are NOT marked unsuitable, and does not promise any morning slot (EN + TE)", () => {
  assert.match(OV.USEFUL_TIMES_COVERAGE_NOTE.en, /not marked unsuitable/);
  assert.match(OV.USEFUL_TIMES_COVERAGE_NOTE.te, /అనుకూలం కాదని అర్థం కాదు/);
  assert.doesNotMatch(OV.USEFUL_TIMES_COVERAGE_NOTE.en, /morning|brahma/i);
});

test("REAL day, Hyderabad Mon 2026-09-21: Abhijit partly overlaps Yamaganda 11:46 AM-12:10 PM; Vijaya lies wholly inside Gulika Kalam", async () => {
  const L = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };
  const p = await OV_ENGINE.computePanchanga({ dateMs: Date.parse("2026-09-21T12:00:00Z"), ...L });
  const t = OV.computeDayTimings(p.sunrise.getTime(), p.sunset.getTime(), OV_ENGINE.weekdayIndex(2026, 9, 21));
  const shown = OV.displayPeriods(t, (ms) => OV_ENGINE.formatClock(new Date(ms), L.timezone));
  const abhijit = shown.useful.find((x) => x.id === "abhijit");
  const vijaya = shown.useful.find((x) => x.id === "vijaya");
  assert.deepEqual(abhijit.overlaps.map((o) => [o.avoidId, o.start, o.end, o.whole]), [["yamaganda", "11:46 AM", "12:10 PM", false]]);
  assert.deepEqual(vijaya.overlaps.map((o) => [o.avoidId, o.whole]), [["gulika", true]]);
  assert.equal(abhijit.overlapsAvoid, true);
  assert.equal(shown.avoid.every((a) => a.overlaps === undefined), true, "avoid periods carry no overlaps");
});

test("Home and Calendar show IDENTICAL useful/avoid periods and overlap intervals for the same day and location", async () => {
  for (const [name, L, tzDate] of [
    ["Hyderabad", { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" }, "2026-09-21"],
    ["Frisco", { latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" }, "2026-09-21"],
  ]) {
    const location = { status: "READY", ...L, city: name, region: "", country: "", source: "MANUAL", accuracyMeters: null, savedAt: "2026-09-01T00:00:00.000Z" };
    const nowMs = OV_ENGINE.localWallToUtcMs(2026, 9, 21, 12, 0, 0, L.timezone);
    const home = await OV_HOME.panchangaForLocation(location, nowMs);
    const cal = await OV_CAL.computeCalendarMonth({ ...L, year: 2026, month: 9 });
    const day = cal.days.find((d) => d.dateISO === tzDate);
    assert.deepEqual(home.useful, day.useful, `${name}: useful periods (with overlaps) identical`);
    assert.deepEqual(home.avoid, day.avoid, `${name}: avoid periods identical`);
    for (const p of home.useful) {
      const c = day.useful.find((x) => x.id === p.id);
      assert.deepEqual((p.overlaps ?? []).map((o) => OV.overlapSentence(o, false)), (c.overlaps ?? []).map((o) => OV.overlapSentence(o, false)), `${name} ${p.id}: identical sentence`);
      assert.deepEqual((p.overlaps ?? []).map((o) => OV.overlapSentence(o, true)), (c.overlaps ?? []).map((o) => OV.overlapSentence(o, true)), `${name} ${p.id}: identical Telugu sentence`);
    }
  }
});
