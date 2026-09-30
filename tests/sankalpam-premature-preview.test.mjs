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
const { renderToStaticMarkup } = await import("react-dom/server");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const page = await vite.ssrLoadModule("/app/page.tsx");
const { defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { localWallToUtcMs } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { stepsForPath } = await vite.ssrLoadModule("/lib/content/steps.ts");

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
const KNOWN_GOTRA_PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const UNKNOWN_GOTRA_SECOND_PARTICIPANT = { ...UNKNOWN_GOTRA_PARTICIPANT, id: "p2", name: "Ravi" };
const GROUP_A = {
  id: "g1", name: "Anand",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const GROUP_B = { ...GROUP_A, id: "g2", name: "Kiran" };

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
    unknownGotraLegend: "Unknown Gotra",
    groupCollective: "One collective Sankalpam",
    groupEach: "Each person states their own",
    notDecided: "Not decided yet",
  },
  TE: {
    oneChoiceNeeded: "ఒక ఎంపిక అవసరం", ready: "మీ సంకల్పం సిద్ధంగా ఉంది",
    changeDetails: "వివరాలు మార్చండి", done: "పూర్తయింది", begin: "పూజ మొదలుపెట్టండి",
    pendingHint: "కొనసాగడానికి పైన ఎంపికలు చేయండి.",
    leaveOut: "గోత్రం లైన్ వదిలేయండి",
    unknownGotraLegend: "తెలియని గోత్రం",
    groupCollective: "ఒకే సమష్టి సంకల్పం",
    groupEach: "ప్రతి ఒక్కరూ తమ సొంతం చెబుతారు",
    notDecided: "ఇంకా నిర్ణయించలేదు",
  },
};

/** Renders SankalpamSetupScreen fresh (simulating a page load / reload with
 * the given persisted `choices`) and returns handles for interacting with it.
 * `mode`/`activeList` default to the original FAMILY single-unknown-Gotra
 * scenario this file was written for; pass overrides for other journeys. */
