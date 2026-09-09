// The guided step is Telugu-first and ordered for a beginner about to act:
//   1. Telugu step name (H1) with the English title as a smaller line under it
//   2. What to keep ready  (visible, not hidden in a disclosure)
//   3. What to do           (visible)
//   4. Telugu mantra
//   5. romanised reading    (disclosure under the mantra)
//   6. meaning / explanation (disclosure)
// Materials and the physical action must appear ABOVE the mantra on every step.

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

const noop = () => {};
const render = (el) => renderToStaticMarkup(el);
const COMPLETE = stepsForPujaPath(VINAYAKA_PUJA, "COMPLETE");

function puja(stepIndex, language = "EN") {
  return render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex, setStepIndex: noop, finish: noop,
      path: "COMPLETE", language, setLanguage: noop, activeList: [], mode: "SELF",
    }),
  );
}

/** A sourced mantra step that also names materials in its mantra. */
const materialMantraIdx = COMPLETE.findIndex(
  (s) => s.mantraTeluguScript && s.materials && s.materials.length > 0,
);
assert.notEqual(materialMantraIdx, -1, "fixture: a mantra step with materials exists");

test("the step H1 is the Telugu name; the English title is a smaller secondary line", () => {
  const step = COMPLETE[materialMantraIdx];
  const html = puja(materialMantraIdx);

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  assert.ok(h1, "there is an h1");
  assert.match(h1[0], /class="step-telugu-title"/);
  assert.match(h1[0], /lang="te"/);
  assert.ok(h1[1].includes(step.teluguTitle), "h1 holds the Telugu step name");
  assert.ok(!h1[1].includes(step.title), "the English title is not inside the h1");

  assert.match(html, new RegExp(`<p class="step-english-title">${step.title}</p>`));
});

test("What to keep ready and What to do both render before the mantra", () => {
  const html = puja(materialMantraIdx);
  const keepReady = html.indexOf("What to keep ready");
  const whatToDo = html.indexOf("What to do");
  const mantra = html.indexOf('<pre class="mantra-te"');
  const explain = html.indexOf("More about this step");

  assert.ok(keepReady > -1 && whatToDo > -1 && mantra > -1);
  assert.ok(keepReady < mantra, "keep-ready is above the mantra");
  assert.ok(whatToDo < mantra, "what-to-do is above the mantra");
  assert.ok(mantra < explain, "the mantra is above the meaning/explanation");
});

test("materials are shown as a visible list, not hidden inside a disclosure", () => {
  const step = COMPLETE[materialMantraIdx];
  const html = puja(materialMantraIdx);

  const section = html.match(
    /<section class="step-block step-keepready">([\s\S]*?)<\/section>/,
  );
  assert.ok(section, "the keep-ready section is a plain section");
  for (const item of step.materials) {
    assert.ok(section[1].includes(item), `"${item}" is listed in the visible keep-ready section`);
  }
  // The old "What to hold or offer (N)" disclosure is gone.
  assert.doesNotMatch(html, /What to hold or offer/);
});

test("a step with no named materials still shows the keep-ready section with a plain line", () => {
  // stepIndex 1 is the practical "light the lamp" step - no mantra materials.
  const html = puja(1);
  assert.match(html, /What to keep ready/);
  assert.match(html, /Nothing extra for this step/);
});

test("the romanised reading stays a disclosure directly under the mantra", () => {
  const dhyanaIdx = COMPLETE.findIndex((s) => s.candidateStepId === "dhyana-shloka");
  const html = puja(dhyanaIdx);
  const mantra = html.indexOf('<pre class="mantra-te"');
  const roman = html.indexOf("Show the romanised reading");
  assert.ok(mantra > -1 && roman > mantra, "romanised disclosure follows the mantra");
});
