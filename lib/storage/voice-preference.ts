// Local, on-device storage for the user's chosen narration voice.
//
// Only a voice identifier (voiceURI) per language is ever stored - never any
// narrated text, step content, or participant data. If the saved voice is no
// longer present on the device (a different browser, a cleared voice list),
// lib/speech/voices.ts#resolveVoice falls back to the language's preferred
// voice; this module never invents or guesses a replacement itself.

export interface VoicePreference {
  EN: string | null;
  TE: string | null;
}

const STORAGE_KEY = "vedasaarathi:voice-preference:v1";

export function emptyVoicePreference(): VoicePreference {
  return { EN: null, TE: null };
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseVoiceId(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Turn a stored JSON string into a valid VoicePreference. Anything unexpected falls back to null. */
export function parseVoicePreference(raw: string | null): VoicePreference {
  const fallback = emptyVoicePreference();
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const record = asRecord(parsed);
  if (!record) return fallback;

  return {
    EN: parseVoiceId(record.EN),
    TE: parseVoiceId(record.TE),
  };
}

export function serializeVoicePreference(preference: VoicePreference): string {
  return JSON.stringify({ EN: preference.EN, TE: preference.TE });
}

export function loadVoicePreference(storage?: StorageLike): VoicePreference {
  const store = resolveStorage(storage);
  if (!store) return emptyVoicePreference();
  try {
    return parseVoicePreference(store.getItem(STORAGE_KEY));
  } catch {
    return emptyVoicePreference();
  }
}

export function saveVoicePreference(
  preference: VoicePreference,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, serializeVoicePreference(preference));
  } catch {
    // A full or unavailable store must not break narration.
  }
}

/** Save just one language's chosen voice, keeping the other language untouched. */
export function saveVoiceChoice(
  language: "EN" | "TE",
  voiceURI: string | null,
  storage?: StorageLike,
): VoicePreference {
  const current = loadVoicePreference(storage);
  const next: VoicePreference = { ...current, [language]: voiceURI };
  saveVoicePreference(next, storage);
  return next;
}
