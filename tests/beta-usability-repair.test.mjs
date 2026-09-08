// Regression tests for the browser-found usability + correctness repairs:
//  1  every step navigation resets the scroll to the top of the new step
//  3  preparation screen: one short notice, grouped materials, collapsed patri
//  4  Sankalpam is not called personalised; names/place are not shown as inserted
//  5  completion clears in-progress state; Home shows "completed", hides Resume
//  6  FAMILY_BETA has no reviewer-management wording
//  7  catalogue wording does not promise mantra narration; a display choice exists
//  8  Home has no placeholder Panchanga fields in FAMILY_BETA
//  9  bottom nav says "People", not "Profile"

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
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { RITUAL_STEPS, stepsForPath } = await vite.ssrLoadModule("/lib/content/steps.ts");
const {
  emptyProgress, parseProgress, serializeProgress, resetProgress, loadProgress,
} = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const { BETA_NOTICE } = await vite.ssrLoadModule("/lib/content/beta-visibility.ts");

const noop = () => {};
const ssr = (el) => renderToStaticMarkup(el);

function btn(container, text) {
  return [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
}

/* -------------------------------------------------------------------------- */
/* 1. Step navigation resets scroll                                           */
/* -------------------------------------------------------------------------- */

function installScrollSpies() {
  const calls = [];
  const proto = dom.window.HTMLElement.prototype;
  proto.scrollIntoView = function scrollIntoView() { calls.push("scrollIntoView"); };
  proto.scrollTo = function scrollTo() { calls.push("el.scrollTo"); };
  dom.window.scrollTo = function scrollTo() { calls.push("window.scrollTo"); };
  return calls;
}

function StepHarness({ start, path = "COMPLETE" }) {
  const [i, setI] = React.useState(start);
  return React.createElement(page.PujaScreen, {
    puja: VINAYAKA_PUJA, stepIndex: i, setStepIndex: setI, finish: noop,
    path, language: "EN", setLanguage: noop, activeList: [], mode: "SELF",
  });
}

async function mountHarness(props) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => { r.render(React.createElement(StepHarness, props)); });
  return { host, root: r };
}

