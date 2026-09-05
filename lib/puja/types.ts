// The generic puja model: the shape any puja service (Vinayaka Chavithi
// today, others later) must provide to the platform. Platform-level screens
// (home, the puja catalogue, navigation) read only this shape - never a
// specific puja's own content constants (its RITUAL_STEPS, its materials
// list, its patri content, its festival date). A puja service module (for
// example lib/pujas/vinayaka/service.ts) is responsible for assembling its
// own content into this shape.
//
// ReviewStatus and Provenance are not puja-specific - they are the platform's
// own sacred-content safety model (.claude/rules/sacred-content.md), used the
// same way by every puja, so this file reuses those types directly.

import type { Provenance } from "@/lib/content/provenance";
import type { ReviewStatus } from "@/lib/content/review-status";

export type PujaAvailability = "AVAILABLE" | "COMING_SOON";
export type PujaLanguageCode = "EN" | "TE";
export type PujaPathId = "SIMPLE" | "COMPLETE";
export type PujaStepImportance = "CORE" | "OPTIONAL";

export interface PujaMaterialDefinition {
  id: string;
  name: string;
  /** Plain, factual description of the object. Not a statement about the rite. */
  description: string;
  /** A generic bucket label, e.g. "COMMON" for readiness accounting. */
  category: string;
  /** A documented or reviewed stand-in. Shown only once it passes the guidance gate. */
  approvedAlternative: string | null;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
}

export interface PujaMaterialsDefinition {
  disclaimer: string;
  categoryLabel: Record<string, string>;
  items: readonly PujaMaterialDefinition[];
}

export interface PujaGuidedStep {
  id: string;
  title: string;
  teluguTitle: string;
  teluguInstruction: string;
  what: string;
  how: string;
  why: string;
  importance: PujaStepImportance;
  minutes: number;
  termNote: string | null;
  reviewStatus: ReviewStatus;
  /** Locked content stays distinguishable in the data model regardless of
   * presentation mode - the UI must never treat a locked step as editable
   * or as approved final wording. */
  locked: boolean;
  provenance: Provenance;
}

export interface PujaPatriSelfReportOption {
  value: string;
  label: string;
}

export interface PujaPatriDefinition {
  sectionTitle: string;
  reviewStatus: ReviewStatus;
  /** Shown in place of any leaf list or count until review is done. */
  reviewNotice: string;
  safetyNote: string;
  selfReportOptions: readonly PujaPatriSelfReportOption[];
  provenance: Provenance;
}

export interface PujaFestivalDefinition {
  name: string;
  /** Pilot festival date, ISO 8601 (local civil date). Not yet calculated per location. */
  dateISO: string;
  isPilotData: true;
}

export interface PujaMetadata {
  contentVersion: string;
  /** One human-readable line summarizing review state; per-field status still
   * lives on each material/step, this is not a substitute for those. Shown
   * only to reviewers - see components/platform/review-display.tsx. */
  reviewSummary: string;
}

/** One presentable option in a puja's optional post-puja guidance (for
 * example, what to do with a murti after Vinayaka Chavithi). */
export interface PujaPostGuidanceChoice {
  title: string;
  description?: string;
  steps?: readonly string[];
}

/**
 * Optional post-puja guidance a puja service may provide (disposal,
 * immersion, or similar closing procedure). Not every puja has one - the
 * platform coordinator and CompleteScreen only offer this step when it is
 * present, so a puja without any such content is never forced through it.
 */
export interface PujaPostGuidanceDefinition {
  kicker: string;
  screenTitle: string;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  /** Detailed wording shown to reviewers when this content is not yet approved. */
  reviewNotice: string;
  choices: readonly PujaPostGuidanceChoice[];
  safetyNoteTitle: string;
  safetyNote: string;
  /** Reviewer-only note (a specific detail to confirm before release). */
  reviewerNote?: string;
}

export interface PujaDefinition {
  id: string;
  slug: string;
  displayName: string;
  teluguDisplayName: string | null;
  description: string;
  availability: PujaAvailability;
  languages: readonly PujaLanguageCode[];
  materials: PujaMaterialsDefinition;
  patri: PujaPatriDefinition;
  steps: readonly PujaGuidedStep[];
  /** null when this puja has no fixed festival date. */
  festival: PujaFestivalDefinition | null;
  metadata: PujaMetadata;
  /** null when this puja has no post-puja guidance (e.g. no immersion step). */
  postPujaGuidance: PujaPostGuidanceDefinition | null;
}

export function stepsForPujaPath(
  puja: PujaDefinition,
  path: PujaPathId,
): PujaGuidedStep[] {
  return puja.steps.filter((step) => path === "COMPLETE" || step.importance === "CORE");
}

export function estimatedMinutesForPujaPath(
  puja: PujaDefinition,
  path: PujaPathId,
): number {
  return stepsForPujaPath(puja, path).reduce((sum, step) => sum + step.minutes, 0);
}

export function lockedPujaSteps(puja: PujaDefinition): PujaGuidedStep[] {
  return puja.steps.filter((step) => step.locked);
}

export function clampPujaStepIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export interface PujaMaterialReadiness {
  total: number;
  available: number;
  /** "COMMON"-category items the user has not marked as available. */
  missingCommon: PujaMaterialDefinition[];
  /** Any other-category item not marked as available. */
  missingOther: PujaMaterialDefinition[];
}

export function getPujaMaterialReadiness(
  puja: PujaDefinition,
  availableIds: readonly string[],
): PujaMaterialReadiness {
  const available = new Set(availableIds);
  const missingCommon: PujaMaterialDefinition[] = [];
  const missingOther: PujaMaterialDefinition[] = [];

  for (const item of puja.materials.items) {
    if (available.has(item.id)) continue;
    if (item.category === "COMMON") {
      missingCommon.push(item);
    } else {
      missingOther.push(item);
    }
  }

  return {
    total: puja.materials.items.length,
    available: puja.materials.items.filter((item) => available.has(item.id)).length,
    missingCommon,
    missingOther,
  };
}

/**
 * Missing materials never stop the puja, for any puja service. This is here
 * so the rule is explicit and testable: preparation guidance is help, not a
 * gate.
 */
export const MISSING_MATERIALS_BLOCK_PUJA = false;
