"use client";

// Simple V1, stage 1: Welcome and location. Brand + language selector (works
// BEFORE location is set) + the existing, reused LocationScreen (device or
// manual entry, IANA timezone always kept, never re-derived from the browser
// once a location is saved) + one "Continue" action once a location is ready.

import { ChevronRight } from "lucide-react";

import { LocationScreen } from "@/components/platform/location-screen";
import type { LocationState, ReadyLocation } from "@/lib/location/model";

type Lang = "EN" | "TE";

const L = {
  EN: { continue: "Continue" },
  TE: { continue: "కొనసాగించండి" },
} as const;

export function WelcomeScreen({
  location, saveLocation, setLocationStatus, clearLocation, language, setLanguage, onContinue,
}: {
  location: LocationState;
  saveLocation: (next: ReadyLocation) => void;
  setLocationStatus: (status: Exclude<LocationState["status"], "READY">) => void;
  clearLocation: () => boolean;
  language: Lang;
  setLanguage: (value: Lang) => void;
  onContinue: () => void;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  return (
    <div className="simple-welcome">
      <header className="simple-welcome-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">ॐ</div>
          <div className="brand-name">VedaSaarathi</div>
        </div>
        <div className="global-lang-toggle" role="group" aria-label={te ? "భాష" : "Language"}>
          <button
            type="button"
            className={language === "EN" ? "active" : ""}
            aria-pressed={language === "EN"}
            onClick={() => setLanguage("EN")}
          >
            English
          </button>
          <button
            type="button"
            className={language === "TE" ? "active" : ""}
            aria-pressed={language === "TE"}
            lang="te"
            onClick={() => setLanguage("TE")}
          >
            తెలుగు
          </button>
        </div>
      </header>

      <LocationScreen
        location={location}
        saveLocation={saveLocation}
        setLocationStatus={setLocationStatus}
        clearLocation={clearLocation}
        language={language}
      />

      {location.status === "READY" && (
        <div className="simple-welcome-continue">
          <button className="wide-primary" onClick={onContinue}>
            {t.continue} <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
