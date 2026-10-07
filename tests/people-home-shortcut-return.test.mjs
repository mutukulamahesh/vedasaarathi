// Regression: Home's "Quick access" People tile must open People with a
// return destination of Home - never a stale destination left behind by an
// EARLIER puja-flow redirect.
//
// The defect this guards (fixed in components/platform/home-screen.tsx):
//   1. Open Vinayaka preparation with incomplete participant details.
//   2. The app redirects to People (return destination: "prepare").
//   3. Return Home WITHOUT reloading.
//   4. Open People using Home's quick-access tile.
//   5. Enter a valid name and save.
//   6. Expected: Home. Before the fix the tile called setScreen("people")
//      directly, so the stale "prepare" destination from step 2 was kept and
//      Save opened Vinayaka preparation instead.
//
// INTERACTIVE: the whole app (app/page.tsx default export) is mounted in
// JSDOM and driven with real DOM clicks/inputs, so this exercises the real
// navigation state, not a mocked callback. Real-browser coverage of the same
// sequence lives in tests/e2e/people-return-navigation.e2e.mjs.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
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
dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
dom.window.speechSynthesis = {
  speak() {}, cancel() {}, getVoices() { return []; }, addEventListener() {}, removeEventListener() {},
};
globalThis.speechSynthesis = dom.window.speechSynthesis;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const page = await vite.ssrLoadModule("/app/page.tsx");

const L = {
  EN: { save: "Save people and continue", begin: "Begin", details: "View details" },
  TE: { save: "వ్యక్తులను సేవ్ చేసి కొనసాగించండి", begin: "ప్రారంభించండి", details: "వివరాలు చూడండి" },
};

/** Which app screen is showing, by a landmark each screen alone renders. */
function screenName(host) {
  if (host.querySelector(".today-card")) return "home";
  if (host.querySelector(".person-list")) return "people";
  if (host.querySelector(".material-row-main")) return "prepare";
  if (host.querySelector(".puja-catalogue-item")) return "pujas";
  return "other";
}

async function click(el, what) {
  assert.ok(el, `missing control: ${what}`);
  await act(async () => { el.dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
}

async function typeName(host, value) {
  const input = host.querySelector(".person-list input");
  assert.ok(input, "People screen has a name field");
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

const buttonWithText = (host, text) =>
  [...host.querySelectorAll("button")].find((b) => (b.textContent || "").includes(text));
const bottomNav = (host, index) => host.querySelectorAll(".bottom-nav button")[index];
/** Home's Quick access tiles: Calendar, Search, People. */
const quickAccessPeople = (host) => host.querySelectorAll(".quick-grid button")[2];

async function mountApp(language) {
  localStorage.clear();
  // No participants saved: a Vinayaka "Begin" therefore fails validation
  // and redirects to People. Only the language is preset.
  localStorage.setItem("vedasaarathi:preparation:v3", JSON.stringify({
    mode: "SELF", participants: [], language, runs: {},
  }));
  dom.window.history.replaceState(null, "", "/");
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => { r.render(React.createElement(page.default)); });
  return {
    host,
    unmount: async () => { await act(async () => { r.unmount(); }); host.remove(); },
  };
}

/** Steps 1-2: Pujas -> Vinayaka detail -> Begin with no valid person. */
async function redirectFromVinayakaPreparation(host, t) {
  await click(bottomNav(host, 3), "bottom-nav Pujas");
  assert.equal(screenName(host), "pujas");
  await click(
    [...host.querySelectorAll(".puja-catalogue-item")].find((b) => (b.textContent || "").includes(t.details)),
    "Vinayaka View details",
  );
  await click(buttonWithText(host, t.begin), "Begin");
  assert.equal(screenName(host), "people", "incomplete details: Begin redirects to People");
}

for (const language of ["EN", "TE"]) {
  const t = L[language];

  test(`[${language}] Home quick-access People after an earlier Vinayaka redirect saves back to Home (bottom-nav Home)`, async () => {
    const { host, unmount } = await mountApp(language);
    try {
      await redirectFromVinayakaPreparation(host, t);

      // 3. Return Home without reloading (bottom-nav Home).
      await click(bottomNav(host, 0), "bottom-nav Home");
      assert.equal(screenName(host), "home");

      // 4. Home's Quick access People tile.
      await click(quickAccessPeople(host), "Home quick-access People tile");
      assert.equal(screenName(host), "people");

      // 5. Valid name, Save.
      await typeName(host, language === "TE" ? "ప్రియ" : "Priya");
      await click(buttonWithText(host, t.save), "Save people and continue");

      // 6. Home - NOT Vinayaka preparation.
      assert.equal(screenName(host), "home",
        "Save from Home's quick-access People returns to Home, not the stale Vinayaka preparation destination");
    } finally {
      await unmount();
    }
  });

  test(`[${language}] Home quick-access People after an earlier Vinayaka redirect saves back to Home (top-bar Back)`, async () => {
    const { host, unmount } = await mountApp(language);
    try {
      await redirectFromVinayakaPreparation(host, t);

      // 3. Return Home without reloading, this time with the top-bar Back.
      await click(host.querySelector(".back-button"), "top-bar Back");
      assert.equal(screenName(host), "home");

      await click(quickAccessPeople(host), "Home quick-access People tile");
      assert.equal(screenName(host), "people");
      await typeName(host, language === "TE" ? "అనన్య" : "Ananya");
      await click(buttonWithText(host, t.save), "Save people and continue");
      assert.equal(screenName(host), "home",
        "Save from Home's quick-access People returns to Home, not the stale Vinayaka preparation destination");
    } finally {
      await unmount();
    }
  });
}

test("the Vinayaka redirect itself still saves to Vinayaka preparation (unchanged)", async () => {
  const { host, unmount } = await mountApp("EN");
  try {
    await redirectFromVinayakaPreparation(host, L.EN);
    await typeName(host, "Kavya");
    await click(buttonWithText(host, L.EN.save), "Save people and continue");
    assert.equal(screenName(host), "prepare", "a puja-flow redirect still returns to that puja's own preparation");
  } finally {
    await unmount();
  }
});
