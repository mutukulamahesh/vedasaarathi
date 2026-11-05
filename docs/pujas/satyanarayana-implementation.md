# Sri Satyanarayana Swamy Vratham: implementation decisions

Source baseline: merged `sri-satyanarayana-vratham-master.md` v1.2, GitHub main
`8eec1088c6cdf0d3cd3d2d8b5060232cfbcc2284`. This implementation is independent
of the unmerged Diwali PR #32. No festival dates or Panchanga calculations change.

## Scope

One complete 66-step household journey, including preparation, both sourced
prasadam grain variants, Ganapati, Gauri, all nine planetary deities and direction
guardians, Prana Pratishtha, the offerings and 108 names, all five original Katha
chapters, Punah Puja, optional harati, Udvasana, sharing and material handling.
The source does not establish a shortened version of this selected procedure;
the UI therefore offers one complete path. Optional steps remain clearly optional.
Any date can be used; Purnima is customary, not a release restriction.

This is a sourced beta text release. Every step retains REVIEW_REQUIRED,
SOURCED_BETA_CANDIDATE and its exact master section and source locator. There is
no invented reviewer or approval. The normal approved-guidance gate is unchanged.
The selected master readings for SNV-16/24/32 are retained. Editorial angle-bracket
annotations are excluded from recitation. Historical alternative readings stay
in the master and are not displayed as lines to recite.

## Sankalpam decision

We adopt the **existing platform participant-aware generator**, already described
in master §§5.4–5.6, rather than the base manual's male-with-spouse template.
This is an explicit beta integration decision, not a claim that the generator
reproduces the 1967 manual verbatim or resolves its gender-specific wording gaps.
No new Sanskrit frame, gender transformation or lineage rule is composed.

The canonical deity is `శ్రీ సత్యనారాయణ` / `Sri Satyanarayana`. The purpose is the
verbatim ending in SNV-05 (Varada pp.2–3):

> పురుషసూక్త విధానేన ధ్యాన ఆవాహనాది షోడశోపచార పూజాం

The matching Roman reading is also extracted from that source sentence:
`puruṣasūkta vidhānena dhyāna āvāhanādi ṣoḍaśopacāra pūjāṃ`.
The existing generator supplies its existing `కరిష్యే` ending.

The existing place default, calendar choice/fallback, SELF/FAMILY primary-person
Gotra rule, GROUP collective/individual choice, per-person unknown-Gotra choices,
and pending-preview/Begin gates remain in force. No surname, deity description,
location or other person's lineage fills an unknown field. The source's two
mode-independent sentences about Ganapati and kalasha worship appear after the
resolved generated Sankalpam on SNV-05. They stay hidden when choices are pending.

This release does **not** implement the base manual's nominative/genitive couple
form, add a spouse/gender field, or splice in the separate super-short procedure.
Those source-template gaps in master §5.8 remain documented for later feedback.

## Optional image gift (SNV-61)

The household journey explains when this optional step applies, and that a
permanent picture/murti can be kept. It does not display the personal gift formula
with unresolved performer/recipient placeholders. If a household chooses a gift
with a priest present, that person guides it. The unsourced water-offering line
is omitted entirely. This is a deliberate limitation; the app does not promise
a personalised priest-led donation ceremony.

## Content and audio

`content.json` is a checked-in extraction, reproducible with
`python scripts/extract-satyanarayana.py`. Sacred text comes directly from the
master; practical instructions have separate Telugu translations. The five
chapters are the master's original VedaSaarathi EN/TE retellings, not copies of
its modern source translation. The recipe methods and altar staging retain their
app-team accommodation distinction. These translations are not independently
human proofread or priest approved.

No new audio is generated or sent to a service. This puja offers no audio player,
including no Vinayaka family-Sankalpam player, and does not ask device speech to
chant. Existing Vinayaka audio, text and manifest remain unchanged. Audio can be
added later without replacing the written journey.

## State and offline

The existing per-slug run storage holds this puja's position, materials and
Sankalpam choices independently of Vinayaka. There is no new storage schema or
account. Full source and stories are bundled with the app rather than fetched
from a document server. The existing offline download includes those app chunks;
its label now refers to puja guides rather than Vinayaka alone.
