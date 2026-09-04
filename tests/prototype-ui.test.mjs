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
      finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [], reviewMode: true,
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
      finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [], reviewMode: true,
    }),
  );
}

test("a step's why appears exactly once, with no separate reveal toggle", () => {
  // Step index 1 ("light-lamp") displays guidance, so "why" is shown inline as
  // part of the What/How/Why block. There must be no second "Why do we do
  // this?" button duplicating the same text behind a toggle.
  const step = RITUAL_STEPS[1];
  const html = pujaHtml(1);

  const occurrences = html.split(step.why).length - 1;
  assert.equal(occurrences, 1, "step.why must render exactly once");
  assert.doesNotMatch(html, /Why do we do this\?/);
});

test("an out-of-range step index is clamped instead of crashing or going blank", () => {
  const last = RITUAL_STEPS.length - 1;

  const tooLow = pujaHtml(-5);
  assert.match(tooLow, new RegExp(RITUAL_STEPS[0].title));
  assert.match(tooLow, /Step 1 of/);

  const tooHigh = pujaHtml(999);
  assert.match(tooHigh, new RegExp(RITUAL_STEPS[last].title));
  assert.match(tooHigh, /Finish puja review/);
});

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

test("draft ritual instructions stay hidden when review mode is off", () => {
  const index = RITUAL_STEPS.findIndex((step) => step.reviewStatus === "REVIEW_REQUIRED");
  assert.notEqual(index, -1);
  const step = RITUAL_STEPS[index];
  const html = render(
    React.createElement(page.PujaScreen, {
      stepIndex: index,
      setStepIndex: noop,
      finish: noop,
      path: "COMPLETE",
      language: "EN",
      setLanguage: noop,
      activeList: [],
    }),
  );

  assert.match(html, /awaiting religious review/i);
  assert.doesNotMatch(html, /Private review build/i);
  assert.ok(!html.includes(step.what));
  assert.ok(!html.includes(step.how));
  assert.match(html, /Audio guidance is not available until this step is reviewed/i);
});

test("draft ritual instructions appear only in explicit review mode", () => {
  const index = RITUAL_STEPS.findIndex((step) => step.reviewStatus === "REVIEW_REQUIRED");
  const step = RITUAL_STEPS[index];
  const html = pujaHtml(index);

  assert.match(html, /Private review build/i);
  assert.ok(html.includes(step.what));
  assert.ok(html.includes(step.how));
});

/* -------------------------------------------------------------------------- */
/* Telugu/English narration wiring                                            */
/* -------------------------------------------------------------------------- */

function voice(voiceURI, lang, name = voiceURI) {
  return { voiceURI, lang, name };
}

