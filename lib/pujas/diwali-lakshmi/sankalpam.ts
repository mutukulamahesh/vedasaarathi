// Structured Sankalpam slots for the Diwali Lakshmi Puja, built strictly
// from P1's own Sankalpam text (docs/pujas/diwali-lakshmi-puja-master.md,
// DLP-05, Section 7).
//
// This mirrors lib/pujas/vinayaka/sankalpam.ts's pattern exactly (a constant
// pair for the source text, explicit supported/unsupported slots, reviewer
// questions) but is a SEPARATE module with Diwali's own text - the Vinayaka
// module is not imported from or modified by this file.
//
// P1's Diwali Sankalpam is a SHORT form, shorter even than Vinayaka's: it has
// no slot for Gotra, Veda, Sutra, Sampradaya, nor for a dated calendar
// (samvatsara/masa/paksha/tithi/vaara/nakshatra) - it does not even include
// the generic "Subhae SObhanae muhoortae" phrase Vinayaka's Sankalpam has.
// Its only place reference is "asmin daeSae" (in this country), no
// city/state. None of this is invented or inferred: unknown stays unknown.
//
// This text is shown ONLY as a reviewer-facing "source candidate, for
// comparison only" (see components/platform/puja-screen.tsx's isSankalpam
// handling) - the Sankalpam a family actually hears/reads is the live,
// participant-aware assembly from lib/sankalpam/generator.ts, via the
// canonical Telugu karma/deity registered for this puja's slug in
// lib/sankalpam/from-app.ts.

export const DIWALI_SANKALPAM_TELUGU =
  "సంకల్పము\n" +
  "మమ ఉపాత్త సమస్త దురితక్షయ ద్వారా శ్రీ మహాలక్ష్మీ దేవతా ప్రీత్యర్థం, అస్మాకం సహ " +
  "కుటుంబానాం క్షేమ స్థైర్య విజయ అభయ ఆయురారోగ్య ఐశ్వర్య అభివృధ్యర్థం, ధర్మార్థ కామ " +
  "మోక్ష చతుర్విధ పురుషార్థ ఫల సిధ్యర్థం, ధన ధాన్య సమృధ్యర్థం, సౌభాగ్య శుభఫలా " +
  "ప్రాప్త్యర్థం, ఇష్ట కామ్యార్థ సిధ్యర్థం, సకల లోక కల్యాణార్థం, వేద సంప్రదాయాభివృధ్యర్థం, " +
  "అస్మిన్ దేశే గోవధ నిషేధార్థం, గో సంరక్షణార్థం, శ్రీ మహాలక్ష్మీ దేవతాం ఉద్దిశ్య " +
  "యావచ్ఛక్తి ధ్యాన ఆవాహనాది షోడశోపచార పూజాం కరిష్యే!";

export const DIWALI_SANKALPAM_TRANSLITERATION =
  "saMkalpamu / mama upaatta samasta duritakshaya dvaaraa Sree mahaalakshmee " +
  "daevataa preetyardhaM, asmaakaM saha kuTuMbaanaaM kshaema sthairya vijaya " +
  "abhaya aayuraarOgya aiSvarya abhivRdhyardhaM, dharmaardha kaama mOksha " +
  "chaturvidha purushaartha phala sidhyarthaM, dhana dhaanya samRdhyardhaM, " +
  "saubhaagya Subhaphalaa praaptyardhaM, ishTa kaamyaartha sidhyarthaM, " +
  "sakala lOka kalyaaNaardhaM, vaeda saMpradaayaabhivRdyardhaM, asmin daeSae " +
  "gOvadha nishaedhaardhaM, gO saMrakshaNaardhaM, Sree mahaalakshmee daevataaM " +
  "uddiSya yaavaChchakti dhyaana aavaahanaadi shODaSOpachaara poojaaM " +
  "karishyae!";

export interface DiwaliSankalpamSourceRef {
  sourceId: string;
  page: number;
}

/** P1 p.3 (Telugu) / p.15 (transliteration). */
export const DIWALI_SANKALPAM_SOURCE_REFS: readonly DiwaliSankalpamSourceRef[] = [
  { sourceId: "p1-diwali-booklet", page: 3 },
];

