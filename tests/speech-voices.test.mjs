import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const voicesMod = await vite.ssrLoadModule("/lib/speech/voices.ts");
const {
  englishVoices, getVoicesSnapshot, preferredVoice, resolveVoice,
  selectEnglishVoice, selectTeluguVoice, subscribeToVoices, teluguVoices,
  voicesForLanguage,
} = voicesMod;

function voice(voiceURI, lang, name = voiceURI, extra = {}) {
  return { voiceURI, lang, name, ...extra };
}

/* -------------------------------------------------------------------------- */
/* Telugu selection                                                           */
/* -------------------------------------------------------------------------- */

test("an exact te-IN voice is selected first among several Telugu voices", () => {
  const voices = [
    voice("te-generic", "te", "Generic Telugu"),
    voice("te-in-1", "te-IN", "Lekha"),
    voice("te-in-2", "TE-in", "Another Telugu (different case)"),
  ];
  const picked = selectTeluguVoice(voices);
  assert.equal(picked.voiceURI, "te-in-1", "the first exact te-IN match wins");
});

test("another Telugu voice is accepted when no exact te-IN voice exists", () => {
  const voices = [
    voice("en-us", "en-US"),
    voice("te-other", "te-Latn", "Telugu (transliterated)"),
  ];
  const picked = selectTeluguVoice(voices);
  assert.equal(picked.voiceURI, "te-other");
});

test("English, Hindi and generic default voices are rejected for Telugu", () => {
  const voices = [
    voice("en-us", "en-US", "Samantha"),
    voice("hi-in", "hi-IN", "Lekha Hindi"),
    voice("default", "en-GB", "System Default", { default: true }),
  ];
  assert.equal(selectTeluguVoice(voices), null);
  assert.deepEqual(teluguVoices(voices), []);
});

test("Telugu audio has no usable voice when the device offers none", () => {
  const voices = [voice("en-us", "en-US"), voice("hi-in", "hi-IN")];
  assert.equal(resolveVoice(voices, "TE", null), null);
  assert.equal(preferredVoice(voices, "TE"), null);
  // This is exactly what the UI checks to disable the Telugu audio button.
  const teluguVoiceMissing = "TE" === "TE" && !resolveVoice(voices, "TE", null);
  assert.equal(teluguVoiceMissing, true);
});

/* -------------------------------------------------------------------------- */
/* English selection                                                          */
/* -------------------------------------------------------------------------- */

test("en-IN is preferred for English narration", () => {
  const voices = [
    voice("en-us", "en-US", "Samantha"),
    voice("en-in", "en-IN", "Veena"),
    voice("en-gb", "en-GB", "Daniel"),
  ];
  assert.equal(selectEnglishVoice(voices).voiceURI, "en-in");
});

test("falls back to another Indian-English-by-name voice before a plain English one", () => {
  const voices = [
    voice("en-us", "en-US", "Samantha"),
    voice("en-india-named", "en-GB", "Heera - English (India)"),
  ];
  assert.equal(selectEnglishVoice(voices).voiceURI, "en-india-named");
});

test("falls back to another English voice when no Indian English voice exists", () => {
  const voices = [voice("en-gb", "en-GB", "Daniel"), voice("en-us", "en-US", "Samantha")];
  assert.equal(selectEnglishVoice(voices).voiceURI, "en-gb");
});

test("English selection never returns a non-English voice", () => {
  const voices = [voice("te-in", "te-IN"), voice("hi-in", "hi-IN")];
  assert.equal(selectEnglishVoice(voices), null);
  assert.deepEqual(englishVoices(voices), []);
});

/* -------------------------------------------------------------------------- */
/* Voice lists never mix languages                                            */
/* -------------------------------------------------------------------------- */

test("voicesForLanguage never mixes English and Telugu voices", () => {
  const voices = [
    voice("en-us", "en-US"), voice("en-in", "en-IN"),
    voice("te-in", "te-IN"), voice("hi-in", "hi-IN"),
  ];
  const te = voicesForLanguage(voices, "TE");
  const en = voicesForLanguage(voices, "EN");
  assert.deepEqual(te.map((v) => v.voiceURI), ["te-in"]);
  assert.deepEqual(en.map((v) => v.voiceURI), ["en-us", "en-in"]);
});

/* -------------------------------------------------------------------------- */
/* Saved-preference resolution                                                */
/* -------------------------------------------------------------------------- */

test("resolveVoice uses the saved voice when it is still present for that language", () => {
  const voices = [voice("en-us", "en-US"), voice("en-in", "en-IN")];
  assert.equal(resolveVoice(voices, "EN", "en-us").voiceURI, "en-us");
});

test("resolveVoice falls back to the preferred voice when the saved one is gone", () => {
  const voices = [voice("en-us", "en-US"), voice("en-in", "en-IN")];
  assert.equal(resolveVoice(voices, "EN", "no-longer-installed").voiceURI, "en-in");
});

test("resolveVoice never returns a saved voice from the other language", () => {
  const voices = [voice("en-in", "en-IN"), voice("te-in", "te-IN")];
  // A Telugu voiceURI saved under EN must not leak through for English.
  const resolved = resolveVoice(voices, "EN", "te-in");
  assert.equal(resolved.voiceURI, "en-in");
});

/* -------------------------------------------------------------------------- */
/* voiceschanged refreshes the available list                                 */
/* -------------------------------------------------------------------------- */

test("subscribeToVoices refreshes the snapshot after voiceschanged fires", () => {
  const hadWindow = "window" in globalThis;
  const originalWindow = globalThis.window;
  try {
    let currentVoices = [voice("en-us", "en-US")];
    const listeners = new Map();
    globalThis.window = {
      speechSynthesis: {
        getVoices: () => currentVoices,
        addEventListener: (type, handler) => listeners.set(type, handler),
        removeEventListener: (type) => listeners.delete(type),
      },
    };

    const first = getVoicesSnapshot();
    assert.deepEqual(first.map((v) => v.voiceURI), ["en-us"]);
    // Re-reading without a voiceschanged event returns the cached, stable value.
    assert.equal(getVoicesSnapshot(), first);

    let notified = 0;
    const unsubscribe = subscribeToVoices(() => { notified += 1; });

    // Simulate the browser loading the real list asynchronously.
    currentVoices = [voice("en-us", "en-US"), voice("te-in", "te-IN")];
    listeners.get("voiceschanged")();

    assert.equal(notified, 1);
    const refreshed = getVoicesSnapshot();
    assert.deepEqual(refreshed.map((v) => v.voiceURI), ["en-us", "te-in"]);
    assert.notEqual(refreshed, first, "snapshot reference changes after voiceschanged");

    unsubscribe();
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
});

test("getVoicesSnapshot is empty and stable when speechSynthesis is unavailable", () => {
  const hadWindow = "window" in globalThis;
  const originalWindow = globalThis.window;
  try {
    delete globalThis.window;
    const a = getVoicesSnapshot();
    const b = getVoicesSnapshot();
    assert.deepEqual(a, []);
    assert.equal(a, b, "stable empty reference, safe for useSyncExternalStore");
    assert.equal(typeof subscribeToVoices(() => {}), "function");
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
});
