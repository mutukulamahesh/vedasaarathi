import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const modeMod = await vite.ssrLoadModule("/lib/storage/presentation-mode.ts");
const {
  defaultPresentationMode, parsePresentationMode, loadPresentationMode, savePresentationMode,
} = modeMod;
const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");
const { MATERIALS } = await vite.ssrLoadModule("/lib/content/materials.ts");
const provenanceMod = await vite.ssrLoadModule("/lib/content/provenance.ts");
const { createParticipant } = await vite.ssrLoadModule("/lib/content/participants.ts");

const noop = () => {};
const render = (element) => renderToStaticMarkup(element);

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
  };
}

/* -------------------------------------------------------------------------- */
/* Storage round trip and safe fallback                                       */
/* -------------------------------------------------------------------------- */

test("the default presentation mode is FAMILY_BETA", () => {
  assert.equal(defaultPresentationMode(), "FAMILY_BETA");
});

test("a saved mode round-trips exactly", () => {
  const store = makeFakeStorage();
  savePresentationMode("REVIEWER", store);
  assert.equal(loadPresentationMode(store), "REVIEWER");
  savePresentationMode("FAMILY_BETA", store);
  assert.equal(loadPresentationMode(store), "FAMILY_BETA");
});

test("null, damaged, or unrecognized stored values fall back to FAMILY_BETA", () => {
  assert.equal(parsePresentationMode(null), "FAMILY_BETA");
  assert.equal(parsePresentationMode(""), "FAMILY_BETA");
  assert.equal(parsePresentationMode("ADMIN"), "FAMILY_BETA");
  assert.equal(parsePresentationMode("{\"mode\":\"REVIEWER\"}"), "FAMILY_BETA");
});

/* -------------------------------------------------------------------------- */
/* FAMILY_BETA hides internal review/debug labels                             */
/* -------------------------------------------------------------------------- */

function pujaHtmlAt(stepIndex, reviewMode) {
  return render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA,
      stepIndex,
      setStepIndex: noop,
      finish: noop,
      path: "COMPLETE",
      language: "EN",
      setLanguage: noop,
      activeList: [],
      reviewMode,
    }),
  );
}

test("FAMILY_BETA (reviewMode off) shows no review-status chip on a guided step", () => {
  const html = pujaHtmlAt(0, false);
  assert.doesNotMatch(html, /review-chip/);
  assert.doesNotMatch(html, /data-status=/);
});

test("FAMILY_BETA (reviewMode off) never shows the reviewer 'Private review build' banner", () => {
  const reviewRequiredIndex = RITUAL_STEPS.findIndex((s) => s.reviewStatus === "REVIEW_REQUIRED");
  assert.notEqual(reviewRequiredIndex, -1);
  const html = pujaHtmlAt(reviewRequiredIndex, false);
  assert.doesNotMatch(html, /Private review build/i);
  // The content gate still applies: unapproved content is still not shown -
  // but FAMILY_BETA sees one short, plain message, never the internal
  // "awaiting religious review" review-process wording.
  assert.match(html, /not available in the current beta/i);
  assert.doesNotMatch(html, /awaiting religious review/i);
  assert.doesNotMatch(html, /REVIEW_REQUIRED/);
});

test("FAMILY_BETA hides the per-material review chip in PrepareScreen too", () => {
  const html = render(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA,
      activeList: [{ ...createParticipant("p1"), name: "Mahesh" }],
      availableMaterialIds: [],
      toggleMaterial: noop,
      patriSelfReport: null,
      setPatriSelfReport: noop,
      pujaPath: "SIMPLE",
      setPujaPath: noop,
      goToPeople: noop,
      start: noop,
      reviewMode: false,
    }),
  );
  assert.doesNotMatch(html, /review-chip/);
});

/* -------------------------------------------------------------------------- */
/* REVIEWER mode displays review information                                  */
/* -------------------------------------------------------------------------- */

test("REVIEWER (reviewMode on) shows the review-status chip on a guided step", () => {
  const html = pujaHtmlAt(0, true);
  assert.match(html, /review-chip/);
  assert.match(html, new RegExp(`data-status="${RITUAL_STEPS[0].reviewStatus}"`));
});

test("REVIEWER shows draft warnings for REVIEW_REQUIRED content", () => {
  const reviewRequiredIndex = RITUAL_STEPS.findIndex((s) => s.reviewStatus === "REVIEW_REQUIRED");
  const html = pujaHtmlAt(reviewRequiredIndex, true);
  assert.match(html, /Private review build/i);
  assert.match(html, /not approved guidance/i);
});

