// The pre-puja Sankalpam setup screen + per-run persistence (item 1).

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

const page = await vite.ssrLoadModule("/app/page.tsx");
const prep = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const { defaultSankalpamChoices, parseSankalpamChoices } =
  await vite.ssrLoadModule("/lib/sankalpam/index.ts");

const noop = () => {};
const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const UNKNOWN_GOTRA_PERSON = { ...PARTICIPANT, id: "p2", name: "Ravi", gotra: { status: "UNKNOWN", name: "" } };
const LOC = {
  status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PANCHANGA = {
  fields: [{ key: "tithi", value: "Shukla Chaturthi" }, { key: "nakshatra", value: "Hasta" }],
  context: [
    { key: "samvatsara", value: "Parabhava" }, { key: "ayana", value: "Dakshinayana" },
    { key: "ritu", value: "Varsha" }, { key: "masa", value: "Bhadraba" },
    { key: "paksha", value: "Shukla" }, { key: "vaara", value: "Somavara" },
  ],
  hasAny: true, festivalUnavailable: false, validation: [],
};

const setup = (over = {}) =>
  renderToStaticMarkup(
    React.createElement(page.SankalpamSetupScreen, {
      activeList: [PARTICIPANT], mode: "SELF", location: LOC, panchanga: PANCHANGA,
      choices: defaultSankalpamChoices(), setChoices: noop, begin: noop, back: noop,
      purpose: "Vinayaka Chavithi", ...over,
    }),
  );

test("the setup screen offers all five choice groups and shows the live assembled Sankalpam", () => {
  const html = setup();
  assert.match(html, /Calendar detail/);
  assert.match(html, /Place detail/);
  assert.match(html, /class="sankalpam-assembled"/);
  assert.match(html, /Telugu/);
  assert.match(html, /Transliteration/);
  // Full dated by default (Panchanga is complete): calendar terms in Telugu.
  assert.match(html, /పరాభవ|భాద్రపద|చవితి/);
});

test("group recitation choice appears only for an unrelated group", () => {
  assert.doesNotMatch(setup({ mode: "SELF" }), /Group recitation/);
  assert.doesNotMatch(setup({ mode: "FAMILY" }), /Group recitation/);
  assert.match(setup({ mode: "GROUP", activeList: [PARTICIPANT, { ...PARTICIPANT, id: "p2", name: "B" }] }), /Group recitation/);
});

test("the unknown-Gotra choice appears only when a Gotra is not KNOWN, and nothing is pre-selected", () => {
  assert.doesNotMatch(setup({ activeList: [PARTICIPANT] }), /Unknown Gotra/);
  const html = setup({ activeList: [PARTICIPANT, UNKNOWN_GOTRA_PERSON] });
  assert.match(html, /Unknown Gotra/);
  assert.match(html, /Kashyapa convention/);
  assert.match(html, /avidita-gotranam kashyapa gotram/);
  // "Not decided yet" is the checked option — the convention is never auto-picked.
  const notDecided = html.match(/<input[^>]*value="UNSET"[^>]*>/)[0];
  assert.match(notDecided, /checked/);
  const kashyapa = html.match(/<input[^>]*value="KASHYAPA"[^>]*>/)[0];
  assert.doesNotMatch(kashyapa, /checked/);
});

test('"Begin the puja" is blocked while an unknown-Gotra choice is still pending', () => {
  const html = setup({ activeList: [UNKNOWN_GOTRA_PERSON], choices: defaultSankalpamChoices() });
  const beginBtn = html.match(/<button class="wide-primary"[^>]*>/)[0];
  assert.match(beginBtn, /disabled/);
});

test("SankalpamChoices round-trip through per-run storage (default + a full custom set)", () => {
  for (const choices of [
    defaultSankalpamChoices(),
    { placeDetail: "REGION", unknownGotra: "KASHYAPA", familyGotra: "Atreya", groupRecitation: "EACH_INDIVIDUALLY", calendarForm: "SHORT" },
  ]) {
    const p = {
      ...prep.emptyProgress(),
      runs: {
        "vinayaka-chavithi": { ...prep.emptyRun(), sankalpamChoices: choices },
      },
    };
    const restored = prep.parseProgress(prep.serializeProgress(p));
    assert.deepEqual(restored.runs["vinayaka-chavithi"].sankalpamChoices, parseSankalpamChoices(choices));
  }
});

test("a damaged stored choices object falls back to the default — never guesses a Gotra convention", () => {
  const p = prep.parseProgress(JSON.stringify({
    mode: "SELF", participants: [],
    runs: { x: { runState: "NOT_STARTED", stepIndex: 0, pujaPath: "SIMPLE", sankalpamChoices: { unknownGotra: "NONSENSE", calendarForm: 42 } } },
  }));
  const c = p.runs.x.sankalpamChoices;
  assert.equal(c.unknownGotra, null);
  assert.equal(c.calendarForm, "FULL_DATED");
});

test("emptyRun carries default Sankalpam choices", () => {
  assert.deepEqual(prep.emptyRun().sankalpamChoices, defaultSankalpamChoices());
});
