// "Clear saved data on this device" - one explicit, confirmed action (About
// screen) that removes every piece of VedaSaarathi data this browser has
// stored: saved location, participants/lineage, puja progress (including the
// Sankalpam choices folded into it), calendar cache, corrections saved on
// this device, reviewer decisions/mode, and playback/voice preferences.
//
// This app writes nothing to localStorage outside the "vedasaarathi:" prefix
// (every lib/storage/*.ts and lib/corrections/store.ts key uses it), so a
// sweep scoped to that prefix removes exactly VedaSaarathi's own data and
// nothing else that might share this browser origin.
//
// The offline download (puja audio, cached via the Cache Storage API, not
// localStorage) is DELIBERATELY NOT touched here - it is a large, separate,
// opt-in download with its own removal control (Pujas -> Offline -> "Remove
// downloaded copy" / lib/offline/download.ts's removeOffline()).

export const VEDASAARATHI_STORAGE_PREFIX = "vedasaarathi:";

function storageOrNull(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Every vedasaarathi: key currently stored. Exported for tests and for a
 * future "what exactly will this remove" listing, should one be added. */
export function listStoredDataKeys(storage: Storage | null = storageOrNull()): string[] {
  if (!storage) return [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(VEDASAARATHI_STORAGE_PREFIX)) keys.push(key);
  }
  return keys;
}

/** Removes every vedasaarathi: key and returns how many were removed. Never
 * throws - a storage access failure (private-browsing quirks, a full quota)
 * is swallowed, matching every other storage helper in this app. */
export function clearAllStoredData(storage: Storage | null = storageOrNull()): number {
  if (!storage) return 0;
  const keys = listStoredDataKeys(storage);
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      /* best-effort */
    }
  }
  return keys.length;
}
