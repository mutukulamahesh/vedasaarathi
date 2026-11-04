// Diwali Lakshmi Puja - focused regression tests for this feature, covering
// (at minimum, per this project's testing convention):
//   - catalogue registration (lib/puja/catalogue.ts)
//   - the new Sankalpam assembly logic (canonical karma + the fixed family
//     audio Part B text genuinely matching the generic generator's output)
//   - the pending-choices-block-Begin safeguard, verified for THIS puja
//     specifically (not assumed to be inherited for free)
// Never asserts on Vinayaka's own content changing - this file only adds
// coverage, it does not touch lib/pujas/vinayaka/*.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const page = await vite.ssrLoadModule("/app/page.tsx");
const { DIWALI_PUJA, DIWALI_PUJA_SLUG } = await vite.ssrLoadModule("/lib/pujas/diwali-lakshmi/service.ts");
const { VINAYAKA_PUJA, VINAYAKA_PUJA_SLUG } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { PUJA_CATALOGUE, availablePujas, findPujaBySlug } = await vite.ssrLoadModule("/lib/puja/catalogue.ts");
const {
  stepsForPujaPath, pujaPathIncludesPatri, clampPujaStepIndex,
} = await vite.ssrLoadModule("/lib/puja/types.ts");
const { canDisplayAsGuidance } = await vite.ssrLoadModule("/lib/content/provenance.ts");
const { canDisplayAsBetaCandidate } = await vite.ssrLoadModule("/lib/content/beta-visibility.ts");
const {
  generateSankalpam, buildSankalpamRequest, canonicalKarmaForSlug, canonicalDeityForSlug,
  familySankalpamPartBForSlug, familyAudioMatchesGen, defaultSankalpamChoices,
} = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const { festivalRule } = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");
const {
  DIWALI_SANKALPAM_TELUGU, DIWALI_SANKALPAM_SUPPORTED_SLOTS, DIWALI_SANKALPAM_UNSUPPORTED_SLOTS,
} = await vite.ssrLoadModule("/lib/pujas/diwali-lakshmi/sankalpam.ts");

/* -------------------------------------------------------------------------- */
/* Catalogue registration                                                    */
/* -------------------------------------------------------------------------- */

test("the Diwali Lakshmi Puja is registered in the catalogue, available, alongside Vinayaka", () => {
  assert.ok(findPujaBySlug(DIWALI_PUJA_SLUG), "resolvable by slug");
  assert.equal(findPujaBySlug(DIWALI_PUJA_SLUG).displayName, "Diwali Lakshmi Puja");
  const available = availablePujas();
  const slugs = available.map((p) => p.slug);
  assert.ok(slugs.includes(DIWALI_PUJA_SLUG), "Diwali is available");
  assert.ok(slugs.includes(VINAYAKA_PUJA_SLUG), "adding Diwali does not hide Vinayaka");
  assert.equal(PUJA_CATALOGUE.length, 2, "exactly the two real pujas, no invented placeholder");
});

// DLP-P1 (prepare the space) and DLP-31 (practical completion) are editorial,
// non-mantra staging/closing guidance - P1 prints no setup or farewell
// instructions at all (master document Section 6.4). They make no religious
// claim, so - exactly like Vinayaka's own practical lead-in steps
// (lib/pujas/vinayaka/beta-journey.ts BETA_PREP_STEPS) - they are
// GENERAL_GUIDANCE/APPROVED_GUIDANCE (always displayable), not
// REVIEW_REQUIRED/SOURCED_BETA_CANDIDATE.
const EDITORIAL_PRACTICAL_STEP_IDS = new Set(["dlp-p1", "dlp-31"]);

test("every SOURCED Diwali step (every mantra/recitation step) is REVIEW_REQUIRED, locked, and eligible for the beta candidate gate but NOT the approved-guidance gate", () => {
  assert.equal(DIWALI_PUJA.steps.length, 32, "DLP-P1 + DLP-01..DLP-31");
  for (const step of DIWALI_PUJA.steps) {
    if (EDITORIAL_PRACTICAL_STEP_IDS.has(step.id)) continue;
    assert.equal(step.reviewStatus, "REVIEW_REQUIRED", `${step.id} is REVIEW_REQUIRED`);
    assert.equal(step.locked, true, `${step.id} is locked`);
    assert.equal(canDisplayAsGuidance(step.reviewStatus, step.provenance), false,
      `${step.id} must never pass canDisplayAsGuidance - no priest review has happened`);
    const betaContent = {
      betaStatus: step.betaStatus, includedInBeta: step.includedInBeta,
      sourceId: step.sourceRefs?.[0]?.sourceId ?? null, sourcePage: step.sourceRefs?.[0]?.page ?? null,
      onlineSection: null, contentVersion: step.provenance.contentVersion ?? null,
    };
    assert.equal(canDisplayAsBetaCandidate(betaContent), true,
      `${step.id} must pass canDisplayAsBetaCandidate - it is sourced, included, with a page and version`);
  }
});

