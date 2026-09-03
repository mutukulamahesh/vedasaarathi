// Candidate values for the Veda field, shown as a searchable select when the
// user has answered KNOWN. Draft and unverified: see ./lineage-candidates.
//
// This is a recognition aid, not a ruling. The list, its spelling, and its
// completeness are REVIEW_REQUIRED. "My value is not listed" is always offered.
//
// Krishna and Shukla Yajurveda are listed as distinct selectable values because
// a household usually knows which one it follows. "Taittiriya" is NOT listed
// here: it names a Shakha (recension), not the Veda, and belongs in a future
// Shakha field. Shakha is deliberately not implemented in this task.

import { draftProvenance, type Provenance } from "./provenance";
import {
  LINEAGE_CANDIDATE_REVIEW_STATUS, lineageCandidateDisclaimer,
  type LineageCandidate,
} from "./lineage-candidates";
import type { ReviewStatus } from "./review-status";

export const VEDA_CANDIDATES: readonly LineageCandidate[] = [
  { value: "Rigveda" },
  { value: "Krishna Yajurveda" },
  { value: "Shukla Yajurveda" },
  { value: "Samaveda" },
  { value: "Atharvaveda" },
];

export const VEDA_CANDIDATES_DISCLAIMER = lineageCandidateDisclaimer("Veda");

export const VEDA_CANDIDATES_REVIEW_STATUS: ReviewStatus =
  LINEAGE_CANDIDATE_REVIEW_STATUS;

export const VEDA_CANDIDATES_PROVENANCE: Provenance = draftProvenance({
  traditionScope: "Veda candidate list for lineage entry (draft, unverified)",
});
