// The Family Beta puja journey, built directly from the sourced Vinayaka
// candidate (./candidate.ts) - it replaces the old hand-written 12-step
// RITUAL_STEPS list. Every step here still carries REVIEW_REQUIRED + locked +
// the source record + transcription confidence; this module only adapts the
// candidate into the RitualStep shape the platform screens already read, adds
// a beginner physical action (./beginner-actions.ts), and defines the Simple
// vs Complete subsets.
//
// Classification (Simple / Complete / optional / tradition-specific) is a
// cross-source inference, NOT an explicit statement in the supplied PDFs, so
// every step is marked classificationInferred (BETA_CLASSIFICATION) and stays
// editable by the reviewer.

import { draftProvenance, type Provenance } from "@/lib/content/provenance";
import type { ReviewStatus } from "@/lib/content/review-status";
import type { BetaStatus } from "@/lib/content/beta-visibility";

import {
  CANDIDATE_CONTENT_VERSION, CANDIDATE_PUJA_STEPS, type CandidatePujaStep,
} from "./candidate";
import {
  beginnerAction, type BetaActionBasis,
} from "./beginner-actions";
import { sourceFilename, type SourceReference } from "./sources";
import type { TeluguRecoveryEntry } from "./telugu-recovery";

export type BetaClassification = "ESSENTIAL" | "OPTIONAL" | "TRADITION_SPECIFIC";

export interface BetaJourneyStep {
  id: string;
  /** Candidate step id, or null for the practical prep steps. */
  candidateStepId: string | null;
  /** Plain, beginner English title. */
  title: string;
  /** Telugu-script section label (from the Telugu PDF page headings). */
  teluguTitle: string;
  /** Romanised section title from the candidate. */
  romanTitle: string;
  /** Recovered Telugu-script mantra, or null (prep / rights-withheld steps). */
  mantraTeluguScript: string | null;
  /** English transliteration from the English PDF. "" when unsupported. */
  mantraTransliteration: string;
  transliterationSupported: boolean;
  /** Plain "what this step is" (from the candidate's whatToDo). */
  simpleMeaning: string;
  /** Why the step is performed (from the candidate's whyWeDoIt). */
  why: string;
  /** Beginner physical action shown in the Family Beta. */
  betaAction: string;
  betaActionBasis: BetaActionBasis;
  betaActionNeedsReview: boolean;
  betaActionSources: readonly string[];
  betaActionNote: string | null;
  /** Substances the mantra text names (from the candidate). */
  materials: readonly string[];
  /** Duration estimate, minutes. Not a ruling. */
  minutes: number;
  /** CORE => included in the Simple path; OPTIONAL => Complete only. */
  importance: "CORE" | "OPTIONAL";
  betaClassification: BetaClassification;
  /** Always true here: the classification is inferred, not from the source. */
  classificationInferred: boolean;
  betaStatus: BetaStatus;
  includedInBeta: boolean;
  sourceRefs: readonly SourceReference[];
  teluguRecovery: TeluguRecoveryEntry | null;
  reviewStatus: ReviewStatus;
  locked: boolean;
  provenance: Provenance;
}

/** Telugu-script section labels, read off the Telugu Lyrics page headings
 * during recovery (dhyana-shloka and bhuta-shuddhi have no printed heading -
 * a plain label is used). */
const TELUGU_TITLES: Record<string, string> = {
  "dhyana-shloka": "శుక్లాంబరధరం",
  achamana: "ఆచమనము",
  "bhuta-shuddhi": "భూతోచ్చాటన",
  pranayama: "ప్రాణాయామము",
  sankalpa: "సంకల్పము",
  ghanta: "ఘంటా నాదం",
  "kalasha-aradhana": "కలశారాధన",
  "ganapati-prarthana": "గణపతి పూజ",
  dhyana: "ధ్యానం",
  avahana: "ఆవాహనం",
  asana: "ఆసనం",
  padya: "పాద్యం",
  arghya: "అర్ఘ్యం",
  achamaniya: "ఆచమనీయం",
  madhuparka: "మధుపర్కం",
  snana: "స్నానం",
  vastra: "వస్త్రం",
  yajnopavita: "యజ్ఞోపవీతం",
  gandha: "గంధం",
  pushpakshata: "పుష్పా క్షతలు",
  "anga-puja": "అంగ పూజ",
  "ekavimsati-patra-puja": "ఏకవింశతి పత్ర పూజ",
  "ashtottara-satanamavali": "అష్టోత్తర శతనామావళి",
  dhupa: "ధూపం",
  deepa: "దీపం",
  naivedya: "నైవేద్యం",
  tambula: "తాంబూలం",
  neerajana: "నీరాజనం",
  "doorvayugma-puja": "దూర్వాయుగ్మ పూజ",
  "mantrapushpa-namaskara": "మంత్రపుష్పం – నమస్కారం",
  udvasana: "ఉద్వాసన",
  "mangala-shanti": "స్వస్తి వచనం",
  "vrata-katha": "వినాయక వ్రత కథ",
};

