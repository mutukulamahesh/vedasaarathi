import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const controllerMod = await vite.ssrLoadModule("/lib/speech/controller.ts");
const { SPEECH_PITCH, SPEECH_RATE, SPEECH_VOLUME, createSpeechController } = controllerMod;

function makeFakeSynth() {
  const calls = [];
  return {
    calls,
    speak(utterance) { calls.push(["speak", utterance]); },
    cancel() { calls.push(["cancel"]); },
    pause() { calls.push(["pause"]); },
    resume() { calls.push(["resume"]); },
  };
}

function makeUtteranceFactory() {
  const created = [];
  const factory = (text) => {
    const utterance = {
      text, lang: "", rate: 0, pitch: 0, volume: 0, voice: null,
      onend: null, onerror: null,
    };
    created.push(utterance);
    return utterance;
  };
  factory.created = created;
  return factory;
}

/* -------------------------------------------------------------------------- */
/* Conservative defaults                                                      */
/* -------------------------------------------------------------------------- */

test("speech defaults are conservative: rate near 0.85, pitch 1, volume 1", () => {
  assert.equal(SPEECH_RATE, 0.85);
  assert.equal(SPEECH_PITCH, 1);
  assert.equal(SPEECH_VOLUME, 1);
});

test("speak() applies the fixed defaults and the given voice/lang to every utterance", () => {
  const synth = makeFakeSynth();
  const factory = makeUtteranceFactory();
  const controller = createSpeechController(synth, factory);
  const voice = { voiceURI: "te-in", name: "Telugu", lang: "te-IN" };

  controller.speak("Namaskaram", voice, "te-IN");

  const [utterance] = factory.created;
  assert.equal(utterance.text, "Namaskaram");
  assert.equal(utterance.lang, "te-IN");
  assert.equal(utterance.rate, SPEECH_RATE);
  assert.equal(utterance.pitch, SPEECH_PITCH);
  assert.equal(utterance.volume, SPEECH_VOLUME);
  assert.equal(utterance.voice, voice);
});

/* -------------------------------------------------------------------------- */
/* Replay, pause, resume, stop                                                */
/* -------------------------------------------------------------------------- */

test("speak() cancels anything in progress before starting (replay behaviour)", () => {
  const synth = makeFakeSynth();
  const controller = createSpeechController(synth, makeUtteranceFactory());

  controller.speak("first", null, "en-US");
  controller.speak("second", null, "en-US"); // a "replay" while already speaking

  assert.deepEqual(
    synth.calls.map((c) => c[0]),
    ["cancel", "speak", "cancel", "speak"],
  );
});

test("pause() and resume() delegate to the synthesis engine", () => {
  const synth = makeFakeSynth();
  const controller = createSpeechController(synth, makeUtteranceFactory());

  controller.pause();
  controller.resume();

  assert.deepEqual(synth.calls, [["pause"], ["resume"]]);
});

test("stop() cancels narration entirely", () => {
  const synth = makeFakeSynth();
  const controller = createSpeechController(synth, makeUtteranceFactory());

  controller.speak("hello", null, "en-US");
  controller.stop();

  assert.deepEqual(
    synth.calls.map((c) => c[0]),
    ["cancel", "speak", "cancel"],
  );
});

test("onEnd and onError handlers are wired onto the utterance", () => {
  const synth = makeFakeSynth();
  const factory = makeUtteranceFactory();
  const controller = createSpeechController(synth, factory);

  let ended = false;
  controller.speak("hello", null, "en-US", { onEnd: () => { ended = true; } });

  const [utterance] = factory.created;
  assert.equal(typeof utterance.onend, "function");
  utterance.onend();
  assert.equal(ended, true);
  assert.equal(utterance.onerror, null);
});
