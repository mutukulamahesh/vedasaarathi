# Diwali Lakshmi Puja — Master Document (దీపావళి లక్ష్మీ పూజ)

| Field | Value |
| --- | --- |
| Document | `docs/pujas/diwali-lakshmi-puja-master.md` |
| Version | 0.4 (PR #32 follow-up: reproduces DLP-21's full corrected transliteration inline, fixes the DLP-21 app title to say "Stotram", and records a fourth Telugu/transliteration discrepancy at verse 15 found during re-verification; supersedes v0.3) |
| Date | 2026-10-21 |
| Base booklet (P1) | *Diwali Lakshmi Pooja Process — English & Telugu Versions*, compiled by Nanduri Srinivas, PDF metadata author "Srinivas, Nanduri", created 2021-10-31 (file: `045. Diwali Lakshmi Puja in Telugu and English.pdf`, SHA-256 `2d04c03bb448a18b9cbb7d14a10864acc46ef38b9297017328f010f367f27587`, independently recomputed this session) |
| Other sources | V1, V2 (Nanduri Srivani YouTube demonstrations — titles only, no transcript obtained); P2 (a separate "Friday Lakshmi puja" booklet linked from V2's description — not independently reopened this session); X1 (sanskritdocuments.org Lakshmi Ashtottara Shatanama Stotram — used for corroboration only, its text is not reproduced here under its own reuse notice) |
| Priest feedback status | **Not yet requested.** Per the project's sourced-beta-candidate policy, this does not gate documentation work or beta display; it does gate `VERIFIED` / `PRIEST_REVIEWED_PRACTICE` status, which nothing in this document claims. |
| Audience | Telugu-speaking households, especially NRI families, performing a simple Diwali evening Lakshmi puja at home, including first-time performers |
| Reviewer status of all recitation in this document | `REVIEW_REQUIRED`, locked, consistent with `.claude/rules/sacred-content.md` and the review-status vocabulary already used in `lib/content/review-status.ts` and `lib/pujas/vinayaka/*`. Nothing here is `VERIFIED` or `PRIEST_REVIEWED_PRACTICE`. |

## 0. Important note on how this revision was produced

The task that produced this document assumed the source PDF (`045. Diwali Lakshmi Puja in Telugu and English.pdf`) was **not available anywhere in this repository's filesystem**, and that this document would therefore have to rely only on the Roman-transliteration research transcription already captured in the v0.1 draft's Appendix A.

That assumption turned out to be **wrong, and it is worth recording precisely why**, because it changes how much confidence the rest of this document can honestly carry:

- The PDF is **not tracked by git** and was **not present in this task's isolated git worktree** (`/workspaces/vedasaarathi/.claude/worktrees/agent-a0e8223fcb8ce5873`) — consistent with the project's own rule (`.claude/rules/security.md`, and the v0.1 draft's own Section 9) that source PDFs are not committed to the repository.
- But the file **is present as an untracked file in the main checkout** (`/workspaces/vedasaarathi/045. Diwali Lakshmi Puja in Telugu and English.pdf`), which this agent could read directly by absolute path, since both locations are on the same filesystem.
- Using the PDF-reading tool available to this agent, **all 24 pages were read as rendered page images** — including the 11 pages of Telugu-script recitation (pp. 2–12) that the v0.1 draft explicitly said were not reproduced anywhere it could check, and the 11 pages of Roman transliteration (pp. 14–24).
- `pdftotext` extraction of the Telugu pages **is indeed visibly corrupted**, confirming the draft's warning (see the worked example in Section 9.3 below). The Telugu-script recitation given per step in Section 5 below was **not** taken from that corrupted extraction, and it was **not** produced by this agent transliterating the Roman text into Telugu script from memory. It was read directly off the rendered page images, line by line, and cross-checked against P1's own Roman transliteration (Appendix A of the v0.1 draft) for consistency.

**What this upgrades, and what it does not.** This is real page-image transcription of an actual primary source, not a back-transliteration guess — a materially stronger basis than the v0.1 draft (and the task brief) assumed was possible. It is **not**, however, the same as the project's existing `telugu-recovery.ts` methodology for the Vinayaka puja, which used a 400 DPI `pdftoppm` render plus `tesseract` OCR as a cross-check scaffold before a human-equivalent line-by-line read; that tooling was not run here. It is also **not** a human Telugu reader's proofreading pass, and it is **not** a priest review. A second human proofreading pass remains good practice before any line is treated as `VERIFIED` — but **this document's own PR-finalization pass has already cross-checked every line word-for-word against P1's own transliteration** (not just assumed agreement), found and resolved the specific points of disagreement (Section 6.6, Section 6.7), and confirmed no other line in the 31-step sequence shows any inconsistency. Every step below stays `REVIEW_REQUIRED` and locked — see Section 8 for exactly what that status does and does not require. Where a specific line had an unusual or inconsistent reading, it is called out and resolved with a cited decision, not silently fixed (see Section 6, Section 8, and Section 9.4).

The two YouTube videos (V1, V2) remain genuinely inaccessible for transcript or visual content — this was re-attempted in this session, not assumed from the v0.1 draft; see Section 2 and Section 9.2 for exactly what was tried and what came back.

---

## How to read this document

- **Section 5** is the complete puja from preparation to close, step by step, with Telugu script, P1's own Roman transliteration (not IAST — P1's own romanisation scheme is preserved, including its inconsistencies, the same convention the Vinayaka candidate uses), plain English and Telugu explanations, and an exact P1 page citation for every recitation.
- **Section 6** is the decision log: the four specific discrepancies the task asked about (6.1–6.4), plus three additional editorial decisions needed for one coherent procedure (6.5), and the two finalized recitation selections for the task's audio-unsafe lines with full citations (6.6, 6.7). Nothing is silently fixed; nothing is silently blended from P2.
- Three kinds of content are marked differently throughout, matching `docs/pujas/sri-satyanarayana-vratham-master.md`:
  - **Sourced ritual text** — the recitation and the order of offerings, taken from P1, with the page cited.
  - **Explanation** — original VedaSaarathi plain-language English and Telugu explanation. Not scripture, never a translation presented as the source's own words.
  - **[App-team accommodation]** — a practical choice (a safety rule, a missing-item substitute, a staging decision) that is not from P1 and is never presented as a ritual requirement.
- **One scope, one procedure.** This document follows P1 (the Diwali booklet) only. P2 (the separate, shorter "Friday Lakshmi Puja" booklet V2 links to) is kept as a distinct reference in Section 2 and is never blended into the Diwali steps below. There is no automatic switch between them.

---

## 1. Purpose and scope

### 1.1 What this puja is

A household evening worship of **Mahalakshmi** (శ్రీ మహాలక్ష్మీ) for Diwali, preceded by a short opening (Achamanam, Pranayamam, Sankalpam, bell, kalasha-water worship) and a Ganapati worship, following P1's own order. P1 presents one continuous procedure; it does not separate "Diwali" worship from a generic Mahalakshmi shodashopachara (sixteen-service) worship — the Diwali framing is the cover title and occasion, not a distinct ritual grammar layered on top.

This document covers, in P1's own order:

1. Opening prayers, Achamanam, Pranayamam (DLP-01 to DLP-04).
2. Sankalpam, bell, kalasha-water worship (DLP-05 to DLP-07).
3. Ganapati worship — the seventeen-service sequence P1 prints before the Lakshmi worship (DLP-08).
4. Mahalakshmi's sixteen-service worship (shodashopachara): dhyana through anga puja (DLP-09 to DLP-20).
5. The Lakshmi Ashtottara Shatanama Stotram (DLP-21).
6. Dhupa, deepa, naivedya, tambula, neerajana (DLP-22 to DLP-26).
7. Mantrapushpam, mental royal honours, completion and welfare verses (DLP-27 to DLP-30).
8. Practical completion (DLP-31) — editorial, because P1 prints no distinct farewell section (see Section 6.4).

### 1.2 What this is not

- **No Katha.** P1 contains no story. This document does not add a Satyanarayana Katha, a Varalakshmi vrata, a homam, Kubera worship, business-account worship, or a five-day festival programme. Those belong to other traditions or other Diwali observances P1 does not describe.
- **No fixed duration claim.** V1's title says "20 min", V2's title says "10 min" but its own player metadata reports 726 seconds (12 min 6 sec) — its own title already understates its own runtime. Neither figure includes a family's setup time, repeating lines, or performing each offering unhurried. This document does not promise a completion time.
- **Not a blend of P1 and P2.** P2 (the Friday Lakshmi Puja booklet V2 links to) is a materially different, shorter procedure with mental offerings in place of several physical ones. It is recorded in Section 2 as a separate reference, never merged into the steps below.

### 1.3 Who this guide is for

- A person, family, or group of friends performing this puja at home, including first-time performers, especially NRI households without easy access to a priest or full puja-shop inventory.
- People who do not know their Gotra or other lineage details — P1's own Sankalpam (Section 7) does not ask for one, and this document never fills one in.

### 1.4 Display names (editorial, unchanged from the v0.1 draft)

- EN: Diwali Lakshmi Puja
- TE: దీపావళి లక్ష్మీ పూజ
- Description EN: A step-by-step household puja with Telugu recitation and simple instructions in English and Telugu.
- Description TE: తెలుగు పఠనంతో, సులభమైన తెలుగు మరియు ఇంగ్లీష్ సూచనలతో ఇంట్లో చేసుకునే లక్ష్మీ పూజ.

---

## 2. Evidence register

### P1 — Diwali booklet (primary procedure source)

- Filename: `045. Diwali Lakshmi Puja in Telugu and English.pdf`.
- `pdfinfo`: Author "Srinivas, Nanduri"; Creator/Producer "Microsoft® PowerPoint® for Microsoft 365"; CreationDate and ModDate 2021-10-31T05:19:16Z; 24 pages; 540×780 pt; not encrypted. This is file metadata, not independently established publication history.
- SHA-256 (recomputed independently this session): `2d04c03bb448a18b9cbb7d14a10864acc46ef38b9297017328f010f367f27587` — matches the figure already recorded in the v0.1 draft.
- Structure, confirmed by reading every page as a rendered image this session: p.1 cover (దీపావళి లక్ష్మీ పూజ చేసుకొనే విధానం / Diwali Lakshmi Pooja Process / English & Telugu Versions, with a credit to "Nanduri Srinivas" and a pointer to his YouTube channel for a step-by-step demo); pp. 2–12 Telugu-script recitation; p.13 section-divider cover ("Maha Lakshmi Puja in English"); pp. 14–24 Roman transliteration of the same material.
- `pdftotext` extraction of the Telugu pages is confirmed corrupted this session (worked example in Section 9.3); it was not used as a source for any Telugu-script text in Section 5. All Telugu-script text below is a direct read of the rendered page image.
- The English-labelled section (pp. 14–24) is Romanised Sanskrit/Telugu recitation, **not** an English translation or English stage directions. There are no English "what to do" instructions anywhere in P1; every "what to do" / "how" line in Section 5 below is original VedaSaarathi explanation, not sourced text.

### V1 — User-specified Diwali demonstration

- URL: `https://www.youtube.com/watch?v=y2eg7VsAIRM`
- Re-attempted this session: `WebFetch` on the watch URL returned only YouTube's generic site shell (navigation and footer links); no title, caption track, or transcript text was present in the fetched content. A direct `oEmbed` request (`https://www.youtube.com/oembed?url=...&format=json`) **did** succeed and returned: title "దీపావళి లక్ష్మీ పూజ 20 min లో చేసుకొనే విధానం | Diwali Lakshmi Puja in 20 min Demo | Nanduri Srivani", channel "Nanduri Srivani Pooja Videos" (`@NanduriSrivani`). A `curl` fetch of the raw watch page (with a browser user agent) returned no `captionTracks` data. No `yt-dlp` or `youtube-dl` binary or Python module is installed in this environment (checked with `pip show`, `python3 -m yt_dlp --version`, and `which`).
- **Result: no transcript, no captions, no spoken or visual content was obtained.** Only the title and channel name (both already recorded in the v0.1 draft) are confirmed. No timestamp, gesture, pause, or spoken teaching point is attributed to this video anywhere in this document.
- A separate, search-discoverable 20-minute demo also exists at `https://www.youtube.com/watch?v=4e95n-yfQhE`. It is not substituted for V1 and was not accessed this session.

### V2 — User-specified shorter demonstration

- URL: `https://www.youtube.com/watch?v=I2P-9w5cGBI`
- Re-attempted this session with the same methods as V1, with the same result: no transcript, no captions, no `captionTracks` data, no usable visual content. `oEmbed` returned only: title "లక్ష్మీ పూజ 10 నిమిషాల్లో చేసుకొనే విధానం | Lakshmi Puja in 10 min simple demo | Nanduri Srivani", channel "Nanduri Srivani Pooja Videos".
- The v0.1 draft recorded a player-metadata duration of 726 seconds (12 min 6 sec) and a Hindi auto-caption track that returned a blocking page rather than usable text when fetched. Those figures are carried over from the draft and were not independently re-verified this session (no tool used here surfaces player duration metadata); they are reported as draft findings, not re-confirmed findings.
- **Result: no transcript, no captions, no spoken or visual content was obtained this session either.**

### P2 — Booklet linked by V2's description (separate, not the selected base)

- URL: `https://drive.google.com/file/d/1K_UbtlCJaloVp4q5vApvmdWZOVtyAlao/view`
- Re-attempted this session: `WebFetch` returned only a Google Drive "Loading…" / sign-in prompt. The filename shown in that prompt is `108. Friday Lakshmi puja English Telugu Lyrics.pdf`, consistent with the v0.1 draft calling it a "Friday Lakshmi Puja Simple Process" booklet.
- **This session could not independently re-open or re-read P2's content.** The v0.1 draft's claims about P2 (11 pages, mental-offering structure, materially different and shorter than P1) are carried over as unverified-this-session draft findings, not re-confirmed. P2 is not used as a source for any recitation text in Section 5; it is referenced only in Section 6 as context for why this document does not blend the two procedures.

### X1 — Comparison source for the Ashtottara Stotram

- `https://sanskritdocuments.org/doc_devii/laxmi108naama.html`
- Fetched this session. The page confirms it presents the "Shrilakshmyashtottarashatanamastotram" — a **stotram** (hymn), proofread by Ravin Bhalekar, last updated 2004-07-21 — and states its own reuse notice: prepared by volunteers for personal study and research, not to be copied or reposted to promote a website or individual, or for commercial purposes, without permission.
- Its text is **not reproduced in this document**, per that notice. It is used only to confirm, independently of P1, that a "Lakshmi Ashtottara Shatanama Stotram" is a recognised traditional genre distinct from a plain numbered namavali (see Section 6.1), and as a general corroboration that P1's naming convention is not unusual. It is not used to correct, replace, or silently "fix" any P1 reading — P1's own text, as read from the page images, is what appears in Section 5.

### X2 — Comparison source for the Asanam (seat-offering) verse

- `https://greenmesg.org/stotras/puja/asanam.php`
- Fetched this session (PR-finalization pass). A generic, deity-agnostic Asanam puja verse is given there, in Devanagari and transliteration: "विचित्ररत्नखचितं दिव्यास्तरणसंयुतम् । स्वर्णसिंहासनं चारु गृह्णीष्व सुरपूजित ॥" / "Vicitra-Ratna-Khacitam Divyaas-Taranna-Samyutam, Svarnna-Simhaasanam Caaru Grhnniissva Sura-Puujita" — "accept this charming, variegated jewel-studded, divinely-covered golden throne, O one worshipped by the gods."
- Used only to independently confirm that **"ratna-khacita ... simhasanam"** ("jewel-studded throne") is a standard, attested Sanskrit Asanam-offering formula, not something specific to P1 or invented for this document. This is not P1's own verse (P1's preceding descriptive line differs), and it is not reproduced in Section 5 — it supports a reading decision in Section 6.6, nothing more.

### X3 — Comparison source for an independent Lakshmi Pooja's Asana offering

- `https://chinnajeeyar.org/wp-content/uploads/2015/04/Sri-Lakshmi-Pooja.pdf` (a Sri Lakshmi Pooja procedure published by Chinna Jeeyar Math; PDF metadata author "satish", dated 2015-04-03)
- Fetched and text-extracted this session (PR-finalization pass; this PDF's text is not corrupted the way P1's Telugu pages are, so `pdftotext` was usable here). In its own Asana-offering step, this independent, differently-authored Lakshmi puja prints: **"Rathna simhasanam samarpaya:mi (Offer a flower as simhasanam)"**, immediately after its own invocation ("Om Sri:m Sriyai Namaha").
- Used only to confirm that **"Ratna/Rathna ... simhasanam"** (jewel throne) — not "Natna ... simhasanam" — is the standard phrase used in this exact ritual slot (Asana offering to Lakshmi) by an independent, differently-sourced puja text. Its wider text is not reproduced here and its own reuse terms were not separately assessed; only this one short, clearly-attributed phrase is cited for comparison, consistent with Section 3's rule that a comparison edition may support a reading decision without being presented as what P1 itself prints.

---

## 3. Source hierarchy and editorial rules (carried forward from the v0.1 draft, unchanged)

1. P1 determines this puja's ritual order.
2. P1's page images determine what P1 actually prints. `pdftotext` extraction is a search aid only and is never the source of truth (demonstrated in Section 9.3).
3. V1 and V2 may clarify gestures or pronunciation only once their content is actually accessible and reviewed. Metadata and titles are not a transcript and are never cited as if the video were watched.
4. P2 is a separate Friday alternative. Its achamana endings, mental-offering structure, or shorter closing are never mixed into the P1-based steps below without saying so explicitly.
5. X1 (or any comparison edition) can support a documented alternative reading but is never presented as what P1 itself prints.
6. Separate fields are kept for the Telugu-script reading, P1's own transliteration, and the explanatory meaning. A pronunciation workaround never alters the displayed sacred text.
7. No invented Sanskrit, no guaranteed-prosperity claims, no invented mandatory materials.
8. No priest-review gate on documentation or beta display. Remaining textual work is desk-based reconciliation and explicit editorial choices (Section 6), not "find a priest first."

---

## 4. Materials

P1 names the acts of offering (gandha, pushpa, vastra, yajnopavita, tambulam, and so on) but prints no consolidated shopping list or quantities anywhere in its 24 pages. The checklist below is an **editorial list inferred from P1's named offerings**, not a claim that P1 mandates a specific item, vessel, or quantity. Status labels follow the convention already used in `docs/pujas/sri-satyanarayana-vratham-master.md`:

- **Named in P1** — the offering itself is explicitly named in a recitation line (for example, "gRhyataaM ... peetaaMbaraM" names a yellow cloth).
- **Functional necessity** — not itself named, but required to perform a named action (for example, a vessel to hold the water that Arghya/Achamaniya name).
- **[App-team accommodation]** — a practical choice, not from P1, never presented as a ritual requirement.

| Item | Status | Basis |
| --- | --- | --- |
| Lakshmi image or murti | Named in P1 (object of worship throughout) | P1 pp. 5–12 / 17–24; which exact representation (picture, small idol) is an **[App-team accommodation]** staging choice — P1 does not describe the object's physical form |
| Ganapati representation | Named in P1 | P1 pp. 4/16 (gaNapati pooja); P1 does not specify turmeric, clay, or any particular material — do not mandate a turmeric Ganapati based only on familiarity from other pujas |
| Kalasha (water vessel) | Named in P1 | P1 pp. 3/15 (kalaSaaraadhana verse) |
| Clean water, spoon, small receiving vessel/plate | Functional necessity | Needed for Achamanam, kalasha-water worship, and every water-offering line (Padya, Arghya, Achamaniya, Snana, naivedyam water lines) |
| Flowers | Named in P1 | P1 pp. 7/19 ("pushpaaNi samarpayaami"); no species is named |
| Sandal paste (గంధం), turmeric (పసుపు), kumkum (కుంకుమ) | Named in P1 | P1 pp. 7/19 ("Sree gaMdhaan dhaarayaami / haridraa kuMkumaadi sugaMdha dravyaaNi samarpayaami") |
| Yellow/saffron cloth (పీతాంబరం) | Named in P1 | P1 pp. 6/18 ("peetaaMbaraM prayachChaami") |
| Sacred thread, gold-coloured if possible (సౌవర్ణం యజ్ఞ సూత్రం) | Named in P1 | P1 pp. 6/18 |
| Ornament/jewellery (ఆభరణం) | Named in P1 | P1 pp. 7/19; any small piece is enough — P1 does not specify material or value |
| Lamp, fuel/wick, lighter | Named in P1 | Deepam (pp. 10/22) and Neerajanam (pp. 11/23) |
| Incense | Named in P1 | Dhupam, pp. 10/22 |
| Sweet food offering (నైవేద్యం) | Named in P1, not a recipe | P1 pp. 10/22 names "Sarkaraa madhu saMyuktaM, aajyaadai: adhapooritaM" (sugar and honey mixed, filled with ghee and the like) — a description of a sweet preparation, not a shopping list or exact recipe |
| Betel leaves and areca nut (తాంబూలం) | Named in P1 | P1 pp. 11/23 |
| Bell | Named in P1 | P1 pp. 3/15 (ghanTaa naadam) |
| Camphor (for neerajanam) | Named in P1 | P1 pp. 11/23 ("karpoora deepa taejastvaM") |

### 4.1 Practical NRI guidance [App-team accommodation — not from P1]

- Use drinking-quality water for anything that is consumed (achamana sips, naivedyam water). Keep water poured on the image or murti separate from drinking water.
- A photo, paper print, or framed/electrical item must never be soaked for Snanam. Treat a symbolic water gesture (a few drops near the frame, or water offered to a small separate vessel while reciting the Snanam line) as an explicitly adapted, photo-safe action — never present it as a verbatim P1 instruction, because P1 does not describe how to physically bathe a photograph.
- Keep lamps and camphor away from fabric, hair, and children; never leave a flame unattended; never burn camphor directly in the hand. If an open flame is not permitted in your home, use a flame-free accommodation and say plainly that it is an accommodation, not an equivalent ritual act.
- The Pranayamam line (DLP-04) names pooraka/kumbhaka/rechaka (inhale/hold/exhale); do not coach forceful breath-holding. Keep the instruction gentle and clearly bounded.
- Do not require gold, a specific flower, or any unavailable ingredient — P1 does not require them either. Where an item is missing, say so plainly and continue; do not substitute alcohol or tobacco for tambulam under any circumstance.
- Naivedyam must be fresh and allergy-appropriate for the household. Do not eat camphor. Do not drink water that has touched idol materials or metal polish.

---

## 5. The puja, start to finish

**Transliteration convention.** P1's own Roman transliteration (pp. 14–24) is reproduced exactly as printed — its spacing, inconsistent capitalisation (e.g. "Sree" vs "SreemahaagaNa"), and apparent typos are preserved verbatim, not normalised, the same convention `lib/pujas/vinayaka/telugu-recovery.ts` already uses for the Vinayaka puja. This is **P1's own scheme**, not IAST. Where something looks like a probable printing error, it is flagged in a note rather than silently corrected.

**Telugu-script convention.** Transcribed directly from the rendered P1 page images this session (see Section 0). Preserved verbatim, including the same spacing and apparent-typo quirks as the transliteration where both show the same feature (a strong sign the feature is in the source, not an artifact of one extraction path).

**Step IDs.** DLP-P1 (preparation) and DLP-01 through DLP-31 (the puja and its close).

### Phase A — Preparation

#### DLP-P1 · Prepare the space and materials

- **What to do:** Set up the altar area, materials, and lamp before beginning.
- **English explanation:** A clean, ready space lets you move through the puja without interruption.
- **తెలుగు వివరణ:** పూజ ప్రారంభించే ముందు అమ్మవారి చిత్రం/ప్రతిమ, నీరు, పూజా సామగ్రి, దీపం సిద్ధం చేసుకోండి.
- **Source:** Editorial staging — P1 prints no setup instructions.

### Phase B — Opening

#### DLP-01 · Opening meditation verse (Shuklambaradharam)

- **Say (Telugu script, P1 p.2):**
  > శుక్లాం బరధరం విష్ణుం శశివర్ణం చతుర్భుజం
  > ప్రసన్న వదనం ధ్యాయేత్ సర్వ విఘ్నోప శాంతయే
- **Say (P1's transliteration, p.14):**
  > ShuklaAmbara Dharam Vishnum Shashi Varnam Chatur Bhujam
  > Prasanna Vadanam Dhyaayet Sarva Vighnopashaantaye
- **English explanation:** A traditional opening verse remembering the white-clad, four-armed form associated with the removal of obstacles, recited to settle the mind before worship begins.
- **తెలుగు వివరణ:** పూజ ప్రారంభంలో మనసును శాంతపరచుకోవడానికి చదివే సాంప్రదాయ శ్లోకం.
- **Source:** P1 p.2 (Telugu) / p.14 (transliteration).

#### DLP-02 · Achamanam — the twenty-four names

- **Say (Telugu script, P1 p.2):**
  > 1. ఓం కేశవాయ స్వాహ 2. ఓం నారాయణాయ స్వాహ 3. ఓం మాధవాయ స్వాహ 4. ఓం గోవిందాయ నమః 5. విష్ణవే నమః 6. మధుసూదనాయ నమః 7. త్రి విక్రమాయ నమః 8. వామనాయ నమః 9. శ్రీధరాయ నమః 10. హృషీకేశాయ నమః 11. పద్మనాభాయ నమః 12. దామోదరాయ నమః 13. సంకర్షణాయ నమః 14. వాసుదేవాయ నమః 15. ప్రద్యుమ్నాయ నమః 16. అనిరుద్ధాయ నమః 17. పురుషోత్తమాయ నమః 18. అధోక్షజాయ నమః 19. నారసింహాయ నమః 20. అచ్యుతాయ నమః 21. జనార్దనాయ నమః 22. ఉపేంద్రాయ నమః 23. హరయే నమః 24. శ్రీ కృష్ణాయ నమ
- **Say (P1's transliteration, p.14):**
  > OM kaeSavaaya svaahaa - OM naaraayaNaaya svaahaa / OM maadhavaaya svaahaa - OM gOviMdaaya nama: / vishNavae nama: - madhusoodanaaya nama: / tri vikramaaya nama: - vaamanaaya nama: / Sreedharaaya nama: - hRsheekaeSaaya nama: / padmanaabhaaya nama: - daamOdaraaya nama: / saMkarshaNaaya nama: - vaasudaevaaya nama: / pradyu mnaaya nama: - aniruddhaaya nama: / purushOttamaaya nama: - adhOkshajaaya nama: / naarasiMhaaya nama: - achyutaaya nama: / janaardhanaaya nama: - upaeMdraaya nama: / harayae nama: - Sree kRshNaaya nama
- **English explanation:** Twenty-four names of Vishnu, traditionally recited while sipping a little water three times, as a short purification before worship.
- **తెలుగు వివరణ:** పూజకు ముందు చేసే శుద్ధి — మొదటి మూడు నామాలకు నీరు తాగుతారు.
- **Source:** P1 p.2 (Telugu) / p.14 (transliteration). Both agree in count (24) and in leaving the final "nama" without its closing visarga mark — preserved as printed, not corrected.

#### DLP-03 · Clearing the space (Uttishthantu bhuta-pishachah)

- **Say (Telugu script, P1 p.2):**
  > ఉత్తిష్ఠంతు భూతపిశాచాః ఏతే భూమి భారకాః
  > ఏతేషా మవిరోధేన బ్రహ్మకర్మ సమారభే
- **Say (P1's transliteration, p.14):**
  > uttishTaMtu bhootapiSaachaa: aetae bhoomi bhaarakaa:
  > aetaeshaa mavirOdhaena brahmakarma samaarabhae
- **English explanation:** A verse asking any disturbing beings to depart respectfully, so the worship can begin without obstruction.
- **తెలుగు వివరణ:** పూజకు ముందు ఆటంకాలు తొలగిపోవాలని కోరుతూ చదివే శ్లోకం.
- **Source:** P1 p.2 (Telugu) / p.14 (transliteration).

#### DLP-04 · Pranayamam (breath pause)

- **Say (Telugu script, P1 p.2):**
  > ప్రాణాయామము
  > పూరకం కుంభకం చైవ రేచకం తదనంతరం
  > ప్రాణాయామ మిదం ప్రోక్తం సర్వ దేవ నమస్కృతం
- **Say (P1's transliteration, p.14):**
  > praaNaayaamamu
  > poorakaM kuMbhakaM chaiva raechakaM tadanaMtaraM
  > praaNaayaama midaM prOktaM sarva daeva namaskRtaM
- **How [App-team accommodation]:** The verse names pooraka (inhale), kumbhaka (hold), rechaka (exhale). Breathe gently; never force or strain a breath-hold. If breath-holding is uncomfortable or unsafe for you, breathe normally while reciting.
- **English explanation:** A short, traditional breathing pause, named and honoured as a small offering in itself.
- **తెలుగు వివరణ:** శ్వాసను గమనించే చిన్న విరామం — బలవంతంగా ఆపవద్దు.
- **Source:** P1 p.2 (Telugu) / p.14 (transliteration).

### Phase C — Sankalpam, bell, kalasha

#### DLP-05 · Sankalpam (statement of intention)

- **Say (Telugu script, P1 p.3):**
  > సంకల్పము
  > మమ ఉపాత్త సమస్త దురితక్షయ ద్వారా శ్రీ మహాలక్ష్మీ దేవతా ప్రీత్యర్థం, అస్మాకం సహ కుటుంబానాం క్షేమ స్థైర్య విజయ అభయ ఆయురారోగ్య ఐశ్వర్య అభివృధ్యర్థం, ధర్మార్థ కామ మోక్ష చతుర్విధ పురుషార్థ ఫల సిధ్యర్థం, ధన ధాన్య సమృధ్యర్థం, సౌభాగ్య శుభఫలా ప్రాప్త్యర్థం, ఇష్ట కామ్యార్థ సిధ్యర్థం, సకల లోక కల్యాణార్థం, వేద సంప్రదాయాభివృధ్యర్థం, అస్మిన్ దేశే గోవధ నిషేధార్థం, గో సంరక్షణార్థం, శ్రీ మహాలక్ష్మీ దేవతాం ఉద్దిశ్య యావచ్ఛక్తి ధ్యాన ఆవాహనాది షోడశోపచార పూజాం కరిష్యే!
- **Say (P1's transliteration, p.15):**
  > saMkalpamu / mama upaatta samasta duritakshaya dvaaraa Sree mahaalakshmee daevataa preetyardhaM, asmaakaM saha kuTuMbaanaaM kshaema sthairya vijaya abhaya aayuraarOgya aiSvarya abhivRdhyardhaM, dharmaardha kaama mOksha chaturvidha purushaartha phala sidhyarthaM, dhana dhaanya samRdhyardhaM, saubhaagya Subhaphalaa praaptyardhaM, ishTa kaamyaartha sidhyarthaM, sakala lOka kalyaaNaardhaM, vaeda saMpradaayaabhivRdyardhaM, asmin daeSae gOvadha nishaedhaardhaM, gO saMrakshaNaardhaM, Sree mahaalakshmee daevataaM uddiSya yaavaChchakti dhyaana aavaahanaadi shODaSOpachaara poojaaM karishyae!
- **English explanation:** A statement declaring, for us and our families, the purpose of this worship — wellbeing, stability, prosperity, and the fourfold goals of life — dedicated to Sri Mahalakshmi, with sixteen traditional services offered as one is able.
- **తెలుగు వివరణ:** ఈ పూజను ఎవరి కోసం, ఏ ఉద్దేశంతో చేస్తున్నామో చెప్పుకునే సంకల్ప వాక్యం.
- **Source:** P1 p.3 (Telugu) / p.15 (transliteration). **This is a short-form Sankalpam**: it has no slot for Gotra, Veda, Sutra, Sampradaya, or a dated calendar (samvatsara/masa/paksha/tithi/vaara/nakshatra) — only the generic phrase "శుభే శోభనే ముహూర్తే" is absent here (P1's Diwali Sankalpam, unlike the Vinayaka one, does not even include that phrase — it moves straight from "duritakshaya dvaaraa" to naming the deity and purposes). Its only place reference is "asmin daeSae" (in this country) — no city/state. See Section 7 for integration with the app's participant model, and Section 6.5 for a dedicated note on this Sankalpam's family-oriented and extra-purpose wording (cow protection, Vedic tradition).

#### DLP-06 · Bell (Ghanta nadam)

- **Say (Telugu script, P1 p.3):**
  > ఘంటా నాదం చేస్తూ
  > ఆగమార్థంతు దేవానాం గమనార్థం తు రాక్షసాం
  > కురు ఘంటారవం తత్ర దేవతాహ్వాన లాంఛనమ్
- **Say (P1's transliteration, p.15):**
  > Ghanta Naadam / aagamaardhaMtu daevaanaaM gamanaardhaM tu rakshaa saaM kuru ghaMTaaravaM tatra daevataahvaana laaMchanam
- **How:** Ring a bell gently while reciting, if one is available.
- **English explanation:** The bell sound is a mark that invites the divine presence and asks disturbing forces to withdraw.
- **తెలుగు వివరణ:** గంట ఉంటే మెల్లగా మోగిస్తూ ఈ శ్లోకం చదవండి.
- **Materials:** Bell — if unavailable, recite the verse and continue; P1 names the act but a missing bell does not block the puja **[App-team accommodation]**.
- **Source:** P1 p.3 (Telugu) / p.15 (transliteration).

#### DLP-07 · Kalasha-water worship (Kalasharadhana)

- **Say (Telugu script, P1 p.3):**
  > కలశారాధన
  > కలశస్య ముఖే విష్ణుః కంఠే రుద్ర స్సమాశ్రితః
  > మూలే తత్ర స్థితో బ్రహ్మా మధ్యే మాతృగణాః స్మృతాః
  > కుక్షౌతు సాగరా స్సర్వే సప్త ద్వీపా వసుంధరా
  > ఋగ్వేదో థ యజుర్వేద స్సామవేదో హ్యధర్వణః
  > అంగైశ్చ సహితా స్సర్వే కలశాంబు సమాశ్రితాః
  > గంగేచ యమునేచైవ గోదావరి సరస్వతీ
  > నర్మదా సింధు కావేరి జలేస్మిన్ సన్నిధిం కురు
  >
  > పూజాద్రవ్యాణి దేవం ఆత్మానం సంప్రోక్ష్య
- **Say (P1's transliteration, p.15):**
  > kalaSaaraadhana / kalaSasya mukhae vishNu: kaMThae rudra ssamaaSrita: / moolae tatra sthitO brahmaa madhyae maatRgaNaa: smRtaa: / kukshautu saagaraa ssarvae sapta dveepaa vasuMdharaa / RgvaedO tha yajurvaeda ssaamavaedO hyadharvaNa: / aMgaiScha sahitaa ssarvae kalaSaaMbu samaaSritaa: / gaMgaecha yamunaechaiva gOdaavari sarasvatee / narmadaa siMdhu kaavaeri jalaesmin sannidhiM kuru // poojaadravyaaNi daevaM aatmaanaM saMprOkshya
- **How:** Recite the verse while holding the filled kalasha. At "poojaadravyaaNi daevaM aatmaanaM saMprOkshya" (sprinkle on the puja items, the deity, and oneself), sprinkle a little of the kalasha water on the materials and on yourself.
- **English explanation:** The verse invokes Vishnu, Rudra, Brahma, the mother-goddesses, the seas, the seven worlds, the four Vedas, and the sacred rivers (Ganga, Yamuna, Godavari, Sarasvati, Narmada, Sindhu, Kaveri) as present in the water, which is then used to purify the puja materials and oneself.
- **తెలుగు వివరణ:** కలశంలోని నీటిని పవిత్రమైనదిగా భావించి, దానిని పూజా సామగ్రిపై, మీపై చిలకరించుకోండి.
- **Materials:** Kalasha, clean water.
- **Source:** P1 p.3 (Telugu) / p.15 (transliteration).

### Phase D — Ganapati worship

#### DLP-08 · Ganapati worship (seventeen services)

- **Say (Telugu script, P1 p.4):**
  > గణపతి పూజ
  > వక్రతుండ మహాకాయ కోటిసూర్య సమప్రభ
  > నిర్విఘ్నం కురుమే దేవ సర్వ కార్యేషు సర్వదా
  >
  > ఆదౌ నిర్విఘ్న పరిసమాప్త్యర్థం శ్రీ మహాగణపతి పూజాం కరిష్యే
  >
  > 1. శ్రీ మహాగణపతయే నమః – ధ్యాయామి
  > 2. శ్రీ మహాగణపతయే నమః – ఆవాహయామి
  > 3. శ్రీ మహాగణపతయే నమః – ఆసనం సమర్పయామి
  > 4. శ్రీ మహాగణపతయే నమః – పాదయోః పాద్యం సమర్పయామి
  > 5. శ్రీ మహాగణపతయే నమః – హస్తయోః అర్ఘ్యం సమర్పయామి
  > 6. శ్రీ మహాగణపతయే నమః – ఆచమనీయం సమర్పయామి
  > 7. శ్రీ మహాగణపతయే నమః – స్నానం సమర్పయామి.
  > 8. శ్రీ మహాగణపతయే నమః – వస్త్ర యుగ్మం సమర్పయామి
  > 9. శ్రీ మహాగణపతయే నమః – యజ్ఞోపవీతం సమర్పయామి
  > 10. శ్రీ మహాగణపతయే నమః – గంధం సమర్పయామి
  > 11. శ్రీ మహాగణపతయే నమః – పుష్పాణి సమర్పయామి
  > 12. శ్రీ మహాగణపతయే నమః – ధూపమాఘ్రాపయామి
  > 13. శ్రీ మహాగణపతయే నమః – దీపం దర్శయామి
  > 14. శ్రీ మహాగణపతయే నమః – నైవేద్యం సమర్పయామి
  >    (సత్యం త్వర్తేన పరిషం చామి అమృతమస్తు అమృతోపస్తర నమసి — ప్రాణాయ స్వాహా, అపానాయ స్వాహా, వ్యానాయ స్వాహా, ఉదానాయ స్వాహా, సమానాయ స్వాహా)
  > 15. శ్రీ మహాగణపతయే నమః – తాంబూలం సమర్పయామి
  > 16. శ్రీ మహాగణపతయే నమః – నీరాజనం సమర్పయామి
  > 17. శ్రీ మహాగణపతయే నమః – మంత్ర పుష్పం సమర్పయామి, నమస్కారం సమర్పయామి
  >
  > అనయా, యథా శక్తి పూజాయచ – శ్రీమహాగణ పతి దేవతా సుప్రసన్నా, సుప్రీతా దో భవతు, శ్రీ మహా గణపతి ప్రసాదం శిరసా గృహ్ణామి
- **Say (P1's transliteration, p.16):** See Section 6.3 — the transliteration page includes one extra parenthetical sentence that the Telugu page does not. The verse and the seventeen services themselves read:
  > gaNapati pooja / vakratuMDa mahaakaaya kOTisoorya samaprabha nirvighnaM kurumae daeva sarva kaaryaeshu sarvadaa // aadau nirvighna parisamaaptyardhaM Sree mahaagaNapati poojaaM karishyae / Sree mahaagaNapatayae nama: - dhyaayaami / ...aavaahayaami / ...aasanaM samarpayaami / ...paadayO: paadyaM samarpayaami / ...hastayO: arghyaM samarpayaami / ...aachamaneeyaM samarpayaami / ...snaanaM samarpayaami. / ...vastra yugmaM samarpayaami / ...yaj~nOpaveetaM samarpayaami / ...gaMdhaM samarpayaami / ...pushpaaNi samarpayaami / ...dhoopamaaghraapayaami / ...deepaM darSayaami / ...naivaedyaM samarpayaami (satyaM tvartaena parishaM chaami amRtamastu amRtOpastara Namasi — praaNaaya svaahaa, apaanaaya svaahaa, vyaanaaya svaahaa, udaanaaya svaahaa, samaanaaya svaahaa) / ...taaMboolaM samarpayaami / ...neeraajanaM samarpayaami / ...maMtra pushpaM samarpayaami, namaskaaraM samarpayaami // anayaa, yathaa Sakti poojaayacha – SreemahaagaNa pati daevataa suprasannaa, supreetaa dO bhavatu, Sree mahaa gaNapati prasaadaM Sirasaa gRNhaami
- **How:** Perform each of the seventeen named services in order (meditate, invite, offer a seat, water for the feet, water for the hands, sipping water, bathe, offer cloth, offer the sacred thread, offer sandal paste, offer flowers, offer incense, show the lamp, offer food, offer betel, offer the lamp flame, offer flowers with a bow).
- **English explanation:** A complete sixteen/seventeen-service worship of Ganapati, performed first so the main worship proceeds without obstacles — the traditional role of Ganapati puja at the start of a Hindu ceremony.
- **తెలుగు వివరణ:** విఘ్నాలు తొలగి పూజ సజావుగా సాగాలని మొదట గణపతిని షోడశోపచారాలతో పూజిస్తాం.
- **Materials:** A Ganapati representation; water, cloth, thread, sandal paste, flowers, incense, a lamp, a small food offering, betel, camphor — see Section 4.
- **Source:** P1 p.4 (Telugu) / p.16 (transliteration). **See Section 6.3 for the Shodasha Somavara discrepancy** — P1's transliteration page includes a parenthetical note about a different, unrelated vrata that the Telugu page does not print; that note is not part of this puja's instructions.

### Phase E — Mahalakshmi's sixteen-service worship (Shodashopachara)

#### DLP-09 · Dhyana (meditation)

- **Say (Telugu script, P1 p.5):**
  > మహాలక్ష్మీ షోడశోపచార పూజ
  > ధ్యానం
  > సరసిజ నయనే సరోజహస్తే
  > ధవళ తరాంశుక గంధమాల్య శోభే
  > భగవతి హరివల్లభే మనోజ్ఞే
  > త్రిభువన భూతికరి ప్రసీదమహ్యం
  >
  > లక్ష్మీం క్షీర సముద్ర రాజ తనయాం శ్రీరంగ ధామేశ్వరీం
  > దాసీ భూత సమస్త దేవ వనితాం లోకైక దీపాంకురాం
  > శ్రీ మన్నంద కటాక్ష లబ్ధ విభవత్ బ్రహ్మేంద్ర గంగాధరాం
  > త్వాం త్రైలోక్య కుటుంబినీం సరసిజాం వందే ముకుంద ప్రియాం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః ధ్యాయామి
- **Say (P1's transliteration, p.17):**
  > mahaalakshmee shODaSOpachaara pooja / dhyaanaM / sarasija nayanae sarOjahastae dhavaLa taraaMSuka gaMdhamaalya SObhae bhagavati harivallabhae manO~m~nae tribhuvana bhootikari praseedamahyam // lakshmeeM ksheera samudra raaja tanayaaM SreeraMga dhaamaeSvareeM daasee bhoota samasta daeva vanitaaM lOkaika deepaaMkuraaM Sree manmaMda kaTaaksha labdha vibhavat brahmaeMdra gaMgaadharaaM tvaaM trailOkya kuTuMbineeM sarasijaaM vaMdae mukuMda priyaaM // Sree mahaalakshmee daevyai nama: dhyaayaami
- **English explanation:** A meditation verse describing Lakshmi — lotus-eyed, lotus-handed, radiant in white silk with sandal and garlands, beloved of Hari — asking her favour on all three worlds.
- **తెలుగు వివరణ:** లక్ష్మీదేవి రూపాన్ని మనసులో ధ్యానిస్తూ చదివే శ్లోకం.
- **Source:** P1 p.5 (Telugu) / p.17 (transliteration).

#### DLP-10 · Avahana (invocation)

- **Say (Telugu script, P1 p.5):**
  > ఆవాహనం
  > సహస్రదళ పద్మాస్యాం, స్వస్థాం చ సుమనోహరాం
  > శాంతాం చ శ్రీహరేః కాంతాం తాం భజే జగతాం ప్రసూమ్
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః ఆవాహయామి
- **Say (P1's transliteration, p.17):**
  > aavaahanaM / sahasradaLa padmaasyaaM, svasthaaM cha sumanOharaaM SaaMtaaM cha Sreeharae: kaaMtaaM taaM bhajae jagataaM prasoom // Sree mahaalakshmee daevyai nama: aavaahayaami
- **How:** Respectfully invite the goddess to be present.
- **English explanation:** The formal invitation, the first of the sixteen services.
- **తెలుగు వివరణ:** అమ్మవారిని పూజకు ఆహ్వానించే విధి.
- **Source:** P1 p.5 (Telugu) / p.17 (transliteration).

#### DLP-11 · Asana (seat)

- **Selected for app display and audio:**
  > ఆసనం
  > అమూల్య రత్నసారం చ నిర్మితం విశ్వకర్మణా
  > ఆసనం చ ప్రసన్నం చ మహాదేవి ప్రగృహ్యతామ్
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః **రత్న ఖచిత** సింహాసనం సమర్పయామి
  >
  > *(Transliteration: aasanaM / amoolya ratnasaaraM cha nirmitaM viSvakarmaNaa aasanaM cha prasannaM cha mahaadaevi pragRhyataam // Sree mahaalakshmee daevyai nama: **ratna khachita** siMhaasanaM samarpayaami)*
- **Historical source wording (P1 p.5 Telugu / p.17 transliteration — not used for audio):**
  > ...శ్రీ మహాలక్ష్మీ దేవ్యై నమః **నత్న ఖచిత** సింహాసనం సమర్పయామి
  > *(P1's transliteration: ...Sree mahaalakshmee daevyai nama: **natna khachita** siMhaasanaM samarpayaami)*
- **How:** Offer a seat (symbolically, a clean mat or cushion, or simply the gesture).
- **English explanation:** A jewel-set throne, made by the divine architect Vishvakarma, is offered as a seat.
- **తెలుగు వివరణ:** అమ్మవారికి ఆసనాన్ని సమర్పించే విధి.
- **Source:** P1 p.5 (Telugu) / p.17 (transliteration), with an editorial reading correction — see **Section 6.6** for the full citation and reasoning. Both of P1's own editions print "నత్న ఖచిత" / "natna khachita" ("న"/na and "ర"/ra are visually distinct letters, so this is not a reading error introduced by this transcription); "నత్న"/"natna" is not an attested Sanskrit or Telugu word, while "రత్న ఖచిత"/"ratna khachita" ("jewel-studded") is both lexically attested and consistent with the immediately preceding line's own "amoolya ratnasaaraM" ("priceless jewel-essence"). The selected text above substitutes the attested reading; P1's literal printed wording is preserved above as historical source text and is never itself synthesised or displayed as the sacred recitation.

#### DLP-12 · Padya (water for the feet)

- **Say (Telugu script, P1 p.5):**
  > పాద్యం
  > సురాసుర మహా మౌళీ మాలా మాణిక్య కాంతిభిః
  > విరాజిత పదద్వంద్వే పాద్యం దేవీ దదామ్యహం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః పాదయోః పాద్యం సమర్పయామి
- **Say (P1's transliteration, p.17):**
  > paadyaM / suraasura mahaa mauLee maalaa maaNikya kaaMtibhi: viraajita padadvaMdvae paadyaM daevee dadaamyahaM // Sree mahaalakshmee daevyai nama: paadayO: paadyaM samarpayaami
- **How:** Offer a little water for the feet into the receiving vessel.
- **English explanation:** Water is offered for the feet, described as radiant with the crown-jewels of gods and demons.
- **తెలుగు వివరణ:** అమ్మవారి పాదాలకు నీటిని సమర్పించే విధి.
- **Source:** P1 p.5 (Telugu) / p.17 (transliteration).

#### DLP-13 · Arghya (water offering for the hands)

- **Say (Telugu script, P1 p.6):**
  > అర్ఘ్యం
  > పుష్పచందన దూర్వాది సంయుతం జాహ్నవీజలం
  > శంఖ గర్భ స్థితం శుద్ధం గృహ్యతాం పద్మ వాసినీం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః హస్తయోః అర్ఘ్యం సమర్పయామి
- **Say (P1's transliteration, p.18):**
  > arghyaM / pushpachaMdana doorvaadi saMyutaM jaahnaveejalaM SaMkha garbha sthitaM SuddhaM gRhyataaM padma vaasineeM // Sree mahaalakshmee daevyai nama: hastayO: arghyaM samarpayaami
- **How:** Offer water, held in a conch if you have one.
- **English explanation:** Ganga water, mixed with flowers, sandal, and durva grass, is offered from a conch shell.
- **తెలుగు వివరణ:** పుష్పాలు, గంధం కలిపిన నీటిని శంఖంలో అర్పించే విధి.
- **Source:** P1 p.6 (Telugu) / p.18 (transliteration).

#### DLP-14 · Achamaniya (sipping water)

- **Say (Telugu script, P1 p.6):**
  > ఆచమనీయం
  > పుణ్య తీర్థోదకం చైవ విశుద్ధం శుద్ధిదం సదా
  > గృహ్యతాం కృష్ణకాంతే చ రమ్యమాచమనీయకమ్
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః ఆచమనీయం సమర్పయామి
- **Say (P1's transliteration, p.18):**
  > aachamaneeyaM / puNya teerthOdakaM chaiva viSuddhaM SuddhidaM sadaa gRhyataaM kRshNakaaMtae cha ramyamaachamaneeyakam // Sree mahaalakshmee daevyai nama: aachamaneeyaM samarpayaami
- **English explanation:** Sacred, purifying water is offered for ceremonial sipping.
- **తెలుగు వివరణ:** పవిత్ర తీర్థజలాన్ని సమర్పించే విధి.
- **Source:** P1 p.6 (Telugu) / p.18 (transliteration).

#### DLP-15 · Snanam (bath) and achamaniyam

- **Say (Telugu script, P1 p.6):**
  > స్నానం
  > సుగంధి విష్ణు తైలంచ సుగంధామలకోజ్వలం
  > దేహ సౌందర్య బీజంచ గృహ్యతాం శ్రీ హరిప్రియే
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః శుద్ధోదక స్నానం సమర్పయామి
  > స్నానానంతరం ఆచమనీయం సమర్పయామి
- **Say (P1's transliteration, p.18):**
  > snaanaM / sugaMdhi vishNu tailaMcha sugaMdhaamalakOjvalaM daeha sauMdarya beejaMcha gRhyataaM Sree haripriyae // Sree mahaalakshmee daevyai nama: SuddhOdaka snaanaM samarpayaami / snaanaanaMtaraM aachamaneeyaM samarpayaami
- **How [App-team accommodation]:** For a photo, print, or electrical item, never pour water directly on it. Offer the water symbolically into a separate vessel while reciting, or touch a drop to the frame's edge only if that is safe for the specific item.
- **English explanation:** A fragrant, purifying bath is offered, followed by sipping water.
- **తెలుగు వివరణ:** చిత్రపటం అయితే నేరుగా నీళ్ళు పోయకుండా, పక్కన పాత్రలో సంకేతంగా సమర్పించండి.
- **Source:** P1 p.6 (Telugu) / p.18 (transliteration).

#### DLP-16 · Vastram (clothing) and achamaniyam

- **Say (Telugu script, P1 p.6):**
  > వస్త్రం
  > పీతాంబర ధరే దేవీ పీతాంబర సహోదరీ
  > పీతాంబరం ప్రయచ్ఛామి విద్యుత్ అంగ జటాధరే
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః వస్త్రయుగ్మం సమర్పయామి
  > వస్త్రయుగ్మ ధారణానంతరం ఆచమనీయం సమర్పయామి
- **Say (P1's transliteration, p.18):**
  > vastraM / peetaaMbara dharae daevee peetaaMbara sahOdaree peetaaMbaraM prayaChchaami vidyut aMga jaTaadharae // Sree mahaalakshmee daevyai nama: vastrayugmaM samarpayaami / vastrayugma dhaaraNaanaMtaraM aachamaneeyaM samarpayaami
- **How:** Offer or symbolically place a yellow cloth.
- **English explanation:** A yellow silk cloth is offered, describing the goddess as wearer of yellow silk.
- **తెలుగు వివరణ:** పసుపు రంగు వస్త్రాన్ని సమర్పించే విధి.
- **Source:** P1 p.6 (Telugu) / p.18 (transliteration).

#### DLP-17 · Yajnopavitam (sacred thread)

- **Say (Telugu script, P1 p.6):**
  > యజ్ఞోపవీతం
  > శబ్ద బ్రహ్మాత్మికే దేవీ శబ్ద శాస్త్ర కృతాలయే
  > సౌవర్ణం యజ్ఞ సూత్రంతే, దదామి పరమేశ్వరీ
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః యజ్ఞోపవీతం సమర్పయామి
- **Say (P1's transliteration, p.18):**
  > yaj~nOpaveetaM / Sabda brahmaatmikae daevee Sabda Saastra kRtaalayae sauvarNaM yaj~na sootraMtae, dadaami paramaeSvaree // Sree mahaalakshmee daevyai nama: yaj~nOpaveetaM samarpayaami
- **English explanation:** A gold sacred thread is offered.
- **తెలుగు వివరణ:** పసిడి యజ్ఞోపవీతాన్ని సమర్పించే విధి.
- **Source:** P1 p.6 (Telugu) / p.18 (transliteration).

#### DLP-18 · Gandham (sandal paste, turmeric, kumkum)

- **Say (Telugu script, P1 p.7):**
  > గంధం
  > కస్తూరీ కుంకుమైర్ యుక్తం ఘనసార విమిశ్రితం
  > మలయాచల సంభూతం చందనం ప్రతిగృహ్యతాం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః శ్రీ గంధాన్ ధారయామి
  > హరిద్రా కుంకుమాది సుగంధ ద్రవ్యాణి సమర్పయామి
- **Say (P1's transliteration, p.19):**
  > gaMdhaM / kastooree kuMkumair yuktaM ghanasaara vimiSritaM malayaachala saMbhootaM chaMdanaM pratigRhyataaM // Sree mahaalakshmee daevyai nama: Sree gaMdhaan dhaarayaami / haridraa kuMkumaadi sugaMdha dravyaaNi samarpayaami
- **English explanation:** Sandal paste scented with musk and camphor, along with turmeric and kumkum, is offered.
- **తెలుగు వివరణ:** గంధం, పసుపు, కుంకుమలను సమర్పించే విధి.
- **Source:** P1 p.7 (Telugu) / p.19 (transliteration).

#### DLP-19 · Pushpam and Abharanam (flowers and ornament)

- **Say (Telugu script, P1 p.7):**
  > పుష్పం - ఆభరణం
  > తురీయ వన సంభూతం నానా గుణ మనోహరం
  > ఆనంద సౌరభం పుష్పం గృహ్యతాం ఇదముత్తమం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః పుష్పాణి సమర్పయామి
  >
  > రత్నస్వర్ణవికారంచ దేహాలంకారవర్ధనం
  > శోభాదానం శ్రీకరం చ భూషణం ప్రతిగృహ్యతామ్
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః ఆభరణాని సమర్పయామి
- **Say (P1's transliteration, p.19):**
  > pushpaM - aabharaNaM / tureeya vana saMbhootaM naanaa guNa manOharaM aanaMda saurabhaM pushpaM gRhyataaM idamuttamaM // Sree mahaalakshmee daevyai nama: pushpaaNi samarpayaami // ratnasvarNavikaaraMcha daehaalaMkaaravardhanaM SObhaadaanaM SreekaraM cha bhooshaNaM pratigRhyataam // Sree mahaalakshmee daevyai nama: aabharaNaani samarpayaami
- **English explanation:** Fragrant flowers and a jewelled ornament are offered.
- **తెలుగు వివరణ:** పుష్పాలు, ఆభరణాన్ని సమర్పించే విధి.
- **Materials:** Any small piece of jewellery. Do not buy jewellery specially — use what is at hand **[App-team accommodation]**.
- **Source:** P1 p.7 (Telugu) / p.19 (transliteration).

#### DLP-20 · Anga puja (fifteen names, each part of the body)

- **Say (Telugu script, P1 p.7):**
  > అంగ పూజ
  > 1. చంచలాయై నమః – పాదౌ పూజయామి
  > 2. చపలాయై నమః – జానునీ పూజయామి
  > 3. పీతాంబర ధరాయై నమః – ఊరూం పూజయామి
  > 4. కమలవాసిన్యై నమః – కటిం పూజయామి
  > 5. పద్మాలయాయై నమః – నాభిం పూజయామి
  > 6. మదన మాత్రే నమః – స్తనౌ పుజయామి
  > 7. లలితాయై నమః – భుజద్వయం పూజయామి
  > 8. కంబుకంఠ్యై నమః – కంఠం పూజయామి
  > 9. సుముఖాయై నమః – ముఖం పూజయామి
  > 10. శ్రియై నమః – ఓష్ఠౌ పూజయామి
  > 11. సునాసికాయై నమః – నాసికాం పూజయామి
  > 12. సునేత్రాయై నమః – నేత్రే పూజయామి
  > 13. రమాయై నమః – కర్ణౌ పూజయామి
  > 14. కమలాయై నమః – శిరః పూజయామి
  > 15. శ్రీ మహా లక్ష్మీదేవ్యై నమః – సర్వాణ్యంగాని పూజయామి
- **Say (P1's transliteration, p.19):**
  > aMga pooja / chaMchalaayai nama: - paadau poojayaami / chapalaayai nama: - jaanunee poojayaami / peetaaMbara dharaayai nama: - oorooM poojayaami / kamalavaasinyai nama: - kaTiM poojayaami / padmaalayaayai nama: - naabhiM poojayaami / madana maatrae nama: - stanau pujayaami / lalitaayai nama: - bhujadvayaM poojayaami / kaMbukaMThyai nama: - kaMThaM poojayaami / sumukhaayai nama: - mukhaM poojayaami / Sriyai nama: - OshThau poojayaami / sunaasikaayai nama: - naasikaaM poojayaami / sunaetraayai nama: - naetrae poojayaami / ramaayai nama: - karNau poojayaami / kamalaayai nama: - Sira: poojayaami / Sree mahaa lakshmeedaevyai nama: - sarvaaNyaMgaani poojayaami
- **How:** Offer a pinch of akshata or a flower at each named part, in order.
- **English explanation:** Fifteen names of the goddess, each paired with a part of the body, worshipped in turn.
- **తెలుగు వివరణ:** పదిహేను నామాలతో అమ్మవారి శరీర భాగాలను క్రమంగా పూజించే విధి.
- **Source:** P1 p.7 (Telugu) / p.19 (transliteration).

### Phase F — Lakshmi Ashtottara Shatanama Stotram

#### DLP-21 · Lakshmi Ashtottara Shatanama Stotram

- **Say (Telugu script, P1 pp.8–9):**
  > లక్ష్మీ అష్టోత్తర శతనామావళి
  >
  > వందే పద్మకరాం ప్రసన్నవదనాం సౌభాగ్యదాం భాగ్యదాం
  > హస్తాభ్యామభయప్రదాం మణిగణైః నానావిధైః భూషితామ్
  > భక్తాభీష్ట ఫలప్రదాం హరిహర బ్రహ్మాధిభిస్సేవితాం
  > పార్శ్వే పంకజ శంఖపద్మ నిధిభిః యుక్తాం సదా శక్తిభిః
  >
  > సరసిజ నయనే సరోజహస్తే ధవళ తరాంశుక గంధమాల్య శోభే
  > భగవతి హరివల్లభే మనోజ్ఞే
  > త్రిభువన భూతికరి ప్రసీదమహ్యం
  >
  > ఓం ప్రకృతిం, వికృతిం, విద్యాం, సర్వభూత హితప్రదామ్
  > శ్రద్ధాం, విభూతిం, సురభిం, నమామి పరమాత్మికామ్ 1
  > వాచం, పద్మాలయాం, పద్మాం, శుచిం, స్వాహాం, స్వధాం, సుధామ్
  > ధన్యాం, హిరణ్యయీం, లక్ష్మీం, నిత్యపుష్టాం, విభావరీమ్ 2
  > అదితిం చ, దితిం, దీప్తాం, వసుధాం, వసుధారిణీమ్
  > నమామి కమలాం, కాంతాం, క్షమాం, క్షీరోద సంభవామ్ 3
  > అనుగ్రహపరాం, బుద్ధిం, అనఘాం, హరివల్లభామ్
  > అశోకా, అమృతాం దీప్తాం, లోకశోక వినాశినీమ్ 4
  > నమామి ధర్మనిలయాం, కరుణాం, లోకమాతరం
  > పద్మప్రియాం, పద్మహస్తాం, పద్మాక్షీం, పద్మసుందరీమ్ 5
  > పద్మోద్భవాం, పద్మముఖీం, పద్మనాభప్రియాం, రమామ్
  > పద్మమాలాధరాం, దేవీం, పద్మినీం, పద్మగంధినీమ్ 6
  > పుణ్యగంధాం, సుప్రసన్నాం, ప్రసాదాభిముఖీం, ప్రభామ్
  > నమామి చంద్రవదనాం, చంద్రాం, చంద్రసహోదరీమ్ 7
  > చతుర్భుజాం, చంద్రరూపాం, ఇందిరా, మిందుశీతలామ్
  > ఆహ్లాద జననీం, పుష్టిం, శివాం, శివకరీం, సతీమ్ 8
  > విమలాం, విశ్వజననీం, పుష్టిం, దారిద్ర్య నాశినీం
  > ప్రీతి పుష్కరిణీం, శాంతాం, శుక్లమాల్యాంబరాం, శ్రియమ్ 9
  > భాస్కరీం, బిల్వనిలయాం, వరారోహాం, యశస్వినీం
  > వసుంధరా, ముదారాంగాం, హరిణీం, హేమమాలినీం 10
  > ధనధాన్యకరీం, సిద్ధిం, స్త్రైణసౌమ్యాం, శుభప్రదామ్
  > నృపవేశ్మ గతానందాం, లక్ష్మీం, వసుప్రదామ్ 11
  > శుభాం, హిరణ్యప్రాకారాం, సముద్రతనయాం, జయామ్
  > నమామి మంగళాం దేవీం, విష్ణు వక్షఃస్థల స్థితామ్ 12
  > విష్ణుపత్నీం, ప్రసన్నాక్షీం, నారాయణ సమాశ్రితామ్
  > దారిద్ర్య ధ్వంసినీం, దేవీం, సర్వోపద్రవ వారిణీమ్ 13
  > నవదుర్గాం, మహాకాళీం, బ్రహ్మ విష్ణు శివాత్మికాం
  > త్రికాలజ్ఞాన సంపన్నాం, నమామి భువనేశ్వరీమ్ 14
  >
  > లక్ష్మీం క్షీరసముద్రరాజ తనయాం శ్రీరంగధామేశ్వరీమ్
  > దాసీభూత సమస్తదేవ వనితాం లోకైక దీపాంకురామ్
  > శ్రీమన్నంద కటాక్ష లబ్ధ విభవద్-బ్రహ్మేంద్ర గంగాధరామ్
  > త్వాం త్రైలోక్య కుటుంబినీం సరసిజాం వందే ముకుందప్రియామ్ 15
  >
  > మాతర్నమామి! కమలే! కమలాయతాక్షి!
  > శ్రీ విష్ణు హృత్-కమలవాసిని! విశ్వమాతః!
  > క్షీరోదజే కమల కోమల గర్భగౌరి!
  > లక్ష్మీ! ప్రసీద సతతం సమతాం శరణ్యే 16
- **Say (P1's transliteration, pp.20–21):**
  > vaMdae padmakaraaM prasannavadanaaM saubhaagyadaaM bhaagyadaaM
  > hastaabhyaamabhayapradaaM maNigaNai: naanaavidhai: bhooshitaam
  > bhaktaabheeshTa phalapradaaM harihara brahmaadhibhissaevitaaM
  > paarSvae paMkaja SaMkhapadma nidhibhi: yuktaaM sadaa Saktibhi:
  >
  > sarasija nayanae sarOjahastae dhavaLa taraaMSuka gaMdhamaalya SObhae
  > bhagavati harivallabhae manO~m~nae
  > tribhuvana bhootikari praseedamahyam
  >
  > OM prakRtiM, vikRtiM, vidyaaM, sarvabhoota hitapradaam
  > SraddhaaM, vibhootiM, surabhiM, namaami paramaatmikaam 1
  > vaachaM, padmaalayaaM, padmaaM, SuchiM, svaahaaM, svadhaaM, sudhaam
  > dhanyaaM, hiraNyayeeM, lakshmeeM, nityapushTaaM, vibhaavareem 2
  > aditiM cha, ditiM, deeptaaM, vasudhaaM, vasudhaariNeem
  > namaami kamalaaM, kaaMtaaM, kshamaaM, ksheerOda saMbhavaam 3
  > anugrahaparaaM, buddhiM, anaghaaM, harivallabhaam
  > aSOkaa, amRtaaM deeptaaM, lOkaSOka vinaaSineem 4
  > namaami dharmanilayaaM, karuNaaM, lOkamaataram
  > padmapriyaaM, padmahastaaM, padmaaksheeM, padmasuMdareem 5
  > padmOdbhavaaM, padmamukheeM, padmanaabhapriyaaM, ramaam
  > padmamaalaadharaaM, daeveeM, padmineeM, padmagaMdhineem 6
  > puNyagaMdhaaM, suprasannaaM, prasaadaabhimukheeM, prabhaam
  > namaami chaMdravadanaaM, chaMdraaM, chaMdrasahOdareem 7
  > chaturbhujaaM, chaMdraroopaaM, iMdiraa,miMduSeetalaam
  > aahlaada jananeeM, pushTiM, SivaaM, SivakareeM, sateem 8
  > vimalaaM, viSvajananeeM, pushTiM, daaridrya naaSineem
  > preeti pushkariNeeM, SaaMtaaM, SuklamaalyaaMbaraaM, Sriyam 9
  > bhaaskareeM, bilvanilayaaM, varaarOhaaM, yaSasvineem
  > vasuMdharaa, mudaaraaMgaaM, hariNeeM, haemamaalineem 10
  > dhanadhaanyakareeM, siddhiM, straiNasaumyaaM, Subhapradaam
  > nRpavaeSma gataanaMdaaM, lakshmeeM, vasupradaam 11
  > SubhaaM, hiraNyapraakaaraaM, samudratanayaaM, jayaam
  > namaami maMgaLaaM daeveeM, vishNu vaksha:sthala sthitaam 12
  > vishNupatneeM, prasannaaksheeM, naaraayaNa samaaSritaam
  > daaridrya dhvaMsineeM, daeveeM, sarvOpadrava vaariNeem 13
  > navadurgaaM, mahaakaaLeeM, brahma vishNu Sivaatmikaam
  > trikaala~m~naana saMpannaaM, namaami bhuvanaeSvareem 14
  >
  > lakshmeeM ksheerasamudraraaja tanayaaM SreeraMgadhaamaeSvareem
  > daaseebhoota samastadaeva vanitaaM lOkaika deepaaMkuraam
  > SreemannaMda kaTaaksha labdha vibhavad-brahmaeMdra gaMgaadharaam
  > tvaaM trailOkya kuTuMbineeM sarasijaaM vaMdae mukuMdapriyaam 15
  >
  > maatarnamaami! kamalae! kamalaayataakshi!
  > Sree vishNu hRt-kamalavaasini! viSvamaata:!
  > ksheerOdajae kamala kOmala garbhagauri!
  > lakshmee! praseeda satataM samataaM SaraNyae 16

  This PR-finalization pass re-ran the cross-check word-for-word against the Telugu-script lines above, directly against the source PDF's own page images (pp.8–9 and pp.20–21), not just re-asserted a prior pass's conclusion, and confirms the verse numbering (1–16) and wording match **except at four specific points, all minor and all on the Roman transliteration side only** — see Section 6.7 for the full comparison. The transliteration above already has all four corrections applied (verses 4, 10, 11, 15); no other discrepancy was found anywhere in the sixteen verses.
- **How:** Read unhurried, with pauses between verses. This is a continuous hymn, not 108 separately offered names — see Section 6.1.
- **English explanation:** A sixteen-verse hymn (not a plain list of 108 names) in praise of Lakshmi under many epithets — including, in verse 14, "navadurgaam, mahaakaaleem" (Navadurga, Mahakali) among her identifications, and the closing verse addressing her directly as "Mother."
- **తెలుగు వివరణ:** ఇది 108 పేర్లను విడివిడిగా అర్పించే నామావళి కాదు; పదహారు శ్లోకాలతో కూడిన స్తోత్రం. నెమ్మదిగా, ఆగుతూ చదవండి.
- **Materials:** None named beyond what is already placed.
- **Source:** P1 pp.8–9 (Telugu) / pp.20–21 (transliteration). **See Section 6.1 — this is the "Namavali heading vs Ashtottara Stotram body" discrepancy the task specifically asked about.** X1 (sanskritdocuments.org) independently confirms that a "Lakshmi Ashtottara Shatanama Stotram" is a recognised verse-form genre, corroborating (not proving) that P1's content, if not its heading, matches the stotram tradition rather than a plain namavali.

### Phase G — Dhupa, deepa, naivedya, tambula, neerajana

#### DLP-22 · Dhupam (incense)

- **Say (Telugu script, P1 p.10):**
  > ధూపం
  > వృక్ష నిర్యాస రూపంచ గంధ ద్రవ్యాది సంయుతం
  > శ్రీకృష్ణకాంతే ధూపం చ పవిత్రం ప్రతిగృహ్యతామ్
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః ధూపం ఆఘ్రాపయామి
- **Say (P1's transliteration, p.22):**
  > dhoopaM / vRksha niryaasa roopaMcha gaMdha dravyaadi saMyutaM SreekRshNakaaMtae dhoopaM cha pavitraM pratigRhyataam // Sree mahaalakshmee daevyai nama: dhoopaM aaghraapayaami
- **How [App-team accommodation]:** Use incense only if safe to do so; ventilate the room; skip entirely for respiratory sensitivity — this does not make incense "traditionally forbidden," it is only a practical accommodation.
- **English explanation:** Fragrant incense, a tree resin, is offered.
- **తెలుగు వివరణ:** పరిమళ ధూపాన్ని సమర్పించే విధి.
- **Source:** P1 p.10 (Telugu) / p.22 (transliteration).

#### DLP-23 · Deepam (lamp)

- **Say (Telugu script, P1 p.10):**
  > దీపం
  > జగచ్చక్షుః స్వరూపంచ ప్రాణరక్షణ కారణం
  > ప్రదీపం శుద్ధరూపంచ గృహ్యతాం పరమేశ్వరి
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః దీపం దర్శయామి
- **Say (P1's transliteration, p.22):**
  > deepaM / jagachchakshu: svaroopaMcha praaNarakshaNa kaaraNaM pradeepaM SuddharoopaMcha gRhyataaM paramaeSvari // Sree mahaalakshmee daevyai nama: deepaM darSayaami
- **How [App-team accommodation]:** An adult handles the flame, kept away from children, hair, and fabric.
- **English explanation:** The lamp, described as the world's eye and the source of life's protection, is shown.
- **తెలుగు వివరణ:** దీపాన్ని జాగ్రత్తగా చూపించే విధి.
- **Source:** P1 p.10 (Telugu) / p.22 (transliteration).

#### DLP-24 · Naivedyam (food offering)

- **Selected for app display and audio:**
  > నైవేద్యం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః నైవేద్యం సమర్పయామి
  >
  > ఋతం త్వా సత్యేన పరిషించామి (సాయంత్రం)
  > అమృతమస్తు అమృతోపస్తరణమసి
  >
  > ఓం ప్రాణం నమః– అపానం నమః – వ్యానం నమః
  > ఉదానం నమః – సమానం నమః
  > మధ్యే మధ్యే పానీయం సమర్పయామి – అమృతమస్తు అమృతాపిధానమసి
  > ఉత్తరా పోషనం సమర్పయామి, హస్తౌ ప్రక్షాళనం సమర్పయామి
  > పాద ప్రక్షాళనం సమర్పయామి, శుద్ధాచమనీయం సమర్పయామి
  >
  > *(Transliteration: naivaedyaM / Sree mahaalakshmee daevyai nama: naivaedyaM samarpayaami // RtaM tvaa satyaena parishiMchaami (Eve) amRtamastu amRtOpastaraNamasi // OM praaNaM nama:- apaanaM nama: - vyaanaM nama: udaanaM nama: - samaanaM nama: madhyae madhyae paaneeyaM samarpayaami - amRtamastu amRtaapidhaanamasi uttaraa pOSanaM samarpayaami, hastau prakshaaLanaM samarpayaami paada prakshaaLanaM samarpayaami, SuddhaachamaneeyaM samarpayaami)*
  >
  > The morning branch ("సత్యం త్వర్తేన పరిషించామి" / "satyaM tvartaena parishiMchaami", for performers at another time of day) is given in the historical source wording below; this document selects the evening line for an evening Diwali puja (Section 6.5).
- **Historical source wording (P1 p.10 Telugu / p.22 transliteration — not used for audio):**
  > శర్కరా మధు సంయుక్తం, ఆజ్యాదైః అధపూరితం
  > గృహాణ **దుర్గే** నైవేద్యం, **మహిషాసుర మర్దిని**
  >
  > *(P1's transliteration: Sarkaraa madhu saMyuktaM, aajyaadai: adhapooritaM gRhaaNa **durgae** naivaedyaM, **mahishaasura mardini**)*
  >
  > (morning branch) సత్యం త్వర్తేన పరిషించామి (ఉదయం) / *satyaM tvartaena parishiMchaami (Mor)*
- **How:** Place the food offering, then recite the selected offering line, then offer small sips/touches of water as the lines direct ("madhyae madhyae paaneeyaM" — water offered between courses; final hand- and foot-washing water).
- **English explanation:** A sweet offering of sugar and honey, filled with ghee, is offered. **P1's own descriptive verse for this step addresses "Durge... Mahishasura Mardini," names of Durga, not Lakshmi** (see Section 6.2) — that verse is recorded above as historical source text, not selected for recitation. The selected recitation uses P1's own Lakshmi-addressed offering line ("Sree mahaalakshmee daevyai nama: naivaedyaM samarpayaami"), which appears in P1 immediately after the descriptive verse, in this same step.
- **తెలుగు వివరణ:** తీపి నైవేద్యాన్ని సమర్పించే విధి. పఠనం కోసం ఎంచుకున్న వాక్యం లక్ష్మీదేవిని సంబోధిస్తుంది; మూల గ్రంథంలోని వర్ణనాత్మక శ్లోకం దుర్గాదేవిని సంబోధిస్తుంది గనుక పఠనానికి ఎంచుకోలేదు (విభాగం 6.2 చూడండి).
- **Materials:** A sweet food offering (see Section 4).
- **Source:** P1 p.10 (Telugu) / p.22 (transliteration), with an editorial recitation selection — see **Section 6.2** for the full decision and reasoning. The "Durga wording within the Lakshmi naivedyam passage" discrepancy the task specifically asked about is confirmed in both the Telugu script and the transliteration, not an extraction artifact; it is preserved as historical source text above, not recited.

#### DLP-25 · Tambulam (betel)

- **Say (Telugu script, P1 p.11):**
  > తాంబూలం
  > తాంబూలం చ వరం రమ్యం కర్పూరాది సువాసితం
  > జిహ్వా జాడ్య చ్ఛేదకరం తాంబూలం ప్రతిగృహ్యతాం
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః తాంబూలం సమర్పయామి
- **Say (P1's transliteration, p.23):**
  > taaMboolaM / taaMboolaM cha varaM ramyaM karpooraadi suvaasitaM jihvaa jaaDya chChaedakaraM taaMboolaM pratigRhyataaM // Sree mahaalakshmee daevyai nama: taaMboolaM samarpayaami
- **How [App-team accommodation]:** If betel leaf and areca nut are unavailable, recite the verse in full and offer a pinch of akshata or a flower instead. This is a practical substitution, not a claim of equal ritual status. Never substitute alcohol or tobacco.
- **English explanation:** Betel leaf scented with camphor, said to clear dullness of the tongue, is offered.
- **తెలుగు వివరణ:** తాంబూలాన్ని సమర్పించే విధి; లేకపోతే అక్షతలు లేదా పువ్వు సమర్పించవచ్చు.
- **Source:** P1 p.11 (Telugu) / p.23 (transliteration).

#### DLP-26 · Neerajanam (aarti / camphor flame)

- **Say (Telugu script, P1 p.11):**
  > నీరాజనం
  > సంమ్రాజం చ విరాజంచా భి శ్రీర్ యా చ నో గృహే
  > లక్ష్మీ రాష్ట్రస్య యా ముఖే తయా మా సం సృజామసి
  > కర్పూర దీప తేజస్త్వం అజ్ఞాన తిమిరాపహ
  > దేవీ ప్రీతికరం చైవ మమ సౌఖ్యం వివర్ధయ
  > సంతత శ్రీరస్తు సమస్త మంగళాని భవంతు నిత్య శ్రీరస్తు నిత్యమంగళాని భవంతు
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః కర్పూర నీరాజనం సమర్పయామి
- **Say (P1's transliteration, p.23):**
  > neeraajanaM / saMmraajaM cha viraajaMchaa bhi Sreer yaa cha nO gRhae lakshmee raashTrasyayaa mukhae tayaa maa saM sRjaamasi // karpoora deepa taejastvaM aj~naana timiraapaha daevee preetikaraM chaiva mama saukhyaM vivardhaya saMtata Sreerastu samasta maMgaLaani bhavaMtu nitya Sreerastu nityamaMgaLaani bhavaMtu // Sree mahaalakshmee daevyai nama: karpoora neeraajanaM samarpayaami
- **How [App-team accommodation]:** An adult offers the camphor flame, moving it slowly over a heat-safe plate; never burn camphor in the palm.
- **English explanation:** A verse invoking Lakshmi's presence in the home, followed by the camphor-flame offering, as the destroyer of ignorance's darkness and the source of wellbeing and auspiciousness.
- **తెలుగు వివరణ:** కర్పూర నీరాజనాన్ని జాగ్రత్తగా సమర్పించే విధి.
- **Materials:** Camphor, a harati plate.
- **Source:** P1 p.11 (Telugu) / p.23 (transliteration).

### Phase H — Closing

#### DLP-27 · Mantrapushpam and atma-pradakshina-namaskaram

- **Say (Telugu script, P1 p.12):**
  > మంత్రపుష్పం - నమస్కారం
  > పద్మాసనే పద్మకరే సర్వ లోకైక పూజితే
  > నారాయణే ప్రియే దేవీ సుప్రీతో భవ సర్వదా
  >
  > శ్రీ మహాలక్ష్మీ దేవ్యై నమః సువర్ణ దివ్య మంత్రపుష్పం సమర్పయామి
  > ఆత్మ ప్రదక్షిణ నమస్కారాన్ సమర్పయామి
- **Say (P1's transliteration, p.24):**
  > maMtrapushpaM - namaskaaraM / padmaasanae padmakarae sarva lOkaika poojitae naaraayaNae priyae daevee supreetO bhava sarvadaa // Sree mahaalakshmee daevyai nama: suvarNa divya maMtrapushpaM samarpayaami / aatma pradakshiNa namaskaaraan samarpayaami
- **How [App-team accommodation]:** "Atma pradakshina" means circling in place where there is no room to walk around the altar; bow with folded hands.
- **English explanation:** A golden flower-offering, followed by circling in place and a bow.
- **తెలుగు వివరణ:** పుష్పాన్ని సమర్పించి, నిలబడిన చోటే ప్రదక్షిణగా తిరిగి నమస్కరించే విధి.
- **Source:** P1 p.12 (Telugu) / p.24 (transliteration).

#### DLP-28 · Mental royal offerings (rajopachara)

- **Say (Telugu script, P1 p.12):**
  > ఛత్ర చామర గీత నృత్య ఆందోళికా అశ్వారోహణ గజారోహణ
  > సమస్త రాజోపచారాన్ మనసా సమర్పయామి
- **Say (P1's transliteration, p.24):**
  > Chatra chaamara geeta nRtya aaMdOLikaa aSvaarOhaNa gajaarOhaNa samasta raajOpacharaan manasaa samarpayaami
- **How:** No physical items are implied — these are offered "manasaa" (mentally): umbrella, fan, song, dance, palanquin, horse-riding, elephant-riding, offered in the mind as royal honours.
- **English explanation:** Royal honours too elaborate to offer physically — umbrella, fan, music, dance, a palanquin ride, horse and elephant processions — are offered mentally.
- **తెలుగు వివరణ:** ఛత్రం, చామరం, సంగీతం, నృత్యం వంటి రాజోపచారాలను మనసులో సమర్పించే విధి — భౌతిక వస్తువులు అవసరం లేదు.
- **Source:** P1 p.12 (Telugu) / p.24 (transliteration).

#### DLP-29 · Completion verses

- **Say (Telugu script, P1 p.12):**
  > యస్య స్మృత్యాచ నామోక్త్యా తపః పూజా క్రియాదిషు:
  > న్యూనం సంపూర్ణతాం యాతి సద్యో వందే తమచ్యుతం
  > మంత్ర హీనం క్రియాహీనం భక్తిహీనం జనార్దని,
  > యత్పూజితం మాయా దేవి పరిపూర్ణం తదస్తుతే
  > అనయా యధా శక్తి పూజయాచ భగవతీ సర్వాత్మికా
  > శ్రీ మహ లక్ష్మీ దేవతా సుప్రసన్నః స్సుప్రీతో దో భవతు
- **Say (P1's transliteration, p.24):**
  > yasya smRtyaacha naamOktyaa tapa: poojaa kriyaadishu: nyoonaM saMpoorNataaM yaati sadyO vaMdae tamachyutaM / maMtra heenaM kriyaaheenaM bhaktiheenaM janaardani, yatpoojitaM maayaa daevi paripoorNaM tadastutae / anayaa yadhaa Sakti poojayaacha bhagavatee sarvaatmikaa Sree mahaa lakshmee daevataa suprasanna: ssupreetO dO bhavatu
- **English explanation:** A traditional verse asking that any imperfection in the worship — missing a mantra, missing an act, missing devotion — be made whole by her remembrance, and that the goddess be pleased with this worship done to the best of one's ability.
- **తెలుగు వివరణ:** పూజలో లోపాలు ఉంటే వాటిని మన్నించమని, శక్తి మేరకు చేసిన పూజను స్వీకరించమని కోరుతూ చదివే శ్లోకం.
- **Source:** P1 p.12 (Telugu) / p.24 (transliteration).

#### DLP-30 · Welfare and peace verses

- **Say (Telugu script, P1 p.12):**
  > స్వస్తి ప్రజాభ్యః పరిపాలయంతాం న్యాయేన మార్గేన మహీం మహీశా
  > గో బ్రాహ్మణేభ్యః శుభమస్తు నిత్యం, లోకాః సమస్తా సుఖినో భవంతు.
  > కాలే వర్షతు పర్జన్యః పృథివీ సస్య శాలినీ
  > దేశోయం క్షోభ రహితో బ్రహ్మణా సంతు నిర్భయః
  > అపుత్రాః పుత్రిణః స్సంతు పుత్రిణ స్సంతుపౌత్రిణః
  > అధనాః స్సధనాః సంతు జీవంతు శరదాం శతం
- **Say (P1's transliteration, p.24):**
  > svasti prajaabhya: paripaalayaMtaaM nyaayaena maargaena maheeM maheeSaa / gO braahmaNaebhya: Subhamastu nityaM, lOkaa: samastaa sukhinO bhavaMtu. / kaalae varshatu parjanya: pRthivee sasya Saalinee / daeSOyaM kshObha rahitO brahmaNaa saMtu nirbhaya: / aputraa: putriNa: ssaMtu putriNa ssaMtupautriNa: / adhanaa: ssadhanaa: saMtu jeevaMtu SaradaaM SataM
- **English explanation:** General Sanskrit welfare verses, wishing just rule, timely rain, fearlessness, and prosperity for all beings — not specific to any one family's circumstances.
- **తెలుగు వివరణ:** లోకకల్యాణం కోరుతూ చదివే సాధారణ శుభాకాంక్షా శ్లోకాలు.
- **Source:** P1 p.12 (Telugu) / p.24 (transliteration). This is the final recitation P1 prints; nothing follows it on page 12/24 except the page footer. **See Section 6.4 — the farewell/udvasana discrepancy the task specifically asked about.**

#### DLP-31 · Practical completion

- **What to do:** Conclude respectfully, handle prasadam and water safely, and extinguish all flames before leaving the space.
- **How [App-team accommodation]:** P1 prints no distinct farewell/udvasana mantra (confirmed by reading the final page image — see Section 6.4). If the kalasha/materials used were set up specifically for this puja and are not a permanent household shrine, you may clear them respectfully once you feel the worship is complete; there is no sourced instruction for exactly when or how. If your Lakshmi image is part of a permanent household altar, nothing here implies moving or removing it.
- **English explanation:** A practical close: share prasadam, clean up safely, and never leave an unattended flame.
- **తెలుగు వివరణ:** ప్రసాదాన్ని, నీటిని జాగ్రత్తగా చూసుకోండి. వెళ్ళే ముందు దీపాలను సురక్షితంగా ఆర్పండి.
- **Source:** Editorial — P1 prints no closing instructions beyond the welfare verses in DLP-30.

---

## 6. Decision log

Four discrepancies were specifically named in the task (6.1–6.4). Each is resolved here with an explicit, cited decision — not a silent fix. Section 6.5 records additional decisions needed for one coherent procedure. Sections 6.6 and 6.7, added in this PR-finalization pass, select and cite a source-supported recitation for the two lines previously flagged as audio-unsafe without a decision, and record three further minor discrepancies found by a full Telugu/transliteration cross-check.

### 6.1 "Namavali" heading versus an Ashtottara Stotram body

**Evidence, confirmed by direct page-image inspection this session (not inferred from the corrupted extraction):** P1 p.8 (Telugu) prints the heading "లక్ష్మీ అష్టోత్తర శతనామావళి" ("Lakshmi Ashtottara Shatanamavali" — i.e., a "namavali", a list of names), matched by P1 p.20's transliteration heading "lakshmee ashTOttara Sata naamaavaLi". But the content under that heading, on both the Telugu pages (8–9) and the transliteration pages (20–21), is **not** a sequence of 108 individually offered "Om ... namah" lines. It is sixteen numbered metrical verses (1 through 16), opening with "vande padmakaraaM..." and "OM prakRtiM, vikRtiM, vidyaaM...", each verse naming several epithets together rather than offering one name at a time.

**Decision:** Label this content **"Lakshmi Ashtottara Shatanama Stotram"** in the app and in this document (Section 5, DLP-21) — a name that accurately describes what the content actually is (a stotram, a hymn, in verse form), while still carrying forward P1's own "108 names" framing (Ashtottara Shatanama = "the 108 names"). Do **not** present this as 108 separately countable names, and do not build or imply a "108 taps / 108 flowers" counted-offering interaction around it — the verse form does not support that. This is consistent with the general naming convention in Sanskrit devotional literature, where "ashtottara shatanamavali" is used loosely for both the discrete 108-name form and for a 108-name content delivered as continuous verse (a genuine, attested naming looseness, not a P1-specific error). X1 (sanskritdocuments.org) independently confirms the existence of a recognised "Shrilakshmyashtottarashatanamastotram" genre, corroborating that this is not an idiosyncratic P1 invention — but X1's own differing line-by-line readings are not imported into P1's text (see Section 3, rule 5).

### 6.2 Durga wording within the Lakshmi naivedyam passage

**Evidence, confirmed by direct page-image inspection of both the Telugu script (p.10) and the transliteration (p.22) this session:** The naivedyam verse within the Mahalakshmi shodashopachara sequence reads "గృహాణ దుర్గే నైవేద్యం, మహిషాసుర మర్దిని" / "gRhaaNa durgae naivaedyaM, mahishaasura mardini" — "Accept this food offering, O Durga, slayer of the buffalo-demon." These are names and an epithet of Durga, not Lakshmi. This is present identically in both the Telugu-script and Roman pages, so it is a genuine feature of P1's printed text, not an extraction artifact or an OCR misread.

**Decision (finalized this session, revising the earlier "retain and label only" position):** **Select P1's own Lakshmi-addressed operative line as the recitation for app display and audio; keep the Durga-addressed descriptive verse as historical source text only, not recited.** This is not an invented correction — both halves are P1's own printed text, in the same step, in the order P1 itself prints them: a descriptive verse (which names Durga/Mahishasura Mardini) immediately followed by the operative offering formula "Sree mahaalakshmee daevyai nama: naivaedyaM samarpayaami" (which correctly names Lakshmi). Every other service step in this puja follows the same two-part pattern (a descriptive verse, then the "Sree mahaalakshmee daevyai nama: ... samarpayaami" operative line); treating the operative line as the part that is actually spoken while performing the ritual act, with the descriptive verse as supporting/historical text, is consistent with that existing pattern — it is not a new structure invented only for this one disputed step. No Sanskrit is invented, added, or substituted anywhere: the selected text is 100% P1's own wording, just re-scoped to the half of the step that already names the correct deity. The descriptive verse naming Durga is preserved in full in Section 5 as historical source text, labelled plainly in both English and Telugu, and is never synthesised for audio. This line is no longer blocked pending a reviewer decision (see Section 8) — it carries `REVIEW_REQUIRED` like everything else in this document (see Section 8's note on what that status does and does not require), not a special additional gate. The most plausible non-authoritative explanation for why P1 prints the Durga verse here at all — offered only as context, not as settled fact — is that this is a commonly reused naivedyam-offering formula shared across multiple goddess worships in compiled puja booklets, not re-written for the Lakshmi context; that explanation is not verified and is not asserted as the reason.

### 6.3 The unrelated Shodasha Somavara note

**Evidence, confirmed by direct page-image comparison this session:** P1's transliteration page 16 includes a parenthetical sentence immediately after the Ganapati prarthana verse and before the seventeen services begin: "(ee kriMdi gaNapati pooja, nitya poojalO avasaraM laedu. shODaSa sOmavaara vrataM samayaMlO chaestae chaalu)" — "this Ganapati puja below is not needed for daily worship; it is enough to do it during the Shodasha Somavara Vratam." **P1's corresponding Telugu page 4 does not print this sentence at all** — it goes directly from the Ganapati prarthana verse to "aadau nirvighna parisamaaptyardhaM..." and the seventeen services.

**Decision:** **Exclude this note from the Diwali Lakshmi Puja's instructions.** It refers to a different, unrelated vrata (Shodasha Somavara Vratam, a distinct Monday-observance tradition) and its own source page (the Telugu original) does not carry it — it reads as editorial cross-contamination from another document the compiler was also working on, not as an instruction for this puja. Ganapati worship (DLP-08) is kept as P1's own opening act for this puja, exactly as both the Telugu and transliteration pages otherwise agree it should be. The note itself is preserved here, in this decision log and in Section 5's note at DLP-08, for transparency about what P1 actually contains — but it is not carried into the step instructions or into any app content.

### 6.4 Whether the source provides an explicit farewell/udvasana

**Evidence, confirmed by direct inspection of the final page image this session (Telugu p.12, transliteration p.24):** P1's last page ends with the mantrapushpam, self-circumambulation and bow (DLP-27), the mental royal offerings (DLP-28), the completion/forgiveness verses (DLP-29), and the general welfare/peace verses (DLP-30), ending "...jeevaMtu SaradaaM SataM" / "...జీవంతు శరదాం శతం". Nothing follows on that page except the channel-credit footer. **No distinct udvasana or visarjana mantra, and no instruction about removing, immersing, or putting away the kalasha or the image, appears anywhere in P1's 24 pages.**

**Decision:** **Do not invent a farewell mantra.** DLP-31 ("Practical completion") is added as explicitly **editorial, non-mantra** guidance: handle prasadam and water safely, extinguish flames, and — only as a practical note, not a ritual instruction — observe that if the kalasha/materials were set up specifically for this puja (not part of a permanent household shrine), they may be cleared respectfully once the worship feels complete, with no sourced timing or wording attached to that act. This document does not claim a physical farewell is either required or forbidden; it says plainly that P1 does not address the question, consistent with Section 3's rule against inventing ritual rules the source does not state.

### 6.5 Additional editorial decisions (not separately asked for, but required to produce one coherent procedure)

- **Morning/evening naivedyam branch (DLP-24):** P1 prints both a "(Mor)" and an "(Eve)" water-circling line at the naivedyam step. Since this is a Diwali **evening** puja by occasion, the evening branch ("RtaM tvaa satyaena parishiMchaami" / "ఋతం త్వా సత్యేన పరిషించామి") is the one this document recommends by default, but both lines are printed in Section 5 so a performer at another time of day is not forced into the wrong one. This is an editorial reading of P1's own built-in choice, not an invented alternative.
- **The Sankalpam's family/extra-purpose wording (DLP-05):** P1's own Sankalpam already uses "asmaakaM saha kuTuMbaanaaM" (for us, with our families) and names extra purposes — Vedic-tradition support and cow protection — that are P1's own text, not an app invention. This document presents that wording exactly as printed and does not claim it already supports distinct SELF/FAMILY/GROUP framings; see Section 7 for how this maps (or does not yet map) onto the app's existing participant model.
- **P1/P2 boundary:** P2's shorter, mental-offering-heavy structure is never used to fill a gap in P1. Where P1 is silent (for example, on udvasana), this document says so explicitly rather than quietly borrowing P2's ending.
- **"natna khachita" at the Asana step (DLP-11):** resolved this session with a cited, source-supported correction — see Section 6.6 (this supersedes the earlier "flagged but not corrected" position; the line is no longer open).

### 6.6 "natna khachita" — selecting a source-supported recitation (DLP-11)

**The problem, precisely:** P1's own Asana (seat-offering) line prints "శ్రీ మహాలక్ష్మీ దేవ్యై నమః నత్న ఖచిత సింహాసనం సమర్పయామి" / "Sree mahaalakshmee daevyai nama: natna khachita siMhaasanaM samarpayaami" — confirmed identically in both P1's Telugu page (p.5) and its transliteration page (p.17), so this is a feature of P1 itself, not an artifact of this session's reading of it. **"నత్న"/"natna" is not an attested word in Sanskrit or Telugu** — it has no dictionary entry and no independent usage found anywhere in this session's research. "న" (na) and "ర" (ra) are visually distinct Telugu letters, so a misreading at the transcription stage is implausible; this looks like a printing slip already present in P1's own source material, in both of its editions.

**Why "ratna khachita" is the source-supported alternative, not a memory-based guess:**
- **Internal evidence:** the immediately preceding line of the very same verse already reads "అమూల్య రత్నసారం చ నిర్మితం విశ్వకర్మణా" / "amoolya ratnasaaraM cha nirmitaM viSvakarmaNaa" ("made of priceless jewel-essence, by Vishvakarma") — P1's own text already establishes a jewel ("ratna") theme two lines earlier, which "ratna khachita" ("jewel-studded") continues and "natna khachita" does not continue or mean anything.
- **Lexical evidence:** "ఖచిత"/"khacita" is independently attested in Sanskrit dictionaries (Monier-Williams, Cappeller) as "inlaid, adorned with, studded," and "ratnakhacita" ("gem-studded") is a recorded compound (see e.g. the `khacita` entry collected at wisdomlib.org, https://www.wisdomlib.org/definition/khacita, consulted this session for the dictionary definition only, not as a devotional source).
- **External, independently-sourced corroboration in the identical ritual slot:** X2 (a generic Asanam-offering puja verse at greenmesg.org) independently uses "ratna-khacitam ... simhasanam" ("jewel-studded ... throne") as a standard Asanam formula. X3 (an unrelated, independently published Sri Lakshmi Pooja procedure from Chinna Jeeyar Math) prints "Rathna simhasanam samarpayami" at the **same ritual step** (the Asana offering to Lakshmi) in a differently-authored text. Two independent sources, neither derived from P1, agree on "ratna/rathna ... simhasanam" in this exact ritual position.
- **What this is not:** this is not sacred-content.md's prohibited case of "correcting a canonical mantra from model memory." No word is being supplied from this agent's own recollection of what the mantra "should" say. The correction is grounded in (a) P1's own internal textual evidence two lines earlier, (b) an attested dictionary word versus an unattested non-word, and (c) two independent, citable, external sources agreeing on the same reading in the same ritual position.

**Decision:** Select "రత్న ఖచిత" / "ratna khachita" as the recitation for app display and audio (Section 5, DLP-11). Preserve P1's literal printed "నత్న ఖచిత" / "natna khachita" as historical source text, clearly labelled, never itself synthesised or displayed as the sacred recitation. This line is no longer open or blocked pending a reviewer decision (see Section 8).

### 6.7 Four minor Telugu/transliteration discrepancies found in the Ashtottara Stotram (DLP-21)

A full word-for-word cross-check of all sixteen stotram verses (Telugu script, Section 5, against P1's own Roman transliteration, pp.20–21) was carried out this session, and repeated independently in the PR #32 finalization pass (that pass read the source PDF's page images directly, at pp.8–9 and pp.20–21, rather than relying on a prior transcription). Twelve of sixteen verses match exactly. Four verses show a small discrepancy, in every case on the **transliteration (Roman) page only** — the Telugu-script page is unaffected and is treated as authoritative at all four points, consistent with P1's own structure (the Telugu pages are P1's primary script, pp.2–12; the Roman pages are P1's own secondary romanisation, pp.14–24):

1. **Verse 4:** Telugu reads "అశోకా, అమృతాం దీప్తాం" ("aSOkaa, amRtaaM deeptaaM" — "sorrowless, nectar-like, radiant"), cleanly spaced. The transliteration page prints "aSOkaa,mamRtaaM deeptaaM" — a run-on with no space and an extra "m", which does not parse as a meaningful word. Read as the Telugu gives it.
2. **Verse 10:** Telugu reads "వరారోహాం" ("varaarOhaaM" — "of excellent form," a standard epithet), but the transliteration page prints only "arOhaaM" — missing the "vara-" syllable. Read as the Telugu gives it (with the "vara-" prefix).
3. **Verse 11:** Telugu reads "స్త్రైణసౌమ్యాం" ("straiNasaumyaaM"), but the transliteration page prints "sraiNasaumyaaM" — missing the first "t" of the "str" consonant cluster, a minor simplification found occasionally elsewhere in P1's own transliteration scheme. Read as the Telugu gives it.
4. **Verse 15 (found in the PR #32 finalization pass):** Telugu (p.9) reads "శ్రీమన్నంద కటాక్ష..." — "Sreeman" + "nanda" (న్న, a geminated "n"), i.e. "SreemannaMda kaTaaksha...". The transliteration page (p.21) prints "SreemanmaMda kaTaaksha..." — "Sreeman" + "manda" ("of gentle glance"), a different word. Both readings are independently confirmed, direct, unambiguous prints (not an OCR or extraction artifact on either side — verified against the PDF's own page-image text in this pass). Read as the Telugu gives it ("SreemannaMda"), for the same reason as points 1–3.

**Decision:** None of these four points is treated as an "audio-unsafe" line in the same sense as DLP-11 or DLP-24 — no deity is named incorrectly and no word becomes meaningless in the Telugu-script version actually used for app display and audio; the discrepancy exists only in the secondary Roman transliteration page, which this document already does not use as the source of the Telugu-script recitation (Section 0). No Sanskrit is invented: in all four cases, the "corrected" reading is simply what P1's own Telugu page already and unambiguously prints. These four points, plus DLP-11 and DLP-24, are the **complete list** of every Telugu/transliteration discrepancy found anywhere in the 31-step sequence across both sessions — no other step showed any inconsistency between its Telugu-script and transliteration lines. The full corrected Roman transliteration (all four points applied) is now reproduced in Section 5, DLP-21, and in the app content (`lib/pujas/diwali-lakshmi/steps.ts`), rather than only cross-referenced against an external appendix as in v0.2/v0.3 of this document.

---

## 7. Sankalpam integration boundary

This section reports what was actually found in the current codebase this session, not what the v0.1 draft assumed.

### 7.1 What exists today

- `lib/content/participants.ts` defines a **puja-agnostic** `ParticipantMode` type (`"SELF" | "FAMILY" | "GROUP"`), the `LineageField`/`LineageStatus` (`KNOWN | UNKNOWN | UNSURE`) model, and `activeParticipants()` / `participantsReadyForPuja()`. This layer is shared infrastructure and needs no change for a Diwali puja — it already enforces that a lineage value is never inferred, and that missing lineage never blocks progress.
- `lib/pujas/vinayaka/sankalpam.ts` and `lib/pujas/vinayaka/sankalpam-assembly.ts` are **Vinayaka-specific**: the Telugu/transliteration text, the list of supported slots, and the list of unsupported slots are all hard-coded to Vinayaka's own short-form Sankalpam (P1's filename constants even reference "Vinayaka Chaviti Puja" PDFs). There is **no equivalent Diwali/Lakshmi-specific Sankalpam module anywhere in the codebase** — a search of `lib/pujas` finds only a `vinayaka/` subdirectory, and a repository-wide search for "diwali" or "lakshmi" under `lib/` and `app/` finds matches only in the Panchanga calendar/festival-rules code (date calculations), not in any puja-content module.
- The existing Vinayaka pattern is a reasonable template: a `SANKALPAM_TRANSLITERATION`/`SANKALPAM_TELUGU_...` constant pair, `SANKALPAM_SUPPORTED_SLOTS`, `SANKALPAM_UNSUPPORTED_SLOTS` (each with an explicit note, never silently omitted), `SANKALPAM_REVIEWER_QUESTIONS`, and an assembly function that fills only the supported slots (performer naming, family-scope framing) while leaving every unsupported slot (Gotra, Veda, Sutra, Sampradaya, dated calendar, city/state) explicitly recorded as an open question — never guessed.

### 7.2 What a Diwali-specific module would need (not built in this task — documentation only)

Comparing P1's actual Sankalpam text (DLP-05, confirmed from the page image) against the Vinayaka pattern:

| Field | P1's Diwali Sankalpam | Same as Vinayaka's pattern? |
| --- | --- | --- |
| Performers | "asmaakaM" (for us) | Yes — same wording pattern |
| Family framing | "asmaakaM saha kuTuMbaanaaM" (with our families) | Yes — same phrase, present in both |
| Deity / purpose | "Sree mahaalakshmee daevataa preetyardhaM" | Different text — Lakshmi-specific, would need its own constant, not reused from Vinayaka's Ganesha-specific wording |
| Gotra / Veda / Sutra / Sampradaya | Not present | Yes — same gap. Must stay `SANKALPAM_UNSUPPORTED_SLOTS`, never invented. |
| Dated calendar (samvatsara/masa/paksha/tithi/vaara/nakshatra) | Not present — P1's Diwali Sankalpam does not even include the generic "Subhae SObhanae muhoortae" phrase Vinayaka's does | Partially different — the gap is the same in kind (no dated slot) but P1's wording is shorter still than Vinayaka's. Must be recorded as its own open question, not copied from Vinayaka's. |
| Place | "asmin daeSae" (in this country), no city/state | Yes — same gap |

**Conclusion:** The app's existing SELF/FAMILY/GROUP modes and the never-infer-lineage safeguard (`lib/content/participants.ts`) apply to a Diwali puja with no changes needed — they are puja-agnostic. But the Sankalpam **text and slot definitions** are not reusable from Vinayaka's module; a new, separate `lib/pujas/<diwali-module>/sankalpam.ts`-equivalent would need to be written from P1's own text, following the same pattern (explicit supported/unsupported slots, locked, `REVIEW_REQUIRED`), not by modifying `lib/pujas/vinayaka/*`. No code was changed in this task, consistent with the instruction that this is documentation only.

### 7.3 Open questions for a future implementation task (not resolved here)

- Should an unrelated GROUP (friends/students) use the collective "asmaakaM" wording as Vinayaka's pattern does, or state the Sankalpam individually? P1 does not address group composition any more than Vinayaka's source does.
- Should the extra purposes already in P1's text (Vedic-tradition support, cow protection) be retained verbatim for every user, offered as an optional subset, or something else? This document does not decide that; see Section 6.5.
- Should a dated-calendar clause be added at all, given P1 itself has none? That is a product decision, not a sourcing question — this document takes no position beyond recording that P1 does not require one.

---

## 8. Audio and reading status

- No audio has been generated, replaced, or evaluated as part of this task. This document is text-only.
- Every recitation line in Section 5 is `REVIEW_REQUIRED` and locked, consistent with `lib/content/review-status.ts`. None is `VERIFIED` or `PRIEST_REVIEWED_PRACTICE`.
- **What `REVIEW_REQUIRED` means here, precisely, and what it does not mean:** it means no qualified human reviewer (a Telugu-script proofreader or a priest) has yet signed off on this text, so nothing here may be presented as verified or priest-approved guidance. **It does not mean implementation, beta display, or audio generation is blocked**, and this document does not introduce any new priest-approval gate beyond the project's existing one. Per `.claude/rules/sacred-content.md`, `canDisplayAsGuidance()` (approved guidance) and `canDisplayAsBetaCandidate()` (sourced-but-unreviewed beta display) are separate gates; this content is eligible for the second, not the first. A priest-review request remains a separate, not-yet-started step (Section 2, P1 entry) that is independent of whether this document's own editorial work is finished.
- Per the project's sourced-beta-candidate policy, this content is a plausible future `SOURCED_BETA_CANDIDATE` — it is sourced, has an identified source (P1) and exact page locators, and is not `WITHHELD_FOR_RIGHTS` or `MISSING_SOURCE` — but **this document does not itself grant beta-candidate status**; that requires the actual code-level `includedInBeta` / `sourceId` / `sourcePage` / `contentVersion` wiring described in `lib/content/beta-visibility.ts`, which is out of scope for this documentation-only task.
- **Resolved this session — no longer blocking:**
  1. **DLP-11 (Asana)** — "natna khachita" is no longer the selected recitation; "ratna khachita" is selected with a full citation (Section 6.6). P1's literal printing is preserved as historical source text only.
  2. **DLP-24 (Naivedyam)** — the Durga-addressed descriptive verse is no longer part of the selected recitation; P1's own adjacent Lakshmi-addressed operative line is selected instead (Section 6.2). P1's full verse is preserved as historical source text only.
  3. **Ashtottara Stotram verses 4, 10, 11, and 15 (DLP-21)** — a transliteration-page-only discrepancy at each; the Telugu-script reading (already the one used for app display) is confirmed correct and is the selected text (Section 6.7; verse 15 added in the PR #32 finalization pass).
- **Specific residual uncertainty — not a blanket caution:** the Telugu-script transcription in Section 5 is this session's own direct read of P1's rendered page images (Section 0), cross-checked word-for-word against P1's own transliteration in full. That cross-check found no inconsistency anywhere in the 31-step sequence **except** the four points above, all now resolved with cited decisions. There is no remaining known textual problem in Section 5. What remains open is independent of this document's text and is recorded precisely in Section 9.4: a second human (ideally a Telugu-reading reviewer, optionally using the OCR-scaffold cross-check `telugu-recovery.ts` already uses for Vinayaka) has not yet independently re-confirmed this session's page-image transcription, and no priest review has been requested. Neither of those is a textual problem found in this document — they are the standard, not-yet-completed human-review step that applies to any first-pass transcription before it is marked `VERIFIED`, and neither blocks implementation or beta display (see above).

---

## 9. Sources, rights, and honest gaps

### 9.1 Reuse basis

- P1 was supplied by the project owner for review. That permits this research and documentation; it is **not** evidence of a licence to redistribute the booklet's text, artwork, arrangement, or Romanisation inside the app or the public repository. The PDF itself remains outside git tracking, consistent with existing project practice for the Vinayaka source PDFs.
- Use Nanduri Srinivas / Nanduri Srivani attribution for any reference to P1, V1, or V2; link to the videos rather than claiming their content. Do not state or imply endorsement, collaboration, or priest verification by naming them.
- X1 (sanskritdocuments.org) carries an explicit non-commercial, non-redistribution reuse notice (confirmed by fetching the page this session — see Section 2). Its text is not reproduced anywhere in this document or recommended for reproduction in the app; it is corroboration only.
- P2's reuse status was not assessed this session (the file could not be reopened — see Section 2); it is not used as a source for any recitation text here regardless.
- The traditional origin of a mantra does not, by itself, establish reuse rights in any particular printed or recorded edition. If P1's own reuse basis remains unresolved by the time of implementation, the fallback is an independently prepared, appropriately sourced traditional-text transcription with original explanations — not an assumption that a free download implies redistribution rights.

### 9.2 Video access — exactly what was attempted and what came back

This session independently re-attempted access to V1 and V2, rather than assuming the v0.1 draft's findings still held. Methods tried: `WebFetch` on the watch URL; the public `oEmbed` JSON endpoint; a raw `curl` fetch of the watch page with a browser user agent, searched for `captionTracks`; a check for `yt-dlp`/`youtube-dl` via `pip show`, `python3 -m yt_dlp --version`, and `which`.

**Result for both videos: no transcript, no captions, and no visual/spoken content was retrieved.** The only data obtained was each video's title and channel name via `oEmbed` — metadata, not a transcript, and it is not cited anywhere in this document as if the video had been watched. No `yt-dlp` or equivalent tool is installed in this environment, so no audio/video download or caption extraction was possible. No timestamp, gesture, pause, or spoken teaching point from either video appears anywhere in this document.

### 9.3 Worked example: why `pdftotext` extraction was not used

This session confirmed the draft's warning directly. Running `pdftotext -layout` on P1 pages 8–9 (the Ashtottara Stotram) returns visibly corrupted Telugu, for example the heading renders as "ల్క్ష్మీ అషోోతూ ర శత నామావళి" where the correct reading, confirmed from the rendered page image, is "లక్ష్మీ అష్టోత్తర శత నామావళి". Every Telugu-script line in Section 5 of this document was read from the rendered page image, never from this corrupted extraction.

### 9.4 Honest gaps — what could not be fully established

This list is deliberately specific, not a blanket caveat over the whole document — see Section 8 for why a general "needs proofreading" statement over all of Section 5 would overstate the actual residual uncertainty.

- **No independent second-source proofreading of the Telugu-script transcription in Section 5 by a second human or an OCR-scaffolded pass.** It was read directly from P1's own page images this session (Section 0), and this PR-finalization pass additionally cross-checked it word-for-word against P1's own transliteration for all 31 steps and all 16 stotram verses. That check found exactly three points of disagreement (Ashtottara verses 4, 10, 11 — Section 6.7), each resolved in favour of the already-selected Telugu reading, plus the two task-specified lines (DLP-11, DLP-24 — Sections 6.2, 6.6), both now resolved with a selected, cited recitation. No other line showed any inconsistency. A second human reader's pass remains good general practice before treating this as `VERIFIED`, but is not recorded here as a precondition for implementation or beta display (Section 8).
- **V1 and V2 remain genuinely unwatched.** No gesture, pacing, or spoken instruction from either video is reflected anywhere in this document.
- **P2's content was not independently re-verified this session.** Its description in Section 2 and Section 6.5 carries over the v0.1 draft's claims, clearly marked as not re-confirmed.
- **Sankalpam integration (Section 7) is a specification, not a delivered feature.** No code exists yet for a Diwali-specific Sankalpam, and none was written in this task.
- **No priest review has been requested.** Per project policy this does not block documentation, implementation, or a labelled beta candidate (Section 8), but it does mean nothing in this document may be shown as `VERIFIED` or `PRIEST_REVIEWED_PRACTICE`.
- **This document does not claim to be a complete review of either video**, and does not claim completeness in any area beyond what Sections 2, 6, 8, and this section specifically state was checked.

### 9.5 Version and change log

- **v0.1** (2026-10-21, prior task) — initial working draft; recorded the procedure map, discrepancy register, and Appendix A Roman transcription, built without direct access to P1's page images in that task's environment.
- **v0.2** (2026-10-21, prior task) — produced with direct access to all 24 P1 page images (see Section 0); reconciled per-step Telugu script against P1's own transliteration for every recitation line; resolved the four task-specified discrepancies with explicit cited decisions (Section 6); reported actual Sankalpam-integration findings from the current codebase (Section 7) rather than the draft's assumptions; re-attempted and re-confirmed video inaccessibility (Section 9.2) rather than carrying the prior finding forward unexamined. Left two lines (DLP-11, DLP-24) flagged as audio-unsafe without a selected recitation.
- **v0.3** (this document, 2026-10-21) — finalizes the two remaining implementation decisions: selected a cited, source-supported recitation for DLP-11 ("ratna khachita", Section 6.6) and DLP-24 (P1's own Lakshmi-addressed operative line, Section 6.2), each with P1's literal printed wording preserved separately as historical source text (Section 5). Performed a full word-for-word Telugu/transliteration cross-check of all 31 steps and all 16 stotram verses (not previously done to this precision), finding and resolving three further minor discrepancies in the Ashtottara Stotram (Section 6.7). Clarified that `REVIEW_REQUIRED` does not gate implementation or beta display, only the `VERIFIED`/`PRIEST_REVIEWED_PRACTICE` labels (Section 8). Replaced the prior blanket proofreading caveat with the specific, exhaustive list of what was actually found (Section 9.4).
- **v0.4** (this document, 2026-10-21, PR #32 follow-up) — reproduces DLP-21's full P1 Roman transliteration inline in Section 5 (previously only cross-referenced against the now-superseded v0.1 draft's Appendix A), re-verified this pass word-for-word directly against the source PDF's own page images at pp.8–9 and pp.20–21 (not against a prior transcription). That direct re-check found a fourth transliteration-page-only discrepancy, at verse 15 ("SreemannaMda" in Telugu vs. "SreemanmaMda" in the transliteration page), resolved the same way as the other three (Section 6.7). The corresponding app content (`lib/pujas/diwali-lakshmi/steps.ts`) now carries this same corrected transliteration, and its Telugu-script step title was corrected from "శతనామావళి" (namavali) to "శతనామ స్తోత్రం" (stotram), matching this document's own Section 6.1 decision and the step's English title, which already said "Stotram".
