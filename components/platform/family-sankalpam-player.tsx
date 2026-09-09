"use client";

// The family dynamic-audio Sankalpam (item 3).
//
//   Play  → Part A plays through "అస్మాకం సహ కుటుంబానాం"
//   pause → the app shows (and speaks, if a device Telugu voice exists) the
//           prompt "ఇప్పుడు కుటుంబ సభ్యుల పేర్లు చెప్పండి"; the family says
//           their own names OUT LOUD, locally
//   Resume → Part B plays ("…prityartham … karishye")
//
// Names are never generated, never uploaded, never sent to Azure. Playback is
// routed through the shared coordinator so it stops on navigation / when
// another audio source starts.

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { familySankalpamAudio, audioAssetReady } from "@/lib/audio/manifest";
import { FAMILY_SANKALPAM_AUDIO } from "@/lib/sankalpam/family-audio";
import { play, register, release } from "@/lib/audio/playback-coordinator";
import { browserSpeechController, hasSpeechSynthesisSupport } from "@/lib/speech/controller";
import { resolveVoice } from "@/lib/speech/voices";
import type { NarrationVoice } from "@/lib/speech/voices";

type Phase = "idle" | "playing-a" | "await-names" | "playing-b" | "done";

const HANDLE_ID = "audio:sankalpam-family";

export function FamilySankalpamPlayer({
  language = "EN",
  voices = [],
}: {
  language?: "EN" | "TE";
  voices?: readonly NarrationVoice[];
}) {
  const { partA, partB } = familySankalpamAudio();
  const aRef = useRef<HTMLAudioElement | null>(null);
  const bRef = useRef<HTMLAudioElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const stop = () => {
    aRef.current?.pause();
    bRef.current?.pause();
    if (hasSpeechSynthesisSupport()) browserSpeechController().stop();
    setPhase((p) => (p === "done" ? p : "idle"));
  };
  useEffect(() => register({ id: HANDLE_ID, stop }), []);

  if (!audioAssetReady(partA) || !audioAssetReady(partB) || !partA || !partB) return null;

  const te = language === "TE";
  const T = te
    ? { play: "సంకల్పం వినండి", resume: "కొనసాగించండి", replay: "మొదటి నుండి మళ్ళీ", part2: "రెండవ భాగం వినండి" }
    : { play: "Play the Sankalpam", resume: "Resume", replay: "Replay from the start", part2: "Play Part 2" };

  const speakPrompt = () => {
    if (!hasSpeechSynthesisSupport()) return;
    const voice = resolveVoice(voices, "TE", null);
    if (!voice) return; // no device Telugu voice — the on-screen prompt is enough
    browserSpeechController().speak(
      FAMILY_SANKALPAM_AUDIO.namePrompt.text, voice, voice.lang || "te-IN",
    );
  };

  const startA = () => {
    const el = aRef.current;
    if (!el) return;
    play(HANDLE_ID);
    el.currentTime = 0;
    el.play().then(() => setPhase("playing-a"), () => setPhase("idle"));
  };

  const onAEnded = () => {
    setPhase("await-names");
    speakPrompt();
  };

  const resumeB = () => {
    const el = bRef.current;
    if (!el) return;
    if (hasSpeechSynthesisSupport()) browserSpeechController().stop();
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
      <audio ref={bRef} src={partB.src} preload="none" onEnded={onBEnded} onError={() => setPhase("await-names")} />

      <div className="audio-controls">
        {(phase === "idle" || phase === "done") && (
          <button type="button" className="app-audio-button" onClick={startA}>
            <Volume2 size={20} /> {phase === "done" ? T.replay : T.play}
          </button>
        )}
        {phase === "playing-a" && <button type="button" disabled>{te ? "వినిపిస్తోంది…" : "Playing Part 1…"}</button>}
        {phase === "await-names" && (
          <button type="button" className="app-audio-button" onClick={resumeB}>
            <Volume2 size={20} /> {T.resume}
          </button>
        )}
        {phase === "playing-b" && <button type="button" disabled>{te ? "వినిపిస్తోంది…" : "Playing Part 2…"}</button>}
        {(phase === "playing-a" || phase === "await-names" || phase === "playing-b") && (
          <button type="button" onClick={stop}>{te ? "ఆపండి" : "Stop"}</button>
        )}
      </div>

      {phase === "await-names" && (
        <p className="family-sankalpam-prompt" lang="te">
          {FAMILY_SANKALPAM_AUDIO.namePrompt.text}
          <span data-allow-latin="transliteration"> ({FAMILY_SANKALPAM_AUDIO.namePrompt.roman})</span>
          <br />
          <small>{te ? "ఇప్పుడు అందరూ తమ పేర్లు, గోత్రం (తెలిస్తే) చెప్పండి. ఆపై “కొనసాగించండి”." : "Everyone says their own name and Gotra (if known) now. Then press Resume."}</small>
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
