# Festival Calendar V1 — Specification (revision 2: comprehensive scope)

**Date:** 17 September 2026 (revision 2, same day — supersedes revision 1's
recommended scope; all revision-1 research is preserved and extended below)
**Branch:** `dev-foundation` (from `62d752c`)
**Scope:** research and specification only. No application code touched, no
tests added, nothing built, nothing deployed. This report is the only
artifact of this task.
**Coverage window:** 17 September 2026 through Ugadi, 7 April 2027.
**Audience:** Telugu-family / NRI users, primarily Hyderabad and the US
(Frisco used throughout as the representative US location).
**Explicitly excluded from this phase (per instruction):** marriage,
housewarming (Griha Pravesh), vehicle-purchase, birth-chart-based, or any
other personalised Muhurtham. Nothing in this document proposes any of
those.

---

## What changed from revision 1

Revision 1 recommended a bounded 9-rule V1 that deliberately deferred
Ekadashi, Pradosham, Purnima, Amavasya, and most of the Diwali cluster as
"too frequent" or "lower priority than Diwali itself." That does not meet
the updated requirement: comprehensive coverage means the frequent vratas
are **included and designed as reusable rule families**, not deferred
because they recur. This revision:

- Extends the research window from Sep-Nov 2026 to Sep 2026 - Apr 2027
  (through Ugadi), adding Dhanurmasam, Vaikuntha Ekadashi, Bhogi, Makara
  Sankranti, Kanuma, Ratha Saptami, Holika Dahan/Holi.
- Includes Ekadashi, Pradosham, Purnima, Amavasya, and Sankranti as
  first-class rule families with real occurrence data, not deferred.
- Adds the complete Diwali sequence (5 days, not just Diwali itself).
- Replaces the per-festival implementation list with a **rule-family**
  design: every event in the catalogue maps to one of 10 reusable
  mechanisms, several of which are already built and shipped.
- Restructures around the 7 deliverables requested, in that order.

All of revision 1's source evidence (Drik Panchang fetches, Karya Siddhi
Hanuman Temple PDF readings) is preserved and cited again below; nothing
was re-derived to replace it.

---

## Method (unchanged from revision 1, extended)

Every date below was fetched directly from Drik Panchang
(`drikpanchang.com`) for Hyderabad (`geoname-id=1269843`) and Frisco
(`geoname-id=4692559`) specifically, plus Karya Siddhi Hanuman Temple's own
2026 calendar (`assets.dallashanuman.net`, a temple minutes from Frisco),
read from its actual PDF pages, not a summary. Where a page's own
AI-summarized result looked ambiguous, it was re-fetched with a request for
a **verbatim quote** of the table — this caught a real discrepancy in the
Naraka Chaturdashi date (§6, unresolved item 2) and a naming discrepancy in
Vaikuntha/Mokshada Ekadashi (§6, unresolved item 3). **No third Panchangam
source was needed this pass** — every disagreement found was between Drik
and the temple, or between two different Drik fetches of the same page,
never a case where a genuinely independent third source was the only way
to break a tie. If a genuine three-way disagreement is found while
building validation fixtures, a third source (e.g. mypanchang.com or a
published TTD/Tirumala panchangam) should be added then, not speculatively
now.

**What this remains:** a specification of *which* rules to build and
*what convention each publishes*, not an independent astronomical
derivation. That derivation — a dedicated engine function, an echo guard, a
kshaya fallback, and dozens of real dates checked one at a time — is what
this app's four shipped rules each required (`lib/panchanga/engine.ts`),
and remains the bar for turning any row below into production code.

---

## 1. Revised comprehensive catalogue

Legend: **Home-P0** = eligible for Home's "next major festival" slot;
**Home-P1** = eligible for Home's "nearest observance" slots (§7); **Cal**
= Calendar-only, not a Home candidate in V1; **Loc?** = a different civil
day is possible between Hyderabad and a US location for the same rule.

### 1.1 Major festivals (single-day, high cultural weight)

| # | English | Telugu | Category | Home priority | Loc? |
|---|---|---|---|---|---|
| 1 | Navratri (Sharad) begins | శరన్నవరాత్రులు ప్రారంభం | Major | Home-P0 | Y |
| 2 | Durga Ashtami | దుర్గాష్టమి | Major | Home-P1 | Y |
| 3 | Maha Navami | మహర్నవమి | Major | Home-P1 | Y |
| 4 | Vijayadashami / Dussehra | విజయదశమి | Major | Home-P0 | Y |
| 5 | Dhanteras / Dhana Trayodashi | ధన త్రయోదశి | Major (Diwali seq.) | Home-P1 | Y |
| 6 | Naraka Chaturdashi | నరక చతుర్దశి | Major (Diwali seq.) | Home-P1 | Y (confirmed) |
| 7 | Diwali / Lakshmi Puja | దీపావళి | Major (Diwali seq.) | Home-P0 | Y (confirmed) |
| 8 | Bali Padyami / Govardhan Puja | బలి పాడ్యమి | Major (Diwali seq.) | Home-P1 | Y |
| 9 | Yama Dwitiya / Bhaiya Dooj | యమ ద్వితీయ | Major (Diwali seq.) | Home-P1 | Y |
| 10 | Ugadi | ఉగాది | Major (shipped) | Home-P0 | Y (shipped) |
| 11 | Vinayaka Chavithi | వినాయక చవితి | Major (shipped) | Home-P0 | Y (shipped) |
| 12 | Rama Navami | శ్రీరామ నవమి | Major | Home-P1 | Y (unconfirmed rule) |
| 13 | Maha Shivaratri (annual) | మహా శివరాత్రి | Major | Home-P1 | Y (shares shipped mechanism) |
| 14 | Krishna Janmashtami | శ్రీకృష్ణ జన్మాష్టమి | Major | Home-P1 | Y (convention split) |
| 26 | Holika Dahan / Holi | హోళిక దహనం / హోళి | Major, **North Indian — see tag note** | Cal (not Home-P0) | Y |

### 1.2 Recurring vratas and observances — **not deferred**

