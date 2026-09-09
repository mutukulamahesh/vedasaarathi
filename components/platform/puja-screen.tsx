"use client";

// The guided-puja screen for the Family Beta.
//
// It renders whichever puja's steps are passed in via `puja: PujaDefinition`.
// A step is shown when it passes EITHER gate:
//   - canDisplayAsGuidance()      -> approved religious guidance, or
//   - canDisplayAsBetaCandidate() -> a sourced, explicitly-labelled beta
//                                    candidate (still REVIEW_REQUIRED + locked).
// Neither gate is weakened here. FAMILY_BETA shows the candidate normally with
// NO per-step chips, provenance panels, transcription-confidence warnings, or
// "not available" messages. REVIEWER mode adds source/page, confidence,
// uncertain-transcription notes, the provenance panel, and the locked note.
// Content marked WITHHELD_FOR_RIGHTS shows only the rights notice.
//
// Layout is Telugu-first and ordered for a beginner who is about to act:
//   1. the Telugu step name (large H1) with the English title as a smaller
//      translation line underneath
//   2. What to keep ready for this step (visible, never hidden)
//   3. What to do physically (visible)
//   4. the Telugu mantra
//   5. the romanised reading (disclosure, under the mantra)
//   6. meaning and explanation (disclosure)
// Materials and the physical action are always above the mantra so the family
// knows what to hold before they begin chanting. Previous/Next stay pinned to
// the bottom so they are reachable after a long mantra. Every navigation moves
// focus to the new step heading and resets the owning scroll container.

import { ChevronRight, ShieldCheck, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Participant, ParticipantMode } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";
import { canDisplayAsGuidance } from "@/lib/content/provenance";
import {
  betaUnavailableNotice, betaUnavailableReason,
} from "@/lib/content/beta-visibility";
import { generateSankalpam, type SankalpamGroupMode } from "@/lib/sankalpam";
import type { LocationPanchanga } from "@/lib/panchanga";
import {
  clampPujaStepIndex, stepsForPujaPath, type PujaDefinition, type PujaGuidedStep,
  type PujaPathId,
} from "@/lib/puja/types";
import {
  DEVICE_NARRATION_NOTE, DEVICE_NARRATION_UNSUPPORTED_NOTE,
  TELUGU_VOICE_UNAVAILABLE_NOTE, getNarrationText,
} from "@/lib/speech/narration-policy";
import { browserSpeechController, hasSpeechSynthesisSupport } from "@/lib/speech/controller";
import {
  resolveVoice, voicesForLanguage, type NarrationVoice,
} from "@/lib/speech/voices";
import {
  stepGuidanceTe, uiText, UI_TE,
} from "@/lib/content/step-guidance-te";
import { loadVoicePreference, saveVoiceChoice, type VoicePreference } from "@/lib/storage/voice-preference";
import { mantraCandidateAudio, plainInstructionAudio } from "@/lib/audio/manifest";
import { play, register, release, stopAll } from "@/lib/audio/playback-coordinator";

import {
  VRATA_KATHA_SECTIONS, VRATA_KATHA_SOURCES, VRATA_KATHA_RIGHTS_BASIS,
  VRATA_KATHA_TITLE_EN, VRATA_KATHA_TITLE_TE,
} from "@/lib/pujas/vinayaka/vrata-katha";

import { AppAudioPlayer } from "./audio-player";
import { ProvenancePanel } from "./review-display";

const PLAIN_AUDIO_PENDING_NOTE =
  "App-hosted spoken instructions (a natural voice, nothing to install) are " +
  "being finalised. Until then you can use your device's own voice below.";
const MANTRA_AUDIO_PENDING_NOTE =
  "App-hosted Telugu mantra audio is being finalised. For now, read the Telugu " +
  "and the romanised reading.";
