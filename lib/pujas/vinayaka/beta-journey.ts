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
import {
  VRATA_KATHA_CONTENT_VERSION, VRATA_KATHA_RIGHTS_BASIS,
} from "./vrata-katha";

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
  if (step.id === "vrata-katha") {
    // Original retelling from public-domain / traditional sources — NOT the
    // Nanduri booklet or any commercial site. See ./vrata-katha.ts.
    return draftProvenance({
      source:
        "VedaSaarathi original retelling of the Vinayaka Vrata Katha (Bhagavata " +
        "Purana 10.56–57 for the Syamantaka episode; traditional Puranic material " +
        "for the Ganesha–Chandra curse)",
      sourceReference: VRATA_KATHA_RIGHTS_BASIS,
      contentVersion: VRATA_KATHA_CONTENT_VERSION,
      writtenSourceStatus: "CONFIRMED",
      traditionScope:
        "Telugu Vinayaka Chavithi observance — original beta retelling, Telugu " +
        "an original translation, not priest-reviewed",
    });
  }
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
  // The Vrata Katha is now an original retelling from public-domain / traditional
  // sources (./vrata-katha.ts) — a sourced beta candidate, still REVIEW_REQUIRED
  // and locked, never "priest-approved". It is no longer WITHHELD_FOR_RIGHTS.
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
    betaStatus: "SOURCED_BETA_CANDIDATE",
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

// candidate.ts's array order is the SOURCE BOOKLET's own page order (each
// step's `sequence` field is that page order, unchanged below and still
// visible to reviewers). The booklet prints Udvasana (p.11), the closing
// peace verses / mangala-shanti (p.11), then the Vrata Katha (p.12-17) - a
// booklet LAYOUT artifact (the story is a distinct, longer prose genre,
// printed as a trailing section), not a stated performance order.
//
// Udvasana's own sourced instruction ties it to "the day of Nimajjan
// (immersion), after the above puja" - i.e. it is the FINAL act of the whole
// observance, not a step performed mid-sitting. The Katha is "a core part of
// the Telugu Vinayaka Chavithi observance," read/heard during the main
// sitting. Presenting Udvasana (concluding the worship) before the Katha is
// performed is not the family's intended path, so the Family-mode walkthrough
// states one explicit, documented convention: main mantras -> the Katha ->
// the closing peace verses -> Udvasana last (the formal taking-leave).
// Reviewer mode can still see each step's own booklet `sequence` number if a
// different tradition orders these three differently; nothing here silently
// combines or invents a hybrid text.
const CLOSING_TRIO_BOOKLET_ORDER = ["udvasana", "mangala-shanti", "vrata-katha"] as const;
const CLOSING_TRIO_FAMILY_ORDER = ["vrata-katha", "mangala-shanti", "udvasana"] as const;

function withKathaBeforeClosing(steps: readonly BetaJourneyStep[]): BetaJourneyStep[] {
  const firstIndex = steps.findIndex((s) => (CLOSING_TRIO_BOOKLET_ORDER as readonly string[]).includes(s.id));
  const byId = new Map(steps.map((s) => [s.id, s] as const));
  const trio = CLOSING_TRIO_FAMILY_ORDER.map((id) => byId.get(id)).filter((s): s is BetaJourneyStep => Boolean(s));
  // Defensive: if the source content shape ever changes and any of the three
  // steps go missing, fall back to the untouched booklet order rather than
  // silently dropping or duplicating a step.
  if (firstIndex === -1 || trio.length !== CLOSING_TRIO_FAMILY_ORDER.length) return [...steps];
  const rest = steps.filter((s) => !(CLOSING_TRIO_BOOKLET_ORDER as readonly string[]).includes(s.id));
  return [...rest.slice(0, firstIndex), ...trio, ...rest.slice(firstIndex)];
}

/** The full Family Beta journey: 2 practical prep steps + the 32 sourced
 * candidate steps (Vrata Katha relocated before the closing/Udvasana pair -
 * see withKathaBeforeClosing above). */
export const BETA_JOURNEY_STEPS: readonly BetaJourneyStep[] = [
  ...BETA_PREP_STEPS,
  ...withKathaBeforeClosing(CANDIDATE_PUJA_STEPS.map(mapCandidate)),
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
  nameTe: string;
  description: string;
  descriptionTe: string;
  category: BetaMaterialCategory;
  /** Candidate step ids whose mantra names this substance. Empty only for a
   * platform preparation requirement. */
  namedInSteps: readonly string[];
  /** True for a platform preparation item that is needed for every path
   * regardless of which steps are selected (the murti / picture). It does not
   * trace to a candidate step's mantra and does not claim to. */
  platformRequirement: boolean;
  /** No automatic substitution is offered. */
  approvedAlternative: null;
}

/** Each entry either traces to a candidate step's `materialsNamedInMantra`
 * (`match`) or is an explicit platform preparation requirement
 * (`platformRequirement`, no `match`). */
