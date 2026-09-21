// The third-party notices must be built from the INSTALLED packages, match the
// lockfile, contain each package's real licence text, document the MPL-2.0
// component precisely, be identical in the repo and in the served copy, and be
// part of the offline precache list.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n").trimEnd();
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const { generate, OUT_ROOT, OUT_PUBLIC } = await import("../scripts/generate-third-party-notices.mjs");
const { buildOfflineManifest } = await import("../scripts/generate-offline-manifest.mjs");

const SHIPPED = [
  "@vitejs/plugin-rsc", "lucide-react", "mhah-panchang", "react", "react-dom",
  "react-server-dom-webpack", "scheduler", "suncalc", "vinext", "tailwindcss", "tw-animate-css",
];

test("the committed notices are current and the served copy is identical", () => {
  const fresh = generate();
  assert.equal(readFileSync(OUT_ROOT, "utf8"), fresh, "THIRD_PARTY_NOTICES.md is stale: run scripts/generate-third-party-notices.mjs");
  assert.equal(readFileSync(OUT_PUBLIC, "utf8"), fresh, "public/THIRD_PARTY_NOTICES.txt is stale");
});

test("every shipped package is listed with its exact installed + locked version and its real licence text", () => {
  const text = readFileSync(OUT_ROOT, "utf8");
  const lock = json("package-lock.json").packages;
  for (const name of SHIPPED) {
    const pkg = json(`node_modules/${name}/package.json`);
    assert.equal(lock[`node_modules/${name}`].version, pkg.version, `${name}: lockfile == installed`);
    assert.ok(text.includes(`${name} ${pkg.version}\n`), `${name} ${pkg.version} is listed`);
    const licensePath = existsSync(join(ROOT, `node_modules/${name}/LICENSE`))
      ? `node_modules/${name}/LICENSE`
      : "vendor/licenses/vite-plugin-react-LICENSE.txt";
    assert.ok(text.includes(read(licensePath)), `${name}: the actual licence text is reproduced`);
  }
  assert.ok(text.includes(read("vendor/shadcn-tailwind-4.13.0.LICENSE.md")), "vendored shadcn licence is reproduced");
});

test("licences are not assumed to be one licence, and named copyright holders are not invented", () => {
  const text = readFileSync(OUT_ROOT, "utf8");
  for (const s of ["MPL-2.0", "ISC", "MIT", "BSD-2-Clause"]) assert.ok(text.includes(s), `mentions ${s}`);
  assert.ok(text.includes("They are NOT all under one licence"));
  assert.ok(text.includes("Copyright (c) Meta Platforms, Inc. and affiliates."));
  assert.ok(text.includes("Copyright (c) 2026, Volodymyr Agafonkin"));
  assert.ok(text.includes("Copyright (c) 2023 shadcn"));
  assert.ok(/ASCOR LABS does not\s+claim ownership/.test(text), "ASCOR attribution is separated from third-party ownership");
});

test("the MPL-2.0 section matches the installed mhah-panchang exactly", () => {
  const text = readFileSync(OUT_ROOT, "utf8");
  const v = json("node_modules/mhah-panchang/package.json").version;
  const lock = json("package-lock.json").packages["node_modules/mhah-panchang"];
  assert.equal(v, "1.2.0");
  assert.equal(lock.license, "MPL-2.0");
  assert.ok(text.includes(`https://registry.npmjs.org/mhah-panchang/-/mhah-panchang-${v}.tgz`), "source URL carries the exact version");
  assert.ok(lock.resolved.endsWith(`mhah-panchang-${v}.tgz`) && text.includes(lock.resolved), "source URL is the lockfile's resolved URL");
  assert.ok(text.includes(lock.integrity), "the lockfile integrity hash is stated");
  assert.ok(text.includes("Modified?        : NO"));
  assert.ok(text.includes("Mozilla Public License, version 2.0"));
  assert.ok(existsSync(join(ROOT, "node_modules/mhah-panchang/src/index.ts")), "the installed package includes the src/ Source Code Form");
});

test("the notices file is part of the offline precache list", () => {
  const dir = mkdtempSync(join(tmpdir(), "notices-"));
  try {
    const client = join(dir, "client");
    mkdirSync(join(client, "assets"), { recursive: true });
    writeFileSync(join(client, "assets", "mhah-panchang.esm-abc.js"), "x");
    writeFileSync(join(client, "THIRD_PARTY_NOTICES.txt"), "notices");
    assert.ok(buildOfflineManifest(client).urls.includes("/THIRD_PARTY_NOTICES.txt"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
