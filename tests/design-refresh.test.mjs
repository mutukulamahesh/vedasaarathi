// Design exploration (Home + Calendar visual refresh) - presentation-only
// regression tests.
//
//  1. Calendar month grid: a long Tithi name ("Trayodasi", "Chaturdasi") is
//     never clipped. The label only gains a <wbr> line-break hint at a
//     syllable/compound boundary; its text is unchanged, and the CSS lets it
//     wrap inside its own cell instead of hiding the overflow.
//  2. Home "at a glance": today's Tithi, Nakshatra, sunrise and sunset are
//     visible in the compact card, keep their pending/"Updating…" gating, and
//     the descriptive fields (Masa/Paksha/Samvatsara, provenance) still live
//     only inside "See full Panchanga".

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const calendarScreen = await vite.ssrLoadModule("/components/platform/calendar-screen.tsx");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");

// Every English Tithi name the Panchanga engine emits (mhah-panchang's
// name_en_IN list, de-duplicated) - the grid shows the last word of each.
const ENGINE_TITHI_WORDS = [
  "Padyami", "Vidhiya", "Thadiya", "Chavithi", "Chaviti", "Panchami", "Shasti", "Sapthami",
  "Ashtami", "Navami", "Dasami", "Ekadasi", "Dvadasi", "Trayodasi", "Chaturdasi", "Punnami", "Amavasya",
];

// Fixtures are resolved BEFORE any test is registered, so the shared Vite
// server is never closed while a top-level await is still pending.
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const NOW = Date.parse("2026-10-12T05:30:00Z");
const P = await panchangaForLocation(HYD, NOW);
const noop = () => {};
const homeHtml = (extra = {}) => renderToStaticMarkup(
  React.createElement(page.HomeScreen, {
    setScreen: noop, todayEpochDay: 0, nowMs: NOW, location: HYD,
    panchanga: P, panchangaStatus: "ready", language: "EN",
    onOpenFestival: noop, onViewFullCalendar: noop, onStartPuja: noop, ...extra,
  }),
);

const label = (word) => renderToStaticMarkup(React.createElement(calendarScreen.TithiCellLabel, { word }));

test("grid Tithi label: text is unchanged; only a <wbr> break hint is added", () => {
  for (const word of ENGINE_TITHI_WORDS) {
    const html = label(word);
    assert.equal(html.replace("<wbr/>", ""), word, `${word}: text is unchanged`);
    assert.equal((html.match(/<wbr\/>/g) || []).length, 1, `${word}: exactly one break hint`);
  }
  assert.equal(label("Chaturdasi"), "Chatur<wbr/>dasi");
  assert.equal(label("Trayodasi"), "Trayo<wbr/>dasi");
  // An unknown name is passed through untouched (CSS still wraps it).
  assert.equal(label("Pratipada"), "Pratipada");
  assert.equal(label(""), "");
});

test("grid Tithi label CSS: the LAST .calendar-tithi rule wraps instead of hiding overflow", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const rules = css.match(/(^|\})\s*\.calendar-tithi\{[^}]*\}/g) || [];
  assert.ok(rules.length > 0, "a .calendar-tithi rule exists");
  // The cascade winner for overflow/wrapping is the last rule that sets them.
  const last = rules.filter((r) => /overflow|white-space/.test(r)).pop();
  assert.ok(last, "a rule sets the label's overflow");
  assert.match(last, /overflow:visible/);
  assert.match(last, /overflow-wrap:anywhere/);
  assert.doesNotMatch(last, /white-space:nowrap|text-overflow:ellipsis/);
  // Per-property cascade winner across EVERY plain `.calendar-tithi{}` rule
  // (the standalone PR #16 base rule + this refresh): the refresh decides the
  // breaking deliberately - word-break:normal so the <wbr> hints control the
  // break points (not break-all), manual hyphens, and overflow-wrap:anywhere
  // kept as the no-clipping safety net.
  const winner = (prop) => {
    let v = null;
    for (const m of css.matchAll(/\.calendar-tithi\{([^}]*)\}/g)) {
      for (const decl of m[1].split(";")) {
        const [k, ...rest] = decl.split(":");
        if (k.trim() === prop) v = rest.join(":").trim();
      }
    }
    return v;
  };
  assert.equal(winner("word-break"), "normal", "the <wbr> hints, not break-all, control English breaks");
  assert.equal(winner("hyphens"), "manual");
  assert.equal(winner("overflow-wrap"), "anywhere", "fallback: never clipped even without a hint");
  assert.equal(winner("overflow"), "visible");
  assert.equal(winner("white-space"), "normal");
  assert.equal(winner("max-width"), "100%");
  // The cell may grow to fit a two-line label (min-height, never a fixed height).
  const cellRules = css.match(/(^|\})\s*\.calendar-cell\{[^}]*\}/g) || [];
  for (const r of cellRules) assert.doesNotMatch(r, /(^|[;{])height:/, "no fixed cell height");
});

