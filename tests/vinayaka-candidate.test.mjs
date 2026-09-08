// Unit and gate tests for the source-grounded Vinayaka Chavithi puja
// candidate (lib/pujas/vinayaka/candidate*, patri, sankalpam, sources,
// mantra-audio). These assert the data is faithful to the two supplied PDFs
// and that nothing has been invented.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const {
  CANDIDATE_PUJA_STEPS, CANDIDATE_STEP_COUNT, CANDIDATE_CONTENT_VERSION,
  candidateStep, candidateStepsInOrder,
} = await vite.ssrLoadModule("/lib/pujas/vinayaka/candidate.ts");
const {
  CANDIDATE_PATRI, CANDIDATE_PATRI_COUNT, CANDIDATE_PATRI_CLOSING_LINE,
} = await vite.ssrLoadModule("/lib/pujas/vinayaka/patri.ts");
const sankalpam = await vite.ssrLoadModule("/lib/pujas/vinayaka/sankalpam.ts");
const {
  PUJA_SOURCE_FILES, PROPOSED_REVIEWER, COPYRIGHT_FLAGS,
} = await vite.ssrLoadModule("/lib/pujas/vinayaka/sources.ts");
const {
  DEFAULT_MANTRA_AUDIO_STATUS, BROWSER_TTS_MAY_CHANT_MANTRAS, newMantraAudio,
} = await vite.ssrLoadModule("/lib/pujas/vinayaka/mantra-audio.ts");
const { VINAYAKA_CANDIDATE, allReviewerQuestions } =
  await vite.ssrLoadModule("/lib/pujas/vinayaka/candidate-dataset.ts");
const { canDisplayAsGuidance } = await vite.ssrLoadModule("/lib/content/provenance.ts");

/* -------------------------------------------------------------------------- */
/* Sources                                                                    */
/* -------------------------------------------------------------------------- */

test("both Lyrics PDFs are recorded as AVAILABLE with their real page counts; the Vrata Kalpamu is NOT_SUPPLIED", () => {
  const byId = Object.fromEntries(PUJA_SOURCE_FILES.map((f) => [f.id, f]));
  assert.equal(byId["english-lyrics"].availability, "AVAILABLE");
  assert.equal(byId["english-lyrics"].pageCount, 17);
  assert.equal(byId["telugu-lyrics"].availability, "AVAILABLE");
  assert.equal(byId["telugu-lyrics"].pageCount, 15);
  assert.equal(byId["vrata-kalpamu"].availability, "NOT_SUPPLIED");
  assert.equal(byId["vrata-kalpamu"].pageCount, null);
});

test("the proposed reviewer is recorded as PROPOSED_REVIEWER only, with no phone number and no approval claim", () => {
  assert.equal(PROPOSED_REVIEWER.status, "PROPOSED_REVIEWER");
  assert.match(PROPOSED_REVIEWER.approvalNote, /has NOT reviewed or approved/i);
  const blob = JSON.stringify(PROPOSED_REVIEWER);
  assert.doesNotMatch(blob, /\+?\d[\d\s().-]{7,}\d/, "no phone-number-like string is present");
});

test("copyright / content-reuse flags are recorded, including the Vrata Katha", () => {
  assert.ok(COPYRIGHT_FLAGS.length >= 3);
  assert.ok(COPYRIGHT_FLAGS.some((f) => /Nanduri/i.test(f)));
  assert.ok(COPYRIGHT_FLAGS.some((f) => /Vrata Katha/i.test(f) && /not copied|not reproduced/i.test(f)));
});

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

test("the candidate has a complete, gap-free ordered sequence", () => {
  const ordered = candidateStepsInOrder();
  assert.equal(ordered.length, CANDIDATE_STEP_COUNT);
  assert.ok(CANDIDATE_STEP_COUNT >= 30, `expected the full sequence, got ${CANDIDATE_STEP_COUNT}`);
  ordered.forEach((s, i) => assert.equal(s.sequence, i + 1, `sequence gap at index ${i}`));
  const ids = new Set(ordered.map((s) => s.id));
  assert.equal(ids.size, ordered.length, "step ids are unique");
});

