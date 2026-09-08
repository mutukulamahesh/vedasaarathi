# Vinayaka Chavithi Puja — Content Specification

Status (owner-confirmed): the complete **sourced** candidate is available for
**Family Beta** testing before priest approval. Families and the proposed
priest test the working app; corrections are applied afterward. This does not
make any content verified or priest-approved — see
[PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md) §2 and
`.claude/rules/sacred-content.md` for the two-gate model
(`canDisplayAsGuidance` unchanged; `canDisplayAsBetaCandidate` new). Missing,
invented, or rights-withheld content stays unavailable — currently only the
Vrata Katha (rights not cleared), shown as a plain notice with no story text.

## Sources used for the candidate

- `039. Vinayaka Chaviti Puja - Telugu Lyrics.pdf` and its English companion, supplied by the product owner and attributed to Nanduri.
- `వినాయక వ్రతకల్పం.pdf`, supplied by the consulted Telugu priest.
- The priest's written reply on the Telugu household practice and the missing-patri fallback.

These sources may guide a private reviewer build. A religious claim remains `REVIEW_REQUIRED` until its source reference, tradition scope and reviewer record satisfy the release gate. Online audio is comparison evidence only and is not copied, trained on or redistributed without permission.

## Product paths

The **Simple path** contains the core sequence. The **Complete path** adds Achamanam, Pranayama, Kalasha Puja, symbolic bath and clothing, Anga Puja, 21-patri worship, Ashtottara and Vrata Katha. Missing optional items do not block either path.

The implemented journey is built from the sourced candidate by
`lib/pujas/vinayaka/beta-journey.ts` (2 practical prep steps + the 32 sourced
candidate steps + the rights-withheld Vrata Katha) and surfaced through
`lib/content/steps.ts`. The **Simple path** is `SIMPLE_PATH_STEP_IDS` (14
essential candidate steps + the 2 prep steps). Classification is a cross-source
inference, flagged `classificationInferred` (BETA_CLASSIFICATION) and editable
in review. Beginner physical actions come from
`lib/pujas/vinayaka/beginner-actions.ts` (sourced from
`lib/pujas/vinayaka/research-sources.ts`, or a minimal literal action flagged
`BETA_ACTION_NEEDS_REVIEW`).

## Sankalpam and people

- Never infer or assign Gotra, Veda, Sutra, Shakha, Pravara or Sampradaya.
- `UNKNOWN` and `UNSURE` remain exactly as entered.
- A deity-associated or generic Gotra must never be saved as the person's lineage.
- The beta Sankalpam (`lib/pujas/vinayaka/sankalpam-assembly.ts`) uses only the recovered short form: `asmaakaM` for individuals/groups, `asmaakaM saha kuTuMbaanaaM` for families, and the country-level `asmin daeSae` slot from a saved location. No city, timezone, coordinates, dated calendar slot, or lineage slot is inserted — those are recorded as priest questions.
- Unrelated students or friends remain separately named participants; each states the Sankalpam for themselves and the app never describes them as one family.
- A full dated Sankalpam and any city/lineage wording require an approved source (not in the supplied PDFs) — recorded on the priest checklist.

## Materials and patri

The preparation checklist is built from the substances the puja mantras name
(`BETA_MATERIALS` in `beta-journey.ts`). It is helpful, not a completeness
test; a missing optional item never blocks the puja. The 21 patri are shown by
their **recovered Telugu names** (`PATRI_TELUGU_RECOVERY`) with the
unknown-plant safety warning; **no botanical identity is added** and **no
automatic flowers/akshata substitution is claimed** — the fallback stays an
open priest question until a written source is found.

`Yatha Shakti` means performing sincerely according to one's ability. It does not authorize the app to invent a substitute.

## Beginner boundary

This path uses simple household Avahana. It does not teach elaborate priest-led Prana Pratishtha, fire sacrifice, breath retention, or actions that could damage a murti. Exact mantras, Sankalpam wording, Katha text and pronunciation tracks require source/licence and review.

## Audio

The candidate may use device text-to-speech for plain English/Telugu instructions. It must not send participant data to an external voice service or describe synthetic mantra speech as priest-reviewed pronunciation. Canonical audio is a separately versioned asset reviewed against approved text.

## Udvasana and immersion

Udvasana wording remains locked until reviewed. Practical guidance permits home immersion only for natural, unpainted clay whose ingredients are known to be safe. Decorations are removed first; no storm drain or unsafe body of water is used; local rules apply. Permanent pictures and metal/stone murtis are kept, not immersed.

## Release blockers

1. Priest walkthrough of every ritual step and its simple/complete classification.
2. Approved Sankalpam variants for self, family and unrelated group, including unknown fields.
3. Reconciled 21-patri names and evidence level for the flowers/akshata fallback.
4. Licensed/approved mantra and Vrata Katha text.
5. Reviewed pronunciation audio.
6. Validated local Panchanga and timezone metadata.
7. Usability testing with at least one beginner, one family and one student/friends group.
