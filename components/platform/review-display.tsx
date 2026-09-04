"use client";

// Shared content-gate and review-status display. GatedContent's decision is
// the actual safety gate (canDisplayAsGuidance) and is never affected by
// presentation mode. ReviewChip and BetaNotice are chrome only: REVIEWER mode
// shows review status throughout, FAMILY_BETA shows one app-level beta notice
// instead of repeating internal review labels through the worship flow.
// Neither mode changes a single reviewStatus or provenance value.

import { Info, ShieldCheck } from "lucide-react";

import { canDisplayAsGuidance, type Provenance } from "@/lib/content/provenance";
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

/** Show `children` only when the claim has passed review; otherwise the notice. */
export function GatedContent({
  reviewStatus, provenance, children,
}: {
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  children: React.ReactNode;
}) {
  if (canDisplayAsGuidance(reviewStatus, provenance)) return <>{children}</>;
  return <AwaitingReview />;
}

/**
 * The single app-level notice shown in FAMILY_BETA mode. It stands in for the
 * review-status chips and reviewer banners hidden throughout the worship
 * flow in this mode - a family beta tester sees this once, not repeated
 * "still being reviewed" labels on every material and step.
 */
export function BetaNotice() {
  return (
    <p className="beta-notice">
      <ShieldCheck size={15} /> VedaSaarathi is in beta. Some ritual wording and
      materials are still being reviewed.
    </p>
  );
}
