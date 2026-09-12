// Interaction-level tests for the saved-location user experience: LocationScreen
// calls onSaved instead of navigating itself, the real application coordinator
// (app/page.tsx's default export) returns to Home once onSaved fires, Home
// immediately reflects the saved city/region and its own time zone, and no
// network request of any kind happens anywhere in this flow.

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
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const page = await vite.ssrLoadModule("/app/page.tsx");
const { LOCATION_SAVED_NAVIGATE_DELAY_MS } =
  await vite.ssrLoadModule("/components/platform/location-screen.tsx");
const { loadLocationState } = await vite.ssrLoadModule("/lib/storage/location.ts");

function findButtonByText(container, text) {
  return [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
}

function findInputByLabel(container, labelText) {
  const label = [...container.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(labelText));
  return label ? label.querySelector("input") : undefined;
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

async function waitPastSaveDelay() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, LOCATION_SAVED_NAVIGATE_DELAY_MS + 150));
  });
}

async function mountLocationScreen(props) {
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(page.LocationScreen, props));
  });
  return { container, reactRoot };
}

async function mountApp() {
  localStorage.clear();
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(page.default));
  });
  return { container, reactRoot };
}

async function fillLocationForm(container, values) {
  setInputValue(findInputByLabel(container, "City"), values.city);
  setInputValue(findInputByLabel(container, "State or region"), values.region);
  setInputValue(findInputByLabel(container, "Country"), values.country);
  setInputValue(findInputByLabel(container, "Time zone"), values.timezone);
  setInputValue(findInputByLabel(container, "Latitude"), String(values.latitude));
  setInputValue(findInputByLabel(container, "Longitude"), String(values.longitude));
}

const CHICAGO = {
  city: "Chicago", region: "Illinois", country: "United States",
  timezone: "America/Chicago", latitude: 41.8781, longitude: -87.6298,
};

/* -------------------------------------------------------------------------- */
/* onSaved fires exactly once, and only LocationScreen decides when to save   */
/* -------------------------------------------------------------------------- */

