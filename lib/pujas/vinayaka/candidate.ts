// The Vinayaka Chavithi puja review candidate, extracted from the two
// supplied Nanduri "Lyrics" PDFs (see ./sources.ts).
//
// Rules this file follows, strictly:
//  - The mantra TRANSLITERATION is copied verbatim from the English PDF
//    (its own romanisation scheme is preserved, capitalisation and all).
//  - The mantra in TELUGU SCRIPT is the transcription recovered in
//    ./telugu-recovery.ts (read off a 400 DPI render of the Telugu PDF, with
//    OCR as a scaffold and the transliteration as a cross-check - never from
//    model memory). Each step still carries a page-referenced check task, and
//    dense pages are flagged transcriptionCheckRequired for a reviewer pass.
//  - "How to do it" is "Needs reviewer confirmation." unless the source
//    itself states the physical action.
//  - Materials are only ever the substances the mantra text literally names.
//    The PDFs contain no materials checklist.
//  - Step classification (essential / optional / tradition-specific) is
//    inferred from the general shodashopachara structure, NOT from the
//    source, and is flagged as needing review.
//  - Every step is REVIEW_REQUIRED and locked. Nothing here is approved.

import { newMantraAudio, type MantraAudio } from "./mantra-audio";
import type { SourceReference } from "./sources";
import {
  ASHTOTTARA_TELUGU_RECOVERY, TELUGU_RECOVERY, type TeluguRecoveryEntry,
} from "./telugu-recovery";

export const CANDIDATE_CONTENT_VERSION = "vinayaka-source-candidate-1";

export type StepClassification = "ESSENTIAL" | "OPTIONAL" | "TRADITION_SPECIFIC";
export type ClassificationConfidence = "FROM_SOURCE" | "INFERRED_NEEDS_REVIEW";

export interface CandidateSourceDisagreement {
  field: string;
  telugu: string;
  english: string;
  note: string;
}

export interface CandidateReviewerQuestion {
  id: string;
  question: string;
}

export interface CandidatePujaStep {
  id: string;
  sequence: number;
  /** Section heading, romanised (Telugu-script heading not stored - see task). */
  title: string;
  /** Plain, beginner English title. */
  englishTitle: string;
  classification: StepClassification;
  classificationConfidence: ClassificationConfidence;
  /** Exact from the English PDF. Empty when that PDF's layout prevents a
   * faithful copy (then transliterationSupported is false). */
  mantraTransliteration: string;
  transliterationSupported: boolean;
  /** The Telugu-script mantra, recovered by transcription in
   * ./telugu-recovery.ts. null only for steps with no mantra (the Vrata
   * Katha). Never a guess from memory. */
  mantraTeluguScript: string | null;
  /** Recovery metadata for mantraTeluguScript: source page, confidence,
   * uncertain tokens, and whether a reviewer must still re-check it. */
  teluguRecovery: TeluguRecoveryEntry | null;
  /** Page-referenced task for the reviewer to CHECK the recovered Telugu
   * script against the source (it is no longer "supply from scratch"). */
  teluguScriptTranscriptionTask: string;
  whatToDo: string;
  howToDo: string;
  whyWeDoIt: string;
  /** Substances the mantra text itself names. [] when it names none. */
  materialsNamedInMantra: readonly string[];
  materialsFromSource: boolean;
  sourceRefs: readonly SourceReference[];
  contentVersion: string;
  reviewStatus: "REVIEW_REQUIRED";
  locked: true;
  audio: MantraAudio;
  disagreements: readonly CandidateSourceDisagreement[];
  reviewerQuestions: readonly CandidateReviewerQuestion[];
}

const NEEDS_KRIYA = "Needs reviewer confirmation.";

function teluguTask(page: number, what: string): string {
  return (
    `Check the recovered Telugu-script transcription of ${what} against ` +
    `"Vinayaka Chaviti Puja - Telugu Lyrics.pdf" page ${page}. The recovery ` +
    `was read off a page render (the text layer is corrupt); confirm every ` +
    `conjunct and vowel sign before this is trusted.`
  );
}

function step(
  s: Omit<
    CandidatePujaStep,
    | "contentVersion" | "reviewStatus" | "locked" | "audio" | "mantraTeluguScript"
    | "teluguRecovery" | "disagreements" | "reviewerQuestions" | "materialsNamedInMantra"
  > &
    Partial<Pick<CandidatePujaStep, "disagreements" | "reviewerQuestions" | "materialsNamedInMantra">>,
): CandidatePujaStep {
  const recovery = TELUGU_RECOVERY[s.id] ?? null;
  const teluguScript =
    s.id === "ashtottara-satanamavali"
      ? ASHTOTTARA_TELUGU_RECOVERY.teluguScript
      : recovery?.teluguScript ?? null;
  return {
    mantraTeluguScript: teluguScript,
    teluguRecovery: recovery,
    materialsNamedInMantra: s.materialsNamedInMantra ?? [],
    disagreements: s.disagreements ?? [],
    reviewerQuestions: s.reviewerQuestions ?? [],
    contentVersion: CANDIDATE_CONTENT_VERSION,
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
    audio: newMantraAudio(),
    ...s,
  };
}

const EN = "english-lyrics";
const TE = "telugu-lyrics";

