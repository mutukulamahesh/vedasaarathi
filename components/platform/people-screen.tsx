"use client";

// Participant identity and lineage collection. Gotra/Veda/Sutra/Sampradaya
// are general Hindu lineage concepts used for Sankalpam in any puja, not
// specific to Vinayaka Chavithi, so this stays a platform-level screen.
//
// Only Gotra is actually used by the generated Sankalpam today (see
// LineageFieldMeta.usedInSankalpam in lib/content/participants.ts), so Veda /
// Sutra / Sampradaya sit under one collapsed "Optional family tradition
// details" section - a family is never asked to supply metadata the puja
// does not use, and nothing here blocks starting the puja.

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
  NOT_LISTED_LABEL, NOT_LISTED_LABEL_TE, NOT_LISTED_VALUE, type LineageCandidate,
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

type Lang = "EN" | "TE";

const L = {
  EN: {
    who: "WHO IS PERFORMING?",
    heading: "People joining the puja",
    intro: "First, choose who is doing this puja. Then add each person. If you do not know a family detail, choose “I don’t know.” We never guess it.",
    prepHint: "Add a name for each person here, then continue to preparation.",
    whoQuestion: "Who is performing this puja?",
    yourDetails: "Your details",
    personN: (n: number) => `Person ${n}`,
    remove: "Remove",
    name: "Name",
    enterName: "Enter name",
    nameRequired: (label: string) => `Enter a name for this ${label}.`,
    addAnother: "Add another person",
    safetyTitle: "Your details are used only when needed.",
    safetyBody: "Unknown information stays unknown. It is never filled in from a surname, caste, language, family region, or where you live now. You can start the puja even if these details are unknown.",
    formError: "Please add a name for each person. A family detail only needs a name when you chose “I know it.”",
    continue: "Save people and continue",
    knowQuestion: (label: string) => `Do you know the ${label}?`,
    fieldNameLabel: (label: string) => `${label} name`,
    enterExactly: "Enter exactly as you know it",
    searchList: (label: string) => `${label}`,
    selectPlaceholder: (label: string) => `Select the ${label}…`,
    yourOwnValue: (label: string) => `${label} (your own value)`,
    typeExactly: (label: string) => `Type your ${label} exactly as you know it`,
    chooseFromList: "Choose from the list instead",
    optionalDetails: "Optional family tradition details",
    optionalDetailsHint: "This puja’s Sankalpam does not use these — fill them in only if you want them on record.",
  },
  TE: {
    who: "పూజ ఎవరు చేస్తున్నారు?",
    heading: "పూజలో పాల్గొనే వ్యక్తులు",
    intro: "ముందు, ఈ పూజ ఎవరు చేస్తున్నారో ఎంచుకోండి. తర్వాత ప్రతి వ్యక్తిని చేర్చండి. మీకు ఏదైనా కుటుంబ వివరం తెలియకపోతే “నాకు తెలియదు” ఎంచుకోండి. మేము దాన్ని ఎప్పుడూ ఊహించము.",
    prepHint: "ఇక్కడ ప్రతి వ్యక్తికి పేరు చేర్చి, సిద్ధత దశకు కొనసాగండి.",
    whoQuestion: "ఈ పూజ ఎవరు చేస్తున్నారు?",
    yourDetails: "మీ వివరాలు",
    personN: (n: number) => `వ్యక్తి ${n}`,
    remove: "తీసివేయండి",
    name: "పేరు",
    enterName: "పేరు నమోదు చేయండి",
    nameRequired: (label: string) => `ఈ ${label} కోసం పేరు నమోదు చేయండి.`,
    addAnother: "మరో వ్యక్తిని చేర్చండి",
    safetyTitle: "మీ వివరాలు అవసరమైనప్పుడు మాత్రమే వాడబడతాయి.",
    safetyBody: "తెలియని వివరం తెలియనిదిగానే ఉంటుంది. ఇది ఇంటిపేరు, కులం, భాష, కుటుంబ ప్రాంతం, లేదా మీరు ఇప్పుడు నివసించే స్థలం నుండి ఎప్పుడూ నింపబడదు. ఈ వివరాలు తెలియకపోయినా మీరు పూజ మొదలుపెట్టవచ్చు.",
    formError: "దయచేసి ప్రతి వ్యక్తికి పేరు చేర్చండి. “నాకు తెలుసు” అని ఎంచుకున్నప్పుడు మాత్రమే కుటుంబ వివరానికి పేరు అవసరం.",
    continue: "వ్యక్తులను సేవ్ చేసి కొనసాగించండి",
    knowQuestion: (label: string) => `${label} మీకు తెలుసా?`,
    fieldNameLabel: (label: string) => `${label} పేరు`,
    enterExactly: "మీకు తెలిసినట్లు ఖచ్చితంగా నమోదు చేయండి",
    searchList: (label: string) => `${label}`,
    selectPlaceholder: (label: string) => `${label} ఎంచుకోండి…`,
    yourOwnValue: (label: string) => `${label} (మీ సొంత విలువ)`,
    typeExactly: (label: string) => `మీకు తెలిసిన ${label}ను ఖచ్చితంగా టైప్ చేయండి`,
    chooseFromList: "బదులుగా జాబితా నుండి ఎంచుకోండి",
    optionalDetails: "ఐచ్ఛిక కుటుంబ సంప్రదాయ వివరాలు",
    optionalDetailsHint: "ఈ పూజ సంకల్పంలో వీటిని వాడదు — రికార్డు కోసం కావాలంటే మాత్రమే నింపండి.",
  },
} as const;

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
 * ONE searchable candidate select for a KNOWN lineage value (Veda, Sutra,
 * Sampradaya): a single `<select>` (native keyboard type-ahead searches it)
 * plus "My value is not listed" -> free text. Selecting here only changes
 * this one field.
 *
 * `reviewStatus` comes from the candidate module's own config - this component
 * never hard-codes a status. The review chip and list-completeness disclaimer
 * are Reviewer-only; a family sees the plain selector only.
 */
