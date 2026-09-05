"use client";

// Optional post-puja guidance (for example, immersion or disposal guidance
// after Vinayaka Chavithi). This screen renders whatever
// PujaPostGuidanceDefinition a puja provides - it holds no Vinayaka-specific
// content or import, so the platform coordinator never needs to import a
// puja-specific screen for this step. A puja without any such guidance
// simply has `postPujaGuidance: null` and the coordinator skips this screen
// entirely.

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
  const approved = canDisplayAsGuidance(guidance.reviewStatus, guidance.provenance);

  return (
    <div className="flow-content immersion-flow">
      <p className="kicker">{guidance.kicker}</p>
      <h1>{guidance.screenTitle}</h1>
      {!approved && <GatedNotice reviewMode={reviewMode} detailedText={guidance.reviewNotice} />}
      {guidance.choices.map((choice) => (
        <article className="choice-card" key={choice.title}>
          <h2>{choice.title}</h2>
          {choice.description && <p>{choice.description}</p>}
          {choice.steps && (
            <ol>
              {choice.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          )}
        </article>
      ))}
      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>{guidance.safetyNoteTitle}</strong>
          <p>{guidance.safetyNote}</p>
        </div>
      </div>
      {reviewMode && (
        <ProvenancePanel reviewStatus={guidance.reviewStatus} provenance={guidance.provenance} />
      )}
      {reviewMode && guidance.reviewerNote && (
        <p className="info-note">{guidance.reviewerNote}</p>
      )}
      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
    </div>
  );
}
