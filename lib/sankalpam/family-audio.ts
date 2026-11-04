// The family dynamic-audio Sankalpam (item 3).
//
// The FIXED, pre-recorded audio for the family form is split at
// "అస్మాకం సహ కుటుంబానాం": Part A plays → the hosted prompt MP3 plays → the
// family says their OWN names aloud, locally → Resume → Part B.
//
// The names are NEVER in the audio, never generated, never uploaded, never
// sent to Azure. This text is the date- and location-independent SHORT form,
// with the place clause and the Gotra line omitted, so exactly three clips
// serve every family. The full-Sankalpam player is shown ONLY when the
// generated Telugu (with « » markers removed) matches these clips exactly
// (familyAudioMatchesGen); for any other configuration the app offers to
// switch to STANDARD_SHORT_FAMILY_CHOICES or shows no full-Sankalpam audio.
//
// Part A and the name prompt are the SAME generic calendar-framing and
// family-address text for every puja (they name no deity or purpose), so
// they are shared. Part B ("…prityartham … karishye.") names the deity and
// the puja's own purpose, so it is puja-specific - PART_B_BY_SLUG keys it by
// puja slug (lib/puja/catalogue.ts), one fixed clip per puja, matching that
// puja's own canonical Telugu karma/deity (lib/sankalpam/from-app.ts
// CANONICAL_KARMA). FAMILY_SANKALPAM_AUDIO.partB keeps its original,
// unparameterised value (Vinayaka's) so every existing call site that reads
// it directly keeps working unchanged.

import type { SankalpamChoices } from "./choices";
import type { GeneratedSankalpam } from "./generator";

export interface FamilySankalpamClip {
  src: string;
  text: string;
}

export interface FamilySankalpamPromptClip extends FamilySankalpamClip {
  roman: string;
}

/** Frame → "…asmakam saha kutumbanam,". Clean Telugu, no « » markers. Shared
 * by every puja - this text names no deity or purpose. */
const PART_A: FamilySankalpamClip = {
  src: "/audio/v1/sankalpa.family-a.te.mp3",
  text:
    "శుభే శోభనే ముహూర్తే, శ్రీ మహావిష్ణోరాజ్ఞయా ప్రవర్తమానస్య, అద్య బ్రహ్మణః " +
    "ద్వితీయ పరార్ధే, శ్వేతవరాహకల్పే, వైవస్వతమన్వంతరే, కలియుగే, ప్రథమపాదే, " +
    "జంబూద్వీపే, భరతవర్షే, భరతఖండే, మేరోః దక్షిణదిగ్భాగే, అస్మిన్ వర్తమానే " +
    "వ్యావహారికే, శుభతిథౌ శుభముహూర్తే, అస్మాకం సహ కుటుంబానాం,",
};

/** The pause prompt, spoken/shown between Part A and Part B. Shared by every
 * puja - it only asks for names, naming no deity or purpose. */
const NAME_PROMPT: FamilySankalpamPromptClip = {
  src: "/audio/v1/sankalpa.family-prompt.te.mp3",
  text: "ఇప్పుడు కుటుంబ సభ్యుల పేర్లు చెప్పండి.",
  roman: "ippudu kutumba sabhyula perlu cheppandi.",
};

/** "…prityartham … karishye." for Vinayaka Chavithi. */
const VINAYAKA_PART_B: FamilySankalpamClip = {
  src: "/audio/v1/sankalpa.family-b.te.mp3",
  text:
    "మమ ఉపాత్త సమస్త దురితక్షయద్వారా శ్రీ మహాగణపతి ప్రీత్యర్థం వినాయక చవితి " +
    "పూజ కరిష్యే.",
};

/** "…prityartham … karishye." for the Diwali Lakshmi Puja - matches the
 * generic generator's output for this puja's own canonical karma/deity
 * (lib/sankalpam/from-app.ts CANONICAL_KARMA["diwali-lakshmi-puja"]):
 * "మమ ఉపాత్త సమస్త దురితక్షయద్వారా " + deityTe + " ప్రీత్యర్థం " + purposeTe +
 * " కరిష్యే." */
const DIWALI_PART_B: FamilySankalpamClip = {
  src: "/audio/v1/sankalpa-diwali-lakshmi-puja.family-b.te.mp3",
  text:
    "మమ ఉపాత్త సమస్త దురితక్షయద్వారా శ్రీ మహాలక్ష్మీ ప్రీత్యర్థం దీపావళి లక్ష్మీ " +
    "పూజ కరిష్యే.",
};

const PART_B_BY_SLUG: Record<string, FamilySankalpamClip> = {
  "vinayaka-chavithi": VINAYAKA_PART_B,
  "diwali-lakshmi-puja": DIWALI_PART_B,
};

/** The fixed Part B clip for a puja's slug, or Vinayaka's (the original
 * default) for an unregistered/absent slug. */
export function familySankalpamPartBForSlug(slug?: string | null): FamilySankalpamClip {
  return (slug && PART_B_BY_SLUG[slug]) || VINAYAKA_PART_B;
}

export const FAMILY_SANKALPAM_AUDIO = {
  partA: PART_A,
  /** Vinayaka's Part B, kept as the direct property for backward
   * compatibility. Use familySankalpamPartBForSlug(slug) for any other puja. */
  partB: VINAYAKA_PART_B,
  namePrompt: NAME_PROMPT,
} as const;

export type FamilySankalpamAudioKey = keyof typeof FAMILY_SANKALPAM_AUDIO;

/** The one configuration the fixed family audio was recorded for: SHORT form,
 * no place clause, no Gotra line. (Family form + canonical Vinayaka purpose.) */
export const STANDARD_SHORT_FAMILY_CHOICES: Pick<
  SankalpamChoices,
  "calendarForm" | "placeDetail" | "unknownGotra"
> = {
  calendarForm: "SHORT",
  placeDetail: "OMIT",
  unknownGotra: "OMIT",
};

const norm = (s: string) => s.replace(/[«»]/g, "").replace(/\s+/g, " ").trim();

/** True only when the DISPLAYED family Sankalpam Telugu (markers removed) is
 * exactly Part A + Part B of the fixed audio — i.e. the standard short family
 * form. Any extra clause (calendar, place, a Gotra line, a non-canonical
 * purpose) makes this false so audio that differs from the text is never
 * played. `expectedPartBText` defaults to Vinayaka's Part B (the original
 * behaviour, unchanged for every existing caller); pass
 * familySankalpamPartBForSlug(slug).text for any other puja. */
export function familyAudioMatchesGen(
  gen: Pick<GeneratedSankalpam, "groupMode" | "familySplitIndex" | "segments">,
  expectedPartBText: string = FAMILY_SANKALPAM_AUDIO.partB.text,
): boolean {
  if (gen.groupMode !== "FAMILY" || gen.familySplitIndex < 0) return false;
  const seg = gen.segments;
  const partA = norm(seg.slice(0, gen.familySplitIndex + 1).map((s) => s.te).join(" "));
  const partB = norm(seg.slice(gen.familySplitIndex + 1).map((s) => s.te).join(" "));
  return (
    partA === norm(FAMILY_SANKALPAM_AUDIO.partA.text) &&
    partB === norm(expectedPartBText)
  );
}
