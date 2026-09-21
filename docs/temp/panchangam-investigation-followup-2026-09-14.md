# Panchangam Foundation Investigation — Follow-up

**Scope:** narrow follow-up to `docs/temp/panchangam-verification-2026-09-14.md`, on `dev-foundation` only. No code changed. No puja/audio/Sankalpam-UI/calendar/search/profile work touched.

---

## 1. Festival precedence rule — exact evidence

**Primary text identified:** *Dharma Sindhu*, composed by Pandit Kashinatha Upadhyaya (Pandharpur, c. 1790 AD) — a widely used traditional digest (nibandha) on dharma-śāstra timing rules, still in common reference use for vrata/festival dates today.

**Source consulted, classified accurately:** `kamakoti.org/kamakoti/dharmasindhu/bookview.php?chapnum=5` ("Tithi Vrata Nirnayas"), part of the "Essence of Puranas" series published online by Sri Kanchi Kamakoti Peetham. **This is a recognized institutional *secondary* rendering — a condensed English exposition of Dharma Sindhu by Sri V.D.N. Rao — not the original Sanskrit primary text, and not a critical edition with verse numbering.** It is not a blog, not Drik, not our own code comment, and not an AI-generated summary (I fetched the raw HTML directly with `curl` and stripped tags myself, without any AI-mediated extraction, specifically to get an exact quote) — but "not AI-summarized" is a claim about *how I obtained the text*, not about the text's own standing relative to the Sanskrit original. **On its own, this secondary rendering is not sufficient to establish the Sydney precedence rule with confidence** — it is one recognized institution's paraphrase of what "Dharma Sindhu stated," in the paraphraser's own English sentence structure, with no Sanskrit śloka, verse number, or page citation given for this specific line. A confident answer would need the original Sanskrit (or a critical, verse-numbered edition) and ideally a second independent digest (e.g. Nirnaya Sindhu) for cross-check, neither of which I have. This reclassification does not change the quotation or URL below, only how much weight it should be given.

**Exact passage (verbatim, confirmed against raw HTML, not paraphrased by any tool):**

> "Referring to Ganesha Vrata, Dharma Sindhu stated that the Chaturthi is to be taken into consideration as the Madhyaahna Chaturthi and if the Chaturthi arrives after Madhyaahna then the Vrata is to be performed on the next day. If however Chaturthi extends to the following madhyaana, then Chaturthi is preferably applied to the previouys [sic] day itself."

**Distinguishing source text from interpretation:** the quoted sentence above is the source (an English condensation of the Sanskrit, not the Sanskrit verse itself — this specific web publication does not print the underlying Sanskrit śloka or a section/verse number for this particular line, so an exact "edition, section/page" citation down to verse level could not be obtained). Everything below this line is my own interpretation, clearly marked as such.

**My interpretation, applied to the Sydney case:**
- Sydney's Chaturthi begins 11:36 AM on Sep 14 — i.e., *during* that day's Madhyahna window (10:41 AM–1:03 PM), not after it has ended.
- Reading the quoted rule literally, the "arrives after Madhyahna → next day" clause does not apply (Chaturthi did not arrive after Madhyahna closed). The second clause — "extends to the following madhyaana → apply to the previous day" — does apply, since Chaturthi continues into Sep 15's Madhyahna too.
- On this literal reading, the rule points to **Sep 14 (the earlier day)** — which is what our engine already outputs, not Drik's Sep 15.

