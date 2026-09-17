// Local calendar-month cache — round-trip, engine-version isolation, LRU
// eviction, offline-safe reads, and a render-safe peek that never writes.

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
  peekCachedMonth, readCachedMonth, writeCachedMonth, clearCachedMonths,
  validateCachedMonth, CALENDAR_CACHE_STORAGE_KEY,
} = await vite.ssrLoadModule("/lib/storage/calendar-cache.ts");
const { CALENDAR_ENGINE_VERSION, daysInMonth, computeCalendarMonth, calendarCacheKey } =
  await vite.ssrLoadModule("/lib/panchanga/calendar.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");

/** A minimal in-memory Storage. */
function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

// Real months are computed seconds apart; give each write a distinct `at` so
// the LRU order is deterministic in a tight test loop.
const tick = () => new Promise((r) => setTimeout(r, 2));

const HYD = { latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };
const q = (year, month) => ({ ...HYD, year, month });

/** A structurally valid month (passes validateCachedMonth). */
const fakeMonth = (year, month, engineVersion = CALENDAR_ENGINE_VERSION) => {
  const total = daysInMonth(year, month);
  const mm = String(month).padStart(2, "0");
  const days = Array.from({ length: total }, (_, i) => ({
    dateISO: `${year}-${mm}-${String(i + 1).padStart(2, "0")}`,
    day: i + 1,
    weekday: (i + 2) % 7,
    vaara: "Guruvara", paksha: "Shukla", masa: "Bhadrapada",
    masaAmanta: "Bhadrapada", isAdhikaMasa: false,
    ritu: "Varsha", ayana: "Dakshinayana", samvatsara: "Parabhava",
    sunrise: "6:03 AM", sunset: "6:23 PM",
    tithi: { name: "Shukla Chaviti", endsAt: "7:41 AM" },
    nakshatra: { name: "Ashwini", endsAt: "2:42 AM tomorrow" },
    useful: [{ id: "abhijit", kind: "useful", start: "11:48 AM", end: "12:38 PM" }],
    avoid: [{ id: "rahu", kind: "avoid", start: "1:45 PM", end: "3:18 PM" }],
    festivalSlugs: [],
  }));
  return {
    year, month, timezone: HYD.timezone, latitude: HYD.latitude, longitude: HYD.longitude,
    engineVersion, days, festivals: [], released: {},
  };
};

test("write then read returns the same month", () => {
  const s = fakeStorage();
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), s);
  const got = readCachedMonth(q(2026, 9), s);
  assert.equal(got.year, 2026);
  assert.equal(got.month, 9);
});

test("peekCachedMonth reads without writing (safe to call during render)", () => {
  const s = fakeStorage();
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), s);
  const before = s.getItem(CALENDAR_CACHE_STORAGE_KEY);
  const got = peekCachedMonth(q(2026, 9), s);
  assert.equal(got.month, 9);
  assert.equal(s.getItem(CALENDAR_CACHE_STORAGE_KEY), before, "peek did not mutate the store");
  assert.equal(peekCachedMonth(q(2026, 10), s), null, "a miss is null");
});

test("a cached month written under a different engine version is ignored", () => {
  const s = fakeStorage();
  // writeCachedMonth validates, so a stale-version month cannot even be stored.
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9, "cal-1+deadbeefface"), s);
  assert.equal(s.getItem(CALENDAR_CACHE_STORAGE_KEY), null, "stale version not written");
  // A manually-seeded stale entry is also not returned.
  const key = Object.keys({ x: 1 }); void key;
  s.setItem(CALENDAR_CACHE_STORAGE_KEY, JSON.stringify({
    [`cal-1+deadbeefface|17.385|78.4867|Asia/Kolkata|2026-09`]:
      { at: Date.now(), month: fakeMonth(2026, 9, "cal-1+deadbeefface") },
  }));
  assert.equal(peekCachedMonth(q(2026, 9), s), null, "stale engine version → not read");
  assert.equal(readCachedMonth(q(2026, 9), s), null);
});

