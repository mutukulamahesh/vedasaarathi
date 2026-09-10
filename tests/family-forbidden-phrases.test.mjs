// FAMILY_BETA must read like a real app: no internal development / review
// vocabulary anywhere in the complete family journey (blocker 2).
//
// Renders every FAMILY_BETA screen — prepare, Sankalpam setup, every step of
// the Simple AND Complete paths (EN + TE), completion, correction reporting,
// and post-puja — with reviewMode:false, and asserts none of the forbidden
// phrases appear in the visible text. Reviewer mode is checked to STILL carry
// the detail, so nothing was lost, only hidden.

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
const { stepsForPujaPath } = await vite.ssrLoadModule("/lib/puja/types.ts");
const { defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");

const noop = () => {};
const SIMPLE = stepsForPujaPath(VINAYAKA_PUJA, "SIMPLE");
const COMPLETE = stepsForPujaPath(VINAYAKA_PUJA, "COMPLETE");

const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const LOC = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-09T00:00:00.000Z",
};

/** Visible text only — strip tags and decode the few entities we emit. */
function visibleText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&#x27;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Phrases that must never reach a family screen. Each is checked against the
// visible text, case-insensitive.
const FORBIDDEN = [
  /\bdrafts?\b/i,
  /early draft/i,
  /not priest[-\s]?approved/i,
  /priest[-\s]?approved/i,
  /confirm[^.]{0,40}priest/i,
  /priest[^.]{0,25}confirm/i,
  /check[^.]{0,25}with (your|a) priest/i,
  /review required/i,
  /\breviewer\b/i,
  /awaiting (final )?(priest )?review/i,
  /still being reviewed/i,
  /\bcandidates?\b/i,
  /\bprovenance\b/i,
  /transcription (status|confidence|check)/i,
  // Telugu
  /సమీక్షకుల/, // "reviewers'"
  /ముసాయిదా/, // "draft"
  /పురోహిత ఆమోదం/, // "priest approval"
  /నిర్ధారణ అవసరం/, // "confirmation required"
];

function assertClean(labelText, html) {
  const text = visibleText(html);
  for (const re of FORBIDDEN) {
    const m = text.match(re);
    assert.equal(m, null, `${labelText}: forbidden phrase ${re} → "${m && m[0]}"\n  …${
      m ? text.slice(Math.max(0, m.index - 60), m.index + 60) : ""
    }…`);
  }
}

function puja(step, path, language) {
  return renderToStaticMarkup(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA, stepIndex: step, setStepIndex: noop, finish: noop,
      path, language, setLanguage: noop, activeList: [PARTICIPANT],
      mode: "FAMILY", location: LOC, reviewMode: false,
      panchanga: null, sankalpamChoices: defaultSankalpamChoices(),
    }),
  );
}

for (const [pathName, steps] of [["SIMPLE", SIMPLE], ["COMPLETE", COMPLETE]]) {
  for (const language of ["EN", "TE"]) {
    test(`FAMILY_BETA ${pathName} path (${language}) — no internal review vocabulary on any step`, () => {
      steps.forEach((s, i) => {
        assertClean(`${pathName}[${i}] ${s.id} (${language})`, puja(i, pathName, language));
      });
    });
  }
}

test("FAMILY_BETA Sankalpam setup screen (SELF / FAMILY / GROUP, EN + TE) is clean", () => {
  for (const mode of ["SELF", "FAMILY", "GROUP"]) {
    for (const language of ["EN", "TE"]) {
      const list = mode === "GROUP" ? [PARTICIPANT, { ...PARTICIPANT, id: "p2", name: "Ravi" }] : [PARTICIPANT];
      const html = renderToStaticMarkup(
        React.createElement(page.SankalpamSetupScreen, {
          activeList: list, mode, location: LOC, panchanga: null,
          choices: defaultSankalpamChoices(), setChoices: noop, begin: noop, back: noop,
          slug: "vinayaka-chavithi", language,
        }),
      );
      assertClean(`SankalpamSetup ${mode} ${language}`, html);
    }
  }
});

