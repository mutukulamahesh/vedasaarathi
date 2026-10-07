// Public, bilingual entry pages: a small, fixed set of real URLs that open an
// EXISTING app screen. They are topic-level entry points only - a URL here
// never carries a person, a Gotra, Sankalpam text, a city or coordinates.
//
// URL SCHEME (see docs/adr/0003-public-entry-pages.md):
//   English  /<slug>        e.g. /panchangam
//   Telugu   /te/<slug>     e.g. /te/panchangam
// The slug is the same in both languages, so each page's language sibling is
// found by adding or removing the "/te" prefix and nothing else.
//
// This module is plain data + small pure helpers. It imports nothing from the
// app, the site config or any screen, so the server pages, the root layout,
// the sitemap and the client app can all read it without import cycles.

export type EntryLanguage = "EN" | "TE";

export const ENTRY_TOPICS = [
  "panchangam",
  "festivals",
  "bathukamma-2026",
  "vinayaka-chavithi-puja",
] as const;

export type EntryTopic = (typeof ENTRY_TOPICS)[number];

/** The path prefix for Telugu pages. English pages have no prefix. */
export const TELUGU_PATH_PREFIX = "/te" as const;

/** The public path of `topic` in `language`. */
export function entryPath(topic: EntryTopic, language: EntryLanguage): string {
  return language === "TE" ? `${TELUGU_PATH_PREFIX}/${topic}` : `/${topic}`;
}

/** The content language of a request path: "TE" for "/te" and anything under
 * it, "EN" for every other path. Used by the root layout's `<html lang>`. */
export function languageForPath(pathname: string): EntryLanguage {
  return pathname === TELUGU_PATH_PREFIX || pathname.startsWith(`${TELUGU_PATH_PREFIX}/`) ? "TE" : "EN";
}

/** BCP 47 tag for the `lang` / `hreflang` attributes. */
export function htmlLang(language: EntryLanguage): "en" | "te" {
  return language === "TE" ? "te" : "en";
}

/** Every entry-page path, English then Telugu, in topic order. */
export const ENTRY_PAGE_PATHS: readonly string[] = [
  ...ENTRY_TOPICS.map((t) => entryPath(t, "EN")),
  ...ENTRY_TOPICS.map((t) => entryPath(t, "TE")),
];

/**
 * Which existing app screen an entry page opens, with the same focus hints
 * the app already uses for its own in-app links (Search results, Home's
 * festival rows). Screen ids are the app's own (app/page.tsx `Screen`).
 */
export type EntryTarget =
  | { screen: "home"; homeFocus: "today" }
  | {
      screen: "calendar";
      calendarFocus: "festivals";
      /** Open on this month and select this day, revealing this festival
       * rule's own entry (null: the current month, nothing forced). */
      calendarYM: { year: number; month: number } | null;
      calendarISO: string | null;
      calendarRuleId: string | null;
    }
  | { screen: "puja-detail"; pujaSlug: string };

/** The Bathukamma 2026 deep link opens October 2026 on day 1, revealing day
 * 1's own entry - the same link Search and Home already make for that day.
 * Kept literal here (not imported) so this module stays dependency-free; a
 * unit test checks it against lib/panchanga/festival-schedules.ts and
 * festival-rules.ts. */
export const BATHUKAMMA_ENTRY = {
  dateISO: "2026-10-10",
  ruleId: "bathukamma-begins",
} as const;

export const ENTRY_TARGETS: Readonly<Record<EntryTopic, EntryTarget>> = {
  panchangam: { screen: "home", homeFocus: "today" },
  festivals: {
    screen: "calendar", calendarFocus: "festivals",
    calendarYM: null, calendarISO: null, calendarRuleId: null,
  },
  "bathukamma-2026": {
    screen: "calendar", calendarFocus: "festivals",
    calendarYM: { year: 2026, month: 10 },
    calendarISO: BATHUKAMMA_ENTRY.dateISO,
    calendarRuleId: BATHUKAMMA_ENTRY.ruleId,
  },
  "vinayaka-chavithi-puja": { screen: "puja-detail", pujaSlug: "vinayaka-chavithi" },
};

/** One page's own head text. Every page has its own title and description -
 * never the homepage's. Only live capabilities are described. */
export interface EntryPageText {
  title: string;
  description: string;
  /** Short link label used on Home and between pages. */
  linkLabel: string;
}

