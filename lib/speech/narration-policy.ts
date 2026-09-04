// What device narration is allowed to say, and the disclosure text that always
// travels with it.
//
// Narration must never read a mantra, canonical Sankalpam wording, or any
// locked religious wording - none of that exists as a field on RitualStep, so
// there is nothing for this module to accidentally read. The one real risk is
// reading a REVIEW_REQUIRED step's paraphrased candidate text while private
// review mode is off. getNarrationText() applies the exact same rule the
// visible What/How/Why text already uses (see canDisplayAsGuidance in
// lib/content/provenance.ts), so narration can never say more than the screen
// already shows.

import type { NarrationLanguage } from "./voices";

export interface NarratableStep {
  what: string;
  how: string;
  teluguInstruction: string;
  reviewStatus: string;
}

export interface NarrationGateOptions {
  language: NarrationLanguage;
  /** Whether this step's guidance has passed the release gate (canDisplayAsGuidance). */
  approved: boolean;
  /** Whether private review mode is on for this session. */
  reviewMode: boolean;
}

/**
 * The text narration may speak for this step, or null when narration must stay
 * silent. Mirrors the page's own "mayShowInstructions" rule exactly: approved
 * content always narrates; a REVIEW_REQUIRED candidate narrates only while
 * review mode is explicitly on. Never returns text for anything else.
 */
export function getNarrationText(
  step: NarratableStep,
  options: NarrationGateOptions,
): string | null {
  const mayNarrate =
    options.approved || (options.reviewMode && step.reviewStatus === "REVIEW_REQUIRED");
  if (!mayNarrate) return null;
  return options.language === "TE" ? step.teluguInstruction : `${step.what} ${step.how}`;
}

export const DEVICE_NARRATION_NOTE =
  "Device narration only. It does not read mantras; reviewed pronunciation audio is still pending.";

export const NARRATION_UNAVAILABLE_NOTE =
  "Audio guidance is not available until this step is reviewed.";

export const TELUGU_VOICE_UNAVAILABLE_NOTE =
  "A suitable Telugu voice is not available on this device.";
