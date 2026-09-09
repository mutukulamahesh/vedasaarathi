// Versioned, app-hosted audio for the guided puja.
//
// WHY THIS EXISTS
// Browser SpeechSynthesis needs a Telugu voice installed on the device, which
// most phones do not have, so it cannot be the primary Telugu solution. This
// manifest describes audio files that ship WITH the app, so a family hears a
// natural Telugu voice with nothing to install. The device-voice control
// stays only as an explicitly-labelled temporary fallback.
//
// RULES ENFORCED HERE
// - A Telugu asset is DECLARED ONLY WHEN real Telugu source text exists
//   (lib/content/step-guidance-te.ts for plain guidance; RitualStep
//   .mantraTeluguScript for a mantra). Telugu audio is NEVER derived from
//   English text.
// - Every asset stores the EXACT narration text (`text`) plus a stable
//   reference to where it came from (`textRef`). scripts/validate-audio.mjs
//   hashes `text` and checks each GENERATED file against it.
// - MANTRA_CANDIDATE audio is Telugu only, a review candidate, never
//   "priest-approved". Browser TTS never chants a mantra.
// - No audio file is bundled yet: every asset is status "PLANNED".
//   See public/audio/v1/README.md and scripts/generate-audio.mjs.

import { RITUAL_STEPS, type RitualStep } from "@/lib/content/steps";
import { stepGuidanceTe } from "@/lib/content/step-guidance-te";

/** Bump when the file layout or naming below changes. Files live under
 * `public/audio/<version>/` and are served from `/audio/<version>/...`. */
export const AUDIO_MANIFEST_VERSION = "v1";

export type AudioAssetKind = "PLAIN_INSTRUCTION" | "MANTRA_CANDIDATE";
export type AudioLanguage = "EN" | "TE";

/**
 * PLANNED   - no file bundled yet; the player shows the "being finalised" note.
 * GENERATED - an app-hosted file is present and may be played.
 * REVIEW_CANDIDATE - a MANTRA_CANDIDATE file is present; playable, shown with
 *             the "review candidate, not priest-approved" wording.
 */
export type AudioAssetStatus = "PLANNED" | "GENERATED" | "REVIEW_CANDIDATE";

export interface AudioAsset {
  stepId: string;
  language: AudioLanguage;
  kind: AudioAssetKind;
  /** App-relative URL, served from public/. Fixed by the manifest so the
   * generator knows exactly which file to write. */
  src: string;
  status: AudioAssetStatus;
  /** The voice the generator must use. A hosted neural voice, not a device voice. */
  voice: string;
  /** The EXACT text to be narrated, resolved from source content. For a Telugu
   * asset this is always Telugu text - never an English string. */
  text: string;
  /** Stable reference to where `text` was taken from (module + field). */
  textRef: string;
  contentVersion: string;
}

const VOICE_BY_LANGUAGE: Record<AudioLanguage, string> = {
  EN: "Hosted Indian English neural voice (locale en-IN)",
  TE: "Hosted natural Indian Telugu neural voice (locale te-IN)",
};

const fileBase = () => `/audio/${AUDIO_MANIFEST_VERSION}`;
const version = (step: RitualStep) => step.provenance.contentVersion ?? "unversioned";

/** English plain-instruction text: the English draft. Always present. */
function enPlainText(step: RitualStep): string {
  return `${step.what} ${step.how}`.replace(/\s+/g, " ").trim();
}

/** Telugu plain-instruction text: the authored Telugu candidate guidance.
 * Returns "" when no Telugu text exists - the asset is then NOT declared. */
function tePlainText(step: RitualStep): string {
  const g = stepGuidanceTe(step.id);
  return (g?.whatToDo ?? "").trim();
}

function plainAsset(step: RitualStep, language: AudioLanguage, text: string): AudioAsset {
  return {
    stepId: step.id,
    language,
    kind: "PLAIN_INSTRUCTION",
    src: `${fileBase()}/${step.id}.${language.toLowerCase()}.plain.mp3`,
    status: "PLANNED",
    voice: VOICE_BY_LANGUAGE[language],
    text,
    textRef:
      language === "TE"
        ? "lib/content/step-guidance-te.ts → stepGuidanceTe(id).whatToDo"
        : "lib/content/steps.ts → RitualStep.what + ' ' + RitualStep.how",
    contentVersion: version(step),
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
    text: step.mantraTeluguScript ?? "",
    textRef: "lib/content/steps.ts → RitualStep.mantraTeluguScript (sourced, transcription-checked)",
    contentVersion: version(step),
  };
}

/** Every audio asset the app plans to host, in step order. A Telugu plain
 * asset is present only when Telugu source text exists for that step. */
export const AUDIO_MANIFEST: readonly AudioAsset[] = RITUAL_STEPS.flatMap((step) => {
  const entries: AudioAsset[] = [plainAsset(step, "EN", enPlainText(step))];
  const te = tePlainText(step);
  if (te) entries.push(plainAsset(step, "TE", te));
  if (step.mantraTeluguScript) entries.push(mantraAsset(step));
  return entries;
});

/** True when a real app-hosted file backs this asset (i.e. not PLANNED). */
export function audioAssetReady(asset: AudioAsset | null | undefined): boolean {
  return asset != null && asset.status !== "PLANNED";
}

/** The plain-instruction asset for a step in the chosen guidance language, or
 * null when none is declared (e.g. no Telugu source text for that step). */
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
  const byKind = (k: AudioAssetKind) => AUDIO_MANIFEST.filter((a) => a.kind === k).length;
  const byLang = (l: AudioLanguage) => AUDIO_MANIFEST.filter((a) => a.language === l).length;
  return {
    version: AUDIO_MANIFEST_VERSION,
    total,
    ready,
    planned: total - ready,
    enPlain: AUDIO_MANIFEST.filter((a) => a.kind === "PLAIN_INSTRUCTION" && a.language === "EN").length,
    tePlain: AUDIO_MANIFEST.filter((a) => a.kind === "PLAIN_INSTRUCTION" && a.language === "TE").length,
    mantraSlots: byKind("MANTRA_CANDIDATE"),
    teTotal: byLang("TE"),
  };
}
