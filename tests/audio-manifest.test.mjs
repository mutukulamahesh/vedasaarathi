// The versioned, app-hosted audio manifest and its player:
//   - one PLAIN_INSTRUCTION EN asset per step; a TE asset ONLY where Telugu
//     source text exists; a MANTRA_CANDIDATE slot (Telugu only) per mantra step
//   - every asset stores its exact narration text + a stable textRef
//   - a Telugu asset is never English text
//   - every asset PLANNED today; fixed /audio/v1/ src
//   - the player never renders a browser-TTS control for a mantra; on load
//     failure it shows an error + fallback

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
const { stepGuidanceTe } = await vite.ssrLoadModule("/lib/content/step-guidance-te.ts");
const { AppAudioPlayer } = await vite.ssrLoadModule("/components/platform/audio-player.tsx");
const render = (el) => renderToStaticMarkup(el);
const TELUGU = /[ఀ-౿]/;

test("every step has an EN plain asset carrying the English draft text", () => {
  for (const step of RITUAL_STEPS) {
    const en = plainInstructionAudio(step.id, "EN");
    assert.ok(en, `${step.id} has an EN plain asset`);
    assert.equal(en.src, `/audio/${AUDIO_MANIFEST_VERSION}/${step.id}.en.plain.mp3`);
    assert.match(en.voice, /English/);
    assert.ok(en.text.includes(step.how.split(" ").slice(0, 3).join(" ")), "EN text is the English draft");
    assert.match(en.textRef, /RitualStep\.what/);
  }
});

test("a TE plain asset exists only where Telugu source text exists, and it is Telugu", () => {
  for (const step of RITUAL_STEPS) {
    const te = plainInstructionAudio(step.id, "TE");
    const hasSource = Boolean(stepGuidanceTe(step.id)?.whatToDo);
    assert.equal(Boolean(te), hasSource, `${step.id}: TE asset presence matches Telugu source text`);
    if (te) {
      assert.ok(TELUGU.test(te.text), `${step.id}: TE asset text is Telugu script`);
      assert.equal(te.text, stepGuidanceTe(step.id).whatToDo.trim());
      assert.match(te.textRef, /step-guidance-te/);
    }
  }
});

test("no Telugu asset carries the English asset's text", () => {
  for (const step of RITUAL_STEPS) {
    const en = plainInstructionAudio(step.id, "EN");
    const te = plainInstructionAudio(step.id, "TE");
    if (en && te) assert.notEqual(en.text.trim(), te.text.trim());
  }
});

test("every mantra step - and only a mantra step - has a Telugu MANTRA_CANDIDATE slot with the sourced mantra text", () => {
  for (const step of RITUAL_STEPS) {
    const slot = mantraCandidateAudio(step.id);
    if (step.mantraTeluguScript) {
      assert.ok(slot, `${step.id} has a mantra-audio slot`);
      assert.equal(slot.language, "TE");
      assert.equal(slot.kind, "MANTRA_CANDIDATE");
      assert.equal(slot.src, `/audio/${AUDIO_MANIFEST_VERSION}/${step.id}.mantra.te.mp3`);
      assert.equal(slot.text, step.mantraTeluguScript, "mantra asset text is the sourced Telugu, byte-for-byte");
      assert.match(slot.textRef, /mantraTeluguScript/);
    } else {
      assert.equal(slot, null, `${step.id} (no mantra) has no mantra-audio slot`);
    }
  }
});

test("no audio file is bundled yet: every asset is PLANNED", () => {
  const s = audioManifestSummary();
  assert.equal(s.version, "v1");
  assert.equal(s.ready, 0);
  assert.equal(s.planned, s.total);
  assert.equal(s.total, AUDIO_MANIFEST.length);
  assert.ok(s.mantraSlots > 0 && s.tePlain > 0 && s.enPlain === RITUAL_STEPS.length);
  for (const a of AUDIO_MANIFEST) {
    assert.equal(audioAssetReady(a), false);
    assert.ok(a.text && a.text.trim().length > 0, `${a.src} has narration text`);
  }
});

test("the player shows a pending note and no controls while the asset is PLANNED", () => {
  const asset = plainInstructionAudio(RITUAL_STEPS[2].id, "EN");
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset, title: "Listen to plain instructions", pendingNote: "AUDIO PENDING MARKER",
      fallback: React.createElement("div", { className: "the-fallback" }, "device voice"),
    }),
  );
  assert.match(html, /AUDIO PENDING MARKER/);
  assert.match(html, /class="the-fallback"/);
  assert.doesNotMatch(html, /<audio/);
  assert.doesNotMatch(html, /app-audio-button/);
});

test("a MANTRA_CANDIDATE player never renders a fallback or a browser-TTS control", () => {
  const mantraStep = RITUAL_STEPS.find((s) => s.mantraTeluguScript);
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset: mantraCandidateAudio(mantraStep.id), title: "Play the mantra", pendingNote: "MANTRA PENDING MARKER",
    }),
  );
  assert.match(html, /MANTRA PENDING MARKER/);
  assert.doesNotMatch(html, /audio-button/);
  assert.doesNotMatch(html, /the-fallback/);
});

test("a GENERATED asset renders a real <audio> element with Play / Pause / Replay / Stop", () => {
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

test("the player passes localised strings through and can render an error/fallback state", () => {
  const generated = { ...plainInstructionAudio(RITUAL_STEPS[2].id, "EN"), status: "GENERATED" };
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset: generated, title: "వినండి", pendingNote: "x", errorNote: "లోడ్ కాలేదు",
      strings: { replay: "మళ్ళీ", pause: "ఆపు", resume: "కొనసాగించు", stop: "ఆపివేయి", candidateNote: "c" },
    }),
  );
  assert.match(html, /వినండి/);
  assert.match(html, /ఆపు<\/button>/);
  assert.match(html, /ఆపివేయి<\/button>/);
});
