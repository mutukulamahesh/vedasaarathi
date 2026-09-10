// Monthly Hindu calendar — computation, festival detection, cache-key shape,
// per-month performance, and (Feature 5) host-timezone invariance.
//
// The calendar reuses computePanchanga + the build-verified release flags and
// the existing validated madhyahna-vyapti festival rule. It never scrapes.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("./helpers/calendar-month-cli.mjs", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const calendar = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");
const rules = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");

const HYD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };

/* -------------------------------------------------------------------------- */
/* Cache key + calendar helpers                                              */
/* -------------------------------------------------------------------------- */

test("daysInMonth is correct incl. leap February", () => {
  assert.equal(calendar.daysInMonth(2026, 1), 31);
  assert.equal(calendar.daysInMonth(2026, 2), 28);
  assert.equal(calendar.daysInMonth(2024, 2), 29); // leap
  assert.equal(calendar.daysInMonth(2026, 9), 30);
  assert.equal(calendar.daysInMonth(2026, 12), 31);
});

test("calendarCacheKey = engine version + lat + lng + tz + year-month, and is stable", () => {
  const key = calendar.calendarCacheKey({ ...HYD, year: 2026, month: 9 });
  assert.ok(key.startsWith(calendar.CALENDAR_ENGINE_VERSION + "|"));
  assert.equal(
    key,
    `${calendar.CALENDAR_ENGINE_VERSION}|17.385|78.4867|Asia/Kolkata|2026-09`,
  );
  // Any input change changes the key.
  assert.notEqual(key, calendar.calendarCacheKey({ ...HYD, year: 2026, month: 10 }));
  assert.notEqual(key, calendar.calendarCacheKey({ ...HYD, year: 2027, month: 9 }));
  assert.notEqual(
    key,
    calendar.calendarCacheKey({ ...HYD, latitude: 17.386, year: 2026, month: 9 }),
  );
  assert.notEqual(
    key,
    calendar.calendarCacheKey({ ...HYD, timezone: "America/Chicago", year: 2026, month: 9 }),
  );
});

test("CALENDAR_ENGINE_VERSION is derived from the release-config evidence hash", () => {
  assert.match(calendar.CALENDAR_ENGINE_VERSION, /^cal-1\+[0-9a-f]{12}$/);
});

/* -------------------------------------------------------------------------- */
/* Month computation + performance                                           */
/* -------------------------------------------------------------------------- */

test("computeCalendarMonth returns one Panchanga per civil day, in order", async () => {
  const t0 = performance.now();
  const m = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 9 });
  const ms = performance.now() - t0;
  console.log(`    full month calculation (Sep 2026, Hyderabad): ${ms.toFixed(0)} ms`);

  assert.equal(m.days.length, 30);
  m.days.forEach((d, i) => {
    assert.equal(d.dateISO, `2026-09-${String(i + 1).padStart(2, "0")}`);
    assert.equal(d.day, i + 1);
    assert.ok(d.weekday >= 0 && d.weekday <= 6);
    assert.ok(d.masa && d.paksha && d.vaara, "descriptive fields present");
    assert.ok(d.sunrise && d.sunset, "sun times present");
    assert.ok(d.tithi && d.tithi.name && d.tithi.endsAt, "tithi present");
    assert.ok(d.nakshatra && d.nakshatra.name, "nakshatra present");
  });
  assert.equal(m.engineVersion, calendar.CALENDAR_ENGINE_VERSION);
  assert.equal(m.timezone, "Asia/Kolkata");
  // Performance: a full month is well under a wall-clock budget. It is computed
  // once, not per render (see calendar-render.test.mjs).
  assert.ok(ms < 20000, `full month took ${ms.toFixed(0)} ms`);
});

test("a second computeCalendarMonth call is deterministic (byte-identical)", async () => {
  const a = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 9 });
  const b = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 9 });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("Thursday is always Guruvara across the month (vaara consistency)", async () => {
  const m = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 9 });
  for (const d of m.days) {
    if (d.weekday === 4) assert.equal(d.vaara, "Guruvara", `${d.dateISO} is a Thursday`);
    if (d.vaara === "Guruvara") assert.equal(d.weekday, 4, `${d.dateISO} says Guruvara`);
  }
});

/* -------------------------------------------------------------------------- */
/* Festivals (Feature 2)                                                     */
/* -------------------------------------------------------------------------- */

