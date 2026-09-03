"use client";

import {
  ArrowLeft, BookOpenCheck, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, CircleUserRound, House, Info, ListChecks, MapPin, Play,
  PlayCircle, Plus, RotateCcw, ShieldCheck, Sparkles, UsersRound, Volume2, Waves,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  LINEAGE_FIELDS, LINEAGE_STATUS_OPTIONS, PARTICIPANT_MODES, activeParticipants,
  createParticipant, validateParticipants, withLineageField,
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
import {
  MATERIALS, MATERIALS_DISCLAIMER, MATERIAL_CATEGORY_LABEL, getMaterialReadiness,
} from "@/lib/content/materials";
import {
  PATRI_REVIEW_NOTICE, PATRI_SAFETY_NOTE, PATRI_SECTION_TITLE,
  PATRI_SELF_REPORT_OPTIONS, type PatriSelfReport,
} from "@/lib/content/leaves";
import { estimatedMinutes, stepsForPath, type PujaPath } from "@/lib/content/steps";
import { AWAITING_REVIEW_NOTICE, REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/content/review-status";
import { canDisplayAsGuidance, type Provenance } from "@/lib/content/provenance";
import {
  PILOT_DATA_NOTE, PILOT_FESTIVAL, epochDay, festivalCountdown, formatEpochDay,
  formatFestivalDate,
} from "@/lib/content/festival";
import {
  getProgressSnapshot, getServerProgressSnapshot, requestReset,
  subscribeToProgress, updateProgress, type PreparationProgress,
} from "@/lib/storage/preparation";

type Screen = "home" | "people" | "prepare" | "puja" | "complete" | "immersion";

const PREVIOUS_SCREEN: Record<Screen, Screen> = {
  home: "home",
  people: "home",
  prepare: "home",
  puja: "prepare",
  complete: "home",
  immersion: "complete",
};

const MODE_SUMMARY: Record<ParticipantMode, string> = {
  SELF: "Only me",
  FAMILY: "My family",
  GROUP: "Students or friends",
};

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

let participantCounter = 0;
function nextParticipantId(): string {
  participantCounter += 1;
  return `p-${Date.now()}-${participantCounter}`;
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export default function Home() {
  const progress = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getServerProgressSnapshot,
  );
  const { mode, participants, availableMaterialIds, patriSelfReport, stepIndex, pujaPath, language } =
    progress;
  const activeList = activeParticipants(mode, participants);

  const todayEpochDay = useSyncExternalStore(
    () => () => {},
    () => epochDay(Date.now()),
    () => 0,
  );

  const [screen, setScreen] = useState<Screen>("home");
  const [showWhy, setShowWhy] = useState(false);
  const [prepHint, setPrepHint] = useState(false);

  const patch = (update: Partial<PreparationProgress>) =>
    updateProgress((current) => ({ ...current, ...update }));

  const goHome = () => {
    setScreen("home");
    setShowWhy(false);
  };

  // Preparation and the guided puja are only reachable once every active
  // participant passes full validation (a name, and a value for any detail
  // marked "I know it"). Otherwise the user is sent to the People screen.
  const openPreparation = () => {
    if (validateParticipants(activeList).valid) {
      setPrepHint(false);
      setScreen("prepare");
    } else {
      setPrepHint(true);
      setScreen("people");
    }
  };

  const changeMode = (next: ParticipantMode) =>
    updateProgress((current) => {
      // The stored list is never truncated; "Only me" just uses the first
      // profile, so switching back to family keeps everyone.
      if (next !== "SELF" && current.participants.length === 0) {
        return {
          ...current,
          mode: next,
          participants: [createParticipant(nextParticipantId())],
        };
      }
      return { ...current, mode: next };
    });

  const addParticipant = () =>
    updateProgress((current) => ({
      ...current,
      participants: [...current.participants, createParticipant(nextParticipantId())],
    }));

  const removeParticipant = (id: string) =>
    updateProgress((current) => ({
      ...current,
      participants:
        current.participants.length > 1
          ? current.participants.filter((person) => person.id !== id)
          : current.participants,
    }));

  const updateParticipant = (id: string, update: Partial<Participant>) =>
    updateProgress((current) => ({
      ...current,
      participants: current.participants.map((person) =>
        person.id === id ? { ...person, ...update } : person,
      ),
    }));

  const updateLineage = (
    id: string,
    key: LineageFieldKey,
    update: Partial<LineageField>,
  ) =>
    updateProgress((current) => ({
      ...current,
      participants: current.participants.map((person) =>
        person.id === id ? withLineageField(person, key, update) : person,
      ),
    }));

  const restart = () => {
    // requestReset asks the user to confirm before clearing saved progress.
    if (requestReset()) {
      setPrepHint(false);
      goHome();
    }
  };

  return (
    <main className="app-shell">
      <section className="phone-shell">
        <header className="topbar">
          {screen === "home" ? (
            <div className="brand-lockup">
              <div className="brand-mark" aria-hidden="true">ॐ</div>
              <div>
                <div className="brand-name">VedaSaarathi</div>
                <button className="location-button" type="button">
                  <MapPin size={14} /> {PILOT_FESTIVAL.locationLabel}{" "}
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button className="back-button" onClick={() => setScreen(PREVIOUS_SCREEN[screen])}>
              <ArrowLeft size={20} /> Back
            </button>
          )}
          {screen === "home" && (
            <span className="lang-note">Telugu version is being prepared</span>
          )}
        </header>

        {screen === "home" && (
          <HomeScreen
            setScreen={setScreen}
            openPreparation={openPreparation}
            mode={mode}
            participantCount={activeList.length}
            materialsReady={availableMaterialIds.length}
            todayEpochDay={todayEpochDay}
          />
        )}
        {screen === "people" && (
          <PeopleScreen
            mode={mode}
            changeMode={changeMode}
            participants={participants}
            addParticipant={addParticipant}
            removeParticipant={removeParticipant}
            updateParticipant={updateParticipant}
            updateLineage={updateLineage}
            prepHint={prepHint}
            done={openPreparation}
          />
        )}
        {screen === "prepare" && (
          <PrepareScreen
            activeList={activeList}
            availableMaterialIds={availableMaterialIds}
            toggleMaterial={(id) =>
              patch({ availableMaterialIds: toggleValue(availableMaterialIds, id) })}
            patriSelfReport={patriSelfReport}
            setPatriSelfReport={(value) => patch({ patriSelfReport: value })}
            pujaPath={pujaPath}
            setPujaPath={(value) => patch({ pujaPath: value, stepIndex: 0 })}
            goToPeople={() => setScreen("people")}
            start={() => {
              if (validateParticipants(activeList).valid) {
                patch({ stepIndex: 0 });
                setScreen("puja");
              } else {
                setPrepHint(true);
                setScreen("people");
              }
            }}
          />
        )}
        {screen === "puja" && (
          <PujaScreen
            stepIndex={stepIndex}
            setStepIndex={(index) => patch({ stepIndex: index })}
            showWhy={showWhy}
            setShowWhy={setShowWhy}
            finish={() => setScreen("complete")}
            path={pujaPath}
            language={language}
            setLanguage={(value) => patch({ language: value })}
            activeList={activeList}
          />
        )}
        {screen === "complete" && <CompleteScreen home={goHome} restart={restart} immersion={() => setScreen("immersion")} />}
        {screen === "immersion" && <ImmersionScreen home={goHome} />}

        {screen === "home" && (
          <nav className="bottom-nav" aria-label="Primary navigation">
            <button className="active"><House size={21} /><span>Home</span></button>
            <button><CalendarDays size={21} /><span>Calendar</span></button>
            <button onClick={openPreparation}><PlayCircle size={21} /><span>Puja</span></button>
            <button onClick={() => setScreen("people")}><CircleUserRound size={21} /><span>Profile</span></button>
          </nav>
        )}
      </section>
    </main>
  );
}

function ReviewChip({ status }: { status: ReviewStatus }) {
  return (
    <span className="review-chip" data-status={status}>
      {REVIEW_STATUS_LABEL[status]}
    </span>
  );
}

function AwaitingReview({ text = AWAITING_REVIEW_NOTICE }: { text?: string }) {
  return (
    <p className="awaiting-review">
      <Info size={15} /> {text}
    </p>
  );
}

/** Show `children` only when the claim has passed review; otherwise the notice. */
function GatedContent({
  reviewStatus, provenance, children,
}: {
  reviewStatus: ReviewStatus;
  provenance: Provenance;
  children: React.ReactNode;
}) {
  if (canDisplayAsGuidance(reviewStatus, provenance)) return <>{children}</>;
  return <AwaitingReview />;
}

export function HomeScreen({
  setScreen, openPreparation, mode, participantCount, materialsReady, todayEpochDay,
}: {
  setScreen: (screen: Screen) => void;
  openPreparation: () => void;
  mode: ParticipantMode;
  participantCount: number;
  materialsReady: number;
  todayEpochDay: number;
}) {
  const todayLabel = formatEpochDay(todayEpochDay) ?? "Pilot preview";
  const countdown = festivalCountdown(todayEpochDay);

  return (
    <div className="content">
      <div className="welcome-row">
        <div>
          <p className="kicker">NAMASKARAM</p>
          <h1>Welcome</h1>
          <p className="welcome-copy">Here is what matters today.</p>
        </div>
      </div>
      <article className="today-card">
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">TODAY IN {PILOT_FESTIVAL.locationLabel.toUpperCase()}</p>
            <h2>{todayLabel}</h2>
          </div>
          <div className="status-chip"><ShieldCheck size={14} /> Pilot data</div>
        </div>
        <div className="panchanga-grid">
          <div><span>Tithi</span><strong>Being verified</strong></div>
          <div><span>Nakshatra</span><strong>Being verified</strong></div>
          <div><span>Sunrise</span><strong>Local time</strong></div>
        </div>
        <p className="plain-note">{PILOT_DATA_NOTE} We will show these values only after the local calculation is checked.</p>
      </article>
      <div className="section-title-row"><h2>Coming up</h2><button>View month</button></div>
      <article className="festival-card">
        <div className="festival-summary">
          <div className="festival-symbol"><Sparkles size={25} /></div>
          <div className="festival-copy">
            <p className="eyebrow accent">{formatFestivalDate().toUpperCase()}</p>
            <h3>{PILOT_FESTIVAL.name}</h3>
            <p>Home puja · pilot data</p>
          </div>
          <div className="countdown">
            {countdown.state === "upcoming" && (
              <>
                <strong>{countdown.days}</strong>
                <span>{countdown.days === 1 ? "day" : "days"}</span>
              </>
            )}
            {countdown.state === "today" && (
              <>
                <strong>Today</strong>
                <span>&nbsp;</span>
              </>
            )}
            {countdown.state === "past" && (
              <>
                <strong>—</strong>
                <span>date passed</span>
              </>
            )}
            {countdown.state === "unknown" && (
              <>
                <strong>—</strong>
                <span>days</span>
              </>
            )}
          </div>
        </div>
        <button className="participant-box full-button" onClick={() => setScreen("people")}>
          <div>
            <UsersRound size={18} />
            <span>
              {MODE_SUMMARY[mode]} ·{" "}
              {participantCount === 1 ? "1 person" : `${participantCount} people`}
            </span>
          </div>
          <span>Change <ChevronRight size={15} /></span>
        </button>
        {materialsReady > 0 && (
          <div className="resume-line">
            <Check size={15} /> {materialsReady} of {MATERIALS.length} items marked ready
          </div>
        )}
        <div className="festival-actions">
          <button className="secondary-action" onClick={() => setScreen("people")}>
            <UsersRound size={17} /> Add people
          </button>
          <button className="primary-action" onClick={openPreparation}>
            <ListChecks size={17} /> Get puja ready
          </button>
        </div>
      </article>
      <div className="section-title-row"><h2>Quick access</h2></div>
      <div className="quick-grid">
        <button><CalendarDays size={22} /><span>Festival calendar</span></button>
        <button onClick={openPreparation}><BookOpenCheck size={22} /><span>My puja</span></button>
        <button onClick={() => setScreen("people")}><UsersRound size={22} /><span>People</span></button>
      </div>
    </div>
  );
}

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

function PeopleScreen({
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

export function PrepareScreen({
  activeList, availableMaterialIds, toggleMaterial, patriSelfReport,
  setPatriSelfReport, pujaPath, setPujaPath, goToPeople, start,
}: {
  activeList: Participant[];
  availableMaterialIds: string[];
  toggleMaterial: (id: string) => void;
  patriSelfReport: PatriSelfReport | null;
  setPatriSelfReport: (value: PatriSelfReport) => void;
  pujaPath: PujaPath;
  setPujaPath: (value: PujaPath) => void;
  goToPeople: () => void;
  start: () => void;
}) {
  const ready = validateParticipants(activeList).valid;
  const readiness = getMaterialReadiness(availableMaterialIds);
  const percent = Math.round((readiness.available / readiness.total) * 100);

  if (!ready) {
    return (
      <div className="flow-content">
        <p className="kicker">VINAYAKA CHAVITHI</p>
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
      <p className="kicker">VINAYAKA CHAVITHI</p>
      <h1>Get ready for the puja</h1>
      <p className="flow-intro">
        Mark what you have. You do not need to stop the puja because every
        traditional item is not available.
      </p>

      <p className="info-note"><Info size={16} /> {MATERIALS_DISCLAIMER}</p>

      <fieldset className="path-options">
        <legend className="field-legend">Choose your puja path</legend>
        <label className={pujaPath === "SIMPLE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "SIMPLE"} onChange={() => setPujaPath("SIMPLE")} />
          <span><strong>Simple path</strong><small>Core steps · about {estimatedMinutes("SIMPLE")} minutes</small></span>
        </label>
        <label className={pujaPath === "COMPLETE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "COMPLETE"} onChange={() => setPujaPath("COMPLETE")} />
          <span><strong>Complete path</strong><small>Includes traditional optional steps · about {estimatedMinutes("COMPLETE")} minutes</small></span>
        </label>
      </fieldset>

      <div className="progress-label">
        <span>{readiness.available} of {readiness.total} marked ready</span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <div className="material-list">
        {MATERIALS.map((item) => {
          const available = availableMaterialIds.includes(item.id);
          return (
            <article className={`material-item ${available ? "available" : ""}`} key={item.id}>
              <div className="material-head">
                <div>
                  <h3>{item.name}</h3>
                  <span className="material-category">
                    {MATERIAL_CATEGORY_LABEL[item.category]}
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
              <GatedContent reviewStatus={item.reviewStatus} provenance={item.provenance}>
                <p className="material-explain">{item.description}</p>
                {item.approvedAlternative && (
                  <p className="material-alt">
                    <strong>If you cannot get it:</strong> {item.approvedAlternative}
                  </p>
                )}
              </GatedContent>
              <ReviewChip status={item.reviewStatus} />
            </article>
          );
        })}
      </div>

      <article className="leaves-section">
        <div className="leaves-head">
          <Sparkles size={20} />
          <h2>{PATRI_SECTION_TITLE}</h2>
        </div>
        <AwaitingReview text={PATRI_REVIEW_NOTICE} />
        <p className="leaves-safety"><ShieldCheck size={16} /> {PATRI_SAFETY_NOTE}</p>

        <fieldset className="patri-options">
          <legend className="field-legend">Do you have traditional patri?</legend>
          {PATRI_SELF_REPORT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`patri-option ${patriSelfReport === option.value ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="patri-self-report"
                value={option.value}
                checked={patriSelfReport === option.value}
                onChange={() => setPatriSelfReport(option.value)}
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

export function PujaScreen({
  stepIndex, setStepIndex, showWhy, setShowWhy, finish, path, language,
  setLanguage, activeList,
}: {
  stepIndex: number;
  setStepIndex: (index: number) => void;
  showWhy: boolean;
  setShowWhy: (value: boolean) => void;
  finish: () => void;
  path: PujaPath;
  language: "EN" | "TE";
  setLanguage: (value: "EN" | "TE") => void;
  activeList: Participant[];
}) {
  const steps = stepsForPath(path);
  const safeIndex = Math.min(Math.max(stepIndex, 0), steps.length - 1);
  const step = steps[safeIndex];
  const percent = Math.round(((safeIndex + 1) / steps.length) * 100);
  const approved = canDisplayAsGuidance(step.reviewStatus, step.provenance);
  // This owner-only build is a content-review candidate. It lets the owner and
  // priest walk through draft actions, but never changes their review status.
  const showCandidate = !approved && step.reviewStatus === "REVIEW_REQUIRED";

  const speakInstruction = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const text = language === "TE" ? step.teluguInstruction : `${step.what} ${step.how}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "TE" ? "te-IN" : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const goNext = () => {
    setShowWhy(false);
    if (safeIndex === steps.length - 1) {
      finish();
    } else {
      setStepIndex(safeIndex + 1);
    }
  };

  const goPrevious = () => {
    setShowWhy(false);
    setStepIndex(Math.max(safeIndex - 1, 0));
  };

  return (
    <div className="flow-content puja-flow">
      <div className="step-line">
        <span>Step {safeIndex + 1} of {steps.length} · {path === "SIMPLE" ? "Simple" : "Complete"}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <article className="puja-card">
        <div className="reviewer-banner"><ShieldCheck size={16} /><span><strong>Private review build</strong> — ritual wording below is a candidate, not approved guidance.</span></div>
        <div className="language-toggle" aria-label="Instruction language">
          <button className={language === "EN" ? "active" : ""} onClick={() => setLanguage("EN")}>English</button>
          <button className={language === "TE" ? "active" : ""} onClick={() => setLanguage("TE")}>తెలుగు</button>
        </div>
        <p className="telugu-title">{step.teluguTitle}</p>
        <h1>{step.title}</h1>
        <p className="step-meta">{step.importance === "CORE" ? "Core path" : "Optional step"} · about {step.minutes} min</p>

        {(approved || showCandidate) ? (
          <>
            {language === "TE" ? (
              <div className="step-block"><h4>ఏం చేయాలి</h4><p>{step.teluguInstruction}</p></div>
            ) : (<>
              <div className="step-block"><h4>What to do</h4><p>{step.what}</p></div>
              <div className="step-block"><h4>How to do it</h4><p>{step.how}</p></div>
            </>)}
            <div className="step-block">
              <h4>Why we do it</h4>
              <p>{step.why}</p>
            </div>
          </>
        ) : (
          <AwaitingReview />
        )}
        {(approved || showCandidate) && step.termNote && (
          <p className="term-note">{step.termNote}</p>
        )}

        {step.id === "sankalpam" && (
          <div className="participant-review"><strong>People in this Sankalpam</strong><p>{activeList.map((person) => person.name).join(", ")}</p><small>Unknown lineage remains unknown. No deity or generic Gotra is assigned.</small></div>
        )}

        <ReviewChip status={step.reviewStatus} />

        {step.locked && (
          <div className="locked-note">
            <ShieldCheck size={18} />
            <span>
              The exact words and audio for this step stay locked until a
              qualified reviewer approves them.
            </span>
          </div>
        )}

        <button className="audio-button" onClick={speakInstruction}>
          <Volume2 size={20} /> Listen to plain instructions
        </button>
        <p className="audio-note">Device narration only. It does not read mantras; reviewed pronunciation audio is still pending.</p>
        {(approved || showCandidate) && (
          <>
            <button className="why-button" onClick={() => setShowWhy(!showWhy)}>
              <CircleHelp size={18} /> Why do we do this? <ChevronDown size={17} />
            </button>
            {showWhy && <p className="why-copy">{step.why}</p>}
          </>
        )}
      </article>

      <div className="step-actions">
        <button disabled={safeIndex === 0} onClick={goPrevious}>Previous</button>
        <button className="primary-action" onClick={goNext}>
          {safeIndex === steps.length - 1
            ? "Finish puja review"
            : "Done, next"}{" "}
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

export function CompleteScreen({ home, restart, immersion }: { home: () => void; restart: () => void; immersion: () => void }) {
  return (
    <div className="completion">
      <div className="completion-icon"><Check size={35} /></div>
      <p className="kicker">PRIVATE PUJA REVIEW COMPLETED</p>
      <h1>You reached the end of the guided path.</h1>
      <p>
        The complete candidate journey is ready for a priest walkthrough. Ritual
        wording and pronunciation audio are still awaiting final approval.
      </p>
      <button className="wide-secondary" onClick={immersion}><Waves size={18} /> Immersion or keep the murti</button>
      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
      <button className="restart-button" onClick={restart}>
        <RotateCcw size={16} /> Start again
      </button>
    </div>
  );
}

export function ImmersionScreen({ home }: { home: () => void }) {
  return (
    <div className="flow-content immersion-flow">
      <p className="kicker">AFTER THE PUJA</p>
      <h1>Immersion or keeping the murti</h1>
      <p className="reviewer-banner"><ShieldCheck size={16} /> Religious Udvasana wording is awaiting review. The safety guidance below is practical guidance.</p>
      <article className="choice-card"><h2>Keeping a picture or permanent murti</h2><p>Do not immerse it. Keep it respectfully in your puja space. This app does not ask you to discard a permanent metal, stone, painted or electronic item.</p></article>
      <article className="choice-card"><h2>Natural, unpainted clay murti</h2><ol><li>Choose a bucket or tub large enough for the murti.</li><li>Remove plastic, foil, batteries, fabric and other decorations.</li><li>After the approved Udvasana step, place the murti gently in clean water.</li><li>Let natural clay soften. Reuse the settled clay in soil only when its ingredients are safe for plants.</li></ol></article>
      <div className="safety-note"><ShieldCheck size={19} /><div><strong>Protect people and local water</strong><p>Never use a storm drain. Do not enter unsafe water or leave decorations behind. Follow city and venue rules. If the murti is painted or its material is unknown, ask the seller or use a local temple collection instead of home immersion.</p></div></div>
      <p className="info-note"><Info size={16} /> If immersion will happen later, stop here. Udvasana belongs on the day you actually conclude and move the temporary murti; the exact religious action remains in review.</p>
      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
    </div>
  );
}
