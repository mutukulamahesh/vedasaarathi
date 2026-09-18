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
// adds eight more rules, each checked against Drik Panchang's own published
// dates for the year(s) inside the 17 Sep 2026 - Ugadi 2027 supported
// horizon — but NOT every rule has BOTH Hyderabad and Frisco independently
// fetched from a location-specific page; several have Hyderabad fetched and
// Frisco computed by the same engine (never guessed, but not a second,
// independent source check either) — see each rule's own `validationStatus`
// (never "validated" for a Phase 1 rule merely because one occurrence
// matched; see that field's own doc comment for the honest-status
// vocabulary) and `convention` text for the EXACT evidence that rule has,
// and tests/panchanga.test.mjs for the executable fixtures. Comparing this
// app's Drik-derived logic against Drik's own published dates is
// single-reference conformance, not independent validation and not a
// religious-authority claim — see FESTIVAL_CALENDAR_RELEASE_BOUNDARY below
// for the full release-boundary statement (Reviewer-mode metadata only).
// Every rule computes its date DYNAMICALLY from latitude/longitude/timezone
// at request time; no 2026/2027 date is ever hardcoded as a production
// result — the dates named in each `convention` string are validation
// fixtures, quoted for provenance, not returned values.
//
// This module carries just the rule constants + their exact provenance so
// the calendar screen can name the rule, its source URL, its access date,
// and its convention without importing validation.ts.
//
// A festival is listed in the app when ALL of the following hold: its
// date-selection method is implemented (one of the supported `method`
// values below, not "deferred"); its evidence status and any known
// limitations are recorded honestly in its own `validationStatus` and
// `convention` fields (never overstated as independently validated when the
// actual evidence is a single-reference match, an engine-computed-only
// location, or a derived/indirect fixture); it falls inside the supported
// private-beta boundary (see FESTIVAL_CALENDAR_RELEASE_BOUNDARY); and the
// build-verified release-config marks `festival` released. This is NOT a
// claim that every displayed Phase 1 rule is independently validated - see
// each rule's own validationStatus (sourced / reference-matched /
// provisional / unresolved) for what is actually established. Anything
// whose date-selection rule is not yet implemented at all stays here with
// `method: "deferred"` and a plain reason — it is never guessed, and it is
// never invented merely to fill a catalogue slot (see the seven
// Calendar-only deferred entries at the end of FESTIVAL_RULES, added for
// Phase 1's catalogue-accounting requirement).

