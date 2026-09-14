# Panchangam Foundation Investigation — Follow-up

**Scope:** narrow follow-up to `docs/temp/panchangam-verification-2026-09-14.md`, on `dev-foundation` only. No code changed. No puja/audio/Sankalpam-UI/calendar/search/profile work touched.

---

## 1. Festival precedence rule — exact evidence

**Primary text identified:** *Dharma Sindhu*, composed by Pandit Kashinatha Upadhyaya (Pandharpur, c. 1790 AD) — a widely used traditional digest (nibandha) on dharma-śāstra timing rules, still in common reference use for vrata/festival dates today.

**Source consulted:** a condensed English rendering by Sri V.D.N. Rao, published online by Sri Kanchi Kamakoti Peetham ("Essence of Puranas" series), `kamakoti.org/kamakoti/dharmasindhu/`, Chapter 5 ("Tithi Vrata Nirnayas"). This is a recognized traditional institution's published exposition, not a blog, not Drik, not our own code comment, and not an AI-generated summary — I fetched the raw HTML directly with `curl` and stripped tags myself, without any AI-mediated extraction, specifically to get an exact quote.

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

## 3. Home Tithi/Nakshatra display contract (proposed, not coded)

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
