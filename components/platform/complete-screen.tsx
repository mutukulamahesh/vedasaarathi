"use client";

import { Check, House, MessageSquareText, RotateCcw, Waves } from "lucide-react";
import { useState } from "react";

import type { PujaDefinition, PujaPathId } from "@/lib/puja/types";

import { ReportCorrectionPanel } from "./report-correction";

const T = {
  EN: {
    done: "DONE",
    title: "Vinayaka Puja completed",
    body: "You went through every step you selected.",
    feedback:
      "If anything looked wrong — a mantra, a step, or an instruction — tell us " +
      "with “Report a correction”. It is saved on this device only.",
    report: "Report a correction",
    immersion: "Immersion or keep the murti",
    home: "Return home",
    startAgain: "Start again",
  },
  TE: {
    done: "పూర్తయింది",
    title: "వినాయక పూజ పూర్తయింది",
    body: "మీరు ఎంచుకున్న ప్రతి దశనూ చేశారు.",
    feedback:
      "ఏదైనా తప్పుగా అనిపిస్తే — మంత్రం, దశ, లేదా సూచన — “తప్పు తెలియజేయండి” " +
      "ద్వారా మాకు చెప్పండి. ఇది ఈ పరికరంలో మాత్రమే సేవ్ అవుతుంది.",
    report: "తప్పు తెలియజేయండి",
    immersion: "నిమజ్జనం లేదా విగ్రహాన్ని ఉంచుకోవడం",
    home: "హోమ్‌కు తిరిగి వెళ్ళండి",
    startAgain: "మళ్ళీ మొదలుపెట్టండి",
  },
} as const;

export function CompleteScreen({
  home, restart, immersion, puja = null, path = "SIMPLE", language = "EN",
}: {
  home: () => void;
  restart: () => void;
  /** null when the completed puja has no post-puja guidance to offer. */
  immersion: (() => void) | null;
  puja?: PujaDefinition | null;
  path?: PujaPathId;
  language?: "EN" | "TE";
}) {
  const [reporting, setReporting] = useState(false);
  const te = language === "TE";
  const t = te ? T.TE : T.EN;

  return (
    <div className="completion" lang={te ? "te" : undefined}>
      <div className="completion-icon"><Check size={35} /></div>
      <p className="kicker">{t.done}</p>
      <h1>{t.title}</h1>
      <p>{t.body}</p>
      <p className="feedback-reminder">
        <MessageSquareText size={16} /> {t.feedback}
      </p>
      {!reporting && (
        <button className="wide-secondary" onClick={() => setReporting(true)}>
          <MessageSquareText size={18} /> {t.report}
        </button>
      )}
      {reporting && <ReportCorrectionPanel puja={puja} path={path} language={language} />}
      {immersion && (
        <button className="wide-secondary" onClick={immersion}><Waves size={18} /> {t.immersion}</button>
      )}
      <button className="wide-primary" onClick={home}><House size={18} /> {t.home}</button>
      <button className="restart-button" onClick={restart}>
        <RotateCcw size={16} /> {t.startAgain}
      </button>
    </div>
  );
}
