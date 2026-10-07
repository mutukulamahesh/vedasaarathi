// Server-rendered topic text for the bilingual public entry pages
// (lib/entry-pages.ts). This is a SERVER component (no "use client"): its
// text is in the initial HTML response, before any JavaScript runs, so a
// search engine or a plain HTTP request sees real content about the topic.
//
// It is deliberately SHORT: each entry page already opens the real app screen
// for its topic directly above this text, so this is a concise summary, not a
// second copy of the app or a long article.
//
// It adds NO new ritual instructions, mantras, festival rules or dates. Every
// fact below is read from the app's existing data modules:
//   - Panchangam: the same period labels Home uses
//     (lib/panchanga/day-timings.ts) - and NO computed values: an anonymous
//     visitor has no saved location, and no city is ever assumed for them.
//   - Festivals: a short description only - the live Calendar above it is
//     the festival list (no second, static catalogue).
//   - Bathukamma 2026: lib/panchanga/festival-schedules.ts, with each day's
//     own evidence status, basis and source, and the REVIEW_REQUIRED status,
//     per location - the same provenance Calendar's Reviewer mode shows.
//   - Vinayaka Chavithi: the puja service definition
//     (lib/pujas/vinayaka/service.ts) and its honest beta status.

import { DAY_TIMINGS_PROVENANCE } from "@/lib/panchanga/day-timings";
import {
  BATHUKAMMA_REGION_TAG, displayedFestivalRules,
  type FestivalRule,
} from "@/lib/panchanga/festival-rules";
import {
  BATHUKAMMA_2026, scheduleDayEvidence,
  type ScheduleDayEvidence, type ScheduleEvidenceStatus, type ScheduleLocation,
} from "@/lib/panchanga/festival-schedules";
import {
  ENTRY_PAGE_TEXT, entryPath, htmlLang, SIBLING_LINK_LABEL,
  type EntryLanguage, type EntryTopic,
} from "@/lib/entry-pages";
import { estimatedMinutesForPujaPath, stepsForPujaPath } from "@/lib/puja/types";
import { VINAYAKA_PUJA } from "@/lib/pujas/vinayaka/service";

import { EntryTopicLinks } from "./entry-topic-links";

type Lang = EntryLanguage;

const MONTHS: Record<Lang, readonly string[]> = {
  EN: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  TE: [
    "జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్",
    "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్",
  ],
};
const WEEKDAYS: Record<Lang, readonly string[]> = {
  EN: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  TE: ["ఆదివారం", "సోమవారం", "మంగళవారం", "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం"],
};

/** "Saturday, 10 October 2026" / "10 అక్టోబర్ 2026, శనివారం" for a civil
 * YYYY-MM-DD date. Pure calendar arithmetic (UTC), no time zone involved -
 * these are named civil dates, not instants. */
export function formatCivilDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return lang === "TE"
    ? `${d} ${MONTHS.TE[m - 1]} ${y}, ${weekday}`
    : `${weekday}, ${d} ${MONTHS.EN[m - 1]} ${y}`;
}

const COMMON = {
  EN: {
    source: "Source",
    accessed: "accessed",
  },
  TE: {
    source: "మూలం",
    accessed: "చూసిన తేదీ",
  },
} as const;

/** Section wrapper shared by every topic: heading, the link to this page's
 * other-language version, the body, and plain links to the other topics. */