test("a successful save calls onSaved exactly once, not zero and not more than once", async () => {
  let onSavedCalls = 0;
  const { container, reactRoot } = await mountLocationScreen({
    location: { status: "NOT_SET" },
    saveLocation: () => {},
    setLocationStatus: () => {},
    clearLocation: () => false,
    onSaved: () => { onSavedCalls += 1; },
  });

  await act(async () => {
    fillLocationForm(container, CHICAGO);
  });
  const saveButton = findButtonByText(container, "Save location");
  await act(async () => {
    saveButton.click();
  });

  assert.equal(onSavedCalls, 0, "onSaved is intentionally delayed, so it must not have fired yet");
  assert.match(container.innerHTML, /Location saved\./, "the confirmation is shown before onSaved fires");

  await waitPastSaveDelay();
  assert.equal(onSavedCalls, 1);

  // Give it more time to be sure a second call never sneaks in.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  assert.equal(onSavedCalls, 1, "onSaved must never fire a second time for one save");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

test("onSaved is not called when validation fails", async () => {
  let onSavedCalls = 0;
  const { container, reactRoot } = await mountLocationScreen({
    location: { status: "NOT_SET" },
    saveLocation: () => {},
    setLocationStatus: () => {},
    clearLocation: () => false,
    onSaved: () => { onSavedCalls += 1; },
  });

  // Leave every field blank and submit.
  const saveButton = findButtonByText(container, "Save location");
  await act(async () => {
    saveButton.click();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, LOCATION_SAVED_NAVIGATE_DELAY_MS + 150));
  });

  assert.equal(onSavedCalls, 0);
  assert.match(container.innerHTML, /Please fix the highlighted fields/);

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

/* -------------------------------------------------------------------------- */
/* The real coordinator returns to Home after save, and Home reflects it      */
/* immediately                                                                */
/* -------------------------------------------------------------------------- */

// Simple V1's coordinator (this branch's app/page.tsx) starts directly on
// the combined Welcome+location screen when no location is saved - there is
// no separate "location-button" navigation step, and saving does not
// auto-navigate away (the family taps one explicit "Continue" once the
// saved-location card and that button appear). See components/simple/
// welcome-screen.tsx.
test("saving a valid location shows the saved-location card + Continue on Welcome, and persists it", async () => {
  const { container, reactRoot } = await mountApp();
  assert.match(container.innerHTML, /Set your location/, "starts on Welcome+location (no location saved yet)");

  await act(async () => {
    fillLocationForm(container, CHICAGO);
  });
  const saveButton = findButtonByText(container, "Save location");
  await act(async () => {
    saveButton.click();
  });

  // WelcomeScreen does not wire LocationScreen's own onSaved auto-navigate,
  // so there is no navigation delay to wait out here: the compact
  // saved-location card and Continue appear on Welcome the moment the save
  // completes, and the family stays on Welcome until they tap Continue
  // themselves (see app/page.tsx's one-time resume-routing effect and
  // components/simple/welcome-screen.tsx).
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved-location card shows the saved city and region");
  assert.match(container.innerHTML, /Continue/, "one explicit Continue action is offered");
  assert.equal(loadLocationState().city, "Chicago", "the location is actually persisted on the device");

  // Continue moves on to Today - the location is still there.
  await act(async () => {
    findButtonByText(container, "Continue").click();
  });
  assert.doesNotMatch(container.innerHTML, /Set your location/, "Continue leaves the Welcome+location screen");
  assert.match(container.innerHTML, /Chicago/, "Today shows the same saved city");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

test("the saved location is not lost by returning to Welcome (Change location) and back", async () => {
  const { container, reactRoot } = await mountApp();
  await act(async () => {
    fillLocationForm(container, CHICAGO);
  });
  await act(async () => {
    findButtonByText(container, "Save location").click();
  });
  await waitPastSaveDelay();
  await act(async () => {
    findButtonByText(container, "Continue").click();
  });
  assert.match(container.innerHTML, /Chicago/);

  // Today's "Change location" returns to Welcome; the saved location is
  // still shown there, unaffected by the round trip.
  await act(async () => {
    findButtonByText(container, "Change location").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved location survived the round trip");
  assert.equal(loadLocationState().city, "Chicago");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

/* -------------------------------------------------------------------------- */
/* No network request of any kind - never a reverse-geocoding call            */
/* -------------------------------------------------------------------------- */

test("no network request happens anywhere in the location setup and save flow", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (...args) => {
    fetchCalls += 1;
    throw new Error(`unexpected network request: ${JSON.stringify(args[0])}`);
  };

  try {
    const { container, reactRoot } = await mountApp();
    await act(async () => {
      fillLocationForm(container, CHICAGO);
    });
    await act(async () => {
      findButtonByText(container, "Save location").click();
    });
    await waitPastSaveDelay();
    assert.match(container.innerHTML, /Chicago, Illinois/);
    assert.equal(fetchCalls, 0, "saving a location must never make a network request");

    await act(async () => { reactRoot.unmount(); });
    container.remove();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

/* -------------------------------------------------------------------------- */
/* Lifecycle-safe save navigation: onSaved scheduled once, timer cleaned up   */
/* -------------------------------------------------------------------------- */

function makeSaveScreen() {
  const calls = { save: 0, onSaved: 0 };
  return {
    calls,
    props: {
      location: { status: "NOT_SET" },
      saveLocation: () => { calls.save += 1; },
      setLocationStatus: () => {},
      clearLocation: () => false,
      onSaved: () => { calls.onSaved += 1; },
    },
  };
}

test("double-clicking Save saves once and schedules onSaved once", async () => {
  const { calls, props } = makeSaveScreen();
  const { container, reactRoot } = await mountLocationScreen(props);

  await act(async () => { fillLocationForm(container, CHICAGO); });
  const saveButton = findButtonByText(container, "Save location");
  await act(async () => {
    saveButton.click();
    saveButton.click();
    saveButton.click();
  });

  assert.equal(calls.save, 1, "saveLocation ran exactly once");
  assert.equal(saveButton.disabled, true, "the Save button is disabled while completion is pending");

  await waitPastSaveDelay();
  assert.equal(calls.onSaved, 1, "onSaved fired exactly once");

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  assert.equal(calls.onSaved, 1, "onSaved never fired a second time");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

test("submitting the form twice saves once and schedules onSaved once", async () => {
  const { calls, props } = makeSaveScreen();
  const { container, reactRoot } = await mountLocationScreen(props);

  await act(async () => { fillLocationForm(container, CHICAGO); });
  const form = container.querySelector("form.location-form");
  await act(async () => {
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
  });

  assert.equal(calls.save, 1, "saveLocation ran exactly once for two submits");

  await waitPastSaveDelay();
  assert.equal(calls.onSaved, 1, "onSaved fired exactly once");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

test("unmounting the location screen before the delay completes prevents onSaved from firing", async () => {
  const { calls, props } = makeSaveScreen();
  const { container, reactRoot } = await mountLocationScreen(props);

  await act(async () => { fillLocationForm(container, CHICAGO); });
  await act(async () => {
    findButtonByText(container, "Save location").click();
  });
  assert.equal(calls.save, 1);

  // Leave the screen well before LOCATION_SAVED_NAVIGATE_DELAY_MS elapses.
  await act(async () => { reactRoot.unmount(); });
  container.remove();

  // Wait past when the timer would have fired.
  await new Promise((resolve) => setTimeout(resolve, LOCATION_SAVED_NAVIGATE_DELAY_MS + 200));
  assert.equal(calls.onSaved, 0, "the old onSaved callback must not fire after the screen is gone");
});

test("one normal save (edit flow, starting from a saved location) still calls onSaved exactly once", async () => {
  const calls = { save: 0, onSaved: 0 };
  const saved = {
    status: "READY", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago",
    city: "Chicago", region: "Illinois", country: "United States", source: "MANUAL",
    accuracyMeters: 20, savedAt: "2026-09-03T12:00:00.000Z",
  };
  const { container, reactRoot } = await mountLocationScreen({
    location: saved,
    saveLocation: () => { calls.save += 1; },
    setLocationStatus: () => {},
    clearLocation: () => false,
    onSaved: () => { calls.onSaved += 1; },
  });

  await act(async () => {
    findButtonByText(container, "Edit location").click();
  });
  await act(async () => {
    setInputValue(findInputByLabel(container, "City"), "Evanston");
  });
  await act(async () => {
    findButtonByText(container, "Save location").click();
  });
  assert.equal(calls.save, 1);

  await waitPastSaveDelay();
  assert.equal(calls.onSaved, 1, "the edit flow schedules onSaved exactly once, same as a first save");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});
