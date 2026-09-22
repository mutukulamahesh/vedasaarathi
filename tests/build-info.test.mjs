// scripts/generate-build-info.mjs (F9): produces a real, current git commit
// identifier - never a placeholder, never invented - and never throws even
// outside a git checkout.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const { buildInfo } = await import("../scripts/generate-build-info.mjs");

test("reports the actual current HEAD commit, matching `git rev-parse HEAD`", () => {
  const real = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const info = buildInfo();
  assert.equal(info.commit, real);
  assert.equal(info.commitShort, real.slice(0, 7));
});

test("builtAt is a real, current ISO timestamp", () => {
  const info = buildInfo();
  const t = Date.parse(info.builtAt);
  assert.ok(Number.isFinite(t));
  assert.ok(Math.abs(Date.now() - t) < 60000, "within a minute of now");
});

test("dirty reflects whether the working tree actually has uncommitted changes", () => {
  const real = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  const info = buildInfo();
  assert.equal(info.dirty, real.trim() !== "");
});

test("running the script end-to-end writes a well-formed public/build-info.json", () => {
  execFileSync("node", [fileURLToPath(new URL("../scripts/generate-build-info.mjs", import.meta.url))], { cwd: ROOT });
  const written = JSON.parse(execFileSync("cat", [`${ROOT}public/build-info.json`], { encoding: "utf8" }));
  const real = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.equal(written.commit, real);
  assert.equal(written.commitShort, real.slice(0, 7));
  assert.equal(typeof written.dirty, "boolean");
  assert.ok(Number.isFinite(Date.parse(written.builtAt)));
});
