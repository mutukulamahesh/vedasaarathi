// The Vinayaka Vrata Katha for the Family Beta.
//
// RIGHTS BASIS
// This is an ORIGINAL retelling written for VedaSaarathi. It is NOT copied from
// Nanduri Rama Krishnamacharyulu's "Vinayaka Chaviti Vratakalpam" booklet, and
// NOT copied (in wording or structure of expression) from any commercial
// website. Only the underlying narrative — which is old and in the public
// domain — is reused:
//
//   - The Syamantaka-mani episode (Krishna, Satrajita, Prasena, Jambavan,
//     Jambavati) is from the Bhagavata Purana, Skandha 10, adhyayas 56–57.
//     The Sanskrit text is ancient and in the public domain; a public-domain
//     English translation (J. M. Sanyal, "The Srimad-Bhagavatam", 1929–1934)
//     was consulted for the sequence of events, not for wording.
//   - The Ganesha–Chandra curse episode (Ganesha's fall from his mouse, the
//     moon's laughter, the curse of mithya-dosha / false blame on anyone who
//     sees the moon on Bhadrapada Shukla Chaturthi, and the moon's partial
//     relief) is traditional Puranic / vrata material, attested across many
//     printed Vinayaka Vrata compilations. No single rights holder.
//   - The framing — that hearing or reading this katha is the remedy for
//     accidentally seeing the moon on Vinayaka Chavithi — is the standard
//     traditional frame of the Telugu observance.
//
// The Telugu text is an original translation of this same retelling, authored
// for VedaSaarathi. It is a BETA CANDIDATE TRANSLATION (see status below): it
// is NOT a canonical mantra and is NOT priest-reviewed. Nothing here is a
// mantra; it is narrative prose, so authoring it does not touch the
// sacred-content rule against generating canonical text.

export const VRATA_KATHA_CONTENT_VERSION = "vrata-katha-retelling-v1-2026-09";

export const VRATA_KATHA_STATUS = "BETA_CANDIDATE_RETELLING" as const;

export interface KathaSource {
  work: string;
  locator: string;
  rightsStatus: string;
  url?: string;
  accessedISO?: string;
  usedFor: string;
}

export const VRATA_KATHA_SOURCES: readonly KathaSource[] = [
  {
    work: "Bhagavata Purana (Srimad Bhagavatam), Skandha 10",
    locator: "Adhyayas 56–57 (the Syamantaka jewel; Krishna, Satrajita, Prasena, Jambavan, Jambavati)",
    rightsStatus:
      "Underlying Sanskrit text is ancient and public domain. Sequence of events cross-checked against the public-domain English translation by J. M. Sanyal (1929–1934). No wording reused.",
    url: "https://en.wikipedia.org/wiki/Syamantaka",
    accessedISO: "2026-09-09",
    usedFor: "Section 5 — Krishna and the Syamantaka jewel.",
  },
  {
    work: "Traditional Puranic / vrata material — the Ganesha–Chandra curse",
    locator:
      "Ganesha's fall from his vahana, the moon's laughter, the curse that anyone who sees the moon on Bhadrapada Shukla Chaturthi is falsely blamed, and the moon's partial relief. Attested across many printed Vinayaka Vrata compilations; no single rights holder.",
    rightsStatus: "Traditional / public domain; retold in original wording.",
    usedFor: "Sections 2–4 — Ganesha's feast, the moon's laughter, the curse, the partial relief.",
  },
  {
    work: "The standard Telugu Vinayaka Chavithi observance (traditional frame)",
    locator:
      "The convention that hearing or reading the Vrata Katha, with akshata in hand, removes the blemish of having accidentally seen the moon on the festival day.",
    rightsStatus: "Traditional practice; described in original wording. Not from the Nanduri booklet or any commercial website.",
    usedFor: "Section 1 and Section 6 — the frame and the closing.",
  },
];

