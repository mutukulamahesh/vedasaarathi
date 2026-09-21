// Mantra-audio metadata for the review candidate.
//
// Every mantra starts with no audio at all. Browser text-to-speech is never
// used to chant a mantra - it is a plain-instruction aid only (see
// lib/speech/narration-policy.ts, which already gates on step.locked). A
// canonical pronunciation track is a separately produced, separately
// reviewed asset that only a human reviewer can move to
// PRONUNCIATION_REVIEWED.

export type MantraAudioStatus =
  | "NOT_CREATED"
  | "GENERATED_CANDIDATE"
  | "PRONUNCIATION_REVIEWED";

export const MANTRA_AUDIO_STATUSES: readonly MantraAudioStatus[] = [
  "NOT_CREATED",
  "GENERATED_CANDIDATE",
  "PRONUNCIATION_REVIEWED",
];

export const MANTRA_AUDIO_STATUS_LABEL: Record<MantraAudioStatus, string> = {
  NOT_CREATED: "No audio created",
  GENERATED_CANDIDATE: "Generated candidate — pronunciation not reviewed",
  PRONUNCIATION_REVIEWED: "Pronunciation reviewed",
};

/** The status every mantra in the candidate begins at. */
export const DEFAULT_MANTRA_AUDIO_STATUS: MantraAudioStatus = "NOT_CREATED";

/**
 * Hard rule: device/browser TTS must never be used to chant a mantra. This
 * is here so the rule is explicit and testable, not buried in UI code.
 */
export const BROWSER_TTS_MAY_CHANT_MANTRAS = false;

export interface MantraAudio {
  status: MantraAudioStatus;
  /** How the file (if any) was produced. Never "browser TTS" for a mantra. */
  productionNote: string | null;
  /** Reviewer name + ISO date once status is PRONUNCIATION_REVIEWED. */
  reviewedBy: string | null;
  reviewedOn: string | null;
}

export function newMantraAudio(): MantraAudio {
  return {
    status: DEFAULT_MANTRA_AUDIO_STATUS,
    productionNote: null,
    reviewedBy: null,
    reviewedOn: null,
  };
}
