// Rendering: CalendarScreen, SearchScreen, the concluding/post-puja screen and
// the Simple-vs-Complete completion screen — English + Telugu, family-safe
// wording, correct states, and NO expensive Panchanga work during a render.

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
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");

const noop = () => {};
const visible = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-09T00:00:00.000Z",
};
const NOW = Date.parse("2026-09-10T12:00:00Z");

// Phrases that must never reach a family screen (subset of the project list).
const FORBIDDEN = [
  /\bdrafts?\b/i, /\breviewer\b/i, /review required/i, /\bprovenance\b/i,
  /priest[-\s]?approved/i, /transcription (status|confidence|check)/i,
  /\bcandidates?\b/i, /సమీక్షకుల/, /ముసాయిదా/, /పురోహిత ఆమోదం/,
];
const assertFamilySafe = (label, html) => {
  const text = visible(html);
  for (const re of FORBIDDEN) {
    assert.equal(text.match(re), null, `${label}: forbidden ${re}`);
  }
};

/* -------------------------------------------------------------------------- */
/* CalendarScreen                                                            */
/* -------------------------------------------------------------------------- */

const calendar = (props) =>
  renderToStaticMarkup(
    React.createElement(page.CalendarScreen, {
      location: HYD, nowMs: NOW, language: "EN",
      openPuja: noop, goToLocation: noop, ...props,
    }),
  );

test("CalendarScreen with no location shows the set-location state (EN + TE), no crash", () => {
  for (const language of ["EN", "TE"]) {
    const html = calendar({ location: { status: "NOT_SET" }, language });
    const text = visible(html);
    if (language === "EN") assert.match(text, /Set your location/i);
    else assert.match(text, /స్థానం/);
    assert.doesNotMatch(text, /undefined|NaN|\[object Object\]/);
  }
});

test("CalendarScreen with a location renders the month header + a loading state on first paint", () => {
  for (const [language, monthWord] of [["EN", "September 2026"], ["TE", "సెప్టెంబర్ 2026"]]) {
    const html = calendar({ language });
    const text = visible(html);
    assert.match(text, new RegExp(monthWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    // The expensive month is computed in an effect, not during render, so a
    // static render shows the loading state and never a stale/blank grid.
    if (language === "EN") assert.match(text, /Calculating this month/i);
    assert.doesNotMatch(text, /undefined|NaN|\[object Object\]/);
  }
});

test("CalendarScreen does NO Panchanga bisection during render (100 renders are fast)", () => {
  const t0 = performance.now();
  for (let i = 0; i < 100; i += 1) calendar({});
  const ms = performance.now() - t0;
  console.log(`    100 CalendarScreen renders: ${ms.toFixed(0)} ms`);
  // One full month computation alone is ~1500 ms; 100 renders must be far less.
  assert.ok(ms < 1000, `100 renders took ${ms.toFixed(0)} ms — computation leaked into render`);
});

/* -------------------------------------------------------------------------- */
/* SearchScreen                                                              */
/* -------------------------------------------------------------------------- */

test("SearchScreen renders the app-only hint (EN + TE) and no internet-search claim", () => {
  for (const [language, re] of [
    ["EN", /Search this app only/i],
    ["TE", /ఈ యాప్‌లో మాత్రమే/],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(page.SearchScreen, { language, onNavigate: noop }),
    );
    const text = visible(html);
    assert.match(text, re);
    assert.match(text, language === "EN" ? /No internet search/i : /ఇంటర్నెట్ శోధన కాదు/);
  }
});

/* -------------------------------------------------------------------------- */
/* Concluding (Udvasana) + post-puja                                         */
/* -------------------------------------------------------------------------- */

test("PostPujaScreen (Family mode) shows the sourced Udvasana concluding block, EN + TE, family-safe", () => {
  for (const language of ["EN", "TE"]) {
    const html = renderToStaticMarkup(
      React.createElement(page.PostPujaScreen, {
        guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false, language,
      }),
    );
    assertFamilySafe(`PostPuja ${language}`, html);
    const text = visible(html);
    assert.match(text, /Udvasana|ఉద్వాసన/);
    // keeping vs immersion are distinguished
    assert.match(text, language === "EN" ? /immers/i : /నిమజ్జ/);
  }
});

test("PostPujaScreen keeps the unresolved timing detail in Reviewer mode only", () => {
  const family = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false, language: "EN",
    }),
  );
  const reviewer = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: true, language: "EN",
    }),
  );
  assert.ok(reviewer.length > family.length, "reviewer mode carries additional detail");
  assertFamilySafe("PostPuja family", family);
});

/* -------------------------------------------------------------------------- */
/* Completion — Simple must not pretend an omitted step happened             */
/* -------------------------------------------------------------------------- */

test("CompleteScreen: Simple path states the formal Udvasana was not part of it; Complete path does not", () => {
  const simple = visible(
    renderToStaticMarkup(
      React.createElement(page.CompleteScreen, {
        home: noop, restart: noop, immersion: noop, puja: VINAYAKA_PUJA, path: "SIMPLE", language: "EN",
      }),
    ),
  );
  const complete = visible(
    renderToStaticMarkup(
      React.createElement(page.CompleteScreen, {
        home: noop, restart: noop, immersion: noop, puja: VINAYAKA_PUJA, path: "COMPLETE", language: "EN",
      }),
    ),
  );
  assert.match(simple, /Simple puja does not include the formal Udvasana/i);
  assert.match(complete, /ending with the Udvasana/i);
  assert.doesNotMatch(complete, /does not include the formal Udvasana/i);
});

test("CompleteScreen Simple-path note is bilingual", () => {
  const teSimple = visible(
    renderToStaticMarkup(
      React.createElement(page.CompleteScreen, {
        home: noop, restart: noop, immersion: noop, puja: VINAYAKA_PUJA, path: "SIMPLE", language: "TE",
      }),
    ),
  );
  assert.match(teSimple, /సింపుల్ పూజలో లాంఛనప్రాయ ఉద్వాసన/);
});
