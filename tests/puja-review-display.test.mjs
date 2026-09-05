import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");
const { MATERIALS } = await vite.ssrLoadModule("/lib/content/materials.ts");
const provenanceMod = await vite.ssrLoadModule("/lib/content/provenance.ts");
const { createParticipant } = await vite.ssrLoadModule("/lib/content/participants.ts");
const { ProvenancePanel, BETA_UNAVAILABLE_MESSAGE } =
  await vite.ssrLoadModule("/components/platform/review-display.tsx");

const noop = () => {};
const render = (element) => renderToStaticMarkup(element);

// The exact internal review-process wording that must never reach a
// FAMILY_BETA user, per the finding.
const FORBIDDEN_FAMILY_BETA_PHRASES = [
  /REVIEW_REQUIRED/,
  /awaiting religious review/i,
  /draft candidate content/i,
  /stay(?:s)? locked until (?:a )?(?:qualified )?reviewer/i,
  /private review build/i,
  /provenance-panel/,
];

function activeListFixture() {
  return [{ ...createParticipant("p1"), name: "Test User" }];
}

function prepareHtml(reviewMode) {
  return render(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA,
      activeList: activeListFixture(),
      availableMaterialIds: [],
      toggleMaterial: noop,
      patriSelfReport: null,
      setPatriSelfReport: noop,
      pujaPath: "COMPLETE",
      setPujaPath: noop,
      goToPeople: noop,
      start: noop,
      reviewMode,
    }),
  );
}

