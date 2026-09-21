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
// - MANTRA_CANDIDATE audio is Telugu only, internally a "pronunciation
//   candidate" (status REVIEW_CANDIDATE), never "priest-approved". Browser TTS
//   never chants a mantra.
// - Delivered files are recorded in lib/audio/generated.json (per-step) and
//   lib/audio/generated-samples.json (voice-comparison samples); the manifest
//   flips those assets to GENERATED / REVIEW_CANDIDATE. Every per-step asset is
//   delivered today: 35 English plain (en-IN-PrabhatNeural), 35 Telugu plain
//   and 32 Telugu mantra-pronunciation candidates (te-IN-MohanNeural). See
//   public/audio/v1/README.md. PLANNED remains the state for any asset a future
//   step adds before its file is generated.
// - The default Telugu voice is te-IN-MohanNeural (DEFAULT_TELUGU_VOICE).

import { RITUAL_STEPS, type RitualStep } from "@/lib/content/steps";
import { stepGuidanceTe } from "@/lib/content/step-guidance-te";
import { FAMILY_SANKALPAM_AUDIO } from "@/lib/sankalpam/family-audio";
import generatedSamples from "./generated-samples.json";
import generatedSteps from "./generated.json";
import generatedSankalpam from "./generated-sankalpam.json";

/** The default Telugu voice for app-hosted audio (owner-selected). */
export const DEFAULT_TELUGU_VOICE =
  (generatedSteps as { defaultTeluguVoice?: string }).defaultTeluguVoice ?? "te-IN-MohanNeural";

/** Per-step files delivered by scripts/generate-audio.mjs (non-sample mode).
 * Keyed by manifest src; carries the delivered status + voice. */
const GENERATED_BY_SRC = new Map<string, { status: string; voice: string }>(
  ((generatedSteps as { files?: Array<Record<string, unknown>> }).files ?? []).map((f) => [
    String(f.src ?? ""),
    { status: String(f.status ?? ""), voice: String(f.voice ?? "") },
  ]),
);

/** Bump when the file layout or naming below changes. Files live under
 * `public/audio/<version>/` and are served from `/audio/<version>/...`. */
export const AUDIO_MANIFEST_VERSION = "v1";

export type AudioAssetKind = "PLAIN_INSTRUCTION" | "MANTRA_CANDIDATE";
export type AudioLanguage = "EN" | "TE";

/**
 * PLANNED   - no file bundled for this asset; the player shows the "being
 *             finalised" note. No per-step asset is PLANNED today.
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
  TE: `Hosted Telugu neural voice — default ${
    (generatedSteps as { defaultTeluguVoice?: string }).defaultTeluguVoice ?? "te-IN-MohanNeural"
  } (locale te-IN)`,
};

/** Apply a delivered file's status + voice to a per-step asset. */
function withDelivered(asset: AudioAsset): AudioAsset {
  const hit = GENERATED_BY_SRC.get(asset.src);
  if (!hit) return asset;
  return { ...asset, status: hit.status as AudioAssetStatus, voice: hit.voice || asset.voice };
}

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

/** Voice-tagged comparison samples produced by scripts/generate-audio.mjs
 * --sample. Registered in lib/audio/generated-samples.json; each has a
 * delivered file (GENERATED / REVIEW_CANDIDATE) and is checked by
 * scripts/validate-audio.mjs. These are NOT the per-step assets. */
export interface AudioSample extends AudioAsset {
  /** Filename suffix identifying the voice, e.g. "shruti" / "mohan". */
  tag: string;
  /** SSML prosody rate used, e.g. "-12%". */
  rate: string;
}

export const AUDIO_SAMPLES: readonly AudioSample[] = (
  (generatedSamples as { samples?: Array<Record<string, unknown>> }).samples ?? []
).map((s) => {
  const stepId = String(s.stepId ?? "");
  const step = RITUAL_STEPS.find((x) => x.id === stepId);
  const kind = s.kind === "MANTRA_CANDIDATE" ? "MANTRA_CANDIDATE" : "PLAIN_INSTRUCTION";
  const text =
    kind === "MANTRA_CANDIDATE"
      ? step?.mantraTeluguScript ?? ""
      : tePlainText(step ?? ({} as RitualStep));
  return {
    stepId,
    language: "TE" as const,
    kind: kind as AudioAssetKind,
    src: String(s.src ?? ""),
    status: (s.status === "GENERATED" ? "GENERATED" : "REVIEW_CANDIDATE") as AudioAssetStatus,
    voice: String(s.voice ?? ""),
    text,
    textRef: String(s.textRef ?? ""),
    contentVersion: step ? version(step) : "unversioned",
    tag: String(s.tag ?? ""),
    rate: String(s.rate ?? ""),
  };
});

/** The family dynamic-audio Sankalpam clips (Part A, the name pause prompt,
 * Part B). Telugu only; names are never in the text. Delivered when their
 * files are registered in lib/audio/generated-sankalpam.json. */
