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
const reviewStatusMod = await vite.ssrLoadModule("/lib/content/review-status.ts");
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

const CANDIDATE_LISTS = [
  { key: "veda", mod: vedaMod, list: vedaMod.VEDA_CANDIDATES },
  { key: "sutra", mod: sutraMod, list: sutraMod.SUTRA_CANDIDATES },
  { key: "sampradaya", mod: sampradayaMod, list: sampradayaMod.SAMPRADAYA_CANDIDATES },
];

const OTHER_KEYS = {
  gotra: ["veda", "sutra", "sampradaya"],
  veda: ["gotra", "sutra", "sampradaya"],
  sutra: ["gotra", "veda", "sampradaya"],
  sampradaya: ["gotra", "veda", "sutra"],
};

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
  for (const { list } of CANDIDATE_LISTS) {
    assert.ok(list.length > 0);
    const values = list.map((c) => c.value);
    assert.equal(new Set(values).size, values.length, "no duplicate values");
    for (const v of values) assert.ok(v && v.trim() === v && v.length > 1);
  }
});

test("VEDA_CANDIDATES lists distinct Yajurveda values, not Taittiriya", () => {
  assert.deepEqual(
    vedaMod.VEDA_CANDIDATES.map((c) => c.value),
    ["Rigveda", "Krishna Yajurveda", "Shukla Yajurveda", "Samaveda", "Atharvaveda"],
  );
  assert.ok(
    vedaMod.VEDA_CANDIDATES.every((c) => c.value !== "Yajurveda"),
    "plain 'Yajurveda' is not offered as one lumped value",
  );
  assert.ok(
    vedaMod.VEDA_CANDIDATES.every((c) => !c.note || !/taittiriya/i.test(c.note)),
    "Taittiriya is a Shakha and must not appear as a Veda alternate name",
  );
});

test("each candidate module exposes its own review status from config", () => {
  for (const { mod, key } of CANDIDATE_LISTS) {
    const upper = key.toUpperCase();
    assert.equal(mod[`${upper}_CANDIDATES_REVIEW_STATUS`], "REVIEW_REQUIRED");
    assert.equal(
      provenance.hasReviewer(mod[`${upper}_CANDIDATES_PROVENANCE`]),
      false,
    );
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
          { status: "KNOWN", name: "Krishna Yajurveda", custom: false },
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
    name: "Krishna Yajurveda",
  });
  assert.deepEqual(loaded.participants[1].sampradaya, {
    status: "KNOWN",
    name: "Our village tradition",
    custom: true,
  });
});

/* -------------------------------------------------------------------------- */
/* Every candidate in every list: store / normalize / reload / no siblings   */
/* -------------------------------------------------------------------------- */

