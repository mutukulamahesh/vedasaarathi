import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

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

const provenance = await vite.ssrLoadModule("/lib/content/provenance.ts");
const {
  canDisplayAsGuidance, draftProvenance, hasReviewer, hasText, hasValidISODate,
} = provenance;

const BLANK = "   ";

/* -------------------------------------------------------------------------- */
/* hasText / hasReviewer                                                      */
/* -------------------------------------------------------------------------- */

test("hasText rejects null, undefined, empty, and whitespace-only strings", () => {
  assert.equal(hasText(null), false);
  assert.equal(hasText(undefined), false);
  assert.equal(hasText(""), false);
  assert.equal(hasText(BLANK), false);
  assert.equal(hasText("x"), true);
  assert.equal(hasText("  x  "), true);
});

test("hasReviewer needs a non-blank reviewer and a real ISO date", () => {
  assert.equal(hasReviewer(draftProvenance()), false);
  assert.equal(
    hasReviewer(draftProvenance({ reviewer: "Someone", reviewDate: BLANK })),
    false,
  );
  assert.equal(
    hasReviewer(draftProvenance({ reviewer: BLANK, reviewDate: "2026-01-01" })),
    false,
  );
  assert.equal(
    hasReviewer(draftProvenance({ reviewer: "Someone", reviewDate: "yesterday" })),
    false,
  );
  assert.equal(
    hasReviewer(draftProvenance({ reviewer: "Someone", reviewDate: "2026-01-01" })),
    true,
  );
});

test("hasValidISODate accepts only real YYYY-MM-DD dates", () => {
  assert.equal(hasValidISODate("2026-09-03"), true);
  assert.equal(hasValidISODate("2000-02-29"), true); // leap day

  assert.equal(hasValidISODate(null), false);
  assert.equal(hasValidISODate(undefined), false);
  assert.equal(hasValidISODate(""), false);
  assert.equal(hasValidISODate(BLANK), false);
  assert.equal(hasValidISODate("yesterday"), false);
  assert.equal(hasValidISODate("not reviewed"), false);
  assert.equal(hasValidISODate("2026-9-3"), false); // unpadded
  assert.equal(hasValidISODate("2026/09/03"), false); // wrong separator
  assert.equal(hasValidISODate("2026-13-01"), false); // impossible month
  assert.equal(hasValidISODate("2026-02-30"), false); // impossible day
  assert.equal(hasValidISODate("2026-09-03T00:00:00Z"), false); // has a time part
  assert.equal(hasValidISODate(" 2026-09-03 "), false); // surrounding space
});

test("the provenance model has a practiceEvidence field, null by default", () => {
  const p = draftProvenance();
  assert.equal("practiceEvidence" in p, true);
  assert.equal(p.practiceEvidence, null);
});

/* -------------------------------------------------------------------------- */
/* GENERAL_GUIDANCE and REVIEW_REQUIRED                                       */
/* -------------------------------------------------------------------------- */

test("GENERAL_GUIDANCE always shows; REVIEW_REQUIRED never shows", () => {
  assert.equal(canDisplayAsGuidance("GENERAL_GUIDANCE", draftProvenance()), true);

  // Even a fully-populated provenance cannot release REVIEW_REQUIRED.
  const full = draftProvenance({
    source: "s",
    sourceReference: "r",
    reviewer: "n",
    reviewerQualification: "q",
    reviewDate: "d",
    traditionScope: "t",
    practiceEvidence: "e",
    writtenSourceStatus: "CONFIRMED",
  });
  assert.equal(canDisplayAsGuidance("REVIEW_REQUIRED", full), false);
});

/* -------------------------------------------------------------------------- */
/* VERIFIED: every required field is enforced separately                     */
/* -------------------------------------------------------------------------- */

const verifiedBase = () =>
  draftProvenance({
    source: "Apastamba Grihyasutra",
    sourceReference: "2.5.1",
    reviewer: "Sri A",
    reviewerQualification: "temple priest, Srisailam",
    reviewDate: "2026-09-03",
    contentVersion: "1.0.0",
    traditionScope: "Telugu Smarta household",
    writtenSourceStatus: "CONFIRMED",
  });

test("VERIFIED passes only with complete written-source and review evidence", () => {
  assert.equal(canDisplayAsGuidance("VERIFIED", verifiedBase()), true);
});

const VERIFIED_TEXT_FIELDS = [
  "source",
  "sourceReference",
  "reviewer",
  "reviewerQualification",
  "reviewDate",
  "contentVersion",
  "traditionScope",
];

for (const field of VERIFIED_TEXT_FIELDS) {
  test(`VERIFIED fails when ${field} is missing`, () => {
    assert.equal(
      canDisplayAsGuidance("VERIFIED", { ...verifiedBase(), [field]: null }),
      false,
    );
  });
  test(`VERIFIED fails when ${field} is blank`, () => {
    assert.equal(
      canDisplayAsGuidance("VERIFIED", { ...verifiedBase(), [field]: BLANK }),
      false,
    );
  });
}

test("VERIFIED fails when the written source is not CONFIRMED", () => {
  for (const status of ["PENDING", "ABSENT"]) {
    assert.equal(
      canDisplayAsGuidance("VERIFIED", {
        ...verifiedBase(),
        writtenSourceStatus: status,
      }),
      false,
      status,
    );
  }
});

