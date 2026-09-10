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

/**
 * Generic beta-presentation status for a piece of content, mirroring
 * lib/content/beta-visibility.ts BetaStatus without coupling this platform
 * type to a specific puja's modules.
 */
export type PujaBetaStatus =
  | "APPROVED_GUIDANCE"
  | "SOURCED_BETA_CANDIDATE"
  | "WITHHELD_FOR_RIGHTS"
  | "MISSING_SOURCE";

/** A 1-based page reference into a named source file. */
export interface PujaSourceRef {
  sourceId: string;
  page: number;
}
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
  /** Guided-step ids that use this material. Used for path-aware grouping so a
   * Complete-only material is never shown as needed for the Simple path. An
   * empty/undefined list means "not tied to a step" (shown for every path). */
  usedInStepIds?: readonly string[];
  /** Needed for every path regardless of the selected steps (a platform
   * preparation item such as the murti). */
  platformRequirement?: boolean;
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

  /* -- Optional Family Beta fields. Present when a puja service supplies a
     sourced-candidate journey (see lib/pujas/vinayaka/beta-journey.ts).
     A beta candidate is shown only via canDisplayAsBetaCandidate(), never as
     approved guidance. -- */
  /** Recovered Telugu-script mantra, or null for a non-mantra step. */
  mantraTeluguScript?: string | null;
  /** English transliteration; "" when the source layout prevents a copy. */
  mantraTransliteration?: string;
  transliterationSupported?: boolean;
  /** Plain "what this step is". */
  simpleMeaning?: string;
  /** Beginner physical action for the beta (same value as `how`). */
  betaAction?: string;
  betaActionNeedsReview?: boolean;
  /** The candidate step id this maps to, or null for a practical prep step. */
  candidateStepId?: string | null;
  /** Substances the mantra text names. */
  materials?: readonly string[];
  /** Honest beta status - never "verified" or "priest-approved". */
  betaStatus?: PujaBetaStatus;
  /** Deliberately part of the shipped beta dataset. */
  includedInBeta?: boolean;
  /** Simple/Complete/optional classification (inferred, editable in review). */
  betaClassification?: string;
  classificationInferred?: boolean;
  /** Page references into the named source files. */
  sourceRefs?: readonly PujaSourceRef[];
  /** Telugu transcription recovery metadata (reviewer-only display). */
  teluguRecovery?: {
    sourcePage: number;
    confidence: "HIGH" | "MEDIUM";
    transcriptionCheckRequired: boolean;
    uncertainTokens: readonly { token: string; note: string }[];
  } | null;
}

export interface PujaPatriSelfReportOption {
  value: string;
  label: string;
}

export interface PujaPatriTeluguLeaf {
  index: number;
  deityNameTelugu: string;
  leafNameTelugu: string;
}

