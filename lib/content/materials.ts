// Materials checklist data for the Vinayaka Chavithi preparation journey.
//
// This is a DRAFT list. Whether any item is religiously required has not been
// decided by a reviewer, so:
//   - category text is neutral ("commonly prepared for this draft procedure"),
//     never "Needed" or "Required";
//   - GENERAL_GUIDANCE marks a plain factual description of an object, not a
//     ruling that the object is part of the rite;
//   - items whose ritual role is contested or absent from the priest's list
//     (durva, patri leaves) are REVIEW_REQUIRED and shown only as an
//     awaiting-review notice;
//   - every item carries Provenance, and none has a reviewer yet.

import type { ReviewStatus } from "./review-status";
import { draftProvenance, type Provenance } from "./provenance";

export type MaterialCategory = "COMMON" | "SOMETIMES" | "TRADITION_SPECIFIC";

/**
 * How often an item appears in this DRAFT procedure. This is not a ruling on
 * whether the item is religiously required.
 */
export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  COMMON: "Commonly prepared for this draft procedure",
  SOMETIMES: "Sometimes added in this draft procedure",
  TRADITION_SPECIFIC: "Varies by tradition",
};

export const MATERIALS_DISCLAIMER =
  "This is a draft preparation list. Whether each item is religiously required " +
  "has not been decided by a reviewer. Gather what you reasonably can.";

export interface MaterialItem {
  id: string;
  name: string;
  /** Plain, factual description of the object. Not a statement about the rite. */
  description: string;
  category: MaterialCategory;
  /** A documented or reviewed stand-in. Shown only once it passes the guidance gate. */
  approvedAlternative: string | null;
  reviewStatus: ReviewStatus;
  provenance: Provenance;
}

export const MATERIALS: readonly MaterialItem[] = [
  {
    id: "idol",
    name: "Ganesha idol or picture",
    description: "A small clay idol of Ganesha, or a clean printed picture.",
    category: "COMMON",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "lamp",
    name: "Lamp with oil or ghee",
    description: "A small lamp with oil or with ghee. Ghee means clarified butter.",
    category: "COMMON",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "turmeric-kumkum",
    name: "Turmeric and kumkum",
    description:
      "Turmeric (haldi) powder, and kumkum, the red powder used for a tilak mark.",
    category: "COMMON",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "akshata",
    name: "Akshata (unbroken rice)",
    description:
      "Akshata means whole, unbroken raw rice, usually mixed with a pinch of turmeric.",
    category: "COMMON",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "water",
    name: "A small cup of clean water",
    description: "Clean water in a small cup or spoon.",
    category: "COMMON",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "food-offering",
    name: "A simple food offering",
    description:
      "A fruit or a simple home-made sweet. It is shared afterwards as prasadam, which means blessed food.",
    category: "COMMON",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "flowers",
    name: "Fresh flowers",
    description: "Fresh, clean flowers that you can identify.",
    category: "SOMETIMES",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
    provenance: draftProvenance(),
  },
  {
    id: "durva",
    name: "Durva grass",
    description: "Durva is a low, creeping grass with slender blades.",
    category: "TRADITION_SPECIFIC",
    approvedAlternative: null,
    reviewStatus: "REVIEW_REQUIRED",
    provenance: draftProvenance({
      traditionScope: "Ganesha durva offering (draft, unverified)",
    }),
  },
  {
    id: "patri-leaves",
    name: "Patri (leaves)",
    description:
      "Patri means the set of leaves used in this puja. See the patri section below.",
    category: "TRADITION_SPECIFIC",
    approvedAlternative: null,
    reviewStatus: "REVIEW_REQUIRED",
    provenance: draftProvenance({
      traditionScope: "Telugu Vinayaka Chavithi patri practice (draft, unverified)",
    }),
  },
];

export interface MaterialReadiness {
  total: number;
  available: number;
  /** COMMON items the user has not marked as available. */
  missingCommon: MaterialItem[];
  /** SOMETIMES or tradition-specific items not marked as available. */
  missingOther: MaterialItem[];
}

export function getMaterialReadiness(
  availableIds: readonly string[],
): MaterialReadiness {
  const available = new Set(availableIds);
  const missingCommon: MaterialItem[] = [];
  const missingOther: MaterialItem[] = [];

  for (const item of MATERIALS) {
    if (available.has(item.id)) continue;
    if (item.category === "COMMON") {
      missingCommon.push(item);
    } else {
      missingOther.push(item);
    }
  }

  return {
    total: MATERIALS.length,
    available: MATERIALS.filter((item) => available.has(item.id)).length,
    missingCommon,
    missingOther,
  };
}

/**
 * Missing materials never stop the puja. This is here so the rule is explicit
 * and testable: preparation guidance is help, not a gate.
 */
export const MISSING_MATERIALS_BLOCK_PUJA = false;
