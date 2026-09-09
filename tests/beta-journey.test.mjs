// The Family Beta journey built from the sourced candidate: Simple vs Complete
// paths, classification flags, materials derivation, and the rights-withheld
// Vrata Katha item.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const beta = await vite.ssrLoadModule("/lib/pujas/vinayaka/beta-journey.ts");
const {
  BETA_JOURNEY_STEPS, BETA_PREP_STEPS, SIMPLE_PATH_STEP_IDS,
  betaJourneyStepsForPath, betaJourneyMinutes, BETA_MATERIALS,
} = beta;
const { CANDIDATE_PUJA_STEPS } = await vite.ssrLoadModule("/lib/pujas/vinayaka/candidate.ts");
const { beginnerAction, actionsNeedingReview } =
  await vite.ssrLoadModule("/lib/pujas/vinayaka/beginner-actions.ts");

const SOURCED = BETA_JOURNEY_STEPS.filter((s) => s.candidateStepId && s.id !== "vrata-katha");

test("Complete path contains all 32 sourced candidate steps plus the 2 prep steps plus the withheld Katha", () => {
  const complete = betaJourneyStepsForPath("COMPLETE");
  const sourcedInComplete = complete.filter((s) => s.candidateStepId && s.id !== "vrata-katha");
  assert.equal(sourcedInComplete.length, 32, "all 32 sourced steps reachable in Complete");
  assert.equal(complete.length, 35, "2 prep + 32 sourced + 1 Katha");
  // Every candidate step id appears exactly once.
  const ids = complete.map((s) => s.id);
  for (const c of CANDIDATE_PUJA_STEPS) {
    assert.equal(ids.filter((i) => i === c.id).length, 1, `${c.id} reachable once in Complete`);
  }
});

test("Simple path is a documented, non-empty subset shorter than Complete", () => {
  const simple = betaJourneyStepsForPath("SIMPLE");
  assert.ok(simple.length >= 8, "Simple has a real number of steps");
  assert.ok(simple.length < betaJourneyStepsForPath("COMPLETE").length, "Simple is shorter");
  // Its content is the documented SIMPLE_PATH_STEP_IDS list plus the 2 prep steps.
  const simpleSourcedIds = simple.filter((s) => s.candidateStepId).map((s) => s.id).sort();
  assert.deepEqual(simpleSourcedIds, [...SIMPLE_PATH_STEP_IDS].sort());
  // Every Simple id is a real candidate step id.
  const realIds = new Set(CANDIDATE_PUJA_STEPS.map((c) => c.id));
  for (const id of SIMPLE_PATH_STEP_IDS) assert.ok(realIds.has(id), `${id} is a real candidate step`);
});

test("both paths report a step count and a positive duration estimate", () => {
  assert.ok(betaJourneyMinutes("SIMPLE") > 0);
  assert.ok(betaJourneyMinutes("COMPLETE") > betaJourneyMinutes("SIMPLE"));
});

test("every sourced step's classification is inferred (BETA_CLASSIFICATION) and one of the three buckets", () => {
  for (const s of SOURCED) {
    assert.equal(s.classificationInferred, true, `${s.id} classification must be flagged inferred`);
    assert.ok(["ESSENTIAL", "OPTIONAL", "TRADITION_SPECIFIC"].includes(s.betaClassification), s.id);
  }
});

test("every sourced step is SOURCED_BETA_CANDIDATE, REVIEW_REQUIRED, locked, with a page ref and content version", () => {
  for (const s of SOURCED) {
    assert.equal(s.betaStatus, "SOURCED_BETA_CANDIDATE", s.id);
    assert.equal(s.reviewStatus, "REVIEW_REQUIRED", s.id);
    assert.equal(s.locked, true, s.id);
    assert.equal(s.includedInBeta, true, s.id);
    assert.ok(s.sourceRefs.length >= 1 && s.sourceRefs[0].page >= 1, s.id);
    assert.ok(s.provenance.contentVersion, s.id);
  }
});

test("the Vrata Katha item is a SOURCED_BETA_CANDIDATE (original retelling), still locked, Complete-only, no mantra", () => {
  const katha = BETA_JOURNEY_STEPS.find((s) => s.id === "vrata-katha");
  assert.ok(katha);
  assert.equal(katha.betaStatus, "SOURCED_BETA_CANDIDATE");
  assert.equal(katha.reviewStatus, "REVIEW_REQUIRED");
  assert.equal(katha.locked, true);
  // Prose, not a mantra.
  assert.equal(katha.mantraTeluguScript, null);
  assert.equal(katha.mantraTransliteration, "");
  // Provenance points at the original retelling, NOT the Nanduri booklet.
  assert.match(katha.provenance.source, /VedaSaarathi original retelling/i);
  assert.doesNotMatch(katha.provenance.source, /^Nanduri/i);
  assert.match(katha.provenance.sourceReference, /Not copied from Nanduri/i);
  // Still Complete-only.
  assert.ok(!betaJourneyStepsForPath("SIMPLE").some((s) => s.id === "vrata-katha"));
});

test("the 2 prep steps are practical GENERAL_GUIDANCE, unlocked, and in both paths", () => {
  assert.equal(BETA_PREP_STEPS.length, 2);
  for (const p of BETA_PREP_STEPS) {
    assert.equal(p.reviewStatus, "GENERAL_GUIDANCE");
    assert.equal(p.locked, false);
    assert.equal(p.importance, "CORE");
    assert.equal(p.candidateStepId, null);
  }
});

test("every sourced step has a beginner action; a MINIMAL_LITERAL one is flagged needsReview", () => {
  for (const s of SOURCED) {
    const a = beginnerAction(s.id);
    assert.ok(a && a.action.length > 10, `${s.id} has a beginner action`);
    assert.notEqual(a.action, "Needs reviewer confirmation.", `${s.id} no longer says "Needs reviewer confirmation."`);
    if (a.basis === "MINIMAL_LITERAL" && a.sources.length === 0) {
      assert.equal(a.needsReview, true, `${s.id} unsourced minimal action must be flagged`);
    }
  }
  // A small, bounded set still needs reviewer confirmation of the action.
  const needing = actionsNeedingReview();
  assert.ok(needing.length >= 1 && needing.length <= 10, `bounded review set, got ${needing.length}`);
});

test("BETA_MATERIALS is derived from the candidate steps and offers no automatic substitution", () => {
  assert.ok(BETA_MATERIALS.length >= 8);
  const realIds = new Set(CANDIDATE_PUJA_STEPS.map((c) => c.id));
  for (const m of BETA_MATERIALS) {
    assert.ok(["REQUIRED", "OPTIONAL", "TRADITION_SPECIFIC"].includes(m.category), m.id);
    assert.equal(m.approvedAlternative, null, `${m.id} must not offer an automatic substitute`);
    for (const stepId of m.namedInSteps) {
      assert.ok(realIds.has(stepId), `${m.id} namedInSteps has a real step id`);
    }
  }
  // At least the core substances trace to a step's mantra.
  const water = BETA_MATERIALS.find((m) => m.id === "water");
  assert.ok(water.namedInSteps.length >= 3, "water is named in several steps' mantras");
});
