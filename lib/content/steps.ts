import type { ReviewStatus } from "./review-status";
import { draftProvenance, type Provenance } from "./provenance";

export type PujaPath = "SIMPLE" | "COMPLETE";
export type StepImportance = "CORE" | "OPTIONAL";

export interface RitualStep {
  id: string; title: string; teluguTitle: string; teluguInstruction: string;
  what: string; how: string; why: string; importance: StepImportance;
  minutes: number; termNote: string | null; reviewStatus: ReviewStatus;
  locked: boolean; provenance: Provenance;
}

const candidate = (scope: string): Provenance => draftProvenance({
  source: "Nanduri Vinayaka Chaviti Puja handouts and supplied priest Vrata Kalpamu PDF",
  sourceReference: scope, writtenSourceStatus: "PENDING",
  traditionScope: "Telugu household Vinayaka Chavithi — candidate for priest review",
  contentVersion: "vinayaka-candidate-1",
});

const ritual = (id: string, title: string, teluguTitle: string,
  teluguInstruction: string, what: string, how: string, why: string,
  importance: StepImportance = "CORE", minutes = 2,
  termNote: string | null = null): RitualStep => ({
  id, title, teluguTitle, teluguInstruction, what, how, why, importance, minutes,
  termNote, reviewStatus: "REVIEW_REQUIRED", locked: true,
  provenance: candidate(`${title} section; exact page and wording awaiting review`),
});

const practical = (id: string, title: string, teluguTitle: string,
  teluguInstruction: string, what: string, how: string, why: string): RitualStep => ({
  id, title, teluguTitle, teluguInstruction, what, how, why, importance: "CORE",
  minutes: 2, termNote: null, reviewStatus: "GENERAL_GUIDANCE", locked: false,
  provenance: draftProvenance({ traditionScope: "Practical preparation and safety" }),
});

