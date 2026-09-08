// Structured Sankalpam slots, built strictly from the Sankalpam text on
// page 3 of the supplied PDFs.
//
// That Sankalpam is a SHORT form. The only fillable slots it actually
// contains are "who is performing" (as "asmaakaM" - for us) and an
// individual/family framing (via "saha kuTuMbaanaaM" - with our families).
// It has NO slot for Gotra, Veda, Sutra, Sampradaya, nor for tithi / masa /
// paksha / nakshatra / samvatsara, nor for a city/state. Those are recorded
// below as UNSUPPORTED, each as an open reviewer question. No
// unknown-Gotra fallback is created; unknown lineage stays explicitly
// unknown.

import type { CandidateReviewerQuestion } from "./candidate";
import { CANDIDATE_CONTENT_VERSION } from "./candidate";
import type { SourceReference } from "./sources";

export const SANKALPAM_TRANSLITERATION =
  "mama upaatta samasta duritakshaya dvaaraa Sree varasidhdhi vinaayaka daevataa preetyardhaM , " +
  "Subhae SObhanae muhoortae, samasta daevataa braahmaNa harihara guru charaNa sannidhau, " +
  "asmaakaM saha kuTuMbaanaaM kshaema sthairya vijaya abhaya aayuraarOgya aiSvarya abhivRdhyardhaM, " +
  "dharmaardha kaama mOksha chaturvidha purushaartha phala sidhyarthaM, " +
  "dhana dhaanya samRdhyardhaM , ishTa kaamyaartha sidhyarthaM, sakala lOka kalyaaNaardhaM, " +
  "sarva vighna nivaaraNaardhaM, vaeda saMpradaayaabhivRdyardhaM , asmin daeSae gOvadha nishaedhaardhaM, " +
  "gO saMrakshaNaardhaM , Sree varasidhdhi vinaayaka daevataaM uddiSya yaavaChchakti dhyaana " +
  "aavaahanaadi shODaSOpachaara poojaaM karishyae!";

export const SANKALPAM_SOURCE_REFS: readonly SourceReference[] = [
  { sourceId: "english-lyrics", page: 3 },
  { sourceId: "telugu-lyrics", page: 3 },
];

export const SANKALPAM_TELUGU_TRANSCRIPTION_TASK =
  "Transcribe the full Sankalpam in Telugu script from \"Vinayaka Chaviti " +
  "Puja - Telugu Lyrics.pdf\" page 3. Automated extraction corrupts this " +
  "file's Telugu; do not rely on it.";

export interface SankalpamSupportedSlot {
  id: string;
  label: string;
  /** The exact phrase in the source this slot maps to. */
  sourcePhrase: string;
  note: string;
}

export const SANKALPAM_SUPPORTED_SLOTS: readonly SankalpamSupportedSlot[] = [
  {
    id: "performers",
    label: "Who is performing",
    sourcePhrase: "asmaakaM",
    note:
      "The Sankalpam refers to the performers only as \"asmaakaM\" (for us). " +
      "It has no slot for each person's individual name.",
  },
  {
    id: "family-scope",
    label: "Individual / family / group framing",
    sourcePhrase: "asmaakaM saha kuTuMbaanaaM",
    note:
      "\"saha kuTuMbaanaaM\" (with our families) supports a family framing. " +
      "Unrelated students or friends stay separately named participants and " +
      "are never described as one family.",
  },
];

export interface SankalpamUnsupportedSlot {
  id: string;
  label: string;
  /** Why it is not filled, and the phrase (if any) the source uses instead. */
  note: string;
}

export const SANKALPAM_UNSUPPORTED_SLOTS: readonly SankalpamUnsupportedSlot[] = [
  {
    id: "gotra",
    label: "Gotra",
    note:
      "NOT present in the supplied Sankalpam. No unknown-Gotra fallback is " +
      "created. KNOWN / UNKNOWN / UNSURE stays exactly as the participant " +
      "entered it.",
  },
  {
    id: "veda",
    label: "Veda",
    note: "NOT present in the supplied Sankalpam. Unknown stays unknown.",
  },
  {
    id: "sutra",
    label: "Sutra",
    note: "NOT present in the supplied Sankalpam. Unknown stays unknown.",
  },
  {
    id: "sampradaya",
    label: "Sampradaya",
    note: "NOT present in the supplied Sankalpam. Unknown stays unknown.",
  },
  {
    id: "date-calendar",
    label: "Date / calendar (samvatsara, ayana, rtu, masa, paksha, tithi, vaara, nakshatra)",
    note:
      "The Sankalpam uses only the generic phrase \"Subhae SObhanae " +
      "muhoortae\" (at this auspicious time). It has no dated calendar slots. " +
      "Validated local Panchanga is a separate release blocker.",
  },
  {
    id: "place",
    label: "Place (city, state, country)",
    note:
      "The Sankalpam uses only \"asmin daeSae\" (in this country). It has no " +
      "city or state slot. Location text must come from validated local " +
      "Panchanga before public release; it is not connected to the Sankalpam " +
      "yet.",
  },
];

export const SANKALPAM_REVIEWER_QUESTIONS: readonly CandidateReviewerQuestion[] = [
  {
    id: "sankalpam-short-vs-full",
    question:
      "Should the app use this short-form Sankalpam as-is, or implement the " +
      "full Sankalpam (samvatsara / ayana / rtu / masa / paksha / tithi / " +
      "vaara / nakshatra / gotra / naama)? The full wording is NOT in the " +
      "supplied PDFs and would need to be supplied and approved.",
  },
  {
    id: "sankalpam-family-wording",
    question:
      "For a family, may \"asmaakaM saha kuTuMbaanaaM\" be spoken as-is, or " +
      "must each family member be named? Provide the approved wording for " +
      "individual, family and unrelated-group cases.",
  },
  {
    id: "sankalpam-unknown-lineage",
    question:
      "Confirm how unknown Gotra / Veda / Sutra / Sampradaya should be handled " +
      "in the spoken Sankalpam (omitted, or a specific approved phrasing). " +
      "The app will never substitute a deity-associated or generic Gotra.",
  },
];

export const SANKALPAM_CONTENT_VERSION = CANDIDATE_CONTENT_VERSION;
export const SANKALPAM_REVIEW_STATUS = "REVIEW_REQUIRED" as const;
export const SANKALPAM_LOCKED = true as const;