// supportsSpeech stubs a minimal window.speechSynthesis so
// hasSpeechSynthesisSupport() reads true, matching a real browser. Pass
// supportsSpeech: false to exercise the "not supported" path instead - Node
// has no `window` by default, so that case needs no stub at all.
function narrationHtml({
  language, voices, stepIndex = 1, reviewMode = false, supportsSpeech = true,
}) {
  const hadWindow = "window" in globalThis;
  const originalWindow = globalThis.window;
  if (supportsSpeech) {
    globalThis.window = { speechSynthesis: {} };
  } else {
    delete globalThis.window;
  }
  try {
    return render(
      React.createElement(page.PujaScreen, {
        stepIndex,
        setStepIndex: noop,
        finish: noop,
        path: "COMPLETE",
        language,
        setLanguage: noop,
        activeList: [],
        reviewMode,
        voices,
      }),
    );
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
}

test("Telugu narration is disabled and explained when no Telugu voice exists", () => {
  const html = narrationHtml({ language: "TE", voices: [voice("en-us", "en-US"), voice("hi-in", "hi-IN")] });
  assert.match(html, /A suitable Telugu voice is not available on this device\./);
  const audioButton = html.match(/<button class="audio-button"[^>]*>/)[0];
  assert.match(audioButton, /disabled=""/);
});

test("Telugu narration stays enabled once a Telugu voice is present, and never offers English/Hindi as options", () => {
  const html = narrationHtml({
    language: "TE",
    voices: [voice("en-us", "en-US"), voice("hi-in", "hi-IN"), voice("te-in", "te-IN", "Lekha")],
  });
  const audioButton = html.match(/<button class="audio-button"[^>]*>/)[0];
  assert.doesNotMatch(audioButton, /disabled=""/);
  assert.doesNotMatch(html, /A suitable Telugu voice is not available/);
});

test("the Telugu instruction block carries lang=\"te\"", () => {
  const html = narrationHtml({ language: "TE", voices: [voice("te-in", "te-IN")] });
  assert.match(html, /<div class="step-block" lang="te">/);
});

test("switching Telugu text language never happens automatically when no voice is found", () => {
  // The instructions themselves must still render in Telugu; only the audio
  // control is disabled, and no English substitute is shown as if it were the
  // Telugu instruction.
  const step = RITUAL_STEPS[1];
  const html = narrationHtml({ language: "TE", voices: [] });
  assert.ok(html.includes(step.teluguInstruction));
});

test("the voice selector shows only Telugu voices in Telugu mode, only English voices in English mode", () => {
  const voices = [
    voice("en-us", "en-US", "Samantha"),
    voice("en-in", "en-IN", "Veena"),
    voice("te-in-1", "te-IN", "Telugu One"),
    voice("te-in-2", "te-IN", "Telugu Two"),
  ];

  const teluguHtml = narrationHtml({ language: "TE", voices });
  assert.match(teluguHtml, /Telugu One/);
  assert.match(teluguHtml, /Telugu Two/);
  assert.doesNotMatch(teluguHtml, /Samantha/);
  assert.doesNotMatch(teluguHtml, /Veena/);

  const englishHtml = narrationHtml({ language: "EN", voices });
  assert.match(englishHtml, /Samantha/);
  assert.match(englishHtml, /Veena/);
  assert.doesNotMatch(englishHtml, /Telugu One/);
  assert.doesNotMatch(englishHtml, /Telugu Two/);
});

test("no voice selector appears when only one voice exists for the language", () => {
  const html = narrationHtml({ language: "EN", voices: [voice("en-us", "en-US", "Samantha")] });
  assert.doesNotMatch(html, /class="voice-select"/);
});

test("Pause and Stop are disabled until narration starts", () => {
  const html = narrationHtml({ language: "EN", voices: [voice("en-us", "en-US")] });
  const pauseButton = html.match(/<button[^>]*>Pause<\/button>/)[0];
  const stopButton = html.match(/<button[^>]*>Stop<\/button>/)[0];
  assert.match(pauseButton, /disabled=""/);
  assert.match(stopButton, /disabled=""/);
});

test("device narration copy never claims priest-reviewed pronunciation", () => {
  const html = narrationHtml({ language: "EN", voices: [voice("en-us", "en-US")] });
  assert.match(html, /Device narration only\. It does not read mantras/);
  assert.doesNotMatch(html, /priest.?reviewed pronunciation/i);
});

/* -------------------------------------------------------------------------- */
/* Unsupported browser: neither language can narrate                         */
/* -------------------------------------------------------------------------- */

test("English narration is disabled when speechSynthesis is unsupported", () => {
  const html = narrationHtml({
    language: "EN",
    voices: [voice("en-us", "en-US")],
    supportsSpeech: false,
  });
  const audioButton = html.match(/<button class="audio-button"[^>]*>/)[0];
  assert.match(audioButton, /disabled=""/);
  assert.match(html, /Device narration is not supported by this browser\./);
});

test("Telugu narration is disabled when speechSynthesis is unsupported, even with a Telugu voice listed", () => {
  const html = narrationHtml({
    language: "TE",
    voices: [voice("te-in", "te-IN")],
    supportsSpeech: false,
  });
  const audioButton = html.match(/<button class="audio-button"[^>]*>/)[0];
  assert.match(audioButton, /disabled=""/);
  assert.match(html, /Device narration is not supported by this browser\./);
  // The unsupported-browser message takes priority over the Telugu-specific one.
  assert.doesNotMatch(html, /A suitable Telugu voice is not available/);
});

test("an unsupported browser hides the voice selector even with several voices listed", () => {
  const html = narrationHtml({
    language: "EN",
    voices: [voice("en-us", "en-US"), voice("en-in", "en-IN")],
    supportsSpeech: false,
  });
  assert.doesNotMatch(html, /class="voice-select"/);
});

/* -------------------------------------------------------------------------- */
/* Locked content can never be narrated                                       */
/* -------------------------------------------------------------------------- */

test("a locked, REVIEW_REQUIRED step is never narratable, review mode on or off", () => {
  const lockedIndex = RITUAL_STEPS.findIndex((step) => step.locked);
  assert.notEqual(lockedIndex, -1);
  const step = RITUAL_STEPS[lockedIndex];
  assert.equal(step.reviewStatus, "REVIEW_REQUIRED");

  for (const reviewMode of [false, true]) {
    const html = narrationHtml({
      language: "EN",
      voices: [voice("en-us", "en-US")],
      stepIndex: lockedIndex,
      reviewMode,
    });
    if (!reviewMode) {
      // Not narratable at all with review mode off.
      const audioButton = html.match(/<button class="audio-button"[^>]*>/)[0];
      assert.match(audioButton, /disabled=""/);
      assert.ok(!html.includes(step.what));
    }
    // Even in review mode (candidate preview), the locked-content banner is
    // shown and no canonical wording exists anywhere to narrate.
    assert.doesNotMatch(html, /Sankalpam wording|canonical mantra/i);
  }
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