test("regression: upgrading past the Sankashti Chaturthi addition recomputes a REAL previously-cached month, with no user action required", async () => {
  // Simulates an actual user's browser: a September 2026 Hyderabad month was
  // computed and cached before this batch (Sankashti's own addition never
  // bumped CALENDAR_ENGINE_VERSION, and neither did this batch's kshaya-
  // fallback or countdown fixes, until now). That old entry must never be
  // silently served once the app itself has moved on - not read as "close
  // enough", and never requiring the user to clear their data by hand.
  const s = fakeStorage();
  const q9 = q(2026, 9);
  const freshMonth = await computeCalendarMonth(q9);
  assert.ok(
    freshMonth.festivals.some((f) => f.ruleId === "sankashti-chaturthi"),
    "sanity: the current computation does include Sankashti Chaturthi",
  );

  // Seed a stale entry: the SAME month's shape, but as it would have looked
  // before Sankashti existed (no such festival) and tagged with an old
  // version string - exactly what a real pre-upgrade localStorage entry
  // would contain.
  const staleVersion = "cal-6+deadbeefcafe";
  const staleMonth = {
    ...freshMonth,
    engineVersion: staleVersion,
    festivals: freshMonth.festivals.filter((f) => f.ruleId !== "sankashti-chaturthi"),
    days: freshMonth.days.map((d) => ({ ...d, festivalSlugs: d.festivalSlugs.filter((slug) => slug !== "sankashti-chaturthi") })),
  };
  const staleKey = `${staleVersion}|${q9.latitude}|${q9.longitude}|${q9.timezone}|2026-09`;
  s.setItem(CALENDAR_CACHE_STORAGE_KEY, JSON.stringify({ [staleKey]: { at: Date.now(), month: staleMonth } }));

  // The app's own read path: a stale-tagged entry is never handed back.
  assert.equal(peekCachedMonth(q9, s), null, "the pre-upgrade cached month must be discarded, not served");
  assert.equal(readCachedMonth(q9, s), null);

  // The app's own recompute-and-store path (what Calendar actually does on a
  // cache miss): compute fresh, cache it, and it now agrees with Home.
  writeCachedMonth(q9, freshMonth, s);
  const recomputed = peekCachedMonth(q9, s);
  assert.ok(recomputed, "the fresh month is now cached under the current version");
  assert.equal(recomputed.engineVersion, CALENDAR_ENGINE_VERSION);
  const sankashti = recomputed.festivals.find((f) => f.ruleId === "sankashti-chaturthi");
  assert.ok(sankashti, "Sankashti Chaturthi is present after the transparent recompute");

  const home = await panchangaForLocation(
    { status: "READY", ...HYD, city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL", accuracyMeters: null, savedAt: "2026-09-01T00:00:00.000Z" },
    Date.parse("2026-09-01T12:00:00Z"),
  );
  const homeSankashti = home.upcomingFestivals.find((f) => f.ruleId === "sankashti-chaturthi");
  assert.equal(homeSankashti?.dateISO, sankashti.dateISO, "Calendar's recomputed month and Home must agree, with no cache-clearing step involved");

  // The real cache key helper agrees with the manually-built key above -
  // this test seeded storage the same way the real cache actually keys it.
  assert.equal(calendarCacheKey(q9), `${CALENDAR_ENGINE_VERSION}|${q9.latitude}|${q9.longitude}|${q9.timezone}|2026-09`);
});

test("validateCachedMonth accepts a good month and rejects every kind of corruption", () => {
  const good = fakeMonth(2026, 9);
  assert.equal(validateCachedMonth(good, q(2026, 9)), true);
  assert.equal(validateCachedMonth({ ...good, engineVersion: "other" }, q(2026, 9)), false);
  assert.equal(validateCachedMonth({ ...good, timezone: "America/Chicago" }, q(2026, 9)), false);
  assert.equal(validateCachedMonth({ ...good, latitude: 17.386 }, q(2026, 9)), false);
  assert.equal(validateCachedMonth({ ...good, year: 2027 }, q(2026, 9)), false);
  assert.equal(validateCachedMonth({ ...good, days: good.days.slice(0, 10) }, q(2026, 9)), false);
  assert.equal(
    validateCachedMonth({ ...good, days: [{ ...good.days[0], dateISO: "2026-09-02" }, ...good.days.slice(1)] }, q(2026, 9)),
    false,
    "wrong civil date in day 0",
  );
  assert.equal(
    validateCachedMonth({ ...good, days: [{ ...good.days[0], useful: "nope" }, ...good.days.slice(1)] }, q(2026, 9)),
    false,
    "useful is not an array",
  );
  assert.equal(
    validateCachedMonth({ ...good, days: [{ ...good.days[0], tithi: { name: "x" } }, ...good.days.slice(1)] }, q(2026, 9)),
    false,
    "tithi missing endsAt",
  );
  assert.equal(
    validateCachedMonth({ ...good, festivals: [{ slug: "x", ruleId: "r", name: "n", dateISO: "d", provenanceUrl: "not-a-url", opensPuja: true }] }, q(2026, 9)),
    false,
    "festival provenanceUrl not a URL",
  );
});

test("a stored month that fails validation is discarded on peek and recomputed", () => {
  const s = fakeStorage();
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), s);
  // Corrupt one day in place (a partial write).
  const raw = JSON.parse(s.getItem(CALENDAR_CACHE_STORAGE_KEY));
  const onlyKey = Object.keys(raw)[0];
  raw[onlyKey].month.days[5] = { dateISO: "2026-09-06" }; // missing everything else
  s.setItem(CALENDAR_CACHE_STORAGE_KEY, JSON.stringify(raw));
  assert.equal(peekCachedMonth(q(2026, 9), s), null, "corrupt month is not returned");
  // And the bad entry has been dropped so it is not retried forever.
  assert.equal(JSON.parse(s.getItem(CALENDAR_CACHE_STORAGE_KEY))[onlyKey], undefined);
});

