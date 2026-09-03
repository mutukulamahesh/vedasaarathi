# VedaSaarathi Vision

**Document status:** Product vision — canonical
**Version:** 1.1 (merged; supersedes and replaces the former `docs/VEDASAARATHI_VISION.md`)
**Date:** September 3, 2026
**First implementation:** Vinayaka Chavithi pilot
**Pilot audience:** Telugu households, students, families, and groups living in the United States

> **Document map.** This is the single source of truth for long-term direction.
> - `docs/VISION.md` — complete long-term platform direction (this file)
> - `docs/PRODUCT_PRINCIPLES.md` — short rules for everyday product, content, design, and engineering decisions
> - `docs/VINAYAKA_V1_SCOPE.md` — the current pilot contract (what ships, what does not, and when it is ready)
> - `IMPLEMENTATION_PLAN.md` — the dated execution plan and task status

## 1. The idea in one sentence

VedaSaarathi is a trusted, location-aware Dharma companion that helps ordinary
people understand, prepare for, and perform verified Hindu practices in simple
language, without guessing their tradition or presenting unreviewed religious
content as truth.

It is not only a Panchanga, a digital puja book, or an AI chat application. It
connects verified calendar information, family context, preparation, and guided
practice into one honest journey.

## 2. Why VedaSaarathi should exist

Many Hindu families want to observe festivals and perform home pujas but face
practical problems:

- They may not know the complete procedure.
- They may understand Telugu or English but not formal Sanskrit instructions.
- They may not know their Gotra, Veda, Sutra, Shakha, Pravara, or Sampradaya.
- They may know only part of their family tradition.
- Students and families living outside India may not have all the traditional
  materials.
- Festival dates and suitable times can differ by location and timezone.
- Online instructions often mix traditions or provide no reliable source.
- Different books, priests, regions, and families may follow legitimate
  variations.
- General AI systems can confidently invent mantras, citations, ritual rules, or
  lineage information.
- A person performing a puja for the first time may feel afraid of making a
  mistake.

The problem is not a lack of information. The problem is knowing which
information is authentic, which tradition it belongs to, whether it applies to
this person and location, and how to follow it without confusion.

VedaSaarathi should make Dharma practice approachable without reducing its
seriousness.

## 3. Meaning of the name

Saarathi means a guide or charioteer. VedaSaarathi should guide the user
patiently through Dharma knowledge and practice. It does not claim to replace
scripture, an Acharya, a qualified scholar, or a practicing priest.

The product behaves like a careful guide:

- It tells the user what to do.
- It shows how to do it.
- It explains why it is done.
- It speaks the instruction when reviewed audio is available.
- It pauses and repeats without rushing.
- It admits when an answer is unknown or awaiting review.
- It recommends consulting a qualified person when the situation is outside the
  app's approved scope.

## 4. Mission

Help people practice Dharma with confidence, understanding, sincerity, and
respect for their own tradition.

## 5. Long-term vision

VedaSaarathi should become a free, multilingual platform for:

- Daily location-aware Panchanga information
- Festival discovery and preparation
- Personal and family tradition profiles
- Guided home pujas and vratas
- Reviewed Sankalpam assistance
- Mantra text and pronunciation from approved sources
- Simple explanations of ritual actions and their meanings
- Family and group participation
- Children's learning
- Preservation of regional and Sampradaya variations
- Transparent sources and scholar review
- Carefully bounded question-and-answer assistance

The long-term product is much larger than one festival. Vinayaka Chavithi is the
first deep case used to prove the approach.

## 6. People VedaSaarathi serves

### 6.1 Beginners

People performing a puja for the first time should be able to proceed without
already knowing religious terminology.

### 6.2 Students and young adults living away from India

Students may live in apartments, perform a festival with friends, have limited
materials, and have no priest immediately available. VedaSaarathi should give
them a safe, simple, reviewed path that respects practical limits.

### 6.3 Families outside India

Families need location-correct festival information, preparation support, guidance
for children, and authentic alternatives when traditional materials are
unavailable.

### 6.4 Parents and children

Parents should be able to perform the practice while children understand what is
happening and why.

### 6.5 Elderly users

The experience should use readable text, clear audio, large controls, simple
navigation, and minimal technical language.

### 6.6 People who know their family tradition

Users who know their Gotra, Pravara, Veda, Shakha, Sutra, or Sampradaya should
receive reviewed guidance appropriate to those details when an approved variant
exists.

