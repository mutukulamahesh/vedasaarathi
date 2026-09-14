"use client";

// The platform home screen.
//
// The "today" card is COMPACT by default and family-friendly: the saved city,
// the local date, a plain "Useful times today" list, a plain "Avoid starting
// important activities" list, today's Tithi with a one-line explanation, and the
// festival/puja timing when one applies. Two controls open more: "See full
// Panchanga" (sunrise/sunset, Tithi/Nakshatra end times, Masa/Paksha/Vaara,
// then Samvatsara/Ayana/Ritu under Advanced, then the calculation method and
// sources at the very bottom) and "Why these times?" (what each period is for).
//
// No Samvatsara / Ayana / Ritu / Masa / Paksha / Vaara, no validation
// paragraph, no provenance and no convention text in the collapsed card.
// REVIEWER mode still shows the release-flag diagnostics.

import {
  BookOpenCheck, CalendarDays, Check, ChevronRight,
  ListChecks, MapPin, Search, Sparkles, Sun, Sunset, UsersRound,
} from "lucide-react";
import { useEffect } from "react";

import type { LocationState } from "@/lib/location/model";
import { locationSummaryLabel } from "@/lib/location/model";
import type { ParticipantMode } from "@/lib/content/participants";
import type { PujaDefinition, PujaPathId } from "@/lib/puja/types";
import { stepsForPujaPath } from "@/lib/puja/types";
import type { PujaRunState } from "@/lib/storage/preparation";
import type { LocationPanchanga, PanchangaCardField, PanchangaDayPeriod } from "@/lib/panchanga";
import {
  DAY_PERIOD_TEXT, DAY_TIMINGS_PROVENANCE,
  DAY_TIMINGS_SCOPE_EN, DAY_TIMINGS_SCOPE_TE,
} from "@/lib/panchanga/day-timings";
import {
  teTithiPhrase, teNakshatra, teMasa, tePaksha, teVaara, teAyana, teRitu,
  teSamvatsara, teEndsAt, teClockPhrase,
} from "@/lib/panchanga/display-te";
import { formatTodayInTimezone } from "@/lib/puja/calendar";
import { formatEpochDay, pujaFestivalCountdown } from "@/lib/puja/festival";
import type { Screen } from "@/app/page";

import { OfflineDownload } from "./offline-download";

type Lang = "EN" | "TE";

const MODE_SUMMARY: Record<Lang, Record<ParticipantMode, string>> = {
  EN: { SELF: "Only me", FAMILY: "My family", GROUP: "Students or friends" },
  TE: { SELF: "నేను మాత్రమే", FAMILY: "నా కుటుంబం", GROUP: "విద్యార్థులు / స్నేహితులు" },
};

