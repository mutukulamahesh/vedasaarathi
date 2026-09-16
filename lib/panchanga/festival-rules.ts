// Client-safe festival rule provenance.
//
// The VALIDATION authority for these rules is lib/panchanga/validation.ts (the
// madhyahna-vyapti fixtures against Drik Panchang festival pages for 2024-2027
// at Hyderabad + Frisco 2026) plus the Ugadi Amanta-sunrise and Masa Shivaratri
// Nishita-vyapti dates confirmed by direct Drik Panchang day-panchang fetches
// (see docs/temp/amanta-masa-validation-2026-09-14.md for Ugadi; each rule's
// `convention` field below quotes its own exact dated evidence). That
// validation runs only at build/test time and is never bundled for the
// browser. This module carries just the rule constants + their exact
// provenance so the calendar screen can name the rule, its source URL, its
// access date, and its convention without importing validation.ts.
//
// A festival is listed in the app ONLY when `method` is one of the three
// supported, validated methods below AND the build-verified release-config
// marks `festival` released. Anything whose date-selection rule is not yet
// independently validated stays here with `method: "deferred"` and a plain
// reason — it is never guessed.

export type FestivalRuleId = "vinayaka-chavithi" | "ugadi" | "masa-shivaratri" | "sankashti-chaturthi";

