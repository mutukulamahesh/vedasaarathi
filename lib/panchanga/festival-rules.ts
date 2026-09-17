// Client-safe festival rule provenance.
//
// The VALIDATION authority for the original four rules is
// lib/panchanga/validation.ts (the madhyahna-vyapti fixtures against Drik
// Panchang festival pages for 2024-2027 at Hyderabad + Frisco 2026) plus the
// Ugadi Amanta-sunrise and Masa Shivaratri Nishita-vyapti dates confirmed by
// direct Drik Panchang day-panchang fetches (see
// docs/temp/amanta-masa-validation-2026-09-14.md for Ugadi; each rule's
// `convention` field below quotes its own exact dated evidence). That
// validation runs only at build/test time and is never bundled for the
// browser.
//
// Calendar V1 Phase 1 (docs/temp/festival-calendar-v1-spec-2026-09-17.md)
// adds eight more rules, each independently checked against Drik Panchang's
// own published dates for Hyderabad and Frisco (2026 and/or 2027, whichever
// falls inside the 17 Sep 2026 - 7 Apr 2027 window) — see
// tests/panchanga.test.mjs for the exact fixtures and
// tests/helpers's validation notes cited in each rule's `convention` below.
// Every rule computes its date DYNAMICALLY from latitude/longitude/timezone
// at request time; no 2026/2027 date is ever hardcoded as a production
// result — the dates named in each `convention` string are validation
// fixtures, quoted for provenance, not returned values.
//
// This module carries just the rule constants + their exact provenance so
// the calendar screen can name the rule, its source URL, its access date,
// and its convention without importing validation.ts.
//
// A festival is listed in the app ONLY when `method` is one of the
// supported, validated methods below AND the build-verified release-config
// marks `festival` released. Anything whose date-selection rule is not yet
// independently validated stays here with `method: "deferred"` and a plain
// reason — it is never guessed, and it is never invented merely to fill a
// catalogue slot (see the seven Calendar-only deferred entries at the end of
// FESTIVAL_RULES, added for Phase 1's catalogue-accounting requirement).

export type FestivalRuleId =
  | "vinayaka-chavithi" | "ugadi" | "masa-shivaratri" | "sankashti-chaturthi"
  | "navratri-begins" | "atla-tadde" | "nagula-chavithi" | "bali-padyami"
  | "yama-dwitiya" | "ratha-saptami" | "maha-shivaratri" | "kartika-somavaram"
  | "radha-ashtami" | "anant-chaturdashi" | "pitru-paksha-begins" | "sarva-pitru-amavasya"
  | "gita-jayanti" | "dattatreya-jayanti" | "kalabhairava-jayanti";

/** One of the 10 reusable rule families this catalogue maps every festival
 * to (docs/temp/festival-calendar-v1-spec-2026-09-17.md §3). Distinct from
 * `method` (the exact dispatch key some families specialise into, e.g.
 * "amanta-sunrise" and "tithi-at-sunrise" both belong to the
 * "tithi-at-sunrise" family) - this field is for documentation/spec-mapping
 * and future Phase 2 rule-family batching, and is never read by the engine
 * dispatcher itself. */
export type FestivalRuleFamily =
  | "tithi-at-sunrise" | "madhyahna-vyapti" | "aparahna-vyapti" | "pradosha-vyapti"
  | "nishita-vyapti" | "moonrise-vyapti" | "lunar-month-weekday" | "solar-ingress"
  | "nakshatra-combination" | "multi-day-sequence";

/** Fields every rule carries regardless of `method`. Extended below into a
 * DISCRIMINATED UNION on `method`, so a rule's method decides at the TYPE
 * level whether `fallbackPolicy` is required, forbidden, or optional - see
 * `FestivalRule`'s own doc comment. */
