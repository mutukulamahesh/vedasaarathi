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
  CALENDAR_CACHE_STORAGE_KEY,
} = await vite.ssrLoadModule("/lib/storage/calendar-cache.ts");
const { CALENDAR_ENGINE_VERSION } = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");

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
const fakeMonth = (year, month, engineVersion = CALENDAR_ENGINE_VERSION) => ({
  year, month, timezone: HYD.timezone, latitude: HYD.latitude, longitude: HYD.longitude,
  engineVersion, days: [{ dateISO: `${year}-0${month}-01`, day: 1 }], festivals: [], released: {},
});

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
  writeCachedMonth(q(2026, 9), fakeMonth(2026, 9, "cal-1+deadbeefface"), s);
  assert.equal(peekCachedMonth(q(2026, 9), s), null, "stale engine version → not read");
  assert.equal(readCachedMonth(q(2026, 9), s), null);
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
