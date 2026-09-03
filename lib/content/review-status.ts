// Authority labels for anything the app shows about a ritual or its materials.
//
// The four canonical values come from .claude/rules/sacred-content.md and are the
// ONLY labels allowed on a religious claim (a mantra, a material ritual claim, a
// substitution). GENERAL_GUIDANCE is deliberately separate: it marks plain
// practical help ("sit where you can reach everything") that makes no religious
// claim, so it must never be mistaken for reviewed sacred content.

export type ReviewStatus =
  | "VERIFIED"
  | "PRIEST_REVIEWED_PRACTICE"
  | "REGIONAL_CUSTOM"
  | "REVIEW_REQUIRED"
  | "GENERAL_GUIDANCE";

/** Canonical sacred-content labels. A religious claim must use one of these. */
export const SACRED_REVIEW_STATUSES: readonly ReviewStatus[] = [
  "VERIFIED",
  "PRIEST_REVIEWED_PRACTICE",
  "REGIONAL_CUSTOM",
  "REVIEW_REQUIRED",
];

/** Short plain-language label for a first-time reader. */
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  VERIFIED: "Checked against a written source",
  PRIEST_REVIEWED_PRACTICE: "Priest-reviewed practice",
  REGIONAL_CUSTOM: "Regional or family custom",
  REVIEW_REQUIRED: "Still being reviewed",
  GENERAL_GUIDANCE: "Practical help, not a religious rule",
};

/** One sentence explaining what the label means. */
export const REVIEW_STATUS_NOTE: Record<ReviewStatus, string> = {
  VERIFIED:
    "A named source and a reviewer have confirmed this wording.",
  PRIEST_REVIEWED_PRACTICE:
    "A priest we consulted accepts this practice. The exact written source is still being confirmed.",
  REGIONAL_CUSTOM:
    "This is followed in some regions or families. It is not presented as a rule for everyone.",
  REVIEW_REQUIRED:
    "A qualified reviewer has not approved this yet, so the app does not show it as final guidance.",
  GENERAL_GUIDANCE:
    "This is everyday practical advice to help you perform the puja. It is not a religious instruction.",
};

/** REVIEW_REQUIRED content must never be presented as approved production guidance. */
export function isReleasable(status: ReviewStatus): boolean {
  return status !== "REVIEW_REQUIRED";
}

/**
 * The only text allowed in place of a religious claim that has not passed
 * review. See canDisplayAsGuidance() in ./provenance.
 */
export const AWAITING_REVIEW_NOTICE =
  "This section is awaiting religious review. No recommendation is available yet.";
