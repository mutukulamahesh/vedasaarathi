# VedaSaarathi Vision

**Document status:** Product vision  
**Version:** 1.0  
**Date:** September 3, 2026  
**First implementation:** Vinayaka Chavithi pilot  
**Pilot audience:** Telugu households, students, families, and groups living in the United States

## 1. The idea in one sentence

VedaSaarathi is a trusted, location-aware Dharma companion that helps ordinary people understand, prepare for, and perform verified Hindu practices in simple language, without guessing their tradition or presenting unreviewed religious content as truth.

## 2. Why VedaSaarathi should exist

Many Hindu families want to observe festivals and perform home pujas but face practical problems:

- They may not know the complete procedure.
- They may understand Telugu or English but not formal Sanskrit instructions.
- They may not know their Gotra, Veda, Sutra, Shakha, Pravara, or Sampradaya.
- They may know only part of their family tradition.
- Students and families living outside India may not have all the traditional materials.
- Festival dates and suitable times can differ by location and timezone.
- Online instructions often mix traditions or provide no reliable source.
- Different books, priests, regions, and families may follow legitimate variations.
- General AI systems can confidently invent mantras, citations, ritual rules, or lineage information.
- A person performing a puja for the first time may feel afraid of making a mistake.

The problem is not a lack of information. The problem is knowing which information is authentic, which tradition it belongs to, whether it applies to this person and location, and how to follow it without confusion.

VedaSaarathi should make Dharma practice approachable without reducing its seriousness.

## 3. Meaning of the name

Saarathi means a guide or charioteer. VedaSaarathi should guide the user patiently through Dharma knowledge and practice. It should not claim to replace scripture, an Acharya, a qualified scholar, or a practicing priest.

The product behaves like a careful guide:

- It tells the user what to do.
- It shows how to do it.
- It explains why it is done.
- It speaks the instruction when reviewed audio is available.
- It pauses and repeats without rushing.
- It admits when an answer is unknown or awaiting review.
- It recommends consulting a qualified person when the situation is outside the app's approved scope.

## 4. Mission

Help people practice Dharma with confidence, understanding, sincerity, and respect for their own tradition.

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

The long-term product is much larger than one festival. Vinayaka Chavithi is the first deep case used to prove the approach.

## 6. People VedaSaarathi serves

### 6.1 Beginners

People performing a puja for the first time should be able to proceed without already knowing religious terminology.

### 6.2 Students and young adults living away from India

Students may live in apartments, perform a festival with friends, have limited materials, and have no priest immediately available. VedaSaarathi should give them a safe, simple, reviewed path that respects practical limits.

### 6.3 Families outside India

Families need location-correct festival information, preparation support, guidance for children, and authentic alternatives when traditional materials are unavailable.

### 6.4 Parents and children

Parents should be able to perform the practice while children understand what is happening and why.

### 6.5 Elderly users

The experience should use readable text, clear audio, large controls, simple navigation, and minimal technical language.

### 6.6 People who know their family tradition

Users who know their Gotra, Pravara, Veda, Shakha, Sutra, or Sampradaya should receive reviewed guidance appropriate to those details when an approved variant exists.

### 6.7 People who know only some details

The system should use only the information the user actually knows. It must not fill missing fields by inference.

### 6.8 People who know none of these details

Unknown religious or lineage information should never prevent a sincere person from using the app. VedaSaarathi should provide an approved general path when one exists, clearly state its scope, and never invent ancestry.

### 6.9 Families and groups

The platform should support:

- One person performing alone
- A family performing together
- Students or friends performing as a group
- Multiple participant profiles
- Reviewed group or individual Sankalpam rules

Collecting several participant profiles does not itself determine the correct Sankalpam. The wording and participant treatment must remain blocked until reviewed rules are available.

## 7. The core product experience

### 7.1 Personalized home

The home page is a calm daily Dharma dashboard, not a marketing page and not a crowded almanac.

With permission, it uses the user's location. Manual location entry must always be available.

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

The app should use the user's location, timezone, and daylight-saving rules to determine local Panchanga information and festival observance.

