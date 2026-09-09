// The family dynamic-audio Sankalpam (blockers 1 + 2):
//
//   Play → Part A (through "asmakam saha kutumbanam")
//        → the HOSTED prompt MP3 "ippudu kutumba sabhyula perlu cheppandi"
//        → the family says their OWN names aloud, locally
//   Resume → Part B ("…prityartham … karishye")
//
// Hard rules under test:
//  - the full-Sankalpam player is shown ONLY when the DISPLAYED Sankalpam
//    exactly matches the fixed clips (familyAudioMatchesGen); any other
//    configuration offers a deliberate switch, never mismatched audio;
//  - the pause prompt is the hosted MP3, NEVER browser speech synthesis;
//  - only one <audio> ever plays at a time (shared coordinator);
//  - names are never in the clips, never generated, never sent anywhere;
//  - the flow completes on a browser with speechSynthesis unavailable.

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

const mediaLog = [];
dom.window.HTMLMediaElement.prototype.play = function play() {
  mediaLog.push(`play:${this.getAttribute("src")}`);
  return Promise.resolve();
};
dom.window.HTMLMediaElement.prototype.pause = function pause() {
  mediaLog.push(`pause:${this.getAttribute("src")}`);
};
Object.defineProperty(dom.window.HTMLMediaElement.prototype, "currentTime", {
  get() { return 0; }, set() {}, configurable: true,
});

// A speechSynthesis spy: if the player ever tries to speak the prompt, this
// records it and the relevant tests fail.
let speakCalls = 0;
const speechSpy = {
  speak() { speakCalls += 1; },
  cancel() {},
  getVoices() { return []; },
  addEventListener() {},
  removeEventListener() {},
};
dom.window.speechSynthesis = speechSpy;
globalThis.speechSynthesis = speechSpy;
globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(t) { this.text = t; };

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const { FamilySankalpamPlayer } = await vite.ssrLoadModule(
  "/components/platform/family-sankalpam-player.tsx",
);
const {
  FAMILY_SANKALPAM_AUDIO, familyAudioMatchesGen, STANDARD_SHORT_FAMILY_CHOICES,
} = await vite.ssrLoadModule("/lib/sankalpam/family-audio.ts");
const { familySankalpamAudio } = await vite.ssrLoadModule("/lib/audio/manifest.ts");
const { generateSankalpam } = await vite.ssrLoadModule("/lib/sankalpam/generator.ts");

const TELUGU = /[ఀ-౿]/;

const L = (status, name = "") => ({ status, name });
const lineage = (over = {}) => ({
  gotra: L("UNKNOWN"), veda: L("UNKNOWN"), sutra: L("UNKNOWN"), sampradaya: L("UNKNOWN"),
  ...over,
});

/** A FAMILY-mode generated Sankalpam. Canonical Telugu karma/deity are supplied
 * (as the app does for a KNOWN puja) so the assembled Telugu is clean. */
const genFamily = (choices, over = {}) =>
  generateSankalpam({
    purpose: "Vinayaka Chavithi puja",
    deity: "Sri Maha Ganapati",
    purposeTe: "వినాయక చవితి పూజ",
    deityTe: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY",
    people: [{ name: over.name ?? "", lineage: lineage(over.lineage) }],
    place: over.place ?? {},
    localDateISO: "2026-09-14",
    panchanga: over.panchanga ?? {},
    choices: { familyGotra: "", groupRecitation: null, ...choices },
  });

const STANDARD = { calendarForm: "SHORT", placeDetail: "OMIT", unknownGotra: "OMIT" };
const FULL_PANCHANGA = {
  samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", masa: "Bhadraba",
  paksha: "Shukla", tithi: "Chaturthi", vaara: "Somavara", nakshatra: "Hasta",
};

/* -------------------------------------------------------------------------- */
/* The fixed clips                                                           */
/* -------------------------------------------------------------------------- */

test("the three fixed clips carry no names, no « » markers, and are Telugu-only", () => {
  for (const clip of [
    FAMILY_SANKALPAM_AUDIO.partA, FAMILY_SANKALPAM_AUDIO.partB, FAMILY_SANKALPAM_AUDIO.namePrompt,
  ]) {
    assert.ok(TELUGU.test(clip.text), "Telugu script");
    assert.doesNotMatch(clip.text, /[A-Za-z]/, "no Latin in the clip text");
    assert.doesNotMatch(clip.text, /[«»]/, "no user-value markers in the audio text");
  }
  assert.match(FAMILY_SANKALPAM_AUDIO.partA.text, /అస్మాకం సహ కుటుంబానాం,?$/);
  // The hosted prompt MP3 is a real file path (used instead of speech synthesis).
  assert.match(FAMILY_SANKALPAM_AUDIO.namePrompt.src, /sankalpa\.family-prompt\.te\.mp3$/);
});

test("manifest delivers all three clips (REVIEW_CANDIDATE, Telugu)", () => {
  const { partA, namePrompt, partB } = familySankalpamAudio();
  for (const a of [partA, namePrompt, partB]) {
    assert.ok(a, "clip present in manifest");
    assert.equal(a.status, "REVIEW_CANDIDATE");
    assert.equal(a.language, "TE");
  }
});

