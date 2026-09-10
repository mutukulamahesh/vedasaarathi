// Beginner physical actions for every candidate step, for the Family Beta.
//
// Rules:
//  - Where the supplied Nanduri PDF already states the physical action, that
//    is kept (basis "PDF_STATED").
//  - Otherwise the action is the standard shodashopachara gesture, sourced
//    from ./research-sources.ts (basis "SOURCED_ONLINE"). These are common,
//    low-controversy household actions (offer water with a spoon, show the
//    lamp in small circles, join palms, offer akshata/flowers at the feet).
//  - Where no reliable source supports a specific action, a minimal literal
//    action is derived from the mantra or the material named, it is marked
//    needsReview (BETA_ACTION_NEEDS_REVIEW), and elaborate gestures are
//    avoided (basis "MINIMAL_LITERAL").
//  - No AI-generated answer is used as a source.
//
// These are practical instructions for a first-timer; they are not presented
// as verified ritual. Every candidate step stays REVIEW_REQUIRED and locked.

export type BetaActionBasis = "PDF_STATED" | "SOURCED_ONLINE" | "MINIMAL_LITERAL";

export const BETA_ACTION_NEEDS_REVIEW = "BETA_ACTION_NEEDS_REVIEW";

export interface BeginnerAction {
  /** Candidate step id. */
  stepId: string;
  /** Plain physical instruction shown in the Family Beta. */
  action: string;
  basis: BetaActionBasis;
  /** research-sources.ts ids that back this action (empty for PDF_STATED). */
  sources: readonly string[];
  /** true => internally flagged BETA_ACTION_NEEDS_REVIEW for later correction. */
  needsReview: boolean;
  /** Optional short note (a conflict, a safety point, a caveat). */
  note: string | null;
}

const A = (
  stepId: string,
  action: string,
  basis: BetaActionBasis,
  sources: readonly string[],
  needsReview = false,
  note: string | null = null,
): BeginnerAction => ({ stepId, action, basis, sources, needsReview, note });

const DRIK = "drikpanchang-ganesha-chaturthi-vidhi";
const DRIK_SHORT = "drikpanchang-ganesha-sankshipt-vidhi";
const VVK = "telugupanchangamdaily-vvk";