interface FestivalRuleBase {
  id: FestivalRuleId;
  name: string;
  nameTe: string;
  /** The lunar month the rule targets, when the method needs one. For
   * "madhyahna-vyapti", mhah-panchang's same-instant masa name (e.g.
   * "Bhadraba"). For "amanta-sunrise" / "tithi-at-sunrise" (when set) /
   * "nishita-vyapti-annual" / "lunar-month-weekday", the Amanta
   * (sunrise-anchored) masa name (e.g. "Chaitra") — see
   * `amantaMasaFromMoonMasa` in engine.ts. For "nishita-vyapti" (the
   * monthly Masa Shivaratri) and "chandrodaya-vyapti" (Sankashti
   * Chaturthi) — both recur every lunar month, including Adhika — unused,
   * left "": neither rule has a month filter at all. */
  masa: string;
  paksha: string;
  tithi: string;
  /** Opens this puja service when selected (null ⇒ no puja yet). */
  pujaSlug: string | null;
  /** The id of another rule this one SUPERSEDES on any civil date they both
   * land on: when both occurrences share a dateISO, the named rule's
   * occurrence is dropped from every FAMILY-VISIBLE list (Home, Calendar)
   * that date, leaving only this rule's own card - e.g. annual Maha
   * Shivaratri (`supersedes: "masa-shivaratri"`) collapses the ordinary
   * monthly Masa Shivaratri card on the one date each year they coincide.
   * The superseded rule's occurrence is NEVER removed from the underlying
   * per-rule computation itself - `festivalRuleOccurrence` /
   * `festivalRuleOccurrencesInRange` still return it unmodified for tests
   * and any internal caller that needs the raw, uncollapsed set; only the
   * shared `collapseSupersededOccurrences` step (engine.ts), called once by
   * both Home and Calendar, removes it from what a family actually sees.
   * This is the ENTIRE supersession mechanism - a future rule (e.g.
   * Vaikuntha Ekadashi over ordinary Ekadashi) needs only this one field
   * set; no UI component ever hardcodes a festival name to implement it. */
  supersedes?: FestivalRuleId;

  /* ---- Phase 1 catalogue model (docs/temp/festival-calendar-v1-spec-2026-09-17.md) ---- */

  /** Coarse catalogue grouping - matches the spec's §1 catalogue sections. */
  category: "major" | "recurring" | "telugu" | "month-context";
  /** Home's row-selection tier (see lib/panchanga/index.ts's Home selection
   * logic): "P0" = eligible for the single nearest-major-festival slot
   * (60-day horizon); "P1" = eligible for the up-to-two
   * nearest-observance slots (30-day horizon); "calendar-only" = never
   * shown on Home, Calendar only. */
  homePriority: "P0" | "P1" | "calendar-only";
  /** Regional / tradition tag shown alongside the rule so it is never
   * presented as universal Hindu practice when it is not (e.g.
   * "Telugu/South Indian", "Pan-Hindu", "North Indian"). */
  regionTag: string;
  /** One of the 10 reusable rule families (see `FestivalRuleFamily`). */
  ruleFamily: FestivalRuleFamily;
  /** Independent confirmation status for this rule's date-selection logic. */
  validationStatus: "validated" | "not-started" | "blocked";

  /** Exact rule name + convention, quoted, never paraphrased into a claim. */
  ruleName: string;
  convention: string;
  provenanceUrl: string;
  accessedISO: string;
  /** For a deferred rule: the honest reason it is not shown. */
  deferredReason?: string;
}

/** "tithi-at-sunrise" - `fallbackPolicy` is REQUIRED by the type itself (see
 * `SunriseFallbackPolicy` in engine.ts): a new sunrise rule that omits it
 * fails typecheck, it is never silently defaulted. `weekday` stays optional
 * - an extra filter no Phase 1 rule currently sets. */
interface TithiAtSunriseFestivalRule extends FestivalRuleBase {
  method: "tithi-at-sunrise";
  fallbackPolicy: "none" | "prior-day-confined-interval";
  weekday?: number;
}

