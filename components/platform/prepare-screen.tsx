"use client";

// The preparation screen: the one beta notice, the Simple/Complete choice,
// the materials checklist (built from the candidate steps), and the patri
// section (the 21 recovered Telugu names, no botanical identity, no automatic
// substitution). FAMILY_BETA shows this content normally - no per-item "not
// available" messages, chips, or provenance panels. REVIEWER mode adds the
// provenance panel per material and for patri.

import { Check, Info, Play, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import type { Participant } from "@/lib/content/participants";
import type { PatriSelfReport } from "@/lib/content/leaves";
import { validateParticipants } from "@/lib/content/participants";
import { BETA_NOTICE } from "@/lib/content/beta-visibility";
import {
  estimatedMinutesForPujaPath, getPujaMaterialReadiness, stepsForPujaPath,
  type PujaDefinition, type PujaPathId,
} from "@/lib/puja/types";

import { ProvenancePanel } from "./review-display";

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
  const percent = readiness.total > 0
    ? Math.round((readiness.available / readiness.total) * 100)
    : 0;
  const simpleCount = stepsForPujaPath(puja, "SIMPLE").length;
  const completeCount = stepsForPujaPath(puja, "COMPLETE").length;

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

      <p className="beta-notice"><ShieldCheck size={15} /> {BETA_NOTICE}</p>

      <fieldset className="path-options">
        <legend className="field-legend">Choose your puja path</legend>
        <label className={pujaPath === "SIMPLE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "SIMPLE"} onChange={() => setPujaPath("SIMPLE")} />
          <span>
            <strong>Simple Puja</strong>
            <small>{simpleCount} steps · about {estimatedMinutesForPujaPath(puja, "SIMPLE")} minutes · essential beginner sequence</small>
          </span>
        </label>
        <label className={pujaPath === "COMPLETE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "COMPLETE"} onChange={() => setPujaPath("COMPLETE")} />
          <span>
            <strong>Complete Puja</strong>
            <small>{completeCount} steps · about {estimatedMinutesForPujaPath(puja, "COMPLETE")} minutes · full sourced sequence</small>
          </span>
        </label>
      </fieldset>

      <p className="info-note"><Info size={16} /> {puja.materials.disclaimer}</p>

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
              <p className="material-explain">{item.description}</p>
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
        <p className="leaves-safety"><ShieldCheck size={16} /> {puja.patri.safetyNote}</p>
        {puja.patri.substitutionNote && (
          <p className="info-note"><Info size={15} /> {puja.patri.substitutionNote}</p>
        )}
        {puja.patri.teluguLeaves && puja.patri.teluguLeaves.length > 0 && (
          <ol className="patri-telugu-list" lang="te">
            {puja.patri.teluguLeaves.map((leaf) => (
              <li key={leaf.index}>{leaf.leafNameTelugu}</li>
            ))}
          </ol>
        )}
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
        <Play size={18} /> Start {pujaPath === "SIMPLE" ? "Simple" : "Complete"} puja
      </button>
    </div>
  );
}
