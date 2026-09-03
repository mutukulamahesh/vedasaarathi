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

import { AWAITING_REVIEW_NOTICE } from "./review-status";
import { draftProvenance, type Provenance } from "./provenance";

export const PATRI_SECTION_TITLE = "Patri (leaves)";

/** Shown in place of any list or "21 leaves" statement until review is done. */
export const PATRI_REVIEW_NOTICE = AWAITING_REVIEW_NOTICE;

export const PATRI_SAFETY_NOTE =
  "Only pick or offer a leaf you can clearly identify and know to be safe. " +
  "Never use an unknown or unsafe plant. Do not use common kitchen herbs as a " +
  "substitute just because they are easy to find.";

export type PatriSelfReport = "HAVE" | "NONE" | "UNSURE";

export const PATRI_SELF_REPORT_VALUES: readonly PatriSelfReport[] = [
  "HAVE",
  "NONE",
  "UNSURE",
];

export interface PatriSelfReportOption {
  value: PatriSelfReport;
  label: string;
}

export const PATRI_SELF_REPORT_OPTIONS: readonly PatriSelfReportOption[] = [
  { value: "HAVE", label: "I have some traditional patri" },
  { value: "NONE", label: "I do not have patri" },
  { value: "UNSURE", label: "I am not sure what these leaves are" },
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
