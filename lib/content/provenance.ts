// Provenance for every religious claim the app might show.
//
// .claude/rules/sacred-content.md requires that a mantra or material ritual
// claim carries source, tradition, reviewer, review date, and content version.
// A bare label such as PRIEST_REVIEWED_PRACTICE is not enough on its own - it
// does not say which reviewer approved which exact statement. This module adds
// that record and the gate that decides whether a claim may be shown as
// guidance to a normal user.

import { isReleasable, type ReviewStatus } from "./review-status";

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
    ...overrides,
  };
}

/** A claim is attributable only with a named reviewer and a review date. */
export function hasReviewer(provenance: Provenance): boolean {
  return provenance.reviewer !== null && provenance.reviewDate !== null;
}

/**
 * Whether a piece of content may be shown to a normal user as guidance.
 *
 *   - GENERAL_GUIDANCE is practical, non-religious help (fire safety, "sit where
 *     you can reach things"). It makes no religious claim, so it is always shown.
 *   - Every religious claim must have a releasable review status AND a named
 *     reviewer with a date. Until then the UI shows only an "awaiting review"
 *     notice in its place.
 */
export function canDisplayAsGuidance(
  reviewStatus: ReviewStatus,
  provenance: Provenance,
): boolean {
  if (reviewStatus === "GENERAL_GUIDANCE") return true;
  return isReleasable(reviewStatus) && hasReviewer(provenance);
}
