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

import type { SankalpamChoices } from "./choices";
import type { GeneratedSankalpam } from "./generator";

export const FAMILY_SANKALPAM_AUDIO = {
  /** Frame → "…asmakam saha kutumbanam,". Clean Telugu, no « » markers. */
  partA: {
    src: "/audio/v1/sankalpa.family-a.te.mp3",
    text:
      "శుభే శోభనే ముహూర్తే, శ్రీ మహావిష్ణోరాజ్ఞయా ప్రవర్తమానస్య, అద్య బ్రహ్మణః " +
      "ద్వితీయ పరార్ధే, శ్వేతవరాహకల్పే, వైవస్వతమన్వంతరే, కలియుగే, ప్రథమపాదే, " +
      "జంబూద్వీపే, భరతవర్షే, భరతఖండే, మేరోః దక్షిణదిగ్భాగే, అస్మిన్ వర్తమానే " +
      "వ్యావహారికే, శుభతిథౌ శుభముహూర్తే, అస్మాకం సహ కుటుంబానాం,",
  },
  /** "…prityartham … karishye." for Vinayaka Chavithi. */
  partB: {
    src: "/audio/v1/sankalpa.family-b.te.mp3",
    text:
      "మమ ఉపాత్త సమస్త దురితక్షయద్వారా శ్రీ మహాగణపతి ప్రీత్యర్థం వినాయక చవితి " +
      "పూజ కరిష్యే.",
  },
  /** The pause prompt, spoken/shown between Part A and Part B. */
  namePrompt: {
    src: "/audio/v1/sankalpa.family-prompt.te.mp3",
    text: "ఇప్పుడు కుటుంబ సభ్యుల పేర్లు చెప్పండి.",
    roman: "ippudu kutumba sabhyula perlu cheppandi.",
  },
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
 * played. */
export function familyAudioMatchesGen(gen: Pick<GeneratedSankalpam, "groupMode" | "familySplitIndex" | "segments">): boolean {
  if (gen.groupMode !== "FAMILY" || gen.familySplitIndex < 0) return false;
  const seg = gen.segments;
  const partA = norm(seg.slice(0, gen.familySplitIndex + 1).map((s) => s.te).join(" "));
  const partB = norm(seg.slice(gen.familySplitIndex + 1).map((s) => s.te).join(" "));
  return (
    partA === norm(FAMILY_SANKALPAM_AUDIO.partA.text) &&
    partB === norm(FAMILY_SANKALPAM_AUDIO.partB.text)
  );
}