export interface DiwaliSankalpamSupportedSlot {
  id: string;
  label: string;
  sourcePhrase: string;
  note: string;
}

export const DIWALI_SANKALPAM_SUPPORTED_SLOTS: readonly DiwaliSankalpamSupportedSlot[] = [
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
      "\"saha kuTuMbaanaaM\" (with our families) supports a family framing, " +
      "the same phrase Vinayaka's own Sankalpam uses. Unrelated students or " +
      "friends stay separately named participants and are never described " +
      "as one family.",
  },
];

export interface DiwaliSankalpamUnsupportedSlot {
  id: string;
  label: string;
  note: string;
}

export const DIWALI_SANKALPAM_UNSUPPORTED_SLOTS: readonly DiwaliSankalpamUnsupportedSlot[] = [
  {
    id: "gotra",
    label: "Gotra",
    note:
      "NOT present in P1's Sankalpam. No unknown-Gotra fallback is created. " +
      "KNOWN / UNKNOWN / UNSURE stays exactly as the participant entered it.",
  },
  {
    id: "veda",
    label: "Veda",
    note: "NOT present in P1's Sankalpam. Unknown stays unknown.",
  },
  {
    id: "sutra",
    label: "Sutra",
    note: "NOT present in P1's Sankalpam. Unknown stays unknown.",
  },
  {
    id: "sampradaya",
    label: "Sampradaya",
    note: "NOT present in P1's Sankalpam. Unknown stays unknown.",
  },
  {
    id: "date-calendar",
    label: "Date / calendar (samvatsara, ayana, rtu, masa, paksha, tithi, vaara, nakshatra)",
    note:
      "P1's Diwali Sankalpam has NO dated calendar slot at all - it does not " +
      "even include the generic \"Subhae SObhanae muhoortae\" phrase " +
      "Vinayaka's own Sankalpam has. It moves directly from the " +
      "\"duritakshaya dvaaraa\" opening to naming the deity and purposes.",
  },
  {
    id: "place",
    label: "Place (city, state, country)",
    note:
      "P1's Diwali Sankalpam uses only \"asmin daeSae\" (in this country). " +
      "It has no city or state slot, the same gap as Vinayaka's Sankalpam.",
  },
];

export interface DiwaliSankalpamReviewerQuestion {
  id: string;
  question: string;
}

export const DIWALI_SANKALPAM_REVIEWER_QUESTIONS: readonly DiwaliSankalpamReviewerQuestion[] = [
  {
    id: "diwali-sankalpam-short-vs-full",
    question:
      "Should the app use this short-form Sankalpam as-is, or implement the " +
      "full Sankalpam (samvatsara / ayana / rtu / masa / paksha / tithi / " +
      "vaara / nakshatra / gotra / naama)? The full wording is NOT in P1 and " +
      "would need to be supplied and approved.",
  },
  {
    id: "diwali-sankalpam-extra-purposes",
    question:
      "P1's own Sankalpam names extra purposes beyond wellbeing/prosperity " +
      "(Vedic-tradition support, cow protection - \"vaeda " +
      "saMpradaayaabhivRdyardhaM\", \"gO saMrakshaNaardhaM\"). Should these " +
      "be retained verbatim for every user, offered as an optional subset, " +
      "or something else? Not decided by this module - see master document " +
      "Section 6.5 and Section 7.3.",
  },
  {
    id: "diwali-sankalpam-unknown-lineage",
    question:
      "Confirm how unknown Gotra / Veda / Sutra / Sampradaya should be " +
      "handled in the spoken Sankalpam (omitted, or a specific approved " +
      "phrasing). The app will never substitute a deity-associated or " +
      "generic Gotra.",
  },
];

export const DIWALI_SANKALPAM_CONTENT_VERSION = "diwali-lakshmi-source-candidate-1";
export const DIWALI_SANKALPAM_REVIEW_STATUS = "REVIEW_REQUIRED" as const;
export const DIWALI_SANKALPAM_LOCKED = true as const;
