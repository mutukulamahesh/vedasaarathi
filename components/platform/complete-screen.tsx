"use client";

import { Check, House, RotateCcw, Waves } from "lucide-react";

export function CompleteScreen({
  home, restart, immersion,
}: {
  home: () => void;
  restart: () => void;
  /** null when the completed puja has no post-puja guidance to offer. */
  immersion: (() => void) | null;
}) {
  return (
    <div className="completion">
      <div className="completion-icon"><Check size={35} /></div>
      <p className="kicker">PRIVATE PUJA REVIEW COMPLETED</p>
      <h1>You reached the end of the guided path.</h1>
      <p>
        The complete candidate journey is ready for a priest walkthrough. Ritual
        wording and pronunciation audio are still awaiting final approval.
      </p>
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
