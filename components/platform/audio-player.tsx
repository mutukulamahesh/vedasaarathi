"use client";

// App-hosted audio player for the guided puja. It plays an MP3 that ships with
// the app (see lib/audio/manifest.ts) - no device voice, nothing to install.
//
// - Play / Pause / Replay / Stop drive a real <audio> element.
// - Playback is routed through lib/audio/playback-coordinator: starting this
//   player stops every other audio source (the other instruction/mantra player
//   and the device-voice fallback), so two recordings never sound together.
//   The player registers a handle on mount and unregisters (and stops) on
//   unmount; navigation calls the coordinator's stopAll().
// - When no app-hosted file is bundled for this asset, it renders an honest
//   "being finalised" note. For plain instructions it then shows the `fallback`
//   (the temporary device-voice control). For a mantra it shows no fallback at
//   all: browser TTS never chants a mantra.
// - If the file fails to load or play, it shows `errorNote` and (for plain
//   instructions) the same fallback, so the family is never stuck.
// - A MANTRA_CANDIDATE recording is internally a "pronunciation candidate"
//   (status REVIEW_CANDIDATE). The family-facing line only says what it is - a
//   computer voice, not a priest's recording - with no review-process wording.

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { audioAssetReady, type AudioAsset } from "@/lib/audio/manifest";
import { play, register, release } from "@/lib/audio/playback-coordinator";

type Playback = "idle" | "playing" | "paused" | "ended" | "error";

export interface AudioPlayerStrings {
  replay: string;
  pause: string;
  resume: string;
  stop: string;
  candidateNote: string;
}

const EN_STRINGS: AudioPlayerStrings = {
  replay: "Replay",
  pause: "Pause",
  resume: "Resume",
  stop: "Stop",
  candidateNote:
    "App-hosted pronunciation guide — a computer voice, not a priest’s recording.",
};

export function AppAudioPlayer({
  asset,
  title,
  pendingNote,
  errorNote,
  strings = EN_STRINGS,
  fallback,
}: {
  asset: AudioAsset | null;
  /** Label for the primary play button while idle. */
  title: string;
  /** Shown when no app-hosted file is available yet. */
  pendingNote: string;
  /** Shown when the file fails to load or play. */
  errorNote?: string;
  strings?: AudioPlayerStrings;
  /** Temporary device-voice control, rendered only for plain instructions and
   * only while the app-hosted file is unavailable or failed. */
  fallback?: ReactNode;
}) {
  const ready = audioAssetReady(asset);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = useState<Playback>("idle");

  // The caller gives this component a `key` derived from the asset src, so a
  // step or language change remounts it and resets `playback` for free.

  // Register this player with the shared coordinator so any other audio source
  // can stop it, and it is stopped on unmount / on navigation's stopAll().
  const handleId = `audio:${asset?.src ?? "none"}`;
  useEffect(() => {
    const stop = () => {
      const el = audioRef.current;
      if (el) {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          /* not always settable before metadata loads */
        }
      }
      // Reset to idle only from an active state; never clear a sticky "error"
      // (that would hide the device fallback the family may now be using).
      setPlayback((p) =>
        p === "playing" || p === "paused" || p === "ended" ? "idle" : p,
      );
    };
    const unregister = register({ id: handleId, stop });
    return unregister;
  }, [handleId]);

  if (!ready || !asset) {
    return (
      <div className="app-audio app-audio-pending">
        <p className="audio-note">{pendingNote}</p>
        {fallback}
      </div>
    );
  }

  const errored = playback === "error";

  const start = () => {
    const el = audioRef.current;
    if (!el) return;
    // Take sole playback first: this stops the other instruction/mantra player
    // and the device voice before this file is allowed to sound.
    play(handleId);
    el.currentTime = 0;
    el.play().then(
      () => setPlayback("playing"),
      () => {
        release(handleId);
        setPlayback("error");
      },
    );
  };

  const pauseResume = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playback === "playing") {
      el.pause();
      setPlayback("paused");
      release(handleId);
    } else if (playback === "paused") {
      play(handleId);
      el.play().then(
        () => setPlayback("playing"),
        () => {
          release(handleId);
          setPlayback("error");
        },
      );
    }
  };

  const stop = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setPlayback("idle");
    release(handleId);
  };

  const idle = playback === "idle" || playback === "ended";

  return (
    <div className={`app-audio${errored ? " app-audio-error" : ""}`}>
      <audio
        ref={audioRef}
        src={asset.src}
        preload="none"
        onEnded={() => {
          setPlayback("ended");
          release(handleId);
        }}
        onError={() => {
          setPlayback("error");
          release(handleId);
        }}
      />
      {errored ? (
        <>
          <p className="audio-note">{errorNote ?? EN_STRINGS.candidateNote}</p>
          {fallback}
        </>
      ) : (
        <>
          <div className="audio-controls">
            <button type="button" className="app-audio-button" onClick={start}>
              <Volume2 size={20} /> {idle ? title : strings.replay}
            </button>
            <button type="button" onClick={pauseResume} disabled={idle}>
              {playback === "paused" ? strings.resume : strings.pause}
            </button>
            <button type="button" onClick={stop} disabled={playback === "idle"}>
              {strings.stop}
            </button>
          </div>
          {asset.kind === "MANTRA_CANDIDATE" && (
            <p className="audio-note">{strings.candidateNote}</p>
          )}
        </>
      )}
    </div>
  );
}