test("VERIFIED fails with reviewer and date alone (the old weak rule)", () => {
  const reviewerOnly = draftProvenance({
    reviewer: "Sri A",
    reviewerQualification: "temple priest",
    reviewDate: "2026-09-03",
  });
  assert.equal(canDisplayAsGuidance("VERIFIED", reviewerOnly), false);
});

test("a free-text reviewDate never releases any positive status", () => {
  for (const bad of ["yesterday", "not reviewed", "2026-9-3", "2026-02-30"]) {
    assert.equal(
      canDisplayAsGuidance("VERIFIED", { ...verifiedBase(), reviewDate: bad }),
      false,
      `VERIFIED / ${bad}`,
    );
    assert.equal(
      canDisplayAsGuidance("PRIEST_REVIEWED_PRACTICE", {
        ...priestBase(),
        reviewDate: bad,
      }),
      false,
      `PRIEST_REVIEWED_PRACTICE / ${bad}`,
    );
    assert.equal(
      canDisplayAsGuidance("REGIONAL_CUSTOM", {
        ...regionalBase(),
        reviewDate: bad,
      }),
      false,
      `REGIONAL_CUSTOM / ${bad}`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* PRIEST_REVIEWED_PRACTICE: reviewer evidence required, source may be pending */
/* -------------------------------------------------------------------------- */

const priestBase = () =>
  draftProvenance({
    reviewer: "Sri B",
    reviewerQualification: "household-practice priest",
    reviewDate: "2026-09-03",
    contentVersion: "1.0.0",
    traditionScope: "Telugu Vinayaka Chavithi household practice",
  });

test("PRIEST_REVIEWED_PRACTICE passes with reviewer evidence and a pending source", () => {
  const p = priestBase();
  assert.equal(p.source, null);
  assert.equal(p.writtenSourceStatus, "PENDING");
  assert.equal(canDisplayAsGuidance("PRIEST_REVIEWED_PRACTICE", p), true);
});

const PRIEST_TEXT_FIELDS = [
  "reviewer",
  "reviewerQualification",
  "reviewDate",
  "contentVersion",
  "traditionScope",
];

for (const field of PRIEST_TEXT_FIELDS) {
  test(`PRIEST_REVIEWED_PRACTICE fails when ${field} is missing`, () => {
    assert.equal(
      canDisplayAsGuidance("PRIEST_REVIEWED_PRACTICE", {
        ...priestBase(),
        [field]: null,
      }),
      false,
    );
  });
  test(`PRIEST_REVIEWED_PRACTICE fails when ${field} is blank`, () => {
    assert.equal(
      canDisplayAsGuidance("PRIEST_REVIEWED_PRACTICE", {
        ...priestBase(),
        [field]: BLANK,
      }),
      false,
    );
  });
}

/* -------------------------------------------------------------------------- */
/* REGIONAL_CUSTOM: reviewer evidence AND evidence of regional practice       */
/* -------------------------------------------------------------------------- */

const regionalBase = () =>
  draftProvenance({
    reviewer: "Smt C",
    reviewerQualification: "community elder",
    reviewDate: "2026-09-03",
    contentVersion: "1.0.0",
    traditionScope: "Godavari delta villages",
    practiceEvidence: "Observed in several families; confirmed by two elders",
  });

test("REGIONAL_CUSTOM passes only with reviewer evidence and practice evidence", () => {
  assert.equal(canDisplayAsGuidance("REGIONAL_CUSTOM", regionalBase()), true);
});

test("REGIONAL_CUSTOM fails without evidence that the practice is followed there", () => {
  assert.equal(
    canDisplayAsGuidance("REGIONAL_CUSTOM", {
      ...regionalBase(),
      practiceEvidence: null,
    }),
    false,
  );
  assert.equal(
    canDisplayAsGuidance("REGIONAL_CUSTOM", {
      ...regionalBase(),
      practiceEvidence: BLANK,
    }),
    false,
  );
  // draftProvenance's default (no practiceEvidence) never releases it.
  assert.equal(
    canDisplayAsGuidance(
      "REGIONAL_CUSTOM",
      draftProvenance({
        reviewer: "Smt C",
        reviewerQualification: "community elder",
        reviewDate: "2026-09-03",
        traditionScope: "somewhere",
      }),
    ),
    false,
  );
});

const REGIONAL_TEXT_FIELDS = [
  "reviewer",
  "reviewerQualification",
  "reviewDate",
  "contentVersion",
  "traditionScope",
  "practiceEvidence",
];

for (const field of REGIONAL_TEXT_FIELDS) {
  test(`REGIONAL_CUSTOM fails when ${field} is missing`, () => {
    assert.equal(
      canDisplayAsGuidance("REGIONAL_CUSTOM", { ...regionalBase(), [field]: null }),
      false,
    );
  });
  test(`REGIONAL_CUSTOM fails when ${field} is blank`, () => {
    assert.equal(
      canDisplayAsGuidance("REGIONAL_CUSTOM", { ...regionalBase(), [field]: BLANK }),
      false,
    );
  });
}
