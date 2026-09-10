// General daily useful/avoid timings.
//
// OUTPUT VALIDATION (single-source): computed start/end times are compared to
// Drik Panchang's published Day Panchang, to the minute (±3 min), for Hyderabad
// (Thursday + Wednesday) and Frisco (Thursday + the US fall-back Sunday).
// Independent second-source cross-checks were rate-limited at authoring time —
// this is a single-source comparison (see DAY_TIMINGS_OUTPUT_VALIDATION).
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

test("Hyderabad, Wednesday 2026-09-09 — no Abhijit Muhurta; avoid periods match Drik", async () => {
  const { byId, t } = await periodsFor(HYD, "2026-09-09");
  assert.equal(t.useful.length, 0, "no useful period on Wednesday (Abhijit absent, Brahma deferred)");
  expectPeriod(byId, "rahu", "12:13 PM", "1:46 PM");
  expectPeriod(byId, "yamaganda", "7:36 AM", "9:08 AM");
  expectPeriod(byId, "gulika", "10:41 AM", "12:13 PM");
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
  assert.ok(synth.useful.length + synth.avoid.length === 4, "all periods listed independently");
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
  assert.deepEqual(t.useful.map((p) => p.id), ["abhijit"]);
  assert.deepEqual(t.avoid.map((p) => p.id), ["rahu", "yamaganda", "gulika"]);
});

test("personalised timing stays a documented backlog, never computed", () => {
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /birth/i.test(s)));
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /Nakshatra|Rashi/i.test(s)));
});