// Internally these files are "pronunciation candidates" (status
// REVIEW_CANDIDATE); the family-facing line just says what the audio is,
// without any review-process wording.
const MANTRA_AUDIO_CANDIDATE_NOTE =
  "App-hosted pronunciation guide — a computer voice, not a priest’s recording.";
const PLAIN_AUDIO_ERROR_NOTE =
  "That audio file could not load. Read the instructions below; use your device's voice if you need to.";
const MANTRA_AUDIO_ERROR_NOTE =
  "The mantra audio could not load. Read the Telugu and the romanised reading above.";

/** Audio-player display strings for one language. */
function audioStrings(te: boolean) {
  return {
    replay: te ? UI_TE.Replay : "Replay",
    pause: te ? UI_TE.Pause : "Pause",
    resume: te ? UI_TE.Resume : "Resume",
    stop: te ? UI_TE.Stop : "Stop",
    candidateNote: te ? UI_TE.audioCandidateNote : MANTRA_AUDIO_CANDIDATE_NOTE,
  };
}

function betaContentFor(step: PujaGuidedStep) {
  const firstRef = step.sourceRefs?.[0] ?? null;
  return {
    betaStatus: (step.betaStatus ?? "MISSING_SOURCE") as
      "APPROVED_GUIDANCE" | "SOURCED_BETA_CANDIDATE" | "WITHHELD_FOR_RIGHTS" | "MISSING_SOURCE",
    includedInBeta: step.includedInBeta ?? false,
    sourceId: firstRef?.sourceId ?? null,
    sourcePage: firstRef?.page ?? null,
    onlineSection: null,
    contentVersion: step.provenance.contentVersion ?? null,
  };
}

const GROUP_MODE: Record<ParticipantMode, SankalpamGroupMode> = {
  SELF: "INDIVIDUAL",
  FAMILY: "FAMILY",
  GROUP: "GROUP",
};

/** Map the Home Panchanga (released fields only) onto the generator's inputs. */
function panchangaSlots(p: LocationPanchanga | null | undefined) {
  if (!p) return {};
  const ctx = Object.fromEntries(p.context.map((c) => [c.key, c.value]));
  const tithiField = p.fields.find((f) => f.key === "tithi")?.value ?? "";
  const nakField = p.fields.find((f) => f.key === "nakshatra")?.value ?? "";
  // "Krishna Chaturdasi" -> tithi "Chaturdasi"; paksha comes from context.
  const tithi = tithiField.split(/\s+/).slice(1).join(" ") || tithiField;
  return {
    samvatsara: ctx.samvatsara, ayana: ctx.ayana, ritu: ctx.ritu, masa: ctx.masa,
    paksha: ctx.paksha, vaara: ctx.vaara,
    tithi: tithi || undefined, nakshatra: nakField || undefined,
  };
}

/** General-purpose Sankalpam (lib/sankalpam). Family mode shows the plain
 * preview + explanation + any choices still to make; Reviewer mode adds the
 * per-slot table, the romanized + Telugu draft, and the identified sources. The
 * canonical short-form note the family sees is unchanged. */
