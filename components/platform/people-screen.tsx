"use client";

// Participant identity and lineage collection. Gotra/Veda/Sutra/Sampradaya
// are general Hindu lineage concepts used for Sankalpam in any puja, not
// specific to Vinayaka Chavithi, so this stays a platform-level screen.

import { ChevronRight, Info, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import {
  LINEAGE_FIELDS, LINEAGE_STATUS_OPTIONS, PARTICIPANT_MODES, activeParticipants,
  validateParticipants,
  type LineageField, type LineageFieldKey, type LineageFieldMeta,
  type LineageStatus, type Participant, type ParticipantMode,
  type ParticipantsValidation,
} from "@/lib/content/participants";
import {
  NOT_LISTED_LABEL, NOT_LISTED_VALUE, type LineageCandidate,
} from "@/lib/content/lineage-candidates";
import {
  VEDA_CANDIDATES, VEDA_CANDIDATES_DISCLAIMER, VEDA_CANDIDATES_PROVENANCE,
  VEDA_CANDIDATES_REVIEW_STATUS,
} from "@/lib/content/veda-candidates";
import {
  SUTRA_CANDIDATES, SUTRA_CANDIDATES_DISCLAIMER, SUTRA_CANDIDATES_PROVENANCE,
  SUTRA_CANDIDATES_REVIEW_STATUS,
} from "@/lib/content/sutra-candidates";
import {
  SAMPRADAYA_CANDIDATES, SAMPRADAYA_CANDIDATES_DISCLAIMER,
  SAMPRADAYA_CANDIDATES_PROVENANCE, SAMPRADAYA_CANDIDATES_REVIEW_STATUS,
} from "@/lib/content/sampradaya-candidates";
import { canDisplayAsGuidance, type Provenance } from "@/lib/content/provenance";
import type { ReviewStatus } from "@/lib/content/review-status";

import { ReviewChip } from "./review-display";

// Fields that offer a searchable candidate list when the answer is KNOWN.
// Gotra has no list and keeps its plain text input. Each entry carries the
// candidate module's own review status and provenance; nothing here hard-codes
// a status.
type CandidateConfig = {
  candidates: readonly LineageCandidate[];
  disclaimer: string;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
};
const CANDIDATE_CONFIG: Partial<Record<LineageFieldKey, CandidateConfig>> = {
  veda: {
    candidates: VEDA_CANDIDATES,
    disclaimer: VEDA_CANDIDATES_DISCLAIMER,
    reviewStatus: VEDA_CANDIDATES_REVIEW_STATUS,
    provenance: VEDA_CANDIDATES_PROVENANCE,
  },
  sutra: {
    candidates: SUTRA_CANDIDATES,
    disclaimer: SUTRA_CANDIDATES_DISCLAIMER,
    reviewStatus: SUTRA_CANDIDATES_REVIEW_STATUS,
    provenance: SUTRA_CANDIDATES_PROVENANCE,
  },
  sampradaya: {
    candidates: SAMPRADAYA_CANDIDATES,
    disclaimer: SAMPRADAYA_CANDIDATES_DISCLAIMER,
    reviewStatus: SAMPRADAYA_CANDIDATES_REVIEW_STATUS,
    provenance: SAMPRADAYA_CANDIDATES_PROVENANCE,
  },
};

/**
 * A searchable candidate select for a KNOWN lineage value (Veda, Sutra,
 * Sampradaya). The user filters and picks a listed value, or picks
 * "My value is not listed" and types their own, which is kept exactly.
 * Selecting here only changes this one field.
 *
 * `reviewStatus` comes from the candidate module's own config - this component
 * never hard-codes a status. The list stays visible as an input aid even while
 * its status is REVIEW_REQUIRED; it is not ritual guidance.
 */
export function CandidateSelect({
  label, candidates, disclaimer, reviewStatus, provenance, value, invalid, onChange,
}: {
  label: string;
  candidates: readonly LineageCandidate[];
  disclaimer: string;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  value: LineageField;
  invalid?: boolean;
  onChange: (update: Partial<LineageField>) => void;
}) {
  const [query, setQuery] = useState("");

  // A positive status (VERIFIED, PRIEST_REVIEWED_PRACTICE, REGIONAL_CUSTOM) is
  // only shown when its provenance passes the central gate. Otherwise the chip
  // falls back to REVIEW_REQUIRED - a label alone is never enough.
  const releasable = canDisplayAsGuidance(reviewStatus, provenance);
  const shownStatus: ReviewStatus = releasable ? reviewStatus : "REVIEW_REQUIRED";

  const review = (
    <div className="candidate-review">
      <ReviewChip status={shownStatus} />
      <p className="candidate-disclaimer">{disclaimer}</p>
    </div>
  );

  if (value.custom === true) {
    return (
      <div className="candidate-select">
        <label>
          {label} (your own value)
          <input
            value={value.name}
            placeholder={`Type your ${label} exactly as you know it`}
            aria-invalid={invalid ? true : undefined}
            onChange={(event) =>
              onChange({ name: event.target.value, custom: true })}
          />
        </label>
        <button
          type="button"
          className="link-button"
          onClick={() => onChange({ name: "", custom: false })}
        >
          Choose from the list instead
        </button>
        {review}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = candidates.filter(
    (candidate) =>
      q === "" ||
      candidate.value.toLowerCase().includes(q) ||
      (candidate.note ? candidate.note.toLowerCase().includes(q) : false),
  );
  const selectedOutsideMatches =
    value.name !== "" && !matches.some((candidate) => candidate.value === value.name);

  return (
    <div className="candidate-select">
      <label>
        Search the {label} list
        <input
          type="text"
          value={query}
          placeholder={`Type to filter ${label} values`}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label>
        {label}
        <select
          value={value.name}
          aria-invalid={invalid ? true : undefined}
          onChange={(event) => {
            const picked = event.target.value;
            if (picked === NOT_LISTED_VALUE) {
              onChange({ name: "", custom: true });
            } else {
              onChange({ name: picked, custom: false });
            }
          }}
        >
          <option value="">Select the {label}…</option>
          {selectedOutsideMatches && (
            <option value={value.name}>{value.name}</option>
          )}
          {matches.map((candidate) => (
            <option key={candidate.value} value={candidate.value}>
              {candidate.note
                ? `${candidate.value} — ${candidate.note}`
                : candidate.value}
            </option>
          ))}
          <option value={NOT_LISTED_VALUE}>{NOT_LISTED_LABEL}</option>
        </select>
      </label>
      {review}
    </div>
  );
}

/**
 * One lineage field: the KNOWN / UNKNOWN / UNSURE question, then either a
 * candidate select (Veda, Sutra, Sampradaya) or a plain text box (Gotra) when
 * the answer is KNOWN. UNKNOWN and UNSURE show nothing more and clear the value.
 */
export function LineageFieldRow({
  field, value, error, onChange,
}: {
  field: LineageFieldMeta;
  value: LineageField;
  error?: string;
  onChange: (update: Partial<LineageField>) => void;
}) {
  const candidateConfig = CANDIDATE_CONFIG[field.key];

  return (
    <div className="lineage-group">
      <p className="lineage-plain">{field.plain}</p>
      <label>
        Do you know the {field.label}?
        <select
          value={value.status}
          onChange={(event) =>
            onChange({
              status: event.target.value as LineageStatus,
              // Any value and the custom flag are cleared the moment the answer
              // is not "I know it".
              name: "",
              custom: false,
            })}
        >
          {LINEAGE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {value.status === "KNOWN" &&
        (candidateConfig ? (
          <CandidateSelect
            label={field.label}
            candidates={candidateConfig.candidates}
            disclaimer={candidateConfig.disclaimer}
            reviewStatus={candidateConfig.reviewStatus}
            provenance={candidateConfig.provenance}
            value={value}
            invalid={Boolean(error)}
            onChange={onChange}
          />
        ) : (
          <label>
            {field.label} name
            <input
              value={value.name}
              placeholder="Enter exactly as you know it"
              aria-invalid={error ? true : undefined}
              onChange={(event) =>
                onChange({ name: event.target.value, custom: false })}
            />
          </label>
        ))}

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function PeopleScreen({
  mode, changeMode, participants, addParticipant, removeParticipant,
  updateParticipant, updateLineage, prepHint, done,
}: {
  mode: ParticipantMode;
  changeMode: (mode: ParticipantMode) => void;
  participants: Participant[];
  addParticipant: () => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, update: Partial<Participant>) => void;
  updateLineage: (
    id: string,
    key: LineageFieldKey,
    update: Partial<LineageField>,
  ) => void;
  prepHint: boolean;
  done: () => void;
}) {
  const [attempted, setAttempted] = useState(prepHint);
  const renderList = activeParticipants(mode, participants);
  const validation: ParticipantsValidation = validateParticipants(renderList);
  const resultFor = (id: string) =>
    validation.results.find((result) => result.id === id);

  const handleContinue = () => {
    if (validation.valid) {
      done();
    } else {
      setAttempted(true);
    }
  };

  return (
    <div className="flow-content">
      <p className="kicker">WHO IS PERFORMING?</p>
      <h1>People joining the puja</h1>
      <p className="flow-intro">
        First, choose who is doing this puja. Then add each person. If you do not
        know a family detail, choose &ldquo;I don&rsquo;t know.&rdquo; We never guess it.
      </p>

      {prepHint && (
        <p className="info-note">
          <Info size={16} /> Add a name for each person here, then continue to preparation.
        </p>
      )}

      <fieldset className="mode-options">
        <legend className="field-legend">Who is performing this puja?</legend>
        {PARTICIPANT_MODES.map((option) => (
          <label
            key={option.mode}
            className={`mode-option ${mode === option.mode ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="participant-mode"
              value={option.mode}
              checked={mode === option.mode}
              onChange={() => changeMode(option.mode)}
            />
            <span>
              <strong>{option.title}</strong>
              <span className="mode-option-note">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="person-list">
        {renderList.map((person, index) => {
          const result = resultFor(person.id);
          const showNameError = attempted && result?.nameError;
          return (
            <article className="form-card" key={person.id}>
              <div className="form-card-head">
                <h2>{mode === "SELF" ? "Your details" : `Person ${index + 1}`}</h2>
                {mode !== "SELF" && participants.length > 1 && (
                  <button
                    type="button"
                    className="remove-person"
                    onClick={() => removeParticipant(person.id)}
                  >
                    Remove
                  </button>
                )}
              </div>

              <label>
                Name
                <input
                  value={person.name}
                  placeholder="Enter name"
                  aria-invalid={showNameError ? true : undefined}
                  onChange={(event) =>
                    updateParticipant(person.id, { name: event.target.value })}
                />
              </label>
              {showNameError && <p className="field-error">{result?.nameError}</p>}

              {LINEAGE_FIELDS.map((field) => (
                <LineageFieldRow
                  key={field.key}
                  field={field}
                  value={person[field.key]}
                  error={
                    attempted
                      ? result?.lineageErrors.find(
                          (entry) => entry.field === field.key,
                        )?.message
                      : undefined
                  }
                  onChange={(update) => updateLineage(person.id, field.key, update)}
                />
              ))}
            </article>
          );
        })}
      </div>

      {mode !== "SELF" && (
        <button className="add-button" onClick={addParticipant}>
          <Plus size={18} /> Add another person
        </button>
      )}

      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Your details are used only when needed.</strong>
          <p>
            Unknown information stays unknown. It is never filled in from a
            surname, caste, language, family region, or where you live now. You
            can start the puja even if these details are unknown.
          </p>
        </div>
      </div>

      {attempted && !validation.valid && (
        <p className="field-error form-summary-error">
          Please add a name for each person. A family detail only needs a name
          when you chose &ldquo;I know it.&rdquo;
        </p>
      )}

      <button className="wide-primary" onClick={handleContinue}>
        Save people and continue <ChevronRight size={18} />
      </button>
    </div>
  );
}