/* -------------------------------------------------------------------------- */
/* Blocker 1 — the player is shown ONLY for the standard short family form    */
/* -------------------------------------------------------------------------- */

test("familyAudioMatchesGen: TRUE for the standard short family form (omitted Gotra)", () => {
  const g = genFamily(STANDARD, { lineage: { gotra: L("UNKNOWN") } });
  assert.ok(g.familySplitIndex >= 0);
  assert.equal(familyAudioMatchesGen(g), true);
});

test("familyAudioMatchesGen: FALSE for FULL_DATED", () => {
  const g = genFamily({ ...STANDARD, calendarForm: "FULL_DATED" }, { panchanga: FULL_PANCHANGA });
  assert.equal(g.calendarForm, "FULL_DATED");
  assert.equal(familyAudioMatchesGen(g), false);
});

test("familyAudioMatchesGen: FALSE when the place clause is included (country)", () => {
  const g = genFamily(
    { ...STANDARD, placeDetail: "COUNTRY_ONLY" },
    { place: { country: "India", region: "Telangana" } },
  );
  assert.equal(familyAudioMatchesGen(g), false);
});

test("familyAudioMatchesGen: FALSE when a KNOWN Gotra adds a Gotra line", () => {
  const g = genFamily(STANDARD, { name: "Mahesh", lineage: { gotra: L("KNOWN", "Bharadwaja") } });
  assert.match(g.teluguScript, /గోత్రస్య/);
  assert.equal(familyAudioMatchesGen(g), false);
});

test("familyAudioMatchesGen: FALSE for the Kashyapa unknown-Gotra convention", () => {
  const g = genFamily(
    { ...STANDARD, unknownGotra: "KASHYAPA" },
    { lineage: { gotra: L("UNKNOWN") } },
  );
  assert.match(g.teluguScript, /కాశ్యప గోత్రస్య,/);
  assert.equal(familyAudioMatchesGen(g), false);
});

test("familyAudioMatchesGen: FALSE for a family-tradition Gotra", () => {
  const g = genFamily(
    { calendarForm: "SHORT", placeDetail: "OMIT", unknownGotra: "FAMILY_TRADITION", familyGotra: "Atreya" },
    { lineage: { gotra: L("UNKNOWN") } },
  );
  assert.match(g.teluguScript, /గోత్రస్య/);
  assert.equal(familyAudioMatchesGen(g), false);
});

test("familyAudioMatchesGen: FALSE for a non-family generated Sankalpam", () => {
  const g = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", deity: "Sri Maha Ganapati",
    purposeTe: "వినాయక చవితి పూజ", deityTe: "శ్రీ మహాగణపతి",
    groupMode: "INDIVIDUAL", people: [{ name: "Ravi", lineage: lineage() }],
    place: {}, localDateISO: "2026-09-14", panchanga: {},
    choices: { ...STANDARD, familyGotra: "", groupRecitation: null },
  });
  assert.equal(familyAudioMatchesGen(g), false);
});

test("a mismatched configuration renders the switch offer, not an <audio> player", async () => {
  const g = genFamily({ ...STANDARD, calendarForm: "FULL_DATED" }, { panchanga: FULL_PANCHANGA });
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  let switched = null;
  await act(async () => {
    r.render(React.createElement(FamilySankalpamPlayer, {
      gen: g, language: "EN", onUseStandardForm: () => { switched = STANDARD_SHORT_FAMILY_CHOICES; },
    }));
  });
  assert.equal(host.querySelectorAll("audio").length, 0, "no audio element for a mismatched form");
  assert.match(host.textContent, /standard short family form/i);
  const switchBtn = [...host.querySelectorAll("button")].find((b) => /switch/i.test(b.textContent || ""));
  assert.ok(switchBtn, "a deliberate switch button is offered");
  await act(async () => {
    switchBtn.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.deepEqual(switched, STANDARD_SHORT_FAMILY_CHOICES, "switching applies the standard short choices");
  await act(async () => { r.unmount(); });
});

test("a mismatched configuration with no onUseStandardForm shows the notice and no button", async () => {
  const g = genFamily(STANDARD, { name: "Mahesh", lineage: { gotra: L("KNOWN", "Bharadwaja") } });
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(FamilySankalpamPlayer, { gen: g, language: "EN" }));
  });
  assert.equal(host.querySelectorAll("audio").length, 0);
  assert.equal(host.querySelectorAll("button").length, 0, "no switch button when no handler is wired");
  assert.match(host.textContent, /standard short family form/i);
  await act(async () => { r.unmount(); });
});

/* -------------------------------------------------------------------------- */
/* Blocker 2 — Part A → hosted prompt MP3 → Resume → Part B                   */
/* -------------------------------------------------------------------------- */

