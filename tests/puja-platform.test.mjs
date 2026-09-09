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
const catalogueMod = await vite.ssrLoadModule("/lib/puja/catalogue.ts");
const { PUJA_CATALOGUE, MORE_PUJAS_COMING_MESSAGE, availablePujas, findPujaBySlug } = catalogueMod;
const { VINAYAKA_PUJA, VINAYAKA_PUJA_SLUG } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { RITUAL_STEPS } = await vite.ssrLoadModule("/lib/content/steps.ts");
const { BETA_MATERIALS } = await vite.ssrLoadModule("/lib/pujas/vinayaka/beta-journey.ts");
const { parseProgress } = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const { groupPujaMaterialsForPath } = await vite.ssrLoadModule("/lib/puja/types.ts");
const { ReviewerModeScreen } = await vite.ssrLoadModule("/components/platform/reviewer-mode-screen.tsx");
const { createParticipant } = await vite.ssrLoadModule("/lib/content/participants.ts");

const noop = () => {};
const render = (element) => renderToStaticMarkup(element);

/* -------------------------------------------------------------------------- */
/* The catalogue contains Vinayaka as the only available service              */
/* -------------------------------------------------------------------------- */

test("the catalogue contains exactly one available puja: Vinayaka Chavithi", () => {
  const available = availablePujas();
  assert.equal(available.length, 1);
  assert.equal(available[0].slug, VINAYAKA_PUJA_SLUG);
  assert.equal(available[0].displayName, "Vinayaka Chavithi");
  assert.equal(available[0].availability, "AVAILABLE");
});

test("the catalogue never invents a fake future puja", () => {
  // Every entry in the catalogue is a real service with real content, not a
  // coming-soon placeholder with no data - PUJA_CATALOGUE has exactly the one
  // real service today.
  assert.equal(PUJA_CATALOGUE.length, 1);
  for (const puja of PUJA_CATALOGUE) {
    assert.ok(puja.steps.length > 0, `${puja.slug} must have real steps, not a placeholder`);
    assert.ok(puja.materials.items.length > 0, `${puja.slug} must have real materials, not a placeholder`);
  }
});

test("findPujaBySlug resolves the known slug and nothing else", () => {
  assert.equal(findPujaBySlug(VINAYAKA_PUJA_SLUG)?.slug, VINAYAKA_PUJA_SLUG);
  assert.equal(findPujaBySlug("some-future-puja"), undefined);
});

test("the catalogue screen shows the more-pujas message and no invented puja", () => {
  const html = render(
    React.createElement(page.PujaCatalogueScreen, {
      pujas: availablePujas(),
      comingSoonMessage: MORE_PUJAS_COMING_MESSAGE,
      onSelect: noop,
    }),
  );
  assert.match(html, /Vinayaka Chavithi/);
  assert.match(html, new RegExp(MORE_PUJAS_COMING_MESSAGE));
  assert.doesNotMatch(html, /coming soon puja/i);
});

/* -------------------------------------------------------------------------- */
/* The complete current journey is entered through the generic definition     */
/* -------------------------------------------------------------------------- */

test("VINAYAKA_PUJA is assembled from the real content modules, not new data", () => {
  assert.equal(VINAYAKA_PUJA.steps, RITUAL_STEPS, "steps must be the same array, not a copy or invented data");
  // Materials are derived from the sourced candidate steps (BETA_MATERIALS).
  assert.deepEqual(
    VINAYAKA_PUJA.materials.items.map((m) => m.id),
    BETA_MATERIALS.map((m) => m.id),
    "materials must be the candidate-derived list, not invented data",
  );
});

