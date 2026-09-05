"use client";

// The preparation (materials + patri) screen. Content comes only from the
// `puja: PujaDefinition` prop - no direct import of MATERIALS, RITUAL_STEPS,
// or the patri content constants, so this renders the same way for any
// future puja service with the same shape.
//
// `reviewMode` controls only chrome: REVIEWER shows the full provenance
// panel for each material and for patri; FAMILY_BETA shows one short "not
// available in the current beta" message wherever content is gated, instead
// of internal review-process wording. GatedContent's decision - whether a
// material's description/alternative is shown at all - is unaffected by
// reviewMode.

import { Check, Info, Play, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import type { Participant } from "@/lib/content/participants";
import type { PatriSelfReport } from "@/lib/content/leaves";
import { validateParticipants } from "@/lib/content/participants";
import {
  estimatedMinutesForPujaPath, getPujaMaterialReadiness, type PujaDefinition, type PujaPathId,
} from "@/lib/puja/types";

import { GatedContent, GatedNotice, ProvenancePanel } from "./review-display";

export function PrepareScreen({
  puja, activeList, availableMaterialIds, toggleMaterial, patriSelfReport,
  setPatriSelfReport, pujaPath, setPujaPath, goToPeople, start, reviewMode = false,
}: {
  puja: PujaDefinition;
  activeList: Participant[];
  availableMaterialIds: string[];
  toggleMaterial: (id: string) => void;
  patriSelfReport: PatriSelfReport | null;
  setPatriSelfReport: (value: PatriSelfReport) => void;
  pujaPath: PujaPathId;
  setPujaPath: (value: PujaPathId) => void;
  goToPeople: () => void;
  start: () => void;
  reviewMode?: boolean;
}) {
  const ready = validateParticipants(activeList).valid;
  const readiness = getPujaMaterialReadiness(puja, availableMaterialIds);
  const percent = Math.round((readiness.available / readiness.total) * 100);

  if (!ready) {
    return (
      <div className="flow-content">
        <p className="kicker">{puja.displayName.toUpperCase()}</p>
        <h1>Get ready for the puja</h1>
        <p className="info-note">
          <Info size={16} /> First finish the people step. Each person needs a
          name, and any detail marked &ldquo;I know it&rdquo; needs its value.
        </p>
        <button className="wide-primary" onClick={goToPeople}>
          <UsersRound size={18} /> Add people
        </button>
      </div>
    );
  }

  return (
    <div className="flow-content">
      <p className="kicker">{puja.displayName.toUpperCase()}</p>
      <h1>Get ready for the puja</h1>
      <p className="flow-intro">
        Mark what you have. You do not need to stop the puja because every
        traditional item is not available.
      </p>

      <p className="info-note"><Info size={16} /> {puja.materials.disclaimer}</p>

      <fieldset className="path-options">
        <legend className="field-legend">Choose your puja path</legend>
        <label className={pujaPath === "SIMPLE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "SIMPLE"} onChange={() => setPujaPath("SIMPLE")} />
          <span><strong>Simple path</strong><small>Core steps · about {estimatedMinutesForPujaPath(puja, "SIMPLE")} minutes</small></span>
        </label>
        <label className={pujaPath === "COMPLETE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "COMPLETE"} onChange={() => setPujaPath("COMPLETE")} />
          <span><strong>Complete path</strong><small>Includes traditional optional steps · about {estimatedMinutesForPujaPath(puja, "COMPLETE")} minutes</small></span>
        </label>
      </fieldset>

      <div className="progress-label">
        <span>{readiness.available} of {readiness.total} marked ready</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <div className="material-list">
        {puja.materials.items.map((item) => {
          const available = availableMaterialIds.includes(item.id);
          return (
            <article className={`material-item ${available ? "available" : ""}`} key={item.id}>
              <div className="material-head">
                <div>
                  <h3>{item.name}</h3>
                  <span className="material-category">
                    {puja.materials.categoryLabel[item.category] ?? item.category}
                  </span>
                </div>
                <button
                  type="button"
                  className={`avail-toggle ${available ? "on" : ""}`}
                  aria-pressed={available}
                  onClick={() => toggleMaterial(item.id)}
                >
                  <span className="check-box">{available && <Check size={14} />}</span>
                  {available ? "Available" : "Not available"}
                </button>
              </div>
              <GatedContent
                reviewStatus={item.reviewStatus}
                provenance={item.provenance}
                reviewMode={reviewMode}
              >
                <p className="material-explain">{item.description}</p>
                {item.approvedAlternative && (
                  <p className="material-alt">
                    <strong>If you cannot get it:</strong> {item.approvedAlternative}
                  </p>
                )}
              </GatedContent>
              {reviewMode && (
                <ProvenancePanel reviewStatus={item.reviewStatus} provenance={item.provenance} />
              )}
            </article>
          );
        })}
      </div>

      <article className="leaves-section">
        <div className="leaves-head">
          <Sparkles size={20} />
          <h2>{puja.patri.sectionTitle}</h2>
        </div>
        <GatedNotice reviewMode={reviewMode} detailedText={puja.patri.reviewNotice} />
        <p className="leaves-safety"><ShieldCheck size={16} /> {puja.patri.safetyNote}</p>
        {reviewMode && (
          <ProvenancePanel reviewStatus={puja.patri.reviewStatus} provenance={puja.patri.provenance} />
        )}

        <fieldset className="patri-options">
          <legend className="field-legend">Do you have traditional patri?</legend>
          {puja.patri.selfReportOptions.map((option) => (
            <label
              key={option.value}
              className={`patri-option ${patriSelfReport === option.value ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="patri-self-report"
                value={option.value}
                checked={patriSelfReport === option.value}
                onChange={() => setPatriSelfReport(option.value as PatriSelfReport)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </article>

      <p className="participant-summary">
        <UsersRound size={17} /> Sankalpam will be prepared for {activeList.length}{" "}
        {activeList.length === 1 ? "person" : "people"}, using only the details you entered.
      </p>
      <button className="wide-primary" onClick={start}>
        <Play size={18} /> Start guided puja
      </button>
    </div>
  );
}