test("a step's beginner physical action is flagged BETA_ACTION_NEEDS_REVIEW unless the master document itself gave an explicit How field", () => {
  // Steps where docs/pujas/diwali-lakshmi-puja-master.md Section 5 printed an
  // explicit "How:" / "[App-team accommodation]" field for this step - this
  // implementation pass carried that wording over, not invented it.
  const sourcedHowIds = new Set([
    "dlp-04", "dlp-06", "dlp-07", "dlp-08", "dlp-10", "dlp-11", "dlp-12", "dlp-13",
    "dlp-15", "dlp-16", "dlp-20", "dlp-21", "dlp-22", "dlp-23", "dlp-24", "dlp-25",
    "dlp-26", "dlp-27", "dlp-28",
  ]);
  for (const step of DIWALI_PUJA.steps) {
    if (EDITORIAL_PRACTICAL_STEP_IDS.has(step.id)) continue; // no beginner action at all
    if (sourcedHowIds.has(step.id)) {
      assert.equal(step.betaActionNeedsReview, false, `${step.id}: master document gave an explicit How - not flagged`);
    } else {
      assert.equal(step.betaActionNeedsReview, true,
        `${step.id}: no How field in the master document - this pass's own minimal literal action must stay flagged for reviewer attention`);
    }
  }
});

test("the two editorial/practical steps (DLP-P1, DLP-31) are honestly GENERAL_GUIDANCE, unlocked, and always displayable - they carry no religious claim", () => {
  for (const id of EDITORIAL_PRACTICAL_STEP_IDS) {
    const step = DIWALI_PUJA.steps.find((s) => s.id === id);
    assert.ok(step, `${id} exists`);
    assert.equal(step.reviewStatus, "GENERAL_GUIDANCE");
    assert.equal(step.locked, false);
    assert.equal(canDisplayAsGuidance(step.reviewStatus, step.provenance), true);
    assert.equal(step.mantraTeluguScript, null, `${id} is not a mantra step`);
  }
});

test("steps are in the documented DLP order, DLP-P1 first and DLP-31 last", () => {
  const ids = DIWALI_PUJA.steps.map((s) => s.id);
  assert.equal(ids[0], "dlp-p1");
  assert.equal(ids[ids.length - 1], "dlp-31");
  assert.deepEqual(ids, [
    "dlp-p1", ...Array.from({ length: 31 }, (_, i) => `dlp-${String(i + 1).padStart(2, "0")}`),
  ]);
});

test("DLP-11 (Asana) displays the selected 'ratna khachita' reading, never P1's literal 'natna khachita'", () => {
  const step = DIWALI_PUJA.steps.find((s) => s.id === "dlp-11");
  assert.ok(step.mantraTeluguScript.includes("రత్న ఖచిత"));
  assert.ok(!step.mantraTeluguScript.includes("నత్న"), "the unattested literal reading must never be the displayed/audio text");
  assert.ok(step.mantraTransliteration.includes("ratna khachita"));
  assert.ok(!step.mantraTransliteration.includes("natna"));
});

test("DLP-24 (Naivedyam) displays P1's own Lakshmi-addressed operative line, never the Durga-addressed descriptive verse", () => {
  const step = DIWALI_PUJA.steps.find((s) => s.id === "dlp-24");
  assert.ok(step.mantraTeluguScript.includes("శ్రీ మహాలక్ష్మీ దేవ్యై నమః నైవేద్యం సమర్పయామి"));
  assert.ok(!step.mantraTeluguScript.includes("దుర్గే"), "Durga's name must not appear in the selected recitation");
  assert.ok(!step.mantraTeluguScript.includes("మహిషాసుర"), "Mahishasura Mardini must not appear in the selected recitation");
});

