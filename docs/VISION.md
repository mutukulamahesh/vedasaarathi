# VedaSaarathi Vision

This document describes the whole VedaSaarathi platform. The Vinayaka Chavithi
pilot is only the first slice of it. For what ships in September, see
[VINAYAKA_V1_SCOPE.md](./VINAYAKA_V1_SCOPE.md). For the short working rules that
follow from this vision, see [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md).

---

## 1. Product purpose

VedaSaarathi helps ordinary Hindu families, students and groups understand and
perform verified religious practices correctly, even when they have limited
religious knowledge or limited materials.

Many sincere people want to observe a festival or perform a puja at home but are
held back by three things:

- They do not know the steps, the words, or what the words mean.
- They do not know their own family tradition details, and they are afraid of
  getting it wrong.
- They cannot find every traditional item where they live.

VedaSaarathi removes those blocks without inventing anything. It explains, in
plain language, what to do, how to do it, and why. It keeps unknown information
unknown. It shows only content that a qualified reviewer has approved, and it
says clearly where each piece of guidance comes from.

The goal is quiet confidence for a first-time performer, not scholarship.

---

## 2. People we serve

VedaSaarathi is built for people who are usually left out by existing tools:

- **Beginners** who have never performed a puja on their own.
- **Indian students living abroad** who want to keep a practice going far from home.
- **Families living outside India** who are raising children in a different country.
- **Parents teaching children**, who need explanations a child can follow.
- **Elderly users**, who need large text, calm pacing, and no clutter.
- **People who know their complete tradition** (Gotra, Veda, Sutra, Sampradaya).
- **People who know only some of their tradition details.**
- **People who know none of their lineage details.**
- **Families and groups** performing together, including student or friend groups
  with no shared lineage.

No one in this list is treated as behind or lacking. The person who knows nothing
about their lineage gets the same complete, respectful journey as the person who
knows everything.

---

## 3. The complete platform

The full platform is broad. Not all of it ships at once. It includes:

**Home and calendar**

- A personalized daily home page.
- Permission-based location, with manual location entry always available.
- Location-aware Panchanga.
- Today's Tithi, Nakshatra, sunrise and sunset.
- Upcoming festival cards.
- A monthly festival calendar.
- A plain-language explanation of why festival dates differ by location.

**Profiles and participants**

- Personal and family profiles.
- Tradition fields with three honest states: known, unknown, and unsure.
- Individual, family, and group Sankalpam support.

**Preparation**

- Festival preparation guidance.
- A materials checklist with plain-language explanations.
- Authentic alternatives for missing materials, each with its authority level.

**Guided puja**

- A step-by-step guided puja.
- Simple Telugu and English.
- Audio guidance.
- Kriya (action) animations in a later phase.
- Separate sections for the instruction, the meaning, and the "Why?".
- Pause, repeat, and resume.
- Children's explanations.

**Knowledge and trust**

- Verified question-and-answer guidance (curated, not open-ended generation).
- Sources and scholar review shown with the content.
- Tradition variants represented clearly instead of being flattened into one.

---

## 4. Core product journey

Every festival follows the same shape:

1. **Home** — see what matters today.
2. **Select a festival.**
3. **Select participants** — only me, my family, or a student or friend group.
4. **Review family and tradition information** — fill in what is known; leave the
   rest as unknown or unsure.
5. **Prepare materials** — mark what is available.
6. **Review unavailable items** — see approved alternatives and their authority level.
7. **Start the guided puja.**
8. **Follow each step** — instruction, audio, and kriya, with meaning and "Why?"
   on demand.
9. **Complete the puja.**
10. **Save family notes** for next time.

The journey never stops because a tradition detail is unknown or a material is
missing.

---

## 5. Trust model

Trust is the product. The rules below are absolute and are enforced in
`.claude/rules/sacred-content.md`.

- **Never invent lineage.** Gotra, Pravara, Veda, Shakha, Sutra, Sampradaya, and
  family lineage are never guessed, defaulted, or inferred from a surname, caste,
  language, region, or current location.
- **Never invent or modify canonical mantras.** Mantra text is never generated,
  completed, corrected, or paraphrased from memory.
- **Never invent textual citations.**
- **Never present one tradition as universal.** A regional or family practice is
  labelled as such.
- **Never hide legitimate disagreements.** Where authoritative sources differ, the
  alternatives are preserved and shown.
- **Separate canonical content from explanation.** Source text, pronunciation,
  translation, plain-language explanation, and any AI-assisted help are kept
  visibly distinct.
- **Show source and reviewer information** with the content it belongs to.
- **Block unreviewed sacred content from production.** Anything marked
  `REVIEW_REQUIRED` is shown only as "awaiting religious review", never as guidance.
- **Treat authority levels as different.** "Checked against a written source",
  "priest-reviewed practice", and "regional or family custom" are not the same
  and are never displayed as if they were.

Practical, non-religious help (for example "sit where you can reach everything",
or fire-safety advice for lighting a lamp) is labelled as practical guidance and
is never dressed up as reviewed sacred content.

---

## 6. How VedaSaarathi is different

VedaSaarathi is not a Panchanga app, not a digital puja book, and not an "AI
priest". It differs on purpose:

- **Beginner-first.** Written for someone doing this for the first time, not for
  someone who already knows the procedure.
- **Unknown-information friendly.** Missing lineage details are normal and never
  block the journey.
- **Tradition-aware.** Region, language, and Sampradaya are first-class, not
  assumed.
- **Source-transparent.** Every claim carries where it came from and who reviewed it.
- **Scholar-governed.** Sacred content is added by review, not by generation.
- **Location-aware.** Dates, times, and the reason they differ by place are explained.
- **Group and family support.** Individual, family, and student or friend groups
  are all supported, including groups with no shared lineage.
- **Free.** Worship guidance is not sold.
- **Optional Hundi only.** A voluntary donation option may exist; it is never in
  the path of worship.
- **No fear.** No fear-based astrology, no paid remedies, no guilt.

---

## 7. Delivery strategy

The platform is broad, but development is **narrow and deep**. One complete,
trustworthy journey ships before the next one starts.

**First**

- Festival: Vinayaka Chavithi.
- Tradition: Telugu household practice.
- Location: United States.
- Use: individual, family, and student or friend group.

**Later**

- More festivals.
- More languages.
- More regional traditions.
- More Sampradayas.
- Expanded Dharma knowledge and question-and-answer guidance.

Each expansion repeats the same discipline: build one journey end to end, get it
reviewed, ship it, then widen.

---

## 8. Non-goals

VedaSaarathi will not:

- Replace qualified priests.
- Claim one universal Hindu procedure.
- Guess a person's religious identity.
- Do open-ended AI generation of sacred content.
- Make astrology predictions.
- Sell remedies.
- Put a paywall inside worship.

---

## Status today

The Vinayaka Chavithi pilot front-end exists: home, participants, preparation,
a guided-puja shell, and completion, saved on the device only. No sacred content
has been reviewed yet, so reviewed guidance is not shown. The platform features
listed above in sections 3 and 4 are the direction, not the current state.
