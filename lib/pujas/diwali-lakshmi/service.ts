// The Diwali Lakshmi Puja service: adapts this puja's own content (its
// ritual steps, materials, and Sankalpam) into the generic PujaDefinition
// shape the platform reads (lib/puja/types.ts) - mirroring
// lib/pujas/vinayaka/service.ts's pattern. No new sacred content is
// introduced here: every field below is a straight pass-through of
// docs/pujas/diwali-lakshmi-puja-master.md (v0.3).
//
// This puja has no patri (leaf-offering) step and no post-puja murti
// guidance (no immersion decision; P1 has no Katha) - the master document's
// own scope (Section 1.2) confirms neither applies here.

import { draftProvenance } from "@/lib/content/provenance";
import type { PujaDefinition } from "@/lib/puja/types";
import { DIWALI_MATERIALS, DIWALI_MATERIALS_DISCLAIMER } from "./materials";
import { DIWALI_STEPS } from "./steps";

export const DIWALI_PUJA_ID = "diwali-lakshmi-puja";
export const DIWALI_PUJA_SLUG = "diwali-lakshmi-puja";

export const DIWALI_PUJA: PujaDefinition = {
  id: DIWALI_PUJA_ID,
  slug: DIWALI_PUJA_SLUG,
  displayName: "Diwali Lakshmi Puja",
  teluguDisplayName: "దీపావళి లక్ష్మీ పూజ",
  description:
    "A step-by-step household puja with Telugu recitation and simple " +
    "instructions in English and Telugu.",
  descriptionTe:
    "తెలుగు పఠనంతో, సులభమైన తెలుగు మరియు ఇంగ్లీష్ సూచనలతో ఇంట్లో చేసుకునే లక్ష్మీ పూజ.",
  availability: "AVAILABLE",
  languages: ["EN", "TE"],
  materials: {
    disclaimer: DIWALI_MATERIALS_DISCLAIMER,
    categoryLabel: {
      REQUIRED: "Needed for this path",
      OPTIONAL: "Optional",
    },
    categoryLabelTe: {
      REQUIRED: "తప్పనిసరిగా కావలసినవి",
      OPTIONAL: "ఉంటే ఉపయోగించగలవి",
    },
    items: DIWALI_MATERIALS.map((m) => ({
      id: m.id,
      name: m.name,
      nameTe: m.nameTe,
      description: m.description,
      descriptionTe: m.descriptionTe,
      category: m.category,
      approvedAlternative: m.approvedAlternative,
      usedInStepIds: m.namedInSteps,
      platformRequirement: m.platformRequirement,
      reviewStatus: "REVIEW_REQUIRED" as const,
      provenance: draftProvenance({
        source: "Diwali Lakshmi Pooja Process (Nanduri Srinivas booklet)",
        sourceReference: m.platformRequirement
          ? "Platform preparation requirement (not a mantra-named substance)"
          : m.namedInSteps.length > 0
            ? `Named in the mantra of: ${m.namedInSteps.join(", ")}`
            : "Practical puja item",
        writtenSourceStatus: m.namedInSource ? "CONFIRMED" : "PENDING",
        traditionScope: "Telugu household Diwali Lakshmi Puja — sourced beta candidate",
        contentVersion: "diwali-lakshmi-source-candidate-1",
      }),
    })),
  },
  // No patri (leaf-offering) step in this puja - an explicit empty stepIds
  // array opts out of the "always show" backward-compatible default (see
  // lib/puja/types.ts pujaPathIncludesPatri). This content is never shown to
  // a user; it exists only to satisfy the shared PujaPatriDefinition shape.
  patri: {
    sectionTitle: "Patri (leaf offering)",
    sectionTitleTe: "పత్రి పూజ",
    reviewStatus: "GENERAL_GUIDANCE",
    reviewNotice: "This puja has no patri (leaf-offering) step.",
    safetyNote: "Not applicable — this puja has no patri step.",
    safetyNoteTe: "వర్తించదు — ఈ పూజలో పత్రి దశ లేదు.",
    selfReportOptions: [],
    provenance: draftProvenance({
      traditionScope: "Diwali Lakshmi Puja — no patri/leaf-offering step in the source booklet",
    }),
    stepIds: [],
  },
  steps: DIWALI_STEPS,
  // No validated per-location festival date work has been done for this
  // puja's own PujaDefinition.festival field (distinct from the real
  // Panchanga festival-rules linking, which IS wired - see
  // lib/panchanga/festival-rules.ts's "diwali-lakshmi-puja" rule's
  // pujaSlug). Vinayaka's own PILOT_FESTIVAL field is unvalidated pilot data
  // too; leaving this null rather than inventing a second, competing pilot
  // date for the same festival.
  festival: null,
  metadata: {
    contentVersion: "diwali-lakshmi-source-candidate-1",
    reviewSummary:
      "Sourced beta candidate, compiled from docs/pujas/diwali-lakshmi-puja-master.md " +
      "(v0.3) and awaiting priest review. Not verified and not priest-approved. " +
      "See each step's own review status and transcription confidence.",
  },
  // No post-puja guidance: P1 has no Katha, and Mahalakshmi's image/murti is
  // not an immersion deity the way Vinayaka's Ganesha murti is - the master
  // document's own scope (Section 1.2) confirms no murti-handling decision
  // applies here.
  postPujaGuidance: null,
};