export function CandidateSelect({
  label, candidates, disclaimer, reviewStatus, provenance, value, invalid, onChange,
  language = "EN", reviewMode = false,
}: {
  label: string;
  candidates: readonly LineageCandidate[];
  disclaimer: string;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  value: LineageField;
  invalid?: boolean;
  onChange: (update: Partial<LineageField>) => void;
  language?: Lang;
  reviewMode?: boolean;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;

  // A positive status (VERIFIED, PRIEST_REVIEWED_PRACTICE, REGIONAL_CUSTOM) is
  // only shown when its provenance passes the central gate. Otherwise the chip
  // falls back to REVIEW_REQUIRED - a label alone is never enough. Reviewer-only.
  const releasable = canDisplayAsGuidance(reviewStatus, provenance);
  const shownStatus: ReviewStatus = releasable ? reviewStatus : "REVIEW_REQUIRED";

  const review = reviewMode ? (
    <div className="candidate-review reviewer-only">
      <ReviewChip status={shownStatus} />
      <p className="candidate-disclaimer">{disclaimer}</p>
    </div>
  ) : null;

  const notListedLabel = te ? NOT_LISTED_LABEL_TE : NOT_LISTED_LABEL;

  if (value.custom === true) {
    return (
      <div className="candidate-select">
        <label>
          {t.yourOwnValue(label)}
          <input
            value={value.name}
            placeholder={t.typeExactly(label)}
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
          {t.chooseFromList}
        </button>
        {review}
      </div>
    );
  }

  return (
    <div className="candidate-select">
      <label>
        {t.searchList(label)}
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
          <option value="">{t.selectPlaceholder(label)}</option>
          {value.name !== "" && !candidates.some((c) => c.value === value.name) && (
            <option value={value.name}>{value.name}</option>
          )}
          {candidates.map((candidate) => (
            <option key={candidate.value} value={candidate.value}>
              {candidate.note
                ? `${candidate.value} — ${candidate.note}`
                : candidate.value}
            </option>
          ))}
          <option value={NOT_LISTED_VALUE}>{notListedLabel}</option>
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
  field, value, error, onChange, language = "EN", reviewMode = false,
}: {
  field: LineageFieldMeta;
  value: LineageField;
  error?: string;
  onChange: (update: Partial<LineageField>) => void;
  language?: Lang;
  reviewMode?: boolean;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const candidateConfig = CANDIDATE_CONFIG[field.key];
  const label = te ? field.labelTe : field.label;

  return (
    <div className="lineage-group">
      <p className="lineage-plain">{te ? field.plainTe : field.plain}</p>
      <label>
        {t.knowQuestion(label)}
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
              {te ? option.labelTe : option.label}
            </option>
          ))}
        </select>
      </label>

      {value.status === "KNOWN" &&
        (candidateConfig ? (
          <CandidateSelect
            label={label}
            candidates={candidateConfig.candidates}
            disclaimer={candidateConfig.disclaimer}
            reviewStatus={candidateConfig.reviewStatus}
            provenance={candidateConfig.provenance}
            value={value}
            invalid={Boolean(error)}
            onChange={onChange}
            language={language}
            reviewMode={reviewMode}
          />
        ) : (
          <label>
            {t.fieldNameLabel(label)}
            <input
              value={value.name}
              placeholder={t.enterExactly}
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
  updateParticipant, updateLineage, prepHint, done, language = "EN", reviewMode = false,
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
  language?: Lang;
  reviewMode?: boolean;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const [attempted, setAttempted] = useState(prepHint);
  const renderList = activeParticipants(mode, participants);
  const validation: ParticipantsValidation = validateParticipants(renderList);
  const resultFor = (id: string) =>
    validation.results.find((result) => result.id === id);

  const primaryFields = LINEAGE_FIELDS.filter((f) => f.usedInSankalpam);
  const optionalFields = LINEAGE_FIELDS.filter((f) => !f.usedInSankalpam);

  const handleContinue = () => {
    if (validation.valid) {
      done();
    } else {
      setAttempted(true);
    }
  };

  return (
    <div className="flow-content" lang={te ? "te" : undefined}>
      <p className="kicker">{t.who}</p>
      <h1>{t.heading}</h1>
      <p className="flow-intro">{t.intro}</p>

      {prepHint && (
        <p className="info-note">
          <Info size={16} /> {t.prepHint}
        </p>
      )}

      <fieldset className="mode-options">
        <legend className="field-legend">{t.whoQuestion}</legend>
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
              <strong>{te ? option.titleTe : option.title}</strong>
              <span className="mode-option-note">{te ? option.descriptionTe : option.description}</span>
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
                <h2>{mode === "SELF" ? t.yourDetails : t.personN(index + 1)}</h2>
                {mode !== "SELF" && participants.length > 1 && (
                  <button
                    type="button"
                    className="remove-person"
                    onClick={() => removeParticipant(person.id)}
                  >
                    {t.remove}
                  </button>
                )}
              </div>

              <label>
                {t.name}
                <input
                  value={person.name}
                  placeholder={t.enterName}
                  aria-invalid={showNameError ? true : undefined}
                  onChange={(event) =>
                    updateParticipant(person.id, { name: event.target.value })}
                />
              </label>
              {showNameError && <p className="field-error">{result?.nameError}</p>}

              {primaryFields.map((field) => (
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
                  language={language}
                  reviewMode={reviewMode}
                />
              ))}

              {optionalFields.length > 0 && (
                <details className="lineage-optional-details">
                  <summary>{t.optionalDetails}</summary>
                  <p className="lineage-plain">{t.optionalDetailsHint}</p>
                  {optionalFields.map((field) => (
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
                      language={language}
                      reviewMode={reviewMode}
                    />
                  ))}
                </details>
              )}
            </article>
          );
        })}
      </div>

      {mode !== "SELF" && (
        <button className="add-button" onClick={addParticipant}>
          <Plus size={18} /> {t.addAnother}
        </button>
      )}

      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>{t.safetyTitle}</strong>
          <p>{t.safetyBody}</p>
        </div>
      </div>

      {attempted && !validation.valid && (
        <p className="field-error form-summary-error">{t.formError}</p>
      )}

      <button className="wide-primary" onClick={handleContinue}>
        {t.continue} <ChevronRight size={18} />
      </button>
    </div>
  );
}
