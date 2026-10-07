// Server-rendered topic text for the bilingual public entry pages
// (lib/entry-pages.ts). This is a SERVER component (no "use client"): its
// text is in the initial HTML response, before any JavaScript runs, so a
// search engine or a plain HTTP request sees real content about the topic.
//
// It adds NO new ritual instructions, mantras, festival rules or dates. Every
// fact below is read from the app's existing data modules:
//   - Panchangam: the same labels and explanations Home and Calendar use
//     (lib/panchanga/day-timings.ts) - and NO computed values: an anonymous
//     visitor has no saved location, and no city is ever assumed for them.
//   - Festivals: lib/panchanga/festival-rules.ts (names, regional tags);
//     deferred rules and family-hidden ones are not listed.
//   - Bathukamma 2026: lib/panchanga/festival-schedules.ts, with each day's
//     own evidence status, basis and source, and the REVIEW_REQUIRED status,
//     per location - the same provenance Calendar's Reviewer mode shows.
//   - Vinayaka Chavithi: the puja service definition
//     (lib/pujas/vinayaka/service.ts) and its honest beta status.

import {
  DAY_PERIOD_TEXT, DAY_TIMINGS_PROVENANCE, DAY_TIMINGS_SCOPE_EN, DAY_TIMINGS_SCOPE_TE,
  type DayPeriodId,
} from "@/lib/panchanga/day-timings";
import {
  BATHUKAMMA_REGION_TAG, displayedFestivalRules,
  type FestivalRule,
} from "@/lib/panchanga/festival-rules";
import {
  BATHUKAMMA_2026, scheduleDayEvidence,
  type ScheduleDayEvidence, type ScheduleEvidenceStatus, type ScheduleLocation,
} from "@/lib/panchanga/festival-schedules";
import {
  ENTRY_PAGE_TEXT, ENTRY_TOPICS, entryPath, htmlLang, SIBLING_LINK_LABEL,
  type EntryLanguage, type EntryTopic,
} from "@/lib/entry-pages";
import { estimatedMinutesForPujaPath, stepsForPujaPath } from "@/lib/puja/types";
import { VINAYAKA_PUJA } from "@/lib/pujas/vinayaka/service";

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
    moreTopics: "More from VedaSaarathi",
    home: "VedaSaarathi home",
    source: "Source",
    accessed: "accessed",
  },
  TE: {
    moreTopics: "వేదసారథిలో మరిన్ని",
    home: "వేదసారథి హోమ్",
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
  const c = COMMON[lang];
  return (
    <section className="entry-topic" lang={htmlLang(lang)} aria-labelledby={`entry-topic-${topic}`}>
      <h2 id={`entry-topic-${topic}`}>{heading}</h2>
      <p className="entry-topic-sibling">
        <a href={entryPath(topic, other)} hrefLang={htmlLang(other)} lang={htmlLang(other)}>
          {SIBLING_LINK_LABEL[other]}
        </a>
      </p>
      {children}
      <nav className="entry-topic-more" aria-label={c.moreTopics}>
        <h3>{c.moreTopics}</h3>
        <ul>
          {ENTRY_TOPICS.filter((t) => t !== topic).map((t) => (
            <li key={t}>
              <a href={entryPath(t, lang)} hrefLang={htmlLang(lang)}>{ENTRY_PAGE_TEXT[t][lang].linkLabel}</a>
            </li>
          ))}
          {/* A plain document link on purpose (as for every entry-page link):
              a full navigation re-renders the root layout, so <html lang>
              is right for the page it lands on. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <li><a href="/">{c.home}</a></li>
        </ul>
      </nav>
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
    whatHeading: "What you see each day",
    sunriseSunset: "Sunrise and sunset for your location.",
    tithi:
      "Tithi: a lunar day — the phase-based “day” of the Hindu calendar. It does not line up exactly with the clock day.",
    nakshatra: "Nakshatra: the star group the Moon is passing through.",
    monthDetails: "Masa (lunar month), Paksha (fortnight) and Vaara (weekday).",
    yearDetails: "Samvatsara (year name), Ayana (half-year) and Ritu (season).",
    usefulHeading: "Useful times",
    avoidHeading: "Times to avoid starting important activities",
    locationHeading: "Your location, your choice",
    location:
      "Times are shown only after you save a location — we never guess your city. Type your city by hand, or let the app use your device location; it asks your permission first. Your location is kept on this device.",
    calcHeading: "How it is calculated",
    calc:
      "Sunrise, sunset, Tithi and Nakshatra are calculated for your saved latitude, longitude and time zone. The method has been checked against selected published Panchanga examples.",
    masa:
      "Masa (lunar month) uses the Amanta convention — the month ends at the new moon, the reckoning used in Telugu and other South Indian calendars.",
  },
  TE: {
    heading: "మీ ప్రదేశానికి నేటి పంచాంగం",
    lede:
      "పంచాంగం అంటే సంప్రదాయ హిందూ క్యాలెండర్. మీరు సేవ్ చేసిన ప్రదేశానికి నేటి పంచాంగాన్ని వేదసారథి తెలుగులో లేదా ఇంగ్లీష్‌లో ఉచితంగా లెక్కిస్తుంది.",
    whatHeading: "ప్రతి రోజు మీరు చూసేవి",
    sunriseSunset: "మీ ప్రదేశానికి సూర్యోదయం, సూర్యాస్తమయం.",
    tithi:
      "తిథి: చాంద్రమాన దినం — చంద్రుని కళల ఆధారంగా హిందూ క్యాలెండర్ “రోజు”. ఇది గడియారపు రోజుతో సరిగ్గా సరిపోదు.",
    nakshatra: "నక్షత్రం: చంద్రుడు ప్రయాణిస్తున్న నక్షత్ర మండలం.",
    monthDetails: "మాసం (చాంద్రమాస), పక్షం, వారం.",
    yearDetails: "సంవత్సరం (పేరు), అయనం (అర్ధ సంవత్సరం), ఋతువు.",
    usefulHeading: "ఉపయోగకరమైన సమయాలు",
    avoidHeading: "ముఖ్యమైన పనులు మొదలుపెట్టవద్దు",
    locationHeading: "మీ ప్రదేశం, మీ ఎంపిక",
    location:
      "మీరు ప్రదేశాన్ని సేవ్ చేసిన తర్వాతే సమయాలు చూపిస్తాం — మీ నగరాన్ని మేము ఎప్పుడూ ఊహించము. మీ నగరాన్ని మీరే టైప్ చేయవచ్చు, లేదా పరికర లొకేషన్ వాడనివ్వవచ్చు; యాప్ ముందుగా మీ అనుమతి అడుగుతుంది. మీ ప్రదేశం ఈ పరికరంలోనే ఉంటుంది.",
    calcHeading: "ఈ లెక్క గురించి",
    calc:
      "సూర్యోదయం, సూర్యాస్తమయం, తిథి, నక్షత్రం మీరు సేవ్ చేసిన అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ కోసం లెక్కించబడతాయి. ఎంపిక చేసిన ప్రచురిత పంచాంగ ఉదాహరణలతో పద్ధతి సరిపోల్చబడింది.",
    masa:
      "మాసం అమాంత పద్ధతిలో చూపిస్తాం — నెల అమావాస్యతో ముగుస్తుంది; ఇది తెలుగు, ఇతర దక్షిణ భారత క్యాలెండర్లలో వాడే పద్ధతి.",
  },
} as const;

const USEFUL_PERIODS: readonly DayPeriodId[] = ["abhijit", "vijaya"];
const AVOID_PERIODS: readonly DayPeriodId[] = ["rahu", "yamaganda", "gulika"];

function PeriodDefinitions({ ids, lang }: { ids: readonly DayPeriodId[]; lang: Lang }) {
  return (
    <dl className="entry-topic-defs">
      {ids.map((id) => (
        <div key={id}>
          <dt>{lang === "TE" ? DAY_PERIOD_TEXT[id].labelTe : DAY_PERIOD_TEXT[id].labelEn}</dt>
          <dd>{lang === "TE" ? DAY_PERIOD_TEXT[id].aboutTe : DAY_PERIOD_TEXT[id].aboutEn}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanchangamContent({ lang }: { lang: Lang }) {
  const t = PANCHANGAM[lang];
  const c = COMMON[lang];
  return (
    <TopicSection topic="panchangam" lang={lang} heading={t.heading}>
      <p>{t.lede}</p>
      <h3>{t.whatHeading}</h3>
      <ul>
        <li>{t.sunriseSunset}</li>
        <li>{t.tithi}</li>
        <li>{t.nakshatra}</li>
        <li>{t.monthDetails}</li>
        <li>{t.yearDetails}</li>
      </ul>
      <h3>{t.usefulHeading}</h3>
      <PeriodDefinitions ids={USEFUL_PERIODS} lang={lang} />
      <h3>{t.avoidHeading}</h3>
      <PeriodDefinitions ids={AVOID_PERIODS} lang={lang} />
      <p className="entry-topic-note">{lang === "TE" ? DAY_TIMINGS_SCOPE_TE : DAY_TIMINGS_SCOPE_EN}</p>
      <h3>{t.locationHeading}</h3>
      <p>{t.location}</p>
      <h3>{t.calcHeading}</h3>
      <p>{t.calc}</p>
      <p>{t.masa}</p>
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
      "The Calendar lists festivals and monthly observances for your saved location. Most dates are calculated from your latitude, longitude and time zone, so a date can differ between cities. Each date is shown with its source and notes.",
    honest:
      "A festival is listed only when its date rule is in place. Festivals without one are not shown yet — their dates are never guessed.",
    noLocation: "Save your location to see the dates. We never assume a city for you.",
    groups: {
      major: "Festivals",
      telugu: "Telugu and regional festivals",
      recurring: "Monthly observances",
      "month-context": "Other observances",
    },
    bathukamma: "Bathukamma (nine days, 2026 schedule for named cities)",
    vinayaka: "guided puja available",
    regionNote: "The tag after each name says where the observance is mainly kept, so a regional custom is not shown as universal practice.",
  },
  TE: {
    heading: "హిందూ పండుగల క్యాలెండర్",
    lede:
      "మీరు సేవ్ చేసిన ప్రదేశానికి పండుగలు, నెలవారీ వ్రతాలను క్యాలెండర్ చూపిస్తుంది. చాలా తేదీలు మీ అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ నుండి లెక్కించబడతాయి; కాబట్టి నగరాన్ని బట్టి తేదీ మారవచ్చు. ప్రతి తేదీ దాని మూలం, గమనికలతో చూపిస్తాం.",
    honest:
      "తేదీ నియమం సిద్ధంగా ఉన్న పండుగను మాత్రమే చూపిస్తాం. నియమం లేని పండుగలు ఇంకా చూపడం లేదు — వాటి తేదీలను ఎప్పుడూ ఊహించము.",
    noLocation: "తేదీలు చూడటానికి మీ ప్రదేశాన్ని సేవ్ చేయండి. మీ నగరాన్ని మేము ఊహించము.",
    groups: {
      major: "పండుగలు",
      telugu: "తెలుగు, ప్రాంతీయ పండుగలు",
      recurring: "నెలవారీ వ్రతాలు",
      "month-context": "ఇతర ఆచరణలు",
    },
    bathukamma: "బతుకమ్మ (తొమ్మిది రోజులు, పేర్కొన్న నగరాలకు 2026 షెడ్యూల్)",
    vinayaka: "గైడెడ్ పూజ అందుబాటులో ఉంది",
    regionNote: "ప్రతి పేరు తర్వాత ఉన్న ట్యాగ్ ఆ ఆచరణ ప్రధానంగా ఎక్కడ జరుగుతుందో చెబుతుంది (ఇంగ్లీష్‌లో); ప్రాంతీయ ఆచారాన్ని అందరి ఆచారంగా చూపము.",
  },
} as const;

const FESTIVAL_GROUP_ORDER: readonly FestivalRule["category"][] = ["major", "telugu", "recurring", "month-context"];

function isBathukammaRule(r: FestivalRule): boolean {
  return r.method === "published-schedule" && r.scheduleId === "bathukamma-2026";
}

/** Rules a family can actually see listed in Calendar: implemented
 * (non-deferred) and not hidden from the family list. */
function familyListedRules(): FestivalRule[] {
  return displayedFestivalRules().filter((r) => r.familyVisible !== false);
}

function FestivalsContent({ lang }: { lang: Lang }) {
  const t = FESTIVALS[lang];
  const rules = familyListedRules();
  return (
    <TopicSection topic="festivals" lang={lang} heading={t.heading}>
      <p>{t.lede}</p>
      <p>{t.honest}</p>
      <p className="entry-topic-note">{t.noLocation}</p>
      <p className="entry-topic-note">{t.regionNote}</p>
      {FESTIVAL_GROUP_ORDER.map((category) => {
        const inGroup = rules.filter((r) => r.category === category);
        if (inGroup.length === 0) return null;
        let bathukammaListed = false;
        return (
          <div key={category} className="entry-topic-group">
            <h3>{t.groups[category]}</h3>
            <ul className="entry-topic-festivals">
              {inGroup.map((r) => {
                if (isBathukammaRule(r)) {
                  // The nine named days are one entry here, linking to the
                  // Bathukamma page that lists every day with its evidence.
                  if (bathukammaListed) return null;
                  bathukammaListed = true;
                  return (
                    <li key="bathukamma">
                      <a href={entryPath("bathukamma-2026", lang)} hrefLang={htmlLang(lang)}>{t.bathukamma}</a>{" "}
                      <small lang="en">({BATHUKAMMA_REGION_TAG})</small>
                    </li>
                  );
                }
                return (
                  <li key={r.id}>
                    {lang === "TE" ? r.nameTe : r.name}{" "}
                    <small lang="en">({r.regionTag})</small>
                    {r.pujaSlug === VINAYAKA_PUJA.slug && (
                      <>
                        {" — "}
                        <a href={entryPath("vinayaka-chavithi-puja", lang)} hrefLang={htmlLang(lang)}>{t.vinayaka}</a>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
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

      <h3>{t.sourcesHeading}</h3>
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
      "People and Sankalpam for one person, a family or a group. If you do not know a family detail such as Gotra, choose “I don’t know.” We never guess it.",
    audio: "Telugu mantras with narrated instruction and mantra audio, plus a romanised reading.",
    katha: "The Vrata Katha as an original VedaSaarathi retelling in English and Telugu (not priest-approved).",
    offline: "It can be downloaded to work offline.",
    dateHeading: "When is Vinayaka Chavithi?",
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
    audio: "తెలుగు మంత్రాలు, సూచన మరియు మంత్ర ఆడియోతో పాటు రోమన్ ఉచ్చారణ.",
    katha: "వ్రత కథ — ఇంగ్లీష్, తెలుగులో వేదసారథి సొంత పునఃకథనం (పురోహితుల ఆమోదం లేదు).",
    offline: "ఆఫ్‌లైన్‌లో పనిచేయడానికి డౌన్‌లోడ్ చేసుకోవచ్చు.",
    dateHeading: "వినాయక చవితి ఎప్పుడు?",
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
        <li>{t.katha}</li>
        <li>{t.offline}</li>
      </ul>
      <h3>{t.dateHeading}</h3>
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
