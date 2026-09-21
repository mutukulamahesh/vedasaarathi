// Browser voice discovery and selection for device narration.
//
// This is a recognition/comparison aid (see docs/VINAYAKA_PUJA_CONTENT_SPEC.md,
// "Audio"), never priest-reviewed pronunciation. The selection rules are strict
// on purpose: Telugu text is never read by an English, Hindi, or unrelated
// default voice. If no Telugu voice exists on the device, the caller must
// disable narration rather than substitute a different language.

export type NarrationLanguage = "EN" | "TE";

/**
 * The fields this module reads from a browser SpeechSynthesisVoice. A real
 * SpeechSynthesisVoice satisfies this structurally, so the browser path needs
 * no mapping; tests pass plain objects shaped like this.
 */
export interface NarrationVoice {
  readonly voiceURI: string;
  readonly name: string;
  readonly lang: string;
  readonly default?: boolean;
}

function hasLangPrefix(voice: NarrationVoice, prefix: string): boolean {
  return voice.lang.toLowerCase().startsWith(prefix.toLowerCase());
}

function hasExactLang(voice: NarrationVoice, lang: string): boolean {
  return voice.lang.toLowerCase() === lang.toLowerCase();
}

/** Every voice whose language is Telugu (any region). Never English or Hindi. */
export function teluguVoices(
  voices: readonly NarrationVoice[],
): NarrationVoice[] {
  return voices.filter((voice) => hasLangPrefix(voice, "te"));
}

/** Every voice whose language is English (any region). */
export function englishVoices(
  voices: readonly NarrationVoice[],
): NarrationVoice[] {
  return voices.filter((voice) => hasLangPrefix(voice, "en"));
}

/** Only the voices appropriate to show in the selector for this language. */
export function voicesForLanguage(
  voices: readonly NarrationVoice[],
  language: NarrationLanguage,
): NarrationVoice[] {
  return language === "TE" ? teluguVoices(voices) : englishVoices(voices);
}

/**
 * Best Telugu voice, or null when none exists.
 *
 * 1. An exact te-IN voice.
 * 2. Any other voice whose language starts with "te".
 *
 * Never falls back to English, Hindi, or a generic default voice - Telugu text
 * is never read by a non-Telugu voice.
 */
export function selectTeluguVoice(
  voices: readonly NarrationVoice[],
): NarrationVoice | null {
  const candidates = teluguVoices(voices);
  if (candidates.length === 0) return null;
  return candidates.find((voice) => hasExactLang(voice, "te-IN")) ?? candidates[0];
}

/** A voice plausibly built for Indian English by name, when its lang tag alone doesn't say so. */
function looksIndianByName(voice: NarrationVoice): boolean {
  return /india/i.test(voice.name);
}

/**
 * Best English voice, or null when none exists.
 *
 * 1. An exact en-IN voice.
 * 2. Another voice that is Indian English by name (still English-language).
 * 3. Any other English voice.
 */
export function selectEnglishVoice(
  voices: readonly NarrationVoice[],
): NarrationVoice | null {
  const candidates = englishVoices(voices);
  if (candidates.length === 0) return null;

  const exact = candidates.find((voice) => hasExactLang(voice, "en-IN"));
  if (exact) return exact;

  const indianByName = candidates.find((voice) => looksIndianByName(voice));
  if (indianByName) return indianByName;

  return candidates[0];
}

/** The preferred voice for a language, following that language's own rules. */
export function preferredVoice(
  voices: readonly NarrationVoice[],
  language: NarrationLanguage,
): NarrationVoice | null {
  return language === "TE"
    ? selectTeluguVoice(voices)
    : selectEnglishVoice(voices);
}

/**
 * The voice to actually use: the user's saved choice if it is still present and
 * still matches the language, otherwise the language's preferred voice.
 */
export function resolveVoice(
  voices: readonly NarrationVoice[],
  language: NarrationLanguage,
  savedVoiceURI: string | null,
): NarrationVoice | null {
  const inLanguage = voicesForLanguage(voices, language);
  const saved = savedVoiceURI
    ? inLanguage.find((voice) => voice.voiceURI === savedVoiceURI)
    : undefined;
  return saved ?? preferredVoice(voices, language);
}

/* -------------------------------------------------------------------------- */
/* Browser voice list: loaded via getVoices(), refreshed on voiceschanged     */
/* -------------------------------------------------------------------------- */

const EMPTY_VOICES: readonly NarrationVoice[] = [];

function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoices: readonly NarrationVoice[] | null = null;

/** Stable snapshot for useSyncExternalStore. Re-reads only after voiceschanged. */
export function getVoicesSnapshot(): readonly NarrationVoice[] {
  if (!hasSpeechSynthesis()) return EMPTY_VOICES;
  if (cachedVoices === null) {
    const list = window.speechSynthesis.getVoices();
    cachedVoices = list.length > 0 ? list : EMPTY_VOICES;
  }
  return cachedVoices;
}

/** Stable empty snapshot for server rendering, before any browser voice exists. */
export function getServerVoicesSnapshot(): readonly NarrationVoice[] {
  return EMPTY_VOICES;
}

/**
 * Subscribe to voice list changes. Browsers commonly load voices asynchronously
 * and fire "voiceschanged" once the real list is ready, so the cached snapshot
 * is invalidated on that event rather than trusted from the first read.
 */
export function subscribeToVoices(onChange: () => void): () => void {
  if (!hasSpeechSynthesis()) return () => {};
  const synth = window.speechSynthesis;
  const handleVoicesChanged = () => {
    cachedVoices = null;
    onChange();
  };
  synth.addEventListener("voiceschanged", handleVoicesChanged);
  return () => synth.removeEventListener("voiceschanged", handleVoicesChanged);
}