### 6.7 People who know only some details

The system should use only the information the user actually knows. It must not
fill missing fields by inference.

### 6.8 People who know none of these details

Unknown religious or lineage information should never prevent a sincere person
from using the app. VedaSaarathi should provide an approved general path when one
exists, clearly state its scope, and never invent ancestry.

### 6.9 Families and groups

The platform should support:

- One person performing alone
- A family performing together
- Students or friends performing as a group
- Multiple participant profiles
- Reviewed group or individual Sankalpam rules

Collecting several participant profiles does not itself determine the correct
Sankalpam. The wording and participant treatment remain blocked until reviewed
rules are available.

## 7. The core product experience

### 7.1 Personalized home

The home page is a calm daily Dharma dashboard, not a marketing page and not a
crowded almanac.

With permission, it uses the user's location. Manual location entry must always
be available.

The home page can show:

- Today's date and location
- Verified Tithi and Nakshatra
- Sunrise and sunset
- Important observances
- Upcoming festival cards
- Preparation progress
- Start or resume puja
- Selected household or group
- Quick access to calendar, pujas, and profiles

The home page changes according to context:

- On the first visit, it helps with location and basic setup.
- On an ordinary day, it shows today's relevant information.
- Before a festival, preparation becomes prominent.
- On the festival day, Start Puja becomes the primary action.
- During an unfinished puja, Resume Puja becomes the primary action.

### 7.2 Location-aware Panchanga

The app should use the user's location, timezone, and daylight-saving rules to
determine local Panchanga information and festival observance.

It should explain why a date or time may differ from India or another US city.
Users should be able to open a simple explanation showing:

- Location used
- Relevant Tithi start and end
- Sunrise or other applicable boundary
- Observance rule used
- Resulting local festival date
- Calculation version and validation sources

VedaSaarathi must not silently copy a calendar value or display an unverified
calculation as final. Any location-based date or time carries its timezone and
its calculation or source. A bare date is placeholder ("pilot") data and is
labelled as such.

### 7.3 Festival cards and calendar

The monthly calendar should show relevant festivals. Selecting a festival opens
its complete journey:

1. What the festival is
2. Local observance date and time
3. Preparation timeline
4. Participants
5. Materials
6. Approved alternatives
7. Puja detail level
8. Guided practice
9. Completion and family notes

### 7.4 Progressive tradition profile

Every religious profile field carries its own state:

- `KNOWN`
- `UNKNOWN`
- `UNSURE`

This applies independently to fields such as Gotra, Pravara, Veda, Shakha,
Sutra, Sampradaya, and regional or family practice. (The Vinayaka Chavithi pilot
implements four of these: Gotra, Veda, Sutra, Sampradaya.)

The app must never infer these from surname, caste, language, birthplace, family
region, or present location.

Location and language may help select presentation or a broadly scoped guidance
path. They must never be used to infer ancestry or Vedic affiliation.

### 7.5 Festival preparation

Preparation should prevent users from discovering missing items halfway through a
puja.

For every item, the app should show:

- Simple name
- Picture or identification help where safe and useful
- What it is
- How it is used
- Whether the classification has been reviewed
- Whether an approved alternative exists
- Source and reviewer information
- Safety warnings where relevant

The app accepts practical limitations. A student in the United States may not
have the same materials as a household in India.

The principle is yathashakti: practice sincerely according to one's ability and
available means. This principle is **not** permission for the software to invent
substitutions. Every displayed alternative has an identified authority level and
applicable scope.

Missing materials must not create shame or confusion. Show an approved
alternative when one exists. If no reviewed alternative exists, say so plainly
and offer only the next reviewed option. Unknown lineage does not block a general
approved path; missing reviewed religious content can legitimately stop the app
from claiming the puja is complete.

### 7.6 Guided puja

The guided puja is the heart of VedaSaarathi.

Each approved step should contain:

1. **What to do** — one direct instruction
2. **How to do it** — simple physical guidance
3. **What to say** — canonical text only when approved
4. **Listen** — reviewed pronunciation audio
5. **Meaning** — a clearly separated translation
6. **Why we do it** — a simple explanation with its authority level
7. **Source** — optional detail for users who want verification

Controls should include Previous, Next, Pause, Repeat, slower audio where
appropriate, Resume after interruption, and Keep screen awake during puja.

