// Telugu is preserved all the way through the end of the journey (blocker 4):
// the completion screen, correction reporting, and post-puja guidance stay in
// Telugu when Telugu is selected, and stay English in English mode.

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
const TELUGU = /[ఀ-౿]/;
const visible = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, " ").replace(/\s+/g, " ").trim();

test("CompleteScreen: Telugu mode is Telugu, English mode is English", () => {
  const te = renderToStaticMarkup(
    React.createElement(page.CompleteScreen, {
      home: noop, restart: noop, immersion: noop, puja: VINAYAKA_PUJA, path: "COMPLETE", language: "TE",
    }),
  );
  assert.match(te, /వినాయక పూజ పూర్తయింది/);
  assert.match(te, /తప్పు తెలియజేయండి/); // "Report a correction"
  assert.match(te, /మళ్ళీ మొదలుపెట్టండి/); // "Start again"
  assert.match(te, /హోమ్‌కు తిరిగి వెళ్ళండి/); // "Return home"
  // No stray English UI sentences (allow the class-name attributes, so check visible text).
  const v = visible(te);
  assert.doesNotMatch(v, /Vinayaka Puja completed|Report a correction|Return home|Start again/);

  const en = renderToStaticMarkup(
    React.createElement(page.CompleteScreen, {
      home: noop, restart: noop, immersion: noop, puja: VINAYAKA_PUJA, path: "COMPLETE", language: "EN",
    }),
  );
  assert.match(en, /Vinayaka Puja completed/);
  assert.doesNotMatch(visible(en), TELUGU);
});

test("ReportCorrectionPanel: Telugu mode labels, questions and buttons are Telugu", () => {
  const te = renderToStaticMarkup(
    React.createElement(page.ReportCorrectionPanel, {
      puja: VINAYAKA_PUJA, path: "COMPLETE", language: "TE",
    }),
  );
  const v = visible(te);
  assert.match(v, /తప్పు తెలియజేయండి/); // heading
  assert.match(v, /ఇది దేని గురించి\?/); // "What is this about?"
  assert.match(v, /ఏమి తప్పుగా అనిపించింది\?/); // "What looked wrong?"
  assert.match(v, /ఈ పరికరంలో సేవ్ చేయండి/); // "Save on this device"
  assert.match(v, /మంత్రం లేదా దాని పఠనం/); // a translated area option
  assert.doesNotMatch(v, /What is this about|What looked wrong|Save on this device|A mantra or its reading/);

  const en = renderToStaticMarkup(
    React.createElement(page.ReportCorrectionPanel, { puja: VINAYAKA_PUJA, path: "COMPLETE", language: "EN" }),
  );
  assert.match(visible(en), /What is this about\?/);
  assert.doesNotMatch(visible(en), TELUGU);
});

test("PostPujaScreen: Telugu mode (family) keeps the whole screen in Telugu", () => {
  const te = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false, language: "TE",
    }),
  );
  const v = visible(te);
  assert.match(v, /పూజ తర్వాత/); // kicker
  assert.match(v, /నిమజ్జనం లేదా విగ్రహాన్ని ఉంచుకోవడం/); // screen title
  assert.match(v, /మా పురోహితుడితో ఖరారు/); // pending note
  assert.match(v, /మనుషులను, స్థానిక నీటిని కాపాడండి/); // practical title
  assert.match(v, /వర్షపు నీటి కాలువను ఎప్పుడూ వాడకండి/); // practical note
  assert.match(v, /హోమ్‌కు తిరిగి వెళ్ళండి/); // return home
  assert.doesNotMatch(v, /AFTER THE PUJA|Protect people and local water|Return home|being finalised/);

  const en = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false, language: "EN",
    }),
  );
  assert.match(visible(en), /Protect people and local water/);
  assert.doesNotMatch(visible(en), TELUGU);
});
