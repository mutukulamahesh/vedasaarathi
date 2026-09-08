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

import { ChevronRight, ShieldCheck, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { Participant, ParticipantMode } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";
import { canDisplayAsGuidance } from "@/lib/content/provenance";
import {
  RIGHTS_WITHHELD_NOTICE, canDisplayAsBetaCandidate,
} from "@/lib/content/beta-visibility";
import { assembleSankalpam } from "@/lib/pujas/vinayaka/sankalpam-assembly";
import {
  clampPujaStepIndex, stepsForPujaPath, type PujaDefinition, type PujaGuidedStep,
  type PujaPathId,
} from "@/lib/puja/types";
import {
  DEVICE_NARRATION_NOTE, DEVICE_NARRATION_UNSUPPORTED_NOTE, NARRATION_UNAVAILABLE_NOTE,
  TELUGU_VOICE_UNAVAILABLE_NOTE, getNarrationText,
} from "@/lib/speech/narration-policy";
import { browserSpeechController, hasSpeechSynthesisSupport } from "@/lib/speech/controller";
import {
  resolveVoice, voicesForLanguage, type NarrationVoice,
} from "@/lib/speech/voices";
import { loadVoicePreference, saveVoiceChoice, type VoicePreference } from "@/lib/storage/voice-preference";

import { ProvenancePanel } from "./review-display";

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
      <h4>This Sankalpam is spoken for</h4>
      <ul className="sankalpam-for">
        {s.spokenFor.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="sankalpam-framing">
        Source phrase: <span lang="te">{s.framingPhraseTelugu}</span> — {s.framingPhrase}.
      </p>
      {s.place && <p className="sankalpam-place">Country named (asmin daeSae): {s.place}</p>}
      <p className="sankalpam-lineage">{s.lineageNote}</p>
      {reviewMode && s.openQuestions.length > 0 && (
        <div className="reviewer-only">
          <h5>Sankalpam questions for the priest</h5>
          <ul>{s.openQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
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
  const betaOk = canDisplayAsBetaCandidate(betaContent, step.provenance);
  const withheld = step.betaStatus === "WITHHELD_FOR_RIGHTS";
  const showContent = !withheld && (approved || betaOk);

  const [voicePreference, setVoicePreference] = useState<VoicePreference>(
    () => loadVoicePreference(),
  );
  const [playback, setPlayback] = useState<"idle" | "playing" | "paused">("idle");

  const speechSupported = hasSpeechSynthesisSupport();
  const narrationText = getNarrationText(step, { language, approved, reviewMode });
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

  return (
    <div className="flow-content puja-flow">
      <div className="step-line">
        <span>Step {safeIndex + 1} of {steps.length} · {path === "SIMPLE" ? "Simple" : "Complete"}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <article className="puja-card">
        <p className="telugu-title" lang="te">{step.teluguTitle}</p>
        <h1>{step.title}</h1>
        <p className="step-meta">
          {step.importance === "CORE" ? "Simple + Complete" : "Complete path"} · about {step.minutes} min
        </p>

        {withheld ? (
          <p className="info-note"><ShieldCheck size={16} /> {RIGHTS_WITHHELD_NOTICE}</p>
        ) : showContent ? (
          <>
            {step.mantraTeluguScript && (
              <div className="mantra-block">
                <h4>Mantra</h4>
                <pre className="mantra-te" lang="te">{step.mantraTeluguScript}</pre>
                {step.transliterationSupported && step.mantraTransliteration && (
                  <pre className="mantra-roman">{step.mantraTransliteration}</pre>
                )}
              </div>
            )}

            {step.simpleMeaning && (
              <div className="step-block"><h4>What this step is</h4><p>{step.simpleMeaning}</p></div>
            )}
            <div className="step-block"><h4>What to do</h4><p>{step.how}</p></div>
            <div className="step-block"><h4>Why we do it</h4><p>{step.why}</p></div>
            {step.termNote && <p className="term-note">{step.termNote}</p>}

            {step.materials && step.materials.length > 0 && (
              <div className="step-block">
                <h4>What to hold or offer</h4>
                <ul className="step-materials">
                  {step.materials.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
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
          <p className="info-note"><ShieldCheck size={16} /> {RIGHTS_WITHHELD_NOTICE}</p>
        )}

        {reviewMode && !withheld && (
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

        {narrationText !== null && (
          <>
            <div className="language-toggle" aria-label="Instruction language">
              <button className={language === "EN" ? "active" : ""} onClick={() => changeLanguage("EN")}>English</button>
              <button className={language === "TE" ? "active" : ""} onClick={() => changeLanguage("TE")} lang="te">తెలుగు</button>
            </div>
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
                <Volume2 size={20} /> {playback === "idle" ? "Listen to plain instructions" : "Replay"}
              </button>
              <button type="button" onClick={handlePauseToggle} disabled={playback === "idle"}>
                {playback === "paused" ? "Resume" : "Pause"}
              </button>
              <button type="button" onClick={stopNarration} disabled={playback === "idle"}>
                Stop
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
          </>
        )}
        {narrationText === null && !withheld && (
          <p className="audio-note">{NARRATION_UNAVAILABLE_NOTE}</p>
        )}
      </article>

      <div className="step-actions">
        <button disabled={safeIndex === 0} onClick={goPrevious}>Previous</button>
        <button className="primary-action" onClick={goNext}>
          {safeIndex === steps.length - 1 ? "Finish puja" : "Done, next"}{" "}
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
