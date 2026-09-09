// End-to-end Family Beta journey rendering:
//  - FAMILY_BETA sees the sourced candidate (Telugu mantra + transliteration)
//  - no "not available" message for an included step
//  - every included step has a Telugu mantra OR is an explicitly valid
//    non-mantra type (prep step / rights-withheld Katha)
//  - Family Beta and Reviewer mode render the same canonical content
//  - reviewer-only metadata is hidden from Family Beta
//  - the Vrata Katha rights notice shows with no story text
//  - progress resumes at the saved step

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

const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { stepsForPujaPath } = await vite.ssrLoadModule("/lib/puja/types.ts");
const { parseProgress, serializeProgress } =
  await vite.ssrLoadModule("/lib/storage/preparation.ts");

const noop = () => {};
const render = (el) => renderToStaticMarkup(el);
const COMPLETE = stepsForPujaPath(VINAYAKA_PUJA, "COMPLETE");

function puja(stepIndex, reviewMode = false) {
  return render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex, setStepIndex: noop, finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [],
      mode: "SELF", reviewMode,
    }),
  );
}

test("FAMILY_BETA shows a sourced step's Telugu mantra and English transliteration", () => {
  const dhyanaIdx = COMPLETE.findIndex((s) => s.candidateStepId === "dhyana-shloka");
  const html = puja(dhyanaIdx, false);
  assert.ok(html.includes("శుక్లాం బరధరం విష్ణుం"), "Telugu mantra shown in FAMILY_BETA");
  assert.ok(html.includes("ShuklaAmbara Dharam Vishnum"), "transliteration shown in FAMILY_BETA");
  assert.match(html, /What to do/);
  assert.doesNotMatch(html, /not available in the current beta/i);
});

test("no included step renders a 'not available' message in FAMILY_BETA", () => {
  COMPLETE.forEach((_s, i) => {
    const html = puja(i, false);
    assert.doesNotMatch(html, /not available in the current beta/i, `step ${i}`);
  });
});

test("every included step has a recovered Telugu mantra OR is a valid non-mantra type", () => {
  for (const s of COMPLETE) {
    const isPrep = s.candidateStepId === null;
    const isKatha = s.betaStatus === "WITHHELD_FOR_RIGHTS";
    if (isPrep || isKatha) continue;
    assert.ok(
      typeof s.mantraTeluguScript === "string" && s.mantraTeluguScript.length > 0,
      `${s.id} must carry a recovered Telugu mantra`,
    );
  }
});

test("Family Beta and Reviewer mode render the SAME step content (same title, mantra, action)", () => {
  const idx = COMPLETE.findIndex((s) => s.candidateStepId === "gandha");
  const family = puja(idx, false);
  const reviewer = puja(idx, true);
  const step = COMPLETE[idx];
  for (const html of [family, reviewer]) {
    assert.ok(html.includes(step.title));
    assert.ok(html.includes(step.mantraTeluguScript.split("\n")[0]));
    assert.ok(html.includes(step.how));
  }
});

test("reviewer-only metadata is hidden from Family Beta and shown in Reviewer mode", () => {
  const idx = COMPLETE.findIndex((s) => s.candidateStepId === "ganapati-prarthana");
  const family = puja(idx, false);
  const reviewer = puja(idx, true);

  // Family: none of the reviewer chrome.
  assert.doesNotMatch(family, /provenance-panel/);
  assert.doesNotMatch(family, /review-chip/);
  assert.doesNotMatch(family, /BETA_CLASSIFICATION/);
  assert.doesNotMatch(family, /BETA_TRANSCRIPTION_CHECK_REQUIRED/);
  assert.doesNotMatch(family, /confidence (HIGH|MEDIUM)/);
  assert.doesNotMatch(family, /stay locked until a qualified reviewer/i);

  // Reviewer: all of it.
  assert.match(reviewer, /provenance-panel/);
  assert.match(reviewer, /review-chip/);
  assert.match(reviewer, /BETA_CLASSIFICATION/);
  assert.match(reviewer, /confidence MEDIUM/);
});

test("the Vrata Katha step shows the rights notice and no story text, in both modes", () => {
  const idx = COMPLETE.findIndex((s) => s.id === "vrata-katha");
  assert.notEqual(idx, -1);
  for (const reviewMode of [false, true]) {
    const html = puja(idx, reviewMode);
    assert.match(html, /publication rights are still being confirmed/i);
    // No mantra / transliteration / story prose.
    assert.doesNotMatch(html, /<pre class="mantra-te"/);
  }
});

test("Simple and Complete both reach a completion, and a per-puja run round-trips through storage", () => {
  const simple = stepsForPujaPath(VINAYAKA_PUJA, "SIMPLE");
  assert.ok(simple.length >= 8 && COMPLETE.length > simple.length);

  const saved = parseProgress(serializeProgress({
    mode: "SELF", language: "EN",
    participants: [{ id: "p1", name: "M", gotra: { status: "UNKNOWN", name: "" },
      veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" },
      sampradaya: { status: "UNKNOWN", name: "" } }],
    runs: {
      "vinayaka-chavithi": {
        runState: "IN_PROGRESS", stepIndex: 7, pujaPath: "COMPLETE",
        availableMaterialIds: [], patriSelfReport: null,
      },
    },
  }));
  assert.equal(saved.runs["vinayaka-chavithi"].stepIndex, 7, "saved step index is restored");
  assert.equal(saved.runs["vinayaka-chavithi"].pujaPath, "COMPLETE");
  assert.equal(saved.runs["vinayaka-chavithi"].runState, "IN_PROGRESS");

  const lastHtml = puja(COMPLETE.length - 1, false);
  assert.match(lastHtml, /Finish puja/);
});

test("Home shows Resume for an IN_PROGRESS run - including one left on step 1 - and not otherwise", () => {
  const base = {
    setScreen: noop, openPreparation: noop, resumePuja: noop, mode: "SELF",
    participantCount: 1, materialsReady: 0, savedPath: "COMPLETE",
    todayEpochDay: 20000, nowMs: 0, location: { status: "NOT_SET" },
    featuredPuja: VINAYAKA_PUJA,
  };
  const atStep5 = render(React.createElement(page.HomeScreen, { ...base, runState: "IN_PROGRESS", savedStepIndex: 5 }));
  assert.match(atStep5, />Resume</);
  assert.match(atStep5, /step 6 of \d+/);
  assert.match(atStep5, /Restart puja/);

  // A run left on the very first step still resumes.
  const atStep0 = render(React.createElement(page.HomeScreen, { ...base, runState: "IN_PROGRESS", savedStepIndex: 0 }));
  assert.match(atStep0, />Resume</);
  assert.match(atStep0, /step 1 of \d+/);

  const notStarted = render(React.createElement(page.HomeScreen, { ...base, runState: "NOT_STARTED", savedStepIndex: 0 }));
  assert.doesNotMatch(notStarted, />Resume</);
  assert.match(notStarted, /Get puja ready/);

  const completed = render(React.createElement(page.HomeScreen, { ...base, runState: "COMPLETED", savedStepIndex: 34 }));
  assert.doesNotMatch(completed, />Resume</);
  assert.match(completed, /puja completed/i);
  assert.match(completed, /Start a new puja/);
});

test("the completion screen says 'Vinayaka Puja completed' and asks for corrections without an approval claim", () => {
  const html = render(
    React.createElement(page.CompleteScreen, { home: noop, restart: noop, immersion: null }),
  );
  assert.match(html, /Vinayaka Puja completed/);
  assert.match(html, /report a correction/i);
  assert.doesNotMatch(html, /priest.?approved|verified|blessed/i);
});
