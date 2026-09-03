import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const participants = await vite.ssrLoadModule("/lib/content/participants.ts");
const shared = await vite.ssrLoadModule("/lib/content/lineage-candidates.ts");
const vedaMod = await vite.ssrLoadModule("/lib/content/veda-candidates.ts");
const sutraMod = await vite.ssrLoadModule("/lib/content/sutra-candidates.ts");
const sampradayaMod = await vite.ssrLoadModule("/lib/content/sampradaya-candidates.ts");
const provenance = await vite.ssrLoadModule("/lib/content/provenance.ts");
const storage = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const page = await vite.ssrLoadModule("/app/page.tsx");

const {
  LINEAGE_FIELDS,
  createParticipant,
  normalizeLineageField,
  normalizeParticipant,
  validateParticipant,
  withLineageField,
} = participants;

const metaFor = (key) => LINEAGE_FIELDS.find((f) => f.key === key);

/* -------------------------------------------------------------------------- */
/* The candidate lists are unreviewed and not authoritative                   */
/* -------------------------------------------------------------------------- */

test("candidate lists are REVIEW_REQUIRED with no reviewer", () => {
  assert.equal(shared.LINEAGE_CANDIDATE_REVIEW_STATUS, "REVIEW_REQUIRED");
  for (const p of [
    vedaMod.VEDA_CANDIDATES_PROVENANCE,
    sutraMod.SUTRA_CANDIDATES_PROVENANCE,
    sampradayaMod.SAMPRADAYA_CANDIDATES_PROVENANCE,
  ]) {
    assert.equal(provenance.hasReviewer(p), false);
    assert.equal(
      provenance.canDisplayAsGuidance("REVIEW_REQUIRED", p),
      false,
    );
  }
});

test("disclaimers say the list is not complete or authoritative", () => {
  for (const text of [
    vedaMod.VEDA_CANDIDATES_DISCLAIMER,
    sutraMod.SUTRA_CANDIDATES_DISCLAIMER,
    sampradayaMod.SAMPRADAYA_CANDIDATES_DISCLAIMER,
  ]) {
    assert.match(text, /being reviewed/i);
    assert.match(text, /not complete or authoritative/i);
    assert.match(text, /spelling/i);
    assert.match(text, /My value is not listed/i);
  }
});

test("each candidate list is a non-empty list of distinct values", () => {
  for (const list of [
    vedaMod.VEDA_CANDIDATES,
    sutraMod.SUTRA_CANDIDATES,
    sampradayaMod.SAMPRADAYA_CANDIDATES,
  ]) {
    assert.ok(list.length > 0);
    const values = list.map((c) => c.value);
    assert.equal(new Set(values).size, values.length, "no duplicate values");
    for (const v of values) assert.ok(v && v.trim() === v && v.length > 1);
  }
});

/* -------------------------------------------------------------------------- */
/* Selecting a listed value                                                   */
/* -------------------------------------------------------------------------- */

test("selecting a listed value stores it verbatim and is valid", () => {
  const listed = vedaMod.VEDA_CANDIDATES[0].value; // e.g. "Rigveda"
  const person = normalizeParticipant(
    withLineageField(
      { ...createParticipant("p1"), name: "Mahesh" },
      "veda",
      { status: "KNOWN", name: listed, custom: false },
    ),
  );

  assert.deepEqual(person.veda, { status: "KNOWN", name: listed });
  assert.equal("custom" in person.veda, false);
  assert.equal(validateParticipant(person).valid, true);
});

/* -------------------------------------------------------------------------- */
/* Entering an unlisted value                                                 */
/* -------------------------------------------------------------------------- */

test("entering an unlisted value keeps the exact custom text", () => {
  const custom = "Our family Grihyasutra (rare)";
  assert.ok(
    sutraMod.SUTRA_CANDIDATES.every((c) => c.value !== custom),
    "value is genuinely not in the list",
  );

  const person = normalizeParticipant(
    withLineageField(
      { ...createParticipant("p1"), name: "Mahesh" },
      "sutra",
      { status: "KNOWN", name: custom, custom: true },
    ),
  );

  assert.deepEqual(person.sutra, { status: "KNOWN", name: custom, custom: true });
  assert.equal(validateParticipant(person).valid, true);
});

/* -------------------------------------------------------------------------- */
/* Changing to UNKNOWN / UNSURE clears the stored value                       */
/* -------------------------------------------------------------------------- */

test("changing to UNKNOWN clears a listed value", () => {
  const start = { status: "KNOWN", name: "Samaveda", custom: false };
  const after = withLineageField(
    { ...createParticipant("p1"), veda: start },
    "veda",
    { status: "UNKNOWN", name: "", custom: false },
  ).veda;
  assert.deepEqual(normalizeLineageField(after), { status: "UNKNOWN", name: "" });
  // Direct: even a stale name/custom is dropped.
  assert.deepEqual(
    normalizeLineageField({ status: "UNKNOWN", name: "Samaveda", custom: true }),
    { status: "UNKNOWN", name: "" },
  );
});

