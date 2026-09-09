// In Telugu mode, the guided step shows NO English instruction, material name,
// explanation, audio label or step notice. The only Latin text allowed on the
// card is a transliteration (.mantra-roman, [data-allow-latin]) and the
// language toggle's own "English" button. This is the SSR counterpart of the
// browser assertion in scripts/browser-check-te.mjs.

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

function cardHtml(stepIndex, path) {
  const full = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex, setStepIndex: noop, finish: noop,
      path, language: "TE", setLanguage: noop, activeList: [{ id: "p1", name: "M" }],
      mode: "SELF",
    }),
  );
  return full;
}

/** Strip zones where Latin is legitimately allowed, then flag Latin words. */
function englishLeak(html) {
  let s = html;
  // remove the romanised reading (transliteration - allowed)
  s = s.replace(/<pre class="mantra-roman"[^>]*>[\s\S]*?<\/pre>/g, "");
  s = s.replace(/<[^>]*data-allow-latin[^>]*>[\s\S]*?<\/[^>]+>/g, "");
  // remove the language toggle (its "English" button label must stay English)
  s = s.replace(/<div class="language-toggle"[\s\S]*?<\/div>/g, "");
  // remove the sourced mantra itself (Telugu script, but be safe) and svg attrs
  s = s.replace(/<pre class="mantra-te"[^>]*>[\s\S]*?<\/pre>/g, "");
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, "");
  // drop all remaining tags/attributes; keep text only
  const text = s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
  // any run of 2+ Latin letters is an English leak
  const hits = text.match(/[A-Za-z]{2,}/g) ?? [];
  return [...new Set(hits)];
}

test("every Complete-path step renders Telugu-only guidance (no English leak)", () => {
  const steps = stepsForPujaPath(VINAYAKA_PUJA, "COMPLETE");
  const leaks = {};
  steps.forEach((step, i) => {
    const found = englishLeak(cardHtml(i, "COMPLETE"));
    if (found.length) leaks[step.id] = found;
  });
  assert.deepEqual(leaks, {}, `English text leaked in Telugu mode: ${JSON.stringify(leaks)}`);
});

test("every Simple-path step renders Telugu-only guidance (no English leak)", () => {
  const steps = stepsForPujaPath(VINAYAKA_PUJA, "SIMPLE");
  const leaks = {};
  steps.forEach((step, i) => {
    const found = englishLeak(cardHtml(i, "SIMPLE"));
    if (found.length) leaks[step.id] = found;
  });
  assert.deepEqual(leaks, {}, `English text leaked in Telugu mode: ${JSON.stringify(leaks)}`);
});
