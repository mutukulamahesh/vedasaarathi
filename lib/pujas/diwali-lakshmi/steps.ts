// The Diwali Lakshmi Puja's guided steps (DLP-P1, DLP-01 through DLP-31).
//
// Every field below is adapted directly from
// docs/pujas/diwali-lakshmi-puja-master.md (v0.3), Section 5, using ONLY the
// text each step there marks "Selected for app display and audio" - never the
// "Historical source wording (not used for audio)" blocks (DLP-11, DLP-24).
// Where a step has no such split, the one printed text is both.
//
// Unlike lib/pujas/vinayaka's pipeline (candidate.ts -> beta-journey.ts ->
// steps.ts), this puja's Telugu-script text was read directly from the
// source PDF's rendered page images and cross-checked word-for-word against
// the source's own transliteration (master document Section 0, Section 6.7) -
// there is no OCR-recovery scaffolding to adapt here, so these steps are
// built directly in the generic PujaGuidedStep shape (lib/puja/types.ts)
// instead of going through that Vinayaka-specific pipeline.
//
// Every step stays REVIEW_REQUIRED and locked (no priest review has been
// requested - master document Section 8). Each is a SOURCED_BETA_CANDIDATE:
// includedInBeta, an identified source id + exact page, and a content
// version, so it passes canDisplayAsBetaCandidate() without ever passing
// canDisplayAsGuidance() - the two-gate model in .claude/rules/sacred-content.md.

import { draftProvenance } from "@/lib/content/provenance";
import type { PujaGuidedStep } from "@/lib/puja/types";
import { DIWALI_SANKALPAM_TELUGU, DIWALI_SANKALPAM_TRANSLITERATION } from "./sankalpam";

const CONTENT_VERSION = "diwali-lakshmi-source-candidate-1";
const SOURCE_ID = "p1-diwali-booklet";

function provenance(sourceReference: string) {
  return draftProvenance({
    source: "Diwali Lakshmi Pooja Process (Nanduri Srinivas booklet)",
    sourceReference,
    traditionScope: "Telugu household Diwali Lakshmi Puja — sourced beta candidate",
    writtenSourceStatus: "CONFIRMED",
    contentVersion: CONTENT_VERSION,
  });
}

interface DlpStepInput {
  id: string;
  title: string;
  teluguTitle: string;
  /** Telugu-script recitation, selected text only, or null for a non-mantra step. */
  mantraTeluguScript: string | null;
  /** P1's own transliteration of the selected text, "" when none applies. */
  mantraTransliteration: string;
  what: string;
  how: string;
  why: string;
  termNote?: string | null;
  minutes: number;
  teluguPage: number | null;
  materials?: readonly string[];
  candidateStepId?: string;
  /** True when this step's `how` is the master document's own "How:" /
   * "[App-team accommodation]" field (docs/pujas/diwali-lakshmi-puja-master.md
   * Section 5), carried over as-is. False when the master document gave no
   * "How:" field for this step and this implementation pass had to write a
   * minimal literal physical action itself - per .claude/rules/sacred-
   * content.md ("a beginner physical action with no reliable source is a
   * minimal literal action derived from the mantra or material, flagged
   * BETA_ACTION_NEEDS_REVIEW"), those steps are flagged for reviewer
   * attention rather than silently presented as equally sourced. */
  howSourced?: boolean;
}

function step(input: DlpStepInput): PujaGuidedStep {
  // DLP-P1 and DLP-31 are editorial, practical staging/closing guidance - P1
  // prints no setup or farewell instructions at all (master document Section
  // 6.4). They make no religious claim, so they follow the SAME convention
  // Vinayaka's own practical lead-in steps use (lib/pujas/vinayaka/
  // beta-journey.ts BETA_PREP_STEPS): GENERAL_GUIDANCE, unlocked, and
  // APPROVED_GUIDANCE (always displayable) rather than REVIEW_REQUIRED +
  // SOURCED_BETA_CANDIDATE (which would require a source page/locator they
  // genuinely do not have).
  const isEditorialPractical = input.teluguPage === null;
  return {
    id: input.id,
    title: input.title,
    teluguTitle: input.teluguTitle,
    teluguInstruction: "",
    what: input.what,
    how: input.how,
    why: input.why,
    importance: "CORE",
    minutes: input.minutes,
    termNote: input.termNote ?? null,
    reviewStatus: isEditorialPractical ? "GENERAL_GUIDANCE" : "REVIEW_REQUIRED",
    locked: !isEditorialPractical,
    provenance: provenance(
      input.teluguPage !== null
        ? `P1 p.${input.teluguPage} (Telugu script)`
        : "Editorial staging — P1 prints no setup/closing instructions",
    ),
    mantraTeluguScript: input.mantraTeluguScript,
    mantraTransliteration: input.mantraTransliteration,
    transliterationSupported: input.mantraTransliteration.length > 0,
    simpleMeaning: input.what,
    betaAction: input.how,
    betaActionNeedsReview: !isEditorialPractical && input.howSourced !== true,
    candidateStepId: input.candidateStepId ?? input.id,
    materials: input.materials ?? [],
    betaStatus: isEditorialPractical ? "APPROVED_GUIDANCE" : "SOURCED_BETA_CANDIDATE",
    includedInBeta: true,
    betaClassification: undefined,
    classificationInferred: false,
    sourceRefs: input.teluguPage !== null ? [{ sourceId: SOURCE_ID, page: input.teluguPage }] : [],
    teluguRecovery:
      input.teluguPage !== null
        ? {
            sourcePage: input.teluguPage,
            confidence: "HIGH",
            transcriptionCheckRequired: true,
            uncertainTokens: [],
          }
        : null,
  };
}

