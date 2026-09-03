// Provenance for every religious claim the app might show.
//
// .claude/rules/sacred-content.md requires that a mantra or material ritual
// claim carries source, tradition, reviewer, review date, and content version.
// A bare label such as PRIEST_REVIEWED_PRACTICE is not enough on its own - it
// does not say which reviewer approved which exact statement. This module holds
// that record and the gate that decides whether a claim may be shown as
// guidance. The gate checks the evidence that each status actually requires,
// and blank strings never count.

import { type ReviewStatus } from "./review-status";

export type WrittenSourceStatus = "CONFIRMED" | "PENDING" | "ABSENT";

export interface Provenance {
  /** Named text or authority the claim comes from. */
  source: string | null;
  /** Exact location in that source (chapter, verse, page). */
  sourceReference: string | null;
  /** Name of the person who reviewed this exact statement. */
  reviewer: string | null;
  /** That reviewer's standing (for example "temple priest, Srisailam"). */
  reviewerQualification: string | null;
  /** ISO 8601 date the review was completed. */
  reviewDate: string | null;
  /** Version of this content record. Always present. */
  contentVersion: string;
  /** Which tradition or region this statement applies to. */
  traditionScope: string;
  /** Whether a written source has been confirmed for the claim. */
  writtenSourceStatus: WrittenSourceStatus;
  /**
   * For REGIONAL_CUSTOM: evidence that the practice is actually followed in the
   * stated region or community (who was consulted, where it is observed). Null
   * until that evidence is recorded.
   */
  practiceEvidence: string | null;
}

export const DRAFT_CONTENT_VERSION = "0.1.0-draft";

/**
 * Provenance for content that has been drafted but NOT reviewed. Every
 * attribution field is null on purpose so nothing can pass canDisplayAsGuidance.
 */
export function draftProvenance(overrides: Partial<Provenance> = {}): Provenance {
  return {
    source: null,
    sourceReference: null,
    reviewer: null,
    reviewerQualification: null,
    reviewDate: null,
    contentVersion: DRAFT_CONTENT_VERSION,
    traditionScope: "Telugu home practice (draft, unverified)",
    writtenSourceStatus: "PENDING",
    practiceEvidence: null,
    ...overrides,
  };
}

/** True only for a non-null, non-blank string. */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** A named reviewer and a review date, both present and non-blank. */
export function hasReviewer(provenance: Provenance): boolean {
  return hasText(provenance.reviewer) && hasText(provenance.reviewDate);
}

/**
 * Whether a piece of content may be shown to a normal user as guidance.
 *
 *   - GENERAL_GUIDANCE is practical, non-religious help (fire safety, "sit where
 *     you can reach things"). It makes no religious claim, so it is always shown.
 *   - Every religious claim must carry the evidence its status requires. A label
 *     alone is never enough, and a blank string is not evidence.
 *
 * The requirements match docs/PRODUCT_PRINCIPLES.md "Minimum evidence by status".
 */
export function canDisplayAsGuidance(
  reviewStatus: ReviewStatus,
  provenance: Provenance,
): boolean {
  if (reviewStatus === "GENERAL_GUIDANCE") return true;

  switch (reviewStatus) {
    case "VERIFIED":
      return (
        hasText(provenance.source) &&
        hasText(provenance.sourceReference) &&
        hasText(provenance.reviewer) &&
        hasText(provenance.reviewerQualification) &&
        hasText(provenance.reviewDate) &&
        hasText(provenance.contentVersion) &&
        hasText(provenance.traditionScope) &&
        provenance.writtenSourceStatus === "CONFIRMED"
      );

    case "PRIEST_REVIEWED_PRACTICE":
      return (
        hasText(provenance.reviewer) &&
        hasText(provenance.reviewerQualification) &&
        hasText(provenance.reviewDate) &&
        hasText(provenance.contentVersion) &&
        hasText(provenance.traditionScope)
      );

    case "REGIONAL_CUSTOM":
      return (
        hasText(provenance.reviewer) &&
        hasText(provenance.reviewerQualification) &&
        hasText(provenance.reviewDate) &&
        hasText(provenance.contentVersion) &&
        hasText(provenance.traditionScope) &&
        hasText(provenance.practiceEvidence)
      );

    case "REVIEW_REQUIRED":
    default:
      return false;
  }
}