test("DLP-21 (Ashtottara Stotram) carries the full P1 Roman transliteration, and its Telugu title says Stotram, not just Namavali", () => {
  const step = DIWALI_PUJA.steps.find((s) => s.id === "dlp-21");
  assert.ok(step, "dlp-21 exists");

  // The user-facing Telugu heading must identify this as a stotram (matching
  // the step's own English title and the master document's Section 6.1
  // decision), not just reproduce P1's own "namavali" print heading.
  assert.ok(step.teluguTitle.includes("స్తోత్రం"),
    "the Telugu title/heading must say Stotram, matching the English title");
  assert.equal(step.title, "Lakshmi Ashtottara Shatanama Stotram");

  // The full transliteration must now be present (previously left empty),
  // covering all 16 numbered verses plus the two intro verses, with the
  // same four corrections documented in the master document Section 6.7.
  assert.equal(step.transliterationSupported, true);
  assert.ok(step.mantraTransliteration.length > 0);
  for (let n = 1; n <= 16; n += 1) {
    assert.ok(
      step.mantraTransliteration.includes(` ${n}\n`) || step.mantraTransliteration.endsWith(` ${n}`),
      `verse ${n} is present in the transliteration`,
    );
  }
  assert.ok(step.mantraTransliteration.startsWith("vaMdae padmakaraaM"), "starts with the first intro verse");
  assert.ok(step.mantraTransliteration.includes("aSOkaa, amRtaaM deeptaaM"), "verse 4 correction applied");
  assert.ok(!step.mantraTransliteration.includes("aSOkaa,mamRtaaM"), "verse 4's unattested run-on must not appear");
  assert.ok(step.mantraTransliteration.includes("varaarOhaaM"), "verse 10 correction applied (vara- prefix present)");
  assert.ok(step.mantraTransliteration.includes("straiNasaumyaaM"), "verse 11 correction applied (leading t present)");
  assert.ok(step.mantraTransliteration.includes("SreemannaMda"),
    "verse 15 matches the Telugu-script reading (geminated n), not the transliteration page's own 'SreemanmaMda' misprint");
  assert.ok(!step.mantraTransliteration.includes("SreemanmaMda"));
});

test("no patri (leaf-offering) section for this puja on either path", () => {
  assert.equal(pujaPathIncludesPatri(DIWALI_PUJA, "SIMPLE"), false);
  assert.equal(pujaPathIncludesPatri(DIWALI_PUJA, "COMPLETE"), false);
});

test("Simple and Complete paths are identical for this puja (no alternate ritual mode was introduced)", () => {
  const simple = stepsForPujaPath(DIWALI_PUJA, "SIMPLE").map((s) => s.id);
  const complete = stepsForPujaPath(DIWALI_PUJA, "COMPLETE").map((s) => s.id);
  assert.deepEqual(simple, complete);
});

test("clampPujaStepIndex stays inside the Diwali step range", () => {
  assert.equal(clampPujaStepIndex(-5, DIWALI_PUJA.steps.length), 0);
  assert.equal(clampPujaStepIndex(999, DIWALI_PUJA.steps.length), DIWALI_PUJA.steps.length - 1);
});

/* -------------------------------------------------------------------------- */
/* The new Sankalpam assembly logic                                         */
/* -------------------------------------------------------------------------- */

test("the Diwali-specific Sankalpam module records P1's own short-form text and its supported/unsupported slots", () => {
  assert.match(DIWALI_SANKALPAM_TELUGU, /శ్రీ మహాలక్ష్మీ దేవతా ప్రీత్యర్థం/);
  assert.ok(DIWALI_SANKALPAM_SUPPORTED_SLOTS.some((s) => s.id === "performers"));
  assert.ok(DIWALI_SANKALPAM_SUPPORTED_SLOTS.some((s) => s.id === "family-scope"));
  const unsupportedIds = DIWALI_SANKALPAM_UNSUPPORTED_SLOTS.map((s) => s.id);
  // Same gap shape as Vinayaka's own Sankalpam - never invented.
  assert.deepEqual(unsupportedIds.sort(), ["date-calendar", "gotra", "place", "sampradaya", "sutra", "veda"].sort());
});

test("canonicalKarmaForSlug resolves Diwali's own Telugu deity/purpose - distinct from Vinayaka's, and Vinayaka's is unchanged", () => {
  const diwali = canonicalKarmaForSlug(DIWALI_PUJA_SLUG);
  assert.equal(diwali.deityTe, "శ్రీ మహాలక్ష్మీ");
  assert.equal(diwali.purposeTe, "దీపావళి లక్ష్మీ పూజ");
  const vinayaka = canonicalKarmaForSlug(VINAYAKA_PUJA_SLUG);
  assert.equal(vinayaka.deityTe, "శ్రీ మహాగణపతి", "Vinayaka's own canonical karma is unchanged by adding Diwali's");
  assert.equal(vinayaka.purposeTe, "వినాయక చవితి పూజ");
});