/** The Simple (essential beginner) path: candidate step ids. A cross-source
 * inference from the shodashopachara core - NOT an explicit source
 * classification, so classificationInferred is true for every step. */
export const SIMPLE_PATH_STEP_IDS: readonly string[] = [
  "dhyana-shloka",
  "sankalpa",
  "ganapati-prarthana",
  "dhyana",
  "avahana",
  "asana",
  "gandha",
  "pushpakshata",
  "dhupa",
  "deepa",
  "naivedya",
  "neerajana",
  "mantrapushpa-namaskara",
  "mangala-shanti",
];

const MINUTES: Record<string, number> = {
  sankalpa: 3,
  "ganapati-prarthana": 3,
  "ashtottara-satanamavali": 6,
  "ekavimsati-patra-puja": 5,
  "anga-puja": 3,
  "doorvayugma-puja": 3,
  naivedya: 3,
  "mantrapushpa-namaskara": 3,
  achamana: 2,
  "vrata-katha": 10,
};

function classificationOf(step: CandidatePujaStep): BetaClassification {
  if (SIMPLE_PATH_STEP_IDS.includes(step.id)) return "ESSENTIAL";
  return step.classification;
}

function provenanceFor(step: CandidatePujaStep): Provenance {
  const pages = step.sourceRefs
    .map((r) => `${sourceFilename(r.sourceId)} p.${r.page}`)
    .join("; ");
  return draftProvenance({
    source: "Nanduri Vinayaka Chaviti Puja Lyrics PDFs (English + Telugu)",
    sourceReference: `${step.title} — ${pages}`,
    contentVersion: CANDIDATE_CONTENT_VERSION,
    writtenSourceStatus: "CONFIRMED",
    traditionScope:
      "Telugu household Vinayaka Chavithi (Nanduri compilation) — sourced " +
      "beta candidate, not priest-reviewed",
  });
}

function mapCandidate(step: CandidatePujaStep): BetaJourneyStep {
  const action = beginnerAction(step.id);
  const withheld = step.id === "vrata-katha";
  return {
    id: step.id,
    candidateStepId: step.id,
    title: step.englishTitle,
    teluguTitle: TELUGU_TITLES[step.id] ?? step.title,
    romanTitle: step.title,
    mantraTeluguScript: step.mantraTeluguScript,
    mantraTransliteration: step.mantraTransliteration,
    transliterationSupported: step.transliterationSupported,
    simpleMeaning: step.whatToDo,
    why: step.whyWeDoIt,
    betaAction: action?.action ?? step.howToDo,
    betaActionBasis: action?.basis ?? "MINIMAL_LITERAL",
    betaActionNeedsReview: action?.needsReview ?? true,
    betaActionSources: action?.sources ?? [],
    betaActionNote: action?.note ?? null,
    materials: step.materialsNamedInMantra,
    minutes: MINUTES[step.id] ?? 2,
    importance: SIMPLE_PATH_STEP_IDS.includes(step.id) ? "CORE" : "OPTIONAL",
    betaClassification: classificationOf(step),
    classificationInferred: true,
    betaStatus: withheld ? "WITHHELD_FOR_RIGHTS" : "SOURCED_BETA_CANDIDATE",
    includedInBeta: true,
    sourceRefs: step.sourceRefs,
    teluguRecovery: step.teluguRecovery,
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
    provenance: provenanceFor(step),
  };
}

