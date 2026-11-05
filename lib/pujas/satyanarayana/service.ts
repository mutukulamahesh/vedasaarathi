/** Faithful extraction of the merged master v1.2; no mantra composed here.
 * Run scripts/extract-satyanarayana.py after an intentional master update.
 * Personalised Sankalpam is the existing platform form, not the married-male
 * source template. See docs/pujas/satyanarayana-implementation.md. */
import content from "./content.json";
import { draftProvenance } from "@/lib/content/provenance";
import type { PujaDefinition, PujaGuidedStep } from "@/lib/puja/types";

const VERSION = "satyanarayana-master-1.2-beta-1";
const provenance = (reference: string) => draftProvenance({
  source: "Sri Satyanarayana Vratham master v1.2; Varadacharyulu (1967) and identified cross-checks",
  sourceReference: reference,
  contentVersion: VERSION,
  traditionScope: "Selected Telugu household procedure; sourced beta, not a universal prescription",
  writtenSourceStatus: "CONFIRMED",
});

const MATERIAL_NAMES_TE = [
  "సత్యనారాయణ స్వామి ప్రతిమ లేదా పటం", "కలశం", "శుభ్రమైన నీళ్ళు", "బియ్యం",
  "పీటపై పరిచే కొత్త వస్త్రం", "కలశానికి రవిక", "మామిడి ఆకులు", "కొబ్బరికాయలు", "పీట",
  "పసుపు", "కుంకుమ", "గంధం", "అక్షతలు", "పుష్పాలు", "తులసి", "గరిక", "యజ్ఞోపవీతం",
  "వస్త్రయుగ్మం", "ఆభరణం", "పంచామృతం: పాలు, పెరుగు, నెయ్యి, తేనె, చక్కెర", "ధూపం",
  "దీపం, నెయ్యి లేదా నూనె, వత్తులు", "హారతి కర్పూరం", "ఘంట", "తమలపాకులు, వక్కలు",
  "అరటిపళ్ళు, ఇతర పండ్లు", "బెల్లం", "ప్రసాదానికి కావలసిన పదార్థాలు", "ఖర్జూరం, పటికబెల్లం",
  "పంచపాత్ర, ఉద్ధరిణి, నీళ్ళు విడిచే పళ్ళెం", "పళ్ళేలు, చిన్న గిన్నెలు", "కూర్చునేందుకు పీటలు లేదా చాపలు",
  "ముగ్గు పొడి", "అరటి ఆకులు లేదా కాండాలు", "పురోహితుడు ఉంటే దక్షిణ", "అగ్గిపెట్టె, దీపం కింద లోహపు పళ్ళెం, మూత",
  "చిన్న గొడుగు, విసనకర్ర", "మెత్తని గుడ్డ, ధూపం స్టాండు, పిడిగల హారతి పళ్ళెం",
];
const QUANTITIES_TE = [
  "ఒకటి", "సుమారు ఒక లీటరు పట్టేది ఒకటి", "మొత్తం 2–3 లీటర్లు", "మొత్తం 3–4 కప్పులు",
  "సుమారు ఒక మీటరు వస్త్రం", "ఒకటి", "ఐదు", "రెండు", "ఒకటి", "3–4 టేబుల్ స్పూన్లు", "ఒక చిన్న ప్యాకెట్",
  "రెండు టేబుల్ స్పూన్లు", "సుమారు ఒక కప్పు", "ఒక పెద్ద పళ్ళెం", "కొన్ని", "21 పోచలు లేదా చిన్న కట్ట",
  "ఒక జత", "ఒక జత", "ఒకటి; పూజ తరువాత తిరిగి తీసుకోవచ్చు", "ఐదు చిన్న కప్పుల్లో ఒక్కొక్కటి 2–3 టేబుల్ స్పూన్లు",
  "3–5 అగరుబత్తులు", "1–2 దీపాలు; సుమారు అర కప్పు నెయ్యి", "5–10 చిన్న బిళ్ళలు", "ఒకటి",
  "10–12 ఆకులు, 5–6 వక్కలు", "ఒక డజను అరటిపళ్ళు, ఇతర పండ్లు", "ఒక చిన్న ముక్క", "ప్రసాదం సిద్ధం దశలో రెండు వంట విధానాలు ఉన్నాయి",
  "కొన్ని", "ఒక్కొక్కటి ఒకటి", "4–6", "ఒక్కొక్కరికి ఒకటి", "కొంచెం", "అలంకరణకు ఉంటే", "మీ శక్తి మేరకు, ఐచ్ఛికం",
  "ఒక్కొక్కటి ఒకటి", "ఒక్కొక్కటి ఒకటి, ఐచ్ఛికం", "ఒక్కొక్కటి ఒకటి",
];