export const CANDIDATE_PUJA_STEPS: readonly CandidatePujaStep[] = [
  step({
    id: "dhyana-shloka",
    sequence: 1,
    title: "Shuklambaradharam (opening verse)",
    englishTitle: "Opening meditation verse",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "ShuklaAmbara Dharam Vishnum Shashi Varnam Chatur Bhujam\n" +
      "Prasanna Vadanam Dhyaayet Sarva Vighnopashaantaye",
    teluguScriptTranscriptionTask: teluguTask(2, "the Shuklambaradharam verse"),
    whatToDo: "Begin the puja with the opening meditation verse.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "A traditional verse recited at the start to settle the mind.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 1 }, { sourceId: TE, page: 2 }],
  }),
  step({
    id: "achamana",
    sequence: 2,
    title: "Achamanam (Keshava names)",
    englishTitle: "Purification with the twenty-four names",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "OM kaeSavaaya svaahaa - OM naaraayaNaaya svaahaa\n" +
      "OM maadhavaaya svaahaa - OM gOviMdaaya nama:\n" +
      "vishNavae nama: - madhusoodanaaya nama:\n" +
      "tri vikramaaya nama: - vaamanaaya nama:\n" +
      "Sreedharaaya nama: - hRsheekaeSaaya nama:\n" +
      "padmanaabhaaya nama: - daamOdaraaya nama:\n" +
      "saMkarshaNaaya nama: - vaasudaevaaya nama:\n" +
      "pradyu mnaaya nama: - aniruddhaaya nama:\n" +
      "purushOttamaaya nama: - adhOkshajaaya nama:\n" +
      "naarasiMhaaya nama: - achyutaaya nama:\n" +
      "janaardhanaaya nama: - upaeMdraaya nama:\n" +
      "harayae nama: - Sree kRshNaaya nama",
    teluguScriptTranscriptionTask: teluguTask(2, "the 24 Achamanam names"),
    whatToDo: "Perform the short purification, reciting the twenty-four names.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "A traditional preparation before the main worship.",
    materialsFromSource: false,
    disagreements: [
      {
        field: "final name punctuation",
        telugu: "24. Sri Krishnaya nama (no colon), numbered 24",
        english: "Sree kRshNaaya nama (no colon), unnumbered in the flow",
        note: "Both omit the closing colon on the last name; count is 24 in both.",
      },
    ],
    sourceRefs: [{ sourceId: EN, page: 2 }, { sourceId: TE, page: 2 }],
  }),
  step({
    id: "bhuta-shuddhi",
    sequence: 3,
    title: "Uttishthantu bhuta-pishachah",
    englishTitle: "Clearing the space",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "uttishTaMtu bhootapiSaachaa: aetae bhoomi bhaarakaa:\n" +
      "aetaeshaa mavirOdhaena brahmakarma samaarabhae",
    teluguScriptTranscriptionTask: teluguTask(2, "the Uttishthantu verse"),
    whatToDo: "Recite the verse that precedes beginning the rite.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "Recited in the sequence before starting the puja proper.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 2 }, { sourceId: TE, page: 2 }],
  }),
  step({
    id: "pranayama",
    sequence: 4,
    title: "Praanaayaamamu",
    englishTitle: "Pause and breathe",
    classification: "OPTIONAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "poorakaM kuMbhakaM chaiva raechakaM tadanaMtaraM\n" +
      "praaNaayaama midaM prOktaM sarva daeva namaskRtaM",
    teluguScriptTranscriptionTask: teluguTask(2, "the Praanaayaamamu verse"),
    whatToDo: "Take a brief, calm breath.",
    howToDo:
      "The verse names pooraka (in), kumbhaka (hold), rechaka (out). Do not " +
      "hold the breath if uncomfortable. Further guidance needs reviewer confirmation.",
    whyWeDoIt: "A short breathing pause in the sequence.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 2 }, { sourceId: TE, page: 2 }],
  }),
  step({
    id: "sankalpa",
    sequence: 5,
    title: "Sankalpamu",
    englishTitle: "State the intention",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "mama upaatta samasta duritakshaya dvaaraa Sree varasidhdhi vinaayaka daevataa preetyardhaM ,\n" +
      "Subhae SObhanae muhoortae, samasta daevataa braahmaNa harihara guru charaNa sannidhau,\n" +
      "asmaakaM saha kuTuMbaanaaM kshaema sthairya vijaya abhaya aayuraarOgya aiSvarya abhivRdhyardhaM, " +
      "dharmaardha kaama mOksha chaturvidha purushaartha phala sidhyarthaM,\n" +
      "dhana dhaanya samRdhyardhaM , ishTa kaamyaartha sidhyarthaM, sakala lOka kalyaaNaardhaM, " +
      "sarva vighna nivaaraNaardhaM, vaeda saMpradaayaabhivRdyardhaM , asmin daeSae gOvadha nishaedhaardhaM, " +
      "gO saMrakshaNaardhaM , Sree varasidhdhi vinaayaka daevataaM uddiSya yaavaChchakti dhyaana " +
      "aavaahanaadi shODaSOpachaara poojaaM karishyae!",
    teluguScriptTranscriptionTask: teluguTask(3, "the full Sankalpamu"),
    whatToDo:
      "State who is performing the puja and for what purpose, using the " +
      "supplied Sankalpam wording. See the structured Sankalpam slots.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The spoken intention (sankalpa) for the worship.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 3 }, { sourceId: TE, page: 3 }],
    reviewerQuestions: [
      {
        id: "sankalpa-short-form",
        question:
          "The supplied Sankalpam is a short form. It has no slots for " +
          "samvatsara / ayana / rtu / masa / paksha / tithi / vaara / " +
          "nakshatra / gotra / naama. Should the full Sankalpam be used " +
          "instead? Its wording is NOT in the supplied PDFs.",
      },
    ],
  }),
  step({
    id: "ghanta",
    sequence: 6,
    title: "Ghantaa naadam (bell)",
    englishTitle: "Ring the bell",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "aagamaardhaMtu daevaanaaM gamanaardhaM tu raakshasaaM\n" +
      "kuru ghaMTaaravaM tatra daevataahvaana laaMchanam",
    teluguScriptTranscriptionTask: teluguTask(3, "the bell verse"),
    whatToDo: "Ring the bell while reciting the verse.",
    howToDo:
      "The source states 'ghaMTaa naadaM chaestoo' - while making the bell " +
      "sound. Further detail needs reviewer confirmation.",
    whyWeDoIt: "Recited while ringing the bell, in the sequence.",
    materialsNamedInMantra: ["bell (ghanta)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 3 }, { sourceId: TE, page: 3 }],
  }),
  step({
    id: "kalasha-aradhana",
    sequence: 7,
    title: "Kalasaaraadhana",
    englishTitle: "Honour the water vessel",
    classification: "TRADITION_SPECIFIC",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "kalaSasya mukhae vishNu: kaMThae rudra ssamaaSrita:\n" +
      "moolae tatra sthitO brahmaa madhyae maatRgaNaa: smRtaa:\n" +
      "kukshautu saagaraa ssarvae sapta dveepaa vasuMdharaa\n" +
      "RgvaedO tha yajurvaeda ssaamavaedO hyadharvaNa:\n" +
      "aMgaiScha sahitaa ssarvae kalaSaaMbu samaaSritaa:\n" +
      "gaMgaecha yamunaechaiva gOdaavari sarasvatee\n" +
      "narmadaa siMdhu kaavaeri jalaesmin sannidhiM kuru",
    teluguScriptTranscriptionTask: teluguTask(3, "the Kalasaaraadhana verse"),
    whatToDo: "Honour the water vessel (kalasha) with the verse.",
    howToDo:
      "The source then says 'poojaadravyaaNi daevaM aatmaanaM saMprOkshya' - " +
      "sprinkle this water on the puja items, the deity, and oneself. " +
      "Further detail needs reviewer confirmation.",
    whyWeDoIt: "Part of the fuller household procedure.",
    materialsNamedInMantra: ["water vessel (kalasha)", "clean water"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 3 }, { sourceId: TE, page: 3 }],
  }),
  step({
    id: "ganapati-prarthana",
    sequence: 8,
    title: "Ganapati puja (Vakratunda / Shodasha-nama)",
    englishTitle: "Prayer to remove obstacles",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "aadau nirvighna parisamaaptyardhaM Sree gaNaadhipati praardhanaaM karishyae\n" +
      "vakratuMDa mahaakaaya kOTisoorya samaprabha\n" +
      "nirvighnaM kurumae daeva sarva kaaryaeshu sarvadaa\n" +
      "sumukhaSchaika daMtaScha kapilO gajakarNaka:\n" +
      "laMbOdaraScha vikaTO vighnaraajO gaNaadhipa\n" +
      "dhoomakaetu rgaNaadhyaksha: phaalachaMdrO gajaanana:\n" +
      "vakratuMDa SSoorpakarNO haeraMbha: skaMdhapoorvaja:\n" +
      "shODaSaitaani naamani ya:paThaechChRNuyaadapi.\n" +
      "vidyaaraMbhae vivaahaecha pravaeSae nirgamae tathaa,\n" +
      "saMgraamae sarvakaaraeshu vighnastasya najaayatae",
    teluguScriptTranscriptionTask: teluguTask(3, "the Vakratunda / Shodasha-nama prayer"),
    whatToDo: "Recite the opening prayer to Ganapati and the sixteen names.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "An opening prayer said before the main service so it completes without obstacle.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 3 }, { sourceId: TE, page: 3 }],
  }),
  step({
    id: "dhyana",
    sequence: 9,
    title: "Dhyaanam",
    englishTitle: "Meditate on Ganesha",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "bhavasaMchita paapaugha vidhvaMsana vichakshaNaM\n" +
      "vighnaaMdhakaara bhaasvaMtaM vighnaraaja mahaMbhajae\n" +
      "aekadaMtaM SoorpakarNaM gajavaktraM chaturbhujaM\n" +
      "paaSaaMkuSa dharaM daevaM dhyaayae tsiddhivinaayakaM\n" +
      "uttamaM gaNanaathasya vrataM saMpatkaraM SubhaM\n" +
      "bhaktaabheeshTapradaM tasmaat dhyaayaettaM vighnanaayakam\n" +
      "dhaayaedgajaananaM daevaM taptakaaMchana sannibhaM\n" +
      "chaturbhujaM mahaakaayaM sarvaabharaNabhooshitaM\n" +
      "Sree mahaagaNaadhipatayae nama: dhyaayaami",
    teluguScriptTranscriptionTask: teluguTask(4, "the Dhyaanam verses"),
    whatToDo: "Meditate on the form of Ganesha as described in the verse.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The meditation (dhyana) that opens the sixteen-service worship.",
    materialsFromSource: false,
    // Telugu Dhyaanam is on Telugu Lyrics page 4 (confirmed against the page
    // render during Telugu-script recovery); the earlier page-3 ref was off by
    // one - the English PDF ref (page 4) was already correct.
    sourceRefs: [{ sourceId: EN, page: 4 }, { sourceId: TE, page: 4 }],
  }),
  step({
    id: "avahana",
    sequence: 10,
    title: "Aavaahanam",
    englishTitle: "Invite Ganesha",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "atraagachCha jagadvaMdya suraraajaarchitaeSvara\n" +
      "anaathanaatha sarvaj~na gaureegarbha samudbhava\n" +
      "Sree mahaagaNaadhipatayae nama: aavahayaami",
    teluguScriptTranscriptionTask: teluguTask(4, "the Aavaahanam verse"),
    whatToDo: "Respectfully invite Ganesha to be present for the worship.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The invitation (avahana), first of the sixteen services.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 4 }, { sourceId: TE, page: 4 }],
  }),
  step({
    id: "asana",
    sequence: 11,
    title: "Aasanam",
    englishTitle: "Offer a seat",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "mauktikai: pushyaraagaiScha naanaaratnairviraajitaM\n" +
      "ratna siMhaasanaM chaaru preetyarthaM pratigRhyataaM\n" +
      "Sree mahaagaNaadhipatayae nama: aasanaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(4, "the Aasanam verse"),
    whatToDo: "Offer a seat (asana) to Ganesha.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The seat, one of the sixteen services.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 4 }, { sourceId: TE, page: 4 }],
  }),
  step({
    id: "padya",
    sequence: 12,
    title: "Paadyam",
    englishTitle: "Offer water for the feet",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "gajavaktra namastaestu sarvaabheeshTapradaayaka,\n" +
      "bhaktyaa paadyaM mayaadattaM gRhaaNa dviradaanana\n" +
      "Sree mahaagaNaadhipatayae nama: paadyaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(4, "the Paadyam verse"),
    whatToDo: "Offer water for washing the feet (paadya).",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The foot-water offering, one of the sixteen services.",
    materialsNamedInMantra: ["water"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 4 }, { sourceId: TE, page: 4 }],
  }),
  step({
    id: "arghya",
    sequence: 13,
    title: "Arghyam",
    englishTitle: "Offer water for the hands",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "gaureeputra namastaestu SaMkarapriyanaMdana\n" +
      "gRhaaNaarghyaM mayaadattaM gaMdhapushpaakshatairyutaM\n" +
      "Sree mahaagaNaadhipatayae nama: aarghyaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(5, "the Arghyam verse"),
    whatToDo: "Offer arghya - water with sandal, flowers and akshata.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The hand-water offering, one of the sixteen services.",
    materialsNamedInMantra: ["water", "sandal paste (gandha)", "flowers", "akshata"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 5 }, { sourceId: TE, page: 5 }],
  }),
  step({
    id: "achamaniya",
    sequence: 14,
    title: "Aachamaneeyam",
    englishTitle: "Offer sipping water",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "anaathanaatha sarvaj~na geervaaNa gaNa poojita\n" +
      "gRhaaNaachamanaM daeva tubhyaM dattaM mayaa prabhO\n" +
      "Sree mahaagaNaadhipatayae nama: aachamaneeyaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(5, "the Aachamaneeyam verse"),
    whatToDo: "Offer water for sipping (achamaniya).",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The sipping-water offering, one of the sixteen services.",
    materialsNamedInMantra: ["water"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 5 }, { sourceId: TE, page: 5 }],
  }),
  step({
    id: "madhuparka",
    sequence: 15,
    title: "Madhuparkam",
    englishTitle: "Offer the honey mixture",
    classification: "TRADITION_SPECIFIC",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "dadhiksheera samaayuktaM mathvaajyaena samanvitaM\n" +
      "madhuparkaM gRhaaNaedaM gajavaktra namOstutae\n" +
      "Sree mahaagaNaadhipatayae nama: madhuparkaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(5, "the Madhuparkam verse"),
    whatToDo: "Offer madhuparka - the curd, milk, honey and ghee mixture.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "A traditional welcome offering.",
    materialsNamedInMantra: ["curd (dadhi)", "milk (kshira)", "honey (madhu)", "ghee (ajya)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 5 }, { sourceId: TE, page: 5 }],
  }),
  step({
    id: "snana",
    sequence: 16,
    title: "Snaanam (panchamrita + shuddhodaka)",
    englishTitle: "Offer the bath",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "snaanaMpaMchaamRtairdaeva gRhaaNa gaNanaayaka\n" +
      "anaathanaatha sarvaj~na geervaaNa gaNapoojita\n" +
      "Sree mahaagaNaadhipatayae nama: paMchaamRtasnaanaM samarpayaami\n" +
      "gaMgaadisarvateerthaebhya aahRtai ramalairjalai:\n" +
      "snaanaM kurushva bhagavan umaaputra namOstutae\n" +
      "Sree mahaagaNaadhipatayae nama: SuddhOdakasnaanaM samarpayaami.",
    teluguScriptTranscriptionTask: teluguTask(5, "the Snaanam verses (panchamrita and shuddhodaka)"),
    whatToDo: "Offer the bath - first with panchamrita, then with clean water.",
    howToDo:
      "Offer symbolically so a clay murti or a paper picture is not damaged. " +
      "Exact action needs reviewer confirmation.",
    whyWeDoIt: "The bath, one of the sixteen services.",
    materialsNamedInMantra: ["panchamrita (five nectars)", "clean water"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 5 }, { sourceId: TE, page: 5 }],
  }),
  step({
    id: "vastra",
    sequence: 17,
    title: "Vastram",
    englishTitle: "Offer clothing",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "raktavastradvayaM chaaru daevayOgyaM cha maMgaLaM\n" +
      "SubhapradaM gRhaaNa tvaM laMbOdara haraatmaja\n" +
      "Sree mahaagaNaadhipatayae nama: vastrayugmaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(5, "the Vastram verse"),
    whatToDo: "Offer a pair of cloths (vastra-yugma).",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The clothing offering, one of the sixteen services.",
    materialsNamedInMantra: ["a pair of cloths (rakta-vastra-dvaya)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 5 }, { sourceId: TE, page: 5 }],
  }),
  step({
    id: "yajnopavita",
    sequence: 18,
    title: "Yaj~nOpaveetam",
    englishTitle: "Offer the sacred thread",
    classification: "TRADITION_SPECIFIC",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "raajitaM brahmasootraM kaaMchanaMchOttareeyakaM\n" +
      "gRhaaNa daeva sarvaj~na bhaktaanaa mishTadaayaka\n" +
      "Sree mahaagaNaadhipatayae nama: yaj~nOpaveetaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(5, "the Yaj~nOpaveetam verse"),
    whatToDo: "Offer the sacred thread (yajnopavita) and an upper cloth.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The sacred-thread offering, one of the sixteen services.",
    materialsNamedInMantra: ["sacred thread (brahma-sutra)", "upper cloth (uttareeya)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 5 }, { sourceId: TE, page: 5 }],
  }),
  step({
    id: "gandha",
    sequence: 19,
    title: "GaMdham",
    englishTitle: "Offer sandal paste",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "chaMdanaagarukarpoora kastooree kuMkumaanvitaM\n" +
      "vilaepanaM suraSraeshTa preetyarthaM pratigRhyataam\n" +
      "Sree mahaagaNaadhipatayae nama: gaMdhaan samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(6, "the GaMdham verse"),
    whatToDo: "Offer scented paste (gandha).",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The scent offering, one of the sixteen services.",
    materialsNamedInMantra: [
      "sandal (chandana)", "aguru", "camphor (karpura)", "musk (kasturi)", "kumkuma",
    ],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 6 }, { sourceId: TE, page: 6 }],
  }),
  step({
    id: "pushpakshata",
    sequence: 20,
    title: "Pushpaakshatalu",
    englishTitle: "Offer akshata and flowers",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "akshataan dhavaLaan divyaan SaaleeyaaM staMDulaan Subhaan\n" +
      "gRhaaNa paramaanaMda SaMbhu putra namOstutae.\n" +
      "Sree mahaagaNaadhipatayae nama: akshataan samarpayaami.\n" +
      "sugaMdhaani supushpaaNi jaajikuMdamukhaanicha\n" +
      "aeka viSaMti patraaNi saMgRhaaNa namOstutae\n" +
      "Sree mahaagaNaadhipatayae nama: pushpaaNi samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(6, "the Pushpaakshatalu verses"),
    whatToDo: "Offer akshata (whole rice) and fragrant flowers.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt:
      "The rice-and-flower offering. Its second verse names 'aeka viSaMti " +
      "patraaNi' - twenty-one leaves - which the later Patra Puja worships.",
    materialsNamedInMantra: ["white rice (akshata)", "fragrant flowers", "jaji", "kunda"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 6 }, { sourceId: TE, page: 6 }],
  }),
  step({
    id: "anga-puja",
    sequence: 21,
    title: "Anga Puja (17 limb names)",
    englishTitle: "Worship each part",
    classification: "TRADITION_SPECIFIC",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "gaNaeSaaya nama: paadau poojayaami\n" +
      "aekadaMtaaya nama: jaanunee poojayaami\n" +
      "vighnaraajaaya nama: jaMghae poojayaami\n" +
      "aakhuvaahanaaya nama: ooruM poojayaami\n" +
      "haeraMbaaya nama: kaTiM poojayaami\n" +
      "laMbOdaraaya nama: udaraM poojayaami\n" +
      "gaNanaathaaya nama: naabhiM poojayaami\n" +
      "gaNaeSaaya nama: hRdayaM poojayaami\n" +
      "sthoola kaMThaaya nama: kaMThaM poojayaami\n" +
      "skaMdaagrajaaya nama: skaMdhau poojayaami\n" +
      "paaSahastaaya nama: hastau poojayaami\n" +
      "gajavaktraaya nama: vaktraM poojayaami\n" +
      "vighnahaMtrae nama: naetrae poojayaami\n" +
      "SoorpakarNaaya nama: karNau poojayaami\n" +
      "phaalachaMdraaya nama: lalaaTaM poojayaami\n" +
      "sarvaeSvaraaya nama: Sira: poojayaami\n" +
      "vighnaraajaaya nama: sarvaaNyaMgaani poojayaami",
    teluguScriptTranscriptionTask: teluguTask(6, "the 17-name Anga Puja"),
    whatToDo: "Worship each named part of the deity in turn with akshata or a flower.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "A detailed part of the fuller procedure.",
    materialsNamedInMantra: [],
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 6 }, { sourceId: TE, page: 6 }],
  }),
  step({
    id: "ekavimsati-patra-puja",
    sequence: 22,
    title: "Ekaviṃśati Patra Puja (21-leaf worship)",
    englishTitle: "Offer the twenty-one leaves",
    classification: "TRADITION_SPECIFIC",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "See CANDIDATE_PATRI. Each of the 21 lines is '<deity name> nama: " +
      "<leaf name>patraM poojayaami', closing with 'Sree gaNaeSvaraaya nama: " +
      "aekaviMSatipatraaNi poojayaami'.",
    teluguScriptTranscriptionTask: teluguTask(7, "the 21-leaf Patra Puja"),
    whatToDo: "Offer each of the twenty-one traditional leaves with its name.",
    howToDo:
      "Only offer a leaf you can clearly identify and know to be safe. Never " +
      "pick an unidentified plant. Exact action needs reviewer confirmation.",
    whyWeDoIt: "The twenty-one-leaf worship, part of the fuller procedure.",
    materialsNamedInMantra: ["the twenty-one named leaves (see CANDIDATE_PATRI)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 7 }, { sourceId: TE, page: 7 }],
    reviewerQuestions: [
      {
        id: "patri-botanical-id",
        question:
          "The 21 leaf names are transliterations only. Which physical plant " +
          "each names, and how to identify it safely, is NOT in the source " +
          "and is not inferred here. Reviewer to supply botanical identities.",
      },
      {
        id: "patri-fallback",
        question:
          "A flowers/akshata fallback when patri is unavailable is attributed " +
          "by docs/VINAYAKA_PUJA_CONTENT_SPEC.md to the priest's separate " +
          "written reply, which was NOT supplied. It is NOT implemented as an " +
          "automatic substitution - pending that source and review.",
      },
    ],
  }),
  step({
    id: "ashtottara-satanamavali",
    sequence: 23,
    title: "Ashtottara Shatanamavali (108 names)",
    englishTitle: "Offer flowers with the 108 names",
    classification: "OPTIONAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: false,
    mantraTransliteration: "",
    teluguScriptTranscriptionTask: teluguTask(8, "the 108-name Ashtottara Shatanamavali"),
    whatToDo: "Offer a flower or akshata for each of the 108 names.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "Reciting the 108 names, part of the fuller procedure.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 8 }, { sourceId: TE, page: 8 }],
    reviewerQuestions: [
      {
        id: "ashtottara-transcription",
        question:
          "The 108 names are now RECOVERED in Telugu script from the render of " +
          "Telugu PDF page 8 (see ASHTOTTARA_TELUGU_RECOVERY) at MEDIUM " +
          "confidence - the 3-column layout makes conjunct errors likely. " +
          "Reviewer to re-verify every name against the source. The romanised " +
          "transliteration is still NOT stored (the English PDF's 3-column " +
          "layout defeats a faithful copy).",
      },
    ],
  }),
  step({
    id: "dhupa",
    sequence: 24,
    title: "Dhoopam",
    englishTitle: "Offer incense",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "daSaaMgaM guggulOpaetaM sugaMdhaM sumanOharaM\n" +
      "umaa suta namastubhyaM gRhaaNa varadhO bhava\n" +
      "Sree mahaagaNaadhipatayae nama: dhoopa maaghraapayaami",
    teluguScriptTranscriptionTask: teluguTask(9, "the Dhoopam verse"),
    whatToDo: "Offer incense (dhupa).",
    howToDo:
      "Ventilate the room; skip incense for breathing sensitivity; an adult " +
      "handles the flame. Exact action needs reviewer confirmation.",
    whyWeDoIt: "The incense offering, one of the sixteen services.",
    materialsNamedInMantra: ["ten-part incense (dashanga)", "guggulu"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 9 }, { sourceId: TE, page: 9 }],
  }),
  step({
    id: "deepa",
    sequence: 25,
    title: "Deepam",
    englishTitle: "Show the lamp",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "saadyaM trivartisaMyuktaM vahninaa dyOtitaM mayaa\n" +
      "gRhaaNa maMgaLaM deepaM meeSaputra namOstutae\n" +
      "Sree mahaagaNaadhipatayae nama: deepaM darSayaami",
    teluguScriptTranscriptionTask: teluguTask(9, "the Deepam verse"),
    whatToDo: "Show the lamp (deepa).",
    howToDo:
      "An adult handles the flame, kept away from children, hair and cloth. " +
      "Exact action needs reviewer confirmation.",
    whyWeDoIt: "The lamp offering, one of the sixteen services.",
    materialsNamedInMantra: ["lamp with wicks (trivarti)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 9 }, { sourceId: TE, page: 9 }],
  }),
  step({
    id: "naivedya",
    sequence: 26,
    title: "Naivaedyam",
    englishTitle: "Offer food",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "sugandhaan sukRtaaMSchaiva mOdakaan ghRtapaachitaan\n" +
      "naivaedyaM gRhyataaM daeva chaNamudgai: prakalpitaan\n" +
      "bhakshyaM bhOjyaMcha laehyaMcha chOshyaM paaneeyamaevacha\n" +
      "idaM gRhaaNa naivaedyaM mayaadattaM vinaayaka\n" +
      "Sree mahaagaNaadhipatayae nama: naivaedyaM samarpayaami.\n" +
      "satyaM tvartaena parishiMchaami amRtamastu amRtOpastaraNamasi\n" +
      "OM praaNaM nama:- apaanaM nama: - vyaanaM nama:\n" +
      "udaanaM nama: - samaanaM nama:\n" +
      "madhyae madhyae paaneeyaM samarpayaami - amRtamastu amRtaapidhaanamasi\n" +
      "uttaraa pOSanaM samarpayaami , hastau prakshaaLanaM samarpayaami\n" +
      "paada prakshaaLanaM samarpayaami , SuddhaachamaneeyaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(9, "the Naivaedyam verses and prana-ahuti"),
    whatToDo: "Offer prepared food (naivedya) and water, with the prana-ahuti.",
    howToDo:
      "Keep it clean; share it as prasadam after the puja. Exact action needs " +
      "reviewer confirmation.",
    whyWeDoIt: "The food offering, one of the sixteen services.",
    materialsNamedInMantra: ["modaka cooked in ghee", "gram/moong preparations (chana, mudga)", "water"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 9 }, { sourceId: TE, page: 9 }],
  }),
  step({
    id: "tambula",
    sequence: 27,
    title: "TaaMboolam",
    englishTitle: "Offer betel",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "poogeephalai ssakarpoorai: naagavallee daLairyutaM\n" +
      "muktaachoorNa samaayuktaM taaMboolaM pratigRhyataaM\n" +
      "Sree mahaagaNaadhipatayae nama: taaMboolaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(10, "the TaaMboolam verse"),
    whatToDo: "Offer tambula - betel leaf, areca nut and camphor.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The betel offering, one of the sixteen services.",
    materialsNamedInMantra: [
      "areca nut (pugiphala)", "betel leaf (nagavalli dala)", "camphor (karpura)", "pearl powder (mukta churna)",
    ],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 9 }, { sourceId: TE, page: 10 }],
  }),
  step({
    id: "neerajana",
    sequence: 28,
    title: "Neeraajanam",
    englishTitle: "Offer the camphor flame (harati)",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "ghRtavarti sahasraiScha karpooraSakalai stadhaa\n" +
      "neeraajanaM mayaadattaM gRhaaNa varadO bhava.\n" +
      "Sree mahaagaNaadhipatayae nama: neeraajanaM samarpayaami",
    teluguScriptTranscriptionTask: teluguTask(10, "the Neeraajanam verse"),
    whatToDo: "Offer the lamp / camphor flame (neerajana / harati).",
    howToDo:
      "An adult offers it, moving slowly, over a heat-safe surface. Exact " +
      "action needs reviewer confirmation.",
    whyWeDoIt: "The waving-of-lights offering, near the close of the service.",
    materialsNamedInMantra: ["ghee wicks", "camphor pieces (karpura)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 9 }, { sourceId: TE, page: 10 }],
  }),
  step({
    id: "doorvayugma-puja",
    sequence: 29,
    title: "Doorvaayugma Puja (11 names)",
    englishTitle: "Offer pairs of durva grass",
    classification: "TRADITION_SPECIFIC",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "gaNaadhipaaya nama: doorvaayugmaM poojayaami\n" +
      "umaaputraaya nama: doorvaayugmaM poojayaami\n" +
      "akhuvaahanaaya nama: doorvaayugmaM poojayaami\n" +
      "vinaayakaaya nama: doorvaayugmaM poojayaami\n" +
      "eeSaputraaya nama: doorvaayugmaM poojayaami\n" +
      "sarvasiddi pradaayakaaya nama: doorvaayugmaM poojayaami\n" +
      "aekadaMtaaya nama: doorvaayugmaM poojayaami\n" +
      "ibhavaktraaya nama: doorvaayugmaM poojayaami\n" +
      "mooshika vaahanaaya nama: doorvaayugmaM poojayaami\n" +
      "kumaaraguravae nama: doorvaayugmaM poojayaami\n" +
      "aekadaMtaikavadana tathaamooshika vaahanaaya nama: doorvaayugmaM poojayaami",
    teluguScriptTranscriptionTask: teluguTask(10, "the 11-name Doorvaayugma Puja"),
    whatToDo: "Offer paired blades of durva grass with each name.",
    howToDo:
      "Only offer durva you can clearly identify. Exact action needs reviewer confirmation.",
    whyWeDoIt: "The durva-grass worship, part of the fuller procedure.",
    materialsNamedInMantra: ["paired durva grass (doorvaayugma)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 10 }, { sourceId: TE, page: 10 }],
  }),
  step({
    id: "mantrapushpa-namaskara",
    sequence: 30,
    title: "Mantrapushpam - Namaskaram (with concluding verses)",
    englishTitle: "Offer flowers, circle and bow, and close",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "kumaaraguravae tubhyaM arpayaami sumaaMjaliM\n" +
      "pradakshiNaM karishyaami satataM mOdakapriya\n" +
      "Sree mahaagaNaadhipatayae nama: suvarNa divya maMtrapushpaM samarpayaami\n" +
      "aatma pradakshiNa namaskaaraan samarpayaami\n" +
      "punararghyaM : arghyaM gRhaaNa haeraMba sarva bhadra pradaayaka\n" +
      "gaMdha pushpaakshatairyuktaM paatrasthaM paapanaaSana\n" +
      "Sree mahaagaNaadhipatayae nama: punararghyaM samarpayaami\n" +
      "Chatra chaamara geeta nRtya aaMdOLikaa aSvaarOhaNa gajaarOhaNa " +
      "samasta raajOpacharaan manasaa samarpayaami\n" +
      "yasya smRtyaacha naamOktyaa tapa: poojaa kriyaadishu:\n" +
      "nyoonaM saMpoorNataaM yaati sadyO vaMdae tamachyutaM\n" +
      "maMtra heenaM kriyaaheenaM bhaktiheenaM gaNaadhipa\n" +
      "yatpoojitaM maayaa daeva paripoorNaM tadastutae\n" +
      "anayaa yadhaa Sakti poojayaacha bhagavaan sarvaatmaka:\n" +
      "Sree mahaa gaNaadhipati daevataa suprasanna: ssupreetO varadO bhavatu",
    teluguScriptTranscriptionTask: teluguTask(11, "the Mantrapushpam, punararghyam and concluding verses"),
    whatToDo:
      "Offer the mantra-flower, do self-circumambulation and prostration, " +
      "offer punararghya, and recite the concluding verses.",
    howToDo:
      "The source states 'aatma pradakshiNa namaskaaraan' - circle in place " +
      "and prostrate. If circling is unsafe or space is small, remain in " +
      "place; an exact alternative needs reviewer confirmation.",
    whyWeDoIt:
      "The closing flower-offering, circumambulation, bow, and the verses " +
      "that ask forgiveness for anything done imperfectly.",
    materialsNamedInMantra: ["flowers (mantrapushpa)", "sandal, flowers and akshata (for punararghya)"],
    materialsFromSource: true,
    sourceRefs: [{ sourceId: EN, page: 10 }, { sourceId: TE, page: 11 }],
  }),
  step({
    id: "udvasana",
    sequence: 31,
    title: "Udvaasana",
    englishTitle: "Conclude and take leave",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "namastae vighna raajaaya namastae vighnanaaSana\n" +
      "braahmaNaebhyObhyanuj~naataa gaChchadaeva yadhaa sukhaM\n" +
      "Sree mahaa gaNaadhipatayae nama:, yadhaasthaanaM udvaasayaami; punaraagamanaayacha",
    teluguScriptTranscriptionTask: teluguTask(11, "the Udvaasana verse"),
    whatToDo: "Conclude the worship and respectfully take leave (udvasana).",
    howToDo:
      "The source states this is 'To be done on the day of Nimajjan " +
      "(immersion), after the above Puja.' Exact timing and action need " +
      "reviewer confirmation (this is a release blocker).",
    whyWeDoIt: "The formal conclusion of the worship.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 11 }, { sourceId: TE, page: 11 }],
    reviewerQuestions: [
      {
        id: "udvasana-timing",
        question:
          "The source ties Udvasana to the day of immersion. Confirm the " +
          "exact timing and action, and how it relates to the app's " +
          "post-puja immersion guidance.",
      },
    ],
  }),
  step({
    id: "mangala-shanti",
    sequence: 32,
    title: "Svasti Prajaabhyah (closing blessing)",
    englishTitle: "Closing peace verses",
    classification: "ESSENTIAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: true,
    mantraTransliteration:
      "svasti prajaabhya: paripaalayaMtaaM nyaayaena maargaena maheeM maheeSaa\n" +
      "gO braahmaNaebhya: Subhamastu nityaM, lOkaa: samastaa sukhinO bhavaMtu.\n" +
      "kaalae varshatu parjanya: pRthivee sasya Saalinee\n" +
      "daeSOyaM kshObha rahitO brahmaNaa saMtu nirbhaya:\n" +
      "aputraa: putriNa: ssaMtu putriNa ssaMtupautriNa:\n" +
      "adhanaa: ssadhanaa: saMtu jeevaMtu SaradaaM SataM",
    teluguScriptTranscriptionTask: teluguTask(11, "the Svasti Prajaabhyah closing verses"),
    whatToDo: "Recite the closing peace and blessing verses.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "Traditional closing verses of goodwill for all.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 11 }, { sourceId: TE, page: 11 }],
    disagreements: [
      {
        field: "closing extent",
        telugu:
          "Telugu PDF page 11 ends the Svasti block at \"జీవంతు శరదాం శతం\" " +
          "(jeevaMtu SaradaaM SataM) - no extra blessing line is appended on " +
          "that page (now confirmed against the page render)",
        english: "the English file ends the blessing at \"jeevaMtu SaradaaM SataM\"",
        note:
          "The two files agree in extent on this page. Whether a Telugu " +
          "household closing adds \"sarve janaaH sukhino bhavantu\" in " +
          "practice is still a reviewer question, but it is not printed here.",
      },
    ],
  }),
  step({
    id: "vrata-katha",
    sequence: 33,
    title: "Vinayaka Vrata Katha (story) — text withheld",
    englishTitle: "The Vinayaka Chavithi story",
    classification: "OPTIONAL",
    classificationConfidence: "INFERRED_NEEDS_REVIEW",
    transliterationSupported: false,
    mantraTransliteration: "",
    teluguScriptTranscriptionTask:
      "Not applicable - this is prose, not a mantra. See the reviewer question below.",
    whatToDo: "Read or listen to a reviewed, licensed version of the story.",
    howToDo: NEEDS_KRIYA,
    whyWeDoIt: "The Vrata Katha is a core part of the Telugu Vinayaka Chavithi observance.",
    materialsFromSource: false,
    sourceRefs: [{ sourceId: EN, page: 12 }, { sourceId: TE, page: 11 }],
    reviewerQuestions: [
      {
        id: "katha-licensing",
        question:
          "A Vrata Katha exists in both PDFs (English prose on pages 12-17; " +
          "Telugu prose on pages 11-15). It is the compiler's own retelling " +
          "and is NOT reproduced here. The app needs a licensed or " +
          "independently sourced-and-approved version of this text before it " +
          "can show it.",
      },
    ],
  }),
];

export function candidateStep(id: string): CandidatePujaStep | undefined {
  return CANDIDATE_PUJA_STEPS.find((s) => s.id === id);
}

export function candidateStepsInOrder(): CandidatePujaStep[] {
  return [...CANDIDATE_PUJA_STEPS].sort((a, b) => a.sequence - b.sequence);
}

export const CANDIDATE_STEP_COUNT = CANDIDATE_PUJA_STEPS.length;