| # | English | Telugu | Category | Home priority | Loc? |
|---|---|---|---|---|---|
| 15 | Ekadashi | ఏకాదశి | Recurring | Home-P1 (§7 30-day slot) | Y + Smarta/Vaishnava split |
| 16 | Pradosham | ప్రదోష వ్రతం | Recurring | Home-P1 | Y |
| 17 | Sankashti Chaturthi | సంకష్టి చతుర్థి | Recurring (shipped) | Home-P1 (shipped) | Y (shipped, 39 dates validated) |
| 18 | Masa Shivaratri | మాస శివరాత్రి | Recurring (shipped) | Home-P1 (shipped) | Y (shipped) |
| 19 | Purnima | పౌర్ణమి | Recurring | Home-P1 (once rule solved, §6) | Y (rule unresolved) |
| 20 | Amavasya | అమావాస్య | Recurring | Cal only (see §6) | Y (rule unresolved) |
| 27 | Sankranti (solar ingress, general) | సంక్రాంతి | Recurring, 12/year | Cal only except Makara (below) | Y (confirmed, new mechanism) |

### 1.3 Telugu / Kartika observances

| # | English | Telugu | Category | Home priority | Loc? |
|---|---|---|---|---|---|
| 21 | Kartika Masam begins/ends | కార్తీక మాసం ప్రారంభం/ముగింపు | Telugu/Kartika | Cal context, not a row | Y |
| 22 | Atla Tadde | అట్ల తద్దె | Telugu/Kartika | Home-P1 | Y (confirmed) |
| 23 | Nagula Chavithi | నాగుల చవితి | Telugu/Kartika | Home-P1 | Y (confirmed) |
| 24 | Kartika Somavaram (every Monday in Kartika) | కార్తీక సోమవారం | Telugu/Kartika | Cal only | Y (month boundary only) |
| 25 | Ksheerabdi Dwadashi / Tulasi Vivah | క్షీరాబ్ధి ద్వాదశి | Telugu/Kartika | Home-P1 | Y (unconfirmed) |
| — | Kartika Purnima | కార్తీక పౌర్ణమి | Telugu/Kartika | Home-P1 (once Purnima rule solved) | Y |

### 1.4 December 2026 – Ugadi 2027 (new this revision)

