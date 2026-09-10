// The presentation distinction for the Family Beta.
//
// Product decision (owner-confirmed, see .claude/rules/sacred-content.md and
// docs/PRODUCT_PRINCIPLES.md): the complete sourced Vinayaka candidate is made
// available for beta testing BEFORE priest approval. That does NOT change any
// content's review status, provenance, transcription confidence, or the
// reviewer workflow - every candidate step stays REVIEW_REQUIRED and locked.
// It only introduces a second, explicitly-labelled way a piece of content can
// be shown:
//
//   1. Approved guidance      -> canDisplayAsGuidance()  (unchanged)
//   2. Sourced beta candidate -> canDisplayAsBetaCandidate()  (this file)
//   3. Unavailable content    -> neither
//
// canDisplayAsGuidance() is NOT weakened. It still means "approved religious
// guidance" and still returns false for REVIEW_REQUIRED. A beta candidate is
// never described as verified or priest-approved anywhere in the UI.

import { hasText, type Provenance } from "./provenance";

/**
 * How a piece of beta content may be presented.
 *  - APPROVED_GUIDANCE:     already passes canDisplayAsGuidance().
 *  - SOURCED_BETA_CANDIDATE: unreviewed, but from an identified source with an
 *                            exact locator - shown in the labelled beta.
 *  - WITHHELD_FOR_RIGHTS:   real content whose text cannot be shown yet
 *                            (e.g. the Vrata Katha) - stays unavailable.
 *  - MISSING_SOURCE:        no identified source / invented - stays unavailable.
 */
export type BetaStatus =
  | "APPROVED_GUIDANCE"
  | "SOURCED_BETA_CANDIDATE"
  | "WITHHELD_FOR_RIGHTS"
  | "MISSING_SOURCE";

export const BETA_STATUSES: readonly BetaStatus[] = [
  "APPROVED_GUIDANCE",
  "SOURCED_BETA_CANDIDATE",
  "WITHHELD_FOR_RIGHTS",
  "MISSING_SOURCE",
];

/** The single, concise beta notice shown once, on the prepare screen before
 * the puja begins. Kept short on purpose - it is NOT repeated per step, and it
 * does not carry internal review-process wording. */
export const BETA_NOTICE =
  "VedaSaarathi Beta — this puja guide is built from the listed traditional " +
  "sources and is still being improved. Please tell us about anything that " +
  "looks wrong.";

/* Distinct honest states shown where content cannot be displayed. Each cause
 * gets its own message - the rights-withheld line is NEVER used as a generic
 * fallback. */

/** WITHHELD_FOR_RIGHTS: the text exists but cannot be published yet. */
export const RIGHTS_WITHHELD_NOTICE =
  "Vrata Katha is not included in this beta because publication rights are " +
  "still being confirmed.";

/** MISSING_SOURCE: no usable source is recorded for this content. */
export const MISSING_SOURCE_NOTICE =
  "This part of the puja is not available: no usable source is recorded for it.";

/** Honest beta status, but the source / page / version metadata is incomplete. */
export const INVALID_CANDIDATE_NOTICE =
  "This part of the puja is not available in this build.";

export type BetaUnavailableReason =
  | "WITHHELD_FOR_RIGHTS"
  | "MISSING_SOURCE"
  | "INVALID_METADATA";

export interface BetaCandidateContent {
  betaStatus: BetaStatus;
  /** Deliberately part of the shipped beta dataset (not an accidental leak). */
  includedInBeta: boolean;
  /** An identified source id (a PDF id, or an online source id). */
  sourceId: string | null;
  /** Exact PDF page number, when the locator is a PDF page. */
  sourcePage: number | null;
  /** Exact online section reference, when the locator is online. */
  onlineSection: string | null;
  /** Content-version string for this record. */
  contentVersion: string | null;
}

/**
 * Whether a sourced beta candidate may be shown in the explicitly-labelled
 * Family Beta. This is a SEPARATE gate from canDisplayAsGuidance() and must
 * never be used to present content as approved.
 *
 * A beta candidate may display only when:
 *  - it is intentionally included in the beta dataset,
 *  - it has an identified source,
 *  - it has an exact PDF page or online section,
 *  - its content version is present,
 *  - it carries an honest beta status (SOURCED_BETA_CANDIDATE or
 *    APPROVED_GUIDANCE),
 *  - it is NOT WITHHELD_FOR_RIGHTS or MISSING_SOURCE.
 *
 * `provenance` is optional and only used to fill a missing source /
 * contentVersion from a full Provenance record; it never relaxes the checks.
 */
export function canDisplayAsBetaCandidate(
  content: BetaCandidateContent,
  provenance?: Pick<Provenance, "source" | "contentVersion"> | null,
): boolean {
  if (!content.includedInBeta) return false;

  if (content.betaStatus === "WITHHELD_FOR_RIGHTS") return false;
  if (content.betaStatus === "MISSING_SOURCE") return false;
  if (
    content.betaStatus !== "SOURCED_BETA_CANDIDATE" &&
    content.betaStatus !== "APPROVED_GUIDANCE"
  ) {
    return false;
  }

  const hasSource = hasText(content.sourceId) || hasText(provenance?.source ?? null);
  if (!hasSource) return false;

  const hasLocator =
    (typeof content.sourcePage === "number" && Number.isFinite(content.sourcePage)) ||
    hasText(content.onlineSection);
  if (!hasLocator) return false;

  const hasVersion =
    hasText(content.contentVersion) || hasText(provenance?.contentVersion ?? null);
  if (!hasVersion) return false;

  return true;
}

/** Convenience: is this content genuinely unavailable (neither gate passes)? */
export function isBetaUnavailable(
  content: BetaCandidateContent,
  reviewStatusApproved: boolean,
): boolean {
  return !reviewStatusApproved && !canDisplayAsBetaCandidate(content);
}

/**
 * Why a piece of content cannot be shown - or null when it can. Approved
 * content (`reviewStatusApproved`) always returns null. Otherwise the reason is
 * the specific one, so the UI can render a distinct honest message instead of
 * reusing the Vrata Katha rights notice for everything.
 */
export function betaUnavailableReason(
  content: BetaCandidateContent,
  provenance?: Pick<Provenance, "source" | "contentVersion"> | null,
  reviewStatusApproved = false,
): BetaUnavailableReason | null {
  if (reviewStatusApproved) return null;
  if (content.betaStatus === "WITHHELD_FOR_RIGHTS") return "WITHHELD_FOR_RIGHTS";
  if (content.betaStatus === "MISSING_SOURCE") return "MISSING_SOURCE";
  if (canDisplayAsBetaCandidate(content, provenance)) return null;
  // An honest beta status, but the source / locator / version is incomplete.
  return "INVALID_METADATA";
}

export function betaUnavailableNotice(reason: BetaUnavailableReason): string {
  switch (reason) {
    case "WITHHELD_FOR_RIGHTS":
      return RIGHTS_WITHHELD_NOTICE;
    case "MISSING_SOURCE":
      return MISSING_SOURCE_NOTICE;
    case "INVALID_METADATA":
      return INVALID_CANDIDATE_NOTICE;
  }
}
