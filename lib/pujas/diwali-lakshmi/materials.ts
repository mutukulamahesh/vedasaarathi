// Materials for the Diwali Lakshmi Puja, built from
// docs/pujas/diwali-lakshmi-puja-master.md Section 4.
//
// P1 names the acts of offering but prints no consolidated shopping list or
// quantities anywhere in its 24 pages. This checklist is an EDITORIAL list
// inferred from P1's named offerings, not a claim that P1 mandates a
// specific item, vessel, or quantity - exactly as the master document's
// Section 4 states. Category follows the same convention
// lib/pujas/vinayaka/beta-journey.ts already uses:
//   REQUIRED            - named in P1 or a functional necessity, no stated
//                          substitute
//   OPTIONAL             - named in P1, but P1 or the master document's own
//                          [App-team accommodation] notes allow a missing
//                          item to be skipped or substituted
//   TRADITION_SPECIFIC   - not used here; nothing in this puja is
//                          identify-only (e.g. a specific leaf) the way the
//                          Vinayaka patri is.

export type DiwaliMaterialCategory = "REQUIRED" | "OPTIONAL";

export interface DiwaliMaterial {
  id: string;
  name: string;
  nameTe: string;
  description: string;
  descriptionTe: string;
  category: DiwaliMaterialCategory;
  /** A documented or reviewed stand-in, or null when none is offered. */
  approvedAlternative: string | null;
  /** Step ids this item is named in or needed for (see lib/puja/types.ts
   * usedInStepIds). Empty = not tied to a specific step. */
  namedInSteps: readonly string[];
  /** Needed for the whole puja regardless of path (the deity's own image). */
  platformRequirement?: boolean;
  /** Whether a named source confirms this item (Section 4's "Named in P1" /
   * "Functional necessity" distinction). */
  namedInSource: boolean;
}