test("PrepareScreen renders Vinayaka's real materials only through the generic puja prop", () => {
  const html = render(
    React.createElement(page.PrepareScreen, {
      puja: VINAYAKA_PUJA,
      activeList: [{ ...createParticipant("p1"), name: "Mahesh" }],
      availableMaterialIds: [],
      toggleMaterial: noop,
      patriSelfReport: null,
      setPatriSelfReport: noop,
      pujaPath: "COMPLETE",
      setPujaPath: noop,
      goToPeople: noop,
      start: noop,
    }),
  );
  // Complete path shows every path-applicable material (all of them, for
  // Vinayaka), through puja.materials only.
  const shown = [
    ...groupPujaMaterialsForPath(VINAYAKA_PUJA, "COMPLETE").needed,
    ...groupPujaMaterialsForPath(VINAYAKA_PUJA, "COMPLETE").optional,
    ...groupPujaMaterialsForPath(VINAYAKA_PUJA, "COMPLETE").traditionSpecific,
  ];
  assert.equal(shown.length, VINAYAKA_PUJA.materials.items.length);
  for (const item of shown) {
    assert.ok(html.includes(item.name), `material "${item.name}" must render from puja.materials`);
  }
  assert.ok(html.includes(VINAYAKA_PUJA.patri.sectionTitle));
});

test("Simple path does not list a Complete-only material as needed", () => {
  const simple = groupPujaMaterialsForPath(VINAYAKA_PUJA, "SIMPLE");
  const complete = groupPujaMaterialsForPath(VINAYAKA_PUJA, "COMPLETE");
  const simpleIds = new Set([...simple.needed, ...simple.optional, ...simple.traditionSpecific].map((m) => m.id));
  const completeIds = new Set([...complete.needed, ...complete.optional, ...complete.traditionSpecific].map((m) => m.id));
  assert.ok(simpleIds.size < completeIds.size, "Simple has a smaller applicable set");
  // The Kalasha vessel is only used by a Complete-only step.
  assert.ok(completeIds.has("kalasha"));
  assert.ok(!simpleIds.has("kalasha"), "kalasha must not appear as needed for Simple");
});

test("PujaScreen renders Vinayaka's real step titles only through the generic puja prop", () => {
  const html = render(
    React.createElement(page.PujaScreen, {
      puja: VINAYAKA_PUJA,
      stepIndex: 0,
      setStepIndex: noop,
      finish: noop,
      path: "SIMPLE",
      language: "EN",
      setLanguage: noop,
      activeList: [],
    }),
  );
  assert.match(html, new RegExp(RITUAL_STEPS[0].title));
});

/* -------------------------------------------------------------------------- */
/* Platform components do not import Vinayaka content constants directly      */
/* -------------------------------------------------------------------------- */

const PLATFORM_FILES = [
  "app/page.tsx",
  "components/platform/home-screen.tsx",
  "components/platform/puja-catalogue-screen.tsx",
  "components/platform/location-screen.tsx",
  "components/platform/people-screen.tsx",
  "components/platform/review-display.tsx",
  "components/platform/prepare-screen.tsx",
  "components/platform/puja-screen.tsx",
  "components/platform/complete-screen.tsx",
  "components/platform/reviewer-mode-screen.tsx",
];

// The four content files that hold Vinayaka's own ritual content. A platform
// component may reuse a *type* from one of these (a type-only import is
// erased at build time and creates no runtime dependency - e.g. PrepareScreen
// typing its patriSelfReport prop from leaves.ts's PatriSelfReport union) but
// must never import a *value* from one of them.
const VINAYAKA_CONTENT_IMPORT_PATTERN =
  /["'@/]lib\/content\/(steps|materials|leaves|festival)(\.ts)?["']/;

// PILOT_DATA_NOTE is deliberately excluded: lib/puja/festival.ts (the
// generic, platform-level module) legitimately defines its own constant of
// that name, unrelated to lib/content/festival.ts's Vinayaka one.
const VINAYAKA_CONTENT_IDENTIFIERS = [
  "RITUAL_STEPS", "MATERIALS", "MATERIAL_CATEGORY_LABEL", "MATERIALS_DISCLAIMER",
  "PATRI_SECTION_TITLE", "PATRI_REVIEW_NOTICE", "PATRI_SAFETY_NOTE",
  "PATRI_SELF_REPORT_OPTIONS", "PATRI_PROVENANCE", "PILOT_FESTIVAL",
];

// Strip line and block comments so a source-text check never flags a file's
// own explanatory prose about what it does not import.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("no platform component imports a Vinayaka content value directly (type-only imports are exempt)", () => {
  for (const file of PLATFORM_FILES) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const codeLines = stripComments(source)
      .split("\n")
      .filter((line) => !line.trim().startsWith("import type "));
    for (const line of codeLines) {
      assert.doesNotMatch(
        line, VINAYAKA_CONTENT_IMPORT_PATTERN,
        `${file} must not import a value from lib/content/steps|materials|leaves|festival: "${line.trim()}"`,
      );
    }
  }
});

