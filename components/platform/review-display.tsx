"use client";

// Shared content-gate and review-status display. GatedContent's decision is
// the actual safety gate (canDisplayAsGuidance) and is never affected by
// presentation mode. Everything else here is chrome only: REVIEWER mode
// shows review status, source/provenance, and draft warnings throughout;
// FAMILY_BETA shows one short, plain message in their place and one
// app-level beta notice. Neither mode changes a single reviewStatus or
// provenance value, and content that fails the gate is never shown outside
// REVIEWER's explicit, labelled candidate view.

import { Info, ShieldCheck } from "lucide-react";

import { canDisplayAsGuidance, hasText, type Provenance } from "@/lib/content/provenance";
import { AWAITING_REVIEW_NOTICE, REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/content/review-status";

export function ReviewChip({ status }: { status: ReviewStatus }) {
  return (
    <span className="review-chip" data-status={status}>
      {REVIEW_STATUS_LABEL[status]}
    </span>
  );
}

export function AwaitingReview({ text = AWAITING_REVIEW_NOTICE }: { text?: string }) {
  return (
    <p className="awaiting-review">
      <Info size={15} /> {text}
    </p>
  );
}

/**
 * The only message a family/beta user ever sees for content that has not
 * passed review. It deliberately never repeats internal review-process
 * wording ("REVIEW_REQUIRED", "awaiting religious review", "draft candidate
 * content", "stays locked until a reviewer approves") - a reviewer sees that
 * detail instead, via GatedNotice's reviewMode branch and ProvenancePanel.
 */
export const BETA_UNAVAILABLE_MESSAGE =
  "This part of the puja is not available in the current beta.";

/**
 * The fallback shown wherever content fails canDisplayAsGuidance, or wherever
 * a screen has its own always-pending notice (patri, post-puja guidance).
 * REVIEWER sees the detailed review-status wording; FAMILY_BETA sees the one
 * short, plain beta message instead. The gate itself - whether the real
 * content shows at all - is identical in both modes; only this message does.
 */
export function GatedNotice({
  reviewMode, detailedText,
}: {
  reviewMode: boolean;
  detailedText?: string;
}) {
  if (reviewMode) return <AwaitingReview text={detailedText} />;
  return (
    <p className="beta-unavailable">
      <Info size={15} /> {BETA_UNAVAILABLE_MESSAGE}
    </p>
  );
}

/** Show `children` only when the claim has passed review; otherwise the
 * mode-appropriate notice (see GatedNotice). canDisplayAsGuidance's decision
 * never changes with reviewMode - only the fallback wording does. */
export function GatedContent({
  reviewStatus, provenance, reviewMode, fallbackText, children,
}: {
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  reviewMode: boolean;
  fallbackText?: string;
  children: React.ReactNode;
}) {
  if (canDisplayAsGuidance(reviewStatus, provenance)) return <>{children}</>;
  return <GatedNotice reviewMode={reviewMode} detailedText={fallbackText} />;
}

/** The single app-level notice shown in FAMILY_BETA mode. */
export function BetaNotice() {
  return (
    <p className="beta-notice">
      <ShieldCheck size={15} /> VedaSaarathi is in beta. Some ritual wording and
      materials are still being reviewed.
    </p>
  );
}

const NOT_PROVIDED = "Not provided";

function writtenSourceStatusLabel(status: Provenance["writtenSourceStatus"] | undefined): string {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "ABSENT") return "Absent";
  if (status === "PENDING") return "Pending";
  return NOT_PROVIDED;
}

/**
 * The real provenance record behind a review-status label, for REVIEWER mode
 * only - FAMILY_BETA must never render this. Every field is shown exactly as
 * recorded; a missing field reads "Not provided" (or "Pending" for
 * writtenSourceStatus) rather than inventing or guessing a value. Includes
 * the review-status chip itself, so a caller that used to render a bare
 * ReviewChip can use this in its place without losing that signal.
 */
export function ProvenancePanel({
  reviewStatus, provenance,
}: {
  reviewStatus?: ReviewStatus;
  provenance: Partial<Provenance>;
}) {
  const field = (label: string, value: string | null | undefined) => (
    <div className="provenance-row">
      <span>{label}</span>
      <strong>{hasText(value) ? value : NOT_PROVIDED}</strong>
    </div>
  );

  return (
    <div className="provenance-panel">
      {reviewStatus && <ReviewChip status={reviewStatus} />}
      <h4>Review information</h4>
      {field("Source", provenance.source)}
      {field("Exact source reference", provenance.sourceReference)}
      {field("Reviewer", provenance.reviewer)}
      {field("Reviewer qualification", provenance.reviewerQualification)}
      {field("Review date", provenance.reviewDate)}
      {field("Content version", provenance.contentVersion)}
      {field("Tradition scope", provenance.traditionScope)}
      <div className="provenance-row">
        <span>Written-source status</span>
        <strong>{writtenSourceStatusLabel(provenance.writtenSourceStatus)}</strong>
      </div>
      {field("Regional-practice evidence", provenance.practiceEvidence)}
    </div>
  );
}
