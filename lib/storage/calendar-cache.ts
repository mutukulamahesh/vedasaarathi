// Local, on-device cache of computed calendar months.
//
// A CalendarMonth (lib/panchanga/calendar.ts) is expensive to compute (one
// boundary bisection per day). It is deterministic for a given
//   engineVersion + latitude + longitude + timezone + year-month
// so once computed it is stored here and re-read on the next visit — including
// an OFFLINE visit after the offline download. Nothing is sent anywhere.
//
// Bounded: at most CACHE_LIMIT months are kept; the oldest-touched is dropped.

import {
  calendarCacheKey, CALENDAR_ENGINE_VERSION, type CalendarMonth,
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
  /** Epoch ms this entry was last read/written (for LRU eviction). */
  at: number;
  month: CalendarMonth;
}

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

export interface CalendarCacheQuery {
  latitude: number;
  longitude: number;
  timezone: string;
  year: number;
  month: number;
}

/** The cached month for this exact query, or null. Read-only — does not touch
 * the store (safe to call during a React render). */
export function peekCachedMonth(
  q: CalendarCacheQuery,
  storage?: StorageLike,
): CalendarMonth | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  return readAll(store)[calendarCacheKey(q)]?.month ?? null;
}

/** The cached month for this exact query, or null. Marks it recently used. */
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
  entry.at = Date.now();
  writeAll(store, all);
  return entry.month;
}

/** Store a computed month. */
export function writeCachedMonth(
  q: CalendarCacheQuery,
  month: CalendarMonth,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  if (!store) return;
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

export { STORAGE_KEY as CALENDAR_CACHE_STORAGE_KEY };
