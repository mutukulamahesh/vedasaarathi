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

// The canonical Udvasana verse is shown in Telugu script in BOTH languages
// (sacred text is never translated); strip that one block before checking the
// UI chrome language.
const withoutVerse = (html) => visible(html.replace(/<pre[^>]*class="mantra-te"[^>]*>[\s\S]*?<\/pre>/g, " "));

test("PostPujaScreen: Telugu mode (family) keeps the whole screen in Telugu", () => {
  const te = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false, language: "TE",
    }),
  );
  const v = visible(te);
  assert.match(v, /పూజ తర్వాత/); // kicker
  assert.match(v, /పూజ ముగింపు \(ఉద్వాసన\)/); // screen title (concluding / Udvasana)
  assert.match(v, /ఎప్పుడు చేస్తారు/); // "When it is done"
  assert.match(v, /కుటుంబం ఏమి చేస్తుంది/); // "What the family does"
  assert.match(v, /విగ్రహాన్ని ఉంచుకోవడం లేదా నిమజ్జనం/); // keeping vs immersing heading
  assert.match(v, /మనుషులను, స్థానిక నీటిని కాపాడండి/); // practical title (kept separate)
  assert.match(v, /వర్షపు నీటి కాలువను ఎప్పుడూ వాడకండి/); // practical note
  assert.match(v, /హోమ్‌కు తిరిగి వెళ్ళండి/); // return home
  assert.doesNotMatch(withoutVerse(te), /AFTER THE PUJA|Protect people and local water|Return home|When it is done/);
  // Family mode no longer carries any "being finalised with our priest" note.
  assert.doesNotMatch(v, /మా పురోహితుడితో ఖరారు/);

  const en = renderToStaticMarkup(
    React.createElement(page.PostPujaScreen, {
      guidance: VINAYAKA_PUJA.postPujaGuidance, home: noop, reviewMode: false, language: "EN",
    }),
  );
  assert.match(visible(en), /Protect people and local water/);
  assert.match(visible(en), /When it is done/);
  // No Telugu UI chrome in English mode (the canonical verse block excepted).
  assert.doesNotMatch(withoutVerse(en), TELUGU);
});