function SankalpamBlock({
  mode, activeList, location, reviewMode, language, panchanga,
}: {
  mode: ParticipantMode;
  activeList: Participant[];
  location: LocationState;
  reviewMode: boolean;
  language: "EN" | "TE";
  panchanga?: LocationPanchanga | null;
}) {
  const te = language === "TE";
  const localDateISO =
    location.status === "READY"
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: location.timezone, year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date())
      : new Date().toISOString().slice(0, 10);

  const gen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja",
    deity: "Sri Maha Ganapati",
    groupMode: GROUP_MODE[mode],
    people: activeList.map((p) => ({
      name: p.name,
      lineage: { gotra: p.gotra, veda: p.veda, sutra: p.sutra, sampradaya: p.sampradaya },
    })),
    place:
      location.status === "READY"
        ? { country: location.country, region: location.region, timezone: location.timezone }
        : {},
    localDateISO,
    panchanga: panchangaSlots(panchanga),
  });

  return (
    <div className="sankalpam-block">
      <p className="sankalpam-note" lang={te ? "te" : undefined}>
        {te
          ? UI_TE.sankalpamNote
          : "This is the traditional short-form Sankalpam wording. Your names and place are not written into it."}
      </p>

      {reviewMode && (
        <div className="reviewer-only">
          <h5>Details for priest review (shown separately, not inserted into the mantra)</h5>
          <p>Sankalpam draft — general generator (SOURCED_BETA_CANDIDATE, not priest-approved).</p>
          <p className="sankalpam-explanation">{gen.englishExplanation}</p>
          <h6>Slots</h6>
          <table className="sankalpam-slots">
            <tbody>
              {gen.slots.map((sl) => (
                <tr key={sl.key} data-status={sl.status}>
                  <th scope="row">{sl.label}</th>
                  <td>{sl.value}</td>
                  <td>{sl.status}</td>
                  <td>{sl.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h6>Assembled draft (transliteration)</h6>
          <pre className="sankalpam-draft">{gen.transliteration}</pre>
          <h6>Assembled draft (Telugu — beta transcription, needs review)</h6>
          <pre className="sankalpam-draft" lang="te">{gen.teluguScript}</pre>
          <h6>Identified sources</h6>
          <ul>
            {gen.sources.map((src) => (
              <li key={src.id}>
                <strong>{src.title}</strong> — {src.publisher} (<a href={src.url}>{src.url}</a>,
                accessed {src.accessedISO}). Section: {src.section}. Scope: {src.traditionScope}.
                {src.disagreement ? ` Disagreement: ${src.disagreement}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The Vinayaka Vrata Katha — an original retelling (lib/pujas/vinayaka/
 * vrata-katha.ts). Family mode shows the story text in the chosen language;
 * Reviewer mode adds the rights basis and the identified sources. It is a
 * sourced beta candidate, never presented as priest-approved. */
function VrataKathaBlock({
  language, reviewMode,
}: {
  language: "EN" | "TE";
  reviewMode: boolean;
}) {
  const te = language === "TE";
  return (
    <div className="katha-block">
      <h4 lang={te ? "te" : undefined}>{te ? VRATA_KATHA_TITLE_TE : VRATA_KATHA_TITLE_EN}</h4>
      {VRATA_KATHA_SECTIONS.map((s) => (
        <section key={s.heading} className="katha-section">
          <h5 lang={te ? "te" : undefined}>{te ? s.headingTe : s.heading}</h5>
          <p lang={te ? "te" : undefined}>{te ? s.bodyTe : s.body}</p>
        </section>
      ))}
      {reviewMode && (
        <div className="reviewer-only">
          <h5>Vrata Katha — rights basis</h5>
          <p>{VRATA_KATHA_RIGHTS_BASIS}</p>
          <h6>Identified sources</h6>
          <ul>
            {VRATA_KATHA_SOURCES.map((src) => (
              <li key={src.work}>
                <strong>{src.work}</strong> — {src.locator}
                <br />
                <em>{src.rightsStatus}</em>
                {src.url && (
                  <>
                    {" "}
                    (<a href={src.url}>{src.url}</a>
                    {src.accessedISO ? `, accessed ${src.accessedISO}` : ""})
                  </>
                )}
                <br />
                Used for: {src.usedFor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PujaScreen({
  puja, stepIndex, setStepIndex, finish, path, language, setLanguage, activeList,
  mode = "SELF", location = { status: "NOT_SET" }, reviewMode = false, voices = [],
  panchanga = null,
}: {
  puja: PujaDefinition;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  finish: () => void;
  path: PujaPathId;
  language: "EN" | "TE";
  setLanguage: (value: "EN" | "TE") => void;
  activeList: Participant[];
  mode?: ParticipantMode;
  location?: LocationState;
  reviewMode?: boolean;
  voices?: readonly NarrationVoice[];
  /** Released Panchanga for the saved location — feeds the Sankalpam preview. */
  panchanga?: LocationPanchanga | null;
}) {
  const steps = stepsForPujaPath(puja, path);
  const safeIndex = clampPujaStepIndex(stepIndex, steps.length);
  const step = steps[safeIndex];
  const percent = Math.round(((safeIndex + 1) / steps.length) * 100);

  const approved = canDisplayAsGuidance(step.reviewStatus, step.provenance);
  const betaContent = betaContentFor(step);
  const unavailableReason = betaUnavailableReason(betaContent, step.provenance, approved);
  const showContent = unavailableReason === null;
  const rightsWithheld = unavailableReason === "WITHHELD_FOR_RIGHTS";

  const [voicePreference, setVoicePreference] = useState<VoicePreference>(
    () => loadVoicePreference(),
  );
  const [playback, setPlayback] = useState<"idle" | "playing" | "paused">("idle");

  // Every step change (Previous / Next / resume): move keyboard + screen-reader
  // focus to the new step heading, then put the top of that step in view. The
  // scroll owner is the .flow-content container on wide screens and the window
  // on narrow screens (the phone shell grows and the page scrolls), so both
  // are reset - each is a no-op for whichever one is not scrolling. Focus uses
  // preventScroll so it never causes its own visible jump; the heading carries
  // tabIndex={-1} so it is only ever focused programmatically.
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    const heading = headingRef.current;
    if (heading && typeof heading.focus === "function") {
      heading.focus({ preventScroll: true });
    }
    const scroller = heading?.closest(".flow-content") as HTMLElement | null;
    if (scroller && typeof scroller.scrollTo === "function") scroller.scrollTo(0, 0);
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo(0, 0);
    }
  }, [safeIndex]);

  const speechSupported = hasSpeechSynthesisSupport();
  // Plain-instruction narration follows the guidance language. For Telugu it
  // speaks this step's Telugu plain guidance when one exists, otherwise the
  // English draft (never the mantra - getNarrationText refuses every locked
  // step before the language branch is reached).
  const teInstruction = stepGuidanceTe(step.id)?.whatToDo ?? `${step.what} ${step.how}`.trim();
  const narrationText = getNarrationText(
    language === "TE" ? { ...step, teluguInstruction: teInstruction } : step,
    { language, approved, reviewMode },
  );
  const languageVoices = voicesForLanguage(voices, language);
  const chosenVoice = resolveVoice(voices, language, voicePreference[language]);
  const teluguVoiceMissing = language === "TE" && !chosenVoice;
  const audioDisabled = narrationText === null || teluguVoiceMissing || !speechSupported;

  // Device-voice narration is one more audio source under the shared
  // coordinator: starting it stops both app-hosted players, and any app-hosted
  // player (or navigation) stops it. Registered only while speech is supported.
  const DEVICE_SPEECH_ID = "audio:device-speech";
  useEffect(() => {
    if (!hasSpeechSynthesisSupport()) return;
    const unregister = register({
      id: DEVICE_SPEECH_ID,
      stop: () => {
        browserSpeechController().stop();
        setPlayback("idle");
      },
    });
    return unregister;
  }, []);

  // Step change, Previous, Home, language change and puja completion all stop
  // every audio source, app-hosted or device.
  const stopNarration = () => {
    stopAll();
    setPlayback("idle");
  };

  // Component unmount (Home, completion, route change) stops all audio.
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const handleReplay = () => {
    if (audioDisabled || !narrationText || !speechSupported) return;
    const lang = chosenVoice?.lang ?? (language === "TE" ? "te-IN" : "en-US");
    // Take sole playback: stops the app-hosted instruction/mantra players first.
    play(DEVICE_SPEECH_ID);
    browserSpeechController().speak(narrationText, chosenVoice, lang, {
      onEnd: () => {
        release(DEVICE_SPEECH_ID);
        setPlayback("idle");
      },
      onError: () => {
        release(DEVICE_SPEECH_ID);
        setPlayback("idle");
      },
    });
    setPlayback("playing");
  };

  const handlePauseToggle = () => {
    if (!speechSupported) return;
    if (playback === "playing") {
      browserSpeechController().pause();
      setPlayback("paused");
    } else if (playback === "paused") {
      play(DEVICE_SPEECH_ID);
      browserSpeechController().resume();
      setPlayback("playing");
    }
  };

  const changeLanguage = (next: "EN" | "TE") => {
    stopNarration();
    setLanguage(next);
  };

  const chooseVoice = (voiceURI: string) => {
    stopNarration();
    setVoicePreference(saveVoiceChoice(language, voiceURI || null));
  };

  const goNext = () => {
    stopNarration();
    if (safeIndex === steps.length - 1) finish();
    else setStepIndex(safeIndex + 1);
  };

  const goPrevious = () => {
    stopNarration();
    setStepIndex(Math.max(safeIndex - 1, 0));
  };

  const isSankalpam = step.candidateStepId === "sankalpa" || step.id === "sankalpa";
  const isVrataKatha = step.candidateStepId === "vrata-katha" || step.id === "vrata-katha";
  const tokens = step.teluguRecovery?.uncertainTokens ?? [];
  const hasRoman = Boolean(step.transliterationSupported && step.mantraTransliteration);

  // The instruction-language toggle governs EVERY plain-guidance string on the
  // card, not only narration. The sourced Telugu mantra is unaffected. Every
  // step has a full Telugu candidate translation (lib/content/step-guidance-te),
  // so Telugu mode shows no English guidance, material name, label or notice.
  const te = language === "TE";
  const g = stepGuidanceTe(step.id);
  const label = (english: string) => uiText(english, language);
  const doText = te && g ? g.whatToDo : step.how;
  const meaningText = te && g ? g.meaning : step.simpleMeaning;
  const whyText = te && g ? g.why : step.why;
  const safetyText = te ? (g?.safety ?? null) : step.termNote;
  const keepReadyList = te && g ? g.keepReady : step.materials;
  const audioTe = audioStrings(te);

  // App-hosted audio (lib/audio/manifest.ts). Every step ships an English and a
  // Telugu plain-instruction MP3, and every mantra step ships a Telugu
  // mantra-pronunciation candidate. The device-voice control below is only a
  // fallback for plain instructions if the file fails to load, never for a mantra.
  const plainAudio = plainInstructionAudio(step.id, language);
  const mantraAudio = step.mantraTeluguScript ? mantraCandidateAudio(step.id) : null;

  // The temporary device-voice control. Rendered by AppAudioPlayer only while
  // app-hosted plain audio is unavailable. getNarrationText already refuses
  // every locked step, so this is null on mantra steps.
  const deviceUnsupportedNote = te ? UI_TE.deviceUnsupported : DEVICE_NARRATION_UNSUPPORTED_NOTE;
  const teluguVoiceMissingNote = te ? UI_TE.teluguVoiceMissing : TELUGU_VOICE_UNAVAILABLE_NOTE;
  const deviceNarrationNote = te ? UI_TE.deviceNarrationNote : DEVICE_NARRATION_NOTE;

  const deviceNarrationFallback =
    narrationText !== null ? (
      <div className="device-fallback">
        <p className="device-fallback-head">{te ? UI_TE.deviceFallbackHead : "Temporary: your device’s own voice"}</p>
        <div className="audio-controls">
          <button
            className="audio-button"
            onClick={handleReplay}
            disabled={audioDisabled}
            title={
              !speechSupported
                ? deviceUnsupportedNote
                : teluguVoiceMissing
                  ? teluguVoiceMissingNote
                  : undefined
            }
          >
            <Volume2 size={20} /> {playback === "idle" ? label("Listen to plain instructions") : label("Replay")}
          </button>
          <button type="button" onClick={handlePauseToggle} disabled={playback === "idle"}>
            {playback === "paused" ? label("Resume") : label("Pause")}
          </button>
          <button type="button" onClick={stopNarration} disabled={playback === "idle"}>
            {label("Stop")}
          </button>
        </div>
        {!audioDisabled && languageVoices.length > 1 && (
          <label className="voice-select">
            {te ? UI_TE.voiceLabel : "Voice"}
            <select value={chosenVoice?.voiceURI ?? ""} onChange={(event) => chooseVoice(event.target.value)}>
              {languageVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>
              ))}
            </select>
          </label>
        )}
        <p className="audio-note">
          {!speechSupported
            ? deviceUnsupportedNote
            : teluguVoiceMissing
              ? teluguVoiceMissingNote
              : deviceNarrationNote}
        </p>
      </div>
    ) : null;

  return (
    <div className="flow-content puja-flow">
      <div className="step-line">
        <span lang={te ? "te" : undefined}>
          {te
            ? `దశ ${safeIndex + 1} / ${steps.length} · ${path === "SIMPLE" ? "సరళం" : "పూర్తి"}`
            : `Step ${safeIndex + 1} of ${steps.length} · ${path === "SIMPLE" ? "Simple" : "Complete"}`}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <article className="puja-card">
        <h1 ref={headingRef} tabIndex={-1} className="step-telugu-title" lang="te">
          {step.teluguTitle}
        </h1>
        {!te && <p className="step-english-title">{step.title}</p>}
        <p className="step-meta" lang={te ? "te" : undefined}>
          {label(step.importance === "CORE" ? "Simple + Complete" : "Complete path")}
          {" · "}
          {te
            ? `${UI_TE.minutesAbout} ${step.minutes} ${UI_TE.minutesUnit}`
            : `about ${step.minutes} min`}
        </p>

        <div className="language-toggle" aria-label="Instruction language">
          <button className={language === "EN" ? "active" : ""} onClick={() => changeLanguage("EN")}>English</button>
          <button className={language === "TE" ? "active" : ""} onClick={() => changeLanguage("TE")} lang="te">తెలుగు</button>
        </div>
        <p className="toggle-caption" lang={te ? "te" : undefined}>
          {te ? UI_TE.toggleCaption : "Changes every instruction below. The mantra itself does not change."}
        </p>

        {showContent ? (
          <>
            <section className="step-block step-keepready">
              <h4>{label("What to keep ready")}</h4>
              {keepReadyList && keepReadyList.length > 0 ? (
                <ul className="step-materials" lang={te ? "te" : undefined}>
                  {keepReadyList.map((m) => <li key={m}>{m}</li>)}
                </ul>
              ) : (
                <p lang={te ? "te" : undefined}>
                  {label("Nothing extra for this step — use what is already in your puja space.")}
                </p>
              )}
            </section>

            <div className="step-block step-do">
              <h4>{label("What to do")}</h4>
              <p lang={te ? "te" : undefined}>{doText}</p>
            </div>

            <AppAudioPlayer
              key={`plain-${step.id}-${language}`}
              asset={plainAudio}
              title={label("Listen to plain instructions")}
              pendingNote={te ? UI_TE.audioPendingPlain : PLAIN_AUDIO_PENDING_NOTE}
              errorNote={te ? UI_TE.audioError : PLAIN_AUDIO_ERROR_NOTE}
              strings={audioTe}
              fallback={deviceNarrationFallback}
            />

            {isVrataKatha && (
              <VrataKathaBlock language={language} reviewMode={reviewMode} />
            )}

            {step.mantraTeluguScript && (
              <div className="mantra-block">
                <h4>{isSankalpam ? label("Source Sankalpam candidate") : label("Mantra")}</h4>
                <pre className="mantra-te" lang="te">{step.mantraTeluguScript}</pre>
                {hasRoman && (
                  <details className="step-disclosure">
                    <summary>{label("Show the romanised reading")}</summary>
                    <pre className="mantra-roman" data-allow-latin="transliteration">{step.mantraTransliteration}</pre>
                  </details>
                )}
                {mantraAudio && (
                  <AppAudioPlayer
                    key={`mantra-${step.id}`}
                    asset={mantraAudio}
                    title={label("Play the mantra")}
                    pendingNote={te ? UI_TE.audioPendingMantra : MANTRA_AUDIO_PENDING_NOTE}
                    errorNote={te ? UI_TE.audioErrorMantra : MANTRA_AUDIO_ERROR_NOTE}
                    strings={audioTe}
                  />
                )}
              </div>
            )}

            {(meaningText || whyText || safetyText) && (
              <details className="step-disclosure">
                <summary>{label("More about this step")}</summary>
                {meaningText && (
                  <p lang={te ? "te" : undefined}>
                    <strong>{label("What this step is")}:</strong> {meaningText}
                  </p>
                )}
                {whyText && (
                  <p lang={te ? "te" : undefined}>
                    <strong>{label("Why we do it")}:</strong> {whyText}
                  </p>
                )}
                {safetyText && <p className="term-note" lang={te ? "te" : undefined}>{safetyText}</p>}
              </details>
            )}

            {isSankalpam && (
              <SankalpamBlock
                mode={mode}
                activeList={activeList}
                location={location}
                reviewMode={reviewMode}
                language={language}
                panchanga={panchanga}
              />
            )}
          </>
        ) : (
          <p className="info-note" lang={te ? "te" : undefined}>
            <ShieldCheck size={16} /> {te ? UI_TE.rightsWithheld : betaUnavailableNotice(unavailableReason)}
          </p>
        )}

        {reviewMode && !rightsWithheld && (
          <div className="reviewer-only">
            <ProvenancePanel reviewStatus={step.reviewStatus} provenance={step.provenance} />
            {step.betaClassification && (
              <p className="reviewer-line">
                Beta classification: {step.betaClassification}
                {step.classificationInferred ? " (BETA_CLASSIFICATION — inferred, editable in review)" : ""}
              </p>
            )}
            {step.teluguRecovery && (
              <p className="reviewer-line">
                Telugu transcription: page {step.teluguRecovery.sourcePage}, confidence{" "}
                {step.teluguRecovery.confidence}
                {step.teluguRecovery.transcriptionCheckRequired
                  ? " — BETA_TRANSCRIPTION_CHECK_REQUIRED"
                  : ""}
              </p>
            )}
            {tokens.length > 0 && (
              <ul className="reviewer-tokens">
                {tokens.map((t) => (
                  <li key={t.token}><strong lang="te">{t.token}</strong> — {t.note}</li>
                ))}
              </ul>
            )}
            {step.betaActionNeedsReview && (
              <p className="reviewer-line">Beginner action: BETA_ACTION_NEEDS_REVIEW.</p>
            )}
            {step.sourceRefs && step.sourceRefs.length > 0 && (
              <p className="reviewer-line">
                Source: {step.sourceRefs.map((r) => `${r.sourceId} p.${r.page}`).join("; ")}
              </p>
            )}
            {step.locked && (
              <div className="locked-note">
                <ShieldCheck size={18} />
                <span>
                  Exact wording and pronunciation audio stay locked until a
                  qualified reviewer approves them.
                </span>
              </div>
            )}
          </div>
        )}

      </article>

      <div className="step-actions">
        <button disabled={safeIndex === 0} onClick={goPrevious}>{label("Previous")}</button>
        <button className="primary-action" onClick={goNext}>
          {safeIndex === steps.length - 1 ? label("Finish puja") : label("Done, next")}{" "}
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