test("the cache is bounded (oldest write is evicted past the limit)", async () => {
  const s = fakeStorage();
  for (let m = 1; m <= 10; m += 1) {
    writeCachedMonth(q(2026, m), fakeMonth(2026, m), s);
    await tick();
  }
  const kept = JSON.parse(s.getItem(CALENDAR_CACHE_STORAGE_KEY));
  assert.equal(Object.keys(kept).length, 8, "at most 8 months kept");
  // The two earliest writes are gone; the latest are present.
  assert.equal(peekCachedMonth(q(2026, 1), s), null);
  assert.equal(peekCachedMonth(q(2026, 2), s), null);
  assert.ok(peekCachedMonth(q(2026, 10), s));
});

test("reading a month marks it recently used so it survives eviction", async () => {
  const s = fakeStorage();
  for (let m = 1; m <= 8; m += 1) {
    writeCachedMonth(q(2026, m), fakeMonth(2026, m), s);
    await tick();
  }
  readCachedMonth(q(2026, 1), s); // touch month 1 so it is now most-recently-used
  await tick();
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), s); // 9th month forces one eviction
  const kept = JSON.parse(s.getItem(CALENDAR_CACHE_STORAGE_KEY));
  assert.equal(Object.keys(kept).length, 8, "still bounded at 8");
  assert.ok(peekCachedMonth(q(2026, 1), s), "the touched month survived the eviction");
  assert.ok(peekCachedMonth(q(2026, 9), s), "the new month is present");
  assert.equal(peekCachedMonth(q(2026, 2), s), null, "the untouched oldest was evicted instead");
});

test("clearCachedMonths removes everything (destructive full reset)", () => {
  const s = fakeStorage();
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), s);
  clearCachedMonths(s);
  assert.equal(peekCachedMonth(q(2026, 9), s), null);
  assert.equal(s.getItem(CALENDAR_CACHE_STORAGE_KEY), null);
});

test("corrupt storage never throws — it reads as empty", () => {
  const s = fakeStorage({ [CALENDAR_CACHE_STORAGE_KEY]: "{not json" });
  assert.equal(peekCachedMonth(q(2026, 9), s), null);
  assert.doesNotThrow(() => writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), s));
  assert.ok(peekCachedMonth(q(2026, 9), s), "a good write recovers");
});

test("no storage available (SSR / private mode) is handled", () => {
  assert.equal(peekCachedMonth(q(2026, 9), null), null);
  assert.doesNotThrow(() => writeCachedMonth(q(2026, 9), fakeMonth(2026, 9), null));
  assert.doesNotThrow(() => clearCachedMonths(null));
});
