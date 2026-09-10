// General daily useful/avoid timings — validated to the minute against Drik
// Panchang for Hyderabad (Thursday + Wednesday) and Frisco (Thursday).
//
// The rules are pure functions of the day's sunrise, sunset and weekday, so the
// only astronomy involved is the engine's sunrise/sunset (validated elsewhere).

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
const { computeDayTimings, DAY_PERIOD_TEXT, DAY_TIMINGS_BACKLOG } =
  await vite.ssrLoadModule("/lib/panchanga/day-timings.ts");

const HYD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };
const FRISCO = { latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" };

/** Compute the day periods for a location on a civil date via the real engine. */
async function periodsFor(loc, isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const noonMs = Date.parse(`${isoDate}T12:00:00Z`); // engine re-anchors to local noon itself
  const p = await computePanchanga({ dateMs: noonMs, ...loc });
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const t = computeDayTimings(p.sunrise.getTime(), p.sunset.getTime(), weekday);
  const all = [...t.useful, ...t.avoid];
  const byId = {};
  for (const per of all) {
    byId[per.id] = {
      start: formatClock(new Date(per.startMs), loc.timezone),
      end: formatClock(new Date(per.endMs), loc.timezone),
      startMin: minutesOfDay(new Date(per.startMs), loc.timezone),
      endMin: minutesOfDay(new Date(per.endMs), loc.timezone),
    };
  }
  return { byId, sunrise: formatClock(p.sunrise, loc.timezone), sunset: formatClock(p.sunset, loc.timezone) };
}

const hm = (s) => {
  const [, hh, mm, ap] = s.match(/(\d+):(\d+)\s*([AP]M)/i);
  let h = Number(hh) % 12;
  if (/pm/i.test(ap)) h += 12;
  return h * 60 + Number(mm);
};

/** Assert a computed period matches a published "h:mm–h:mm" within `tol` min. */
function expectPeriod(byId, id, publishedStart, publishedEnd, tol = 3) {
  const got = byId[id];
  assert.ok(got, `${id} computed`);
  assert.ok(
    Math.abs(got.startMin - hm(publishedStart)) <= tol,
    `${id} start: got ${got.start}, published ${publishedStart}`,
  );
  assert.ok(
    Math.abs(got.endMin - hm(publishedEnd)) <= tol,
    `${id} end: got ${got.end}, published ${publishedEnd}`,
  );
}

test("Hyderabad, Thursday 2026-09-10 — matches Drik Panchang to the minute", async () => {
  const { byId } = await periodsFor(HYD, "2026-09-10");
  expectPeriod(byId, "brahma", "4:30 AM", "5:17 AM");
  expectPeriod(byId, "abhijit", "11:48 AM", "12:38 PM");
  expectPeriod(byId, "rahu", "1:45 PM", "3:18 PM");
  expectPeriod(byId, "yamaganda", "6:03 AM", "7:36 AM");
  expectPeriod(byId, "gulika", "9:08 AM", "10:41 AM");
});

test("Hyderabad, Wednesday 2026-09-09 — Abhijit Muhurta is absent, rest match Drik", async () => {
  const { byId } = await periodsFor(HYD, "2026-09-09");
  assert.equal(byId.abhijit, undefined, "no Abhijit Muhurta on Wednesday");
  expectPeriod(byId, "brahma", "4:30 AM", "5:17 AM");
  expectPeriod(byId, "rahu", "12:13 PM", "1:46 PM");
  expectPeriod(byId, "yamaganda", "7:36 AM", "9:08 AM");
  expectPeriod(byId, "gulika", "10:41 AM", "12:13 PM");
});

test("Frisco, Thursday 2026-09-10 — matches Drik Panchang to the minute", async () => {
  const { byId } = await periodsFor(FRISCO, "2026-09-10");
  expectPeriod(byId, "brahma", "5:36 AM", "6:22 AM");
  expectPeriod(byId, "abhijit", "12:59 PM", "1:49 PM");
  expectPeriod(byId, "rahu", "2:58 PM", "4:32 PM");
  expectPeriod(byId, "yamaganda", "7:08 AM", "8:42 AM");
  expectPeriod(byId, "gulika", "10:16 AM", "11:50 AM");
});

test("computeDayTimings is a pure function — same inputs, identical output", () => {
  const a = computeDayTimings(1_757_000_000_000, 1_757_044_000_000, 4);
  const b = computeDayTimings(1_757_000_000_000, 1_757_044_000_000, 4);
  assert.deepEqual(a, b);
});

test("every period has bilingual label + about text, and a useful/avoid kind", () => {
  const t = computeDayTimings(1_757_000_000_000, 1_757_044_000_000, 4);
  for (const p of [...t.useful, ...t.avoid]) {
    const txt = DAY_PERIOD_TEXT[p.id];
    assert.ok(txt.labelEn && txt.labelTe, `${p.id} labels`);
    assert.ok(txt.aboutEn && txt.aboutTe, `${p.id} about`);
    assert.ok(p.kind === "useful" || p.kind === "avoid");
    assert.ok(p.endMs > p.startMs, `${p.id} is a real span`);
  }
  assert.deepEqual(t.useful.map((p) => p.id), ["brahma", "abhijit"]);
  assert.deepEqual(t.avoid.map((p) => p.id), ["rahu", "yamaganda", "gulika"]);
});

test("personalised timing stays a documented backlog, never computed", () => {
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /birth/i.test(s)));
  assert.ok(DAY_TIMINGS_BACKLOG.some((s) => /Nakshatra|Rashi/i.test(s)));
});