async function mount(language, choices, { mode = "FAMILY", activeList = [UNKNOWN_GOTRA_PARTICIPANT] } = {}) {
  const panchangaResult = await panchanga();
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  let setChoicesCalls = [];
  await act(async () => {
    r.render(React.createElement(page.SankalpamSetupScreen, {
      activeList, mode, location: HYD, panchanga: panchangaResult,
      choices, setChoices: (next) => { setChoicesCalls.push(next); choices = next; },
      begin: () => {}, back: () => {}, purpose: "Vinayaka Chavithi puja", language,
    }));
  });
  const rerender = async () => {
    await act(async () => {
      r.render(React.createElement(page.SankalpamSetupScreen, {
        activeList, mode, location: HYD, panchanga: panchangaResult,
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

/* -------------------------------------------------------------------------- */
/* PujaScreen's own Sankalpam step (SankalpamBlock) - the SAME gate applied  */
/* for consistency (see components/platform/puja-screen.tsx). Normally       */
/* unreachable while pending (Begin is disabled), but a resumed in-progress  */
/* run can still land here with a stale, unresolved choice set - and the     */
/* pending message here must be neutral (never names "Gotra" specifically),  */
/* since pendingChoices can equally be an undecided GROUP recitation choice. */
/* -------------------------------------------------------------------------- */

// String-based (renderToStaticMarkup output), distinct from the DOM-based
// hasAssembled/hasRoman helpers above (those query a live `host` element;
// these tests render straight to an HTML string).
const ASSEMBLED = /class="sankalpam-assembled"/;
const ROMAN = /sankalpam-assembled-roman/;
const SANKALPA_STEP_INDEX = stepsForPath("COMPLETE").findIndex((s) => s.id === "sankalpa");
const KNOWN_A = {
  id: "ga1", name: "Anand",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const KNOWN_B = {
  id: "ga2", name: "Kiran",
  gotra: { status: "KNOWN", name: "Vasishtha" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const PENDING_HINT_PUJA_EN = /finish the remaining choices in Sankalpam setup/;
const PENDING_HINT_PUJA_TE = /సంకల్పం సెటప్‌లో మిగిలిన ఎంపికలు పూర్తి చేయండి/;
const FAMILY_PLAYER = /class="family-sankalpam/;

function pujaSankalpamHtml({ mode, activeList, language, sankalpamChoices }) {
  return renderToStaticMarkup(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex: SANKALPA_STEP_INDEX, setStepIndex: () => {}, finish: () => {},
      path: "COMPLETE", language, setLanguage: () => {},
      activeList, mode, location: HYD, reviewMode: false, voices: [],
      sankalpamChoices,
    }),
  );
}

test("PujaScreen Sankalpam step, pending (unresolved Gotra): assembled Telugu/transliteration are hidden; the pending message is NEUTRAL, not Gotra-specific (EN)", () => {
  const html = pujaSankalpamHtml({
    mode: "FAMILY", activeList: [UNKNOWN_GOTRA_PARTICIPANT], language: "EN",
    sankalpamChoices: defaultSankalpamChoices(),
  });
  assert.doesNotMatch(html, ASSEMBLED, "no recitable Telugu block while pending");
  assert.doesNotMatch(html, ROMAN, "no transliteration block while pending");
  assert.doesNotMatch(html, FAMILY_PLAYER, "FAMILY playback is also absent while pending");
  assert.match(html, PENDING_HINT_PUJA_EN);
  assert.doesNotMatch(html, /\bGotra\b/, "the message never names Gotra specifically - pendingChoices is not always about Gotra");
});

test("PujaScreen Sankalpam step, pending: the same gate and neutral message render correctly in Telugu", () => {
  const html = pujaSankalpamHtml({
    mode: "FAMILY", activeList: [UNKNOWN_GOTRA_PARTICIPANT], language: "TE",
    sankalpamChoices: defaultSankalpamChoices(),
  });
  assert.doesNotMatch(html, ASSEMBLED);
  assert.doesNotMatch(html, ROMAN);
  assert.doesNotMatch(html, FAMILY_PLAYER);
  assert.match(html, PENDING_HINT_PUJA_TE);
});

test("PujaScreen Sankalpam step, resolved: the assembled text AND the FAMILY player both return, with the existing correct wording", () => {
  const html = pujaSankalpamHtml({
    mode: "FAMILY", activeList: [UNKNOWN_GOTRA_PARTICIPANT], language: "EN",
    sankalpamChoices: { ...defaultSankalpamChoices(), unknownGotra: "OMIT" },
  });
  assert.match(html, ASSEMBLED, "recitable text returns once resolved");
  assert.match(html, ROMAN, "transliteration returns once resolved");
  assert.match(html, FAMILY_PLAYER, "FAMILY playback returns once resolved");
  assert.doesNotMatch(html, PENDING_HINT_PUJA_EN);
  assert.doesNotMatch(html.match(/<div class="sankalpam-assembled">[\s\S]*?<\/div>/)?.[0] ?? "", /gotrasya/,
    "OMIT correctly has no Gotra clause - the actual chosen wording, not a placeholder");
});

test("PujaScreen Sankalpam step, GROUP mode with an UNDECIDED recitation choice (no Gotra issue at all): still gated", () => {
  const html = pujaSankalpamHtml({
    mode: "GROUP", activeList: [KNOWN_A, KNOWN_B], language: "EN",
    sankalpamChoices: defaultSankalpamChoices(), // groupRecitation: null -> pending, purely a group-recitation choice
  });
  assert.doesNotMatch(html, ASSEMBLED, "group-recitation pending also hides the recitable text");
  assert.doesNotMatch(html, ROMAN);
  assert.match(html, PENDING_HINT_PUJA_EN, "the same neutral message covers this non-Gotra pending reason too");
});

test("PujaScreen Sankalpam step, GROUP mode once the recitation choice is resolved: the preview returns correctly", () => {
  const html = pujaSankalpamHtml({
    mode: "GROUP", activeList: [KNOWN_A, KNOWN_B], language: "EN",
    sankalpamChoices: { ...defaultSankalpamChoices(), groupRecitation: "COLLECTIVE" },
  });
  assert.match(html, ASSEMBLED);
  assert.doesNotMatch(html, PENDING_HINT_PUJA_EN);
});

/* -------------------------------------------------------------------------- */
/* Fix: GROUP recitation must start genuinely undecided, and a SINGLE direct  */
/* click on either option must persist it - no auto-selected default, and no */
/* switch-away/back workaround needed                                        */
/* (docs/temp/sankalpam-family-group-audit-2026-09-30.md Finding 2). Real     */
/* click + onChange behaviour, the same reason FAMILY's own interactive       */
/* tests above use this JSDOM harness rather than renderToStaticMarkup.       */
/* -------------------------------------------------------------------------- */

function findGroupRadio(host, label) {
  return [...host.querySelectorAll('input[type="radio"]')]
    .find((el) => (el.closest("label")?.textContent || "").includes(label));
}

async function groupRecitationSingleClickResolves(language, label) {
  const t = L[language];
  const { host, click, findBtn, getSetChoicesCalls, rerender } = await mount(
    language, defaultSankalpamChoices(), { mode: "GROUP", activeList: [GROUP_A, GROUP_B] },
  );

  // Genuinely undecided on first render: "Not decided yet" checked, neither
  // real option checked, and nothing is auto-selected or auto-persisted.
  const notDecided = findGroupRadio(host, t.notDecided);
  assert.ok(notDecided, "the 'Not decided yet' option exists");
  assert.ok(notDecided.checked, "'Not decided yet' is the checked option on first render");
  assert.ok(!findGroupRadio(host, t.groupCollective).checked, "COLLECTIVE is not pre-selected");
  assert.ok(!findGroupRadio(host, t.groupEach).checked, "EACH_INDIVIDUALLY is not pre-selected");
  assert.ok(findBtn(t.begin).disabled, "Begin is disabled while the recitation choice is undecided");
  assert.equal(getSetChoicesCalls().length, 0, "nothing has been persisted automatically");

  // A SINGLE direct click on the target option - not a switch-away/back
  // workaround - must resolve it.
  const target = findGroupRadio(host, label);
  await click(target);
  await rerender(); // choices changed via setChoices -> re-render with the new state, as the real app does

  assert.equal(getSetChoicesCalls().length, 1, "exactly one direct click persisted exactly one choice");
  assert.ok(!findBtn(t.begin).disabled, "Begin is enabled once the single click resolves the choice");
  assert.ok(hasAssembled(host), "the recitable preview appears once the single click resolves the choice");
}

test("GROUP (EN): a single direct click on 'One collective Sankalpam' persists the choice - no workaround needed", async () => {
  await groupRecitationSingleClickResolves("EN", L.EN.groupCollective);
});

test("GROUP (TE): a single direct click on 'One collective Sankalpam' persists the choice too", async () => {
  await groupRecitationSingleClickResolves("TE", L.TE.groupCollective);
});

test("GROUP (EN): a single direct click on 'Each person states their own' persists that choice too - not just COLLECTIVE", async () => {
  await groupRecitationSingleClickResolves("EN", L.EN.groupEach);
});

/* -------------------------------------------------------------------------- */
/* Fix: FAMILY's Unknown-Gotra widget/summary must reflect only the primary  */
/* (first-listed) participant - not any participant                         */
/* (docs/temp/sankalpam-family-group-audit-2026-09-30.md Finding 1).         */
/* -------------------------------------------------------------------------- */

test("FAMILY: primary KNOWN + a later member UNKNOWN - already genuinely ready, and 'Change details' does NOT show the inert Unknown-Gotra widget", async () => {
  const { host, click, findBtn } = await mount(
    "EN", defaultSankalpamChoices(),
    { mode: "FAMILY", activeList: [KNOWN_GOTRA_PARTICIPANT, UNKNOWN_GOTRA_SECOND_PARTICIPANT] },
  );

  assert.ok((host.textContent || "").includes(L.EN.ready), "primary's own Gotra is KNOWN, so this is genuinely ready");
  assert.ok(!findBtn(L.EN.begin).disabled, "Begin is enabled - nothing is actually pending");

  await click(findBtn(L.EN.changeDetails));

  const legends = [...host.querySelectorAll("fieldset legend")].map((el) => el.textContent);
  assert.ok(!legends.includes(L.EN.unknownGotraLegend),
    "the Unknown-Gotra widget must not appear here - it would have no effect on the (already complete) primary-only text");
  assert.ok(hasAssembled(host), "the recitable text is already shown, unaffected by the later member's own Gotra status");
  assert.ok(host.querySelector(".sankalpam-assembled").textContent.includes("Bharadwaja"),
    "the primary's own KNOWN Gotra is what is actually recited");
});

test("FAMILY: primary UNKNOWN (even with a later KNOWN member) still correctly shows the Unknown-Gotra widget - unchanged regression", async () => {
  const { host, click, findBtn } = await mount(
    "EN", defaultSankalpamChoices(),
    { mode: "FAMILY", activeList: [UNKNOWN_GOTRA_SECOND_PARTICIPANT, KNOWN_GOTRA_PARTICIPANT] },
  );

  assert.ok((host.textContent || "").includes(L.EN.oneChoiceNeeded), "the PRIMARY's own Gotra is unresolved");
  assert.ok(findBtn(L.EN.begin).disabled);

  await click(findBtn(L.EN.changeDetails));
  const legends = [...host.querySelectorAll("fieldset legend")].map((el) => el.textContent);
  assert.ok(legends.includes(L.EN.unknownGotraLegend), "still shown, correctly, since the primary's own Gotra is what's unresolved");
});
