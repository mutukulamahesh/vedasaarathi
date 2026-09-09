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
import { assembleSankalpam } from "@/lib/pujas/vinayaka/sankalpam-assembly";
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
  stepGuidanceTe, uiText, TE_GUIDANCE_PENDING_NOTE,
} from "@/lib/content/step-guidance-te";
import { loadVoicePreference, saveVoiceChoice, type VoicePreference } from "@/lib/storage/voice-preference";
import { mantraCandidateAudio, plainInstructionAudio } from "@/lib/audio/manifest";

import { AppAudioPlayer } from "./audio-player";
import { ProvenancePanel } from "./review-display";

const PLAIN_AUDIO_PENDING_NOTE =
  "App-hosted spoken instructions (a natural voice, nothing to install) are " +
  "being finalised. Until then you can use your device's own voice below.";
const MANTRA_AUDIO_PENDING_NOTE =
  "App-hosted Telugu mantra audio is being prepared as a review candidate — it " +
  "will never be presented as priest-approved. For now, read the Telugu and the " +
  "romanised reading.";

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

function SankalpamBlock({
  mode, activeList, location, reviewMode,
}: {
  mode: ParticipantMode;
  activeList: Participant[];
  location: LocationState;
  reviewMode: boolean;
}) {
  const s = assembleSankalpam(mode, activeList, location);
  return (
    <div className="sankalpam-block">
      <p className="sankalpam-note">
        This is the traditional short-form Sankalpam wording. Your names and
        place are not written into it.
      </p>
      {reviewMode && (
        <div className="reviewer-only">
          <h5>Details for priest review (shown separately, not inserted into the mantra)</h5>
          <ul className="sankalpam-for">
            {s.spokenFor.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <p className="sankalpam-framing">
            Framing phrase in the source: <span lang="te">{s.framingPhraseTelugu}</span> — {s.framingPhrase}.
          </p>
          {s.place && <p className="sankalpam-place">Country slot (asmin daeSae): {s.place}</p>}
          <p className="sankalpam-lineage">{s.lineageNote}</p>
          {s.openQuestions.length > 0 && (
            <>
              <h6>Open questions</h6>
              <ul>{s.openQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PujaScreen({
  puja, stepIndex, setStepIndex, finish, path, language, setLanguage, activeList,
  mode = "SELF", location = { status: "NOT_SET" }, reviewMode = false, voices = [],
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

  const stopNarration = () => {
    if (speechSupported) browserSpeechController().stop();
    setPlayback("idle");
  };

  useEffect(() => {
    return () => {
      if (hasSpeechSynthesisSupport()) browserSpeechController().stop();
    };
  }, []);

  const handleReplay = () => {
    if (audioDisabled || !narrationText || !speechSupported) return;
    const lang = chosenVoice?.lang ?? (language === "TE" ? "te-IN" : "en-US");
    browserSpeechController().speak(narrationText, chosenVoice, lang, {
      onEnd: () => setPlayback("idle"),
      onError: () => setPlayback("idle"),
    });
    setPlayback("playing");
  };

  const handlePauseToggle = () => {
    if (!speechSupported) return;
    if (playback === "playing") {
      browserSpeechController().pause();
      setPlayback("paused");
    } else if (playback === "paused") {
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
  const tokens = step.teluguRecovery?.uncertainTokens ?? [];
  const hasRoman = Boolean(step.transliterationSupported && step.mantraTransliteration);
  const hasExplain = Boolean(step.simpleMeaning || step.why || step.termNote);

  // The instruction-language toggle governs every plain-guidance string on the
  // card, not only narration. Sourced mantra text is unaffected. Telugu plain
  // guidance exists for the practical prep steps; for a sourced step with no
  // Telugu translation yet, the English draft shows with an honest pending note.
  const te = language === "TE";
  const g = stepGuidanceTe(step.id);
  const label = (english: string) => uiText(english, language);
  const doText = te && g?.whatToDo ? g.whatToDo : step.how;
  const meaningText = te && g?.meaning ? g.meaning : step.simpleMeaning;
  const teGuidancePending = te && !g && (Boolean(step.how) || hasExplain);

  // App-hosted audio (lib/audio/manifest.ts). No file is bundled yet, so the
  // player shows its "being finalised" state; the device-voice control below is
  // only a temporary fallback for plain instructions, never for a mantra.
  const plainAudio = plainInstructionAudio(step.id, language);
  const mantraAudio = step.mantraTeluguScript ? mantraCandidateAudio(step.id) : null;

  // The temporary device-voice control. Rendered by AppAudioPlayer only while
  // app-hosted plain audio is unavailable. getNarrationText already refuses
  // every locked step, so this is null on mantra steps.
  const deviceNarrationFallback =
    narrationText !== null ? (
      <div className="device-fallback">
        <p className="device-fallback-head">Temporary: your device&rsquo;s own voice</p>
        <div className="audio-controls">
          <button
            className="audio-button"
            onClick={handleReplay}
            disabled={audioDisabled}
            title={
              !speechSupported
                ? DEVICE_NARRATION_UNSUPPORTED_NOTE
                : teluguVoiceMissing
                  ? TELUGU_VOICE_UNAVAILABLE_NOTE
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
            Voice
            <select value={chosenVoice?.voiceURI ?? ""} onChange={(event) => chooseVoice(event.target.value)}>
              {languageVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>
              ))}
            </select>
          </label>
        )}
        <p className="audio-note">
          {!speechSupported
            ? DEVICE_NARRATION_UNSUPPORTED_NOTE
            : teluguVoiceMissing
              ? TELUGU_VOICE_UNAVAILABLE_NOTE
              : DEVICE_NARRATION_NOTE}
        </p>
      </div>
    ) : null;

  return (
    <div className="flow-content puja-flow">
      <div className="step-line">
        <span>Step {safeIndex + 1} of {steps.length} · {path === "SIMPLE" ? "Simple" : "Complete"}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <article className="puja-card">
        <h1 ref={headingRef} tabIndex={-1} className="step-telugu-title" lang="te">
          {step.teluguTitle}
        </h1>
        <p className="step-english-title">{step.title}</p>
        <p className="step-meta">
          {label(step.importance === "CORE" ? "Simple + Complete" : "Complete path")} · about {step.minutes} min
        </p>

        <div className="language-toggle" aria-label="Instruction language">
          <button className={language === "EN" ? "active" : ""} onClick={() => changeLanguage("EN")}>English</button>
          <button className={language === "TE" ? "active" : ""} onClick={() => changeLanguage("TE")} lang="te">తెలుగు</button>
        </div>
        <p className="toggle-caption" lang={te ? "te" : undefined}>
          {te
            ? "కింది వివరణలన్నీ ఎంచుకున్న భాషలో చూపబడతాయి. మంత్రం మారదు."
            : "Changes every instruction below. The mantra itself does not change."}
        </p>

        {showContent ? (
          <>
            <section className="step-block step-keepready">
              <h4>{label("What to keep ready")}</h4>
              {step.materials && step.materials.length > 0 ? (
                <ul className="step-materials">
                  {step.materials.map((m) => <li key={m}>{m}</li>)}
                </ul>
              ) : (
                <p lang={te ? "te" : undefined}>
                  {label("Nothing extra for this step — use what is already in your puja space.")}
                </p>
              )}
            </section>

            <div className="step-block step-do">
              <h4>{label("What to do")}</h4>
              <p lang={te && g?.whatToDo ? "te" : undefined}>{doText}</p>
              {teGuidancePending && (
                <p className="te-pending-note" lang="te">{TE_GUIDANCE_PENDING_NOTE}</p>
              )}
            </div>

            <AppAudioPlayer
              key={`plain-${step.id}-${language}`}
              asset={plainAudio}
              title={label("Listen to plain instructions")}
              pendingNote={PLAIN_AUDIO_PENDING_NOTE}
              fallback={deviceNarrationFallback}
            />

            {step.mantraTeluguScript && (
              <div className="mantra-block">
                <h4>{isSankalpam ? "Source Sankalpam candidate" : label("Mantra")}</h4>
                <pre className="mantra-te" lang="te">{step.mantraTeluguScript}</pre>
                {hasRoman && (
                  <details className="step-disclosure">
                    <summary>{label("Show the romanised reading")}</summary>
                    <pre className="mantra-roman">{step.mantraTransliteration}</pre>
                  </details>
                )}
                {mantraAudio && (
                  <AppAudioPlayer
                    key={`mantra-${step.id}`}
                    asset={mantraAudio}
                    title="Play the mantra"
                    pendingNote={MANTRA_AUDIO_PENDING_NOTE}
                  />
                )}
              </div>
            )}

            {hasExplain && (
              <details className="step-disclosure">
                <summary>{label("More about this step")}</summary>
                {meaningText && (
                  <p lang={te && g?.meaning ? "te" : undefined}>
                    <strong>{label("What this step is")}:</strong> {meaningText}
                  </p>
                )}
                {step.why && <p><strong>{label("Why we do it")}:</strong> {step.why}</p>}
                {step.termNote && <p className="term-note">{step.termNote}</p>}
              </details>
            )}

            {isSankalpam && (
              <SankalpamBlock
                mode={mode}
                activeList={activeList}
                location={location}
                reviewMode={reviewMode}
              />
            )}
          </>
        ) : (
          <p className="info-note">
            <ShieldCheck size={16} /> {betaUnavailableNotice(unavailableReason)}
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
