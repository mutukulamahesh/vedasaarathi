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

test("without a saved location, home shows a plain 'Today' card with a 'Set your location' prompt, no guessed local date", () => {
  const html = homeHtml({ status: "NOT_SET" }, 0, Date.parse("2026-01-01T23:00:00Z"));
  assert.match(html, /TODAY/);
  assert.match(html, /Set your location/i);
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
/* No Panchanga value is ever presented as calculated (FAMILY_BETA)           */
/* -------------------------------------------------------------------------- */

test("FAMILY_BETA home shows no placeholder Panchanga fields, no 'Pilot data' chip, and no fabricated festival countdown", () => {
  for (const location of [{ status: "NOT_SET" }, readyLocation]) {
    const html = homeHtml(location);
    // No placeholder VALUE fields (a plain sentence saying they are "not
    // calculated yet" is allowed and honest).
    assert.doesNotMatch(html, /class="panchanga-grid"/);
    assert.doesNotMatch(html, /Being verified/);
    assert.doesNotMatch(html, /<strong>Local time<\/strong>/);
    assert.doesNotMatch(html, /Pilot data/i);
    assert.doesNotMatch(html, /class="status-chip"/);
    assert.doesNotMatch(html, /class="countdown"/);
    assert.doesNotMatch(html, /Home puja · pilot data/);
  }
});

test("a saved location shows only the Gregorian date in its timezone, plus an honest 'not calculated yet' note", () => {
  const html = homeHtml(readyLocation);
  assert.match(html, /TODAY IN CHICAGO/);
  assert.match(html, /America\/Chicago/);
  assert.match(html, /not calculated yet/i);
});

test("REVIEWER mode may show Panchanga-development diagnostics, clearly labelled", () => {
  const html = render(
    React.createElement(page.HomeScreen, {
      setScreen: noop, openPreparation: noop, reviewMode: true, mode: "SELF",
      participantCount: 1, materialsReady: 0, todayEpochDay: 20000, nowMs: 0,
      location: readyLocation, featuredPuja: VINAYAKA_PUJA,
    }),
  );
  assert.match(html, /Not calculated \(dev\)/);
  assert.match(html, /Reviewer diagnostics/);
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
  const locationFields = ["latitude", "longitude", "city", "region", "country", "timezone", "location"];
  for (const step of stepsSource.RITUAL_STEPS) {
    for (const key of Object.keys(step)) {
      assert.ok(!locationFields.includes(key), `${step.id} must not carry a location field`);
    }
  }
});

test("the Sankalpam block never mentions coordinates, a city, or a timezone", () => {
  const sankalpamIndex = stepsSource.RITUAL_STEPS.findIndex((s) => s.id === "sankalpa");
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
      mode: "SELF",
      location: {
        status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
        city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
        accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
      },
      reviewMode: true,
      voices: [],
    }),
  );
  // REVIEWER mode shows the "Details for priest review" block (separate from
  // the mantra), which may name the country-level slot only.
  assert.match(html, /Details for priest review/);
  assert.match(html, /India/);
  assert.doesNotMatch(html, /17\.38|78\.48|Asia\/Kolkata|Hyderabad|Telangana/);
});

test("FAMILY_BETA Sankalpam step never claims the wording is personalised, and shows no priest-review details", () => {
  const sankalpamIndex = stepsSource.RITUAL_STEPS.findIndex((s) => s.id === "sankalpa");
  const html = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex: sankalpamIndex, setStepIndex: noop, finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop,
      activeList: [{ id: "p1", name: "Mahesh" }], mode: "SELF",
      location: {
        status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
        city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
        accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
      },
      reviewMode: false, voices: [],
    }),
  );
  assert.match(html, /Source Sankalpam candidate/);
  assert.match(html, /not written into it/i);
  assert.doesNotMatch(html, /Details for priest review/);
  assert.doesNotMatch(html, /Mahesh/);
  assert.doesNotMatch(html, /personali[sz]ed/i);
  assert.doesNotMatch(html, /India|Hyderabad|Asia\/Kolkata/);
});