/** "lunar-month-weekday" (Kartika Somavaram) - `weekday` (0 Sunday .. 6
 * Saturday) is the required target weekday. `fallbackPolicy` has no meaning
 * for this method and is disallowed at the type level (`never`). */
interface LunarMonthWeekdayFestivalRule extends FestivalRuleBase {
  method: "lunar-month-weekday";
  weekday: number;
  fallbackPolicy?: never;
}

/** Every other supported method, plus "deferred" - neither `fallbackPolicy`
 * nor `weekday` has meaning for any of these and both are disallowed at the
 * type level. */
interface OtherFestivalRule extends FestivalRuleBase {
  method: "madhyahna-vyapti" | "amanta-sunrise" | "nishita-vyapti" | "chandrodaya-vyapti" | "nishita-vyapti-annual" | "deferred";
  fallbackPolicy?: never;
  weekday?: never;
}

/**
 * A DISCRIMINATED UNION on `method`: TypeScript itself enforces which extra
 * fields a rule may or must carry, per method -
 * - "tithi-at-sunrise": `fallbackPolicy` is REQUIRED (omitting it is a
 *   typecheck error - see `TithiAtSunriseFestivalRule`).
 * - "lunar-month-weekday": `weekday` is REQUIRED; `fallbackPolicy` may not
 *   be set at all (typecheck error if it is).
 * - every other method (including "deferred"): neither field may be set.
 * This replaces a runtime `fallbackPolicy ?? "none"` default that used to
 * live in the engine dispatcher - a sunrise rule can no longer silently ship
 * with an un-chosen fallback policy; the type system catches it.
 */