Future kriya animation or video may demonstrate physical actions. It must be
based on an approved procedure and must not replace or contradict the reviewed
instruction.

### 7.7 Help during the puja

Users commonly face questions such as: I do not have a particular item; we
started late; I forgot a step; a child touched an offering; I cannot pronounce
the mantra; we need to pause.

The first version uses a bounded set of reviewed questions and answers. It does
not use open-ended AI to invent ritual corrections.

Future conversational assistance may retrieve approved answers, explain them
simply, and clearly say when no reviewed answer exists.

### 7.8 Completion

The app may declare **Puja Completed** only when the approved required journey
was actually available and completed.

If the content is still a prototype or important steps are unavailable, it must
say **Prototype Walkthrough Completed**, not Puja Completed.

A completed experience may offer a reviewed closing message, the vrata story or
festival reading, a children's explanation, family notes, a saved completion
record, and suggestions for the next relevant observance.

There is no payment prompt inside the worship flow.

## 8. Language and explanation standard

All visible language should be understandable to someone performing the puja for
the first time.

The app should:

- Use short, natural sentences.
- Tell the user what to do before giving background.
- Explain every Sanskrit or traditional word immediately.
- Avoid unexplained scholarly terminology.
- Avoid fear, blame, or threats about mistakes.
- Avoid claiming that one sincere error invalidates the user's worship unless an
  approved authority specifically requires such a warning.
- Distinguish instruction, mantra, meaning, explanation, and opinion visually and
  structurally.

Example:

> Naivedyam means food offered to God before it is shared as prasadam.

Avoid:

> Perform the prescribed Naivedya Upachara according to the relevant Paddhati.

Initial languages:

- Simple English — required
- Simple Telugu instructions — required for a usable religious pilot
- Telugu with English explanation

Canonical Sanskrit text must remain unchanged across interface languages.
Reviewed pronunciation audio is a target; where recording cannot be completed,
the app shows reviewed text and clearly marks audio as unavailable rather than
simulating it.

## 9. Trust architecture

VedaSaarathi's defining feature is not AI. It is trustworthy handling of Dharma
knowledge.

### 9.1 Non-negotiable rules

- Never invent lineage.
- Never generate, complete, rewrite, or silently correct a canonical mantra.
- Never invent a textual citation.
- Never merge traditions without disclosure.
- Never present one regional practice as universal Hindu practice.
- Never hide a genuine disagreement between authorities.
- Never let AI-generated explanation appear as canonical text.
- Never release sacred guidance that has not passed the required review gate.
- Never recommend an unidentified or unsafe plant or material.
- Never claim two offerings have equal ritual effect without an approved basis.

### 9.2 Content kind is separate from religious review status

Two independent ideas, never collapsed into one list:

```
type ContentKind =
  | "PRACTICAL_GUIDANCE"   // comfort, logistics, safety; makes no religious claim
  | "RELIGIOUS_CLAIM";     // anything about the rite, its words, materials, meaning

type ReligiousReviewStatus =
  | "VERIFIED"
  | "PRIEST_REVIEWED_PRACTICE"
  | "REGIONAL_CUSTOM"
  | "REVIEW_REQUIRED";
```

- `PRACTICAL_GUIDANCE` carries **no** religious review status. Example: "Keep the
  flame away from children."
- `RELIGIOUS_CLAIM` **must** carry a `ReligiousReviewStatus`, and defaults to
  `REVIEW_REQUIRED` until a reviewer approves the exact statement. Example:
  "Light the lamp as the first step of the puja" is a `RELIGIOUS_CLAIM` that is
  `REVIEW_REQUIRED`, even though lighting a lamp safely is practical guidance.

This split exists so a religious instruction can never be released by mislabelling
it as general help.

### 9.3 Content layers

Content is stored in distinct layers:

1. Canonical or source text
2. Procedural instruction
3. Tradition and regional scope
4. Translation
5. Pronunciation or audio
6. Plain-language explanation
7. Practical safety guidance
8. Reviewer decision
9. Product presentation

Changing an explanation must never modify the canonical layer.

### 9.4 Authority hierarchy

VedaSaarathi recognizes multiple kinds of authority rather than pretending all
sources are equal:

1. Primary or canonical texts
2. Kalpa, Grihya, and related ritual sources
3. Prayoga, Paddhati, Vrata Kalpa, and Dharma/Nirnaya literature
4. Recognized institutional scholarship and critical editions
5. Qualified living practitioners and Sampradaya authorities
6. Established temple or Matha publications
7. Regional and family custom, clearly labeled
8. Blogs, videos, social media, and general AI as **discovery sources only**

A discovery source can lead researchers to evidence. It cannot become authority
merely because it is popular or easy to access.

### 9.5 Minimum evidence by release status

Different statuses need different minimum evidence before content may be shown as
guidance:

| Status | Required evidence |
| --- | --- |
| `VERIFIED` | Written source, exact reference, edition where relevant, reviewer, reviewer qualification, review date, content version, tradition and regional scope |
| `PRIEST_REVIEWED_PRACTICE` | Exact approved statement, named priest, qualification, review date, content version, tradition scope. A written source may be pending. |
| `REGIONAL_CUSTOM` | Region or community scope, named knowledgeable reviewer, review date, content version, and evidence that the practice is followed there |
| `REVIEW_REQUIRED` | Never displayed as guidance |

This distinction matters for the 21-patri fallback. If a priest approves offering
flowers or akshata but no written textual source can be confirmed, that fallback
may be released **only** as clearly labelled `PRIEST_REVIEWED_PRACTICE` — never as
textually verified scripture, and never as a claim of ritual equivalence.

### 9.6 Provenance for every religious claim

Every releasable religious statement records: claim identifier, exact claim text,
source title, exact source reference, edition or publication details where
applicable, rights and permitted use, tradition and regional scope, reviewer
name, reviewer qualification, review date, review decision, content version,
known variants or disagreements, and written-source status.

### 9.7 Disagreements are data

When two qualified sources or traditions differ, VedaSaarathi does not ask
software or AI to choose secretly. It records both variants, the tradition or
region for each, sources and reviewers, the reason for the difference when known,
and what to do when the user's family practice is unknown.

The user receives the variant supported by their known profile. If the correct
choice cannot be determined, the app explains the uncertainty and offers only an
approved general path.

### 9.8 Content rights

Availability on the internet does not mean content can be copied, translated,
redistributed, recorded, or used for AI retrieval.

Every source has a rights record covering public-domain status, display
permission, translation permission, derivative-work permission, audio permission,
AI or retrieval ingestion permission, attribution requirements, and
commercial-use restrictions (even though the service is free).

## 10. Scholar and practitioner governance

Software engineers do not make unresolved religious decisions.

The governance model should eventually include a Vedic textual scholar, a Telugu
household-practice priest or Pandit, a Panchanga and Jyotisha calculation expert,
relevant Sampradaya authorities as coverage expands, regional-practice reviewers,
language and pronunciation reviewers, and content-rights review.

A reviewer approves a specific version of a specific claim. A person's general
participation does not automatically approve the whole product.

## 11. Technology direction

- Mobile-first web application and PWA
- React and TypeScript user interface
- Python services for Panchanga calculations, observance rules, tradition
  resolution, data processing, and future retrieval assistance
- Structured knowledge records first, with a database as the corpus grows
- Automated tests for religious safety, calculations, accessibility, and complete
  user journeys

Technology choices support the product but do not determine religious truth. A
compiler, test, database, or AI model cannot replace source and practitioner
review.

## 12. Responsible use of AI

AI may eventually help with finding approved content, explaining reviewed content
in simpler language, transliteration assistance, navigating known variants,
answering bounded questions from the verified knowledge base, and helping
internal researchers find unresolved gaps.

AI must not independently generate canonical mantras, invent ritual steps, choose
a lineage, create religious substitutions, resolve a Sampradaya disagreement,
present a guessed citation, or give open-ended expiation or corrective ritual
advice.

When no approved answer exists, the correct response is:

> We do not have a reviewed answer for this yet. Please follow your family
> practice or ask a qualified priest.

User data and sacred-source data are not sent to an external AI service without
explicit, recorded approval.

## 13. Accessibility and dignity

The product should be usable under real puja conditions: a phone or tablet placed
beside the user, hands occupied with materials, several family members listening,
children participating, older users reading the screen, temporary interruption,
and limited internet connectivity.

Important capabilities include large readable text, clear contrast, screen-reader
support, keyboard and touch accessibility, slow and repeatable audio, offline or
resilient festival content where practical, no disruptive advertising, and no
shame when information or materials are missing.

## 14. Product and funding principles

VedaSaarathi remains free to use.

