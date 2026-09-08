// The Vinayaka Chavithi guided-puja steps.
//
// These are now built directly from the sourced Vinayaka candidate
// (lib/pujas/vinayaka/beta-journey.ts), which adapts lib/pujas/vinayaka/
// candidate.ts. The old hand-written 12-step list is gone. Every ritual step
// still carries REVIEW_REQUIRED + locked + a source record + transcription
// confidence, and adds the Family Beta fields (Telugu mantra, transliteration,
// simple meaning, beginner physical action, beta status, classification).

import type { ReviewStatus } from "./review-status";
import type { Provenance } from "./provenance";
import type { BetaStatus } from "./beta-visibility";
import {
  BETA_JOURNEY_STEPS, betaJourneyMinutes, betaJourneyStepsForPath,
  type BetaClassification,
} from "@/lib/pujas/vinayaka/beta-journey";
import type { BetaActionBasis } from "@/lib/pujas/vinayaka/beginner-actions";
import type { SourceReference } from "@/lib/pujas/vinayaka/sources";
import type { TeluguRecoveryEntry } from "@/lib/pujas/vinayaka/telugu-recovery";

export type PujaPath = "SIMPLE" | "COMPLETE";
export type StepImportance = "CORE" | "OPTIONAL";

export interface RitualStep {
  id: string;
  title: string;
  teluguTitle: string;
  teluguInstruction: string;
  what: string;
  how: string;
  why: string;
  importance: StepImportance;
  minutes: number;
  termNote: string | null;
  reviewStatus: ReviewStatus;
  locked: boolean;
  provenance: Provenance;

  /* -- Family Beta fields (from the sourced candidate) -- */
  candidateStepId: string | null;
  romanTitle: string;
  mantraTeluguScript: string | null;
  mantraTransliteration: string;
  transliterationSupported: boolean;
  simpleMeaning: string;
  betaActionBasis: BetaActionBasis;
  betaActionNeedsReview: boolean;
  betaActionSources: readonly string[];
  betaActionNote: string | null;
  materials: readonly string[];
  betaClassification: BetaClassification;
  classificationInferred: boolean;
  betaStatus: BetaStatus;
  includedInBeta: boolean;
  sourceRefs: readonly SourceReference[];
  teluguRecovery: TeluguRecoveryEntry | null;
}

export const RITUAL_STEPS: readonly RitualStep[] = BETA_JOURNEY_STEPS.map((s) => ({
  id: s.id,
  title: s.title,
  teluguTitle: s.teluguTitle,
  teluguInstruction: "",
  what: s.simpleMeaning,
  how: s.betaAction,
  why: s.why,
  importance: s.importance,
  minutes: s.minutes,
  termNote: s.betaActionNote,
  reviewStatus: s.reviewStatus,
  locked: s.locked,
  provenance: s.provenance,
  candidateStepId: s.candidateStepId,
  romanTitle: s.romanTitle,
  mantraTeluguScript: s.mantraTeluguScript,
  mantraTransliteration: s.mantraTransliteration,
  transliterationSupported: s.transliterationSupported,
  simpleMeaning: s.simpleMeaning,
  betaActionBasis: s.betaActionBasis,
  betaActionNeedsReview: s.betaActionNeedsReview,
  betaActionSources: s.betaActionSources,
  betaActionNote: s.betaActionNote,
  materials: s.materials,
  betaClassification: s.betaClassification,
  classificationInferred: s.classificationInferred,
  betaStatus: s.betaStatus,
  includedInBeta: s.includedInBeta,
  sourceRefs: s.sourceRefs,
  teluguRecovery: s.teluguRecovery,
}));

export function stepsForPath(path: PujaPath): RitualStep[] {
  const ids = new Set(betaJourneyStepsForPath(path).map((s) => s.id));
  return RITUAL_STEPS.filter((step) => ids.has(step.id));
}

export function estimatedMinutes(path: PujaPath): number {
  return betaJourneyMinutes(path);
}

export function lockedSteps(): RitualStep[] {
  return RITUAL_STEPS.filter((step) => step.locked);
}

export function clampStepIndex(index: number, length = RITUAL_STEPS.length): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