export const DIWALI_MATERIALS: readonly DiwaliMaterial[] = [
  {
    id: "lakshmi-image",
    name: "Lakshmi image or murti",
    nameTe: "లక్ష్మీదేవి చిత్రం లేదా విగ్రహం",
    description:
      "A picture or small idol of Mahalakshmi. P1 does not describe the " +
      "object's physical form - any respectful representation is fine.",
    descriptionTe:
      "మహాలక్ష్మీ చిత్రం లేదా చిన్న విగ్రహం. P1 దీని భౌతిక రూపాన్ని " +
      "వివరించదు - గౌరవప్రదమైన ఏ ప్రతిమ అయినా సరిపోతుంది.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: [],
    platformRequirement: true,
    namedInSource: true,
  },
  {
    id: "ganapati-image",
    name: "Ganapati representation",
    nameTe: "గణపతి ప్రతిమ",
    description:
      "A small Ganapati representation for the opening Ganapati worship. P1 " +
      "does not specify turmeric, clay, or any particular material.",
    descriptionTe:
      "పూజ ప్రారంభంలో గణపతి పూజ కోసం చిన్న గణపతి ప్రతిమ. P1 పసుపు, మట్టి " +
      "వంటి ప్రత్యేక పదార్థాన్ని పేర్కొనదు.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-08"],
    namedInSource: true,
  },
  {
    id: "kalasha",
    name: "Kalasha (water vessel)",
    nameTe: "కలశం",
    description: "A small metal or clay pot, filled with clean water, for the Kalasha worship.",
    descriptionTe: "కలశారాధన కోసం శుభ్రమైన నీటితో నింపిన చిన్న లోహపు లేదా మట్టి కుండ.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-07"],
    namedInSource: true,
  },
  {
    id: "water-vessel",
    name: "Clean water, a spoon and a plate",
    nameTe: "శుభ్రమైన నీరు, చెంచా, పళ్ళెం",
    description:
      "Needed for Achamanam, the kalasha worship, and every water-offering " +
      "line (Padya, Arghya, Achamaniya, Snana, naivedyam water lines).",
    descriptionTe:
      "ఆచమనం, కలశారాధన, మరియు ప్రతి నీటి సమర్పణకు (పాద్యం, అర్ఘ్యం, " +
      "ఆచమనీయం, స్నానం, నైవేద్యం తర్వాత నీటి వాక్యాలు) అవసరం.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: [],
    platformRequirement: true,
    namedInSource: false,
  },
  {
    id: "flowers",
    name: "Flowers",
    nameTe: "పువ్వులు",
    description: "Fresh flowers you can identify. P1 names no particular species.",
    descriptionTe: "మీరు గుర్తించగల తాజా పువ్వులు. P1 ప్రత్యేక పుష్ప జాతిని పేర్కొనదు.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-19", "dlp-20"],
    namedInSource: true,
  },
  {
    id: "gandha",
    name: "Sandal paste, turmeric and kumkum",
    nameTe: "గంధం, పసుపు, కుంకుమ",
    description: "Sandal paste (గంధం), turmeric (పసుపు) and kumkum (కుంకుమ).",
    descriptionTe: "గంధం, పసుపు, కుంకుమ.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-18"],
    namedInSource: true,
  },
  {
    id: "yellow-cloth",
    name: "Yellow or saffron cloth",
    nameTe: "పీతాంబరం (పసుపు రంగు వస్త్రం)",
    description: "A yellow or saffron cloth, offered or symbolically placed.",
    descriptionTe: "పసుపు లేదా కుంకుమ రంగు వస్త్రం, సమర్పించడానికి లేదా సంకేతంగా ఉంచడానికి.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-16"],
    namedInSource: true,
  },
  {
    id: "sacred-thread",
    name: "Sacred thread, gold-coloured if possible",
    nameTe: "సౌవర్ణం యజ్ఞ సూత్రం",
    description: "A sacred thread, gold-coloured if available. P1 does not require real gold.",
    descriptionTe: "బంగారు రంగు యజ్ఞోపవీతం, వీలైతే. P1 నిజమైన బంగారాన్ని కోరదు.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-17"],
    namedInSource: true,
  },
  {
    id: "ornament",
    name: "Ornament or jewellery",
    nameTe: "ఆభరణం",
    description:
      "Any small piece of jewellery already in the home. Do not buy " +
      "jewellery specially - P1 does not specify material or value.",
    descriptionTe:
      "ఇంట్లో ఇప్పటికే ఉన్న ఏదైనా చిన్న ఆభరణం. ప్రత్యేకంగా కొనవద్దు - P1 " +
      "పదార్థాన్ని లేదా విలువను పేర్కొనదు.",
    category: "OPTIONAL",
    approvedAlternative: "Omit if no jewellery is available; continue the puja.",
    namedInSteps: ["dlp-19"],
    namedInSource: true,
  },
  {
    id: "lamp",
    name: "Lamp, fuel or wick, and a lighter",
    nameTe: "దీపం, వత్తి/నూనె, అగ్గిపెట్టె",
    description: "For the Deepam and Neerajanam steps.",
    descriptionTe: "దీపం మరియు నీరాజనం దశల కోసం.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-23", "dlp-26"],
    namedInSource: true,
  },
  {
    id: "incense",
    name: "Incense",
    nameTe: "అగరుబత్తీలు (ధూపం)",
    description:
      "Use only if safe to do so; ventilate the room; skip entirely for " +
      "respiratory sensitivity - this is a practical accommodation, not a " +
      "claim that incense is traditionally forbidden.",
    descriptionTe:
      "సురక్షితమైతేనే వాడండి; గదిని గాలి తగిలేలా ఉంచండి; శ్వాస సమస్య ఉంటే పూర్తిగా " +
      "వదిలేయవచ్చు - ఇది ఆచరణాత్మక సర్దుబాటు మాత్రమే, ధూపం నిషిద్ధమని కాదు.",
    category: "OPTIONAL",
    approvedAlternative: "Skip and continue the puja; omitting incense does not block the puja.",
    namedInSteps: ["dlp-22"],
    namedInSource: true,
  },
  {
    id: "naivedyam",
    name: "A sweet food offering",
    nameTe: "నైవేద్యం (తీపి పదార్థం)",
    description:
      "P1 describes a sweet preparation (sugar and honey mixed, filled " +
      "with ghee and the like) - not an exact recipe. Must be fresh and " +
      "allergy-appropriate for the household.",
    descriptionTe:
      "P1 తీపి పదార్థాన్ని వర్ణిస్తుంది (పంచదార, తేనె, నెయ్యితో కూడినది) - ఖచ్చితమైన " +
      "వంటకం కాదు. తాజాగా, కుటుంబానికి అలర్జీ లేకుండా ఉండాలి.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-24"],
    namedInSource: true,
  },
  {
    id: "tambulam",
    name: "Betel leaves and areca nut",
    nameTe: "తాంబూలం (తమలపాకులు, వక్క)",
    description: "For the Tambulam step.",
    descriptionTe: "తాంబూలం దశ కోసం.",
    category: "OPTIONAL",
    approvedAlternative:
      "If unavailable, recite the verse in full and offer a pinch of akshata or a flower instead.",
    namedInSteps: ["dlp-25"],
    namedInSource: true,
  },
  {
    id: "bell",
    name: "Bell",
    nameTe: "గంట",
    description: "Rung gently during the bell verse, if available.",
    descriptionTe: "గంటా నాద శ్లోకం సమయంలో మెల్లగా మోగించడానికి, ఉంటే.",
    category: "OPTIONAL",
    approvedAlternative: "If unavailable, recite the verse and continue; a missing bell does not block the puja.",
    namedInSteps: ["dlp-06"],
    namedInSource: true,
  },
  {
    id: "camphor",
    name: "Camphor",
    nameTe: "కర్పూరం",
    description: "For the Neerajanam (aarti) flame.",
    descriptionTe: "నీరాజనం (హారతి) కోసం.",
    category: "REQUIRED",
    approvedAlternative: null,
    namedInSteps: ["dlp-26"],
    namedInSource: true,
  },
];

export const DIWALI_MATERIALS_DISCLAIMER =
  "This checklist is an editorial list inferred from the source booklet's " +
  "named offerings, not a claim that any exact item, vessel, or quantity is " +
  "mandatory. Missing an item never stops the puja.";