const L = {
  EN: {
    kicker: "NAMASKARAM",
    welcome: "Welcome",
    subtitle: "Here is what matters today.",
    setLocationNudge: "Save your location so dates are calculated for your city.",
    setLocation: "Set your location",
    today: "TODAY",
    todayIn: (c: string) => `TODAY IN ${c.toUpperCase()}`,
    calculating: (c: string) => `Calculating today’s times for ${c}…`,
    calcError: "Today’s times could not be calculated for this location right now.",
    usefulTimes: "Useful times today",
    overlapsAvoid: "part of this also falls in a period marked to avoid, below",
    avoidTimes: "Avoid starting important activities",
    noPeriods: "Times are not calculated yet.",
    tithiLabel: "Today’s Tithi",
    todaysNakshatra: "Today’s Nakshatra",
    // When the sunrise value and the current value differ, each line names
    // its own field (never a bare "At sunrise"/"Now" with no field word) -
    // "Tithi at sunrise" / "Tithi now", "Nakshatra at sunrise" / "Nakshatra
    // now" - so the label stays visible in every display state.
    atSunriseLabel: (field: string) => `${field} at sunrise`,
    nowLabel: (field: string) => `${field} now`,
    changedAt: (time: string) => `changed at ${time}`,
    beginsAt: (time: string) => `begins at ${time}`,
    until: (time: string) => `until ${time}`,
    updating: "Updating…",
    learnTithi: "Learn about Tithi",
    tithiExplain:
      "A Tithi is a lunar day — the phase-based “day” of the Hindu calendar. It does not line up exactly with the clock day.",
    seeFull: "See full Panchanga",
    hideFull: "Hide full Panchanga",
    whyTimes: "Why these times?",
    hideWhy: "Hide",
    ends: "ends",
    advanced: "Advanced details",
    aboutCalc: "About this calculation",
    sunrise: "Sunrise",
    sunset: "Sunset",
    tithi: "Tithi",
    nakshatra: "Nakshatra",
    masa: "Masa (lunar month)",
    paksha: "Paksha (fortnight)",
    vaara: "Vaara (weekday)",
    samvatsara: "Samvatsara (year name)",
    ayana: "Ayana (half-year)",
    ritu: "Ritu (season)",
    festivalNext: (n: string) => `Next ${n}`,
    today0: "today",
    inDays: (n: number) => `in ${n} day${n === 1 ? "" : "s"}`,
    pujaWindow: "Madhyahna puja window",
    calcNote:
      "Sunrise, sunset, Tithi and Nakshatra are calculated for your saved latitude, longitude and time zone. The method has been checked against selected published Panchanga examples.",
    masaConventionNote:
      "Masa (lunar month) uses the Amanta convention — the month ends at the new moon, the reckoning used in Telugu and other South Indian calendars.",
    featured: "Featured puja",
    homePuja: "Home puja",
    change: "Change",
    itemsReady: (r: number, t: number) => `${r} of ${t} items marked ready`,
    completed: (p: string) => `${p} puja completed`,
    inProgress: (p: string, s: number, t: number) => `${p} puja in progress · step ${s} of ${t}`,
    resume: "Resume",
    addPeople: "Add people",
    getReady: "Get puja ready",
    startNew: "Start a new puja",
    restart: "Restart puja",
    quickAccess: "Quick access",
    calendar: "Calendar",
    search: "Search",
    myPuja: "My puja",
    pujas: "Pujas",
    people: "People",
    simple: "Simple",
    complete: "Complete",
  },
  TE: {
    kicker: "నమస్కారం",
    welcome: "స్వాగతం",
    subtitle: "ఈ రోజు ముఖ్యమైనవి ఇవి.",
    setLocationNudge: "మీ నగరానికి తేదీలు లెక్కించడానికి మీ స్థానం సేవ్ చేయండి.",
    setLocation: "మీ స్థానం సెట్ చేయండి",
    today: "ఈ రోజు",
    todayIn: (c: string) => `${c} లో ఈ రోజు`,
    calculating: (c: string) => `${c} కోసం ఈ రోజు సమయాలు లెక్కిస్తోంది…`,
    calcError: "ఈ స్థానానికి ఈ రోజు సమయాలు ఇప్పుడు లెక్కించలేకపోయాం.",
    usefulTimes: "ఈ రోజు ఉపయోగకరమైన సమయాలు",
    overlapsAvoid: "ఇందులో కొంత భాగం కింద వదిలేయాల్సిన సమయంతో కూడా అతివ్యాప్తి చెందుతుంది",
    avoidTimes: "ముఖ్యమైన పనులు మొదలుపెట్టవద్దు",
    noPeriods: "సమయాలు ఇంకా లెక్కించలేదు.",
    tithiLabel: "ఈ రోజు తిథి",
    todaysNakshatra: "ఈ రోజు నక్షత్రం",
    // "సూర్యోదయ తిథి" (sunrise Tithi) / "ప్రస్తుత తిథి" (current Tithi),
    // "సూర్యోదయ నక్షత్రం" / "ప్రస్తుత నక్షత్రం" - the field name is always
    // part of the label, never a bare "సూర్యోదయ సమయానికి"/"ఇప్పుడు" alone.
    atSunriseLabel: (field: string) => `సూర్యోదయ ${field}`,
    nowLabel: (field: string) => `ప్రస్తుత ${field}`,
    changedAt: (time: string) => `${time}కి మారింది`,
    beginsAt: (time: string) => `${time}కి మొదలవుతుంది`,
    until: (time: string) => `${time} వరకు`,
    updating: "నవీకరిస్తోంది…",
    learnTithi: "తిథి గురించి తెలుసుకోండి",
    tithiExplain:
      "తిథి అంటే చాంద్రమాన దినం — చంద్రుని కళల ఆధారంగా హిందూ క్యాలెండర్ “రోజు”. ఇది గడియారపు రోజుతో సరిగ్గా సరిపోదు.",
    seeFull: "పూర్తి పంచాంగం చూడండి",
    hideFull: "పూర్తి పంచాంగం దాచండి",
    whyTimes: "ఈ సమయాలు ఎందుకు?",
    hideWhy: "దాచండి",
    ends: "ముగింపు",
    advanced: "అదనపు వివరాలు",
    aboutCalc: "ఈ లెక్క గురించి",
    sunrise: "సూర్యోదయం",
    sunset: "సూర్యాస్తమయం",
    tithi: "తిథి",
    nakshatra: "నక్షత్రం",
    masa: "మాసం (చాంద్రమాస)",
    paksha: "పక్షం",
    vaara: "వారం",
    samvatsara: "సంవత్సరం (పేరు)",
    ayana: "అయనం (అర్ధ సంవత్సరం)",
    ritu: "ఋతువు",
    festivalNext: (n: string) => `రాబోయే ${n}`,
    today0: "ఈ రోజు",
    inDays: (n: number) => `${n} రోజుల్లో`,
    pujaWindow: "మధ్యాహ్న పూజ సమయం",
    calcNote:
      "సూర్యోదయం, సూర్యాస్తమయం, తిథి, నక్షత్రం మీరు సేవ్ చేసిన అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ కోసం లెక్కించబడతాయి. ఎంపిక చేసిన ప్రచురిత పంచాంగ ఉదాహరణలతో పద్ధతి సరిపోల్చబడింది.",
    masaConventionNote:
      "మాసం అమాంత పద్ధతిలో చూపిస్తాం — నెల అమావాస్యతో ముగుస్తుంది; ఇది తెలుగు, ఇతర దక్షిణ భారత క్యాలెండర్లలో వాడే పద్ధతి.",
    featured: "ముఖ్య పూజ",
    homePuja: "ఇంటి పూజ",
    change: "మార్చు",
    itemsReady: (r: number, t: number) => `${t} లో ${r} వస్తువులు సిద్ధం`,
    completed: (p: string) => `${p} పూజ పూర్తయింది`,
    inProgress: (p: string, s: number, t: number) => `${p} పూజ జరుగుతోంది · దశ ${s} / ${t}`,
    resume: "కొనసాగించండి",
    addPeople: "వ్యక్తులను చేర్చండి",
    getReady: "పూజ సిద్ధం చేయండి",
    startNew: "కొత్త పూజ మొదలుపెట్టండి",
    restart: "పూజ మళ్ళీ మొదలుపెట్టండి",
    quickAccess: "త్వరిత ప్రవేశం",
    calendar: "క్యాలెండర్",
    search: "వెతకండి",
    myPuja: "నా పూజ",
    pujas: "పూజలు",
    people: "వ్యక్తులు",
    simple: "సింపుల్",
    complete: "కంప్లీట్",
  },
} as const;