test("Vinayaka Chavithi 2026 falls on 2026-09-14 at Hyderabad, opens the puja, and carries provenance", async () => {
  const m = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 9 });
  assert.equal(m.festivals.length, 1);
  const f = m.festivals[0];
  assert.equal(f.ruleId, "vinayaka-chavithi");
  assert.equal(f.dateISO, "2026-09-14"); // matches the validated Drik fixture
  assert.equal(f.slug, "vinayaka-chavithi");
  assert.equal(f.opensPuja, true);
  assert.ok(f.pujaWindow && f.pujaWindow.start && f.pujaWindow.end);
  assert.match(f.provenanceUrl, /^https:\/\/www\.drikpanchang\.com\//);
  assert.equal(f.accessedISO, "2026-09-09");
  assert.match(f.ruleName, /Madhyahna-vyapti/i);
  // The festival is also marked inside its calendar day.
  const day14 = m.days.find((d) => d.dateISO === "2026-09-14");
  assert.deepEqual(day14.festivalSlugs, ["vinayaka-chavithi"]);
});

test("a month with no validated festival returns an empty festival list (no guessing)", async () => {
  const m = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 1 });
  assert.deepEqual(m.festivals, []);
  assert.ok(m.days.every((d) => d.festivalSlugs.length === 0));
});

test("festival rules: Vinayaka Chavithi is displayed, Sankashti Chaturthi is deferred honestly", () => {
  const displayed = rules.displayedFestivalRules();
  const deferred = rules.deferredFestivalRules();
  assert.ok(displayed.some((r) => r.id === "vinayaka-chavithi"));
  assert.ok(displayed.every((r) => r.method === "madhyahna-vyapti"));
  assert.ok(displayed.every((r) => r.pujaSlug), "a displayed rule opens a real puja");

  const sankashti = deferred.find((r) => r.id === "sankashti-chaturthi");
  assert.ok(sankashti, "Sankashti is present but deferred");
  assert.equal(sankashti.method, "deferred");
  assert.equal(sankashti.pujaSlug, null);
  assert.match(sankashti.deferredReason, /moonrise|chandrodaya/i);
  assert.match(sankashti.deferredReason, /not.*(modelled|validated)/i);
  // Deferred rules are never in the displayed set.
  assert.ok(!displayed.some((r) => r.id === "sankashti-chaturthi"));
});

test("festivalRule() looks a rule up by id", () => {
  assert.equal(rules.festivalRule("vinayaka-chavithi").nameTe, "వినాయక చవితి");
  assert.equal(rules.festivalRule("nope"), undefined);
});

/* -------------------------------------------------------------------------- */
/* Feature 5 — host-timezone invariance                                      */
/* -------------------------------------------------------------------------- */

const ZONES = [
  "Etc/UTC",
  "Asia/Kolkata",
  "America/Chicago",
  "Pacific/Kiritimati", // UTC+14
  "Pacific/Pago_Pago", // UTC-11
];

// One spawn per host zone computes every case; the outputs must be byte-equal.
//   - Chicago, 2026-03  : spring-forward month
//   - Chicago, 2026-11  : fall-back month
//   - Kiritimati, 2026-01: UTC+14 saved location, month boundary
//   - Pago_Pago, 2026-01: UTC-11 saved location, month boundary
//   - Hyderabad, 2026-09: saved location != host zone, and a festival month
const CASES = [
  "33.1507,-96.8236,America/Chicago,2026-03",
  "33.1507,-96.8236,America/Chicago,2026-11",
  "1.87,-157.43,Pacific/Kiritimati,2026-01",
  "-14.28,-170.7,Pacific/Pago_Pago,2026-01",
  "17.385,78.4867,Asia/Kolkata,2026-09",
];

function monthsUnder(tz) {
  const raw = execFileSync("node", [CLI, ...CASES], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, TZ: tz },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return raw.trim().split("\n").pop();
}

test("a full calendar month is byte-identical under every host time zone (DST months, UTC+14 / UTC-11, saved-location != host)", () => {
  const [refTz, ...restTz] = ZONES;
  const ref = monthsUnder(refTz);
  const parsed = JSON.parse(ref);
  // Sanity: the cases really are the ones we intend.
  assert.equal(parsed.length, CASES.length);
  assert.equal(parsed[0].days.length, 31); // March
  assert.equal(parsed[1].days.length, 30); // November
  assert.equal(parsed[4].festivals[0]?.dateISO, "2026-09-14"); // festival survives
  // A Tithi / Nakshatra that ends after local midnight ("… tomorrow") is
  // exercised (UTC+14 saved location) and is part of the byte-identical check.
  assert.ok(
    parsed[2].days.some(
      (d) => /tomorrow/.test(d.tithi?.endsAt ?? "") || /tomorrow/.test(d.nakshatra?.endsAt ?? ""),
    ),
    "a cross-midnight element end is present",
  );

  for (const tz of restTz) {
    assert.equal(monthsUnder(tz), ref, `calendar month differs under host TZ=${tz}`);
  }
});
