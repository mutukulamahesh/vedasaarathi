import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

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

const policyMod = await vite.ssrLoadModule("/lib/speech/narration-policy.ts");
const {
  DEVICE_NARRATION_NOTE, NARRATION_UNAVAILABLE_NOTE, TELUGU_VOICE_UNAVAILABLE_NOTE,
  getNarrationText,
} = policyMod;
const stepsMod = await vite.ssrLoadModule("/lib/content/steps.ts");
const { RITUAL_STEPS } = stepsMod;
const provenanceMod = await vite.ssrLoadModule("/lib/content/provenance.ts");
const { canDisplayAsGuidance } = provenanceMod;

const draftStep = {
  what: "Do the thing.",
  how: "Carefully.",
  teluguInstruction: "జాగ్రత్తగా చేయండి.",
  reviewStatus: "REVIEW_REQUIRED",
};

const approvedStep = {
  what: "Sit comfortably.",
  how: "Keep materials nearby.",
  teluguInstruction: "సౌకర్యంగా కూర్చోండి.",
  reviewStatus: "GENERAL_GUIDANCE",
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
/* The narration gate can never say more than the visible text already shows  */
/* -------------------------------------------------------------------------- */

test("narration availability exactly matches the visible What/How/Why gate for every real step", () => {
  for (const step of RITUAL_STEPS) {
    const approved = canDisplayAsGuidance(step.reviewStatus, step.provenance);
    for (const reviewMode of [true, false]) {
      const mayShowInstructions = approved || (reviewMode && step.reviewStatus === "REVIEW_REQUIRED");
      const narrates =
        getNarrationText(step, { language: "EN", approved, reviewMode }) !== null;
      assert.equal(narrates, mayShowInstructions, `${step.id} reviewMode=${reviewMode}`);
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