test("canonicalDeityForSlug resolves the correct Roman/English deity name per puja, unknown slug falls back honestly", () => {
  assert.equal(canonicalDeityForSlug(DIWALI_PUJA_SLUG), "Sri Mahalakshmi");
  assert.equal(canonicalDeityForSlug(VINAYAKA_PUJA_SLUG), "Sri Maha Ganapati");
  assert.equal(canonicalDeityForSlug("some-future-puja"), null);
});

function genDiwaliFamily(choices, over = {}) {
  return generateSankalpam(buildSankalpamRequest({
    purpose: DIWALI_PUJA.displayName,
    deity: canonicalDeityForSlug(DIWALI_PUJA_SLUG),
    slug: DIWALI_PUJA_SLUG,
    mode: "FAMILY",
    participants: [{
      id: "p1", name: over.name ?? "",
      gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
      sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
    }],
    location: {},
    panchanga: null,
    choices: { familyGotra: "", groupRecitation: null, ...choices },
  }));
}

const STANDARD = { calendarForm: "SHORT", placeDetail: "OMIT", unknownGotra: "OMIT" };

test("the fixed Diwali family Part B clip is BYTE-IDENTICAL to what the generic generator actually produces for the standard short family form", () => {
  const gen = genDiwaliFamily(STANDARD);
  const expectedPartBText = familySankalpamPartBForSlug(DIWALI_PUJA_SLUG).text;
  assert.ok(expectedPartBText.includes("శ్రీ మహాలక్ష్మీ ప్రీత్యర్థం దీపావళి లక్ష్మీ పూజ కరిష్యే"));
  assert.equal(
    familyAudioMatchesGen(gen, expectedPartBText), true,
    "the hand-authored fixed clip text must match the generator's own output exactly, or the family would hear audio that does not match the displayed Telugu",
  );
});

test("the Diwali Part B clip is genuinely distinct from Vinayaka's own fixed Part B (no cross-puja audio leak)", () => {
  const diwaliPartB = familySankalpamPartBForSlug(DIWALI_PUJA_SLUG);
  const vinayakaPartB = familySankalpamPartBForSlug(VINAYAKA_PUJA_SLUG);
  assert.notEqual(diwaliPartB.text, vinayakaPartB.text);
  assert.notEqual(diwaliPartB.src, vinayakaPartB.src);
});

test("a non-standard Diwali Sankalpam configuration (a KNOWN Gotra) is correctly reported as NOT matching the fixed audio", () => {
  const gen = genDiwaliFamily(STANDARD, { name: "Mahesh" });
  // Even with a name, Gotra stays UNKNOWN/OMIT here so the text still matches;
  // flip to a KNOWN Gotra to exercise the mismatch path.
  const genWithGotra = generateSankalpam(buildSankalpamRequest({
    purpose: DIWALI_PUJA.displayName, deity: canonicalDeityForSlug(DIWALI_PUJA_SLUG), slug: DIWALI_PUJA_SLUG,
    mode: "FAMILY",
    participants: [{
      id: "p1", name: "Mahesh",
      gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
      sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
    }],
    location: {}, panchanga: null,
    choices: { ...STANDARD, familyGotra: "", groupRecitation: null },
  }));
  assert.match(genWithGotra.teluguScript, /గోత్రస్య/);
  assert.equal(familyAudioMatchesGen(gen, familySankalpamPartBForSlug(DIWALI_PUJA_SLUG).text), true);
  assert.equal(familyAudioMatchesGen(genWithGotra, familySankalpamPartBForSlug(DIWALI_PUJA_SLUG).text), false);
});

/* -------------------------------------------------------------------------- */
/* Pending-choices-block-Begin, verified for Diwali specifically             */
/* -------------------------------------------------------------------------- */

const ASSEMBLED = /class="sankalpam-assembled"/;
const PENDING_HINT_EN = /finish the remaining choices in Sankalpam setup/;

const SANKALPA_STEP_INDEX = stepsForPujaPath(DIWALI_PUJA, "COMPLETE")
  .findIndex((s) => s.candidateStepId === "sankalpa" || s.id === "sankalpa");