test("FAMILY_BETA home screen (with and without a computed Panchanga) is clean", async () => {
  const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
  const NOW = Date.parse("2026-09-09T12:00:00Z");
  const withP = await panchangaForLocation(LOC, NOW);
  for (const [loc, p, status] of [
    [{ status: "NOT_SET" }, null, "idle"],
    [LOC, withP, "ready"],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(page.HomeScreen, {
        setScreen: noop, openPreparation: noop, resumePuja: noop, reviewMode: false,
        mode: "FAMILY", participantCount: 2, materialsReady: 0, materialsTotal: 5,
        runState: "IN_PROGRESS", savedStepIndex: 4, savedPath: "COMPLETE",
        todayEpochDay: 20000, nowMs: NOW, location: loc, featuredPuja: VINAYAKA_PUJA,
        panchanga: p, panchangaStatus: status,
      }),
    );
    assertClean(`HomeScreen ${loc.status} ${status}`, html);
  }
});

test("FAMILY_BETA prepare screen is clean", () => {
  const html = renderToStaticMarkup(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA, activeList: [PARTICIPANT], availableMaterialIds: [],
      toggleMaterial: noop, patriSelfReport: null, setPatriSelfReport: noop,
      pujaPath: "COMPLETE", setPujaPath: noop, goToPeople: noop, start: noop,
      reviewMode: false, mode: "FAMILY", location: LOC, panchanga: null,
    }),
  );
  assertClean("PrepareScreen FAMILY", html);
});

test("FAMILY_BETA completion + correction reporting is clean", () => {
  const html = renderToStaticMarkup(
    React.createElement(page.CompleteScreen, {
      home: noop, restart: noop, immersion: noop, puja: VINAYAKA_PUJA, path: "COMPLETE",
    }),
  );
  assertClean("CompleteScreen", html);
  assert.match(visibleText(html), /report a correction/i);
});

test("FAMILY_BETA post-puja guidance is clean", () => {
  const html = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false,
    }),
  );
  assertClean("PostPujaScreen FAMILY", html);
});

test("the Vrata Katha step no longer speaks a reviewer placeholder, and reads as a story (EN + TE)", () => {
  const idx = COMPLETE.findIndex((s) => s.id === "vrata-katha");
  assert.notEqual(idx, -1);
  for (const language of ["EN", "TE"]) {
    const html = puja(idx, "COMPLETE", language);
    const text = visibleText(html);
    assert.doesNotMatch(text, /Listen to plain instructions/i, "no plain-instruction clip for the story step");
    assert.doesNotMatch(text, /reviewed,? licensed version/i);
    assert.doesNotMatch(text, /సమీక్షకుల నిర్ధారణ అవసరం/);
  }
  // The full retelling is still shown.
  assert.match(visibleText(puja(idx, "COMPLETE", "EN")), /Syamantaka jewel/);
  assert.match(visibleText(puja(idx, "COMPLETE", "TE")), /శ్యమంతక మణి/);
});

test("Reviewer mode STILL carries the detail that Family mode hides (nothing lost, only hidden)", () => {
  const idx = COMPLETE.findIndex((s) => s.candidateStepId === "ganapati-prarthana");
  assert.notEqual(idx, -1);
  const mk = (reviewMode) =>
    renderToStaticMarkup(
      React.createElement(page.PujaScreen, {
        puja: VINAYAKA_PUJA, stepIndex: idx, setStepIndex: noop, finish: noop,
        path: "COMPLETE", language: "EN", setLanguage: noop, activeList: [PARTICIPANT],
        mode: "FAMILY", location: LOC, reviewMode,
      }),
    );
  const family = mk(false);
  const reviewer = mk(true);
  // Family hides the reviewer chrome…
  assert.doesNotMatch(family, /provenance-panel/);
  assert.doesNotMatch(family, /BETA_CLASSIFICATION/);
  assert.doesNotMatch(visibleText(family), /\bprovenance\b/i);
  // …but reviewer mode still shows it — the detail is only hidden, not removed.
  assert.match(reviewer, /provenance-panel/);
  assert.match(reviewer, /BETA_CLASSIFICATION/);
});
