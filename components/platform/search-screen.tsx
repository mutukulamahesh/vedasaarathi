"use client";

// General local search — a real destination.
//
// Deterministic device-local keyword search over the app's existing
// capabilities (lib/search). It never makes a network request and never
// generates a religious answer. Every result navigates to a real working
// screen.

import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import { searchCapabilities, type SearchRoute } from "@/lib/search";

type Lang = "EN" | "TE";

const T = {
  EN: {
    title: "Search",
    placeholder: "Try: Ganesh puja, today's tithi, festivals this month, change location…",
    hint: "Search this app only — pujas, Sankalpam, Panchanga, the calendar, festivals, people, location and the offline download. No internet search.",
    noResults: "No match. Try a word like puja, sankalpam, tithi, calendar, festival, family, location or offline.",
    resultsFor: (q: string) => `Results for “${q}”`,
  },
  TE: {
    title: "వెతకండి",
    placeholder: "ప్రయత్నించండి: గణేశ పూజ, నేటి తిథి, ఈ నెల పండుగలు, స్థానం మార్చు…",
    hint: "ఈ యాప్‌లో మాత్రమే వెతుకుతుంది — పూజలు, సంకల్పం, పంచాంగం, క్యాలెండర్, పండుగలు, వ్యక్తులు, స్థానం, ఆఫ్‌లైన్ డౌన్‌లోడ్. ఇంటర్నెట్ శోధన కాదు.",
    noResults: "సరిపోలలేదు. పూజ, సంకల్పం, తిథి, క్యాలెండర్, పండుగ, కుటుంబం, స్థానం, ఆఫ్‌లైన్ వంటి పదం ప్రయత్నించండి.",
    resultsFor: (q: string) => `“${q}” కోసం ఫలితాలు`,
  },
} as const;

export function SearchScreen({
  language = "EN",
  onNavigate,
}: {
  language?: Lang;
  /** Navigate to the real screen behind a search route. */
  onNavigate: (route: SearchRoute) => void;
}) {
  const te = language === "TE";
  const t = te ? T.TE : T.EN;
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCapabilities(query), [query]);
  const trimmed = query.trim();

  return (
    <div className="flow-content search-screen" lang={te ? "te" : undefined}>
      <h1>{t.title}</h1>
      <label className="search-field">
        <SearchIcon size={18} aria-hidden="true" />
        <input
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.title}
        />
      </label>
      <p className="search-hint">{t.hint}</p>

      {trimmed !== "" && (
        <>
          <p className="search-results-label">{t.resultsFor(trimmed)}</p>
          {results.length === 0 ? (
            <p className="search-noresults" role="status">{t.noResults}</p>
          ) : (
            <ul className="search-results">
              {results.map(({ capability }) => (
                <li key={capability.route}>
                  <button type="button" onClick={() => onNavigate(capability.route)}>
                    <span className="search-result-title">
                      {te ? capability.titleTe : capability.title}
                    </span>
                    <span className="search-result-desc">
                      {te ? capability.descriptionTe : capability.description}
                    </span>
                    <ArrowRight size={16} className="search-result-go" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
