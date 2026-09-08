// Regression tests for the four small review fixes on commit 7f59a73:
//
//  1  Simple path hides the whole 21-patri preparation section (it is only
//     used by the Complete-only Ekaviṃśati Patra Puja step); Complete keeps it.
//  2  Home material progress is path-aware: Simple counts only Simple-path
//     items, Complete counts its own; a stale Complete-only marked id never
//     inflates a Simple total, and no readiness line shows when nothing
//     applicable is marked.
//  3  The Home "Featured puja" card reads the featured puja's own run - never
//     whichever puja happens to be selected for the detail / prepare screens.
//  4  Storage version safety: new writes go to :v3, reads prefer :v3 and fall
//     back to :v2, migration never deletes :v2, only the destructive full
//     reset clears both.

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
const {
  pujaPathIncludesPatri, getPujaMaterialReadiness, groupPujaMaterialsForPath,
} = await vite.ssrLoadModule("/lib/puja/types.ts");
const {
  emptyProgress, serializeProgress, parseProgress, loadProgress, saveProgress,
  clearProgress, getRun,
  PREPARATION_STORAGE_KEY, PREPARATION_STORAGE_KEY_V2, PREPARATION_STORAGE_KEY_V3,
} = await vite.ssrLoadModule("/lib/storage/preparation.ts");

const noop = () => {};
const ssr = (el) => renderToStaticMarkup(el);

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    has: (key) => map.has(key),
    get size() {
      return map.size;
    },
  };
}

const VALID_PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "UNKNOWN", name: "" },
  veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" },
  sampradaya: { status: "UNKNOWN", name: "" },
};

/* ======================================================================== */
/* Issue 1 - Simple path patri visibility                                    */
/* ======================================================================== */

test("pujaPathIncludesPatri: false for Simple, true for Complete", () => {
  assert.equal(pujaPathIncludesPatri(VINAYAKA_PUJA, "SIMPLE"), false);
  assert.equal(pujaPathIncludesPatri(VINAYAKA_PUJA, "COMPLETE"), true);
});

test("a puja that does not declare patri.stepIds always shows the section (backward compatible)", () => {
  const legacyShape = { ...VINAYAKA_PUJA, patri: { ...VINAYAKA_PUJA.patri, stepIds: undefined } };
  assert.equal(pujaPathIncludesPatri(legacyShape, "SIMPLE"), true);
  assert.equal(pujaPathIncludesPatri(legacyShape, "COMPLETE"), true);
});

function prepareHtml(pujaPath, patriSelfReport = null) {
  return ssr(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA,
      activeList: [VALID_PARTICIPANT],
      availableMaterialIds: [],
      toggleMaterial: noop,
      patriSelfReport,
      setPatriSelfReport: noop,
      pujaPath,
      setPujaPath: noop,
      goToPeople: noop,
      start: noop,
    }),
  );
}

test("PrepareScreen: Simple path hides the entire patri section", () => {
  const html = prepareHtml("SIMPLE");
  assert.doesNotMatch(html, /leaves-section/);
  assert.ok(!html.includes(VINAYAKA_PUJA.patri.sectionTitle), "no patri section title");
  assert.doesNotMatch(html, /View \d+ patri/);
  assert.doesNotMatch(html, /Do you have traditional patri\?/);
});

test("PrepareScreen: Complete path still shows the patri section, its 21 names and the self-report", () => {
  const html = prepareHtml("COMPLETE");
  assert.match(html, /leaves-section/);
  assert.ok(html.includes(VINAYAKA_PUJA.patri.sectionTitle), "patri section title shows");
  assert.match(html, new RegExp(`View ${VINAYAKA_PUJA.patri.teluguLeaves.length} patri`));
  assert.match(html, /Do you have traditional patri\?/);
});

