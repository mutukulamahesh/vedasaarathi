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
const { epochDay } = await vite.ssrLoadModule("/lib/content/festival.ts");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");

const noop = () => {};
const render = (element) => renderToStaticMarkup(element);

/* -------------------------------------------------------------------------- */
/* Correction 2: prototype completion wording                                 */
/* -------------------------------------------------------------------------- */

test("completion screen says the puja is completed and asks for corrections, without a blessing or approval claim", () => {
  const html = render(
    React.createElement(page.CompleteScreen, { home: noop, restart: noop, immersion: noop }),
  );
  assert.match(html, /Vinayaka Puja completed/i);
  assert.match(html, /send us a correction/i);
  assert.doesNotMatch(html, /priest.?approved|blessed you|worshipping with sincerity/i);
});

test("the final guided step button finishes the puja", () => {
  const html = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA,
      stepIndex: RITUAL_STEPS.length - 1,
      setStepIndex: noop,
      finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [], reviewMode: true,
    }),
  );
  assert.match(html, /Finish puja/);
});

/* -------------------------------------------------------------------------- */
/* Correction 3: term notes follow the release gate                          */
/* -------------------------------------------------------------------------- */

function pujaHtml(stepIndex) {
  return render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA,
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
  assert.match(tooHigh, /Finish puja/);
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

test("REVIEWER mode labels every sourced candidate step as still under review, with the locked note", () => {
  RITUAL_STEPS.forEach((step, index) => {
    if (step.reviewStatus === "REVIEW_REQUIRED" && step.betaStatus !== "WITHHELD_FOR_RIGHTS") {
      const html = pujaHtml(index);
      assert.match(html, /Still being reviewed/i, `${step.id} shows the review chip`);
      assert.match(html, /stay locked until a qualified reviewer/i, `${step.id} shows the locked note`);
      assert.match(html, /not priest-reviewed|BETA_CLASSIFICATION/i, `${step.id} labels it as unreviewed`);
    }
  });
});

test("FAMILY_BETA shows a sourced candidate step's content, with no reviewer chrome and no 'not available' message", () => {
  const index = RITUAL_STEPS.findIndex(
    (step) => step.reviewStatus === "REVIEW_REQUIRED" && step.betaStatus !== "WITHHELD_FOR_RIGHTS",
  );
  assert.notEqual(index, -1);
  const step = RITUAL_STEPS[index];
  const html = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA,
      stepIndex: index,
      setStepIndex: noop,
      finish: noop,
      path: "COMPLETE",
      language: "EN",
      setLanguage: noop,
      activeList: [],
    }),
  );

  // The candidate content IS shown in the family beta now.
  assert.ok(html.includes(step.how), "beginner action is shown");
  assert.ok(html.includes(step.why), "why is shown");
  // ...but never the reviewer chrome or internal wording.
  assert.doesNotMatch(html, /not available in the current beta/i);
  assert.doesNotMatch(html, /awaiting religious review/i);
  assert.doesNotMatch(html, /Private review build/i);
  assert.doesNotMatch(html, /review-chip/);
  assert.doesNotMatch(html, /REVIEW_REQUIRED/);
  assert.doesNotMatch(html, /provenance-panel/);
});

test("REVIEWER mode adds the provenance panel and source detail a family user never sees", () => {
  const index = RITUAL_STEPS.findIndex(
    (step) => step.reviewStatus === "REVIEW_REQUIRED" && step.betaStatus !== "WITHHELD_FOR_RIGHTS",
  );
  const step = RITUAL_STEPS[index];
  const html = pujaHtml(index);

  assert.ok(html.includes(step.how));
  assert.match(html, /provenance-panel/);
  assert.match(html, /Still being reviewed/i);
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
        puja: VINAYAKA_PUJA,
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

test("the Telugu mantra block carries lang=\"te\"", () => {
  // stepIndex 2 is the first sourced candidate step (dhyana-shloka), which has
  // a recovered Telugu mantra.
  const html = narrationHtml({ language: "TE", voices: [voice("te-in", "te-IN")], stepIndex: 2 });
  assert.match(html, /<pre class="mantra-te" lang="te">/);
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

test("a locked candidate step offers no device-narration button at all, in either review-mode state", () => {
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
    // No browser-TTS button is rendered for a locked (mantra) step.
    assert.doesNotMatch(html, /<button class="audio-button"/);
    assert.match(html, /Audio guidance is not available until this step is reviewed/i);

    // The candidate content is shown in both modes now; only reviewMode adds
    // the provenance panel.
    assert.ok(html.includes(step.how), `content shown, reviewMode=${reviewMode}`);
    if (reviewMode) assert.match(html, /provenance-panel/);
    else assert.doesNotMatch(html, /provenance-panel/);
  }
});

// PujaScreen always derives its steps from the real RITUAL_STEPS content (via
// stepsForPath) and cannot be rendered against a substitute step list, and no
// real step today is both REVIEW_REQUIRED and unlocked (every ritual() step is
// locked). "An unlocked REVIEW_REQUIRED candidate narrates only in explicit
// review mode" is therefore proven with a real, non-vacuous assertion at the
// unit level instead: see tests/speech-narration-policy.test.mjs
// ("REVIEW_REQUIRED text never narrates when review mode is off" /
// "...narrates only while review mode is explicitly on", both using a
// `locked: false` fixture).

test("approved unlocked guidance remains narratable", () => {
  const approvedIndex = RITUAL_STEPS.findIndex(
    (step) => step.reviewStatus === "GENERAL_GUIDANCE",
  );
  assert.notEqual(approvedIndex, -1);
  const step = RITUAL_STEPS[approvedIndex];
  assert.equal(step.locked, false);

  const html = narrationHtml({
    language: "EN",
    voices: [voice("en-us", "en-US")],
    stepIndex: approvedIndex,
    reviewMode: false,
  });
  const audioButton = html.match(/<button class="audio-button"[^>]*>/)[0];
  assert.doesNotMatch(audioButton, /disabled=""/);
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
      location: { status: "NOT_SET" },
      featuredPuja: VINAYAKA_PUJA,
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