It should explain why a date or time may differ from India or another US city. Users should be able to open a simple explanation showing:

- Location used
- Relevant Tithi start and end
- Sunrise or other applicable boundary
- Observance rule used
- Resulting local festival date
- Calculation version and validation sources

VedaSaarathi must not silently copy a calendar value or display an unverified calculation as final.

### 7.3 Festival cards and calendar

The monthly calendar should show relevant festivals. Selecting a festival opens its complete journey:

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

Every religious profile field must carry its own state:

- `KNOWN`
- `UNKNOWN`
- `UNSURE`

This applies independently to fields such as:

- Gotra
- Pravara
- Veda
- Shakha
- Sutra
- Sampradaya
- Regional or family practice

The app must never infer these from surname, caste, language, birthplace, family region, or present location.

Location and language may help select presentation or a broadly scoped guidance path. They must never be used to infer ancestry or Vedic affiliation.

### 7.5 Festival preparation

Preparation should prevent users from discovering missing items halfway through a puja.

For every item, the app should show:

- Simple name
- Picture or identification help where safe and useful
- What it is
- How it is used
- Whether the classification has been reviewed
- Whether an approved alternative exists
- Source and reviewer information
- Safety warnings where relevant

The app should accept practical limitations. A student in the United States may not have the same materials as a household in India.

The principle is yathashakti: practice sincerely according to one's ability and available means. However, this principle must not be used as permission for the software to invent substitutions. Every displayed alternative must have an identified authority level and applicable scope.

If no approved alternative is available, the app should say so plainly.

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

Controls should include:

- Previous
- Next
- Pause
- Repeat
- Slower audio where appropriate
- Resume after interruption
- Keep screen awake during puja

Future kriya animation or video may demonstrate physical actions. It must be based on an approved procedure and must not replace or contradict the reviewed instruction.

### 7.7 Help during the puja

Users commonly face questions such as:

- I do not have a particular item.
- We started late.
- I forgot a step.
- A child touched an offering.
- I cannot pronounce the mantra.
- We need to pause.

The first version should use a bounded set of reviewed questions and answers. It should not use open-ended AI to invent ritual corrections.

Future conversational assistance may retrieve approved answers, explain them simply, and clearly say when no reviewed answer exists.

### 7.8 Completion

The app may declare Puja Completed only when the approved required journey was actually available and completed.

If the content is still a prototype or important steps are unavailable, it must say Prototype Walkthrough Completed, not Puja Completed.

A completed experience may offer:

- Reviewed closing message
- Vrata story or festival reading
- Children's explanation
- Family notes
- Saved completion record
- Suggestions for the next relevant observance

There must be no payment prompt inside the worship flow.

## 8. Language and explanation standard

All visible language should be understandable to someone performing the puja for the first time.

The app should:

- Use short, natural sentences.
- Tell the user what to do before giving background.
- Explain every Sanskrit or traditional word immediately.
- Avoid unexplained scholarly terminology.
- Avoid fear, blame, or threats about mistakes.
- Avoid claiming that one sincere error invalidates the user's worship unless an approved authority specifically requires such a warning.
- Distinguish instruction, mantra, meaning, explanation, and opinion visually and structurally.

Example:

> Naivedyam means food offered to God before it is shared as prasadam.

Avoid:

> Perform the prescribed Naivedya Upachara according to the relevant Paddhati.

Initial languages:

- Telugu
- English
- Telugu with English explanation

Canonical Sanskrit text must remain unchanged across interface languages.

## 9. Trust architecture

VedaSaarathi's defining feature is not AI. It is trustworthy handling of Dharma knowledge.

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

### 9.2 Content layers

Content should be stored in distinct layers:

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

### 9.3 Authority levels

VedaSaarathi should recognize multiple kinds of authority rather than pretending all sources are equal:

1. Primary or canonical texts
2. Kalpa, Grihya, and related ritual sources
3. Prayoga, Paddhati, Vrata Kalpa, and Dharma/Nirnaya literature
4. Recognized institutional scholarship and critical editions
5. Qualified living practitioners and Sampradaya authorities
6. Established temple or Matha publications
7. Regional and family custom, clearly labeled
8. Blogs, videos, social media, and general AI as discovery sources only

