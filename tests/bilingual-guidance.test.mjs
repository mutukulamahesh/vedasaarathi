// The instruction-language toggle controls ALL plain guidance on the guided
// step, not only narration:
//   - section headings / disclosure labels / nav + audio buttons switch to Telugu
//   - EVERY step now has a full Telugu candidate translation (what to keep
//     ready, what to do, meaning, why, safety) - no English fallback, no
//     per-step "being prepared" notice
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
const { UI_TE, stepGuidanceTe, teGuidanceStepIds } = guidance;
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");

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

test("every RITUAL_STEP has a full Telugu candidate translation", () => {
  const covered = new Set(teGuidanceStepIds());
  for (const s of RITUAL_STEPS) {
    assert.ok(covered.has(s.id), `${s.id} has Telugu guidance`);
    const g = stepGuidanceTe(s.id);
    assert.ok(g.whatToDo && g.meaning && g.why, `${s.id} guidance is complete`);
    assert.ok(Array.isArray(g.keepReady), `${s.id} has a keepReady list`);
  }
});

test("the language toggle renders on every step, above the content, not only with narration", () => {
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
  const en = puja(dhyanaIdx, "EN");
  assert.match(en, /What to keep ready/);
  assert.match(en, /Show the romanised reading/);
});

test("Telugu mode localises the Previous / Next / Finish buttons and the step line", () => {
  const mid = puja(dhyanaIdx, "TE");
  assert.ok(mid.includes(UI_TE["Done, next"]), "next button in Telugu");
  assert.ok(mid.includes(UI_TE.Previous), "previous button in Telugu");
  assert.match(mid, /దశ \d+ \/ \d+/, "step line in Telugu");
  const last = puja(COMPLETE.length - 1, "TE");
  assert.ok(last.includes(UI_TE["Finish puja"]), "finish button in Telugu");
});

test("a sourced step shows its Telugu candidate guidance and no English guidance, no pending note", () => {
  const g = stepGuidanceTe("dhyana-shloka");
  const step = COMPLETE[dhyanaIdx];
  const html = puja(dhyanaIdx, "TE");
  assert.ok(html.includes(g.whatToDo), "Telugu 'what to do' is shown");
  assert.ok(html.includes(g.meaning), "Telugu meaning is shown");
  assert.ok(html.includes(g.why), "Telugu 'why' is shown");
  // The English draft strings do not appear in Telugu mode.
  assert.ok(!html.includes(step.how), "English 'how' is not shown in Telugu mode");
  assert.ok(!html.includes(step.what), "English 'what' is not shown in Telugu mode");
  assert.doesNotMatch(html, /being prepared|still being translated/i, "no per-step pending notice");
  // English mode shows the English draft.
  assert.ok(puja(dhyanaIdx, "EN").includes(step.how));
});

test("a step's mantra-named materials appear in Telugu in the keep-ready list", () => {
  const arghyaIdx = COMPLETE.findIndex((s) => s.candidateStepId === "arghya");
  const g = stepGuidanceTe("arghya");
  const html = puja(arghyaIdx, "TE");
  for (const line of g.keepReady) assert.ok(html.includes(line), `"${line}" shown`);
  // English material phrases for that step are gone.
  assert.ok(!/sandal paste \(gandha\)/i.test(html));
});

test("the sourced Telugu mantra is identical in both languages - the toggle never touches it", () => {
  const grab = (html) => html.match(/<pre class="mantra-te" lang="te">([\s\S]*?)<\/pre>/)[1];
  assert.equal(grab(puja(dhyanaIdx, "EN")), grab(puja(dhyanaIdx, "TE")));
});

test("the practical prep step light-lamp also has Telugu guidance", () => {
  const g = stepGuidanceTe("light-lamp");
  const html = puja(lightLampIdx, "TE");
  assert.ok(html.includes(g.whatToDo));
  assert.ok(html.includes(g.meaning));
});
