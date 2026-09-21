// Local, on-device storage for the presentation mode: FAMILY_BETA (the
// default a household beta tester sees - one app-level beta notice, no
// repeated internal review/provenance chrome in the worship flow) or REVIEWER
// (an invited priest or reviewer - review status, source/provenance
// information, and draft warnings are shown throughout).
//
// This choice is purely presentational. It never touches canDisplayAsGuidance
// or any content's reviewStatus/provenance - switching modes changes what
// chrome is shown, never what content is approved. There is no authentication
// here: reviewer mode is a device-local choice, same as the rest of this
// app's on-device settings.

export type PresentationMode = "FAMILY_BETA" | "REVIEWER";

const STORAGE_KEY = "vedasaarathi:presentation-mode:v1";
const VALID_MODES: readonly PresentationMode[] = ["FAMILY_BETA", "REVIEWER"];

export function defaultPresentationMode(): PresentationMode {
  return "FAMILY_BETA";
}

function isValidMode(value: unknown): value is PresentationMode {
  return typeof value === "string" && (VALID_MODES as readonly string[]).includes(value);
}

/** Turn a stored string into a valid PresentationMode. Anything unexpected
 * falls back to FAMILY_BETA - never a reviewer view nobody asked for. */
export function parsePresentationMode(raw: string | null): PresentationMode {
  if (raw === null) return defaultPresentationMode();
  return isValidMode(raw) ? raw : defaultPresentationMode();
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

export function loadPresentationMode(storage?: StorageLike): PresentationMode {
  const store = resolveStorage(storage);
  if (!store) return defaultPresentationMode();
  try {
    return parsePresentationMode(store.getItem(STORAGE_KEY));
  } catch {
    return defaultPresentationMode();
  }
}

export function savePresentationMode(mode: PresentationMode, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, mode);
  } catch {
    // A full or unavailable store must not break the rest of the app.
  }
}

/* -------------------------------------------------------------------------- */
/* External store for useSyncExternalStore                                    */
/* -------------------------------------------------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();
const serverSnapshot: PresentationMode = defaultPresentationMode();

let cachedRaw: string | null = null;
let cachedSnapshot: PresentationMode = serverSnapshot;
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
export function getPresentationModeSnapshot(): PresentationMode {
  const raw = readRaw();
  if (!hasCache || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parsePresentationMode(raw);
    hasCache = true;
  }
  return cachedSnapshot;
}

/** Stable default snapshot for server rendering and hydration. */
export function getServerPresentationModeSnapshot(): PresentationMode {
  return serverSnapshot;
}

export function subscribeToPresentationMode(listener: Listener): () => void {
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

/** Set the presentation mode and notify subscribers. */
export function setPresentationMode(mode: PresentationMode): void {
  savePresentationMode(mode);
  invalidate();
  emitChange();
}

export { STORAGE_KEY as PRESENTATION_MODE_STORAGE_KEY };
