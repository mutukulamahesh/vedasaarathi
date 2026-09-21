// Build-verified Panchanga release configuration.
//
// The historical validation fixtures and the 400-day festival scan must NOT
// run in a family's browser. They run here (build + tests) and their outcome
// is frozen into lib/panchanga/release-config.json, which the app imports as a
// small static file. The browser then only computes the requested location for
// the current date.
//
//   node scripts/verify-panchanga.mjs           # CHECK the committed config
//   node scripts/verify-panchanga.mjs --write   # regenerate it
//
// CHECK fails the build if the committed config no longer matches a fresh
// validation (released flags, per-case report, or the evidence hash).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { withProjectModule } from "./lib/vite-load.mjs";

const CONFIG_PATH = fileURLToPath(new URL("../lib/panchanga/release-config.json", import.meta.url));
const WRITE = process.argv.includes("--write");
const sha256 = (t) => `sha256:${createHash("sha256").update(t, "utf8").digest("hex")}`;

const fresh = await withProjectModule("/lib/panchanga/validation.ts", async (m) => {
  const { results, released } = await m.validatePanchanga();
  return {
    schema: "vedasaarathi-panchanga-release-v1",
    engine: { library: "mhah-panchang", version: "1.2.0" },
    evidenceHash: sha256(m.evidenceCanonicalJson()),
    released,
    report: results,
  };
});

// Deterministic: key order is fixed by construction (in this file and in
// validation.ts), and the fixture inputs are constant.
const sortDeep = (v) => {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]));
  }
  return v;
};
const freshJson = JSON.stringify(sortDeep(fresh), null, 2);

if (WRITE) {
  writeFileSync(CONFIG_PATH, `${freshJson}\n`);
  console.log(`panchanga: wrote release-config.json  (evidenceHash ${fresh.evidenceHash})`);
  console.log(`  released: ${JSON.stringify(fresh.released)}`);
  process.exit(0);
}

if (!existsSync(CONFIG_PATH)) {
  console.error("panchanga: lib/panchanga/release-config.json is missing. Run: node scripts/verify-panchanga.mjs --write");
  process.exit(1);
}

const committed = readFileSync(CONFIG_PATH, "utf8").trim();
if (committed === freshJson.trim()) {
  console.log(`panchanga: release-config.json verified  (evidenceHash ${fresh.evidenceHash})`);
  process.exit(0);
}

console.error("panchanga: release-config.json is STALE — a fresh validation no longer matches it.");
console.error("  Re-run: node scripts/verify-panchanga.mjs --write   (and review the diff)");
// show a compact diff of the released flags and hash
try {
  const c = JSON.parse(committed);
  if (c.evidenceHash !== fresh.evidenceHash) console.error(`  evidenceHash: committed ${c.evidenceHash}  fresh ${fresh.evidenceHash}`);
  for (const k of Object.keys(fresh.released)) {
    if (c.released?.[k] !== fresh.released[k]) console.error(`  released.${k}: committed ${c.released?.[k]}  fresh ${fresh.released[k]}`);
  }
} catch { /* ignore */ }
process.exit(1);