export const VRATA_KATHA_RIGHTS_BASIS =
  "Original retelling written for VedaSaarathi from public-domain and traditional " +
  "sources (Bhagavata Purana 10.56–57 for the Syamantaka episode; traditional " +
  "Puranic material for the Ganesha–Chandra curse). Not copied from Nanduri Rama " +
  "Krishnamacharyulu's booklet or from any commercial website. Telugu is an " +
  "original translation. Beta candidate — not priest-reviewed.";

export interface KathaSection {
  heading: string;
  headingTe: string;
  body: string;
  bodyTe: string;
}

export const VRATA_KATHA_TITLE_EN = "The Vinayaka Chavithi story (Vrata Katha)";
export const VRATA_KATHA_TITLE_TE = "వినాయక వ్రత కథ";

export const VRATA_KATHA_SECTIONS: readonly KathaSection[] = [
  {
    heading: "Why we hear this story",
    headingTe: "ఈ కథ ఎందుకు వింటాము",
    body:
      "On Vinayaka Chavithi it is the custom not to look at the moon, because of " +
      "a story told about Ganesha and the moon. If someone sees the moon that " +
      "day by accident, the traditional remedy is simple: hear or read this " +
      "Vrata Katha with a little akshata (turmeric-coloured rice) held in the " +
      "hand, and then place the rice at Ganesha's feet. The story explains where " +
      "the custom comes from, and it ends by showing that even a false blame can " +
      "be cleared.",
    bodyTe:
      "వినాయక చవితి రోజున చంద్రుని చూడకూడదని ఆచారం. దీని వెనుక గణేశునికీ " +
      "చంద్రునికీ సంబంధించిన ఒక కథ ఉంది. ఆ రోజు పొరపాటున చంద్రుని చూసినా, " +
      "పరిహారం చాలా సులభం: కొంచెం అక్షతలు చేతిలో పట్టుకుని ఈ వ్రత కథను వినడం " +
      "లేదా చదవడం, ఆ తర్వాత ఆ అక్షతలను గణేశుని పాదాల వద్ద ఉంచడం. ఈ కథ ఆ " +
      "ఆచారం ఎక్కడి నుండి వచ్చిందో చెబుతుంది; అబద్ధపు నింద కూడా తొలగిపోతుందని " +
      "చివరలో చూపిస్తుంది.",
  },
  {
    heading: "Ganesha's feast and his fall",
    headingTe: "గణేశుని విందు, ఆయన పడిపోవడం",
    body:
      "The story goes that Ganesha was invited to a feast and ate a great deal, " +
      "as he loves to do. Afterwards he set off home at night on his small " +
      "mouse. On the way the mouse was startled — some say by a snake crossing " +
      "the path — and it stumbled. Ganesha lost his balance and fell, and his " +
      "full stomach split open. Unbothered, he gathered everything back, and " +
      "picked up the snake and tied it around his waist like a belt to hold " +
      "himself together.",
    bodyTe:
      "గణేశుడు ఒక విందుకు ఆహ్వానం అందుకుని, తనకు ఇష్టమైనట్లుగా బాగా భుజించాడు. " +
      "ఆ తర్వాత రాత్రివేళ తన చిన్న మూషికం మీద ఇంటికి బయలుదేరాడు. దారిలో — దారి " +
      "దాటుతున్న ఒక పాము వల్ల అని కొందరు చెబుతారు — మూషికం బెదిరి తడబడింది. " +
      "గణేశుడు సమతుల్యం తప్పి పడిపోగా, నిండిన కడుపు పగిలింది. ఆయన చలించకుండా " +
      "అంతా తిరిగి సర్దుకుని, ఆ పామునే తీసుకుని నడుముకు దట్టీలా చుట్టుకున్నాడు.",
  },
  {
    heading: "The moon laughs, and Ganesha speaks",
    headingTe: "చంద్రుడు నవ్వడం, గణేశుని మాట",
    body:
      "Chandra, the moon, was watching from the sky. Seeing the elephant-faced " +
      "god fall and then tie a snake around his middle, Chandra laughed at him " +
      "openly. Ganesha felt the mockery. He said that because Chandra had used " +
      "his light to laugh at another instead of to help, from then on anyone who " +
      "looked at the moon on this day — Bhadrapada Shukla Chaturthi — would be " +
      "troubled by mithya-dosha: they would be blamed for something they did " +
      "not do.",
    bodyTe:
      "ఆకాశం నుండి చంద్రుడు ఇదంతా చూస్తున్నాడు. ఏనుగు ముఖం గల దేవుడు పడటం, ఆపై " +
      "నడుముకు పాము చుట్టుకోవడం చూసి చంద్రుడు బహిరంగంగా నవ్వాడు. ఆ ఎగతాళి " +
      "గణేశునికి తగిలింది. తన వెలుగును సాయానికి కాక ఇతరులను ఎగతాళి చేయడానికి " +
      "వాడావు కాబట్టి, ఇక మీదట భాద్రపద శుక్ల చవితి రోజున చంద్రుని చూసిన వారికి " +
      "మిథ్యా దోషం కలుగుతుంది — చేయని పనికి నింద మోయవలసి వస్తుంది అని ఆయన అన్నాడు.",
  },
  {
    heading: "The moon's relief",
    headingTe: "చంద్రునికి ఉపశమనం",
    body:
      "Chandra was ashamed and asked to be forgiven. The devas and rishis also " +
      "asked Ganesha to soften the curse, since a curse once spoken cannot be " +
      "taken back entirely. Ganesha agreed to limit it: the blame would fall " +
      "only on someone who sees the moon on Chaturthi of Bhadrapada, not on " +
      "every day; and anyone who was blamed unfairly could be freed by hearing " +
      "the story of how Krishna himself was falsely accused and then cleared. " +
      "That is the story that follows.",
    bodyTe:
      "చంద్రుడు సిగ్గుపడి క్షమించమని వేడుకున్నాడు. ఒకసారి పలికిన శాపాన్ని పూర్తిగా " +
      "వెనక్కి తీసుకోలేము కాబట్టి, దేవతలు, ఋషులు కూడా శాపాన్ని తగ్గించమని గణేశుని " +
      "కోరారు. ఆయన దాన్ని పరిమితం చేయడానికి అంగీకరించాడు: నింద భాద్రపద చవితి " +
      "రోజున చంద్రుని చూసిన వారికే గాని ప్రతిరోజూ కాదు; అన్యాయంగా నింద పడిన వారు " +
      "శ్రీకృష్ణుడే అబద్ధపు నిందకు గురై, ఆపై నిర్దోషిగా నిరూపించబడిన కథను వింటే " +
      "ఆ దోషం నుండి విముక్తి పొందుతారు. ఆ కథే ఇప్పుడు చెప్పబడుతోంది.",
  },
  {
    heading: "Krishna and the Syamantaka jewel",
    headingTe: "శ్రీకృష్ణుడు, శ్యమంతక మణి",
    body:
      "In Dwaraka lived Satrajita, who worshipped the Sun and received from him " +
      "the Syamantaka jewel, which produced gold each day and kept sickness and " +
      "trouble away from the land. Satrajita's brother Prasena wore it while out " +
      "hunting, and a lion killed him and took the jewel. The bear-king Jambavan " +
      "then killed the lion and gave the shining stone to his child to play " +
      "with. When the jewel could not be found, people whispered that Krishna " +
      "must have taken it — He had once suggested it be kept for the king. " +
      "Krishna heard the whisper. To clear His name, He followed Prasena's " +
      "trail into the forest, found the lion dead, and then Jambavan's cave. " +
      "Krishna and Jambavan fought for many days. At last Jambavan understood " +
      "who Krishna was, stopped, gave back the jewel, and offered his daughter " +
      "Jambavati in marriage. Krishna returned to Dwaraka and handed the jewel " +
      "to Satrajita before everyone. Ashamed of his suspicion, Satrajita gave " +
      "Krishna his daughter Satyabhama, and the jewel too, though Krishna " +
      "accepted only the apology and the friendship.",
    bodyTe:
      "ద్వారకలో సత్రాజిత్తు అనేవాడు ఉండేవాడు. అతడు సూర్యుని ఆరాధించి, ఆయన నుండి " +
      "శ్యమంతక మణిని పొందాడు. ఆ మణి ప్రతిరోజూ బంగారాన్ని ఇస్తూ, దేశంలో రోగాలనూ " +
      "కష్టాలనూ దూరంగా ఉంచేది. సత్రాజిత్తు సోదరుడు ప్రసేనుడు దాన్ని ధరించి " +
      "వేటకు వెళ్ళగా, ఒక సింహం అతణ్ణి చంపి మణిని తీసుకుంది. ఆ సింహాన్ని ఎలుగుబంటుల " +
      "రాజు జాంబవంతుడు చంపి, ఆ మెరిసే రాయిని తన బిడ్డకు ఆట వస్తువుగా ఇచ్చాడు. " +
      "మణి కనబడకపోవడంతో, దాన్ని రాజు వద్ద ఉంచాలని ఒకప్పుడు సూచించిన కృష్ణుడే " +
      "తీసుకున్నాడని జనం గుసగుసలాడారు. ఆ నింద కృష్ణుని చెవిన పడింది. తన పేరు " +
      "నిరూపించుకోవడానికి ఆయన ప్రసేనుని జాడను అనుసరించి అడవిలోకి వెళ్ళి, చనిపోయిన " +
      "సింహాన్ని, ఆపై జాంబవంతుని గుహను కనుగొన్నాడు. కృష్ణుడూ జాంబవంతుడూ చాలా " +
      "రోజులు యుద్ధం చేశారు. చివరకు జాంబవంతుడు కృష్ణుడెవరో గ్రహించి, ఆగి, మణిని " +
      "తిరిగి ఇచ్చి, తన కుమార్తె జాంబవతిని ఇచ్చి వివాహం చేశాడు. కృష్ణుడు ద్వారకకు " +
      "తిరిగి వచ్చి అందరి ఎదుట సత్రాజిత్తుకు మణిని అప్పగించాడు. తన అనుమానానికి " +
      "సిగ్గుపడి సత్రాజిత్తు తన కుమార్తె సత్యభామను, మణిని కూడా కృష్ణునికి ఇచ్చాడు; " +
      "కృష్ణుడు మాత్రం క్షమాపణను, స్నేహాన్ని మాత్రమే స్వీకరించాడు.",
  },
  {
    heading: "The lesson, and what we do",
    headingTe: "నీతి, మనం చేసేది",
    body:
      "The elders told Krishna that He had been troubled by the false blame " +
      "because He had seen the moon on Vinayaka Chavithi. From then on it became " +
      "the practice: on this day we do not look at the moon; and if we have " +
      "seen it, we hear or read this katha — the fall, the laughter, the curse, " +
      "its softening, and how Krishna's own name was cleared — with a little " +
      "akshata in the hand. We then offer the rice to Ganesha and continue the " +
      "puja with a calm mind, trusting that what is true comes to light.",
    bodyTe:
      "వినాయక చవితి రోజున చంద్రుని చూసినందువల్లే ఆ అబద్ధపు నింద తనకు కలిగిందని " +
      "పెద్దలు కృష్ణునికి చెప్పారు. అప్పటి నుండి ఇది ఆచారమైంది: ఈ రోజున చంద్రుని " +
      "చూడము; చూసి ఉంటే, కొంచెం అక్షతలు చేతిలో పట్టుకుని ఈ కథను — పడిపోవడం, " +
      "నవ్వు, శాపం, దాని ఉపశమనం, కృష్ణుని పేరు నిరూపించబడిన తీరు — వింటాము లేదా " +
      "చదువుతాము. ఆ తర్వాత ఆ అక్షతలను గణేశునికి సమర్పించి, సత్యం బయటపడుతుందన్న " +
      "నమ్మకంతో ప్రశాంత మనసుతో పూజను కొనసాగిస్తాము.",
  },
];
