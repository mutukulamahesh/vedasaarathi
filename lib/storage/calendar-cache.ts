// Local, on-device cache of computed calendar months.
//
// A CalendarMonth (lib/panchanga/calendar.ts) is expensive to compute (one
// boundary bisection per day). It is deterministic for a given
//   engineVersion + latitude + longitude + timezone + year-month
// so once computed it is stored here and re-read on the next visit — including
// an OFFLINE visit after the offline download. Nothing is sent anywhere.
//
// EVICTION: bounded at CACHE_LIMIT entries. Each entry carries `at`, the epoch
// ms it was WRITTEN. Eviction keeps the CACHE_LIMIT most recently WRITTEN
// entries. `readCachedMonth()` refreshes `at` (true LRU for that path), but the
// Calendar screen adopts a cached month through `peekCachedMonth()`, which is a
// pure read and does NOT refresh recency — so for normal Calendar use the
// eviction order is write order, not access order. This is deliberate: a
// re-read is cheap, and not writing on every render keeps the render path
// side-effect free.
//
// DEFENSIVE: a stored month is structurally validated (engineVersion, the exact
// query, the day count and every day's shape, the festival array) before it is
// ever handed back. A malformed or partially written entry is discarded and the
// month recomputed — the Calendar screen never renders a corrupt cache.

import {
  calendarCacheKey, CALENDAR_ENGINE_VERSION, daysInMonth,
  type CalendarMonth,
} from "@/lib/panchanga/calendar";

const STORAGE_KEY = "vedasaarathi:calendar-months:v1";
const CACHE_LIMIT = 8;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

interface CacheEntry {
  /** Epoch ms this entry was written (or last refreshed by readCachedMonth). */
  at: number;
  month: CalendarMonth;
}

export interface CalendarCacheQuery {
  latitude: number;
  longitude: number;
  timezone: string;
  year: number;
  month: number;
}

/* -------------------------------------------------------------------------- */
/* Structural validation                                                      */
/* -------------------------------------------------------------------------- */

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function validPeriod(p: unknown): boolean {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    isStr(o.id) &&
    (o.kind === "useful" || o.kind === "avoid") &&
    isStr(o.start) &&
    isStr(o.end)
  );
}

function validDay(d: unknown, expectedISO: string): boolean {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  if (o.dateISO !== expectedISO) return false;
  if (!isFiniteNum(o.day) || (o.day as number) < 1 || (o.day as number) > 31) return false;
  if (!isFiniteNum(o.weekday) || (o.weekday as number) < 0 || (o.weekday as number) > 6) return false;
  if (!isStr(o.vaara) || !isStr(o.paksha) || !isStr(o.masa)) return false;
  const elementOk = (e: unknown) =>
    e === null ||
    (typeof e === "object" && e !== null &&
      isStr((e as Record<string, unknown>).name) &&
      isStr((e as Record<string, unknown>).endsAt));
  if (!elementOk(o.tithi) || !elementOk(o.nakshatra)) return false;
  if (!Array.isArray(o.useful) || !o.useful.every(validPeriod)) return false;
  if (!Array.isArray(o.avoid) || !o.avoid.every(validPeriod)) return false;
  if (!Array.isArray(o.festivalSlugs) || !(o.festivalSlugs as unknown[]).every(isStr)) return false;
  return true;
}

/** Every structural expectation for a cached month + query. Returns true only
 * for a complete, self-consistent month. */
export function validateCachedMonth(month: unknown, q: CalendarCacheQuery): month is CalendarMonth {
  if (!month || typeof month !== "object") return false;
  const m = month as Record<string, unknown>;
  if (m.engineVersion !== CALENDAR_ENGINE_VERSION) return false;
  if (m.year !== q.year || m.month !== q.month) return false;
  if (m.timezone !== q.timezone) return false;
  if (m.latitude !== q.latitude || m.longitude !== q.longitude) return false;

  const total = daysInMonth(q.year, q.month);
  if (!Array.isArray(m.days) || m.days.length !== total) return false;
  const mm = String(q.month).padStart(2, "0");
  for (let i = 0; i < total; i += 1) {
    const expectedISO = `${q.year}-${mm}-${String(i + 1).padStart(2, "0")}`;
    if (!validDay(m.days[i], expectedISO)) return false;
  }

  if (!Array.isArray(m.festivals)) return false;
  for (const f of m.festivals as unknown[]) {
    if (!f || typeof f !== "object") return false;
    const fo = f as Record<string, unknown>;
    if (!isStr(fo.slug) || !isStr(fo.ruleId) || !isStr(fo.name) || !isStr(fo.dateISO)) return false;
    if (!isStr(fo.provenanceUrl) || !/^https:\/\/[^\s]+$/.test(fo.provenanceUrl as string)) return false;
    if (typeof fo.opensPuja !== "boolean") return false;
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* Store I/O                                                                  */
/* -------------------------------------------------------------------------- */

function readAll(store: StorageLike): Record<string, CacheEntry> {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, CacheEntry> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        value && typeof value === "object" &&
        typeof (value as CacheEntry).at === "number" &&
        (value as CacheEntry).month &&
        (value as CacheEntry).month.engineVersion === CALENDAR_ENGINE_VERSION
      ) {
        out[key] = value as CacheEntry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(store: StorageLike, all: Record<string, CacheEntry>): void {
  const entries = Object.entries(all).sort((a, b) => b[1].at - a[1].at);
  const kept = Object.fromEntries(entries.slice(0, CACHE_LIMIT));
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch {
    // A full store must not break the calendar; it just won't be cached.
  }
}

/** Remove one entry by key (used when a stored month fails validation). */
function dropKey(store: StorageLike, key: string): void {
  const all = readAll(store);
  if (all[key]) {
    delete all[key];
    writeAll(store, all);
  }
}

/**
 * The cached month for this exact query, or null. Pure read — does not touch
 * the store (safe to call during a React render), EXCEPT that a stored entry
 * which fails structural validation is discarded so it cannot be tried again.
 */
export function peekCachedMonth(
  q: CalendarCacheQuery,
  storage?: StorageLike,
): CalendarMonth | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  const key = calendarCacheKey(q);
  const month = readAll(store)[key]?.month ?? null;
  if (!month) return null;
  if (!validateCachedMonth(month, q)) {
    try { dropKey(store, key); } catch { /* ignore */ }
    return null;
  }
  return month;
}

/** Like peekCachedMonth, but refreshes the entry's recency (true LRU for this
 * access path). */
export function readCachedMonth(
  q: CalendarCacheQuery,
  storage?: StorageLike,
): CalendarMonth | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  const key = calendarCacheKey(q);
  const all = readAll(store);
  const entry = all[key];
  if (!entry) return null;
  if (!validateCachedMonth(entry.month, q)) {
    delete all[key];
    writeAll(store, all);
    return null;
  }
  entry.at = Date.now();
  writeAll(store, all);
  return entry.month;
}

/** Store a completed month. A month that fails validation is NOT stored. */
export function writeCachedMonth(
  q: CalendarCacheQuery,
  month: CalendarMonth,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  if (!validateCachedMonth(month, q)) return;
  const key = calendarCacheKey(q);
  const all = readAll(store);
  all[key] = { at: Date.now(), month };
  writeAll(store, all);
}

/** Drop every cached month (used by the destructive full reset). */
export function clearCachedMonths(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export { STORAGE_KEY as CALENDAR_CACHE_STORAGE_KEY, CACHE_LIMIT as CALENDAR_CACHE_LIMIT };
