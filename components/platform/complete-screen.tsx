"use client";

import { Check, House, MessageSquareText, RotateCcw, Waves } from "lucide-react";
import { useState } from "react";

import type { PujaDefinition, PujaPathId } from "@/lib/puja/types";

import { ReportCorrectionPanel } from "./report-correction";

export function CompleteScreen({
  home, restart, immersion, puja = null, path = "SIMPLE",
}: {
  home: () => void;
  restart: () => void;
  /** null when the completed puja has no post-puja guidance to offer. */
  immersion: (() => void) | null;
  puja?: PujaDefinition | null;
  path?: PujaPathId;
}) {
  const [reporting, setReporting] = useState(false);

  return (
    <div className="completion">
      <div className="completion-icon"><Check size={35} /></div>
      <p className="kicker">DONE</p>
      <h1>Vinayaka Puja completed</h1>
      <p>
        You went through every step you selected.
      </p>
      <p className="feedback-reminder">
        <MessageSquareText size={16} /> This guide is an early draft. If anything
        looked wrong — a mantra, a step, or an instruction — tell us with
        &ldquo;Report a correction&rdquo;. It is saved on this device only.
      </p>
      {!reporting && (
        <button className="wide-secondary" onClick={() => setReporting(true)}>
          <MessageSquareText size={18} /> Report a correction
        </button>
      )}
      {reporting && <ReportCorrectionPanel puja={puja} path={path} />}
      {immersion && (
        <button className="wide-secondary" onClick={immersion}><Waves size={18} /> Immersion or keep the murti</button>
      )}
      <button className="wide-primary" onClick={home}><House size={18} /> Return home</button>
      <button className="restart-button" onClick={restart}>
        <RotateCcw size={16} /> Start again
      </button>
    </div>
  );
}
