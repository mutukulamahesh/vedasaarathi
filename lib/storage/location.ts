// Local, on-device storage for the user's saved location.
//
// .claude/rules/security.md: location is private data, saved only in this
// browser's localStorage - never sent anywhere. parseLocationState is
// defensive: damaged or incomplete saved data falls back to NOT_SET, never to
// a hard-coded city. A location with an invalid latitude, longitude, or time
// zone is never accepted, whether it comes from storage or from a form.

import {
  UNREADY_STATUSES, isValidISOTimestamp, isValidLatitude, isValidLongitude,
  isValidTimezone, type LocationSource, type LocationState, type ReadyLocation,
  type UnreadyLocation,
} from "../location/model";

const STORAGE_KEY = "vedasaarathi:location:v1";

export function emptyLocationState(): LocationState {
  return { status: "NOT_SET" };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseReadyLocation(record: Record<string, unknown>): ReadyLocation | null {
  const { latitude, longitude, timezone, city, region, country, source, savedAt, accuracyMeters } =
    record;

  if (
    typeof latitude !== "number" || !isValidLatitude(latitude) ||
    typeof longitude !== "number" || !isValidLongitude(longitude) ||
    !isValidTimezone(timezone) ||
    typeof city !== "string" || city.trim() === "" ||
    typeof country !== "string" || country.trim() === "" ||
    !isValidISOTimestamp(savedAt) ||
    (source !== "DEVICE" && source !== "MANUAL")
  ) {
    return null;
  }

  return {
    status: "READY",
    latitude,
    longitude,
    timezone,
    city,
    region: typeof region === "string" ? region : "",
    country,
    source: source as LocationSource,
    accuracyMeters: typeof accuracyMeters === "number" ? accuracyMeters : null,
    savedAt,
  };
}

/**
 * Turn a stored JSON string into a valid LocationState. Anything missing,
 * damaged, or unrecognized falls back to NOT_SET - never to a substituted
 * default city.
 */
export function parseLocationState(raw: string | null): LocationState {
  const fallback = emptyLocationState();
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const record = asRecord(parsed);
  if (!record) return fallback;

  if (record.status === "READY") {
    return parseReadyLocation(record) ?? fallback;
  }
  if (
    typeof record.status === "string" &&
    (UNREADY_STATUSES as readonly string[]).includes(record.status)
  ) {
    return { status: record.status as UnreadyLocation["status"] };
  }
  return fallback;
}

export function serializeLocationState(state: LocationState): string {
  return JSON.stringify(state);
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadLocationState(storage?: StorageLike): LocationState {
  const store = resolveStorage(storage);
  if (!store) return emptyLocationState();
  try {
    return parseLocationState(store.getItem(STORAGE_KEY));
  } catch {
    return emptyLocationState();
  }
}

export function saveLocationState(state: LocationState, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, serializeLocationState(state));
  } catch {
    // A full or unavailable store must not break the rest of the app.
  }
}

export function clearLocationState(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Ignore - nothing to clean up if the store is unavailable.
  }
}

/* -------------------------------------------------------------------------- */
/* External store for useSyncExternalStore                                    */
/* -------------------------------------------------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();
const serverSnapshot: LocationState = emptyLocationState();

let cachedRaw: string | null = null;
let cachedSnapshot: LocationState = serverSnapshot;
let hasCache = false;

function readRaw(): string | null {
  const store = resolveStorage();
  if (!store) return null;
  try {
    return store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function invalidate(): void {
  cachedRaw = null;
  hasCache = false;
}

function emitChange(): void {
  for (const listener of listeners) listener();
}

/** Stable snapshot for the client. Re-parses only when the stored string changes. */
export function getLocationSnapshot(): LocationState {
  const raw = readRaw();
  if (!hasCache || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseLocationState(raw);
    hasCache = true;
  }
  return cachedSnapshot;
}

/** Stable empty snapshot for server rendering and hydration. */
export function getServerLocationSnapshot(): LocationState {
  return serverSnapshot;
}

export function subscribeToLocation(listener: Listener): () => void {
  listeners.add(listener);

  let onStorage: ((event: StorageEvent) => void) | undefined;
  if (typeof window !== "undefined") {
    onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        invalidate();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (onStorage) window.removeEventListener("storage", onStorage);
  };
}

/** Replace the whole location record and notify subscribers. */
export function writeLocationState(next: LocationState): void {
  saveLocationState(next);
  invalidate();
  emitChange();
}

/** Apply a pure update to the current location and persist it. */
export function updateLocationState(
  updater: (current: LocationState) => LocationState,
): void {
  writeLocationState(updater(getLocationSnapshot()));
}

/** Clear stored location and notify subscribers. */
export function resetLocationState(): void {
  clearLocationState();
  invalidate();
  emitChange();
}

/** Message shown to the user before a saved location is cleared. */
export const LOCATION_CLEAR_CONFIRM_MESSAGE =
  "This clears your saved location from this device. Clear location?";

function defaultConfirm(message: string): boolean {
  // Only the browser's confirm dialog counts. Anywhere else (SSR, tests, a
  // Node global) we cannot ask the user, so we do not clear anything.
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    return window.confirm(message);
  }
  return false;
}

/**
 * Clear the saved location only after the user confirms. Returns true when the
 * clear happened. `confirm` and `onClear` are injectable for testing.
 */
export function requestLocationClear(options: {
  confirm?: (message: string) => boolean;
  onClear?: () => void;
} = {}): boolean {
  const confirm = options.confirm ?? defaultConfirm;
  if (!confirm(LOCATION_CLEAR_CONFIRM_MESSAGE)) return false;
  (options.onClear ?? resetLocationState)();
  return true;
}

export { STORAGE_KEY as LOCATION_STORAGE_KEY };
