// The patri (leaves) section for the Vinayaka Chavithi preparation journey.
//
// The traditional practice speaks of 21 kinds of leaves (patri). The exact list
// and its written source are NOT established, and the priest's provided list has
// not been reconciled with what this module would show. So this module offers
// NO leaf names at all. A user could reasonably read any named, selectable leaf
// as an approved offering, and we cannot stand behind that yet.
//
// Instead the user self-reports what they already have, and always sees a safety
// warning. Common kitchen leaves are never suggested just because they are easy
// to find.

import { AWAITING_REVIEW_NOTICE, type ReviewStatus } from "./review-status";
import { draftProvenance, type Provenance } from "./provenance";

export const PATRI_SECTION_TITLE = "Patri (leaves)";
export const PATRI_SECTION_TITLE_TE = "పత్రి (ఆకులు)";

/** This section has no reviewer-approved leaf list at all, so it is always
 * REVIEW_REQUIRED - there is no pending change that would move it forward. */
export const PATRI_REVIEW_STATUS: ReviewStatus = "REVIEW_REQUIRED";

/** Shown in place of any list or "21 leaves" statement until review is done. */
export const PATRI_REVIEW_NOTICE = AWAITING_REVIEW_NOTICE;

export const PATRI_SAFETY_NOTE =
  "Only pick or offer a leaf you can clearly identify and know to be safe. " +
  "Never use an unknown or unsafe plant. Do not use common kitchen herbs as a " +
  "substitute just because they are easy to find.";
export const PATRI_SAFETY_NOTE_TE =
  "మీరు స్పష్టంగా గుర్తించగలిగి, సురక్షితమని తెలిసిన ఆకును మాత్రమే కోయండి లేదా " +
  "సమర్పించండి. తెలియని లేదా సురక్షితం కాని మొక్కను ఎప్పుడూ వాడవద్దు. సులభంగా " +
  "దొరుకుతాయని సాధారణ వంటింటి మూలికలను ప్రత్యామ్నాయంగా వాడవద్దు.";

export type PatriSelfReport = "HAVE" | "NONE" | "UNSURE";

export const PATRI_SELF_REPORT_VALUES: readonly PatriSelfReport[] = [
  "HAVE",
  "NONE",
  "UNSURE",
];

export interface PatriSelfReportOption {
  value: PatriSelfReport;
  label: string;
  labelTe: string;
}

export const PATRI_SELF_REPORT_OPTIONS: readonly PatriSelfReportOption[] = [
  { value: "HAVE", label: "I have some traditional patri", labelTe: "నా దగ్గర కొన్ని సాంప్రదాయ పత్రి ఆకులు ఉన్నాయి" },
  { value: "NONE", label: "I do not have patri", labelTe: "నా దగ్గర పత్రి లేదు" },
  { value: "UNSURE", label: "I am not sure what these leaves are", labelTe: "ఈ ఆకులు ఏమిటో నాకు ఖచ్చితంగా తెలియదు" },
];

export const PATRI_PROVENANCE: Provenance = draftProvenance({
  traditionScope: "Telugu Vinayaka Chavithi patri practice (draft, unverified)",
});

/** A missing or unsure patri answer never stops the puja. */
export const MISSING_PATRI_BLOCKS_PUJA = false;

export function isValidPatriSelfReport(
  value: unknown,
): value is PatriSelfReport {
  return (
    typeof value === "string" &&
    PATRI_SELF_REPORT_VALUES.includes(value as PatriSelfReport)
  );
}