The worship journey must not contain premium barriers, paid mantra access,
subscription prompts, advertising, fear-based upselling, paid remedies, or
astrology and financial predictions used to sell services.

An optional Hundi may exist **outside** the worship flow. It is quiet, voluntary,
and never affects access or religious guidance. Donations may support hosting,
preservation, source licensing, audio recording, and scholar review.

## 15. What makes VedaSaarathi different

Some existing products provide Panchanga, puja instructions, Sankalpam tools,
audio, tradition-specific rituals, or AI priest-style assistance. VedaSaarathi
does not claim uniqueness merely because it combines these features.

Its intended difference is the combination of: beginner-first experience; simple
human language; location-aware observance; known, partial, and unknown profile
support; no invented lineage; family and student-group participation; transparent
provenance; scholar and practitioner governance; explicit tradition variants;
separation of canonical text from explanation; release gates for unreviewed
religious content; practical support for life outside India; and free access
without fear-based monetization.

The long-term moat is the verified Dharma knowledge and governance system, not a
chatbot interface.

## 16. Delivery strategy: narrow first, deep first

VedaSaarathi does not attempt to cover every Veda, Agama, Sampradaya, language,
and festival at once.

The expansion model is:

1. Choose one practice.
2. Define its exact tradition and regional scope.
3. Gather usable sources and permissions.
4. Record questions and variants.
5. Obtain qualified review.
6. Build the guided experience.
7. Test it with beginners and knowledgeable families.
8. Correct the content through governed versions.
9. Expand carefully to the next practice.

The first case is:

> Vinayaka Chavithi → Telugu household practice → United States location →
> individual, family, and student/friends group → known, partial, or unknown
> tradition information.

## 17. Vinayaka Chavithi pilot

### 17.1 Purpose

The pilot tests whether a person with limited religious knowledge can prepare for
and complete an approved Telugu household Vinayaka Chavithi journey without the
app guessing missing information.

### 17.2 Two milestones

The pilot is delivered in two distinct milestones with separate release gates:

| Milestone | Meaning |
| --- | --- |
| **Technical prototype** | The interface and the safety gates work. Religious content may still be unavailable. May be deployed privately with gated content. |
| **Usable religious pilot** | A real family can complete the reviewed required Vinayaka Chavithi puja from beginning to end. |

A technically safe empty shell is not a production Vinayaka Chavithi puja. See
`docs/VINAYAKA_V1_SCOPE.md` for the exact criteria of each milestone.

### 17.3 Intended pilot flow

1. Open the personalized home page.
2. Confirm or enter location.
3. Select the Vinayaka Chavithi card.
4. Choose individual, family, or group participation.
5. Enter known details and preserve unknown or unsure fields.
6. Review the preparation list.
7. Mark available materials.
8. See only approved alternatives for unavailable items.
9. Select beginner or traditional detail level when reviewed variants exist.
10. Start the guided puja.
11. Follow approved text, audio, actions, meanings, and explanations.
12. Pause, repeat, and resume as needed.
13. Complete the puja only after all approved required steps are available.

### 17.4 Current religious blockers

Blocked until the appropriate review is complete: the exact approved Vinayaka
Chavithi procedure; essential, optional, and tradition-specific step
classification; canonical mantras and approved editions; Sankalpam wording;
treatment of individual, family, and group participants in Sankalpam; handling of
unknown Gotra, Veda, Sutra, Shakha, or Pravara; the authoritative 21-patri list
and botanical identification; the approved fallback when some or all patri are
unavailable; material substitutions in the United States; Naivedyam requirements
and variants; Prana Pratishtha, Udvasana, and Visarjana scope for household
beginners; what a layperson should not attempt without a qualified priest;
reviewed Telugu pronunciation audio; and location-correct Panchanga and
observance-rule validation.

### 17.5 Practical patri principle

The platform tells users that traditional materials are preferred only after the
statement and its scope are approved. Users are never encouraged to collect an
unknown plant.

When materials are unavailable, the app may present a yathashakti or substitution
path only when that exact guidance has documented or named-practitioner review.
Priest-reviewed practice is labelled separately from a directly verified textual
rule.

Until the exact list and fallback are approved, the production interface shows no
named leaf recommendation and no claim of equivalence.

## 18. Non-goals

VedaSaarathi is not intended to:

