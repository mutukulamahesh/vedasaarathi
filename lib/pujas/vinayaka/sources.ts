// Source manifest for the Vinayaka Chavithi puja review candidate.
//
// Everything in lib/pujas/vinayaka/candidate.ts is grounded in the files
// listed here, page by page. No content is added from model memory. Where a
// source is corrupt, missing, or ambiguous, the candidate records a reviewer
// question instead of guessing.

export type SourceAvailability = "AVAILABLE" | "NOT_SUPPLIED";

export interface PujaSourceFile {
  /** Exact filename as supplied by the product owner. */
  id: string;
  filename: string;
  availability: SourceAvailability;
  pageCount: number | null;
  /** Embedded PDF author metadata, verbatim. */
  author: string | null;
  /** Tooling used and how it went. */
  extraction: string;
  sha256: string | null;
  /** What this file is and how far it can be trusted. */
  notes: string;
}

export const PUJA_SOURCE_FILES: readonly PujaSourceFile[] = [
  {
    id: "english-lyrics",
    filename: "039. Vinayaka Chaviti Puja -English Lyrics.pdf",
    availability: "AVAILABLE",
    pageCount: 17,
    author: "Srinivas, Nanduri",
    extraction:
      "Text layer extracts cleanly as ASCII transliteration (pdftotext and " +
      "mutool agree). This is the authoritative transliteration source.",
    sha256: "c59a8d3249ad46bbdc27bb56c0cd9e661acdb0b79826362315ae94011fd67cc6",
    notes:
      "PowerPoint export. Pages 1-11 are the puja mantra sequence in a " +
      "romanised transliteration scheme (capital S = sha, capital T = Ta, " +
      "double vowels = long vowels, etc.). Pages 12-17 are an English-prose " +
      "retelling of the Vinayaka Vrata Katha - that prose is the compiler's " +
      "own creative expression and is NOT reproduced here (see COPYRIGHT_FLAGS).",
  },
  {
    id: "telugu-lyrics",
    filename: "039. Vinayaka Chaviti Puja - Telugu Lyrics.pdf",
    availability: "AVAILABLE",
    pageCount: 15,
    author: "Srinivas, Nanduri",
    extraction:
      "Text layer is CORRUPT for Telugu: the subsetted font's ToUnicode CMap " +
      "reorders vowel signs and inserts spurious viramas, so pdftotext and " +
      "mutool both return mangled conjuncts. Exact Telugu-script text cannot " +
      "be extracted automatically and is NOT stored - each step instead " +
      "carries a page-referenced transcription task for the reviewer.",
    sha256: "bc856b7346a77c8fea09c9d3532a5804207b781a2d0db7f4115b2717293fef0e",
    notes:
      "PowerPoint export titled \"English & Telugu Versions\". Same sequence " +
      "as the English file, with the mantras in Telugu script and the Vrata " +
      "Katha as Telugu prose (pages 11-15). Page 1 carries a scope line, " +
      "present only in this file, stating the puja may be done on Vinayaka " +
      "Chaviti, on any Shukla-paksha Chaviti, or as a daily Vinayaka puja.",
  },
  {
    id: "vrata-kalpamu",
    filename: "వినాయక వ్రతకల్పం.pdf (Vinayaka Vrata Kalpamu)",
    availability: "NOT_SUPPLIED",
    pageCount: null,
    author: null,
    extraction: "Not present in this environment.",
    sha256: null,
    notes:
      "Referenced by docs/VINAYAKA_PUJA_CONTENT_SPEC.md as the Telugu " +
      "household priest's supplied procedure. It was not attached. Any step " +
      "detail that would come from it (fuller Sankalpam slots, the " +
      "flowers/akshata patri fallback, kriya timing) is left as a reviewer " +
      "question, not filled in.",
  },
];

/** Concerns to raise before any of this content is reused or published. */
export const COPYRIGHT_FLAGS: readonly string[] = [
  "Both PDFs are authored by \"Nanduri Srinivas\" and carry a \"Nanduri " +
    "Srinivas Youtube Channel\" footer on nearly every page, plus a page-1 " +
    "pointer to that channel. Confirm permission to build on this compilation.",
  "The mantra verses are traditional liturgy (not themselves copyrightable), " +
    "but this particular selection, ordering and romanisation scheme are the " +
    "compiler's editorial work - store as REVIEW_REQUIRED and cite the page.",
  "The Vinayaka Vrata Katha on English pages 12-17 (and its Telugu prose on " +
    "pages 11-15) is the compiler's own narrative retelling. It is recorded " +
    "here only as an existing section with a page range; its text is not " +
    "copied pending a licence or an independently sourced/approved version.",
  "Do not copy the source's page layout, slide styling, or channel branding.",
];

export type ReviewerRecordStatus = "PROPOSED_REVIEWER";

export interface ProposedReviewer {
  status: ReviewerRecordStatus;
  name: string;
  qualificationsNote: string;
  affiliation: string;
  /** Explicit: nothing here has been approved by this person yet. */
  approvalNote: string;
}

export const PROPOSED_REVIEWER: ProposedReviewer = {
  status: "PROPOSED_REVIEWER",
  name: "బ్రహ్మశ్రీ డా. మాముదాల శ్రీకాంత శర్మ గారు (Brahmasri Dr. Mamudala Srikanta Sarma)",
  qualificationsNote:
    "M.A., M.B.A., Ph.D., with the supplied Jyotisha qualifications (as " +
    "provided by the product owner; not independently verified here).",
  affiliation: "Sri Bala Anjaneya Swamy Temple, Uppal Ring Road",
  approvalNote:
    "PROPOSED reviewer only. He has NOT reviewed or approved any step, " +
    "mantra, Sankalpam wording, patri list, or classification in this " +
    "candidate. No contact phone number is stored or displayed.",
};

export interface SourceReference {
  /** One of PUJA_SOURCE_FILES[].id. */
  sourceId: string;
  /** 1-based page number in that file. */
  page: number;
}

export function sourceFilename(sourceId: string): string {
  return PUJA_SOURCE_FILES.find((file) => file.id === sourceId)?.filename ?? sourceId;
}
