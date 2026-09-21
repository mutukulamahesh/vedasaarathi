"use client";

// "About VedaSaarathi" - one small bilingual page reached from Home (Back
// returns to Home). Plain text only: no tracking, no forms, nothing is sent
// anywhere from this page. The feedback route is a plain mailto: link; the
// visitor sends the message themselves from their own email app.

import { Mail } from "lucide-react";

export const FEEDBACK_EMAIL = "contact.vedasarathi@gmail.com";
export const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}`;
export const COPYRIGHT_LINE = "© 2026 ASCOR LABS. All rights reserved.";

/** Confirmed "With gratitude" entries. Add an entry ONLY with details and
 * consent supplied by the project owner: preferred name and title, and the
 * specific contribution. While this list is empty the section is not
 * rendered at all - never show a placeholder, an endorsement, or a
 * qualification that was not supplied. "Reviewed by" wording is only for the
 * particular content that person actually reviewed. */
export interface PriestAcknowledgement {
  en: string;
  te: string;
}
export const PRIEST_ACKNOWLEDGEMENTS: readonly PriestAcknowledgement[] = [];

const T = {
  EN: {
    title: "About VedaSaarathi",
    whyH: "Why VedaSaarathi exists",
    why: [
      "Living away from home can make simple questions difficult: What is today’s tithi? When is the next festival where I live? How can my family prepare for a puja?",
      "VedaSaarathi brings these details together in simple English and Telugu, using your selected location.",
    ],
    whatH: "What you can do",
    what: [
      "See today’s Panchangam and traditional daily timings.",
      "Find supported festivals and monthly observances in your local calendar.",
      "Follow the puja guides currently available.",
    ],
    whereH: "Why location matters",
    where:
      "Sunrise and sunset happen at different times around the world. A festival’s date or observance time can sometimes differ between India and where you live.",
    traditionH: "Our tradition and guidance",
    tradition: [
      "VedaSaarathi is rooted in Hindu traditions. Practices can differ between families, regions and traditions. We use published Panchangam references and traditional sources, and explain important conventions in the relevant calculation details.",
      "This app supports learning and practice. For questions specific to your family or a ceremony, seek guidance from your priest or family elders. Content awaiting priest review is not presented as priest-approved.",
    ],
    coverageH: "First-version coverage",
    coverage:
      "This first version includes a growing selection of festivals and puja guides. It does not yet cover every festival or tradition.",
    aiH: "AI and review",
    ai: [
      "AI tools have helped us develop parts of VedaSaarathi and prepare some content. The daily Panchangam is calculated on your device by an astronomical calculation program, not by an AI chatbot. Puja audio uses a computer-generated voice, including the mantra pronunciation guides, which a priest has not yet reviewed.",
      "AI-assisted content can contain errors in wording, translation or pronunciation, and calculations and software can also contain mistakes.",
      "Not all religious content has been reviewed by a priest. We are continuing to review and improve it.",
    ],
    thanksH: "With gratitude",
    feedbackH: "Found something that does not look right?",
    feedback:
      "Please let us know if you notice an incorrect date, timing, translation, pronunciation or religious instruction. Your feedback helps us improve VedaSaarathi with care and respect.",
    feedbackHow: `Found a mistake or have a suggestion? Please email us at ${FEEDBACK_EMAIL}. For a date or timing issue, include the city and date selected in the app. Please avoid sharing private family details.`,
    emailUs: "Email us",
    emailNote:
      "This link opens your email app. You need to send the message yourself. VedaSaarathi does not send anything for you.",
    projectH: "About the project",
    project: [
      "VedaSaarathi is a project by ASCOR LABS.",
      "VedaSaarathi’s guidance is free to use.",
      "Traditional texts and third-party sources belong to their respective authors and owners.",
    ],
  },
  TE: {
    title: "వేదసారథి గురించి",
    whyH: "వేదసారథి ఎందుకు?",
    why: [
      "ఇంటికి దూరంగా ఉన్నప్పుడు సాధారణ ప్రశ్నలు కూడా కష్టంగా అనిపించవచ్చు: ఈ రోజు తిథి ఏమిటి? నేను ఉన్న చోట తదుపరి పండుగ ఎప్పుడు? మా కుటుంబం పూజకు ఎలా సిద్ధం కావాలి?",
      "వేదసారథి ఈ వివరాలన్నింటినీ, మీరు ఎంచుకున్న ప్రదేశం ఆధారంగా, సరళమైన ఇంగ్లీష్, తెలుగులో ఒకే చోట అందిస్తుంది.",
    ],
    whatH: "మీరు ఏమి చేయవచ్చు",
    what: [
      "నేటి పంచాంగాన్ని, సంప్రదాయ రోజువారీ సమయాలను చూడండి.",
      "మీ స్థానిక క్యాలెండర్‌లో మేము చేర్చిన పండుగలను, నెలవారీ వ్రతాలను తెలుసుకోండి.",
      "ప్రస్తుతం అందుబాటులో ఉన్న పూజా మార్గదర్శకాలను అనుసరించండి.",
    ],
    whereH: "ప్రదేశం ఎందుకు ముఖ్యం",
    where:
      "సూర్యోదయం, సూర్యాస్తమయం ప్రపంచంలో ఒక్కోచోట ఒక్కో సమయానికి అవుతాయి. అందువల్ల పండుగ తేదీ లేదా ఆచరణ సమయం భారతదేశంలో, మీరు నివసించే చోట కొన్నిసార్లు భిన్నంగా ఉండవచ్చు.",
    traditionH: "మా సంప్రదాయం, మార్గదర్శకం",
    tradition: [
      "వేదసారథి హిందూ సంప్రదాయాల ఆధారంగా రూపొందింది. ఆచరణలు కుటుంబాన్ని, ప్రాంతాన్ని, సంప్రదాయాన్ని బట్టి మారవచ్చు. మేము ప్రచురితమైన పంచాంగ ఆధారాలను, సంప్రదాయ మూలాలను ఉపయోగిస్తాము; ముఖ్యమైన పద్ధతులను సంబంధిత లెక్కల వివరాల్లో వివరిస్తాము.",
      "ఈ యాప్ నేర్చుకోవడానికి, ఆచరణకు తోడ్పడుతుంది. మీ కుటుంబానికి లేదా ఒక కార్యక్రమానికి సంబంధించిన సందేహాలకు మీ పురోహితులను లేదా ఇంటి పెద్దలను సంప్రదించండి. పురోహితుల సమీక్ష ఇంకా జరగని విషయాన్ని పురోహితులు ఆమోదించినదిగా చూపము.",
    ],
    coverageH: "మొదటి వెర్షన్‌లో ఏముంది",
    coverage:
      "ఈ మొదటి వెర్షన్‌లో పండుగలు, పూజా మార్గదర్శకాల ఎంపిక ఉంది; అది క్రమంగా పెరుగుతుంది. ఇది ఇంకా ప్రతి పండుగను, ప్రతి సంప్రదాయాన్ని కవర్ చేయదు.",
    aiH: "AI, సమీక్ష",
    ai: [
      "వేదసారథిలోని కొన్ని భాగాల అభివృద్ధికి, కొంత సమాచారం సిద్ధం చేయడానికి AI సాధనాలు మాకు సహాయపడ్డాయి. రోజువారీ పంచాంగాన్ని ఖగోళ గణన ప్రోగ్రామ్ మీ పరికరంలోనే లెక్కిస్తుంది; అది AI చాట్‌బాట్ కాదు. పూజా ఆడియోలో కంప్యూటర్ రూపొందించిన స్వరం వాడాము; మంత్రాల ఉచ్చారణ ఆడియో కూడా అందులో ఉంది, దానిని పురోహితులు ఇంకా సమీక్షించలేదు.",
      "AI సహాయంతో రూపొందిన సమాచారంలో పదాలు, అనువాదం, ఉచ్చారణలో తప్పులు ఉండవచ్చు; లెక్కల్లో, సాఫ్ట్‌వేర్‌లో కూడా పొరపాట్లు ఉండవచ్చు.",
      "మత సంబంధిత విషయమంతా పురోహితులు సమీక్షించలేదు. సమీక్షను, మెరుగుదలను కొనసాగిస్తున్నాము.",
    ],
    thanksH: "కృతజ్ఞతలు",
    feedbackH: "ఏదైనా సరిగా లేదనిపించిందా?",
    feedback:
      "తప్పు తేదీ, సమయం, అనువాదం, ఉచ్చారణ లేదా మతపరమైన సూచన కనిపిస్తే దయచేసి మాకు తెలియజేయండి. మీ అభిప్రాయం వేదసారథిని శ్రద్ధతో, గౌరవంతో మెరుగుపరచడానికి సహాయపడుతుంది.",
    feedbackHow: `పొరపాటు కనిపించినా, సూచన ఉన్నా ${FEEDBACK_EMAIL} కు ఈమెయిల్ చేయండి. తేదీ లేదా సమయం గురించి అయితే యాప్‌లో ఎంచుకున్న నగరం, తేదీ కూడా రాయండి. దయచేసి కుటుంబానికి సంబంధించిన వ్యక్తిగత వివరాలు పంపకండి.`,
    emailUs: "మాకు ఈమెయిల్ చేయండి",
    emailNote:
      "ఈ లింక్ మీ ఈమెయిల్ యాప్‌ను తెరుస్తుంది. సందేశాన్ని మీరే పంపాలి. వేదసారథి మీ తరపున ఏదీ పంపదు.",
    projectH: "ప్రాజెక్ట్ గురించి",
    project: [
      "వేదసారథి ASCOR LABS ప్రాజెక్ట్.",
      "వేదసారథి మార్గదర్శకం ఉపయోగించడానికి ఉచితం.",
      "సంప్రదాయ గ్రంథాలు, ఇతర మూలాలు వాటి రచయితలకు, యజమానులకు చెందినవి.",
    ],
  },
} as const;

export function AboutScreen({ language = "EN" }: { language?: "EN" | "TE" }) {
  const te = language === "TE";
  const t = te ? T.TE : T.EN;
  const lang = te ? "te" : undefined;

  return (
    <div className="flow-content about-page" lang={lang}>
      <h1>{t.title}</h1>

      <section>
        <h2>{t.whyH}</h2>
        {t.why.map((p) => <p key={p}>{p}</p>)}
      </section>

      <section>
        <h2>{t.whatH}</h2>
        <ul>{t.what.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>

      <section>
        <h2>{t.whereH}</h2>
        <p>{t.where}</p>
      </section>

      <section>
        <h2>{t.traditionH}</h2>
        {t.tradition.map((p) => <p key={p}>{p}</p>)}
      </section>

      <section>
        <h2>{t.coverageH}</h2>
        <p>{t.coverage}</p>
      </section>

      <section>
        <h2>{t.aiH}</h2>
        {t.ai.map((p) => <p key={p}>{p}</p>)}
      </section>

      {PRIEST_ACKNOWLEDGEMENTS.length > 0 && (
        <section aria-label={t.thanksH}>
          <h2>{t.thanksH}</h2>
          {PRIEST_ACKNOWLEDGEMENTS.map((a) => (
            <p key={a.en}>{te ? a.te : a.en}</p>
          ))}
        </section>
      )}

      <section className="about-feedback">
        <h2>{t.feedbackH}</h2>
        <p>{t.feedback}</p>
        <p>{t.feedbackHow}</p>
        <a className="wide-primary" href={FEEDBACK_MAILTO}>
          <Mail size={18} /> {t.emailUs}
        </a>
        <p className="about-address" lang="en">{FEEDBACK_EMAIL}</p>
        <p className="info-note">{t.emailNote}</p>
      </section>

      <section>
        <h2>{t.projectH}</h2>
        {t.project.map((p) => <p key={p}>{p}</p>)}
      </section>

      <footer className="about-footer" lang="en">{COPYRIGHT_LINE}</footer>
    </div>
  );
}