function TopicSection({
  topic, lang, heading, children,
}: {
  topic: EntryTopic;
  lang: Lang;
  heading: string;
  children: React.ReactNode;
}) {
  const other: Lang = lang === "EN" ? "TE" : "EN";
  return (
    <section className="entry-topic" lang={htmlLang(lang)} aria-labelledby={`entry-topic-${topic}`}>
      <h2 id={`entry-topic-${topic}`}>{heading}</h2>
      <p className="entry-topic-sibling">
        <a href={entryPath(topic, other)} hrefLang={htmlLang(other)} lang={htmlLang(other)}>
          {SIBLING_LINK_LABEL[other]}
        </a>
      </p>
      {children}
      <EntryTopicLinks language={lang} exclude={topic} includeHome />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Panchangam                                                          */
/* ------------------------------------------------------------------ */

const PANCHANGAM = {
  EN: {
    heading: "Today’s Panchangam for your location",
    lede:
      "Panchangam is the traditional Hindu calendar. VedaSaarathi calculates today’s Panchangam for the location you save, in English or Telugu, for free.",
    what:
      "Each day: sunrise and sunset, Tithi (the lunar day), Nakshatra (the Moon’s star group), useful times such as Abhijit Muhurta, and times to avoid such as Rahu Kalam.",
    location:
      "Times are shown only after you save a location — we never guess your city. Your location is kept on this device.",
    calc:
      "Calculated for your saved latitude, longitude and time zone, and checked against selected published Panchanga examples.",
  },
  TE: {
    heading: "మీ ప్రదేశానికి నేటి పంచాంగం",
    lede:
      "పంచాంగం అంటే సంప్రదాయ హిందూ క్యాలెండర్. మీరు సేవ్ చేసిన ప్రదేశానికి నేటి పంచాంగాన్ని వేదసారథి తెలుగులో లేదా ఇంగ్లీష్‌లో ఉచితంగా లెక్కిస్తుంది.",
    what:
      "ప్రతి రోజు: సూర్యోదయం, సూర్యాస్తమయం, తిథి (చాంద్రమాన దినం), నక్షత్రం (చంద్రుడు ఉన్న నక్షత్ర మండలం), అభిజిత్ ముహూర్తం వంటి ఉపయోగకరమైన సమయాలు, రాహు కాలం వంటి నివారించవలసిన సమయాలు.",
    location:
      "మీరు ప్రదేశాన్ని సేవ్ చేసిన తర్వాతే సమయాలు చూపిస్తాం — మీ నగరాన్ని మేము ఎప్పుడూ ఊహించము. మీ ప్రదేశం ఈ పరికరంలోనే ఉంటుంది.",
    calc:
      "మీరు సేవ్ చేసిన అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ కోసం లెక్కిస్తాం; ఎంపిక చేసిన ప్రచురిత పంచాంగ ఉదాహరణలతో పద్ధతి సరిపోల్చబడింది.",
  },
} as const;

function PanchangamContent({ lang }: { lang: Lang }) {
  const t = PANCHANGAM[lang];
  const c = COMMON[lang];
  return (
    <TopicSection topic="panchangam" lang={lang} heading={t.heading}>
      <p>{t.lede}</p>
      <p>{t.what}</p>
      <p>{t.location}</p>
      <p className="entry-topic-note">{t.calc}</p>
      <p className="entry-topic-note" lang="en">
        {DAY_TIMINGS_PROVENANCE.outputComparison}{" "}
        {c.source}: <a href={DAY_TIMINGS_PROVENANCE.url}>{DAY_TIMINGS_PROVENANCE.url}</a>{" "}
        ({c.accessed} {DAY_TIMINGS_PROVENANCE.accessedISO}).
      </p>
    </TopicSection>
  );
}

/* ------------------------------------------------------------------ */
/* Festival calendar                                                   */
/* ------------------------------------------------------------------ */

const FESTIVALS = {
  EN: {
    heading: "Hindu festival calendar",
    lede:
      "Festivals and monthly observances for your saved location, each with its source and notes. Dates can differ between cities, so they are shown only after you save a location — we never assume a city for you.",
    honest: "A festival is listed only when its date rule is in place; dates are never guessed.",
  },
  TE: {
    heading: "హిందూ పండుగల క్యాలెండర్",
    lede:
      "మీరు సేవ్ చేసిన ప్రదేశానికి పండుగలు, నెలవారీ వ్రతాలు — ప్రతి తేదీ దాని మూలం, గమనికలతో. నగరాన్ని బట్టి తేదీ మారవచ్చు; అందుకే మీ ప్రదేశం సేవ్ చేసిన తర్వాతే తేదీలు చూపిస్తాం — మీ నగరాన్ని మేము ఊహించము.",
    honest: "తేదీ నియమం సిద్ధంగా ఉన్న పండుగను మాత్రమే చూపిస్తాం; తేదీలను ఎప్పుడూ ఊహించము.",
  },
} as const;

function isBathukammaRule(r: FestivalRule): boolean {
  return r.method === "published-schedule" && r.scheduleId === "bathukamma-2026";
}

/** A short description only. The live Calendar this text is shown with IS
 * the festival list (with its own grouping, dates, sources and notes), so no
 * second, static catalogue of every festival is repeated here. */
function FestivalsContent({ lang }: { lang: Lang }) {
  const t = FESTIVALS[lang];
  return (
    <TopicSection topic="festivals" lang={lang} heading={t.heading}>
      <p>{t.lede}</p>
      <p className="entry-topic-note">{t.honest}</p>
    </TopicSection>
  );
}

/* ------------------------------------------------------------------ */
/* Bathukamma 2026                                                     */
/* ------------------------------------------------------------------ */

const BATHUKAMMA = {
  EN: {
    heading: "Bathukamma 2026 dates",
    lede:
      "Bathukamma is observed over nine named days. The dates below are the selected 2026 schedule VedaSaarathi uses, 10–18 October 2026, with where each date comes from.",
    daysHeading: "The nine named days",
    day: "Day",
    name: "Name",
    date: "Date",
    sourcesHeading: "Where these dates apply, and how each one is sourced",
    appliesTo: "Applies to",
    reviewStatus: (s: string) => `Review status: ${s} — no date in this schedule has been reviewed by a priest.`,
    days: (from: number, to: number) => (from === to ? `Day ${from}` : `Days ${from}–${to}`),
    otherPlaces:
      "In the app, these dates appear in your Calendar only when your saved location is one of the cities above. For any other location no Bathukamma date is shown — it is never guessed.",
    notesHeading: "Notes on individual days",
    englishOnly: "",
  },
  TE: {
    heading: "బతుకమ్మ 2026 తేదీలు",
    lede:
      "బతుకమ్మను తొమ్మిది రోజులు, ఒక్కో రోజుకు ఒక్కో పేరుతో జరుపుకుంటారు. కింది తేదీలు వేదసారథి వాడే ఎంచుకున్న 2026 షెడ్యూల్ — 10–18 అక్టోబర్ 2026 — ప్రతి తేదీ ఎక్కడి నుండి వచ్చిందో కూడా.",
    daysHeading: "తొమ్మిది రోజుల పేర్లు",
    day: "రోజు",
    name: "పేరు",
    date: "తేదీ",
    sourcesHeading: "ఈ తేదీలు ఏ నగరాలకు వర్తిస్తాయి, ప్రతి తేదీకి ఆధారం ఏమిటి",
    appliesTo: "వర్తించే ప్రదేశాలు",
    reviewStatus: (s: string) => `సమీక్ష స్థితి: ${s} — ఈ షెడ్యూల్‌లోని ఏ తేదీనీ పురోహితులు ఇంకా సమీక్షించలేదు.`,
    days: (from: number, to: number) => (from === to ? `${from}వ రోజు` : `${from}–${to} రోజులు`),
    otherPlaces:
      "మీరు సేవ్ చేసిన ప్రదేశం పై నగరాల్లో ఒకటైతేనే యాప్ క్యాలెండర్‌లో ఈ తేదీలు కనిపిస్తాయి. వేరే ఏ ప్రదేశానికీ బతుకమ్మ తేదీ చూపము — ఎప్పుడూ ఊహించము.",
    notesHeading: "కొన్ని రోజుల గురించి గమనికలు",
    englishOnly: "మూల వివరాలు ఇంగ్లీష్‌లో ఉన్నాయి.",
  },
} as const;

/** Plain-language meaning of each per-day evidence status. The status code
 * itself is always shown next to it, exactly as the app records it. */
const EVIDENCE_LABEL: Record<ScheduleEvidenceStatus, Record<Lang, string>> = {
  "published-date": {
    EN: "Published: a named official publication states this date.",
    TE: "ప్రచురితం: ఒక అధికారిక ప్రచురణ ఈ తేదీని పేర్కొంది.",
  },
  "separately-sourced": {
    EN: "Separately sourced: established by a different cited fact, not by that publication.",
    TE: "వేరే మూలం: ఆ ప్రచురణ కాకుండా, వేరే ఆధారంతో నిర్ధారించిన తేదీ.",
  },
  "sequence-inferred": {
    EN: "Inferred: no source names this day; it is assumed from the consecutive-day sequence.",
    TE: "ఊహించినది: ఈ రోజును ఏ మూలమూ పేర్కొనలేదు; వరుస రోజుల క్రమం నుండి తీసుకున్నది.",
  },
  "product-selected": {
    EN: "Selected: a product decision from researched candidates — not a published source.",
    TE: "ఎంపిక: పరిశోధించిన అవకాశాల నుండి తీసుకున్న ఉత్పత్తి నిర్ణయం — ప్రచురిత మూలం కాదు.",
  },
};

interface EvidenceRun {
  fromDay: number;
  toDay: number;
  evidence: ScheduleDayEvidence;
}

function sameEvidence(a: ScheduleDayEvidence | null, b: ScheduleDayEvidence | null): boolean {
  return a !== null && b !== null
    && a.basis === b.basis && a.evidenceStatus === b.evidenceStatus
    && a.provenanceUrl === b.provenanceUrl && a.accessedISO === b.accessedISO;
}

/** A location's per-day evidence as runs of consecutive days that share the
 * exact same evidence (e.g. Hyderabad: day 1 / days 2-8 / day 9). Every day
 * keeps its own status; identical days are only listed together. */
export function evidenceRuns(loc: ScheduleLocation, dayNumbers: readonly number[]): EvidenceRun[] {
  const runs: EvidenceRun[] = [];
  for (const day of dayNumbers) {
    const ev = scheduleDayEvidence(loc, day);
    if (!ev) continue;
    const last = runs[runs.length - 1];
    if (last && last.toDay === day - 1 && sameEvidence(last.evidence, ev)) {
      last.toDay = day;
    } else {
      runs.push({ fromDay: day, toDay: day, evidence: ev });
    }
  }
  return runs;
}

/** Locations whose per-day evidence and review status are identical, listed
 * together (the eight US cities share one selected schedule). */
function locationGroups(locs: readonly ScheduleLocation[], dayNumbers: readonly number[]): ScheduleLocation[][] {
  const groups: ScheduleLocation[][] = [];
  const signature = (l: ScheduleLocation) => JSON.stringify([
    l.reviewStatus, dayNumbers.map((d) => scheduleDayEvidence(l, d)),
  ]);
  for (const loc of locs) {
    const g = groups.find((x) => signature(x[0]) === signature(loc));
    if (g) g.push(loc);
    else groups.push([loc]);
  }
  return groups;
}

function BathukammaContent({ lang }: { lang: Lang }) {
  const t = BATHUKAMMA[lang];
  const c = COMMON[lang];
  const sched = BATHUKAMMA_2026;
  const rules = displayedFestivalRules().filter(isBathukammaRule);
  const ruleForDay = (day: number) =>
    rules.find((r) => r.method === "published-schedule" && r.scheduleDay === day) ?? null;
  const dayNumbers = sched.days.map((d) => d.day);
  const dateOf = (day: number) => sched.days.find((d) => d.day === day)?.dateISO ?? "";
  const reviewStatuses = [...new Set(sched.locations.map((l) => l.reviewStatus))].join(", ");
  const dayNotes = sched.days
    .map((d) => ({ day: d.day, rule: ruleForDay(d.day) }))
    .filter((x): x is { day: number; rule: FestivalRule & { method: "published-schedule" } } =>
      x.rule !== null && x.rule.method === "published-schedule"
      && x.rule.scheduleDayNote !== `Day ${x.day} of 9.`);
  return (
    <TopicSection topic="bathukamma-2026" lang={lang} heading={t.heading}>
      <p>{t.lede}</p>
      <p className="entry-topic-tag" lang="en">{BATHUKAMMA_REGION_TAG}</p>
      <p className="entry-topic-note">{lang === "TE" ? sched.familyNoteTe : sched.familyNote}</p>

      <h3>{t.daysHeading}</h3>
      <div className="entry-topic-table-wrap">
        <table className="entry-topic-table">
          <thead>
            <tr><th scope="col">{t.day}</th><th scope="col">{t.name}</th><th scope="col">{t.date}</th></tr>
          </thead>
          <tbody>
            {sched.days.map((d) => {
              const r = ruleForDay(d.day);
              return (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{r ? (lang === "TE" ? r.nameTe : r.name) : ""}</td>
                  <td><time dateTime={d.dateISO}>{formatCivilDate(d.dateISO, lang)}</time></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The review status stays visible; the full per-day evidence (every
          day's status, basis and source, per location) is one tap away in a
          native disclosure - in the same HTML, for every reader, just not
          spread out as a long article under the live Calendar. */}
      <p className="entry-topic-status">{t.reviewStatus(reviewStatuses)}</p>
      <details className="entry-topic-details">
        <summary>{t.sourcesHeading}</summary>
        {t.englishOnly && <p className="entry-topic-note">{t.englishOnly}</p>}
        {locationGroups(sched.locations, dayNumbers).map((group) => (
          <div key={group[0].id} className="entry-topic-evidence">
            <h4>
              {t.appliesTo}: <span lang="en">{group.map((l) => l.label).join("; ")}</span>
            </h4>
            <p className="entry-topic-status">{t.reviewStatus(group[0].reviewStatus)}</p>
            <ul>
              {evidenceRuns(group[0], dayNumbers).map((run) => (
                <li key={run.fromDay}>
                  <strong>
                    {t.days(run.fromDay, run.toDay)}{" "}
                    (<time dateTime={dateOf(run.fromDay)}>{dateOf(run.fromDay)}</time>
                    {run.toDay !== run.fromDay && (
                      <> – <time dateTime={dateOf(run.toDay)}>{dateOf(run.toDay)}</time></>
                    )})
                  </strong>
                  {/* The status exactly as the app records it (Calendar's
                      Reviewer-mode line), then what it means in plain words. */}
                  <span lang="en" className="entry-topic-code">
                    Evidence status: {run.evidence.evidenceStatus}; review status: {group[0].reviewStatus}.
                  </span>
                  <span className="entry-topic-meaning">{EVIDENCE_LABEL[run.evidence.evidenceStatus][lang]}</span>
                  <span className="entry-topic-basis" lang="en">{run.evidence.basis}</span>
                  <span className="entry-topic-source">
                    {c.source}: <a href={run.evidence.provenanceUrl}>{run.evidence.provenanceUrl}</a>{" "}
                    ({c.accessed} {run.evidence.accessedISO})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p>{t.otherPlaces}</p>

        {dayNotes.length > 0 && (
          <>
            <h3>{t.notesHeading}</h3>
            <ul>
              {dayNotes.map(({ day, rule }) => (
                <li key={day}>
                  <strong>{lang === "TE" ? rule.nameTe : rule.name}</strong>:{" "}
                  <span lang="en">{rule.scheduleDayNote}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </details>
    </TopicSection>
  );
}

/* ------------------------------------------------------------------ */
/* Vinayaka Chavithi guided puja                                       */
/* ------------------------------------------------------------------ */

const VINAYAKA = {
  EN: {
    heading: "Vinayaka Chavithi guided puja",
    beta:
      "This puja guide is a beta. It is built from the listed traditional sources, is not yet priest-reviewed, and is still being improved.",
    includedHeading: "What the guide includes",
    paths: (s: number, sm: number, c: number, cm: number) =>
      `Two paths: a Simple Puja (${s} steps, about ${sm} minutes) and a Complete Puja (${c} steps, about ${cm} minutes).`,
    checklist: "A preparation checklist. If something is missing, you can continue with what you have.",
    people:
      "Sankalpam for one person, a family or a group. If you do not know a detail such as Gotra, choose “I don’t know.” We never guess it.",
    audio: "Telugu mantras with audio and a romanised reading. It can be downloaded to work offline.",
    date:
      "The date and the observance time are calculated for your saved location and shown in the festival calendar. We never assume a city for you.",
  },
  TE: {
    heading: "వినాయక చవితి గైడెడ్ పూజ",
    beta:
      "ఈ పూజ గైడ్ బీటా. ఇది జాబితాలోని సంప్రదాయ మూలాల నుండి తయారైంది; పురోహితుల సమీక్ష ఇంకా జరగలేదు; ఇంకా మెరుగుపరుస్తున్నాం.",
    includedHeading: "ఈ గైడ్‌లో ఉన్నవి",
    paths: (s: number, sm: number, c: number, cm: number) =>
      `రెండు విధానాలు: సరళ పూజ (${s} దశలు, సుమారు ${sm} నిమిషాలు), సంపూర్ణ పూజ (${c} దశలు, సుమారు ${cm} నిమిషాలు).`,
    checklist: "సిద్ధత చెక్‌లిస్ట్. ఏదైనా లేకపోయినా అందుబాటులో ఉన్నదానితో పూజను కొనసాగించవచ్చు.",
    people:
      "ఒక్కరు, కుటుంబం లేదా గుంపుగా పూజ చేసేవారి కోసం వ్యక్తుల వివరాలు, సంకల్పం. గోత్రం వంటి కుటుంబ వివరం తెలియకపోతే “నాకు తెలియదు” ఎంచుకోండి. మేము దాన్ని ఎప్పుడూ ఊహించము.",
    audio: "ఆడియోతో తెలుగు మంత్రాలు, రోమన్ ఉచ్చారణ. ఆఫ్‌లైన్‌లో పనిచేయడానికి డౌన్‌లోడ్ చేసుకోవచ్చు.",
    date:
      "తేదీ, ఆచరణ సమయం మీరు సేవ్ చేసిన ప్రదేశానికి లెక్కించి పండుగ క్యాలెండర్‌లో చూపిస్తాం. మీ నగరాన్ని మేము ఊహించము.",
  },
} as const;

function VinayakaContent({ lang }: { lang: Lang }) {
  const t = VINAYAKA[lang];
  const puja = VINAYAKA_PUJA;
  return (
    <TopicSection topic="vinayaka-chavithi-puja" lang={lang} heading={t.heading}>
      <p className="entry-topic-status">{t.beta}</p>
      <h3>{t.includedHeading}</h3>
      <ul>
        <li>
          {t.paths(
            stepsForPujaPath(puja, "SIMPLE").length, estimatedMinutesForPujaPath(puja, "SIMPLE"),
            stepsForPujaPath(puja, "COMPLETE").length, estimatedMinutesForPujaPath(puja, "COMPLETE"),
          )}
        </li>
        <li>{t.checklist}</li>
        <li>{t.people}</li>
        <li>{t.audio}</li>
      </ul>
      <p>
        {t.date}{" "}
        <a href={entryPath("festivals", lang)} hrefLang={htmlLang(lang)}>{ENTRY_PAGE_TEXT.festivals[lang].linkLabel}</a>
      </p>
    </TopicSection>
  );
}

export function EntryTopicContent({ topic, language }: { topic: EntryTopic; language: EntryLanguage }) {
  switch (topic) {
    case "panchangam": return <PanchangamContent lang={language} />;
    case "festivals": return <FestivalsContent lang={language} />;
    case "bathukamma-2026": return <BathukammaContent lang={language} />;
    case "vinayaka-chavithi-puja": return <VinayakaContent lang={language} />;
  }
}
