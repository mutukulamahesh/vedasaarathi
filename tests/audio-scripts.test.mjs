// scripts/generate-audio.mjs and scripts/validate-audio.mjs behave safely:
//   - the generator makes no network call and writes nothing without an
//     explicit approval flag + credentials
//   - mantra generation is refused without --confirm-mantra
//   - normal logs never print the narration text / SSML (only with --show-text)
//   - the only bundled audio is the 4 voice-comparison samples, and the
//     build-time validator passes for them
//   - SPEECH_KEY is never echoed

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
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

const SAMPLE_MP3S = [
  "bhuta-shuddhi.mantra.te.mohan.mp3",
  "bhuta-shuddhi.mantra.te.shruti.mp3",
  "bhuta-shuddhi.te.plain.mohan.mp3",
  "bhuta-shuddhi.te.plain.shruti.mp3",
];

test("bundled audio: 34 EN + 34 TE plain + 32 TE mantra per-step + 4 reviewer samples + 3 family Sankalpam clips, each with 3 sidecars", () => {
  const mp3s = walk(join(ROOT, "public/audio/v1")).filter((f) => f.endsWith(".mp3"));
  const names = mp3s.map((f) => f.split("/").pop());
  const samples = names.filter((n) => n.endsWith(".mohan.mp3") || n.endsWith(".shruti.mp3"));
  const familyClips = names.filter((n) => n.startsWith("sankalpa.family-"));
  const perStep = names.filter((n) => !samples.includes(n) && !familyClips.includes(n));

  assert.deepEqual([...samples].sort(), [...SAMPLE_MP3S].sort());
  assert.deepEqual([...familyClips].sort(), [
    "sankalpa.family-a.te.mp3", "sankalpa.family-b.te.mp3", "sankalpa.family-prompt.te.mp3",
  ]);
  const enPlain = perStep.filter((n) => n.endsWith(".en.plain.mp3"));
  const tePlain = perStep.filter((n) => n.endsWith(".te.plain.mp3"));
  const teMantra = perStep.filter((n) => n.endsWith(".mantra.te.mp3"));
  assert.equal(enPlain.length, 34, "34 English plain-instruction files");
  assert.equal(tePlain.length, 34, "34 Telugu plain-instruction files");
  assert.equal(teMantra.length, 32, "32 Telugu mantra files");
  assert.equal(perStep.length, 100);
  assert.equal(
    names.filter((n) => /\bmantra\b/.test(n) && n.includes(".en.")).length,
    0,
    "no English mantra/chanting files",
  );

  for (const f of mp3s) {
    for (const ext of [".txt", ".sha256", ".meta.json"]) {
      assert.ok(existsSync(f + ext), `${f.split("/").pop()}${ext} exists`);
    }
  }
});

test("validate-audio.mjs passes for all delivered files", () => {
  const out = run(["scripts/validate-audio.mjs"]);
  assert.match(out, /107 file\(s\) present, all valid and manifest-matched/);
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

test("generate-audio.mjs dry-runs with no credentials: no network call, nothing new written", () => {
  const before = walk(join(ROOT, "public")).filter((f) => f.endsWith(".mp3")).length;
  const out = run(["scripts/generate-audio.mjs", "--kind", "te-plain", "--limit", "2"], {
    env: { ...process.env, SPEECH_KEY: "", SPEECH_REGION: "" },
    timeout: 60000,
  });
  assert.match(out, /mode=DRY RUN/);
  assert.match(out, /missing: --i-have-approval/);
  assert.match(out, /generated=0/);
  const after = walk(join(ROOT, "public")).filter((f) => f.endsWith(".mp3")).length;
  assert.equal(after, before, "no new mp3 written");
});

test("normal generator logs do not print the narration text or SSML; --show-text does", () => {
  const quiet = run(["scripts/generate-audio.mjs", "--kind", "te-plain", "--limit", "1"], {
    env: { ...process.env, SPEECH_KEY: "", SPEECH_REGION: "" }, timeout: 60000,
  });
  assert.doesNotMatch(quiet, /ssml:|<speak/i, "no SSML in normal output");
  assert.doesNotMatch(quiet, /[ఀ-౿]/, "no Telugu narration text in normal output");
  assert.match(quiet, /textSha256=[0-9a-f]{64}/, "the text hash is printed");

  const verbose = run(["scripts/generate-audio.mjs", "--kind", "te-plain", "--limit", "1", "--show-text"], {
    env: { ...process.env, SPEECH_KEY: "", SPEECH_REGION: "" }, timeout: 60000,
  });
  assert.match(verbose, /ssml: <speak/i, "--show-text prints the SSML");
});

test("the generator source never echoes SPEECH_KEY", () => {
  const src = readFileSync(join(ROOT, "scripts/generate-audio.mjs"), "utf8");
  // SPEECH_KEY is read once and only placed in a fetch header, never logged.
  assert.doesNotMatch(src, /console\.(log|error)\([^)]*SPEECH_KEY/);
});

test("generate-audio.mjs requires a valid --kind", () => {
  assert.throws(
    () => run(["scripts/generate-audio.mjs", "--kind", "bogus"]),
    (err) => (assert.equal(err.status, 64), true),
  );
});
