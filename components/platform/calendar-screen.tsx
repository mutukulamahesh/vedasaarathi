"use client";

// Monthly Hindu calendar — a real main-navigation destination.
//
// Gregorian month grid + prev / next / today; today and the selected day
// highlighted; a HUMAN-FRIENDLY selected-day summary first (sunrise/sunset,
// today's Tithi in plain words, Nakshatra, useful/avoid times, festivals), with
// Masa/Paksha/Vaara/Ayana/Ritu/Samvatsara under "Advanced details" and the
// calculation method + sources under "About this calculation".
//
// The month is computed ONCE per (year, month, location) — never in a render.
// The computation yields between days, shows real progress ("Calculating 12 of
// 30 days"), and is cancelled the instant the month or location changes, so
// rapid Prev/Next never queues multiple expensive jobs and a stale month is
// never shown. A completed month is cached locally (engine version + lat + lng
// + timezone + year-month); a revisit — including offline — is instant. A
// cached month that fails structural validation is discarded and recomputed.

import { ChevronLeft, ChevronRight, CalendarClock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { LocationState } from "@/lib/location/model";
import {
  computeCalendarMonth, todayISOForLocation, CalendarAbortError,
  type CalendarMonth, type CalendarDay, type CalendarDayPeriod,
} from "@/lib/panchanga/calendar";
import { DAY_PERIOD_TEXT, DAY_TIMINGS_SCOPE_EN, DAY_TIMINGS_SCOPE_TE, DAY_TIMINGS_PROVENANCE } from "@/lib/panchanga/day-timings";
import {
  deferredFestivalRules, festivalRule,
} from "@/lib/panchanga/festival-rules";
import {
  teTithiPhrase, teNakshatra, teMasa, tePaksha, teVaara, teAyana, teRitu,
  teSamvatsara, teEndsAt,
} from "@/lib/panchanga/display-te";
import { peekCachedMonth, writeCachedMonth } from "@/lib/storage/calendar-cache";

type Lang = "EN" | "TE";

const T = {
  EN: {
    title: "Hindu calendar",
    prev: "Previous month",
    next: "Next month",
    today: "Today",
    noLocation:
      "Set your location to see the calendar. Every day's Panchanga is calculated for your saved latitude, longitude and time zone.",
    setLocation: "Set your location",
    loading: "Calculating this month's Panchanga…",
    progress: (d: number, t: number) => `Calculating ${d} of ${t} days…`,
    error:
      "This month's Panchanga could not be calculated for your location right now. Try again, or check your saved location.",
    retry: "Try again",
    selectedFor: (d: string) => `${d}`,
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    sunrise: "Sunrise", sunset: "Sunset",
    tithi: "Tithi", nakshatra: "Nakshatra",
    tithiExplain: "A Tithi is a lunar day. It does not line up exactly with the clock day.",
    ends: "ends",
    useful: "Useful times", avoid: "Avoid starting important activities",
    advanced: "Advanced details",
    aboutCalc: "About this calculation",
    paksha: "Paksha (fortnight)", masa: "Masa (lunar month)", vaara: "Vaara (weekday)",
    ayana: "Ayana (half-year)", ritu: "Ritu (season)", samvatsara: "Samvatsara (year name)",
    festivalsThisMonth: "Festivals this month",
    noFestivals: "No festival falls in this month.",
    pujaWindow: "Madhyahna puja window",
    openPuja: "Open the puja",
    source: "Source", accessed: "accessed",
    calcMethod:
      "Sunrise, sunset, Tithi and Nakshatra are calculated for your saved latitude, longitude and time zone, checked against selected published Panchanga examples.",
    reviewerHeading: "Reviewer notes",
    deferredHeading: "Not shown yet",
  },
  TE: {
    title: "హిందూ క్యాలెండర్",
    prev: "గత నెల",
    next: "వచ్చే నెల",
    today: "ఈ రోజు",
    noLocation:
      "క్యాలెండర్ చూడటానికి మీ స్థానం సెట్ చేయండి. ప్రతి రోజు పంచాంగం మీరు సేవ్ చేసిన అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ కోసం లెక్కించబడుతుంది.",
    setLocation: "మీ స్థానం సెట్ చేయండి",
    loading: "ఈ నెల పంచాంగం లెక్కిస్తోంది…",
    progress: (d: number, t: number) => `${t} రోజుల్లో ${d} లెక్కిస్తోంది…`,
    error:
      "మీ స్థానం కోసం ఈ నెల పంచాంగం ఇప్పుడు లెక్కించలేకపోయాం. మళ్ళీ ప్రయత్నించండి, లేదా సేవ్ చేసిన స్థానం చూడండి.",
    retry: "మళ్ళీ ప్రయత్నించండి",
    selectedFor: (d: string) => `${d}`,
    weekdays: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
    months: [
      "జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్",
      "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్",
    ],
    sunrise: "సూర్యోదయం", sunset: "సూర్యాస్తమయం",
    tithi: "తిథి", nakshatra: "నక్షత్రం",
    tithiExplain: "తిథి అంటే చాంద్రమాన దినం. ఇది గడియారపు రోజుతో సరిగ్గా సరిపోదు.",
    ends: "ముగింపు",
    useful: "ఉపయోగకరమైన సమయాలు", avoid: "ముఖ్యమైన పనులు మొదలుపెట్టవద్దు",
    advanced: "అదనపు వివరాలు",
    aboutCalc: "ఈ లెక్క గురించి",
    paksha: "పక్షం", masa: "మాసం (చాంద్రమాస)", vaara: "వారం",
    ayana: "అయనం", ritu: "ఋతువు", samvatsara: "సంవత్సరం (పేరు)",
    festivalsThisMonth: "ఈ నెల పండుగలు",
    noFestivals: "ఈ నెలలో పండుగ లేదు.",
    pujaWindow: "మధ్యాహ్న పూజ సమయం",
    openPuja: "పూజ తెరవండి",
    source: "మూలం", accessed: "చూసిన తేదీ",
    calcMethod:
      "సూర్యోదయం, సూర్యాస్తమయం, తిథి, నక్షత్రం మీరు సేవ్ చేసిన అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ కోసం లెక్కించబడతాయి; ఎంపిక చేసిన ప్రచురిత పంచాంగ ఉదాహరణలతో సరిపోల్చబడ్డాయి.",
    reviewerHeading: "సమీక్షకుల గమనికలు",
    deferredHeading: "ఇంకా చూపబడలేదు",
  },
} as const;

function ymFromISO(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}

function periodLabel(id: CalendarDayPeriod["id"], te: boolean): string {
  return te ? DAY_PERIOD_TEXT[id].labelTe : DAY_PERIOD_TEXT[id].labelEn;
}

function PeriodRows({ periods, te }: { periods: CalendarDayPeriod[]; te: boolean }) {
  if (periods.length === 0) return null;
  return (
    <ul className="cal-period-list">
      {periods.map((p) => (
        <li key={p.id}>
          <span>{periodLabel(p.id, te)}</span>
          <span className="cal-period-time">{p.start} – {p.end}</span>
        </li>
      ))}
    </ul>
  );
}

export function CalendarScreen({
  location,
  nowMs,
  language = "EN",
  reviewMode = false,
  openPuja,
  goToLocation,
  focusFestivals = false,
}: {
  location: LocationState;
  nowMs: number;
  language?: Lang;
  reviewMode?: boolean;
  /** Open a real puja service by slug (e.g. "vinayaka-chavithi"). */
  openPuja: (slug: string) => void;
  goToLocation: () => void;
  /** A search result asked to bring the festival section into view. */
  focusFestivals?: boolean;
}) {
  const te = language === "TE";
  const t = te ? T.TE : T.EN;
  const hasNow = nowMs > 0;
  const loc = location.status === "READY" && hasNow ? location : null;
  const ready = loc !== null;
  const todayISO = hasNow ? todayISOForLocation(location, nowMs) : "";
  const todayYM = hasNow ? ymFromISO(todayISO) : { year: 0, month: 0 };

  const [view, setView] = useState<{ year: number; month: number }>(() => todayYM);
  const [selectedISO, setSelectedISO] = useState<string>(() => todayISO);
  const [month, setMonth] = useState<CalendarMonth | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [seenNow, setSeenNow] = useState(false);
  if (hasNow && !seenNow) {
    setSeenNow(true);
    setView(todayYM);
    setSelectedISO(todayISO);
  }

  // Request identity. Any change (month or location) is resolved here during
  // render: the previous month is dropped immediately, a valid cached month is
  // adopted synchronously (no flash, no recompute), and only a cache miss leaves
  // status === "loading" for the effect.
  const key = loc
    ? `${loc.latitude},${loc.longitude},${loc.timezone},${view.year}-${view.month}`
    : "idle";
  const [seenKey, setSeenKey] = useState("");
  if (key !== seenKey) {
    setSeenKey(key);
    setProgress(null);
    if (!loc) {
      setMonth(null);
      setStatus("idle");
    } else {
      const cached = peekCachedMonth({
        latitude: loc.latitude, longitude: loc.longitude, timezone: loc.timezone,
        year: view.year, month: view.month,
      });
      setMonth(cached);
      setStatus(cached ? "ready" : "loading");
    }
  }

  // The expensive month computation. Runs only on a cache miss. It yields
  // between days and is aborted the moment the request identity changes, so
  // rapid navigation never queues a second job.
  const lat = loc?.latitude ?? null;
  const lng = loc?.longitude ?? null;
  const tz = loc?.timezone ?? null;
  const runId = useRef(0);
  useEffect(() => {
    if (lat === null || lng === null || tz === null || status !== "loading") return;
    const q = { latitude: lat, longitude: lng, timezone: tz, year: view.year, month: view.month };
    const controller = new AbortController();
    runId.current += 1;
    const mine = runId.current;
    computeCalendarMonth(q, {
      signal: controller.signal,
      onProgress: (done, total) => {
        if (runId.current === mine) setProgress({ done, total });
      },
    }).then(
      (m) => {
        if (runId.current !== mine) return;
        writeCachedMonth(q, m);
        setMonth(m);
        setStatus("ready");
        setProgress(null);
      },
      (err) => {
        if (runId.current !== mine) return;
        if (err instanceof CalendarAbortError) return; // superseded — ignore
        setStatus("error");
        setProgress(null);
      },
    );
    return () => controller.abort();
  }, [lat, lng, tz, status, view.year, view.month]);

  const retry = () => { if (ready) setStatus("loading"); };

  const setMonthView = (year: number, month: number) => {
    setView({ year, month });
    setSelectedISO(
      hasNow && year === todayYM.year && month === todayYM.month
        ? todayISO
        : `${year}-${String(month).padStart(2, "0")}-01`,
    );
  };
  const shiftMonth = (delta: number) => {
    const zero = view.month - 1 + delta;
    setMonthView(view.year + Math.floor(zero / 12), ((zero % 12) + 12) % 12 + 1);
  };
  const goToday = () => setMonthView(todayYM.year, todayYM.month);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of month?.days ?? []) map.set(d.dateISO, d);
    return map;
  }, [month]);

  const festivalsRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (focusFestivals && status === "ready" && festivalsRef.current) {
      festivalsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusFestivals, status]);

  const selectedDay = byDay.get(selectedISO) ?? null;
  const leadingBlanks = month?.days[0]?.weekday ?? 0;
  const displayedFestivals = month?.festivals ?? [];
  const deferred = deferredFestivalRules();

  const tv = (kind: (s: string) => string, s: string | null) => (s ? (te ? kind(s) : s) : null);

  return (
    <div className="flow-content calendar-screen" lang={te ? "te" : undefined}>
      <div className="calendar-head">
        <h1>{t.title}</h1>
        <div className="calendar-nav">
          <button type="button" aria-label={t.prev} onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={18} />
          </button>
          <strong>{t.months[view.month - 1]} {view.year}</strong>
          <button type="button" aria-label={t.next} onClick={() => shiftMonth(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <button type="button" className="calendar-today-btn" onClick={goToday}>
          <CalendarClock size={15} /> {t.today}
        </button>
      </div>

      {!ready && (
        <div className="calendar-state">
          <p>{t.noLocation}</p>
          <button type="button" className="wide-primary" onClick={goToLocation}>{t.setLocation}</button>
        </div>
      )}

      {ready && status === "loading" && (
        <p className="calendar-state" role="status" aria-live="polite">
          {progress ? t.progress(progress.done, progress.total) : t.loading}
        </p>
      )}

      {ready && status === "error" && (
        <div className="calendar-state">
          <p>{t.error}</p>
          <button type="button" className="wide-secondary" onClick={retry}>{t.retry}</button>
        </div>
      )}

      {ready && status === "ready" && month && (
        <>
          <div className="calendar-grid" role="grid" aria-label={`${t.months[view.month - 1]} ${view.year}`}>
            {t.weekdays.map((w) => (
              <div key={w} className="calendar-weekday" role="columnheader">{w}</div>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`b${i}`} className="calendar-cell calendar-blank" aria-hidden="true" />
            ))}
            {month.days.map((d) => {
              const isToday = d.dateISO === todayISO;
              const isSelected = d.dateISO === selectedISO;
              const hasFestival = d.festivalSlugs.length > 0;
              return (
                <button
                  type="button"
                  key={d.dateISO}
                  role="gridcell"
                  aria-current={isToday ? "date" : undefined}
                  aria-selected={isSelected}
                  className={
                    "calendar-cell" +
                    (isToday ? " is-today" : "") +
                    (isSelected ? " is-selected" : "") +
                    (hasFestival ? " has-festival" : "")
                  }
                  onClick={() => setSelectedISO(d.dateISO)}
                >
                  <span className="calendar-daynum">{d.day}</span>
                  {d.tithi && (
                    <span className="calendar-tithi">
                      {te ? teTithiPhrase(d.tithi.name).split(" ").pop() : d.tithi.name.split(" ").pop()}
                    </span>
                  )}
                  {hasFestival && <span className="calendar-fest-dot" aria-label="festival" />}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <section className="calendar-selected" aria-label={t.selectedFor(selectedISO)}>
              <h2>{selectedISO}</h2>

              {/* Simple summary first. */}
              <dl className="calendar-panchanga">
                {selectedDay.sunrise && <Field label={t.sunrise} value={selectedDay.sunrise} />}
                {selectedDay.sunset && <Field label={t.sunset} value={selectedDay.sunset} />}
                {selectedDay.tithi && (
                  <Field
                    label={t.tithi}
                    value={te ? teTithiPhrase(selectedDay.tithi.name) : selectedDay.tithi.name}
                    sub={`${t.ends} ${te ? teEndsAt(selectedDay.tithi.endsAt) : selectedDay.tithi.endsAt}`}
                  />
                )}
                {selectedDay.nakshatra && (
                  <Field
                    label={t.nakshatra}
                    value={te ? teNakshatra(selectedDay.nakshatra.name) : selectedDay.nakshatra.name}
                    sub={`${t.ends} ${te ? teEndsAt(selectedDay.nakshatra.endsAt) : selectedDay.nakshatra.endsAt}`}
                  />
                )}
              </dl>
              {selectedDay.tithi && <p className="calendar-tithi-explain">{t.tithiExplain}</p>}

              {selectedDay.useful.length > 0 && (
                <div className="cal-times">
                  <h3>{t.useful}</h3>
                  <PeriodRows periods={selectedDay.useful} te={te} />
                </div>
              )}
              {selectedDay.avoid.length > 0 && (
                <div className="cal-times cal-times-avoid">
                  <h3>{t.avoid}</h3>
                  <PeriodRows periods={selectedDay.avoid} te={te} />
                  <p className="calendar-scope">{te ? DAY_TIMINGS_SCOPE_TE : DAY_TIMINGS_SCOPE_EN}</p>
                </div>
              )}

              <details className="calendar-advanced">
                <summary>{t.advanced}</summary>
                <dl className="calendar-panchanga">
                  <Field label={t.paksha} value={te ? tePaksha(selectedDay.paksha) : selectedDay.paksha} />
                  <Field label={t.masa} value={te ? teMasa(selectedDay.masa) : selectedDay.masa} />
                  {selectedDay.vaara && <Field label={t.vaara} value={te ? teVaara(selectedDay.vaara) : selectedDay.vaara} />}
                  {tv(teAyana, selectedDay.ayana) && <Field label={t.ayana} value={tv(teAyana, selectedDay.ayana)!} />}
                  {tv(teRitu, selectedDay.ritu) && <Field label={t.ritu} value={tv(teRitu, selectedDay.ritu)!} />}
                  {tv(teSamvatsara, selectedDay.samvatsara) && (
                    <Field label={t.samvatsara} value={tv(teSamvatsara, selectedDay.samvatsara)!} />
                  )}
                </dl>
              </details>

              <details className="calendar-about-calc">
                <summary>{t.aboutCalc}</summary>
                <p className="plain-note">{t.calcMethod}</p>
                <p className="plain-note">
                  {DAY_TIMINGS_PROVENANCE.convention}{" "}
                  {t.source}: <a href={DAY_TIMINGS_PROVENANCE.url}>{DAY_TIMINGS_PROVENANCE.url}</a>{" "}
                  ({t.accessed} {DAY_TIMINGS_PROVENANCE.accessedISO}).
                </p>
              </details>
            </section>
          )}

          <section className="calendar-festivals" aria-label={t.festivalsThisMonth} ref={festivalsRef}>
            <h2><Sparkles size={16} /> {t.festivalsThisMonth}</h2>
            {displayedFestivals.length === 0 && <p className="calendar-nofest">{t.noFestivals}</p>}
            {displayedFestivals.map((f) => (
              <article key={`${f.ruleId}-${f.dateISO}`} className="calendar-festival-card">
                <button
                  type="button"
                  className="calendar-festival-open"
                  onClick={() => f.opensPuja && openPuja(f.slug)}
                  disabled={!f.opensPuja}
                >
                  <strong>{te ? (festivalRule(f.ruleId)?.nameTe ?? f.name) : f.name}</strong>
                  <span>{f.dateISO}</span>
                </button>
                {f.pujaWindow && (
                  <p className="calendar-festival-window">
                    {t.pujaWindow}: {f.pujaWindow.start} – {f.pujaWindow.end}
                  </p>
                )}
                {f.opensPuja && (
                  <button type="button" className="link-button" onClick={() => openPuja(f.slug)}>
                    {t.openPuja} →
                  </button>
                )}
                {reviewMode && (
                  <p className="calendar-festival-rule">
                    {f.ruleName}. {f.convention}{" "}
                    {t.source}: <a href={f.provenanceUrl}>{f.provenanceUrl}</a> ({t.accessed} {f.accessedISO}).
                  </p>
                )}
              </article>
            ))}

            {/* Family mode shows no "Not shown yet" / deferred implementation
                detail — that lives in Reviewer mode only. */}
            {reviewMode && deferred.length > 0 && (
              <div className="calendar-deferred">
                <h3>{t.reviewerHeading} — {t.deferredHeading}</h3>
                {deferred.map((r) => (
                  <p key={r.id}>
                    <strong>{te ? r.nameTe : r.name}</strong> — {r.deferredReason} {r.convention}
                  </p>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {sub && <span className="calendar-sub">{sub}</span>}
      </dd>
    </div>
  );
}