export type FestivalRule = TithiAtSunriseFestivalRule | LunarMonthWeekdayFestivalRule | OtherFestivalRule;

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
    category: "major",
    homePriority: "P0",
    regionTag: "Telugu/South Indian, widely observed pan-Hindu",
    ruleFamily: "madhyahna-vyapti",
    validationStatus: "validated",
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
    category: "major",
    homePriority: "P0",
    regionTag: "Telugu/South Indian New Year (Amanta) — a different day from the North Indian Purnimanta new year",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
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
    category: "recurring",
    homePriority: "P1",
    regionTag: "Pan-Hindu, monthly",
    ruleFamily: "nishita-vyapti",
    validationStatus: "validated",
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
    category: "recurring",
    homePriority: "P1",
    regionTag: "Pan-Hindu (Ganapati-focused), monthly",
    ruleFamily: "moonrise-vyapti",
    validationStatus: "validated",
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

  /* ---- Calendar V1 Phase 1 additions (2026-09-17) ---- */

  {
    id: "navratri-begins",
    name: "Navratri begins",
    nameTe: "శరన్నవరాత్రులు ప్రారంభం",
    method: "tithi-at-sunrise",
    masa: "Ashvina",
    paksha: "Shukla",
    tithi: "Pratipada",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "major",
    homePriority: "P0",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Pratipada prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Ashvina and Shukla " +
      "Pratipada tithi prevails at that day's sunrise. No touches-no-sunrise " +
      "fallback is used — no evidence of Pratipada ever missing a sunrise in " +
      "this masa was found in the checked fixture year; if a future year " +
      "needs one, this returns no match for that occurrence rather than " +
      "guessing. Validated against Drik Panchang's own Telugu festival " +
      "calendar: 2026-10-11 at both Hyderabad and Frisco (no 2027 occurrence " +
      "falls inside the 17 Sep 2026 - 7 Apr 2027 specification window).",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "atla-tadde",
    name: "Atla Tadde",
    nameTe: "అట్ల తద్దె",
    method: "tithi-at-sunrise",
    masa: "Ashvina",
    paksha: "Krishna",
    tithi: "Tritiya",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "telugu",
    homePriority: "P1",
    regionTag: "Telugu-specific",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
    ruleName: "Tithi-at-sunrise (Ashvina Krishna Tritiya prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Ashvina and Krishna " +
      "Tritiya tithi prevails at that day's sunrise. No fallback (see " +
      "Navratri begins' entry for the same reasoning). Validated against " +
      "Drik Panchang's own Telugu festival calendar entry \"Atla Tadde, " +
      "October 28, 2026, Wednesday, Asvayujamu, Krishna Thadiya\" — an " +
      "exact match at both Hyderabad and Frisco (no 2027 occurrence falls " +
      "inside the specification window).",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "nagula-chavithi",
    name: "Nagula Chavithi",
    nameTe: "నాగుల చవితి",
    method: "tithi-at-sunrise",
    masa: "Kartika",
    paksha: "Shukla",
    tithi: "Chaturthi",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "telugu",
    homePriority: "P1",
    regionTag: "Telugu-specific",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Chaturthi prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Kartika and Shukla " +
      "Chaturthi tithi prevails at that day's sunrise. No fallback (see " +
      "Navratri begins' entry). Validated against Drik Panchang's own " +
      "Telugu festival calendar: a genuine cross-location divergence — " +
      "2026-11-13 at Hyderabad (\"Nagula Chavithi, November 13, 2026, " +
      "Friday, Karthikamu, Sukla Chavithi\") vs. 2026-11-12 at Frisco " +
      "(\"Nagula Chavithi, November 12, 2026, Thursday, Karthikamu, Sukla " +
      "Chavithi\"), each fetched from the location-specific calendar page " +
      "directly, not assumed from the other. No 2027 occurrence falls " +
      "inside the specification window.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "bali-padyami",
    name: "Bali Padyami",
    nameTe: "బలి పాడ్యమి",
    method: "tithi-at-sunrise",
    masa: "Kartika",
    paksha: "Shukla",
    tithi: "Pratipada",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "major",
    homePriority: "P1",
    regionTag: "Pan-Hindu, North-Indian-emphasised (Diwali sequence)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Pratipada prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Kartika and Shukla " +
      "Pratipada tithi prevails at that day's sunrise — the day after Diwali " +
      "Amavasya. No fallback (see Navratri begins' entry). Validated " +
      "against Drik Panchang's own Diwali Puja Calendar: \"10th November " +
      "2026 ... Govardhan Puja, Annakut, Bali Pratipada, Dyuta Krida\" at " +
      "Hyderabad; Frisco independently computed one day earlier (2026-11-09), " +
      "consistent with the same-direction divergence already confirmed for " +
      "Nagula Chavithi and Yama Dwitiya that same lunar month. No 2027 " +
      "occurrence falls inside the specification window.",
    provenanceUrl: "https://www.drikpanchang.com/diwali/diwali-puja-calendar.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "yama-dwitiya",
    name: "Yama Dwitiya",
    nameTe: "యమ ద్వితీయ",
    method: "tithi-at-sunrise",
    masa: "Kartika",
    paksha: "Shukla",
    tithi: "Dwitiya",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "major",
    homePriority: "P1",
    regionTag: "Pan-Hindu, North-Indian-emphasised (Diwali sequence; also Bhaiya Dooj)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Dwitiya prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Kartika and Shukla " +
      "Dwitiya tithi prevails at that day's sunrise. No fallback (see " +
      "Navratri begins' entry). Validated against Drik Panchang's own " +
      "Diwali Puja Calendar: \"11th November 2026 ... Bhaiya Dooj, Bhau " +
      "Beij, Yama Dwitiya, Chitragupta Puja\" at Hyderabad; Frisco " +
      "independently computed one day earlier (2026-11-10), the same " +
      "direction of divergence already confirmed for the other Kartika " +
      "Shukla rules this same lunar month. No 2027 occurrence falls inside " +
      "the specification window.",
    provenanceUrl: "https://www.drikpanchang.com/diwali/diwali-puja-calendar.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "ratha-saptami",
    name: "Ratha Saptami",
    nameTe: "రథ సప్తమి",
    method: "tithi-at-sunrise",
    masa: "Magha",
    paksha: "Shukla",
    tithi: "Saptami",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "major",
    homePriority: "P1",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "validated",
    ruleName: "Tithi-at-sunrise (Magha Shukla Saptami prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Magha and Shukla " +
      "Saptami tithi prevails at that day's sunrise. No fallback (see " +
      "Navratri begins' entry). Validated against Drik Panchang's own " +
      "dedicated Ratha Saptami page: \"Ratha Saptami on Saturday, February " +
      "13, 2027\" with \"Saptami Tithi Begins - 03:29 PM on Feb 12, 2027\" / " +
      "\"Saptami Tithi Ends - 02:36 PM on Feb 13, 2027\" — an exact match at " +
      "both Hyderabad and Frisco. No 2026 occurrence falls inside the " +
      "specification window (2026's already passed before 17 Sep 2026).",
    provenanceUrl: "https://www.drikpanchang.com/festivals/ratha-saptami/ratha-saptami-date-time.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "maha-shivaratri",
    name: "Maha Shivaratri",
    nameTe: "మహా శివరాత్రి",
    method: "nishita-vyapti-annual",
    masa: "Magha",
    paksha: "Krishna",
    tithi: "Chaturdashi",
    pujaSlug: null,
    supersedes: "masa-shivaratri",
    category: "major",
    homePriority: "P0",
    regionTag: "Pan-Hindu",
    ruleFamily: "nishita-vyapti",
    validationStatus: "validated",
    ruleName:
      "Nishita-vyapti-annual (Magha Krishna Chaturdashi prevailing during the nishita kala, " +
      "with a documented two-night tie-break for the rare year it is needed — see engine.ts's " +
      "annualNishitaVyaptiFestivalDay)",
    convention:
      "Re-uses Masa Shivaratri's already-validated nishita-vyapti mechanism " +
      "UNCHANGED (no second Shivaratri engine), restricted to the single " +
      "occurrence whose Amanta masa is Magha. The GENERAL nishita-vyapti " +
      "principle (Chaturdashi must extend into Nishita/midnight) is sourced " +
      "to Dharma Sindhu (Kashinath Upadhyaya), Maagha Maasa chapter: " +
      "https://www.kamakoti.org/kamakoti/dharmasindhu/bookview.php?chapnum=12 " +
      "(accessed 2026-09-24) — quoted there: \"Shiv Raatri has to extend " +
      "into the Nisheeha or mid-night... [if] such time extension occurs " +
      "then Shiva Raatri is reckoned as on the following day or therewise " +
      "on the preceding day.\" The ADDITIONAL two-night tie-break this " +
      "function needs for the rare year Chaturdashi touches nishita on TWO " +
      "consecutive nights is NOT drawn from that or any other primary " +
      "source directly fetched this session (a primary page attributing an " +
      "equivalent rule to Nirnaya Sindhu could not be reached — see " +
      "engine.ts's own doc comment for exactly what was and was not " +
      "sourceable); it is recorded honestly as a convention validated by " +
      "DIRECTLY MATCHING Drik Panchang's own published output, not as a " +
      "religious-authority citation. Validated at Hyderabad AND Frisco for " +
      "six years (2026, 2027, 2028, 2029, 2030, 2032): 2026-02-15 / " +
      "2026-02-15; 2027-03-06 / 2027-03-06 (Frisco needed the tie-break); " +
      "2028-02-23 / 2028-02-23 (Frisco needed it); 2029-02-11 / 2029-02-11; " +
      "2030-03-02 / 2030-03-02 (Frisco needed it); 2032-03-10 / 2032-03-09 " +
      "— every date independently fetched from Drik's own dedicated Maha " +
      "Shivaratri page per location/year (see tests/panchanga.test.mjs for " +
      "the executable fixtures). 2031 is a KNOWN, UNRESOLVED GAP: mhah-" +
      "panchang's Amanta-masa computation has no \"Magha\"-labelled " +
      "occurrence at all that year for Hyderabad (a genuine Kshaya/omitted-" +
      "month case — see amantaMasaFromMoonMasa's own doc comment in " +
      "engine.ts) — this rule correctly returns no match rather than " +
      "guessing, but that has NOT been independently checked against Drik's " +
      "own 2031 date (2031-02-20, found via search only, not a verbatim " +
      "fetch) and is not claimed as validated for that year.",
    provenanceUrl: "https://www.drikpanchang.com/festivals/maha-shivaratri/maha-shivaratri-date-time.html",
    accessedISO: "2026-09-24",
  },
  {
    id: "kartika-somavaram",
    name: "Kartika Somavaram",
    nameTe: "కార్తీక సోమవారం",
    method: "lunar-month-weekday",
    masa: "Kartika",
    paksha: "",
    tithi: "",
    weekday: 1,
    pujaSlug: null,
    category: "telugu",
    homePriority: "calendar-only",
    regionTag: "Telugu-specific",
    ruleFamily: "lunar-month-weekday",
    validationStatus: "validated",
    ruleName: "Lunar-month-weekday (every Monday within the Amanta Kartika month)",
    convention:
      "Every civil day within the Amanta Kartika lunar month (prevailing at " +
      "that day's own sunrise) that falls on a Monday. A genuinely different " +
      "mechanism from every vyapti rule — no tithi window at all, just a " +
      "weekday filter over the location's own Amanta month boundary, " +
      "checked separately per location, never assumed shared. Validated for " +
      "2026: Hyderabad's Amanta Kartika month (per Diwali Amavasya on " +
      "2026-11-08 and Nagula Chavithi's own 2026-11-13 Kartika Shukla " +
      "Chaturthi, both independently confirmed) yields Mondays " +
      "2026-11-16, 2026-11-23, 2026-11-30, 2026-12-07; Frisco's own month " +
      "boundary starts one day earlier (consistent with the same-direction " +
      "divergence already confirmed for Nagula Chavithi/Bali Padyami/Yama " +
      "Dwitiya that month), yielding an EXTRA Monday: 2026-11-09, " +
      "2026-11-16, 2026-11-23, 2026-11-30, 2026-12-07 — confirming the " +
      "month boundary, and therefore which Mondays count, is NOT assumed " +
      "identical between locations.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
  },

  /* ---- Phase 1 catalogue accounting (2026-09-17): Calendar-only items    */
  /* named in the spec's required exclusion list, each with a concrete,    */
  /* honest reason it is not (yet) computed - never guessed to fill a slot. */

  {
    id: "radha-ashtami",
    name: "Radha Ashtami",
    nameTe: "రాధాష్టమి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Vaishnava)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Bhadrapada Shukla Ashtami) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Bhadrapada Shukla Ashtami, " +
      "no fallback expected) — the same mechanism Navratri begins and Atla " +
      "Tadde already use — but no Drik Panchang date for Hyderabad or " +
      "Frisco has been independently fetched and cross-checked yet. Not " +
      "implemented merely to fill this catalogue slot.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "anant-chaturdashi",
    name: "Anant Chaturdashi (Ganesh Nimajjana)",
    nameTe: "అనంత చతుర్దశి (గణేశ నిమజ్జనం)",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Telugu/South Indian, closes the Vinayaka Chavithi observance window",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Bhadrapada Shukla Chaturdashi) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Bhadrapada Shukla " +
      "Chaturdashi) once independently validated. Also raises an open " +
      "product question carried from the spec document: whether this " +
      "should become one multi-day \"festival window\" rule together with " +
      "Vinayaka Chavithi rather than a second independent single-day rule " +
      "— not decided here, left for Phase 2.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Rule family known (tithi-at-sunrise) but not yet independently validated; also an open multi-day-sequence design question (see convention).",
  },
  {
    id: "pitru-paksha-begins",
    name: "Pitru Paksha begins",
    nameTe: "పితృ పక్షం ప్రారంభం",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "month-context",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Bhadrapada Purnima, the day after) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family, but its exact tithi " +
      "boundary depends on the same general Purnima civil-day-selection " +
      "question the spec document leaves genuinely unresolved (a " +
      "near-identical rule, Satyanarayana Vrata, was built and tested " +
      "against a full year of real dates and found wrong on the majority " +
      "of them, then reverted — see engine.ts git history). Not implemented " +
      "on an unresolved prerequisite.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Depends on the general Purnima/Amavasya selection rule, which is genuinely unresolved (see docs/temp/festival-calendar-v1-spec-2026-09-17.md §6).",
  },
  {
    id: "sarva-pitru-amavasya",
    name: "Sarva Pitru Amavasya",
    nameTe: "సర్వ పితృ అమావాస్య",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "recurring",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Bhadrapada/Ashvina Amavasya) — not yet independently validated",
    convention:
      "Same unresolved-prerequisite reason as Pitru Paksha begins: depends " +
      "on the general Amavasya civil-day-selection rule, not yet solved.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Depends on the general Purnima/Amavasya selection rule, which is genuinely unresolved (see docs/temp/festival-calendar-v1-spec-2026-09-17.md §6).",
  },
  {
    id: "gita-jayanti",
    name: "Gita Jayanti",
    nameTe: "గీతా జయంతి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "month-context",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Dhanurmasam-adjacent)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Margashirsha Shukla Ekadashi, = Vaikuntha/Mokshada Ekadashi) — not yet independently validated",
    convention:
      "Would coincide with Vaikuntha/Mokshada Ekadashi (Margashirsha Shukla " +
      "Ekadashi), which the spec document already flags as having a " +
      "genuine Smarta/Vaishnava naming and date split (Drik's Frisco " +
      "listing: 2026-12-19 \"plain\"/Smarta-style vs. 2026-12-20 " +
      "\"Gauna\"/Vaishnava; the Karya Siddhi Hanuman Temple's own Frisco " +
      "calendar independently celebrates \"Vaikunta Ekadashi\" on Dec 20). " +
      "Not implemented while that convention choice is undecided.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Coincides with the Vaikuntha/Mokshada Ekadashi Smarta/Vaishnava convention split, not yet decided (see docs/temp/festival-calendar-v1-spec-2026-09-17.md §6.1/§6.3).",
  },
  {
    id: "dattatreya-jayanti",
    name: "Dattatreya Jayanti",
    nameTe: "దత్తాత్రేయ జయంతి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "month-context",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Margashirsha Purnima) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Margashirsha Purnima), but " +
      "shares the same unresolved general-Purnima prerequisite as Pitru " +
      "Paksha begins above. The Karya Siddhi Hanuman Temple's own December " +
      "2026 calendar page independently confirms Dec 23, 2026 as \"Sri " +
      "Dattatreya Jayanti\" — recorded here as a corroborating fixture, not " +
      "yet cross-checked against a Drik location-specific fetch for either " +
      "Hyderabad or Frisco.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Depends on the general Purnima selection rule, which is genuinely unresolved (see docs/temp/festival-calendar-v1-spec-2026-09-17.md §6).",
  },
  {
    id: "kalabhairava-jayanti",
    name: "Kalabhairava Jayanti",
    nameTe: "కాలభైరవ జయంతి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "month-context",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Shiva-focused)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Margashirsha Krishna Ashtami) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Margashirsha Krishna " +
      "Ashtami) once independently validated against Drik Panchang for " +
      "both Hyderabad and Frisco. Not implemented merely to fill this " +
      "catalogue slot.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
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
