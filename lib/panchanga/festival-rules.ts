// Client-safe festival rule provenance.
//
// The VALIDATION authority for these rules is lib/panchanga/validation.ts (the
// madhyahna-vyapti fixtures against Drik Panchang festival pages for 2024-2027
// at Hyderabad + Frisco 2026). That module runs only at build/test time and is
// never bundled for the browser. This module carries just the rule constants +
// their exact provenance so the calendar screen can name the rule, its source
// URL, its access date, and its convention without importing validation.ts.
//
// A festival is listed in the app ONLY when `method === "madhyahna-vyapti"` AND
// the build-verified release-config marks `festival` released. Anything whose
// date-selection rule is not yet independently validated stays here with
// `method: "deferred"` and a plain reason — it is never guessed.

export type FestivalRuleId = "vinayaka-chavithi" | "sankashti-chaturthi";

export interface FestivalRule {
  id: FestivalRuleId;
  name: string;
  nameTe: string;
  /** How the calendar date is chosen. Only "madhyahna-vyapti" is displayed. */
  method: "madhyahna-vyapti" | "deferred";
  /** mhah-panchang masa / paksha / tithi the rule targets (madhyahna-vyapti). */
  masa: string;
  paksha: string;
  tithi: string;
  /** Opens this puja service when selected (null ⇒ no puja yet). */
  pujaSlug: string | null;
  /** Exact rule name + convention, quoted, never paraphrased into a claim. */
  ruleName: string;
  convention: string;
  provenanceUrl: string;
  accessedISO: string;
  /** For a deferred rule: the honest reason it is not shown. */
  deferredReason?: string;
}

export const FESTIVAL_RULES: readonly FestivalRule[] = [
  {
    id: "vinayaka-chavithi",
    name: "Vinayaka Chavithi (Ganesha Chaturthi)",
    nameTe: "వినాయక చవితి",
    method: "madhyahna-vyapti",
    masa: "Bhadraba",
    paksha: "Shukla",
    tithi: "Chaturthi",
    pujaSlug: "vinayaka-chavithi",
    ruleName: "Madhyahna-vyapti (Chaturthi prevailing during the madhyahna kala)",
    convention:
      "The first day on which Shukla Chaturthi of the lunar month Bhadrapada is " +
      "present at any instant of that day's Madhyahna kala (the middle fifth of " +
      "the day, sunrise + 2·D/5 to sunrise + 3·D/5); the earlier of two " +
      "consecutive qualifying days (Dharma Sindhu पूर्वैव). The puja window is " +
      "that madhyahna ∩ the Chaturthi tithi span. Validated against Drik " +
      "Panchang festival pages for 2024-2027 at Hyderabad and 2026 at Frisco.",
    provenanceUrl:
      "https://www.drikpanchang.com/festivals/ganesh-chaturthi/ganesh-chaturthi-date-time.html",
    accessedISO: "2026-09-09",
  },
  {
    id: "sankashti-chaturthi",
    name: "Sankashti Chaturthi",
    nameTe: "సంకష్టి చతుర్థి",
    method: "deferred",
    masa: "",
    paksha: "Krishna",
    tithi: "Chaturthi",
    pujaSlug: null,
    ruleName: "Chandrodaya-vyapti (Krishna Chaturthi prevailing at moonrise)",
    convention:
      "Sankashti Chaturthi is chosen by the day on which Krishna-paksha " +
      "Chaturthi prevails at MOONRISE (chandrodaya), and it is observed with a " +
      "moonrise-timed puja. VedaSaarathi does not yet compute moonrise, and no " +
      "moonrise-based rule has been modelled or validated against an " +
      "authoritative reference here.",
    provenanceUrl: "https://www.drikpanchang.com/fasting/sankashti-chaturthi-dates.html",
    accessedISO: "2026-09-10",
    deferredReason:
      "The moonrise-based day-selection rule is not yet modelled or " +
      "independently validated. Deferred rather than guessed.",
  },
] as const;

/** Rules that are actually displayed (validated + method supported). */
export function displayedFestivalRules(): FestivalRule[] {
  return FESTIVAL_RULES.filter((r) => r.method === "madhyahna-vyapti");
}

/** Rules deferred with a stated reason (shown as an honest note, never a date). */
export function deferredFestivalRules(): FestivalRule[] {
  return FESTIVAL_RULES.filter((r) => r.method === "deferred");
}

export function festivalRule(id: string): FestivalRule | undefined {
  return FESTIVAL_RULES.find((r) => r.id === id);
}
