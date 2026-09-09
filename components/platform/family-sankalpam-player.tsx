"use client";

// The family dynamic-audio Sankalpam (items 1–3).
//
//   Play → Part A (through "అస్మాకం సహ కుటుంబానాం")
//        → the hosted prompt MP3 "ఇప్పుడు కుటుంబ సభ్యుల పేర్లు చెప్పండి"
//        → the family says their OWN names aloud, locally
//   Resume → Part B ("…prityartham … karishye")
//
// Three <audio> elements (A, prompt, B). NO browser speech synthesis is used
// anywhere. All playback is routed through the shared coordinator so it stops
// on navigation / when another audio source starts.
//
// The full-Sankalpam player is shown ONLY when the displayed Sankalpam exactly
// matches the fixed audio (familyAudioMatchesGen). Otherwise it offers to
// switch to the standard short family form, or shows nothing.

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { familySankalpamAudio, audioAssetReady } from "@/lib/audio/manifest";
import {
  FAMILY_SANKALPAM_AUDIO, familyAudioMatchesGen, type GeneratedSankalpam,
} from "@/lib/sankalpam";
import { play, register, release } from "@/lib/audio/playback-coordinator";

type Phase = "idle" | "playing-a" | "playing-prompt" | "await-names" | "playing-b" | "done";

const HANDLE_ID = "audio:sankalpam-family";

export function FamilySankalpamPlayer({
  gen,
  language = "EN",
  onUseStandardForm,
}: {
  gen: Pick<GeneratedSankalpam, "groupMode" | "familySplitIndex" | "segments">;
  language?: "EN" | "TE";
  /** Wired to set choices to the standard short family form (the one the fixed
   * audio was recorded for). When absent, no switch button is shown. */
  onUseStandardForm?: () => void;
}) {
  const { partA, namePrompt, partB } = familySankalpamAudio();
  const aRef = useRef<HTMLAudioElement | null>(null);
  const promptRef = useRef<HTMLAudioElement | null>(null);
  const bRef = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const stop = () => {
    for (const el of [aRef.current, promptRef.current, bRef.current]) {
      if (el) {
        el.pause();
        try { el.currentTime = 0; } catch { /* not settable pre-metadata */ }
      }
    }
    setPhase((p) => (p === "done" ? p : "idle"));
  };
  useEffect(() => register({ id: HANDLE_ID, stop }), []);

  const te = language === "TE";
  const clipsReady =
    audioAssetReady(partA) && audioAssetReady(namePrompt) && audioAssetReady(partB) &&
    partA && namePrompt && partB;

  // Item 1: never offer full-Sankalpam audio for a configuration that differs
  // from what the fixed clips say.
  if (!familyAudioMatchesGen(gen)) {
    return (
      <div className="family-sankalpam family-sankalpam-unavailable">
        <p>
          {te
            ? "పూర్తి సంకల్ప ఆడియో ప్రామాణిక సంక్షిప్త కుటుంబ రూపానికి మాత్రమే అందుబాటులో ఉంది."
            : "Audio is available for the standard short family form."}
        </p>
        {onUseStandardForm && (
          <button type="button" className="app-audio-button" onClick={onUseStandardForm}>
            {te ? "ఆ రూపానికి మారండి" : "Switch to that form"}
          </button>
        )}
      </div>
    );
  }

  if (!clipsReady) return null;

  const T = te
    ? { play: "సంకల్పం వినండి", resume: "కొనసాగించండి", replay: "మొదటి నుండి మళ్ళీ" }
    : { play: "Play the Sankalpam", resume: "Resume", replay: "Replay from the start" };

  const startA = () => {
    const el = aRef.current;
    if (!el) return;
    play(HANDLE_ID);
    el.currentTime = 0;
    el.play().then(() => setPhase("playing-a"), () => setPhase("idle"));
  };

  const onAEnded = () => {
    const el = promptRef.current;
    setPhase("playing-prompt");
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => setPhase("await-names"));
    } else {
      setPhase("await-names");
    }
  };

  const onPromptEnded = () => setPhase("await-names");

  const resumeB = () => {
    const el = bRef.current;
    if (!el) return;
    play(HANDLE_ID);
    el.currentTime = 0;
    el.play().then(() => setPhase("playing-b"), () => setPhase("await-names"));
  };

  const onBEnded = () => {
    release(HANDLE_ID);
    setPhase("done");
  };

  return (
    <div className="family-sankalpam" data-phase={phase}>
      <p className="family-sankalpam-head">
        {te
          ? "కుటుంబ సంకల్పం — మొదటి భాగం వినండి, ఆగినప్పుడు మీ కుటుంబ సభ్యుల పేర్లు చెప్పండి, తర్వాత కొనసాగించండి."
          : "Family Sankalpam — play Part 1, say your family members’ names aloud at the pause, then Resume for Part 2."}
      </p>

      <audio ref={aRef} src={partA.src} preload="none" onEnded={onAEnded} onError={() => setPhase("idle")} />
      <audio ref={promptRef} src={namePrompt.src} preload="none" onEnded={onPromptEnded} onError={onPromptEnded} />
      <audio ref={bRef} src={partB.src} preload="none" onEnded={onBEnded} onError={() => setPhase("await-names")} />

      <div className="audio-controls">
        {(phase === "idle" || phase === "done") && (
          <button type="button" className="app-audio-button" onClick={startA}>
            <Volume2 size={20} /> {phase === "done" ? T.replay : T.play}
          </button>
        )}
        {phase === "playing-a" && <button type="button" disabled>{te ? "వినిపిస్తోంది…" : "Playing Part 1…"}</button>}
        {phase === "playing-prompt" && <button type="button" disabled>{te ? "పేర్లు అడుగుతోంది…" : "Asking for names…"}</button>}
        {phase === "await-names" && (
          <button type="button" className="app-audio-button" onClick={resumeB}>
            <Volume2 size={20} /> {T.resume}
          </button>
        )}
        {phase === "playing-b" && <button type="button" disabled>{te ? "వినిపిస్తోంది…" : "Playing Part 2…"}</button>}
        {phase !== "idle" && phase !== "done" && (
          <button type="button" onClick={stop}>{te ? "ఆపండి" : "Stop"}</button>
        )}
      </div>

      {(phase === "playing-prompt" || phase === "await-names") && (
        <p className="family-sankalpam-prompt" lang="te">
          {FAMILY_SANKALPAM_AUDIO.namePrompt.text}
          <span data-allow-latin="transliteration"> ({FAMILY_SANKALPAM_AUDIO.namePrompt.roman})</span>
          <br />
          <small>
            {te
              ? "ఇప్పుడు అందరూ తమ పేర్లు, గోత్రం (తెలిస్తే) చెప్పండి. ఆపై “కొనసాగించండి”."
              : "Everyone says their own name and Gotra (if known) now. Then press Resume."}
          </small>
        </p>
      )}

      <p className="audio-note">
        {te
          ? "ఉచ్చారణ మార్గదర్శి — కంప్యూటర్ స్వరం, పురోహితుని రికార్డింగ్ కాదు. పేర్లు యాప్‌లో నమోదు చేయబడవు, ఎక్కడికీ పంపబడవు."
          : "Pronunciation guide — a computer voice, not a priest’s recording. Your names are spoken by you, on this device; they are never recorded or sent anywhere."}
      </p>
    </div>
  );
}
