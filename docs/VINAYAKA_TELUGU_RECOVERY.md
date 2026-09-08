# Vinayaka Chavithi — Telugu-script recovery and the Family Beta plan

This is the first increment of converting the reviewer-only candidate
(commit `74ea143`) into an end-to-end Family Beta. It delivers **section 1**
of the plan (recover the Telugu content) plus the parts of **section 2**
(online research) that turned out to be recoverable straight from the supplied
source instead of the web. The remaining sections are specced at the bottom.

## What shipped in this increment

### 1. Telugu-script recovery (`lib/pujas/vinayaka/telugu-recovery.ts`)

- **Method** (`TELUGU_RECOVERY_METHOD`): every relevant page of
  `039. Vinayaka Chaviti Puja - Telugu Lyrics.pdf` was rendered with
  `pdftoppm -r 400`. `tesseract 5.3.4` (`tel`+`san`) produced a first-pass
  OCR scaffold. Each line was then read off the rendered page and compared
  against (a) that OCR scaffold and (b) the English-PDF transliteration
  already stored in `candidate.ts`. The PDF **text layer is corrupt** (a
  subsetted font whose ToUnicode CMap reorders vowel signs) and was not used.
  Nothing was taken from model memory.
- Every mantra/kriya step (32 of the 33 - the Vrata Katha is prose and stays
  withheld) now carries `mantraTeluguScript` plus a `teluguRecovery` record:
  `sourcePage`, `confidence` (`HIGH` | `MEDIUM`), `uncertainTokens[]`, and
  `transcriptionCheckRequired`.
- **Uncertain / MEDIUM-confidence blocks** (all flagged
  `BETA_TRANSCRIPTION_CHECK_REQUIRED`, all still `REVIEW_REQUIRED` + `locked`):
  - `ganapati-prarthana` — keeps the source's own `నామని` / `సర్వకారేషు`
    (both PDFs print these; not "corrected").
  - `anga-puja` — dual-number part names off a tight two-column layout.
  - `ekavimsati-patra-puja` — two-column leaf list; leaf 17 `గండకీ`.
  - `doorvayugma-puja` — two-column list.
  - `mantrapushpa-namaskara` — `చత్ర` / `రాజోపచరాన్` read as printed.
  - `ashtottara-satanamavali` — see below.
- Individual HIGH-confidence steps still list specific tokens kept verbatim
  against the mantra a reader might expect (e.g. `dhyana` `ధాయేద్` for
  `ధ్యాయేద్`, `deepa` `సాద్యం` for `సాజ్యం`, `sankalpa`
  `సంప్రదాయాభివృద్యర్ధం`). These match the English PDF and are not guesses.

### 2b. Recovered from source, not the web

- **Full 108-name Ashtottara Shatanamavali** (`ASHTOTTARA_TELUGU_RECOVERY`):
  transcribed from the three-column Telugu layout on page 8 - 108 names +
  a closing `శ్రీ వరసిద్ధి వినాయక స్వామినే నమః` doxology line. `MEDIUM`
  confidence, `transcriptionCheckRequired`. The romanised transliteration is
  still **not** stored (the English PDF's 3-column layout defeats a faithful
  copy).
- **Full short-form Sankalpam in Telugu script** (page 3) -
  `SANKALPAM_TELUGU_RECOVERY`, `HIGH`.
- **21 patri names in Telugu script** (page 7) - `PATRI_TELUGU_RECOVERY`.
  Botanical identity is still **not** recorded; it stays a reviewer question.

### Provenance corrections made during recovery

The pre-existing candidate had several `telugu-lyrics` page references off by
one (they had been estimated as "the Telugu file is 2 pages shorter"). Reading
the actual renders fixed: `dhyana` TE 3→4, `arghya` TE 4→5, `gandha` TE 5→6,
`dhupa`/`deepa` TE 8→9, `tambula`/`neerajana` TE 9→10, `mantrapushpa`
TE 10→11. The English-PDF page references were already correct.

## Still to do — sections 3–10 (each is its own batch)

These change the family-facing journey and its safety gate, so they are
deliberately **not** in this increment. Order of work:

| # | Section | Core change | Key risk to manage |
|---|---|---|---|
| 3 | Family Beta visibility | Route the family journey (`PujaScreen`/`PrepareScreen`) through the 33-item candidate; replace the per-step `GatedNotice` hide with one top-level beta notice; keep every `reviewStatus`/`provenance` value unchanged; keep chips/`ProvenancePanel` reviewer-only. | Family users would then see `REVIEW_REQUIRED` mantra text - the beta notice is the required mitigation; `canDisplayAsGuidance` stays the internal record, not the display gate. |
| 4 | Beginner instructions | Give every step `sourcedAction` (from the source, where it states one) vs `practicalGuidance` / `safetyNote` (app advice, labelled) vs `uncertain` flag. No invented ritual actions. | Must not present practical advice as sourced ritual instruction. |
| 5 | Functional Sankalpam | `lib/pujas/vinayaka/sankalpam-assembly.ts`: build the spoken text from participant mode + names + KNOWN Gotra + saved city/tz + Panchanga values that exist; UNKNOWN stays UNKNOWN; record alternatives + a priest-checklist entry where sources differ. | Never infer lineage from surname/location (`.claude/rules/sacred-content.md`). |
| 6 | Simple / Complete / Optional | Classify the 33 items; `BETA_CLASSIFICATION` flag where it is cross-source inference, not an explicit statement; choose the path before preparation. | Classification is inferred, not from source - must stay flagged. |
| 7 | Audio infrastructure | Manifest + asset loader + `<MantraAudioPlayer>` (Play/Pause/Replay/Stop, online URL assets, offline-cache-ready). One instruction-audio + one mantra-audio entry per step, all `NOT_CREATED`. Never fall back Telugu→English/Hindi; browser TTS for plain English only, never a mantra. | **No Telugu audio can be generated in this environment.** Generation manifest + recommended method to be returned as the immediate next action; the app must not pretend audio exists. |
| 8 | Home Panchanga + "Pilot data" removal | Real location-local date / sunrise / sunset / Tithi (+transition) / Nakshatra (+transition) from a documented astronomical library, plus a real Vinayaka Chavithi rule or a sourced annual dataset. Validate Hyderabad + Frisco against independent published Panchanga before relabelling. | Until validated, **keep "Pilot data"** - do not relabel placeholders (`.claude/rules/coding.md`: "Never hide errors by inserting invented … calendar data"). |
| 9 | Acceptance journey | Wire 3+6 together: save location → Home → pick puja → Simple/Complete → participants → prepare → every step with no blocked screen → Telugu mantra + transliteration → personalised Sankalpam → resume → complete → Udvasana + safe immersion. | Home-card values stay honest per section 8. |
| 10 | Verification | Tests for OCR-dataset integrity (done here), Family Beta visibility, full navigation, Sankalpam modes, Simple/Complete, Panchanga/timezone/DST, audio resolution, reviewer-data isolation; 3× `npm test`, typecheck, lint, live Chromium 375×812 + 1440×900. | — |

## Section 2 — online research still needed (for sections 4–8)

Not recoverable from the two supplied PDFs; needs sourcing per the priority
order (temple/peetham/mutt → published Vrata Kalpamu/paddhati → trusted
Sanskrit/Telugu repository → reputable traditional Telugu resource → secondary
only for comparison). Not another AI answer; not the Tamil Veda Bhavan audio.
Record URL, title, org/author, accessed date, section, tradition scope,
confidence, conflicts. Store as *comparison references* - the recovered
transcription is never auto-overwritten with web text.

- Full **dated** Sankalpam (samvatsara/ayana/rtu/masa/paksha/tithi/vaara/
  nakshatra/gotra/naama) — the PDFs only have the short form.
- Individual vs family vs unrelated-group Sankalpam wording; unknown-lineage
  handling (omit vs a specific approved phrasing).
- Botanical identity + safe-identification notes for each of the 21 patri.
- Documented flowers/akshata fallback when patri is unavailable (currently
  attributed to a priest reply that was never supplied).
- Beginner kriya for the ~24 steps whose physical action the source omits.
- Udvasana exact timing/action and its relation to immersion.
- A legally usable / licensed Vinayaka Vrata Katha text.