/** Two practical, non-religious lead-in steps (always shown, not locked). */
export const BETA_PREP_STEPS: readonly BetaJourneyStep[] = [
  {
    id: "get-ready",
    candidateStepId: null,
    title: "Prepare a calm place",
    teluguTitle: "సిద్ధపడండి",
    romanTitle: "Prepare a calm place",
    mantraTeluguScript: null,
    mantraTransliteration: "",
    transliterationSupported: false,
    simpleMeaning:
      "Set the murti or picture on a clean, steady surface and keep your " +
      "puja items within reach.",
    why: "Preparing first lets you continue without rushing.",
    betaAction:
      "Place the Ganesha murti or picture on a clean, steady surface. Keep " +
      "water, a spoon, a plate, flowers and the food offering within reach. " +
      "Seat children away from any flame.",
    betaActionBasis: "MINIMAL_LITERAL",
    betaActionNeedsReview: false,
    betaActionSources: [],
    betaActionNote: "Practical preparation, not a religious instruction.",
    materials: [],
    minutes: 2,
    importance: "CORE",
    betaClassification: "ESSENTIAL",
    classificationInferred: false,
    betaStatus: "APPROVED_GUIDANCE",
    includedInBeta: true,
    sourceRefs: [],
    teluguRecovery: null,
    reviewStatus: "GENERAL_GUIDANCE",
    locked: false,
    provenance: draftProvenance({ traditionScope: "Practical preparation and safety" }),
  },
  {
    id: "light-lamp",
    candidateStepId: null,
    title: "Light the lamp safely",
    teluguTitle: "దీపం వెలిగించండి",
    romanTitle: "Light the lamp safely",
    mantraTeluguScript: null,
    mantraTransliteration: "",
    transliterationSupported: false,
    simpleMeaning: "Light the lamp near the murti to mark the start.",
    why: "The lamp marks the beginning and helps everyone settle.",
    betaAction:
      "An adult lights the lamp near, but not touching, the murti or picture, " +
      "and keeps the flame away from children, hair and cloth.",
    betaActionBasis: "MINIMAL_LITERAL",
    betaActionNeedsReview: false,
    betaActionSources: [],
    betaActionNote: "Practical safety, not a religious instruction.",
    materials: [],
    minutes: 2,
    importance: "CORE",
    betaClassification: "ESSENTIAL",
    classificationInferred: false,
    betaStatus: "APPROVED_GUIDANCE",
    includedInBeta: true,
    sourceRefs: [],
    teluguRecovery: null,
    reviewStatus: "GENERAL_GUIDANCE",
    locked: false,
    provenance: draftProvenance({ traditionScope: "Practical preparation and safety" }),
  },
];

/** The full Family Beta journey: 2 practical prep steps + the 32 sourced
 * candidate steps + the Vrata Katha item (rights-withheld). */
export const BETA_JOURNEY_STEPS: readonly BetaJourneyStep[] = [
  ...BETA_PREP_STEPS,
  ...CANDIDATE_PUJA_STEPS.map(mapCandidate),
];

export function betaJourneyStepsForPath(path: "SIMPLE" | "COMPLETE"): BetaJourneyStep[] {
  return BETA_JOURNEY_STEPS.filter(
    (s) => path === "COMPLETE" || s.importance === "CORE",
  );
}

export function betaJourneyMinutes(path: "SIMPLE" | "COMPLETE"): number {
  return betaJourneyStepsForPath(path).reduce((sum, s) => sum + s.minutes, 0);
}

/* -------------------------------------------------------------------------- */
/* Materials, derived from the candidate steps                                */
/* -------------------------------------------------------------------------- */

export type BetaMaterialCategory = "REQUIRED" | "OPTIONAL" | "TRADITION_SPECIFIC";

export interface BetaMaterial {
  id: string;
  name: string;
  description: string;
  category: BetaMaterialCategory;
  /** Candidate step ids whose mantra names this substance. */
  namedInSteps: readonly string[];
  /** No automatic substitution is offered. */
  approvedAlternative: null;
}

/** Group raw mantra-named substances into checklist items. Every entry traces
 * to at least one candidate step's materialsNamedInMantra. */