test("PrepareScreen: a stale saved patriSelfReport never surfaces on the Simple path", () => {
  // Switching Complete -> Simple may leave patriSelfReport in storage; it must
  // not be read or rendered while Simple is selected.
  const html = prepareHtml("SIMPLE", "NONE");
  assert.doesNotMatch(html, /leaves-section/);
  assert.doesNotMatch(html, /patri-option/);
  // The Complete path with the same stored value does show it.
  assert.match(prepareHtml("COMPLETE", "NONE"), /patri-option/);
});

/* ======================================================================== */
/* Issue 2 - Home material progress is path-aware                            */
/* ======================================================================== */

test("material readiness totals are path-specific: Simple's total is smaller than Complete's", () => {
  const simple = getPujaMaterialReadiness(VINAYAKA_PUJA, [], "SIMPLE");
  const complete = getPujaMaterialReadiness(VINAYAKA_PUJA, [], "COMPLETE");

  const simpleGroups = groupPujaMaterialsForPath(VINAYAKA_PUJA, "SIMPLE");
  const completeGroups = groupPujaMaterialsForPath(VINAYAKA_PUJA, "COMPLETE");
  const groupCount = (g) => g.needed.length + g.optional.length + g.traditionSpecific.length;

  assert.equal(simple.total, groupCount(simpleGroups), "Simple total matches the Simple checklist");
  assert.equal(complete.total, groupCount(completeGroups), "Complete total matches the Complete checklist");
  assert.equal(complete.total, VINAYAKA_PUJA.materials.items.length, "Complete uses every material");
  assert.ok(simple.total < complete.total, "Simple's applicable set is strictly smaller");
});

test("a Complete-only marked id does not count toward - or inflate the total of - Simple progress", () => {
  // kalasha is TRADITION_SPECIFIC and only named by a Complete-only step.
  assert.ok(!groupPujaMaterialsForPath(VINAYAKA_PUJA, "SIMPLE")
    .traditionSpecific.some((m) => m.id === "kalasha"));
  assert.ok(groupPujaMaterialsForPath(VINAYAKA_PUJA, "COMPLETE")
    .traditionSpecific.some((m) => m.id === "kalasha"));

  const simpleWithStaleKalasha = getPujaMaterialReadiness(VINAYAKA_PUJA, ["kalasha"], "SIMPLE");
  const simpleClean = getPujaMaterialReadiness(VINAYAKA_PUJA, [], "SIMPLE");
  assert.equal(simpleWithStaleKalasha.available, 0, "the stale Complete-only mark is not counted");
  assert.equal(simpleWithStaleKalasha.total, simpleClean.total, "the stale mark does not change the total");

  // The same id is a real, counted mark on the Complete path.
  assert.equal(getPujaMaterialReadiness(VINAYAKA_PUJA, ["kalasha"], "COMPLETE").available, 1);
});

test("HomeScreen: no readiness line when nothing applicable is marked; a path-specific 'N of TOTAL' line otherwise", () => {
  const base = {
    setScreen: noop, openPreparation: noop, resumePuja: noop, mode: "SELF",
    participantCount: 1, todayEpochDay: 20000, nowMs: 0,
    location: { status: "NOT_SET" }, featuredPuja: VINAYAKA_PUJA,
    runState: "NOT_STARTED", savedStepIndex: 0, savedPath: "SIMPLE",
  };
  const none = ssr(React.createElement(page.HomeScreen, { ...base, materialsReady: 0, materialsTotal: 10 }));
  assert.doesNotMatch(none, /items marked ready/);

  const simple = getPujaMaterialReadiness(VINAYAKA_PUJA, ["lamp", "water"], "SIMPLE");
  const some = ssr(React.createElement(page.HomeScreen, {
    ...base, materialsReady: simple.available, materialsTotal: simple.total,
  }));
  assert.match(some, new RegExp(`${simple.available} of ${simple.total} items marked ready`));
  assert.equal(simple.total < VINAYAKA_PUJA.materials.items.length, true, "Home shows the Simple total, not all materials");
});

/* ======================================================================== */
/* Issue 3 - Featured-puja run isolation                                     */
/* ======================================================================== */

