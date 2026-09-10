// General local search — a real destination.
//
// Deterministic, device-local keyword search over the app's existing
// capabilities. NOT AI, NOT an internet search: it makes no network request and
// never generates a religious answer. Every result navigates to a real working
// screen.
//
// Matching: the query and every keyword are normalised (lower-cased, trimmed,
// internal whitespace collapsed, common punctuation dropped, Telugu left
// intact). A capability matches when any of its keywords is a substring of the
// query OR the query is a substring of a keyword, OR every whitespace-separated
// query token matches some keyword that way. Results are ranked by the
// strongest match.

export type SearchRoute =
  | "vinayaka-puja"
  | "sankalpam"
  | "today-panchanga"
  | "calendar"
  | "calendar-festivals"
  | "people"
  | "location"
  | "offline-download";

export interface SearchCapability {
  route: SearchRoute;
  /** Plain title shown in the results list. */
  title: string;
  titleTe: string;
  /** One-line description of where it goes. */
  description: string;
  descriptionTe: string;
  /** English + Telugu words / phrases / synonyms that should find this. */
  keywords: readonly string[];
}

export const SEARCH_CAPABILITIES: readonly SearchCapability[] = [
  {
    route: "vinayaka-puja",
    title: "Vinayaka Chavithi Puja",
    titleTe: "వినాయక చవితి పూజ",
    description: "Open the guided Vinayaka (Ganesha) Chavithi puja.",
    descriptionTe: "గైడెడ్ వినాయక చవితి పూజను తెరవండి.",
    keywords: [
      "vinayaka puja", "vinayaka chavithi", "vinayaka chaviti", "vinayaka",
      "ganesh puja", "ganesha puja", "ganesh chaturthi", "ganesha chaturthi",
      "ganpati puja", "ganapati puja", "ganesh", "ganesha", "chavithi", "chaturthi puja",
      "puja", "pooja", "guided puja", "start puja", "do puja", "perform puja",
      "వినాయక పూజ", "వినాయక చవితి", "గణేశ పూజ", "గణపతి పూజ", "పూజ", "వినాయక",
    ],
  },
  {
    route: "sankalpam",
    title: "Sankalpam",
    titleTe: "సంకల్పం",
    description: "Set up and preview your Sankalpam (individual, family or group).",
    descriptionTe: "మీ సంకల్పం సెట్ చేసి చూడండి (వ్యక్తి, కుటుంబం లేదా గుంపు).",
    keywords: [
      "sankalpam", "sankalpa", "sankalp", "family sankalpam", "group sankalpam",
      "individual sankalpam", "resolve", "resolution", "intention", "vow",
      "gotra", "lineage", "sankalpam setup", "sankalpam preview",
      "సంకల్పం", "సంకల్ప", "కుటుంబ సంకల్పం", "గోత్రం", "వంశం",
    ],
  },
  {
    route: "today-panchanga",
    title: "Today's Panchanga",
    titleTe: "నేటి పంచాంగం",
    description: "Today's sunrise, sunset, Tithi and Nakshatra for your saved location.",
    descriptionTe: "మీ స్థానానికి నేటి సూర్యోదయం, సూర్యాస్తమయం, తిథి, నక్షత్రం.",
    keywords: [
      "panchang", "panchanga", "panchangam", "today panchang", "today's panchanga",
      "today tithi", "today's tithi", "tithi", "nakshatra", "star", "sunrise",
      "sunset", "paksha", "masa", "vaara", "weekday", "samvatsara", "ritu", "ayana",
      "today", "now", "current tithi",
      "పంచాంగం", "నేటి తిథి", "నేటి పంచాంగం", "తిథి", "నక్షత్రం", "సూర్యోదయం", "సూర్యాస్తమయం",
      "పక్షం", "మాసం", "వారం", "ఈ రోజు",
    ],
  },
  {
    route: "calendar",
    title: "Monthly Hindu calendar",
    titleTe: "నెలవారీ హిందూ క్యాలెండర్",
    description: "Browse the month grid; pick a day to see its full Panchanga.",
    descriptionTe: "నెల గ్రిడ్ చూడండి; ఏ రోజు అయినా ఎంచుకుని దాని పూర్తి పంచాంగం చూడండి.",
    keywords: [
      "calendar", "hindu calendar", "monthly calendar", "month", "panchang calendar",
      "tithi calendar", "date", "dates", "grid", "next month", "previous month",
      "క్యాలెండర్", "హిందూ క్యాలెండర్", "నెలవారీ", "నెల", "తేదీలు", "పంచాంగ క్యాలెండర్",
    ],
  },
  {
    route: "calendar-festivals",
    title: "Festivals this month",
    titleTe: "ఈ నెల పండుగలు",
    description: "Validated festivals for the month, with their date and rule.",
    descriptionTe: "నెలలోని ధ్రువీకరించిన పండుగలు, వాటి తేదీ, నియమంతో.",
    keywords: [
      "festival", "festivals", "festivals this month", "monthly festivals",
      "vinayaka chavithi date", "ganesh chaturthi date", "holiday", "holidays",
      "vratam", "vrata", "occasion", "occasions", "upcoming festivals",
      "పండుగ", "పండుగలు", "ఈ నెల పండుగలు", "పండగ", "వ్రతం", "వినాయక చవితి తేదీ",
    ],
  },
  {
    route: "people",
    title: "People / participants",
    titleTe: "వ్యక్తులు / పాల్గొనేవారు",
    description: "Add or edit family members and their lineage details.",
    descriptionTe: "కుటుంబ సభ్యులను, వారి వంశ వివరాలను చేర్చండి లేదా మార్చండి.",
    keywords: [
      "people", "participants", "family", "family member", "add family member",
      "add member", "add person", "members", "profile", "profiles", "names",
      "gotra", "veda", "sutra", "sampradaya", "lineage", "edit people", "who is performing",
      "కుటుంబ సభ్యులు", "వ్యక్తులు", "పాల్గొనేవారు", "కుటుంబం", "సభ్యుడు", "పేర్లు", "గోత్రం",
    ],
  },
  {
    route: "location",
    title: "Location",
    titleTe: "స్థానం",
    description: "Set or change your latitude, longitude and time zone.",
    descriptionTe: "మీ అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ సెట్ చేయండి లేదా మార్చండి.",
    keywords: [
      "location", "change location", "set location", "my location", "place",
      "city", "latitude", "longitude", "timezone", "time zone", "gps", "coordinates",
      "where am i", "update location",
      "స్థానం", "స్థలం", "లొకేషన్", "నగరం", "అక్షాంశం", "రేఖాంశం", "టైమ్‌జోన్", "స్థానం మార్చు",
    ],
  },
  {
    route: "offline-download",
    title: "Offline download",
    titleTe: "ఆఫ్‌లైన్ డౌన్‌లోడ్",
    description: "Download the puja, audio and calendar for offline use.",
    descriptionTe: "పూజ, ఆడియో, క్యాలెండర్‌ను ఆఫ్‌లైన్ కోసం డౌన్‌లోడ్ చేయండి.",
    keywords: [
      "offline", "offline download", "download", "download offline", "save offline",
      "use offline", "no internet", "airplane mode", "cache", "download for offline use",
      "ఆఫ్‌లైన్", "డౌన్‌లోడ్", "ఆఫ్‌లైన్ డౌన్‌లోడ్", "ఇంటర్నెట్ లేకుండా",
    ],
  },
] as const;