| # | English | Telugu | Category | Home priority | Loc? |
|---|---|---|---|---|---|
| 28 | Dhanu Sankranti / Dhanurmasam begins | ధనుర్మాసం ప్రారంభం | Dec-Apr | Cal context | Y (**confirmed divergent civil day**, §5) |
| 29 | Vaikuntha Ekadashi | వైకుంఠ ఏకాదశి | Dec-Apr (= Ekadashi family) | Home-P0 (one year's most significant Ekadashi) | Y + Smarta/Vaishnava naming split |
| 30 | Bhogi | భోగి | Dec-Apr (Sankranti seq.) | Home-P1 | Y (derived, not independently fetched — §6) |
| 31 | Makara Sankranti | మకర సంక్రాంతి | Dec-Apr | Home-P0 | Y (**confirmed divergent civil day**, §5) |
| 32 | Kanuma | కనుమ | Dec-Apr (Sankranti seq.) | Home-P1 | Y (derived, not independently fetched — §6) |
| 33 | Ratha Saptami | రథ సప్తమి | Dec-Apr | Home-P1 | Y (same day both locations, one year checked) |
| 13′ | Maha Shivaratri (already listed, §1.1) | | | | |
| 26′ | Holika Dahan / Holi (already listed, §1.1) | | | | |
| 10′ | Ugadi (already listed, §1.1, closes the window) | | | | |

**Every festival found in the source calendars during this window is
accounted for above or explicitly excluded with a reason (§4).** No silent
omissions.

---

## 2. Month-by-month coverage matrix, 17 Sep 2026 → Ugadi 7 Apr 2027

Two tables, for readability, not two classes of rigor: **(A)** every named,
single/multi-day major or Telugu/Kartika observance gets its own full row.
**(B)** the six high-frequency recurring rules (Ekadashi, Pradosham,
Sankashti Chaturthi, Masa Shivaratri, Purnima, Amavasya) each get **one**
rule-definition row (selection rule, family, sources, tag, priority,
validation, unresolved — these do not change per-occurrence) plus a
**compact occurrence table** of every actual date found in the window, so
every real occurrence is still listed, without repeating identical
rule metadata dozens of times.

### 2A. Named observances, in date order

| Month | English | Telugu | Frisco 2026/27 | Hyderabad 2026/27 | Selection rule | Rule family | Sources | Tag | Home priority | Validation | Unresolved |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sep | Krishna Janmashtami (Smarta) | జన్మాష్టమి (స్మార్త) | Sep 3 | Sep 4 *(single entry, Hyd)* | Krishna Ashtami + Rohini, nishita | nishita-vyapti | Drik Telugu cal. ×2 | Pan-Hindu | Home-P1 | Not started | §6.1 |
| Sep | Krishna Janmashtami (ISKCON) | జన్మాష్టమి (ఇస్కాన్) | Sep 4 | *(not shown separately)* | Krishna Ashtami, sunrise-anchored variant | nakshatra combination (variant) | Drik Frisco cal. | Vaishnava sect | Cal only | Not started | §6.1 |
| Sep | Vinayaka Chavithi *(shipped)* | వినాయక చవితి | Sep 14 | Sep 14 | Bhadrapada Shukla Chaturthi, madhyahna | madhyahna-vyapti | `lib/panchanga/festival-rules.ts` | Telugu/pan-South-Indian | Home-P0 | **Shipped, validated** | none |
| Sep | Ganesh Nimajjana / Anant Chaturdashi | గణేశ నిమజ్జనం | Sep 25 | Sep 25 | Bhadrapada Shukla Chaturdashi, closes the Vinayaka festival window | multi-day festival sequence | Drik + temple (both) | Telugu/pan-South-Indian | Cal only *(§6.6)* | Not started | §6.6 |
| Oct | Navratri begins | శరన్నవరాత్రులు ప్రారంభం | Oct 11 | Oct 11 | Amanta Ashwin Shukla Pratipada, sunrise | tithi at sunrise | Drik Telugu cal. ×2 | Pan-Hindu | Home-P0 | Not started | none |
| Oct | Durga Ashtami | దుర్గాష్టమి | Oct 18 | Oct 19 | Ashtami tithi during Navratri | aparahna-vyapti *(proposed, §6.4)* | Drik + temple | Pan-Hindu | Home-P1 | Not started | §6.4 |
| Oct | Maha Navami | మహర్నవమి | Oct 19 | Oct 19 *(same day as Ashtami at Hyd)* | Navami tithi during Navratri | aparahna-vyapti *(proposed)* | Drik + temple | Pan-Hindu | Home-P1 | Not started | §6.4 |
| Oct | Vijayadashami / Dussehra | విజయదశమి | Oct 20 | Oct 20 | Dashami tithi, likely Aparahna | aparahna-vyapti *(proposed)* | Drik + temple | Pan-Hindu | Home-P0 | Not started | §6.4 |
| Oct | Atla Tadde | అట్ల తద్దె | Oct 28 | Oct 28 | Ashwin **Krishna** Tritiya, sunrise *(corrected 2026-09-18 — this row said Shukla; the implemented rule, `lib/panchanga/festival-rules.ts`, targets Krishna Tritiya, matching Drik's own "Krishna Thadiya" label for this date)* | tithi at sunrise | Drik Telugu cal. ×2 | **Telugu-specific** | Home-P1 | **Shipped** | none |
| Nov | Dhanteras | ధన త్రయోదశి | Nov 6 | Nov 6 | Trayodashi tithi, Pradosha-kala | pradosha-vyapti *(proposed, new)* | Drik Diwali cal. ×2 + temple | Pan-Hindu | Home-P1 | Not started | none |
| Nov | Naraka Chaturdashi | నరక చతుర్దశి | Nov 7 | **Nov 8** *(coincides with Diwali that year)* | Krishna Chaturdashi, pre-dawn (Abhyanga) | tithi at sunrise (pre-dawn variant) | Drik Diwali cal. ×2 + temple | Pan-Hindu, South-Indian-emphasised | Home-P1 | Not started | §6.2 |
| Nov | Diwali / Lakshmi Puja | దీపావళి | Nov 8 | Nov 8 | Amavasya tithi, Pradosha-kala | pradosha-vyapti | Drik Diwali cal. ×2 + temple | Pan-Hindu | Home-P0 | Not started | shares §6.5 (Amavasya) |
| Nov | Bali Padyami / Govardhan Puja | బలి పాడ్యమి | Nov 9 | Nov 10 | Shukla Pratipada, morning | tithi at sunrise | Drik Diwali cal. ×2 | Pan-Hindu, N. Indian-emphasised | Home-P1 | Not started | none |
| Nov | Yama Dwitiya / Bhaiya Dooj | యమ ద్వితీయ | Nov 10 | Nov 11 | Shukla Dwitiya | tithi at sunrise | Drik Diwali cal. ×2 | Pan-Hindu, N. Indian-emphasised | Home-P1 | Not started | none |
| Nov | Nagula Chavithi | నాగుల చవితి | Nov 12 | Nov 13 | Kartika Shukla Chaturthi, sunrise | tithi at sunrise | Drik Telugu cal. ×2 + temple (exact match) | **Telugu-specific** | Home-P1 | Not started | none |
| Nov | Ksheerabdi Dwadashi / Tulasi Vivah | క్షీరాబ్ధి ద్వాదశి | Nov 21 | ~Nov 21 *(not independently fetched)* | Kartika Shukla Dwadashi | tithi at sunrise (proposed) | General web + temple (exact term) | Pan-Hindu, Telugu-named | Home-P1 | Not started | §6.7 |
| Nov | Kartika Purnima | కార్తీక పౌర్ణమి | Nov 24 | Nov 24 | Purnima tithi in Kartika | tithi at sunrise *(pending §6.3)* | Drik dedicated pages ×2 | Pan-Hindu | Home-P1 | Not started | shares §6.3 (Purnima) |
| Dec | Dhanu Sankranti / Dhanurmasam begins | ధనుర్మాసం ప్రారంభం | **Dec 15** | **Dec 16** | Solar ingress, Sun enters Dhanu (Sagittarius) | solar ingress / Sankranti | Drik Sankranti pages ×2 | **Telugu/South-Indian** | Cal context | Not started | §5, §6.8 |
| Jan '27 | Bhogi | భోగి | *(derived: Jan 13)* | Jan 14 | Day before Makara Sankranti | multi-day sequence (anchored to Sankranti) | General web (Hyd only) + inference | **Telugu-specific** | Home-P1 | Not started | §6.9 |
| Jan '27 | Makara Sankranti | మకర సంక్రాంతి | **Jan 14** | **Jan 15** | Solar ingress, Sun enters Makara (Capricorn) | solar ingress / Sankranti | Drik Sankranti pages ×2 | Pan-Hindu, major in Telugu states | Home-P0 | Not started | §6.9 |
| Jan '27 | Kanuma | కనుమ | *(derived: Jan 15)* | Jan 16 | Day after Makara Sankranti | multi-day sequence (anchored to Sankranti) | Inference from Sankranti day | **Telugu-specific** | Home-P1 | Not started | §6.9 |
| Feb '27 | Ratha Saptami | రథ సప్తమి | Feb 13 | Feb 13 | Magha Shukla Saptami, sunrise/snan-muhurat | tithi at sunrise | Drik dedicated pages ×2 | Pan-Hindu | Home-P1 | Not started | none |
| Mar '27 | Maha Shivaratri (annual) | మహా శివరాత్రి | Mar 6 | Mar 6 | Magha Krishna Chaturdashi, nishita | nishita-vyapti *(shares shipped mechanism, month-filtered)* | Drik Telugu cal. ×2 | Pan-Hindu | Home-P0 | Rule mechanism shipped; month filter not | none |
| Mar '27 | Holika Dahan | హోళిక దహనం | Mar 21 | Mar 21 | Phalguna Purnima, evening bonfire | pradosha-vyapti (evening) | Drik Telugu cal. ×2 | **North Indian — not core Telugu tradition** | Cal only | Not started | §4 |
| Mar '27 | Holi | హోళి | Mar 22 | Mar 22 | Phalguna Shukla Pratipada | tithi at sunrise | Drik Telugu cal. ×2 | **North Indian — not core Telugu tradition** | Cal only | Not started | §4 |
| Apr '27 | Ugadi *(shipped)* | ఉగాది | Apr 7 | Apr 7 | Amanta Chaitra Shukla Pratipada, sunrise | tithi at sunrise | `lib/panchanga/festival-rules.ts` | Telugu New Year | Home-P0 | **Shipped, validated** | none |

*(Rama Navami falls after Ugadi in both years checked — 26 Mar (span) 2026,
15/14 Apr 2027 — outside this window on the 2027 side; carried in §1.1 for
completeness, not repeated here.)*

### 2B. High-frequency recurring rules — rule definition + full occurrence list

#### Ekadashi

- **Selection rule:** Ekadashi tithi (11th of each paksha), sunrise. A
  **Smarta/Vaishnava naming split exists** (Drik lists "Gauna"/"Vaishnava"
  variants on a different day from the plain listing in most months) —
  this app would need to pick one convention or show both, a product
  decision, not an engineering one (§6.1 covers the closely related
  Janmashtami split; the same class of decision applies here).
- **Rule family:** tithi at sunrise (same primitive already used for
  Ugadi, just without the masa filter).
- **Sources:** Drik Panchang full-year Telugu calendars, Hyderabad and
  Frisco, 2026 and 2027 (§7 sources).
- **Tag:** Pan-Hindu, observed widely; twice-monthly frequency is itself
  the reason revision 1 deferred it — this revision does not.
- **Home priority:** Home-P1, eligible only for the 30-day "nearest
  observances" slot (§7), never the 60-day "major festival" slot, **except
  Vaikuntha Ekadashi** (Dec), which is explicitly elevated to Home-P0 for
  its own occurrence given its outsized cultural significance in
  Dhanurmasam (Tirumala's Vaikunta Dwaram opening, etc.).
- **Validation status:** not started.
- **Unresolved:** the Smarta/Vaishnava split (as above); whether Ekadashi
  should ever occupy a Home row at all given how frequently a "nearest
  observance" slot would then show it (a design question for §7, not
  resolved here).

| Occurrence | Frisco | Hyderabad |
|---|---|---|
| Aja Ekadashi | Sep 6-7 (Smarta/Gauna split) | Sep 7 |
| Parivartani Ekadashi | Sep 22 | Sep 22 |
| Indira Ekadashi | Oct 6 | Oct 6 |
| Papankusha Ekadashi | Oct 21 | Oct 22 |
| Rama Ekadashi | Nov 4 | Nov 5 |
| Devutthana Ekadashi | Nov 20 | Nov 20 |
| Utpanna Ekadashi | Dec 4 | Dec 4 |
| Mokshada / **Vaikuntha** Ekadashi | Dec 19 (Drik) / Dec 20 (temple, "Vaikunta Ekadashi") | Dec 20 |
| Saphala Ekadashi | Jan 2 '27 | Jan 3 '27 |
| Pausha Putrada Ekadashi | Jan 18 '27 | Jan 18-19 '27 |
| Shattila Ekadashi | Feb 1 '27 | Feb 2 '27 |
| Jaya Ekadashi | Feb 16-17 '27 | Feb 17 '27 |
| Vijaya Ekadashi | Mar 3 '27 | Mar 4 '27 |
| Amalaki Ekadashi | Mar 18 '27 | Mar 18 '27 |
| Papamochani Ekadashi | Apr 2 '27 | Apr 2 '27 |

#### Pradosham

- **Selection rule:** Trayodashi tithi, evening twilight (Pradosha-kala).
- **Rule family:** **pradosha-vyapti** (a new window type — not yet built
  in any form; Diwali and Dhanteras also need it, so building it once
  covers three rows in this catalogue, not one).
- **Sources:** same Drik full-year fetches as Ekadashi.
- **Tag:** Pan-Hindu, twice-monthly (Shukla and Krishna Trayodashi).
- **Home priority:** Home-P1, 30-day slot only.
- **Validation status:** not started; the pradosha-kala window itself
  (sunset to ~3 muhurta after, per general convention) is not yet sourced
  to the precision this project requires (compare Vinayaka Chavithi's
  madhyahna window, which took a dedicated fixture set).
- **Unresolved:** exact Pradosha-kala window definition (§6.10).

| Occurrence | Frisco | Hyderabad |
|---|---|---|
| Bhauma Pradosh Vrat | Sep 8 | Sep 8 |
| Budha/Guru Pradosh Vrat | Sep 23 (Budha) | Sep 24 (Guru) |
| Budha/Guru Pradosh Vrat | Oct 7 (Budha) | Oct 8 (Guru) |
| Shukra Pradosh Vrat | Oct 23 | Oct 23 |
| Shukra Pradosh Vrat | Nov 6 | Nov 6 |
| Shani/Ravi Pradosh Vrat | Nov 21 (Shani) | Nov 22 (Ravi) |
| Shani/Ravi Pradosh Vrat | Dec 5 (Shani) | Dec 6 (Ravi) |
| Soma Pradosh Vrat | Dec 21 | Dec 21 |
| Soma/Bhauma Pradosh Vrat | Jan 4 '27 (Soma) | Jan 5 '27 (Bhauma) |
| Bhauma/Budha Pradosh Vrat | Jan 19 '27 (Bhauma) | Jan 20 '27 (Budha) |
| Budha Pradosh Vrat | Feb 3 '27 | Feb 3 '27 |
| Guru Pradosh Vrat | Feb 18 '27 | Feb 18 '27 |
| Shukra Pradosh Vrat | Mar 5 '27 | Mar 5 '27 |
| Shukra/Shani Pradosh Vrat | Mar 19-20 '27 *(source data slightly inconsistent — see note)* | Mar 20 '27 |
| Ravi Pradosh Vrat | Apr 3-4 '27 | Apr 4 '27 |

*Note (corrected 2026-09-18): the Frisco fetch listed "Shukra Pradosh
Vrat" for both Mar 5 and Mar 19 2027. This was originally flagged as an
internal inconsistency on the assumption that Pradosham must alternate
weekday names between consecutive occurrences. That assumption was
wrong: two Trayodashi tithis 14 days (exactly two weeks) apart land on
the SAME weekday by simple arithmetic, with no requirement that
consecutive Pradoshams differ — the weekday is whatever day the tithi
happens to prevail on, not a fixed rotation. Two Shukra (Friday) entries
14 days apart is an ordinary, expected outcome, not a contradiction; the
source does not need re-verification on this point.*

#### Sankashti Chaturthi *(shipped, already fully validated)*

- **Selection rule / family:** Krishna Chaturthi at moonrise
  (chandrodaya-vyapti), with the noon-probe kshaya fallback for a Tithi
  touching no moonrise on any day. `lib/panchanga/engine.ts`,
  `chandrodayaVyaptiFestivalDay`.
- **Sources:** Drik Sankashti-dates pages, 3 locations, 39 dates
  cross-checked (`73d4a19`).
- **Tag:** Pan-Hindu (Ganapati-focused), monthly.
- **Home priority:** Home-P1, shipped.
- **Validation status:** shipped, validated.
- **Occurrences in this window** (already computed and tested):
  2026-09-29, 2026-10-29, 2026-11-27, 2026-12-26, 2027-01-25 (Hyderabad);
  2026-09-29, 2026-10-28, 2026-11-27, 2026-12-26, 2027-01-25 (Frisco) —
  continuing into Feb/Mar/Apr 2027 per the same shipped, validated rule
  (not re-listed here; see the engine's own doc comment for the full-year
  fixture).

#### Masa Shivaratri *(shipped, already fully validated)*

- **Selection rule / family:** Krishna Chaturdashi at nishita
  (nishita-vyapti). `lib/panchanga/engine.ts`, `nishitaVyaptiFestivalDay`.
- **Sources:** Drik Nishita Muhurta + day-panchang fetches, validated.
- **Tag:** Pan-Hindu (Shiva-focused), monthly.
- **Home priority:** Home-P1, shipped.
- **Validation status:** shipped, validated.
- The **annual** Maha Shivaratri (row 13, §1.1/§2A) is the SAME mechanism
  restricted to the Magha occurrence — no new engine work, only a masa
  filter and a Home-P0 priority override for that one occurrence a year.

#### Purnima *(rule genuinely unresolved — see §6.3)*

- **Selection rule:** Purnima tithi — **the exact civil-day-selection
  convention is not solved**. A near-identical rule (Satyanarayana Vrata)
  was built and tested against a full year of real dates by this session
  and found wrong on the majority of them (see `1c8c10c`'s git history —
  the attempt was reverted, not shipped).
- **Rule family:** tithi at sunrise — **hypothesis only, disproven once
  already for the sibling Satyanarayana Vrata rule.**
- **Sources:** partial — named Purnimas only (see occurrence table);
  months without a special name were not independently fetched.
- **Tag:** Pan-Hindu, monthly.
- **Home priority:** none until the rule is solved (§6.3 is a
  prerequisite, not a parallel task).
- **Validation status:** blocked.

| Occurrence | Frisco | Hyderabad | Source |
|---|---|---|---|
| Sharad Purnima | ~Oct 25 | *(not independently fetched)* | Temple calendar only |
| Kartika Purnima | Nov 24 | Nov 24 | Drik dedicated pages ×2 |
| Margashira Purnima (Dec) | *(not fetched)* | *(not fetched)* | gap |
| Pausha Purnima (Jan) | *(not fetched)* | *(not fetched)* | gap |
| Magha Purnima (Feb) | *(not fetched)* | *(not fetched)* | gap |
| Phalguna Purnima (= Holika Dahan day) | Mar 21 '27 | Mar 21 '27 | Drik Telugu cal. ×2 |

#### Amavasya *(rule unresolved, same reason as Purnima)*

- **Selection rule / family / status:** identical open question to
  Purnima — Amavasya is Purnima's mirror on the lunar calendar, and shares
  its unresolved sunrise-vs-other-reference-point question.
- **Home priority:** Calendar-only even after the rule is solved —
  Amavasya has no standalone "next Amavasya" cultural significance
  comparable to Purnima's (it matters as the anchor for Diwali and month
  boundaries, both already covered elsewhere), so it is **not** proposed
  for a Home row even in a future version, only for Calendar completeness.

| Occurrence | Frisco | Hyderabad | Source |
|---|---|---|---|
| Ashwin Amavasya | *(not fetched)* | *(not fetched)* | gap |
| Diwali Amavasya | Nov 8 | Nov 8 | Drik Diwali cal. ×2 |
| Margashira Amavasya (Dec) | *(not fetched)* | Dec 7 *(temple)* | temple only |
| Pausha Amavasya (Jan) | *(not fetched)* | *(not fetched)* | gap |
| Magha Amavasya (Feb) | *(not fetched)* | *(not fetched)* | gap |
| Phalguna Amavasya (Mar, ≈Holika-adjacent) | *(not fetched)* | *(not fetched)* | gap |

---

## 3. Reusable rule-family design

Every event above maps to one of these; **no new family is invented per
festival**. Four are already built and shipped; the rest are genuinely new
primitives, but each is shared across multiple festivals, not built once
per name.

| Rule family | Status | Already covers | Would also cover |
|---|---|---|---|
| **tithi at sunrise** | Shipped (`amantaSunriseFestivalDay`, generalised) | Ugadi | Navratri begins, Atla Tadde, Nagula Chavithi, Bali Padyami, Bhaiya Dooj, Ekadashi, Ratha Saptami, Purnima/Amavasya *(once §6.3 resolved)*, Holi |
| **madhyahna-vyapti** | Shipped (`madhyahnaVyaptiFestivalDay`) | Vinayaka Chavithi | Rama Navami *(pending §6.4 rule confirmation)* |
| **nishita-vyapti** | Shipped (`nishitaVyaptiFestivalDay`) | Masa Shivaratri | Annual Maha Shivaratri (masa-filtered), Janmashtami *(pending §6.1)* |
| **moonrise-vyapti** (= chandrodaya-vyapti) | Shipped (`chandrodayaVyaptiFestivalDay`) | Sankashti Chaturthi | No other row in this catalogue needs it — kept distinct rather than merged into "tithi at sunrise" because its kshaya mechanics are genuinely different (§6 of the prior revision) |
| **aparahna-vyapti** *(new)* | Not built | — | Durga Ashtami, Maha Navami, Vijayadashami — a third daytime window (afternoon), same *shape* of work as madhyahna-vyapti but centred later in the day |
| **pradosha-vyapti** *(new)* | Not built | — | Dhanteras, Diwali, Pradosham (twice monthly) — one evening-window primitive covers all three |
| **lunar month + weekday** *(new)* | Not built | — | Kartika Somavaram (every Monday within a known Amanta month boundary) — this is a calendar computation, not a Panchanga vyapti check, the simplest new family to add |
| **solar ingress / Sankranti** *(new)* | Not built | — | Dhanu Sankranti, Makara Sankranti — a single astronomical instant, not a tithi window; the civil-day attribution convention itself needs sourcing (§6.9) before this is trustworthy |
| **nakshatra combination** *(new)* | Not built | — | Krishna Janmashtami specifically needs Ashtami tithi **and** Rohini nakshatra together for its traditional (non-ISKCON) definition — a genuinely different check shape from any other row here |
| **multi-day festival sequence** *(new, a wrapper, not a date-selection method)* | Not built | — | The 5-day Diwali cluster, the Bhogi/Sankranti/Kanuma 3-day cluster, Vinayaka Chavithi→Ganesh Nimajjana (§6.6) — this is a presentation/grouping concern layered on top of the underlying per-day rules above, not a new tithi computation |

---

## 4. Festivals found in source calendars but excluded, with reasons

(Required: nothing silently omitted.)

- **Holika Dahan / Holi** — found in both Drik location calendars for
  every year checked (Mar 21/22, 2027). **Explicitly tagged North Indian**
  in this catalogue (§1.1, §2A) rather than silently included as
  "pan-Hindu": it is genuinely and widely observed by the NRI audience
  this app serves (many Telugu families in the US celebrate it socially,
  even where it is not a core Telugu-tradition observance the way Ugadi
  or Sankranti are), so it is **not excluded outright** — kept as
  Calendar-only (not a Home-P0/P1 candidate) precisely because its
  cultural weight for a *Telugu* family specifically is lower than for
  the catalogue's other major entries, a judgement call flagged here for
  explicit sign-off rather than made silently.
- **Karwa Chouth** — found in the temple's own October 2026 calendar
  (Oct 28) but **not** in either Drik Telugu-calendar fetch. A North
  Indian, largely married-women's observance with no Telugu tradition
  equivalent; excluded from this catalogue entirely (not even
  Calendar-only) as out of scope for "Telugu/South Indian and widely
  observed Hindu festivals."
- **Gujarati New Year, Chopda Puja, Vishu, Thai Poosam, Panguni Uthiram**
  and other regional new-year/Tamil-specific observances seen in the
  temple's broader calendar (it serves a mixed North/South/Tamil
  devotee community) — excluded as out of scope for a Telugu-family
  catalogue; noted here so the exclusion is a decision, not an oversight.
