// Materials checklist data for the Vinayaka Chavithi preparation journey.
//
// This is UI-independent data. Every item carries a plain-language explanation, a
// category, an approved alternative (or none), and a review status. The category
// split is provisional and needs a reviewer's sign-off before release; the two
// items whose basis is still being confirmed are marked REVIEW_REQUIRED.

import type { ReviewStatus } from "./review-status";

export type MaterialCategory = "REQUIRED" | "OPTIONAL" | "TRADITION_SPECIFIC";

export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  REQUIRED: "Needed",
  OPTIONAL: "Optional",
  TRADITION_SPECIFIC: "Depends on your tradition",
};

export interface MaterialItem {
  id: string;
  name: string;
  /** Plain-language explanation for someone doing this puja for the first time. */
  explanation: string;
  category: MaterialCategory;
  /** A documented or priest-reviewed stand-in, or null when none is approved. */
  approvedAlternative: string | null;
  reviewStatus: ReviewStatus;
}

export const MATERIALS: readonly MaterialItem[] = [
  {
    id: "idol",
    name: "Ganesha idol or picture",
    explanation:
      "A small clay idol of Lord Ganesha, or a clean printed picture, to focus your prayer on.",
    category: "REQUIRED",
    approvedAlternative:
      "A clean printed picture of Ganesha if a clay idol is not available.",
    reviewStatus: "PRIEST_REVIEWED_PRACTICE",
  },
  {
    id: "lamp",
    name: "Lamp with oil or ghee",
    explanation:
      "A small lamp lit with oil or with ghee. Ghee means clarified butter.",
    category: "REQUIRED",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
  },
  {
    id: "turmeric-kumkum",
    name: "Turmeric and kumkum",
    explanation:
      "Turmeric is haldi powder. Kumkum is the red powder used to make a mark of respect.",
    category: "REQUIRED",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
  },
  {
    id: "akshata",
    name: "Akshata (unbroken rice)",
    explanation:
      "Akshata means whole, unbroken raw rice mixed with a pinch of turmeric. It is offered as a sign of respect.",
    category: "REQUIRED",
    approvedAlternative: null,
    reviewStatus: "PRIEST_REVIEWED_PRACTICE",
  },
  {
    id: "water",
    name: "A small cup of clean water",
    explanation:
      "Clean water in a small cup or spoon, used for offering during the puja.",
    category: "REQUIRED",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
  },
  {
    id: "food-offering",
    name: "A simple food offering",
    explanation:
      "A fruit or a home-made sweet. It is offered first and then shared with everyone as prasadam, which means blessed food.",
    category: "REQUIRED",
    approvedAlternative:
      "Any simple fruit you have at home is enough. A special sweet is not required.",
    reviewStatus: "PRIEST_REVIEWED_PRACTICE",
  },
  {
    id: "flowers",
    name: "Fresh flowers",
    explanation:
      "Clean, fresh flowers that you can identify. Any garden or shop flower is fine.",
    category: "OPTIONAL",
    approvedAlternative: null,
    reviewStatus: "GENERAL_GUIDANCE",
  },
  {
    id: "durva",
    name: "Durva grass",
    explanation:
      "Durva is a soft grass with three or five blades in a tuft. It is often offered to Ganesha in this practice.",
    category: "TRADITION_SPECIFIC",
    approvedAlternative: null,
    reviewStatus: "REVIEW_REQUIRED",
  },
  {
    id: "patri-leaves",
    name: "21 kinds of leaves (patri)",
    explanation:
      "Patri means the set of leaves offered during this puja. In this Telugu practice 21 kinds are preferred. Use the leaves section to pick the ones you can safely find.",
    category: "TRADITION_SPECIFIC",
    approvedAlternative:
      "If leaves are not available, a priest we consulted permits offering clean flowers or akshata instead.",
    reviewStatus: "REVIEW_REQUIRED",
  },
];

export interface MaterialReadiness {
  total: number;
  available: number;
  /** REQUIRED items the user has not marked as available. */
  missingRequired: MaterialItem[];
  /** Optional or tradition-specific items not marked as available. */
  missingOther: MaterialItem[];
}

export function getMaterialReadiness(
  availableIds: readonly string[],
): MaterialReadiness {
  const available = new Set(availableIds);
  const missingRequired: MaterialItem[] = [];
  const missingOther: MaterialItem[] = [];

  for (const item of MATERIALS) {
    if (available.has(item.id)) continue;
    if (item.category === "REQUIRED") {
      missingRequired.push(item);
    } else {
      missingOther.push(item);
    }
  }

  return {
    total: MATERIALS.length,
    available: MATERIALS.filter((item) => available.has(item.id)).length,
    missingRequired,
    missingOther,
  };
}

/**
 * Missing materials never stop the puja. This is here so the rule is explicit
 * and testable: preparation guidance is help, not a gate.
 */
export const MISSING_MATERIALS_BLOCK_PUJA = false;
