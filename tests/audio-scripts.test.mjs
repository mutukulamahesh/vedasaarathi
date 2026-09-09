// scripts/generate-audio.mjs and scripts/validate-audio.mjs behave safely:
//   - the generator makes no network call and writes nothing without an
//     explicit approval flag + credentials
//   - mantra generation is refused without --confirm-mantra
//   - the build-time validator passes when no audio files are bundled
//   - no .mp3 exists anywhere under public/ (generated audio count is zero)

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const run = (args, opts = {}) =>
  execFileSync("node", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("no generated audio file exists anywhere under public/ (count is zero)", () => {
  const mp3s = walk(join(ROOT, "public")).filter((f) => f.endsWith(".mp3"));
  assert.deepEqual(mp3s, [], "there must be zero .mp3 files bundled");
});

test("validate-audio.mjs passes (nothing to validate, all PLANNED)", () => {
  const out = run(["scripts/validate-audio.mjs"]);
  assert.match(out, /0 generated files/);
});

test("generate-audio.mjs refuses mantra generation without --confirm-mantra", () => {
  assert.throws(
    () => run(["scripts/generate-audio.mjs", "--kind", "te-mantra"]),
    (err) => {
      assert.equal(err.status, 64);
      assert.match(String(err.stderr), /--confirm-mantra/);
      return true;
    },
  );
});

test("generate-audio.mjs dry-runs with no credentials: no network call, nothing written", () => {
  const out = run(["scripts/generate-audio.mjs", "--kind", "te-plain", "--limit", "2"], {
    // strip any ambient Azure creds so the test is deterministic
    env: { ...process.env, SPEECH_KEY: "", SPEECH_REGION: "" },
    timeout: 60000,
  });
  assert.match(out, /DRY RUN/);
  assert.match(out, /missing: --i-have-approval/);
  assert.match(out, /generated=0/);
  // still zero files afterwards
  const mp3s = walk(join(ROOT, "public")).filter((f) => f.endsWith(".mp3"));
  assert.deepEqual(mp3s, []);
});

test("generate-audio.mjs requires a valid --kind", () => {
  assert.throws(
    () => run(["scripts/generate-audio.mjs", "--kind", "bogus"]),
    (err) => (assert.equal(err.status, 64), true),
  );
});