const MATERIAL_GROUPS: {
  id: string; name: string; nameTe: string; description: string; descriptionTe: string;
  category: BetaMaterialCategory;
  match?: (raw: string) => boolean;
  platformRequirement?: boolean;
}[] = [
  { id: "murti", name: "Ganesha murti or picture", nameTe: "గణపతి విగ్రహం లేదా చిత్రం", description: "A small clay murti of Ganesha, or a clean printed picture. Needed before any step.", descriptionTe: "గణేశుని చిన్న మట్టి విగ్రహం, లేదా శుభ్రమైన ముద్రిత చిత్రం. ఏ దశకైనా ముందు ఇది అవసరం.", category: "REQUIRED", platformRequirement: true },
  { id: "lamp", name: "Lamp with oil or ghee", nameTe: "దీపం, నూనె లేదా నెయ్యి, వత్తులు", description: "A small lamp with oil or ghee (clarified butter), plus wicks.", descriptionTe: "నూనె లేదా నేతితో వెలిగించే చిన్న దీపం, వత్తులతో సహా.", category: "REQUIRED", match: (r) => /lamp|wick|trivarti/i.test(r) },
  { id: "water", name: "Clean water, a spoon and a plate", nameTe: "శుభ్రమైన నీరు, చెంచా, పళ్ళెం", description: "A cup of clean water, a small spoon (uddharani), and a plate to receive the offerings.", descriptionTe: "శుభ్రమైన నీరు ఒక గ్లాసు, చిన్న చెంచా (ఉద్ధరిణి), నైవేద్యాలు స్వీకరించడానికి ఒక పళ్ళెం.", category: "REQUIRED", match: (r) => /\bwater\b|clean water/i.test(r) },
  { id: "akshata", name: "Akshata (unbroken rice)", nameTe: "అక్షతలు", description: "Whole, unbroken raw rice, usually with a pinch of turmeric.", descriptionTe: "విరగని బియ్యం, సాధారణంగా కొంచెం పసుపు కలిపి ఉంటుంది.", category: "REQUIRED", match: (r) => /akshata|white rice/i.test(r) },
  { id: "flowers", name: "Fresh flowers", nameTe: "పువ్వులు", description: "Fresh, clean flowers you can identify. The mantras name jaji and kunda among fragrant flowers.", descriptionTe: "మీరు గుర్తించగల తాజా, శుభ్రమైన పువ్వులు. మంత్రాలు జాజి, కుంద వంటి సుగంధ పుష్పాలను పేర్కొంటాయి.", category: "REQUIRED", match: (r) => /flower|jaji|kunda|mantrapushpa/i.test(r) },
  { id: "gandha", name: "Sandal paste and kumkuma", nameTe: "గంధం, కుంకుమ", description: "Sandal (chandana) paste and kumkuma; the gandha mantra also names aguru, camphor and musk.", descriptionTe: "గంధం (చందనం), కుంకుమ; గంధ మంత్రం అగరు, కర్పూరం, కస్తూరిని కూడా పేర్కొంటుంది.", category: "REQUIRED", match: (r) => /sandal|gandha|chandana|aguru|kumkuma|kasturi|musk/i.test(r) },
  { id: "incense", name: "Incense (dhupa)", nameTe: "అగరుబత్తీలు (ధూపం)", description: "Incense sticks or a dhupa mix; the mantra names a ten-part (dashanga) incense with guggulu.", descriptionTe: "అగరుబత్తీలు లేదా ధూప మిశ్రమం; మంత్రం గుగ్గిలంతో కూడిన దశాంగ ధూపాన్ని పేర్కొంటుంది.", category: "REQUIRED", match: (r) => /incense|dashanga|guggulu/i.test(r) },
  { id: "camphor", name: "Camphor", nameTe: "కర్పూరం", description: "Camphor pieces for the neerajana (harati) flame.", descriptionTe: "నీరాజనం (హారతి) కోసం కర్పూర ముక్కలు.", category: "REQUIRED", match: (r) => /camphor|karpura/i.test(r) },
  { id: "food", name: "A simple food offering", nameTe: "నైవేద్యం (సాధారణ ఆహారం)", description: "A fruit or a home-made sweet (the mantra names modaka). Shared afterwards as prasadam.", descriptionTe: "ఒక పండు లేదా ఇంట్లో చేసిన తీపి పదార్థం (మంత్రం మోదకాన్ని పేర్కొంటుంది). తర్వాత ప్రసాదంగా పంచుకోబడుతుంది.", category: "REQUIRED", match: (r) => /modaka|food|gram|moong|chana|mudga/i.test(r) },
  { id: "panchamrita", name: "Panchamrita (for snana)", nameTe: "పంచామృతం (స్నానానికి)", description: "The five-nectar mix: milk, curd, ghee, honey and sugar. Also used for madhuparka.", descriptionTe: "పాలు, పెరుగు, నెయ్యి, తేనె, పంచదారతో కూడిన పంచామృతం. మధుపర్కానికి కూడా ఉపయోగిస్తారు.", category: "OPTIONAL", match: (r) => /panchamrita|curd|dadhi|milk|kshira|honey|madhu|ghee|ajya/i.test(r) },
  { id: "cloths", name: "A pair of cloths and cotton thread", nameTe: "రెండు వస్త్రాలు, నూలు దారం", description: "Two small clean cloths (vastra) and a length of cotton thread for the yajnopavita.", descriptionTe: "రెండు చిన్న శుభ్రమైన వస్త్రాలు, యజ్ఞోపవీతానికి నూలు దారం.", category: "OPTIONAL", match: (r) => /cloth|vastra|thread|brahma-sutra|uttareeya/i.test(r) },
  { id: "tambula", name: "Betel leaf and areca nut", nameTe: "తాంబూలం (తమలపాకు, వక్క)", description: "Two betel leaves and an areca nut for tambula.", descriptionTe: "తాంబూలానికి రెండు తమలపాకులు, ఒక వక్క.", category: "OPTIONAL", match: (r) => /betel|areca|pugiphala|nagavalli|pearl powder|mukta/i.test(r) },
  { id: "bell", name: "A bell (ghanta)", nameTe: "గంట", description: "A small hand bell rung during the puja.", descriptionTe: "పూజ సమయంలో మోగించే చిన్న చేతి గంట.", category: "OPTIONAL", match: (r) => /bell|ghanta/i.test(r) },
  { id: "kalasha", name: "A water vessel (kalasha)", nameTe: "కలశం", description: "A small metal or clay pot with clean water, for the Kalasha worship.", descriptionTe: "కలశారాధన కోసం శుభ్రమైన నీటితో నింపిన చిన్న లోహపు లేదా మట్టి కుండ.", category: "TRADITION_SPECIFIC", match: (r) => /kalasha|vessel/i.test(r) },
  { id: "durva", name: "Durva grass", nameTe: "గరిక (దూర్వ)", description: "A low, creeping grass with slender blades, offered in pairs. Offer only if you can clearly identify it.", descriptionTe: "సన్నని ఆకులతో ఉండే గరిక గడ్డి, జతలుగా సమర్పిస్తారు. మీరు స్పష్టంగా గుర్తించగలిగితేనే సమర్పించండి.", category: "TRADITION_SPECIFIC", match: (r) => /durva/i.test(r) },
  { id: "patri", name: "Patri (the 21 leaves)", nameTe: "పత్రి (21 ఆకులు)", description: "The set of twenty-one traditional leaves. See the patri section — offer only leaves you can clearly identify.", descriptionTe: "సాంప్రదాయ ఇరవై ఒక్క ఆకుల సమితి. పత్రి విభాగం చూడండి — మీరు స్పష్టంగా గుర్తించగల ఆకులను మాత్రమే సమర్పించండి.", category: "TRADITION_SPECIFIC", match: (r) => /patri|leaves|twenty-one/i.test(r) },
];