- **Mesha Sankranti and the other 10 minor solar Sankrantis** (Sun
  entering each of the remaining zodiac signs through the year) — real,
  and the temple's own December page lists solar-month boundaries in its
  footer ("Ayana / Ritu / SM / CM Paksha"), but none carries the cultural
  weight of Makara Sankranti specifically; excluded from the Home/Calendar
  festival catalogue, though the underlying solar-ingress rule family
  (§3) would compute them for free once built for Makara Sankranti.
- **Skanda Shashti, Vara Mahalakshmi Vratam, Raksha Bandhan, Varalakshmi
  Vratam** and similar named vratas seen in the temple's calendar in
  months just before this window (August) or requiring their own
  dedicated deity-specific rule research — real and Telugu-relevant, but
  outside the 17 Sep 2026 - 7 Apr 2027 window this task scoped; not
  researched this pass, not silently forgotten — recommended as the next
  research pass after this window's rules ship.
- **CORRECTION (2026-09-18): Subramanya Shashti does NOT belong in this
  "outside window" list** — it was wrongly grouped here originally.
  Karya Siddhi Hanuman Temple's own December 2026 calendar page
  explicitly lists "Subramanya Shashti (Main) — December 14, 2026", a
  real date squarely inside the 17 Sep 2026 - 7 Apr 2027 window. It
  remains unimplemented (see `lib/panchanga/festival-rules.ts`'s
  `subramanya-shashti` deferred entry — the temple page is one Frisco-
  area temple's own program date, not an independently sourced
  general-location Drik Panchang convention), but the reason is "not yet
  independently verified," not "outside the delivery window."

