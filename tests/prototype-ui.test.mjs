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
const { UI_TE } = await vite.ssrLoadModule("/lib/content/step-guidance-te.ts");

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
  assert.match(html, /report a correction/i);
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

test("Telugu mode: a step now plays APP-HOSTED audio — no device Telugu voice needed, no nag", () => {
  // Families get app-hosted Telugu audio for every step, so the device-voice
  // fallback and its "install a Telugu voice" nag never appear in Telugu mode.
  for (const voices of [
    [voice("en-us", "en-US"), voice("hi-in", "hi-IN")], // no Telugu device voice
    [voice("te-in", "te-IN", "Lekha")],                 // Telugu device voice present
  ]) {
    const html = narrationHtml({ language: "TE", voices, stepIndex: 1 });
    assert.match(html, /class="app-audio-button"/, "the app-hosted player renders");
    assert.match(html, /<audio [^>]*src="\/audio\/v1\/light-lamp\.te\.plain\.mp3"/);
    assert.doesNotMatch(html, /class="device-fallback"/, "no device-voice fallback");
    assert.doesNotMatch(html, /class="audio-button"/, "no browser-TTS button");
    assert.ok(!html.includes(UI_TE.teluguVoiceMissing), "no 'no Telugu voice' nag");
  }
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

test("English mode: the app-hosted instruction player renders; the device-voice selector is a load-failure fallback, not shown by default", () => {
  // Every step ships an English instruction MP3 (en-IN-PrabhatNeural), so the
  // app-hosted player is what the family sees. The device-voice control - and
  // its voice selector - only appear if that file fails to load. Voice-list
  // language filtering is unit-tested in tests/speech-voices.test.mjs and the
  // fallback rendering in tests/speech-lifecycle.test.mjs.
  const voices = [
    voice("en-us", "en-US", "Samantha"),
    voice("en-in", "en-IN", "Veena"),
    voice("te-in-1", "te-IN", "Telugu One"),
  ];
  const englishHtml = narrationHtml({ language: "EN", voices });
  assert.match(englishHtml, /class="app-audio-button"/);
  assert.match(englishHtml, /<audio [^>]*src="\/audio\/v1\/[^"]+\.en\.plain\.mp3"/);
  assert.doesNotMatch(englishHtml, /class="device-fallback"/);
  assert.doesNotMatch(englishHtml, /class="voice-select"/);
  const teluguHtml = narrationHtml({ language: "TE", voices });
  assert.doesNotMatch(teluguHtml, /class="voice-select"/);
});

test("Pause and Stop are disabled until narration starts", () => {
  const html = narrationHtml({ language: "EN", voices: [voice("en-us", "en-US")] });
  const pauseButton = html.match(/<button[^>]*>Pause<\/button>/)[0];
  const stopButton = html.match(/<button[^>]*>Stop<\/button>/)[0];
  assert.match(pauseButton, /disabled=""/);
  assert.match(stopButton, /disabled=""/);
});

test("no audio copy anywhere claims priest-reviewed or priest-approved pronunciation", () => {
  const html = narrationHtml({ language: "EN", voices: [voice("en-us", "en-US")] });
  assert.doesNotMatch(html, /priest.?reviewed pronunciation/i);
  assert.doesNotMatch(html, /priest.?approved/i);
});

/* -------------------------------------------------------------------------- */
/* Unsupported browser: neither language can narrate                         */
/* -------------------------------------------------------------------------- */

test("English mode still renders the app-hosted player when speechSynthesis is unsupported", () => {
  // The device voice being unavailable no longer matters: the family hears the
  // bundled English MP3. (The disabled-fallback path is covered in
  // tests/speech-lifecycle.test.mjs, which can drive an <audio> load failure.)
  const html = narrationHtml({
    language: "EN",
    voices: [voice("en-us", "en-US")],
    supportsSpeech: false,
  });
  assert.match(html, /class="app-audio-button"/);
  assert.match(html, /<audio [^>]*src="\/audio\/v1\/[^"]+\.en\.plain\.mp3"/);
});

test("Telugu mode: an unsupported speechSynthesis is irrelevant — app-hosted audio still plays", () => {
  const html = narrationHtml({
    language: "TE",
    voices: [voice("te-in", "te-IN")],
    supportsSpeech: false,
  });
  assert.match(html, /class="app-audio-button"/, "the app player renders regardless of speechSynthesis");
  assert.doesNotMatch(html, /class="device-fallback"/);
  assert.ok(!html.includes(UI_TE.deviceUnsupported), "no device-narration 'not supported' note in Telugu mode");
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
    // No browser-TTS button is rendered for a locked (mantra) step - not for
    // plain instructions, and never for the mantra itself.
    assert.doesNotMatch(html, /<button class="audio-button"/);
    // The app-hosted mantra-audio slot now plays a pronunciation guide, framed
    // without any review-process wording interrupting the family journey.
    assert.match(html, /pronunciation guide/i);
    assert.match(html, /computer voice/i);
    assert.match(html, /not a priest.s recording/i);
    assert.doesNotMatch(html, /review candidate|until this step is reviewed|awaiting review|not verified/i);

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

test("approved unlocked guidance is playable — the app-hosted instruction player renders and is enabled", () => {
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
  const playButton = html.match(/<button type="button" class="app-audio-button"[^>]*>/)[0];
  assert.doesNotMatch(playButton, /disabled=""/);
});

/* -------------------------------------------------------------------------- */
/* Home has no fabricated festival countdown in FAMILY_BETA                    */
/* -------------------------------------------------------------------------- */

function familyHome(iso) {
  return render(
    React.createElement(page.HomeScreen, {
      setScreen: noop, openPreparation: noop, mode: "SELF", participantCount: 1,
      materialsReady: 0,
      todayEpochDay: epochDay(Date.parse(`${iso}T00:00:00Z`)),
      location: { status: "NOT_SET" }, featuredPuja: VINAYAKA_PUJA,
    }),
  );
}

test("FAMILY_BETA home shows no festival countdown block, before, on, or after the pilot date", () => {
  for (const iso of ["2026-09-04", "2026-09-14", "2026-09-20"]) {
    const html = familyHome(iso);
    assert.doesNotMatch(html, /class="countdown"/);
    assert.doesNotMatch(html, /date passed/i);
    assert.doesNotMatch(html, /pilot data/i);
  }
});

test("the reviewer festival diagnostic never shows a negative day count", () => {
  const html = render(
    React.createElement(page.HomeScreen, {
      setScreen: noop, openPreparation: noop, reviewMode: true, mode: "SELF",
      participantCount: 1, materialsReady: 0,
      todayEpochDay: epochDay(Date.parse("2026-12-01T00:00:00Z")), // well past the pilot date
      location: { status: "NOT_SET" }, featuredPuja: VINAYAKA_PUJA,
    }),
  );
  assert.match(html, /Reviewer diagnostics/);
  assert.doesNotMatch(html, /-\d+ days/);
  assert.doesNotMatch(html, /−/);
});
