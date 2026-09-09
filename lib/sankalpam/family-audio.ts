// The family dynamic-audio Sankalpam (item 3).
//
// The FIXED, pre-recorded audio for the family form is split at
// "అస్మాకం సహ కుటుంబానాం". Part A plays; then the app pauses and shows /
// speaks "ఇప్పుడు కుటుంబ సభ్యుల పేర్లు చెప్పండి"; the family says their own
// names OUT LOUD, locally; a Resume button plays Part B.
//
// The names are NEVER in the audio, never generated, never uploaded, never
// sent to Azure. This text is the date- and location-independent SHORT form,
// with the place clause and the Gotra line omitted, so exactly two clips serve
// every family. It matches generateSankalpam(FAMILY, SHORT, OMIT place, OMIT
// gotra) with the « » user markers removed — asserted in tests.

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