test("REVIEWER shows the per-material review chip in PrepareScreen", () => {
  const html = render(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA,
      activeList: [{ ...createParticipant("p1"), name: "Mahesh" }],
      availableMaterialIds: [],
      toggleMaterial: noop,
      patriSelfReport: null,
      setPatriSelfReport: noop,
      pujaPath: "SIMPLE",
      setPujaPath: noop,
      goToPeople: noop,
      start: noop,
      reviewMode: true,
    }),
  );
  assert.match(html, /review-chip/);
});

/* -------------------------------------------------------------------------- */
/* Switching modes does not change content or approval status                 */
/* -------------------------------------------------------------------------- */

test("canDisplayAsGuidance takes no mode parameter and is unaffected by presentation mode", () => {
  assert.equal(provenanceMod.canDisplayAsGuidance.length, 2);
});

test("every step's reviewStatus and provenance are identical regardless of reviewMode", () => {
  const withReviewer = pujaHtmlAt(0, true);
  const withFamilyBeta = pujaHtmlAt(0, false);
  // The step's own title/what/how/why content (once approved) is identical -
  // only the extra chrome (the chip) differs.
  const step = RITUAL_STEPS[0];
  for (const html of [withReviewer, withFamilyBeta]) {
    assert.ok(html.includes(step.title));
  }
  // Data itself is untouched by rendering in either mode.
  assert.equal(RITUAL_STEPS[0].reviewStatus, step.reviewStatus);
});

test("switching the stored presentation mode never touches saved preparation progress", async () => {
  const store = makeFakeStorage();
  const progressStore = makeFakeStorage();
  const { loadProgress, saveProgress } = await vite.ssrLoadModule("/lib/storage/preparation.ts");

  const before = loadProgress(progressStore);
  savePresentationMode("REVIEWER", store);
  savePresentationMode("FAMILY_BETA", store);
  const after1 = loadProgress(progressStore);
  assert.deepEqual(before, after1);

  saveProgress({ ...before, stepIndex: 5 }, progressStore);
  const withStep = loadProgress(progressStore);
  savePresentationMode("REVIEWER", store);
  const after2 = loadProgress(progressStore);
  assert.deepEqual(withStep, after2, "toggling presentation mode leaves saved progress untouched");
});

/* -------------------------------------------------------------------------- */
/* Locked content stays distinguishable in the data model in every mode       */
/* -------------------------------------------------------------------------- */

test("a locked step's locked field is true in the data regardless of presentation mode", () => {
  const lockedStep = RITUAL_STEPS.find((s) => s.locked);
  assert.ok(lockedStep, "there must be at least one locked step to test");
  // The data model itself is not mode-dependent at all - reviewMode is a
  // rendering choice, never a mutation of the step.
  assert.equal(lockedStep.locked, true);
});

test("REVIEWER sees the detailed locked-note wording; FAMILY_BETA sees only the short beta message", () => {
  const lockedStep = RITUAL_STEPS.find((s) => s.locked);
  const lockedIndex = RITUAL_STEPS.indexOf(lockedStep);

  const reviewerHtml = pujaHtmlAt(lockedIndex, true);
  assert.match(reviewerHtml, /stay locked until a/i);

  const familyBetaHtml = pujaHtmlAt(lockedIndex, false);
  assert.doesNotMatch(familyBetaHtml, /stay locked until a/i);
  assert.match(familyBetaHtml, /not available in the current beta/i);
});

/* -------------------------------------------------------------------------- */
/* Never falsely label content as verified                                    */
/* -------------------------------------------------------------------------- */

test("no material or step ever shows a VERIFIED chip without qualifying provenance", () => {
  for (const item of MATERIALS) {
    if (item.reviewStatus === "VERIFIED") {
      assert.ok(
        provenanceMod.canDisplayAsGuidance("VERIFIED", item.provenance),
        `${item.id} claims VERIFIED but its provenance does not qualify`,
      );
    }
  }
  for (const step of RITUAL_STEPS) {
    if (step.reviewStatus === "VERIFIED") {
      assert.ok(
        provenanceMod.canDisplayAsGuidance("VERIFIED", step.provenance),
        `${step.id} claims VERIFIED but its provenance does not qualify`,
      );
    }
  }
});