test("Home at a glance: Tithi, Nakshatra, sunrise and sunset are in the compact card", () => {
  const sunrise = P.fields.find((f) => f.key === "sunrise").value;
  const sunset = P.fields.find((f) => f.key === "sunset").value;
  const compact = homeHtml().split('<details class="home-why">')[0];
  const glance = compact.split('<div class="home-glance">')[1] ?? "";
  assert.match(glance, /class="home-tithi"/);
  assert.match(glance, /class="home-nakshatra"/);
  assert.match(glance, /Today.s Nakshatra:|Nakshatra at sunrise:/);
  assert.ok(glance.includes(sunrise), "sunrise value shown");
  assert.ok(glance.includes(sunset), "sunset value shown");
  // Descriptive fields and provenance stay out of the compact card.
  assert.doesNotMatch(compact, /Samvatsara|Ayana|Ritu \(season\)|Masa \(lunar month\)|Paksha \(fortnight\)/);
  assert.doesNotMatch(compact, /drikpanchang\.com/);
  // Exactly one Nakshatra block (moved, not duplicated into "See full").
  assert.equal((homeHtml().match(/class="home-nakshatra"/g) || []).length, 1);
});

test("Home at a glance keeps the pending gating: stale day -> sunrise/sunset 'Updating…'; pending fields -> 'Updating…'", () => {
  const sunrise = P.fields.find((f) => f.key === "sunrise").value;
  const html = homeHtml({ panchangaDayStale: true, tithiPending: true, nakshatraPending: true });
  const glance = html.split('<div class="home-glance">')[1].split('<div class="home-times')[0];
  assert.ok(!glance.includes(`<dd>${sunrise}</dd>`), "no stale sunrise value");
  assert.equal((glance.match(/Updating…/g) || []).length, 4, "Tithi, Nakshatra, sunrise, sunset all show Updating…");
});

test("Home: guided puja entry is a real button that opens the existing Pujas screen, EN + TE", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body><div id=r></div></body></html>");
  const prev = { window: globalThis.window, document: globalThis.document };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const calls = [];
    const host = dom.window.document.getElementById("r");
    const r = createRoot(host);
    await act(async () => {
      r.render(React.createElement(page.HomeScreen, {
        setScreen: (s) => calls.push(s), todayEpochDay: 0, nowMs: NOW, location: HYD,
        panchanga: P, panchangaStatus: "ready", language: "EN",
        onOpenFestival: noop, onViewFullCalendar: noop, onStartPuja: noop,
      }));
    });
    const btn = host.querySelector("button.home-puja-entry");
    assert.ok(btn, "the entry is a <button>");
    assert.match(btn.textContent, /Guided pujas/);
    await act(async () => { btn.dispatchEvent(new dom.window.Event("click", { bubbles: true })); });
    assert.deepEqual(calls, ["pujas"]);
    await act(async () => { r.unmount(); });
  } finally {
    globalThis.window = prev.window;
    globalThis.document = prev.document;
  }
  assert.match(homeHtml({ language: "TE" }), /పూజను దశలవారీగా అనుసరించండి/);
});
