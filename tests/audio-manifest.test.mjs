// The versioned, app-hosted audio manifest and its player:
//   - one PLAIN_INSTRUCTION asset per step per language
//   - a separate MANTRA_CANDIDATE slot for every mantra step (Telugu only)
//   - every asset PLANNED today (no MP3 bundled), with a fixed /audio/v1/ src
//   - the player shows an honest pending note and NEVER a browser-TTS control
//     for a mantra; the device voice is only a plain-instruction fallback

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

const {
  AUDIO_MANIFEST, AUDIO_MANIFEST_VERSION, audioManifestSummary,
  plainInstructionAudio, mantraCandidateAudio, audioAssetReady,
} = await vite.ssrLoadModule("/lib/audio/manifest.ts");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");
const { AppAudioPlayer } = await vite.ssrLoadModule("/components/platform/audio-player.tsx");
const render = (el) => renderToStaticMarkup(el);

test("every step has an EN and a TE plain-instruction asset", () => {
  for (const step of RITUAL_STEPS) {
    const en = plainInstructionAudio(step.id, "EN");
    const te = plainInstructionAudio(step.id, "TE");
    assert.ok(en && te, `${step.id} has both plain assets`);
    assert.equal(en.kind, "PLAIN_INSTRUCTION");
    assert.equal(en.src, `/audio/${AUDIO_MANIFEST_VERSION}/${step.id}.en.plain.mp3`);
    assert.equal(te.src, `/audio/${AUDIO_MANIFEST_VERSION}/${step.id}.te.plain.mp3`);
    assert.match(en.voice, /English/);
    assert.match(te.voice, /Telugu/);
  }
});

test("every mantra step - and only a mantra step - has a Telugu MANTRA_CANDIDATE slot", () => {
  for (const step of RITUAL_STEPS) {
    const slot = mantraCandidateAudio(step.id);
    if (step.mantraTeluguScript) {
      assert.ok(slot, `${step.id} has a mantra-audio slot`);
      assert.equal(slot.language, "TE");
      assert.equal(slot.kind, "MANTRA_CANDIDATE");
      assert.equal(slot.src, `/audio/${AUDIO_MANIFEST_VERSION}/${step.id}.mantra.te.mp3`);
      assert.match(slot.sourceTextRef, /mantraTeluguScript/);
    } else {
      assert.equal(slot, null, `${step.id} (no mantra) has no mantra-audio slot`);
    }
  }
});

test("no audio file is bundled yet: every asset is PLANNED", () => {
  const summary = audioManifestSummary();
  assert.equal(summary.version, "v1");
  assert.equal(summary.ready, 0);
  assert.equal(summary.planned, summary.total);
  assert.equal(summary.total, AUDIO_MANIFEST.length);
  assert.ok(summary.mantraSlots > 0);
  for (const a of AUDIO_MANIFEST) assert.equal(audioAssetReady(a), false);
});

test("the player shows a pending note and no controls while the asset is PLANNED", () => {
  const asset = plainInstructionAudio(RITUAL_STEPS[2].id, "TE");
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset, title: "Listen to plain instructions", pendingNote: "AUDIO PENDING MARKER",
      fallback: React.createElement("div", { className: "the-fallback" }, "device voice here"),
    }),
  );
  assert.match(html, /AUDIO PENDING MARKER/);
  assert.match(html, /class="the-fallback"/, "the plain-instruction fallback is rendered");
  assert.doesNotMatch(html, /<audio/, "no <audio> element until a file exists");
  assert.doesNotMatch(html, /app-audio-button/);
});

test("a MANTRA_CANDIDATE player never renders a fallback and never a browser-TTS control", () => {
  const mantraStep = RITUAL_STEPS.find((s) => s.mantraTeluguScript);
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset: mantraCandidateAudio(mantraStep.id),
      title: "Play the mantra",
      pendingNote: "MANTRA PENDING MARKER",
    }),
  );
  assert.match(html, /MANTRA PENDING MARKER/);
  assert.doesNotMatch(html, /audio-button/, "no device-narration button for a mantra");
  assert.doesNotMatch(html, /the-fallback/);
});

test("a GENERATED asset renders a real <audio> element with Play / Pause / Replay / Stop", () => {
  // Simulate a delivered file by constructing a GENERATED asset shape.
  const base = plainInstructionAudio(RITUAL_STEPS[2].id, "EN");
  const generated = { ...base, status: "GENERATED" };
  assert.equal(audioAssetReady(generated), true);
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset: generated, title: "Listen to plain instructions", pendingNote: "x",
    }),
  );
  assert.match(html, new RegExp(`<audio[^>]+src="${base.src.replace(/[/.]/g, "\\$&")}"`));
  assert.match(html, /class="app-audio-button"/);
  assert.match(html, />\s*Pause\s*<\/button>/);
  assert.match(html, />\s*Stop\s*<\/button>/);
  assert.doesNotMatch(html, /x<\/p>/, "no pending note once the file exists");
});

test("a GENERATED MANTRA_CANDIDATE is labelled a review candidate, never priest-approved", () => {
  const base = mantraCandidateAudio(RITUAL_STEPS.find((s) => s.mantraTeluguScript).id);
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset: { ...base, status: "REVIEW_CANDIDATE" }, title: "Play the mantra", pendingNote: "x",
    }),
  );
  assert.match(html, /review candidate/i);
  assert.match(html, /not verified or\s+priest-approved/i);
});
