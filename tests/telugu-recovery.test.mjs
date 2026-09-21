// Integrity tests for the recovered Telugu-script transcription
// (lib/pujas/vinayaka/telugu-recovery.ts). These assert the recovery is
// present and internally consistent, that no Latin text leaked into a Telugu
// string, that page references are real, and that low-confidence blocks are
// flagged for a reviewer re-check. They do NOT assert the Telugu is
// "correct" - that is exactly what the reviewer check task is for.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const recovery = await vite.ssrLoadModule("/lib/pujas/vinayaka/telugu-recovery.ts");
const {
  TELUGU_RECOVERY, ASHTOTTARA_TELUGU_RECOVERY, PATRI_TELUGU_RECOVERY,
  SANKALPAM_TELUGU_RECOVERY, TELUGU_TEXT_PATTERN, TELUGU_RECOVERY_METHOD,
  teluguChecksRequired, recoveredTeluguStepCount,
} = recovery;
const { CANDIDATE_PUJA_STEPS } = await vite.ssrLoadModule("/lib/pujas/vinayaka/candidate.ts");
const { VINAYAKA_CANDIDATE, allTeluguChecksRequired } =
  await vite.ssrLoadModule("/lib/pujas/vinayaka/candidate-dataset.ts");

const TELUGU_BLOCK = /[ఀ-౿]/;
const NO_LATIN = /[A-Za-z]/;

test("the recovery method is documented and names the render + OCR-scaffold + cross-check pipeline", () => {
  assert.match(TELUGU_RECOVERY_METHOD, /render/i);
  assert.match(TELUGU_RECOVERY_METHOD, /OCR|tesseract/i);
  assert.match(TELUGU_RECOVERY_METHOD, /cross-check|transliteration/i);
  assert.match(TELUGU_RECOVERY_METHOD, /text layer.*(corrupt|not used)/i);
});

test("every mantra/kriya candidate step (except the withheld Vrata Katha) has a recovered Telugu string with no Latin text", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    if (s.id === "vrata-katha") {
      assert.equal(s.mantraTeluguScript, null);
      continue;
    }
    assert.ok(s.mantraTeluguScript && s.mantraTeluguScript.length > 0, `${s.id} missing Telugu`);
    assert.match(s.mantraTeluguScript, TELUGU_BLOCK, `${s.id} has no Telugu characters`);
    assert.doesNotMatch(s.mantraTeluguScript, NO_LATIN, `${s.id} Telugu string contains Latin letters`);
  }
});

test("each recovery entry has confidence in {HIGH, MEDIUM}, a real Telugu Lyrics page (1-15), and MEDIUM => check required", () => {
  for (const [id, entry] of Object.entries(TELUGU_RECOVERY)) {
    assert.ok(["HIGH", "MEDIUM"].includes(entry.confidence), `${id} bad confidence`);
    assert.ok(Number.isInteger(entry.sourcePage) && entry.sourcePage >= 1 && entry.sourcePage <= 15, `${id} bad page`);
    assert.ok(Array.isArray(entry.uncertainTokens), `${id} uncertainTokens not an array`);
    if (entry.confidence === "MEDIUM") {
      assert.equal(entry.transcriptionCheckRequired, true, `${id} MEDIUM but not flagged for re-check`);
    }
    for (const t of entry.uncertainTokens) {
      assert.ok(t.token && t.note, `${id} incomplete uncertain token`);
    }
  }
});

test("recovered Telugu page references agree with the candidate step's own telugu-lyrics source ref", () => {
  for (const s of CANDIDATE_PUJA_STEPS) {
    const entry = s.teluguRecovery;
    if (!entry || !entry.sourcePage) continue;
    const teRef = s.sourceRefs.find((r) => r.sourceId === "telugu-lyrics");
    assert.ok(teRef, `${s.id} has no telugu-lyrics source ref`);
    assert.equal(entry.sourcePage, teRef.page, `${s.id} recovery page != source ref page`);
  }
});

test("the Sankalpam Telugu is recovered from page 3 and ends with the shodashopachara resolve", () => {
  assert.equal(SANKALPAM_TELUGU_RECOVERY.sourcePage, 3);
  assert.match(SANKALPAM_TELUGU_RECOVERY.teluguScript, /షోడశోపచార పూజాం కరిష్యే!/);
  assert.match(VINAYAKA_CANDIDATE.sankalpam.teluguScript, /మమ ఉపాత్త సమస్త దురితక్షయ/);
  assert.doesNotMatch(VINAYAKA_CANDIDATE.sankalpam.teluguScript, NO_LATIN);
});

test("the 108-name Ashtottara is recovered from page 8 as a name list, MEDIUM confidence, check required", () => {
  const a = ASHTOTTARA_TELUGU_RECOVERY;
  assert.equal(a.sourcePage, 8);
  assert.equal(a.confidence, "MEDIUM");
  assert.equal(a.transcriptionCheckRequired, true);
  assert.equal(a.names.length, 108, "exactly 108 names before the closing doxology");
  for (const n of a.names) {
    assert.match(n, TELUGU_BLOCK);
    assert.doesNotMatch(n, NO_LATIN);
    assert.match(n, /నమః$/, `"${n}" should end in నమః`);
  }
  assert.match(a.closingDoxology, /వరసిద్ధి వినాయక స్వామినే నమః/);
  // teluguScript getter = names + closing doxology, newline joined.
  assert.equal(a.teluguScript.split("\n").length, 109);
});

test("the 21 patri leaves are recovered in Telugu from page 7, still with no botanical identity", () => {
  const p = PATRI_TELUGU_RECOVERY;
  assert.equal(p.sourcePage, 7);
  assert.equal(p.leaves.length, 21);
  p.leaves.forEach((leaf, i) => {
    assert.equal(leaf.index, i + 1);
    assert.match(leaf.deityNameTelugu, TELUGU_BLOCK);
    assert.match(leaf.leafNameTelugu, /పత్రం|దూర్వాయుగ్మం/);
    assert.doesNotMatch(leaf.leafNameTelugu, NO_LATIN);
    assert.ok(!("botanicalIdentification" in leaf), "recovery must not add a plant identity");
  });
});

test("TELUGU_TEXT_PATTERN accepts a recovered line and rejects a Latin one", () => {
  assert.match("శ్రీ మహాగణాధిపతయే నమః ధ్యాయామి", TELUGU_TEXT_PATTERN);
  assert.doesNotMatch("Sree mahaagaNaadhipatayae", TELUGU_TEXT_PATTERN);
});

test("checks-required lists are non-empty and every entry is a real id", () => {
  const stepChecks = teluguChecksRequired();
  assert.ok(stepChecks.length >= 3);
  const ids = new Set(CANDIDATE_PUJA_STEPS.map((s) => s.id));
  for (const id of stepChecks) assert.ok(ids.has(id), `${id} not a step id`);

  const all = allTeluguChecksRequired();
  assert.ok(all.includes("ashtottara"));
  assert.ok(all.includes("patri"));
});

test("recoveredTeluguStepCount counts the mantra steps with real Telugu (excludes the pointer entry)", () => {
  // 32 mantra steps carry a recovery entry; ashtottara's entry is a metadata
  // pointer with an empty teluguScript, so it is excluded.
  assert.equal(recoveredTeluguStepCount(), 31);
});
