// Local, on-device storage for the recorded-audio playback speed. Applies to
// every recorded track (mantra, instruction, family Sankalpam) - never to the
// canonical mantra TEXT, and never sent anywhere. 1.1x is the default (a
// small, deliberate speed-up); 1.0x keeps the original recorded pace.

export type PlaybackSpeed = 1 | 1.1;

const STORAGE_KEY = "vedasaarathi:playback-speed:v1";
const VALID_SPEEDS: readonly PlaybackSpeed[] = [1, 1.1];

export function defaultPlaybackSpeed(): PlaybackSpeed {
  return 1.1;
}

function isValidSpeed(value: unknown): value is PlaybackSpeed {
  return typeof value === "number" && (VALID_SPEEDS as readonly number[]).includes(value);
}

/** Turn a stored string into a valid PlaybackSpeed. Anything unexpected falls
 * back to the default (1.1x) - never a broken or silently-wrong rate. */
export function parsePlaybackSpeed(raw: string | null): PlaybackSpeed {
  if (raw === null) return defaultPlaybackSpeed();
  const n = Number(raw);
  return isValidSpeed(n) ? n : defaultPlaybackSpeed();
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

export function loadPlaybackSpeed(storage?: StorageLike): PlaybackSpeed {
  const store = resolveStorage(storage);
  if (!store) return defaultPlaybackSpeed();
  try {
    return parsePlaybackSpeed(store.getItem(STORAGE_KEY));
  } catch {
    return defaultPlaybackSpeed();
  }
}

export function savePlaybackSpeed(speed: PlaybackSpeed, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, String(speed));
  } catch {
    // A full or unavailable store must not break the rest of the app.
  }
}

/** Apply `speed` to a media element, preserving pitch where the browser
 * supports it (so 1.1x sounds slightly faster, never higher-pitched). Safe to
 * call on every render/mount - setting the same value again is a no-op. */
export function applyPlaybackSpeed(el: HTMLMediaElement, speed: PlaybackSpeed): void {
  el.playbackRate = speed;
  const anyEl = el as HTMLMediaElement & {
    preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean;
  };
  anyEl.preservesPitch = true;
  anyEl.mozPreservesPitch = true;
  anyEl.webkitPreservesPitch = true;
}

/* -------------------------------------------------------------------------- */
/* External store for useSyncExternalStore                                    */
/* -------------------------------------------------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();
const serverSnapshot: PlaybackSpeed = defaultPlaybackSpeed();

let cachedRaw: string | null = null;
let cachedSnapshot: PlaybackSpeed = serverSnapshot;
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
export function getPlaybackSpeedSnapshot(): PlaybackSpeed {
  const raw = readRaw();
  if (!hasCache || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parsePlaybackSpeed(raw);
    hasCache = true;
  }
  return cachedSnapshot;
}

/** Stable default snapshot for server rendering and hydration. */
export function getServerPlaybackSpeedSnapshot(): PlaybackSpeed {
  return serverSnapshot;
}

export function subscribeToPlaybackSpeed(listener: Listener): () => void {
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

/** Set the playback speed and notify subscribers (every mounted player). */
export function setPlaybackSpeed(speed: PlaybackSpeed): void {
  savePlaybackSpeed(speed);
  invalidate();
  emitChange();
}

export { STORAGE_KEY as PLAYBACK_SPEED_STORAGE_KEY };
