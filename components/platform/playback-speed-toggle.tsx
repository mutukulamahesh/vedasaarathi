"use client";

// The compact playback-speed choice (1.0x original / 1.1x default / 1.2x),
// shown everywhere a family can start recorded audio: the guided puja
// (PujaScreen) and Sankalpam Practice (so the choice can be made before
// entering the guided puja too). One shared component so both places stay
// visually and behaviourally identical, reading/writing the same on-device
// preference (lib/storage/playback-speed.ts) every mounted <audio> element
// applies - instruction, mantra, and family Sankalpam audio alike.

import { useSyncExternalStore } from "react";

import {
  getPlaybackSpeedSnapshot, getServerPlaybackSpeedSnapshot,
  setPlaybackSpeed, subscribeToPlaybackSpeed, type PlaybackSpeed,
} from "@/lib/storage/playback-speed";

const SPEEDS: readonly { value: PlaybackSpeed; en: string; te: string }[] = [
  { value: 1, en: "1.0x original", te: "1.0x అసలు వేగం" },
  { value: 1.1, en: "1.1x speed", te: "1.1x వేగం" },
  { value: 1.2, en: "1.2x speed", te: "1.2x వేగం" },
];

export function PlaybackSpeedToggle({ language = "EN" }: { language?: "EN" | "TE" }) {
  const te = language === "TE";
  const playbackSpeed = useSyncExternalStore(
    subscribeToPlaybackSpeed, getPlaybackSpeedSnapshot, getServerPlaybackSpeedSnapshot,
  );
  return (
    <div className="playback-speed-toggle" role="group" aria-label={te ? "వినికిడి వేగం" : "Playback speed"}>
      {SPEEDS.map((s) => (
        <button
          key={s.value}
          type="button"
          className={playbackSpeed === s.value ? "active" : ""}
          aria-pressed={playbackSpeed === s.value}
          onClick={() => setPlaybackSpeed(s.value)}
        >
          {te ? s.te : s.en}
        </button>
      ))}
    </div>
  );
}