test("every step is REVIEW_REQUIRED, locked, carries the content version, and has at least one page-referenced source", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    assert.equal(s.reviewStatus, "REVIEW_REQUIRED", s.id);
    assert.equal(s.locked, true, s.id);
    assert.equal(s.contentVersion, CANDIDATE_CONTENT_VERSION, s.id);
    assert.ok(s.sourceRefs.length >= 1, `${s.id} has no source ref`);
    for (const ref of s.sourceRefs) {
      assert.ok(["english-lyrics", "telugu-lyrics"].includes(ref.sourceId), s.id);
      assert.ok(Number.isInteger(ref.page) && ref.page >= 1, s.id);
    }
  }
});

test("the Telugu-script mantra is never stored - always a page-referenced transcription task instead", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    assert.equal(s.mantraTeluguScript, null, `${s.id} must not store a guessed Telugu string`);
    assert.ok(s.teluguScriptTranscriptionTask.length > 0, s.id);
  }
});

test("a step only carries a transliteration when the English PDF supports one", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    if (s.transliterationSupported) {
      assert.ok(s.mantraTransliteration.trim().length > 0, `${s.id} claims transliteration but has none`);
    } else {
      assert.equal(s.mantraTransliteration, "", `${s.id} must not store text it cannot faithfully copy`);
      assert.ok(s.reviewerQuestions.length >= 1, `${s.id} needs a transcription question`);
    }
  }
});

test("stored transliteration matches the English PDF verbatim for a spot-check of steps", () => {
  assert.match(
    candidateStep("dhyana-shloka").mantraTransliteration,
    /^ShuklaAmbara Dharam Vishnum Shashi Varnam Chatur Bhujam\nPrasanna Vadanam Dhyaayet Sarva Vighnopashaantaye$/,
  );
  assert.match(candidateStep("padya").mantraTransliteration, /paadyaM samarpayaami$/);
  assert.match(candidateStep("sankalpa").mantraTransliteration, /shODaSOpachaara poojaaM karishyae!$/);
  assert.match(candidateStep("mangala-shanti").mantraTransliteration, /jeevaMtu SaradaaM SataM$/);
});

test('physical action is "Needs reviewer confirmation." wherever the source does not state it', () => {
  const mustBeUnclear = ["dhyana-shloka", "avahana", "asana", "arghya", "tambula"];
  for (const id of mustBeUnclear) {
    assert.match(candidateStep(id).howToDo, /Needs reviewer confirmation\./, id);
  }
  // ...and where the source DOES state it, that text is present.
  assert.match(candidateStep("ghanta").howToDo, /while making the bell sound/i);
  assert.match(candidateStep("kalasha-aradhana").howToDo, /sprinkle this water/i);
  assert.match(candidateStep("udvasana").howToDo, /day of Nimajjan/i);
});

test("materials are only ever substances the mantra text itself names; steps whose mantra names none carry []", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    if (!s.materialsFromSource) {
      assert.deepEqual(s.materialsNamedInMantra, [], `${s.id} claims no source materials but lists some`);
    }
  }
  assert.deepEqual(candidateStep("madhuparka").materialsNamedInMantra.slice(0, 2), ["curd (dadhi)", "milk (kshira)"]);
  assert.deepEqual(candidateStep("dhyana-shloka").materialsNamedInMantra, []);
});

test("every step's classification is flagged as inferred, not taken from the source", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    assert.equal(s.classificationConfidence, "INFERRED_NEEDS_REVIEW", s.id);
    assert.ok(["ESSENTIAL", "OPTIONAL", "TRADITION_SPECIFIC"].includes(s.classification), s.id);
  }
});

test("Telugu vs English differences are recorded, not silently resolved", () => {
  const withDisagreements = CANDIDATE_PUJA_STEPS.filter((s) => s.disagreements.length > 0);
  assert.ok(withDisagreements.length >= 2);
  for (const s of withDisagreements) {
    for (const d of s.disagreements) {
      assert.ok(d.telugu && d.english && d.note, `${s.id} disagreement is incomplete`);
    }
  }
});

test("the Vrata Katha step exists but its text is withheld pending a licence", () => {
  const katha = candidateStep("vrata-katha");
  assert.ok(katha);
  assert.equal(katha.mantraTransliteration, "");
  assert.match(katha.title, /text withheld/i);
  assert.ok(katha.reviewerQuestions.some((q) => /licen[cs]e|independently sourced/i.test(q.question)));
});

/* -------------------------------------------------------------------------- */
/* Patri                                                                      */
/* -------------------------------------------------------------------------- */

