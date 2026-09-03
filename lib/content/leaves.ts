// The "21 leaves" (patri) section for the Vinayaka Chavithi preparation journey.
//
// What this module is and is NOT:
//   - It says that 21 kinds of leaves are PREFERRED in this Telugu practice.
//   - It does NOT publish an authoritative list of the 21, and it does NOT
//     present the practice as a universal scriptural rule. The exact list and
//     its written source are REVIEW_REQUIRED.
//   - It offers a short list of leaves that are usually easy to identify so the
//     user can tick the ones they actually have. It never tells anyone to use an
//     unidentified or unsafe plant.
//   - The flowers / akshata alternative is shown as PRIEST_REVIEWED_PRACTICE
//     because a priest was consulted; the textual basis is still under review.

import type { ReviewStatus } from "./review-status";

export const TRADITIONAL_LEAF_COUNT = 21;

/** Review status of the authoritative 21-leaf list itself. */
export const LEAF_LIST_REVIEW_STATUS: ReviewStatus = "REVIEW_REQUIRED";

/** How the section frames the practice. Shown before any list. */
export const LEAF_BASIS_NOTE =
  "In this Telugu practice, 21 kinds of leaves (called patri) are preferred. " +
  "The exact list of 21 and its written source are still being reviewed, so " +
  "this is not shown as a rule that applies to everyone.";

/** Safety line. Always shown with the list. */
export const LEAF_SAFETY_NOTE =
  "Only pick and offer a leaf you can clearly identify and know to be safe. " +
  "Never use an unknown or unsafe plant.";

export interface LeafAlternative {
  text: string;
  reviewStatus: ReviewStatus;
}

export const LEAF_ALTERNATIVE: LeafAlternative = {
  text:
    "If leaves are not available, a priest we consulted permits offering clean " +
    "flowers or akshata (whole, unbroken rice) instead.",
  reviewStatus: "PRIEST_REVIEWED_PRACTICE",
};

export interface LeafOption {
  id: string;
  /** Common name a Telugu-speaking household would recognise. */
  name: string;
  /** Plain-language identification note. No ritual claim is made here. */
  note: string;
}

/**
 * A partial, practical pick-list of leaves that are usually easy to identify.
 * This is NOT the definitive set of 21 (see LEAF_LIST_REVIEW_STATUS). It exists
 * only so the user can record what they already have at home.
 */
export const LEAF_OPTIONS: readonly LeafOption[] = [
  {
    id: "tulasi",
    name: "Tulasi",
    note: "Tulasi is the holy basil plant kept in many homes.",
  },
  {
    id: "maredu",
    name: "Maredu (bilva)",
    note: "Maredu, also called bilva, is the three-part leaf of the wood-apple tree.",
  },
  {
    id: "mango",
    name: "Mango leaf",
    note: "A leaf from the common mango tree.",
  },
  {
    id: "jasmine",
    name: "Jasmine leaf",
    note: "A leaf from the jasmine (malle) plant.",
  },
  {
    id: "pomegranate",
    name: "Pomegranate leaf",
    note: "A leaf from the pomegranate (danimma) plant.",
  },
  {
    id: "banana",
    name: "Banana leaf",
    note: "A piece of fresh banana (arati) leaf.",
  },
  {
    id: "betel",
    name: "Betel leaf",
    note: "The heart-shaped betel (tamalapaku) leaf sold in shops.",
  },
  {
    id: "curry",
    name: "Curry leaf",
    note: "Fresh curry leaves (karivepaku) from the kitchen plant.",
  },
];

export interface LeafReadiness {
  preferredCount: number;
  selectedCount: number;
  /** True once the user has recorded at least one leaf they can safely find. */
  hasAny: boolean;
}

export function getLeafReadiness(selectedIds: readonly string[]): LeafReadiness {
  const known = new Set(LEAF_OPTIONS.map((leaf) => leaf.id));
  const selectedCount = selectedIds.filter((id) => known.has(id)).length;
  return {
    preferredCount: TRADITIONAL_LEAF_COUNT,
    selectedCount,
    hasAny: selectedCount > 0,
  };
}

/** Missing or incomplete leaves never stop the puja. */
export const MISSING_LEAVES_BLOCK_PUJA = false;
