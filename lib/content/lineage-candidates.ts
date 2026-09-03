// Shared shape and rules for the lineage candidate lists.
//
// The Veda, Sutra, and Sampradaya lists live in separate modules
// (veda-candidates.ts, sutra-candidates.ts, sampradaya-candidates.ts). They
// exist only to help a user RECOGNISE a value they already know, as a searchable
// select. They are NOT authoritative and NOT complete: every list is
// REVIEW_REQUIRED until a reviewer approves its names, spelling, scope, and
// completeness. Each field always offers "My value is not listed" so the list is
// never a constraint, and selecting a value never touches any other field.

import type { ReviewStatus } from "./review-status";

export interface LineageCandidate {
  /** The exact value stored if the user picks this option. */
  value: string;
  /** Optional plain-language note, e.g. a common alternate spelling. */
  note?: string;
}

/** Every candidate list is unreviewed. */
export const LINEAGE_CANDIDATE_REVIEW_STATUS: ReviewStatus = "REVIEW_REQUIRED";

/**
 * Sentinel option value for "My value is not listed". Not a real lineage name,
 * so it cannot collide with a candidate.
 */
export const NOT_LISTED_VALUE = "__lineage_not_listed__";

/** The label shown on the "not listed" option. */
export const NOT_LISTED_LABEL = "My value is not listed";

export function lineageCandidateDisclaimer(label: string): string {
  return (
    `This ${label} list is still being reviewed for its names, spelling, scope, ` +
    `and completeness. It is not complete or authoritative. If your ${label} is ` +
    `not listed, choose “${NOT_LISTED_LABEL}” and type it exactly as you ` +
    `know it.`
  );
}
