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
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");

const HYD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };
const FRISCO = { latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" };

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
  assert.match(calendar.CALENDAR_ENGINE_VERSION, /^cal-\d+\+[0-9a-f]{12}$/);
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
  // Every day carries the general useful/avoid periods (cal-2).
  for (const d of m.days) {
    assert.ok(Array.isArray(d.useful) && Array.isArray(d.avoid), `${d.dateISO} has period arrays`);
    assert.ok(d.avoid.some((p) => p.id === "rahu"), `${d.dateISO} has Rahu Kalam`);
    for (const p of [...d.useful, ...d.avoid]) {
      assert.ok(/[AP]M/.test(p.start) && /[AP]M/.test(p.end), `${d.dateISO} ${p.id} formatted`);
      assert.ok(p.kind === "useful" || p.kind === "avoid");
    }
  }
  // Wednesday has no Abhijit Muhurta; other days do.
  const wed = m.days.find((d) => d.weekday === 3);
  assert.ok(!wed.useful.some((p) => p.id === "abhijit"), "no Abhijit on Wednesday");
  const thu = m.days.find((d) => d.weekday === 4);
  assert.ok(thu.useful.some((p) => p.id === "abhijit"), "Abhijit present on Thursday");
  // Performance: a full month is well under a wall-clock budget. It is computed
  // once, not per render (see calendar-render.test.mjs).
  assert.ok(ms < 20000, `full month took ${ms.toFixed(0)} ms`);
});

test("computeCalendarMonth carries masaAmanta + isAdhikaMasa through the 2026 Adhika Jyeshtha window", async () => {
  // Expected values read directly from drikpanchang.com/panchang/day-panchang.html
  // - see docs/temp/amanta-masa-validation-2026-09-14.md.
  const may = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 5 });
  const d26 = may.days.find((d) => d.dateISO === "2026-05-26");
  const d27 = may.days.find((d) => d.dateISO === "2026-05-27");
  for (const d of [d26, d27]) {
    assert.equal(d.masa, "Jyeshtha", `${d.dateISO}: legacy masa`);
    assert.equal(d.masaAmanta, "Jyeshtha", `${d.dateISO}: masaAmanta`);
    assert.equal(d.isAdhikaMasa, true, `${d.dateISO}: leap flag`);
  }

  const june = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 6 });
  const d24 = june.days.find((d) => d.dateISO === "2026-06-24");
  const d25 = june.days.find((d) => d.dateISO === "2026-06-25");
  for (const d of [d24, d25]) {
    assert.equal(d.masaAmanta, "Jyeshtha", `${d.dateISO}: masaAmanta (Nija, correctly repeats the name)`);
    assert.equal(d.isAdhikaMasa, false, `${d.dateISO}: not the leap occurrence`);
    // KNOWN, unfixed defect (documented in engine.ts and the validation
    // report) - legacy masa reads a full month early here.
    assert.equal(d.masa, "Ashadha", `${d.dateISO}: legacy masa (KNOWN DEFECT, not true Purnimanta "Jyeshtha")`);
  }
});

test("computeCalendarMonth reports progress per day and yields between days", async () => {
  const seen = [];
  const m = await calendar.computeCalendarMonth(
    { ...HYD, year: 2026, month: 9 },
    { onProgress: (done, total) => seen.push([done, total]) },
  );
  assert.equal(seen.length, m.days.length, "one progress callback per day");
  assert.deepEqual(seen[0], [1, 30]);
  assert.deepEqual(seen.at(-1), [30, 30]);
  // Strictly increasing done count.
  for (let i = 1; i < seen.length; i += 1) assert.equal(seen[i][0], seen[i - 1][0] + 1);
});

test("computeCalendarMonth is cancellable — aborting rejects with CalendarAbortError and yields no partial month", async () => {
  const ac = new AbortController();
  let progressCalls = 0;
  const p = calendar.computeCalendarMonth(
    { ...HYD, year: 2026, month: 9 },
    {
      signal: ac.signal,
      onProgress: (done) => { progressCalls = done; if (done >= 3) ac.abort(); },
    },
  );
  await assert.rejects(p, (err) => err instanceof calendar.CalendarAbortError || err.name === "CalendarAbortError");
  assert.ok(progressCalls >= 3 && progressCalls < 30, `aborted mid-way (after ${progressCalls} days)`);
});

