// Recovered Telugu-script text for the Vinayaka Chavithi puja candidate.
//
// The Telugu Lyrics PDF's *text layer* is corrupt (a subsetted font whose
// ToUnicode CMap reorders vowel signs and inserts spurious viramas), so
// pdftotext / mutool both return mangled conjuncts. The *rendered glyphs*, on
// the other hand, are clean. This file is therefore a transcription of the
// rendered pages, not of the text layer and not from model memory:
//
//   1. pdftoppm -r 400 renders each relevant page to PNG.
//   2. tesseract 5.3.4 (tel + san) OCR produces a first-pass scaffold.
//   3. Each line is read off the rendered page and compared against (a) the
//      OCR scaffold and (b) the English-PDF transliteration already stored in
//      ./candidate.ts, line by line.
//   4. Anything that cannot be resolved with confidence is left in
//      `uncertainTokens` with a note - it is never "corrected" to what the
//      mantra is assumed to say.
//   5. Dense / multi-column pages are marked
//      `transcriptionCheckRequired: true` (BETA_TRANSCRIPTION_CHECK_REQUIRED)
//      so a reviewer re-checks the whole block against the source.
//
// Printed source quirks are kept verbatim, not normalised: word-internal
// spaces the compiler inserted ("శుక్లాం బరధరం", "త్రి విక్రమాయ"),
// "నామని" for నామాని, "సర్వకారేషు" for సర్వకార్యేషు (both PDFs agree),
// and the mixed "నమ:" / "నమః" visarga forms.
//
// Nothing here changes any review status. Every candidate step stays
// REVIEW_REQUIRED and locked; this only fills the Telugu-script slot that was
// previously withheld.

export const TELUGU_RECOVERY_METHOD =
  "Transcribed from a 400 DPI pdftoppm render of \"Vinayaka Chaviti Puja - " +
  "Telugu Lyrics.pdf\", with tesseract (tel+san) OCR as a scaffold and the " +
  "English-PDF transliteration as a line-by-line cross-check. The PDF text " +
  "layer is corrupt and was not used. Unresolved glyphs are listed, not guessed.";

/** Internal marker for a passage a reviewer must re-check against the source. */
export const BETA_TRANSCRIPTION_CHECK_REQUIRED = "BETA_TRANSCRIPTION_CHECK_REQUIRED";

export type TeluguConfidence = "HIGH" | "MEDIUM";

export interface TeluguUncertainToken {
  /** The exact substring in question, as transcribed. */
  token: string;
  /** Why it is flagged (glyph confusion, unusual sandhi, source typo kept, …). */
  note: string;
}

export interface TeluguRecoveryEntry {
  /** Matches a candidate step id, or "sankalpam" / "ashtottara" / "patri". */
  id: string;
  /** 1-based page in the Telugu Lyrics PDF the text was read from. */
  sourcePage: number;
  /** The recovered Telugu-script text, newline-separated by printed line. */
  teluguScript: string;
  confidence: TeluguConfidence;
  uncertainTokens: readonly TeluguUncertainToken[];
  /** true => a reviewer must re-check this whole block before it is trusted. */
  transcriptionCheckRequired: boolean;
}

function lines(...l: string[]): string {
  return l.join("\n");
}

/** Every mantra/kriya step's recovered Telugu, keyed by candidate step id.
 * The Vrata Katha (step 33) is prose and stays withheld - it is not here. */