A discovery source can lead researchers to evidence. It cannot become authority merely because it is popular or easy to access.

### 9.4 Provenance for every religious claim

Every releasable religious statement should record:

- Claim identifier
- Exact claim text
- Source title
- Exact source reference
- Edition or publication details where applicable
- Rights and permitted use
- Tradition and regional scope
- Reviewer name
- Reviewer qualification
- Review date
- Review decision
- Content version
- Known variants or disagreements
- Written-source status

Different release statuses need different minimum evidence. Textually Verified content requires a traceable written source and reviewer. Priest-Reviewed Practice requires a named qualified reviewer, date, version, and clear scope even when a written source has not yet been confirmed. Regional Custom must state where and by whom it is practiced.

### 9.5 Disagreements are data

When two qualified sources or traditions differ, VedaSaarathi should not ask software or AI to choose secretly.

It should record:

- Variant A
- Variant B
- Tradition or region for each
- Sources and reviewers
- Reason for the difference, when known
- What to do when the user's family practice is unknown

The user should receive the variant supported by the known profile. If the correct choice cannot be determined, the app should explain the uncertainty and offer only an approved general path.

### 9.6 Content rights

Availability on the internet does not mean content can be copied, translated, redistributed, recorded, or used for AI retrieval.

Every source should have a rights record covering:

- Public-domain status
- Display permission
- Translation permission
- Derivative-work permission
- Audio permission
- AI or retrieval ingestion permission
- Attribution requirements
- Commercial-use restrictions, even though the service is free

## 10. Scholar and practitioner governance

Software engineers should not make unresolved religious decisions.

The governance model should eventually include:

- Vedic textual scholar
- Telugu household-practice priest or Pandit
- Panchanga and Jyotisha calculation expert
- Relevant Smartha, Sri Vaishnava, Madhwa, Shaiva, Shakta, or other Sampradaya authorities as coverage expands
- Regional-practice reviewers
- Language and pronunciation reviewers
- Content-rights review

A reviewer approves a specific version of a specific claim. A person's general participation does not automatically approve the whole product.

## 11. Technology direction

The intended platform direction is:

- Mobile-first web application and PWA
- React and TypeScript user interface
- Python services for Panchanga calculations, observance rules, tradition resolution, data processing, and future retrieval assistance
- Structured knowledge records first, with a database as the corpus grows
- Automated tests for religious safety, calculations, accessibility, and complete user journeys

Technology choices support the product but do not determine religious truth. A compiler, test, database, or AI model cannot replace source and practitioner review.

## 12. Responsible use of AI

AI may eventually help with:

- Finding approved content
- Explaining reviewed content in simpler language
- Transliteration assistance
- Navigating known variants
- Answering bounded questions from the verified knowledge base
- Helping internal researchers find unresolved gaps

AI must not independently:

- Generate canonical mantras
- Invent ritual steps
- Choose a lineage
- Create religious substitutions
- Resolve a Sampradaya disagreement
- Present a guessed citation
- Give open-ended expiation or corrective ritual advice

When no approved answer exists, the correct response is:

> We do not have a reviewed answer for this yet. Please follow your family practice or ask a qualified priest.

## 13. Accessibility and dignity

The product should be usable under real puja conditions:

- Phone or tablet placed beside the user
- Hands occupied with materials
- Several family members listening
- Children participating
- Older users reading the screen
- Temporary interruption
- Limited internet connectivity

Important capabilities include:

- Large readable text
- Clear contrast
- Screen-reader support
- Keyboard and touch accessibility
- Slow and repeatable audio
- Offline or resilient festival content where practical
- No disruptive advertising
- No shame when information or materials are missing

## 14. Product and funding principles

VedaSaarathi should remain free to use.

The worship journey must not contain:

- Premium barriers
- Paid mantra access
- Subscription prompts
- Advertising
- Fear-based upselling
- Paid remedies
- Astrology or financial predictions used to sell services