export const ENTRY_PAGE_TEXT: Readonly<Record<EntryTopic, Readonly<Record<EntryLanguage, EntryPageText>>>> = {
  panchangam: {
    EN: {
      title: "Today’s Panchangam for Your Location — Tithi, Nakshatra and Daily Timings | VedaSaarathi",
      description:
        "Free Hindu Panchangam in English and Telugu. Save your city to see today’s tithi, nakshatra, sunrise, sunset, Rahu Kalam and other daily timings, calculated for your location.",
      linkLabel: "Today’s Panchangam",
    },
    TE: {
      title: "మీ ప్రదేశానికి నేటి పంచాంగం — తిథి, నక్షత్రం, రోజువారీ సమయాలు | VedaSaarathi",
      description:
        "తెలుగు, ఇంగ్లీష్‌లో ఉచిత హిందూ పంచాంగం. మీ నగరాన్ని సేవ్ చేస్తే నేటి తిథి, నక్షత్రం, సూర్యోదయం, సూర్యాస్తమయం, రాహు కాలం వంటి సమయాలు మీ ప్రదేశానికి లెక్కించి చూపిస్తాం.",
      linkLabel: "నేటి పంచాంగం",
    },
  },
  festivals: {
    EN: {
      title: "Hindu Festival Calendar with Sources and Notes | VedaSaarathi",
      description:
        "Upcoming Hindu and Telugu festival dates for your saved location, each with its source and notes, plus monthly observances. Free, in English and Telugu.",
      linkLabel: "Festival calendar",
    },
    TE: {
      title: "హిందూ పండుగల క్యాలెండర్ — మూలాలు, గమనికలతో | VedaSaarathi",
      description:
        "మీరు సేవ్ చేసిన ప్రదేశానికి రాబోయే హిందూ, తెలుగు పండుగ తేదీలు — ప్రతి తేదీ దాని మూలం, గమనికలతో; నెలవారీ వ్రతాలు కూడా. ఉచితం, తెలుగు, ఇంగ్లీష్‌లో.",
      linkLabel: "పండుగ క్యాలెండర్",
    },
  },
  "bathukamma-2026": {
    EN: {
      title: "Bathukamma 2026 Dates (10–18 October) with Sources | VedaSaarathi",
      description:
        "The nine named days of Bathukamma 2026, Engili Poola to Saddula Bathukamma, with each date’s evidence status and source for Hyderabad and selected US cities. Not yet priest-reviewed.",
      linkLabel: "Bathukamma 2026 dates",
    },
    TE: {
      title: "బతుకమ్మ 2026 తేదీలు (అక్టోబర్ 10–18) — మూలాలతో | VedaSaarathi",
      description:
        "ఎంగిలిపూల బతుకమ్మ నుండి సద్దుల బతుకమ్మ వరకు 2026 తొమ్మిది రోజుల తేదీలు — హైదరాబాద్, ఎంపిక చేసిన అమెరికా నగరాలకు ప్రతి తేదీ ఆధారం, మూలంతో. పురోహితుల సమీక్ష ఇంకా జరగలేదు.",
      linkLabel: "బతుకమ్మ 2026 తేదీలు",
    },
  },
  "vinayaka-chavithi-puja": {
    EN: {
      title: "Vinayaka Chavithi Puja at Home — Guided Steps in Telugu and English | VedaSaarathi",
      description:
        "A free guided Vinayaka Chavithi home puja: a preparation checklist, Telugu mantras with audio and a romanised reading, and plain-language steps. A beta built from listed traditional sources.",
      linkLabel: "Vinayaka Chavithi guided puja",
    },
    TE: {
      title: "ఇంట్లో వినాయక చవితి పూజ — దశలవారీ గైడ్ | VedaSaarathi",
      description:
        "ఉచిత వినాయక చవితి గైడెడ్ పూజ: సిద్ధత చెక్‌లిస్ట్, ఆడియోతో తెలుగు మంత్రాలు, రోమన్ ఉచ్చారణ, సులభమైన దశలు. సంప్రదాయ మూలాల నుండి తయారైన బీటా.",
      linkLabel: "వినాయక చవితి గైడెడ్ పూజ",
    },
  },
};

/** "Read this page in Telugu / English" - the label of the link to a page's
 * language sibling, written in the SIBLING's language. */
export const SIBLING_LINK_LABEL: Readonly<Record<EntryLanguage, string>> = {
  EN: "Read this page in English",
  TE: "ఈ పేజీ తెలుగులో చదవండి",
};
