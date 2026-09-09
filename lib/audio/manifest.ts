// Versioned, app-hosted audio for the guided puja.
//
// WHY THIS EXISTS
// Browser SpeechSynthesis needs a Telugu voice installed on the device, which
// most phones do not have, so it cannot be the primary Telugu solution. This
// manifest describes audio files that ship WITH the app, so a family hears
// natural Telugu plain instructions with nothing to install. The device-voice
// control remains only as an explicitly-labelled temporary fallback.
//
// WHAT IS AND IS NOT HERE
// - PLAIN_INSTRUCTION: spoken "what to keep ready / what to do" for a step, one
//   file per language. English uses an Indian English voice; Telugu uses a
//   natural Indian Telugu neural voice.
// - MANTRA_CANDIDATE: a separate spoken-mantra slot for every mantra step,
//   Telugu only. Generated mantra audio is a REVIEW CANDIDATE - never
//   described as verified or priest-approved - and browser TTS is NEVER used
//   to chant a mantra.
// - No audio file is bundled yet: every asset is status "PLANNED". The player
//   renders its honest "being finalised" state until a real file is present.
//   See public/audio/v1/README.md for the exact generation command, provider
//   and credential required to produce the MP3s.

import { RITUAL_STEPS, type RitualStep } from "@/lib/content/steps";

/** Bump when the file layout or naming below changes. Files live under
 * `public/audio/<version>/` and are served from `/audio/<version>/...`. */
export const AUDIO_MANIFEST_VERSION = "v1";

export type AudioAssetKind = "PLAIN_INSTRUCTION" | "MANTRA_CANDIDATE";
export type AudioLanguage = "EN" | "TE";

/**
 * PLANNED   - no file bundled yet; the player shows the "being finalised" note.
 * GENERATED - an app-hosted file is present and may be played.
 * REVIEW_CANDIDATE - a MANTRA_CANDIDATE file is present; playable, but shown
 *             with the "review candidate, not priest-approved" wording.
 */
export type AudioAssetStatus = "PLANNED" | "GENERATED" | "REVIEW_CANDIDATE";

export interface AudioAsset {
  stepId: string;
  language: AudioLanguage;
  kind: AudioAssetKind;
  /** App-relative URL, served from public/. Present even while PLANNED so the
   * generation step knows the exact filename to write. */
  src: string;
  status: AudioAssetStatus;
  /** Human description of the voice the generator must use. Not a device voice. */
  voice: string;
  /** What the spoken text is drawn from - never invented for the recording. */
  sourceTextRef: string;
  contentVersion: string;
}

const VOICE_BY_LANGUAGE: Record<AudioLanguage, string> = {
  EN: "Indian English neural voice (locale en-IN)",
  TE: "Natural Indian Telugu neural voice (locale te-IN)",
};

function fileBase(): string {
  return `/audio/${AUDIO_MANIFEST_VERSION}`;
}

function plainAsset(step: RitualStep, language: AudioLanguage): AudioAsset {
  return {
    stepId: step.id,
    language,
    kind: "PLAIN_INSTRUCTION",
    src: `${fileBase()}/${step.id}.${language.toLowerCase()}.plain.mp3`,
    status: "PLANNED",
    voice: VOICE_BY_LANGUAGE[language],
    sourceTextRef:
      language === "TE"
        ? "lib/content/step-guidance-te.ts (authored Telugu plain guidance) or the English draft when absent"
        : "RitualStep.what + RitualStep.how (English plain draft)",
    contentVersion: step.provenance.contentVersion ?? "unversioned",
  };
}

function mantraAsset(step: RitualStep): AudioAsset {
  return {
    stepId: step.id,
    language: "TE",
    kind: "MANTRA_CANDIDATE",
    src: `${fileBase()}/${step.id}.mantra.te.mp3`,
    status: "PLANNED",
    voice: VOICE_BY_LANGUAGE.TE,
    sourceTextRef: "RitualStep.mantraTeluguScript (sourced, transcription-checked candidate)",
    contentVersion: step.provenance.contentVersion ?? "unversioned",
  };
}

/** Every audio asset the app plans to host, in step order. */
export const AUDIO_MANIFEST: readonly AudioAsset[] = RITUAL_STEPS.flatMap((step) => {
  const entries: AudioAsset[] = [
    plainAsset(step, "EN"),
    plainAsset(step, "TE"),
  ];
  if (step.mantraTeluguScript) entries.push(mantraAsset(step));
  return entries;
});

/** True when a real app-hosted file backs this asset (i.e. not PLANNED). */
export function audioAssetReady(asset: AudioAsset | null | undefined): boolean {
  return asset != null && asset.status !== "PLANNED";
}

/** The plain-instruction asset for a step in the chosen guidance language. */
export function plainInstructionAudio(
  stepId: string,
  language: AudioLanguage,
): AudioAsset | null {
  return (
    AUDIO_MANIFEST.find(
      (a) => a.kind === "PLAIN_INSTRUCTION" && a.stepId === stepId && a.language === language,
    ) ?? null
  );
}

/** The Telugu mantra-audio candidate slot for a mantra step, or null. */
export function mantraCandidateAudio(stepId: string): AudioAsset | null {
  return (
    AUDIO_MANIFEST.find((a) => a.kind === "MANTRA_CANDIDATE" && a.stepId === stepId) ?? null
  );
}

/** Counts for reporting / tests. */
export function audioManifestSummary() {
  const total = AUDIO_MANIFEST.length;
  const ready = AUDIO_MANIFEST.filter((a) => a.status !== "PLANNED").length;
  const planned = total - ready;
  const mantra = AUDIO_MANIFEST.filter((a) => a.kind === "MANTRA_CANDIDATE").length;
  return { version: AUDIO_MANIFEST_VERSION, total, ready, planned, mantraSlots: mantra };
}
