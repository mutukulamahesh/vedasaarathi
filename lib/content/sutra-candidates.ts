// Candidate values for the Sutra field, shown as a searchable select when the
// user has answered KNOWN. Draft and unverified: see ./lineage-candidates.
//
// This is a recognition aid, not a ruling. The names, their spelling, the scope
// (which Vedic schools this should cover), and the completeness of this list are
// all REVIEW_REQUIRED. "My value is not listed" is always offered.

import { draftProvenance, type Provenance } from "./provenance";
import {
  LINEAGE_CANDIDATE_REVIEW_STATUS, lineageCandidateDisclaimer,
  type LineageCandidate,
} from "./lineage-candidates";
import type { ReviewStatus } from "./review-status";

export const SUTRA_CANDIDATES: readonly LineageCandidate[] = [
  { value: "Apastamba" },
  { value: "Baudhayana", note: "also written Bodhayana" },
  { value: "Ashvalayana" },
  { value: "Hiranyakeshi", note: "also written Hiranyakesi" },
  { value: "Katyayana" },
  { value: "Drahyayana" },
  { value: "Bharadwaja" },
  { value: "Vaikhanasa" },
];

export const SUTRA_CANDIDATES_DISCLAIMER = lineageCandidateDisclaimer("Sutra");

export const SUTRA_CANDIDATES_REVIEW_STATUS: ReviewStatus =
  LINEAGE_CANDIDATE_REVIEW_STATUS;

export const SUTRA_CANDIDATES_PROVENANCE: Provenance = draftProvenance({
  traditionScope: "Sutra candidate list for lineage entry (draft, unverified)",
});
