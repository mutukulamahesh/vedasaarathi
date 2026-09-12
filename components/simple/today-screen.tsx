"use client";

// Simple V1, stage 2: "Today and festival" - the home page of the simplified
// journey. Shows useful daily Panchangam for the saved location (even when no
// festival is occurring) and, below it, the Vinayaka Chavithi festival state
// for that same location: today / upcoming (preview) / already passed this
// year (next occurrence, preview only). A preview is never presented or
// generated as an actual festival-day Sankalpam - see prepare-sankalpam-
// screen.tsx, which reads this same `festivalToday` flag.

import { ChevronRight, MapPin, Play, Sparkles, Sun, Sunset } from "lucide-react";

import { OfflineDownload } from "@/components/platform/offline-download";
import type { LocationState } from "@/lib/location/model";
import { locationSummaryLabel } from "@/lib/location/model";
import type { LocationPanchanga } from "@/lib/panchanga";
import {
  DAY_PERIOD_TEXT, DAY_TIMINGS_PROVENANCE, DAY_TIMINGS_SCOPE_EN, DAY_TIMINGS_SCOPE_TE,
} from "@/lib/panchanga/day-timings";
import {
  teTithiPhrase, teNakshatra, teMasa, tePaksha, teVaara, teAyana, teRitu,
  teSamvatsara, teEndsAt,
} from "@/lib/panchanga/display-te";
import { formatTodayInTimezone } from "@/lib/puja/calendar";

type Lang = "EN" | "TE";

const L = {
  EN: {
    todayIn: (c: string) => `Today in ${c}`,
    changeLocation: "Change location",
    calculating: "Calculating today's Panchangam…",
    calcError: "Today's Panchangam could not be calculated right now.",
    sunrise: "Sunrise", sunset: "Sunset",
    tithi: "Tithi", nakshatra: "Nakshatra",
    until: "until",
    usefulTimes: "Useful times today",
    overlapsAvoid: "part of this also falls in a period marked to avoid, below",
    avoidTimes: "Avoid starting important activities",
    noUseful: "No general useful period is shown for today.",
    scopeNote: DAY_TIMINGS_SCOPE_EN,
    fullPanchangam: "Full Panchangam",
    masa: "Masa (lunar month)", paksha: "Paksha (fortnight)", vaara: "Vaara (weekday)",
    advanced: "Advanced details",
    samvatsara: "Samvatsara (year name)", ayana: "Ayana (half-year)", ritu: "Ritu (season)",
    howCalculated: "How was this calculated?",
    festivalToday: "Vinayaka Chavithi is today",
    festivalUpcoming: "Next Vinayaka Chavithi",
    festivalWindow: "Puja window",
    startPuja: "Start Vinayaka Puja",
    previewPuja: "Preview the puja",
    previewNote: "This is a preview to practise the steps. It is not today's festival Sankalpam.",
  },
  TE: {
    todayIn: (c: string) => `${c}లో ఈ రోజు`,
    changeLocation: "స్థానం మార్చండి",
    calculating: "ఈ రోజు పంచాంగం లెక్కిస్తోంది…",
    calcError: "ఈ రోజు పంచాంగం ఇప్పుడు లెక్కించలేకపోయాము.",
    sunrise: "సూర్యోదయం", sunset: "సూర్యాస్తమయం",
    tithi: "తిథి", nakshatra: "నక్షత్రం",
    until: "వరకు",
    usefulTimes: "ఈ రోజు ఉపయోగకరమైన సమయం",
    overlapsAvoid: "ఇందులో కొంత భాగం కింద వదిలేయాల్సిన సమయంతో కూడా అతివ్యాప్తి చెందుతుంది",
    avoidTimes: "ముఖ్యమైన పనులు ప్రారంభించకుండా ఉండవలసిన సమయం",
    noUseful: "ఈ రోజుకు సాధారణ ఉపయోగకరమైన సమయం చూపబడలేదు.",
    scopeNote: DAY_TIMINGS_SCOPE_TE,
    fullPanchangam: "పూర్తి పంచాంగం",
    masa: "మాసం (చాంద్రమాస)", paksha: "పక్షం", vaara: "వారం",
    advanced: "అదనపు వివరాలు",
    samvatsara: "సంవత్సరం (పేరు)", ayana: "అయనం (అర్ధ సంవత్సరం)", ritu: "ఋతువు",
    howCalculated: "ఇది ఎలా లెక్కించారు?",
    festivalToday: "ఈ రోజు వినాయక చవితి",
    festivalUpcoming: "రాబోయే వినాయక చవితి",
    festivalWindow: "పూజ సమయం",
    startPuja: "వినాయక పూజ మొదలుపెట్టండి",
    previewPuja: "పూజను ప్రాక్టీస్ చేయండి",
    previewNote: "ఇది దశలను అభ్యసించడానికి ఒక ప్రివ్యూ మాత్రమే. ఇది ఈ రోజు పండుగ సంకల్పం కాదు.",
  },
} as const;

