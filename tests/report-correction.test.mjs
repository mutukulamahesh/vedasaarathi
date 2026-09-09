// "Report a correction": a real local action on the completion screen.
//   - creates a local correction record (own localStorage key)
//   - supports JSON export (a wrapped, pretty payload)
//   - transmits nothing: no fetch/XHR/beacon anywhere in the store or panel
//   - carries no name / lineage / location

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

const store = await vite.ssrLoadModule("/lib/corrections/store.ts");
const {
  CORRECTIONS_STORAGE_KEY, addCorrection, loadCorrections, clearCorrections,
  exportCorrectionsJson,
} = store;
const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const render = (el) => renderToStaticMarkup(el);
const noop = () => {};

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    has: (k) => map.has(k),
    raw: () => map,
  };
}

test("addCorrection persists a record under its own key; loadCorrections reads it back newest-first", () => {
  const s = makeFakeStorage();
  addCorrection({ pujaSlug: "vinayaka-chavithi", path: "SIMPLE", stepId: "dhyana-shloka", area: "MANTRA", note: "first" }, s);
  addCorrection({ pujaSlug: "vinayaka-chavithi", path: "COMPLETE", stepId: null, area: "OTHER", note: "second" }, s);

  assert.ok(s.has(CORRECTIONS_STORAGE_KEY));
  assert.equal(CORRECTIONS_STORAGE_KEY, "vedasaarathi:corrections:v1");
  const list = loadCorrections(s);
  assert.equal(list.length, 2);
  assert.equal(list[0].note, "second", "newest first");
  assert.equal(list[1].note, "first");
  assert.match(list[0].id, /.+/);
  assert.match(list[0].createdAt, /^\d{4}-\d\d-\d\dT/);
  assert.equal(list[1].stepId, "dhyana-shloka");
});

test("an empty note is ignored and never stored", () => {
  const s = makeFakeStorage();
  const out = addCorrection({ pujaSlug: "x", path: "SIMPLE", stepId: null, area: "OTHER", note: "   " }, s);
  assert.equal(out.length, 0);
  assert.equal(loadCorrections(s).length, 0);
});

test("a record carries only puja/path/step/area/note - no name, lineage or location fields", () => {
  const s = makeFakeStorage();
  addCorrection({ pujaSlug: "vinayaka-chavithi", path: "SIMPLE", stepId: null, area: "STEP_INSTRUCTION", note: "n" }, s);
  const rec = loadCorrections(s)[0];
  assert.deepEqual(
    Object.keys(rec).sort(),
    ["area", "createdAt", "id", "note", "path", "pujaSlug", "stepId"],
  );
});

test("exportCorrectionsJson returns a wrapped, pretty, round-trippable payload", () => {
  const s = makeFakeStorage();
  addCorrection({ pujaSlug: "vinayaka-chavithi", path: "COMPLETE", stepId: null, area: "MANTRA", note: "check line 2" }, s);
  const json = exportCorrectionsJson(loadCorrections(s));
  assert.ok(json.includes("\n  "), "pretty-printed");
  const parsed = JSON.parse(json);
  assert.equal(parsed.kind, "vedasaarathi-corrections");
  assert.equal(parsed.version, 1);
  assert.match(parsed.exportedAt, /^\d{4}-\d\d-\d\dT/);
  assert.equal(parsed.records[0].note, "check line 2");
});

test("clearCorrections removes the key entirely", () => {
  const s = makeFakeStorage();
  addCorrection({ pujaSlug: "x", path: "SIMPLE", stepId: null, area: "OTHER", note: "n" }, s);
  clearCorrections(s);
  assert.equal(s.has(CORRECTIONS_STORAGE_KEY), false);
  assert.deepEqual(loadCorrections(s), []);
});

test("damaged stored data falls back to an empty list, never throws", () => {
  assert.deepEqual(loadCorrections(makeFakeStorage({ [CORRECTIONS_STORAGE_KEY]: "{not json" })), []);
  assert.deepEqual(loadCorrections(makeFakeStorage({ [CORRECTIONS_STORAGE_KEY]: '{"a":1}' })), []);
  assert.deepEqual(loadCorrections(makeFakeStorage({ [CORRECTIONS_STORAGE_KEY]: '[{"no":"id"}]' })), []);
});

test("the corrections store contains no network call", () => {
  const src = readFileSync(new URL("../lib/corrections/store.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|navigator\.|WebSocket|EventSource/);
});

test("the report-correction panel contains no network call", () => {
  const src = readFileSync(new URL("../components/platform/report-correction.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|navigator\.sendBeacon|WebSocket|EventSource/);
});

test("CompleteScreen shows a real 'Report a correction' action, hidden until opened", () => {
  const html = render(
    React.createElement(page.CompleteScreen, {
      home: noop, restart: noop, immersion: null, puja: VINAYAKA_PUJA, path: "SIMPLE",
    }),
  );
  assert.match(html, /Report a correction/);
  // The panel itself is behind the button (not rendered until clicked).
  assert.doesNotMatch(html, /class="correction-panel"/);
  assert.doesNotMatch(html, /priest.?approved|verified/i);
});

test("the panel renders the form, the privacy line and a step picker for the path", () => {
  const html = render(
    React.createElement(page.ReportCorrectionPanel, { puja: VINAYAKA_PUJA, path: "SIMPLE" }),
  );
  assert.match(html, /Saved on this device only\. Nothing is sent anywhere/);
  assert.match(html, /Your name,\s*lineage and location are never included/);
  assert.match(html, /What looked wrong\?/);
  assert.match(html, /Save on this device/);
  // step options come from the Simple path
  assert.match(html, /<option value="dhyana-shloka">/);
});