// The featured puja is the only one in the catalogue, so "another puja" is a
// pure fixture: a second run living in the same store under a different slug.
// The featured card must reflect ONLY the featured slug's run, unchanged by
// anything the fixture run holds.
const FEATURED_SLUG = VINAYAKA_PUJA.slug;
const OTHER_SLUG = "second-puja-fixture";

function seededProgress(otherRun) {
  return {
    ...emptyProgress(),
    participants: [VALID_PARTICIPANT],
    runs: {
      [FEATURED_SLUG]: {
        runState: "IN_PROGRESS", stepIndex: 8, pujaPath: "COMPLETE",
        availableMaterialIds: ["murti", "lamp"], patriSelfReport: null,
      },
      [OTHER_SLUG]: otherRun,
    },
  };
}

async function mountAppWith(progress) {
  localStorage.clear();
  localStorage.setItem(PREPARATION_STORAGE_KEY_V3, serializeProgress(progress));
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(page.default));
  });
  return { container, reactRoot };
}

test("data layer: getRun(progress, featuredSlug) is unaffected by any other slug's run", () => {
  const a = seededProgress({
    runState: "COMPLETED", stepIndex: 41, pujaPath: "SIMPLE",
    availableMaterialIds: ["x", "y", "z"], patriSelfReport: "HAVE",
  });
  const b = seededProgress({
    runState: "NOT_STARTED", stepIndex: 0, pujaPath: "COMPLETE",
    availableMaterialIds: [], patriSelfReport: null,
  });
  assert.deepEqual(getRun(a, FEATURED_SLUG), getRun(b, FEATURED_SLUG));
  assert.equal(getRun(a, FEATURED_SLUG).stepIndex, 8);
  assert.equal(getRun(a, FEATURED_SLUG).runState, "IN_PROGRESS");
});

test("Home 'Featured puja' card shows the featured run's progress, not the other puja's", async () => {
  const { container, reactRoot } = await mountAppWith(seededProgress({
    runState: "COMPLETED", stepIndex: 41, pujaPath: "SIMPLE",
    availableMaterialIds: ["a", "b", "c", "d"], patriSelfReport: "HAVE",
  }));
  const card = container.querySelector(".festival-card").textContent;
  // Featured run: IN_PROGRESS, COMPLETE, step 9.
  assert.match(card, /Complete puja in progress/);
  assert.match(card, /step 9 of/);
  assert.doesNotMatch(card, /puja completed/i);
  assert.doesNotMatch(card, /step 42 of/);
  // Featured run marked 2 Complete-path items (murti, lamp), not the other run's 4.
  assert.match(card, /2 of \d+ items marked ready/);
  await act(async () => { reactRoot.unmount(); });
});

test("changing the other puja's run cannot change the featured card", async () => {
  const readCard = async (otherRun) => {
    const { container, reactRoot } = await mountAppWith(seededProgress(otherRun));
    const text = container.querySelector(".festival-card").textContent;
    await act(async () => { reactRoot.unmount(); });
    return text;
  };
  const withCompleted = await readCard({
    runState: "COMPLETED", stepIndex: 41, pujaPath: "SIMPLE",
    availableMaterialIds: ["a", "b", "c"], patriSelfReport: "HAVE",
  });
  const withFresh = await readCard({
    runState: "NOT_STARTED", stepIndex: 0, pujaPath: "COMPLETE",
    availableMaterialIds: [], patriSelfReport: null,
  });
  assert.equal(withCompleted, withFresh, "the featured card is byte-identical regardless of the other run");
});

/* ======================================================================== */
/* Issue 4 - Storage version safety (v2 -> v3)                               */
/* ======================================================================== */

test("new writes go to :v3 and never touch :v2", () => {
  assert.equal(PREPARATION_STORAGE_KEY, PREPARATION_STORAGE_KEY_V3);
  const store = makeFakeStorage();
  saveProgress({ ...emptyProgress(), language: "TE" }, store);
  assert.ok(store.has(PREPARATION_STORAGE_KEY_V3), "v3 written");
  assert.ok(!store.has(PREPARATION_STORAGE_KEY_V2), "v2 not created");
});

