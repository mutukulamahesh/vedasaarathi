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
import { readFileSync } from "node:fs";
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
  emptyProgress, parseProgress, serializeProgress, loadProgress,
  getRun, resetRun, requestRunReset,
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

test("a step change moves keyboard/screen-reader focus to the new step heading (tabIndex -1)", async () => {
  installScrollSpies();
  const { host, root: r } = await mountHarness({ start: 3 });
  const headingAt = () => host.querySelector("article.puja-card h1");
  assert.equal(headingAt().getAttribute("tabindex"), "-1", "the heading is programmatically focusable");
  assert.equal(dom.window.document.activeElement, headingAt(), "focus lands on the heading after mount");
  const firstText = headingAt().textContent;

  await act(async () => { btn(host, "Done, next").dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
  const afterHeading = headingAt();
  assert.notEqual(afterHeading.textContent, firstText, "the step actually changed");
  assert.equal(dom.window.document.activeElement, afterHeading, "focus moved to the new step heading");
  await act(async () => { r.unmount(); });
});

test("the sticky step-actions area includes mobile safe-area handling", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = css.match(/\.puja-flow \.step-actions\{[^}]*\}/);
  assert.ok(rule, ".puja-flow .step-actions rule exists");
  assert.match(rule[0], /position:sticky/);
  assert.match(rule[0], /env\(safe-area-inset-bottom/);
});

test("PujaScreen shows the MISSING_SOURCE message (not the Vrata Katha rights message) for a step with no source", () => {
  const patched = {
    ...VINAYAKA_PUJA,
    steps: VINAYAKA_PUJA.steps.map((s, i) =>
      i === 3 ? { ...s, betaStatus: "MISSING_SOURCE", sourceRefs: [] } : s,
    ),
  };
  const html = ssr(
    React.createElement(page.PujaScreen, {
      puja: patched, stepIndex: 3, setStepIndex: noop, finish: noop, path: "COMPLETE",
      language: "EN", setLanguage: noop, activeList: [], mode: "SELF", reviewMode: false,
    }),
  );
  assert.match(html, /no usable source is recorded/i);
  assert.doesNotMatch(html, /publication rights are still being confirmed/i);
  assert.doesNotMatch(html, /Vrata Katha/);
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

test("the availability control uses neutral wording: it will not block you, check the step for guidance", () => {
  const html = prepareHtml(false);
  assert.match(html, /Mark what you have/);
  assert.match(html, /will not block you if something is missing/i);
  assert.match(html, /check the relevant step for available guidance/i);
  assert.doesNotMatch(html, /A missing item never stops the puja/i);
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

test("run state (NOT_STARTED / IN_PROGRESS / COMPLETED) round-trips through storage; empty starts NOT_STARTED", () => {
  assert.deepEqual(emptyProgress().runs, {});
  for (const state of ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]) {
    const restored = parseProgress(serializeProgress({
      ...emptyProgress(),
      runs: { "vinayaka-chavithi": { runState: state, stepIndex: 9, pujaPath: "SIMPLE", availableMaterialIds: [], patriSelfReport: null } },
    }));
    assert.equal(restored.runs["vinayaka-chavithi"].runState, state);
    assert.equal(restored.runs["vinayaka-chavithi"].stepIndex, 9);
  }
  // A fresh get-run for an unknown puja is NOT_STARTED at step 0.
  assert.equal(getRun(parseProgress("{}"), "vinayaka-chavithi").runState, "NOT_STARTED");
});

test("legacy pujaCompleted:true migrates to a COMPLETED run; a legacy interrupted run migrates to IN_PROGRESS", () => {
  const completed = parseProgress(JSON.stringify({ mode: "SELF", participants: [], pujaCompleted: true, stepIndex: 15, pujaPath: "SIMPLE" }));
  assert.equal(completed.runs["vinayaka-chavithi"].runState, "COMPLETED");
  const interrupted = parseProgress(JSON.stringify({ mode: "SELF", participants: [], stepIndex: 4, pujaPath: "COMPLETE" }));
  assert.equal(interrupted.runs["vinayaka-chavithi"].runState, "IN_PROGRESS");
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

test("Home shows 'completed' and hides Resume once the run is COMPLETED", () => {
  const done = homeHtml({ runState: "COMPLETED", savedStepIndex: 15, savedPath: "SIMPLE" });
  assert.match(done, /puja completed/i);
  assert.doesNotMatch(done, /puja in progress/i);
  assert.doesNotMatch(done, />Resume</);
  assert.match(done, /Start a new puja/);
});

test("Home shows Resume for an IN_PROGRESS run, including one left on step 1", () => {
  const midway = homeHtml({ runState: "IN_PROGRESS", savedStepIndex: 5, savedPath: "COMPLETE" });
  assert.match(midway, /puja in progress · step 6 of/i);
  assert.match(midway, />Resume</);

  const step1 = homeHtml({ runState: "IN_PROGRESS", savedStepIndex: 0, savedPath: "SIMPLE" });
  assert.match(step1, />Resume</);
  assert.match(step1, /step 1 of/);

  const fresh = homeHtml({ runState: "NOT_STARTED", savedStepIndex: 0 });
  assert.doesNotMatch(fresh, /puja in progress/i);
  assert.doesNotMatch(fresh, />Resume</);
});

test("resetRun keeps people/lineage/language and clears only the current puja's run", () => {
  const store = dom.window.localStorage;
  const before = {
    ...emptyProgress(),
    mode: "FAMILY",
    language: "TE",
    participants: [{
      id: "p1", name: "Mahesh",
      gotra: { status: "KNOWN", name: "Bharadwaja" },
      veda: { status: "UNSURE", name: "" },
      sutra: { status: "UNKNOWN", name: "" },
      sampradaya: { status: "KNOWN", name: "Smarta" },
    }],
    runs: {
      "vinayaka-chavithi": { runState: "COMPLETED", stepIndex: 12, pujaPath: "COMPLETE", availableMaterialIds: ["murti", "lamp"], patriSelfReport: "HAVE" },
      "other-puja": { runState: "IN_PROGRESS", stepIndex: 3, pujaPath: "SIMPLE", availableMaterialIds: ["x"], patriSelfReport: null },
    },
  };
  store.setItem("vedasaarathi:preparation:v2", serializeProgress(before));

  const after = resetRun(loadProgress(), "vinayaka-chavithi");
  // People, lineage, mode, language preserved exactly.
  assert.equal(after.mode, "FAMILY");
  assert.equal(after.language, "TE");
  assert.equal(after.participants[0].name, "Mahesh");
  assert.deepEqual(after.participants[0].gotra, { status: "KNOWN", name: "Bharadwaja" });
  assert.deepEqual(after.participants[0].sampradaya, { status: "KNOWN", name: "Smarta" });
  // The Vinayaka run is gone (getRun -> a fresh NOT_STARTED run); the OTHER puja's run is untouched.
  assert.equal("vinayaka-chavithi" in after.runs, false);
  assert.equal(getRun(after, "vinayaka-chavithi").runState, "NOT_STARTED");
  assert.equal(getRun(after, "vinayaka-chavithi").stepIndex, 0);
  assert.deepEqual(getRun(after, "vinayaka-chavithi").availableMaterialIds, []);
  assert.equal(after.runs["other-puja"].runState, "IN_PROGRESS");
  assert.equal(after.runs["other-puja"].stepIndex, 3);
});

test("requestRunReset is confirmation-gated and calls the run-only reset, not the destructive people reset", () => {
  let ran = 0;
  const declined = requestRunReset("vinayaka-chavithi", { confirm: () => false, onReset: () => { ran += 1; } });
  assert.equal(declined, false);
  assert.equal(ran, 0);
  const done = requestRunReset("vinayaka-chavithi", {
    confirm: (m) => { assert.match(m, /saved people.*are kept/i); return true; },
    onReset: () => { ran += 1; },
  });
  assert.equal(done, true);
  assert.equal(ran, 1);
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

test("Home does not describe the undated puja as 'Coming up'; the section is 'Featured puja'", () => {
  const html = ssr(React.createElement(page.default));
  assert.doesNotMatch(html, /<h2>Coming up<\/h2>/);
  assert.match(html, /<h2>Featured puja<\/h2>/);
  // The interface-language note is accurate.
  assert.doesNotMatch(html, /Telugu version is being prepared/);
  assert.match(html, /Telugu mantras available · interface in English/);
});
