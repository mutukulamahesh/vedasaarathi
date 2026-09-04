// Interaction-level test that needs a real DOM: duplicate-request prevention
// depends on React state updates and a disabled button excluding dispatched
// clicks, which renderToStaticMarkup cannot exercise (it never runs events).

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
// Node 21+ ships its own read-only global `navigator`; override it so React
// (and this test) share the jsdom one, and so it can carry a fake geolocation.
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
const { createServer } = await import("vite");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const page = await vite.ssrLoadModule("/app/page.tsx");
const storageMod = await vite.ssrLoadModule("/lib/storage/location.ts");
const {
  getLocationSnapshot, getServerLocationSnapshot, loadLocationState, requestLocationClear,
  subscribeToLocation, updateLocationState, writeLocationState,
} = storageMod;

const readyLocation = {
  status: "READY",
  latitude: 41.8781,
  longitude: -87.6298,
  timezone: "America/Chicago",
  city: "Chicago",
  region: "Illinois",
  country: "United States",
  source: "MANUAL",
  accuracyMeters: 20,
  savedAt: "2026-09-03T12:00:00.000Z",
};

function fakePendingGeolocation() {
  const calls = [];
  let onSuccessCallback = null;
  return {
    calls,
    geolocation: {
      getCurrentPosition(onSuccess) {
        calls.push(1);
        onSuccessCallback = onSuccess; // does not resolve until the test asks it to
      },
    },
    resolveNow(coords = { latitude: 41.8781, longitude: -87.6298, accuracy: 20 }) {
      onSuccessCallback?.({ coords });
    },
  };
}

async function mount(props) {
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(page.LocationScreen, props));
  });
  return { container, reactRoot };
}

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

// Wires LocationScreen exactly the way app/page.tsx does - through the real
// location store and requestLocationClear - so these tests exercise the same
// confirmation and storage path the app uses, not a stand-in. The confirm
// answer is injected (never a real window.confirm dialog) via a mutable ref
// each test can set before clicking Clear location.
const confirmAnswerRef = { current: true };

function Wrapper() {
  const location = React.useSyncExternalStore(
    subscribeToLocation, getLocationSnapshot, getServerLocationSnapshot,
  );
  return React.createElement(page.LocationScreen, {
    location,
    saveLocation: (next) => updateLocationState(() => next),
    setLocationStatus: (status) =>
      updateLocationState((current) => (current.status === "READY" ? current : { status })),
    clearLocation: () => requestLocationClear({ confirm: () => confirmAnswerRef.current }),
  });
}

async function mountWrapper() {
  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(Wrapper));
  });
  return { container, reactRoot };
}

test("clicking Use my location twice while a request is pending sends only one device request", async () => {
  const fakeGeo = fakePendingGeolocation();
  globalThis.navigator.geolocation = fakeGeo.geolocation;

  const { container, reactRoot } = await mount({
    location: { status: "NOT_SET" },
    saveLocation: () => {},
    setLocationStatus: () => {},
    clearLocation: () => {},
  });

  // React reconciles this same <button> element in place across re-renders
  // (its text/disabled state change, the node identity does not), so capture
  // it once by its initial "Use my location" text and reuse that live
  // reference throughout - re-querying by that same text would fail to find
  // it once the label switches to "Requesting location...".
  const button = findButtonByText(container, "Use my location");

  await act(async () => {
    button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.equal(fakeGeo.calls.length, 1, "the first click starts one request");

  assert.equal(button.disabled, true, "the button disables itself while a request is pending");
  assert.match(button.textContent, /Requesting location/);

  // A second click while still pending - a disabled button does not dispatch a
  // click at all, which is itself the duplicate-request protection; assert the
  // observable result rather than one specific mechanism.
  await act(async () => {
    button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.equal(fakeGeo.calls.length, 1, "no second device request was sent while one was pending");

  await act(async () => {
    fakeGeo.resolveNow();
    // resolveNow() only invokes the browser-callback synchronously; the
    // `await requestDeviceLocation(...)` continuation inside
    // handleUseMyLocation (and the state update it makes) runs on a later
    // microtask/macrotask, so give the queue a turn to drain before act()
    // returns and this block's assertions run.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  assert.equal(fakeGeo.calls.length, 1, "resolving the first request still leaves exactly one call recorded");
  assert.equal(button.disabled, false, "the button re-enables once the request settles");
  assert.match(button.textContent, /Use my location/, "the label reverts once the request settles");

  await act(async () => {
    reactRoot.unmount();
  });
  container.remove();
});

test("declining the clear confirmation leaves storage, the saved-location card, and edited form values unchanged", async () => {
  writeLocationState(readyLocation);
  confirmAnswerRef.current = false;

  const { container, reactRoot } = await mountWrapper();
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved-location card is shown before clearing");

  // Edit a field first, so a bug that resets the form on decline would be
  // caught (an untouched field looking "unchanged" would prove nothing).
  const regionInput = findInputByLabel(container, "State or region");
  await act(async () => {
    setInputValue(regionInput, "Edited Region");
  });
  assert.equal(regionInput.value, "Edited Region");

  const clearButton = findButtonByText(container, "Clear location");
  await act(async () => {
    clearButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });

  assert.deepEqual(loadLocationState(), readyLocation, "storage is untouched when the user declines");
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved-location card is still shown");
  assert.equal(
    findInputByLabel(container, "State or region").value,
    "Edited Region",
    "the edited field was not reset",
  );

  await act(async () => {
    reactRoot.unmount();
  });
  container.remove();
});

test("confirming the clear resets storage, hides the saved-location card, and resets the form", async () => {
  writeLocationState(readyLocation);
  confirmAnswerRef.current = true;

  const { container, reactRoot } = await mountWrapper();
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved-location card is shown before clearing");

  const clearButton = findButtonByText(container, "Clear location");
  await act(async () => {
    clearButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });

  assert.deepEqual(loadLocationState(), { status: "NOT_SET" }, "storage is cleared when the user confirms");
  assert.doesNotMatch(container.innerHTML, /Chicago, Illinois/, "the saved-location card disappears");
  assert.equal(findInputByLabel(container, "City").value, "", "the form resets to empty");

  await act(async () => {
    reactRoot.unmount();
  });
  container.remove();
});

test("a second explicit request after the first settles is allowed (not permanently locked)", async () => {
  const fakeGeo = fakePendingGeolocation();
  globalThis.navigator.geolocation = fakeGeo.geolocation;

  const { container, reactRoot } = await mount({
    location: { status: "NOT_SET" },
    saveLocation: () => {},
    setLocationStatus: () => {},
    clearLocation: () => {},
  });

  const useMyLocationButton = () => findButtonByText(container, "Use my location");

  await act(async () => {
    useMyLocationButton().dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  await act(async () => {
    fakeGeo.resolveNow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.equal(fakeGeo.calls.length, 1);

  await act(async () => {
    useMyLocationButton().dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.equal(fakeGeo.calls.length, 2, "a fresh press after the first request finished starts a new one");

  await act(async () => {
    reactRoot.unmount();
  });
  container.remove();
});
