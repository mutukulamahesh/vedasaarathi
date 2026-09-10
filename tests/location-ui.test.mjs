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
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");

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

function homeHtml(location, todayEpochDay = 0, nowMs = 0, extra = {}) {
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
      ...extra,
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

const NOW = Date.parse("2026-09-09T12:00:00Z"); // Wednesday (no Abhijit Muhurta)
const NOW_THU = Date.parse("2026-09-10T12:00:00Z"); // Thursday (Abhijit present)
const readyPanchanga = await panchangaForLocation(readyLocation, NOW);
const readyPanchangaThu = await panchangaForLocation(readyLocation, NOW_THU);
const notSetPanchanga = await panchangaForLocation({ status: "NOT_SET" }, NOW);

test("FAMILY_BETA home shows no dev Panchanga grid and no 'Pilot data' chip", () => {
  for (const [location, p] of [
    [{ status: "NOT_SET" }, notSetPanchanga],
    [readyLocation, readyPanchanga],
  ]) {
    const html = homeHtml(location, 0, NOW, { panchanga: p });
    assert.doesNotMatch(html, /class="panchanga-grid"/, "the dev grid is reviewer-only");
    assert.doesNotMatch(html, /Being verified/);
    assert.doesNotMatch(html, /Pilot data/i);
    assert.doesNotMatch(html, /class="status-chip"/);
    assert.doesNotMatch(html, /class="countdown"/);
    // The epoch-day "N days to" countdown block never appears (the validated
    // festival line uses "in N days" and is only shown when status === ready).
    assert.doesNotMatch(html, /\d+ days? (to|until) /i);
  }
});

test("the COMPACT card shows useful/avoid times + today's Tithi + festival timing; the descriptive fields + provenance live ONLY inside the collapsed 'See full Panchanga' region", () => {
  // Thursday → Abhijit Muhurta present, so the "useful" section shows.
  const html = homeHtml(readyLocation, 0, NOW_THU, { panchanga: readyPanchangaThu, panchangaStatus: "ready" });
  assert.match(html, /TODAY IN CHICAGO/);
  assert.match(html, /Useful times today/i);
  assert.match(html, /Abhijit Muhurta/);
  assert.match(html, /Avoid starting important activities/i);
  assert.match(html, /Rahu Kalam/);
  // Brahma Muhurta is deferred: it is never LISTED as a period (the "About
  // this calculation" text may still explain that it is not shown).
  const timesBlocks = (html.match(/<ul class="home-period-list">[\s\S]*?<\/ul>/g) || []).join("");
  assert.doesNotMatch(timesBlocks, /Brahma Muhurta/);
  assert.match(html, /Today.s Tithi:/i);
  assert.match(html, /A Tithi is a lunar day/i);
  assert.match(html, /class="panchanga-festival"/);
  assert.match(html, /Next Vinayaka Chavithi:<\/strong>\s*2026-09-14/);
  assert.match(html, /Madhyahna puja window \d/);
  assert.match(html, /See full Panchanga/i);
  assert.match(html, /Why these times\?/i);
  // The visible (pre-toggle) part of the card is everything before the
  // <details> controls; nothing technical appears there.
  const compact = html.split('<details class="home-why">')[0];
  assert.doesNotMatch(compact, /Samvatsara|Ayana|Ritu \(season\)|Masa \(lunar month\)|Paksha \(fortnight\)/);
  assert.doesNotMatch(compact, /drikpanchang\.com|checked against selected published Panchanga/i);
  // They DO exist, collapsed, inside "See full Panchanga" → "Advanced details".
  const full = html.split('<details class="home-see-full">')[1] ?? "";
  assert.match(full, /Advanced details/);
  assert.match(full, /Samvatsara/);
  assert.match(full, /About this calculation/);
  assert.doesNotMatch(html, /class="panchanga-grid"/, "no reviewer grid in family mode");
});

test("the FULL Panchanga (expanded) carries sunrise/sunset, Tithi/Nakshatra, then Advanced + About-this-calculation", () => {
  const html = homeHtml(readyLocation, 0, NOW, { panchanga: readyPanchanga, panchangaStatus: "ready" });
  // The expanded block is rendered in the markup (a <details>/toggle region) —
  // it carries the descriptive fields and the sources.
  assert.match(html, /home-full-panchanga/);
  assert.match(html, /<dt>Sunrise<\/dt>|Sunrise<\/dt>/);
  assert.match(html, /Nakshatra<\/dt>/);
  assert.match(html, /Advanced details/i);
  assert.match(html, /Samvatsara/);
  assert.match(html, /About this calculation/i);
  assert.match(html, /drikpanchang\.com/);
});

test("Home shows a visible loading state while today's times are calculating (no stale values)", () => {
  const html = homeHtml(readyLocation, 0, NOW, { panchanga: null, panchangaStatus: "loading" });
  assert.match(html, /class="panchanga-loading"/);
  assert.match(html, /Calculating today.s times for/i);
  assert.doesNotMatch(html, /Useful times today/i, "no times shown while loading");
  assert.doesNotMatch(html, /home-full-panchanga/);
});

test("Home shows a clear unavailable state if the calculation fails", () => {
  const html = homeHtml(readyLocation, 0, NOW, { panchanga: null, panchangaStatus: "error" });
  assert.match(html, /could not be calculated for this location/i);
  assert.doesNotMatch(html, /Useful times today/i);
  assert.doesNotMatch(html, /class="panchanga-loading"/);
});

test("a location with no released fields shows no times and no festival line", () => {
  const html = homeHtml(readyLocation, 0, NOW, {
    panchanga: { fields: [], context: [], useful: [], avoid: [], hasAny: false, festivalUnavailable: true, validation: [] },
    panchangaStatus: "ready",
  });
  assert.doesNotMatch(html, /Useful times today/i);
  assert.doesNotMatch(html, /class="panchanga-festival"/);
});

test("REVIEWER mode shows the Panchanga validation report, clearly labelled", () => {
  const html = render(
    React.createElement(page.HomeScreen, {
      setScreen: noop, openPreparation: noop, reviewMode: true, mode: "SELF",
      participantCount: 1, materialsReady: 0, todayEpochDay: 20000, nowMs: NOW,
      location: readyLocation, featuredPuja: VINAYAKA_PUJA, panchanga: readyPanchanga,
    }),
  );
  assert.match(html, /class="panchanga-grid"/);
  assert.match(html, /released/); // every validated field passes
  // The grid lists the festival + puja-window fields as released.
  assert.match(html, /festival/);
  assert.match(html, /pujaWindow/);
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

test("FAMILY_BETA Sankalpam step shows the assembled text (name/place marked « »), no priest-review chrome, no raw coordinates", () => {
  const sankalpamIndex = stepsSource.RITUAL_STEPS.findIndex((s) => s.id === "sankalpa");
  const html = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex: sankalpamIndex, setStepIndex: noop, finish: noop,
      path: "COMPLETE", language: "EN", setLanguage: noop,
      activeList: [{
        id: "p1", name: "Mahesh",
        gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
        sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
      }],
      mode: "SELF",
      location: {
        status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
        city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
        accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
      },
      reviewMode: false, voices: [],
    }),
  );
  assert.match(html, /<h4>Sankalpam<\/h4>/);
  assert.match(html, /class="sankalpam-assembled"/, "the family sees the assembled Sankalpam");
  assert.match(html, /a guide to help you say it/i);
  assert.doesNotMatch(html, /\bcandidate\b|\bdraft\b|not priest-approved|confirm the exact form with your priest/i);
  assert.doesNotMatch(html, /Details for priest review/, "no reviewer chrome in family mode");
  assert.doesNotMatch(html, /personali[sz]ed/i, "never claims the wording is personalised");
  // Name and place appear only inside the « » user-value markers.
  assert.match(html, /«Mahesh»/);
  assert.match(html, /«India»/);
  assert.doesNotMatch(html, /Mahesh(?!»)/, "the bare name never appears unmarked");
  // Raw location details are never written.
  assert.doesNotMatch(html, /17\.38|78\.48|Asia\/Kolkata|Hyderabad|«Telangana»/);
});
