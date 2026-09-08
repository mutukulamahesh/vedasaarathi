"use client";

// The preparation screen: the one concise Family Beta notice, the
// Simple/Complete choice, the materials checklist grouped by "Needed for this
// path" / "Optional" / "Tradition-specific", and the patri section (the 21
// recovered Telugu names collapsed behind a disclosure). FAMILY_BETA shows one
// short notice and no per-item review wording; REVIEWER mode adds the longer
// materials disclaimer and the provenance panel per material and for patri.

import { Check, Info, Play, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import type { Participant } from "@/lib/content/participants";
import type { PatriSelfReport } from "@/lib/content/leaves";
import { validateParticipants } from "@/lib/content/participants";
import { BETA_NOTICE } from "@/lib/content/beta-visibility";
import {
  estimatedMinutesForPujaPath, getPujaMaterialReadiness, groupPujaMaterialsForPath,
  pujaPathIncludesPatri, stepsForPujaPath,
  type PujaDefinition, type PujaMaterialDefinition, type PujaPathId,
} from "@/lib/puja/types";

import { ProvenancePanel } from "./review-display";

const MATERIAL_GROUP_LABELS: readonly { key: "needed" | "optional" | "traditionSpecific"; label: string }[] = [
  { key: "needed", label: "Needed for this path" },
  { key: "optional", label: "Optional" },
  { key: "traditionSpecific", label: "Tradition-specific" },
];

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
  const readiness = getPujaMaterialReadiness(puja, availableMaterialIds, pujaPath);
  const percent = readiness.total > 0
    ? Math.round((readiness.available / readiness.total) * 100)
    : 0;
  const simpleCount = stepsForPujaPath(puja, "SIMPLE").length;
  const completeCount = stepsForPujaPath(puja, "COMPLETE").length;
  const materialGroups = groupPujaMaterialsForPath(puja, pujaPath);
  // Show the patri section only when the chosen path actually uses the patri.
  // A saved patriSelfReport from a previous Complete run stays in storage but is
  // neither read nor shown here while the Simple path is selected.
  const showPatri = pujaPathIncludesPatri(puja, pujaPath);

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

  const renderItem = (item: PujaMaterialDefinition) => {
    const available = availableMaterialIds.includes(item.id);
    return (
      <article className={`material-item ${available ? "available" : ""}`} key={item.id}>
        <div className="material-head">
          <h3>{item.name}</h3>
          <button
            type="button"
            className={`avail-toggle ${available ? "on" : ""}`}
            aria-pressed={available}
            onClick={() => toggleMaterial(item.id)}
          >
            <span className="check-box">{available && <Check size={14} />}</span>
            {available ? "I have this" : "Mark if you have it"}
          </button>
        </div>
        <p className="material-explain">{item.description}</p>
        {reviewMode && (
          <ProvenancePanel reviewStatus={item.reviewStatus} provenance={item.provenance} />
        )}
      </article>
    );
  };

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

      <h2 className="prepare-subhead">What you have</h2>
      <p className="info-note">
        <Info size={16} /> Mark what you have. The app will not block you if
        something is missing; check the relevant step for available guidance.
      </p>
      {reviewMode && <p className="info-note">{puja.materials.disclaimer}</p>}

      <div className="progress-label">
        <span>{readiness.available} of {readiness.total} marked</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      {MATERIAL_GROUP_LABELS.map(({ key, label }) =>
        materialGroups[key].length > 0 ? (
          <section className="material-group" key={key}>
            <h3 className="material-group-head">{label}</h3>
            <div className="material-list">{materialGroups[key].map(renderItem)}</div>
          </section>
        ) : null,
      )}

      {showPatri && (
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
            <details className="step-disclosure">
              <summary>View {puja.patri.teluguLeaves.length} patri</summary>
              <ol className="patri-telugu-list" lang="te">
                {puja.patri.teluguLeaves.map((leaf) => (
                  <li key={leaf.index}>{leaf.leafNameTelugu}</li>
                ))}
              </ol>
            </details>
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
      )}

      <p className="participant-summary">
        <UsersRound size={17} /> The Sankalpam step shows the traditional
        short-form wording for {activeList.length}{" "}
        {activeList.length === 1 ? "person" : "people"}.
      </p>
      <button className="wide-primary" onClick={start}>
        <Play size={18} /> Start {pujaPath === "SIMPLE" ? "Simple" : "Complete"} puja
      </button>
    </div>
  );
}
