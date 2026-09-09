"use client";

// App-hosted audio player for the guided puja. It plays an MP3 that ships with
// the app (see lib/audio/manifest.ts) - no device voice, nothing to install.
//
// - Play / Pause / Replay / Stop drive a real <audio> element.
// - When no app-hosted file is bundled yet (every asset is PLANNED today), it
//   renders an honest "being finalised" note. For plain instructions it then
//   shows the `fallback` (the temporary device-voice control). For a mantra it
//   shows no fallback at all: browser TTS never chants a mantra.
// - A MANTRA_CANDIDATE recording is always labelled a review candidate, never
//   verified or priest-approved.

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { audioAssetReady, type AudioAsset } from "@/lib/audio/manifest";

type Playback = "idle" | "playing" | "paused" | "ended";

export function AppAudioPlayer({
  asset,
  title,
  pendingNote,
  fallback,
}: {
  asset: AudioAsset | null;
  /** Label for the primary play button while idle, e.g. "Listen to plain instructions". */
  title: string;
  /** Shown when no app-hosted file is available yet. */
  pendingNote: string;
  /** Temporary device-voice control, rendered only for plain instructions and
   * only while the app-hosted file is unavailable. Never passed for a mantra. */
  fallback?: ReactNode;
}) {
  const ready = audioAssetReady(asset);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = useState<Playback>("idle");

  // The caller gives this component a `key` derived from the asset src, so a
  // step or language change remounts it and resets `playback` for free - no
  // reset effect needed.

  // Stop playback if this control unmounts.
  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el) {
        el.pause();
      }
    };
  }, []);

  if (!ready || !asset) {
    return (
      <div className="app-audio app-audio-pending">
        <p className="audio-note">{pendingNote}</p>
        {fallback}
      </div>
    );
  }

  const start = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play();
    setPlayback("playing");
  };

  const pauseResume = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playback === "playing") {
      el.pause();
      setPlayback("paused");
    } else if (playback === "paused") {
      void el.play();
      setPlayback("playing");
    }
  };

  const stop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setPlayback("idle");
  };

  const idle = playback === "idle" || playback === "ended";

  return (
    <div className="app-audio">
      <audio
        ref={audioRef}
        src={asset.src}
        preload="none"
        onEnded={() => setPlayback("ended")}
        onError={() => setPlayback("idle")}
      />
      <div className="audio-controls">
        <button type="button" className="app-audio-button" onClick={start}>
          <Volume2 size={20} /> {idle ? title : "Replay"}
        </button>
        <button type="button" onClick={pauseResume} disabled={idle}>
          {playback === "paused" ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={stop} disabled={playback === "idle"}>
          Stop
        </button>
      </div>
      {asset.kind === "MANTRA_CANDIDATE" && (
        <p className="audio-note">
          App-hosted mantra audio — a review candidate, not verified or
          priest-approved.
        </p>
      )}
    </div>
  );
}
