// The 21-leaf (ekaviṃśati patra) list, extracted from page 7 of both supplied
// PDFs. Only the transliterated names are stored - which physical plant each
// names, and how to identify it safely, is NOT in the source and is not
// inferred. There is NO flowers/akshata substitution here: that fallback is
// attributed elsewhere to a priest's separate written reply that was not
// supplied, so it stays a review candidate, not an automatic rule.

import type { CandidateReviewerQuestion, CandidateSourceDisagreement } from "./candidate";
import { CANDIDATE_CONTENT_VERSION } from "./candidate";
import type { SourceReference } from "./sources";

export interface CandidatePatriLeaf {
  /** 1-21, in the order the source lists them. */
  index: number;
  /** "<name>aaya nama:" as printed in the English PDF. */
  deityNameTransliteration: string;
  /** "<name>patraM" as printed in the English PDF. */
  leafNameTransliteration: string;
  /** Never inferred. The reviewer supplies the botanical identity. */
  botanicalIdentification: null;
}

export const CANDIDATE_PATRI: readonly CandidatePatriLeaf[] = [
  { index: 1, deityNameTransliteration: "sumukhaaya nama:", leafNameTransliteration: "maacheepatraM", botanicalIdentification: null },
  { index: 2, deityNameTransliteration: "gaNaadhipaaya nama:", leafNameTransliteration: "bRhateepatraM", botanicalIdentification: null },
  { index: 3, deityNameTransliteration: "umaaputraaya nama:", leafNameTransliteration: "bilvapatraM", botanicalIdentification: null },
  { index: 4, deityNameTransliteration: "gajaananaaya nama:", leafNameTransliteration: "doorvaayugmaM", botanicalIdentification: null },
  { index: 5, deityNameTransliteration: "harasoonavae nama:", leafNameTransliteration: "duttoorapatraM", botanicalIdentification: null },
  { index: 6, deityNameTransliteration: "laMbOdaraaya nama:", leafNameTransliteration: "badareepatraM", botanicalIdentification: null },
  { index: 7, deityNameTransliteration: "guhaagrajaaya nama:", leafNameTransliteration: "apaamaargapatraM", botanicalIdentification: null },
  { index: 8, deityNameTransliteration: "gajakarNaaya nama:", leafNameTransliteration: "tulaseepatraM", botanicalIdentification: null },
  { index: 9, deityNameTransliteration: "aekadaMtaaya nama:", leafNameTransliteration: "chootapatraM", botanicalIdentification: null },
  { index: 10, deityNameTransliteration: "vikaTaaya nama:", leafNameTransliteration: "karaveerapatraM", botanicalIdentification: null },
  { index: 11, deityNameTransliteration: "bhinnadaMtaaya nama:", leafNameTransliteration: "vishNukraaMtapatraM", botanicalIdentification: null },
  { index: 12, deityNameTransliteration: "vaTavae nama:", leafNameTransliteration: "daaDimeepatraM", botanicalIdentification: null },
  { index: 13, deityNameTransliteration: "sarvaeSvaraaya nama:", leafNameTransliteration: "daevadaarupatraM", botanicalIdentification: null },
  { index: 14, deityNameTransliteration: "phaalachaMdraaya nama:", leafNameTransliteration: "maruvakapatraM", botanicalIdentification: null },
  { index: 15, deityNameTransliteration: "haeraMbaaya nama:", leafNameTransliteration: "siMdhuvaarapatraM", botanicalIdentification: null },
  { index: 16, deityNameTransliteration: "SoorpakarNaaya nama:", leafNameTransliteration: "jaajipatraM", botanicalIdentification: null },
  { index: 17, deityNameTransliteration: "suraagrajaaya nama:", leafNameTransliteration: "gaMDakee patraM", botanicalIdentification: null },
  { index: 18, deityNameTransliteration: "ibhavaktraaya nama:", leafNameTransliteration: "SameepatraM", botanicalIdentification: null },
  { index: 19, deityNameTransliteration: "vinaayakaaya nama:", leafNameTransliteration: "aSvattha patraM", botanicalIdentification: null },
  { index: 20, deityNameTransliteration: "surasaevitaaya nama:", leafNameTransliteration: "arjuna patraM", botanicalIdentification: null },
  { index: 21, deityNameTransliteration: "kapilaaya nama:", leafNameTransliteration: "arkapatraM", botanicalIdentification: null },
];

export const CANDIDATE_PATRI_CLOSING_LINE =
  "Sree gaNaeSvaraaya nama: aekaviMSatipatraaNi poojayaami";

export const CANDIDATE_PATRI_SOURCE_REFS: readonly SourceReference[] = [
  { sourceId: "english-lyrics", page: 7 },
  { sourceId: "telugu-lyrics", page: 7 },
];

export const CANDIDATE_PATRI_CONTENT_VERSION = CANDIDATE_CONTENT_VERSION;

export const CANDIDATE_PATRI_DISAGREEMENTS: readonly CandidateSourceDisagreement[] = [
  {
    field: "numbering of the closing line",
    telugu: "the closing line is numbered \"22.\"",
    english: "the closing line is unnumbered, after item 21",
    note: "A numbering artifact only; both list the same 21 leaves in the same order.",
  },
];

export const CANDIDATE_PATRI_REVIEWER_QUESTIONS: readonly CandidateReviewerQuestion[] = [
  {
    id: "patri-botanical-identity",
    question:
      "Supply the botanical identity of each of the 21 leaves and how a " +
      "beginner can identify it safely. This is NOT in the source and is not " +
      "guessed. Users must never pick an unidentified plant.",
  },
  {
    id: "patri-count-evidence",
    question:
      "The source names 21 leaves (confirmed by the \"aeka viSaMti patraaNi\" " +
      "line in the Pushpakshata step). Confirm this list matches the reviewed " +
      "Telugu household practice, and record its written source.",
  },
  {
    id: "patri-fallback-not-implemented",
    question:
      "A flowers/akshata fallback when patri is unavailable is attributed by " +
      "docs/VINAYAKA_PUJA_CONTENT_SPEC.md to the priest's separate written " +
      "reply, which was NOT supplied. It is deliberately NOT implemented as an " +
      "automatic substitution. Approve it only as PRIEST_REVIEWED_PRACTICE " +
      "with its own source and review record.",
  },
];

export const CANDIDATE_PATRI_COUNT = CANDIDATE_PATRI.length;
