// Storage tests for reviewer decisions: local persistence, the four verdicts,
// per-item edits, JSON export/import round-trip, content-version warnings,
// damaged-data fallback, and the guarantee that a decision never touches
// canonical candidate content.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const mod = await vite.ssrLoadModule("/lib/storage/reviewer-decisions.ts");
const {
  REVIEWER_VERDICTS, emptyReviewerDecisions, parseReviewerDecisions,
  loadReviewerDecisions, setReviewerDecision, clearReviewerDecision,
  exportReviewerDecisions, importReviewerDecisions,
  loadReviewerResumeIndex, saveReviewerResumeIndex,
} = mod;
const { CANDIDATE_PUJA_STEPS } = await vite.ssrLoadModule("/lib/pujas/vinayaka/candidate.ts");

function makeStore(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    get size() { return map.size; },
  };
}

test("the four verdicts are exactly Approve / Correction needed / Not applicable / Comment", () => {
  assert.deepEqual([...REVIEWER_VERDICTS].sort(), ["APPROVE", "COMMENT", "CORRECTION_NEEDED", "NOT_APPLICABLE"]);
});

test("a decision round-trips through storage", () => {
  const store = makeStore();
  const after1 = setReviewerDecision("sankalpa", "CORRECTION_NEEDED", "wrong tithi phrasing", store);
  assert.equal(after1["sankalpa"].verdict, "CORRECTION_NEEDED");
  assert.equal(after1["sankalpa"].note, "wrong tithi phrasing");
  assert.equal(loadReviewerDecisions(store)["sankalpa"].verdict, "CORRECTION_NEEDED");
});

test("setting one decision leaves the others untouched; clearing removes just one", () => {
  const store = makeStore();
  setReviewerDecision("dhyana", "APPROVE", "", store);
  setReviewerDecision("padya", "NOT_APPLICABLE", "skip for beginners", store);
  const both = loadReviewerDecisions(store);
  assert.equal(Object.keys(both).length, 2);

  const afterClear = clearReviewerDecision("dhyana", store);
  assert.equal(afterClear["dhyana"], undefined);
  assert.equal(afterClear["padya"].verdict, "NOT_APPLICABLE");
});

test("damaged or partial stored data falls back safely, never inventing a verdict", () => {
  assert.deepEqual(parseReviewerDecisions(null), emptyReviewerDecisions());
  assert.deepEqual(parseReviewerDecisions("{not json"), emptyReviewerDecisions());
  assert.deepEqual(parseReviewerDecisions("[]"), emptyReviewerDecisions());
  // A bad verdict on one item is dropped; a good sibling survives.
  const mixed = JSON.stringify({
    good: { verdict: "APPROVE", note: "ok", updatedAt: "2026-09-08T00:00:00.000Z" },
    bad: { verdict: "MAYBE", note: "x" },
  });
  const parsed = parseReviewerDecisions(mixed);
  assert.equal(parsed["good"].verdict, "APPROVE");
  assert.equal(parsed["bad"], undefined);
});

test("export then import restores the same decisions (round-trip)", () => {
  const source = makeStore();
  setReviewerDecision("dhyana", "APPROVE", "looks right", source);
  setReviewerDecision("patri", "COMMENT", "needs botanical ids", source);
  const doc = exportReviewerDecisions("vinayaka-source-candidate-1", "Proposed reviewer", source);
  assert.equal(doc.contentVersion, "vinayaka-source-candidate-1");
  assert.equal(Object.keys(doc.decisions).length, 2);

  const target = makeStore();
  const result = importReviewerDecisions(JSON.stringify(doc), "vinayaka-source-candidate-1", target);
  assert.equal(result.ok, true);
  assert.equal(result.imported, 2);
  assert.equal(result.warnings.length, 0);
  assert.equal(loadReviewerDecisions(target)["patri"].note, "needs botanical ids");
});

test("importing an export made against a different content version still loads, but with a warning", () => {
  const doc = {
    contentVersion: "vinayaka-source-candidate-0",
    reviewerLabel: "x",
    decisions: { dhyana: { verdict: "APPROVE", note: "", updatedAt: "2026-09-08T00:00:00.000Z" } },
    exportedAt: "2026-09-08T00:00:00.000Z",
  };
  const store = makeStore();
  const result = importReviewerDecisions(JSON.stringify(doc), "vinayaka-source-candidate-1", store);
  assert.equal(result.ok, true);
  assert.equal(result.imported, 1);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /candidate-0.*candidate-1/s);
});

test("importing non-JSON or a non-decisions object fails cleanly without changing storage", () => {
  const store = makeStore();
  setReviewerDecision("dhyana", "APPROVE", "keep me", store);
  const bad1 = importReviewerDecisions("not json at all", "v1", store);
  assert.equal(bad1.ok, false);
  const bad2 = importReviewerDecisions("[]", "v1", store);
  assert.equal(bad2.ok, false);
  assert.equal(loadReviewerDecisions(store)["dhyana"].note, "keep me");
});

test("a reviewer decision and note never mutate the canonical candidate step", () => {
  const before = JSON.stringify(CANDIDATE_PUJA_STEPS.find((s) => s.id === "dhyana"));
  const store = makeStore();
  setReviewerDecision("dhyana", "CORRECTION_NEEDED", "replace the whole mantra", store);
  const after1 = JSON.stringify(CANDIDATE_PUJA_STEPS.find((s) => s.id === "dhyana"));
  assert.equal(before, after1, "the candidate step data is immutable");
});

test("resume index persists and clamps to a non-negative integer", () => {
  const store = makeStore();
  assert.equal(loadReviewerResumeIndex(store), 0);
  saveReviewerResumeIndex(7, store);
  assert.equal(loadReviewerResumeIndex(store), 7);
  saveReviewerResumeIndex(-3, store);
  assert.equal(loadReviewerResumeIndex(store), 0);
});
