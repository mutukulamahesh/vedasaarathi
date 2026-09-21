"use client";

import { Check, House, MessageSquareText, RotateCcw, Waves } from "lucide-react";
import { useState } from "react";

import { stepsForPujaPath, type PujaDefinition, type PujaPathId } from "@/lib/puja/types";

import { ReportCorrectionPanel } from "./report-correction";

// The completion summary is built from the path's OWN step list, never a
// separate handwritten claim — so it can never drift out of sync with what
// stepsForPujaPath() actually returns for a path (see the Simple/Complete
// step-id lists in lib/pujas/vinayaka/beta-journey.ts). Landmarks named here
// are only the ones worth calling out to a family; every other step is
// covered by "every step of the ... puja".
const LANDMARKS = [
  { id: "vrata-katha", en: "the Vrata Katha story", te: "వ్రత కథ" },
  { id: "mangala-shanti", en: "the closing peace verses", te: "ముగింపు శాంతి శ్లోకాలు" },
  { id: "udvasana", en: "the Udvasana (taking leave of the murti)", te: "ఉద్వాసన (విగ్రహం నుండి వీడ్కోలు)" },
] as const;

function joinList(parts: string[], te: boolean): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(", ");
  return te ? `${head}, మరియు ${last}` : `${head} and ${last}`;
}

const T = {
  EN: {
    done: "DONE",
    title: "Vinayaka Puja completed",
    bodyComplete: (included: string[]) =>
      included.length > 0
        ? `You went through every step of the Complete puja, including ${joinList(included, false)}.`
        : "You went through every step of the Complete puja.",
    bodySimple: "You went through every step of the Simple puja that you selected.",
    simpleNote: (included: string[], excluded: string[]) => {
      const parts: string[] = [];
      if (excluded.length > 0) {
        parts.push(
          `The Simple puja does not include ${joinList(excluded, false)} — ` +
            `${excluded.length === 1 ? "that is" : "those are"} part of the Complete puja.`,
        );
      }
      if (included.length > 0) {
        parts.push(`It does include ${joinList(included, false)}.`);
      }
      parts.push(
        "The after-puja guidance below still shows when Udvasana is done and how to keep or immerse the murti.",
      );
      return parts.join(" ");
    },
    feedback:
      "If anything looked wrong — a mantra, a step, or an instruction — tell us " +
      "with “Report a correction”. It is saved on this device only.",
    report: "Report a correction",
    immersion: "Concluding (Udvasana) and the murti",
    home: "Return home",
    startAgain: "Start again",
  },
  TE: {
    done: "పూర్తయింది",
    title: "వినాయక పూజ పూర్తయింది",
    bodyComplete: (included: string[]) =>
      included.length > 0
        ? `మీరు కంప్లీట్ పూజలోని ప్రతి దశనూ చేశారు — ${joinList(included, true)}తో సహా.`
        : "మీరు కంప్లీట్ పూజలోని ప్రతి దశనూ చేశారు.",
    bodySimple: "మీరు ఎంచుకున్న సింపుల్ పూజలోని ప్రతి దశనూ చేశారు.",
    simpleNote: (included: string[], excluded: string[]) => {
      const parts: string[] = [];
      if (excluded.length > 0) {
        parts.push(`సింపుల్ పూజలో ${joinList(excluded, true)} ఉండవు — అవి కంప్లీట్ పూజలో భాగం.`);
      }
      if (included.length > 0) {
        parts.push(`${joinList(included, true)} మాత్రం సింపుల్ పూజలో కూడా ఉంటాయి.`);
      }
      parts.push(
        "ఉద్వాసన ఎప్పుడు చేస్తారో, విగ్రహాన్ని ఎలా ఉంచుకోవాలో లేదా నిమజ్జనం చేయాలో కింది మార్గదర్శకం చూపిస్తుంది.",
      );
      return parts.join(" ");
    },
    feedback:
      "ఏదైనా తప్పుగా అనిపిస్తే — మంత్రం, దశ, లేదా సూచన — “తప్పు తెలియజేయండి” " +
      "ద్వారా మాకు చెప్పండి. ఇది ఈ పరికరంలో మాత్రమే సేవ్ అవుతుంది.",
    report: "తప్పు తెలియజేయండి",
    immersion: "ముగింపు (ఉద్వాసన) మరియు విగ్రహం",
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
  const isComplete = path === "COMPLETE";

  // What this path's own step list actually contains — never a separate
  // handwritten claim (see LANDMARKS above).
  const stepIds = puja ? new Set(stepsForPujaPath(puja, path).map((s) => s.candidateStepId ?? s.id)) : null;
  const included = stepIds
    ? LANDMARKS.filter((l) => stepIds.has(l.id)).map((l) => (te ? l.te : l.en))
    : [];
  const excluded = stepIds
    ? LANDMARKS.filter((l) => !stepIds.has(l.id)).map((l) => (te ? l.te : l.en))
    : [];

  return (
    <div className="completion" lang={te ? "te" : undefined}>
      <div className="completion-icon"><Check size={35} /></div>
      <p className="kicker">{t.done}</p>
      <h1>{t.title}</h1>
      <p>{isComplete ? t.bodyComplete(included) : t.bodySimple}</p>
      {!isComplete && <p className="completion-simple-note">{t.simpleNote(included, excluded)}</p>}
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