test("an already-aborted signal makes computeCalendarMonth reject immediately with nothing computed", async () => {
  const ac = new AbortController();
  ac.abort();
  let progressCalls = 0;
  await assert.rejects(
    calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 9 }, {
      signal: ac.signal, onProgress: () => { progressCalls += 1; },
    }),
    (err) => err.name === "CalendarAbortError",
  );
  assert.equal(progressCalls, 0);
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
  // September 2026 also carries that month's Masa Shivaratri (Sep 9) and
  // Sankashti Chaturthi (Sep 29) - enumerating every rule's occurrence, not
  // just one, is the point of cal-6.
  assert.equal(m.festivals.length, 3);
  const f = m.festivals.find((x) => x.ruleId === "vinayaka-chavithi");
  assert.ok(f, "Vinayaka Chavithi present");
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

test("Ugadi 2026 falls on 2026-03-19 at Hyderabad, opens no puja, and carries provenance", async () => {
  const m = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 3 });
  // March 2026 also carries that month's Masa Shivaratri (Mar 17) and
  // Sankashti Chaturthi (Mar 6).
  assert.equal(m.festivals.length, 3);
  const f = m.festivals.find((x) => x.ruleId === "ugadi");
  assert.ok(f, "Ugadi present");
  assert.equal(f.dateISO, "2026-03-19"); // matches the directly-fetched Drik fixture
  assert.equal(f.slug, "ugadi"); // no pujaSlug - falls back to the rule id
  assert.equal(f.opensPuja, false, "Ugadi is a calendar date only, not (yet) a puja service");
  assert.equal(f.pujaWindow, null);
  assert.match(f.provenanceUrl, /^https:\/\/www\.drikpanchang\.com\//);
  assert.match(f.ruleName, /Amanta-sunrise/i);
  const day19 = m.days.find((d) => d.dateISO === "2026-03-19");
  assert.deepEqual(day19.festivalSlugs, ["ugadi"]);
});

test("Ugadi 2027 falls on 2027-04-07 at Frisco too", async () => {
  const m = await calendar.computeCalendarMonth({ ...FRISCO, year: 2027, month: 4 });
  const f = m.festivals.find((x) => x.ruleId === "ugadi");
  assert.ok(f, "Ugadi found in April 2027 at Frisco");
  assert.equal(f.dateISO, "2027-04-07");
});

test("Masa Shivaratri recurs monthly and never confuses two occurrences of the same rule (Jan + Feb 2026, Hyderabad)", async () => {
  const jan = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 1 });
  const janShivaratri = jan.festivals.filter((x) => x.ruleId === "masa-shivaratri");
  assert.equal(janShivaratri.length, 1);
  assert.equal(janShivaratri[0].dateISO, "2026-01-16");
  assert.equal(janShivaratri[0].opensPuja, false);
  assert.match(janShivaratri[0].ruleName, /Nishita-vyapti/i);

  // February 2026's own Masa Shivaratri occurrence (2026-02-15) is ALSO that
  // year's annual Maha Shivaratri - supersession (cal-9) collapses the
  // generic monthly card on that one coincidence date, so `festivals` (the
  // family-visible list) shows Maha Shivaratri instead, not both. The
  // UNCOLLAPSED `festivalsAll` still carries Masa Shivaratri's own
  // independently-computed February occurrence, confirming supersession is
  // a presentation-layer filter, not a change to what the rule computes.
  const feb = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 2 });
  const febShivaratriVisible = feb.festivals.filter((x) => x.ruleId === "masa-shivaratri");
  assert.equal(febShivaratriVisible.length, 0, "collapsed away - Maha Shivaratri supersedes it this month");
  const febMahaShivaratri = feb.festivals.find((x) => x.ruleId === "maha-shivaratri");
  assert.ok(febMahaShivaratri, "Maha Shivaratri takes its place");
  assert.equal(febMahaShivaratri.dateISO, "2026-02-15");
  const febShivaratriAll = feb.festivalsAll.filter((x) => x.ruleId === "masa-shivaratri");
  assert.equal(febShivaratriAll.length, 1, "still independently computed in the uncollapsed set");
  assert.equal(febShivaratriAll[0].dateISO, "2026-02-15");
});

