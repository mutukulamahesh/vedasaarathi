"use client";

// The guided-puja screen. It renders whichever puja's steps are passed in via
// `puja: PujaDefinition` - it holds no import of RITUAL_STEPS or any other
// Vinayaka content constant, so the same component works for any future puja
// service with the same shape.
//
// `reviewMode` is presentation-mode chrome only (REVIEWER shows review
// status, source/provenance, and draft warnings; FAMILY_BETA does not repeat
// them through the flow). It never changes canDisplayAsGuidance's decision -
// `approved` below is computed the same way regardless of reviewMode, and a
// step that has not passed review still never shows its instructions outside
// the explicit, reviewer-only "private review build" candidate view.

import { ChevronRight, ShieldCheck, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { Participant } from "@/lib/content/participants";
import { canDisplayAsGuidance } from "@/lib/content/provenance";
import {
  clampPujaStepIndex, stepsForPujaPath, type PujaDefinition, type PujaPathId,
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

import { AwaitingReview, ReviewChip } from "./review-display";

export function PujaScreen({
  puja, stepIndex, setStepIndex, finish, path, language, setLanguage, activeList,
  reviewMode = false, voices = [],
}: {
  puja: PujaDefinition;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  finish: () => void;
  path: PujaPathId;
  language: "EN" | "TE";
  setLanguage: (value: "EN" | "TE") => void;
  activeList: Participant[];
  reviewMode?: boolean;
  voices?: readonly NarrationVoice[];
}) {
  const steps = stepsForPujaPath(puja, path);
  const safeIndex = clampPujaStepIndex(stepIndex, steps.length);
  const step = steps[safeIndex];
  const percent = Math.round(((safeIndex + 1) / steps.length) * 100);
  const approved = canDisplayAsGuidance(step.reviewStatus, step.provenance);
  // This owner-only build is a content-review candidate. It lets the owner and
  // priest walk through draft actions, but never changes their review status.
  const showCandidate = reviewMode && !approved && step.reviewStatus === "REVIEW_REQUIRED";
  const mayShowInstructions = approved || showCandidate;

  const [voicePreference, setVoicePreference] = useState<VoicePreference>(
    () => loadVoicePreference(),
  );
  const [playback, setPlayback] = useState<"idle" | "playing" | "paused">("idle");

  const speechSupported = hasSpeechSynthesisSupport();

  // The exact same rule that gates the visible What/How/Why text - narration
  // can never say more than the screen already shows.
  const narrationText = getNarrationText(step, { language, approved, reviewMode });
  const languageVoices = voicesForLanguage(voices, language);
  const chosenVoice = resolveVoice(voices, language, voicePreference[language]);
  // Telugu is never read by an English, Hindi, or generic voice: if none is
  // found the button stays disabled rather than falling back to another voice.
  const teluguVoiceMissing = language === "TE" && !chosenVoice;
  // Applies to both languages: with no speech engine at all, nothing narrates.
  const audioDisabled = narrationText === null || teluguVoiceMissing || !speechSupported;

  const stopNarration = () => {
    if (speechSupported) browserSpeechController().stop();
    setPlayback("idle");
  };

  // Stop any narration in progress when this screen goes away for any reason -
  // including the top Back button, which unmounts PujaScreen without going
  // through goNext/goPrevious/changeLanguage below.
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
    if (safeIndex === steps.length - 1) {
      finish();
    } else {
      setStepIndex(safeIndex + 1);
    }
  };

  const goPrevious = () => {
    stopNarration();
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
        {showCandidate && <div className="reviewer-banner"><ShieldCheck size={16} /><span><strong>Private review build</strong> — ritual wording below is a candidate, not approved guidance.</span></div>}
        <div className="language-toggle" aria-label="Instruction language">
          <button className={language === "EN" ? "active" : ""} onClick={() => changeLanguage("EN")}>English</button>
          <button className={language === "TE" ? "active" : ""} onClick={() => changeLanguage("TE")} lang="te">తెలుగు</button>
        </div>
        <p className="telugu-title" lang="te">{step.teluguTitle}</p>
        <h1>{step.title}</h1>
        <p className="step-meta">{step.importance === "CORE" ? "Core path" : "Optional step"} · about {step.minutes} min</p>

        {mayShowInstructions ? (
          <>
            {language === "TE" ? (
              <div className="step-block" lang="te"><h4>ఏం చేయాలి</h4><p>{step.teluguInstruction}</p></div>
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
        {mayShowInstructions && step.termNote && (
          <p className="term-note">{step.termNote}</p>
        )}

        {step.id === "sankalpam" && (
          <div className="participant-review"><strong>People in this Sankalpam</strong><p>{activeList.map((person) => person.name).join(", ")}</p><small>Unknown lineage remains unknown. No deity or generic Gotra is assigned.</small></div>
        )}

        {reviewMode && <ReviewChip status={step.reviewStatus} />}

        {step.locked && (
          <div className="locked-note">
            <ShieldCheck size={18} />
            <span>
              The exact words and audio for this step stay locked until a
              qualified reviewer approves them.
            </span>
          </div>
        )}

        <div className="audio-controls">
          <button
            className="audio-button"
            onClick={handleReplay}
            disabled={audioDisabled}
            title={
              narrationText === null
                ? "Awaiting review"
                : !speechSupported
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
          {!mayShowInstructions
            ? NARRATION_UNAVAILABLE_NOTE
            : !speechSupported
              ? DEVICE_NARRATION_UNSUPPORTED_NOTE
              : teluguVoiceMissing
                ? TELUGU_VOICE_UNAVAILABLE_NOTE
                : DEVICE_NARRATION_NOTE}
        </p>
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
