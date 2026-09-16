// The playback-speed preference actually reaches the real <audio> elements:
// AppAudioPlayer (instruction/mantra) and FamilySankalpamPlayer (Part A,
// name prompt, Part B) - and stays correct after a speed change, a replay,
// and a track/step change (a fresh mount).

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
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.customElements = dom.window.customElements;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

dom.window.HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
dom.window.HTMLMediaElement.prototype.pause = function pause() {};
Object.defineProperty(dom.window.HTMLMediaElement.prototype, "currentTime", {
  get() { return 0; }, set() {}, configurable: true,
});

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const { AppAudioPlayer } = await vite.ssrLoadModule("/components/platform/audio-player.tsx");
const { FamilySankalpamPlayer } = await vite.ssrLoadModule("/components/platform/family-sankalpam-player.tsx");
const { setPlaybackSpeed } = await vite.ssrLoadModule("/lib/storage/playback-speed.ts");
const { generateSankalpam } = await vite.ssrLoadModule("/lib/sankalpam/generator.ts");

function readyAsset(over = {}) {
  return {
    stepId: "demo", language: "TE", kind: "PLAIN_INSTRUCTION",
    src: "/audio/v1/demo.te.plain.mp3", status: "GENERATED",
    voice: "te-IN-MohanNeural", text: "కొంత తెలుగు వచనం", textRef: "test", contentVersion: "1",
    ...over,
  };
}

async function mount(element) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const reactRoot = createRoot(host);
  await act(async () => { reactRoot.render(element); });
  return { host, reactRoot };
}

test("AppAudioPlayer applies the saved speed to its <audio> element, and re-applies it after a change", async () => {
  setPlaybackSpeed(1.1);
  const { host, reactRoot } = await mount(
    React.createElement(AppAudioPlayer, { asset: readyAsset(), title: "Play", pendingNote: "pending" }),
  );
  const audioEl = host.querySelector("audio");
  assert.equal(audioEl.playbackRate, 1.1);
  assert.equal(audioEl.preservesPitch, true);

  await act(async () => { setPlaybackSpeed(1); });
  assert.equal(audioEl.playbackRate, 1, "every mounted player re-applies a live speed change");

  await act(async () => { reactRoot.unmount(); });
  setPlaybackSpeed(1.1); // restore the default for later tests
});

test("AppAudioPlayer keeps the correct speed on a fresh mount for a new track (step/language change)", async () => {
  setPlaybackSpeed(1);
  const { host: host1, reactRoot: root1 } = await mount(
    React.createElement(AppAudioPlayer, { asset: readyAsset({ src: "/audio/v1/a.mp3" }), title: "Play", pendingNote: "pending" }),
  );
  assert.equal(host1.querySelector("audio").playbackRate, 1);
  await act(async () => { root1.unmount(); });

  // A different asset (as if Next moved to a new step) - a fresh mount, same
  // stored preference, must still apply it correctly.
  const { host: host2, reactRoot: root2 } = await mount(
    React.createElement(AppAudioPlayer, { asset: readyAsset({ src: "/audio/v1/b.mp3" }), title: "Play", pendingNote: "pending" }),
  );
  assert.equal(host2.querySelector("audio").playbackRate, 1);
  await act(async () => { root2.unmount(); });
  setPlaybackSpeed(1.1);
});

const BASE_SANKALPAM_INPUT = {
  purpose: "Vinayaka Chavithi puja",
  deity: "Sri Maha Ganapati",
  purposeTe: "వినాయక చవితి పూజ",
  deityTe: "శ్రీ మహాగణపతి",
  groupMode: "FAMILY",
  people: [{ name: "", lineage: { gotra: { status: "UNKNOWN" }, veda: { status: "UNKNOWN" }, sutra: { status: "UNKNOWN" }, sampradaya: { status: "UNKNOWN" } } }],
  place: {},
  localDateISO: "2026-09-14",
};
const STANDARD_CHOICES = { calendarForm: "SHORT", placeDetail: "OMIT", unknownGotra: "OMIT", familyGotra: "", groupRecitation: null };
const FULL_PANCHANGA = {
  samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", masa: "Bhadraba",
  paksha: "Shukla", tithi: "Chaturthi", vaara: "Somavara", nakshatra: "Hasta",
};

test("FamilySankalpamPlayer applies the saved speed to all three clips (Part A, name prompt, Part B)", async () => {
  setPlaybackSpeed(1.1);
  const gen = generateSankalpam({ ...BASE_SANKALPAM_INPUT, panchanga: {}, choices: STANDARD_CHOICES });
  const { host, reactRoot } = await mount(
    React.createElement(FamilySankalpamPlayer, { gen, language: "TE" }),
  );
  const audios = [...host.querySelectorAll("audio")];
  assert.equal(audios.length, 3, "the standard short family form must match the fixed audio (familyAudioMatchesGen) so all 3 clips render");
  for (const el of audios) {
    assert.equal(el.playbackRate, 1.1, `${el.getAttribute("src")} should be at 1.1x`);
  }
  await act(async () => { reactRoot.unmount(); });
});

test("regression: switching from an unsupported form to the standard short form (same component instance, no remount) still applies the saved speed to the newly-mounted clips", async () => {
  // 1.1x, not 1x: the browser's own <audio> default IS 1, so testing with 1
  // would pass even if the fix never ran (a real bug this test hit once -
  // silently skipping applyPlaybackSpeed leaves playbackRate at its default
  // of 1, which is indistinguishable from "correctly set to 1"). 1.1 has no
  // such default-value confusion.
  setPlaybackSpeed(1.1);
  const mismatchedGen = generateSankalpam({
    ...BASE_SANKALPAM_INPUT, panchanga: FULL_PANCHANGA,
    choices: { ...STANDARD_CHOICES, calendarForm: "FULL_DATED" },
  });
  const standardGen = generateSankalpam({ ...BASE_SANKALPAM_INPUT, panchanga: {}, choices: STANDARD_CHOICES });

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const reactRoot = createRoot(host);

  // First render: mismatched form - no <audio> elements at all, just the
  // "switch to that form" offer.
  await act(async () => {
    reactRoot.render(React.createElement(FamilySankalpamPlayer, { gen: mismatchedGen, language: "EN" }));
  });
  assert.equal(host.querySelectorAll("audio").length, 0, "no audio elements exist yet for the mismatched form");
  assert.ok(host.textContent.includes("standard"), "shows the switch-to-standard-form offer");

  // Re-render the SAME root with the standard form - exactly what happens
  // when the user clicks "Switch to that form" and the parent updates
  // `choices`, WITHOUT this component ever unmounting.
  await act(async () => {
    reactRoot.render(React.createElement(FamilySankalpamPlayer, { gen: standardGen, language: "EN" }));
  });
  const audios = [...host.querySelectorAll("audio")];
  assert.equal(audios.length, 3, "the three clips now mount for the first time on this same component instance");
  for (const el of audios) {
    assert.equal(el.playbackRate, 1.1, `${el.getAttribute("src")} must carry the saved speed even though it just mounted mid-lifecycle, not at first render`);
  }

  await act(async () => { reactRoot.unmount(); });
  setPlaybackSpeed(1.1); // restore the default for any later tests
});