export interface FestivalRule {
  id: FestivalRuleId;
  name: string;
  nameTe: string;
  /** How the calendar date is chosen. "madhyahna-vyapti", "amanta-sunrise",
   * "nishita-vyapti" and "chandrodaya-vyapti" are displayed; "deferred" is
   * not. */
  method: "madhyahna-vyapti" | "amanta-sunrise" | "nishita-vyapti" | "chandrodaya-vyapti" | "deferred";
  /** The lunar month the rule targets, when the method needs one. For
   * "madhyahna-vyapti", mhah-panchang's same-instant masa name (e.g.
   * "Bhadraba"). For "amanta-sunrise", the Amanta (sunrise-anchored) masa
   * name (e.g. "Chaitra") — see `amantaMasaFromMoonMasa` in engine.ts. For
   * "nishita-vyapti" (Masa Shivaratri) and "chandrodaya-vyapti" (Sankashti
   * Chaturthi) — both recur every lunar month, including Adhika — unused,
   * left "": neither rule has a month filter at all. */
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
    name: "Vinayaka Chavithi",
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
    id: "ugadi",
    name: "Ugadi (Telugu New Year)",
    nameTe: "ఉగాది",
    method: "amanta-sunrise",
    masa: "Chaitra",
    paksha: "Shukla",
    tithi: "Pratipada",
    pujaSlug: null,
    ruleName: "Amanta-sunrise (Chaitra Shukla Pratipada prevailing at sunrise, " +
      "with a verified-interval fallback for a tithi that touches no sunrise)",
    convention:
      "The first day on which the Amanta lunar month is Chaitra and Shukla " +
      "Pratipada tithi prevails at that day's sunrise. This is the Telugu / " +
      "South Indian (Amanta) New Year convention — distinct from the North " +
      "Indian Purnimanta reckoning, which names months differently around " +
      "this boundary. In a year where Pratipada is short enough to fall " +
      "entirely between two sunrises, touching neither, the day whose " +
      "bisected Pratipada interval is confirmed to sit strictly between " +
      "those two sunrises is used instead — verified directly against the " +
      "tithi's own computed start/end bounds, not inferred from the month " +
      "label alone. Validated by direct Drik Panchang day-panchang fetches: " +
      "2026-03-19 (Hyderabad and Frisco — the one confirmed case of this " +
      "fallback firing, matching Drik's own published Hyderabad Ugadi date) " +
      "and 2027-04-07 (Hyderabad and Frisco, an ordinary sunrise match, no " +
      "fallback needed), each cross-checked against the day before still " +
      "showing the prior Amanta month (Phalguna) and Amavasya tithi.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/festivals/ugadi/ugadi-newyear-date.html",
    accessedISO: "2026-09-15",
  },
  {
    id: "masa-shivaratri",
    name: "Masa Shivaratri",
    nameTe: "మాస శివరాత్రి",
    method: "nishita-vyapti",
    masa: "",
    paksha: "Krishna",
    tithi: "Chaturdashi",
    pujaSlug: null,
    ruleName: "Nishita-vyapti (Krishna Chaturdashi prevailing during the nishita kala)",
    convention:
      "The first civil day whose NIGHT's Nishita kala — the 8th of 15 equal " +
      "parts of [sunset, next sunrise], the same 15-part day/night division " +
      "already used for Abhijit and Vijaya Muhurta — contains Krishna " +
      "Chaturdashi tithi. Recurs every lunar month (including an Adhika " +
      "month, per Drik's own \"Adhika Masik Shivaratri\" listing), so no " +
      "month filter is applied. Validated by direct Drik Panchang " +
      "day-panchang + Nishita Muhurta fetches: 2026-01-16 (Hyderabad AND " +
      "Frisco agree) and a genuine cross-location divergence at 2026-03-17 " +
      "(Hyderabad) vs. 2026-03-16 (Frisco) — each location's own Nishita " +
      "window checked directly against its own Chaturdashi span, not assumed " +
      "from the other location's result.",
    provenanceUrl: "https://www.drikpanchang.com/vrats/masik-shivaratri-dates.html",
    accessedISO: "2026-09-15",
  },
  {
    id: "sankashti-chaturthi",
    name: "Sankashti Chaturthi",
    nameTe: "సంకష్టి చతుర్థి",
    method: "chandrodaya-vyapti",
    masa: "",
    paksha: "Krishna",
    tithi: "Chaturthi",
    pujaSlug: null,
    ruleName: "Chandrodaya-vyapti (Krishna Chaturthi prevailing at moonrise)",
    convention:
      "The first civil day whose MOONRISE (chandrodaya) falls within " +
      "Krishna-paksha Chaturthi tithi. Recurs every lunar month (including " +
      "an Adhika month), so no month filter is applied, matching Masa " +
      "Shivaratri's approach. When Chaturthi is brief enough to touch NO " +
      "moonrise at all — a regular occurrence for this rule, since the " +
      "moonrise-to-moonrise gap (~24h50m) is longer than a tithi's average " +
      "span (~23h37m) — the occurrence is attributed to whichever civil day " +
      "holds the larger share of the tithi's true (bisected) duration, " +
      "never guessed from a neighbouring day. Validated against ALL of " +
      "Drik Panchang's published 2026 Sankashti dates for both Hyderabad " +
      "and Frisco (13 each, from its dedicated vrat-dates page, which also " +
      "publishes the exact moonrise time used) — every one of the 26 " +
      "matches, including the 3 Frisco dates needing the fallback above " +
      "(Jan 6, Aug 31, Nov 27), each confirmed directly against Drik's own " +
      "published Chaturthi Begin/End times. Moonrise itself is computed " +
      "with the suncalc library (mhah-panchang has no moonrise function at " +
      "all); checked against Drik's 26 published moonrise times first, " +
      "consistently 4-6 minutes off in the same direction, never enough to " +
      "cross a tithi boundary in any of the 26 cases.",
    provenanceUrl: "https://www.drikpanchang.com/vrats/sankashti-chaturthi-dates.html",
    accessedISO: "2026-09-16",
  },
] as const;

/** Rules that are actually displayed (validated + method supported). */
export function displayedFestivalRules(): FestivalRule[] {
  return FESTIVAL_RULES.filter((r) => r.method !== "deferred");
}

/** Rules deferred with a stated reason (shown as an honest note, never a date). */
export function deferredFestivalRules(): FestivalRule[] {
  return FESTIVAL_RULES.filter((r) => r.method === "deferred");
}

export function festivalRule(id: string): FestivalRule | undefined {
  return FESTIVAL_RULES.find((r) => r.id === id);
}
