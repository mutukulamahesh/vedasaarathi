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

const {
  canDisplayAsBetaCandidate, BETA_NOTICE, RIGHTS_WITHHELD_NOTICE, BETA_STATUSES,
  MISSING_SOURCE_NOTICE, INVALID_CANDIDATE_NOTICE,
  betaUnavailableReason, betaUnavailableNotice,
} = await vite.ssrLoadModule("/lib/content/beta-visibility.ts");
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

test("the beta notice is one concise line with no internal review-process wording; the rights notice is exact", () => {
  assert.match(BETA_NOTICE, /^VedaSaarathi Beta —/);
  assert.match(BETA_NOTICE, /early draft/i);
  assert.match(BETA_NOTICE, /tell us about anything that looks wrong/i);
  assert.doesNotMatch(BETA_NOTICE, /awaiting final priest review|REVIEW_REQUIRED|provenance/i);
  assert.ok(BETA_NOTICE.length <= 200, "the notice stays concise");
  assert.match(RIGHTS_WITHHELD_NOTICE, /Vrata Katha is not included in this beta because publication rights are still being confirmed\./);
  assert.deepEqual(
    [...BETA_STATUSES].sort(),
    ["APPROVED_GUIDANCE", "MISSING_SOURCE", "SOURCED_BETA_CANDIDATE", "WITHHELD_FOR_RIGHTS"],
  );
});

/* -------------------------------------------------------------------------- */
/* Distinct unavailable-content reasons - the rights notice is never generic  */
/* -------------------------------------------------------------------------- */

test("betaUnavailableReason: WITHHELD_FOR_RIGHTS, MISSING_SOURCE and incomplete metadata each get their own reason", () => {
  assert.equal(betaUnavailableReason({ ...ok(), betaStatus: "WITHHELD_FOR_RIGHTS" }), "WITHHELD_FOR_RIGHTS");
  assert.equal(betaUnavailableReason({ ...ok(), betaStatus: "MISSING_SOURCE" }), "MISSING_SOURCE");
  // honest SOURCED_BETA_CANDIDATE status, but no source recorded => INVALID_METADATA, NOT the rights reason.
  assert.equal(betaUnavailableReason({ ...ok(), sourceId: null }), "INVALID_METADATA");
  assert.equal(betaUnavailableReason({ ...ok(), sourcePage: null, onlineSection: null }), "INVALID_METADATA");
  // a valid sourced candidate is available.
  assert.equal(betaUnavailableReason(ok()), null);
  // approved content is always available regardless of beta metadata.
  assert.equal(betaUnavailableReason({ ...ok(), betaStatus: "MISSING_SOURCE" }, null, true), null);
});

test("a MISSING_SOURCE step never shows the Vrata Katha rights-withheld message", () => {
  const reason = betaUnavailableReason({ ...ok(), betaStatus: "MISSING_SOURCE" });
  const notice = betaUnavailableNotice(reason);
  assert.equal(notice, MISSING_SOURCE_NOTICE);
  assert.notEqual(notice, RIGHTS_WITHHELD_NOTICE);
  assert.doesNotMatch(notice, /Vrata Katha|publication rights/i);
  assert.match(notice, /no usable source is recorded/i);
});

test("incomplete candidate metadata shows the in-this-build message, not the rights message", () => {
  const notice = betaUnavailableNotice(betaUnavailableReason({ ...ok(), contentVersion: null }));
  assert.equal(notice, INVALID_CANDIDATE_NOTICE);
  assert.doesNotMatch(notice, /Vrata Katha|publication rights|no usable source/i);
});

test("only the Vrata Katha reason maps to the rights-withheld notice", () => {
  assert.equal(betaUnavailableNotice("WITHHELD_FOR_RIGHTS"), RIGHTS_WITHHELD_NOTICE);
  assert.notEqual(betaUnavailableNotice("MISSING_SOURCE"), RIGHTS_WITHHELD_NOTICE);
  assert.notEqual(betaUnavailableNotice("INVALID_METADATA"), RIGHTS_WITHHELD_NOTICE);
});
