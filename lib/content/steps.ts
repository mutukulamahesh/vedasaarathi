// Guided puja steps for Vinayaka Chavithi.
//
// Structure required by the product: every step is written as
//   what  - what to do
//   how   - how to do it
//   why   - why we do it
// with any Sanskrit or traditional word explained immediately in plain words.
//
// No canonical mantra, Sankalpam wording, or closing-prayer text is included.
//
// Review status per step:
//   - get-ready, light-lamp: GENERAL_GUIDANCE. Practical, non-religious help.
//     Shown as written.
//   - offer-what-you-have, naivedyam: REVIEW_REQUIRED. These describe ritual
//     actions and no reviewer has approved the exact wording, so the UI shows
//     an awaiting-review notice in place of the instructions.
//   - sankalpam, closing: REVIEW_REQUIRED and locked. Canonical wording and
//     audio stay out of the app until a qualified reviewer approves them.

import type { ReviewStatus } from "./review-status";
import { draftProvenance, type Provenance } from "./provenance";

export interface RitualStep {
  id: string;
  title: string;
  /** Telugu heading for the step. This is a heading, not a mantra. */
  teluguTitle: string;
  what: string;
  how: string;
  why: string;
  /** A traditional term used in the step, explained plainly. Null if none. */
  termNote: string | null;
  reviewStatus: ReviewStatus;
  /** True when canonical wording or audio is withheld pending review. */
  locked: boolean;
  provenance: Provenance;
}

export const RITUAL_STEPS: readonly RitualStep[] = [
  {
    id: "get-ready",
    title: "Sit down and get ready",
    teluguTitle: "పూజకు సిద్ధం అవ్వండి",
    what: "Settle in one place in front of the idol or picture.",
    how: "Sit comfortably. Keep every material you gathered within arm's reach. If children are helping, seat them beside you.",
    why: "Staying in one place lets you give the puja your full attention instead of getting up to look for things.",
    termNote: null,
    reviewStatus: "GENERAL_GUIDANCE",
    locked: false,
    provenance: draftProvenance({
      traditionScope: "Practical preparation advice (not a religious instruction)",
    }),
  },
  {
    id: "light-lamp",
    title: "Light the lamp",
    teluguTitle: "దీపం వెలిగించండి",
    what: "Light the lamp you placed near the idol.",
    how: "Light the oil or ghee wick with a match or another flame. An adult should do this and keep the flame away from children and cloth.",
    why: "Lighting the lamp is the usual first practical step and helps everyone settle. Ghee means clarified butter; oil is equally fine.",
    termNote: "Deepam means the lamp used during worship.",
    reviewStatus: "GENERAL_GUIDANCE",
    locked: false,
    provenance: draftProvenance({
      traditionScope: "Practical preparation and fire-safety advice",
    }),
  },
  {
    id: "sankalpam",
    title: "Say your intention (Sankalpam)",
    teluguTitle: "సంకల్పం",
    what: "State that you are about to perform the Vinayaka Chavithi puja.",
    how: "The exact words will appear here once a reviewer approves them. They will use only the participant details you entered. Where a detail is unknown, the approved wording simply leaves it out. Nothing is guessed.",
    why: "Sankalpam is a short spoken statement of who is performing the puja, where, and why.",
    termNote: "Sankalpam means a short spoken statement of intention.",
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
    provenance: draftProvenance({
      writtenSourceStatus: "PENDING",
      traditionScope: "Vinayaka Chavithi Sankalpam (draft, unverified)",
    }),
  },
  {
    id: "offer-what-you-have",
    title: "Offer what you have",
    teluguTitle: "యథాశక్తి సమర్పణ",
    what: "Offer the clean flowers, safe leaves, or akshata you gathered.",
    how: "Place each item near the idol with both hands. Offer only leaves and flowers you can clearly identify as safe. Do not use an unknown plant.",
    why: "Yathashakti means acting sincerely, according to your ability and what you can find.",
    termNote: "Akshata means whole, unbroken rice mixed with a pinch of turmeric.",
    reviewStatus: "REVIEW_REQUIRED",
    locked: false,
    provenance: draftProvenance({
      traditionScope: "Vinayaka Chavithi offering sequence (draft, unverified)",
    }),
  },
  {
    id: "naivedyam",
    title: "Offer food (Naivedyam)",
    teluguTitle: "నైవేద్యం",
    what: "Offer the fruit or sweet you prepared.",
    how: "Place the food in front of the idol.",
    why: "Naivedyam means food offered before it is shared with everyone as prasadam. Prasadam means the blessed food shared afterwards.",
    termNote: "Naivedyam means food offered before it is shared as prasadam.",
    reviewStatus: "REVIEW_REQUIRED",
    locked: false,
    provenance: draftProvenance({
      traditionScope: "Vinayaka Chavithi naivedyam (draft, unverified)",
    }),
  },
  {
    id: "closing",
    title: "Finish with the closing prayer and aarti",
    teluguTitle: "మంగళ హారతి",
    what: "Complete the puja with the closing prayer and aarti.",
    how: "The approved closing words and aarti guidance will appear here after review. Aarti means moving a small lit lamp in front of the deity while singing.",
    why: "The closing prayer gives thanks and asks forgiveness for any mistakes made during the worship.",
    termNote: "Mangala harati means the auspicious closing lamp ceremony (aarti).",
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
    provenance: draftProvenance({
      writtenSourceStatus: "PENDING",
      traditionScope: "Vinayaka Chavithi closing prayer and aarti (draft, unverified)",
    }),
  },
];

/** Steps whose canonical content is not yet approved for release. */
export function lockedSteps(): RitualStep[] {
  return RITUAL_STEPS.filter((step) => step.locked);
}
