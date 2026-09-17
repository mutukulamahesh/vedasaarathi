# Festival Calendar V1 — Specification (research/planning only, no code changed)

**Date:** 17 September 2026
**Branch:** `dev-foundation` (from `73d4a19`)
**Scope:** research and specification only. No application code touched, no
tests added, nothing built, nothing deployed. This report is the only
artifact of this task.
**Audience:** Telugu-family / NRI users, primarily Hyderabad and the US
(Frisco used throughout this session as the representative US location).

---

## 1. Why Home is currently dominated by Sankashti Chaturthi and Masa Shivaratri

This is a direct, mechanical consequence of the current rule count and the
merge logic in `lib/panchanga/index.ts`, not a bug:

```
const UPCOMING_FESTIVALS_LIMIT = 5;
const UPCOMING_FESTIVALS_HORIZON_DAYS = 120;
```

`panchangaForLocation` scans **every** active rule with
`festivalRuleOccurrencesInRange` over a 120-day window, merges all rules'
occurrences into one list, sorts by date, and keeps the soonest 5
(`lib/panchanga/index.ts:330-356`). There are exactly **four** active rules
today (`lib/panchanga/festival-rules.ts`):

| Rule | Recurrence | Occurrences in any 120-day window |
|---|---|---|
| Vinayaka Chavithi | once a year | 0 or 1 |
| Ugadi | once a year | 0 or 1 |
| Masa Shivaratri | ~monthly (lunar month ≈29.5 days) | ~4 |
| Sankashti Chaturthi | ~monthly | ~4 |

Two annual rules contribute at most one occurrence each to any 120-day
window; two monthly rules contribute roughly four each. Merging and sorting
by date, the top-5 slice is arithmetically dominated by the two monthly
rules unless an annual occurrence happens to fall inside the same window —
which is why, from most days of the year, Home's card alternates Sankashti
Chaturthi and Masa Shivaratri almost exclusively. This is exactly what was
seen live during the previous task's browser verification (`73d4a19`'s own
report): from 17 Jan 2026, the five cards were Sankashti Feb 5, Masa
Shivaratri Feb 15, Sankashti Mar 6, Masa Shivaratri Mar 17, Ugadi Mar 19 —
four of five slots taken by the two monthly rules.

Adding more **annual/seasonal** rules (Category 1 below) directly fixes
this by giving the merge more non-monthly candidates to surface. Adding
more **recurring** rules (Category 2) without also bounding Home's
selection logic would make it *worse* — Ekadashi alone is ~24-26
occurrences a year, more than twice Sankashti's frequency. This is why the
Home presentation spec in §7 caps monthly-recurring representation
explicitly, not just relies on the existing top-5-by-date merge.

---

## 2. Method: what was independently checked