test("every candidate stores as KNOWN, stays non-custom, and survives normalize + reload without touching siblings", () => {
  for (const { key, list } of CANDIDATE_LISTS) {
    for (const candidate of list) {
      const base = { ...createParticipant("p1"), name: "Mahesh" };
      const set = withLineageField(base, key, {
        status: "KNOWN",
        name: candidate.value,
        custom: false,
      });

      // stored as KNOWN, not flagged custom
      assert.equal(set[key].status, "KNOWN", candidate.value);
      assert.equal(set[key].name, candidate.value);
      assert.notEqual(set[key].custom, true);

      // no sibling lineage field changed
      for (const other of OTHER_KEYS[key]) {
        assert.deepEqual(set[other], base[other], `${candidate.value}: ${other} unchanged`);
      }

      // normalization preserves the value and drops the false custom flag
      const normalized = normalizeParticipant(set);
      assert.deepEqual(normalized[key], { status: "KNOWN", name: candidate.value });
      assert.equal("custom" in normalized[key], false, candidate.value);

      // serialize + reload preserves it; siblings stay cleared
      const store = makeFakeStorage();
      storage.saveProgress(
        {
          mode: "SELF",
          participants: [normalized],
          availableMaterialIds: [],
          patriSelfReport: null,
          stepIndex: 0,
        },
        store,
      );
      const loaded = storage.loadProgress(store).participants[0];
      assert.deepEqual(loaded[key], { status: "KNOWN", name: candidate.value });
      assert.equal("custom" in loaded[key], false, candidate.value);
      for (const other of OTHER_KEYS[key]) {
        assert.deepEqual(loaded[other], { status: "UNKNOWN", name: "" });
      }
    }
  }
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
  // The review chip reflects the candidate module's configured status.
  assert.match(
    html,
    new RegExp(`data-status="${vedaMod.VEDA_CANDIDATES_REVIEW_STATUS}"`),
  );
  assert.match(
    html,
    new RegExp(
      reviewStatusMod.REVIEW_STATUS_LABEL[vedaMod.VEDA_CANDIDATES_REVIEW_STATUS],
    ),
  );
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

test("'Choose from the list instead' returns a custom value to the searchable list", () => {
  const custom = { status: "KNOWN", name: "Something rare", custom: true };
  assert.match(renderRow("veda", custom), /your own value/i);

  // The exact update the button's onClick produces, applied through the same
  // single-field mutation path the app uses.
  const backToList = withLineageField(
    { ...createParticipant("p1"), veda: custom },
    "veda",
    { name: "", custom: false },
  ).veda;

  const html = renderRow("veda", backToList);
  assert.match(html, /Search the Veda list/);
  assert.match(html, /My value is not listed/);
  assert.doesNotMatch(html, /your own value/i);
  assert.doesNotMatch(html, /Something rare/);
});

test("picking 'My value is not listed' switches a listed value into custom mode", () => {
  const listed = {
    status: "KNOWN",
    name: vedaMod.VEDA_CANDIDATES[0].value,
    custom: false,
  };
  assert.match(renderRow("veda", listed), /Search the Veda list/);

  const toCustom = withLineageField(
    { ...createParticipant("p1"), veda: listed },
    "veda",
    { name: "", custom: true },
  ).veda;

  const html = renderRow("veda", toCustom);
  assert.match(html, /your own value/i);
  assert.doesNotMatch(html, /Search the Veda list/);
});

test("UNKNOWN and UNSURE render only the status question", () => {
  for (const status of ["UNKNOWN", "UNSURE"]) {
    const html = renderRow("veda", { status, name: "" });
    assert.match(html, /Do you know the Veda\?/);
    assert.doesNotMatch(html, /Search the Veda list/);
    assert.doesNotMatch(html, /My value is not listed/);
  }
});

/* -------------------------------------------------------------------------- */
/* CandidateSelect: status shown is gated by provenance, never a bare label   */
/* -------------------------------------------------------------------------- */

const DRAFT_PROVENANCE = provenance.draftProvenance();
const QUALIFYING_PROVENANCE = provenance.draftProvenance({
  source: "A named written source",
  sourceReference: "chapter and verse",
  reviewer: "A. Reviewer",
  reviewerQualification: "Vedic scholar",
  reviewDate: "2026-01-01",
  writtenSourceStatus: "CONFIRMED",
});

const renderCandidateSelect = (reviewStatus, prov) =>
  renderToStaticMarkup(
    React.createElement(page.CandidateSelect, {
      label: "Veda",
      candidates: vedaMod.VEDA_CANDIDATES,
      disclaimer: "test disclaimer",
      reviewStatus,
      provenance: prov,
      value: { status: "KNOWN", name: "" },
      onChange: () => {},
    }),
  );

const verifiedLabel = reviewStatusMod.REVIEW_STATUS_LABEL.VERIFIED;
const reviewRequiredLabel = reviewStatusMod.REVIEW_STATUS_LABEL.REVIEW_REQUIRED;

test("REVIEW_REQUIRED with draft provenance shows the still-being-reviewed chip", () => {
  const html = renderCandidateSelect("REVIEW_REQUIRED", DRAFT_PROVENANCE);
  assert.match(html, /data-status="REVIEW_REQUIRED"/);
  assert.match(html, new RegExp(reviewRequiredLabel));
});

test("VERIFIED without source/reviewer evidence never shows the verified label", () => {
  const html = renderCandidateSelect("VERIFIED", DRAFT_PROVENANCE);
  assert.doesNotMatch(html, /data-status="VERIFIED"/);
  assert.doesNotMatch(html, new RegExp(verifiedLabel));
  // It falls back to the honest "still being reviewed" chip.
  assert.match(html, /data-status="REVIEW_REQUIRED"/);
});

test("VERIFIED with complete qualifying provenance shows the verified label", () => {
  assert.equal(
    provenance.canDisplayAsGuidance("VERIFIED", QUALIFYING_PROVENANCE),
    true,
  );
  const html = renderCandidateSelect("VERIFIED", QUALIFYING_PROVENANCE);
  assert.match(html, /data-status="VERIFIED"/);
  assert.match(html, new RegExp(verifiedLabel));
  assert.doesNotMatch(html, /data-status="REVIEW_REQUIRED"/);
});

test("each field passes its own status and provenance into CandidateSelect", () => {
  for (const { key, mod } of CANDIDATE_LISTS) {
    const upper = key.toUpperCase();
    const status = mod[`${upper}_CANDIDATES_REVIEW_STATUS`];
    const prov = mod[`${upper}_CANDIDATES_PROVENANCE`];

    // The field's real config: REVIEW_REQUIRED + draft provenance -> honest chip.
    const rowHtml = renderRow(key, { status: "KNOWN", name: "" });
    assert.match(rowHtml, new RegExp(`data-status="${status}"`));

    // Same status and provenance, rendered directly, agrees.
    const direct = renderToStaticMarkup(
      React.createElement(page.CandidateSelect, {
        label: metaFor(key).label,
        candidates: mod[`${upper}_CANDIDATES`],
        disclaimer: "d",
        reviewStatus: status,
        provenance: prov,
        value: { status: "KNOWN", name: "" },
        onChange: () => {},
      }),
    );
    assert.match(direct, new RegExp(`data-status="${status}"`));

    // Provenance is actually consulted: a bare VERIFIED label with this
    // field's unqualified provenance does NOT produce a verified chip.
    const forced = renderToStaticMarkup(
      React.createElement(page.CandidateSelect, {
        label: metaFor(key).label,
        candidates: mod[`${upper}_CANDIDATES`],
        disclaimer: "d",
        reviewStatus: "VERIFIED",
        provenance: prov,
        value: { status: "KNOWN", name: "" },
        onChange: () => {},
      }),
    );
    assert.doesNotMatch(forced, /data-status="VERIFIED"/);
    assert.match(forced, /data-status="REVIEW_REQUIRED"/);
  }
});