test("regression: Calendar's January page and Home's 'as of the echo day' query name the same next occurrence - no Home/Calendar disagreement", async () => {
  // Calendar always scans from day 1 of the month, so it never happens to
  // start exactly on the 2026-01-17 echo day - this is why the bug (Home
  // showing 17 Jan as a fresh occurrence) was invisible from Calendar alone.
  const jan = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 1 });
  const janShivaratri = jan.festivals.find((f) => f.ruleId === "masa-shivaratri");
  assert.equal(janShivaratri.dateISO, "2026-01-16");

  const hyd = {
    status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
    city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-01-17T00:00:00.000Z",
  };
  const home = await panchangaForLocation(hyd, Date.parse("2026-01-17T12:00:00Z"));
  // As of 17 Jan, 16 Jan has already passed - Home's own "next" must not be
  // the 17th itself (the echo day), and whichever rule it names must match
  // that SAME rule's occurrence on Calendar's own page for WHICHEVER month
  // that occurrence actually falls in (not assumed to be February - with
  // the full Phase 1 rule set, Home's nearest festival can be an annual
  // rule landing later that same January, e.g. Ratha Saptami on 2026-01-25).
  // Looked up by ruleId rather than assuming it is specifically Masa
  // Shivaratri.
  assert.notEqual(home.festival.dateISO, "2026-01-17");
  const [matchYear, matchMonth] = home.festival.dateISO.split("-").map(Number);
  const matchMonthCal = await calendar.computeCalendarMonth({ ...HYD, year: matchYear, month: matchMonth });
  const monthMatch = matchMonthCal.festivals.find((f) => f.ruleId === home.festival.ruleId);
  assert.ok(monthMatch, `Calendar's ${matchYear}-${matchMonth} page has an occurrence of ${home.festival.ruleId}`);
  assert.equal(home.festival.dateISO, monthMatch.dateISO, "Home and Calendar must agree");
});

test("Masa Shivaratri: a genuine cross-location divergence shows up in Calendar too - 2026-03-17 Hyderabad vs. 2026-03-16 Frisco", async () => {
  const hyd = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 3 });
  const hydShivaratri = hyd.festivals.find((x) => x.ruleId === "masa-shivaratri");
  assert.equal(hydShivaratri.dateISO, "2026-03-17");

  const frisco = await calendar.computeCalendarMonth({ ...FRISCO, year: 2026, month: 3 });
  const friscoShivaratri = frisco.festivals.find((x) => x.ruleId === "masa-shivaratri");
  assert.equal(friscoShivaratri.dateISO, "2026-03-16");
});

