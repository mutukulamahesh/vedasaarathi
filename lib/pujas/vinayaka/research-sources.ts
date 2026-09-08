// Online source inventory for the Family Beta.
//
// Used only to supply BEGINNER PHYSICAL ACTIONS (see ./beginner-actions.ts)
// where the supplied PDFs state none. It is NEVER used to change a recovered
// mantra transcription, a Sankalpam wording, or any canonical text - those
// come only from the supplied Nanduri PDFs. AI-generated answers are not used
// as sources.
//
// Priority order followed (highest first):
//   1. Temple / Peetham / mutt / recognised religious organisation
//   2. Published puja paddhati or Vrata Kalpam
//   3. Trusted Telugu / Sanskrit religious-text repository
//   4. Reputable traditional instructional source

export type ResearchTier =
  | "TEMPLE_OR_PEETHAM"
  | "PUBLISHED_PADDHATI"
  | "TEXT_REPOSITORY"
  | "TRADITIONAL_INSTRUCTIONAL";

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  organisationOrAuthor: string;
  accessedDate: string; // ISO
  relevantSection: string;
  traditionScope: string;
  tier: ResearchTier;
  /** Does its step sequence match the supplied Nanduri PDFs' sequence? */
  matchesPdfSequence: boolean;
  /** Confidence in the extracted physical-action detail. */
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Known conflicts with the PDFs or with other sources. */
  conflicts: string | null;
}

export const RESEARCH_SOURCES: readonly ResearchSource[] = [
  {
    id: "telugupanchangamdaily-vvk",
    url: "https://telugupanchangamdaily.com/vinayaka-vratha-kalpam/",
    title: "Vinayaka Vratha Kalpam — Puja Vidhanam, 21 Patri & Vratha Katha",
    organisationOrAuthor: "TeluguPanchangamDaily",
    accessedDate: "2026-09-08",
    relevantSection:
      "Puja Vidhanam (13 steps: Achamanam, Pranayamam, Sankalpam, Kalasha " +
      "Puja, Deepa Aradhana, Ganapati Dhyanam & Avahanam, Shodashopachara, " +
      "Ekavimshati Patra Puja, Ashtottara Shatanamavali, Vratha Katha, " +
      "Mangala Harati & Vayana Danam, Udvasana); the 21-patri table.",
    traditionScope: "Telugu household Vinayaka Chavithi (Vratha Kalpam)",
    tier: "PUBLISHED_PADDHATI",
    matchesPdfSequence: true,
    confidence: "MEDIUM",
    conflicts:
      "Gives Telugu common-plant names for the 21 patri (single source, not " +
      "cross-checked - NOT copied into canonical patri data). Ashtottara " +
      "offering: 'akshatalu/flowers'. Vratha Katha read while holding akshata.",
  },
  {
    id: "drikpanchang-ganesha-chaturthi-vidhi",
    url: "https://www.drikpanchang.com/festivals/ganesh-chaturthi/ganesha-chaturthi-puja-vidhi.html",
    title: "Ganesha Chaturthi Puja Vidhi (Shodashopachara)",
    organisationOrAuthor: "Drik Panchang",
    accessedDate: "2026-09-08",
    relevantSection:
      "Shodashopachara step list with a plain-English physical action per " +
      "upachara (Avahana mudra; asana = five flowers in anjali; padya/arghya/" +
      "achamana = offer water; snana = water then panchamrita; gandha = " +
      "sandal paste; akshata; pushpa garland; dhupa; deepa; naivedya; " +
      "tambula; nirajana/aarti; pradakshina from left to right with flowers).",
    traditionScope: "Pan-Indian shodashopachara Ganesha puja",
    tier: "TRADITIONAL_INSTRUCTIONAL",
    matchesPdfSequence: true,
    confidence: "MEDIUM",
    conflicts:
      "Uses 'Moli' (raksha thread) for vastra and adds 'dakshina'; the " +
      "supplied PDFs and the Telugu Vratha Kalpam use a pair of cloths " +
      "(rakta-vastra-dvaya) and no dakshina step. The PDF sequence is followed.",
  },
  {
    id: "drikpanchang-ganesha-sankshipt-vidhi",
    url: "https://www.drikpanchang.com/puja-vidhi/lord-ganesha/ganesha-puja-vidhi.html",
    title: "Ganapati Puja Vidhi — Sankshipt (abbreviated) Puja Vidhi",
    organisationOrAuthor: "Drik Panchang",
    accessedDate: "2026-09-08",
    relevantSection:
      "Avahana mudra description (join palms, fold thumbs inward); dashopachara " +
      "offering pattern (water on the areca-nut, then gandha-akshata, flowers, " +
      "incense, lamp, food, rinse water, betel leaf).",
    traditionScope: "Abbreviated household Ganapati puja",
    tier: "TRADITIONAL_INSTRUCTIONAL",
    matchesPdfSequence: false,
    confidence: "LOW",
    conflicts:
      "Abbreviated 5-step form; not the full shodashopachara. Used only for " +
      "the Avahana-mudra hand description.",
  },
];

export function researchSource(id: string): ResearchSource | undefined {
  return RESEARCH_SOURCES.find((s) => s.id === id);
}

/** Items that still need online sourcing and are NOT covered above. */
export const RESEARCH_STILL_NEEDED: readonly string[] = [
  "Full dated Sankalpam (samvatsara/ayana/rtu/masa/paksha/tithi/vaara/" +
    "nakshatra/gotra/naama) - the PDFs and the found sources only have short forms.",
  "Per-participant-mode Sankalpam wording (individual / family / unrelated " +
    "group) and unknown-lineage handling, from a temple or published paddhati.",
  "Botanical identity + safe-identification notes for each of the 21 patri, " +
    "cross-checked across at least two temple/paddhati sources.",
  "A documented flowers/akshata substitution rule for unavailable patri " +
    "(still attributed only to a priest reply that was never supplied).",
  "A licensed / rights-cleared Vinayaka Vrata Katha text.",
];
