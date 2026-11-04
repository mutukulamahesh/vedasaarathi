// Source manifest for the Diwali Lakshmi Puja.
//
// This puja's content comes from a single primary source, already fully
// reconciled in docs/pujas/diwali-lakshmi-puja-master.md (v0.3): every
// discrepancy the task asked about has an explicit, cited decision there
// (Section 6). This file just names the source files the per-step
// PujaSourceRef entries point at - it does not re-derive any content.

export type SourceAvailability = "AVAILABLE" | "NOT_SUPPLIED";

export interface DiwaliSourceFile {
  id: string;
  filename: string;
  availability: SourceAvailability;
  pageCount: number | null;
  author: string | null;
  sha256: string | null;
  notes: string;
}

export const DIWALI_SOURCE_FILES: readonly DiwaliSourceFile[] = [
  {
    id: "p1-diwali-booklet",
    filename: "045. Diwali Lakshmi Puja in Telugu and English.pdf",
    availability: "AVAILABLE",
    pageCount: 24,
    author: "Srinivas, Nanduri",
    sha256: "2d04c03bb448a18b9cbb7d14a10864acc46ef38b9297017328f010f367f27587",
    notes:
      "Structure: p.1 cover; pp.2-12 Telugu-script recitation; p.13 section " +
      "divider; pp.14-24 Roman transliteration of the same material. " +
      "pdftotext extraction of the Telugu pages is corrupted (confirmed by " +
      "the master document, Section 9.3); every Telugu-script string below " +
      "was read directly from the rendered page image, not from that " +
      "extraction. Page numbers cited in this puja's sourceRefs are the " +
      "Telugu-script page (pp.2-12) - the page that was actually read for " +
      "the displayed/audio text. The PDF itself is not tracked by git, " +
      "consistent with existing project practice for source PDFs.",
  },
];

/** Concerns to confirm before any of this content moves from REVIEW_REQUIRED
 * sourced beta candidate to VERIFIED / PRIEST_REVIEWED_PRACTICE. */
export const DIWALI_REVIEW_FLAGS: readonly string[] = [
  "No priest review has been requested yet (master document Section 2, P1 " +
    "entry, and Section 8). This does not block sourced-beta-candidate " +
    "display, only the VERIFIED / PRIEST_REVIEWED_PRACTICE labels.",
  "No second human (or OCR-scaffolded) proofreading pass has independently " +
    "re-confirmed this session's page-image transcription (master document " +
    "Section 9.4).",
  "DLP-11 (Asana) and DLP-24 (Naivedyam) each carry an editorial reading " +
    "selection with a full citation (master document Section 6.6, 6.2); " +
    "P1's literal printed wording is preserved separately as historical " +
    "source text and is never itself used for display or audio.",
];

export function diwaliSourceFilename(sourceId: string): string {
  return DIWALI_SOURCE_FILES.find((f) => f.id === sourceId)?.filename ?? sourceId;
}