function periodLabel(id: PanchangaDayPeriod["id"], te: boolean): string {
  return te ? DAY_PERIOD_TEXT[id].labelTe : DAY_PERIOD_TEXT[id].labelEn;
}

function PeriodList({ periods, te, overlapNote }: { periods: PanchangaDayPeriod[]; te: boolean; overlapNote?: string }) {
  return (
    <ul className="home-period-list">
      {periods.map((p) => (
        <li key={p.id}>
          <span className="home-period-name">{periodLabel(p.id, te)}</span>
          <span className="home-period-time">{p.start} – {p.end}</span>
          {p.overlapsAvoid && overlapNote && <small className="home-period-overlap">{overlapNote}</small>}
        </li>
      ))}
    </ul>
  );
}

export function HomeScreen({
  setScreen, openPreparation, resumePuja, reviewMode = false, mode, participantCount,
  materialsReady, materialsTotal = 0, savedStepIndex = 0, savedPath = "SIMPLE",
  runState = "NOT_STARTED", todayEpochDay, nowMs, location, featuredPuja,
  panchanga = null, panchangaStatus = "idle", panchangaDayStale = false,
  tithiPending = false, nakshatraPending = false, language = "EN", focusHint = null,
}: {
  setScreen: (screen: Screen) => void;
  openPreparation: () => void;
  resumePuja?: () => void;
  reviewMode?: boolean;
  mode: ParticipantMode;
  participantCount: number;
  materialsReady: number;
  materialsTotal?: number;
  savedStepIndex?: number;
  savedPath?: PujaPathId;
  runState?: PujaRunState;
  todayEpochDay: number;
  nowMs: number;
  location: LocationState;
  featuredPuja: PujaDefinition | null;
  panchanga?: LocationPanchanga | null;
  panchangaStatus?: "idle" | "loading" | "ready" | "error";
  /** True while the currently-held `panchanga` was computed for a different
   * civil day (or location) than "now" - a midnight rollover is pending a
   * fresh result. Gates every OTHER date-dependent value on the card (daily
   * periods, the festival line, sunrise/sunset, Masa/Paksha/Vaara,
   * Samvatsara/Ayana/Ritu) with a short "updating" state in place of the
   * value, while the reading area and any open disclosure stay exactly as
   * they are. */
  panchangaDayStale?: boolean;
  /** True while the held Tithi value specifically may have already expired -
   * `panchangaDayStale`, or this field's own end has passed with the fresh
   * recompute not yet landed (the narrow gap right at a transition instant).
   * Applied to every displayed copy of Tithi, including the duplicate row
   * inside "Full Panchangam". */
  tithiPending?: boolean;
  /** Same as `tithiPending`, for Nakshatra. Kept separate so one field
   * expiring doesn't also blank an unrelated, still-current field. */
  nakshatraPending?: boolean;
  language?: Lang;
  /** A search result may ask Home to scroll a section into view. */
  focusHint?: "today" | "offline" | null;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;

  // A search result may ask Home to bring a section into view.
  useEffect(() => {
    if (!focusHint) return;
    const id = focusHint === "offline" ? "offline-download" : "today-card";
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusHint]);

  const savedTotal = featuredPuja ? stepsForPujaPath(featuredPuja, savedPath).length : 0;
  const pujaCompleted = runState === "COMPLETED";
  const canResume = Boolean(resumePuja) && runState === "IN_PROGRESS" && participantCount > 0;
  const locationLabel = locationSummaryLabel(location);
  const locationReady = location.status === "READY";
  const localizedToday = locationReady ? formatTodayInTimezone(nowMs, location.timezone, language) : null;
  const todayLabel = localizedToday ?? formatEpochDay(todayEpochDay) ?? "Today";
  const pathWord = (p: PujaPathId) => (p === "SIMPLE" ? t.simple : t.complete);
  const pilotFestival = featuredPuja?.festival ?? null;
  const pilotCountdown = pilotFestival
    ? pujaFestivalCountdown(todayEpochDay, pilotFestival)
    : ({ state: "unknown" } as const);

  const ready = locationReady && panchangaStatus === "ready" && panchanga && panchanga.hasAny;
  const tithiField = panchanga?.fields.find((f) => f.key === "tithi") ?? null;
  const nakshatraField = panchanga?.fields.find((f) => f.key === "nakshatra") ?? null;
  const fest = panchanga?.festival ?? null;

  const ctx = (key: string) => panchanga?.context.find((c) => c.key === key)?.value ?? null;
  const teCtx = (key: string, fn: (s: string) => string) => {
    const v = ctx(key);
    return v ? (te ? fn(v) : v) : null;
  };

  return (
    <div className="content" lang={te ? "te" : undefined}>
      <div className="welcome-row">
        <div>
          <p className="kicker">{t.kicker}</p>
          <h1>{t.welcome}</h1>
          <p className="welcome-copy">{t.subtitle}</p>
        </div>
      </div>

      {!locationReady && (
        <button className="location-nudge" onClick={() => setScreen("location")}>
          <MapPin size={16} />
          <span>
            <strong>{locationLabel}</strong>
            <small>{t.setLocationNudge}</small>
          </span>
          <ChevronRight size={16} />
        </button>
      )}

      <article
        className="today-card"
        id="today-card"
        data-focus={focusHint === "today" ? "true" : undefined}
        lang={te ? "te" : undefined}
      >
        <p className="eyebrow">{locationReady ? t.todayIn(locationLabel) : t.today}</p>
        <h2>{todayLabel}</h2>

        {locationReady && panchangaStatus === "loading" && (
          <p className="panchanga-loading" role="status">{t.calculating(locationLabel)}</p>
        )}
        {locationReady && panchangaStatus === "error" && (
          <p className="plain-note">{t.calcError}</p>
        )}

        {ready && (
          <>
            {panchanga!.useful.length > 0 && (
              <div className="home-times">
                <h3>{t.usefulTimes}</h3>
                {panchangaDayStale ? (
                  <p>{t.updating}</p>
                ) : (
                  <PeriodList periods={panchanga!.useful} te={te} overlapNote={t.overlapsAvoid} />
                )}
              </div>
            )}
            {panchanga!.avoid.length > 0 && (
              <div className="home-times home-times-avoid">
                <h3>{t.avoidTimes}</h3>
                {panchangaDayStale ? (
                  <p>{t.updating}</p>
                ) : (
                  <PeriodList periods={panchanga!.avoid} te={te} />
                )}
              </div>
            )}

            {tithiField && (
              <div className="home-tithi">
                <TithiOrNakshatraLines
                  field={tithiField}
                  te={te}
                  displayValue={(raw) => (te ? teTithiPhrase(raw) : raw)}
                  fieldName={t.tithi}
                  sameValueLabel={t.tithiLabel}
                  pending={tithiPending}
                  labels={{
                    atSunrise: t.atSunriseLabel, now: t.nowLabel,
                    changedAt: t.changedAt, beginsAt: t.beginsAt, until: t.until, updating: t.updating,
                  }}
                />
                <details className="home-tithi-learn">
                  <summary>{t.learnTithi}</summary>
                  <p className="home-tithi-explain">{t.tithiExplain}</p>
                </details>
              </div>
            )}

            {fest && (
              <p className="panchanga-festival">
                <strong>{t.festivalNext(te && fest.nameTe ? fest.nameTe : fest.name)}:</strong>{" "}
                {panchangaDayStale ? t.updating : (
                  <>
                    {fest.dateISO}{" "}
                    {fest.inDays === 0 ? `(${t.today0})` : fest.inDays > 0 ? `(${t.inDays(fest.inDays)})` : ""}
                    {fest.pujaWindow && (
                      <span className="until"> · {t.pujaWindow} {fest.pujaWindow.start}–{fest.pujaWindow.end}</span>
                    )}
                  </>
                )}
              </p>
            )}

            <details className="home-why">
              <summary>{t.whyTimes}</summary>
              <p className="home-why-scope">{te ? DAY_TIMINGS_SCOPE_TE : DAY_TIMINGS_SCOPE_EN}</p>
              <dl>
                {[...panchanga!.useful, ...panchanga!.avoid].map((p) => (
                  <div key={p.id}>
                    <dt>{periodLabel(p.id, te)}</dt>
                    <dd>{te ? DAY_PERIOD_TEXT[p.id].aboutTe : DAY_PERIOD_TEXT[p.id].aboutEn}</dd>
                  </div>
                ))}
              </dl>
            </details>

            <details className="home-see-full">
              <summary>{t.seeFull}</summary>
              <div className="home-full-panchanga">
                <dl className="panchanga-values">
                  {panchanga!.fields.filter((f) => f.key !== "nakshatra").map((f) => {
                    const label = f.key === "sunrise" ? t.sunrise
                      : f.key === "sunset" ? t.sunset : t.tithi;
                    // The duplicate Tithi row shares the SAME per-field
                    // expiry protection as the primary Tithi block above,
                    // not just day-staleness - it's the same field.
                    const fieldPending = f.key === "tithi" ? tithiPending : panchangaDayStale;
                    let value = f.value;
                    if (te && f.key === "tithi") value = teTithiPhrase(f.value);
                    return (
                      <div key={f.key}>
                        <dt>{f.key === "sunrise" ? <Sun size={13} /> : f.key === "sunset" ? <Sunset size={13} /> : null} {label}</dt>
                        <dd>
                          {fieldPending ? t.updating : (
                            <>
                              {value}
                              {f.endsAt && <span className="until"> · {t.ends} {te ? teEndsAt(f.endsAt) : f.endsAt}</span>}
                            </>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                  {ctx("masaAmanta") && (
                    <Row
                      label={t.masa}
                      value={panchangaDayStale ? t.updating : (te ? teMasa(ctx("masaAmanta")!) : ctx("masaAmanta")!)}
                    />
                  )}
                  {ctx("paksha") && (
                    <Row label={t.paksha} value={panchangaDayStale ? t.updating : (te ? tePaksha(ctx("paksha")!) : ctx("paksha")!)} />
                  )}
                  {ctx("vaara") && (
                    <Row label={t.vaara} value={panchangaDayStale ? t.updating : (te ? teVaara(ctx("vaara")!) : ctx("vaara")!)} />
                  )}
                </dl>

                {nakshatraField && (
                  <div className="home-nakshatra">
                    <TithiOrNakshatraLines
                      field={nakshatraField}
                      te={te}
                      displayValue={(raw) => (te ? teNakshatra(raw) : raw)}
                      fieldName={t.nakshatra}
                      sameValueLabel={t.todaysNakshatra}
                      pending={nakshatraPending}
                      labels={{
                        atSunrise: t.atSunriseLabel, now: t.nowLabel,
                        changedAt: t.changedAt, beginsAt: t.beginsAt, until: t.until, updating: t.updating,
                      }}
                    />
                  </div>
                )}

                {(ctx("samvatsara") || ctx("ayana") || ctx("ritu")) && (
                  <details className="home-advanced">
                    <summary>{t.advanced}</summary>
                    <dl className="panchanga-values">
                      {teCtx("samvatsara", teSamvatsara) && (
                        <Row label={t.samvatsara} value={panchangaDayStale ? t.updating : teCtx("samvatsara", teSamvatsara)!} />
                      )}
                      {teCtx("ayana", teAyana) && (
                        <Row label={t.ayana} value={panchangaDayStale ? t.updating : teCtx("ayana", teAyana)!} />
                      )}
                      {teCtx("ritu", teRitu) && (
                        <Row label={t.ritu} value={panchangaDayStale ? t.updating : teCtx("ritu", teRitu)!} />
                      )}
                    </dl>
                  </details>
                )}

                <details className="home-about-calc">
                  <summary>{t.aboutCalc}</summary>
                  <p className="plain-note">{t.calcNote}</p>
                  {ctx("masaAmanta") && <p className="plain-note">{t.masaConventionNote}</p>}
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
          <button className="source-link" onClick={() => setScreen("location")}>
            <MapPin size={14} /> {t.setLocation}
          </button>
        )}

        {reviewMode && panchanga && (
          <div className="panchanga-grid">
            {panchanga.validation.map((r) => (
              <div key={r.field}>
                <span>{r.field}</span>
                <strong>{r.released ? "released" : "BLOCKED"}</strong>
              </div>
            ))}
          </div>
        )}
      </article>

      <div id="offline-download" data-focus={focusHint === "offline" ? "true" : undefined}>
        <OfflineDownload language={language} />
      </div>

      <div className="section-title-row"><h2>{t.featured}</h2></div>
      {featuredPuja ? (
        <article className="festival-card">
          <div className="festival-summary">
            <div className="festival-symbol"><Sparkles size={25} /></div>
            <div className="festival-copy">
              <h3>{featuredPuja.displayName}</h3>
              <p>{t.homePuja}</p>
            </div>
          </div>
          <button className="participant-box full-button" onClick={() => setScreen("people")}>
            <div>
              <UsersRound size={18} />
              <span>
                {MODE_SUMMARY[te ? "TE" : "EN"][mode]} ·{" "}
                {participantCount === 1 ? (te ? "1 వ్యక్తి" : "1 person") : `${participantCount} ${te ? "వ్యక్తులు" : "people"}`}
              </span>
            </div>
            <span>{t.change} <ChevronRight size={15} /></span>
          </button>
          {materialsReady > 0 && (
            <div className="resume-line"><Check size={15} /> {t.itemsReady(materialsReady, materialsTotal)}</div>
          )}
          {pujaCompleted && (
            <div className="resume-line"><Check size={15} /> {t.completed(pathWord(savedPath))}</div>
          )}
          {canResume && (
            <div className="resume-line">
              <Check size={15} /> {t.inProgress(pathWord(savedPath), Math.min(savedStepIndex, Math.max(savedTotal - 1, 0)) + 1, savedTotal)}
              <button className="link-button" onClick={resumePuja}>{t.resume}</button>
            </div>
          )}
          <div className="festival-actions">
            <button className="secondary-action" onClick={() => setScreen("people")}>
              <UsersRound size={17} /> {t.addPeople}
            </button>
            <button className="primary-action" onClick={openPreparation}>
              <ListChecks size={17} /> {pujaCompleted ? t.startNew : canResume ? t.restart : t.getReady}
            </button>
          </div>
          {reviewMode && pilotFestival && (
            <p className="reviewer-diagnostic">
              Reviewer diagnostics: pilot festival date {pilotFestival.dateISO}
              {pilotCountdown.state === "upcoming" ? ` (${pilotCountdown.days} days out, epoch-day math)` : ""}.
              Not a validated per-location calculation.
            </p>
          )}
        </article>
      ) : (
        <article className="festival-card"><p>No puja is available yet.</p></article>
      )}

      <div className="section-title-row"><h2>{t.quickAccess}</h2></div>
      <div className="quick-grid">
        <button onClick={() => setScreen("calendar")}><CalendarDays size={22} /><span>{t.calendar}</span></button>
        <button onClick={() => setScreen("search")}><Search size={22} /><span>{t.search}</span></button>
        <button onClick={openPreparation}><BookOpenCheck size={22} /><span>{t.myPuja}</span></button>
        <button onClick={() => setScreen("people")}><UsersRound size={22} /><span>{t.people}</span></button>
      </div>
    </div>
  );
}

/** Renders a Tithi or Nakshatra field per the compact sunrise/current/
 * transition contract: one line when the sunrise-anchored value and the
 * value prevailing right now agree, two clearly labelled lines when they
 * differ - phrased as "changed at" when the transition already happened, or
 * "begins at" when checked before that day's own sunrise (the sunrise value
 * is itself still upcoming, never described as a past event). */
function TithiOrNakshatraLines({
  field, te, displayValue, fieldName, sameValueLabel, pending, labels,
}: {
  field: PanchangaCardField;
  te: boolean;
  displayValue: (raw: string) => string;
  /** Short field name ("Tithi"/"తిథి" or "Nakshatra"/"నక్షత్రం") - kept
   * visible in every display state, including the differ case, so a line
   * never reads as a bare, unlabelled "At sunrise"/"Now". */
  fieldName: string;
  sameValueLabel: string;
  /** True while `field` (last one actually resolved) may have already
   * expired relative to right now - a civil-day rollover or a
   * Tithi/Nakshatra transition instant has passed and the fresh recompute
   * hasn't landed yet. Shows a short "updating" placeholder in its place,
   * under the SAME visible label, rather than presenting a value that may no
   * longer be true as if it still were. */
  pending?: boolean;
  labels: {
    atSunrise: (field: string) => string; now: (field: string) => string;
    changedAt: (time: string) => string; beginsAt: (time: string) => string; until: (time: string) => string;
    updating: string;
  };
}) {
  if (pending) {
    return <p><strong>{sameValueLabel}:</strong> {labels.updating}</p>;
  }

  const current = displayValue(field.value);
  const clock = (s: string) => (te ? teClockPhrase(s) : s);
  const transition = field.transitionAt ? clock(field.transitionAt) : null;

  if (!field.atSunrise) {
    return (
      <p>
        <strong>{sameValueLabel}:</strong> {current}
        {field.endsAt && (
          <span className="until"> · {labels.until(clock(field.endsAt))}</span>
        )}
      </p>
    );
  }

  const sunriseValue = displayValue(field.atSunrise);
  const atSunriseLabel = labels.atSunrise(fieldName);
  const nowLabel = labels.now(fieldName);
  if (field.transitionIsFuture) {
    return (
      <>
        <p><strong>{nowLabel}:</strong> {current}</p>
        <p>
          <strong>{atSunriseLabel}:</strong> {sunriseValue}
          {transition && <> · {labels.beginsAt(transition)}</>}
        </p>
      </>
    );
  }
  return (
    <>
      <p><strong>{atSunriseLabel}:</strong> {sunriseValue}</p>
      <p>
        <strong>{nowLabel}:</strong> {current}
        {transition && <> · {labels.changedAt(transition)}</>}
      </p>
    </>
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
