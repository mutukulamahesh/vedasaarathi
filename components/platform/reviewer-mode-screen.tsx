"use client";

// An obvious, device-only entry point for invited priests/reviewers to
// switch presentation mode. There is no authentication here - this is a
// local device preference, same as the rest of this app's on-device
// settings, and it never changes any content's review status or provenance.

import { ShieldCheck } from "lucide-react";

import type { PresentationMode } from "@/lib/storage/presentation-mode";

export function ReviewerModeScreen({
  mode, setMode,
}: {
  mode: PresentationMode;
  setMode: (mode: PresentationMode) => void;
}) {
  const isReviewer = mode === "REVIEWER";

  return (
    <div className="flow-content">
      <p className="kicker">FOR INVITED PRIESTS AND REVIEWERS</p>
      <h1>Reviewer mode</h1>
      <p className="flow-intro">
        Reviewer mode shows review status, sources, and draft ritual content
        that is not yet approved for families. Use this only if you were
        invited to review this app&rsquo;s religious content.
      </p>
      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>This choice stays on this device.</strong>
          <p>
            There is no sign-in yet. Turning reviewer mode on or off never
            changes what content has been approved - it only changes what is
            shown to you.
          </p>
        </div>
      </div>
      <p className="info-note">Current mode: {isReviewer ? "Reviewer" : "Family / beta"}</p>
      {isReviewer ? (
        <button className="wide-primary" onClick={() => setMode("FAMILY_BETA")}>
          Turn off reviewer mode
        </button>
      ) : (
        <button className="wide-primary" onClick={() => setMode("REVIEWER")}>
          Turn on reviewer mode
        </button>
      )}
    </div>
  );
}
