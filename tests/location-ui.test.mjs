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
const stepsSource = await vite.ssrLoadModule("/lib/content/steps.ts");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");

const noop = () => {};
const render = (element) => renderToStaticMarkup(element);

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

function homeHtml(location, todayEpochDay = 0, nowMs = 0) {
  return render(
    React.createElement(page.HomeScreen, {
      setScreen: noop,
      openPreparation: noop,
      mode: "SELF",
      participantCount: 1,
      materialsReady: 0,
      todayEpochDay,
      nowMs,
      location,
      featuredPuja: VINAYAKA_PUJA,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Home screen before and after location setup                                */
/* -------------------------------------------------------------------------- */

test("home screen prompts to set a location before one is configured", () => {
  const html = homeHtml({ status: "NOT_SET" });
  assert.match(html, /Set your location/);
  assert.match(html, /<p class="eyebrow">TODAY<\/p>/);
  assert.doesNotMatch(html, /frisco/i);
});

test("home screen shows the saved city and region once location is ready, and hides the nudge", () => {
  const html = homeHtml(readyLocation);
  assert.match(html, /TODAY IN CHICAGO, ILLINOIS/);
  assert.doesNotMatch(html, /location-nudge/);
});

/* -------------------------------------------------------------------------- */
/* Today's date uses the saved location's own time zone, never the browser's  */
/* -------------------------------------------------------------------------- */

test("home shows today's date computed from the saved IANA time zone, not a UTC/browser assumption", () => {
  // At this instant, Auckland (UTC+13 in January) has already turned over to
  // 2 January while Los Angeles (UTC-8) is still on 1 January - a real,
  // deterministic difference that only appears if the given time zone is
  // actually used, regardless of whatever zone the test machine runs in.
  const nowMs = Date.parse("2026-01-01T23:00:00Z");

  const aucklandHtml = homeHtml({ ...readyLocation, timezone: "Pacific/Auckland" }, 0, nowMs);
  assert.match(aucklandHtml, /January 2/);

  const losAngelesHtml = homeHtml({ ...readyLocation, timezone: "America/Los_Angeles" }, 0, nowMs);
  assert.match(losAngelesHtml, /January 1/);
});

test("without a saved location, home falls back to the epoch-day pilot label, never a guessed local date", () => {
  const html = homeHtml({ status: "NOT_SET" }, 0, Date.parse("2026-01-01T23:00:00Z"));
  assert.match(html, /Pilot preview/);
});

test("home screen shows an appropriate status when permission was denied or location failed", () => {
  const denied = homeHtml({ status: "PERMISSION_DENIED" });
  assert.match(denied, /Location permission denied/);

  const unavailable = homeHtml({ status: "UNAVAILABLE" });
  assert.match(unavailable, /Location unavailable/);

  const errored = homeHtml({ status: "ERROR" });
  assert.match(errored, /Location error/);
});

/* -------------------------------------------------------------------------- */
/* No Panchanga value is ever presented as calculated                         */
/* -------------------------------------------------------------------------- */

test("Tithi, Nakshatra, and sunrise stay 'Being verified' whether or not location is set", () => {
  for (const location of [{ status: "NOT_SET" }, readyLocation]) {
    const html = homeHtml(location);
    assert.match(html, /Being verified/);
    // Never a computed-looking value in the Panchanga grid.
    assert.doesNotMatch(html, /Tithi<\/span><strong>(?!Being verified)/);
    assert.match(html, /Pilot data/);
  }
});

test("a saved location gets a location-specific pending note; Panchanga values are never filled in", () => {
  const html = homeHtml(readyLocation);
  assert.match(html, /Your location is saved\. Panchanga calculations for this location are being prepared\./);
  // Still no computed value anywhere in the grid, even with a location saved.
  assert.match(html, /<span>Tithi<\/span><strong>Being verified<\/strong>/);
  assert.match(html, /<span>Nakshatra<\/span><strong>Being verified<\/strong>/);
  assert.match(html, /<span>Sunrise<\/span><strong>Local time<\/strong>/);
  assert.match(html, /Pilot data/);
});

test("without a saved location, the generic pilot-data note is shown instead", () => {
  const html = homeHtml({ status: "NOT_SET" });
  assert.doesNotMatch(html, /Your location is saved\./);
  assert.match(html, /Not yet calculated for your location/);
});

test("the festival date remains labelled pilot data regardless of location", () => {
  const html = homeHtml(readyLocation);
  assert.match(html, /pilot data/i);
});

/* -------------------------------------------------------------------------- */
/* Privacy message                                                             */
/* -------------------------------------------------------------------------- */

test("the location screen states plainly that location is saved only on this device", () => {
  const html = render(
    React.createElement(page.LocationScreen, {
      location: { status: "NOT_SET" },
      saveLocation: noop,
      setLocationStatus: noop,
      clearLocation: noop,
    }),
  );
  assert.match(html, /Your location is saved only on this device in this version\./);
  assert.match(html, /never sent to a server/i);
});

/* -------------------------------------------------------------------------- */
/* Location screen: current state, form, and unsupported-browser handling     */
/* -------------------------------------------------------------------------- */

test("a ready location shows its summary, source, and a Clear location control", () => {
  const html = render(
    React.createElement(page.LocationScreen, {
      location: readyLocation,
      saveLocation: noop,
      setLocationStatus: noop,
      clearLocation: noop,
    }),
  );
  assert.match(html, /Chicago, Illinois/);
  assert.match(html, /Entered manually/);
  assert.match(html, /America\/Chicago/);
  assert.match(html, /Clear location/);
});

test("a saved location shows the compact card with an Edit location button, not the full form", () => {
  const html = render(
    React.createElement(page.LocationScreen, {
      location: readyLocation,
      saveLocation: noop,
      setLocationStatus: noop,
      clearLocation: noop,
    }),
  );
  assert.match(html, /Edit location/);
  assert.doesNotMatch(html, /Enter or confirm your location/);
  assert.doesNotMatch(html, /Save location/);
});

test("the aria-live status region is always present in the markup", () => {
  const html = render(
    React.createElement(page.LocationScreen, {
      location: { status: "NOT_SET" },
      saveLocation: noop,
      setLocationStatus: noop,
      clearLocation: noop,
    }),
  );
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="status"/);
});

/* -------------------------------------------------------------------------- */
/* No location value enters Sankalpam or any sacred text                      */
/* -------------------------------------------------------------------------- */

test("RitualStep objects carry no location field at all", () => {
  const allowed = new Set([
    "id", "title", "teluguTitle", "teluguInstruction", "what", "how", "why",
    "importance", "minutes", "termNote", "reviewStatus", "locked", "provenance",
  ]);
  const locationFields = ["latitude", "longitude", "city", "region", "country", "timezone", "location"];
  for (const step of stepsSource.RITUAL_STEPS) {
    for (const key of Object.keys(step)) {
      assert.ok(allowed.has(key), `unexpected field "${key}" on step ${step.id}`);
      assert.ok(!locationFields.includes(key), `${step.id} must not carry a location field`);
    }
  }
});

test("the Sankalpam participant-review block never mentions coordinates or a timezone", () => {
  const sankalpamIndex = stepsSource.RITUAL_STEPS.findIndex((s) => s.id === "sankalpam");
  assert.notEqual(sankalpamIndex, -1);
  const html = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA,
      stepIndex: sankalpamIndex,
      setStepIndex: noop,
      finish: noop,
      path: "COMPLETE",
      language: "EN",
      setLanguage: noop,
      activeList: [{ id: "p1", name: "Mahesh" }],
      reviewMode: true,
      voices: [],
    }),
  );
  assert.match(html, /People in this Sankalpam/);
  assert.doesNotMatch(html, /latitude|longitude|timezone|America\//i);
});