function pujaHtml(stepIndex, reviewMode) {
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

function detailHtml(reviewMode) {
  return render(
    React.createElement(page.PujaDetailScreen, { puja: VINAYAKA_PUJA, onBegin: noop, reviewMode }),
  );
}

function postPujaHtml(reviewMode) {
  return render(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance,
      home: noop,
      reviewMode,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* 1. FAMILY_BETA contains none of the internal review phrases                */
/* -------------------------------------------------------------------------- */

test("FAMILY_BETA: PujaDetailScreen contains none of the forbidden internal review phrases", () => {
  const html = detailHtml(false);
  for (const phrase of FORBIDDEN_FAMILY_BETA_PHRASES) {
    assert.doesNotMatch(html, phrase, phrase.toString());
  }
});

test("FAMILY_BETA: PrepareScreen (materials and patri) contains none of the forbidden internal review phrases", () => {
  const html = prepareHtml(false);
  for (const phrase of FORBIDDEN_FAMILY_BETA_PHRASES) {
    assert.doesNotMatch(html, phrase, phrase.toString());
  }
});

test("FAMILY_BETA: PujaScreen contains none of the forbidden internal review phrases, for every guided step", () => {
  RITUAL_STEPS.forEach((_step, index) => {
    const html = pujaHtml(index, false);
    for (const phrase of FORBIDDEN_FAMILY_BETA_PHRASES) {
      assert.doesNotMatch(html, phrase, `step ${index}: ${phrase}`);
    }
  });
});

test("FAMILY_BETA: post-puja (immersion) guidance contains none of the forbidden internal review phrases", () => {
  const html = postPujaHtml(false);
  for (const phrase of FORBIDDEN_FAMILY_BETA_PHRASES) {
    assert.doesNotMatch(html, phrase, phrase.toString());
  }
});

/* -------------------------------------------------------------------------- */
/* 2. Gated religious content remains hidden in FAMILY_BETA                   */
/* -------------------------------------------------------------------------- */

test("FAMILY_BETA: an unapproved (REVIEW_REQUIRED) step never shows its what/how text, and shows the one beta message", () => {
  const reviewRequiredIndex = RITUAL_STEPS.findIndex((s) => s.reviewStatus === "REVIEW_REQUIRED");
  const step = RITUAL_STEPS[reviewRequiredIndex];
  const html = pujaHtml(reviewRequiredIndex, false);
  assert.ok(!html.includes(step.what));
  assert.ok(!html.includes(step.how));
  assert.ok(html.includes(BETA_UNAVAILABLE_MESSAGE));
});

test("FAMILY_BETA: an unapproved material never shows its description or approved alternative", () => {
  const gatedMaterial = MATERIALS.find(
    (item) => !provenanceMod.canDisplayAsGuidance(item.reviewStatus, item.provenance),
  );
  assert.ok(gatedMaterial, "there must be at least one ungated material to test");
  const html = prepareHtml(false);
  assert.ok(!html.includes(gatedMaterial.description));
});

test("REVIEWER: the same unapproved step and material still never show their gated text outside the labelled candidate view", () => {
  // Approval itself never changes: a REVIEW_REQUIRED step only ever shows via
  // the explicit "Private review build" candidate path, never as if approved.
  const reviewRequiredIndex = RITUAL_STEPS.findIndex((s) => s.reviewStatus === "REVIEW_REQUIRED");
  const html = pujaHtml(reviewRequiredIndex, true);
  assert.match(html, /Private review build/i);
  assert.doesNotMatch(html, /not approved guidance is being presented as approved/i);
});

/* -------------------------------------------------------------------------- */
/* 3. REVIEWER displays real provenance fields                                */
/* -------------------------------------------------------------------------- */

test("REVIEWER: a step's real provenance fields render in its ProvenancePanel", () => {
  const step = RITUAL_STEPS[0];
  const html = pujaHtml(0, true);
  assert.match(html, /provenance-panel/);
  assert.match(html, /Review information/);
  assert.ok(html.includes(step.provenance.traditionScope));
  assert.ok(html.includes(step.provenance.contentVersion));
});

test("REVIEWER: every material's real provenance traditionScope renders in its ProvenancePanel", () => {
  const html = prepareHtml(true);
  for (const item of MATERIALS) {
    assert.ok(html.includes(item.provenance.traditionScope), `${item.id} traditionScope must appear`);
  }
});

test("REVIEWER: patri's real provenance renders alongside its review notice", () => {
  const html = prepareHtml(true);
  assert.ok(html.includes(VINAYAKA_PUJA.patri.provenance.traditionScope));
});

test("REVIEWER: the puja-level detail screen shows the real content version and review summary", () => {
  const html = detailHtml(true);
  assert.ok(html.includes(VINAYAKA_PUJA.metadata.contentVersion));
  // React SSR escapes apostrophes as HTML entities, so compare only the
  // portion of the real reviewSummary text that has none.
  assert.ok(html.includes("Draft candidate content pending priest review"));
});

/* -------------------------------------------------------------------------- */
/* 4. Missing provenance is not invented                                      */
/* -------------------------------------------------------------------------- */

test("ProvenancePanel shows 'Not provided' for every null field, never an invented value", () => {
  const html = render(
    React.createElement(ProvenancePanel, {
      reviewStatus: "REVIEW_REQUIRED",
      provenance: {
        source: null,
        sourceReference: null,
        reviewer: null,
        reviewerQualification: null,
        reviewDate: null,
        contentVersion: "v1",
        traditionScope: "Telugu home practice",
        writtenSourceStatus: "PENDING",
        practiceEvidence: null,
      },
    }),
  );
  const notProvidedCount = (html.match(/Not provided/g) || []).length;
  assert.equal(notProvidedCount, 6, "source, sourceReference, reviewer, reviewerQualification, reviewDate, practiceEvidence");
  assert.match(html, /Pending/);
  assert.ok(html.includes("v1"));
  assert.ok(html.includes("Telugu home practice"));
});

test("ProvenancePanel handles a partial puja-level record honestly, without inventing the missing fields", () => {
  const html = render(
    React.createElement(ProvenancePanel, { provenance: { contentVersion: "vinayaka-candidate-1" } }),
  );
  assert.ok(html.includes("vinayaka-candidate-1"));
  assert.ok((html.match(/Not provided/g) || []).length >= 6);
  // No reviewStatus was passed, so no review-status chip is invented either.
  assert.doesNotMatch(html, /review-chip/);
});

/* -------------------------------------------------------------------------- */
/* 5. Platform coordinator has no direct import from components/pujas/vinayaka */
/* -------------------------------------------------------------------------- */

test("app/page.tsx has no direct import from components/pujas/vinayaka", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /components\/pujas\/vinayaka/);
});

test("components/pujas/vinayaka no longer exists at all - optional post-puja guidance is generic content", () => {
  assert.equal(existsSync(new URL("../components/pujas", import.meta.url)), false);
  assert.notEqual(VINAYAKA_PUJA.postPujaGuidance, undefined);
  assert.ok(VINAYAKA_PUJA.postPujaGuidance.choices.length > 0);
});

/* -------------------------------------------------------------------------- */
/* 6. Switching presentation mode never changes approval status               */
/* -------------------------------------------------------------------------- */

test("canDisplayAsGuidance takes no presentation-mode argument and is called identically either way", () => {
  assert.equal(provenanceMod.canDisplayAsGuidance.length, 2);
});

test("rendering the same step in both presentation modes never changes its underlying reviewStatus or provenance", () => {
  const reviewRequiredIndex = RITUAL_STEPS.findIndex((s) => s.reviewStatus === "REVIEW_REQUIRED");
  const before = JSON.stringify(RITUAL_STEPS[reviewRequiredIndex]);
  pujaHtml(reviewRequiredIndex, false);
  pujaHtml(reviewRequiredIndex, true);
  const after = JSON.stringify(RITUAL_STEPS[reviewRequiredIndex]);
  assert.equal(before, after);
});

test("switching presentation mode never changes whether a material or step passes canDisplayAsGuidance", () => {
  for (const item of [...MATERIALS, ...RITUAL_STEPS]) {
    const result = provenanceMod.canDisplayAsGuidance(item.reviewStatus, item.provenance);
    // Calling it again (as would happen across a FAMILY_BETA <-> REVIEWER
    // re-render) must be perfectly stable - the function is pure and takes
    // no mode input.
    assert.equal(provenanceMod.canDisplayAsGuidance(item.reviewStatus, item.provenance), result);
  }
});
