// The two presentation gates:
//   canDisplayAsGuidance()      - approved religious guidance (UNCHANGED)
//   canDisplayAsBetaCandidate() - a sourced, explicitly-labelled beta candidate
// These tests prove the beta gate's exact rules and that the guidance gate is
// not weakened.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { canDisplayAsBetaCandidate, BETA_NOTICE, RIGHTS_WITHHELD_NOTICE, BETA_STATUSES } =
  await vite.ssrLoadModule("/lib/content/beta-visibility.ts");
const { canDisplayAsGuidance } = await vite.ssrLoadModule("/lib/content/provenance.ts");

const ok = () => ({
  betaStatus: "SOURCED_BETA_CANDIDATE",
  includedInBeta: true,
  sourceId: "telugu-lyrics",
  sourcePage: 3,
  onlineSection: null,
  contentVersion: "vinayaka-source-candidate-1",
});

test("a fully-specified sourced beta candidate displays", () => {
  assert.equal(canDisplayAsBetaCandidate(ok()), true);
});

test("it does not display when not intentionally included in the beta dataset", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), includedInBeta: false }), false);
});

test("it does not display without an identified source", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), sourceId: null }), false);
  // ...unless a Provenance record supplies the source.
  assert.equal(
    canDisplayAsBetaCandidate({ ...ok(), sourceId: null }, { source: "A book", contentVersion: null }),
    true,
  );
});

test("it does not display without an exact PDF page or online section", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), sourcePage: null, onlineSection: null }), false);
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), sourcePage: null, onlineSection: "Vidhanam step 5" }), true);
});

test("it does not display without a content version", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), contentVersion: null }), false);
  assert.equal(
    canDisplayAsBetaCandidate({ ...ok(), contentVersion: null }, { source: null, contentVersion: "v9" }),
    true,
  );
});

test("WITHHELD_FOR_RIGHTS and MISSING_SOURCE never display, even fully specified otherwise", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), betaStatus: "WITHHELD_FOR_RIGHTS" }), false);
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), betaStatus: "MISSING_SOURCE" }), false);
});

test("an unknown / dishonest beta status never displays", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), betaStatus: "VERIFIED" }), false);
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), betaStatus: "" }), false);
});

test("APPROVED_GUIDANCE content also passes the beta gate (it is a superset path)", () => {
  assert.equal(canDisplayAsBetaCandidate({ ...ok(), betaStatus: "APPROVED_GUIDANCE" }), true);
});

test("canDisplayAsGuidance is NOT weakened: still false for REVIEW_REQUIRED, still 2-arg", () => {
  assert.equal(canDisplayAsGuidance.length, 2);
  const prov = {
    source: "x", sourceReference: "x", reviewer: "x", reviewerQualification: "x",
    reviewDate: "2026-01-01", contentVersion: "x", traditionScope: "x",
    writtenSourceStatus: "CONFIRMED", practiceEvidence: "x",
  };
  assert.equal(canDisplayAsGuidance("REVIEW_REQUIRED", prov), false);
  assert.equal(canDisplayAsGuidance("VERIFIED", prov), true);
});

test("the beta notice and rights-withheld notice are the exact confirmed strings", () => {
  assert.match(BETA_NOTICE, /^VedaSaarathi Beta: This puja guide was compiled from the listed traditional sources and is awaiting final priest review\. Please share any corrections with us\.$/);
  assert.match(RIGHTS_WITHHELD_NOTICE, /Vrata Katha is not included in this beta because publication rights are still being confirmed\./);
  assert.deepEqual(
    [...BETA_STATUSES].sort(),
    ["APPROVED_GUIDANCE", "MISSING_SOURCE", "SOURCED_BETA_CANDIDATE", "WITHHELD_FOR_RIGHTS"],
  );
});
