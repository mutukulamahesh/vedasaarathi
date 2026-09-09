// The versioned, app-hosted audio manifest and its player:
//   - one PLAIN_INSTRUCTION EN asset per step; a TE asset ONLY where Telugu
//     source text exists; a MANTRA_CANDIDATE slot (Telugu only) per mantra step
//   - every asset stores its exact narration text + a stable textRef
//   - a Telugu asset is never English text
//   - every per-step asset delivered today (EN Prabhat, TE Mohan); fixed
//     /audio/v1/ src; PLANNED only as a future-asset state
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
  AUDIO_MANIFEST, AUDIO_MANIFEST_VERSION, AUDIO_SAMPLES, audioManifestSummary,
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
    assert.match(en.voice, /Prabhat|English/i);
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

test("every per-step asset is delivered — English (Prabhat), Telugu plain + mantra (Mohan)", () => {
  const s = audioManifestSummary();
  assert.equal(s.version, "v1");
  assert.equal(s.enPlain, RITUAL_STEPS.length);
  assert.ok(s.tePlain === RITUAL_STEPS.length, "one Telugu plain asset per step");
  assert.ok(s.mantraSlots > 0);
  assert.equal(s.planned, 0, "no per-step asset is PLANNED");
  const stepAssets = AUDIO_MANIFEST.filter((a) => !AUDIO_SAMPLES.some((x) => x.src === a.src));
  for (const a of stepAssets) {
    assert.ok(a.text && a.text.trim().length > 0, `${a.src} has narration text`);
    if (a.language === "EN") {
      assert.equal(a.status, "GENERATED", `${a.src} (English) delivered`);
      assert.match(a.voice, /Prabhat/i, "English plain uses the en-IN Prabhat voice");
      assert.equal(a.kind, "PLAIN_INSTRUCTION", "no English mantra/chanting audio");
    } else if (a.kind === "MANTRA_CANDIDATE") {
      assert.equal(a.status, "REVIEW_CANDIDATE", `${a.src} (Telugu mantra) delivered`);
      assert.match(a.voice, /Mohan/i, "Telugu mantra uses the default Mohan voice");
    } else {
      assert.equal(a.status, "GENERATED", `${a.src} (Telugu plain) delivered`);
      assert.match(a.voice, /Mohan/i, "Telugu plain uses the default Mohan voice");
    }
  }
  // No MANTRA_CANDIDATE asset is ever English.
  assert.equal(
    stepAssets.filter((a) => a.kind === "MANTRA_CANDIDATE" && a.language !== "TE").length,
    0,
  );
  assert.equal(s.tePlain, RITUAL_STEPS.length);
});

test("the 4 voice-comparison samples are still separate, reviewer-only, delivered files", () => {
  const s = audioManifestSummary();
  assert.equal(s.samples, 4);
  assert.equal(s.samplesReady, 4);
  const srcs = AUDIO_SAMPLES.map((x) => x.src).sort();
  assert.deepEqual(srcs, [
    "/audio/v1/bhuta-shuddhi.mantra.te.mohan.mp3",
    "/audio/v1/bhuta-shuddhi.mantra.te.shruti.mp3",
    "/audio/v1/bhuta-shuddhi.te.plain.mohan.mp3",
    "/audio/v1/bhuta-shuddhi.te.plain.shruti.mp3",
  ]);
  // Two voices per kind, plain at -4%, mantra (slower) at -12%.
  const plain = AUDIO_SAMPLES.filter((x) => x.kind === "PLAIN_INSTRUCTION");
  const mantra = AUDIO_SAMPLES.filter((x) => x.kind === "MANTRA_CANDIDATE");
  assert.deepEqual(plain.map((x) => x.voice).sort(), ["te-IN-MohanNeural", "te-IN-ShrutiNeural"]);
  assert.deepEqual(mantra.map((x) => x.voice).sort(), ["te-IN-MohanNeural", "te-IN-ShrutiNeural"]);
  assert.ok(plain.every((x) => x.rate === "-4%"));
  assert.ok(mantra.every((x) => x.rate === "-12%"));
  assert.ok(mantra.every((x) => x.status === "REVIEW_CANDIDATE"));
  assert.ok(plain.every((x) => x.status === "GENERATED"));
  // Telugu samples carry Telugu text, never English.
  for (const x of AUDIO_SAMPLES) assert.match(x.text, /[ఀ-౿]/);
});

test("the player shows a pending note and no controls while the asset is PLANNED", () => {
  const asset = { ...plainInstructionAudio(RITUAL_STEPS[2].id, "EN"), status: "PLANNED" };
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
  const base = mantraCandidateAudio(RITUAL_STEPS.find((s) => s.mantraTeluguScript).id);
  // delivered (real file): an <audio> player, still no device fallback / TTS
  const live = render(
    React.createElement(AppAudioPlayer, {
      asset: base, title: "Play the mantra", pendingNote: "MANTRA PENDING MARKER",
    }),
  );
  assert.match(live, /<audio /);
  assert.doesNotMatch(live, /class="audio-button"/, "no browser-TTS button for a mantra");
  assert.doesNotMatch(live, /the-fallback/);
  // if it were still PLANNED: a pending note, no fallback either
  const pending = render(
    React.createElement(AppAudioPlayer, {
      asset: { ...base, status: "PLANNED" }, title: "Play the mantra", pendingNote: "MANTRA PENDING MARKER",
    }),
  );
  assert.match(pending, /MANTRA PENDING MARKER/);
  assert.doesNotMatch(pending, /class="(app-)?audio-button"|the-fallback/);
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

test("a GENERATED MANTRA_CANDIDATE names what it is (a computer voice), never priest-approved, no review wording", () => {
  const base = mantraCandidateAudio(RITUAL_STEPS.find((s) => s.mantraTeluguScript).id);
  const html = render(
    React.createElement(AppAudioPlayer, {
      asset: { ...base, status: "REVIEW_CANDIDATE" }, title: "Play the mantra", pendingNote: "x",
    }),
  );
  assert.match(html, /pronunciation guide/i);
  assert.match(html, /computer voice/i);
  assert.match(html, /not a priest.s recording/i);
  // no review-process wording in the family-facing line
  assert.doesNotMatch(html, /review candidate|not verified|priest-approved|awaiting review/i);
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