export type FestivalRuleId =
  | "vinayaka-chavithi" | "ugadi" | "masa-shivaratri" | "sankashti-chaturthi"
  | "navratri-begins" | "atla-tadde" | "nagula-chavithi" | "bali-padyami"
  | "yama-dwitiya" | "ratha-saptami" | "maha-shivaratri" | "kartika-somavaram"
  | "radha-ashtami" | "anant-chaturdashi" | "pitru-paksha-begins" | "sarva-pitru-amavasya"
  | "gita-jayanti" | "dattatreya-jayanti" | "kalabhairava-jayanti"
  // Coverage-checklist additions (2026-09-18) - see the header note above
  // this array and the end-of-file "coverage checklist" comment block for
  // which of these are actually implemented vs. honestly deferred.
  | "vijayadashami" | "maha-navami" | "durga-ashtami" | "sharad-purnima"
  | "vamana-jayanti" | "bathukamma-begins" | "saraswati-puja"
  | "dhanteras" | "naraka-chaturdashi" | "diwali-lakshmi-puja"
  | "ksheerabdi-dwadashi" | "kartika-purnima" | "skanda-shashti" | "subramanya-shashti"
  | "vaikuntha-ekadashi" | "hanuman-vrata" | "dhanurmasam-begins"
  | "bhogi" | "makara-sankranti" | "kanuma" | "mukkanuma"
  | "vasant-panchami" | "bhishma-ekadashi" | "holika-dahan" | "holi"
  | "ekadashi-recurring" | "pradosham-recurring";

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

  /** When explicitly `false`, this rule's occurrences are excluded from the
   * FAMILY-VISIBLE Calendar list (`CalendarMonth.festivals`, and therefore
   * every day's `festivalSlugs` marker too) even though the rule itself is a
   * normal, computed (non-deferred) rule. `CalendarMonth.festivalsAll` and
   * any internal caller (tests, Reviewer mode) still see every raw
   * occurrence, unfiltered - this only changes what an ordinary family sees
   * on the month's festival list and day markers. Omitted (default `true`)
   * for every ordinary festival card. Used for Kartika Somavaram: it can
   * recur up to five times in one Amanta Kartika month, which reads as
   * clutter on a family-facing festival list rather than five genuinely
   * distinct observances - the underlying weekly calculation stays
   * available (raw occurrences, tests, Reviewer mode), it just is not
   * surfaced as five repeated cards. */
  familyVisible?: boolean;

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
  /** Honest confirmation status for this rule's date-selection logic -
   * NEVER "validated" merely because one annual occurrence matched
   * Hyderabad and Frisco (see docs/temp/festival-calendar-v1-spec-2026-09-17.md
   * and the Phase-1 evidence audit for the full reasoning per rule):
   * - "validated": the ORIGINAL four rules only (vinayaka-chavithi, ugadi,
   *   masa-shivaratri, sankashti-chaturthi) - checked via validation.ts's
   *   build-time gate across multiple years and/or 13+ real occurrences per
   *   location, a materially stronger evidence bar than any Phase 1 rule
   *   below has been given. Not applied to any Phase 1 addition.
   * - "sourced": the SELECTION RULE ITSELF (not just the resulting date) has
   *   institutional or primary-text support - e.g. Maha Shivaratri's general
   *   nishita-vyapti principle.
   * - "reference-matched": the computed date matches a real published
   *   reference (Drik Panchang) for the specific year(s)/location(s)
   *   actually checked. Comparing Drik-derived logic against Drik's own
   *   fixtures is SINGLE-REFERENCE CONFORMANCE, not independent validation.
   * - "provisional": weaker evidence than "reference-matched" - e.g. a
   *   value inferred from a sibling rule's confirmed divergence pattern
   *   rather than an independent direct source fetch.
   * - "unresolved": a known gap or exception exists that the current rule
   *   does not handle (see `deferredReason` for deferred rules, or the
   *   rule's own `convention` text for an implemented one). */
  validationStatus:
    | "validated" | "sourced" | "reference-matched" | "provisional" | "unresolved"
    | "not-started" | "blocked";

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
  method:
    | "madhyahna-vyapti" | "amanta-sunrise" | "nishita-vyapti" | "chandrodaya-vyapti"
    | "nishita-vyapti-annual" | "pradosha-vyapti" | "pradosha-vyapti-annual"
    | "pre-dawn-vyapti-annual" | "deferred";
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
    validationStatus: "reference-matched",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Pratipada prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Ashvina and Shukla " +
      "Pratipada tithi prevails at that day's sunrise. No touches-no-sunrise " +
      "fallback is used — no evidence of Pratipada ever missing a sunrise in " +
      "this masa was found in the checked fixture year; if a future year " +
      "needs one, this returns no match for that occurrence rather than " +
      "guessing. Checked against Drik Panchang's own Telugu festival " +
      "calendar (Hyderabad-scoped fetch): 2026-10-11. Frisco's own date " +
      "(also 2026-10-11) is the engine's own computed output, not an " +
      "independently fetched Frisco-specific page — a single-year, " +
      "single-fully-sourced-location reference match, not a claim that " +
      "both locations were independently confirmed. No 2027 occurrence " +
      "falls inside the 17 Sep 2026 - 7 Apr 2027 specification window.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-17",
  },
  {
    id: "maha-navami",
    name: "Maha Navami",
    nameTe: "మహర్నవమి",
    method: "tithi-at-sunrise",
    masa: "Ashvina",
    paksha: "Shukla",
    tithi: "Navami",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "major",
    homePriority: "P1",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "reference-matched",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Navami prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Ashvina and Shukla " +
      "Navami tithi prevails at that day's sunrise. Checked against Drik " +
      "Panchang's own Telugu calendar, fetched separately for BOTH " +
      "locations (not assumed shared): Hyderabad (geoname-id 1269843) " +
      "\"Maha Navami — October 19, 2026, Monday, Asvayujamu, Sukla Navami\"; " +
      "Frisco (geoname-id 4692559) \"Maha Navami – October 19, 2026, " +
      "Monday, Asvayujamu Sukla Navami\" — same civil date both locations. " +
      "The SAME fetch showed Durga Ashtami landing on the SAME civil date " +
      "as Navami at Hyderabad (18/10/2026 Frisco vs. 19/10/2026 Hyderabad " +
      "for Ashtami — see the separately deferred \"durga-ashtami\" entry), " +
      "which is why Ashtami is deferred here while Navami, unaffected by " +
      "that edge case in the checked year, is implemented. No 2027 " +
      "occurrence falls inside the specification window.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2026&month=10",
    accessedISO: "2026-09-18",
  },
  {
    id: "vijayadashami",
    name: "Vijayadashami (Dussehra)",
    nameTe: "విజయదశమి (దసరా)",
    method: "tithi-at-sunrise",
    masa: "Ashvina",
    paksha: "Shukla",
    tithi: "Dashami",
    fallbackPolicy: "none",
    pujaSlug: null,
    category: "major",
    homePriority: "P0",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "reference-matched",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Dashami prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Ashvina and Shukla " +
      "Dashami tithi prevails at that day's sunrise — Drik Panchang's own " +
      "plain Telugu-calendar listing (not a separate Aparahna-vyapti " +
      "muhurat page); a stricter Aparahna-vyapti convention (Dashami " +
      "present in the afternoon) is documented for Vijayadashami in some " +
      "Dharma Sindhu-derived sources but is NOT modelled here, the same " +
      "honest limitation already recorded for Ratha Saptami's own " +
      "Arunodaya exception. Checked against Drik Panchang's own Telugu " +
      "calendar, fetched separately for BOTH locations: Hyderabad " +
      "\"Dussehra — October 20, 2026, Tuesday, Asvayujamu, Sukla Dasami\"; " +
      "Frisco \"Dussehra – October 20, 2026, Tuesday, Asvayujamu Sukla " +
      "Dasami\" — same civil date both locations, no divergence found in " +
      "this checked year. No 2027 occurrence falls inside the " +
      "specification window.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2026&month=10",
    accessedISO: "2026-09-18",
  },
  {
    id: "durga-ashtami",
    name: "Durga Ashtami",
    nameTe: "దుర్గాష్టమి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "unresolved",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Ashtami) — a likely kshaya (touches-no-sunrise) year, fallback not built for this rule",
    convention:
      "NOT implemented as a plain tithi-at-sunrise rule this session because " +
      "the verification fetch itself surfaced a genuine edge case: Drik's " +
      "own Telugu calendar puts Durga Ashtami on 2026-10-19 at Hyderabad " +
      "(the SAME civil date as Maha Navami — Ashtami tithi is short enough " +
      "that year to plausibly never prevail at a Hyderabad sunrise at all, " +
      "the same class of gap Ugadi's own kshaya-Pratipada fallback exists " +
      "for) but 2026-10-18 at Frisco (an ordinary, unambiguous match there). " +
      "A plain sunrise rule with fallbackPolicy \"none\" would likely return " +
      "no match for Hyderabad in exactly the year checked — implementing it " +
      "correctly needs the SAME kind of verified prior-day-confined-interval " +
      "fallback Ugadi already has, re-derived and evidenced for THIS tithi, " +
      "not assumed to work the same way. Not attempted without that " +
      "evidence.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2026&month=10",
    accessedISO: "2026-09-18",
    deferredReason: "Likely a kshaya (touches-no-sunrise) tithi at Hyderabad in the checked year; needs its own verified sunrise-fallback logic, not yet built.",
  },
  {
    id: "sharad-purnima",
    name: "Sharad Purnima",
    nameTe: "శరత్ పూర్ణిమ",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Purnima) — not yet independently validated; shares the general Purnima open question",
    convention:
      "Would reuse the tithi-at-sunrise family (Ashvina Shukla Purnima), but " +
      "no Hyderabad or Frisco date has been independently fetched and " +
      "cross-checked yet, and Purnima observances generally share the same " +
      "unresolved civil-day-selection question already documented for " +
      "Pitru Paksha begins / Dattatreya Jayanti / Kartika Purnima below (a " +
      "near-identical rule, Satyanarayana Vrata, was built, tested against " +
      "a full year of real dates, found wrong on the majority of them, and " +
      "reverted — see engine.ts git history). Not implemented on an " +
      "unresolved prerequisite.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Depends on the general Purnima/Amavasya selection rule, which is genuinely unresolved (see docs/temp/festival-calendar-v1-spec-2026-09-17.md §6).",
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
    validationStatus: "reference-matched",
    ruleName: "Tithi-at-sunrise (Ashvina Krishna Tritiya prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Ashvina and Krishna " +
      "Tritiya tithi prevails at that day's sunrise. No fallback (see " +
      "Navratri begins' entry for the same reasoning). Checked against " +
      "Drik Panchang's own Telugu festival calendar entry (Hyderabad-scoped " +
      "fetch): \"Atla Tadde, October 28, 2026, Wednesday, Asvayujamu, " +
      "Krishna Thadiya\". Frisco's own date (also 2026-10-28) is the " +
      "engine's own computed output, not an independently fetched " +
      "Frisco-specific page — a single-year, single-fully-sourced-location " +
      "reference match. No 2027 occurrence falls inside the specification " +
      "window.",
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
    validationStatus: "reference-matched",
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
    validationStatus: "reference-matched",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Pratipada prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Kartika and Shukla " +
      "Pratipada tithi prevails at that day's sunrise — the day after Diwali " +
      "Amavasya. No fallback (see Navratri begins' entry). Checked against " +
      "Drik Panchang's own Diwali Puja Calendar (Hyderabad-scoped fetch): " +
      "\"10th November 2026 ... Govardhan Puja, Annakut, Bali Pratipada, " +
      "Dyuta Krida\". Frisco's own date (2026-11-09, one day earlier) is " +
      "the engine's own computed output, NOT an independently fetched " +
      "Frisco-specific page - the one-day divergence is consistent with the " +
      "same direction already confirmed (via independent fetches at BOTH " +
      "locations) for Nagula Chavithi that same lunar month, which supports " +
      "plausibility but is not itself a Frisco-specific source. No 2027 " +
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
    validationStatus: "reference-matched",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Dwitiya prevailing at sunrise, no fallback)",
    convention:
      "The first day on which the Amanta lunar month is Kartika and Shukla " +
      "Dwitiya tithi prevails at that day's sunrise. No fallback (see " +
      "Navratri begins' entry). Checked against Drik Panchang's own " +
      "Diwali Puja Calendar (Hyderabad-scoped fetch): \"11th November 2026 " +
      "... Bhaiya Dooj, Bhau Beij, Yama Dwitiya, Chitragupta Puja\". " +
      "Frisco's own date (2026-11-10, one day earlier) is the engine's own " +
      "computed output, NOT an independently fetched Frisco-specific page - " +
      "the one-day divergence is consistent with the same direction already " +
      "confirmed (via independent fetches at BOTH locations) for Nagula " +
      "Chavithi that same lunar month, which supports plausibility but is " +
      "not itself a Frisco-specific source. No 2027 occurrence falls inside " +
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
    validationStatus: "unresolved",
    ruleName: "Tithi-at-sunrise (Magha Shukla Saptami prevailing at sunrise, no fallback) — " +
      "KNOWN UNRESOLVED GENERAL-RULE LIMITATION, see convention",
    convention:
      "The first day on which the Amanta lunar month is Magha and Shukla " +
      "Saptami tithi prevails at that day's sunrise. No fallback. This " +
      "SPECIFIC fixture matches the published date: Drik Panchang's own " +
      "dedicated Ratha Saptami page states \"Ratha Saptami on Saturday, " +
      "February 13, 2027\" with \"Saptami Tithi Begins - 03:29 PM on Feb 12, " +
      "2027\" / \"Saptami Tithi Ends - 02:36 PM on Feb 13, 2027\" — an exact " +
      "match at both Hyderabad and Frisco for 2027 (the only year inside the " +
      "specification window). That one match does NOT prove the general " +
      "rule for other years: the Kanchi Kamakoti institutional Dharma " +
      "Sindhu rendering (see Maha Shivaratri's own citation) separately " +
      "describes Ratha Saptami in terms of Arunodaya (pre-dawn) snana and a " +
      "possible previous-day Shashthi-Saptami combination exception — a " +
      "genuinely different selection question from plain tithi-at-sunrise, " +
      "which this implementation does NOT model and has not evaluated " +
      "against. Left unresolved rather than guessed or silently changed; " +
      "the 2027 fixture is kept as documented, real evidence for that one " +
      "year, not as proof the current algorithm is correct in general.",
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
    validationStatus: "reference-matched",
    ruleName:
      "Nishita-vyapti-annual (Magha Krishna Chaturdashi prevailing during the nishita kala, " +
      "with an empirical Drik-matched two-night tie-break for the rare year it is needed — see " +
      "engine.ts's annualNishitaVyaptiFestivalDay)",
    convention:
      "Re-uses Masa Shivaratri's already-validated nishita-vyapti mechanism " +
      "UNCHANGED (no second Shivaratri engine), restricted to the single " +
      "occurrence whose Amanta masa is Magha. The GENERAL nishita-vyapti " +
      "principle (Chaturdashi must extend into Nishita/midnight) is " +
      "SUPPORTED by an institutional condensed English rendering of Dharma " +
      "Sindhu hosted by Sri Kanchi Kamakoti Peetham, Maagha Maasa chapter: " +
      "https://www.kamakoti.org/kamakoti/dharmasindhu/bookview.php?chapnum=12 " +
      "(the page is itself captioned \"Condensed English Translation by Sri " +
      "V.D.N. Rao\"; accessed 2026-09-17) — quoted there: \"Shiv Raatri has " +
      "to extend into the Nisheeha or mid-night... [if] such time extension " +
      "occurs then Shiva Raatri is reckoned as on the following day or " +
      "therewise on the preceding day.\" This is an institutional condensed " +
      "rendering, NOT the Sanskrit primary text, NOT independently verified " +
      "against that primary text, and NOT priest approval of this rule or " +
      "app. The ADDITIONAL two-night tie-break this function needs for the " +
      "rare year Chaturdashi touches nishita on TWO consecutive nights has " +
      "NO source citation at all, primary or institutional (a primary page " +
      "attributing an equivalent rule to Nirnaya Sindhu could not be " +
      "reached — see engine.ts's own doc comment for exactly what was and " +
      "was not sourceable); it is recorded honestly as an algorithm " +
      "reverse-engineered to match Drik Panchang's own published output — " +
      "single-reference conformance against Drik's own fixtures, NOT " +
      "independent validation and not a religious-authority claim. Checked " +
      "at Hyderabad AND Frisco for six years (2026, 2027, 2028, 2029, 2030, " +
      "2032): 2026-02-15 / 2026-02-15; 2027-03-06 / 2027-03-06 (Frisco " +
      "needed the tie-break); 2028-02-23 / 2028-02-23 (Frisco needed it); " +
      "2029-02-11 / 2029-02-11; 2030-03-02 / 2030-03-02 (Frisco needed it); " +
      "2032-03-10 / 2032-03-09 — every date independently fetched from " +
      "Drik's own dedicated Maha Shivaratri page per location/year (see " +
      "tests/panchanga.test.mjs for the executable fixtures). 2031 is a " +
      "KNOWN, UNRESOLVED GAP: mhah-panchang's Amanta-masa computation has " +
      "no \"Magha\"-labelled occurrence at all that year for Hyderabad (a " +
      "genuine Kshaya/omitted-month case — see amantaMasaFromMoonMasa's own " +
      "doc comment in engine.ts) — this rule correctly returns no match " +
      "rather than guessing, but that has NOT been independently checked " +
      "against Drik's own 2031 date (2031-02-20, found via search only, " +
      "not a verbatim fetch) and is not claimed as checked for that year.",
    provenanceUrl: "https://www.drikpanchang.com/festivals/maha-shivaratri/maha-shivaratri-date-time.html",
    accessedISO: "2026-09-17",
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
    familyVisible: false,
    regionTag: "Telugu-specific",
    ruleFamily: "lunar-month-weekday",
    validationStatus: "provisional",
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

  /* ---- Coverage-checklist accounting (2026-09-18): further catalogue     */
  /* entries requested for the 17 Sep 2026 - Ugadi 2027 delivery, each with */
  /* a concrete, honest reason it is not (yet) computed - never guessed to  */
  /* fill a slot. Grouped roughly by calendar order. */

  {
    id: "vamana-jayanti",
    name: "Vamana Jayanti",
    nameTe: "వామన జయంతి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Vaishnava)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Bhadrapada Shukla Dwadashi) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Bhadrapada Shukla " +
      "Dwadashi) once independently fetched and cross-checked for both " +
      "Hyderabad and Frisco. Not implemented merely to fill this catalogue " +
      "slot.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "bathukamma-begins",
    name: "Bathukamma begins",
    nameTe: "బతుకమ్మ ప్రారంభం",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "telugu",
    homePriority: "calendar-only",
    regionTag: "Telangana-specific — not a universal Telugu or South Indian practice",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Ashvina Krishna Padyami, engagalu/first day) — not yet independently validated",
    convention:
      "A Telangana floral festival, not observed the same way across every " +
      "Telugu-speaking family this app serves — must not be presented as " +
      "universal Telugu practice if implemented. Would reuse the " +
      "tithi-at-sunrise family (Ashvina Krishna Padyami) once independently " +
      "fetched and cross-checked; Saddula Bathukamma (the closing day, " +
      "Ashvina Krishna Navami / Durgashtami-adjacent) would need its own " +
      "separate entry, not assumed to follow automatically.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "saraswati-puja",
    name: "Saraswati Puja / Ayudha Puja",
    nameTe: "సరస్వతీ పూజ / ఆయుధ పూజ",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Regional — observed as a distinct day mainly outside the Telugu Navratri convention",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Ashvina Shukla Navami eve / Maha Navami) — not independently validated; not even listed on Drik's Hyderabad Telugu calendar",
    convention:
      "Directly checked against Drik Panchang's own Telugu calendar for " +
      "Hyderabad, October 2026: Saraswati Puja is NOT listed as a separate " +
      "entry there at all (the fetch that confirmed Maha Navami / " +
      "Vijayadashami explicitly found no Saraswati Puja row). It is widely " +
      "observed elsewhere (notably West Bengal, Tamil Nadu, Karnataka) as " +
      "distinct from plain Maha Navami. Not implemented as its own rule " +
      "without a source that actually names a Telugu-calendar convention " +
      "for it, rather than assuming it coincides with Maha Navami.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2026&month=10",
    accessedISO: "2026-09-18",
    deferredReason: "Not listed on Drik's Hyderabad Telugu calendar at all; observed differently by region, no location-appropriate convention sourced yet.",
  },
  {
    id: "dhanteras",
    name: "Dhanteras (Dhanatrayodashi)",
    nameTe: "ధన త్రయోదశి",
    method: "pradosha-vyapti-annual",
    masa: "Ashvina",
    paksha: "Krishna",
    tithi: "Trayodashi",
    pujaSlug: null,
    category: "major",
    homePriority: "P1",
    regionTag: "Pan-Hindu",
    ruleFamily: "pradosha-vyapti",
    validationStatus: "reference-matched",
    ruleName: "Pradosha-vyapti-annual (Ashvina Krishna Trayodashi prevailing at Pradosh Kala)",
    convention:
      "The first civil day, within Amanta Ashvina, whose Pradosh Kala " +
      "(sunset to sunset + night/5 — see engine.ts's `pradoshaWindow`, " +
      "reverse-engineered and confirmed against four of Drik Panchang's " +
      "own published Pradosh Puja Time windows) contains Krishna " +
      "Trayodashi. Matches Drik Panchang's own stated rule: \"Muhurat " +
      "times contain Pradosh Kaal ... while Trayodashi is prevailing\" " +
      "(Dhanteras Puja timings page, accessed 2026-09-18) — Sthir Lagna, " +
      "also mentioned there, is a best-moment refinement within the " +
      "window, not a day-selection rule, and is not computed here (this " +
      "app never computes Lagna/ascendant). Checked against Drik " +
      "Panchang's own Diwali Puja Calendar, fetched separately for BOTH " +
      "locations: Hyderabad \"Dhantrayodashi (Dhanteras) — November 6, " +
      "2026, Friday\"; Frisco's own date is the engine's own computed " +
      "output, not an independently fetched Frisco-specific page — a " +
      "single-year, single-fully-sourced-location reference match. No " +
      "extra tie-break beyond the shared echo guard — no evidence found " +
      "that Dhanteras needs one.",
    provenanceUrl: "https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=1269843&year=2026",
    accessedISO: "2026-09-18",
  },
  {
    id: "naraka-chaturdashi",
    name: "Naraka Chaturdashi (Choti Diwali)",
    nameTe: "నరక చతుర్దశి",
    method: "pre-dawn-vyapti-annual",
    masa: "Ashvina",
    paksha: "Krishna",
    tithi: "Chaturdashi",
    pujaSlug: null,
    category: "major",
    homePriority: "P1",
    regionTag: "Pan-Hindu, South-Indian-emphasised",
    ruleFamily: "pradosha-vyapti",
    validationStatus: "reference-matched",
    ruleName: "Pre-dawn-vyapti-annual (Ashvina Krishna Chaturdashi prevailing at the pre-dawn/Brahma-Muhurta window)",
    convention:
      "A GENUINELY DIFFERENT mechanism from Dhanteras/Diwali above — " +
      "pre-dawn, not evening (see engine.ts's `preDawnWindow`, " +
      "independently reverse-engineered from two of Drik Panchang's own " +
      "published Brahma Muhurta clock times, NOT assumed from the evening " +
      "window). Matches Drik Panchang's own Naraka Chaturdashi page " +
      "(https://www.drikpanchang.com/diwali/naraka-chaturdashi/info/naraka-chaturdashi.html, " +
      "accessed 2026-09-18): \"The day when Chaturdashi Tithi prevails " +
      "during Brahma Muhurat is considered to observe Naraka Chaturdashi.\" " +
      "EXTERNALLY CHECKED, per-location, NOT the same date both places — " +
      "corrected 2026-09-19 (an earlier version of this text wrongly said " +
      "\"both compute 2026-11-08\"; the code and its test fixture were " +
      "always correct, only this description was wrong): Hyderabad's own " +
      "Abhyang Snan timings page " +
      "(drikpanchang.com/festivals/abhyangsnan/festivals-abhyangsnan-timings.html" +
      "?geoname-id=1269843, fetched 2026-09-18) recommends 2026-11-08 — " +
      "the SAME date this app's own Diwali/Lakshmi Puja rule computes for " +
      "Amavasya there, which Drik's own info page names as a real, " +
      "documented coincidence (\"When Chaturdashi Tithi prevails before " +
      "sunrise and Amavasya Tithi prevails after sunset then Narak " +
      "Chaturdashi and Lakshmi Puja fall on the same day\"), not a source " +
      "error. Frisco's OWN Abhyang Snan timings page " +
      "(drikpanchang.com/festivals/abhyangsnan/festivals-abhyangsnan-timings.html" +
      "?geoname-id=4692559&year=2026, fetched 2026-09-18) instead " +
      "recommends 2026-11-07 — \"Chaturdashi Tithi Span: Begins 11:17 PM " +
      "Nov 6, Ends 11:57 PM Nov 7\" — a genuinely EARLIER civil day than " +
      "Hyderabad's, so Frisco's Naraka Chaturdashi does NOT coincide with " +
      "Frisco's own Diwali (2026-11-08) this year. Both dates are " +
      "confirmed by an independently fetched, location-specific published " +
      "page — this is not one engine-generated regression expectation " +
      "standing in for the other; see tests/panchanga.test.mjs's own " +
      "'GENUINE cross-location divergence' test, which encodes exactly " +
      "these two externally-sourced dates as its expected values, not a " +
      "value copied from the engine's own output.",
    provenanceUrl: "https://www.drikpanchang.com/festivals/abhyangsnan/festivals-abhyangsnan-timings.html?geoname-id=1269843",
    accessedISO: "2026-09-18",
  },
  {
    id: "diwali-lakshmi-puja",
    name: "Diwali / Lakshmi Puja",
    nameTe: "దీపావళి / లక్ష్మీ పూజ",
    method: "pradosha-vyapti-annual",
    masa: "Ashvina",
    paksha: "Krishna",
    tithi: "Amavasya",
    pujaSlug: null,
    category: "major",
    homePriority: "P0",
    regionTag: "Pan-Hindu",
    ruleFamily: "pradosha-vyapti",
    validationStatus: "reference-matched",
    ruleName: "Pradosha-vyapti-annual (Ashvina Krishna Amavasya prevailing at Pradosh Kala) — mainstream convention; Mahanishita Kala variant NOT implemented",
    convention:
      "The first civil day, within Amanta Ashvina, whose Pradosh Kala " +
      "contains Amavasya — Drik Panchang's own Lakshmi Puja timings page " +
      "(accessed 2026-09-18): \"Most of the religious books Dharma " +
      "Sindhu, Nirnaya Sindhu and Vratraj suggest Lakshmi Puja on Diwali " +
      "during Pradosh time after sunset while Amavasya Tithi prevails.\" " +
      "GENUINE DOCUMENTED VARIANT, recorded not silently resolved: the " +
      "SAME page also names Mahanishita Kala (a midnight-region window) " +
      "as an alternative, explicitly framed there as \"best suited for " +
      "Tantrik community and practicing Pandits\" — NOT implemented here; " +
      "this rule is the mainstream household convention only. Checked " +
      "against Drik Panchang's own Lakshmi Puja page, fetched separately " +
      "for Hyderabad (Amavasya begins 11:27 AM Nov 8, ends 12:31 PM Nov 9 " +
      "— comfortably spans Nov 8's own Pradosh Kala, no edge case this " +
      "year) recommending 2026-11-08; Frisco's own date is the engine's " +
      "own computed output, not an independently fetched Frisco-specific " +
      "page. The classically-described case where Amavasya ends before " +
      "sunset on its only eligible day (never touching any Pradosh Kala) " +
      "is NOT handled — no evidence it occurs in this checked window, an " +
      "honest gap rather than a guess. A near-identical general Purnima/" +
      "Amavasya rule (Satyanarayana Vrata) was previously built for this " +
      "codebase, tested against a full year of dates, found wrong on the " +
      "majority, and reverted (see engine.ts git history) — this rule is " +
      "narrower (one specific, sourced Amavasya, not every Purnima/" +
      "Amavasya) and independently checked against Drik's own Diwali-" +
      "specific recommendation, not a blanket revival of that reverted " +
      "rule.",
    provenanceUrl: "https://www.drikpanchang.com/festivals/lakshmipuja/festivals-lakshmipuja-timings.html?geoname-id=1269843",
    accessedISO: "2026-09-18",
  },
  {
    id: "ksheerabdi-dwadashi",
    name: "Ksheerabdi Dwadashi (Tulasi Vivah)",
    nameTe: "క్షీరాబ్ధి ద్వాదశి (తులసి వివాహం)",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Dwadashi) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Kartika Shukla Dwadashi, " +
      "immediately after the Diwali sequence) once independently fetched " +
      "and cross-checked for both Hyderabad and Frisco. Not implemented " +
      "merely to fill this catalogue slot.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "kartika-purnima",
    name: "Kartika Purnima",
    nameTe: "కార్తీక పౌర్ణమి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Purnima) — shares the same unresolved general Purnima prerequisite",
    convention:
      "Same unresolved-prerequisite reason as Sharad Purnima and Pitru " +
      "Paksha begins above: depends on the general Purnima civil-day-" +
      "selection rule, not yet solved (see 'diwali-lakshmi-puja' for the " +
      "concrete prior failure this defers on).",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Depends on the general Purnima/Amavasya selection rule, which is genuinely unresolved (see docs/temp/festival-calendar-v1-spec-2026-09-17.md §6).",
  },
  {
    id: "skanda-shashti",
    name: "Skanda Shashti (Soorasamharam)",
    nameTe: "స్కంద షష్ఠి (సూరసంహారం)",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Mainly Tamil/South Indian Murugan-tradition — not a universal Telugu observance",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Kartika Shukla Shashti) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Kartika Shukla Shashti) " +
      "once independently fetched and cross-checked for both Hyderabad and " +
      "Frisco. Predominantly a Tamil Murugan-tradition observance — must " +
      "not be presented as universal Telugu practice if implemented.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "subramanya-shashti",
    name: "Subramanya Shashti",
    nameTe: "సుబ్రహ్మణ్య షష్ఠి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Mainly Tamil/South Indian Murugan-tradition — not a universal Telugu observance",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Margashirsha Shukla Shashti) — spec correction: this falls INSIDE the delivery window, not outside it",
    convention:
      "SPEC CORRECTION: an earlier internal review grouped Subramanya " +
      "Shashti with observances outside the 17 Sep 2026 - Ugadi 2027 " +
      "window; that was wrong. Karya Siddhi Hanuman Temple's own December " +
      "2026 calendar page explicitly lists \"Subramanya Shashti (Main) — " +
      "December 14, 2026\" — a real date inside this window, confirmed by " +
      "the temple source itself. That source is ONE Frisco-area temple's " +
      "own program date, not an independent Drik Panchang fetch for " +
      "either Hyderabad or Frisco generally, and is recorded here as a " +
      "corroborating reference, not a validated general-location rule. Not " +
      "implemented without that independent check.",
    provenanceUrl: "https://assets.dallashanuman.net/images/event/2026/2026_calendar.pdf",
    accessedISO: "2026-09-18",
    deferredReason: "Temple-specific source only (one Frisco-area temple's program date); no location-general Drik Panchang verification yet.",
  },
  {
    id: "vaikuntha-ekadashi",
    name: "Vaikuntha Ekadashi",
    nameTe: "వైకుంఠ ఏకాదశి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Vaishnava)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Margashirsha Shukla Ekadashi) — Smarta/Vaishnava naming and date split not yet resolved",
    convention:
      "Coincides with the same Margashirsha Shukla Ekadashi already " +
      "described on the 'gita-jayanti' entry above: Drik's own Frisco " +
      "listing shows a plain/Smarta-style date (2026-12-19) versus a " +
      "'Gauna'/Vaishnava-style date (2026-12-20) one day apart, and the " +
      "Karya Siddhi Hanuman Temple's own Frisco-area calendar independently " +
      "celebrates 'Vaikunta Ekadashi' on Dec 20 — a real, documented " +
      "convention split, not an oversight. Given its own catalogue row " +
      "here (distinct from Gita Jayanti, which some families keep separate) " +
      "because the checklist names it separately; not implemented while " +
      "the convention choice is undecided.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Coincides with the Vaikuntha/Mokshada Ekadashi Smarta/Vaishnava convention split, not yet decided (see 'gita-jayanti' entry).",
  },
  {
    id: "hanuman-vrata",
    name: "Hanuman Vrata",
    nameTe: "హనుమాన్ వ్రతం",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "month-context",
    homePriority: "calendar-only",
    regionTag: "Temple-specific — not a universally observed pan-Hindu or Telugu date",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Not implemented — the only source found is one Frisco-area temple's own program listing",
    convention:
      "Karya Siddhi Hanuman Temple's own December 2026 calendar page lists " +
      "a 'Hanuman Vrata' entry as part of its OWN program schedule. This is " +
      "a temple sponsorship/program date, not a general pan-Hindu or " +
      "Telugu-calendar observance with an independently sourced tithi " +
      "convention — copying a temple program as a universal festival date " +
      "is exactly what this catalogue must not do. Not implemented.",
    provenanceUrl: "https://assets.dallashanuman.net/images/event/2026/2026_calendar.pdf",
    accessedISO: "2026-09-18",
    deferredReason: "Only source found is one temple's own program schedule, not a general-location religious convention.",
  },
  {
    id: "dhanurmasam-begins",
    name: "Dhanurmasam begins",
    nameTe: "ధనుర్మాసం ప్రారంభం",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "month-context",
    homePriority: "calendar-only",
    regionTag: "Telugu/South Indian",
    ruleFamily: "solar-ingress",
    validationStatus: "not-started",
    ruleName: "Solar-ingress (Sun's entry into Dhanu/Sagittarius Raasi) — mechanism not yet built",
    convention:
      "Needs a solar-ingress (Sankranti) mechanism this codebase does not " +
      "yet have — every implemented rule so far is lunar-tithi-based " +
      "(vyapti or tithi-at-sunrise) or a simple weekday-within-lunar-month " +
      "rule (Kartika Somavaram); none currently computes a solar Raasi " +
      "transition. 'solar-ingress' is a reserved ruleFamily value for " +
      "exactly this, not yet wired to any dispatchable method. Same gap as " +
      "Makara Sankranti below.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Needs a new solar-ingress engine mechanism; none exists yet (see 'makara-sankranti' for the same gap).",
  },
  {
    id: "bhogi",
    name: "Bhogi",
    nameTe: "భోగి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "telugu",
    homePriority: "calendar-only",
    regionTag: "Telugu/South Indian",
    ruleFamily: "solar-ingress",
    validationStatus: "not-started",
    ruleName: "Day before Makara Sankranti (solar ingress) — mechanism not yet built",
    convention:
      "Depends directly on the Makara Sankranti solar-ingress computation " +
      "below, which does not exist yet. Not implemented on an unresolved " +
      "prerequisite.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Needs a new solar-ingress engine mechanism; none exists yet (see 'makara-sankranti').",
  },
  {
    id: "makara-sankranti",
    name: "Makara Sankranti",
    nameTe: "మకర సంక్రాంతి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (solar calendar)",
    ruleFamily: "solar-ingress",
    validationStatus: "not-started",
    ruleName: "Solar-ingress (Sun's entry into Makara/Capricorn Raasi) — mechanism not yet built",
    convention:
      "The one major festival in this checklist that is fundamentally " +
      "SOLAR, not lunar — every existing rule in this engine (vyapti " +
      "families, tithi-at-sunrise, lunar-month-weekday) tracks a lunar " +
      "tithi or lunar-month boundary; none computes a solar Raasi " +
      "transition. Building this correctly needs its own new mechanism " +
      "(detecting when the Sun's tropical/sidereal longitude crosses the " +
      "Makara Raasi boundary relative to the location's own day), " +
      "genuinely new engine work, not a reuse of any existing family. Not " +
      "attempted this session; 'solar-ingress' is reserved in the type " +
      "system for exactly this.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Needs a new solar-ingress engine mechanism (Sun's Raasi transition); none exists yet — genuinely new engine work, not a reuse of an existing rule family.",
  },
  {
    id: "kanuma",
    name: "Kanuma",
    nameTe: "కనుమ",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "telugu",
    homePriority: "calendar-only",
    regionTag: "Telugu/South Indian",
    ruleFamily: "solar-ingress",
    validationStatus: "not-started",
    ruleName: "Day after Makara Sankranti (solar ingress) — mechanism not yet built",
    convention:
      "Depends directly on the Makara Sankranti solar-ingress computation " +
      "above, which does not exist yet. Not implemented on an unresolved " +
      "prerequisite.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Needs a new solar-ingress engine mechanism; none exists yet (see 'makara-sankranti').",
  },
  {
    id: "mukkanuma",
    name: "Mukkanuma",
    nameTe: "ముక్కనుమ",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "telugu",
    homePriority: "calendar-only",
    regionTag: "Telugu/South Indian, observed by some families only — not universal even within Telugu practice",
    ruleFamily: "solar-ingress",
    validationStatus: "not-started",
    ruleName: "Third day after Makara Sankranti (solar ingress) — mechanism not yet built",
    convention:
      "Depends directly on the Makara Sankranti solar-ingress computation " +
      "above, which does not exist yet, and is itself an optional fourth " +
      "day some families observe and others do not. Not implemented on an " +
      "unresolved prerequisite.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Needs a new solar-ingress engine mechanism; none exists yet (see 'makara-sankranti'). Also a regionally optional fourth day, not universal.",
  },
  {
    id: "vasant-panchami",
    name: "Vasant Panchami (Sri Panchami)",
    nameTe: "వసంత పంచమి (శ్రీ పంచమి)",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Magha Shukla Panchami) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Magha Shukla Panchami) " +
      "once independently fetched and cross-checked for both Hyderabad and " +
      "Frisco. Not implemented merely to fill this catalogue slot.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "bhishma-ekadashi",
    name: "Bhishma Ekadashi",
    nameTe: "భీష్మ ఏకాదశి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Vaishnava)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Magha Shukla Ekadashi) — not yet independently validated",
    convention:
      "Would reuse the tithi-at-sunrise family (Magha Shukla Ekadashi, " +
      "close to Ratha Saptami in the same masa) once independently fetched " +
      "and cross-checked for both Hyderabad and Frisco. Not implemented " +
      "merely to fill this catalogue slot.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Rule family known (tithi-at-sunrise) but the specific fixture dates are not yet independently validated for this location pair.",
  },
  {
    id: "holika-dahan",
    name: "Holika Dahan",
    nameTe: "హోళికా దహనం",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu, mainly North/Central Indian in Telugu-family practice",
    ruleFamily: "pradosha-vyapti",
    validationStatus: "not-started",
    ruleName: "Pradosha-vyapti of Phalguna Purnima — mechanism now exists (see Dhanteras/Diwali), but still shares the unresolved general Purnima question",
    convention:
      "Traditionally the evening (Pradosh Kala) of Phalguna Purnima. The " +
      "Pradosha-vyapti MECHANISM itself is no longer the blocker - it " +
      "shipped this batch (`pradoshaVyaptiFestivalDay`, see Dhanteras and " +
      "Diwali/Lakshmi Puja above, both of which reuse it directly). What " +
      "remains unresolved is specific to PURNIMA (not Amavasya, which " +
      "Diwali already validated cleanly for 2026): whether Purnima itself " +
      "needs the same care Diwali's Amavasya got (an ends-before-sunset " +
      "edge case with no built fallback), and the general Purnima civil-" +
      "day question already documented above (Sharad Purnima, Kartika " +
      "Purnima) - a near-identical rule (Satyanarayana Vrata) was found " +
      "wrong on most of a year's real dates and reverted. Not implemented " +
      "until that Purnima-specific question is independently checked, " +
      "not merely because the underlying mechanism was missing.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "The Pradosha-vyapti mechanism now exists; Purnima's own civil-day selection is still unresolved (see the general Purnima note above).",
  },
  {
    id: "holi",
    name: "Holi",
    nameTe: "హోళి",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "major",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu, mainly North/Central Indian in Telugu-family practice",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "Tithi-at-sunrise (Phalguna Krishna Pratipada, the day after Holika Dahan) — depends on Holika Dahan's own unresolved date",
    convention:
      "The day immediately after Holika Dahan, whose own date is not yet " +
      "resolved (see above) — implementing Holi's date independently of " +
      "Holika Dahan's would risk the two disagreeing. Not implemented " +
      "until Holika Dahan's own prerequisite is resolved.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "Depends on Holika Dahan's own date, which is itself unresolved (Pradosha-vyapti mechanism not yet built).",
  },
  {
    id: "ekadashi-recurring",
    name: "Named Ekadashis (recurring, every lunar month)",
    nameTe: "ఏకాదశులు (ప్రతి మాసం)",
    method: "deferred",
    masa: "", paksha: "", tithi: "",
    pujaSlug: null,
    category: "recurring",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Vaishnava)",
    ruleFamily: "tithi-at-sunrise",
    validationStatus: "not-started",
    ruleName: "A recurring Ekadashi rule is possible with the existing tithi-at-sunrise mechanism, but the naming/observance convention is genuinely unresolved",
    convention:
      "A single ONE catalogue row standing in for the roughly 24 named " +
      "Ekadashis across the 17 Sep 2026 - Ugadi 2027 window, deliberately " +
      "not expanded into 24 individual placeholder rows. The mechanical " +
      "part (recurring Shukla/Krishna Ekadashi, every lunar month) reuses " +
      "the already-built tithi-at-sunrise family with no masa filter, the " +
      "same shape as Masa Shivaratri — genuinely feasible. What is NOT " +
      "resolved: which named convention to surface (Smarta vs. Vaishnava " +
      "naming/date splits are real and already documented for the " +
      "Margashirsha occurrence — see 'gita-jayanti' / 'vaikuntha-ekadashi' " +
      "— and are not a one-off; most months can split the same way), and " +
      "whether generic 'Ekadashi' should even be a family-facing card at " +
      "all versus a fasting-only entry. Deferred as a scoping decision, " +
      "not a technical blocker.",
    provenanceUrl: "https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html",
    accessedISO: "2026-09-18",
    deferredReason: "The Smarta/Vaishnava naming-and-date-split convention is unresolved across most months, not just Margashirsha; needs a scoping decision before implementation.",
  },
  {
    id: "pradosham-recurring",
    name: "Pradosham",
    nameTe: "ప్రదోషం",
    method: "pradosha-vyapti",
    masa: "",
    paksha: "",
    tithi: "Trayodashi",
    pujaSlug: null,
    category: "recurring",
    homePriority: "calendar-only",
    regionTag: "Pan-Hindu (Shiva-focused)",
    ruleFamily: "pradosha-vyapti",
    validationStatus: "reference-matched",
    ruleName: "Pradosha-vyapti (Trayodashi, EITHER paksha, prevailing at Pradosh Kala, recurring)",
    convention:
      "The first civil day whose Pradosh Kala (sunset to sunset + " +
      "night/5 — see engine.ts's `pradoshaWindow`) contains Trayodashi, " +
      "in either Shukla or Krishna paksha (`paksha: \"\"` matches either — " +
      "the same 'no filter' convention `masa: \"\"` already uses " +
      "elsewhere). Recurs roughly twice a month, the same shape as Masa " +
      "Shivaratri/Sankashti Chaturthi. Matches Drik Panchang's own stated " +
      "rule (Pradosh Vrat dates page, accessed 2026-09-18): \"day is " +
      "fixed when Trayodashi Tithi falls during Pradosh Kaal which " +
      "starts after Sunset.\" Checked against Drik's own published 2026 " +
      "Pradosh Vrat dates for Hyderabad — see tests/panchanga.test.mjs " +
      "for the full fixture list; Frisco's own dates are the engine's own " +
      "computed output, not independently fetched — single-reference " +
      "conformance for the checked dates, not independent validation.",
    provenanceUrl: "https://www.drikpanchang.com/vrats/pradoshdates.html?geoname-id=1269843",
    accessedISO: "2026-09-18",
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

/**
 * The Calendar V1 Phase 1 release boundary - REVIEWER-ONLY metadata (never
 * rendered on an ordinary family-facing festival card; a family sees only a
 * date and a name). Every rule's date is still computed DYNAMICALLY from
 * latitude/longitude/timezone for ANY date, not just this window - this
 * boundary states where that dynamic computation has been checked against a
 * real reference, not a hard limit on what the engine will compute.
 */
export const FESTIVAL_CALENDAR_RELEASE_BOUNDARY = {
  /** Supported private-beta festival-calendar horizon. */
  horizon: { fromISO: "2026-09-17", toDescription: "Ugadi 2027 (2027-04-07)" },
  statement:
    "Supported private-beta festival-calendar horizon: 17 September 2026 " +
    "through Ugadi 2027. Every ACTIVE Phase 1 rule has an executable " +
    "Hyderabad AND Frisco engine fixture for a date inside this horizon " +
    "(see tests/panchanga.test.mjs) - but that is a fixture on the " +
    "engine's OWN computed output for both locations, not proof both were " +
    "independently compared against a published source. Only the " +
    "location(s) explicitly identified as fetched in a given rule's own " +
    "`convention` text were directly compared with a real published " +
    "reference for that date; several rules have Hyderabad independently " +
    "fetched and Frisco's fixture is the engine's own computed output, " +
    "with no independently fetched Frisco-specific source (see each rule's " +
    "own validationStatus and convention above for exactly which). " +
    "\"Reference-matched\" therefore means conformance for the SPECIFIC " +
    "documented year and location(s) actually compared to a source - never " +
    "a general claim about every year or every location, and never " +
    "independent validation. A dynamic result for a date OUTSIDE this " +
    "horizon (a past year, or any year past Ugadi 2027) is PROVISIONAL: " +
    "the same engine computes it, but it has not been checked against a " +
    "real reference for that specific year. The 2031 Kshaya-masa gap (Maha " +
    "Shivaratri finds no match at Hyderabad that year - see " +
    "amantaMasaFromMoonMasa's doc comment in engine.ts) is a KNOWN, " +
    "DOCUMENTED limitation, not hidden or silently worked around. No " +
    "priest approval, institutional endorsement, or universal religious " +
    "authority is claimed for any rule in this catalogue.",
} as const;