An optional Hundi may exist outside the worship flow. It should be quiet, voluntary, and never affect access or religious guidance. Donations may support hosting, preservation, source licensing, audio recording, and scholar review.

## 15. What makes VedaSaarathi different

Some existing products provide Panchanga, puja instructions, Sankalpam tools, audio, tradition-specific rituals, or AI priest-style assistance. VedaSaarathi should not claim uniqueness merely because it combines these features.

Its intended difference is the combination of:

- Beginner-first experience
- Simple human language
- Location-aware observance
- Known, partial, and unknown profile support
- No invented lineage
- Family and student-group participation
- Transparent provenance
- Scholar and practitioner governance
- Explicit tradition variants
- Separation of canonical text from explanation
- Release gates for unreviewed religious content
- Practical support for life outside India
- Free access without fear-based monetization

The long-term moat is the verified Dharma knowledge and governance system, not a chatbot interface.

## 16. Delivery strategy: narrow first, deep first

VedaSaarathi should not attempt to cover every Veda, Agama, Sampradaya, language, and festival at once.

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

> Vinayaka Chavithi → Telugu household practice → United States location → individual, family, and student/friends group → known, partial, or unknown tradition information.

## 17. Vinayaka Chavithi pilot

### 17.1 Purpose

The pilot tests whether a person with limited religious knowledge can prepare for and complete an approved Telugu household Vinayaka Chavithi journey without the app guessing missing information.

### 17.2 Intended pilot flow

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

### 17.3 Current religious blockers

The following remain blocked until the appropriate review is complete:

- Exact approved Vinayaka Chavithi procedure
- Essential, optional, and tradition-specific step classification
- Canonical mantras and approved editions
- Sankalpam wording
- Treatment of individual, family, and group participants in Sankalpam
- Handling of unknown Gotra, Veda, Sutra, Shakha, or Pravara
- Authoritative 21-patri list and botanical identification
- Approved fallback when some or all patri are unavailable
- Material substitutions in the United States
- Naivedyam requirements and variants
- Prana Pratishtha, Udvasana, and Visarjana scope for household beginners
- What a layperson should not attempt without a qualified priest
- Reviewed Telugu pronunciation audio
- Location-correct Panchanga and observance-rule validation

### 17.4 Practical patri principle

The platform should tell users that traditional materials are preferred only after the statement and its scope are approved. Users must never be encouraged to collect an unknown plant.

When materials are unavailable, the app may present a yathashakti or substitution path only when that exact guidance has documented or named-practitioner review. Priest-reviewed practice must be labeled separately from a directly verified textual rule.

Until the exact list and fallback are approved, the production interface should show no named leaf recommendation and no claim of equivalence.

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
- Finish the entire platform before validating one trustworthy end-to-end practice

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
- The app never declares Puja Completed when approved required content was unavailable.
- Users can see what is textual authority, practitioner-reviewed practice, regional custom, practical help, or still under review.
- Reviewers can trace every released claim to its version and evidence.

Long-term success means families trust VedaSaarathi not because it always gives an answer, but because it is honest about what is known, what varies, and what still requires qualified review.

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
- Telugu and English
- Reviewed audio where available
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

The following product decisions require further work:

- Exact first approved tradition scope within Telugu household practice
- Reviewer qualifications and approval quorum for each content class
- Minimum evidence required for practitioner-reviewed substitutions
- How users select among valid variants
- Whether and how family profiles synchronize across devices
- Privacy model for sensitive family and lineage data
- Offline audio and content packaging
- Panchanga calculation library and observance-rule authority
- Content licensing for text, translations, and recordings
- Governance and correction process after public release
- Hundi administration and financial transparency

These open questions should be tracked explicitly. They must not be resolved silently inside application code.

## 22. Guiding statement

VedaSaarathi should help a person say:

> I understand what I am doing. I know which guidance applies to me. The app did not guess what I do not know. I can see where the guidance came from. I was able to worship sincerely with what I had.

That is the standard for the platform.