---

## 5. Confirmed cross-location divergences worth flagging early

Beyond the already-known tithi-boundary shifts, this revision found a
**structurally different** kind of divergence: solar-ingress events (Sankranti)
shift by a full civil day between Hyderabad and Frisco, not just by a few
hours near a boundary:

- **Dhanu Sankranti 2026:** Hyderabad Dec 16 (10:29 AM IST), Frisco **Dec
  15** (10:59 PM CST) — the same physical instant, different civil dates,
  because the ~11.5h offset plus a late-evening US-side moment pushes it
  across midnight.
- **Makara Sankranti 2027:** Hyderabad's own dedicated page states the
  transit moment is Jan 14, 9:14 PM IST, but explicitly lists the
  **observance day** as Jan 15 — a real, sourced convention that a solar
  ingress late in the day is observed the *next* civil day, not the day
  of the instant itself. Frisco: transit Jan 14, 9:44 AM CST, observance
  day Jan 14 (no shift). This "observance day ≠ instant's own civil day"
  rule is a genuinely new wrinkle no shipped rule has needed before, and
  needs its own dedicated sourcing before implementation (§6.9).

---

## 6. Unresolved religious-convention decisions

Carried forward explicitly, not silently resolved:

1. **Janmashtami's Smarta/ISKCON split** — real for Frisco (Sep 3 / Sep
   4), not independently confirmed for Hyderabad (single "Sep 4" entry
   returned). Needs a dedicated Drik fetch for Hyderabad, then a
   **product** decision on which convention (or both) Home shows.
