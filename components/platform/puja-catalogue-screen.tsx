"use client";

// The Pujas platform destination: a catalogue of puja services (Vinayaka
// Chavithi is the only available one today) and, once a puja is chosen, a
// short detail view before continuing into People/Preparation/Guided Puja.
// This screen reads only the generic PujaDefinition shape - it never imports
// a specific puja's own content constants.

import { ChevronRight, Info, Play } from "lucide-react";

import type { PujaDefinition } from "@/lib/puja/types";

import { ProvenancePanel } from "./review-display";

type Lang = "EN" | "TE";

const L = {
  EN: {
    kicker: "PUJAS",
    heading: "Choose a puja",
    intro: "Each puja has its own guided steps, preparation checklist, and language support.",
    viewDetails: "View details",
    begin: "Begin",
  },
  TE: {
    kicker: "పూజలు",
    heading: "పూజను ఎంచుకోండి",
    intro: "ప్రతి పూజకూ దాని సొంత గైడెడ్ దశలు, సిద్ధత చెక్‌లిస్ట్, భాషా మద్దతు ఉంటాయి.",
    viewDetails: "వివరాలు చూడండి",
    begin: "ప్రారంభించండి",
  },
} as const;

export function PujaCatalogueScreen({
  pujas, comingSoonMessage, onSelect, language = "EN",
}: {
  pujas: readonly PujaDefinition[];
  comingSoonMessage: string;
  onSelect: (slug: string) => void;
  language?: Lang;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  return (
    <div className="flow-content" lang={te ? "te" : undefined}>
      <p className="kicker">{t.kicker}</p>
      <h1>{t.heading}</h1>
      <p className="flow-intro">{t.intro}</p>

      <div className="puja-catalogue-list">
        {pujas.map((puja) => (
          <button
            key={puja.id}
            type="button"
            className="form-card puja-catalogue-item"
            onClick={() => onSelect(puja.slug)}
          >
            <h2>{te && puja.teluguDisplayName ? puja.teluguDisplayName : puja.displayName}</h2>
            <p>{te && puja.descriptionTe ? puja.descriptionTe : puja.description}</p>
            <span className="link-button">
              {t.viewDetails} <ChevronRight size={15} />
            </span>
          </button>
        ))}
      </div>

      <p className="info-note"><Info size={16} /> {comingSoonMessage}</p>
    </div>
  );
}

export function PujaDetailScreen({
  puja, onBegin, reviewMode = false, language = "EN",
}: {
  puja: PujaDefinition;
  onBegin: () => void;
  reviewMode?: boolean;
  language?: Lang;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  return (
    <div className="flow-content" lang={te ? "te" : undefined}>
      <p className="kicker">{puja.displayName.toUpperCase()}</p>
      <h1>{puja.displayName}</h1>
      {puja.teluguDisplayName && (
        <p className="telugu-title" lang="te">{puja.teluguDisplayName}</p>
      )}
      <p className="flow-intro">{te && puja.descriptionTe ? puja.descriptionTe : puja.description}</p>
      {reviewMode && (
        <>
          <p className="info-note"><Info size={16} /> {puja.metadata.reviewSummary}</p>
          <ProvenancePanel provenance={{ contentVersion: puja.metadata.contentVersion }} />
        </>
      )}
      <button className="wide-primary" onClick={onBegin}>
        <Play size={18} /> {t.begin}
      </button>
    </div>
  );
}
