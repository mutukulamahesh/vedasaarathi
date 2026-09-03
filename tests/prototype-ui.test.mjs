import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const page = await vite.ssrLoadModule("/app/page.tsx");
const { epochDay } = await vite.ssrLoadModule("/lib/content/festival.ts");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");

const noop = () => {};
const render = (element) => renderToStaticMarkup(element);

/* -------------------------------------------------------------------------- */
/* Correction 2: prototype completion wording                                 */
/* -------------------------------------------------------------------------- */

test("completion screen clearly says this is a private review", () => {
  const html = render(
    React.createElement(page.CompleteScreen, { home: noop, restart: noop, immersion: noop }),
  );
  assert.match(html, /Private Puja Review Completed/i);
  assert.match(html, /awaiting final approval/i);
  assert.doesNotMatch(html, /worshipping with sincerity/i);
});

test("the final guided step button finishes the private review", () => {
  const html = render(
    React.createElement(page.PujaScreen, {
      stepIndex: RITUAL_STEPS.length - 1,
      setStepIndex: noop,
      showWhy: false,
      setShowWhy: noop,
      finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [],
    }),
  );
  assert.match(html, /Finish puja review/);
});

/* -------------------------------------------------------------------------- */
/* Correction 3: term notes follow the release gate                          */
/* -------------------------------------------------------------------------- */

function pujaHtml(stepIndex) {
  return render(
    React.createElement(page.PujaScreen, {
      stepIndex,
      setStepIndex: noop,
      showWhy: false,
      setShowWhy: noop,
      finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [],
    }),
  );
}

test("a shown practical step also shows its term note", () => {
  // Step index 1 is "light-lamp" (GENERAL_GUIDANCE), which displays.
  const step = RITUAL_STEPS[1];
  assert.equal(step.id, "light-lamp");
  assert.ok(step.termNote);

  const html = pujaHtml(1);
  assert.match(html, /What to do/);
  assert.ok(html.includes(step.termNote), "term note is shown with visible guidance");
});

test("every draft ritual step stays labelled as a private review candidate", () => {
  RITUAL_STEPS.forEach((step, index) => {
    if (step.reviewStatus === "REVIEW_REQUIRED") {
      const html = pujaHtml(index);
      assert.match(html, /Private review build/i);
      assert.match(html, /not approved guidance/i);
      assert.match(html, /Still being reviewed/i);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Correction 5: countdown after the festival shows no negative number       */
/* -------------------------------------------------------------------------- */

function countdownBlock(iso) {
  const html = render(
    React.createElement(page.HomeScreen, {
      setScreen: noop,
      openPreparation: noop,
      mode: "SELF",
      participantCount: 1,
      materialsReady: 0,
      todayEpochDay: epochDay(Date.parse(`${iso}T00:00:00Z`)),
    }),
  );
  const match = html.match(/<div class="countdown">(.*?)<\/div>/s);
  assert.ok(match, "countdown block is present");
  return match[1];
}

test("home countdown before the festival shows the day count", () => {
  const block = countdownBlock("2026-09-04");
  assert.match(block, /<strong>10<\/strong>/);
  assert.match(block, /days/);
});

test("home countdown after the festival shows no negative number", () => {
  const block = countdownBlock("2026-09-20");
  assert.match(block, /date passed/i);
  assert.doesNotMatch(block, /-?\d/, "no digits, so no negative value");
  assert.doesNotMatch(block, /−/, "no unicode minus");
});

test("home countdown on the festival day shows Today and no number", () => {
  const block = countdownBlock("2026-09-14");
  assert.match(block, /Today/);
  assert.doesNotMatch(block, /-?\d/);
});
