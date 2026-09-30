// The premature Sankalpam preview (real-browser-observed defect, FAMILY mode).
//
// Reported: a participant has Gotra UNKNOWN, "Not decided yet" is selected
// in Sankalpam setup, "Begin the puja" correctly stays disabled - but the
// Telugu and transliterated Sankalpam text was already visible under "Your
// Sankalpam so far" (the "Change details" screen's own inline preview). Root
// cause: the generator (lib/sankalpam/generator.ts) OMITS the unresolved
// Gotra clause entirely rather than blocking output, so the assembled text
// read as a smooth, complete-looking sentence even though a required choice
// was still open.
//
// This is an INTERACTIVE test (real navigation + real radio-button clicks,
// the same JSDOM + React harness already established in
// tests/sankalpam-adhika-family-nav.test.mjs and
// tests/family-sankalpam-audio.test.mjs) because FAMILY mode's "Change
// details" subview is reached only via a real click (its default `view`
// state on mount is "ready", not "change") - it cannot be exercised through
// a single static SSR render the way SELF/GROUP mode's default screen can
// (covered instead in tests/sankalpam-setup.test.mjs).

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=\"app\"></div></body></html>", {
  url: "https://vedasaarathi.test/",
});
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
dom.window.speechSynthesis = {
  speak() {}, cancel() {}, getVoices() { return []; }, addEventListener() {}, removeEventListener() {},
};
globalThis.speechSynthesis = dom.window.speechSynthesis;
globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(t) { this.text = t; };

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const page = await vite.ssrLoadModule("/app/page.tsx");
const { defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { localWallToUtcMs } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
// Fictional participants, per the task's instruction to use fictional data.
const UNKNOWN_GOTRA_PARTICIPANT = {
  id: "p1", name: "Lakshmi",
  gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};

async function panchanga() {
  const dateMs = localWallToUtcMs(2026, 9, 14, 12, 0, 0, HYD.timezone);
  return panchangaForLocation(HYD, dateMs);
}

const L = {
  EN: {
    oneChoiceNeeded: "One choice is needed", ready: "Your Sankalpam is ready",
    changeDetails: "Change details", done: "Done", begin: "Begin the puja",
    pendingHint: "Make the choices above to continue.",
    leaveOut: "Leave the Gotra line out",
  },
  TE: {
    oneChoiceNeeded: "ఒక ఎంపిక అవసరం", ready: "మీ సంకల్పం సిద్ధంగా ఉంది",
    changeDetails: "వివరాలు మార్చండి", done: "పూర్తయింది", begin: "పూజ మొదలుపెట్టండి",
    pendingHint: "కొనసాగడానికి పైన ఎంపికలు చేయండి.",
    leaveOut: "గోత్రం లైన్ వదిలేయండి",
  },
};

/** Renders SankalpamSetupScreen fresh (simulating a page load / reload with
 * the given persisted `choices`) and returns handles for interacting with it. */
async function mount(language, choices) {
  const panchangaResult = await panchanga();
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  let setChoicesCalls = [];
  await act(async () => {
    r.render(React.createElement(page.SankalpamSetupScreen, {
      activeList: [UNKNOWN_GOTRA_PARTICIPANT], mode: "FAMILY", location: HYD, panchanga: panchangaResult,
      choices, setChoices: (next) => { setChoicesCalls.push(next); choices = next; },
      begin: () => {}, back: () => {}, purpose: "Vinayaka Chavithi puja", language,
    }));
  });
  const rerender = async () => {
    await act(async () => {
      r.render(React.createElement(page.SankalpamSetupScreen, {
        activeList: [UNKNOWN_GOTRA_PARTICIPANT], mode: "FAMILY", location: HYD, panchanga: panchangaResult,
        choices, setChoices: (next) => { setChoicesCalls.push(next); choices = next; },
        begin: () => {}, back: () => {}, purpose: "Vinayaka Chavithi puja", language,
      }));
    });
  };
  // el.click() (the native method), not a dispatched synthetic "click" Event:
  // a radio input's onChange only fires from the real click behaviour (which
  // also toggles `checked`) - a bare dispatched Event bubbles to React's
  // onClick delegation but never triggers onChange or the native toggle.
  const click = async (el) => {
    await act(async () => { el.click(); });
  };
  const findBtn = (text) => [...host.querySelectorAll("button")].find((b) => (b.textContent || "").includes(text));
  return { host, r, click, findBtn, rerender, getSetChoicesCalls: () => setChoicesCalls };
}

const hasAssembled = (host) => host.querySelector(".sankalpam-assembled") !== null;
const hasRoman = (host) => host.querySelector(".sankalpam-assembled-roman") !== null;

async function runPendingToResolvedFlow(language) {
  const t = L[language];
  const { host, click, findBtn, rerender } = await mount(language, defaultSankalpamChoices());

  // --- Ready (pending): Begin disabled, no recitable text anywhere on this screen ---
  assert.ok((host.textContent || "").includes(t.oneChoiceNeeded), "ready screen shows the pending heading");
  assert.ok(findBtn(t.begin).disabled, "Begin is disabled while pending");
  assert.ok(!hasAssembled(host), "the ready screen itself never showed recitable text (unaffected by this fix)");

  // --- Ready -> Change details: this is the screen that HAD the defect ---
  await click(findBtn(t.changeDetails));
  assert.ok(!hasAssembled(host), "Change details: recitable Telugu text is hidden while pending");
  assert.ok(!hasRoman(host), "Change details: transliteration is hidden while pending");
  assert.ok((host.textContent || "").includes(t.pendingHint), "Change details: the short pending-choice message is shown instead");

  // --- Resolve the ONE required choice (Leave the Gotra line out) ---
  const omitRadio = [...host.querySelectorAll('input[type="radio"]')]
    .find((el) => (el.closest("label")?.textContent || "").includes(t.leaveOut));
  assert.ok(omitRadio, `found the "${t.leaveOut}" radio`);
  await click(omitRadio);
  await rerender(); // choices changed via setChoices -> re-render with the new state, as the real app does

  // --- Change details, now resolved: the preview appears, with correct wording ---
  assert.ok(hasAssembled(host), "Change details: recitable text appears once the choice is resolved");
  assert.ok(hasRoman(host), "Change details: transliteration appears once the choice is resolved");
  assert.ok(!(host.textContent || "").includes(t.pendingHint), "the pending-choice message is gone once resolved");
  assert.ok(!/gotrasya/.test(host.querySelector(".sankalpam-assembled").textContent || ""),
    "the OMIT choice correctly has no Gotra clause at all (not a placeholder, the actual chosen wording)");

  // --- Done -> back to Ready: now genuinely ready, Begin enabled ---
  await click(findBtn(t.done));
  assert.ok((host.textContent || "").includes(t.ready), "back on the ready screen, now showing the ready heading");
  assert.ok(!findBtn(t.begin).disabled, "Begin is enabled now that the choice is resolved");
}

test("FAMILY (EN): pending Sankalpam hides recitable text in Change details; resolving it reveals the correct wording and enables Begin", async () => {
  await runPendingToResolvedFlow("EN");
});

test("FAMILY (TE): pending Sankalpam hides recitable text in Change details; resolving it reveals the correct wording and enables Begin", async () => {
  await runPendingToResolvedFlow("TE");
});

test("FAMILY: a saved UNRESOLVED choice set stays gated after a simulated reload (fresh mount, no prior interaction)", async () => {
  const { host, findBtn, click } = await mount("EN", defaultSankalpamChoices());
  assert.ok(findBtn(L.EN.begin).disabled, "Begin is disabled on first render from the saved (unresolved) state");
  await click(findBtn(L.EN.changeDetails));
  assert.ok(!hasAssembled(host), "a freshly-reloaded unresolved state still hides the recitable text");
});

test("FAMILY: a saved RESOLVED choice set restores correctly after a simulated reload (fresh mount, no prior interaction)", async () => {
  const resolved = { ...defaultSankalpamChoices(), unknownGotra: "KASHYAPA" };
  const { host, findBtn, click } = await mount("EN", resolved);
  assert.ok((host.textContent || "").includes(L.EN.ready), "a freshly-reloaded resolved state lands directly on the ready heading");
  assert.ok(!findBtn(L.EN.begin).disabled, "Begin is enabled immediately, no re-decision needed");
  await click(findBtn(L.EN.changeDetails));
  assert.ok(hasAssembled(host), "the restored resolved choice shows the correct preview immediately");
});