export interface SearchResult {
  capability: SearchCapability;
  /** Higher = stronger match. */
  score: number;
}

const norm = (s: string) =>
  s.toLowerCase().trim().replace(/['’`.,!?:;()/-]+/g, " ").replace(/\s+/g, " ").trim();

/** Deterministic local search. No network, no generation. */
export function searchCapabilities(query: string): SearchResult[] {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(" ").filter(Boolean);

  const results: SearchResult[] = [];
  for (const cap of SEARCH_CAPABILITIES) {
    let best = 0;
    for (const kwRaw of cap.keywords) {
      const kw = norm(kwRaw);
      if (!kw) continue;
      if (q === kw) best = Math.max(best, 100);
      else if (q.includes(kw)) best = Math.max(best, 70 + Math.min(20, kw.length));
      else if (kw.includes(q) && q.length >= 3) best = Math.max(best, 55);
      else {
        // every query token appears in some keyword
        const eachTokenHits = tokens.every((tok) =>
          cap.keywords.some((k) => {
            const nk = norm(k);
            return nk.includes(tok) || tok.includes(nk);
          }),
        );
        if (eachTokenHits && tokens.length > 0) best = Math.max(best, 40);
      }
    }
    // also match the plain titles
    if (best === 0) {
      const nt = `${norm(cap.title)} ${norm(cap.titleTe)}`;
      if (tokens.every((tok) => nt.includes(tok))) best = 30;
    }
    if (best > 0) results.push({ capability: cap, score: best });
  }
  return results.sort((a, b) => b.score - a.score);
}