export const BEGINNER_ACTIONS: readonly BeginnerAction[] = [
  A("dhyana-shloka",
    "Sit facing the murti or picture. Join your palms and say the verse quietly to settle your mind.",
    "SOURCED_ONLINE", [DRIK]),
  A("achamana",
    "Take a small spoon of water in your right hand. Sip a little after each of the first three names, then wipe your hand. Say the remaining names with palms joined.",
    "SOURCED_ONLINE", [VVK], false,
    "The Vratha Kalpam names Achamanam as \"sip water thrice for inner purification\"."),
  A("bhuta-shuddhi",
    "Say the verse once with your palms joined before beginning the worship.",
    "MINIMAL_LITERAL", [], true,
    "The source names no physical action here, so just say the verse."),
  A("pranayama",
    "Breathe in slowly, pause for a moment, then breathe out slowly. Repeat three times. Do not hold your breath if it feels uncomfortable.",
    "SOURCED_ONLINE", [VVK], false,
    "The verse names the three phases (pooraka, kumbhaka, rechaka); the Vratha Kalpam says \"perform calm breathing\". No nostril mudra is asserted."),
  A("sankalpa",
    "Hold a little water and a few akshata grains in your right hand. Say the Sankalpam. At the end, let the water fall into the offering plate.",
    "SOURCED_ONLINE", [VVK], false,
    "The Vratha Kalpam: \"state the day, place and intention of the vratam\" holding water and akshata."),
  A("ghanta",
    "Ring the bell while you say the verse. The bell is usually held in the left hand.",
    "PDF_STATED", [], false,
    "\"while making the bell sound\" is from the PDF; the left-hand detail is the common convention, not from the PDF."),
  A("kalasha-aradhana",
    "After the verse, dip a flower or your fingers in the vessel and sprinkle a few drops on the puja items, on the murti, and on yourself.",
    "PDF_STATED", [], false,
    "The PDF states \"sprinkle this water on the puja items, the deity and oneself\"."),
  A("ganapati-prarthana",
    "Say the prayer with your palms joined, then offer a pinch of akshata near the feet of the murti.",
    "SOURCED_ONLINE", [DRIK_SHORT]),
  A("dhyana",
    "Look at the murti, or close your eyes, and hold in mind the form the verse describes while you say it.",
    "SOURCED_ONLINE", [DRIK]),
  A("avahana",
    "Make the avahana gesture — palms together with both thumbs folded inward — then offer a few akshata grains near the murti to invite Ganesha.",
    "SOURCED_ONLINE", [DRIK_SHORT, DRIK], false,
    "Avahana mudra description from Drik Panchang."),
  A("asana",
    "Take five flowers in your cupped palms and place them in front of the murti as a seat.",
    "SOURCED_ONLINE", [DRIK], false,
    "\"take five flowers in Anjali ... to offer seat\" (Drik Panchang)."),
  A("padya",
    "Offer a spoon of water toward the feet of the murti, letting it fall into the offering plate.",
    "SOURCED_ONLINE", [DRIK]),
  A("arghya",
    "Add a little sandal paste, a flower and a few akshata to a spoon of water, and offer it toward the murti's hands, into the plate.",
    "SOURCED_ONLINE", [DRIK], false,
    "The mantra itself names \"gandha-pushpa-akshata\" water."),
  A("achamaniya",
    "Offer a spoon of water toward the murti's mouth, into the plate.",
    "SOURCED_ONLINE", [DRIK]),
  A("madhuparka",
    "Offer a spoon of the curd, milk, honey and ghee mixture toward the murti, into the plate.",
    "MINIMAL_LITERAL", [DRIK], false,
    "Substances are named in the mantra; the offering gesture follows the other water offerings."),
  A("snana",
    "Pour a few drops of panchamrita, then clean water, over the murti. For a clay or paper murti, instead touch a wet flower to it so it is not damaged.",
    "SOURCED_ONLINE", [DRIK], false,
    "Drik Panchang lists panchamrita then pure-water baths. Symbolic option added for fragile murtis."),
  A("vastra",
    "Place a pair of small clean cloths, or two short lengths of cotton thread, at the feet of the murti.",
    "SOURCED_ONLINE", [VVK], false,
    "Conflict: Drik Panchang uses a raksha thread (Moli); the supplied PDF and the Telugu Vratha Kalpam use a pair of cloths — the PDF is followed."),
  A("yajnopavita",
    "Place a folded sacred thread, or a loop of cotton thread, at the feet of the murti.",
    "MINIMAL_LITERAL", [], true,
    "Whether and how a household beginner offers the sacred thread varies between families; a minimal offering is shown."),
  A("gandha",
    "Take a little sandal paste on your right ring finger and apply a small mark to the murti, or offer the paste in the plate.",
    "SOURCED_ONLINE", [DRIK]),
  A("pushpakshata",
    "Offer a pinch of akshata, then fragrant flowers, at the feet of the murti with your right hand.",
    "SOURCED_ONLINE", [DRIK]),
  A("anga-puja",
    "As each name is said, gently touch a flower or a few akshata to that part of the murti, or offer them in the plate if the murti is delicate.",
    "MINIMAL_LITERAL", [DRIK], true,
    "The gesture follows the usual akshata/flower offering; take care with a fragile murti."),
  A("ekavimsati-patra-puja",
    "As each name is said, offer the matching leaf at the feet — only leaves you can clearly identify and know to be safe. If you do not have the leaves, continue to the next step.",
    "MINIMAL_LITERAL", [VVK], true,
    "No automatic flower/akshata substitution is offered; use only leaves you can identify."),
  A("ashtottara-satanamavali",
    "Offer one flower, or a few akshata grains, at the feet as each of the names is said.",
    "SOURCED_ONLINE", [VVK], false,
    "The Vratha Kalpam: offer the 108 names \"with akshatalu/flowers\"."),
  A("dhupa",
    "An adult lights the incense. Show it with your right hand, moving it in small circles in front of the murti. Ventilate the room; skip incense if anyone has breathing trouble.",
    "PDF_STATED", [DRIK], false,
    "Safety wording is practical advice, not ritual instruction."),
  A("deepa",
    "An adult shows the lit lamp with the right hand, moving it in small circles in front of the murti. Keep the flame away from children, hair and cloth.",
    "PDF_STATED", [DRIK], false,
    "Safety wording is practical advice, not ritual instruction."),
  A("naivedya",
    "Place the food in front of the murti. Sprinkle a little water around it in a clockwise circle, then show it with your right hand while you say the prana names.",
    "PDF_STATED", [DRIK]),
  A("tambula",
    "Place two betel leaves with an areca nut, and a small piece of camphor, on a plate at the feet of the murti.",
    "SOURCED_ONLINE", [DRIK], false,
    "Materials are named in the mantra."),
  A("neerajana",
    "An adult lights the camphor and moves the flame slowly in small clockwise circles in front of the murti, over a heat-safe surface. Afterwards everyone may warm their palms at it and touch them to their eyes.",
    "PDF_STATED", [DRIK], false,
    "Safety wording is practical advice, not ritual instruction."),
  A("doorvayugma-puja",
    "As each name is said, offer two blades of durva grass at the feet — only if you can clearly identify durva.",
    "MINIMAL_LITERAL", [], true,
    "The mantra names paired durva at each name; the plant-identification caution is a safety point."),
  A("mantrapushpa-namaskara",
    "Offer the flowers with both hands. Turn around once where you stand and bow. Then offer arghya again — water with a little sandal, a flower and akshata.",
    "PDF_STATED", [], false,
    "\"aatma pradakshiNa namaskaaraan\" is from the PDF; remain in place if turning is unsafe."),
  A("udvasana",
    "Say the verse, then gently move the murti a little from its place as a sign of respectfully taking leave.",
    "MINIMAL_LITERAL", [VVK], true,
    "The PDF ties Udvasana to the day of immersion; the exact timing and action vary between households."),
  A("mangala-shanti",
    "Say the closing verses with your palms joined, asking well-being for all.",
    "SOURCED_ONLINE", [DRIK]),
  A("vrata-katha",
    "Read the Vinayaka Vrata Katha below from start to finish, or listen as someone reads it. Many families hold a few grains of akshata in their hand while they hear it, and place the rice at Ganesha's feet at the end.",
    "MINIMAL_LITERAL", [], false,
    "Grounded in the closing section of the katha itself (holding akshata while hearing the story, then offering it to Ganesha)."),
];

const BY_ID = new Map(BEGINNER_ACTIONS.map((a) => [a.stepId, a]));

export function beginnerAction(stepId: string): BeginnerAction | undefined {
  return BY_ID.get(stepId);
}

/** Step ids whose beginner action is still internally BETA_ACTION_NEEDS_REVIEW. */
export function actionsNeedingReview(): string[] {
  return BEGINNER_ACTIONS.filter((a) => a.needsReview).map((a) => a.stepId);
}