export const TELUGU_RECOVERY: Readonly<Record<string, TeluguRecoveryEntry>> = {
  "dhyana-shloka": {
    id: "dhyana-shloka",
    sourcePage: 2,
    teluguScript: lines(
      "శుక్లాం బరధరం విష్ణుం – శశివర్ణం చతుర్భుజం",
      "ప్రసన్న వదనం ధ్యాయేత్ – సర్వ విఘ్నోప శాంతయే",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "శుక్లాం బరధరం", note: "Printed with a word-internal space in the source; kept verbatim." },
    ],
    transcriptionCheckRequired: false,
  },
  achamana: {
    id: "achamana",
    sourcePage: 2,
    teluguScript: lines(
      "ఓం కేశవాయ స్వాహా — ఓం నారాయణాయ స్వాహా",
      "ఓం మాధవాయ స్వాహా — ఓం గోవిందాయ నమః",
      "విష్ణవే నమః — మధుసూదనాయ నమః",
      "త్రి విక్రమాయ నమః — వామనాయ నమః",
      "శ్రీధరాయ నమః — హృషీకేశాయ నమః",
      "పద్మనాభాయ నమః — దామోదరాయ నమః",
      "సంకర్షణాయ నమః — వాసుదేవాయ నమ",
      "ప్రద్యు మ్నాయ నమః — అనిరుద్ధాయ నమః",
      "పురుషోత్తమాయ నమః — అధోక్షజాయ నమః",
      "నారసింహాయ నమః — అచ్యుతాయ నమః",
      "జనార్దనాయ నమః — ఉపేంద్రాయ నమః",
      "హరయే నమః — శ్రీ కృష్ణాయ నమ",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "ప్రద్యు మ్నాయ", note: "Word-internal space printed in the source (name 15); kept verbatim." },
      { token: "నమ", note: "Names 14 and 24 print the visarga-less \"నమ\"; matches the English PDF." },
    ],
    transcriptionCheckRequired: false,
  },
  "bhuta-shuddhi": {
    id: "bhuta-shuddhi",
    sourcePage: 2,
    teluguScript: lines(
      "ఉత్తిష్టంతు భూతపిశాచాః ఏతే భూమి భారకాః",
      "ఏతేషా మవిరోధేన బ్రహ్మకర్మ సమారభే",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  pranayama: {
    id: "pranayama",
    sourcePage: 2,
    teluguScript: lines(
      "పూరకం కుంభకం చైవ రేచకం తదనంతరం",
      "ప్రాణాయామ మిదం ప్రోక్తం సర్వ దేవ నమస్కృతం",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  sankalpa: {
    id: "sankalpa",
    sourcePage: 3,
    teluguScript: lines(
      "మమ ఉపాత్త సమస్త దురితక్షయ ద్వారా శ్రీ వరసిద్ధి వినాయక దేవతా ప్రీత్యర్ధం ,",
      "శుభే శోభనే ముహూర్తే, సమస్త దేవతా బ్రాహ్మణ హరిహర గురు చరణ సన్నిధౌ,",
      "అస్మాకం సహ కుటుంబానాం క్షేమ స్థైర్య విజయ అభయ ఆయురారోగ్య ఐశ్వర్య అభివృద్ధ్యర్ధం,",
      "ధర్మార్ధ కామ మోక్ష చతుర్విధ పురుషార్థ ఫల సిధ్యర్థం,",
      "ధన ధాన్య సమృద్ధ్యర్థం , ఇష్ట కామ్యార్థ సిధ్యర్థం, సకల లోక కల్యాణార్థం,",
      "సర్వ విఘ్న నివారణార్ధం, వేద సంప్రదాయాభివృద్యర్ధం , అస్మిన్ దేశే గోవధ నిషేధార్ధం,",
      "గో సంరక్షణార్ధం , శ్రీ వరసిద్ధి వినాయక దేవతాం ఉద్దిశ్య యావచ్ఛక్తి ధ్యాన",
      "ఆవాహనాది షోడశోపచార పూజాం కరిష్యే!",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "వేద సంప్రదాయాభివృద్యర్ధం", note: "Source prints \"వృద్యర్ధం\" (single ధ) mid-phrase where \"వృద్ధ్యర్ధం\" is expected; matches the English PDF's \"vRdyardhaM\"." },
    ],
    transcriptionCheckRequired: false,
  },
  ghanta: {
    id: "ghanta",
    sourcePage: 3,
    teluguScript: lines(
      "ఆగమార్ధంతు దేవానాం గమనార్ధం తు రాక్షసాం",
      "కురు ఘంటారవం తత్ర దేవతాహ్వాన లాంఛనమ్",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  "kalasha-aradhana": {
    id: "kalasha-aradhana",
    sourcePage: 3,
    teluguScript: lines(
      "కలశస్య ముఖే విష్ణుః కంఠే రుద్ర స్సమాశ్రితః",
      "మూలే తత్ర స్థితో బ్రహ్మా మధ్యే మాతృగణాః స్మృతాః",
      "కుక్షౌతు సాగరా స్సర్వే సప్త ద్వీపా వసుంధరా",
      "ఋగ్వేదో థ యజుర్వేద స్సామవేదో హ్యధర్వణః",
      "అంగైశ్చ సహితా స్సర్వే కలశాంబు సమాశ్రితాః",
      "గంగేచ యమునేచైవ గోదావరి సరస్వతీ",
      "నర్మదా సింధు కావేరి జలేస్మిన్ సన్నిధిం కురు",
      "పూజాద్రవ్యాణి దేవం ఆత్మానం సంప్రోక్ష్య",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  "ganapati-prarthana": {
    id: "ganapati-prarthana",
    sourcePage: 3,
    teluguScript: lines(
      "ఆదౌ నిర్విఘ్న పరిసమాప్త్యర్ధం శ్రీ గణాధిపతి ప్రార్ధనాం కరిష్యే",
      "వక్రతుండ మహాకాయ కోటిసూర్య సమప్రభ",
      "నిర్విఘ్నం కురుమే దేవ సర్వ కార్యేషు సర్వదా",
      "సుముఖశ్చైక దంతశ్చ కపిలో గజకర్ణకః",
      "లంబోదరశ్చ వికటో విఘ్నరాజో గణాధిప",
      "ధూమకేతు ర్గణాధ్యక్షః ఫాలచంద్రో గజాననః",
      "వక్రతుండ శ్శూర్పకర్ణో హేరంభః స్కంధపూర్వజః",
      "షోడశైతాని నామని యఃపఠేచ్ఛృణుయాదపి.",
      "విద్యారంభే వివాహేచ ప్రవేశే నిర్గమే తథా,",
      "సంగ్రామే సర్వకారేషు విఘ్నస్తస్య నజాయతే",
    ),
    confidence: "MEDIUM",
    uncertainTokens: [
      { token: "నామని", note: "Source prints \"నామని\" where \"నామాని\" is expected; both PDFs agree (English: \"naamani\"). Kept verbatim." },
      { token: "సర్వకారేషు", note: "Source prints \"సర్వకారేషు\" where \"సర్వకార్యేషు\" is expected; both PDFs agree (English: \"sarvakaaraeshu\"). Kept verbatim." },
    ],
    transcriptionCheckRequired: true,
  },
  dhyana: {
    id: "dhyana",
    sourcePage: 4,
    teluguScript: lines(
      "భవసంచిత పాపౌఘ విధ్వంసన విచక్షణం",
      "విఘ్నాంధకార భాస్వంతం విఘ్నరాజ మహంభజే",
      "ఏకదంతం శూర్పకర్ణం గజవక్త్రం చతుర్భుజం",
      "పాశాంకుశ ధరం దేవం ధ్యాయే త్సిద్ధివినాయకం",
      "ఉత్తమం గణనాథస్య వ్రతం సంపత్కరం శుభం",
      "భక్తాభీష్టప్రదం తస్మాత్ ధ్యాయేత్తం విఘ్ననాయకమ్",
      "ధాయేద్గజాననం దేవం తప్తకాంచన సన్నిభం",
      "చతుర్భుజం మహాకాయం సర్వాభరణభూషితం",
      "శ్రీ మహాగణాధిపతయే నమః ధ్యాయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "ధాయేద్గజాననం", note: "Source prints \"ధాయేద్\" where \"ధ్యాయేద్\" is expected; matches the English PDF's \"dhaayaed\"." },
    ],
    transcriptionCheckRequired: false,
  },
  avahana: {
    id: "avahana",
    sourcePage: 4,
    teluguScript: lines(
      "అత్రాగచ్చ జగద్వంద్య సురరాజార్చితేశ్వర",
      "అనాథనాథ సర్వజ్ఞ గౌరీగర్భ సముద్భవ",
      "శ్రీ మహాగణాధిపతయే నమః ఆవహయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  asana: {
    id: "asana",
    sourcePage: 4,
    teluguScript: lines(
      "మౌక్తికైః పుష్యరాగైశ్చ నానారత్నైర్విరాజితం",
      "రత్న సింహాసనం చారు ప్రీత్యర్థం ప్రతిగృహ్యతాం",
      "శ్రీ మహాగణాధిపతయే నమః ఆసనం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  padya: {
    id: "padya",
    sourcePage: 4,
    teluguScript: lines(
      "గజవక్త్ర నమస్తేస్తు సర్వాభీష్టప్రదాయక,",
      "భక్త్యా పాద్యం మయాదత్తం గృహాణ ద్విరదానన",
      "శ్రీ మహాగణాధిపతయే నమః పాద్యం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  arghya: {
    id: "arghya",
    sourcePage: 5,
    teluguScript: lines(
      "గౌరీపుత్ర నమస్తేస్తు శంకరప్రియనందన",
      "గృహాణార్ఘ్యం మయాదత్తం గంధపుష్పాక్షతైర్యుతం",
      "శ్రీ మహాగణాధిపతయే నమః ఆర్ఘ్యం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  achamaniya: {
    id: "achamaniya",
    sourcePage: 5,
    teluguScript: lines(
      "అనాథనాథ సర్వజ్ఞ గీర్వాణ గణ పూజిత",
      "గృహాణాచమనం దేవ తుభ్యం దత్తం మయా ప్రభో",
      "శ్రీ మహాగణాధిపతయే నమః ఆచమనీయం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  madhuparka: {
    id: "madhuparka",
    sourcePage: 5,
    teluguScript: lines(
      "దధిక్షీర సమాయుక్తం మధ్వాజ్యేన సమన్వితం",
      "మధుపర్కం గృహాణేదం గజవక్త్ర నమోస్తుతే",
      "శ్రీ మహాగణాధిపతయే నమః మధుపర్కం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  snana: {
    id: "snana",
    sourcePage: 5,
    teluguScript: lines(
      "స్నానంపంచామృతైర్దేవ గృహాణ గణనాయక",
      "అనాథనాథ సర్వజ్ఞ గీర్వాణ గణపూజిత",
      "శ్రీ మహాగణాధిపతయే నమః పంచామృతస్నానం సమర్పయామి",
      "గంగాదిసర్వతీర్థేభ్య ఆహృతై రమలైర్జలైః",
      "స్నానం కురుష్వ భగవన్ ఉమాపుత్ర నమోస్తుతే",
      "శ్రీ మహాగణాధిపతయే నమః శుద్ధోదకస్నానం సమర్పయామి.",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  vastra: {
    id: "vastra",
    sourcePage: 5,
    teluguScript: lines(
      "రక్తవస్త్రద్వయం చారు దేవయోగ్యం చ మంగళం",
      "శుభప్రదం గృహాణ త్వం లంబోదర హరాత్మజ",
      "శ్రీ మహాగణాధిపతయే నమః వస్త్రయుగ్మం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  yajnopavita: {
    id: "yajnopavita",
    sourcePage: 5,
    teluguScript: lines(
      "రాజితం బ్రహ్మసూత్రం కాంచనంచోత్తరీయకం",
      "గృహాణ దేవ సర్వజ్ఞ భక్తానా మిష్టదాయక",
      "శ్రీ మహాగణాధిపతయే నమః యజ్ఞోపవీతం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  gandha: {
    id: "gandha",
    sourcePage: 6,
    teluguScript: lines(
      "చందనాగరుకర్పూర కస్తూరీ కుంకుమాన్వితం",
      "విలేపనం సురశ్రేష్ట ప్రీత్యర్థం ప్రతిగృహ్యతామ్",
      "శ్రీ మహాగణాధిపతయే నమః గంధాన్ సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  pushpakshata: {
    id: "pushpakshata",
    sourcePage: 6,
    teluguScript: lines(
      "అక్షతాన్ ధవళాన్ దివ్యాన్ శాలీయాం స్తండులాన్ శుభాన్",
      "గృహాణ పరమానంద శంభు పుత్ర నమోస్తుతే.",
      "శ్రీ మహాగణాధిపతయే నమః అక్షతాన్ సమర్పయామి.",
      "సుగంధాని సుపుష్పాణి జాజికుందముఖానిచ",
      "ఏక విశంతి పత్రాణి సంగృహాణ నమోస్తుతే",
      "శ్రీ మహాగణాధిపతయే నమః పుష్పాణి సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "శాలీయాం స్తండులాన్", note: "Word-internal space printed in the source; matches the English PDF's \"SaaleeyaaM staMDulaan\"." },
      { token: "ఏక విశంతి", note: "\"ఏకవింశతి\" (twenty-one) printed as \"ఏక విశంతి\"; matches the English PDF's \"aeka viSaMti\". This is the line that fixes the patri count at 21." },
    ],
    transcriptionCheckRequired: false,
  },
  "anga-puja": {
    id: "anga-puja",
    sourcePage: 6,
    teluguScript: lines(
      "గణేశాయ నమః పాదౌ పూజయామి",
      "ఏకదంతాయ నమః జానునీ పూజయామి",
      "విఘ్నరాజాయ నమః జంఘే పూజయామి",
      "ఆఖువాహనాయ నమః ఊరుం పూజయామి",
      "హేరంబాయ నమః కటిం పూజయామి",
      "లంబోదరాయ నమః ఉదరం పూజయామి",
      "గణనాథాయ నమః నాభిం పూజయామి",
      "గణేశాయ నమః హృదయం పూజయామి",
      "స్థూల కంఠాయ నమః కంఠం పూజయామి",
      "స్కందాగ్రజాయ నమః స్కంధౌ పూజయామి",
      "పాశహస్తాయ నమః హస్తౌ పూజయామి",
      "గజవక్త్రాయ నమః వక్త్రం పూజయామి",
      "విఘ్నహంత్రే నమః నేత్రే పూజయామి",
      "శూర్పకర్ణాయ నమః కర్ణౌ పూజయామి",
      "ఫాలచంద్రాయ నమః లలాటం పూజయామి",
      "సర్వేశ్వరాయ నమః శిరః పూజయామి",
      "విఘ్నరాజాయ నమః సర్వాణ్యంగాని పూజయామి",
    ),
    confidence: "MEDIUM",
    uncertainTokens: [
      { token: "జానునీ / స్కంధౌ / హస్తౌ / కర్ణౌ", note: "Dual-number part names read off a tightly-set two-column layout; re-check against the source." },
    ],
    transcriptionCheckRequired: true,
  },
  "ekavimsati-patra-puja": {
    id: "ekavimsati-patra-puja",
    sourcePage: 7,
    teluguScript: lines(
      "1. సుముఖాయ నమః — మాచీపత్రం పూజయామి",
      "2. గణాధిపాయ నమః — బృహతీపత్రం పూజయామి",
      "3. ఉమాపుత్రాయ నమః — బిల్వపత్రం పూజయామి",
      "4. గజాననాయ నమః — దూర్వాయుగ్మం పూజయామి",
      "5. హరసూనవే నమః — దుత్తూరపత్రం పూజయామి",
      "6. లంబోదరాయ నమః — బదరీపత్రం పూజయామి",
      "7. గుహాగ్రజాయ నమః — అపామార్గపత్రం పూజయామి",
      "8. గజకర్ణాయ నమః — తులసీపత్రం పూజయామి",
      "9. ఏకదంతాయ నమః — చూతపత్రం పూజయామి",
      "10. వికటాయ నమః — కరవీరపత్రం పూజయామి",
      "11. భిన్నదంతాయ నమః — విష్ణుక్రాంతపత్రం పూజయామి",
      "12. వటవే నమః — దాడిమీపత్రం పూజయామి",
      "13. సర్వేశ్వరాయ నమః — దేవదారుపత్రం పూజయామి",
      "14. ఫాలచంద్రాయ నమః — మరువకపత్రం పూజయామి",
      "15. హేరంబాయ నమః — సింధువారపత్రం పూజయామి",
      "16. శూర్పకర్ణాయ నమః — జాజిపత్రం పూజయామి",
      "17. సురాగ్రజాయ నమః — గండకీ పత్రం పూజయామి",
      "18. ఇభవక్త్రాయ నమః — శమీపత్రం పూజయామి",
      "19. వినాయకాయ నమః — అశ్వత్థ పత్రం పూజయామి",
      "20. సురసేవితాయ నమః — అర్జున పత్రం పూజయామి",
      "21. కపిలాయ నమః — అర్కపత్రం పూజయామి",
      "శ్రీ గణేశ్వరాయనమః — ఏకవింశతిపత్రాణి పూజయామి",
    ),
    confidence: "MEDIUM",
    uncertainTokens: [
      { token: "గండకీ పత్రం", note: "Leaf 17 read as \"గండకీ\"; the English PDF prints \"gaMDakee\". Botanical identity is a reviewer question regardless." },
      { token: "closing line number", note: "The source numbers the closing line \"22.\"; it is the summary offering, not a 22nd leaf. Rendered here without the number." },
    ],
    transcriptionCheckRequired: true,
  },
  "ashtottara-satanamavali": {
    id: "ashtottara-satanamavali",
    sourcePage: 8,
    // The full 108-name list lives on ASHTOTTARA_TELUGU_RECOVERY (a name
    // array). candidate.ts's step() helper substitutes that joined list as
    // this step's mantraTeluguScript; this entry only carries the metadata.
    teluguScript: "",
    confidence: "MEDIUM",
    uncertainTokens: [
      { token: "108 vs 109 lines", note: "Page 8 prints 108 names followed by a closing \"Sri Varasiddhi Vinayaka Swamine namah\" doxology line - 109 printed lines. The exact 108 split and any conjunct corrections are a reviewer check." },
    ],
    transcriptionCheckRequired: true,
  },
  dhupa: {
    id: "dhupa",
    sourcePage: 9,
    teluguScript: lines(
      "దశాంగం గుగ్గులోపేతం సుగంధం సుమనోహరం",
      "ఉమా సుత నమస్తుభ్యం గృహాణ వరధో భవ",
      "శ్రీ మహాగణాధిపతయే నమః ధూప మాఘ్రాపయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  deepa: {
    id: "deepa",
    sourcePage: 9,
    teluguScript: lines(
      "సాద్యం త్రివర్తిసంయుక్తం వహ్నినా ద్యోతితం మయా",
      "గృహాణ మంగళం దీపం మీశపుత్ర నమోస్తుతే",
      "శ్రీ మహాగణాధిపతయే నమః దీపం దర్శయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "సాద్యం", note: "Source prints \"సాద్యం\" where \"సాజ్యం\" (with ghee) is expected; matches the English PDF's \"saadyaM\"." },
    ],
    transcriptionCheckRequired: false,
  },
  naivedya: {
    id: "naivedya",
    sourcePage: 9,
    teluguScript: lines(
      "సుగన్ధాన్ సుకృతాంశ్చైవ మోదకాన్ ఘృతపాచితాన్",
      "నైవేద్యం గృహ్యతాం దేవ చణముద్గైః ప్రకల్పితాన్",
      "భక్ష్యం భోజ్యంచ లేహ్యంచ చోష్యం పానీయమేవచ",
      "ఇదం గృహాణ నైవేద్యం మయాదత్తం వినాయక",
      "శ్రీ మహాగణాధిపతయే నమః నైవేద్యం సమర్పయామి.",
      "సత్యం త్వర్తేన పరిషించామి అమృతమస్తు అమృతోపస్తరణమసి",
      "ఓం ప్రాణం నమః- అపానం నమః - వ్యానం నమః",
      "ఉదానం నమః - సమానం నమః",
      "మధ్యే మధ్యే పానీయం సమర్పయామి - అమృతమస్తు అమృతాపిధానమసి",
      "ఉత్తరా పోశనం సమర్పయామి , హస్తౌ ప్రక్షాళనం సమర్పయామి",
      "పాద ప్రక్షాళనం సమర్పయామి , శుద్ధాచమనీయం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  tambula: {
    id: "tambula",
    sourcePage: 10,
    teluguScript: lines(
      "పూగీఫలై స్సకర్పూరైః నాగవల్లీ దళైర్యుతం",
      "ముక్తాచూర్ణ సమాయుక్తం తాంబూలం ప్రతిగృహ్యతాం",
      "శ్రీ మహాగణాధిపతయే నమః తాంబూలం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  neerajana: {
    id: "neerajana",
    sourcePage: 10,
    teluguScript: lines(
      "ఘృతవర్తి సహస్రైశ్చ కర్పూరశకలై స్తథా",
      "నీరాజనం మయాదత్తం గృహాణ వరదో భవ.",
      "శ్రీ మహాగణాధిపతయే నమః నీరాజనం సమర్పయామి",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  "doorvayugma-puja": {
    id: "doorvayugma-puja",
    sourcePage: 10,
    teluguScript: lines(
      "గణాధిపాయ నమః దూర్వాయుగ్మం పూజయామి",
      "ఉమాపుత్రాయ నమః దూర్వాయుగ్మం పూజయామి",
      "అఖువాహనాయ నమః దూర్వాయుగ్మం పూజయామి",
      "వినాయకాయ నమః దూర్వాయుగ్మం పూజయామి",
      "ఈశపుత్రాయ నమః దూర్వాయుగ్మం పూజయామి",
      "సర్వసిద్ధి ప్రదాయకాయ నమః దూర్వాయుగ్మం పూజయామి",
      "ఏకదంతాయ నమః దూర్వాయుగ్మం పూజయామి",
      "ఇభవక్త్రాయ నమః దూర్వాయుగ్మం పూజయామి",
      "మూషిక వాహనాయ నమః దూర్వాయుగ్మం పూజయామి",
      "కుమారగురవే నమః దూర్వాయుగ్మం పూజయామి",
      "ఏకదంతైకవదన తథామూషిక వాహనాయ నమః దూర్వాయుగ్మం పూజయామి",
    ),
    confidence: "MEDIUM",
    uncertainTokens: [
      { token: "అఖువాహనాయ", note: "Line 3 read as \"అఖువాహనాయ\" (English PDF: \"akhuvaahanaaya\"); line 9 prints \"మూషిక వాహనాయ\". Two-column list - re-check." },
    ],
    transcriptionCheckRequired: true,
  },
  "mantrapushpa-namaskara": {
    id: "mantrapushpa-namaskara",
    sourcePage: 11,
    teluguScript: lines(
      "కుమారగురవే తుభ్యం అర్పయామి సుమాంజలిం",
      "ప్రదక్షిణం కరిష్యామి సతతం మోదకప్రియ",
      "శ్రీ మహాగణాధిపతయే నమః సువర్ణ దివ్య మంత్రపుష్పం సమర్పయామి",
      "ఆత్మ ప్రదక్షిణ నమస్కారాన్ సమర్పయామి",
      "పునరర్ఘ్యం : అర్ఘ్యం గృహాణ హేరంబ సర్వ భద్ర ప్రదాయక",
      "గంధ పుష్పాక్షతైర్యుక్తం పాత్రస్థం పాపనాశన",
      "శ్రీ మహాగణాధిపతయే నమః పునరర్ఘ్యం సమర్పయామి",
      "చత్ర చామర గీత నృత్య ఆందోళికా అశ్వారోహణ గజారోహణ",
      "సమస్త రాజోపచరాన్ మనసా సమర్పయామి",
      "యస్య స్మృత్యాచ నామోక్త్యా తపః పూజా క్రియాదిషు:",
      "న్యూనం సంపూర్ణతాం యాతి సద్యో వందే తమచ్యుతం",
      "మంత్ర హీనం క్రియాహీనం భక్తిహీనం గణాధిప",
      "యత్పూజితం మాయా దేవ పరిపూర్ణం తదస్తుతే",
      "అనయా యధా శక్తి పూజయాచ భగవాన్ సర్వాత్మకః",
      "శ్రీ మహా గణాధిపతి దేవతా సుప్రసన్నః స్సుప్రీతో వరదో భవతు",
    ),
    confidence: "MEDIUM",
    uncertainTokens: [
      { token: "చత్ర", note: "Read as \"చత్ర\"; \"ఛత్ర\" (parasol) is expected. English PDF prints \"Chatra\"." },
      { token: "రాజోపచరాన్", note: "Read as \"రాజోపచరాన్\"; \"రాజోపచారాన్\" is expected. English PDF prints \"raajOpacharaan\"." },
    ],
    transcriptionCheckRequired: true,
  },
  udvasana: {
    id: "udvasana",
    sourcePage: 11,
    teluguScript: lines(
      "నమస్తే విఘ్న రాజాయ నమస్తే విఘ్ననాశన",
      "బ్రాహ్మణేభ్యోభ్యనుజ్ఞాతా గచ్చదేవ యధా సుఖం",
      "శ్రీ మహా గణాధిపతయే నమః, యధాస్థానం ఉద్వాసయామి; పునరాగమనాయచ",
    ),
    confidence: "HIGH",
    uncertainTokens: [],
    transcriptionCheckRequired: false,
  },
  "mangala-shanti": {
    id: "mangala-shanti",
    sourcePage: 11,
    teluguScript: lines(
      "స్వస్తి ప్రజాభ్యః పరిపాలయంతాం న్యాయేన మార్గేన మహీం మహీశా",
      "గో బ్రాహ్మణేభ్యః శుభమస్తు నిత్యం, లోకాః సమస్తా సుఖినో భవంతు.",
      "కాలే వర్షతు పర్జన్యః పృథివీ సస్య శాలినీ",
      "దేశోయం క్షోభ రహితో బ్రహ్మణా సంతు నిర్భయః",
      "అపుత్రాః పుత్రిణః స్సంతు పుత్రిణ స్సంతుపౌత్రిణః",
      "అధనాః స్సధనాః సంతు జీవంతు శరదాం శతం",
    ),
    confidence: "HIGH",
    uncertainTokens: [
      { token: "closing extent", note: "Telugu page 11 ends the blessing at \"జీవంతు శరదాం శతం\", identical in extent to the English PDF. No extra line is appended here on this page." },
    ],
    transcriptionCheckRequired: false,
  },
};

/** The full Sankalpam in Telugu script (Telugu Lyrics page 3). */
export const SANKALPAM_TELUGU_RECOVERY: TeluguRecoveryEntry = TELUGU_RECOVERY.sankalpa;

/** The 108-name Ashtottara Shatanamavali, transcribed from the 3-column
 * layout on Telugu Lyrics page 8. Read left column top-to-bottom, then the
 * middle column, then the right column. The final line is the closing
 * doxology, not a 109th name. MEDIUM confidence, re-check required. */
export const ASHTOTTARA_TELUGU_RECOVERY: TeluguRecoveryEntry & {
  names: readonly string[];
  closingDoxology: string;
} = {
  id: "ashtottara",
  sourcePage: 8,
  confidence: "MEDIUM",
  transcriptionCheckRequired: true,
  uncertainTokens: [
    { token: "3-column layout", note: "108 names set in three dense columns; conjunct-level glyph confusion is likely. Reviewer to re-verify every name against Telugu Lyrics page 8." },
    { token: "count", note: "108 names are printed, then a closing \"Sri Varasiddhi Vinayaka Swamine namah\" line. If a reviewed 108-list differs, the reviewed list wins." },
  ],
  names: [
    // left column
    "గజాననాయ నమః", "గణాధ్యక్షాయ నమః", "విఘ్నరాజాయ నమః", "వినాయకాయ నమః",
    "ద్వైమాతురాయ నమః", "ద్విముఖాయ నమః", "ప్రముఖాయ నమః", "సుముఖాయ నమః",
    "కృతినే నమః", "సుప్రదీపాయ నమః", "సుఖనిధయే నమః", "సురాధ్యక్షాయ నమః",
    "సురారిఘ్నాయ నమః", "మహాగణపతయే నమః", "మాన్యాయ నమః", "మహాకాలాయ నమః",
    "మహాబలాయ నమః", "హేరంబాయ నమః", "లంబజఠరాయ నమః", "హ్రస్వగ్రీవాయ నమః",
    "మహోదరాయ నమః", "మదోత్కటాయ నమః", "మహావీరాయ నమః", "మంత్రిణే నమః",
    "మంగళ సుస్వరాయ నమః", "ప్రమథాయ నమః", "ప్రథమాయ నమః", "ప్రాజ్ఞాయ నమః",
    "విఘ్నకర్త్రే నమః", "విఘ్నహంత్రే నమః", "విశ్వనేత్రే నమః", "విరాట్పతయే నమః",
    "శ్రీపతయే నమః", "వాక్పతయే నమః", "శృంగారిణే నమః", "ఆశ్రితవత్సలాయ నమః",
    "శివప్రియాయ నమః",
    // middle column
    "శీఘ్రకారిణే నమః", "శాశ్వతాయ నమః", "భవాయ నమః", "బలోత్థితాయ నమః",
    "భవాత్మజాయ నమః", "పురాణపురుషాయ నమః", "పూష్ణే నమః", "పుష్కరోక్షిప్తవారిణే నమః",
    "అగ్రగణ్యాయ నమః", "అగ్రపూజ్యాయ నమః", "అగ్రగామినే నమః", "నేత్రకృతే నమః",
    "చామీకరప్రభాయ నమః", "సర్వాయ నమః", "సర్వోపాస్యాయ నమః", "సర్వకర్త్రే నమః",
    "సర్వనేత్రే నమః", "సర్వసిద్ధిప్రదాయ నమః", "సర్వసిద్ధయే నమః", "పంచహస్తాయ నమః",
    "పార్వతీనందనాయ నమః", "ప్రభవే నమః", "కుమారగురవే నమః", "అక్షోభ్యాయ నమః",
    "కుంజరాసురభంజనాయ నమః", "ప్రమోదాయ నమః", "మోదకప్రియాయ నమః", "కాంతిమతే నమః",
    "ధృతిమతే నమః", "కామినే నమః", "కపిత్థ వనప్రియాయ నమః", "బ్రహ్మచారిణే నమః",
    "బ్రహ్మరూపిణే నమః", "బ్రహ్మవిద్యాది దానభువే నమః", "జిష్ణవే నమః", "విష్ణుప్రియాయ నమః",
    // right column
    "భక్త జీవితాయ నమః", "జితమన్మథాయ నమః", "ఐశ్వర్యకారణాయ నమః", "జ్యాయసే నమః",
    "యక్షకిన్నరసేవితాయ నమః", "గంగాసుతాయ నమః", "గణాధీశాయ నమః", "గంభీరనినదాయ నమః",
    "వటవే నమః", "అభీష్టవరదాయ నమః", "జ్యోతిషే నమః", "భక్తనిధయే నమః",
    "భావగమ్యాయ నమః", "మంగళప్రదాయ నమః", "అవ్యక్తాయ నమః", "అప్రాకృతపరాక్రమాయ నమః",
    "సత్యధర్మిణే నమః", "సఖయే నమః", "సరసాంబునిధయే నమః", "మహేశాయ నమః",
    "దివ్యాంగాయ నమః", "మణికింకిణీ మేఖలాయ నమః", "సమస్తదేవతామూర్తయే నమః", "సహిష్ణవే నమః",
    "సతతోత్థితాయ నమః", "విఘాతకారిణే నమః", "విశ్వగ్దృశే నమః", "విశ్వరక్షాకృతే నమః",
    "కల్యాణగురవే నమః", "ఉన్మత్తవేషాయ నమః", "అపరాజితే నమః", "సమస్త జగదాధారాయ నమః",
    "సర్వైశ్వర్యప్రదాయ నమః", "ఆక్రాంతచిదచిత్ప్రభవే నమః", "శ్రీ విఘ్నేశ్వరాయ నమః",
  ],
  closingDoxology: "శ్రీ వరసిద్ధి వినాయక స్వామినే నమః",
  get teluguScript(): string {
    return [...this.names, this.closingDoxology].join("\n");
  },
};

/** Recovered Telugu names for the 21 patri leaves (Telugu Lyrics page 7).
 * The botanical identity of each leaf is still NOT recorded - that is a
 * reviewer question, unchanged by this transcription. */
export interface PatriTeluguLeaf {
  index: number;
  deityNameTelugu: string;
  leafNameTelugu: string;
}

export const PATRI_TELUGU_RECOVERY: {
  leaves: readonly PatriTeluguLeaf[];
  closingLineTelugu: string;
  sourcePage: number;
  confidence: TeluguConfidence;
  transcriptionCheckRequired: boolean;
} = {
  sourcePage: 7,
  confidence: "MEDIUM",
  transcriptionCheckRequired: true,
  closingLineTelugu: "శ్రీ గణేశ్వరాయనమః — ఏకవింశతిపత్రాణి పూజయామి",
  leaves: [
    { index: 1, deityNameTelugu: "సుముఖాయ నమః", leafNameTelugu: "మాచీపత్రం" },
    { index: 2, deityNameTelugu: "గణాధిపాయ నమః", leafNameTelugu: "బృహతీపత్రం" },
    { index: 3, deityNameTelugu: "ఉమాపుత్రాయ నమః", leafNameTelugu: "బిల్వపత్రం" },
    { index: 4, deityNameTelugu: "గజాననాయ నమః", leafNameTelugu: "దూర్వాయుగ్మం" },
    { index: 5, deityNameTelugu: "హరసూనవే నమః", leafNameTelugu: "దుత్తూరపత్రం" },
    { index: 6, deityNameTelugu: "లంబోదరాయ నమః", leafNameTelugu: "బదరీపత్రం" },
    { index: 7, deityNameTelugu: "గుహాగ్రజాయ నమః", leafNameTelugu: "అపామార్గపత్రం" },
    { index: 8, deityNameTelugu: "గజకర్ణాయ నమః", leafNameTelugu: "తులసీపత్రం" },
    { index: 9, deityNameTelugu: "ఏకదంతాయ నమః", leafNameTelugu: "చూతపత్రం" },
    { index: 10, deityNameTelugu: "వికటాయ నమః", leafNameTelugu: "కరవీరపత్రం" },
    { index: 11, deityNameTelugu: "భిన్నదంతాయ నమః", leafNameTelugu: "విష్ణుక్రాంతపత్రం" },
    { index: 12, deityNameTelugu: "వటవే నమః", leafNameTelugu: "దాడిమీపత్రం" },
    { index: 13, deityNameTelugu: "సర్వేశ్వరాయ నమః", leafNameTelugu: "దేవదారుపత్రం" },
    { index: 14, deityNameTelugu: "ఫాలచంద్రాయ నమః", leafNameTelugu: "మరువకపత్రం" },
    { index: 15, deityNameTelugu: "హేరంబాయ నమః", leafNameTelugu: "సింధువారపత్రం" },
    { index: 16, deityNameTelugu: "శూర్పకర్ణాయ నమః", leafNameTelugu: "జాజిపత్రం" },
    { index: 17, deityNameTelugu: "సురాగ్రజాయ నమః", leafNameTelugu: "గండకీ పత్రం" },
    { index: 18, deityNameTelugu: "ఇభవక్త్రాయ నమః", leafNameTelugu: "శమీపత్రం" },
    { index: 19, deityNameTelugu: "వినాయకాయ నమః", leafNameTelugu: "అశ్వత్థ పత్రం" },
    { index: 20, deityNameTelugu: "సురసేవితాయ నమః", leafNameTelugu: "అర్జున పత్రం" },
    { index: 21, deityNameTelugu: "కపిలాయ నమః", leafNameTelugu: "అర్కపత్రం" },
  ],
};

/** Only Telugu block, spaces, punctuation, digits, and the dash/danda the
 * source uses. Used by tests to prove no Latin letters leaked into a recovered
 * string. */
export const TELUGU_TEXT_PATTERN = /^[ఀ-౿\s0-9.,:;!?—–\-/()]+$/;

export function teluguRecoveryFor(stepId: string): TeluguRecoveryEntry | null {
  return TELUGU_RECOVERY[stepId] ?? null;
}

/** Step ids whose recovered Telugu a reviewer still has to re-check. */
export function teluguChecksRequired(): string[] {
  return Object.values(TELUGU_RECOVERY)
    .filter((e) => e.transcriptionCheckRequired)
    .map((e) => e.id);
}

/** Count of mantra/kriya steps with recovered Telugu script (excludes the
 * Ashtottara pointer entry, which defers to ASHTOTTARA_TELUGU_RECOVERY). */
export function recoveredTeluguStepCount(): number {
  return Object.values(TELUGU_RECOVERY).filter(
    (e) => e.id !== "ashtottara-satanamavali",
  ).length;
}