export const RITUAL_STEPS: readonly RitualStep[] = [
  practical("get-ready", "Prepare a calm place", "పూజకు సిద్ధం అవ్వండి", "పూజ సామగ్రిని దగ్గర పెట్టుకొని, వినాయకుని ముందు సౌకర్యంగా కూర్చోండి.", "Place the Ganesha idol or picture on a clean, steady surface.", "Keep water and offerings within reach. Seat children away from the flame.", "Preparing first helps you continue without rushing."),
  { ...practical("light-lamp", "Light the lamp safely", "దీపం వెలిగించండి", "దీపాన్ని సురక్షితంగా వెలిగించండి.", "Light the lamp near, but not against, the idol or picture.", "An adult should light it and keep the flame away from children, hair and cloth.", "The lamp marks the beginning and helps everyone settle."), termNote: "Deepam means the lamp used during worship." },
  ritual("opening", "Begin and settle the mind", "ప్రారంభ ప్రార్థన", "చేతులు జోడించి, ప్రశాంతంగా పూజను ప్రారంభించండి.", "Join your hands and begin with the opening prayer in the reviewed text.", "Sit facing the setup. Use approved text or audio when available.", "This creates a clear beginning to the worship."),
  ritual("achamanam", "Purification (Achamanam)", "ఆచమనం", "ఆచమన విధానాన్ని అనుసరించండి.", "Follow the short purification step.", "Use a spoon and clean water. Exact actions and words remain in review.", "Achamanam is a traditional preparation before the main worship.", "OPTIONAL"),
  ritual("pranayama", "Pause and breathe", "ప్రాణాయామం", "కొన్ని క్షణాలు ప్రశాంతంగా శ్వాస తీసుకోండి.", "Pause briefly and steady your breathing.", "Do not hold your breath if uncomfortable. Beginners may sit quietly.", "A calm pause helps bring attention to the puja.", "OPTIONAL", 1),
  ritual("sankalpam", "State the intention (Sankalpam)", "సంకల్పం", "ఈ పూజను ఎవరు, ఎక్కడ, ఎందుకు చేస్తున్నారో సంకల్పంగా చెప్పండి.", "State who is performing this puja and the purpose.", "Use only entered details. Unknown Gotra, Veda, Sutra or Sampradaya stays unknown and is never replaced or guessed.", "Sankalpam is the spoken intention for the worship.", "CORE", 3, "A family may share an intention; unrelated participants remain separately named."),
  ritual("kalasha", "Prepare the water vessel", "కలశ పూజ", "కలశం ఉంటే పూజించండి.", "Prepare the water vessel when following the complete path.", "Place clean water in a stable vessel. Detailed placements remain in review.", "The complete household procedure includes Kalasha worship.", "OPTIONAL", 3),
  ritual("dhyana-avahana", "Meditate and invite Ganesha", "ధ్యానం – ఆవాహనం", "వినాయకుని ధ్యానించి, పూజను స్వీకరించమని ప్రార్థించండి.", "Meditate briefly and make the simple household invitation.", "This beginner path uses simple Avahana; it does not teach elaborate priest-led Prana Pratishtha.", "Dhyana is meditation; Avahana is respectfully inviting the deity."),
  ritual("seat-water", "Offer a seat and water", "ఆసనం – పాద్యం – అర్ఘ్యం", "ఆసనం, పాద్యం, అర్ఘ్యం, ఆచమనీయంగా కొద్దిగా నీరు సమర్పించండి.", "Make the symbolic seat and water offerings.", "Use a spoonful or a flower dipped in water so a clay idol is not damaged.", "These are traditional gestures of welcome."),
  ritual("bath-clothing", "Offer bath and clothing", "స్నానం – వస్త్రం", "విగ్రహానికి హాని కలగకుండా ప్రతీకాత్మకంగా సమర్పించండి.", "Offer a symbolic bath and clothing.", "Lightly sprinkle water. Do not pour liquid over painted, paper or delicate items.", "These are traditional services offered with care.", "OPTIONAL", 3),
  ritual("gandha-akshata", "Offer sandal, kumkum and akshata", "గంధం – కుంకుమ – అక్షతలు", "గంధం, కుంకుమ, అక్షతలను సమర్పించండి.", "Offer small amounts of the prepared items.", "Place them gently near the feet or on a plate if the idol may be damaged.", "These offerings occur in the supplied household procedure."),
  ritual("anga-puja", "Offer worship to each part", "అంగ పూజ", "అంగపూజను పుస్తకంలోని క్రమంలో చేయండి.", "Follow Anga Puja only with reviewed wording.", "Offer a flower or akshata for each name without pressing a delicate idol.", "This is a detailed part of the complete procedure.", "OPTIONAL", 5),
  ritual("patri", "Offer available patri", "ఏకవింశతి పత్ర పూజ", "మీకు తెలిసిన, సురక్షితమైన పత్రాలను మాత్రమే సమర్పించండి.", "Offer traditional leaves you safely obtained.", "Never pick an unidentified plant. If unavailable, the supplied priest permits flowers or akshata; this is a practice candidate, not verified scripture.", "Patri means leaves offered during worship.", "OPTIONAL", 5),
  ritual("names", "Offer flowers with Ganesha's names", "అష్టోత్తర శతనామావళి", "నామాలను చెబుతూ పుష్పాలు లేదా అక్షతలు సమర్పించండి.", "Offer a flower or akshata while reciting the approved names.", "Use the full list when time permits; exact text and pronunciation remain in review.", "Reciting names is part of the detailed puja.", "OPTIONAL", 8),
  ritual("incense-lamp", "Offer incense and lamp", "ధూపం – దీపం", "ధూపం, దీపం సమర్పించండి.", "Offer incense if safe, then show the lamp.", "Ventilate the room. Skip incense for breathing sensitivity; an adult handles flame.", "These offerings come near the close of worship."),
  ritual("naivedyam", "Offer food and water", "నైవేద్యం", "పండు లేదా ఇంట్లో చేసిన ఆహారాన్ని నైవేద్యంగా సమర్పించండి.", "Place fruit or prepared food before Ganesha and offer water.", "Keep it clean. After the puja, share it as prasadam.", "Naivedyam means food offered before it is shared."),
  ritual("harati", "Offer Mangala Harati", "మంగళ హారతి", "పెద్దవారు సురక్షితంగా హారతి ఇవ్వండి.", "An adult offers the closing lamp with approved prayer text or audio.", "Move slowly and place the lamp on a heat-safe surface.", "Harati is the auspicious closing lamp offering."),
  ritual("pradakshina", "Offer respect and ask forgiveness", "ప్రదక్షిణ – నమస్కారం", "నమస్కరించి, జరిగిన తప్పులకు క్షమాపణ కోరండి.", "Offer namaskaram and ask forgiveness for mistakes.", "If circling is unsafe or space is small, remain in place; an exact alternative awaits review.", "The puja closes with humility and gratitude."),
  ritual("yatha-shakti", "Complete according to your ability", "యథాశక్తి పూజా సమర్పణ", "మీ శక్తి మేరకు చేసిన పూజను వినయంగా సమర్పించండి.", "Conclude by offering the worship you were able to perform.", "Do not feel pressured by missing items or skipped optional steps. The supplied handout explicitly uses Yatha Shakti.", "Yatha Shakti means according to one's ability."),
  ritual("katha", "Read or listen to the Vrata Katha", "వ్రత కథ", "వినాయక వ్రత కథను చదవండి లేదా వినండి.", "Read or listen to a reviewed, licensed version of the story.", "The app will link or license approved text; it does not copy a full unlicensed work.", "The story is an important Telugu Vinayaka Chavithi practice.", "OPTIONAL", 12),
];

export function stepsForPath(path: PujaPath): RitualStep[] {
  return RITUAL_STEPS.filter((step) => path === "COMPLETE" || step.importance === "CORE");
}
export function estimatedMinutes(path: PujaPath): number {
  return stepsForPath(path).reduce((sum, step) => sum + step.minutes, 0);
}
export function lockedSteps(): RitualStep[] { return RITUAL_STEPS.filter((step) => step.locked); }

export function clampStepIndex(index: number, length = RITUAL_STEPS.length): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
