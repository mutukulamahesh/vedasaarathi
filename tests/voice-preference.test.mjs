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

const mod = await vite.ssrLoadModule("/lib/storage/voice-preference.ts");
const {
  emptyVoicePreference, loadVoicePreference, parseVoicePreference,
  saveVoiceChoice, saveVoicePreference, serializeVoicePreference,
} = mod;

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    raw: map,
  };
}

test("selected voice persists locally and round-trips exactly", () => {
  const store = makeFakeStorage();
  saveVoicePreference({ EN: "en-in", TE: "te-in-voice" }, store);
  const loaded = loadVoicePreference(store);
  assert.deepEqual(loaded, { EN: "en-in", TE: "te-in-voice" });
});

test("saveVoiceChoice updates one language without touching the other", () => {
  const store = makeFakeStorage();
  saveVoiceChoice("EN", "en-in", store);
  const afterEnglish = loadVoicePreference(store);
  assert.deepEqual(afterEnglish, { EN: "en-in", TE: null });

  saveVoiceChoice("TE", "te-in", store);
  const afterTelugu = loadVoicePreference(store);
  assert.deepEqual(afterTelugu, { EN: "en-in", TE: "te-in" });
});

test("only a voice identifier is stored, never narrated text", () => {
  const store = makeFakeStorage();
  saveVoiceChoice("EN", "en-in", store);
  const stored = store.raw.get("vedasaarathi:voice-preference:v1");
  const parsed = JSON.parse(stored);
  assert.deepEqual(Object.keys(parsed).sort(), ["EN", "TE"]);
  assert.equal(parsed.EN, "en-in");
  // No step text, no "what"/"how"/"why", no participant data anywhere in the record.
  assert.doesNotMatch(stored, /[a-z]{20,}/i, "no long narrated-text strings leak into storage");
});

test("damaged or empty saved data falls back to a clean preference", () => {
  assert.deepEqual(parseVoicePreference(null), emptyVoicePreference());
  assert.deepEqual(parseVoicePreference("{not json"), emptyVoicePreference());
  assert.deepEqual(parseVoicePreference("[]"), emptyVoicePreference());
  assert.deepEqual(parseVoicePreference(JSON.stringify({ EN: 42, TE: "" })), emptyVoicePreference());
});

test("serializeProgress-style round trip via the exported helpers", () => {
  const pref = { EN: "en-in", TE: null };
  assert.deepEqual(parseVoicePreference(serializeVoicePreference(pref)), pref);
});
