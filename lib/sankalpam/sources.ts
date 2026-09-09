// Researched written sources for the general-purpose Sankalpam generator.
//
// The Sankalpa is a traditional ritual formula with a long-published slot
// structure (Kalpa → Manvantara → Yuga → Samvatsara → Ayana → Ritu → Masa →
// Paksha → Tithi → Vara → Nakshatra, then Gotra + name, then place, then the
// purpose and "karishye"). No single rights holder. The generator fills the
// VARIABLE slots from the user's Panchanga and inputs; it does not invent the
// formula and it is never presented as priest-approved.
//
// Each source records: the exact URL, the access date, the section used, the
// tradition scope, and any disagreement with the others.

export interface SankalpamSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedISO: string;
  section: string;
  traditionScope: string;
  usedFor: string;
  disagreement: string | null;
}

export const SANKALPAM_SOURCES: readonly SankalpamSource[] = [
  {
    id: "pujayagna-sankalpa",
    title: "What is Sankalpa in Puja, Homam and Yagya — How is Sankalpa done?",
    publisher: "Eshwar Bhakti (pujayagna.com)",
    url: "https://pujayagna.com/blogs/pooja-havan-yagya/what-is-sankalpa-in-puja",
    accessedISO: "2026-09-09",
    section: "Worked Sankalpa example with every calendar slot; the note on unknown Gotra",
    traditionScope:
      "Smarta / general South-Indian puja practice, chandra-mana (lunar) reckoning",
    usedFor:
      "The full slot order and the transliterated fixed-frame phrases; the sourced rule that an unknown Gotra uses Kashyapa.",
    disagreement:
      "Names the river-bank locale ('Godavari dakshina tire'); other sources stop at Bharata-varshe / Bharata-khande. Handled as a place-detail choice.",
  },
  {
    id: "swayamvaraparvathi-sankalpa",
    title: "Sankalpa Mantra — Sankalpa Procedure — Sankalpam",
    publisher: "Swayamvara Parvathi (swayamvaraparvathi.org)",
    url: "https://swayamvaraparvathi.org/sankalpa-mantra-sankalpa-procedure-sankalpam/",
    accessedISO: "2026-09-09",
    section: "Sankalpa procedure; the simplified form for those who do not know the calendar terms",
    traditionScope: "General Devi-puja / vrata practice",
    usedFor:
      "The supplicant phrases ('asmakam' / 'asya yajamanasya'), the purpose slot, and the simplified fallback when calendar terms are unknown.",
    disagreement:
      "Offers a SIMPLIFIED sankalpa that omits samvatsara/ayana/ritu when unknown; pujayagna keeps the full dated form. Handled as the 'short form' option.",
  },
  {
    id: "drikpanchang-sankalpa",
    title: "Sankalpa | Sankalpa Mantra",
    publisher: "Drik Panchang (drikpanchang.com)",
    url: "https://www.drikpanchang.com/panchang/sankalpa/sankalpa.html",
    accessedISO: "2026-09-09",
    section: "Sankalpa structure and the update cadence of each slot",
    traditionScope: "Pan-Indian almanac; both chandra-mana and saura-mana noted",
    usedFor:
      "Cross-check of the canonical slot list and the rule that Samvatsara changes at Ugadi, Ayana twice a year, Masa ~monthly, and Tithi/Vara/Nakshatra daily.",
    disagreement:
      "Uses the Amanta or Purnimanta month depending on region; the generator shows the mhah-panchang month and records both reckonings from the Panchanga engine.",
  },
];

/** The tradition-supported convention for an unknown Gotra, offered as an
 * explicit choice — never auto-applied. */
export const UNKNOWN_GOTRA_CONVENTION = {
  value: "Kashyapa",
  valueTelugu: "కాశ్యప",
  rule: "avidita-gotranam kashyapa gotram (\"for those whose gotra is unknown, the gotra is Kashyapa\")",
  sources: ["pujayagna-sankalpa", "swayamvaraparvathi-sankalpa"],
  note:
    "This is a widely-followed convention, not a universal ruling. The generator " +
    "offers it as one choice alongside omitting the gotra clause and stating a " +
    "family tradition. It is never applied automatically.",
} as const;