test("Part A → hosted prompt MP3 → Resume → Part B → done; only one <audio> plays at a time", async () => {
  speakCalls = 0;
  const g = genFamily(STANDARD, { lineage: { gotra: L("UNKNOWN") } });
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(FamilySankalpamPlayer, { gen: g, language: "EN" }));
  });

  const audios = [...host.querySelectorAll("audio")];
  assert.equal(audios.length, 3, "one <audio> each for Part A, the prompt MP3 and Part B");
  const [aEl, promptEl, bEl] = audios;
  assert.match(promptEl.getAttribute("src"), /sankalpa\.family-prompt\.te\.mp3$/);
  const findBtn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent || ""));

  // Play → Part A
  mediaLog.length = 0;
  await act(async () => {
    findBtn(/Play the Sankalpam/).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.deepEqual(
    mediaLog.filter((x) => x.startsWith("play:")),
    ["play:/audio/v1/sankalpa.family-a.te.mp3"],
    "only Part A plays",
  );

  // Part A ends → the HOSTED prompt MP3 plays (not speech synthesis)
  mediaLog.length = 0;
  await act(async () => { aEl.dispatchEvent(new dom.window.Event("ended")); });
  assert.deepEqual(
    mediaLog.filter((x) => x.startsWith("play:")),
    ["play:/audio/v1/sankalpa.family-prompt.te.mp3"],
    "only the prompt MP3 plays after Part A",
  );
  assert.equal(speakCalls, 0, "browser speech synthesis is never used for the prompt");

  // Prompt MP3 ends → wait for the family to speak their names
  await act(async () => { promptEl.dispatchEvent(new dom.window.Event("ended")); });
  assert.ok(host.querySelector(".family-sankalpam-prompt"), "the name prompt text is shown");
  assert.match(host.textContent, /కుటుంబ సభ్యుల పేర్లు చెప్పండి/);
  assert.ok(findBtn(/Resume/), "a Resume button appears");
  assert.ok(!mediaLog.some((x) => x.includes("sankalpa.family-b")), "Part B has NOT started during the pause");

  // Resume → Part B
  mediaLog.length = 0;
  await act(async () => {
    findBtn(/Resume/).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.deepEqual(
    mediaLog.filter((x) => x.startsWith("play:")),
    ["play:/audio/v1/sankalpa.family-b.te.mp3"],
    "only Part B plays on Resume",
  );

  await act(async () => { bEl.dispatchEvent(new dom.window.Event("ended")); });
  assert.equal(host.querySelector(".family-sankalpam").getAttribute("data-phase"), "done");
  assert.ok(findBtn(/Replay from the start/), "can replay from the start");
  assert.equal(speakCalls, 0, "no speech synthesis for the whole flow");

  await act(async () => { r.unmount(); });
});

test("the player issues no network request during the whole flow (no fetch, no Azure)", async () => {
  const calls = [];
  const realFetch = dom.window.fetch;
  dom.window.fetch = (...a) => { calls.push(a[0]); return Promise.reject(new Error("no network in this test")); };
  globalThis.fetch = dom.window.fetch;

  const g = genFamily(STANDARD, { lineage: { gotra: L("UNKNOWN") } });
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(FamilySankalpamPlayer, { gen: g, language: "TE" }));
  });
  const findBtn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent || ""));
  const audios = [...host.querySelectorAll("audio")];
  await act(async () => { findBtn(/సంకల్పం వినండి/).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  await act(async () => { audios[0].dispatchEvent(new dom.window.Event("ended")); });
  await act(async () => { audios[1].dispatchEvent(new dom.window.Event("ended")); });
  await act(async () => { findBtn(/కొనసాగించండి/).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  await act(async () => { audios[2].dispatchEvent(new dom.window.Event("ended")); });

  assert.deepEqual(calls, [], "no fetch() during the whole flow");
  dom.window.fetch = realFetch;
  globalThis.fetch = realFetch;
  await act(async () => { r.unmount(); });
});

test("the flow completes on a browser with speechSynthesis unavailable", async () => {
  const savedWin = dom.window.speechSynthesis;
  const savedGlobal = globalThis.speechSynthesis;
  // A browser where the API simply is not there.
  delete dom.window.speechSynthesis;
  delete globalThis.speechSynthesis;

  try {
    const g = genFamily(STANDARD, { lineage: { gotra: L("UNKNOWN") } });
    const host = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => {
      r.render(React.createElement(FamilySankalpamPlayer, { gen: g, language: "EN" }));
    });
    const audios = [...host.querySelectorAll("audio")];
    assert.equal(audios.length, 3);
    const findBtn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent || ""));

    mediaLog.length = 0;
    await act(async () => { findBtn(/Play the Sankalpam/).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
    await act(async () => { audios[0].dispatchEvent(new dom.window.Event("ended")); });
    assert.ok(
      mediaLog.some((x) => x.includes("sankalpa.family-prompt")),
      "the hosted prompt MP3 still plays without speechSynthesis",
    );
    await act(async () => { audios[1].dispatchEvent(new dom.window.Event("ended")); });
    await act(async () => { findBtn(/Resume/).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
    await act(async () => { audios[2].dispatchEvent(new dom.window.Event("ended")); });
    assert.equal(host.querySelector(".family-sankalpam").getAttribute("data-phase"), "done");

    await act(async () => { r.unmount(); });
  } finally {
    dom.window.speechSynthesis = savedWin;
    globalThis.speechSynthesis = savedGlobal;
  }
});
