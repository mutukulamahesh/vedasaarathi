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
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

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

/** Like fakePendingGeolocation, but supports several overlapping in-flight
 * calls (each getCurrentPosition call queues its own onSuccess callback,
 * resolved individually and in whatever order the test asks for) - needed to
 * construct a genuine "two requests resolving out of order" scenario. */
function fakeMultiPendingGeolocation() {
  const callbacks = [];
  return {
    callbacks,
    geolocation: {
      getCurrentPosition(onSuccess) {
        callbacks.push(onSuccess);
      },
    },
    resolve(index, coords) {
      callbacks[index]({ coords });
    },
  };
}

/** A controllable stand-in for the global fetch loadPlacesDataset() calls by
 * default (no fetchImpl injected by location-screen.tsx itself) - each call
 * queues its own {resolve, reject}, settled individually and in whatever
 * order the test asks for, so a slower-starting fetch can be made to resolve
 * before a faster-starting one, or vice versa. */
function fakeControllableFetch() {
  const pending = [];
  return {
    pending,
    fetchImpl: (url, init) =>
      new Promise((resolve, reject) => {
        pending.push({ url, resolve, reject });
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    resolveRows(index, rows) {
      pending[index].resolve({ ok: true, json: async () => rows });
    },
  };
}

const HYDERABAD_ROW = ["Hyderabad", 17.385, 78.4867, "India", "Telangana", 6809970];
const FRISCO_ROW = ["Frisco", 33.1507, -96.8236, "United States", "Texas", 200490];

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

/* -------------------------------------------------------------------------- */
/* Location auto-fill race safety: an older in-flight lookup must never       */
/* overwrite a newer result or the user's own typing, and must never touch    */
/* state after the screen has been left.                                      */
/* -------------------------------------------------------------------------- */

test("two overlapping 'Use my location' requests resolving out of order: the newer one wins, the older one is discarded", async () => {
  const fakeGeo = fakeMultiPendingGeolocation();
  globalThis.navigator.geolocation = fakeGeo.geolocation;
  const fakeFetch = fakeControllableFetch();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch.fetchImpl;

  try {
    const { container, reactRoot } = await mount({
      location: { status: "NOT_SET" },
      saveLocation: () => {},
      setLocationStatus: () => {},
      clearLocation: () => {},
    });

    const button = findButtonByText(container, "Use my location");
    // Both clicks fire inside the SAME act() with no await between them, so
    // neither sees the other's setRequesting(true) yet (React has not
    // re-rendered/disabled the button in between) - the same technique the
    // existing double-click Save test uses to construct a genuine race
    // rather than one the disabled attribute alone would already block.
    await act(async () => {
      button.click();
      button.click();
    });
    assert.equal(fakeGeo.callbacks.length, 2, "both overlapping clicks started their own device-location request");

    // Request #2 (newer) resolves FIRST and completes fully: geolocation,
    // then its own place-list lookup, matching Frisco.
    await act(async () => {
      fakeGeo.resolve(1, { latitude: 33.1507, longitude: -96.8236, accuracy: 20 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(fakeFetch.pending.length, 1, "the newer request reached its own place-list lookup");
    await act(async () => {
      fakeFetch.resolveRows(0, [FRISCO_ROW]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(findInputByLabel(container, "City").value, "Frisco", "the newer request's match is applied");
    assert.equal(findInputByLabel(container, "Country").value, "United States");

    // Request #1 (older) resolves its geolocation fix LAST, out of order,
    // at a different coordinate (Hyderabad). It was already superseded the
    // moment request #2 started, so it must be discarded outright here -
    // never even reaching its own lookup, and never touching (not even
    // clearing) the newer result already on screen.
    await act(async () => {
      fakeGeo.resolve(0, { latitude: 17.385, longitude: 78.4867, accuracy: 20 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(fakeFetch.pending.length, 1, "the older, later-resolving request never even starts its own lookup");
    assert.equal(findInputByLabel(container, "City").value, "Frisco", "the older request never overwrites (or clears) the newer result");
    assert.equal(findInputByLabel(container, "Country").value, "United States", "country stays from the newer request too");
    assert.equal(findInputByLabel(container, "Latitude").value, "33.1507", "coordinates also stay from the newer request, not the older one");

    await act(async () => { reactRoot.unmount(); });
    container.remove();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

async function runPendingLookupManualEditCase(language) {
  const fakeGeo = fakePendingGeolocation();
  globalThis.navigator.geolocation = fakeGeo.geolocation;
  const fakeFetch = fakeControllableFetch();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch.fetchImpl;

  try {
    const { container, reactRoot } = await mount({
      location: { status: "NOT_SET" },
      saveLocation: () => {},
      setLocationStatus: () => {},
      clearLocation: () => {},
      language,
    });

    const useMyLocationText = language === "TE" ? "నా స్థానాన్ని ఉపయోగించండి" : "Use my location";
    const cityLabel = language === "TE" ? "నగరం" : "City";
    const regionLabel = language === "TE" ? "రాష్ట్రం లేదా ప్రాంతం" : "State or region";
    const countryLabel = language === "TE" ? "దేశం" : "Country";
    const button = findButtonByText(container, useMyLocationText);
    await act(async () => {
      button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    });
    await act(async () => {
      fakeGeo.resolveNow({ latitude: 17.385, longitude: 78.4867, accuracy: 20 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(findInputByLabel(container, cityLabel).value, "", "coordinates clear the city field immediately, before the lookup resolves");
    assert.equal(fakeFetch.pending.length, 1, "the place-list lookup is now in flight");
    assert.equal(button.disabled, true, "requesting is true while the lookup is in flight");

    // The user types their own city, region AND country WHILE the lookup is
    // still pending - all three fields, not just city.
    await act(async () => {
      setInputValue(findInputByLabel(container, cityLabel), "My Own Village");
      setInputValue(findInputByLabel(container, regionLabel), "My Own Region");
      setInputValue(findInputByLabel(container, countryLabel), "My Own Country");
    });
    assert.equal(findInputByLabel(container, cityLabel).value, "My Own Village");
    assert.equal(findInputByLabel(container, regionLabel).value, "My Own Region");
    assert.equal(findInputByLabel(container, countryLabel).value, "My Own Country");

    // The lookup now resolves with a real match - it must not clobber what
    // the user just typed, and it must also move the status on from
    // "Looking up..." to something that reflects what actually happened.
    await act(async () => {
      fakeFetch.resolveRows(0, [HYDERABAD_ROW]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // 1. User-entered city/region/country remain unchanged.
    assert.equal(findInputByLabel(container, cityLabel).value, "My Own Village", "the user's own city survives a lookup that resolves after it");
    assert.equal(findInputByLabel(container, regionLabel).value, "My Own Region", "the user's own region survives too");
    assert.equal(findInputByLabel(container, countryLabel).value, "My Own Country", "the user's own country survives too");

    // 2. requesting becomes false.
    assert.equal(button.disabled, false, "requesting becomes false once the (discarded) lookup settles");
    assert.match(button.textContent, new RegExp(useMyLocationText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "the button label reverts, confirming requesting is false");

    // 3. "Looking up..." is no longer visible.
    const findingPlaceText = language === "TE" ? "సమీప తెలిసిన ప్రదేశం కోసం చూస్తోంది" : "Looking up the nearest known place";
    const statusEl = container.querySelector(".location-status");
    assert.doesNotMatch(statusEl.textContent, new RegExp(findingPlaceText), "the transient lookup status does not linger once the lookup has settled");

    // 4. The final status is correct (EN and TE, depending on the case run).
    const expectedFinal = language === "TE"
      ? "మీరు నమోదు చేసిన నగరం, రాష్ట్రం, దేశాన్ని ఉపయోగిస్తాము"
      : "We'll use the city, state and country you entered";
    assert.match(statusEl.textContent, new RegExp(expectedFinal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `the final status confirms the entered place will be used (${language})`);

    await act(async () => { reactRoot.unmount(); });
    container.remove();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("editing city/region/country while a lookup is pending is never overwritten once the lookup resolves, and the status message moves on (English)", async () => {
  await runPendingLookupManualEditCase("EN");
});

test("editing city/region/country while a lookup is pending is never overwritten once the lookup resolves, and the status message moves on (Telugu)", async () => {
  await runPendingLookupManualEditCase("TE");
});

test("unmounting the location screen while a lookup is pending never throws and never applies its result afterward", async () => {
  const fakeGeo = fakePendingGeolocation();
  globalThis.navigator.geolocation = fakeGeo.geolocation;
  const fakeFetch = fakeControllableFetch();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch.fetchImpl;

  try {
    const { container, reactRoot } = await mount({
      location: { status: "NOT_SET" },
      saveLocation: () => {},
      setLocationStatus: () => {},
      clearLocation: () => {},
    });

    const button = findButtonByText(container, "Use my location");
    await act(async () => {
      button.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    });
    await act(async () => {
      fakeGeo.resolveNow({ latitude: 17.385, longitude: 78.4867, accuracy: 20 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(fakeFetch.pending.length, 1, "the place-list lookup is in flight at the moment of unmount");

    await act(async () => { reactRoot.unmount(); });
    container.remove();

    // Resolving the lookup AFTER unmount must not throw (no "setState on an
    // unmounted component" crash) - the requestId guard bails out silently.
    await assert.doesNotReject(async () => {
      fakeFetch.resolveRows(0, [HYDERABAD_ROW]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("declining the clear confirmation leaves storage and the saved-location card unchanged", async () => {
  writeLocationState(readyLocation);
  confirmAnswerRef.current = false;

  const { container, reactRoot } = await mountWrapper();
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved-location card is shown before clearing");
  assert.doesNotMatch(container.innerHTML, /Enter or confirm your location/, "the form is not shown yet");

  const clearButton = findButtonByText(container, "Clear location");
  await act(async () => {
    clearButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });

  assert.deepEqual(loadLocationState(), readyLocation, "storage is untouched when the user declines");
  assert.match(container.innerHTML, /Chicago, Illinois/, "the saved-location card is still shown");

  await act(async () => {
    reactRoot.unmount();
  });
  container.remove();
});

test("opening Edit location, changing a field, then Cancel retains the original saved values", async () => {
  writeLocationState(readyLocation);

  const { container, reactRoot } = await mountWrapper();
  assert.match(container.innerHTML, /Chicago, Illinois/);
  assert.doesNotMatch(container.innerHTML, /Enter or confirm your location/);

  const editButton = findButtonByText(container, "Edit location");
  await act(async () => {
    editButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });
  assert.match(container.innerHTML, /Enter or confirm your location/, "the form appears once editing");

  const cityInput = findInputByLabel(container, "City");
  assert.equal(cityInput.value, "Chicago", "the form starts pre-filled with the saved value");
  await act(async () => {
    setInputValue(cityInput, "Some Other City");
  });
  assert.equal(cityInput.value, "Some Other City");

  const cancelButton = findButtonByText(container, "Cancel");
  await act(async () => {
    cancelButton.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  });

  assert.deepEqual(loadLocationState(), readyLocation, "storage is untouched by a cancelled edit");
  assert.doesNotMatch(container.innerHTML, /Enter or confirm your location/, "the form is hidden again");
  assert.match(container.innerHTML, /Chicago, Illinois/, "the compact card shows the original, unedited value");
  assert.doesNotMatch(container.innerHTML, /Some Other City/);

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
