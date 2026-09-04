"use client";

// Post-puja immersion guidance for a Vinayaka Chavithi murti. This procedure
// (clay Ganesha idol, Udvasana) is specific to this one puja - it is not part
// of the generic PujaDefinition, since immersion is not a modeled field there
// yet, so this screen lives under the Vinayaka service rather than the
// platform's generic screens.

import { House, Info, ShieldCheck } from "lucide-react";

import { AwaitingReview } from "@/components/platform/review-display";

export function ImmersionScreen({ home, reviewMode = false }: { home: () => void; reviewMode?: boolean }) {
  return (
    <div className="flow-content immersion-flow">
      <p className="kicker">AFTER THE PUJA</p>
      <h1>Immersion or keeping the murti</h1>
      {reviewMode ? (
        <p className="reviewer-banner"><ShieldCheck size={16} /> Religious Udvasana wording is awaiting review. The safety guidance below is practical guidance.</p>
      ) : <AwaitingReview text="Udvasana wording is awaiting religious review. Practical immersion safety is available below." />}
      <article className="choice-card"><h2>Keeping a picture or permanent murti</h2><p>Do not immerse it. Keep it respectfully in your puja space. This app does not ask you to discard a permanent metal, stone, painted or electronic item.</p></article>
      <article className="choice-card"><h2>Natural, unpainted clay murti</h2><ol><li>Choose a bucket or tub large enough for the murti.</li><li>Remove plastic, foil, batteries, fabric and other decorations.</li><li>When you are ready to immerse it, place the murti gently in clean water.</li><li>Let natural clay soften. Reuse the settled clay in soil only when its ingredients are safe for plants.</li></ol></article>
      <div className="safety-note"><ShieldCheck size={19} /><div><strong>Protect people and local water</strong><p>Never use a storm drain. Do not enter unsafe water or leave decorations behind. Follow city and venue rules. If the murti is painted or its material is unknown, ask the seller or use a local temple collection instead of home immersion.</p></div></div>
      {reviewMode && <p className="info-note"><Info size={16} /> Candidate note for the reviewer: the supplied procedure places Udvasana when the temporary murti is concluded and moved. Confirm the timing and exact action before release.</p>}
      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
    </div>
  );
}