test("no platform component references a Vinayaka content constant by name", () => {
  for (const file of PLATFORM_FILES) {
    const source = stripComments(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
    for (const identifier of VINAYAKA_CONTENT_IDENTIFIERS) {
      assert.ok(
        !source.includes(identifier),
        `${file} must not reference ${identifier} directly`,
      );
    }
  }
});

test("the Vinayaka service module is the one place that assembles the content into a PujaDefinition", () => {
  const source = readFileSync(
    new URL("../lib/pujas/vinayaka/service.ts", import.meta.url), "utf8",
  );
  assert.match(source, /RITUAL_STEPS/);
  assert.match(source, /MATERIALS/);
});

/* -------------------------------------------------------------------------- */
/* An obvious reviewer-mode entry exists                                      */
/* -------------------------------------------------------------------------- */

test("the home coordinator renders an obvious reviewer-mode entry point", () => {
  const html = render(React.createElement(page.default));
  assert.match(html, /Reviewer mode/i);
});

test("the reviewer-mode screen explains itself and stores the choice only on this device", () => {
  const html = render(
    React.createElement(ReviewerModeScreen, { mode: "FAMILY_BETA", setMode: noop }),
  );
  assert.match(html, /invited priests/i);
  assert.match(html, /stays on this device/i);
  assert.match(html, /Turn on reviewer mode/);
  // Audio samples are reviewer-only.
  assert.doesNotMatch(html, /Audio voice samples/);
});

test("REVIEWER mode shows the 4 voice-comparison audio samples with players", () => {
  const html = render(
    React.createElement(ReviewerModeScreen, { mode: "REVIEWER", setMode: noop }),
  );
  assert.match(html, /Audio voice samples/);
  assert.match(html, /te-IN-ShrutiNeural/);
  assert.match(html, /te-IN-MohanNeural/);
  assert.match(html, /rate -12%/); // the slower mantra samples
  assert.match(html, /mantra samples are review candidates, never priest-approved/i);
  // four <audio> elements, one per sample
  assert.equal((html.match(/<audio /g) ?? []).length, 4);
  assert.match(html, /src="\/audio\/v1\/bhuta-shuddhi\.mantra\.te\.shruti\.mp3"/);
});

/* -------------------------------------------------------------------------- */
/* Existing saved progress remains readable                                   */
/* -------------------------------------------------------------------------- */

test("a legacy flat saved-progress record migrates into a per-puja run under the Vinayaka slug", () => {
  const legacyRaw = JSON.stringify({
    mode: "FAMILY",
    participants: [{ id: "p1", name: "Lakshmi", gotra: { status: "UNKNOWN", name: "" } }],
    availableMaterialIds: ["murti", "lamp"],
    patriSelfReport: "NONE",
    stepIndex: 3,
    pujaPath: "COMPLETE",
    language: "TE",
  });
  const progress = parseProgress(legacyRaw);
  // Shared, person-level fields stay at the top.
  assert.equal(progress.mode, "FAMILY");
  assert.equal(progress.participants[0].name, "Lakshmi");
  assert.equal(progress.language, "TE");
  // The run fields moved into runs["vinayaka-chavithi"].
  const run = progress.runs["vinayaka-chavithi"];
  assert.ok(run, "migrated into the Vinayaka run");
  assert.deepEqual(run.availableMaterialIds, ["murti", "lamp"]);
  assert.equal(run.patriSelfReport, "NONE");
  assert.equal(run.stepIndex, 3);
  assert.equal(run.pujaPath, "COMPLETE");
  // stepIndex 3 with no runState -> derived as IN_PROGRESS so the run resumes.
  assert.equal(run.runState, "IN_PROGRESS");
});

test("a legacy record with pujaCompleted:true migrates to a COMPLETED run", () => {
  const raw = JSON.stringify({
    mode: "SELF", participants: [{ id: "p1", name: "Mahesh" }],
    stepIndex: 15, pujaPath: "SIMPLE", pujaCompleted: true,
  });
  const progress = parseProgress(raw);
  assert.equal(progress.runs["vinayaka-chavithi"].runState, "COMPLETED");
});