2. **The Naraka Chaturdashi Hyderabad-date discrepancy** between an
   AI-summarized search (Nov 7) and a verbatim-quote page fetch (Nov 8,
   coinciding with Diwali) — resolved here in favour of the verbatim
   fetch, not independently triple-checked against a begin/end-time fetch
   the way shipped rules were.
3. **Vaikuntha Ekadashi vs. Mokshada Ekadashi naming/date split at
   Frisco** — Drik's general list calls Dec 19 "Mokshada Ekadashi" (with
   "Gauna"/"Vaishnava" variants on Dec 20); the temple's own Frisco
   calendar labels **Dec 20** specifically "Vaikunta Ekadashi." Likely the
   same Smarta/Vaishnava convention split as item 1, not a different
   festival — not confirmed.
4. **Durga Ashtami / Maha Navami / Vijayadashami's exact muhurta
   convention** — proposed here as a new `aparahna-vyapti` family by
   analogy with Vinayaka Chavithi's madhyahna rule, but not sourced to
   that depth (no dedicated fixture set against Drik's own festival pages
   the way madhyahna-vyapti got across four years).
5. **The general Purnima/Amavasya civil-day-selection rule is genuinely
   unresolved, not merely unimplemented** — Satyanarayana Vrata's
   near-identical rule was built, tested against a full year of real
   dates, and found wrong on the majority of them earlier this session.
   Every Home-facing Purnima row (Kartika Purnima, Ksheerabdi Dwadashi's
   own month) is blocked on this being solved for real, with the same
   rigor as Sankashti Chaturthi's kshaya fallback.
6. **Whether Vinayaka Chavithi through Ganesh Nimajjana should become one
   multi-day "festival window" rule** rather than two independent
   single-day rules — both Drik and the temple treat it as one ~11-day
   observance; this app currently models only day one. Flagged for a
   product conversation, not decided here.
7. **Ksheerabdi Dwadashi's Hyderabad-specific date** (~Nov 21) corroborated
   by a general web source and the temple's *Frisco* calendar only, not an
   independent Hyderabad-scoped Drik fetch.
8. **Dhanurmasam's own start is not shown in the temple's calendar** even
   on its Dec 16 cell (checked directly) — either the temple doesn't treat
   the boundary itself as a "celebration day" worth a header label (most
   likely, since Dhanurmasam is a month-long observance period, not a
   single-day festival), or it uses a different start convention. Not
   resolved; the Drik-sourced Dec 15/16 date is used as the working value.
