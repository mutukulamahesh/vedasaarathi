"use client";

// Concluding (Udvasana) + post-puja guidance for a puja that provides it.
//
// Three clearly separated parts, all family-visible:
//   1. the SOURCED Udvasana — when it is performed, what to keep ready, what
//      the family physically does, and the verse (the same content that is a
//      step in the Complete journey; no review / development wording, no
//      priest-approval claim);
//   2. keeping the murti vs immersing it — a decision about the murti's
//      material, not a claim about the rite;
//   3. environmental + physical safety — kept separate from the religious
//      guidance.
// The one genuinely unresolved detail (exact timing vs immersion, exact
// gesture) is shown ONLY in Reviewer mode, with its provenance.

import { House, Info, Sparkles, ShieldCheck } from "lucide-react";

import type { PujaPostGuidanceDefinition } from "@/lib/puja/types";

import { ProvenancePanel } from "./review-display";

/* The concluding block is the SAME sourced beta candidate that appears as the
 * `udvasana` step in the Complete journey (Nanduri Lyrics p.11 — verse + timing,
 * no gesture). It is shown to families only when it actually carries an
 * identified source (`sourceRef`) and the recovered verse — a structural gate,
 * not a source-code comment that waves content through. Anything genuinely
 * unresolved (same-day vs held-murti timing, whether to teach a gesture) stays
 * in the reviewMode-only section with its provenance panel; no priest approval
 * is claimed anywhere. */

const L = {
  EN: {
    home: "Return home",
    when: "When it is done",
    keepReady: "What to keep ready",
    whatYouDo: "What the family does",
    showVerse: "Show the Udvasana verse",
    verseNote: "Recovered from the source; a computer transcription, not a priest's recording.",
    keepingVsImmersion: "Keeping the murti or immersing it",
    safety: "Protect people and local water",
    source: "Source",
  },
  TE: {
    home: "హోమ్‌కు తిరిగి వెళ్ళండి",
    when: "ఎప్పుడు చేస్తారు",
    keepReady: "ఏమి సిద్ధంగా ఉంచాలి",
    whatYouDo: "కుటుంబం ఏమి చేస్తుంది",
    showVerse: "ఉద్వాసన శ్లోకం చూపించు",
    verseNote: "మూలం నుండి తీసినది; కంప్యూటర్ లిప్యంతరీకరణ, పురోహితుని రికార్డింగ్ కాదు.",
    keepingVsImmersion: "విగ్రహాన్ని ఉంచుకోవడం లేదా నిమజ్జనం",
    safety: "మనుషులను, స్థానిక నీటిని కాపాడండి",
    source: "మూలం",
  },
} as const;

export function PostPujaScreen({
  guidance, home, reviewMode = false, language = "EN",
}: {
  guidance: PujaPostGuidanceDefinition;
  home: () => void;
  reviewMode?: boolean;
  language?: "EN" | "TE";
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const { religious, practical, murtiHandling } = guidance;
  // Only a concluding block that carries an identified source AND the recovered
  // verse reaches a family screen.
  const concluding =
    guidance.concluding &&
    guidance.concluding.sourceRef.trim().length > 0 &&
    guidance.concluding.verseTe.trim().length > 0
      ? guidance.concluding
      : null;
  const kicker = te ? guidance.kickerTe ?? guidance.kicker : guidance.kicker;
  const screenTitle = te ? guidance.screenTitleTe ?? guidance.screenTitle : guidance.screenTitle;
  const practicalTitle = te ? practical.titleTe ?? practical.title : practical.title;
  const practicalNote = te ? practical.noteTe ?? practical.note : practical.note;

  return (
    <div className="flow-content immersion-flow" lang={te ? "te" : undefined}>
      <p className="kicker">{kicker}</p>
      <h1>{screenTitle}</h1>

      {concluding && (
        <section className="conclusion-block" aria-label={screenTitle}>
          <div className="conclusion-row">
            <h2>{t.when}</h2>
            <p>{te ? concluding.whenTe : concluding.whenEn}</p>
          </div>
          <div className="conclusion-row">
            <h2>{t.keepReady}</h2>
            <p>{te ? concluding.keepReadyTe : concluding.keepReadyEn}</p>
          </div>
          <div className="conclusion-row">
            <h2>{t.whatYouDo}</h2>
            <p>{te ? concluding.actionTe : concluding.actionEn}</p>
          </div>
          <details className="conclusion-verse">
            <summary>{t.showVerse}</summary>
            <pre className="mantra-te" lang="te">{concluding.verseTe}</pre>
            <pre className="mantra-roman" data-allow-latin="transliteration">{concluding.verseRoman}</pre>
            <p className="audio-note">{t.verseNote}</p>
          </details>
          {reviewMode && (
            <p className="reviewer-line">{t.source}: {concluding.sourceRef}</p>
          )}
        </section>
      )}

      {murtiHandling && murtiHandling.length > 0 && (
        <section className="murti-handling" aria-label={t.keepingVsImmersion}>
          <h2><Sparkles size={15} /> {t.keepingVsImmersion}</h2>
          {murtiHandling.map((opt) => (
            <article className="choice-card" key={opt.titleEn}>
              <h3>{te ? opt.titleTe : opt.titleEn}</h3>
              <p>{te ? opt.bodyTe : opt.bodyEn}</p>
            </article>
          ))}
        </section>
      )}

      {/* Reviewer-only: the one unresolved detail + provenance. Never shown in
          Family mode, and never as approved. */}
      {reviewMode && (
        <>
          <p className="info-note"><Info size={15} /> {religious.reviewNotice}</p>
          <ProvenancePanel reviewStatus={religious.reviewStatus} provenance={religious.provenance} />
          {religious.reviewerNote && <p className="info-note">{religious.reviewerNote}</p>}
        </>
      )}

      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>{practicalTitle}</strong>
          <p>{practicalNote}</p>
        </div>
      </div>
      {reviewMode && (
        <ProvenancePanel reviewStatus={practical.reviewStatus} provenance={practical.provenance} />
      )}

      <button className="wide-primary" onClick={home}><House size={18} /> {t.home}</button>
    </div>
  );
}
