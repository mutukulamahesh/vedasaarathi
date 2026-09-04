// What device narration is allowed to say, and the disclosure text that always
// travels with it.
//
// Narration must never read a mantra, canonical Sankalpam wording, or any
// locked religious wording - none of that exists as free text on RitualStep,
// so there is nothing for this module to accidentally read, and a locked step
// (step.locked === true) is refused outright, unconditionally, before any
// other check runs. That is stricter than the visible screen: private review
// mode may still show a locked step's draft What/How text, but its audio
// button must stay disabled regardless of review mode.
//
// For an unlocked step, the remaining risk is reading a REVIEW_REQUIRED step's
// paraphrased candidate text while private review mode is off.
// getNarrationText() applies the same rule the visible What/How/Why text
// already uses (see canDisplayAsGuidance in lib/content/provenance.ts), so
// narration never says more than the screen already shows.

import type { NarrationLanguage } from "./voices";

export interface NarratableStep {
  what: string;
  how: string;
  teluguInstruction: string;
  reviewStatus: string;
  /** True while the exact wording and audio are locked pending review. */
  locked: boolean;
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
 * silent.
 *
 *   - A locked step never narrates, no matter what: not when approved (locked
 *     content is never approved today, but this check does not depend on
 *     that), and not in private review mode.
 *   - Otherwise: approved content always narrates; an unlocked REVIEW_REQUIRED
 *     candidate narrates only while review mode is explicitly on.
 */
export function getNarrationText(
  step: NarratableStep,
  options: NarrationGateOptions,
): string | null {
  if (step.locked) return null;
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

export const DEVICE_NARRATION_UNSUPPORTED_NOTE =
  "Device narration is not supported by this browser.";
