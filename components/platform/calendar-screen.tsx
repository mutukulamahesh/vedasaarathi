"use client";

// Monthly Hindu calendar — a real main-navigation destination.
//
// Gregorian month grid + prev / next / today, today and the selected day
// highlighted, the selected day's full Panchanga, and the month's validated
// festivals inside their calendar dates and in a list below the grid.
//
// The month is computed ONCE per (year, month, location) — never in a render —
// and cached locally by engine version + latitude + longitude + timezone +
// year-month, so a revisit (including offline, after the offline download) is
// instant. Changing the month or the location clears the previous result
// immediately, so a stale month is never shown.

import { ChevronLeft, ChevronRight, CalendarClock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { LocationState } from "@/lib/location/model";
import {
  computeCalendarMonth, todayISOForLocation,
  type CalendarMonth, type CalendarDay,
} from "@/lib/panchanga/calendar";
import {
  deferredFestivalRules, festivalRule,
} from "@/lib/panchanga/festival-rules";
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
    loading: "Calculating this month's Panchanga for your location…",
    error:
      "This month's Panchanga could not be calculated for your location right now. Try again, or check your saved location.",
    retry: "Try again",
    selectedFor: (d: string) => `Panchanga for ${d}`,
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    fields: {
      sunrise: "Sunrise", sunset: "Sunset", tithi: "Tithi", nakshatra: "Nakshatra",
      paksha: "Paksha", masa: "Masa", vaara: "Vaara", ayana: "Ayana",
      ritu: "Ritu", samvatsara: "Samvatsara",
    },
    ends: "ends",
    festivalsThisMonth: "Festivals this month",
    noFestivals: "No validated festival falls in this month.",
    pujaWindow: "Madhyahna puja window",
    openPuja: "Open the puja",
    rule: "Rule",
    source: "Source",
    accessed: "accessed",
    deferredHeading: "Not shown yet",
    notCalc: "not calculated yet",
  },
  TE: {
    title: "హిందూ క్యాలెండర్",
    prev: "గత నెల",
    next: "వచ్చే నెల",
    today: "ఈ రోజు",
    noLocation:
      "క్యాలెండర్ చూడటానికి మీ స్థానం సెట్ చేయండి. ప్రతి రోజు పంచాంగం మీరు సేవ్ చేసిన అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ కోసం లెక్కించబడుతుంది.",
    setLocation: "మీ స్థానం సెట్ చేయండి",
    loading: "మీ స్థానం కోసం ఈ నెల పంచాంగం లెక్కిస్తోంది…",
    error:
      "మీ స్థానం కోసం ఈ నెల పంచాంగం ఇప్పుడు లెక్కించలేకపోయాం. మళ్ళీ ప్రయత్నించండి, లేదా సేవ్ చేసిన స్థానం చూడండి.",
    retry: "మళ్ళీ ప్రయత్నించండి",
    selectedFor: (d: string) => `${d} పంచాంగం`,
    weekdays: ["ఆది", "సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని"],
    months: [
      "జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్",
      "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్",
    ],
    fields: {
      sunrise: "సూర్యోదయం", sunset: "సూర్యాస్తమయం", tithi: "తిథి", nakshatra: "నక్షత్రం",
      paksha: "పక్షం", masa: "మాసం", vaara: "వారం", ayana: "అయనం",
      ritu: "ఋతువు", samvatsara: "సంవత్సరం",
    },
    ends: "ముగింపు",
    festivalsThisMonth: "ఈ నెల పండుగలు",
    noFestivals: "ఈ నెలలో ధ్రువీకరించిన పండుగ లేదు.",
    pujaWindow: "మధ్యాహ్న పూజ సమయం",
    openPuja: "పూజ తెరవండి",
    rule: "నియమం",
    source: "మూలం",
    accessed: "చూసిన తేదీ",
    deferredHeading: "ఇంకా చూపబడలేదు",
    notCalc: "ఇంకా లెక్కించలేదు",
  },
} as const;

function ymFromISO(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}

