import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const policyMod = await vite.ssrLoadModule("/lib/speech/narration-policy.ts");
const {
  DEVICE_NARRATION_NOTE, NARRATION_UNAVAILABLE_NOTE, TELUGU_VOICE_UNAVAILABLE_NOTE,
  getNarrationText,
} = policyMod;
const stepsMod = await vite.ssrLoadModule("/lib/content/steps.ts");
const { RITUAL_STEPS } = stepsMod;
const provenanceMod = await vite.ssrLoadModule("/lib/content/provenance.ts");
const { canDisplayAsGuidance } = provenanceMod;

// An unlocked REVIEW_REQUIRED candidate: narratable only in explicit review mode.
const draftStep = {
  what: "Do the thing.",
  how: "Carefully.",
  teluguInstruction: "జాగ్రత్తగా చేయండి.",
  reviewStatus: "REVIEW_REQUIRED",
  locked: false,
};

// Approved, unlocked guidance: always narratable.
const approvedStep = {
  what: "Sit comfortably.",
  how: "Keep materials nearby.",
  teluguInstruction: "సౌకర్యంగా కూర్చోండి.",
  reviewStatus: "GENERAL_GUIDANCE",
  locked: false,
};

// A locked step, e.g. Sankalpam: never narratable, in any review-mode state.
const lockedStep = {
  what: "State who is performing this puja and the purpose.",
  how: "Use only entered details.",
  teluguInstruction: "ఈ పూజను ఎవరు, ఎక్కడ, ఎందుకు చేస్తున్నారో సంకల్పంగా చెప్పండి.",
  reviewStatus: "REVIEW_REQUIRED",
  locked: true,
};

/* -------------------------------------------------------------------------- */
/* REVIEW_REQUIRED content cannot reach speech synthesis                      */
/* -------------------------------------------------------------------------- */

test("REVIEW_REQUIRED text never narrates when review mode is off", () => {
  for (const language of ["EN", "TE"]) {
    const text = getNarrationText(draftStep, { language, approved: false, reviewMode: false });
    assert.equal(text, null, language);
  }
});

test("REVIEW_REQUIRED text narrates only while review mode is explicitly on", () => {
  const en = getNarrationText(draftStep, { language: "EN", approved: false, reviewMode: true });
  assert.equal(en, "Do the thing. Carefully.");

  const te = getNarrationText(draftStep, { language: "TE", approved: false, reviewMode: true });
  assert.equal(te, draftStep.teluguInstruction);
});

test("approved content always narrates, review mode on or off", () => {
  for (const reviewMode of [true, false]) {
    const text = getNarrationText(approvedStep, { language: "EN", approved: true, reviewMode });
    assert.equal(text, "Sit comfortably. Keep materials nearby.");
  }
});

test("narration is never offered for a step with neither approval nor review mode", () => {
  // A non-REVIEW_REQUIRED but unapproved status (shouldn't happen in practice,
  // but the gate must still refuse rather than guess).
  const weird = { ...draftStep, reviewStatus: "PRIEST_REVIEWED_PRACTICE" };
  assert.equal(
    getNarrationText(weird, { language: "EN", approved: false, reviewMode: true }),
    null,
  );
});

/* -------------------------------------------------------------------------- */
/* A locked step is never narratable, in any review-mode state                */
/* -------------------------------------------------------------------------- */

test("getNarrationText returns null for a locked step with review mode off", () => {
  assert.equal(
    getNarrationText(lockedStep, { language: "EN", approved: false, reviewMode: false }),
    null,
  );
});

test("getNarrationText returns null for a locked step with review mode on", () => {
  assert.equal(
    getNarrationText(lockedStep, { language: "EN", approved: false, reviewMode: true }),
    null,
  );
  assert.equal(
    getNarrationText(lockedStep, { language: "TE", approved: false, reviewMode: true }),
    null,
  );
});

test("locked wins even over an (otherwise impossible) approved locked step", () => {
  // locked is checked first and unconditionally, so even if a future bug ever
  // marked a locked step approved, narration must still refuse it.
  const approvedButLocked = { ...lockedStep, reviewStatus: "GENERAL_GUIDANCE" };
  assert.equal(
    getNarrationText(approvedButLocked, { language: "EN", approved: true, reviewMode: true }),
    null,
  );
});

test("real locked steps in RITUAL_STEPS never narrate, review mode on or off", () => {
  const lockedRealSteps = RITUAL_STEPS.filter((step) => step.locked);
  assert.ok(lockedRealSteps.length > 0, "there is at least one locked step to check");
  for (const step of lockedRealSteps) {
    const approved = canDisplayAsGuidance(step.reviewStatus, step.provenance);
    for (const reviewMode of [true, false]) {
      assert.equal(
        getNarrationText(step, { language: "EN", approved, reviewMode }),
        null,
        `${step.id} reviewMode=${reviewMode}`,
      );
    }
  }
});

/* -------------------------------------------------------------------------- */
/* The narration gate can never say more than the visible text already shows  */
/* -------------------------------------------------------------------------- */

test("narration availability never exceeds the visible What/How/Why gate, and locked steps never narrate", () => {
  for (const step of RITUAL_STEPS) {
    const approved = canDisplayAsGuidance(step.reviewStatus, step.provenance);
    for (const reviewMode of [true, false]) {
      const mayShowInstructions = approved || (reviewMode && step.reviewStatus === "REVIEW_REQUIRED");
      const narrates =
        getNarrationText(step, { language: "EN", approved, reviewMode }) !== null;

      if (step.locked) {
        assert.equal(narrates, false, `${step.id} is locked and must never narrate`);
      } else {
        assert.equal(narrates, mayShowInstructions, `${step.id} reviewMode=${reviewMode}`);
      }
      // Narration can never be offered when the screen itself hides the text.
      if (narrates) {
        assert.equal(mayShowInstructions, true, `${step.id} narrated without visible text`);
      }
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Disclosure copy                                                            */
/* -------------------------------------------------------------------------- */

test("disclosure text never claims priest-reviewed pronunciation", () => {
  for (const text of [DEVICE_NARRATION_NOTE, NARRATION_UNAVAILABLE_NOTE, TELUGU_VOICE_UNAVAILABLE_NOTE]) {
    assert.doesNotMatch(text, /priest.?reviewed/i);
    assert.doesNotMatch(text, /approved pronunciation/i);
  }
  assert.match(DEVICE_NARRATION_NOTE, /device narration/i);
  assert.match(DEVICE_NARRATION_NOTE, /does not read mantras/i);
  assert.match(TELUGU_VOICE_UNAVAILABLE_NOTE, /not available on this device/i);
});
