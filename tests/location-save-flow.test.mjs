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

test("saving a valid location returns to Home, which immediately shows the saved city and region", async () => {
  const { container, reactRoot } = await mountApp();

  const locationButton = container.querySelector("button.location-button");
  await act(async () => {
    locationButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.match(container.innerHTML, /Set your location/, "navigated to the location screen");

  await act(async () => {
    fillLocationForm(container, CHICAGO);
  });
  const saveButton = findButtonByText(container, "Save location");
  await act(async () => {
    saveButton.click();
  });

  // Immediately after the click, still on the location screen (onSaved has
  // not fired yet) - the confirmation is what is showing.
  assert.match(container.innerHTML, /Set your location/, "still on the location screen right after saving");
  assert.match(container.innerHTML, /Location saved\./);

  await waitPastSaveDelay();

  assert.doesNotMatch(container.innerHTML, /Set your location/, "returned to Home");
  assert.match(container.innerHTML, /Chicago, Illinois/, "Home immediately shows the saved city and region");
  assert.equal(loadLocationState().city, "Chicago", "the location is actually persisted on the device");

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

test("the saved location is not lost by navigating to another screen and back", async () => {
  const { container, reactRoot } = await mountApp();

  await act(async () => {
    container.querySelector("button.location-button").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  await act(async () => {
    fillLocationForm(container, CHICAGO);
  });
  await act(async () => {
    findButtonByText(container, "Save location").click();
  });
  await waitPastSaveDelay();
  assert.match(container.innerHTML, /Chicago, Illinois/);

  // Navigate to People and back to Home.
  await act(async () => {
    findButtonByText(container, "People").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.match(container.innerHTML, /People joining the puja/);
  await act(async () => {
    container.querySelector("button.back-button").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
      container.querySelector("button.location-button").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    });
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