export interface PujaPatriDefinition {
  sectionTitle: string;
  reviewStatus: ReviewStatus;
  /** Shown in place of any leaf list or count until review is done. */
  reviewNotice: string;
  safetyNote: string;
  selfReportOptions: readonly PujaPatriSelfReportOption[];
  provenance: Provenance;
  /** The 21 recovered Telugu leaf names (no botanical identity). Family Beta
   * shows these; a substitution when leaves are unavailable is NOT claimed. */
  teluguLeaves?: readonly PujaPatriTeluguLeaf[];
  /** One-line note that no automatic flower/akshata substitution is offered. */
  substitutionNote?: string;
  /** Guided-step ids that actually involve the patri. The preparation screen
   * shows the patri section only when the chosen path contains one of these.
   * When undefined, the section always shows (backward compatible). */
  stepIds?: readonly string[];
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
 * The religious-claim half of post-puja guidance: whether, when, and how a
 * murti should be ritually concluded, kept, or immersed. This is a religious
 * claim like any step or material - it carries its own reviewStatus and
 * provenance and must pass canDisplayAsGuidance before a family/beta user
 * ever sees it. A reviewer may still see the candidate wording, labelled as
 * a candidate, with its provenance panel.
 */
export interface PujaPostGuidanceReligiousSection {
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  /** Detailed wording shown to reviewers when this content is not yet approved. */
  reviewNotice: string;
  choices: readonly PujaPostGuidanceChoice[];
  /** Reviewer-only note (a specific detail to confirm before release). */
  reviewerNote?: string;
}

/**
 * The practical-guidance half of post-puja guidance: environmental and
 * physical safety information (for example, avoiding a storm drain, removing
 * batteries) that makes no claim about the rite itself. Classified
 * independently from the religious section above with its own reviewStatus
 * (ordinarily GENERAL_GUIDANCE) - a section is never relabelled as practical
 * just to make an otherwise-gated religious claim visible.
 */
export interface PujaPostGuidancePracticalSection {
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  title: string;
  note: string;
  /** Telugu equivalents, shown when the guidance language is Telugu. */
  titleTe?: string;
  noteTe?: string;
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
  /** Telugu equivalents, shown when the guidance language is Telugu. */
  kickerTe?: string;
  screenTitleTe?: string;
  religious: PujaPostGuidanceReligiousSection;
  practical: PujaPostGuidancePracticalSection;
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

/** True when the chosen path contains at least one step that involves the
 * patri. If the puja does not declare `patri.stepIds`, the section always
 * shows (backward compatible). */
export function pujaPathIncludesPatri(
  puja: PujaDefinition,
  path: PujaPathId,
): boolean {
  const ids = puja.patri.stepIds;
  if (!ids || ids.length === 0) return true;
  const stepIds = new Set(
    stepsForPujaPath(puja, path).map((s) => s.candidateStepId ?? s.id),
  );
  return ids.some((id) => stepIds.has(id));
}

/** Whether a material belongs to a path: a platform requirement always does;
 * one tied to steps does when at least one of those steps is in the path; one
 * tied to no step does (backward compatible). */
export function pujaMaterialAppliesToPath(
  item: PujaMaterialDefinition,
  pathStepIds: ReadonlySet<string>,
): boolean {
  if (item.platformRequirement) return true;
  const ids = item.usedInStepIds ?? [];
  if (ids.length === 0) return true;
  return ids.some((id) => pathStepIds.has(id));
}

/** The materials for a selected path, split into the three checklist buckets. */
export function groupPujaMaterialsForPath(
  puja: PujaDefinition,
  path: PujaPathId,
): {
  needed: PujaMaterialDefinition[];
  optional: PujaMaterialDefinition[];
  traditionSpecific: PujaMaterialDefinition[];
} {
  const stepIds = new Set(
    stepsForPujaPath(puja, path).map((s) => s.candidateStepId ?? s.id),
  );
  const inPath = puja.materials.items.filter((item) =>
    pujaMaterialAppliesToPath(item, stepIds),
  );
  const byCategory = (categories: string[]) =>
    inPath.filter((item) => categories.includes(item.category));
  return {
    needed: byCategory(["REQUIRED", "COMMON"]),
    optional: byCategory(["OPTIONAL", "SOMETIMES"]),
    traditionSpecific: byCategory(["TRADITION_SPECIFIC"]),
  };
}

export function getPujaMaterialReadiness(
  puja: PujaDefinition,
  availableIds: readonly string[],
  path?: PujaPathId,
): PujaMaterialReadiness {
  const available = new Set(availableIds);
  const missingCommon: PujaMaterialDefinition[] = [];
  const missingOther: PujaMaterialDefinition[] = [];

  const pathStepIds = path
    ? new Set(stepsForPujaPath(puja, path).map((s) => s.candidateStepId ?? s.id))
    : null;
  const items = pathStepIds
    ? puja.materials.items.filter((item) => pujaMaterialAppliesToPath(item, pathStepIds))
    : puja.materials.items;

  for (const item of items) {
    if (available.has(item.id)) continue;
    if (item.category === "COMMON" || item.category === "REQUIRED") {
      missingCommon.push(item);
    } else {
      missingOther.push(item);
    }
  }

  return {
    total: items.length,
    available: items.filter((item) => available.has(item.id)).length,
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