Every date below was fetched directly from Drik Panchang (`drikpanchang.com`,
the same source this app already cites for its four shipped rules) for
Hyderabad (`geoname-id=1269843`) and Frisco (`geoname-id=4692559`)
specifically — never a generic India-wide list. Where a page's own AI-summarized
result looked ambiguous, it was re-fetched with a request for a **verbatim
quote** of the table (this caught one real discrepancy — see the Diwali
cluster note in §4). Karya Siddhi Hanuman Temple's own 2026 calendar
(`assets.dallashanuman.net`, a temple minutes from Frisco, already used for
this session's Sankashti validation) was read directly from its PDF pages,
not a summary, for September–November 2026 specifically — the three months
requested.

**What this is not:** an independent astronomical derivation. Every rule
below states the *convention* Drik Panchang and the temple publish; none has
been re-derived from first principles the way this app's four shipped rules
were (each of those took a dedicated engine function, an echo guard, a
kshaya fallback, and 26-39 real dates checked one at a time — see
`lib/panchanga/engine.ts`). That remains the bar for actually shipping a
rule; this report identifies *which* rules are worth that investment and
in what order, not a finished implementation.

---

## 3. Catalogue matrix

Legend: **P0** = default Home candidate (major, unambiguous, single-day);
**P1** = Calendar-list, not Home by default; **P2** = Calendar-only /
deferred; **Loc?** = location-sensitive (a different civil day is possible
between Hyderabad and a US location for the same rule).

### 3.1 Major festivals

| # | English | Telugu | Priority | Rule family (proposed) | Loc? |
|---|---|---|---|---|---|
| 1 | Navratri (Sharad) begins | శరన్నవరాత్రులు ప్రారంభం | P1 | Amanta Ashwin Shukla Pratipada, sunrise | Y |
| 2 | Durga Ashtami | దుర్గాష్టమి | P1 | Ashtami tithi during Navratri (muhurta TBD) | Y (unconfirmed) |
| 3 | Maha Navami | మహర్నవమి | P1 | Navami tithi during Navratri (muhurta TBD) | Y (unconfirmed) |
| 4 | Vijayadashami / Dussehra | విజయదశమి | **P0** | Dashami tithi, likely sunrise or Aparahna-vyapti | Y |
| 5 | Dhanteras | ధన త్రయోదశి | P1 | Trayodashi tithi, Pradosha-kala | Y |
| 6 | Naraka Chaturdashi | నరక చతుర్దశి | P1 | Krishna Chaturdashi, pre-dawn (Abhyanga) | Y (confirmed, see §4) |
| 7 | Diwali / Lakshmi Puja | దీపావళి | **P0** | Amavasya tithi, Pradosha-kala | Y (confirmed, see §4) |
| 8 | Bali Padyami / Govardhan Puja | బలి పాడ్యమి | P2 | Shukla Pratipada, morning | Y |
| 9 | Bhaiya Dooj / Yama Dwitiya | యమ ద్వితీయ | P2 | Shukla Dwitiya | Y |
| 10 | Ugadi | ఉగాది | **P0 (shipped)** | Amanta Chaitra Shukla Pratipada, sunrise | Y (shipped, validated) |
| 11 | Vinayaka Chavithi | వినాయక చవితి | **P0 (shipped)** | Bhadrapada Shukla Chaturthi, madhyahna | Y (shipped, validated) |
| 12 | Rama Navami | శ్రీరామ నవమి | P1 | Chaitra Shukla Navami, madhyahna (per legend, noon) | Y (unconfirmed) |
| 13 | Maha Shivaratri (the annual one) | మహా శివరాత్రి | P1 | Magha Krishna Chaturdashi, nishita (same rule family as shipped Masa Shivaratri, month-filtered) | Y (shipped mechanism) |
| 14 | Krishna Janmashtami | శ్రీకృష్ణ జన్మాష్టమి | P1 | Krishna Ashtami + Rohini, nishita — **has a real Smarta/ISKCON split**, see §4 | Y (unconfirmed + convention choice) |

### 3.2 Recurring observances

| # | English | Telugu | Priority | Rule family | Loc? |
|---|---|---|---|---|---|
| 15 | Ekadashi | ఏకాదశి | P2 | Ekadashi tithi, sunrise or Vaishnava/Smarta variant | Y + convention choice |
| 16 | Pradosham | ప్రదోష వ్రతం | P2 | Trayodashi tithi, Pradosha-kala (dusk) | Y (new window type) |
| 17 | Sankashti Chaturthi | సంకష్టి చతుర్థి | **P0 (shipped)** | Krishna Chaturthi, chandrodaya | Y (shipped, 39 dates validated) |
| 18 | Masa Shivaratri | మాస శివరాత్రి | **P0 (shipped)** | Krishna Chaturdashi, nishita | Y (shipped, validated) |
| 19 | Purnima | పౌర్ణమి | P2 | Purnima tithi — **the exact selection convention already failed once** (see §9, Satyanarayana Vrata) | Y (rule genuinely unresolved) |
| 20 | Amavasya | అమావాస్య | P2 | Amavasya tithi, sunrise (mirrors Purnima's open question) | Y (unconfirmed) |

### 3.3 Telugu / Kartika observances

| # | English | Telugu | Priority | Rule family | Loc? |
|---|---|---|---|---|---|
| 21 | Kartika Masam begins/ends | కార్తీక మాసం ప్రారంభం/ముగింపు | P1 (context, not a Home row) | Amanta Kartika month boundary (Amavasya to Amavasya) | Y |
| 22 | Nagula Chavithi | నాగుల చవితి | P1 | Kartika Shukla Chaturthi, sunrise | Y (confirmed, see §4/§5) |
| 23 | Kartika Somavaram (each Monday in Kartika) | కార్తీక సోమవారం | P2 | Every Monday within the Amanta Kartika month — a weekday filter, not a tithi rule | Y (month boundary only) |
| 24 | Ksheerabdi Dwadashi / Tulasi Vivah | క్షీరాబ్ధి ద్వాదశి | P1 | Kartika Shukla Dwadashi | Y (unconfirmed) |
| 25 | Kartika Purnima | కార్తీక పౌర్ణమి | P1 | Purnima tithi in Kartika — same open convention question as #19 | Y (confirmed same-day 2026, rule itself unresolved) |

### 3.4 Per-entry dates, Hyderabad and Frisco, 2026 and 2027

Every date below is as fetched (§2); a blank cell means that specific
location/year combination was not independently fetched, not that no date
exists — never filled by inference or by copying the other location's
value. Rows 15-21 and 23 have no single "the date" (recurring or a month
boundary, not a one-off) and are intentionally left as prose rather than a
guessed illustrative date.

| # | Festival | Hyd 2026 | Frisco 2026 | Hyd 2027 | Frisco 2027 |
|---|---|---|---|---|---|
| 1 | Navratri begins | Oct 11 | Oct 11 | Sep 30 | Sep 30 |
| 2 | Durga Ashtami | Oct 19 | Oct 18 | Oct 7 | Oct 7 |
| 3 | Maha Navami | Oct 19 | Oct 19 | Oct 8 | Oct 8 |
| 4 | Vijayadashami / Dussehra | Oct 20 | Oct 20 | Oct 9 | Oct 9 |
| 5 | Dhanteras | Nov 6 | Nov 6 | Oct 27 | Oct 26 |
| 6 | Naraka Chaturdashi | Nov 8 *(coincides with Diwali)* | Nov 7 | Oct 28 | Oct 28 *(coincides with Diwali)* |
| 7 | Diwali / Lakshmi Puja | Nov 8 | Nov 8 | Oct 29 | Oct 28 |
| 8 | Bali Padyami / Govardhan Puja | Nov 10 | Nov 9 | Oct 30 | Oct 29 |
| 9 | Bhaiya Dooj | Nov 11 | Nov 10 | Oct 31 | Oct 30 |
| 10 | Ugadi (shipped) | Mar 19 | Mar 19 | Apr 7 | Apr 7 |
| 11 | Vinayaka Chavithi (shipped) | Sep 14 | Sep 14 | Sep 4 | Sep 3 |
| 12 | Rama Navami | "26th-27th" *(span, unresolved — see §9)* | Mar 26 | Apr 15 | Apr 14 |
| 13 | Maha Shivaratri (annual) | Feb 15 | Feb 15 | Mar 6 | Mar 6 |
| 14 | Krishna Janmashtami | Sep 4 *(single entry — see §4 caveat)* | Sep 3 (Smarta) / Sep 4 (ISKCON) | Aug 25 | Aug 25 |
| 17 | Sankashti Chaturthi (shipped) | *recurring, ~12-13/yr — see `lib/panchanga/festival-rules.ts`, 39 dates already validated* | | | |
| 18 | Masa Shivaratri (shipped) | *recurring, ~12-13/yr — same file, already validated* | | | |
| 22 | Nagula Chavithi | Nov 13 | Nov 12 | Nov 2 | Nov 1 |
| 24 | Ksheerabdi Dwadashi / Tulasi Vivah | ~Nov 21 *(not independently fetched for Hyderabad — see §9)* | Nov 21 | | |
| 25 | Kartika Purnima | Nov 24 | Nov 24 | Nov 14 | Nov 13 |

---

## 4. September–October–November 2026, explicitly compared

This is the exact three-month window the current 4-rule catalogue covers
weakly (only Vinayaka Chavithi in September; nothing at all in October or
November beyond whichever Masa Shivaratri/Sankashti Chaturthi occurrences
land there). Real dates, fetched directly, per location:

| Festival | Hyderabad 2026 | Frisco 2026 | Same day? |
|---|---|---|---|
| Krishna Janmashtami (Smarta) | Sep 4 *(single date shown — see caveat below)* | Sep 3 | **Unclear — see caveat** |
| Krishna Janmashtami (ISKCON) | *(not separately shown)* | Sep 4 | **Unclear — see caveat** |
| Vinayaka Chavithi (shipped) | Sep 14 | Sep 14 | Yes |
| Ganesh Visarjan (Anant Chaturdashi) | Sep 25 | Sep 25 | Yes |
| Navratri begins | Oct 11 | Oct 11 | Yes |
| Durga Ashtami | Oct 19 | Oct 18 | **No — 1 day earlier at Frisco** |
| Maha Navami | Oct 19 *(same civil day as Ashtami at Hyderabad)* | Oct 19 | No (see note) |
| Vijayadashami / Dussehra | Oct 20 | Oct 20 | Yes |
| Atla Tadde | Oct 28 | Oct 28 | Yes |
| Dhanteras | Nov 6 | Nov 6 | Yes |
| Naraka Chaturdashi | **Nov 8 — coincides with Diwali itself that year** | Nov 7 | **No — see caveat below** |
| Diwali / Lakshmi Puja | Nov 8 | Nov 8 | Yes |
| Govardhan Puja / Bali Pratipada | Nov 10 | Nov 9 | **No — 1 day earlier at Frisco** |
| Bhaiya Dooj | Nov 11 | Nov 10 | **No — 1 day earlier at Frisco** |
| Nagula Chavithi | Nov 13 | Nov 12 | **No — 1 day earlier at Frisco** |
| Ksheerabdi Dwadashi / Tulasi Vivah | Nov 21 *(not independently re-fetched for Hyderabad — see §9)* | Nov 21 | Presumed yes, not confirmed |
| Kartika Purnima | Nov 24 | Nov 24 | Yes (independently fetched both) |

**Caveats found while gathering this table (worth flagging, not silently
smoothing over):**

- **Janmashtami's Smarta/ISKCON split** is explicit in Drik's own Frisco
  page ("Janmashtami *Smarta (Sep 3)" / "Janmashtami *ISKCON (Sep 4)") but
  the Hyderabad fetch returned only one entry ("Krishna Janmashtami (4th)").
  This may be a genuine convention difference (Hyderabad's own Smarta date
  could itself be the 4th that year) or an artifact of how the page renders
  for an India-based location where the split is less commonly surfaced. **Not
  resolved — needs a dedicated fetch of Drik's Janmashtami-specific page for
  Hyderabad**, the same way Ugadi's kshaya case needed its own dedicated
  verification before being trusted.
- **Naraka Chaturdashi's Hyderabad date required two fetches to pin down.**
  An initial AI-summarized web search claimed Nov 7 for Hyderabad; a direct,
  verbatim-quote fetch of Drik's own dedicated Diwali-calendar page instead
  showed "Narak Chaturdashi" labelled on **Nov 8**, the same civil day as
  Lakshmi Puja/Diwali itself that year (a real tithi coincidence, not an
  error — Chaturdashi and Amavasya can share a civil day the same way
  Durga Ashtami and Maha Navami do at Hyderabad this same October). This
  discrepancy is recorded here deliberately: it is exactly the kind of
  AI-summary drift this project's sourcing discipline is built to catch,
  and it argues for verbatim-quote fetches (or, eventually, a real
  begin/end-time fetch matching this app's own established rigor) before
  any of these rules are implemented, not just at spec time.
- **Kshirabdi Dwadashi's Hyderabad-specific date** was taken from a
  general (non-location-scoped) web summary plus the temple's own Frisco
  calendar (both said Nov 21); Hyderabad was never independently fetched
  from Drik's own dedicated page the way Kartika Purnima was. Flagged in
  §9, not assumed.

**Karya Siddhi Hanuman Temple's own September–November 2026 calendar**
(read directly from the temple's PDF, Frisco) **independently corroborates**
Janmashtami (Sep 3, "Krishna Janmashtami Bhajans & Midnight Puja"), Ganesh
Chaturthi (Sep 14), Ganesh Visarjan (Sep 25), Navratri Begins (Oct 11),
Durga Ashtami (Oct 18, "Kumari/Kanjak Puja, Devi: Chandi, Durgashtami"),
Maha Navami (Oct 19), Vijayadashami (Oct 20), Dhanteras (Nov 6), Naraka
Chaturdashi (Nov 7, "Kali Chaudas, Hanuman Puja"), Diwali (Nov 8,
"Deepavali, Dhanlakshmi & Chopda Puja"), Govardhan Puja (Nov 9, "Annakut"),
Nagula Chavithi (Nov 12, "Naga Chaturthi/Nagula Chavithi" — exact match to
Drik's Frisco date), and Ksheerabdi Dwadashi (Nov 21, using that **exact**
term). One genuine oddity: the temple's Nov 6 cell is headed "Dhanteras,
**Lakshmi Puja**" even though its own Nov 8 cell separately says
"**Deepavali**, Dhanlakshmi & Chopda Puja" — two different Lakshmi-related
labels six days apart. Not resolved here; flagged in §9 as a
priest-review question, not silently merged into one date.

**Festivals currently entirely missing from the app's Calendar in this
three-month window:** every row in the table above except Vinayaka Chavithi
— that is, Janmashtami, Ganesh Visarjan (the app models Vinayaka Chavithi
as a single day, not the multi-day festival the temple and Drik both treat
it as — a real scope question, not addressed by this report), the entire
Navratri sequence (Navratri begins, Durga Ashtami, Maha Navami,
Vijayadashami), Atla Tadde, the entire Diwali cluster (Dhanteras, Naraka
Chaturdashi, Diwali itself, Govardhan Puja, Bhaiya Dooj), Nagula Chavithi,
Ksheerabdi Dwadashi, and Kartika Purnima. For a Telugu-family/NRI audience,
Diwali and Navratri/Dussehra are the largest visible gaps by cultural
weight; Nagula Chavithi and Ksheerabdi Dwadashi are the largest
Telugu-specific gaps.

---

## 5. Recommended bounded Calendar V1 scope

**Not** "every Hindu festival" — a deliberately small, high-confidence set,
chosen by (a) cultural weight for a Telugu-family/NRI audience, (b) whether
its rule family is a close enough relative of an already-shipped,
already-validated method to be tractable, and (c) whether it is a single
unambiguous civil day (a prerequisite for Home; Calendar can tolerate more
ambiguity since it shows a whole month at once, not a 3-5-row summary).

**Recommended V1 additions (9 rules, on top of the 4 already shipped):**

1. **Vijayadashami / Dussehra** — single day, high cultural weight, likely
   tractable (sunrise or Aparahna-vyapti, both existing method shapes).
2. **Diwali / Lakshmi Puja** — single day, the highest-weight festival not
   yet covered at all; Amavasya-tithi + Pradosha-kala is a new window shape
   but analogous in complexity to the already-shipped nishita/madhyahna
   windows.
3. **Durga Ashtami** and **4. Maha Navami** — shipped as a pair (both inside
   the Navratri sequence Calendar would need to show anyway); the exact
   muhurta convention needs the same kind of dedicated verification Vinayaka
   Chavithi's madhyahna rule got.
5. **Navratri begins** — cheap once Durga Ashtami/Maha Navami's Amanta
   Ashwin-month detection exists; same amanta-sunrise family as Ugadi.
6. **Nagula Chavithi** — single day, Telugu-specific, sunrise-tithi family
   (same shape as Ugadi), well cross-validated (Drik + temple agree
   exactly).
7. **Kartika Purnima** — single day, same-day at both locations in the one
   year checked, BUT gated on resolving the open Purnima-selection-rule
   question first (§9) — do not ship this ahead of that.
8. **Rama Navami** — single day (most years; 2026 Hyderabad showed a
   "26th-27th" span requiring its own boundary investigation, echoing
   Ugadi's own kshaya-fallback story).
9. **Krishna Janmashtami** — high cultural weight, but explicitly gated on
   resolving the Smarta/ISKCON split (§4) before implementation; shipping a
   silently-wrong convention choice for millions of observant families is
   worse than deferring it honestly, matching this project's own precedent
   (Satyanarayana Vrata, §9).

**Deliberately excluded from V1** (Calendar-only later, or deferred
indefinitely), with reasons:

- **Dhanteras, Naraka Chaturdashi, Govardhan Puja, Bhaiya Dooj** — each
  individually lower-weight than Diwali itself for this audience, and each
  needs its own dedicated rule (Trayodashi/Pradosha, pre-dawn Chaturdashi,
  Pratipada, Dwitiya respectively) validated the way Ugadi and Sankashti
  were. Shipping Diwali alone captures most of the value at a fraction of
  the validation cost; the surrounding days are natural Calendar-V2
  candidates once Diwali's own Amavasya+Pradosha window is built and
  trusted.
- **Ekadashi, Pradosham** — 24-26 occurrences/year each. Even Calendar-only,
  this is a materially bigger validation burden (every occurrence, not
  a handful a year) and directly conflicts with "no new architecture" —
  Ekadashi in particular has its own Vaishnava/Smarta split, structurally
  identical to the Janmashtami problem but recurring twice a month instead
  of once a year.
- **Purnima, Amavasya (as general monthly rules)** — deferred because the
  exact civil-day-selection convention is the SAME open question that
  already sank one attempted rule this session (Satyanarayana Vrata, a
  Purnima-tithi rule whose "prevails at sunrise" hypothesis was tested
  against a full year of real dates and failed on the majority of them;
  see `lib/panchanga/festival-rules.ts` git history at `1c8c10c`'s prior
  attempt). Kartika Purnima specifically is a single, high-value date that
  could ship once — and only once — that underlying rule is actually
  solved; a bare "Purnima every month" rule is not recommended at all
  given the demonstrated risk of guessing wrong at scale.
- **Bali Padyami, Kartika Somavaram, Ksheerabdi Dwadashi** — real and
  well-attested, but each is either a secondary day within a cluster
  already covered by a higher-priority sibling (Bali Padyami inside
  Diwali) or a weekday-filter rather than a tithi rule (Kartika Somavaram —
  architecturally different from every rule shipped so far, closer to a
  calendar computation than a Panchanga one). Reasonable Calendar-V2 work,
  not V1.
- **Kartika Masam begin/end** — useful as Calendar context text (similar
  to how Adhika-month or Masa labels already appear), not as a Home
  festival row; no date-selection rule is needed, only correct Amanta
  month-boundary detection, which the engine already has.

---

## 6. Implementation order by rule family

Grouped by how much of the underlying mechanism is already proven, cheapest
and lowest-risk first:

1. **Sunrise-vyapti family (reuses Ugadi's exact mechanism)** —
   Navratri begins, Nagula Chavithi. Ugadi's `amantaSunriseFestivalDay` is
   already built, validated, and has a proven kshaya fallback; these two
   are the closest fit to "change the target masa/tithi, reuse the
   function."
2. **New window shape, but same class of primitive as shipped rules** —
   Vijayadashami/Dussehra (sunrise or Aparahna — needs the exact
   convention sourced first), Durga Ashtami + Maha Navami (a muhurta-window
   rule, same *shape* of work as Vinayaka Chavithi's madhyahna-vyapti, but
   a genuinely new window definition to source and validate).
3. **Diwali (Amavasya + Pradosha-kala)** — the single highest-value
   addition, but a new window type (evening/dusk-anchored, not yet built in
   any form) and the tithi that already broke one implementation attempt
   this session (Satyanarayana Vrata's Purnima hypothesis) sits right next
   to it on the lunar calendar (Amavasya is Purnima's mirror). Do this only
   after the Purnima/Amavasya convention question in §9 is actually
   resolved — treat that resolution as a prerequisite, not a parallel task.
4. **Rama Navami** — same tithi-shape as Vinayaka Chavithi (a Shukla
   Chaturthi/Navami-type single tithi) but the observed Hyderabad
   "26th-27th" 2026 span needs its own kshaya-style investigation before
   trusting a single method.
5. **Krishna Janmashtami** — gate entirely on resolving the Smarta/ISKCON
   convention split first (a product decision, not an engineering one —
   see §9). Do not start engine work until that's answered.
6. **Kartika Purnima** — gate entirely on solving the general Purnima
   rule (which Satyanarayana Vrata's failure already showed is genuinely
   unresolved, not merely unimplemented). Once solved, Kartika Purnima is
   almost free (a masa filter on top of the general rule).
7. **Everything in §5's "excluded" list** — not scheduled; revisit only
   after V1 ships and is stable.

---

## 7. Home presentation specification

(As instructed — restated here as the binding spec for this V1, with the
reasoning tying each rule to the current code.)

- **Maximum three rows on Home**, down from the current five
  (`UPCOMING_FESTIVALS_LIMIT`). Three is enough to show one major festival
  plus two nearby observances without the monthly-recurring rules crowding
  out everything else the way five currently do.
- **Exactly one "next major festival" within a 60-day horizon** — drawn
  only from Category 1 (major festivals), never from Category 2/3
  recurring rules. This directly fixes §1's root cause: the selection for
  this slot must filter to non-recurring (or at most monthly-but-explicitly
  Category-3) rules before sorting, not merge everything and take the
  soonest.
- **Up to two nearest observances within a 30-day horizon**, filling the
  remaining rows — these MAY be Category 2/3 recurring rules (Sankashti
  Chaturthi, Masa Shivaratri, etc.), but only from a shorter 30-day window,
  not the current 120-day one, so a recurring rule's occurrence six weeks
  out doesn't permanently occupy a row a nearer major festival should have.
- **Never repeat the same festival rule on Home** — i.e. Sankashti
  Chaturthi's next TWO occurrences must never both appear as separate rows
  simultaneously (today's actual behaviour: rows 1 and 3, or 2 and 4, are
  frequently the same rule on consecutive months). Each rule contributes at
  most one row.
- **"View full festival calendar"** — a link/button from Home's card
  straight into Calendar, for anyone who wants the full month rather than
  the bounded 3-row summary. Framed as a genuine navigation affordance, not
  a dead end.
- **Festival visibility is independent of whether a puja service exists** —
  already true today (`pujaSlug: string | null` on every rule, Ugadi and
  Masa Shivaratri already ship with `pujaSlug: null` and still display) and
  should remain true for every V1 addition: Diwali, Dussehra, Navratri, etc.
  all display on Calendar/Home whether or not this app ever offers a guided
  puja for them.

This is a genuine, scoped change to `panchangaForLocation`'s selection
logic (not just the rule count) — worth flagging explicitly since "no
architecture changes" governed the last two work batches: this spec
*recommends* a real logic change (three rows, two horizons, one-row-per-rule)
as part of V1, to be scoped and approved as its own task before any code is
written.

---

## 8. Sources

- Drik Panchang, Telugu festival calendars: [Hyderabad](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843), [Frisco](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=4692559) (2026); [Hyderabad 2027](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=4692559&year=2027)
- Drik Panchang, Diwali Puja Calendar: [Hyderabad 2026](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=1269843), [Frisco 2026](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=4692559), [Hyderabad 2027](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/diwali/diwali-puja-calendar.html?geoname-id=4692559&year=2027)
- Drik Panchang, Kartik Purnima: [Hyderabad 2026](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=1269843&year=2026), [Frisco 2026](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=4692559&year=2026), [Hyderabad 2027](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=1269843&year=2027), [Frisco 2027](https://www.drikpanchang.com/purnima/kartik/kartik-purnima-date-time.html?geoname-id=4692559&year=2027)
- Karya Siddhi Hanuman Temple, 2026 calendar (Frisco, TX): [PDF](https://assets.dallashanuman.net/images/event/2026/2026_calendar.pdf)
- General (non-location-scoped) corroboration only, not treated as
  authoritative on their own: [smartpuja.com — Kartik Purnima 2026](https://www.smartpuja.com/blog/kartik-purnima-2026/), [Kartik month start/end (Samvat.in)](https://samvat.in/months/kartik-2026/), [Tulsi Vivah 2026 (smartpuja.com)](https://www.smartpuja.com/blog/tulsi-vivah-2026-date-muhurat-puja-vidhi/)
- This app's own shipped rules, for method precedent: `lib/panchanga/engine.ts`
  (`amantaSunriseFestivalDay`, `nishitaVyaptiFestivalDay`,
  `chandrodayaVyaptiFestivalDay`, `madhyahnaVyaptiFestivalDay`),
  `lib/panchanga/festival-rules.ts`

---

## 9. Unresolved questions

Carried forward explicitly, not silently resolved by this report:

1. **Janmashtami's Smarta/ISKCON split** — real for Frisco (Sep 3 / Sep 4),
   not independently confirmed for Hyderabad. Needs its own dedicated
   Drik fetch before any implementation decision, and then a **product**
   decision on which convention (or both, distinguished) Home should show.
2. **The Diwali-cluster Naraka Chaturdashi discrepancy** between an
   AI-summarized search result (Nov 7) and a verbatim-quote page fetch
   (Nov 8, same day as Diwali) for Hyderabad 2026 — resolved here in favor
   of the verbatim fetch, but not independently triple-checked against a
   begin/end-time fetch the way this app's shipped rules were.
3. **The temple's own internal inconsistency**: "Lakshmi Puja" labelled on
   both Nov 6 (with Dhanteras) and Nov 8 (with Deepavali) in the same
   calendar. Needs a priest/temple clarification, not a guess.
4. **Durga Ashtami, Maha Navami, and Rama Navami's exact muhurta
   conventions** are not sourced to the same depth as Vinayaka Chavithi's
   madhyahna-vyapti rule (which took a dedicated fixture set against Drik's
   festival pages across four years). Assumed to be a similar window-based
   rule; not confirmed.
5. **The general Purnima/Amavasya civil-day-selection rule is genuinely
   unresolved**, not merely unimplemented — a near-identical rule
   (Satyanarayana Vrata) was built, tested against a full year of real
   dates, and found wrong on the majority of them earlier this session.
   Kartika Purnima should not ship until this is solved for real, evidenced
   the same way Sankashti Chaturthi's kshaya fallback was (§6, item 6).
6. **Whether Vinayaka Chavithi and Ganesh Visarjan should become a single
   multi-day "festival window" rule** rather than two independent single-day
   rules — both Drik and the temple treat Ganesh Chaturthi through
   Nimajjana/Visarjan as one ~11-day observance; this app currently models
   only the first day. Out of scope for this report, flagged for a future
   product conversation.
7. **Kartika Somavaram's exact weekday-vs-tithi interaction** at month
   boundaries — computed here as "every Monday within the Amanta Kartika
   month" for Hyderabad's own month boundary only; not verified whether
   Frisco's Amanta Kartika boundary ever shifts by a day the way Ugadi's
   Chaitra boundary sometimes does, which would change which Mondays count.
8. **Ksheerabdi Dwadashi's Hyderabad-specific date** (Nov 21) was corroborated
   by a general web source and the temple's *Frisco* calendar, not by an
   independent Hyderabad-scoped Drik fetch.
