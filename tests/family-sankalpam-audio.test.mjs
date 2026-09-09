// The family dynamic-audio Sankalpam (item 3): play Part A → pause for the
// family to say their own names aloud → Resume → Part B. Names are never in the
// clips, never generated, never sent anywhere.

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
const { FAMILY_SANKALPAM_AUDIO } = await vite.ssrLoadModule("/lib/sankalpam/family-audio.ts");
const { familySankalpamAudio } = await vite.ssrLoadModule("/lib/audio/manifest.ts");
const generator = await vite.ssrLoadModule("/lib/sankalpam/generator.ts");

const TELUGU = /[ఀ-౿]/;

test("the fixed clips carry no names, no « » markers, and are Telugu-only", () => {
  for (const clip of [FAMILY_SANKALPAM_AUDIO.partA, FAMILY_SANKALPAM_AUDIO.partB, FAMILY_SANKALPAM_AUDIO.namePrompt]) {
    assert.ok(TELUGU.test(clip.text), "Telugu script");
    assert.doesNotMatch(clip.text, /[A-Za-z]/, "no Latin in the clip text");
    assert.doesNotMatch(clip.text, /[«»]/, "no user-value markers in the audio text");
  }
  // Part A ends at "asmakam saha kutumbanam".
  assert.match(FAMILY_SANKALPAM_AUDIO.partA.text, /అస్మాకం సహ కుటుంబానాం,?$/);
});

test("Part A + Part B match the generator's family SHORT form with the « » markers removed", () => {
  const g = generator.generateSankalpam({
    purpose: "వినాయక చవితి పూజ",
    deity: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY",
    people: [{ name: "", lineage: { gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } } }],
    place: {},
    localDateISO: "2026-09-14",
    panchanga: {},
    choices: { calendarForm: "SHORT", placeDetail: "OMIT", unknownGotra: "OMIT" },
  });
  assert.ok(g.familySplitIndex >= 0);
  const clean = (s) => s.replace(/[«»]/g, "").replace(/\s+/g, " ").trim();
  const partA = clean(g.segments.slice(0, g.familySplitIndex + 1).map((x) => x.te).join(" "));
  const partB = clean(g.segments.slice(g.familySplitIndex + 1).map((x) => x.te).join(" "));
  assert.equal(clean(FAMILY_SANKALPAM_AUDIO.partA.text), partA);
  assert.equal(clean(FAMILY_SANKALPAM_AUDIO.partB.text), partB);
});

test("manifest delivers all three clips (REVIEW_CANDIDATE)", () => {
  const { partA, namePrompt, partB } = familySankalpamAudio();
  for (const a of [partA, namePrompt, partB]) {
    assert.ok(a, "clip present in manifest");
    assert.equal(a.status, "REVIEW_CANDIDATE");
    assert.equal(a.language, "TE");
  }
});

test("play Part A → pause with the name prompt → Resume → Part B → done; only one <audio> ever plays", async () => {
  // no device speech in this JSDOM
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(FamilySankalpamPlayer, { language: "EN", voices: [] }));
  });

  const audios = [...host.querySelectorAll("audio")];
  assert.equal(audios.length, 2, "one <audio> for Part A, one for Part B");
  const findBtn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent || ""));

  mediaLog.length = 0;
  await act(async () => {
    findBtn(/Play the Sankalpam/).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.ok(mediaLog.some((x) => x.includes("sankalpa.family-a")), "Part A started");
  assert.equal(mediaLog.filter((x) => x.startsWith("play:")).length, 1, "only Part A plays");

  // Part A ends → pause for names
  await act(async () => {
    audios[0].dispatchEvent(new dom.window.Event("ended"));
  });
  assert.ok(host.querySelector(".family-sankalpam-prompt"), "the name prompt is shown");
  assert.match(host.textContent, /కుటుంబ సభ్యుల పేర్లు చెప్పండి/);
  assert.ok(findBtn(/Resume/), "a Resume button appears");
  assert.ok(!mediaLog.some((x) => x.includes("sankalpa.family-b")), "Part B has NOT started during the pause");

  mediaLog.length = 0;
  await act(async () => {
    findBtn(/Resume/).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.ok(mediaLog.some((x) => x.includes("sankalpa.family-b")), "Resume plays Part B");
  assert.equal(mediaLog.filter((x) => x.startsWith("play:")).length, 1, "only Part B plays");

  await act(async () => {
    audios[1].dispatchEvent(new dom.window.Event("ended"));
  });
  assert.equal(host.querySelector(".family-sankalpam").getAttribute("data-phase"), "done");
  assert.ok(findBtn(/Replay from the start/), "can replay from the start");

  await act(async () => { r.unmount(); });
});

test("the player never issues a network request (no fetch, no Azure)", async () => {
  const calls = [];
  const realFetch = dom.window.fetch;
  dom.window.fetch = (...a) => { calls.push(a[0]); return Promise.reject(new Error("no network in this test")); };
  globalThis.fetch = dom.window.fetch;

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(FamilySankalpamPlayer, { language: "TE", voices: [] }));
  });
  const findBtn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent || ""));
  await act(async () => {
    findBtn(/సంకల్పం వినండి/).dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  await act(async () => { host.querySelectorAll("audio")[0].dispatchEvent(new dom.window.Event("ended")); });
  await act(async () => { findBtn(/కొనసాగించండి/).dispatchEvent(new dom.window.Event("click", { bubbles: true })); });

  assert.deepEqual(calls, [], "no fetch() during the whole flow");
  dom.window.fetch = realFetch;
  globalThis.fetch = realFetch;
  await act(async () => { r.unmount(); });
});