test("the patri list has exactly 21 leaves, in source order, with no invented botanical identity", () => {
  assert.equal(CANDIDATE_PATRI_COUNT, 21);
  CANDIDATE_PATRI.forEach((leaf, i) => {
    assert.equal(leaf.index, i + 1);
    assert.ok(leaf.deityNameTransliteration.length > 0 && leaf.leafNameTransliteration.length > 0);
    assert.equal(leaf.botanicalIdentification, null, `leaf ${leaf.index} must not name a plant`);
  });
  assert.equal(CANDIDATE_PATRI[0].leafNameTransliteration, "maacheepatraM");
  assert.equal(CANDIDATE_PATRI[20].leafNameTransliteration, "arkapatraM");
  assert.match(CANDIDATE_PATRI_CLOSING_LINE, /aekaviMSatipatraaNi poojayaami/);
});

test("no flowers/akshata substitution is implemented as an automatic rule", () => {
  const blob = JSON.stringify(VINAYAKA_CANDIDATE.patri);
  assert.match(blob, /NOT implemented as an automatic substitution/i);
});

/* -------------------------------------------------------------------------- */
/* Sankalpam                                                                  */
/* -------------------------------------------------------------------------- */

test("the Sankalpam is the short form: no Gotra/Veda/Sutra/Sampradaya slot, and no unknown-Gotra fallback", () => {
  const supportedIds = sankalpam.SANKALPAM_SUPPORTED_SLOTS.map((s) => s.id);
  assert.ok(!supportedIds.includes("gotra"));
  assert.deepEqual(supportedIds.sort(), ["family-scope", "performers"]);

  const unsupportedIds = sankalpam.SANKALPAM_UNSUPPORTED_SLOTS.map((s) => s.id);
  for (const id of ["gotra", "veda", "sutra", "sampradaya", "date-calendar", "place"]) {
    assert.ok(unsupportedIds.includes(id), `${id} must be recorded as unsupported`);
  }
  const gotra = sankalpam.SANKALPAM_UNSUPPORTED_SLOTS.find((s) => s.id === "gotra");
  assert.match(gotra.note, /No unknown-Gotra fallback is created/i);
});

test("the Sankalpam transliteration is verbatim from the English PDF and REVIEW_REQUIRED + locked", () => {
  assert.match(sankalpam.SANKALPAM_TRANSLITERATION, /^mama upaatta samasta duritakshaya dvaaraa/);
  assert.match(sankalpam.SANKALPAM_TRANSLITERATION, /shODaSOpachaara poojaaM karishyae!$/);
  assert.equal(sankalpam.SANKALPAM_REVIEW_STATUS, "REVIEW_REQUIRED");
  assert.equal(sankalpam.SANKALPAM_LOCKED, true);
});

/* -------------------------------------------------------------------------- */
/* Mantra audio                                                               */
/* -------------------------------------------------------------------------- */

test("every mantra starts at NOT_CREATED and browser TTS may never chant a mantra", () => {
  assert.equal(DEFAULT_MANTRA_AUDIO_STATUS, "NOT_CREATED");
  assert.equal(BROWSER_TTS_MAY_CHANT_MANTRAS, false);
  assert.equal(newMantraAudio().status, "NOT_CREATED");
  for (const s of CANDIDATE_PUJA_STEPS) {
    assert.equal(s.audio.status, "NOT_CREATED", s.id);
    assert.equal(s.audio.reviewedBy, null, s.id);
  }
});

/* -------------------------------------------------------------------------- */
/* The gate: none of this is displayable as guidance                          */
/* -------------------------------------------------------------------------- */

test("canDisplayAsGuidance is false for every candidate step's status", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    // A minimal draft provenance - the point is the status alone blocks it.
    const provenance = {
      source: null, sourceReference: null, reviewer: null, reviewerQualification: null,
      reviewDate: null, contentVersion: s.contentVersion, traditionScope: "candidate",
      writtenSourceStatus: "PENDING", practiceEvidence: null,
    };
    assert.equal(canDisplayAsGuidance(s.reviewStatus, provenance), false, s.id);
  }
});

test("allReviewerQuestions gathers open questions from steps, Sankalpam and patri", () => {
  const qs = allReviewerQuestions();
  assert.ok(qs.length >= 6);
  assert.ok(qs.some((q) => q.source === "Sankalpam"));
  assert.ok(qs.some((q) => q.source === "Patri"));
  assert.ok(qs.some((q) => /Step \d/.test(q.source)));
});
