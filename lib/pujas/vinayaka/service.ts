// The Vinayaka Chavithi puja service: the one place that adapts Vinayaka's
// own content (its ritual steps, materials, patri section, and festival date)
// into the generic PujaDefinition shape the platform reads.
//
// This module - and the lib/content/{steps,materials,leaves,festival}.ts
// files it draws from - are the only places that hold Vinayaka-specific
// content. No new sacred content is introduced here: every field below is a
// straight pass-through of the existing, already-reviewed-or-draft content.

import { MATERIALS_DISCLAIMER } from "@/lib/content/materials";
import { RITUAL_STEPS } from "@/lib/content/steps";
import {
  PATRI_PROVENANCE, PATRI_REVIEW_NOTICE, PATRI_REVIEW_STATUS, PATRI_SAFETY_NOTE,
  PATRI_SAFETY_NOTE_TE, PATRI_SECTION_TITLE, PATRI_SECTION_TITLE_TE,
  PATRI_SELF_REPORT_OPTIONS,
} from "@/lib/content/leaves";
import { PILOT_FESTIVAL } from "@/lib/content/festival";
import { draftProvenance } from "@/lib/content/provenance";
import type { PujaDefinition } from "@/lib/puja/types";
import {
  BETA_MATERIALS, BETA_MATERIALS_DISCLAIMER,
} from "./beta-journey";
import { PATRI_TELUGU_RECOVERY } from "./telugu-recovery";

export const VINAYAKA_PUJA_ID = "vinayaka-chavithi";
export const VINAYAKA_PUJA_SLUG = "vinayaka-chavithi";

