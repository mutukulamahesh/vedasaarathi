"use client";

// General local search — a real destination.
//
// Deterministic device-local keyword search over the app's existing
// capabilities (lib/search). It never makes a network request and never
// generates a religious answer. Every result navigates to a real working
// screen.

import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import type { LocationState } from "@/lib/location/model";
import { festivalRuleOccurrence } from "@/lib/panchanga/engine";
import { festivalRule } from "@/lib/panchanga/festival-rules";
import { searchCapabilities, searchFestivals, type SearchRoute } from "@/lib/search";

type Lang = "EN" | "TE";

const T = {
  EN: {
    title: "Search",
    placeholder: "Try: Ganesh puja, today's tithi, festivals this month, change location…",
    hint: "Search this app only — pujas, Sankalpam, Panchanga, the calendar, festivals, people, location and the offline download. No internet search.",
    noResults: "No match. Try a word like puja, sankalpam, tithi, calendar, festival, family, location or offline.",
    resultsFor: (q: string) => `Results for “${q}”`,
    festivalDesc: "Open this festival's next date in the Calendar.",
    computing: "Finding the date for your location…",
    needLocation: "Set your location first — festival dates depend on where you are.",
    noDate: "No date could be found for this festival at your location.",
    error: "The date could not be calculated right now. Please try again.",
  },
  TE: {
    title: "వెతకండి",
    placeholder: "ప్రయత్నించండి: గణేశ పూజ, నేటి తిథి, ఈ నెల పండుగలు, స్థానం మార్చు…",
    hint: "ఈ యాప్‌లో మాత్రమే వెతుకుతుంది — పూజలు, సంకల్పం, పంచాంగం, క్యాలెండర్, పండుగలు, వ్యక్తులు, స్థానం, ఆఫ్‌లైన్ డౌన్‌లోడ్. ఇంటర్నెట్ శోధన కాదు.",
    noResults: "సరిపోలలేదు. పూజ, సంకల్పం, తిథి, క్యాలెండర్, పండుగ, కుటుంబం, స్థానం, ఆఫ్‌లైన్ వంటి పదం ప్రయత్నించండి.",
    resultsFor: (q: string) => `“${q}” కోసం ఫలితాలు`,
    festivalDesc: "ఈ పండుగ తదుపరి తేదీని క్యాలెండర్‌లో తెరవండి.",
    computing: "మీ స్థానానికి తేదీని కనుగొంటోంది…",
    needLocation: "ముందు మీ స్థానం సెట్ చేయండి — పండుగ తేదీలు మీరు ఉన్న చోటుపై ఆధారపడతాయి.",
    noDate: "మీ స్థానంలో ఈ పండుగకు తేదీ దొరకలేదు.",
    error: "తేదీని ఇప్పుడు లెక్కించలేకపోయాం. మళ్ళీ ప్రయత్నించండి.",
  },
} as const;

export function SearchScreen({
  language = "EN",
  onNavigate,
  location,
  nowMs,
  onOpenFestival,
}: {
  language?: Lang;
  /** Navigate to the real screen behind a search route. */
  onNavigate: (route: SearchRoute) => void;
  location: LocationState;
  nowMs: number;
  /** Open Calendar on this festival occurrence's exact date. */
  onOpenFestival: (dateISO: string) => void;
}) {
  const te = language === "TE";
  const t = te ? T.TE : T.EN;
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCapabilities(query), [query]);
  const festivalResults = useMemo(() => searchFestivals(query), [query]);
  const trimmed = query.trim();
  const [pendingRule, setPendingRule] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The date is computed for the SAVED location on demand (never for a
  // location the user has not set) and Calendar opens on that exact day.
  const openFestival = async (ruleId: string) => {
    if (location.status !== "READY") { setNotice(t.needLocation); return; }
    const rule = festivalRule(ruleId);
    if (!rule || nowMs <= 0) return; // nowMs is 0 only for the first pre-hydration frame
    setPendingRule(ruleId);
    setNotice(null);
    try {
      const m = await festivalRuleOccurrence(
        {
          dateMs: nowMs,
          latitude: location.latitude, longitude: location.longitude, timezone: location.timezone,
        },
        rule,
        400,
      );
      if (m) onOpenFestival(m.dateISO);
      else setNotice(t.noDate);
    } catch {
      setNotice(t.error);
    } finally {
      setPendingRule(null);
    }
  };
  const anyResults = results.length > 0 || festivalResults.length > 0;

  return (
    <div className="flow-content search-screen" lang={te ? "te" : undefined}>
      <h1>{t.title}</h1>
      <label className="search-field">
        <SearchIcon size={18} aria-hidden="true" />
        <input
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setNotice(null); }}
          placeholder={t.placeholder}
          aria-label={t.title}
        />
      </label>
      <p className="search-hint">{t.hint}</p>

      {trimmed !== "" && (
        <>
          <p className="search-results-label">{t.resultsFor(trimmed)}</p>
          {!anyResults ? (
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
              {festivalResults.map((f) => (
                <li key={`festival-${f.ruleId}`}>
                  <button
                    type="button"
                    disabled={pendingRule !== null || nowMs <= 0}
                    aria-busy={pendingRule === f.ruleId}
                    onClick={() => openFestival(f.ruleId)}
                  >
                    <span className="search-result-title">{te ? f.nameTe : f.name}</span>
                    <span className="search-result-desc">
                      {pendingRule === f.ruleId ? t.computing : t.festivalDesc}
                    </span>
                    <ArrowRight size={16} className="search-result-go" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {notice && <p className="search-noresults" role="status">{notice}</p>}
        </>
      )}
    </div>
  );
}
