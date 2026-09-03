# Vinayaka Chavithi Puja — Private Review Content Specification

Status: private production candidate; not public approved religious guidance.

## Sources used for the candidate

- `039. Vinayaka Chaviti Puja - Telugu Lyrics.pdf` and its English companion, supplied by the product owner and attributed to Nanduri.
- `వినాయక వ్రతకల్పం.pdf`, supplied by the consulted Telugu priest.
- The priest's written reply on the Telugu household practice and the missing-patri fallback.

These sources may guide a private reviewer build. A religious claim remains `REVIEW_REQUIRED` until its source reference, tradition scope and reviewer record satisfy the release gate. Online audio is comparison evidence only and is not copied, trained on or redistributed without permission.

## Product paths

The **Simple path** contains the core sequence. The **Complete path** adds Achamanam, Pranayama, Kalasha Puja, symbolic bath and clothing, Anga Puja, 21-patri worship, Ashtottara and Vrata Katha. Missing optional items do not block either path.

The implemented candidate sequence is maintained in `lib/content/steps.ts` and includes preparation, lamp, opening, Sankalpam, Dhyana/Avahana, hospitality offerings, Gandha/Akshata, Dhupa/Deepa, Naivedyam, Harati, respect/forgiveness and Yatha Shakti completion.

## Sankalpam and people

- Never infer or assign Gotra, Veda, Sutra, Shakha, Pravara or Sampradaya.
- `UNKNOWN` and `UNSURE` remain exactly as entered.
- A deity-associated or generic Gotra must never be saved as the person's lineage.
- A family can use a shared family intention only after that wording is reviewed.
- Unrelated students or friends remain separately named participants; the app must not describe them as one family.
- Location and calendar phrases must come from validated local Panchanga data before public release.

## Materials and patri

The preparation checklist is helpful, not a completeness test. The 21-patri list remains under reconciliation. Users must never pick an unidentified plant. The consulted priest permits available traditional patri, or flowers/akshata when patri is unavailable. Until supported by a written citation and/or recorded review, this is a `PRIEST_REVIEWED_PRACTICE` candidate, not verified scripture.

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
