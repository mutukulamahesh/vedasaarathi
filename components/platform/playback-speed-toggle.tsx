"use client";

// The compact playback-speed choice (1.1x default / 1.0x original), shown
// everywhere a family can start recorded audio: the guided puja (PujaScreen)
// and Sankalpam Practice (so the choice can be made before entering the
// guided puja too). One shared component so both places stay visually and
// behaviourally identical, reading/writing the same on-device preference
// (lib/storage/playback-speed.ts) every mounted <audio> element applies.

import { useSyncExternalStore } from "react";

import {
  getPlaybackSpeedSnapshot, getServerPlaybackSpeedSnapshot,
  setPlaybackSpeed, subscribeToPlaybackSpeed, type PlaybackSpeed,
} from "@/lib/storage/playback-speed";

export function PlaybackSpeedToggle({ language = "EN" }: { language?: "EN" | "TE" }) {
  const te = language === "TE";
  const playbackSpeed = useSyncExternalStore(
    subscribeToPlaybackSpeed, getPlaybackSpeedSnapshot, getServerPlaybackSpeedSnapshot,
  );
  return (
    <div className="playback-speed-toggle" role="group" aria-label={te ? "వినికిడి వేగం" : "Playback speed"}>
      <button
        type="button"
        className={playbackSpeed === 1.1 ? "active" : ""}
        aria-pressed={playbackSpeed === 1.1}
        onClick={() => setPlaybackSpeed(1.1 as PlaybackSpeed)}
      >
        {te ? "1.1x వేగం" : "1.1x speed"}
      </button>
      <button
        type="button"
        className={playbackSpeed === 1 ? "active" : ""}
        aria-pressed={playbackSpeed === 1}
        onClick={() => setPlaybackSpeed(1 as PlaybackSpeed)}
      >
        {te ? "1.0x అసలు వేగం" : "1.0x original"}
      </button>
    </div>
  );
}
