"use client";

// The Pujas platform destination: a catalogue of puja services (Vinayaka
// Chavithi is the only available one today) and, once a puja is chosen, a
// short detail view before continuing into People/Preparation/Guided Puja.
// This screen reads only the generic PujaDefinition shape - it never imports
// a specific puja's own content constants.

import { ChevronRight, Info, Play } from "lucide-react";

import type { PujaDefinition } from "@/lib/puja/types";

import { ProvenancePanel } from "./review-display";

export function PujaCatalogueScreen({
  pujas, comingSoonMessage, onSelect,
}: {
  pujas: readonly PujaDefinition[];
  comingSoonMessage: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="flow-content">
      <p className="kicker">PUJAS</p>
      <h1>Choose a puja</h1>
      <p className="flow-intro">Each puja has its own guided steps, preparation checklist, and language support.</p>

      <div className="puja-catalogue-list">
        {pujas.map((puja) => (
          <button
            key={puja.id}
            type="button"
            className="form-card puja-catalogue-item"
            onClick={() => onSelect(puja.slug)}
          >
            <h2>{puja.displayName}</h2>
            <p>{puja.description}</p>
            <span className="link-button">
              View details <ChevronRight size={15} />
            </span>
          </button>
        ))}
      </div>

      <p className="info-note"><Info size={16} /> {comingSoonMessage}</p>
    </div>
  );
}

export function PujaDetailScreen({
  puja, onBegin, reviewMode = false,
}: {
  puja: PujaDefinition;
  onBegin: () => void;
  reviewMode?: boolean;
}) {
  return (
    <div className="flow-content">
      <p className="kicker">{puja.displayName.toUpperCase()}</p>
      <h1>{puja.displayName}</h1>
      {puja.teluguDisplayName && (
        <p className="telugu-title" lang="te">{puja.teluguDisplayName}</p>
      )}
      <p className="flow-intro">{puja.description}</p>
      {reviewMode && (
        <>
          <p className="info-note"><Info size={16} /> {puja.metadata.reviewSummary}</p>
          <ProvenancePanel provenance={{ contentVersion: puja.metadata.contentVersion }} />
        </>
      )}
      <button className="wide-primary" onClick={onBegin}>
        <Play size={18} /> Begin
      </button>
    </div>
  );
}