test("Next places the user at the top of the new step (short mantra step)", async () => {
  const calls = installScrollSpies();
  const { host, root: r } = await mountHarness({ start: 3 }); // a short candidate mantra step
  const before = calls.length;
  assert.ok(before >= 1, "the initial mount already scrolled to top");
  await act(async () => { btn(host, "Done, next").dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  assert.ok(calls.length > before, "navigating Next scrolled again");
  await act(async () => { r.unmount(); });
});

test("Previous and Next both reset the scroll around a very long mantra step (Ashtottara)", async () => {
  const idx = RITUAL_STEPS.findIndex((s) => s.candidateStepId === "ashtottara-satanamavali");
  assert.notEqual(idx, -1);
  const complete = stepsForPath("COMPLETE");
  const posInPath = complete.findIndex((s) => s.id === "ashtottara-satanamavali");
  assert.ok(posInPath > 0);

  const calls = installScrollSpies();
  const { host, root: r } = await mountHarness({ start: posInPath - 1 });
  const afterMount = calls.length;
  // Next -> lands on the long Ashtottara step
  await act(async () => { btn(host, "Done, next").dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  assert.ok(calls.length > afterMount, "Next onto the long step scrolled to top");
  const afterNext = calls.length;
  // Previous -> leaves the long step
  await act(async () => { btn(host, "Previous").dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  assert.ok(calls.length > afterNext, "Previous off the long step scrolled to top");
  await act(async () => { r.unmount(); });
});

/* -------------------------------------------------------------------------- */
/* 3. Preparation screen                                                      */
/* -------------------------------------------------------------------------- */

function prepareHtml(reviewMode = false) {
  return ssr(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA,
      activeList: [{ id: "p1", name: "Mahesh", gotra: { status: "UNKNOWN", name: "" },
        veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" },
        sampradaya: { status: "UNKNOWN", name: "" } }],
      availableMaterialIds: [], toggleMaterial: noop, patriSelfReport: null,
      setPatriSelfReport: noop, pujaPath: "COMPLETE", setPujaPath: noop,
      goToPeople: noop, start: noop, reviewMode,
    }),
  );
}

test("preparation screen shows exactly one beta notice and no duplicated draft/review wording", () => {
  const html = prepareHtml(false);
  const notices = (html.match(/beta-notice/g) || []).length;
  assert.equal(notices, 1, "one beta notice element");
  assert.ok(html.includes(BETA_NOTICE));
  assert.doesNotMatch(html, /draft preparation list/i);
  assert.doesNotMatch(html, /awaiting final priest review/i);
  assert.doesNotMatch(html, /question for the reviewing priest/i);
});

test("materials are grouped into Needed for this path / Optional / Tradition-specific", () => {
  const html = prepareHtml(false);
  assert.match(html, /Needed for this path/);
  assert.match(html, /material-group/);
  // At least the required and optional groups both render.
  assert.ok((html.match(/material-group-head/g) || []).length >= 2);
});

test("the 21-patri list is collapsed behind a 'View 21 patri' disclosure", () => {
  const html = prepareHtml(false);
  assert.match(html, /<summary>View 21 patri<\/summary>/);
  // The list still exists (inside the closed <details>), just not always shown.
  assert.match(html, /patri-telugu-list/);
});

test("the availability control explains it records what you have, not that items are mandatory", () => {
  const html = prepareHtml(false);
  assert.match(html, /never stops the puja/i);
  assert.match(html, /records what you have|what you have/i);
});

/* -------------------------------------------------------------------------- */
/* 4. Sankalpam correctness                                                   */
/* -------------------------------------------------------------------------- */

function sankalpamHtml(reviewMode) {
  const idx = stepsForPath("COMPLETE").findIndex((s) => s.id === "sankalpa");
  return ssr(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex: idx, setStepIndex: noop, finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop,
      activeList: [{ id: "p1", name: "Mahesh" }, { id: "p2", name: "Sita" }],
      mode: "FAMILY",
      location: {
        status: "READY", latitude: 1, longitude: 1, timezone: "Asia/Kolkata",
        city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
        accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
      },
      reviewMode, voices: [],
    }),
  );
}

test("FAMILY_BETA Sankalpam: labelled 'Source Sankalpam candidate', never 'personalised', no names/place shown as inserted", () => {
  const html = sankalpamHtml(false);
  assert.match(html, /Source Sankalpam candidate/);
  assert.doesNotMatch(html, /personali[sz]ed/i);
  assert.doesNotMatch(html, /This Sankalpam is spoken for/);
  assert.doesNotMatch(html, /Details for priest review/);
  assert.doesNotMatch(html, /Mahesh|Sita|India|Hyderabad|Asia\/Kolkata/);
  assert.match(html, /not written into it/i);
});

test("REVIEWER Sankalpam: the priest-review details are a separate labelled block, not part of the mantra", () => {
  const html = sankalpamHtml(true);
  assert.match(html, /Source Sankalpam candidate/);
  assert.match(html, /Details for priest review/);
  assert.match(html, /not inserted into the mantra/i);
  assert.match(html, /India/); // country slot may be named here only
});

/* -------------------------------------------------------------------------- */
/* 5. Completion and resume                                                   */
/* -------------------------------------------------------------------------- */

test("pujaCompleted round-trips through storage and starts false", () => {
  assert.equal(emptyProgress().pujaCompleted, false);
  const restored = parseProgress(serializeProgress({ ...emptyProgress(), pujaCompleted: true, stepIndex: 9 }));
  assert.equal(restored.pujaCompleted, true);
  assert.equal(restored.stepIndex, 9);
  assert.equal(parseProgress("{}").pujaCompleted, false);
});

function homeHtml(extra) {
  return ssr(
    React.createElement(page.HomeScreen, {
      setScreen: noop, openPreparation: noop, resumePuja: noop, mode: "SELF",
      participantCount: 1, materialsReady: 0, todayEpochDay: 20000, nowMs: 0,
      location: { status: "NOT_SET" }, featuredPuja: VINAYAKA_PUJA, ...extra,
    }),
  );
}

test("Home shows 'completed' and hides Resume once the puja is finished", () => {
  const done = homeHtml({ pujaCompleted: true, savedStepIndex: 15, savedPath: "SIMPLE" });
  assert.match(done, /puja completed/i);
  assert.doesNotMatch(done, /Puja in progress/);
  assert.doesNotMatch(done, /step 16 of 16/);
  assert.doesNotMatch(done, />Resume</);
  assert.match(done, /Start a new puja/);
});

test("Home shows Resume only for a genuinely unfinished puja", () => {
  const midway = homeHtml({ pujaCompleted: false, savedStepIndex: 5, savedPath: "COMPLETE" });
  assert.match(midway, /Puja in progress · step 6 of/);
  assert.match(midway, />Resume</);

  const fresh = homeHtml({ pujaCompleted: false, savedStepIndex: 0 });
  assert.doesNotMatch(fresh, /Puja in progress/);
  assert.doesNotMatch(fresh, />Resume</);
});

test("resetting progress creates a fresh record with pujaCompleted false and step 0", () => {
  const store = dom.window.localStorage;
  store.setItem("vedasaarathi:preparation:v2", serializeProgress({ ...emptyProgress(), pujaCompleted: true, stepIndex: 12 }));
  resetProgress();
  const after = loadProgress();
  assert.equal(after.pujaCompleted, false);
  assert.equal(after.stepIndex, 0);
});

/* -------------------------------------------------------------------------- */
/* 6. No reviewer-management wording in FAMILY_BETA                            */
/* -------------------------------------------------------------------------- */

const FORBIDDEN_FAMILY = [
  /awaiting final priest review/i,
  /draft preparation list/i,
  /until this step is reviewed/i,
  /question for the reviewing priest/i,
  /BETA_TRANSCRIPTION_CHECK/,
  /BETA_CLASSIFICATION/,
  /provenance-panel/,
  /review-chip/,
];

test("FAMILY_BETA renders (home, prepare, every puja step, complete, catalogue) contain none of the reviewer-management wording", () => {
  const screens = [
    homeHtml({}),
    prepareHtml(false),
    ssr(React.createElement(page.CompleteScreen, { home: noop, restart: noop, immersion: null })),
    ssr(React.createElement(page.PujaCatalogueScreen, { pujas: [VINAYAKA_PUJA], comingSoonMessage: "x", onSelect: noop })),
    ssr(React.createElement(page.PujaDetailScreen, { puja: VINAYAKA_PUJA, onBegin: noop, reviewMode: false })),
  ];
  const completePath = stepsForPath("COMPLETE");
  for (let i = 0; i < completePath.length; i++) {
    screens.push(ssr(React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex: i, setStepIndex: noop, finish: noop, path: "COMPLETE",
      language: "EN", setLanguage: noop, activeList: [], mode: "SELF", reviewMode: false,
    })));
  }
  for (const html of screens) {
    for (const re of FORBIDDEN_FAMILY) {
      assert.doesNotMatch(html, re, re.toString());
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 7. Language / audio honesty                                                */
/* -------------------------------------------------------------------------- */

test("catalogue + detail wording does not promise mantra narration", () => {
  assert.doesNotMatch(VINAYAKA_PUJA.description, /narration/i);
  assert.match(VINAYAKA_PUJA.description, /audio is not included/i);
});

test("a mantra step offers a Telugu/transliteration display choice even though audio is unavailable", () => {
  const html = ssr(React.createElement(page.PujaScreen, {
    puja: VINAYAKA_PUJA, stepIndex: stepsForPath("COMPLETE").findIndex((s) => s.candidateStepId === "dhyana-shloka"),
    setStepIndex: noop, finish: noop, path: "COMPLETE", language: "EN", setLanguage: noop,
    activeList: [], mode: "SELF", reviewMode: false,
  }));
  // Telugu is always shown; the romanised reading is a visible labelled control.
  assert.match(html, /<pre class="mantra-te" lang="te">/);
  assert.match(html, /Show the romanised reading/);
  // No browser-TTS button on a locked mantra step.
  assert.doesNotMatch(html, /class="audio-button"/);
});

/* -------------------------------------------------------------------------- */
/* 8 + 9. Home card honesty and nav label                                    */
/* -------------------------------------------------------------------------- */

test("FAMILY_BETA coordinator home has no 'Pilot data' chip / panchanga grid, and the nav says 'People' not 'Profile'", () => {
  const html = ssr(React.createElement(page.default));
  assert.doesNotMatch(html, /class="panchanga-grid"/);
  assert.doesNotMatch(html, /Pilot data/i);
  assert.doesNotMatch(html, /class="countdown"/);
  assert.doesNotMatch(html, /<span>Profile<\/span>/);
  assert.match(html, /<span>People<\/span>/);
});