- Replace a qualified priest, Guru, Acharya, or scholar
- Claim ownership of the Vedas or Hindu tradition
- Present one universal Hindu procedure
- Infer caste, ancestry, or lineage
- Generate sacred content freely with AI
- Mix traditions for convenience
- Provide fear-based astrology
- Predict stocks, finances, illness, marriage, or fate
- Sell remedies
- Put essential religious practice behind a paywall
- Treat blogs, videos, random PDFs, or AI answers as final authority
- Finish the entire platform before validating one trustworthy end-to-end
  practice

## 19. Product success

The first pilot succeeds when:

- A beginner understands every instruction without outside explanation.
- A student or family with limited materials receives safe and approved guidance.
- A user can proceed when tradition details are unknown.
- No lineage field is invented.
- No canonical mantra is generated or changed.
- Every religious claim shown as guidance passes its release gate.
- Location and festival information is clearly sourced and scoped.
- A family or group can prepare without losing participant information.
- Progress can be resumed after an interruption.
- The app never declares Puja Completed when approved required content was
  unavailable.
- Users can see what is textual authority, practitioner-reviewed practice,
  regional custom, practical help, or still under review.
- Reviewers can trace every released claim to its version and evidence.

Long-term success means families trust VedaSaarathi not because it always gives
an answer, but because it is honest about what is known, what varies, and what
still requires qualified review.

## 20. Roadmap

### Phase 0: Research and governance

- Authority model
- Source and rights registry
- Scholar-review workflow
- Competitor understanding
- Vinayaka Chavithi case study

### Phase 1: Vinayaka Chavithi pilot

- Personalized home
- Pilot location
- Participant profiles
- Preparation journey
- Approved materials and alternatives
- Approved guided puja
- Simple English and simple Telugu instructions
- Reviewed audio where available; audio clearly marked unavailable otherwise
- Resume after interruption
- End-to-end safety tests

### Phase 2: Production foundation

- Real location permission and manual entry
- Panchanga calculation and validation
- Account and family profile persistence
- Content versioning and reviewer tools
- Offline/PWA behavior
- Production monitoring and feedback

### Phase 3: More festivals and household practices

- Add one reviewed festival at a time
- Expand Telugu content
- Introduce children's explanations
- Add verified common-question guidance

### Phase 4: More traditions and languages

- Add variants only with qualified authorities
- Expand regional and Sampradaya coverage
- Add Indian-language scripts and reviewed audio

### Phase 5: Verified Dharma knowledge assistant

- Retrieval only from approved knowledge
- Citation and authority shown with answers
- Clear refusal when no reviewed answer exists
- No autonomous sacred-content generation

## 21. Decisions that remain open

The following product decisions require further work and must be tracked
explicitly, never resolved silently inside application code:

- Exact first approved tradition scope within Telugu household practice
- Reviewer qualifications and approval quorum for each content class
- Minimum evidence required for practitioner-reviewed substitutions (beyond the
  table in section 9.5)
- How users select among valid variants
- Whether and how family profiles synchronize across devices
- Privacy model for sensitive family and lineage data
- Offline audio and content packaging
- Panchanga calculation library and observance-rule authority
- Content licensing for text, translations, and recordings
- Governance and correction process after public release
- Hundi administration and financial transparency
- Whether the Technical prototype milestone may be shown to any real family, or
  only to the internal team and reviewers

## 22. Status today (September 2026)

The Vinayaka Chavithi **technical prototype** front-end exists: home,
participants, preparation, a guided-puja shell, and a completion screen, stored
on the device only.

- No sacred content has been reviewed, so the guided puja currently shows the
  awaiting-review notice for the ritual steps and shows only practical steps.
- English only. A note says a Telugu version is being prepared.
- Audio is disabled and labelled unavailable.
- Location, date, and countdown are labelled pilot data. Panchanga values are
  shown only as "being verified".
- Resume is **not yet implemented**: the current build saves the step number but
  resets it to zero when the guided puja starts.
- The completion screen currently says "Puja Completed"; per section 7.8 it must
  say "Prototype Walkthrough Completed" until the approved required journey is
  available.

The platform described in sections 5 through 16 is the direction, not the current
state.

## 23. Guiding statement

VedaSaarathi should help a person say:

> I understand what I am doing. I know which guidance applies to me. The app did
> not guess what I do not know. I can see where the guidance came from. I was
> able to worship sincerely with what I had.

That is the standard for the platform.