const MATERIAL_GROUPS: {
  id: string; name: string; description: string;
  category: BetaMaterialCategory; match: (raw: string) => boolean;
}[] = [
  { id: "murti", name: "Ganesha murti or picture", description: "A small clay murti of Ganesha, or a clean printed picture.", category: "REQUIRED", match: () => false },
  { id: "lamp", name: "Lamp with oil or ghee", description: "A small lamp with oil or ghee (clarified butter), plus wicks.", category: "REQUIRED", match: (r) => /lamp|wick|trivarti/i.test(r) },
  { id: "water", name: "Clean water, a spoon and a plate", description: "A cup of clean water, a small spoon (uddharani), and a plate to receive the offerings.", category: "REQUIRED", match: (r) => /\bwater\b|clean water/i.test(r) },
  { id: "akshata", name: "Akshata (unbroken rice)", description: "Whole, unbroken raw rice, usually with a pinch of turmeric.", category: "REQUIRED", match: (r) => /akshata|white rice/i.test(r) },
  { id: "flowers", name: "Fresh flowers", description: "Fresh, clean flowers you can identify. The mantras name jaji and kunda among fragrant flowers.", category: "REQUIRED", match: (r) => /flower|jaji|kunda|mantrapushpa/i.test(r) },
  { id: "gandha", name: "Sandal paste and kumkuma", description: "Sandal (chandana) paste and kumkuma; the gandha mantra also names aguru, camphor and musk.", category: "REQUIRED", match: (r) => /sandal|gandha|chandana|aguru|kumkuma|kasturi|musk/i.test(r) },
  { id: "incense", name: "Incense (dhupa)", description: "Incense sticks or a dhupa mix; the mantra names a ten-part (dashanga) incense with guggulu.", category: "REQUIRED", match: (r) => /incense|dashanga|guggulu/i.test(r) },
  { id: "camphor", name: "Camphor", description: "Camphor pieces for the neerajana (harati) flame.", category: "REQUIRED", match: (r) => /camphor|karpura/i.test(r) },
  { id: "food", name: "A simple food offering", description: "A fruit or a home-made sweet (the mantra names modaka). Shared afterwards as prasadam.", category: "REQUIRED", match: (r) => /modaka|food|gram|moong|chana|mudga/i.test(r) },
  { id: "panchamrita", name: "Panchamrita (for snana)", description: "The five-nectar mix: milk, curd, ghee, honey and sugar. Also used for madhuparka.", category: "OPTIONAL", match: (r) => /panchamrita|curd|dadhi|milk|kshira|honey|madhu|ghee|ajya/i.test(r) },
  { id: "cloths", name: "A pair of cloths and cotton thread", description: "Two small clean cloths (vastra) and a length of cotton thread for the yajnopavita.", category: "OPTIONAL", match: (r) => /cloth|vastra|thread|brahma-sutra|uttareeya/i.test(r) },
  { id: "tambula", name: "Betel leaf and areca nut", description: "Two betel leaves and an areca nut for tambula.", category: "OPTIONAL", match: (r) => /betel|areca|pugiphala|nagavalli|pearl powder|mukta/i.test(r) },
  { id: "bell", name: "A bell (ghanta)", description: "A small hand bell rung during the puja.", category: "OPTIONAL", match: (r) => /bell|ghanta/i.test(r) },
  { id: "kalasha", name: "A water vessel (kalasha)", description: "A small metal or clay pot with clean water, for the Kalasha worship.", category: "TRADITION_SPECIFIC", match: (r) => /kalasha|vessel/i.test(r) },
  { id: "durva", name: "Durva grass", description: "A low, creeping grass with slender blades, offered in pairs. Offer only if you can clearly identify it.", category: "TRADITION_SPECIFIC", match: (r) => /durva/i.test(r) },
  { id: "patri", name: "Patri (the 21 leaves)", description: "The set of twenty-one traditional leaves. See the patri section — offer only leaves you can clearly identify.", category: "TRADITION_SPECIFIC", match: (r) => /patri|leaves|twenty-one/i.test(r) },
];

export const BETA_MATERIALS: readonly BetaMaterial[] = (() => {
  const named: Record<string, Set<string>> = {};
  for (const step of CANDIDATE_PUJA_STEPS) {
    for (const raw of step.materialsNamedInMantra) {
      for (const group of MATERIAL_GROUPS) {
        if (group.match(raw)) {
          (named[group.id] ??= new Set()).add(step.id);
        }
      }
    }
  }
  return MATERIAL_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    category: g.category,
    namedInSteps: [...(named[g.id] ?? [])],
    approvedAlternative: null as null,
  }));
})();

export const BETA_MATERIALS_DISCLAIMER =
  "This checklist is built from the substances the puja mantras name. Whether " +
  "each item is religiously required has not been decided by a reviewer. " +
  "Gather what you reasonably can — a missing optional item never stops the puja.";
