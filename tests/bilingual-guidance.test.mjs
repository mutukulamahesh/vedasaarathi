// The instruction-language toggle controls ALL plain guidance on the guided
// step, not only narration:
//   - section headings / disclosure labels / nav + audio buttons switch to Telugu
//   - a practical prep step shows its authored Telugu "what to do" / meaning
//   - a sourced step with no Telugu translation yet falls back to the English
//     draft AND shows an honest "being prepared" note
//   - the sourced Telugu mantra text is byte-identical in either language

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
const guidance = await vite.ssrLoadModule("/lib/content/step-guidance-te.ts");
const { UI_TE, stepGuidanceTe, TE_GUIDANCE_PENDING_NOTE } = guidance;

const noop = () => {};
const render = (el) => renderToStaticMarkup(el);
const COMPLETE = stepsForPujaPath(VINAYAKA_PUJA, "COMPLETE");

function puja(stepIndex, language) {
  return render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex, setStepIndex: noop, finish: noop,
      path: "COMPLETE", language, setLanguage: noop, activeList: [], mode: "SELF",
    }),
  );
}

const lightLampIdx = COMPLETE.findIndex((s) => s.id === "light-lamp");
const dhyanaIdx = COMPLETE.findIndex((s) => s.candidateStepId === "dhyana-shloka");

test("the language toggle renders on every step, above the content, not only with narration", () => {
  // dhyana-shloka is a locked mantra step: it has no narration button, but the
  // guidance-language toggle must still be present.
  const html = puja(dhyanaIdx, "EN");
  assert.match(html, /class="language-toggle"/);
  assert.doesNotMatch(html, /class="audio-button"/);
  const toggleAt = html.indexOf('class="language-toggle"');
  const mantraAt = html.indexOf('<pre class="mantra-te"');
  assert.ok(toggleAt > -1 && toggleAt < mantraAt, "toggle is above the mantra");
});

test("Telugu mode switches the section headings and disclosure labels", () => {
  const html = puja(dhyanaIdx, "TE");
  assert.ok(html.includes(UI_TE["What to keep ready"]), "keep-ready heading in Telugu");
  assert.ok(html.includes(UI_TE["What to do"]), "what-to-do heading in Telugu");
  assert.ok(html.includes(UI_TE["More about this step"]), "explanation label in Telugu");
  assert.ok(html.includes(UI_TE["Show the romanised reading"]), "romanised label in Telugu");
  // English mode keeps the English labels.
  const en = puja(dhyanaIdx, "EN");
  assert.match(en, /What to keep ready/);
  assert.match(en, /Show the romanised reading/);
});

test("Telugu mode localises the Previous / Next / Finish buttons", () => {
  const mid = puja(dhyanaIdx, "TE");
  assert.ok(mid.includes(UI_TE["Done, next"]), "next button in Telugu");
  assert.ok(mid.includes(UI_TE.Previous), "previous button in Telugu");
  const last = puja(COMPLETE.length - 1, "TE");
  assert.ok(last.includes(UI_TE["Finish puja"]), "finish button in Telugu");
});

test("a practical prep step shows its authored Telugu guidance and no pending note", () => {
  const g = stepGuidanceTe("light-lamp");
  assert.ok(g && g.whatToDo && g.meaning, "fixture: light-lamp has Telugu guidance");
  const html = puja(lightLampIdx, "TE");
  assert.ok(html.includes(g.whatToDo), "Telugu 'what to do' is shown");
  assert.ok(html.includes(g.meaning), "Telugu meaning is shown");
  assert.doesNotMatch(html, /Telugu plain-language guidance for this step is still being prepared/);
});

test("a sourced step with no Telugu translation falls back to English + an honest pending note", () => {
  assert.equal(stepGuidanceTe("dhyana-shloka"), null, "fixture: no Telugu guidance yet");
  const step = COMPLETE[dhyanaIdx];
  const html = puja(dhyanaIdx, "TE");
  assert.ok(html.includes(step.how), "the English draft 'what to do' still shows");
  assert.ok(html.includes(TE_GUIDANCE_PENDING_NOTE), "the pending note is shown in Telugu mode");
  // English mode never shows the pending note.
  assert.ok(!puja(dhyanaIdx, "EN").includes(TE_GUIDANCE_PENDING_NOTE));
});

test("the sourced Telugu mantra is identical in both languages - the toggle never touches it", () => {
  const grab = (html) => html.match(/<pre class="mantra-te" lang="te">([\s\S]*?)<\/pre>/)[1];
  assert.equal(grab(puja(dhyanaIdx, "EN")), grab(puja(dhyanaIdx, "TE")));
});