export function CalendarScreen({
  location,
  nowMs,
  language = "EN",
  openPuja,
  goToLocation,
}: {
  location: LocationState;
  nowMs: number;
  language?: Lang;
  /** Open a real puja service by slug (e.g. "vinayaka-chavithi"). */
  openPuja: (slug: string) => void;
  goToLocation: () => void;
}) {
  const t = language === "TE" ? T.TE : T.EN;
  const hasNow = nowMs > 0;
  // A single narrowed handle: the ReadyLocation when usable, else null.
  const loc = location.status === "READY" && hasNow ? location : null;
  const ready = loc !== null;
  const todayISO = hasNow ? todayISOForLocation(location, nowMs) : "";
  const todayYM = hasNow ? ymFromISO(todayISO) : { year: 0, month: 0 };

  // view + selected day. Initialised once from `nowMs`; month changes set both.
  const [view, setView] = useState<{ year: number; month: number }>(() => todayYM);
  const [selectedISO, setSelectedISO] = useState<string>(() => todayISO);
  const [month, setMonth] = useState<CalendarMonth | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // First real clock tick: adopt today's month/day.
  const [seenNow, setSeenNow] = useState(false);
  if (hasNow && !seenNow) {
    setSeenNow(true);
    setView(todayYM);
    setSelectedISO(todayISO);
  }

  // The request identity. Any change (month or location) is resolved here during
  // render: the previous month is dropped immediately (a stale month is never
  // shown for a frame) and a locally cached month — including one written before
  // going offline — is adopted synchronously, with no loading flash and no
  // recomputation. Only a cache miss leaves status === "loading" for the effect.
  const key = loc
    ? `${loc.latitude},${loc.longitude},${loc.timezone},${view.year}-${view.month}`
    : "idle";
  const [seenKey, setSeenKey] = useState("");
  if (key !== seenKey) {
    setSeenKey(key);
    if (!loc) {
      setMonth(null);
      setStatus("idle");
    } else {
      const cached = peekCachedMonth({
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: loc.timezone,
        year: view.year,
        month: view.month,
      });
      setMonth(cached);
      setStatus(cached ? "ready" : "loading");
    }
  }

  // The expensive month computation. Runs only on a cache miss (status stays
  // "loading" out of the render block above). Depends only on primitives, so a
  // re-render that keeps the same location/month never restarts it. setState
  // happens solely in the async resolution — never synchronously in the effect.
  const lat = loc?.latitude ?? null;
  const lng = loc?.longitude ?? null;
  const tz = loc?.timezone ?? null;
  useEffect(() => {
    if (lat === null || lng === null || tz === null || status !== "loading") return;
    const q = { latitude: lat, longitude: lng, timezone: tz, year: view.year, month: view.month };
    let cancelled = false;
    computeCalendarMonth(q).then(
      (m) => {
        if (cancelled) return;
        writeCachedMonth(q, m);
        setMonth(m);
        setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("error");
      },
    );
    return () => { cancelled = true; };
  }, [lat, lng, tz, status, view.year, view.month]);

  const retry = () => { if (ready) setStatus("loading"); };

  const setMonthView = (year: number, month: number) => {
    setView({ year, month });
    // Default the selection: today when landing on the current month, else the 1st.
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

  const selectedDay = byDay.get(selectedISO) ?? null;
  const leadingBlanks = month?.days[0]?.weekday ?? 0;

  return (
    <div className="flow-content calendar-screen" lang={language === "TE" ? "te" : undefined}>
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
          <button type="button" className="wide-primary" onClick={goToLocation}>
            {t.setLocation}
          </button>
        </div>
      )}

      {ready && status === "loading" && (
        <p className="calendar-state" role="status" aria-live="polite">{t.loading}</p>
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
                  {d.tithi && <span className="calendar-tithi">{d.tithi.name.split(" ").pop()}</span>}
                  {hasFestival && <span className="calendar-fest-dot" aria-label="festival" />}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <section className="calendar-selected" aria-label={t.selectedFor(selectedISO)}>
              <h2>{t.selectedFor(selectedISO)}</h2>
              <dl className="calendar-panchanga">
                {selectedDay.sunrise && <Field label={t.fields.sunrise} value={selectedDay.sunrise} />}
                {selectedDay.sunset && <Field label={t.fields.sunset} value={selectedDay.sunset} />}
                {selectedDay.tithi && (
                  <Field
                    label={t.fields.tithi}
                    value={selectedDay.tithi.name}
                    sub={`${t.ends} ${selectedDay.tithi.endsAt}`}
                  />
                )}
                {selectedDay.nakshatra && (
                  <Field
                    label={t.fields.nakshatra}
                    value={selectedDay.nakshatra.name}
                    sub={`${t.ends} ${selectedDay.nakshatra.endsAt}`}
                  />
                )}
                <Field label={t.fields.paksha} value={selectedDay.paksha} />
                <Field label={t.fields.masa} value={selectedDay.masa} />
                {selectedDay.vaara && <Field label={t.fields.vaara} value={selectedDay.vaara} />}
                {selectedDay.ayana && <Field label={t.fields.ayana} value={selectedDay.ayana} />}
                {selectedDay.ritu && <Field label={t.fields.ritu} value={selectedDay.ritu} />}
                {selectedDay.samvatsara && (
                  <Field label={t.fields.samvatsara} value={selectedDay.samvatsara} />
                )}
              </dl>
            </section>
          )}

          <section className="calendar-festivals" aria-label={t.festivalsThisMonth}>
            <h2><Sparkles size={16} /> {t.festivalsThisMonth}</h2>
            {month.festivals.length === 0 && <p className="calendar-nofest">{t.noFestivals}</p>}
            {month.festivals.map((f) => (
              <article key={`${f.ruleId}-${f.dateISO}`} className="calendar-festival-card">
                <button
                  type="button"
                  className="calendar-festival-open"
                  onClick={() => f.opensPuja && openPuja(f.slug)}
                  disabled={!f.opensPuja}
                >
                  <strong>{language === "TE" ? (festivalRule(f.ruleId)?.nameTe ?? f.name) : f.name}</strong>
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
                <p className="calendar-festival-rule">
                  {t.rule}: {f.ruleName}. {f.convention}
                  {" "}
                  {t.source}: <a href={f.provenanceUrl}>{f.provenanceUrl}</a> ({t.accessed} {f.accessedISO}).
                </p>
              </article>
            ))}

            {deferredFestivalRules().length > 0 && (
              <div className="calendar-deferred">
                <h3>{t.deferredHeading}</h3>
                {deferredFestivalRules().map((r) => (
                  <p key={r.id}>
                    <strong>{language === "TE" ? r.nameTe : r.name}</strong> — {r.deferredReason}{" "}
                    {r.convention}
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