const SANKALPAM_SRC_STATUS = new Map<string, string>(
  ((generatedSankalpam as { files?: Array<Record<string, unknown>> }).files ?? []).map((f) => [
    String(f.src ?? ""),
    String(f.status ?? ""),
  ]),
);
export const SANKALPAM_FAMILY_AUDIO: readonly AudioAsset[] = (
  [
    ["family-a", FAMILY_SANKALPAM_AUDIO.partA],
    ["family-prompt", FAMILY_SANKALPAM_AUDIO.namePrompt],
    ["family-b", FAMILY_SANKALPAM_AUDIO.partB],
  ] as const
).map(([tag, clip]) => ({
  stepId: `sankalpa-${tag}`,
  language: "TE" as const,
  kind: "MANTRA_CANDIDATE" as AudioAssetKind,
  src: clip.src,
  status: (SANKALPAM_SRC_STATUS.get(clip.src) === "REVIEW_CANDIDATE"
    ? "REVIEW_CANDIDATE"
    : "PLANNED") as AudioAssetStatus,
  voice: VOICE_BY_LANGUAGE.TE,
  text: clip.text,
  textRef: "lib/sankalpam/family-audio.ts → FAMILY_SANKALPAM_AUDIO",
  contentVersion: "sankalpam-family-audio-v1",
}));

/** Every audio asset the app plans to host, in step order, plus any delivered
 * comparison samples and the family Sankalpam clips. A Telugu plain asset is
 * present only when Telugu source text exists for that step. */
/**
 * Steps that host NO plain-instruction audio (EN or TE).
 *  - "vrata-katha": a story to read or hear read aloud, not a short spoken
 *    instruction — a "plain instructions" clip would imply the katha is
 *    narrated when it is not.
 *  - "udvasana": the previously-recorded instruction narrated an UNRESOLVED
 *    physical gesture ("gently move the murti a little from its place") that
 *    the source does not support. The gesture is removed from every family
 *    visual; the pre-recorded instruction track cannot be regenerated without
 *    an external billable call, so it is disabled here. The sourced Udvasana
 *    VERSE audio (the mantra asset) is kept.
 */
export const NO_PLAIN_AUDIO_STEP_IDS = new Set<string>(["vrata-katha", "udvasana"]);

export const AUDIO_MANIFEST: readonly AudioAsset[] = [
  ...RITUAL_STEPS.flatMap((step) => {
    if (NO_PLAIN_AUDIO_STEP_IDS.has(step.id)) {
      return step.mantraTeluguScript ? [mantraAsset(step)].map(withDelivered) : [];
    }
    const entries: AudioAsset[] = [plainAsset(step, "EN", enPlainText(step))];
    const te = tePlainText(step);
    if (te) entries.push(plainAsset(step, "TE", te));
    if (step.mantraTeluguScript) entries.push(mantraAsset(step));
    // A delivered file (generated.json) flips the asset to GENERATED /
    // REVIEW_CANDIDATE and records the voice actually used.
    return entries.map(withDelivered);
  }),
  ...AUDIO_SAMPLES,
  ...SANKALPAM_FAMILY_AUDIO,
];

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

/** The three family dynamic-audio Sankalpam clips (Part A, name pause prompt,
 * Part B), or null for any not yet delivered. */
export function familySankalpamAudio(): {
  partA: AudioAsset | null;
  namePrompt: AudioAsset | null;
  partB: AudioAsset | null;
} {
  const by = (tag: string) =>
    SANKALPAM_FAMILY_AUDIO.find((a) => a.stepId === `sankalpa-${tag}`) ?? null;
  return { partA: by("family-a"), namePrompt: by("family-prompt"), partB: by("family-b") };
}

/** Per-step assets only (excludes the voice-comparison samples and the family
 * Sankalpam clips). */
const NON_STEP_SRCS = new Set<string>([
  ...AUDIO_SAMPLES.map((s) => s.src),
  ...SANKALPAM_FAMILY_AUDIO.map((s) => s.src),
]);
const STEP_ASSETS = AUDIO_MANIFEST.filter((a) => !NON_STEP_SRCS.has(a.src));

/** Counts for reporting / tests. `*` figures are per-step assets; `samples*`
 * covers the delivered voice-comparison files. */
export function audioManifestSummary() {
  const stepReady = STEP_ASSETS.filter((a) => a.status !== "PLANNED").length;
  return {
    version: AUDIO_MANIFEST_VERSION,
    total: STEP_ASSETS.length,
    ready: stepReady,
    planned: STEP_ASSETS.length - stepReady,
    enPlain: STEP_ASSETS.filter((a) => a.kind === "PLAIN_INSTRUCTION" && a.language === "EN").length,
    tePlain: STEP_ASSETS.filter((a) => a.kind === "PLAIN_INSTRUCTION" && a.language === "TE").length,
    mantraSlots: STEP_ASSETS.filter((a) => a.kind === "MANTRA_CANDIDATE").length,
    teTotal: STEP_ASSETS.filter((a) => a.language === "TE").length,
    samples: AUDIO_SAMPLES.length,
    samplesReady: AUDIO_SAMPLES.filter((a) => a.status !== "PLANNED").length,
    sankalpamFamily: SANKALPAM_FAMILY_AUDIO.length,
    sankalpamFamilyReady: SANKALPAM_FAMILY_AUDIO.filter((a) => a.status !== "PLANNED").length,
  };
}