const SYDNEY = { latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" };

test("regression: Sydney December 2026 Calendar page includes Sankashti Chaturthi on 27 Dec, and Home agrees", async () => {
  // Reported bug: Calendar's December 2026 page at Sydney omitted Sankashti
  // Chaturthi entirely (Krishna Chaturthi that cycle runs 2026-12-27 01:34 -
  // 22:42, Drik Panchang, geoname-id 2147714 - wholly inside 27 Dec, the
  // fallback's original midnight-only check never covered it). Also checks
  // Home and Calendar agree on the exact date and day-count, the same
  // cross-screen-agreement bar every other rule already has to clear.
  const dec = await calendar.computeCalendarMonth({ ...SYDNEY, year: 2026, month: 12 });
  const sankashti = dec.festivals.find((f) => f.ruleId === "sankashti-chaturthi");
  assert.ok(sankashti, "Sankashti Chaturthi must be present in Sydney's December 2026 page");
  assert.equal(sankashti.dateISO, "2026-12-27");
  const day27 = dec.days.find((d) => d.dateISO === "2026-12-27");
  assert.ok(day27.festivalSlugs.includes(sankashti.slug), "27 Dec's own day entry lists the festival too");

  const sydneyLocation = {
    status: "READY", ...SYDNEY, city: "Sydney", region: "New South Wales", country: "Australia",
    source: "MANUAL", accuracyMeters: null, savedAt: "2026-12-24T00:00:00.000Z",
  };
  const home = await panchangaForLocation(sydneyLocation, Date.parse("2026-12-24T12:00:00Z"));
  assert.equal(home.festival?.dateISO, "2026-12-27", "Home must not skip past the December occurrence either");
  assert.equal(home.festival?.inDays, 3, "3 whole days from 24 Dec to 27 Dec");
});

test("a month's festival list only ever contains supported, validated methods - no guessing", async () => {
  const m = await calendar.computeCalendarMonth({ ...HYD, year: 2026, month: 1 });
  // January 2026 carries Masa Shivaratri (Jan 16), Sankashti Chaturthi
  // (Jan 6) and Ratha Saptami (Jan 25, Phase 1) - all now supported,
  // validated methods.
  for (const f of m.festivals) {
    assert.match(
      f.ruleName,
      /Madhyahna-vyapti|Amanta-sunrise|Nishita-vyapti|Chandrodaya-vyapti|Tithi-at-sunrise|Lunar-month-weekday/i,
    );
  }
});

test("festival rules: the original four plus Phase 1's eight new rules are all displayed; seven catalogue-accounting entries are honestly deferred", () => {
  const displayed = rules.displayedFestivalRules();
  const deferred = rules.deferredFestivalRules();
  assert.ok(displayed.some((r) => r.id === "vinayaka-chavithi"));
  const SUPPORTED_METHODS = [
    "madhyahna-vyapti", "amanta-sunrise", "nishita-vyapti", "chandrodaya-vyapti",
    "tithi-at-sunrise", "nishita-vyapti-annual", "lunar-month-weekday",
  ];
  assert.ok(displayed.every((r) => SUPPORTED_METHODS.includes(r.method)));

  const vinayaka = displayed.find((r) => r.id === "vinayaka-chavithi");
  assert.ok(vinayaka.pujaSlug, "Vinayaka Chavithi opens a real puja");

  // Ugadi is a genuine calendar date, not (yet) a puja service — per the
  // product decision that "next festival" and "the one puja we offer" are
  // separate concerns (puja support is later, separate work).
  const ugadi = displayed.find((r) => r.id === "ugadi");
  assert.ok(ugadi, "Ugadi is displayed");
  assert.equal(ugadi.method, "amanta-sunrise");
  assert.equal(ugadi.pujaSlug, null);
  assert.equal(ugadi.nameTe, "ఉగాది");

  const shivaratri = displayed.find((r) => r.id === "masa-shivaratri");
  assert.ok(shivaratri, "Masa Shivaratri is displayed");
  assert.equal(shivaratri.method, "nishita-vyapti");
  assert.equal(shivaratri.pujaSlug, null);
  assert.equal(shivaratri.nameTe, "మాస శివరాత్రి");

  const sankashti = displayed.find((r) => r.id === "sankashti-chaturthi");
  assert.ok(sankashti, "Sankashti Chaturthi is now displayed (moonrise computed via suncalc)");
  assert.equal(sankashti.method, "chandrodaya-vyapti");
  assert.equal(sankashti.pujaSlug, null);
  assert.equal(sankashti.nameTe, "సంకష్టి చతుర్థి");

  // Phase 1's eight new rules, each displayed with its own method AND an
  // HONEST evidence status - never a blanket "validated" merely because one
  // annual occurrence matched Hyderabad and Frisco (see the Phase-1 evidence
  // audit and lib/panchanga/festival-rules.ts's own validationStatus doc
  // comment for the full reasoning behind each rule's specific status).
  const PHASE1_IDS = [
    ["navratri-begins", "tithi-at-sunrise", "reference-matched"],
    ["atla-tadde", "tithi-at-sunrise", "reference-matched"],
    ["nagula-chavithi", "tithi-at-sunrise", "reference-matched"],
    ["bali-padyami", "tithi-at-sunrise", "reference-matched"],
    ["yama-dwitiya", "tithi-at-sunrise", "reference-matched"],
    ["ratha-saptami", "tithi-at-sunrise", "unresolved"],
    ["maha-shivaratri", "nishita-vyapti-annual", "reference-matched"],
    ["kartika-somavaram", "lunar-month-weekday", "provisional"],
  ];
  for (const [id, method, evidenceStatus] of PHASE1_IDS) {
    const r = displayed.find((x) => x.id === id);
    assert.ok(r, `${id} is displayed`);
    assert.equal(r.method, method, `${id} uses ${method}`);
    assert.equal(r.pujaSlug, null, `${id} opens no puja (Calendar-date only)`);
    assert.ok(r.nameTe, `${id} carries a Telugu name`);
    assert.ok(["P0", "P1", "calendar-only"].includes(r.homePriority));
    assert.equal(r.validationStatus, evidenceStatus, `${id}'s evidence status is honest, not a blanket "validated"`);
    assert.notEqual(r.validationStatus, "validated", `${id} must never claim the original four rules' stronger "validated" bar`);
  }

  // The seven catalogue-accounting items (§7 of the Phase 1 brief) are
  // present but honestly deferred, never guessed to fill the slot.
  const DEFERRED_IDS = [
    "radha-ashtami", "anant-chaturdashi", "pitru-paksha-begins", "sarva-pitru-amavasya",
    "gita-jayanti", "dattatreya-jayanti", "kalabhairava-jayanti",
  ];
  assert.equal(deferred.length, DEFERRED_IDS.length);
  for (const id of DEFERRED_IDS) {
    const r = deferred.find((x) => x.id === id);
    assert.ok(r, `${id} is present as a deferred catalogue entry`);
    assert.ok(r.deferredReason && r.deferredReason.length > 0, `${id} has a concrete deferred reason`);
  }
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
  // September 2026 carries two festivals (Vinayaka Chavithi + that month's
  // Masa Shivaratri); check the specific rule, not array position.
  assert.equal(
    parsed[4].festivals.find((f) => f.ruleId === "vinayaka-chavithi")?.dateISO,
    "2026-09-14",
  );
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