test("migration: a v2 flat legacy record is read and migrated on load", () => {
  const store = makeFakeStorage({
    [PREPARATION_STORAGE_KEY_V2]: JSON.stringify({
      mode: "SELF", participants: [], stepIndex: 15, pujaPath: "SIMPLE", pujaCompleted: true,
    }),
  });
  const loaded = loadProgress(store);
  assert.equal(loaded.runs["vinayaka-chavithi"].runState, "COMPLETED");
  assert.equal(loaded.runs["vinayaka-chavithi"].stepIndex, 15);
});

test("migration: a v2 { runs } record is read as-is on load", () => {
  const before = {
    ...emptyProgress(),
    runs: {
      "vinayaka-chavithi": {
        runState: "IN_PROGRESS", stepIndex: 6, pujaPath: "COMPLETE",
        availableMaterialIds: ["murti"], patriSelfReport: null,
      },
    },
  };
  const store = makeFakeStorage({ [PREPARATION_STORAGE_KEY_V2]: serializeProgress(before) });
  const loaded = loadProgress(store);
  assert.equal(loaded.runs["vinayaka-chavithi"].stepIndex, 6);
  assert.equal(loaded.runs["vinayaka-chavithi"].pujaPath, "COMPLETE");
});

test("preference for :v3 when both versions are present", () => {
  const v2 = serializeProgress({
    ...emptyProgress(),
    runs: { "vinayaka-chavithi": { runState: "COMPLETED", stepIndex: 99, pujaPath: "SIMPLE", availableMaterialIds: [], patriSelfReport: null } },
  });
  const v3 = serializeProgress({
    ...emptyProgress(),
    language: "TE",
    runs: { "vinayaka-chavithi": { runState: "IN_PROGRESS", stepIndex: 3, pujaPath: "COMPLETE", availableMaterialIds: [], patriSelfReport: null } },
  });
  const store = makeFakeStorage({
    [PREPARATION_STORAGE_KEY_V2]: v2,
    [PREPARATION_STORAGE_KEY_V3]: v3,
  });
  const loaded = loadProgress(store);
  assert.equal(loaded.language, "TE", "v3 wins");
  assert.equal(loaded.runs["vinayaka-chavithi"].stepIndex, 3);
  assert.equal(loaded.runs["vinayaka-chavithi"].runState, "IN_PROGRESS");
});

test("rollback safety: migrating from v2 then saving leaves the original v2 bytes intact", () => {
  const v2Raw = JSON.stringify({
    mode: "FAMILY", participants: [], stepIndex: 4, pujaPath: "COMPLETE",
  });
  const store = makeFakeStorage({ [PREPARATION_STORAGE_KEY_V2]: v2Raw });

  const migrated = loadProgress(store);
  saveProgress(migrated, store);

  assert.equal(store.getItem(PREPARATION_STORAGE_KEY_V2), v2Raw, "v2 is left exactly as it was");
  assert.ok(store.has(PREPARATION_STORAGE_KEY_V3), "v3 now holds the migrated record");
  assert.equal(parseProgress(store.getItem(PREPARATION_STORAGE_KEY_V3)).runs["vinayaka-chavithi"].runState, "IN_PROGRESS");
});

test("clearProgress removes BOTH versions - the explicit destructive full reset", () => {
  const store = makeFakeStorage({
    [PREPARATION_STORAGE_KEY_V2]: serializeProgress(emptyProgress()),
    [PREPARATION_STORAGE_KEY_V3]: serializeProgress(emptyProgress()),
  });
  clearProgress(store);
  assert.ok(!store.has(PREPARATION_STORAGE_KEY_V2), "v2 cleared");
  assert.ok(!store.has(PREPARATION_STORAGE_KEY_V3), "v3 cleared");
});