function periodLabel(id: string, te: boolean): string {
  const t = DAY_PERIOD_TEXT[id as keyof typeof DAY_PERIOD_TEXT];
  return t ? (te ? t.labelTe : t.labelEn) : id;
}

/** Whether `dateISO` (the location's local civil date the festival falls on)
 * is in the same calendar year as `nowMs` at that same location - i.e. this
 * year's occurrence hasn't happened yet (today or upcoming), vs. already
 * passed and the engine is now reporting NEXT year's occurrence. */
function festivalYearHasNotPassed(dateISO: string, nowMs: number, timezone: string): boolean {
  const festivalYear = Number(dateISO.slice(0, 4));
  const todayYear = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" }).format(new Date(nowMs)),
  );
  return festivalYear <= todayYear;
}

export function TodayScreen({
  location, panchanga, panchangaStatus, nowMs, language = "EN",
  onChangeLocation, onStartPuja, onPreviewPuja,
}: {
  location: LocationState;
  panchanga: LocationPanchanga | null;
  panchangaStatus: "idle" | "loading" | "ready" | "error";
  nowMs: number;
  language?: Lang;
  onChangeLocation: () => void;
  onStartPuja: () => void;
  onPreviewPuja: () => void;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const locationReady = location.status === "READY";
  const locationLabel = locationSummaryLabel(location);
  const localizedToday = locationReady
    ? formatTodayInTimezone(nowMs, location.timezone, language)
    : null;

  const ready = locationReady && panchangaStatus === "ready" && panchanga && panchanga.hasAny;
  const ctx = (key: string) => panchanga?.context.find((c) => c.key === key)?.value ?? null;
  const teCtx = (key: string, fn: (s: string) => string) => {
    const v = ctx(key);
    return v ? (te ? fn(v) : v) : null;
  };
  const fieldFor = (key: string) => panchanga?.fields.find((f) => f.key === key) ?? null;

  const fest = panchanga?.festival ?? null;
  const festivalState: "today" | "upcoming" | "passed" | "unknown" =
    !fest || !locationReady
      ? "unknown"
      : fest.inDays === 0
        ? "today"
        : festivalYearHasNotPassed(fest.dateISO, nowMs, location.timezone)
          ? "upcoming"
          : "passed";

  return (
    <div className="flow-content simple-today" lang={te ? "te" : undefined}>
      {locationReady && (
        <button className="link-button simple-change-location" onClick={onChangeLocation}>
          <MapPin size={14} /> {t.changeLocation}
        </button>
      )}
      <article className="today-card" lang={te ? "te" : undefined}>
        <p className="eyebrow">{locationReady ? t.todayIn(locationLabel) : ""}</p>
        <h2>{localizedToday ?? "—"}</h2>
        {!locationReady && (
          <button className="source-link" onClick={onChangeLocation}>
            <MapPin size={14} /> {t.changeLocation}
          </button>
        )}
        {locationReady && panchangaStatus === "loading" && (
          <p className="panchanga-loading" role="status">{t.calculating}</p>
        )}
        {locationReady && panchangaStatus === "error" && (
          <p className="plain-note">{t.calcError}</p>
        )}

        {ready && (
          <>
            <dl className="simple-today-core">
              {fieldFor("sunrise") && (
                <div>
                  <dt><Sun size={13} /> {t.sunrise}</dt>
                  <dd>{fieldFor("sunrise")!.value}</dd>
                </div>
              )}
              {fieldFor("sunset") && (
                <div>
                  <dt><Sunset size={13} /> {t.sunset}</dt>
                  <dd>{fieldFor("sunset")!.value}</dd>
                </div>
              )}
            </dl>
            {fieldFor("tithi") && (
              <p className="simple-today-line">
                <strong>{t.tithi}:</strong>{" "}
                {te ? teTithiPhrase(fieldFor("tithi")!.value) : fieldFor("tithi")!.value}
                {fieldFor("tithi")!.endsAt && (
                  <> , {t.until} {te ? teEndsAt(fieldFor("tithi")!.endsAt!) : fieldFor("tithi")!.endsAt}</>
                )}
              </p>
            )}
            {fieldFor("nakshatra") && (
              <p className="simple-today-line">
                <strong>{t.nakshatra}:</strong>{" "}
                {te ? teNakshatra(fieldFor("nakshatra")!.value) : fieldFor("nakshatra")!.value}
                {fieldFor("nakshatra")!.endsAt && (
                  <> , {t.until} {te ? teEndsAt(fieldFor("nakshatra")!.endsAt!) : fieldFor("nakshatra")!.endsAt}</>
                )}
              </p>
            )}

            {panchanga!.useful.length > 0 ? (
              <div className="home-times">
                <h3>{t.usefulTimes}</h3>
                <ul className="home-period-list">
                  {panchanga!.useful.map((p) => (
                    <li key={p.id}>
                      <span className="home-period-name">{periodLabel(p.id, te)}</span>
                      <span className="home-period-time">{p.start} – {p.end}</span>
                      {p.overlapsAvoid && <small className="home-period-overlap">{t.overlapsAvoid}</small>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="plain-note simple-no-useful">{t.noUseful}</p>
            )}
            {panchanga!.avoid.length > 0 && (
              <div className="home-times home-times-avoid">
                <h3>{t.avoidTimes}</h3>
                <ul className="home-period-list">
                  {panchanga!.avoid.map((p) => (
                    <li key={p.id}>
                      <span className="home-period-name">{periodLabel(p.id, te)}</span>
                      <span className="home-period-time">{p.start} – {p.end}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="simple-today-scope">{t.scopeNote}</p>

            <details className="home-see-full">
              <summary>{t.fullPanchangam}</summary>
              <div className="home-full-panchanga">
                <dl className="panchanga-values">
                  {ctx("masa") && <Row label={t.masa} value={te ? teMasa(ctx("masa")!) : ctx("masa")!} />}
                  {ctx("paksha") && <Row label={t.paksha} value={te ? tePaksha(ctx("paksha")!) : ctx("paksha")!} />}
                  {ctx("vaara") && <Row label={t.vaara} value={te ? teVaara(ctx("vaara")!) : ctx("vaara")!} />}
                </dl>
                {(ctx("samvatsara") || ctx("ayana") || ctx("ritu")) && (
                  <details className="home-advanced">
                    <summary>{t.advanced}</summary>
                    <dl className="panchanga-values">
                      {teCtx("samvatsara", teSamvatsara) && <Row label={t.samvatsara} value={teCtx("samvatsara", teSamvatsara)!} />}
                      {teCtx("ayana", teAyana) && <Row label={t.ayana} value={teCtx("ayana", teAyana)!} />}
                      {teCtx("ritu", teRitu) && <Row label={t.ritu} value={teCtx("ritu", teRitu)!} />}
                    </dl>
                  </details>
                )}
                <details className="home-about-calc">
                  <summary>{t.howCalculated}</summary>
                  <p className="plain-note">
                    {DAY_TIMINGS_PROVENANCE.convention}{" "}
                    {DAY_TIMINGS_PROVENANCE.outputComparison}{" "}
                    {te ? "మూలం" : "Source"}: <a href={DAY_TIMINGS_PROVENANCE.url}>{DAY_TIMINGS_PROVENANCE.url}</a>{" "}
                    ({DAY_TIMINGS_PROVENANCE.accessedISO}).
                  </p>
                </details>
              </div>
            </details>
          </>
        )}

        {!locationReady && (
          <button className="source-link" onClick={onChangeLocation}>
            <MapPin size={14} /> {t.changeLocation}
          </button>
        )}
      </article>

      {ready && festivalState !== "unknown" && (
        <article className="festival-card simple-festival-card">
          <div className="festival-summary">
            <div className="festival-symbol"><Sparkles size={25} /></div>
            <div className="festival-copy">
              <h3>{festivalState === "today" ? t.festivalToday : t.festivalUpcoming}</h3>
              {festivalState !== "today" && fest && <p>{fest.dateISO}</p>}
            </div>
          </div>
          {fest?.pujaWindow && (
            <p className="festival-window">
              <strong>{t.festivalWindow}:</strong> {fest.pujaWindow.start} – {fest.pujaWindow.end}
            </p>
          )}
          {festivalState === "today" ? (
            <button className="wide-primary" onClick={onStartPuja}>
              <Play size={18} /> {t.startPuja}
            </button>
          ) : (
            <>
              <button className="wide-secondary" onClick={onPreviewPuja}>
                <ChevronRight size={18} /> {t.previewPuja}
              </button>
              <p className="simple-preview-note">{t.previewNote}</p>
            </>
          )}
        </article>
      )}

      <OfflineDownload language={language} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