export const BETA_MATERIALS: readonly BetaMaterial[] = (() => {
  const named: Record<string, Set<string>> = {};
  for (const step of CANDIDATE_PUJA_STEPS) {
    for (const raw of step.materialsNamedInMantra) {
      for (const group of MATERIAL_GROUPS) {
        if (group.match && group.match(raw)) {
          (named[group.id] ??= new Set()).add(step.id);
        }
      }
    }
  }
  return MATERIAL_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    nameTe: g.nameTe,
    description: g.description,
    descriptionTe: g.descriptionTe,
    category: g.category,
    namedInSteps: [...(named[g.id] ?? [])],
    platformRequirement: g.platformRequirement === true,
    approvedAlternative: null as null,
  }));
})();

/** Materials for a path, split by category. A material applies when it is a
 * platform requirement, or names at least one step included in that path. */
export function betaMaterialsForPath(path: "SIMPLE" | "COMPLETE"): {
  needed: BetaMaterial[];
  optional: BetaMaterial[];
  traditionSpecific: BetaMaterial[];
} {
  const stepIds = new Set(betaJourneyStepsForPath(path).map((s) => s.id));
  const inPath = BETA_MATERIALS.filter(
    (m) => m.platformRequirement || m.namedInSteps.some((id) => stepIds.has(id)),
  );
  return {
    needed: inPath.filter((m) => m.category === "REQUIRED"),
    optional: inPath.filter((m) => m.category === "OPTIONAL"),
    traditionSpecific: inPath.filter((m) => m.category === "TRADITION_SPECIFIC"),
  };
}

export const BETA_MATERIALS_DISCLAIMER =
  "This checklist is built from the substances the puja mantras name (plus the " +
  "murti). Whether each item is religiously required has not been decided by a " +
  "reviewer.";