export const SATYANARAYANA_STEPS: readonly PujaGuidedStep[] = content.steps.map((s) => ({
  id: s.id, title: s.title, teluguTitle: s.teluguTitle,
  teluguInstruction: s.instructionTe, what: s.what, how: `${s.what}\n\n${s.how}`, why: s.meaning,
  importance: "CORE", // One full procedure; no invented short path.
  minutes: s.sourceStep.startsWith("SNV-P") ? 10 : s.openingTe ? 10 : s.sourceStep === "SNV-40" ? 8 : 2,
  termNote: null, reviewStatus: "REVIEW_REQUIRED", locked: true,
  provenance: provenance(`Master §3 ${s.sourceStep}; ${s.source}`),
  candidateStepId: s.sourceStep === "SNV-05" ? "sankalpa" : s.id,
  mantraTeluguScript: s.mantraTe || null,
  mantraTransliteration: s.roman, transliterationSupported: Boolean(s.roman),
  simpleMeaning: s.meaning, betaAction: s.how,
  materials: s.materials && s.materials !== "None." ? [s.materials] : Number(s.sourceStep.slice(4)) >= 13 && Number(s.sourceStep.slice(4)) <= 21 ? ["Prepared rice heap, flower and akshata"] : [],
  betaStatus: "SOURCED_BETA_CANDIDATE", includedInBeta: true,
  sourceSection: `Master v1.2 §3 ${s.sourceStep}; ${s.source}`, sourceRefs: [], betaClassification: "COMPLETE", classificationInferred: false,
  followingRecitation: s.followingTe ? { te: s.followingTe, roman: s.followingRoman } : undefined,
  reading: s.readingEn || s.readingTe ? {
    en: s.readingEn ?? "", te: s.readingTe ?? "",
    openingTe: s.openingTe ?? "", openingRoman: s.openingRoman ?? "",
  } : undefined,
}));

export const SATYANARAYANA_PUJA: PujaDefinition = {
  id: "satyanarayana-vratham", slug: "satyanarayana-vratham",
  displayName: "Sri Satyanarayana Swamy Vratham",
  teluguDisplayName: "శ్రీ సత్యనారాయణ స్వామి వ్రతం",
  description: "The full Telugu household procedure, preparation and prasadam recipes, with all five Katha chapters. Read in English or Telugu. Sourced beta text guide; audio is not included yet. Purnima is customary, not the only day you can perform it.",
  descriptionTe: "సిద్ధత, ప్రసాదం వంట విధానాలు, పూర్తి పూజాక్రమం, ఐదు కథా అధ్యాయాలు. తెలుగు లేదా ఆంగ్లంలో చదవవచ్చు. ప్రస్తుతం మూలాధార బీటా పాఠ్య మార్గదర్శి మాత్రమే; ఆడియో ఇంకా లేదు. పౌర్ణమి ఆచారం; ఆ రోజున మాత్రమే చేయాలనే నియమం లేదు.",
  availability: "AVAILABLE", languages: ["EN", "TE"], completeOnly: true, textOnly: true,
  materials: {
    disclaimer: "Selected Telugu household procedure, compiled from the named sources; not priest-reviewed.",
    categoryLabel: { REQUIRED: "For this procedure", OPTIONAL: "Optional or customary" },
    categoryLabelTe: { REQUIRED: "ఈ పూజా విధానానికి", OPTIONAL: "ఐచ్ఛికం లేదా ఆచారం" },
    items: content.materials.map((m, i) => ({
      id: m.id, name: m.name, nameTe: MATERIAL_NAMES_TE[i],
      description: m.quantity, descriptionTe: QUANTITIES_TE[i],
      category: m.status.startsWith("Required") ? "REQUIRED" : "OPTIONAL",
      approvedAlternative: null, reviewStatus: "REVIEW_REQUIRED",
      provenance: provenance(`Master §2.2 item ${i + 1}; ${m.source}`),
    })),
  },
  patri: {
    sectionTitle: "", reviewStatus: "REVIEW_REQUIRED", reviewNotice: "", safetyNote: "",
    selfReportOptions: [], provenance: provenance("No 21-leaf patri section in this procedure"), stepIds: [],
  },
  steps: SATYANARAYANA_STEPS, festival: null, postPujaGuidance: null,
  metadata: { contentVersion: VERSION, reviewSummary: "SOURCED_BETA_CANDIDATE; REVIEW_REQUIRED. Original EN/TE Katha retellings from master §6. No modern translation copied; no priest approval claimed." },
};