test("the Diwali Sankalpam step is reachable and located by the generic candidateStepId convention", () => {
  assert.ok(SANKALPA_STEP_INDEX >= 0, "found the Sankalpam step in Diwali's own step list");
  assert.equal(DIWALI_PUJA.steps[SANKALPA_STEP_INDEX].candidateStepId, "sankalpa");
});

function diwaliSankalpamHtml({ mode, activeList, sankalpamChoices }) {
  return renderToStaticMarkup(
    React.createElement(page.PujaScreen, {
      puja: DIWALI_PUJA, stepIndex: SANKALPA_STEP_INDEX, setStepIndex: () => {}, finish: () => {},
      path: "COMPLETE", language: "EN", setLanguage: () => {},
      activeList, mode, location: { status: "UNKNOWN" }, reviewMode: false, voices: [],
      sankalpamChoices,
    }),
  );
}

test("Diwali PujaScreen Sankalpam step, pending (unresolved Gotra): assembled Telugu is hidden, Begin-blocking message shown", () => {
  const html = diwaliSankalpamHtml({
    mode: "FAMILY",
    activeList: [{
      id: "p1", name: "Lakshmi",
      gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
      sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
    }],
    sankalpamChoices: defaultSankalpamChoices(),
  });
  assert.doesNotMatch(html, ASSEMBLED, "no recitable Telugu block while pending, for Diwali too");
  assert.match(html, PENDING_HINT_EN);
});

test("Diwali PujaScreen Sankalpam step, resolved: the assembled Lakshmi-specific text appears, not Vinayaka's", () => {
  const html = diwaliSankalpamHtml({
    mode: "FAMILY",
    activeList: [{
      id: "p1", name: "Lakshmi",
      gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
      sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
    }],
    sankalpamChoices: { ...defaultSankalpamChoices(), unknownGotra: "OMIT" },
  });
  assert.match(html, ASSEMBLED);
  assert.match(html, /దీపావళి లక్ష్మీ పూజ/);
  assert.doesNotMatch(html, /వినాయక చవితి పూజ/);
});

/* -------------------------------------------------------------------------- */
/* The existing Diwali festival entry links to this guide                   */
/* -------------------------------------------------------------------------- */

test("the Diwali / Lakshmi Puja festival rule links to this puja, and the slug resolves to a real, available puja", () => {
  const rule = festivalRule("diwali-lakshmi-puja");
  assert.equal(rule.pujaSlug, DIWALI_PUJA_SLUG);
  const puja = findPujaBySlug(rule.pujaSlug);
  assert.ok(puja, "the festival rule's pujaSlug resolves to a real catalogue entry");
  assert.equal(puja.availability, "AVAILABLE");
});

/* -------------------------------------------------------------------------- */
/* Regression: the completion screen must never say "Vinayaka" for a Diwali  */
/* run (found by the strengthened e2e walk-to-completion check this pass -   */
/* components/platform/complete-screen.tsx used to hardcode "Vinayaka Puja   */
/* completed" regardless of which puja was actually finished).               */
/* -------------------------------------------------------------------------- */

test("CompleteScreen names the actual puja finished (Diwali, not a hardcoded Vinayaka string)", () => {
  const en = renderToStaticMarkup(
    React.createElement(page.CompleteScreen, {
      home: () => {}, restart: () => {}, immersion: null, puja: DIWALI_PUJA, path: "SIMPLE", language: "EN",
    }),
  );
  assert.match(en, /Diwali Lakshmi Puja completed/);
  assert.doesNotMatch(en, /Vinayaka/i);

  const te = renderToStaticMarkup(
    React.createElement(page.CompleteScreen, {
      home: () => {}, restart: () => {}, immersion: null, puja: DIWALI_PUJA, path: "SIMPLE", language: "TE",
    }),
  );
  assert.match(te, /దీపావళి లక్ష్మీ పూజ పూర్తయింది/);
  assert.doesNotMatch(te, /వినాయక/);

  // Vinayaka's own completion screen is unaffected - still names itself, not Diwali.
  const vinayakaEn = renderToStaticMarkup(
    React.createElement(page.CompleteScreen, {
      home: () => {}, restart: () => {}, immersion: null, puja: VINAYAKA_PUJA, path: "SIMPLE", language: "EN",
    }),
  );
  assert.match(vinayakaEn, /Vinayaka Chavithi completed/);
  assert.doesNotMatch(vinayakaEn, /Diwali/i);
});