9. **Bhogi and Kanuma's Frisco dates are derived, not independently
   fetched** — computed as "the day before/after Frisco's own confirmed
   Makara Sankranti day" by analogy with Hyderabad's own confirmed
   Bhogi/Sankranti/Kanuma sequence, never fetched from a Frisco-specific
   Bhogi or Kanuma page. The **civil-day-attribution convention for a
   solar ingress itself** (§5) is a prerequisite question for all three
   Sankranti-cluster rows, not just Sankranti.
10. **Pradosha-kala's exact window definition** (start/end relative to
    sunset) is not sourced at all yet — needed for Dhanteras, Diwali, and
    Pradosham alike (three catalogue rows depend on one unresolved
    window definition).
11. **The Frisco Pradosham fetch's internal inconsistency** (two "Shukra
    Pradosh Vrat" entries 2 weeks apart in March 2027, §2B) — recorded as
    fetched, needs re-verification before any Pradosham rule ships.
12. **Holi's tag as "North Indian, not core Telugu tradition"** (§4) is
    this report's own judgement call, not sourced from Drik or the
    temple — flagged explicitly for product sign-off, since it directly
    determines whether Holi is even Calendar-eligible in V1.

---

## 7. Expected Calendar and Home behavior

**Calendar:** every row in §1/§2 with a resolved rule (i.e., not blocked
by an item in §6) appears on its correct civil day for the viewed
location, exactly like the four shipped rules do today — full month view,
`festivalRuleOccurrencesInRange` enumerating every occurrence, not just the
first. Rows blocked by an unresolved §6 item do not appear at all until
resolved (matching the existing "deferred, never guessed" pattern already
used for Sankashti before it shipped, and for the reverted Satyanarayana
Vrata attempt).

**Home** (rules unchanged from revision 1, restated as the binding spec):

- **Maximum three rows**, down from the current five
  (`UPCOMING_FESTIVALS_LIMIT`).
- **Exactly one "next major festival" within a 60-day horizon**, drawn
  only from Home-P0-tagged rows (§1) — Ugadi, Vinayaka Chavithi, Diwali,
  Dussehra, Navratri-begins, Makara Sankranti, Vaikuntha Ekadashi, and the
  annual Maha Shivaratri are the Home-P0 set this revision proposes; every
  other row (including Sankashti Chaturthi and Masa Shivaratri, which
  currently monopolise this slot) is explicitly excluded from it.
- **Up to two nearest observances within a 30-day horizon**, filling the
  remaining rows — Home-P1 rows (recurring vratas, Ekadashi, Pradosham,
  Durga Ashtami, etc.) are eligible only here, and only within 30 days,
  so a recurring rule six weeks out can never occupy a row a nearer major
  festival should have.
- **Never repeat the same festival rule on Home** — each rule contributes
  at most one row, even if (like Sankashti Chaturthi) its next two
  occurrences would otherwise both qualify.
- **"View full festival calendar"** — a link from Home's card into
  Calendar, for the complete month rather than the bounded 3-row summary.
- **Festival visibility is independent of whether a puja service exists**
  — already true today (`pujaSlug: string | null`) and unchanged for
  every addition in this catalogue.

This is a real, scoped change to `panchangaForLocation`'s selection logic
(the P0/P1 split, the two horizons, one-row-per-rule), not just a rule
count increase — to be scoped and approved as its own implementation task
before any code is written, exactly as revision 1 already flagged.

---

## 8. Exact implementation batches (by rule family, not by festival)

Ordered by how much of the mechanism already exists, cheapest first. Each
batch ships **one rule family**, validated once, covering every festival
row that depends on it — never a dedicated engine function per festival
name.

**Batch 1 — `tithi-at-sunrise`, generalised.** Currently hard-coded to
Ugadi's specific masa/tithi inside `amantaSunriseFestivalDay`. Generalise
to accept any target masa+paksha+tithi (or no masa filter, for a
recurring rule), the same way `nishitaVyaptiFestivalDay` and
`chandrodayaVyaptiFestivalDay` already take a rule parameter. Unlocks:
Navratri begins, Atla Tadde, Nagula Chavithi, Bali Padyami, Bhaiya Dooj,
Ratha Saptami — six single-day rows from one generalisation, each needing
only its own fixture validation (Ugadi's own kshaya-fallback logic is
inherited for free, and re-tested per new target tithi since a kshaya case
is tithi-specific, not universal).

**Batch 2 — Ekadashi and the Smarta/Vaishnava decision.** Reuses Batch 1's
generalised primitive directly (Ekadashi is a plain sunrise-tithi rule).
The engineering is nearly free once Batch 1 exists; the real work is the
**product decision** in §6.1/§6.3 (which convention to show), which gates
this batch's start, not its engine work.

**Batch 3 — `aparahna-vyapti` (new window primitive).** A third daytime
window alongside the shipped madhyahna-vyapti, structurally identical in
shape (bisect a window, check tithi presence) but centred in the
afternoon rather than midday. Needs its own sourced window definition
first (§6.4) — do not start engine work before that. Unlocks: Durga
Ashtami, Maha Navami, Vijayadashami as one batch.

**Batch 4 — `pradosha-vyapti` (new window primitive).** An evening/dusk
window. Needs its own sourced window definition first (§6.10). Unlocks:
Dhanteras, Diwali, Pradosham as one batch — the single highest-value batch
in this plan (Diwali alone), sharing its window mechanism with two other
catalogue rows.

**Batch 5 — Purnima/Amavasya rule, resolved.** Not an implementation batch
until the underlying convention question (§6.5) is actually answered —
this is R&D, not engineering, and should be treated as its own
spike/investigation task before any code is written, learning directly
from Satyanarayana Vrata's failed hypothesis (tested against a full year
of real dates before being trusted, not 1-2 spot checks). Once resolved,
unlocks: Kartika Purnima, general Purnima, general Amavasya (Calendar-only
per §2B) as one batch, at near-zero additional engineering cost.

**Batch 6 — `solar-ingress` / Sankranti (new mechanism family).**
Structurally unlike every other rule in this app (a single astronomical
instant, not a tithi window) — needs its own civil-day-attribution
convention sourced first (§5, §6.9), including the "late-instant rolls to
next day" wrinkle found at Hyderabad's Makara Sankranti. Unlocks: Dhanu
Sankranti (context only), Makara Sankranti, and — once the
attribution rule is trusted — Bhogi/Kanuma as a derived ±1-day pair
(needing no separate fetch or rule of their own, matching how they were
derived, not independently sourced, in this report).