**Why I am not confident enough to call this resolved:**
- The English condensation does not define, numerically or otherwise, what threshold of coverage "arrives after Madhyahna" is meant to capture at the boundary — my reading treats "arrives during the window" and "extends to next day" as automatically triggering the earlier-day clause, but a stricter classical reading (requiring the tithi to be present for most/all of day 1's Madhyahna, not just some of it) would flip the conclusion.
- I have no second primary source to cross-check this specific two-day tie-break clause against, and no access to the original Sanskrit verse.
- Drik Panchang, a widely-used, professionally maintained calculation service consulted by many practicing families and some priests, disagrees with this reading — which does not make my reading wrong, but is a real, unresolved signal that a nuance may be missing.

**Verdict: UNRESOLVED, with a documented lean.** I found a genuine, verbatim, well-attributed primary-adjacent citation that, read literally, favors our engine's existing Sep-14 output over Drik's Sep-15 output for this specific edge case — a genuinely non-obvious result. But per instruction, I am not treating this as confidently established. **Recommendation: do not change the festival-selection algorithm on this evidence alone. This specific question — which day a Southern Hemisphere / late-tithi-transition location should observe Ganesha Chaturthi when Chaturthi only partially covers the first day's Madhyahna — should be put to a Telugu priest or a qualified dharma-śāstra scholar with access to the full Sanskrit text before any change is made or any public claim is made either way.**

---

## 2. Manual verification of Drik (raw HTML, not AI-summarized)

Fetched `drikpanchang.com`'s Sydney Ganesh Chaturthi page and the Hyderabad 11-September day-panchang page directly with `curl`, stripped HTML tags myself with a plain script (no AI model in this step), and read the resulting text directly.

**Sydney page — confirmed, verbatim from raw markup:**
- Location: "Sydney, New South Wales, Australia", Latitude 33°52′04″S, Longitude 151°12′26″E — matches the coordinates used in this investigation to within rounding.
- Timezone: "+10:00, NOT observing DST" (correct for mid-September, before Australia's DST starts in October).
- "Ganesh Chaturthi 15th September 2026 Tuesday"
- "Madhyahna Ganesha Puja Muhurat - 10:40 AM to 12:14 PM Duration - 01 Hour 34 Mins"
- "Chaturthi Tithi Begins - 11:36 AM on Sep 14, 2026" / "Chaturthi Tithi Ends - 12:14 PM on Sep 15, 2026"
- A general disclaimer on the same page: **"Ganesh Chaturthi date might be one day after India"** — confirming Drik treats this as a known, expected, routinely-occurring effect for non-Indian locations, not a fluke.

This exactly matches what the earlier report recorded via `WebFetch` — no discrepancy was found between the AI-mediated fetch and the raw manual read. The original report's Sydney data stands confirmed.

**Hyderabad 11-September page — Gulika Kalam, raw HTML structure examined directly:**

Confirmed present in the actual markup: a single table row labeled `Gulikai Kalam` contains **two** time-range cells — `07:36 AM to 09:08 AM` and `12:37 PM to 01:27 PM` — laid out side by side. Looking at the underlying HTML:

```
<div class="dpTableRow">
  <div class="dpTableCell dpTableKey">Gulikai Kalam</div>
  <div class="dpTableCell dpTableValue">07:36 AM to 09:08 AM</div>
  <div class="dpTableCell dpTableKey"></div>   <-- empty label
  <div class="dpTableCell dpTableValue">12:37 PM to 01:27 PM</div>
</div>
```

**Gulika verdict:** this is **not** a parsing or AI-summarization artifact — the second time range is genuinely present in Drik's own page markup, attached to the same row as "Gulikai Kalam." However, Drik's own template leaves the second column's label **empty** — the page itself does not say what the second range represents. It is laid out as a two-column grid (each row pairs a left item with a right item), and the "right" slot for this particular row is unlabeled. I cannot determine, from the page alone, whether this is a genuine second Gulika occurrence (some traditions compute a day and a separate secondary Gulika-linked period) or a page-template artifact where an unrelated value's label simply wasn't repeated. **This remains open — needs a direct question to a priest or Drik's own documentation, not something resolvable from the page text alone.** Our app currently shows only the first window (7:36–9:08 AM), which matches Drik's primary/first-labeled figure exactly.

---

## 3. Home Tithi/Nakshatra display contract (proposed, not coded) — SUPERSEDED

**This section's "sunrise value all day" proposal is superseded by the Round 2 addendum at the end of this document ("8. Revised Home Tithi/Nakshatra display contract"), which distinguishes the sunrise value, the current value, the transition time, and the Sankalpam-pending value explicitly rather than collapsing to sunrise-only. Kept here, unedited, for the audit trail.**

**Principle:** "Today's Tithi" and "Today's Nakshatra" always show the **sunrise-anchored** value — the same anchor the app's Sankalpam already uses, and the same convention Drik and every printed Panchangam use as their headline figure. The value never changes mid-day. A short, same-line transition note tells the family when the tithi will change (or already changed), without ever swapping the headline itself. A separate, explicitly labeled "right now" value is available only inside the existing disclosure (no new card, no new warning box), for anyone who wants it.

**Concrete wording, demonstrated for Hyderabad, 11 September 2026** (Amavasya at sunrise, transitioning to Shukla Padyami at 8:56 AM; Nakshatra Purva Phalguni at sunrise, until 1:16 PM):

**Checked before 8:56 AM (e.g. 7:00 AM):**
> Today's Tithi: **Amavasya** — changes to Shukla Padyami at 8:56 AM
> Today's Nakshatra: **Purva Phalguni** — until 1:16 PM

**Checked after 8:56 AM (e.g. 10:00 AM, same civil day):**
> Today's Tithi: **Amavasya** — changed to Shukla Padyami at 8:56 AM
> Today's Nakshatra: **Purva Phalguni** — until 1:16 PM

The headline word "Amavasya" is identical in both cases — only the small trailing clause's tense changes (*changes to* → *changed to*). A family glancing at the app at any point in the day sees the same primary Tithi name Drik and a printed Panchangam would call "today's," with a plain-language note about the transition instead of the value silently flipping underneath them.

**"Right now" value (optional, inside the existing "Learn about Tithi" disclosure — no new UI element):**
> (inside the disclosure, only shown if it actually differs from the sunrise value) Right now: Shukla Padyami

**Sankalpam generated after the transition (e.g. at 11:00 AM, mid-puja):** unchanged from current, correct behavior — reads `field.atSunrise` / `ctx.paksha`, both sunrise-anchored:
> ... భాద్రపద మాసే, కృష్ణ పక్షే, అమావాస్యా తిథౌ, శుక్రవాసరే, పూర్వఫల్గుని నక్షత్రే ... ("...Bhadrapada month, Krishna Paksha, Amavasya tithi, Shukravara, Purva Phalguni Nakshatra...")

This says **Amavasya** — the exact same word the Home screen has been showing all day, at every hour, including 11 AM after the live transition. Under the current implementation (current-instant value as the headline), the Home screen at 11 AM would instead say "Today's Tithi: Shukla Padyami" while the Sankalpam a few minutes later says "Amavasya tithau" — two different tithi names on two screens of the same visit, which is precisely the appearance of contradiction this contract is meant to prevent.

**Same contract applies identically to Nakshatra** — sunrise-anchored headline, "changes to / changed to [name] at [time]" note, optional "right now" value in the existing disclosure only.

This proposal adds no new card and no new warning box: it is a wording change to the two lines and the one disclosure that already exist.

---

## 4. Convention claims — validated against independent sources, not just our code comment

**Samvatsara — Parabhava:** cross-checked against five independent, currently-operating Telugu/South-Indian Panchangam publishers (hindupad.com, poojalu.com, sahiti.sodhini.com, vydicastro.com, mulugu.com), all of whom independently list **"Sri Parabhava Nama Samvatsaram"** as the Telugu year running **19 March 2026 – 6 April 2027**, which covers 14 September 2026. This is well-corroborated across multiple independent, recognized South Indian Panchangam sources — not solely our own code comment. Drik's "2083 Siddharthi, Vikrama Samvat" is a genuinely different cycle (North Indian Vikrama epoch, different year-count and naming offset from the Shaka-based Telugu cycle) — both values are legitimate for their respective traditions; "Parabhava" is the one a Telugu family's own wall calendar would show.

**Ritu — Varsha vs Drik's Sharad:** cross-checked against multiple independent sources (Wikipedia's "Sharada (season)" article, learnreligions.com, sanskritimagazine.com, bhaktibharat.com). The commonly cited standard lunar-month-pair assignment is Shravana+Bhadrapada = Varsha, Ashvina+Kartika = Sharad — matching our app's "Varsha" for a Bhadrapada date. One source noted Sharada is "roughly" Bhadrapada-Ashvina in some framings, which is consistent with Bhadrapada sitting near the seasonal boundary and different reckonings (lunar-month vs. solar-sankranti-based) landing on different sides of it — the same explanation our code comment already gives, now corroborated by independent sources rather than resting on the comment alone.

**Masa — Purnimanta:** a standard, well-documented, uncontroversial calendrical convention (month ends at Purnima; contrasted with the Amanta convention used in South India/Gujarat where the month ends at Amavasya) — not a disputed religious rule, and independently confirmed matching Drik's own "Bhadrapada (Purnimanta)" label exactly for every date checked in the prior report.

**On "acceptable because a code comment says so":** the prior report's language calling these "acceptable convention differences" is now backed by independent, multi-source verification for Samvatsara and Ritu, not merely the code's own comment. The code comment's *characterization* of the difference (which tradition it is) checks out; it was not itself treated as the authority here.

**Recommendation, per your instruction to prefer omission over unexplained convention differences:** keep Samvatsara, Ritu, and Masa **out of the simple Home summary** unless and until their convention basis is made clear to the family in the UI itself (e.g. via a label or a disclosure note naming "Telugu/Shaka reckoning"). Showing "Parabhava" or "Varsha" bare, with no indication of which tradition they follow, risks a family who has also seen "Siddharthi" or "Sharad" elsewhere (a relative's app, a printed calendar from a different region) concluding the app is simply wrong, when in fact it is using the correct convention for their own tradition without saying so.

---

## 5. Scope preserved

Yoga, Karana, and Amanta Masa were **not implemented** in this investigation — recorded here only as optional future Panchangam fields, per instruction. No cards, warnings, or technical explanations were added to Home (nothing was coded at all). Nothing was deployed.

---

## Unresolved questions requiring a Telugu priest

1. **The Sydney/Southern-Hemisphere festival-day tie-break itself.** Section 1 above found textual evidence that arguably favors our engine's current Sep-14 choice over Drik's Sep-15, but the English condensation's wording is not precise enough to be certain, and no second primary source or the original Sanskrit could be obtained. This is the single most consequential open question in this investigation — it changes which day a family is told to perform the puja.
2. **The second Gulika Kalam window on Drik's Hyderabad 11-September page.** Confirmed genuinely present in the markup, but unlabeled by Drik itself. Whether this reflects a real secondary Gulika occurrence worth including, or a page-template quirk, needs a direct answer from someone who knows Drik's own convention or the underlying astrological method, not something resolvable from the page text.
3. Whether the "arrives after Madhyahna" clause in the Dharma Sindhu condensation is meant as a strict "after the window's end" test or a "majority/threshold-of-coverage" test — the distinction that decides the Sydney case.

## Smallest subsequent code change, if evidence supports one

**Supported now, low-risk, narrow:** change the Home screen's Tithi/Nakshatra headline to read from `field.atSunrise` (falling back to `field.value` when `atSunrise` is absent, exactly as the Sankalpam code already does) instead of `field.value`, and append a short same-line transition clause ("changes to X at HH:MM" / "changed to X at HH:MM") computed from the field's existing `endsAt` data. This is a small, mechanical change to two lines of existing UI text, touches no other screen, and directly closes the anchor-consistency gap documented in Section 3 and the original report.

**Not supported yet — do not implement:** any change to `madhyahnaVyaptiFestivalDay`'s day-selection rule. The evidence in Section 1 is suggestive, not confident, and this function decides an actual festival date for real families; per instruction, it should not be touched without priest confirmation.

Nothing in this document changes, commits, or deploys application code. This file itself is a documentation-only addition.

---
---

# Round 2 Addendum

**Scope:** narrow follow-up to Round 1 above, same branch, same constraints — no application code modified, no deployment, no other features investigated.

## 6. Sankalpam Tithi anchor — research

**Question:** does our current code (`lib/sankalpam/from-app.ts`: `tithiAnchor = tithiFieldObj?.atSunrise ?? tithiFieldObj?.value`, and `ctx.paksha` = paksha-at-sunrise) correctly represent what a Sankalpam should state in every case, or only in some?

**What I checked, and what I found — kept separate from interpretation:**

**(a) General/default rule (ordinary daily puja).** A web search surfaced this description: *"The lunar day prevailing at sunrise (Udaya Tithi) is used in Sankalpa... According to the Nirnaya Sindhu and Dharma Sindhu texts, in respect of Vratas and Pujaas on Shukla Pratipada Tithi, the 'Sankalpa' for the same would have to be for Pratipada Tithi despite the fact that the 'purva viddha' or carry forward of Pratipada commenced on the previous day."* This is a **search-engine-generated summary, not a source I fetched and read myself** — I was not able to locate the specific Nirnaya Sindhu/Dharma Sindhu passage behind it in the time available, so I am not treating it as confirmed, only as one data point. If accurate, it establishes a general Udaya-Tithi default *and* a more important structural principle: the Sankalpam states whichever tithi the **applicable vrata rule** determines governs the occasion — which, for an ordinary day with no special vrata rule in play, is simply the sunrise tithi (there is nothing else to govern it), but for a vrata whose own day-selection rule points elsewhere, the governing tithi is not automatically "whatever tithi sunrise happens to show."

**(b) Drik Panchang's own stated Sankalpa-generation policy** (their explanatory page, `drikpanchang.com/panchang/sankalpa/sankalpa.html` — cited here only as evidence of what a major, widely-used system actually implements, explicitly **not** as religious authority, per instruction):

> "All Panchang elements are calculated at the time of Sankalp except Samvatsara, Lunar Month, Ayana & Ritu which are Udaya Vyapini i.e. at the time of the sunrise on Sankalp day."

Read plainly, this says Drik's generator uses the **moment-of-recitation** value for Tithi, Paksha, and Nakshatra — not the sunrise value — reserving sunrise-anchoring only for Samvatsara/Masa/Ayana/Ritu. This is the **opposite** of our own code's approach for Tithi/Paksha. Importantly, Drik's method is *also* internally self-consistent (Tithi and Paksha are co-anchored to the same instant, just a different instant than ours), so it would never produce the "Krishna Paksha + Shukla Padyami" impossible pairing either — it solves the same problem our fix solves, by choosing the *other* available consistent anchor.

**(c) The specific case this investigation was asked about — a Madhyahna-vyapti-governed festival where the spoken Sankalpam happens before or after a tithi boundary, and where the festival day itself was selected by a rule other than sunrise.** No source I found — not the general-rule summary, not Drik's own explanation, not the Dharma Sindhu chapters fetched in Round 1 — directly addresses this intersection. I traced through what our own code would *actually produce* for the clearest real example available (Sydney, 14 September 2026, the day our engine currently selects for Vinayaka Chavithi):

- Sunrise Tithi for Sydney on Sep 14: **Tritiya** (Chaturthi does not begin until 11:36 AM).
- Our code's `atSunrise ?? value` fallback would therefore render a Sankalpam reading **"...తృతీయా తిథౌ..." (Tritiya tithi)** for a family performing their **Ganesha Chaturthi** puja that day — a family told by the app's own Today/festival screen that this is Chaturthi day would hear their formal Sankalpam name a different tithi (Tritiya) entirely.
- This is not a hypothetical: it is what the current code, as written, would generate, verified by reading `from-app.ts` directly against the Round 1 engine data for this exact location/date (no code was changed or run outside of read-only data queries to confirm this).

**A related, narrower finding also surfaced while tracing this:** `panchangaToSlots()` reads Paksha and Tithi from the sunrise anchor, but reads **Nakshatra from `field.value` — the current-instant value, not `field.atSunrise`.** Unlike Paksha/Tithi, a Nakshatra-anchor mismatch can't produce an "impossible" combination the way Krishna Paksha + Shukla Tithi can, but it is still the same category of inconsistency: a Sankalpam generated late in the day, after a Nakshatra transition, could name a Nakshatra that was not actually present at that day's sunrise, while Tithi/Paksha in the same Sankalpam correctly reflect the sunrise anchor. This was not part of today's specific ask but is directly relevant to "which anchor should Sankalpam use" and is recorded here rather than silently noticed and dropped.

**Verdict: UNRESOLVED.** I can defensibly state:
- For an **ordinary daily puja** with no governing vrata rule: sunrise/Udaya Tithi is *suggested* by a search-engine summary, but this **remains unverified** — I could not locate or read the primary Nirnaya Sindhu/Dharma Sindhu passage it claims to describe, so it should not be treated as confirmed, only as the current best guess pending a real citation.
- For a **vrata/festival whose own day-selection rule is sunrise-based** (most of the scenarios in Round 1 — Hyderabad, Frisco, Hyderabad Sep 11): sunrise Tithi and the festival-governing tithi are the same thing, so our current code is not in tension with itself here.
- For a **Madhyahna-vyapti-governed festival where the governing tithi does *not* cover sunrise on the selected day** (Sydney, and structurally any location/date where this happens): our current code's sunrise-anchor fallback produces a Sankalpam that **names a different tithi than the festival itself**. Whether the correct fix is "use the festival-governing tithi when one applies" or something else, I cannot say with the sourcing available. **This needs a direct question to a Telugu priest**, phrased as: *"For a Madhyahna-vyapti festival vrata (e.g. Ganesha Chaturthi) performed on the day selected by that rule, should the Sankalpam state the tithi prevailing at that day's sunrise, or the tithi that qualifies the day for the vrata (which may only be present from later in the morning), when the two differ?"*
- **No code changed.** `panchangaToSlots()` in `lib/sankalpam/from-app.ts` is untouched.

---

## 7. Amanta versus Purnimanta — investigation

**Why the 14 September comparison in Round 1 cannot prove the month convention is correct globally:** Amanta and Purnimanta **only ever disagree on the month name during Krishna Paksha** — specifically the roughly 15-day span from the day after Purnima until the following Amavasya. In that window, Purnimanta has already advanced to naming the *next* month (because Purnimanta months end at Purnima), while Amanta is still using the *current* month's name (because Amanta months end at Amavasya). During **every** Shukla Paksha day, by definition, both systems name the month identically — there is no Shukla Paksha date, in any month, in any year, that could ever reveal a difference between them. 14 September 2026 is a Shukla Paksha date (confirmed in Round 1: Shukla Tritiya at sunrise). Testing only that date is structurally incapable of surfacing this gap, no matter how many locations are checked — the comparison needed a Krishna Paksha date to even have a chance of showing anything.

**Comparison fixtures — three Krishna Paksha dates, two locations each, spanning three different Purnimanta months.** Purnimanta values below are read directly from our own engine (`computePanchanga`, read-only query, no code changed); Amanta values are cross-checked against explicitly Amanta-labeled Telugu-calendar sources (methodology noted per row — see caveats after the table).

| Date | Location | Paksha / Tithi at sunrise | Purnimanta Masa (our engine) | Amanta Masa (external, Telugu calendar) | Match? |
|---|---|---|---|---|---|
| 2026-09-14 | Hyderabad | Shukla Tritiya | Bhadrapada | Bhadrapada | ✅ agree (Shukla Paksha — cannot diverge, included only as the control row) |
| 2026-10-01 | Hyderabad | Krishna Panchami | **Ashvina** | **Bhadrapada** | ❌ **differ** |
| 2026-10-01 | Frisco | Krishna Shasti | **Ashvina** | **Bhadrapada** | ❌ **differ** |
| 2026-11-05 | Hyderabad | Krishna Ekadasi | **Kartika** | **Ashvina** | ❌ **differ** |
| 2026-11-05 | Frisco | Krishna Dvadasi | **Kartika** | **Ashvina** | ❌ **differ** |
| 2026-12-26 | Hyderabad | Krishna Tritiya | **Pausha** | **Margashirsha** | ❌ **differ** |
| 2026-12-26 | Frisco | Krishna Tritiya | **Pausha** | **Margashirsha** | ❌ **differ** |

**Sourcing for the Amanta column, disclosed honestly:**
- Amanta **Ashvina (Asvayuja)** begins 11 October 2026 — corroborated twice independently: once via a general web search, and once via a direct fetch of Drik Panchang's own Telugu-calendar page (`drikpanchang.com/telugu/calendar/telugu-calendar.html`), which listed "October 11, 2026, Sunday, Asvayujamu, Sukla Padyami." Since 1 October falls before that transition, Amanta on that date is still the prior month, **Bhadrapada**.
- Amanta **Kartika** begins 10 November 2026 — from a web-search-sourced description that explicitly named the convention ("...in the Telugu, Kannada, Marathi and Gujarati (Amanta) calendar... Karthika Suddha Padyami prevailing at sunrise on the 10th"). This is a **search summary, not a page I fetched and read directly myself** — flagged as a methodological gap versus Section 2's raw-HTML approach. Since 5 November falls before that transition, Amanta on that date is the prior month, **Ashvina**.
- Amanta **Margashirsha** begins 9 December 2026 — same search-summary sourcing as above, same caveat. Since 26 December falls after that transition, Amanta on that date is already **Margashirsha**.
- A separate direct fetch of Drik's Telugu **month-grid** view for October 2026 produced an internally inconsistent result (it reported both "1 October falls in Asvayujamu" *and* a tithi count that contradicted our own already-cross-validated Round 1 data for the same date) — I discarded that fetch as an unreliable grid-parsing extraction rather than use it, and relied on the two corroborating point-lookups above instead. This is exactly the kind of AI-summary unreliability the instructions warned about; recorded here so the gap is visible rather than hidden.

**Recommended Telugu-family Masa default:** **Amanta.** This is the standard convention on real Telugu Panchangams and wall calendars — independently confirmed here via Drik's own Telugu-calendar section (one direct fetch, reasonably solid) and multiple Telugu-calendar publishers reached through web search (two of the three transition dates in the table above rest on **search summaries, not a page I fetched and read myself, and remain provisional** on the same basis as the Section 6 Sankalpam-anchor caveat — flagged, not silently upgraded to confirmed). Purnimanta is the North Indian convention. A Telugu family checking our app against their own physical calendar during Krishna Paksha would see a **different month name** from us for as long as Krishna Paksha lasts each month (roughly half of every lunar month), which is a real, user-facing correctness gap for the stated initial audience, not a cosmetic one — the exact fraction is not asserted here beyond "a recurring, non-trivial portion of every month," since the three fixture dates checked are not a rigorous measurement of frequency.

**Not implemented:** no user setting, no Amanta calculation, no default change — this section is a recommendation only, per instruction.

---

## 8. Revised Home Tithi/Nakshatra display contract (supersedes Section 3 above) — IMPLEMENTED

**Status: implemented in commit `55553b8`** (points 1-4 below only — the Sankalpam-relationship sentence originally proposed for the disclosure, point 5 material, was removed rather than implemented; see the note at the end of this section). Verified against real transition, midnight-rollover, and location-change scenarios, with EN/TE mobile screenshots of all three display states. Sankalpam, festival selection, Nakshatra's mapping into Sankalpam, and all Masa calculations were left untouched.

**Correction from the prior proposal:** Section 3 recommended showing only the sunrise value all day. That collapses four genuinely different pieces of information into one and — per today's instruction — is not what's wanted. The revised contract keeps all four visible, distinguished, and short:

1. **The Panchanga day's sunrise Tithi** (what names "today" in the traditional sense).
2. **The Tithi prevailing right now** (only shown separately when it differs from #1).
3. **The transition time** between them, when they differ.
4. **The Tithi Sankalpam will actually use** — pending the outcome of Section 6 above. Since Section 6 is unresolved, this contract does **not** assert Sankalpam always equals the sunrise value; it labels the relationship honestly instead.

**Collapsed-card wording (compact, no new card, no warning box, no explanatory paragraph):**

**When the sunrise value and the current value are the same** (the common case — most of a Tithi's span, most days):

> Today's Tithi: Shukla Chaturthi · until 9:14 PM
> **ఈ రోజు తిథి: శుక్ల చవితి · రాత్రి 9:14 వరకు**

**When they differ** (Hyderabad, 11 September 2026, checked at any time of day — the headline no longer hides which value is which):

> At sunrise: Amavasya
> Now: Shukla Padyami · changed at 8:56 AM
>
> **సూర్యోదయ సమయానికి: అమావాస్య**
> **ఇప్పుడు: శుక్ల పాడ్యమి · ఉదయం 8:56కి మారింది**

(Before the 8:56 AM transition, the second line would instead read "Now: Amavasya" and collapse to the single-line same-value form above, since sunrise and current are still identical at that point — the two-line form only appears once they actually diverge.)

**RETRACTED — not implemented.** This section originally proposed one added sentence inside the "Learn about Tithi" disclosure ("Puja Sankalpam may use a different Tithi for festival days — this is confirmed at the Prepare step."). That sentence claimed a confirmation step that does not exist anywhere in the app and has been removed from the plan entirely, not merely reworded. The actual implementation in commit `55553b8` adds no Sankalpam-related text to the disclosure at all — the "Learn about Tithi" content is unchanged from before this work. The Sankalpam-anchor question stays purely a documentation matter (Section 6, unresolved) until it is actually answered.

**Telugu wording review notes:** "మారింది" (changed) and its future counterpart "మారుతుంది" (will change) are both natural, commonly understood household Telugu; "సూర్యోదయ సమయానికి" (at the time of sunrise) is a plain, unambiguous phrase avoiding technical jargon; "ఇప్పుడు" (now) is the ordinary spoken word rather than a formal/Sanskritic alternative, matching the app's established plain-Telugu tone elsewhere (e.g. "సిద్ధపడండి" for "Get ready").

**Still true from Section 3, carried forward:** no new card, no new warning box, no explanatory paragraph on the primary collapsed view — the two-line "differ" form is exactly as short as most existing lines on this screen.

---

## Round 2 — unresolved questions requiring a Telugu priest

1. (carried forward from Round 1) The Sydney/Southern-Hemisphere Madhyahna-vyapti tie-break rule itself.
2. (carried forward from Round 1) The unlabeled second Gulika Kalam window on Drik's Hyderabad 11-September page.
3. **New:** *"For a Madhyahna-vyapti festival vrata (e.g. Ganesha Chaturthi) performed on the day selected by that rule, should the Sankalpam state the tithi prevailing at that day's sunrise, or the tithi that qualifies the day for the vrata, when the two differ (as they do for Sydney's 14 September 2026)?"*
4. **New, narrower:** should an ordinary (non-festival) daily-puja Sankalpam's Nakshatra also be read from the sunrise anchor, matching Tithi/Paksha, rather than the current-instant value the code uses today?

## Round 2 — smallest subsequent code change, if evidence supports one

**Still not supported — do not implement:** any change to the festival-selection algorithm, and now also **not** a change to the Sankalpam Tithi/Paksha anchor logic — Section 6 found this genuinely unresolved, with real evidence pointing in more than one direction depending on the ritual type.

**Newly identified, small, and arguably supportable independent of the unresolved questions above:** align `panchangaToSlots()`'s Nakshatra read with its own Tithi/Paksha read — i.e. use `field.atSunrise`-equivalent handling for Nakshatra too, for consistency within the function itself, for the ordinary (non-Madhyahna-vyapti) case at least. This is narrower than it sounds: Nakshatra's `PanchangaElement` (`nakshatraAtSunrise`) already exists in the engine; the gap is only in `from-app.ts`'s slot-mapping, not in the engine itself. Flagged as newly-found, not yet requested for implementation.

**Home screen change:** the compact revised contract in Section 8 is ready to implement once approved — it does not depend on resolving Sections 6 or 1, since it deliberately avoids asserting what Sankalpam does when that's unresolved (it just names the relationship honestly in the disclosure).

Nothing in this addendum changes, commits, or deploys application code.
