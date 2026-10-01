# Bathukamma 2026 — date audit for Hyderabad and seven US locations (2026-10-01, revision 3)

- **Main SHA inspected:** `27e3bae8763e94f1be27c8e189c28917fc62f8b3` (`origin/main`, "Merge pull request #11 …")
- **Date of this audit / access date for every URL below:** 2026-10-01 (Drik Panchang's own page clock read "Fri Oct 02, 2026", i.e. already Oct 2 in IST, at fetch time)
- **Revision 2:** 2026-10-01 (same day). This is a correction round requested on PR #12. Revision-1 conclusions that changed are **marked SUPERSEDED in place and kept unedited** for the audit trail; see "What changed in revision 2" below.
- **Revision 3:** 2026-10-01 (same day). A second precision round on PR #12; see "What changed in revision 3" directly below. Revision-2 sentences it corrects are struck through and marked "SUPERSEDED (rev 3)", not deleted.

## What changed in revision 3 (2026-10-01)

Three precision corrections were made. No new data was fetched and nothing was recalculated. Every time used below already appears in §D.

1. **"Start Oct 10 ⇒ every convention agrees on Oct 10–18" was overstated.**
   - With day 1 fixed at Oct 10:
     - **R1** (tithi at sunrise) gives day 9 = **Oct 18** in all seven US cities.
     - **R2** (strict nine-day count) also gives **Oct 18**.
     - **R3** (the evening-Ashtami view) does **not** necessarily give Oct 18.
   - **Pacific cities (Los Angeles, San Francisco, San Jose, Seattle).** Ashtami begins at 19:57–19:58 PDT on **Oct 17** (§D.6–D.8), after local sunset but within what is plausibly "evening". So under the first-evening interpretation (my formalization; see correction 3), Saddula falls on **Oct 17**, even with day 1 = Oct 10.
     - That would make the span Oct 10–17: 8 days for 9 names, so the middle-day mapping is undetermined.
     - Under the sunset interpretation it is Oct 18.
   - **Central and Eastern cities (Frisco, Dallas, Chicago at 21:58 CDT; New York at 22:57 EDT).** Ashtami begins later on Oct 17. Whether that still counts as "evening" depends on a definition the source never gives. Oct 17 is therefore **not excluded** there either. The Pacific case is simply the clearest.
   - **Labels:** no cell changes. US days 2–8 and day 9 were already UNRESOLVED in revision 2. This correction strengthens the reason; it does not move a label.
   - **What does change:** the conditional claim. Resolving day 1 to Oct 10 would make US days 1–9 **PROVISIONAL Oct 10–18 under R1 and R2 only**. Under R3, day 9 (and so the middle days) would stay UNRESOLVED in the Pacific cities, and arguably in the Central and Eastern ones too.
   - **Hyderabad:** unaffected. There, Ashtami runs 08:28 Oct 18 → 10:51 Oct 19, so only the Oct 18 evening contains it under any interpretation.
2. **Same time zone does not guarantee the same observance date.**
   - Revision 2 sometimes read as if sharing an IANA zone *made* the US results match. That is not what was shown, and it is not a valid general principle.
   - What I actually did: I computed each city individually (its own sunrise, sunset and aparahna, §D) and read each city's own Drik pages ([S5][S6][S35]).
   - The dates match because **those individual checks happened to agree**. In every checked city:
     - local sunrise on Oct 10 fell inside Amavasya;
     - the Oct 9 aparahna and sunset fell inside Amavasya;
     - Oct 18's sunrise, aparahna and sunset fell inside Ashtami.
   - Sharing a zone explains only one narrow thing: why the *clock time of a tithi boundary* (a single instant) reads the same in two cities.
   - It does **not** decide the observance date. That depends on each city's own sunrise, sunset or evening relative to the boundary, and those differ by city. A city in the same zone with a sunrise or sunset on the other side of a boundary would get a different date.
   - The affected wording is rewritten in §B-R2.2, §B-R2.4 and §D.0.
3. **What the evening source says vs. my interpretation of it.**
   - The source [S15] is a journalist's paraphrase, not a rule text: astrologer Uppala Ramesh Sharma "added that as Bathukammas are traditionally immersed in the evening, the festival should be celebrated on Monday, as Ashtami begins in September 29 evening."
   - **It does not define "evening".** It does not say sunset, a clock hour, the immersion time, or "the first evening of the tithi".
   - The only calibration point it gives: Ashtami began at about **16:31 IST** on Sep 29, 2025 (engine; §E row 5 context). The paraphrase calls that "evening", even though it is about 1½ hours *before* the 18:08 sunset. That is the opposite of a strict sunset boundary, so even this one data point does not pin a rule down.
   - **Both formalizations used in revision 2 are therefore my own experimental interpretations, not the source's rule:**
     - "reading (i)": Ashtami prevails at local sunset;
     - "reading (ii)": the first evening in which Ashtami is present.
   - They are renamed **R3-interp-(i)** and **R3-interp-(ii)** in revision 3. Wherever they appear in the report, they should be read with that label. R3 results are evidence of what a *formalization* gives, not of what the source specifies.

## Summary in plain language (revision 2, with revision-3 corrections inline)
- **Scope:** research only. No application code, festival-engine entries, UI, or tests were changed. Not for merge or deploy. Priest review to follow separately (per Mahesh).

## Summary in plain language (revision 2 — current)

**Hyderabad**
- **Two dates are stated outright by sources, and both are VERIFIED:**
  - **Oct 10, Engili Pula (day 1).** Telugu news channel TV9 says the Bathukamma nine nights begin that day. Every Amavasya (new-moon) convention gives Oct 10.
  - **Oct 18, Saddula (day 9).** This is on the Telangana Government's 2026 holiday list.
- **The seven middle days (Oct 11–17) are now PROVISIONAL, not VERIFIED.** I got them by assuming one named day per calendar day between those two fixed dates. That is a reasonable inference, but no authoritative source names any single middle day. Only two uncited secondary websites (hindupad, indian.community) list them one by one.
- **Two documented conventions give different dates for the end of the festival. Both are shown, side by side:**
  - The Telangana Government date and a strict nine-day count give **Oct 18**. So does an "evening Ashtami" view, under any interpretation of "evening", because only the Oct 18 evening contains Ashtami in Hyderabad.
  - The tithi-at-sunrise convention (the lunar day in force at sunrise) gives **Oct 19**. Drik Panchang publishes Oct 19 as Durga Ashtami. A Warangal temple priest used this convention in 2025.

**US cities (all seven checked one by one in revision 2)**
- **Every city's own boundaries were checked separately.** I read each city's Drik Panchang Amavasya page and ran each through the engine. All seven have Amavasya from mid-morning Oct 9 to mid-morning Oct 10, local time.
  - Drik labels Oct 9 the ancestor-rites day ("Darsha/Sarva Pitru Amavasya") and Oct 10 the sunrise day ("Ashwina Amavasya").
  - The local clock times of the boundary differ only by time zone. The local *day* outcome was checked city by city: each city's own sunrise and afternoon were compared with the boundary (rev 3).
- **Day 1 stays UNRESOLVED.** The candidates are Oct 9 and Oct 10.
- **Days 2–8 and day 9 move from PROVISIONAL to UNRESOLVED.** Their dates depend on the unresolved start and on which documented end-of-festival convention applies. They are now shown as parallel conditional sequences in §B-R2:
  - ~~**Start Oct 10:** Oct 10–18 under every documented convention.~~ **SUPERSEDED (rev 3):**
  - **Start Oct 10:** Oct 10–18 under R1 (sunrise) and R2 (nine-day count).
    - Under the evening-Ashtami view (R3), the **Pacific cities** can land on **Oct 17**. Ashtami begins there at 19:57 PDT on Oct 17. Central and Eastern cities are ambiguous because "evening" is undefined.
  - **Start Oct 9, strict nine-day count:** Oct 9–17.
  - **Start Oct 9, Ashtami-at-sunrise end:** Oct 9 to Oct 18, which is 10 days for 9 names. How the names map onto those days is undetermined.

## What changed in revision 2 (2026-10-01)

Four corrections were requested on PR #12. Each is applied below. No new astronomy was added. The only new evidence is that Drik's Amavasya-dates page was fetched for **each** location individually ([S35], used in correction 4).

1. **Published dates are now separated from inferred dates (Hyderabad).**
   - Revision 1 marked all nine Hyderabad days VERIFIED. It argued that 9 names in 9 calendar days between verified endpoints are "forced".
   - That argument assumes the days run consecutively with no skip or repeat. The assumption is reasonable, but it is an inference, not a sourced fact.
   - No authoritative source names any individual 2026 middle day. A targeted search found only uncited secondary sites, [S9] and [S11].
   - Days 2–8 are therefore re-graded **PROVISIONAL (endpoints verified, consecutive sequence inferred)**, written as **PROVISIONAL-E** in the matrix.
   - Day 1 and day 9 stay VERIFIED because each is stated outright: day 1 by [S14] and [S31], corroborated by [S4], [S9] and [S13]; day 9 by [S1], [S2] and [S14].
2. **US days 2–8 no longer rest on an unresolved start.**
   - Revision 1 called US days 2–8 PROVISIONAL even though day 1 was UNRESOLVED. That was a logical gap: consecutive middle days need a fixed start.
   - Revision 2 shows **parallel conditional sequences**, one for each day-1 candidate and each documented end convention (§B-R2.3).
   - The overall US cells for days 2–8 are **UNRESOLVED**.
   - The only end anchor that does not depend on day 1 is the tithi-at-sunrise Durga Ashtami, which is Oct 18 locally for each city [S5]. It narrows the possibilities but does not settle them, because a documented strict-nine-day convention gives Oct 17 if day 1 is Oct 9.
   - US day 9 therefore also moves to **UNRESOLVED**, with candidates Oct 18 and Oct 17.
3. **Conventions are no longer rejected for mismatching the government holiday list.**
   - Revision 1 tested rules R1 to R4 against Telangana's 2018–2026 holiday lists and treated any year that did not match as disqualifying (§E row 4, the §B "trap" note, and §F step 4).
   - That was the wrong test. A government holiday list is a separate, administratively motivated convention. Disagreeing with it does not make a traditional rule wrong.
   - Revision 2 asks instead: is this rule documented as a real convention?
     - **R1, tithi at sunrise:** documented [S15], plus Drik [S5]. Kept.
     - **R2, strict nine-day count:** documented [S15][S16]. Kept.
     - **R3, evening Ashtami:** documented, though by a single source and with "evening" never defined [S15]. Kept and labelled underspecified.
     - **R4, the first day Ashtami touches daylight:** this was my own hypothesis and no source attests it. Dropped as a convention; kept only as a diagnostic.
   - The Telangana Government list is kept as a separate convention, **C-GOV**: an official/administrative date whose underlying rule is not published.
   - Where these conventions disagree, the report now shows each date with its own source (§B-R2.1, §B-R2.2). It no longer picks a single winner.
4. **Each US city is now checked individually, with no stand-in city.**
   - In revision 1, the engine tables in §D were already computed separately for every city, and Drik's month panchang [S6] and Durga Ashtami page [S5] were already fetched for each city. Only the Drik Amavasya *boundary times* came from Dallas alone [S7].
   - Revision 2 fetches Drik's Amavasya list for **every** location: Frisco, Dallas, New York, Chicago, Los Angeles, San Francisco, San Jose, Seattle, and Hyderabad [S35]. They are compared one by one with the engine in the new §D.0.
   - Several §D subsections used to say "spans as Frisco/LA". They now say why the clock times match: each was computed separately, and the times coincide because the cities share an IANA time zone. *(Rev 3 precision: a shared zone explains only matching **boundary clock times**. Matching **dates** come from each city's own sunrise and sunset checks agreeing; see "What changed in revision 3", item 2.)*

**Cell movements (revision 1 → revision 2):**

| Cells | Revision 1 | Revision 2 | Reason |
|---|---|---|---|
| Hyderabad day 1 (Oct 10) | VERIFIED | VERIFIED (unchanged) | Stated outright [S14][S31]; every Amavasya convention agrees |
| Hyderabad days 2–8 (Oct 11–17) | VERIFIED | **PROVISIONAL-E** | Inferred from the endpoints by a consecutive-sequence assumption; no authoritative per-day source (correction 1) |
| Hyderabad day 9 (Oct 18) | VERIFIED | VERIFIED as the **published C-GOV date** (unchanged), **plus** a visible R1 alternative of Oct 19 (PROVISIONAL, calculated) | Correction 3: both documented conventions are kept |
| US day 1 (all 7 cities) | UNRESOLVED | UNRESOLVED (unchanged; now individually verified per city) | Correction 4 |
| US days 2–8 (all 7 cities) | PROVISIONAL Oct 11–17 | **UNRESOLVED**; conditional sequences shown | Correction 2 |
| US day 9 (all 7 cities) | PROVISIONAL Oct 18 | **UNRESOLVED** (Oct 18 under R1, either start; Oct 17 under R2 with an Oct 9 start; R3 underspecified) | Corrections 2 and 3 |

## Summary in plain language (revision 1 — SUPERSEDED by the revision-2 summary above; kept unedited)

For **Hyderabad**, all nine 2026 dates are settled at the date-evidence level:
**October 10 (Engili Pula) through October 18 (Saddula)**, one named day per calendar day.
The last day (Oct 18) comes straight from the Telangana Government's 2026 holiday list.
The first day (Oct 10) is Mahalaya Amavasya under every convention I checked.
With both ends fixed, the seven middle days have only one possible arrangement.
One real disagreement remains for Hyderabad, but it is about **Durga Ashtami**, not Saddula Bathukamma.
Drik Panchang puts Durga Ashtami on **Oct 19**. Telangana's government and the Telugu daily Eenadu put it (and Saddula Bathukamma) on **Oct 18**.
The same split happened in 2024, so this is a real convention difference, not a typo.

For the **seven US locations**, nothing is fully settled:
- **Day 1 is UNRESOLVED.** In every US city, the new-moon tithi (Amavasya) starts mid-morning on Oct 9 and ends mid-morning on Oct 10. The ancestor-rites convention (Drik's "Sarva Pitru Amavasya") picks **Oct 9**. The tithi-at-sunrise convention picks **Oct 10**. I found no evidence that says which one Bathukamma's first day follows outside India.
- **Days 2–9 are PROVISIONAL: Oct 11–18.** Local Navratri start (Oct 11), local Durga Ashtami (Oct 18), and every calculation convention I tested agree on these dates. However, no authoritative source publishes Bathukamma dates for any US location.
- **Neither published US summary holds up.** "Oct 9–17" (indian.community) contradicts the site's own rule that the festival ends on Durgashtami: Drik puts US Durgashtami on Oct 18. "Oct 10–18" (hindutone) could not be fetched (DNS failure), so I could only see a search snippet of it.
- **Aligina Bathukamma (day 6) is kept in every column.** Its date follows the sequence. What people actually do that day varies, and the sources are cited in §A.

> **Label meaning in this report.** VERIFIED / PROVISIONAL / UNRESOLVED below are
> *date-evidence* labels requested for this audit. They are **not** the
> sacred-content review labels in `.claude/rules/sacred-content.md` (where
> `VERIFIED` means priest/source-verified content). Nothing here has been
> priest-reviewed. An engineer must not map a "VERIFIED" date here onto
> content `VERIFIED` status.
>
> Evidence categories used throughout (as required by the task):
> **(a)** date explicitly published by a named source for a named year/location;
> **(b)** date calculated by me under a convention I cite;
> **(c)** proposed date whose convention is unresolved.

---

## A. The nine names and the documented sequence

All nine names in the task brief are confirmed. Only the spellings vary between sources. The Telugu script below comes from ETV Bharat Telugu [S21], the one source that lists all nine in Telugu. The order is the same across every source consulted: [S9], [S11], [S18], [S19], [S21], [S22], [S23], [S24], [S28].

| # | English (as in brief) | Telugu [S21] | Spelling variants seen | Naivedyam (offering) / note |
|---|---|---|---|---|
| 1 | Engili Poola Bathukamma | ఎంగిలిపూల బతుకమ్మ | Engili Pula, Engili Puvvula [S9], Angili pula [S18][S19] | Sesame with rice flour / nooka [S24] |
| 2 | Atukula Bathukamma | అటుకుల బతుకమ్మ | Atkula [S24][S28], Attukula [S18] | Flattened rice, jaggery, lentils [S23][S24] |
| 3 | Muddapappu Bathukamma | ముద్దపప్పు బతుకమ్మ | Muddhapappu [S9], Muddappappu [S18] | Soft-cooked lentils, milk, jaggery [S24] |
| 4 | Nanabiyyam Bathukamma | నానబియ్యం బతుకమ్మ | Nane biyyam (నానే బియ్యం) [S22], Nanbiyyam [S18] | Soaked rice, milk, jaggery [S24] |
| 5 | Atla Bathukamma | అట్ల బతుకమ్మ | — | Atlu / dosa [S24] |
| 6 | Aligina Bathukamma | అలిగిన బతుకమ్మ | Alaka [S9][S18][S19], Arremu / అర్రెం [S22][S23][S26], Alasina (అలసిన, "tired") [S22] | **No naivedyam** (all sources). Whether Bathukamma is *made/played* varies — see below |
| 7 | Vepakayala Bathukamma | వేపకాయల బతుకమ్మ | Vepakaya (వేపకాయ) [S23] | Fried rice-flour balls shaped like neem fruit [S21][S24] |
| 8 | Vennamuddala Bathukamma | వెన్నముద్దల బతుకమ్మ | Venna muddala [S18], Vennamuddhala [S9] | Sesame, butter/ghee, jaggery [S21][S24] |
| 9 | Saddula Bathukamma | సద్దుల బతుకమ్మ | Pedda Bathukamma [S19][S24] | Five kinds of rice dishes; immersion (nimajjanam) [S9][S23][S24] |

**What the sequence is anchored to.** Every source says day 1 falls on Mahalaya Amavasya, also called Pitru or Pethara Amavasya. In the amanta calendar (months end at new moon, as in Telugu practice) this is Bhadrapada Krishna Amavasya. In the purnimanta calendar (months end at full moon) it is Ashvina Krishna Amavasya.

Every source also says the last day is Durgashtami, which is Ashvayuja (Ashvina) Shukla Ashtami. ETV Bharat Telugu [S21] puts it in Telugu: "భాద్రపద బహుళ అమావాస్య నుంచి ఆశ్వయుజ శుక్ల అష్టమి వరకూ" ("from Bhadrapada Krishna Amavasya to Ashvayuja Shukla Ashtami").

English Wikipedia [S24] and hindupad [S9] also tie each middle day to a Shukla tithi: day 2 = Padyami, …, day 6 = Panchami, day 8 = Saptami. Andhra Jyothy [S22] gives the same for Aligina.

**Aligina Bathukamma, examined specifically (research question 4).**
- **Position.** Every source that numbers the days puts Aligina at **day 6**. No source drops it from the count of nine.
- **Rest day or celebrated day? The sources disagree:**
  - ETV Bharat Telugu [S21]: "ఆ రోజు అమ్మవారు అలకలో ఉంటుందని నమ్మి, బతుకమ్మ ఆట ఆడరు" — the goddess is believed to be sulking, so *Bathukamma is not played*.
  - Andhra Jyothy 2024 [S22]: no flower Bathukamma is made and no naivedyam is offered. It also records a second tradition, from the Devi Bhagavatam per the article: a rest day for the tired goddess, called *Arrem* / *Alasina Bathukamma*, on which "ఆరోనాడు బతుకమ్మ ఆడరు" (Bathukamma is not played on the sixth day).
  - V6 Velugu 2024 [S23]: "ఈ రోజు బతుకమ్మ ఆడరు. కొన్ని చోట్ల బతుకమ్మ ఆడతారు. కానీ ప్రసాదం ఇవ్వరు." — not played; *in some places it is played, but no prasadam is given*. V6 also cites researcher Tirunagari Devaki Devi's book *'బతుకమ్మ' పాటలలో స్త్రీల మనోభావాలు*: the sixth day is a rest day.
  - hindupad Aligina page [S10]: "Women do not prepare Bathukamma but play Bathukamma."
  - Wikipedia [S24] and abhibus [S26]: no food offering. Neither says anything about playing.
- **Conclusion.** Aligina's **date** follows the sequence like any other day. What people **do** that day is a genuine regional or family variant: rest with no Bathukamma at all, versus playing with no offering. Implementation must record this as a variant, not pick one. It must not drop the day either.

**Regional length variation (documented).** Telangana Today, 12 Oct 2021 [S16], quotes Kamalakara Siddhanti: "Bathukamma is kept for 7 days in Vemulawada and 13 days in some parts of the Adilabad and Mahabubnagar districts." It also quotes the Warangal Bhadrakali temple priest: the festival "is celebrated for 5, 7, or 9 days according to the local customs". The 9-day, 9-name sequence is therefore the mainstream or state convention, not a universal one.

---

## B-R2. 2026 date matrix — revision 2 (current)

**Labels.** The three labels are still VERIFIED, PROVISIONAL and UNRESOLVED (date-evidence labels, not content-review labels). One sub-tag is added:

- **VERIFIED**: a named source states this date outright for this year and location (category a). It is cross-checked by calculation where a calculation applies.
- **PROVISIONAL-E**: "endpoints verified, consecutive sequence inferred". Day 1 and day 9 are VERIFIED, and this date was filled in by assuming one named day per consecutive calendar day. No authoritative source names this individual day. Uncited secondary sites ([S9], [S11]) list it, which corroborates but does not verify.
- **PROVISIONAL**: calculated under a documented convention (category b), with no source stating the date.
- **UNRESOLVED**: the date depends on a choice between documented conventions, or on an unresolved anchor, that the evidence cannot settle (category c). Candidates are listed. **No single date is given.**

**Conventions referred to in revision 2.** Each is identified by its source; none is preferred.

| ID | Convention | Documented by | Notes |
|---|---|---|---|
| C-GOV | Telangana Government published date (official / administrative) | [S1][S2][S3] | Publishes a single date per year for Saddula / Durgashtami, but not the rule behind it. Matches R1 in some years and R2 in others (§E row 4, revised). Applies to Telangana. |
| R1 | Tithi at local sunrise (the Ashtami that prevails at sunrise; the Amavasya that prevails at sunrise) | Bhadrakali Temple, Warangal, 2025: "only the tithi at sunrise is taken into consideration" [S15]; Drik's Durga Ashtami [S5] | — |
| R2 | Strict nine consecutive days from Mahalaya Amavasya | Thousand Pillar Temple chief priest / Telangana Archakas' Federation president, 2021 and 2025 [S15][S16] | The sources do not say how day 1 is fixed when Amavasya conventions split. Outside India, day 1 is an input to R2, not an output. |
| R3 | "Evening Ashtami": Saddula is the day Ashtami is present in the evening, because immersion is in the evening | One astrologer, 2025, as paraphrased by a journalist [S15] | **Single attestation; "evening" is never defined by the source.** The source says only: "as Bathukammas are traditionally immersed in the evening … Ashtami begins in September 29 evening". It applies the word to an Ashtami start of about 16:31 IST, before sunset. **My own experimental formalizations, not the source's rule:** R3-interp-(i), Ashtami prevailing at local sunset; R3-interp-(ii), the first evening in which Ashtami is present at any time. Where they differ, R3's result is UNRESOLVED. (Revision 2 called these "readings (i)/(ii)"; same meaning, relabelled in rev 3.) |
| A-SP | Day 1 = Drik's "Sarva Pitru / Darsha Amavasya" day (the ancestor-rites convention, decided by the afternoon) | Drik's labelling [S6][S7][S35] | That this governs *Bathukamma's* day 1 is **not documented**. The link rests only on the name "Pethara / Pitru Amavasya". Listed so the Oct 9 candidate keeps its own source. |

(Revision 1's R4, "first day Ashtami touches daylight", is **dropped**: no source attests it. It is kept only as a diagnostic in §E row 4.)

### B-R2.1 Hyderabad — results under each convention (`Asia/Kolkata`)

| Day | C-GOV | R1 (sunrise) | R2 (9 days) | R3 (evening) | Consolidated cell |
|---|---|---|---|---|---|
| 1 Engili Pula | not listed for 2026 [S1] | Oct 10 (calc.) | Oct 10 (input; matches) | n/a (R3 is stated only for Saddula) | **VERIFIED Sat Oct 10.** Stated outright as the start of Bathukamma in [S14] ("బతుకమ్మ నవరాత్రులు ఈ రోజు నుంచే ప్రారంభమవుతాయి", the Bathukamma nine nights begin from this day) and [S31]. Oct 10 is Mahalaya Amavasya per [S4] and [S13]. Every Amavasya convention agrees, including A-SP (Drik "Sarva Pitru" Oct 10). *Caveat:* the same TV9 sentence also wrongly calls Oct 10 "Saddula" (§E row 10). Only its "nine nights begin from this day" statement is relied on. Eenadu [S13] states Mahalaya Amavasya on Oct 10 but does not name Bathukamma's start |
| 2 Atukula | — | Oct 11 (Padyami at sunrise, nominal per-day mapping) | Oct 11 | — | **PROVISIONAL-E Sun Oct 11** |
| 3 Muddapappu | — | Oct 12 | Oct 12 | — | **PROVISIONAL-E Mon Oct 12** |
| 4 Nanabiyyam | — | Oct 13 | Oct 13 | — | **PROVISIONAL-E Tue Oct 13** |
| 5 Atla | — | Oct 14 | Oct 14 | — | **PROVISIONAL-E Wed Oct 14** |
| 6 Aligina | — | Oct 15 (Panchami at sunrise) | Oct 15 | — | **PROVISIONAL-E Thu Oct 15**; what is done that day varies (§A) |
| 7 Vepakayala | — | Oct 16 | Oct 16 | — | **PROVISIONAL-E Fri Oct 16** |
| 8 Vennamuddala | — | Oct 17 (first Saptami sunrise; Saptami also prevails at the Oct 18 sunrise, so it occurs twice) | Oct 17 | — | **PROVISIONAL-E Sat Oct 17** |
| 9 Saddula | **Oct 18** (published) [S1][S2] | **Oct 19** (Ashtami prevails only at the Oct 19 sunrise; Drik publishes Durga Ashtami Oct 19 [S5][S8]) | Oct 18 | Oct 18 under both readings (Ashtami 08:28 Oct 18 → 10:51 Oct 19; only the Oct 18 evening contains Ashtami) | **VERIFIED Sun Oct 18 as the published C-GOV date**, also given by R2 and R3. **Documented alternative: Mon Oct 19 under R1** (PROVISIONAL, calculated; no source names Oct 19 as *Saddula* except hindupad's hedge "18 \| 19" [S9]) |

Hyderabad notes:
- **Days 2–8 under R1.** R1 makes the span Oct 10–19: 10 calendar days for 9 names, with Oct 18 left over. The nominal per-day tithi mapping ([S9][S22][S24]) would still put days 2–8 on Oct 11–17 and leave Oct 18 unnamed. But §E row 7 shows the same sources followed a consecutive count, not the tithi labels, in 2024 and 2025.
- **Result.** The middle days are Oct 11–17 under every convention. Their grade is still PROVISIONAL-E, because no independent source names any of them.

### B-R2.2 US cities — the day-1 anchor, checked individually per city

Each row below was checked on its own. I read that city's Drik Amavasya page [S35], Drik month panchang [S6] and Drik Durga Ashtami page [S5], and ran the engine separately (§D).

| City (IANA zone) | Amavasya (Drik [S35] = engine §D) | A-SP / Drik "Sarva Pitru" day | R1 Amavasya at sunrise | Local Durga Ashtami, R1 [S5] |
|---|---|---|---|---|
| Frisco (`America/Chicago`) | 11:05 Oct 9 → 10:49 Oct 10 CDT | Oct 9 | Oct 10 (sunrise 07:28) | Oct 18 |
| Dallas (`America/Chicago`) | 11:05 Oct 9 → 10:49 Oct 10 CDT | Oct 9 | Oct 10 (sunrise 07:28) | Oct 18 |
| Chicago (`America/Chicago`) | 11:05 Oct 9 → 10:49 Oct 10 CDT | Oct 9 | Oct 10 (sunrise 06:58) | Oct 18 |
| New York (`America/New_York`) | 12:05 Oct 9 → 11:49 Oct 10 EDT | Oct 9 | Oct 10 (sunrise 07:02) | Oct 18 |
| Los Angeles (`America/Los_Angeles`) | 09:05 Oct 9 → 08:49 Oct 10 PDT | Oct 9 | Oct 10 (sunrise 06:55) | Oct 18 |
| SF Bay Area: San Francisco and San Jose (`America/Los_Angeles`) | 09:05 Oct 9 → 08:49 Oct 10 PDT (both pages) | Oct 9 | Oct 10 (sunrise 07:14 SF, 07:12 SJ) | Oct 18 |
| Seattle (`America/Los_Angeles`) | 09:05 Oct 9 → 08:49 Oct 10 PDT | Oct 9 | Oct 10 (sunrise 07:22) | Oct 18 |

**Why the outcomes match, stated explicitly.** *(Rev 3: the first bullet below explains matching **clock times** only. It must not be read as "same zone ⇒ same date". The matching **dates** come from the per-city checks in the later bullets.)*
- A tithi boundary is a single instant worldwide. Cities in the same IANA zone therefore show identical clock times for it. That is why the three Central-zone cities match each other, and why the four Pacific-zone locations (LA, SF, San Jose, Seattle) match each other. *SUPERSEDED (rev 3) insofar as it was read as explaining matching dates: a shared zone does not by itself guarantee a shared observance date. That depends on each city's own sunrise, sunset and afternoon relative to the boundary.*
- Sunrise differs by city (latitude and longitude). In all seven cities, sunrise falls before the Amavasya end on Oct 10 (Pacific 08:49, Central 10:49, Eastern 11:49) and before the Amavasya start on Oct 9.
- Each city's local-day outcome was **checked, not extrapolated**: Oct 9 under A-SP and Oct 10 under R1, in every city.
- **Rev 3, the precise claim.** The seven checked cities produce matching day-1 candidates because their *individual* checks agree:
  - each city's own Oct 10 sunrise falls inside Amavasya;
  - each city's own Oct 9 aparahna falls inside Amavasya (§D).

  This holds for these cities and this year only. It is not implied by their time zones.
- New York's boundary is one clock hour later (Eastern time). Its local-day outcome is still the same, as checked.

### B-R2.3 US cities — conditional sequences (applies to each of the seven cities individually; see B-R2.2 for the per-city check)

| Day | Seq. B: day 1 = Oct 10 (R1 Amavasya), end by R1 or R2 | Seq. A1: day 1 = Oct 9 (A-SP), end by R2 | Seq. A2: day 1 = Oct 9 (A-SP), end by R1 |
|---|---|---|---|
| 1 Engili Pula | Oct 10 | Oct 9 | Oct 9 |
| 2 Atukula | Oct 11 | Oct 10 | undetermined |
| 3 Muddapappu | Oct 12 | Oct 11 | undetermined |
| 4 Nanabiyyam | Oct 13 | Oct 12 | undetermined |
| 5 Atla | Oct 14 | Oct 13 | undetermined |
| 6 Aligina | Oct 15 | Oct 14 | undetermined |
| 7 Vepakayala | Oct 16 | Oct 15 | undetermined |
| 8 Vennamuddala | Oct 17 | Oct 16 | undetermined |
| 9 Saddula | Oct 18 (R1 and R2 agree) | Oct 17 | Oct 18 |
| Grade *within* the sequence | PROVISIONAL **under R1 and R2 only** (calculated; their end dates agree, so the middle is constrained from both ends). **Rev 3:** under R3-interp-(ii), day 9 can be **Oct 17 in the Pacific cities** (Ashtami from 19:57 PDT Oct 17). That gives an 8-day span with the middle undetermined, so Seq. B is **not** convention-independent there. Central and Eastern are ambiguous (§B-R2.3, R3 note) | PROVISIONAL (calculated under R2). Note: Oct 10, given here as Atukula ("Padyami"), still has Amavasya at local sunrise | Span Oct 9–18 is 10 days for 9 names. **Middle undetermined**: no source says which day is doubled or left unnamed (§G item 4). The nominal tithi mapping would give Oct 11–17 with Oct 10 unnamed, but that mapping is not followed reliably (§E row 7) |

**R3 (evening Ashtami) in the US, for day 9.** *(Rev 3: "reading (i)" and "reading (ii)" below are **my experimental formalizations**, R3-interp-(i) and R3-interp-(ii). The source [S15] does not define "evening". The results below hold **whichever day 1 is chosen**, including Oct 10.)*
- Reading (i), Ashtami at local sunset, gives **Oct 18** in all seven cities.
- Reading (ii), the first evening containing Ashtami, gives **Oct 17** in the Pacific cities. There, Ashtami begins at 19:57–19:58 PDT on Oct 17, during the evening, roughly 1½ hours after sunset (§D.6–D.8).
  - Central (21:58 CDT) and Eastern (22:57 EDT) are ambiguous: whether that is still "evening" is not defined by the source.
- R3's US day 9 is therefore **UNRESOLVED**: Oct 18 under reading (i); Oct 17 under reading (ii) in the Pacific cities, and unclear in the Central and Eastern ones.
- **Rev 3:** this applies under Sequence B (day 1 = Oct 10) as much as under Sequence A. With day 1 = Oct 10 and day 9 = Oct 17 (Pacific, R3-interp-(ii)), the span is Oct 10–17: 8 calendar days for 9 names. Days 2–8 would be undetermined in that case.

### B-R2.4 Consolidated 2026 matrix (current)

| Day | Hyderabad | Frisco | Dallas | New York | Chicago | Los Angeles | SF Bay Area | Seattle |
|---|---|---|---|---|---|---|---|---|
| 1 Engili Pula | **VERIFIED** Sat Oct 10 | UNRESOLVED — (Oct 9 \| Oct 10) | UNRESOLVED — (Oct 9 \| Oct 10) | UNRESOLVED — (Oct 9 \| Oct 10) | UNRESOLVED — (Oct 9 \| Oct 10) | UNRESOLVED — (Oct 9 \| Oct 10) | UNRESOLVED — (Oct 9 \| Oct 10) | UNRESOLVED — (Oct 9 \| Oct 10) |
| 2 Atukula | PROVISIONAL-E Sun Oct 11 | UNRESOLVED — (B: Oct 11 \| A1: Oct 10 \| A2: ?) | same as Frisco | same | same | same | same | same |
| 3 Muddapappu | PROVISIONAL-E Mon Oct 12 | UNRESOLVED — (B: Oct 12 \| A1: Oct 11 \| A2: ?) | same | same | same | same | same | same |
| 4 Nanabiyyam | PROVISIONAL-E Tue Oct 13 | UNRESOLVED — (B: Oct 13 \| A1: Oct 12 \| A2: ?) | same | same | same | same | same | same |
| 5 Atla | PROVISIONAL-E Wed Oct 14 | UNRESOLVED — (B: Oct 14 \| A1: Oct 13 \| A2: ?) | same | same | same | same | same | same |
| 6 Aligina | PROVISIONAL-E Thu Oct 15 | UNRESOLVED — (B: Oct 15 \| A1: Oct 14 \| A2: ?) | same | same | same | same | same | same |
| 7 Vepakayala | PROVISIONAL-E Fri Oct 16 | UNRESOLVED — (B: Oct 16 \| A1: Oct 15 \| A2: ?) | same | same | same | same | same | same |
| 8 Vennamuddala | PROVISIONAL-E Sat Oct 17 | UNRESOLVED — (B: Oct 17 \| A1: Oct 16 \| A2: ?) | same | same | same | same | same | same |
| 9 Saddula | **VERIFIED** Sun Oct 18 (C-GOV; also R2, R3) · *R1 alternative: Mon Oct 19, PROVISIONAL* | UNRESOLVED — (R1: Oct 18 \| R2: Oct 18 if start Oct 10, Oct 17 if start Oct 9 \| R3: Oct 18 or Oct 17) | same as Frisco | same | same | same (R3-interp-(ii) = Oct 17 in Pacific, **for either day 1**) | same as LA | same as LA |

In the matrix, "same" means each city was checked individually and the outcome is the same; it does not mean extrapolated (B-R2.2, §D).

**What the US dates do and do not depend on.**
- Oct 18 is the only US day-9 date that does **not** depend on the day-1 choice, because R1 gives it in every city. But a documented alternative (R2 with an Oct 9 start) gives Oct 17, so the cell cannot be graded PROVISIONAL without picking a winner.
- ~~Under **Sequence B** (the start that local sunrise and India's date both give), every documented convention agrees on Oct 10–18. Resolving day 1 to Oct 10 would therefore turn all US cells into PROVISIONAL Oct 10–18 at once.~~ **SUPERSEDED (rev 3):**
  - Under **Sequence B**, R1 and R2 agree on Oct 10–18. Resolving day 1 to Oct 10 would make the US cells **PROVISIONAL Oct 10–18 under R1 and R2**.
  - It would **not** settle them under R3. Under R3-interp-(ii), the **Pacific cities (LA, SF Bay Area, Seattle)** keep **Oct 17** as a live day-9 candidate, which leaves days 2–8 undetermined there.
  - Central and Eastern cities are ambiguous under R3 because "evening" is undefined.
  - So, even with day 1 resolved, US day 9 (and therefore days 2–8) would stay **UNRESOLVED** wherever R3 is considered applicable: certainly in the Pacific cities, and arguably in the Central and Eastern ones.
  - The matrix rows for days 2–9 in the Pacific columns therefore carry this extra, convention-specific uncertainty.
- Resolving day 1 to **Oct 9** would leave a genuine R1-versus-R2 split for the end date (Oct 18 vs Oct 17) and the middle days.

---

## B. 2026 date matrix (nine days × eight locations) — REVISION 1, SUPERSEDED by §B-R2 (kept unedited for the audit trail)

Coordinates and time zones used for every calculation:

| Location | Coordinates used | IANA zone | Drik geoname-id |
|---|---|---|---|
| Hyderabad, India | 17.3850 N, 78.4867 E | `Asia/Kolkata` | 1269843 |
| Frisco, TX | 33.1507 N, 96.8236 W | `America/Chicago` | 4692559 |
| Dallas, TX | 32.7767 N, 96.7970 W | `America/Chicago` | 4684888 |
| New York, NY | 40.7128 N, 74.0060 W | `America/New_York` | 5128581 |
| Chicago, IL | 41.8781 N, 87.6298 W | `America/Chicago` | 4887398 |
| Los Angeles, CA | 34.0522 N, 118.2437 W | `America/Los_Angeles` | 5368361 |
| SF Bay Area, CA | San Francisco 37.7749 N, 122.4194 W **and** San Jose 37.3382 N, 121.8863 W (both checked; identical results) | `America/Los_Angeles` | 5391959 / 5392171 |
| Seattle, WA | 47.6062 N, 122.3321 W | `America/Los_Angeles` | 5809844 |

The four US time zones are treated independently. Each US city was checked separately (§D). They come out the same at the date level, but that is a finding from the calculations, not an assumption.

| Day | Hyderabad | Frisco | Dallas | New York | Chicago | Los Angeles | SF Bay Area | Seattle |
|---|---|---|---|---|---|---|---|---|
| 1 Engili Pula | **VERIFIED** Sat Oct 10 | **UNRESOLVED** — | **UNRESOLVED** — | **UNRESOLVED** — | **UNRESOLVED** — | **UNRESOLVED** — | **UNRESOLVED** — | **UNRESOLVED** — |
| 2 Atukula | **VERIFIED** Sun Oct 11 | PROVISIONAL Sun Oct 11 | PROVISIONAL Sun Oct 11 | PROVISIONAL Sun Oct 11 | PROVISIONAL Sun Oct 11 | PROVISIONAL Sun Oct 11 | PROVISIONAL Sun Oct 11 | PROVISIONAL Sun Oct 11 |
| 3 Muddapappu | **VERIFIED** Mon Oct 12 | PROVISIONAL Mon Oct 12 | PROVISIONAL Mon Oct 12 | PROVISIONAL Mon Oct 12 | PROVISIONAL Mon Oct 12 | PROVISIONAL Mon Oct 12 | PROVISIONAL Mon Oct 12 | PROVISIONAL Mon Oct 12 |
| 4 Nanabiyyam | **VERIFIED** Tue Oct 13 | PROVISIONAL Tue Oct 13 | PROVISIONAL Tue Oct 13 | PROVISIONAL Tue Oct 13 | PROVISIONAL Tue Oct 13 | PROVISIONAL Tue Oct 13 | PROVISIONAL Tue Oct 13 | PROVISIONAL Tue Oct 13 |
| 5 Atla | **VERIFIED** Wed Oct 14 | PROVISIONAL Wed Oct 14 | PROVISIONAL Wed Oct 14 | PROVISIONAL Wed Oct 14 | PROVISIONAL Wed Oct 14 | PROVISIONAL Wed Oct 14 | PROVISIONAL Wed Oct 14 | PROVISIONAL Wed Oct 14 |
| 6 Aligina | **VERIFIED** Thu Oct 15 (date only — observance varies, §A) | PROVISIONAL Thu Oct 15 | PROVISIONAL Thu Oct 15 | PROVISIONAL Thu Oct 15 | PROVISIONAL Thu Oct 15 | PROVISIONAL Thu Oct 15 | PROVISIONAL Thu Oct 15 | PROVISIONAL Thu Oct 15 |
| 7 Vepakayala | **VERIFIED** Fri Oct 16 | PROVISIONAL Fri Oct 16 | PROVISIONAL Fri Oct 16 | PROVISIONAL Fri Oct 16 | PROVISIONAL Fri Oct 16 | PROVISIONAL Fri Oct 16 | PROVISIONAL Fri Oct 16 | PROVISIONAL Fri Oct 16 |
| 8 Vennamuddala | **VERIFIED** Sat Oct 17 | PROVISIONAL Sat Oct 17 | PROVISIONAL Sat Oct 17 | PROVISIONAL Sat Oct 17 | PROVISIONAL Sat Oct 17 | PROVISIONAL Sat Oct 17 | PROVISIONAL Sat Oct 17 | PROVISIONAL Sat Oct 17 |
| 9 Saddula | **VERIFIED** Sun Oct 18 | PROVISIONAL Sun Oct 18 | PROVISIONAL Sun Oct 18 | PROVISIONAL Sun Oct 18 | PROVISIONAL Sun Oct 18 | PROVISIONAL Sun Oct 18 | PROVISIONAL Sun Oct 18 | PROVISIONAL Sun Oct 18 |

### Cell-by-cell justification

**Hyderabad, day 9 (Oct 18) — VERIFIED, category (a).**
- The Telangana State Portal's 2026 General Holidays list says "Oct 18 — Saddula Bathukamma" [S1]. Siasat's report of the same notification agrees [S2].
- Eenadu, 01 Oct 2026, lists "అక్టోబరు 18 - దుర్గాష్టమి; బతుకమ్మ పండుగ" (Oct 18 — Durgashtami; Bathukamma festival) [S13].
- TV9 Telugu, 30 Sep 2026, lists "అక్టోబర్ పద్దెనిమిదవ తారీఖు … సద్దుల బతుకమ్మ" (Oct 18 … Saddula Bathukamma) [S14].
- hindupad lists Oct 18, and also "| 19 October 2026" [S9]; see §E.
- *Caveat:* Drik Panchang's Durga Ashtami for Hyderabad is Oct 19 [S5][S4][S8]. See §E row 1.

**Hyderabad, day 1 (Oct 10) — VERIFIED, categories (a)+(b).**
- Drik Hyderabad labels Oct 10 "Sarva Pitru Amavasya / Darsha Amavasya / Ashwina Amavasya" [S4]. Eenadu: "అక్టోబరు 10 - మహాలయ అమావాస్య" (Oct 10 — Mahalaya Amavasya) [S13]. TV9: Oct 10 is Mahalaya Amavasya and "బతుకమ్మ నవరాత్రులు ఈ రోజు నుంచే ప్రారంభమవుతాయి" (the Bathukamma nine nights begin from this day) [S14].
- Calculated (§D-Hyderabad): Amavasya runs 21:35 IST Oct 9 to 21:19 IST Oct 10. It therefore covers Oct 10's sunrise, aparahna (afternoon window) and sunset. Every tithi convention gives the same day, so there is no convention ambiguity.
- *Note:* the 2026 Telangana government list does **not** list a "Bathukamma Starting Day", although 2018–2023 and 2025 did [S1][S3]. Oct 10, 2026 is a Saturday. A plausible but **unverified** explanation is that it is a second Saturday, already a government holiday [S2], but no source says so.

**Hyderabad, days 2–8 (Oct 11–17) — VERIFIED, category (b), and convention-invariant.**
- With day 1 = Oct 10 and day 9 = Oct 18 both fixed, there are 9 calendar days for 9 named days. A consecutive count is the only arrangement.
- The per-day tithi mapping in [S9][S22][S24] gives the same dates. Drik's Hyderabad month grid [S4] shows the tithi at sunrise as Pratipada Oct 11, Dwitiya 12, Tritiya 13, Chaturthi 14, Panchami 15 (Aligina), Shashthi 16 and Saptami 17. The engine agrees (§D).
- hindupad publishes the same Oct 10–18 list [S9], as does indian.community's India table [S11]. Both are secondary sources with no citations, so they corroborate but are not relied on.
- *What this does not cover:* no Telangana government per-day schedule exists in the evidence.

**US, day 1 — UNRESOLVED in all seven cities. Candidates: Fri Oct 9 or Sat Oct 10.**
- **Oct 9.** Drik's month panchang for all seven US cities labels Oct 9 "Sarva Pitru Amavasya" and "Darsha Amavasya" [S6]. Drik's Dallas Amavasya list labels Oct 9 "Darsha Amavasya" [S7]. Amavasya covers Oct 9's aparahna and sunset in every US city (§D).
- **Oct 10.** Drik labels Oct 10 "Ashwina Amavasya" [S6][S7], and Amavasya is the tithi at local sunrise on Oct 10 in every US city (§D).
- Bathukamma's day 1 is defined as *Mahalaya / Pitru / Pethara Amavasya*, i.e. the ancestors' Amavasya. That points toward the Sarva Pitru day (Oct 9). But **no source I found says which convention Bathukamma follows outside India**, and in Hyderabad the two conventions coincide this year.
- indian.community gives US day 1 = Oct 9 [S11], with no cited basis. hindutone's search snippet implies Oct 10, but the page itself could not be fetched [S12].
- I will not choose between them; see §G item 2.

**US, days 2–8 (Oct 11–17) — PROVISIONAL, category (b).**
- Tithi at local sunrise in all seven cities: Padyami Oct 11, Vidiya 12, Tadiya 13, Chavithi 14, Panchami 15, Shashthi 16, Saptami 17. There is no repeated (kshaya/vriddhi) tithi in that window in any US city (§D). Drik's local "Ghatasthapana / Navratri Begins" is Oct 11 in every city [S6].
- If day 1 turns out to be Oct 9, a strict consecutive count would move days 2–8 to Oct 10–16. That would conflict with the documented per-day mapping (day 2 = Shukla Padyami), because Oct 10 is still Amavasya at US sunrise.
- These cells stay PROVISIONAL, not VERIFIED, because no authoritative source publishes US Bathukamma dates and the day 1 anchor is unresolved.

**US, day 9 (Oct 18) — PROVISIONAL, category (b).**
- Drik's dedicated Durga Ashtami page gives **Sunday, October 18, 2026** for all seven US cities [S5]. Ashtami is present at Oct 18's sunrise, aparahna and sunset in every US city (§D), so every Ashtami-based rule I tested gives Oct 18.
- Oct 18 is also nine days counting from Oct 10, and it equals the Hyderabad official date.
- The only rule giving Oct 17 is "nine days counting from Oct 9" (indian.community [S11]). On Oct 17 there is no Ashtami at any point during daylight in any US city.
- Still PROVISIONAL because the Hyderabad 2026 case shows that "Saddula = Drik's Durga Ashtami" does not always hold (§E row 1). No US-specific authoritative source exists.
- The Chicago association event on Oct 18 [S27] is evidence of that organizer's chosen date only. It is not evidence of the traditional date.

> **Revision 2 note on the box below.** The concern behind it still stands: I
> must not *invent* a sunset rule just because celebrations happen in the
> evening. However, the evening-Ashtami view is not invented. It is
> documented, albeit by a single source [S15]. Rejecting it because the
> government's holiday dates differ was the wrong test (correction 3). It is
> therefore kept as convention **R3** in §B-R2, labelled single-attestation
> and underspecified. The reasoning in the box is **SUPERSEDED**; the box is
> kept unedited below.
>
> **Trap explicitly avoided.** Bathukamma is played and immersed in the
> evening, so it is tempting to adopt an "Ashtami-at-sunset" or "evening"
> rule. **I did not adopt one.**
>
> - The only documented voice for an evening rule is a single astrologer
>   quoted in 2025 (Uppala Ramesh Sharma, [S15]).
> - The Telangana Government did **not** follow that view in 2025: it chose
>   Sep 30 (Ashtami at sunrise), not Sep 29 (Ashtami in the evening).
> - Tested against the 2018–2026 official dates, an evening rule fails in
>   5 of 9 years (§E row 4).
>
> It appears below only as a tested-and-rejected hypothesis.

---

## C. Sources (all accessed 2026-10-01)

| ID | Source | Exact URL / section | Pub. / year | Evidence relied on |
|---|---|---|---|---|
| S1 | Telangana State Portal — Calendar 2026 | https://www.telangana.gov.in/downloads/calendar-2026/ → "List of Holidays - 2026", General Holidays, October | 2026 calendar | Verbatim: "Oct 18 Saddula Bathukamma", "Oct 19 Maharnavami", "Oct 20 Vijaya Dasami", "Oct 21 Following day of Vijaya Dasami". **No "Bathukamma Starting Day" entry** in 2026. Supports Hyd day 9. |
| S2 | Siasat — "List of general, optional holidays in Telangana for 2026" | https://www.siasat.com/list-of-general-optional-holidays-in-telangana-for-2026-3310481/ | 2025/2026 | "October 18: Saddula Bathukamma" (general); "October 19: Maharnavami" (optional); "offices … closed on all Sundays and second Saturdays in 2026". Corroborates S1. |
| S3 | Telangana State Portal — Calendars 2018–2025 | https://www.telangana.gov.in/downloads/calendar-2018/ … `calendar-2023/`, `calendar-2025/`; 2024 list served at https://www.telangana.gov.in/downloads/calendar/ (page heading "List of Holidays - 2024") | 2018–2025 | Verbatim pairs: 2018 "Oct 9 Bathukamma Starting Day / Oct 17 Durgashtami/Maharnavami"; 2019 "Sep 28 / Oct 06 Durgastami"; 2020 "Oct 17 / Oct 24 Durgastami / Maharnavami"; 2021 "Oct 06 / Oct 13 Durgastami"; 2022 "Sep 25 / Oct 03 Durgashtami"; 2023 "Oct 14 / Oct 22 Durgashtami"; 2024 "Oct 10 Durgashtami" (no start day); 2025 "Sep 21 Bathukamma Starting Day / Sep 30 Durgashtami". Used for the mechanism analysis (§E row 4). |
| S4 | Drik Panchang — Month Panchang, Hyderabad, October 2026 | https://www.drikpanchang.com/panchang/month-panchang.html?geoname-id=1269843&date=10/10/2026 | 2026 | Oct 10: "Darsha Amavasya", "Ashwina Amavasya", "Sarva Pitru Amavasya"; Oct 11 "Ghatasthapana / Navratri Begins"; Oct 17 and Oct 18 both show sunrise tithi "Saptami Shukla"; Oct 19 "Durga Ashtami" **and** "Maha Navami"; Oct 20 "Dussehra". (Times printed next to the moon sign in the grid, e.g. "Dhanu 19:33", are Moon-sign transitions, not tithi ends.) |
| S5 | Drik Panchang — Durga Ashtami (Mahashtami) date page, per city | https://www.drikpanchang.com/navratri/durga-puja/mahashtami-date-time.html?geoname-id=GEONAME&year=2026 for each geoname-id in §B; plus Hyderabad `&year=2024` | 2026, 2024 | Hyderabad 2026: "Durgashtami on Monday, October 19, 2026 / Ashtami Tithi Begins - 08:27 AM on Oct 18, 2026 / Ends - 10:51 AM on Oct 19, 2026". Frisco, Dallas, Chicago: "Sunday, October 18, 2026", 09:57 PM Oct 17 → 12:21 AM Oct 19. New York: Oct 18, 10:57 PM Oct 17 → 01:21 AM Oct 19. LA, SF, San Jose, Seattle: Oct 18, 07:57 PM Oct 17 → 10:21 PM Oct 18. Hyderabad 2024: "Durgashtami on Friday, October 11, 2024", 12:31 PM Oct 10 → 12:06 PM Oct 11. |
| S6 | Drik Panchang — Month Panchang Oct 2026 for each US city | `https://www.drikpanchang.com/panchang/month-panchang.html?geoname-id=GEONAME&date=10/10/2026` (geoname-ids in §B) | 2026 | All seven US cities: Oct 9 "Sarva Pitru Amavasya", "Darsha Amavasya"; Oct 10 "Ashwina Amavasya"; Oct 11 "Ghatasthapana"; Oct 18 "Durga Ashtami"; Oct 19 "Maha Navami"; Oct 20 "Dussehra". |
| S7 | Drik Panchang — 2026 Amavasya dates, Dallas | https://www.drikpanchang.com/vrats/amavasyadates.html?geoname-id=4684888&year=2026 (October entries) | 2026 | "October 9, 2026, Friday — Darsha Amavasya … Begins - 11:05 AM, Oct 09; Ends - 10:49 AM, Oct 10"; "October 10, 2026, Saturday — Ashwina Amavasya" (same boundaries). This is the reported "Oct 9 Amavasya" lead: it is the *Darsha* day, and the same page lists Oct 10 as Ashwina Amavasya. |
| S8 | Drik Panchang — 2026 Telugu Calendar, Hyderabad | https://www.drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843&date=15/10/2026 | 2026 | "Navratri Begins — October 11 (Asvayujamu, Sukla Padyami)"; "Durga Ashtami — October 19, 2026, Monday (Asvayujamu, Sukla Ashtami)"; "Maha Navami — October 19". No Bathukamma entry. |
| S9 | HinduPad — "9 Days of Bathukamma Festival" (Naveen Sanagala) | https://hindupad.com/9-days-bathukamma-festival/ | published 2026-09-18, modified 2026-09-23 (page JSON-LD) | Days 1–9 = 10–18 Oct 2026, with "9th day – Saddhula Bathukamma – 18 October 2026 \| 19 October 2026". Per-day tithi mapping; Aligina "Bathukamma is not prepared on this and not offered any naivedyam"; "ends with Saddula Bathukamma on Durga Ashtami day and in few instances on Mahanavami day". No sources cited. |
| S10 | HinduPad — "Aligina Bathukamma" | https://hindupad.com/aligina-bathukamma-alaka-bathukamma/ | 2025 edition | "Women do not prepare Bathukamma but play Bathukamma"; "falls on Ashwayuja Shuddha Panchami"; "In 2025, Aligina Bathukamma date is September 26" (see §E row 7). |
| S11 | Indian Community — "Bathukamma: Telangana's Flower Festival — Dates…" | https://indian.community/bathukamma-festival/ → "Bathukamma 2026 Dates in India" and "Bathukamma In USA … 2026 Dates" | published/modified 2026-03-05 | India: Oct 10–18. "Bathukamma In USA 2026 Dates: Day 1 — October 9, 2026 … Day 9 — October 17, 2026"; Canada the same; UK/UAE/Singapore/Australia Oct 10–18. Also states it is "observed from Mahalaya Amavasya (Pitru Amavasya) to Durgashtami". No method or sources. |
| S12 | Hindutone — "Dussehra & Bathukamma 2026 USA" | https://hindutone.com/festivals/dussehra-bathukamma-2026-usa/ | — | **Could not be fetched** (curl/WebFetch: DNS `EAI_AGAIN`; no Wayback snapshot). Only a search-engine summary was seen, claiming "October 10, 2026, to October 18, 2026". **Not relied on for any cell.** |
| S13 | Eenadu — "ఈసారి దసరా ఎప్పుడు? అక్టోబరులో పండగలు" | https://www.eenadu.net/telugu-article/astrology/festivals-in-october-2026-telugu/2201/126177729 | Published 01 Oct 2026 16:19 IST | "అక్టోబరు 10 - మహాలయ అమావాస్య"; "అక్టోబరు 18 - దుర్గాష్టమి; బతుకమ్మ పండుగ"; "అక్టోబరు 19 - మహానవమి"; "అక్టోబరు 20 - విజయదశమి". |
| S14 | TV9 Telugu — "అక్టోబర్‌లోనే బతుకమ్మ, దసరా…" (Rajashekher G) | https://tv9telugu.com/spiritual/october-2026-a-comprehensive-guide-to-telugu-festivals-and-important-dates-1923157.html | Updated 30 Sep 2026 | Oct 10 "మహాలయ అమావాస్య … ఈ రోజునే సద్దుల బతుకమ్మ పండుగ కూడా వస్తుంది. బతుకమ్మ నవరాత్రులు ఈ రోజు నుంచే ప్రారంభమవుతాయి"; Oct 18 "సద్దుల బతుకమ్మ"; Oct 19 "దుర్గాష్టమి, మహర్నవమి". (See §E: an internal error.) |
| S15 | Deccan Chronicle — "Bathukamma Date Confusion Splits Warangal, Hanamkonda" | https://www.deccanchronicle.com/southern-states/telangana/bathukamma-date-confusion-splits-warangal-hanamkonda-1906805 | 28 Sep 2025 | Bhadrakali Temple (Sheshu Sharma): Sept 30 "as only the tithi at sunrise is taken into consideration"; Thousand Pillar Temple (Gangu Upendra Sharma): "strictly for nine days … ninth day will be on Monday, September 29"; astrologer Uppala Ramesh Sharma: Monday, "as Bathukammas are traditionally immersed in the evening"; "The state government's official directive … Saddula Bathukamma on Tuesday, September 30". |
| S16 | Telangana Today — "Saddula Bathukamma on October 13, Vidwat Sabha decides" | https://telanganatoday.com/saddula-bathukamma-on-october-13-vidwat-sabha-decides | 12 Oct 2021 | Telangana Vidwat Sabha decided Oct 13, 2021 ("Ashtami is falling on the 8th day"); Telangana Archakas' Federation president Gangu Upendra Sharma: Oct 14; regional lengths of 7, 13, and 5/7/9 days. |
| S17 | Bizz Buzz — "Grand Celebrations of Saddula Bathukamma Scheduled for October 10 at Tank Bund" | https://www.bizzbuzz.news/State/Telangana/grand-celebrations-of-saddula-bathukamma-scheduled-for-october-10-at-tank-bund-1338854 | 9 Oct 2024 | Chief Secretary: Saddula Bathukamma Oct 10, 2024. Same article: "culminating on Durgashtami … In 2024 … Durgashtami on October 11" (internally inconsistent). |
| S18 | Jayashankar Bhoopalpally District (Govt. of Telangana) — Bathukamma | https://bhoopalapally.telangana.gov.in/festival/bathukamma/ | site footer "Last Updated: Sep 29, 2026" (site-wide, not necessarily this text) | Day list 1–9 including "Day 6: Aligina Bathukamma (alaka Bathukamma)". **Error:** "starting Bhadrapada Purnima (also known as Mahalaya Amavasya or Pitru Amavasya)". |
| S19 | Vikarabad District (Govt. of Telangana) — Bathukamma | https://vikarabad.telangana.gov.in/festival/bathukamma/ | footer "Last Updated: Sep 26, 2026" | **Errors:** "starting Bhadrapada Pournami (also known as Mahalaya Amavasya…)"; "culminate on 'Saddula Bathukamma' … on Ashwayuja Navami, popularly known as Durgashtami which is two days before Dussehra"; stale "The 2017 dates are 20–28 September"; Wikipedia-style "[3]" and "[6]" markers left in the text. |
| S20 | Incredible India (Ministry of Tourism, Govt. of India) — Bathukamma | https://www.incredibleindia.gov.in/en/festivals-and-events/telangana/bathukamma | undated | "begins on the day of Mahalaya Amavasya … and concludes on the ninth day, two days before Dussehra.. The festival culminates on Dussehra, two days before which is the 'Saddula Bathukamma'" (self-contradictory). |
| S21 | ETV Bharat Telugu — "ప్రకృతి పండుగ బతుకమ్మ…" | https://www.etvbharat.com/te/!state/story-behind-bathukamma-festival-impartance-in-telangana-state-telangana-news-tgs24092603063 | 2024 (inferred from URL slug `tgs240926…`; date not confirmed on page) | Full Telugu list of all nine names; "భాద్రపద బహుళ అమావాస్య నుంచి ఆశ్వయుజ శుక్ల అష్టమి వరకూ"; Aligina: "బతుకమ్మ ఆట ఆడరు". |
| S22 | Andhra Jyothy — "ఆరోరోజు అలిగిన బతుకమ్మ…" | https://www.andhrajyothy.com/2024/telangana/aligina-bathumma-special-story-hyderabad-telangana-suchi-1319398.html | 2024 | Days 1–5 named (incl. "నానే బియ్యం"); Aligina "ఆశ్వయుజ శుద్ధ పంచమి (సోమవారం)"; no Bathukamma made and no naivedyam; alternative "అర్రెం / అలసిన బతుకమ్మ" rest-day account. |
| S23 | V6 Velugu — "బతుకమ్మ ప్రసాదాలు.. 9 రోజులు" | https://www.v6velugu.com/bathukamma-special-2024-9-different-recipes-in-9-days-bathukamma-festival | 2024 | Day list (day 4 heading absent in the extracted text); Aligina: "ఈ రోజు బతుకమ్మ ఆడరు. కొన్ని చోట్ల బతుకమ్మ ఆడతారు. కానీ ప్రసాదం ఇవ్వరు"; researcher Tirunagari Devaki Devi: day 6 is a rest day. |
| S24 | Wikipedia (English) — Bathukamma | https://en.wikipedia.org/wiki/Bathukamma → "Each day…" list | accessed 2026 | Days 1–9 with tithi mapping and naivedyam; Aligina "No food offering is made"; Saddula "on ashtami … coincides with Durgashtami". Tertiary; used only for names and the claimed mapping. |
| S25 | Wikipedia (Telugu) — బతుకమ్మ | https://te.wikipedia.org/wiki/బతుకమ్మ | accessed 2026 | Telugu day list. **Omits Nanabiyyam**: 8 entries under a "9 days" heading. Says Saddula falls "దసరా కి రెండు రోజుల ముందు" (two days before Dasara). |
| S26 | AbhiBus blog — "Bathukamma Festival 2024" | https://www.abhibus.com/blog/bathukamma-festival/ | 2024 | "Day 6 – Aligina or Arremu or Alaka Bathukamma … doesn't involve Naivedyam preparation". Alias only. |
| S27 | Telugu Association of Greater Chicago — "TAGC Batukamma 2026" | https://www.tagc.org/event/upcoming/tagc-batukamma-2026?eid=40185 | 2026 | "Oct 18, 2026 12:00 PM -to- Oct 18, 2026 07:00 PM (EST)" (Chicago is on CDT; the time-zone label is the organizer's). **Organizer event date only.** |
| S28 | Office Holidays — Saddula Bathukamma in Telangana | https://www.officeholidays.com/holidays/india/telangana/india-telangana-bathukamma | accessed 2026 | Lists 2026 "Sun, Oct 18", but 2025 "Sun, Sep 21" (= the 2025 *start* day) and 2024 "Wed, Oct 2" (= the 2024 start day) under the same "Saddula" heading: inconsistent labels. Names list only. |
| S29 | TeachersBadi — "TG General Holidays 2026" | https://teachersbadi.in/telangana-general-holidays-and-optiona/ | — | Rows labelled 2026 show "Bathukamma Starting Day 21-09-2026 Sunday" and "Vijaya Dasami 12-10-2026 2nd Saturday". These are the 2025 and 2024 lists with the year changed (weekdays match 2025/2024). **Rejected.** |
| S30 | temples.bio — Bathukamma 2026 | https://www.temples.bio/festivals/bathukamma | "Last updated: October 1, 2026" | Self-contradictory: "Sunday, October 11, 2026" vs FAQ "September 11 to September 19"; "Dasami (Durga Ashtami)"; "ending on Mahalaya Amavasya/Durgashtami". **Rejected.** |
| S31 | National Today — Bathukamma Starting Day | https://nationaltoday.com/bathukamma-starting-day/ | updated Jun 11, 2026 | "October 10, 2026". Secondary, no method; corroboration only. |
| S32 | Sakshi Post — Bathukamma 2025 / Saddula 2025 | https://www.sakshipost.com/news/telangana/bathukamma-2025-dates-rituals-and-types-flowers-used-festival-454293 ; https://www.sakshipost.com/news/telangana/saddula-bathukamma-2025-date-significance-and-celebrations-telangana-457977 | Sep 2025 | 2025: start Sep 21; end "Monday, September 29, 2025" in one article and "September 29–30" in the other. Shows the 2025 split reached the press. |
| S33 | This repo's Panchanga engine | `lib/panchanga/engine.ts` @ `27e3bae` (mhah-panchang 1.2.0, Lahiri-family ayanamsa; SunCalc sunrise at −0.833°) | — | Copied unchanged into a scratch directory outside the repo and run there with Node 24's TypeScript type stripping. Results in §D. Cross-check only. |
| S34 | This repo's festival catalogue | `lib/panchanga/festival-rules.ts`, entry `id: "bathukamma-begins"` @ `27e3bae` | — | Currently `method: "deferred"`. Its prose says "Ashvina Krishna Padyami" for day 1 and "Ashvina Krishna Navami / Durgashtami-adjacent" for Saddula. Both conflict with the evidence above (see §E row 9). **Not modified.** |
| S35 | Drik Panchang — 2026 Amavasya dates, **one page per location** (revision 2) | `https://www.drikpanchang.com/vrats/amavasyadates.html?geoname-id=GEONAME&year=2026` for 1269843 (Hyderabad), 4692559 (Frisco), 4684888 (Dallas), 5128581 (New York City), 4887398 (Chicago), 5368361 (Los Angeles), 5391959 (San Francisco), 5392171 (San Jose), 5809844 (Seattle) | 2026 | Each page's October entries, read separately. Hyderabad: "October 10, 2026, Saturday — Darsha Amavasya, Ashwina Amavasya; Begins 09:35 PM Oct 09; Ends 09:19 PM Oct 10". Every US page: "October 9, 2026, Friday — Darsha Amavasya" and "October 10, 2026, Saturday — Ashwina Amavasya", with local boundaries: Frisco/Dallas/Chicago 11:05 AM Oct 09 → 10:49 AM Oct 10; New York City 12:05 PM → 11:49 AM; Los Angeles/San Francisco/San Jose/Seattle 09:05 AM → 08:49 AM. Each page names its own city in its local-time note. |

---

## D. Local tithi-boundary evidence

**Method.** I ran `computePanchanga` / `aparahnaWindow` from the repo's own `lib/panchanga/engine.ts` [S33] for each city and each date. "Sunrise" means the tithi prevailing at local sunrise. "Aparahna" is the window [sunrise + 3D/5, sunrise + 4D/5], where D is the length of the day, as in the repo's existing aparahna rule. "Sunset" means the tithi at local sunset. All times are local wall-clock (IST, CDT, EDT, PDT) for the IANA zones in §B.

**Cross-check against Drik.** The engine's tithi boundaries match Drik's published boundaries to within 1 minute:
- Hyderabad Ashtami: 08:28 → 10:51 (Drik 08:27 → 10:51).
- Dallas Amavasya: 11:05 Oct 9 → 10:49 Oct 10 (Drik identical) [S7].
- Frisco Ashtami: 21:58 (Drik 21:57).

Which convention applies is stated per row. The date chosen for each matrix cell is explained in §B, not here.

### D.0 Revision 2: per-city check of the contested day-1 Amavasya boundary

In revision 1, the Drik boundary times for Amavasya were read only from the Dallas page [S7]. The engine had already been run separately for every city. For revision 2, each location's own Drik Amavasya page was fetched [S35] and compared one by one with that city's engine result.

| Location | Drik [S35] Amavasya (local) | Engine (local) | Match | Drik label Oct 9 / Oct 10 |
|---|---|---|---|---|
| Hyderabad | 21:35 Oct 9 → 21:19 Oct 10 IST | 21:35 → 21:19 | exact | — / Darsha + Ashwina Amavasya (both Oct 10) |
| Frisco | 11:05 Oct 9 → 10:49 Oct 10 CDT | 11:05 → 10:49 | exact | Darsha / Ashwina |
| Dallas | 11:05 → 10:49 CDT | 11:05 → 10:49 | exact | Darsha / Ashwina |
| Chicago | 11:05 → 10:49 CDT | 11:05 → 10:49 | exact | Darsha / Ashwina |
| New York | 12:05 → 11:49 EDT | 12:05 → 11:49 | exact | Darsha / Ashwina |
| Los Angeles | 09:05 → 08:49 PDT | 09:05 → 08:49 | exact | Darsha / Ashwina |
| San Francisco | 09:05 → 08:49 PDT | 09:05 → 08:49 | exact | Darsha / Ashwina |
| San Jose | 09:05 → 08:49 PDT | 09:05 → 08:49 | exact | Darsha / Ashwina |
| Seattle | 09:05 → 08:49 PDT | 09:05 → 08:49 | exact | Darsha / Ashwina |

**Result.**
- All seven US cities were individually confirmed by two separate checks: Drik's page for that city, and the engine run for that city.
- They share the outcome "Amavasya at the Oct 10 sunrise, and in the Oct 9 afternoon and evening". The reason is that every US sunrise falls before the Oct 10 Amavasya end in that city's own zone (Pacific 08:49, Central 10:49, Eastern 11:49). Identical clock times within a zone follow from the boundary being a single instant. *(Rev 3: the matching **dates** follow from each city's own sunrise and aparahna checks agreeing, not from the zone. A same-zone city whose sunrise or afternoon fell on the other side of a boundary would get a different date.)*
- **No city's result was copied from another city.**

Revision 1's phrases "spans as Frisco" and "spans as Los Angeles" in D.3, D.5, D.7 and D.8 should be read as: *computed separately for this city; the clock times are identical because the city shares the same IANA zone.*

### D.1 Hyderabad (`Asia/Kolkata`)

Tithi spans: Amavasya **09 Oct 21:35 → 10 Oct 21:19**; Padyami → 11 Oct 21:30; Vidiya → 12 Oct 22:13; Tadiya → 13 Oct 23:27; Chavithi → 15 Oct 01:13; Panchami → 16 Oct 03:25; Shashthi → 17 Oct 05:54; Saptami **17 Oct 05:54 → 18 Oct 08:28**; Ashtami **18 Oct 08:28 → 19 Oct 10:51**; Navami → 20 Oct 12:50.

| Date | Sunrise (tithi) | Aparahna (tithi) | Sunset (tithi) |
|---|---|---|---|
| Oct 9 | 06:08 Chaturdashi | 13:15–15:38 Chaturdashi | 18:00 Chaturdashi |
| Oct 10 | 06:08 **Amavasya** | 13:15–15:37 **Amavasya** | 17:59 **Amavasya** |
| Oct 11–16 | Padyami, Vidiya, Tadiya, Chavithi, Panchami, Shashthi at sunrise (in order) | — | — |
| Oct 17 | 06:10 Saptami | 13:13–15:33 Saptami | 17:54 Saptami |
| Oct 18 | 06:10 **Saptami (vriddhi — second sunrise)** | 13:12–15:33 **Ashtami** | 17:53 **Ashtami** |
| Oct 19 | 06:11 **Ashtami** | 13:12–15:32 Navami | 17:53 Navami |

What this shows:
- Day 1 is Oct 10 under every convention.
- Saptami prevails at two consecutive sunrises (Oct 17 and 18). This is a vriddhi (repeated) tithi.
- Ashtami prevails at only one sunrise, Oct 19. That makes Oct 19 the tithi-at-sunrise Durga Ashtami, which is Drik's date [S5].
- Ashtami also covers Oct 18's afternoon and evening. That is the day Telangana chose [S1].
- With a consecutive count, the vriddhi Saptami is what makes "day 9 (Oct 18)" and "the day with Ashtami at sunrise (Oct 19)" fall on different dates.

### D.2 Frisco, TX (`America/Chicago`, CDT)

Amavasya **09 Oct 11:05 → 10 Oct 10:49**; Padyami → 11 Oct 11:00; Vidiya → 12 Oct 11:43; Tadiya → 13 Oct 12:57; Chavithi → 14 Oct 14:43; Panchami → 15 Oct 16:55; Shashthi → 16 Oct 19:24; Saptami → 17 Oct 21:58; Ashtami **17 Oct 21:58 → 19 Oct 00:21**.

| Date | Sunrise | Aparahna | Sunset |
|---|---|---|---|
| Oct 9 | 07:28 Chaturdashi | 14:25–16:44 **Amavasya** | 19:03 **Amavasya** |
| Oct 10 | 07:28 **Amavasya** | 14:24–16:43 Padyami | 19:01 Padyami |
| Oct 17 | 07:34 Saptami | 14:21–16:37 Saptami | 18:53 Saptami |
| Oct 18 | 07:35 **Ashtami** | 14:21–16:36 **Ashtami** | 18:52 **Ashtami** |
| Oct 19 | 07:35 Navami | 14:20–16:35 Navami | 18:50 Navami |

Each tithi from Padyami to Saptami prevails at exactly one sunrise (Oct 11–17), so there is no vriddhi or kshaya.

### D.3 Dallas, TX (`America/Chicago`, CDT)

Tithi spans are identical to Frisco (same zone, same instants). Sunrises are 07:27 Oct 9, 07:28 Oct 10, 07:33 Oct 17, 07:34 Oct 18. Aparahna Oct 9 is 14:25–16:44 (Amavasya). Aparahna Oct 10 is 14:24–16:43 (Padyami). Sunset Oct 17 is 18:53 (Saptami); sunset Oct 18 is 18:52 (Ashtami). The per-day classification is the same as Frisco. Drik's own Dallas Amavasya boundaries (11:05 AM Oct 9 → 10:49 AM Oct 10) match exactly [S7].

### D.4 New York, NY (`America/New_York`, EDT)

Amavasya **09 Oct 12:05 → 10 Oct 11:49**; Saptami **16 Oct 20:24 → 17 Oct 22:58**; Ashtami **17 Oct 22:58 → 19 Oct 01:21**.

| Date | Sunrise | Aparahna | Sunset |
|---|---|---|---|
| Oct 9 | 07:01 Chaturdashi | 13:53–16:10 **Amavasya** | 18:27 **Amavasya** |
| Oct 10 | 07:02 **Amavasya** | 13:52–16:09 Padyami | 18:25 Padyami |
| Oct 17 | 07:10 Saptami | 13:48–16:01 Saptami | 18:14 Saptami |
| Oct 18 | 07:11 **Ashtami** | 13:48–16:00 **Ashtami** | 18:13 **Ashtami** |
| Oct 19 | 07:12 Navami | 13:48–15:59 Navami | 18:11 Navami |

### D.5 Chicago, IL (`America/Chicago`, CDT)

Spans as Frisco.

| Date | Sunrise | Aparahna | Sunset |
|---|---|---|---|
| Oct 9 | 06:57 Chaturdashi | 13:47–16:04 **Amavasya** | 18:20 **Amavasya** |
| Oct 10 | 06:58 **Amavasya** | 13:46–16:02 Padyami | 18:19 Padyami |
| Oct 17 | 07:06 Saptami | 13:43–15:55 Saptami | 18:07 Saptami |
| Oct 18 | 07:07 **Ashtami** | 13:42–15:54 **Ashtami** | 18:06 **Ashtami** |
| Oct 19 | 07:08 Navami | 13:42–15:53 Navami | 18:04 Navami |

### D.6 Los Angeles, CA (`America/Los_Angeles`, PDT)

Amavasya **09 Oct 09:05 → 10 Oct 08:49**; Saptami **16 Oct 17:24 → 17 Oct 19:58**; Ashtami **17 Oct 19:58 → 18 Oct 22:21**; Navami → 20 Oct 00:20.

| Date | Sunrise | Aparahna | Sunset |
|---|---|---|---|
| Oct 9 | 06:54 Chaturdashi | 13:50–16:09 **Amavasya** | 18:28 **Amavasya** |
| Oct 10 | 06:55 **Amavasya** | 13:50–16:08 Padyami | 18:26 Padyami |
| Oct 17 | 07:00 Saptami | 13:47–16:02 Saptami | 18:18 Saptami (Ashtami begins 19:58, after sunset) |
| Oct 18 | 07:01 **Ashtami** | 13:46–16:01 **Ashtami** | 18:16 **Ashtami** |
| Oct 19 | 07:02 Navami | 13:46–16:01 Navami | 18:15 Navami |

Pacific-specific note: Ashtami begins at 19:57–19:58 PDT on Oct 17, during the evening of Oct 17. This is the only US zone where the Saturday-evening gathering time falls inside Ashtami. A rule based on "evening" presence could therefore pick Oct 17 here. That rule is not adopted (see the trap note in §B).

*Rev 3 corrections to this note:*
- "That rule is not adopted" was already superseded in revision 2. R3 is kept.
- "The only US zone where the Saturday-evening gathering time falls inside Ashtami" assumes a gathering time that no source specifies. Whether 21:58 CDT or 22:57 EDT counts as "evening" is undefined, so this phrase is my interpretation and is superseded.
- The Oct 17 possibility applies **even if day 1 = Oct 10**.

### D.7 San Francisco Bay Area, CA (`America/Los_Angeles`, PDT)

Spans as Los Angeles.

| Date | San Francisco sunrise / aparahna / sunset | San Jose sunrise / aparahna / sunset |
|---|---|---|
| Oct 9 | 07:13 Chaturdashi / 14:06–16:24 **Amavasya** / 18:42 **Amavasya** | 07:11 Chaturdashi / 14:04–16:22 **Amavasya** / 18:40 **Amavasya** |
| Oct 10 | 07:14 **Amavasya** / 14:06–16:23 Padyami / 18:41 Padyami | 07:12 **Amavasya** / 14:04–16:21 Padyami / 18:39 Padyami |
| Oct 17 | 07:21 Saptami / 14:03–16:17 Saptami / 18:31 Saptami | 07:18 Saptami / 14:01–16:15 Saptami / 18:29 Saptami |
| Oct 18 | 07:22 **Ashtami** / 14:02–16:16 **Ashtami** / 18:29 **Ashtami** | 07:19 **Ashtami** / 14:00–16:14 **Ashtami** / 18:28 **Ashtami** |
| Oct 19 | 07:23 Navami | 07:20 Navami |

### D.8 Seattle, WA (`America/Los_Angeles`, PDT)

Spans as Los Angeles.

| Date | Sunrise | Aparahna | Sunset |
|---|---|---|---|
| Oct 9 | 07:20 Chaturdashi | 14:05–16:19 **Amavasya** | 18:34 **Amavasya** |
| Oct 10 | 07:22 **Amavasya** | 14:04–16:18 Padyami | 18:32 Padyami |
| Oct 17 | 07:32 Saptami | 14:00–16:10 Saptami | 18:19 Saptami |
| Oct 18 | 07:33 **Ashtami** | 14:00–16:08 **Ashtami** | 18:17 **Ashtami** |
| Oct 19 | 07:35 Navami | 13:59–16:07 Navami | 18:15 Navami |

### D.9 Why US dates are not "India minus 9½–12½ hours"

Tithi boundaries are instants that are the same everywhere in the world. Sunrise is local. In Hyderabad, Saptami (the 7th lunar day) prevails at two sunrises and Ashtami at one (Oct 19). In every US city, Saptami prevails at only one sunrise (Oct 17) and Ashtami at Oct 18's sunrise. The *result* differs (Durga Ashtami is Oct 19 in Hyderabad but Oct 18 in the US) because the US sunrise falls at a different point in the same tithi span. No fixed offset produces this, which is why each city was calculated separately.

---

## E. Contradictions found and assessment

| # | Claim A (source) | Claim B (source) | Assessment |
|---|---|---|---|
| 1 | **Hyderabad: Saddula Bathukamma = Sun Oct 18** (Telangana Govt. [S1][S2]; Eenadu [S13] puts *Durgashtami* on Oct 18 too; TV9 [S14]; hindupad [S9]) | **Hyderabad: Durga Ashtami = Mon Oct 19** (Drik: dedicated page [S5], Telugu calendar [S8], month grid [S4]; TV9 also lists Durgashtami on Oct 19 [S14]) | **For Saddula Bathukamma in Hyderabad, Oct 18 is the more credible date:** it is the official state date, two major Telugu outlets agree, and it is exactly 9 days counting from Mahalaya Amavasya. **For "Durga Ashtami" itself, this is a genuine convention split that I cannot settle.** Drik uses tithi-at-sunrise: Ashtami 08:27 Oct 18 → 10:51 Oct 19, and only Oct 19 has it at sunrise. Telangana and Eenadu pick the day on which Ashtami covers the afternoon and evening. **Precedent:** in 2024 the Government listed Durgashtami on Oct 10 [S3] while Drik had Oct 11 [S5]. The Chief Secretary announced Saddula for Oct 10, 2024 [S17]. So the definition "Saddula = Durga Ashtami" only holds if one says *whose* Ashtami is meant. |
| 2 | **US: Oct 9–17** (indian.community [S11]) | **US: Oct 10–18** (hindutone [S12], search snippet only; the page was unreachable) | **Why they differ.** In every US city Amavasya runs from mid-morning Oct 9 to mid-morning Oct 10. Drik marks **Oct 9** as Sarva Pitru (Mahalaya) Amavasya, where Amavasya covers the afternoon, and **Oct 10** as "Ashwina Amavasya", where it covers sunrise [S6][S7]. indian.community appears (inferred; it states no method) to have taken US Mahalaya Amavasya = Oct 9 and counted 9 days to Oct 17. **That end date contradicts the site's own definition** ("from Mahalaya Amavasya … to Durgashtami"), because Drik puts Durgashtami on **Oct 18** for all US cities [S5], and Oct 17 has no Ashtami during daylight anywhere in the US (§D). Oct 10–18 matches both the India dates and US tithi-at-sunrise; whether hindutone derived it that way or simply copied India's dates cannot be checked. **Assessment:** the US **end** date of Oct 18 is better supported than Oct 17 (PROVISIONAL). The US **start** date (Oct 9 vs Oct 10) is **unresolved**. |
| 3 | Dallas "Amavasya on Oct 9" (Drik Dallas list [S7]) | Dallas "Ashwina Amavasya on Oct 10" (same page [S7]; month grid [S6]) | **Not an error.** It is two observance conventions on one Drik page: Darsha/Sarva Pitru Amavasya (afternoon-based) = Oct 9; the named-tithi day (sunrise-based) = Oct 10. The boundaries match the engine exactly. This is the root of contradiction 2. |
| 4 | **Telangana's choice of Saddula / Durgashtami is not reproduced by any single rule I tested** (official dates 2018–2026 [S1][S3]) | — | The engine was tested against the official Hyderabad dates. Each candidate rule failed in at least one year (✗ = rule gives a different date from the official one): **R1** tithi at sunrise: ✗ 2024, 2026. **R2** start + 8 days (strict nine days): ✗ 2020, 2021, 2025. **R3** Ashtami at sunset ("evening"): ✗ 2018, 2019, 2020, 2022, 2025. **R4** first day on which Ashtami touches daylight: ✗ 2018, 2019, 2020, 2025. The official span from start to Saddula was **8 days** in 2020 and 2021, **10 days** in 2025, and 9 days in the other years. **Conclusion:** the official end date is a per-year decision, guided by scholars (the 2021 Vidwat Sabha [S16]) and the Government directive (2025 [S15]). Nine days is the nominal length, not a fixed count. I **did not** fit a more complex rule to these nine data points; that would be inventing a convention. |
| 5 | 2025 Saddula = **Sep 30**: Govt. directive [S15][S3]; Bhadrakali Temple, Warangal, using tithi at sunrise [S15] | 2025 Saddula = **Sep 29**: Thousand Pillar Temple, Hanamkonda ("strictly for nine days"), and an astrologer ("immersed in the evening") [S15]; Sakshi Post "September 29" [S32] | A documented, unresolved split between institutions. It shows three conventions in active use: sunrise tithi, a strict 9-day count, and an evening-Ashtami view. In 2025 the Government sided with sunrise tithi. In 2024 and 2026 it sided against it. |
| 6 | 2021 Saddula = **Oct 13**: Telangana Vidwat Sabha ("Ashtami is falling on the 8th day") [S16]; Govt. list [S3] | 2021 Saddula = **Oct 14**: Telangana Archakas' Federation president [S16] | Same split as row 5, an 8-day year. Unresolvable in general. Relevant because it shows there is no consensus rule. |
| 7 | Aligina falls on "Ashwayuja Shuddha Panchami" (hindupad [S10]; Andhra Jyothy [S22]; Wikipedia [S24]) | hindupad's own 2025 Aligina date was **Sep 26**, when the tithi at Hyderabad sunrise was **Chaturthi** (Panchami began 09:33 that day). Andhra Jyothy's 2024 "Panchami (Monday)" = Oct 7, 2024, when the tithi at sunrise was Chaturthi (Panchami began 09:47). Calculated by the engine. | The per-day tithi labels in the prose are **nominal**. In practice the named days follow a **consecutive count** from day 1. The tithi label holds only in years with no kshaya/vriddhi. In 2026 the two agree for days 1–8 in every location, so the matrix is not affected. The rule for years where they disagree is UNRESOLVED (§G item 4). |
| 8 | hindupad: "9th day – Saddhula Bathukamma – 18 October 2026 \| 19 October 2026" [S9] | hindupad, same page: the festival "ends with Saddula Bathukamma on Durga Ashtami day and in few instances on Mahanavami day" | The page hedges between two dates and offers no rule. Treated as corroboration of Oct 18 only, not as a source of truth. |
| 9 | Repo `festival-rules.ts` `bathukamma-begins`: day 1 = "Ashvina Krishna Padyami"; Saddula = "Ashvina Krishna Navami / Durgashtami-adjacent" [S34] | Every source: day 1 = Mahalaya (Bhadrapada Krishna, amanta) **Amavasya**; Saddula = Ashvayuja **Shukla Ashtami** (Durgashtami) [S9][S15][S18][S21][S24] | **The repo's deferred catalogue prose is wrong on both points.** Padyami is not Amavasya, and the Krishna paksha is not the Shukla paksha. The entry is `method: "deferred"`, so nothing user-facing is affected. **Not modified here (out of scope).** It must be corrected before any implementation. |
| 10 | **Official-source narrative errors** (flagged plainly; official origin does not make the sentence correct) | | (i) Bhoopalpally District, Govt. of Telangana [S18]: "Bhadrapada **Purnima** (also known as Mahalaya **Amavasya**…)". Purnima is the full moon and Amavasya the new moon; they cannot be the same day. (ii) Vikarabad District, Govt. of Telangana [S19]: the same "Bhadrapada **Pournami** (also known as Mahalaya Amavasya)" error, **plus** "Ashwayuja **Navami**, popularly known as **Durgashtami**". Navami is the 9th tithi and Ashtami the 8th. It also says "two days before Dussehra", which fits Ashtami, not Navami. It still shows stale "2017 dates" and copied Wikipedia markers. (iii) Incredible India, Govt. of India [S20]: "concludes on the ninth day, two days before Dussehra" and also "culminates on Dussehra". (iv) TV9 Telugu [S14]: says Saddula Bathukamma falls on Oct 10 (Mahalaya Amavasya), then lists Saddula again on Oct 18. Oct 10 is Engili Pula. TV9 also places Saddula (Oct 18) on a different day from its own Durgashtami (Oct 19). (v) Telangana Today 2021 [S16]: "ends with Saddula Bathukamma on the 9th day of ashtami" (garbled). (vi) Bizz Buzz 2024 [S17]: Durgashtami Oct 11 vs Saddula Oct 10 in one article, without explaining the difference. (vii) Telugu Wikipedia [S25]: nine-day heading but eight entries (Nanabiyyam missing). (viii) Office Holidays [S28], TeachersBadi [S29], temples.bio [S30]: mislabelled or recycled years. None of these errors was silently "fixed". None was relied on for a date. |

### §E revision-2 notes (2026-10-01)

These notes supersede parts of rows 1, 2 and 4. The rows above are kept unedited.

- **Row 4, re-assessed (correction 3).** Revision 1 concluded that each rule "failed" in some years and treated that as disqualifying. That was the wrong test.
  - The Telangana Government holiday list (**C-GOV**) is its own convention. It is official and administrative, and its underlying rule is not published. It may weigh practical factors such as weekdays and scheduling that a traditional tithi rule does not.
  - Re-graded by asking whether each rule is attested as a real convention:
    - **R1 (tithi at sunrise): documented** [S15], and is Drik's Durga Ashtami method [S5]. It coincides with C-GOV in 2018–2023 and 2025 and differs in 2024 and 2026. **Kept.**
    - **R2 (strict nine days): documented** [S15][S16]. It coincides with C-GOV in 2018, 2019, 2022–2024 and 2026, and differs in 2020, 2021 and 2025. **Kept.**
    - **R3 (evening Ashtami): documented by a single source and underspecified** [S15]. Under my interpretation R3-interp-(i), Ashtami at sunset (not specified by the source; rev 3), it coincides with C-GOV in 2021, 2023, 2024 and 2026. **Kept, with that caveat.**
    - **R4: not documented anywhere.** It was my own hypothesis. **Dropped** as a convention; it remains in the row-4 table only as a diagnostic.
  - Revision 1's claim "no single rule reproduces C-GOV" stays true as a *fact*. It is now read as **"C-GOV is a separate convention that does not consistently follow R1, R2 or R3"**, not as evidence against R1, R2 or R3.
- **Row 1, re-framed.** Revision 1 said Oct 18 was "the more credible date" for Hyderabad Saddula. Revision 2 states it without ranking:
  - **C-GOV publishes Oct 18**, R2 and R3 also give Oct 18, and this cell is VERIFIED *as the published official date*.
  - **R1 gives Oct 19**, which Drik publishes as Durga Ashtami.
  - Both remain visible (§B-R2.1). A family following R1 at a Warangal-Bhadrakali-style temple would observe Oct 19; this is a documented, coexisting difference.
- **Row 2, re-framed.** Revision 1 said the US end date "Oct 18 is better supported than Oct 17 (PROVISIONAL)". Revision 2 corrects this:
  - Oct 17 is what the documented R2 convention gives *if* day 1 is Oct 9.
  - indian.community's Oct 9–17 is therefore internally consistent **under R2 with an A-SP start**. It is still inconsistent with its own "ends on Durgashtami" wording under R1.
  - US day 9 is **UNRESOLVED**, with candidates Oct 18 and Oct 17 (§B-R2.3).

---

## F. Proposed date-selection specification (proposal only, not a ruling)

> **Revision 2 amendment (supersedes the conflicting parts of steps 4 and 5
> below; original text kept).**
>
> - **Steps 4(b)–(d) become:** compute and *return* the date under **each**
>   documented convention, each tagged with its own source: C-GOV (where
>   published), R1, R2, R3-reading-(i), and R3-reading-(ii).
>   - *(Rev 3: the R3 variants are the auditor's experimental
>     formalizations of an undefined "evening". Any implementation must
>     label them as interpretations, not as the source's rule. They must not
>     be presented with more precision than [S15] gives.)*
>   - Do not drop R3 as "diagnostic only".
>   - Do not choose a winner in code.
>   - A single "display date" may be shown only when every applicable
>     convention agrees. Otherwise, show the alternatives side by side with
>     their sources.
>   - A family or user preference for one tradition may select one
>     convention. **[ASSUMPTION]** that such a preference setting is
>     acceptable product-wise; priest review is required.
> - **Step 5 becomes:** dates for the middle days are emitted with status
>   **PROVISIONAL-E** ("endpoints verified, consecutive sequence inferred")
>   even when both endpoints are VERIFIED. They are upgraded to VERIFIED only
>   when a source names that specific day.
>   - Where day 1 is UNRESOLVED (US 2026), emit one conditional sequence per
>     day-1 candidate (§B-R2.3), never a single sequence.
>   - Where the span is not 9 days (R1 with an A-SP start in the US 2026;
>     several historical years), leave the middle days undetermined.
> - **New: per-location evaluation is mandatory.** Every location is computed
>   with its own coordinates and IANA zone. No location's result may be
>   copied from another, even within one zone. Tests should include one city
>   per US zone at minimum, plus Hyderabad.

Assumptions are labelled **[ASSUMPTION]**. Everything else is backed by evidence cited above. Nothing here should be implemented until a priest review has been done and the §G gaps are closed.

1. **Inputs.** `year`; location `{latitude, longitude, timezone (IANA)}`; an explicit `observancePolicy` (see step 3). Every output date must carry: timezone, the convention used, a source/provenance reference, a status (`VERIFIED` / `PROVISIONAL` / `UNRESOLVED`), and an `observanceRegion` tag stating "Telangana festival — not universal Telugu practice" (consistent with [S34]'s existing `regionTag`).

2. **Published-date overrides come first (data, not code).**
   - Keep a structured table of officially published dates per year. For each entry store: source URL, document, the exact label quoted, and the access date.
   - First entry: `2026 Hyderabad/Telangana: saddula = 2026-10-18 [S1]`.
   - For Telangana locations, the published Saddula date wins over any calculated date. Evidence: the official date departs from every tested rule (§E row 4).
   - **[ASSUMPTION]** Telangana's state date also applies to other Telangana locations, not only Hyderabad. The Warangal/Hanamkonda split [S15] shows individual temples may differ.

3. **Day 1 (Engili Pula) = Mahalaya Amavasya day.** This is Bhadrapada Krishna Amavasya in the amanta calendar.
   - **India / Hyderabad 2026:** unambiguous, because sunrise, aparahna and sunset conventions all give the same day.
   - **Outside India: UNRESOLVED.** Expose `observancePolicy.day1 ∈ {"sarva-pitru-aparahna", "amavasya-at-sunrise", "follow-india-date"}`. Do **not** default silently. When the policies disagree (as in every US city in 2026), show the date as UNRESOLVED with both candidates and their basis, not one invented date.
   - **[ASSUMPTION]** In an Adhika-Ashvayuja (extra leap month) year, day 1 follows the Amavasya immediately before Navratri. The 2020 official start date (Oct 17, 2020, which was Padyami at sunrise and not Amavasya) is unexplained; see §G item 5.

4. **Day 9 (Saddula).**
   - (a) If a published override exists for the location's region, use it.
   - (b) Otherwise, compute the day-9 candidates under each documented convention, all from the existing engine with no new astronomy:
     - Ashvayuja Shukla Ashtami at local sunrise (the Bhadrakali-temple convention [S15]; Drik's Durga Ashtami);
     - day 1 + 8 (the Thousand Pillar Temple convention [S15]).
     - An evening/sunset Ashtami rule is **not** proposed as a convention (see the trap note in §B and §E row 4). It may be computed only as a diagnostic.
   - (c) If the two candidates agree (true for every US city in 2026 *if* day 1 = Oct 10): status **PROVISIONAL**, with convention "sunrise-Ashtami = day1+8".
   - (d) If they disagree: status **UNRESOLVED**. Show both dates. Never pick one silently.
   - **[ASSUMPTION]** That the diaspora would want local-tithi dates rather than India's dates. No source establishes this either way (§G item 3).

5. **Days 2–8.** Assign by consecutive count from day 1 **only when** `saddula − day1 = 8` (a 9-day year).
   - In 8-day or 10-day years (2020, 2021, 2025 under official dates), **do not** auto-assign names to a missing or extra calendar day. Mark the affected days UNRESOLVED, because no source explains how the names are shifted (§G item 4).
   - Evidence for consecutive counting over tithi labels: §E row 7.

6. **Aligina Bathukamma (day 6).** Always emit it. Never hide it. Its date follows step 5. Store `observanceVariants` with citations: "no naivedyam" (all sources); "Bathukamma not made / not played — rest day" [S21][S22][S23]; "played without offering in some places" [S10][S23]. Do not present any one variant as universal.

7. **Association and temple event dates** (e.g. [S27]) are a separate data type: `communityEvent {organizer, date, url}`. They must never be used as, or labelled as, the traditional date.

8. **Determinism and tests (for a future implementer).**
   - Fix clocks and the provider version (mhah-panchang 1.2.0).
   - Fixtures: the §D boundary tables. Hyderabad 2026 is a vriddhi-Saptami case. US 2026 is a split-Amavasya day-1 case.
   - Assert that no UNRESOLVED cell is rendered as a plain date.

9. **Repo hygiene before implementing.** Correct the `bathukamma-begins` prose noted in §E row 9. Leave every Durga Ashtami / Maha Navami / Vijayadashami rule untouched; those are out of scope and were not changed by this audit.

---

## G. Smallest additional evidence that would close each open item

1. **US day 1 (all seven US cells, UNRESOLVED).** One explicit statement from a named US Telugu or Telangana temple panchangam for 2026 that says which day Engili Pula Bathukamma falls on locally. Examples would be a Karya Siddhi Hanuman Temple (Frisco) 2026 calendar PDF entry, or a Sri Venkateswara Temple (Pittsburgh / Malibu) almanac entry, giving Oct 9 or Oct 10 *with the name "Bathukamma" or "Engili Pula"*. Alternatively, a Telangana Vidwat Sabha or Telangana Endowments statement on how the first day is fixed outside India.
2. **Which Amavasya defines "Pethara/Mahalaya" day 1 when the conventions split.** A Telangana priest or Vidwat Sabha statement, or a Telugu panchangam rule, on whether Engili Pula follows the Sarva-Pitru (afternoon) Amavasya or the sunrise Amavasya when they fall on different civil days. This alone would turn the US day-1 cells into calculated (category b) dates.
3. **Diaspora convention.** Any authoritative statement (a US temple panchangam preface, or a Telangana cultural-department guide for NRIs) on whether diaspora families follow *local* tithi dates or *Telangana's* dates. This would move US days 2–9 from PROVISIONAL to VERIFIED or settle them otherwise.
4. **How names are assigned in 8- and 10-day years.** One documented example naming each calendar day in 2025 (the 10-day year): which name was used on the extra day? Also in 2021 (the 8-day year): which name was dropped? A dated Telangana Tourism or Language & Culture day-by-day schedule for 2025 would be enough. Not needed for 2026, but required before any multi-year implementation.
5. **2020 start-day anomaly.** The 2020 Telangana government G.O. or a press note explaining why "Bathukamma Starting Day" was Oct 17, 2020 (Padyami at sunrise) rather than the Amavasya of Oct 16, 2020. That year had an Adhika (leap) Ashvayuja month, so this matters for leap-month handling.
6. **Rule behind Telangana's Saddula date.** The 2026 G.O. or the Vidwat Sabha / panchangam recommendation behind "Oct 18 Saddula Bathukamma". This means the actual government order text or scholar committee minutes, not the holiday-list webpage. It would tell us whether a reproducible rule exists or whether the date is decided case by case each year. It would not change the Hyderabad 2026 cell, which is already backed by the published date.
7. **A Bathukamma-specific government schedule for 2026.** A Telangana Tourism / Language & Culture department circular naming all nine 2026 day-dates. This would add category-(a) support to Hyderabad days 1–8, which are currently VERIFIED by calculation plus fixed endpoints.
8. **Hindutone's USA page (S12).** A successful fetch, or an archived copy, to see whether it states a method. This is low priority, because it would only corroborate.
9. **Priest review (per Mahesh).** Review of the Aligina variants (§A) and of the US day-1 question before anything is shown to users.

**Added in revision 2:**

10. **Hyderabad days 2–8 (PROVISIONAL-E → VERIFIED).** One authoritative, dated 2026 source that names an individual middle day would upgrade it. Examples: a Telangana Language & Culture or Tourism programme listing "Atla Bathukamma — Oct 14", a Hyderabad temple panchangam, or a dated mainstream news report on the day itself. Each such source upgrades only the day it names. A source naming *all* the days would upgrade all of them. A targeted search on 2026-10-01 found only uncited aggregator or blog listings ([S9], [S11] and search-engine summaries), which do not qualify.
11. **R3 operationalisation.** A statement from the R3 proponent [S15], or any other source, defining "evening" (sunset, a fixed clock hour, or the immersion time). Without it, R3 gives Oct 17 or Oct 18 in the US Pacific cities.
12. **Which conventions US families actually follow.** A US temple panchangam or a Telangana association that publishes Bathukamma dates *together with* the convention used: R1, R2, or following India's dates. An event date alone, like [S27], does not qualify.

---

### Reproducibility notes

- Scratch scripts were run outside the repo, in the session scratchpad. The repo's `engine.ts` was copied unchanged at SHA `27e3bae`, with `node_modules` symlinked from the main checkout. They are not committed:
  - `run.ts` (8 locations, Oct 8–21);
  - `hist.ts` and `rules.ts` (Hyderabad 2018–2026 official-date rule tests);
  - `seq.ts` (2024/2025 consecutive days);
  - `table.ts` (sunrise / aparahna / sunset tables).
- Web pages were fetched with `curl -A "Mozilla/5.0 …"` and HTML-stripped with Python.
- Revision 2: the per-city Drik Amavasya pages [S35] were fetched and parsed by a scratch `amav.py` (not committed). No engine code or engine inputs changed between revisions.
- Pages that could not be fetched: hindutone.com (DNS failure); telanganatourism.gov.in (connection refused / timeout); prokerala.com (HTTP 429); latestly.com (HTTP 403).
