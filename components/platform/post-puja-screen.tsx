"use client";

// Optional post-puja guidance (for example, immersion or disposal guidance
// after Vinayaka Chavithi). This screen renders whatever
// PujaPostGuidanceDefinition a puja provides - it holds no Vinayaka-specific
// content or import, so the platform coordinator never needs to import a
// puja-specific screen for this step. A puja without any such guidance
// simply has `postPujaGuidance: null` and the coordinator skips this screen
// entirely.
//
// The religious section (whether/when/how a murti is concluded, kept, or
// immersed) and the practical section (environmental/physical safety) are
// independently gated - canDisplayAsGuidance decides the religious section
// exactly as it would a guided step, and it is never rendered just because
// the practical section next to it is always visible.

import { House, ShieldCheck } from "lucide-react";

import { canDisplayAsGuidance } from "@/lib/content/provenance";
import type { PujaPostGuidanceDefinition } from "@/lib/puja/types";

import { GatedNotice, ProvenancePanel } from "./review-display";

export function PostPujaScreen({
  guidance, home, reviewMode = false,
}: {
  guidance: PujaPostGuidanceDefinition;
  home: () => void;
  reviewMode?: boolean;
}) {
  const { religious, practical } = guidance;
  const religiousApproved = canDisplayAsGuidance(religious.reviewStatus, religious.provenance);
  // Same "owner-only candidate" rule as PujaScreen: a reviewer may preview
  // draft REVIEW_REQUIRED wording, clearly labelled, without it ever counting
  // as approved.
  const showReligiousCandidate =
    reviewMode && !religiousApproved && religious.reviewStatus === "REVIEW_REQUIRED";
  const mayShowReligious = religiousApproved || showReligiousCandidate;

  return (
    <div className="flow-content immersion-flow">
      <p className="kicker">{guidance.kicker}</p>
      <h1>{guidance.screenTitle}</h1>

      {showReligiousCandidate && (
        <div className="reviewer-banner">
          <ShieldCheck size={16} />
          <span>
            <strong>Private review build</strong> — the guidance below is a
            candidate, not approved guidance.
          </span>
        </div>
      )}

      {mayShowReligious ? (
        religious.choices.map((choice) => (
          <article className="choice-card" key={choice.title}>
            <h2>{choice.title}</h2>
            {choice.description && <p>{choice.description}</p>}
            {choice.steps && (
              <ol>
                {choice.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            )}
          </article>
        ))
      ) : (
        <GatedNotice reviewMode={reviewMode} detailedText={religious.reviewNotice} />
      )}

      {reviewMode && (
        <ProvenancePanel reviewStatus={religious.reviewStatus} provenance={religious.provenance} />
      )}
      {reviewMode && religious.reviewerNote && (
        <p className="info-note">{religious.reviewerNote}</p>
      )}

      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>{practical.title}</strong>
          <p>{practical.note}</p>
        </div>
      </div>
      {reviewMode && (
        <ProvenancePanel reviewStatus={practical.reviewStatus} provenance={practical.provenance} />
      )}

      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
    </div>
  );
}
