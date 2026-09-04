// Interaction-level tests that need a real DOM: unmount cleanup and the
// voice-change handler both depend on React effects and event dispatch, which
// renderToStaticMarkup cannot exercise (it never runs effects or events).

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!doctype html><html><body><div id=\"app\"></div></body></html>",
  { url: "https://vedasaarathi.test/" },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// Node 21+ ships its own read-only global `navigator`; override it so React
// sees the jsdom one instead.
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.customElements = dom.window.customElements;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom implements core DOM/HTML but not the Web Speech API. A minimal fake
// utterance constructor is enough for lib/speech/controller.ts to build one.
globalThis.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.lang = "";
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onend = null;
    this.onerror = null;
  }
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createServer } = await import("vite");

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

const page = await vite.ssrLoadModule("/app/page.tsx");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");

function fakeSpeechSynthesis() {
  const calls = [];
  return {
    calls,
    getVoices: () => [],
    addEventListener() {},
    removeEventListener() {},
    speak() { calls.push("speak"); },
    cancel() { calls.push("cancel"); },
    pause() { calls.push("pause"); },
    resume() { calls.push("resume"); },
  };
}

async function mount(props) {
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(page.PujaScreen, props));
  });
  return { container, reactRoot };
}

function findButtonByText(container, text) {
  return [...container.querySelectorAll("button")].find((b) =>
    b.textContent.includes(text),
  );
}

const practicalStep = RITUAL_STEPS.find((s) => s.reviewStatus === "GENERAL_GUIDANCE");
const practicalIndex = RITUAL_STEPS.indexOf(practicalStep);

/* -------------------------------------------------------------------------- */
/* Unmount / navigation cancels active speech                                 */
/* -------------------------------------------------------------------------- */

test("unmounting PujaScreen cancels any active speech (covers the top Back button)", async () => {
  const synth = fakeSpeechSynthesis();
  globalThis.window.speechSynthesis = synth;

  const { container, reactRoot } = await mount({
    stepIndex: practicalIndex,
    setStepIndex: () => {},
    finish: () => {},
    path: "COMPLETE",
    language: "EN",
    setLanguage: () => {},
    activeList: [],
    reviewMode: false,
    voices: [{ voiceURI: "en-us", lang: "en-US", name: "Test" }],
  });

  // Start narration so there is something in progress to cancel.
  const playButton = findButtonByText(container, "Listen to plain instructions");
  await act(async () => {
    playButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.ok(synth.calls.includes("speak"));
  synth.calls.length = 0;

  // The Back button in the app header unmounts PujaScreen the same way any
  // navigation away from the puja screen does - React's unmount lifecycle is
  // identical regardless of what triggered it.
  await act(async () => {
    reactRoot.unmount();
  });

  assert.ok(synth.calls.includes("cancel"), "unmount must cancel active speech");
  container.remove();
});

test("unmounting with nothing playing still calls cancel (harmless, always safe)", async () => {
  const synth = fakeSpeechSynthesis();
  globalThis.window.speechSynthesis = synth;

  const { container, reactRoot } = await mount({
    stepIndex: practicalIndex,
    setStepIndex: () => {},
    finish: () => {},
    path: "COMPLETE",
    language: "EN",
    setLanguage: () => {},
    activeList: [],
    reviewMode: false,
    voices: [],
  });

  await act(async () => {
    reactRoot.unmount();
  });

  assert.ok(synth.calls.includes("cancel"));
  container.remove();
});

/* -------------------------------------------------------------------------- */
/* Changing the voice stops current narration                                 */
/* -------------------------------------------------------------------------- */

test("changing the selected voice stops current narration and resets playback to idle", async () => {
  const synth = fakeSpeechSynthesis();
  globalThis.window.speechSynthesis = synth;

  const voices = [
    { voiceURI: "en-us", lang: "en-US", name: "Samantha" },
    { voiceURI: "en-in", lang: "en-IN", name: "Veena" },
  ];

  const { container, reactRoot } = await mount({
    stepIndex: practicalIndex,
    setStepIndex: () => {},
    finish: () => {},
    path: "COMPLETE",
    language: "EN",
    setLanguage: () => {},
    activeList: [],
    reviewMode: false,
    voices,
  });

  const playButton = findButtonByText(container, "Listen to plain instructions");
  await act(async () => {
    playButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.ok(synth.calls.includes("speak"));
  assert.ok(findButtonByText(container, "Replay"), "button now reads Replay while playing");
  synth.calls.length = 0;

  const select = container.querySelector(".voice-select select");
  assert.ok(select, "the voice selector renders with two English voices available");
  select.value = "en-in";
  await act(async () => {
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });

  assert.ok(synth.calls.includes("cancel"), "changing voice stops current narration");
  assert.ok(
    findButtonByText(container, "Listen to plain instructions"),
    "playback resets to idle after a voice change",
  );
  assert.equal(select.value, "en-in", "the new voice preference took effect");

  const stored = JSON.parse(
    dom.window.localStorage.getItem("vedasaarathi:voice-preference:v1"),
  );
  assert.equal(stored.EN, "en-in", "the new voice choice was saved");

  reactRoot.unmount();
  container.remove();
});