export const DIWALI_STEPS: readonly PujaGuidedStep[] = [
  step({
    id: "dlp-p1",
    title: "Prepare the space and materials",
    teluguTitle: "పూజకు సిద్ధపడటం",
    mantraTeluguScript: null,
    mantraTransliteration: "",
    what: "Set up the altar area, materials, and lamp before beginning.",
    how: "A clean, ready space lets you move through the puja without interruption.",
    why: "Being ready before you start means you are not searching for something mid-puja.",
    minutes: 5,
    teluguPage: null,
    materials: ["Lakshmi image or murti", "Water", "Lamp", "Puja materials"],
  }),

  // Phase B — Opening
  step({
    id: "dlp-01",
    title: "Opening meditation verse (Shuklambaradharam)",
    teluguTitle: "శుక్లాంబరధరం",
    mantraTeluguScript:
      "శుక్లాం బరధరం విష్ణుం శశివర్ణం చతుర్భుజం\n" +
      "ప్రసన్న వదనం ధ్యాయేత్ సర్వ విఘ్నోప శాంతయే",
    mantraTransliteration:
      "ShuklaAmbara Dharam Vishnum Shashi Varnam Chatur Bhujam\n" +
      "Prasanna Vadanam Dhyaayet Sarva Vighnopashaantaye",
    what:
      "A traditional opening verse remembering the white-clad, four-armed " +
      "form associated with the removal of obstacles.",
    how: "Recite this verse quietly to settle your mind before the puja begins.",
    why: "Reciting it first helps the mind settle before worship begins.",
    minutes: 1,
    teluguPage: 2,
  }),
  step({
    id: "dlp-02",
    title: "Achamanam — the twenty-four names",
    teluguTitle: "ఆచమనం",
    mantraTeluguScript:
      "ఓం కేశవాయ స్వాహ 2. ఓం నారాయణాయ స్వాహ 3. ఓం మాధవాయ స్వాహ 4. ఓం గోవిందాయ నమః " +
      "5. విష్ణవే నమః 6. మధుసూదనాయ నమః 7. త్రి విక్రమాయ నమః 8. వామనాయ నమః 9. శ్రీధరాయ నమః " +
      "10. హృషీకేశాయ నమః 11. పద్మనాభాయ నమః 12. దామోదరాయ నమః 13. సంకర్షణాయ నమః " +
      "14. వాసుదేవాయ నమః 15. ప్రద్యుమ్నాయ నమః 16. అనిరుద్ధాయ నమః 17. పురుషోత్తమాయ నమః " +
      "18. అధోక్షజాయ నమః 19. నారసింహాయ నమః 20. అచ్యుతాయ నమః 21. జనార్దనాయ నమః " +
      "22. ఉపేంద్రాయ నమః 23. హరయే నమః 24. శ్రీ కృష్ణాయ నమ",
    mantraTransliteration:
      "OM kaeSavaaya svaahaa - OM naaraayaNaaya svaahaa / OM maadhavaaya svaahaa - " +
      "OM gOviMdaaya nama: / vishNavae nama: - madhusoodanaaya nama: / tri " +
      "vikramaaya nama: - vaamanaaya nama: / Sreedharaaya nama: - hRsheekaeSaaya " +
      "nama: / padmanaabhaaya nama: - daamOdaraaya nama: / saMkarshaNaaya nama: - " +
      "vaasudaevaaya nama: / pradyu mnaaya nama: - aniruddhaaya nama: / " +
      "purushOttamaaya nama: - adhOkshajaaya nama: / naarasiMhaaya nama: - " +
      "achyutaaya nama: / janaardhanaaya nama: - upaeMdraaya nama: / harayae " +
      "nama: - Sree kRshNaaya nama",
    what:
      "Twenty-four names of Vishnu, traditionally recited as a short " +
      "purification before worship.",
    how: "Sip a little water three times while reciting the first three names, then continue reciting the rest.",
    why: "This is a short purification done before most Hindu worship begins.",
    minutes: 2,
    teluguPage: 2,
    materials: ["Clean water", "A spoon"],
  }),
  step({
    id: "dlp-03",
    title: "Clearing the space (Uttishthantu bhuta-pishachah)",
    teluguTitle: "ఉత్తిష్ఠంతు భూతపిశాచాః",
    mantraTeluguScript:
      "ఉత్తిష్ఠంతు భూతపిశాచాః ఏతే భూమి భారకాః\n" +
      "ఏతేషా మవిరోధేన బ్రహ్మకర్మ సమారభే",
    mantraTransliteration:
      "uttishTaMtu bhootapiSaachaa: aetae bhoomi bhaarakaa:\n" +
      "aetaeshaa mavirOdhaena brahmakarma samaarabhae",
    what:
      "A verse asking any disturbing beings to depart respectfully, so the " +
      "worship can begin without obstruction.",
    how: "Recite the verse quietly, asking that anything disturbing withdraw respectfully.",
    why: "This asks for a clear, undisturbed space before the worship itself begins.",
    minutes: 1,
    teluguPage: 2,
  }),
  step({
    id: "dlp-04",
    howSourced: true,
    title: "Pranayamam (breath pause)",
    teluguTitle: "ప్రాణాయామము",
    mantraTeluguScript:
      "ప్రాణాయామము\n" +
      "పూరకం కుంభకం చైవ రేచకం తదనంతరం\n" +
      "ప్రాణాయామ మిదం ప్రోక్తం సర్వ దేవ నమస్కృతం",
    mantraTransliteration:
      "praaNaayaamamu\n" +
      "poorakaM kuMbhakaM chaiva raechakaM tadanaMtaraM\n" +
      "praaNaayaama midaM prOktaM sarva daeva namaskRtaM",
    what: "A short, traditional breathing pause, named and honoured as a small offering in itself.",
    how:
      "The verse names pooraka (inhale), kumbhaka (hold), rechaka (exhale). " +
      "Breathe gently while reciting; never force or strain a breath-hold. " +
      "If breath-holding is uncomfortable, breathe normally while reciting.",
    why: "This is a brief, traditional moment of calm before the puja continues.",
    termNote: "Breathe gently — never force or strain a breath-hold. If uncomfortable, breathe normally while reciting.",
    minutes: 1,
    teluguPage: 2,
  }),

  // Phase C — Sankalpam, bell, kalasha
  step({
    id: "dlp-05",
    title: "Sankalpam (statement of intention)",
    teluguTitle: "సంకల్పం",
    candidateStepId: "sankalpa",
    // Reused verbatim from ./sankalpam.ts (the single source of truth for
    // this text) rather than duplicated here - this is the SAME source
    // candidate text shown only as a reviewer-facing "comparison only"
    // reference (see components/platform/puja-screen.tsx isSankalpam
    // handling); the Sankalpam a family actually hears/reads is the separate,
    // live, participant-aware assembly from lib/sankalpam/generator.ts.
    mantraTeluguScript: DIWALI_SANKALPAM_TELUGU,
    mantraTransliteration: DIWALI_SANKALPAM_TRANSLITERATION,
    what:
      "A statement declaring, for us and our families, the purpose of this " +
      "worship — wellbeing, stability, and prosperity — dedicated to Sri " +
      "Mahalakshmi. This is a short-form Sankalpam with no slot for Gotra, " +
      "Veda, Sutra, Sampradaya, or a dated calendar.",
    how:
      "The app assembles your own Sankalpam below, using your entered name, " +
      "family and location details exactly as you provided them. Read it " +
      "aloud, or follow along as it plays.",
    why: "This is a statement declaring your intention and purpose for performing this puja.",
    minutes: 2,
    teluguPage: 3,
  }),
  step({
    id: "dlp-06",
    howSourced: true,
    title: "Bell (Ghanta nadam)",
    teluguTitle: "ఘంటా నాదం",
    mantraTeluguScript:
      "ఘంటా నాదం చేస్తూ\n" +
      "ఆగమార్థంతు దేవానాం గమనార్థం తు రాక్షసాం\n" +
      "కురు ఘంటారవం తత్ర దేవతాహ్వాన లాంఛనమ్",
    mantraTransliteration:
      "Ghanta Naadam / aagamaardhaMtu daevaanaaM gamanaardhaM tu rakshaa saaM " +
      "kuru ghaMTaaravaM tatra daevataahvaana laaMchanam",
    what: "The bell sound is a mark that invites the divine presence and asks disturbing forces to withdraw.",
    how: "Ring a bell gently while reciting, if one is available. If unavailable, recite the verse and continue.",
    why: "The bell marks the moment of inviting the divine presence to be here.",
    minutes: 1,
    teluguPage: 3,
    materials: ["Bell (if available)"],
  }),
  step({
    id: "dlp-07",
    howSourced: true,
    title: "Kalasha-water worship (Kalasharadhana)",
    teluguTitle: "కలశారాధన",
    mantraTeluguScript:
      "కలశారాధన\n" +
      "కలశస్య ముఖే విష్ణుః కంఠే రుద్ర స్సమాశ్రితః\n" +
      "మూలే తత్ర స్థితో బ్రహ్మా మధ్యే మాతృగణాః స్మృతాః\n" +
      "కుక్షౌతు సాగరా స్సర్వే సప్త ద్వీపా వసుంధరా\n" +
      "ఋగ్వేదో థ యజుర్వేద స్సామవేదో హ్యధర్వణః\n" +
      "అంగైశ్చ సహితా స్సర్వే కలశాంబు సమాశ్రితాః\n" +
      "గంగేచ యమునేచైవ గోదావరి సరస్వతీ\n" +
      "నర్మదా సింధు కావేరి జలేస్మిన్ సన్నిధిం కురు\n\n" +
      "పూజాద్రవ్యాణి దేవం ఆత్మానం సంప్రోక్ష్య",
    mantraTransliteration:
      "kalaSaaraadhana / kalaSasya mukhae vishNu: kaMThae rudra ssamaaSrita: / " +
      "moolae tatra sthitO brahmaa madhyae maatRgaNaa: smRtaa: / kukshautu " +
      "saagaraa ssarvae sapta dveepaa vasuMdharaa / RgvaedO tha yajurvaeda " +
      "ssaamavaedO hyadharvaNa: / aMgaiScha sahitaa ssarvae kalaSaaMbu " +
      "samaaSritaa: / gaMgaecha yamunaechaiva gOdaavari sarasvatee / narmadaa " +
      "siMdhu kaavaeri jalaesmin sannidhiM kuru // poojaadravyaaNi daevaM " +
      "aatmaanaM saMprOkshya",
    what:
      "The verse invokes Vishnu, Rudra, Brahma, the mother-goddesses, the " +
      "seas, the seven worlds, the four Vedas, and the sacred rivers as " +
      "present in the water, which is then used to purify the puja " +
      "materials and oneself.",
    how:
      "Recite the verse while holding the filled kalasha. At the final line, " +
      "sprinkle a little of the kalasha water on the puja materials and on yourself.",
    why: "This treats the kalasha water as sacred before it is used to purify the materials and yourself.",
    minutes: 2,
    teluguPage: 3,
    materials: ["Kalasha", "Clean water"],
  }),

  // Phase D — Ganapati worship
  step({
    id: "dlp-08",
    howSourced: true,
    title: "Ganapati worship (seventeen services)",
    teluguTitle: "గణపతి పూజ",
    mantraTeluguScript:
      "గణపతి పూజ\n" +
      "వక్రతుండ మహాకాయ కోటిసూర్య సమప్రభ\n" +
      "నిర్విఘ్నం కురుమే దేవ సర్వ కార్యేషు సర్వదా\n\n" +
      "ఆదౌ నిర్విఘ్న పరిసమాప్త్యర్థం శ్రీ మహాగణపతి పూజాం కరిష్యే\n\n" +
      "1. శ్రీ మహాగణపతయే నమః – ధ్యాయామి\n" +
      "2. శ్రీ మహాగణపతయే నమః – ఆవాహయామి\n" +
      "3. శ్రీ మహాగణపతయే నమః – ఆసనం సమర్పయామి\n" +
      "4. శ్రీ మహాగణపతయే నమః – పాదయోః పాద్యం సమర్పయామి\n" +
      "5. శ్రీ మహాగణపతయే నమః – హస్తయోః అర్ఘ్యం సమర్పయామి\n" +
      "6. శ్రీ మహాగణపతయే నమః – ఆచమనీయం సమర్పయామి\n" +
      "7. శ్రీ మహాగణపతయే నమః – స్నానం సమర్పయామి.\n" +
      "8. శ్రీ మహాగణపతయే నమః – వస్త్ర యుగ్మం సమర్పయామి\n" +
      "9. శ్రీ మహాగణపతయే నమః – యజ్ఞోపవీతం సమర్పయామి\n" +
      "10. శ్రీ మహాగణపతయే నమః – గంధం సమర్పయామి\n" +
      "11. శ్రీ మహాగణపతయే నమః – పుష్పాణి సమర్పయామి\n" +
      "12. శ్రీ మహాగణపతయే నమః – ధూపమాఘ్రాపయామి\n" +
      "13. శ్రీ మహాగణపతయే నమః – దీపం దర్శయామి\n" +
      "14. శ్రీ మహాగణపతయే నమః – నైవేద్యం సమర్పయామి\n" +
      "   (సత్యం త్వర్తేన పరిషం చామి అమృతమస్తు అమృతోపస్తర నమసి — ప్రాణాయ స్వాహా, " +
      "అపానాయ స్వాహా, వ్యానాయ స్వాహా, ఉదానాయ స్వాహా, సమానాయ స్వాహా)\n" +
      "15. శ్రీ మహాగణపతయే నమః – తాంబూలం సమర్పయామి\n" +
      "16. శ్రీ మహాగణపతయే నమః – నీరాజనం సమర్పయామి\n" +
      "17. శ్రీ మహాగణపతయే నమః – మంత్ర పుష్పం సమర్పయామి, నమస్కారం సమర్పయామి\n\n" +
      "అనయా, యథా శక్తి పూజాయచ – శ్రీమహాగణ పతి దేవతా సుప్రసన్నా, సుప్రీతా దో భవతు, " +
      "శ్రీ మహా గణపతి ప్రసాదం శిరసా గృహ్ణామి",
    mantraTransliteration:
      "gaNapati pooja / vakratuMDa mahaakaaya kOTisoorya samaprabha nirvighnaM " +
      "kurumae daeva sarva kaaryaeshu sarvadaa // aadau nirvighna " +
      "parisamaaptyardhaM Sree mahaagaNapati poojaaM karishyae / Sree " +
      "mahaagaNapatayae nama: - dhyaayaami / ...aavaahayaami / " +
      "...aasanaM samarpayaami / ...paadayO: paadyaM samarpayaami / " +
      "...hastayO: arghyaM samarpayaami / ...aachamaneeyaM samarpayaami / " +
      "...snaanaM samarpayaami. / ...vastra yugmaM samarpayaami / " +
      "...yaj~nOpaveetaM samarpayaami / ...gaMdhaM samarpayaami / " +
      "...pushpaaNi samarpayaami / ...dhoopamaaghraapayaami / " +
      "...deepaM darSayaami / ...naivaedyaM samarpayaami (satyaM tvartaena " +
      "parishaM chaami amRtamastu amRtOpastara Namasi — praaNaaya svaahaa, " +
      "apaanaaya svaahaa, vyaanaaya svaahaa, udaanaaya svaahaa, samaanaaya " +
      "svaahaa) / ...taaMboolaM samarpayaami / ...neeraajanaM samarpayaami / " +
      "...maMtra pushpaM samarpayaami, namaskaaraM samarpayaami // anayaa, " +
      "yathaa Sakti poojaayacha – SreemahaagaNa pati daevataa suprasannaa, " +
      "supreetaa dO bhavatu, Sree mahaa gaNapati prasaadaM Sirasaa gRNhaami",
    what:
      "A complete sixteen/seventeen-service worship of Ganapati, performed " +
      "first so the main worship proceeds without obstacles — the " +
      "traditional role of Ganapati puja at the start of a Hindu ceremony.",
    how:
      "Perform each of the seventeen named services in order: meditate, " +
      "invite, offer a seat, water for the feet, water for the hands, " +
      "sipping water, bathe, offer cloth, offer the sacred thread, offer " +
      "sandal paste, offer flowers, offer incense, show the lamp, offer " +
      "food, offer betel, offer the lamp flame, offer flowers with a bow.",
    why: "Ganapati is worshipped first, in this tradition, so the main worship proceeds without obstacles.",
    minutes: 4,
    teluguPage: 4,
    materials: ["Ganapati representation", "Water", "Cloth", "Thread", "Sandal paste", "Flowers", "Incense", "Lamp", "A small food offering", "Betel", "Camphor"],
  }),

  // Phase E — Mahalakshmi's sixteen-service worship (Shodashopachara)
  step({
    id: "dlp-09",
    title: "Dhyana (meditation)",
    teluguTitle: "ధ్యానం",
    mantraTeluguScript:
      "మహాలక్ష్మీ షోడశోపచార పూజ\n" +
      "ధ్యానం\n" +
      "సరసిజ నయనే సరోజహస్తే\n" +
      "ధవళ తరాంశుక గంధమాల్య శోభే\n" +
      "భగవతి హరివల్లభే మనోజ్ఞే\n" +
      "త్రిభువన భూతికరి ప్రసీదమహ్యం\n\n" +
      "లక్ష్మీం క్షీర సముద్ర రాజ తనయాం శ్రీరంగ ధామేశ్వరీం\n" +
      "దాసీ భూత సమస్త దేవ వనితాం లోకైక దీపాంకురాం\n" +
      "శ్రీ మన్నంద కటాక్ష లబ్ధ విభవత్ బ్రహ్మేంద్ర గంగాధరాం\n" +
      "త్వాం త్రైలోక్య కుటుంబినీం సరసిజాం వందే ముకుంద ప్రియాం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః ధ్యాయామి",
    mantraTransliteration:
      "mahaalakshmee shODaSOpachaara pooja / dhyaanaM / sarasija nayanae " +
      "sarOjahastae dhavaLa taraaMSuka gaMdhamaalya SObhae bhagavati " +
      "harivallabhae manO~m~nae tribhuvana bhootikari praseedamahyam // " +
      "lakshmeeM ksheera samudra raaja tanayaaM SreeraMga dhaamaeSvareeM " +
      "daasee bhoota samasta daeva vanitaaM lOkaika deepaaMkuraaM Sree " +
      "manmaMda kaTaaksha labdha vibhavat brahmaeMdra gaMgaadharaaM tvaaM " +
      "trailOkya kuTuMbineeM sarasijaaM vaMdae mukuMda priyaaM // Sree " +
      "mahaalakshmee daevyai nama: dhyaayaami",
    what:
      "A meditation verse describing Lakshmi — lotus-eyed, lotus-handed, " +
      "radiant in white silk with sandal and garlands, beloved of Hari — " +
      "asking her favour on all three worlds.",
    how: "Recite the meditation verse, picturing Lakshmi's form in your mind.",
    why: "This begins Lakshmi's own sixteen-service worship, right after Ganapati's.",
    minutes: 2,
    teluguPage: 5,
  }),
  step({
    id: "dlp-10",
    howSourced: true,
    title: "Avahana (invocation)",
    teluguTitle: "ఆవాహనం",
    mantraTeluguScript:
      "ఆవాహనం\n" +
      "సహస్రదళ పద్మాస్యాం, స్వస్థాం చ సుమనోహరాం\n" +
      "శాంతాం చ శ్రీహరేః కాంతాం తాం భజే జగతాం ప్రసూమ్\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః ఆవాహయామి",
    mantraTransliteration:
      "aavaahanaM / sahasradaLa padmaasyaaM, svasthaaM cha sumanOharaaM " +
      "SaaMtaaM cha Sreeharae: kaaMtaaM taaM bhajae jagataaM prasoom // Sree " +
      "mahaalakshmee daevyai nama: aavaahayaami",
    what: "The formal invitation, the first of the sixteen services.",
    how: "Respectfully invite the goddess to be present.",
    why: "This formally invites the goddess to be present for the worship.",
    minutes: 1,
    teluguPage: 5,
  }),
  step({
    id: "dlp-11",
    howSourced: true,
    title: "Asana (seat)",
    teluguTitle: "ఆసనం",
    // Selected for app display and audio (master document Section 6.6): P1's
    // own literal "నత్న ఖచిత" / "natna khachita" is NOT an attested word and
    // is preserved only as historical source text, never displayed or used
    // for audio (see docs/pujas/diwali-lakshmi-puja-master.md Section 6.6).
    mantraTeluguScript:
      "ఆసనం\n" +
      "అమూల్య రత్నసారం చ నిర్మితం విశ్వకర్మణా\n" +
      "ఆసనం చ ప్రసన్నం చ మహాదేవి ప్రగృహ్యతామ్\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః రత్న ఖచిత సింహాసనం సమర్పయామి",
    mantraTransliteration:
      "aasanaM / amoolya ratnasaaraM cha nirmitaM viSvakarmaNaa aasanaM cha " +
      "prasannaM cha mahaadaevi pragRhyataam // Sree mahaalakshmee daevyai " +
      "nama: ratna khachita siMhaasanaM samarpayaami",
    what: "A jewel-set throne, made by the divine architect Vishvakarma, is offered as a seat.",
    how: "Offer a seat — symbolically, a clean mat or cushion, or simply the gesture.",
    why: "This offers a seat to the goddess, the second of the sixteen services.",
    minutes: 1,
    teluguPage: 5,
  }),
  step({
    id: "dlp-12",
    howSourced: true,
    title: "Padya (water for the feet)",
    teluguTitle: "పాద్యం",
    mantraTeluguScript:
      "పాద్యం\n" +
      "సురాసుర మహా మౌళీ మాలా మాణిక్య కాంతిభిః\n" +
      "విరాజిత పదద్వంద్వే పాద్యం దేవీ దదామ్యహం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః పాదయోః పాద్యం సమర్పయామి",
    mantraTransliteration:
      "paadyaM / suraasura mahaa mauLee maalaa maaNikya kaaMtibhi: viraajita " +
      "padadvaMdvae paadyaM daevee dadaamyahaM // Sree mahaalakshmee daevyai " +
      "nama: paadayO: paadyaM samarpayaami",
    what: "Water is offered for the feet, described as radiant with the crown-jewels of gods and demons.",
    how: "Offer a little water for the feet into the receiving vessel.",
    why: "This offers water for the feet, the third of the sixteen services.",
    minutes: 1,
    teluguPage: 5,
    materials: ["Clean water", "A receiving vessel"],
  }),
  step({
    id: "dlp-13",
    howSourced: true,
    title: "Arghya (water offering for the hands)",
    teluguTitle: "అర్ఘ్యం",
    mantraTeluguScript:
      "అర్ఘ్యం\n" +
      "పుష్పచందన దూర్వాది సంయుతం జాహ్నవీజలం\n" +
      "శంఖ గర్భ స్థితం శుద్ధం గృహ్యతాం పద్మ వాసినీం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః హస్తయోః అర్ఘ్యం సమర్పయామి",
    mantraTransliteration:
      "arghyaM / pushpachaMdana doorvaadi saMyutaM jaahnaveejalaM SaMkha " +
      "garbha sthitaM SuddhaM gRhyataaM padma vaasineeM // Sree mahaalakshmee " +
      "daevyai nama: hastayO: arghyaM samarpayaami",
    what: "Ganga water, mixed with flowers, sandal, and durva grass, is offered from a conch shell.",
    how: "Offer water, held in a conch if you have one.",
    why: "This offers water for the hands, the fourth of the sixteen services.",
    minutes: 1,
    teluguPage: 6,
    materials: ["Clean water", "A conch (if available)"],
  }),
  step({
    id: "dlp-14",
    title: "Achamaniya (sipping water)",
    teluguTitle: "ఆచమనీయం",
    mantraTeluguScript:
      "ఆచమనీయం\n" +
      "పుణ్య తీర్థోదకం చైవ విశుద్ధం శుద్ధిదం సదా\n" +
      "గృహ్యతాం కృష్ణకాంతే చ రమ్యమాచమనీయకమ్\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః ఆచమనీయం సమర్పయామి",
    mantraTransliteration:
      "aachamaneeyaM / puNya teerthOdakaM chaiva viSuddhaM SuddhidaM sadaa " +
      "gRhyataaM kRshNakaaMtae cha ramyamaachamaneeyakam // Sree mahaalakshmee " +
      "daevyai nama: aachamaneeyaM samarpayaami",
    what: "Sacred, purifying water is offered for ceremonial sipping.",
    how: "Offer a little water for sipping.",
    why: "This offers sacred water for sipping, the fifth of the sixteen services.",
    minutes: 1,
    teluguPage: 6,
    materials: ["Clean water"],
  }),
  step({
    id: "dlp-15",
    howSourced: true,
    title: "Snanam (bath) and achamaniyam",
    teluguTitle: "స్నానం",
    mantraTeluguScript:
      "స్నానం\n" +
      "సుగంధి విష్ణు తైలంచ సుగంధామలకోజ్వలం\n" +
      "దేహ సౌందర్య బీజంచ గృహ్యతాం శ్రీ హరిప్రియే\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః శుద్ధోదక స్నానం సమర్పయామి\n" +
      "స్నానానంతరం ఆచమనీయం సమర్పయామి",
    mantraTransliteration:
      "snaanaM / sugaMdhi vishNu tailaMcha sugaMdhaamalakOjvalaM daeha " +
      "sauMdarya beejaMcha gRhyataaM Sree haripriyae // Sree mahaalakshmee " +
      "daevyai nama: SuddhOdaka snaanaM samarpayaami / snaanaanaMtaraM " +
      "aachamaneeyaM samarpayaami",
    what: "A fragrant, purifying bath is offered, followed by sipping water.",
    how:
      "For a photo, print, or electrical item, never pour water directly on " +
      "it. Offer the water symbolically into a separate vessel while " +
      "reciting, or touch a drop to the frame's edge only if that is safe " +
      "for the specific item.",
    why: "This offers a bath, the sixth of the sixteen services.",
    termNote: "Never pour water directly on a photo, print, or electrical item — offer it symbolically into a separate vessel instead.",
    minutes: 1,
    teluguPage: 6,
    materials: ["Clean water"],
  }),
  step({
    id: "dlp-16",
    howSourced: true,
    title: "Vastram (clothing) and achamaniyam",
    teluguTitle: "వస్త్రం",
    mantraTeluguScript:
      "వస్త్రం\n" +
      "పీతాంబర ధరే దేవీ పీతాంబర సహోదరీ\n" +
      "పీతాంబరం ప్రయచ్ఛామి విద్యుత్ అంగ జటాధరే\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః వస్త్రయుగ్మం సమర్పయామి\n" +
      "వస్త్రయుగ్మ ధారణానంతరం ఆచమనీయం సమర్పయామి",
    mantraTransliteration:
      "vastraM / peetaaMbara dharae daevee peetaaMbara sahOdaree peetaaMbaraM " +
      "prayaChchaami vidyut aMga jaTaadharae // Sree mahaalakshmee daevyai " +
      "nama: vastrayugmaM samarpayaami / vastrayugma dhaaraNaanaMtaraM " +
      "aachamaneeyaM samarpayaami",
    what: "A yellow silk cloth is offered, describing the goddess as wearer of yellow silk.",
    how: "Offer or symbolically place a yellow cloth.",
    why: "This offers clothing, the seventh of the sixteen services.",
    minutes: 1,
    teluguPage: 6,
    materials: ["Yellow or saffron cloth"],
  }),
  step({
    id: "dlp-17",
    title: "Yajnopavitam (sacred thread)",
    teluguTitle: "యజ్ఞోపవీతం",
    mantraTeluguScript:
      "యజ్ఞోపవీతం\n" +
      "శబ్ద బ్రహ్మాత్మికే దేవీ శబ్ద శాస్త్ర కృతాలయే\n" +
      "సౌవర్ణం యజ్ఞ సూత్రంతే, దదామి పరమేశ్వరీ\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః యజ్ఞోపవీతం సమర్పయామి",
    mantraTransliteration:
      "yaj~nOpaveetaM / Sabda brahmaatmikae daevee Sabda Saastra kRtaalayae " +
      "sauvarNaM yaj~na sootraMtae, dadaami paramaeSvaree // Sree " +
      "mahaalakshmee daevyai nama: yaj~nOpaveetaM samarpayaami",
    what: "A gold sacred thread is offered.",
    how: "Offer the sacred thread.",
    why: "This offers the sacred thread, the eighth of the sixteen services.",
    minutes: 1,
    teluguPage: 6,
    materials: ["Sacred thread"],
  }),
  step({
    id: "dlp-18",
    title: "Gandham (sandal paste, turmeric, kumkum)",
    teluguTitle: "గంధం",
    mantraTeluguScript:
      "గంధం\n" +
      "కస్తూరీ కుంకుమైర్ యుక్తం ఘనసార విమిశ్రితం\n" +
      "మలయాచల సంభూతం చందనం ప్రతిగృహ్యతాం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః శ్రీ గంధాన్ ధారయామి\n" +
      "హరిద్రా కుంకుమాది సుగంధ ద్రవ్యాణి సమర్పయామి",
    mantraTransliteration:
      "gaMdhaM / kastooree kuMkumair yuktaM ghanasaara vimiSritaM malayaachala " +
      "saMbhootaM chaMdanaM pratigRhyataaM // Sree mahaalakshmee daevyai " +
      "nama: Sree gaMdhaan dhaarayaami / haridraa kuMkumaadi sugaMdha " +
      "dravyaaNi samarpayaami",
    what: "Sandal paste scented with musk and camphor, along with turmeric and kumkum, is offered.",
    how: "Offer sandal paste, turmeric and kumkum.",
    why: "This offers sandal paste, turmeric and kumkum, the ninth of the sixteen services.",
    minutes: 1,
    teluguPage: 7,
    materials: ["Sandal paste", "Turmeric", "Kumkum"],
  }),
  step({
    id: "dlp-19",
    title: "Pushpam and Abharanam (flowers and ornament)",
    teluguTitle: "పుష్పం - ఆభరణం",
    mantraTeluguScript:
      "పుష్పం - ఆభరణం\n" +
      "తురీయ వన సంభూతం నానా గుణ మనోహరం\n" +
      "ఆనంద సౌరభం పుష్పం గృహ్యతాం ఇదముత్తమం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః పుష్పాణి సమర్పయామి\n\n" +
      "రత్నస్వర్ణవికారంచ దేహాలంకారవర్ధనం\n" +
      "శోభాదానం శ్రీకరం చ భూషణం ప్రతిగృహ్యతామ్\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః ఆభరణాని సమర్పయామి",
    mantraTransliteration:
      "pushpaM - aabharaNaM / tureeya vana saMbhootaM naanaa guNa manOharaM " +
      "aanaMda saurabhaM pushpaM gRhyataaM idamuttamaM // Sree mahaalakshmee " +
      "daevyai nama: pushpaaNi samarpayaami // ratnasvarNavikaaraMcha " +
      "daehaalaMkaaravardhanaM SObhaadaanaM SreekaraM cha bhooshaNaM " +
      "pratigRhyataam // Sree mahaalakshmee daevyai nama: aabharaNaani " +
      "samarpayaami",
    what: "Fragrant flowers and a jewelled ornament are offered.",
    how: "Offer flowers, then an ornament. Use any small piece of jewellery already at hand — do not buy jewellery specially.",
    why: "This offers flowers and an ornament, the tenth and eleventh of the sixteen services.",
    minutes: 1,
    teluguPage: 7,
    materials: ["Flowers", "Ornament (any small piece)"],
  }),
  step({
    id: "dlp-20",
    howSourced: true,
    title: "Anga puja (fifteen names, each part of the body)",
    teluguTitle: "అంగ పూజ",
    mantraTeluguScript:
      "అంగ పూజ\n" +
      "1. చంచలాయై నమః – పాదౌ పూజయామి\n" +
      "2. చపలాయై నమః – జానునీ పూజయామి\n" +
      "3. పీతాంబర ధరాయై నమః – ఊరూం పూజయామి\n" +
      "4. కమలవాసిన్యై నమః – కటిం పూజయామి\n" +
      "5. పద్మాలయాయై నమః – నాభిం పూజయామి\n" +
      "6. మదన మాత్రే నమః – స్తనౌ పుజయామి\n" +
      "7. లలితాయై నమః – భుజద్వయం పూజయామి\n" +
      "8. కంబుకంఠ్యై నమః – కంఠం పూజయామి\n" +
      "9. సుముఖాయై నమః – ముఖం పూజయామి\n" +
      "10. శ్రియై నమః – ఓష్ఠౌ పూజయామి\n" +
      "11. సునాసికాయై నమః – నాసికాం పూజయామి\n" +
      "12. సునేత్రాయై నమః – నేత్రే పూజయామి\n" +
      "13. రమాయై నమః – కర్ణౌ పూజయామి\n" +
      "14. కమలాయై నమః – శిరః పూజయామి\n" +
      "15. శ్రీ మహా లక్ష్మీదేవ్యై నమః – సర్వాణ్యంగాని పూజయామి",
    mantraTransliteration:
      "aMga pooja / chaMchalaayai nama: - paadau poojayaami / chapalaayai " +
      "nama: - jaanunee poojayaami / peetaaMbara dharaayai nama: - oorooM " +
      "poojayaami / kamalavaasinyai nama: - kaTiM poojayaami / " +
      "padmaalayaayai nama: - naabhiM poojayaami / madana maatrae nama: - " +
      "stanau pujayaami / lalitaayai nama: - bhujadvayaM poojayaami / " +
      "kaMbukaMThyai nama: - kaMThaM poojayaami / sumukhaayai nama: - " +
      "mukhaM poojayaami / Sriyai nama: - OshThau poojayaami / sunaasikaayai " +
      "nama: - naasikaaM poojayaami / sunaetraayai nama: - naetrae " +
      "poojayaami / ramaayai nama: - karNau poojayaami / kamalaayai nama: - " +
      "Sira: poojayaami / Sree mahaa lakshmeedaevyai nama: - sarvaaNyaMgaani " +
      "poojayaami",
    what: "Fifteen names of the goddess, each paired with a part of the body, worshipped in turn.",
    how: "Offer a pinch of akshata or a flower at each named part, in order.",
    why: "This worships the goddess's own form, part by part, by name.",
    minutes: 3,
    teluguPage: 7,
    materials: ["Akshata or flowers"],
  }),

  // Phase F — Lakshmi Ashtottara Shatanama Stotram
  step({
    id: "dlp-21",
    howSourced: true,
    title: "Lakshmi Ashtottara Shatanama Stotram",
    teluguTitle: "లక్ష్మీ అష్టోత్తర శతనామావళి",
    mantraTeluguScript:
      "లక్ష్మీ అష్టోత్తర శతనామావళి\n\n" +
      "వందే పద్మకరాం ప్రసన్నవదనాం సౌభాగ్యదాం భాగ్యదాం\n" +
      "హస్తాభ్యామభయప్రదాం మణిగణైః నానావిధైః భూషితామ్\n" +
      "భక్తాభీష్ట ఫలప్రదాం హరిహర బ్రహ్మాధిభిస్సేవితాం\n" +
      "పార్శ్వే పంకజ శంఖపద్మ నిధిభిః యుక్తాం సదా శక్తిభిః\n\n" +
      "సరసిజ నయనే సరోజహస్తే ధవళ తరాంశుక గంధమాల్య శోభే\n" +
      "భగవతి హరివల్లభే మనోజ్ఞే\n" +
      "త్రిభువన భూతికరి ప్రసీదమహ్యం\n\n" +
      "ఓం ప్రకృతిం, వికృతిం, విద్యాం, సర్వభూత హితప్రదామ్\n" +
      "శ్రద్ధాం, విభూతిం, సురభిం, నమామి పరమాత్మికామ్ 1\n" +
      "వాచం, పద్మాలయాం, పద్మాం, శుచిం, స్వాహాం, స్వధాం, సుధామ్\n" +
      "ధన్యాం, హిరణ్యయీం, లక్ష్మీం, నిత్యపుష్టాం, విభావరీమ్ 2\n" +
      "అదితిం చ, దితిం, దీప్తాం, వసుధాం, వసుధారిణీమ్\n" +
      "నమామి కమలాం, కాంతాం, క్షమాం, క్షీరోద సంభవామ్ 3\n" +
      "అనుగ్రహపరాం, బుద్ధిం, అనఘాం, హరివల్లభామ్\n" +
      "అశోకా, అమృతాం దీప్తాం, లోకశోక వినాశినీమ్ 4\n" +
      "నమామి ధర్మనిలయాం, కరుణాం, లోకమాతరం\n" +
      "పద్మప్రియాం, పద్మహస్తాం, పద్మాక్షీం, పద్మసుందరీమ్ 5\n" +
      "పద్మోద్భవాం, పద్మముఖీం, పద్మనాభప్రియాం, రమామ్\n" +
      "పద్మమాలాధరాం, దేవీం, పద్మినీం, పద్మగంధినీమ్ 6\n" +
      "పుణ్యగంధాం, సుప్రసన్నాం, ప్రసాదాభిముఖీం, ప్రభామ్\n" +
      "నమామి చంద్రవదనాం, చంద్రాం, చంద్రసహోదరీమ్ 7\n" +
      "చతుర్భుజాం, చంద్రరూపాం, ఇందిరా, మిందుశీతలామ్\n" +
      "ఆహ్లాద జననీం, పుష్టిం, శివాం, శివకరీం, సతీమ్ 8\n" +
      "విమలాం, విశ్వజననీం, పుష్టిం, దారిద్ర్య నాశినీం\n" +
      "ప్రీతి పుష్కరిణీం, శాంతాం, శుక్లమాల్యాంబరాం, శ్రియమ్ 9\n" +
      "భాస్కరీం, బిల్వనిలయాం, వరారోహాం, యశస్వినీం\n" +
      "వసుంధరా, ముదారాంగాం, హరిణీం, హేమమాలినీం 10\n" +
      "ధనధాన్యకరీం, సిద్ధిం, స్త్రైణసౌమ్యాం, శుభప్రదామ్\n" +
      "నృపవేశ్మ గతానందాం, లక్ష్మీం, వసుప్రదామ్ 11\n" +
      "శుభాం, హిరణ్యప్రాకారాం, సముద్రతనయాం, జయామ్\n" +
      "నమామి మంగళాం దేవీం, విష్ణు వక్షఃస్థల స్థితామ్ 12\n" +
      "విష్ణుపత్నీం, ప్రసన్నాక్షీం, నారాయణ సమాశ్రితామ్\n" +
      "దారిద్ర్య ధ్వంసినీం, దేవీం, సర్వోపద్రవ వారిణీమ్ 13\n" +
      "నవదుర్గాం, మహాకాళీం, బ్రహ్మ విష్ణు శివాత్మికాం\n" +
      "త్రికాలజ్ఞాన సంపన్నాం, నమామి భువనేశ్వరీమ్ 14\n\n" +
      "లక్ష్మీం క్షీరసముద్రరాజ తనయాం శ్రీరంగధామేశ్వరీమ్\n" +
      "దాసీభూత సమస్తదేవ వనితాం లోకైక దీపాంకురామ్\n" +
      "శ్రీమన్నంద కటాక్ష లబ్ధ విభవద్-బ్రహ్మేంద్ర గంగాధరామ్\n" +
      "త్వాం త్రైలోక్య కుటుంబినీం సరసిజాం వందే ముకుందప్రియామ్ 15\n\n" +
      "మాతర్నమామి! కమలే! కమలాయతాక్షి!\n" +
      "శ్రీ విష్ణు హృత్-కమలవాసిని! విశ్వమాతః!\n" +
      "క్షీరోదజే కమల కోమల గర్భగౌరి!\n" +
      "లక్ష్మీ! ప్రసీద సతతం సమతాం శరణ్యే 16",
    mantraTransliteration: "",
    what:
      "A sixteen-verse hymn (not a plain list of 108 names) in praise of " +
      "Lakshmi under many epithets — including, in verse 14, Navadurga and " +
      "Mahakali among her identifications, and the closing verse addressing " +
      "her directly as \"Mother\".",
    how:
      "Read unhurried, with pauses between verses. This is a continuous " +
      "hymn, not 108 separately offered names.",
    why: "This is a devotional hymn in praise of the goddess under many names.",
    minutes: 6,
    teluguPage: 8,
  }),

  // Phase G — Dhupa, deepa, naivedya, tambula, neerajana
  step({
    id: "dlp-22",
    howSourced: true,
    title: "Dhupam (incense)",
    teluguTitle: "ధూపం",
    mantraTeluguScript:
      "ధూపం\n" +
      "వృక్ష నిర్యాస రూపంచ గంధ ద్రవ్యాది సంయుతం\n" +
      "శ్రీకృష్ణకాంతే ధూపం చ పవిత్రం ప్రతిగృహ్యతామ్\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః ధూపం ఆఘ్రాపయామి",
    mantraTransliteration:
      "dhoopaM / vRksha niryaasa roopaMcha gaMdha dravyaadi saMyutaM " +
      "SreekRshNakaaMtae dhoopaM cha pavitraM pratigRhyataam // Sree " +
      "mahaalakshmee daevyai nama: dhoopaM aaghraapayaami",
    what: "Fragrant incense, a tree resin, is offered.",
    how: "Use incense only if safe to do so; ventilate the room; skip entirely for respiratory sensitivity.",
    why: "This offers fragrant incense, the twelfth of the sixteen services.",
    termNote: "Skip incense entirely for respiratory sensitivity — this is a practical accommodation, not a ritual requirement.",
    minutes: 1,
    teluguPage: 10,
    materials: ["Incense"],
  }),
  step({
    id: "dlp-23",
    howSourced: true,
    title: "Deepam (lamp)",
    teluguTitle: "దీపం",
    mantraTeluguScript:
      "దీపం\n" +
      "జగచ్చక్షుః స్వరూపంచ ప్రాణరక్షణ కారణం\n" +
      "ప్రదీపం శుద్ధరూపంచ గృహ్యతాం పరమేశ్వరి\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః దీపం దర్శయామి",
    mantraTransliteration:
      "deepaM / jagachchakshu: svaroopaMcha praaNarakshaNa kaaraNaM pradeepaM " +
      "SuddharoopaMcha gRhyataaM paramaeSvari // Sree mahaalakshmee daevyai " +
      "nama: deepaM darSayaami",
    what: "The lamp, described as the world's eye and the source of life's protection, is shown.",
    how: "An adult handles the flame, kept away from children, hair, and fabric.",
    why: "This shows the lamp to the goddess, the thirteenth of the sixteen services.",
    termNote: "An adult handles the flame, kept away from children, hair, and fabric.",
    minutes: 1,
    teluguPage: 10,
    materials: ["Lamp"],
  }),
  step({
    id: "dlp-24",
    howSourced: true,
    title: "Naivedyam (food offering)",
    teluguTitle: "నైవేద్యం",
    // Selected for app display and audio (master document Section 6.2): P1's
    // own Durga-addressed descriptive verse ("gRhaaNa durgae naivaedyaM,
    // mahishaasura mardini") is historical source text only, never displayed
    // or used for audio. The selected recitation is P1's own immediately
    // adjacent Lakshmi-addressed operative line.
    mantraTeluguScript:
      "నైవేద్యం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః నైవేద్యం సమర్పయామి\n\n" +
      "ఋతం త్వా సత్యేన పరిషించామి (సాయంత్రం)\n" +
      "అమృతమస్తు అమృతోపస్తరణమసి\n\n" +
      "ఓం ప్రాణం నమః– అపానం నమః – వ్యానం నమః\n" +
      "ఉదానం నమః – సమానం నమః\n" +
      "మధ్యే మధ్యే పానీయం సమర్పయామి – అమృతమస్తు అమృతాపిధానమసి\n" +
      "ఉత్తరా పోషనం సమర్పయామి, హస్తౌ ప్రక్షాళనం సమర్పయామి\n" +
      "పాద ప్రక్షాళనం సమర్పయామి, శుద్ధాచమనీయం సమర్పయామి",
    mantraTransliteration:
      "naivaedyaM / Sree mahaalakshmee daevyai nama: naivaedyaM samarpayaami " +
      "// RtaM tvaa satyaena parishiMchaami (Eve) amRtamastu " +
      "amRtOpastaraNamasi // OM praaNaM nama:- apaanaM nama: - vyaanaM nama: " +
      "udaanaM nama: - samaanaM nama: madhyae madhyae paaneeyaM samarpayaami " +
      "- amRtamastu amRtaapidhaanamasi uttaraa pOSanaM samarpayaami, hastau " +
      "prakshaaLanaM samarpayaami paada prakshaaLanaM samarpayaami, " +
      "SuddhaachamaneeyaM samarpayaami",
    what:
      "A sweet offering of sugar and honey, filled with ghee, is offered. " +
      "The recitation uses P1's own Lakshmi-addressed offering line, which " +
      "appears in P1 immediately after a descriptive verse that names Durga " +
      "— that verse is not used here (see the master document, Section 6.2).",
    how:
      "Place the food offering, then recite the offering line, then offer " +
      "small sips/touches of water as the lines direct (water offered " +
      "between courses; final hand- and foot-washing water).",
    why: "This offers food to the goddess, the fourteenth of the sixteen services.",
    minutes: 2,
    teluguPage: 10,
    materials: ["A sweet food offering", "Clean water"],
  }),
  step({
    id: "dlp-25",
    howSourced: true,
    title: "Tambulam (betel)",
    teluguTitle: "తాంబూలం",
    mantraTeluguScript:
      "తాంబూలం\n" +
      "తాంబూలం చ వరం రమ్యం కర్పూరాది సువాసితం\n" +
      "జిహ్వా జాడ్య చ్ఛేదకరం తాంబూలం ప్రతిగృహ్యతాం\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః తాంబూలం సమర్పయామి",
    mantraTransliteration:
      "taaMboolaM / taaMboolaM cha varaM ramyaM karpooraadi suvaasitaM jihvaa " +
      "jaaDya chChaedakaraM taaMboolaM pratigRhyataaM // Sree mahaalakshmee " +
      "daevyai nama: taaMboolaM samarpayaami",
    what: "Betel leaf scented with camphor, said to clear dullness of the tongue, is offered.",
    how:
      "If betel leaf and areca nut are unavailable, recite the verse in " +
      "full and offer a pinch of akshata or a flower instead. Never " +
      "substitute alcohol or tobacco.",
    why: "This offers betel, the fifteenth of the sixteen services.",
    termNote: "Never substitute alcohol or tobacco for tambulam, under any circumstance.",
    minutes: 1,
    teluguPage: 11,
    materials: ["Betel leaves and areca nut"],
  }),
  step({
    id: "dlp-26",
    howSourced: true,
    title: "Neerajanam (aarti / camphor flame)",
    teluguTitle: "నీరాజనం",
    mantraTeluguScript:
      "నీరాజనం\n" +
      "సంమ్రాజం చ విరాజంచా భి శ్రీర్ యా చ నో గృహే\n" +
      "లక్ష్మీ రాష్ట్రస్య యా ముఖే తయా మా సం సృజామసి\n" +
      "కర్పూర దీప తేజస్త్వం అజ్ఞాన తిమిరాపహ\n" +
      "దేవీ ప్రీతికరం చైవ మమ సౌఖ్యం వివర్ధయ\n" +
      "సంతత శ్రీరస్తు సమస్త మంగళాని భవంతు నిత్య శ్రీరస్తు నిత్యమంగళాని భవంతు\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః కర్పూర నీరాజనం సమర్పయామి",
    mantraTransliteration:
      "neeraajanaM / saMmraajaM cha viraajaMchaa bhi Sreer yaa cha nO gRhae " +
      "lakshmee raashTrasyayaa mukhae tayaa maa saM sRjaamasi // karpoora " +
      "deepa taejastvaM aj~naana timiraapaha daevee preetikaraM chaiva mama " +
      "saukhyaM vivardhaya saMtata Sreerastu samasta maMgaLaani bhavaMtu " +
      "nitya Sreerastu nityamaMgaLaani bhavaMtu // Sree mahaalakshmee daevyai " +
      "nama: karpoora neeraajanaM samarpayaami",
    what:
      "A verse invoking Lakshmi's presence in the home, followed by the " +
      "camphor-flame offering, as the destroyer of ignorance's darkness and " +
      "the source of wellbeing and auspiciousness.",
    how: "An adult offers the camphor flame, moving it slowly over a heat-safe plate; never burn camphor in the palm.",
    why: "This offers the camphor flame, the sixteenth and final named service.",
    termNote: "An adult offers the camphor flame; never burn camphor directly in the palm.",
    minutes: 1,
    teluguPage: 11,
    materials: ["Camphor", "A heat-safe plate"],
  }),

  // Phase H — Closing
  step({
    id: "dlp-27",
    howSourced: true,
    title: "Mantrapushpam and atma-pradakshina-namaskaram",
    teluguTitle: "మంత్రపుష్పం - నమస్కారం",
    mantraTeluguScript:
      "మంత్రపుష్పం - నమస్కారం\n" +
      "పద్మాసనే పద్మకరే సర్వ లోకైక పూజితే\n" +
      "నారాయణే ప్రియే దేవీ సుప్రీతో భవ సర్వదా\n\n" +
      "శ్రీ మహాలక్ష్మీ దేవ్యై నమః సువర్ణ దివ్య మంత్రపుష్పం సమర్పయామి\n" +
      "ఆత్మ ప్రదక్షిణ నమస్కారాన్ సమర్పయామి",
    mantraTransliteration:
      "maMtrapushpaM - namaskaaraM / padmaasanae padmakarae sarva lOkaika " +
      "poojitae naaraayaNae priyae daevee supreetO bhava sarvadaa // Sree " +
      "mahaalakshmee daevyai nama: suvarNa divya maMtrapushpaM samarpayaami " +
      "/ aatma pradakshiNa namaskaaraan samarpayaami",
    what: "A golden flower-offering, followed by circling in place and a bow.",
    how: "\"Atma pradakshina\" means circling in place where there is no room to walk around the altar; bow with folded hands.",
    why: "This offers a final flower and a respectful circumambulation and bow.",
    minutes: 1,
    teluguPage: 12,
    materials: ["Flowers"],
  }),
  step({
    id: "dlp-28",
    howSourced: true,
    title: "Mental royal offerings (rajopachara)",
    teluguTitle: "రాజోపచారాలు",
    mantraTeluguScript:
      "ఛత్ర చామర గీత నృత్య ఆందోళికా అశ్వారోహణ గజారోహణ\n" +
      "సమస్త రాజోపచారాన్ మనసా సమర్పయామి",
    mantraTransliteration:
      "Chatra chaamara geeta nRtya aaMdOLikaa aSvaarOhaNa gajaarOhaNa samasta " +
      "raajOpacharaan manasaa samarpayaami",
    what:
      "Royal honours too elaborate to offer physically — umbrella, fan, " +
      "music, dance, a palanquin ride, horse and elephant processions — are " +
      "offered mentally.",
    how: "No physical items are needed. Recite the verse, offering these royal honours in your mind.",
    why: "This mentally offers royal honours too elaborate to give physically.",
    minutes: 1,
    teluguPage: 12,
  }),
  step({
    id: "dlp-29",
    title: "Completion verses",
    teluguTitle: "పూజా సమాప్తి శ్లోకం",
    mantraTeluguScript:
      "యస్య స్మృత్యాచ నామోక్త్యా తపః పూజా క్రియాదిషు:\n" +
      "న్యూనం సంపూర్ణతాం యాతి సద్యో వందే తమచ్యుతం\n" +
      "మంత్ర హీనం క్రియాహీనం భక్తిహీనం జనార్దని,\n" +
      "యత్పూజితం మాయా దేవి పరిపూర్ణం తదస్తుతే\n" +
      "అనయా యధా శక్తి పూజయాచ భగవతీ సర్వాత్మికా\n" +
      "శ్రీ మహ లక్ష్మీ దేవతా సుప్రసన్నః స్సుప్రీతో దో భవతు",
    mantraTransliteration:
      "yasya smRtyaacha naamOktyaa tapa: poojaa kriyaadishu: nyoonaM " +
      "saMpoorNataaM yaati sadyO vaMdae tamachyutaM / maMtra heenaM " +
      "kriyaaheenaM bhaktiheenaM janaardani, yatpoojitaM maayaa daevi " +
      "paripoorNaM tadastutae / anayaa yadhaa Sakti poojayaacha bhagavatee " +
      "sarvaatmikaa Sree mahaa lakshmee daevataa suprasanna: ssupreetO dO " +
      "bhavatu",
    what:
      "A traditional verse asking that any imperfection in the worship — " +
      "missing a mantra, missing an act, missing devotion — be made whole " +
      "by her remembrance, and that the goddess be pleased with this " +
      "worship done to the best of one's ability.",
    how: "Recite the verse, asking that any imperfection in the worship be forgiven.",
    why: "This asks that any shortfall in the worship be forgiven and made whole.",
    minutes: 1,
    teluguPage: 12,
  }),
  step({
    id: "dlp-30",
    title: "Welfare and peace verses",
    teluguTitle: "శాంతి మంత్రాలు",
    mantraTeluguScript:
      "స్వస్తి ప్రజాభ్యః పరిపాలయంతాం న్యాయేన మార్గేన మహీం మహీశా\n" +
      "గో బ్రాహ్మణేభ్యః శుభమస్తు నిత్యం, లోకాః సమస్తా సుఖినో భవంతు.\n" +
      "కాలే వర్షతు పర్జన్యః పృథివీ సస్య శాలినీ\n" +
      "దేశోయం క్షోభ రహితో బ్రహ్మణా సంతు నిర్భయః\n" +
      "అపుత్రాః పుత్రిణః స్సంతు పుత్రిణ స్సంతుపౌత్రిణః\n" +
      "అధనాః స్సధనాః సంతు జీవంతు శరదాం శతం",
    mantraTransliteration:
      "svasti prajaabhya: paripaalayaMtaaM nyaayaena maargaena maheeM " +
      "maheeSaa / gO braahmaNaebhya: Subhamastu nityaM, lOkaa: samastaa " +
      "sukhinO bhavaMtu. / kaalae varshatu parjanya: pRthivee sasya Saalinee " +
      "/ daeSOyaM kshObha rahitO brahmaNaa saMtu nirbhaya: / aputraa: " +
      "putriNa: ssaMtu putriNa ssaMtupautriNa: / adhanaa: ssadhanaa: saMtu " +
      "jeevaMtu SaradaaM SataM",
    what:
      "General Sanskrit welfare verses, wishing just rule, timely rain, " +
      "fearlessness, and prosperity for all beings — not specific to any " +
      "one family's circumstances.",
    how: "Recite the verse, wishing wellbeing for all beings.",
    why: "This is a closing wish for universal wellbeing, the last recitation P1 prints.",
    minutes: 1,
    teluguPage: 12,
  }),
  step({
    id: "dlp-31",
    title: "Practical completion",
    teluguTitle: "పూజ ముగింపు",
    mantraTeluguScript: null,
    mantraTransliteration: "",
    what: "A practical close: share prasadam, clean up safely, and never leave an unattended flame.",
    how:
      "Conclude respectfully, handle prasadam and water safely, and " +
      "extinguish all flames before leaving the space. If the kalasha/" +
      "materials were set up specifically for this puja (not part of a " +
      "permanent household shrine), you may clear them respectfully once " +
      "you feel the worship is complete — there is no sourced instruction " +
      "for exactly when or how.",
    why: "The source prints no closing instructions beyond the welfare verses — this is editorial, practical guidance only.",
    termNote: "Extinguish all flames before leaving the space.",
    minutes: 3,
    teluguPage: null,
  }),
];