**Batch 7 — `nakshatra combination` (new mechanism).** Needed only for
Janmashtami's non-ISKCON definition (Ashtami + Rohini together). Small in
isolation; gated on the same Smarta/Vaishnava product decision as Batch 2.

**Batch 8 — `lunar-month + weekday` (new, simplest mechanism).** Kartika
Somavaram: every Monday within an already-computable Amanta month
boundary. No new Panchanga primitive, just a calendar filter over an
existing month-boundary function. Lowest engineering risk in this entire
plan; sequenced last only because it is Calendar-only (no Home priority)
and Telugu-Kartika-specific, not because it is hard.

**Batch 9 — multi-day festival sequence (presentation layer).** Wraps
Batches 1-8's per-day results into named clusters (the 5-day Diwali
sequence, the 3-day Bhogi/Sankranti/Kanuma sequence, and — pending §6.6 —
Vinayaka Chavithi through Ganesh Nimajjana). A UI/data-shape concern, not
a new date-selection mechanism; sequenced last because every underlying
per-day rule it groups must already exist.

**Annual Maha Shivaratri and Holi** need no new batch: the former is
Batch nothing-new (a masa filter on the already-shipped nishita-vyapti
mechanism plus a Home-P0 override for that occurrence); the latter reuses
Batch 1 (`tithi-at-sunrise`) for Holi itself and Batch 4
(`pradosha-vyapti`) for Holika Dahan, contingent on the tag decision in
§6.12.

---

## 9. Validation fixture plan

Mirrors exactly the discipline already proven on the four shipped rules
(Ugadi: 2 years × 2 locations, including a kshaya fallback case; Masa
Shivaratri: cross-location divergence case; Sankashti Chaturthi: 39 real
dates across 3 locations, including a wholly-contained-in-one-day case)
— **never fewer than a full year, per location, before a rule is trusted**,
learning directly from Satyanarayana Vrata's failure (a hypothesis that
matched 2 spot-checks and failed the majority of a full year's real
dates).

For each batch in §8, before shipping:

1. **Fetch the rule's exact convention statement** from Drik Panchang's
   own explanatory text (not just its date list) — the same step that
   caught the Naraka Chaturdashi discrepancy and the Vaikuntha/Mokshada
   naming question in this report.
2. **Fetch every occurrence for a full year, at minimum Hyderabad and
   Frisco** (a third location — e.g. Sydney, already used for Sankashti's
   Southern-Hemisphere/wholly-contained-day case — recommended for any
   family involving a new window type, since Sankashti's own
   wholly-contained-day bug was found only by testing a third,
   geographically distinct location).
3. **Write the engine function against that fixture set**, including an
   explicit echo-guard and kshaya-fallback investigation for every window-
   based family (aparahna-vyapti, pradosha-vyapti) — do not assume a
   window-based rule is echo/kshaya-free just because it is structurally
   similar to madhyahna-vyapti; each of the three already-shipped window
   rules needed its own fallback discovered from real data, not inferred
   from the others.
4. **Cross-check against the temple calendar** for every occurrence where
   it is available, treating any disagreement as a §6-class unresolved
   item, never silently resolved by picking one source.
5. **Regression tests**: before/on/after the occurrence, a range starting
   on any echo-risk day, a month-boundary case, and — for solar-ingress
   rules specifically — an explicit test of the "late-instant rolls to the
   next civil day" attribution rule found in §5, since no other rule
   family in this app has that behaviour.
6. **Bump `CALENDAR_ENGINE_VERSION`** for every batch that changes
   `computeCalendarMonth`'s output shape or values, learning directly from
   the cal-6→cal-7 gap found and fixed in `73d4a19` (Sankashti's own
   addition shipped without a version bump, silently serving stale
   cached months until that was caught and fixed three commits later).

No batch in §8 should be considered "shipped" until it has passed this
same six-step bar — matching this app's own precedent, not a new standard
invented for this report.

---

## Sources

- Drik Panchang, Telugu festival calendars: [Hyderabad 2026](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843), [Frisco 2026](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=4692559), [Hyderabad 2027](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=4692559&year=2027)
- Drik Panchang, Diwali Puja Calendar: [Hyderabad 2026](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=1269843), [Frisco 2026](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=4692559), [Hyderabad 2027](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=4692559&year=2027)
- Drik Panchang, Kartik Purnima: [Hyderabad 2026](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=1269843&year=2026), [Frisco 2026](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=4692559&year=2026), [Hyderabad 2027](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=4692559&year=2027)
- Drik Panchang, Dhanu Sankranti: [Hyderabad 2026](https://www.drikpanchang.com/sankranti/dhanu-sankranti-date-time.html?geoname-id=1269843&year=2026), [Frisco 2026](https://www.drikpanchang.com/sankranti/dhanu-sankranti-date-time.html?geoname-id=4692559&year=2026)
- Drik Panchang, Makar Sankranti: [Hyderabad 2027](https://www.drikpanchang.com/sankranti/makar-sankranti-date-time.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/sankranti/makar-sankranti-date-time.html?geoname-id=4692559&year=2027)
- Drik Panchang, Ratha Saptami: [Hyderabad 2027](https://www.drikpanchang.com/festivals/ratha-saptami/ratha-saptami-date-time.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/festivals/ratha-saptami/ratha-saptami-date-time.html?geoname-id=4692559&year=2027)
- Karya Siddhi Hanuman Temple, 2026 calendar (Frisco, TX): [PDF](https://assets.dallashanuman.net/images/event/2026/2026_calendar.pdf) — September, October, November, December pages read directly
- General (non-location-scoped) corroboration only, never treated as
  authoritative alone: [Vaikuntha Ekadashi 2026](https://www.drikpanchang.com/ekadashis/vaikuntha/vaikuntha-ekadashi-date-time.html?geoname-id=1277333), [Dhanurmasam dates](https://hindupad.com/dhanurmasam-dhanumasm/), [Bhogi 2027](https://hindusphere.com/bhogi-2027-date/), [Tulsi Vivah 2026](https://www.smartpuja.com/blog/tulsi-vivah-2026-date-muhurat-puja-vidhi/)
- This app's own shipped rules, for method precedent: `lib/panchanga/engine.ts`
  (`amantaSunriseFestivalDay`, `nishitaVyaptiFestivalDay`,
  `chandrodayaVyaptiFestivalDay`, `madhyahnaVyaptiFestivalDay`),
  `lib/panchanga/festival-rules.ts`, `73d4a19` (the cal-6→cal-7 cache-version
  lesson), `1c8c10c`'s reverted Satyanarayana Vrata attempt (the
  Purnima-rule lesson)