test("changing to UNSURE clears a custom value", () => {
  const start = { status: "KNOWN", name: "Our own school", custom: true };
  const after = withLineageField(
    { ...createParticipant("p1"), sampradaya: start },
    "sampradaya",
    { status: "UNSURE", name: "", custom: false },
  ).sampradaya;
  assert.deepEqual(normalizeLineageField(after), { status: "UNSURE", name: "" });
  assert.deepEqual(
    normalizeLineageField({ status: "UNSURE", name: "Our own school", custom: true }),
    { status: "UNSURE", name: "" },
  );
});

/* -------------------------------------------------------------------------- */
/* One selection never populates another field                                */
/* -------------------------------------------------------------------------- */

test("selecting one lineage value leaves every other field untouched", () => {
  const base = { ...createParticipant("p1"), name: "Mahesh" };

  const afterVeda = withLineageField(base, "veda", {
    status: "KNOWN",
    name: "Atharvaveda",
    custom: false,
  });
  assert.deepEqual(afterVeda.gotra, base.gotra);
  assert.deepEqual(afterVeda.sutra, base.sutra);
  assert.deepEqual(afterVeda.sampradaya, base.sampradaya);

  const afterCustomSutra = withLineageField(afterVeda, "sutra", {
    status: "KNOWN",
    name: "Something rare",
    custom: true,
  });
  assert.deepEqual(afterCustomSutra.gotra, base.gotra);
  assert.deepEqual(afterCustomSutra.sampradaya, base.sampradaya);
  assert.equal(afterCustomSutra.veda.name, "Atharvaveda");

  const normalized = normalizeParticipant(afterCustomSutra);
  assert.deepEqual(normalized.gotra, { status: "UNKNOWN", name: "" });
  assert.deepEqual(normalized.sampradaya, { status: "UNKNOWN", name: "" });
});

/* -------------------------------------------------------------------------- */
/* Save and reload preserves listed and custom values                        */
/* -------------------------------------------------------------------------- */

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
  };
}

test("save and reload preserves a listed value and a custom value", () => {
  const progress = {
    mode: "FAMILY",
    participants: [
      normalizeParticipant(
        withLineageField(
          { ...createParticipant("p1"), name: "Mahesh" },
          "veda",
          { status: "KNOWN", name: "Yajurveda", custom: false },
        ),
      ),
      normalizeParticipant(
        withLineageField(
          { ...createParticipant("p2"), name: "Lakshmi" },
          "sampradaya",
          { status: "KNOWN", name: "Our village tradition", custom: true },
        ),
      ),
    ],
    availableMaterialIds: [],
    patriSelfReport: null,
    stepIndex: 0,
  };

  const store = makeFakeStorage();
  storage.saveProgress(progress, store);
  const loaded = storage.loadProgress(store);

  assert.deepEqual(loaded.participants[0].veda, {
    status: "KNOWN",
    name: "Yajurveda",
  });
  assert.deepEqual(loaded.participants[1].sampradaya, {
    status: "KNOWN",
    name: "Our village tradition",
    custom: true,
  });
});

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

const renderRow = (key, value) =>
  renderToStaticMarkup(
    React.createElement(page.LineageFieldRow, {
      field: metaFor(key),
      value,
      onChange: () => {},
    }),
  );

test("a KNOWN Veda field renders a searchable select with the candidates", () => {
  const html = renderRow("veda", { status: "KNOWN", name: "" });
  assert.match(html, /Search the Veda list/);
  assert.match(html, /<select/);
  for (const c of vedaMod.VEDA_CANDIDATES) {
    assert.ok(html.includes(c.value), `option for ${c.value}`);
  }
  assert.match(html, /My value is not listed/);
  assert.match(html, /not complete or authoritative/i);
  assert.match(html, /Still being reviewed/i); // the REVIEW_REQUIRED chip
});

test("a KNOWN Gotra field still renders a plain text input, no candidate list", () => {
  const html = renderRow("gotra", { status: "KNOWN", name: "" });
  assert.match(html, /Gotra name/);
  assert.match(html, /Enter exactly as you know it/);
  assert.doesNotMatch(html, /My value is not listed/);
  assert.doesNotMatch(html, /Search the Gotra list/);
});

test("the custom mode renders a free-text input holding the exact value", () => {
  const html = renderRow("sutra", {
    status: "KNOWN",
    name: "Grandfather's school",
    custom: true,
  });
  assert.match(html, /your own value/i);
  assert.match(html, /value="Grandfather&#x27;s school"/);
  assert.match(html, /Choose from the list instead/);
});

test("UNKNOWN and UNSURE render only the status question", () => {
  for (const status of ["UNKNOWN", "UNSURE"]) {
    const html = renderRow("veda", { status, name: "" });
    assert.match(html, /Do you know the Veda\?/);
    assert.doesNotMatch(html, /Search the Veda list/);
    assert.doesNotMatch(html, /My value is not listed/);
  }
});
