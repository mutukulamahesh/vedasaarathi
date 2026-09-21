// Every "when was this source accessed" date across the codebase must be a
// valid ISO calendar date that is NOT in the future. A future access date means
// the provenance is fabricated.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const TODAY = new Date();
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function assertPastDate(value, where) {
  assert.match(String(value), isoDate, `${where}: "${value}" is a YYYY-MM-DD date`);
  const d = new Date(`${value}T00:00:00Z`);
  assert.ok(!Number.isNaN(d.getTime()), `${where}: "${value}" is a real calendar date`);
  // Allow "today" (UTC), reject anything after it.
  assert.ok(
    d.getTime() <= Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate()) + 86_400_000 - 1,
    `${where}: access date "${value}" must not be in the future (today is ${TODAY.toISOString().slice(0, 10)})`,
  );
}

test("Vrata Katha source access dates are real and not in the future", async () => {
  const k = await vite.ssrLoadModule("/lib/pujas/vinayaka/vrata-katha.ts");
  let checked = 0;
  for (const s of k.VRATA_KATHA_SOURCES) {
    if (s.accessedISO) {
      assertPastDate(s.accessedISO, `VRATA_KATHA_SOURCES "${s.work.slice(0, 40)}"`);
      checked += 1;
    }
  }
  assert.ok(checked >= 3, "the URL-bearing sources carry access dates");
});

test("Sankalpam source access dates are real and not in the future", async () => {
  const { SANKALPAM_SOURCES } = await vite.ssrLoadModule("/lib/sankalpam/sources.ts");
  for (const s of SANKALPAM_SOURCES) {
    assertPastDate(s.accessedISO, `SANKALPAM_SOURCES "${s.id}"`);
  }
});

test("Panchanga fixture provenance access dates are real and not in the future", async () => {
  const v = await vite.ssrLoadModule("/lib/panchanga/validation.ts");
  for (const p of v.panchangaProvenance()) {
    assertPastDate(p.accessedISO, `panchanga provenance "${p.place.slice(0, 40)}"`);
  }
});

test("Research-source access dates are real and not in the future", async () => {
  const { RESEARCH_SOURCES } = await vite.ssrLoadModule("/lib/pujas/vinayaka/research-sources.ts");
  for (const s of RESEARCH_SOURCES) {
    assertPastDate(s.accessedDate, `RESEARCH_SOURCES "${s.id}"`);
  }
});

test("no source file contains a hard-coded future access date literal", async () => {
  const { readFileSync } = await import("node:fs");
  const files = [
    "lib/pujas/vinayaka/vrata-katha.ts",
    "lib/sankalpam/sources.ts",
    "lib/panchanga/validation.ts",
    "lib/pujas/vinayaka/research-sources.ts",
  ];
  const todayUTC = TODAY.toISOString().slice(0, 10);
  for (const f of files) {
    const src = readFileSync(`${root}/${f}`, "utf8");
    const dates = src.match(/(?:accessedISO|accessedDate|accessed)\s*:\s*"(\d{4}-\d{2}-\d{2})"/g) || [];
    for (const m of dates) {
      const d = m.match(/"(\d{4}-\d{2}-\d{2})"/)[1];
      assert.ok(d <= todayUTC, `${f}: literal access date ${d} is in the future (today ${todayUTC})`);
    }
  }
});