export const VINAYAKA_PUJA: PujaDefinition = {
  id: VINAYAKA_PUJA_ID,
  slug: VINAYAKA_PUJA_SLUG,
  displayName: "Vinayaka Chavithi",
  teluguDisplayName: "వినాయక చవితి",
  description:
    "A guided home puja for Vinayaka Chavithi, with plain-language steps, a " +
    "preparation checklist, and the Telugu mantras with narrated instruction " +
    "and mantra audio, plus a romanised reading.",
  descriptionTe:
    "వినాయక చవితి కోసం సులభమైన మాటల్లో ఉండే గైడెడ్ పూజ — సిద్ధత చెక్‌లిస్ట్, " +
    "తెలుగు మంత్రాలు, సూచన మరియు మంత్ర ఆడియోతో పాటు రోమన్ ఉచ్చారణ కూడా ఉంటాయి.",
  availability: "AVAILABLE",
  languages: ["EN", "TE"],
  materials: {
    // The short family line is set in PrepareScreen; this longer combined
    // wording is shown to reviewers only.
    disclaimer: `${MATERIALS_DISCLAIMER} ${BETA_MATERIALS_DISCLAIMER}`,
    categoryLabel: {
      REQUIRED: "Needed for this path",
      OPTIONAL: "Optional",
      TRADITION_SPECIFIC: "Tradition-specific",
    },
    categoryLabelTe: {
      REQUIRED: "తప్పనిసరిగా కావలసినవి",
      OPTIONAL: "ఉంటే ఉపయోగించగలవి",
      TRADITION_SPECIFIC: "ఈ పూజా విధానానికి అవసరం లేనివి",
    },
    items: BETA_MATERIALS.map((m) => ({
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
        source: "Vinayaka Chavithi puja mantras (Nanduri Lyrics PDFs)",
        sourceReference: m.platformRequirement
          ? "Platform preparation requirement (not a mantra-named substance)"
          : m.namedInSteps.length > 0
            ? `Named in the mantra of: ${m.namedInSteps.join(", ")}`
            : "Practical puja item",
        writtenSourceStatus: m.namedInSteps.length > 0 ? "CONFIRMED" : "PENDING",
        traditionScope: "Telugu household Vinayaka Chavithi — sourced beta candidate",
        contentVersion: "vinayaka-source-candidate-1",
      }),
    })),
  },
  patri: {
    sectionTitle: PATRI_SECTION_TITLE,
    sectionTitleTe: PATRI_SECTION_TITLE_TE,
    reviewStatus: PATRI_REVIEW_STATUS,
    reviewNotice: PATRI_REVIEW_NOTICE,
    safetyNote: PATRI_SAFETY_NOTE,
    safetyNoteTe: PATRI_SAFETY_NOTE_TE,
    selfReportOptions: PATRI_SELF_REPORT_OPTIONS,
    provenance: PATRI_PROVENANCE,
    teluguLeaves: PATRI_TELUGU_RECOVERY.leaves.map((l) => ({
      index: l.index,
      deityNameTelugu: l.deityNameTelugu,
      leafNameTelugu: l.leafNameTelugu,
    })),
    substitutionNote:
      "If you do not have the leaves, continue the puja. Offer only leaves you " +
      "can clearly identify.",
    substitutionNoteTe:
      "ఆకులు లేకపోతే, పూజను కొనసాగించండి. మీరు స్పష్టంగా గుర్తించగల ఆకులను మాత్రమే సమర్పించండి.",
    // The patri is only used in the Ekaviṃśati Patra Puja step (Complete path).
    stepIds: ["ekavimsati-patra-puja"],
  },
  steps: RITUAL_STEPS,
  festival: PILOT_FESTIVAL,
  metadata: {
    contentVersion: "vinayaka-source-candidate-1",
    reviewSummary:
      "Sourced beta candidate, compiled from the listed traditional sources " +
      "and awaiting final priest review. Not verified and not priest-approved. " +
      "See each step's own review status and transcription confidence.",
  },
  postPujaGuidance: {
    kicker: "AFTER THE PUJA",
    screenTitle: "Concluding the puja (Udvasana)",
    kickerTe: "పూజ తర్వాత",
    screenTitleTe: "పూజ ముగింపు (ఉద్వాసన)",
    // The SOURCED Udvasana — the same verse, transliteration, "when" and
    // action that already exist as the `udvasana` step in the Complete puja
    // journey (Nanduri English + Telugu Lyrics PDFs, p.11). Family-visible.
    concluding: {
      whenEn:
        "At the very end, when you take leave of the murti. The source (Nanduri " +
        "Lyrics, p.11) states Udvasana is “to be done on the day of Nimajjan " +
        "(immersion), after the above Puja” — so on the day you conclude " +
        "the worship, whether that is the same day or later.",
      whenTe:
        "అన్నిటి చివర, విగ్రహం నుండి వీడ్కోలు తీసుకునేటప్పుడు. మూలం (నందూరి " +
        "లిరిక్స్, పేజీ 11) ప్రకారం ఉద్వాసన “నిమజ్జన రోజున, పైన చెప్పిన పూజ " +
        "తర్వాత” చేయాలి — అంటే పూజను ముగించే రోజున, అది అదే రోజు అయినా " +
        "తర్వాత అయినా.",
      keepReadyEn: "Nothing extra — a little water only if you also offer a final arghya.",
      keepReadyTe: "ప్రత్యేకంగా ఏమీ వద్దు — చివరి అర్ఘ్యం కూడా ఇస్తే కొంచెం నీళ్ళు మాత్రమే.",
      // The source (Nanduri Lyrics p.11) gives the verse and its timing, not an
      // exact physical gesture. Family guidance therefore says only to recite
      // the sourced verse respectfully; the unresolved gesture stays in the
      // reviewer note below, not on a family screen.
      actionEn:
        "Recite the Udvasana verse aloud, with folded hands and respect. This is " +
        "the sourced closing of the worship.",
      actionTe:
        "చేతులు జోడించి, గౌరవంగా ఉద్వాసన శ్లోకాన్ని బిగ్గరగా చదవండి. ఇది మూలంలో " +
        "ఉన్న పూజ ముగింపు.",
      verseTe:
        "నమస్తే విఘ్న రాజాయ నమస్తే విఘ్ననాశన\n" +
        "బ్రాహ్మణేభ్యోభ్యనుజ్ఞాతా గచ్చదేవ యధా సుఖం\n" +
        "శ్రీ మహా గణాధిపతయే నమః, యధాస్థానం ఉద్వాసయామి; పునరాగమనాయచ",
      verseRoman:
        "namastae vighna raajaaya namastae vighnanaaSana\n" +
        "braahmaNaebhyObhyanuj~naataa gaChchadaeva yadhaa sukhaM\n" +
        "Sree mahaa gaNaadhipatayae nama:, yadhaasthaanaM udvaasayaami; punaraagamanaayacha",
      sourceRef: "Nanduri English Lyrics PDF p.11 / Telugu Lyrics PDF p.11",
    },
    // Keeping vs immersion — a decision about the murti's material, not a
    // claim about the rite. Family-visible.
    murtiHandling: [
      {
        titleEn: "Keeping a picture or a permanent murti",
        titleTe: "చిత్రం లేదా శాశ్వత విగ్రహాన్ని ఉంచుకోవడం",
        bodyEn:
          "Do not immerse it. Keep it respectfully in your puja space. This app " +
          "does not ask you to discard a permanent metal, stone, painted or " +
          "electronic item.",
        bodyTe:
          "దానిని నిమజ్జనం చేయవద్దు. మీ పూజ స్థలంలో గౌరవంగా ఉంచుకోండి. శాశ్వతమైన " +
          "లోహ, రాతి, రంగు వేసిన లేదా ఎలక్ట్రానిక్ వస్తువును పారవేయమని ఈ యాప్ " +
          "అడగదు.",
      },
      {
        titleEn: "A natural, unpainted clay murti",
        titleTe: "సహజ, రంగు లేని మట్టి విగ్రహం",
        bodyEn:
          "You may immerse it. First remove plastic, foil, batteries, fabric and " +
          "other decorations, then place it gently in clean water and let the " +
          "clay soften. Reuse settled clay in soil only when its ingredients are " +
          "safe for plants. Follow the safety note below.",
        bodyTe:
          "దానిని నిమజ్జనం చేయవచ్చు. ముందుగా ప్లాస్టిక్, రేకు, బ్యాటరీలు, గుడ్డ, " +
          "ఇతర అలంకరణలను తీసివేసి, శుభ్రమైన నీటిలో మెల్లగా ఉంచి మట్టి కరిగేలా " +
          "చేయండి. నిలిచిన మట్టిని మొక్కలకు సురక్షితమైతేనే నేలలో వాడండి. కింది " +
          "భద్రతా గమనికను పాటించండి.",
      },
    ],
    // RELIGIOUS_CLAIM: the one genuinely unresolved detail — the EXACT timing
    // of Udvasana relative to immersion, and the exact physical action. The
    // sourced verse / "when" / action above are shown to family; this section
    // is REVIEW_REQUIRED and reviewer-only.
    religious: {
      reviewStatus: "REVIEW_REQUIRED",
      provenance: draftProvenance({
        traditionScope: "Vinayaka Chavithi Udvasana timing + exact action - unresolved",
      }),
      reviewNotice:
        "Family screens now show ONLY the sourced Udvasana verse and its 'day " +
        "of immersion, after the puja' timing, and say to recite the verse " +
        "respectfully — no physical gesture is shown, because the source gives " +
        "none. Still unresolved for review: whether households conclude Udvasana " +
        "the same day or hold the murti for a later immersion day, and whether a " +
        "specific hand action (e.g. gently moving the murti from its place) " +
        "should be taught.",
      choices: [],
      reviewerNote:
        "Nanduri Lyrics p.11: Udvasana 'to be done on the day of Nimajjan " +
        "(immersion), after the above Puja.' The page gives the verse and this " +
        "timing but no gesture. Confirm the same-day vs held-murti practice, and " +
        "whether to teach 'gently move the murti a little from its place', before " +
        "this is treated as approved. Until then no gesture appears in Family mode.",
    },
    // PRACTICAL_GUIDANCE: environmental and physical safety only - makes no
    // claim about the rite itself, so it is GENERAL_GUIDANCE (always shown),
    // same as a practical() step in lib/content/steps.ts.
    practical: {
      reviewStatus: "GENERAL_GUIDANCE",
      provenance: draftProvenance({
        traditionScope: "Practical immersion and disposal safety",
      }),
      title: "Protect people and local water",
      note:
        "Never use a storm drain. Do not enter unsafe water or leave " +
        "decorations behind. Follow city and venue rules. If the murti is " +
        "painted or its material is unknown, ask the seller or use a local " +
        "temple collection instead of home immersion.",
      titleTe: "మనుషులను, స్థానిక నీటిని కాపాడండి",
      noteTe:
        "వర్షపు నీటి కాలువను ఎప్పుడూ వాడకండి. సురక్షితం కాని నీటిలోకి వెళ్ళకండి, " +
        "అలంకరణలను వదిలివేయకండి. నగర, ప్రదేశ నిబంధనలను పాటించండి. విగ్రహం రంగు " +
        "వేసినదైతే లేదా దాని పదార్థం తెలియకపోతే, ఇంట్లో నిమజ్జనం బదులు అమ్మినవారిని " +
        "అడగండి లేదా స్థానిక ఆలయ సేకరణను వాడండి.",
    },
  },
};
