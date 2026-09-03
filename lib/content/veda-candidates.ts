// Candidate values for the Veda field, shown as a searchable select when the
// user has answered KNOWN. Draft and unverified: see ./lineage-candidates.
//
// This is a recognition aid, not a ruling. The list, its spelling, and its
// completeness are REVIEW_REQUIRED. "My value is not listed" is always offered.

import { draftProvenance, type Provenance } from "./provenance";
import {
  lineageCandidateDisclaimer, type LineageCandidate,
} from "./lineage-candidates";

export const VEDA_CANDIDATES: readonly LineageCandidate[] = [
  { value: "Rigveda" },
  {
    value: "Yajurveda",
    note: "sometimes given as Krishna (Taittiriya) or Shukla Yajurveda",
  },
  { value: "Samaveda" },
  { value: "Atharvaveda" },
];

export const VEDA_CANDIDATES_DISCLAIMER = lineageCandidateDisclaimer("Veda");

export const VEDA_CANDIDATES_PROVENANCE: Provenance = draftProvenance({
  traditionScope: "Veda candidate list for lineage entry (draft, unverified)",
});
