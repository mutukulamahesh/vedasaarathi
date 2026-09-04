// The Vinayaka Chavithi puja service: the one place that adapts Vinayaka's
// own content (its ritual steps, materials, patri section, and festival date)
// into the generic PujaDefinition shape the platform reads.
//
// This module - and the lib/content/{steps,materials,leaves,festival}.ts
// files it draws from - are the only places that hold Vinayaka-specific
// content. No new sacred content is introduced here: every field below is a
// straight pass-through of the existing, already-reviewed-or-draft content.

import {
  MATERIALS, MATERIALS_DISCLAIMER, MATERIAL_CATEGORY_LABEL,
} from "@/lib/content/materials";
import { RITUAL_STEPS } from "@/lib/content/steps";
import {
  PATRI_PROVENANCE, PATRI_REVIEW_NOTICE, PATRI_SAFETY_NOTE, PATRI_SECTION_TITLE,
  PATRI_SELF_REPORT_OPTIONS,
} from "@/lib/content/leaves";
import { PILOT_FESTIVAL } from "@/lib/content/festival";
import type { PujaDefinition } from "@/lib/puja/types";

export const VINAYAKA_PUJA_ID = "vinayaka-chavithi";
export const VINAYAKA_PUJA_SLUG = "vinayaka-chavithi";

export const VINAYAKA_PUJA: PujaDefinition = {
  id: VINAYAKA_PUJA_ID,
  slug: VINAYAKA_PUJA_SLUG,
  displayName: "Vinayaka Chavithi",
  teluguDisplayName: "వినాయక చవితి",
  description:
    "A guided home puja for Vinayaka Chavithi, with plain-language steps, " +
    "a preparation checklist, and Telugu/English narration.",
  availability: "AVAILABLE",
  languages: ["EN", "TE"],
  materials: {
    disclaimer: MATERIALS_DISCLAIMER,
    categoryLabel: MATERIAL_CATEGORY_LABEL,
    items: MATERIALS,
  },
  patri: {
    sectionTitle: PATRI_SECTION_TITLE,
    reviewNotice: PATRI_REVIEW_NOTICE,
    safetyNote: PATRI_SAFETY_NOTE,
    selfReportOptions: PATRI_SELF_REPORT_OPTIONS,
    provenance: PATRI_PROVENANCE,
  },
  steps: RITUAL_STEPS,
  festival: PILOT_FESTIVAL,
  metadata: {
    contentVersion: "vinayaka-candidate-1",
    reviewSummary:
      "Draft candidate content pending priest review. See each step's and " +
      "material's own review status for its exact state.",
  },
};
