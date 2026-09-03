"use client";

import {
  ArrowLeft, BookOpenCheck, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, CircleUserRound, House, ListChecks, MapPin, Pause, Play,
  PlayCircle, Plus, RotateCcw, ShieldCheck, Sparkles, UsersRound, Volume2,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  LINEAGE_FIELDS, LINEAGE_STATUS_OPTIONS, PARTICIPANT_MODES, createParticipant,
  validateParticipants, type LineageFieldKey, type LineageStatus,
  type Participant, type ParticipantMode, type ParticipantsValidation,
} from "@/lib/content/participants";
import {
  MATERIALS, MATERIAL_CATEGORY_LABEL, getMaterialReadiness,
} from "@/lib/content/materials";
import {
  LEAF_ALTERNATIVE, LEAF_BASIS_NOTE, LEAF_OPTIONS, LEAF_SAFETY_NOTE,
  TRADITIONAL_LEAF_COUNT, getLeafReadiness,
} from "@/lib/content/leaves";
import { RITUAL_STEPS } from "@/lib/content/steps";
import { REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/content/review-status";
import {
  getProgressSnapshot, getServerProgressSnapshot, resetProgress,
  subscribeToProgress, updateProgress, type PreparationProgress,
} from "@/lib/storage/preparation";

type Screen = "home" | "people" | "prepare" | "puja" | "complete";

const PREVIOUS_SCREEN: Record<Screen, Screen> = {
  home: "home",
  people: "home",
  prepare: "home",
  puja: "prepare",
  complete: "home",
};

const MODE_SUMMARY: Record<ParticipantMode, string> = {
  SELF: "Only me",
  FAMILY: "My family",
  GROUP: "Students or friends",
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
  const { mode, participants, availableMaterialIds, availableLeafIds, stepIndex } =
    progress;

  const [screen, setScreen] = useState<Screen>("home");
  const [language, setLanguage] = useState<"EN" | "TE">("EN");
  const [showWhy, setShowWhy] = useState(false);
  const [playing, setPlaying] = useState(false);

  const patch = (update: Partial<PreparationProgress>) =>
    updateProgress((current) => ({ ...current, ...update }));

  const goHome = () => {
    setScreen("home");
    setShowWhy(false);
    setPlaying(false);
  };

  const changeMode = (next: ParticipantMode) =>
    updateProgress((current) => {
      if (next === "SELF") {
        return { ...current, mode: next, participants: current.participants.slice(0, 1) };
      }
      const list =
        current.participants.length === 0
          ? [createParticipant(nextParticipantId())]
          : current.participants;
      return { ...current, mode: next, participants: list };
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
    update: Partial<Participant[LineageFieldKey]>,
  ) =>
    updateProgress((current) => ({
      ...current,
      participants: current.participants.map((person) =>
        person.id === id
          ? { ...person, [key]: { ...person[key], ...update } }
          : person,
      ),
    }));

  const restart = () => {
    resetProgress();
    goHome();
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
                  <MapPin size={14} /> Frisco, Texas <ChevronDown size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button className="back-button" onClick={() => setScreen(PREVIOUS_SCREEN[screen])}>
              <ArrowLeft size={20} /> Back
            </button>
          )}
          <div className="language-toggle" aria-label="Language">
            <button className={language === "TE" ? "active" : ""} onClick={() => setLanguage("TE")}>తెలుగు</button>
            <button className={language === "EN" ? "active" : ""} onClick={() => setLanguage("EN")}>EN</button>
          </div>
        </header>

        {screen === "home" && (
          <HomeScreen
            setScreen={setScreen}
            mode={mode}
            participantCount={participants.length}
            materialsReady={availableMaterialIds.length}
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
            done={() => setScreen("prepare")}
          />
        )}
        {screen === "prepare" && (
          <PrepareScreen
            participantCount={participants.length}
            availableMaterialIds={availableMaterialIds}
            toggleMaterial={(id) =>
              patch({ availableMaterialIds: toggleValue(availableMaterialIds, id) })}
            availableLeafIds={availableLeafIds}
            toggleLeaf={(id) =>
              patch({ availableLeafIds: toggleValue(availableLeafIds, id) })}
            start={() => { patch({ stepIndex: 0 }); setScreen("puja"); }}
          />
        )}
        {screen === "puja" && (
          <PujaScreen
            stepIndex={stepIndex}
            setStepIndex={(index) => patch({ stepIndex: index })}
            showWhy={showWhy}
            setShowWhy={setShowWhy}
            playing={playing}
            setPlaying={setPlaying}
            finish={() => setScreen("complete")}
          />
        )}
        {screen === "complete" && <CompleteScreen home={goHome} restart={restart} />}

        {screen === "home" && (
          <nav className="bottom-nav" aria-label="Primary navigation">
            <button className="active"><House size={21} /><span>Home</span></button>
            <button><CalendarDays size={21} /><span>Calendar</span></button>
            <button onClick={() => setScreen("prepare")}><PlayCircle size={21} /><span>Puja</span></button>
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

function HomeScreen({
  setScreen, mode, participantCount, materialsReady,
}: {
  setScreen: (screen: Screen) => void;
  mode: ParticipantMode;
  participantCount: number;
  materialsReady: number;
}) {
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
            <p className="eyebrow">TODAY IN FRISCO</p>
            <h2>Thursday, September 3</h2>
          </div>
          <div className="status-chip"><ShieldCheck size={14} /> Local</div>
        </div>
        <div className="panchanga-grid">
          <div><span>Tithi</span><strong>Being verified</strong></div>
          <div><span>Nakshatra</span><strong>Being verified</strong></div>
          <div><span>Sunrise</span><strong>Local time</strong></div>
        </div>
        <p className="plain-note">We will show these values only after the local calculation is checked.</p>
      </article>
      <div className="section-title-row"><h2>Coming up</h2><button>View month</button></div>
      <article className="festival-card">
        <div className="festival-summary">
          <div className="festival-symbol"><Sparkles size={25} /></div>
          <div className="festival-copy">
            <p className="eyebrow accent">MONDAY · SEP 14</p>
            <h3>Vinayaka Chavithi</h3>
            <p>Home puja for your location</p>
          </div>
          <div className="countdown"><strong>11</strong><span>days</span></div>
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
          <button className="primary-action" onClick={() => setScreen("prepare")}>
            <ListChecks size={17} /> Get puja ready
          </button>
        </div>
      </article>
      <div className="section-title-row"><h2>Quick access</h2></div>
      <div className="quick-grid">
        <button><CalendarDays size={22} /><span>Festival calendar</span></button>
        <button onClick={() => setScreen("prepare")}><BookOpenCheck size={22} /><span>My puja</span></button>
        <button onClick={() => setScreen("people")}><UsersRound size={22} /><span>People</span></button>
      </div>
    </div>
  );
}

function PeopleScreen({
  mode, changeMode, participants, addParticipant, removeParticipant,
  updateParticipant, updateLineage, done,
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
    update: Partial<Participant[LineageFieldKey]>,
  ) => void;
  done: () => void;
}) {
  const [attempted, setAttempted] = useState(false);
  const validation: ParticipantsValidation = validateParticipants(participants);
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
        {participants.map((person, index) => {
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

              {LINEAGE_FIELDS.map((field) => {
                const value = person[field.key];
                const fieldError = attempted
                  ? result?.lineageErrors.find((entry) => entry.field === field.key)
                  : undefined;
                return (
                  <div className="lineage-group" key={field.key}>
                    <p className="lineage-plain">{field.plain}</p>
                    <label>
                      Do you know the {field.label}?
                      <select
                        value={value.status}
                        onChange={(event) =>
                          updateLineage(person.id, field.key, {
                            status: event.target.value as LineageStatus,
                            // Drop any typed name the moment the answer is not "known".
                            name: event.target.value === "KNOWN" ? value.name : "",
                          })}
                      >
                        {LINEAGE_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {value.status === "KNOWN" && (
                      <label>
                        {field.label} name
                        <input
                          value={value.name}
                          placeholder="Enter exactly as you know it"
                          aria-invalid={fieldError ? true : undefined}
                          onChange={(event) =>
                            updateLineage(person.id, field.key, {
                              name: event.target.value,
                            })}
                        />
                      </label>
                    )}
                    {fieldError && <p className="field-error">{fieldError.message}</p>}
                  </div>
                );
              })}
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

function PrepareScreen({
  participantCount, availableMaterialIds, toggleMaterial, availableLeafIds,
  toggleLeaf, start,
}: {
  participantCount: number;
  availableMaterialIds: string[];
  toggleMaterial: (id: string) => void;
  availableLeafIds: string[];
  toggleLeaf: (id: string) => void;
  start: () => void;
}) {
  const readiness = getMaterialReadiness(availableMaterialIds);
  const leafReadiness = getLeafReadiness(availableLeafIds);
  const percent = Math.round((readiness.available / readiness.total) * 100);

  return (
    <div className="flow-content">
      <p className="kicker">VINAYAKA CHAVITHI</p>
      <h1>Get ready for the puja</h1>
      <p className="flow-intro">
        Mark what you have. You do not need to stop the puja because every
        traditional item is not available.
      </p>

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
              <p className="material-explain">{item.explanation}</p>
              {item.approvedAlternative && (
                <p className="material-alt">
                  <strong>If you cannot get it:</strong> {item.approvedAlternative}
                </p>
              )}
              <ReviewChip status={item.reviewStatus} />
            </article>
          );
        })}
      </div>

      <article className="leaves-section">
        <div className="leaves-head">
          <Sparkles size={20} />
          <h2>The {TRADITIONAL_LEAF_COUNT} leaves (patri)</h2>
        </div>
        <p className="leaves-basis">{LEAF_BASIS_NOTE}</p>
        <p className="leaves-safety"><ShieldCheck size={16} /> {LEAF_SAFETY_NOTE}</p>

        <p className="leaves-select-label">
          Select the leaves you can safely find ({leafReadiness.selectedCount} chosen):
        </p>
        <div className="leaf-grid">
          {LEAF_OPTIONS.map((leaf) => {
            const chosen = availableLeafIds.includes(leaf.id);
            return (
              <button
                type="button"
                key={leaf.id}
                className={`leaf-chip ${chosen ? "selected" : ""}`}
                aria-pressed={chosen}
                onClick={() => toggleLeaf(leaf.id)}
                title={leaf.note}
              >
                <span className="check-box">{chosen && <Check size={13} />}</span>
                {leaf.name}
              </button>
            );
          })}
        </div>

        <div className="leaves-alt">
          <p>{LEAF_ALTERNATIVE.text}</p>
          <ReviewChip status={LEAF_ALTERNATIVE.reviewStatus} />
        </div>
      </article>

      <p className="participant-summary">
        <UsersRound size={17} /> Sankalpam will be prepared for {participantCount}{" "}
        {participantCount === 1 ? "person" : "people"}, using only the details you entered.
      </p>
      <button className="wide-primary" onClick={start}>
        <Play size={18} /> Start guided puja
      </button>
    </div>
  );
}

function PujaScreen({
  stepIndex, setStepIndex, showWhy, setShowWhy, playing, setPlaying, finish,
}: {
  stepIndex: number;
  setStepIndex: (index: number) => void;
  showWhy: boolean;
  setShowWhy: (value: boolean) => void;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  finish: () => void;
}) {
  const safeIndex = Math.min(Math.max(stepIndex, 0), RITUAL_STEPS.length - 1);
  const step = RITUAL_STEPS[safeIndex];
  const percent = Math.round(((safeIndex + 1) / RITUAL_STEPS.length) * 100);

  const goNext = () => {
    setShowWhy(false);
    setPlaying(false);
    if (safeIndex === RITUAL_STEPS.length - 1) {
      finish();
    } else {
      setStepIndex(safeIndex + 1);
    }
  };

  const goPrevious = () => {
    setShowWhy(false);
    setPlaying(false);
    setStepIndex(Math.max(safeIndex - 1, 0));
  };

  return (
    <div className="flow-content puja-flow">
      <div className="step-line">
        <span>Step {safeIndex + 1} of {RITUAL_STEPS.length}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <article className="puja-card">
        <p className="telugu-title">{step.teluguTitle}</p>
        <h1>{step.title}</h1>

        <div className="step-block">
          <h4>What to do</h4>
          <p>{step.what}</p>
        </div>
        <div className="step-block">
          <h4>How to do it</h4>
          <p>{step.how}</p>
        </div>
        <div className="step-block">
          <h4>Why we do it</h4>
          <p>{step.why}</p>
        </div>
        {step.termNote && <p className="term-note">{step.termNote}</p>}

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

        <button
          className="audio-button"
          disabled={step.locked}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={20} /> : <Volume2 size={20} />}{" "}
          {step.locked
            ? "Audio awaiting review"
            : playing
              ? "Pause explanation"
              : "Listen to this step"}
        </button>
        <button className="why-button" onClick={() => setShowWhy(!showWhy)}>
          <CircleHelp size={18} /> Why do we do this? <ChevronDown size={17} />
        </button>
        {showWhy && <p className="why-copy">{step.why}</p>}
      </article>

      <div className="step-actions">
        <button disabled={safeIndex === 0} onClick={goPrevious}>Previous</button>
        <button className="primary-action" onClick={goNext}>
          {safeIndex === RITUAL_STEPS.length - 1 ? "Complete puja" : "Done, next"}{" "}
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function CompleteScreen({ home, restart }: { home: () => void; restart: () => void }) {
  return (
    <div className="completion">
      <div className="completion-icon"><Check size={35} /></div>
      <p className="kicker">PUJA COMPLETED</p>
      <h1>Thank you for worshipping with sincerity.</h1>
      <p>
        You followed the guidance according to your ability. May Sri Ganesha
        bless your family.
      </p>
      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
      <button className="restart-button" onClick={restart}>
        <RotateCcw size={16} /> Start again
      </button>
    </div>
  );
}
