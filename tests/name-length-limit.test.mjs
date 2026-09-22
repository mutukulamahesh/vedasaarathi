// Participant name length limit (F7): a reasonable bound, code-point-safe so
// a Telugu or other Unicode name is never misjudged by raw UTF-16 length,
// and an oversized value is flagged rather than silently truncated.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { createParticipant, validateParticipant, MAX_NAME_LENGTH } =
  await vite.ssrLoadModule("/lib/content/participants.ts");

test("a name within the limit is valid", () => {
  const p = createParticipant("p1", "Mahesh Kumar");
  assert.equal(validateParticipant(p).nameError, null);
});

test("a name exactly at the limit is valid", () => {
  const p = createParticipant("p1", "A".repeat(MAX_NAME_LENGTH));
  assert.equal(validateParticipant(p).nameError, null);
});

test("a name one code point over the limit is rejected, not truncated", () => {
  const longName = "A".repeat(MAX_NAME_LENGTH + 1);
  const p = createParticipant("p1", longName);
  const result = validateParticipant(p);
  assert.notEqual(result.nameError, null);
  assert.equal(result.valid, false);
  // The stored value itself is untouched - never silently cut.
  assert.equal(p.name, longName);
  assert.equal(p.name.length, MAX_NAME_LENGTH + 1);
});

test("a Telugu name well within the limit is valid, combining marks and all", () => {
  // "శ్రీనివాస రావు" - conjuncts/virama sequences mean more code points than
  // visible glyphs; still comfortably under the limit.
  const p = createParticipant("p1", "శ్రీనివాస రావు గార్కి నమస్కారములు");
  assert.equal(validateParticipant(p).nameError, null);
});

test("an oversized EXISTING stored value (simulating old/tampered data) is caught safely, no crash", () => {
  const huge = "Telugu Name ".repeat(50); // far over the limit
  const p = createParticipant("p1", huge);
  assert.doesNotThrow(() => validateParticipant(p));
  const result = validateParticipant(p);
  assert.equal(result.valid, false);
  assert.equal(p.name, huge, "never mutated/truncated by validation");
});

test("MAX_NAME_LENGTH is a sane, generous bound", () => {
  assert.ok(MAX_NAME_LENGTH >= 40 && MAX_NAME_LENGTH <= 200);
});
