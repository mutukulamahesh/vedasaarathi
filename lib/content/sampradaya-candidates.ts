// Candidate values for the Sampradaya field, shown as a searchable select when
// the user has answered KNOWN. Draft and unverified: see ./lineage-candidates.
//
// This is a recognition aid, not a ruling. The names, their spelling, the scope,
// and the completeness of this list are all REVIEW_REQUIRED. Broad school names
// only; sub-lineages are out of scope for the draft. "My value is not listed" is
// always offered.

import { draftProvenance, type Provenance } from "./provenance";
import {
  lineageCandidateDisclaimer, type LineageCandidate,
} from "./lineage-candidates";

export const SAMPRADAYA_CANDIDATES: readonly LineageCandidate[] = [
  { value: "Smarta" },
  { value: "Sri Vaishnava" },
  { value: "Madhva", note: "also written Madhwa" },
  { value: "Shaiva" },
  { value: "Shakta" },
  { value: "Gaudiya Vaishnava" },
];

export const SAMPRADAYA_CANDIDATES_DISCLAIMER =
  lineageCandidateDisclaimer("Sampradaya");

export const SAMPRADAYA_CANDIDATES_PROVENANCE: Provenance = draftProvenance({
  traditionScope: "Sampradaya candidate list for lineage entry (draft, unverified)",
});
