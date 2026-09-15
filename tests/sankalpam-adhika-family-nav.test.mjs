// The Adhika-month bilingual explanation must be visible wherever a family
// can land WITHOUT ever opening "Change details" - Ready, View Sankalpam and
// Practice all show it (once, as a plain note near the summary/text/player,
// reusing the existing hint styling), not only the calendar-detail form.
//
// This is an INTERACTIVE test (real navigation via setView, a React
// useState the SSR-only sankalpam-setup.test.mjs / sankalpam-masa.test.mjs
// suites cannot reach) - JSDOM + real DOM clicks, mirroring the harness
// already established in tests/family-sankalpam-audio.test.mjs.

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
const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};

// 26 May 2026, Hyderabad: the 2026 Adhika Jyeshtha window, verified directly
// against drikpanchang.com - see docs/temp/amanta-masa-validation-2026-09-14.md.
async function adhikaPanchanga() {
  const dateMs = localWallToUtcMs(2026, 5, 26, 12, 0, 0, HYD.timezone);
  return panchangaForLocation(HYD, dateMs);
}

const L = {
  EN: { view: "View Sankalpam", practise: "Hear and practise", back: "Back", noteFragment: "does not yet support the full dated" },
  TE: { view: "సంకల్పం చూడండి", practise: "వినండి, సాధన చేయండి", back: "వెనుకకు", noteFragment: "అధిక మాసానికి పూర్తి తిథి సంకల్ప పాఠం" },
};

async function runNavTest(language) {
  const t = L[language];
  const panchanga = await adhikaPanchanga();
  const setChoicesCalls = [];
  const initialChoices = defaultSankalpamChoices();
  assert.equal(initialChoices.calendarForm, "FULL_DATED", "fixture sanity check - the stored default is full dated");

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(page.SankalpamSetupScreen, {
      activeList: [PARTICIPANT], mode: "FAMILY", location: HYD, panchanga,
      choices: initialChoices, setChoices: (next) => setChoicesCalls.push(next),
      begin: () => {}, back: () => {}, purpose: "Vinayaka Chavithi puja", language,
    }));
  });

  const findBtn = (text) => [...host.querySelectorAll("button")].find((b) => (b.textContent || "").includes(text));
  const noteText = () => host.textContent || "";
  const teluguRecited = () => (host.querySelector(".sankalpam-assembled-line")?.textContent) || "";

  // --- Ready (initial render) -------------------------------------------
  assert.ok(noteText().includes(t.noteFragment), "Ready: the bilingual explanation is visible without opening Change details");
  assert.ok(!host.querySelector(".sankalpam-choice"), "Ready never shows the calendar-detail form itself");

  // --- Ready -> View Sankalpam --------------------------------------------
  await act(async () => { findBtn(t.view).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  assert.ok(noteText().includes(t.noteFragment), "View Sankalpam: the explanation is visible");
  assert.doesNotMatch(teluguRecited(), /జ్యేష్ఠ|మాసే/, "View Sankalpam: the delivered recited text is the SHORT form - no month spoken");
  assert.match(teluguRecited(), /శుభే శోభనే ముహూర్తే/, "View Sankalpam: the SHORT-form frame phrase is what's actually recited");

  // --- View Sankalpam -> Back (-> Ready) ----------------------------------
  await act(async () => { findBtn(t.back).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  assert.ok(noteText().includes(t.noteFragment), "Ready (after Back): the explanation is still visible");

  // --- Ready -> Hear and practise ------------------------------------------
  await act(async () => { findBtn(t.practise).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  assert.ok(noteText().includes(t.noteFragment), "Practice: the explanation is visible");

  await act(async () => { r.unmount(); });

  // --- The stored preference was never touched ----------------------------
  assert.equal(setChoicesCalls.length, 0, "pure navigation (View / Back / Practice) never calls setChoices");
  assert.equal(initialChoices.calendarForm, "FULL_DATED", "the object passed in is untouched - still full dated");
}

test("FAMILY Ready → View → Back → Practice (EN): explanation visible throughout, delivered text is SHORT, stored FULL_DATED preference unchanged", async () => {
  await runNavTest("EN");
});

test("FAMILY Ready → View → Back → Practice (TE): explanation visible throughout, delivered text is SHORT, stored FULL_DATED preference unchanged", async () => {
  await runNavTest("TE");
});
