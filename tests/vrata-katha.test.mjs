// The Vinayaka Vrata Katha — an ORIGINAL retelling (lib/pujas/vinayaka/
// vrata-katha.ts). Section 6: public-domain / traditional / original content
// only; rights basis recorded; Telugu + English; not copied from Nanduri or a
// commercial site.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const k = await vite.ssrLoadModule("/lib/pujas/vinayaka/vrata-katha.ts");

const TELUGU = /[ఀ-౿]/;

test("both languages are present for every section, and Telugu is real Telugu script", () => {
  assert.ok(k.VRATA_KATHA_SECTIONS.length >= 5, "the full story, in parts");
  for (const s of k.VRATA_KATHA_SECTIONS) {
    assert.ok(s.heading && s.body, "English heading + body");
    assert.ok(s.headingTe && s.bodyTe, "Telugu heading + body");
    assert.ok(TELUGU.test(s.headingTe) && TELUGU.test(s.bodyTe), "Telugu is Telugu script");
    assert.ok(!TELUGU.test(s.body), "English body has no Telugu script");
    // Telugu is not just the English string echoed.
    assert.notEqual(s.bodyTe.trim(), s.body.trim());
    assert.ok(s.bodyTe.length > 60, "Telugu body is a real paragraph, not a stub");
  }
  assert.ok(TELUGU.test(k.VRATA_KATHA_TITLE_TE));
});

test("the rights basis is recorded and names the public-domain / traditional sources", () => {
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /original retelling/i);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /Bhagavata Purana Skandha 10, adhyayas 56/);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /Not copied from Nanduri/i);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /commercial website/i);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /not priest-reviewed/i);
  // The traditional material is explicitly separated from the sourced narrative.
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /NO single citable public-domain source/i);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /akshata-in-hand remedy/i);
  assert.equal(k.VRATA_KATHA_STATUS, "BETA_CANDIDATE_RETELLING");
  assert.match(k.VRATA_KATHA_CONTENT_VERSION, /vrata-katha-retelling-v2/);
});

test("every section is marked SOURCED_PURANIC or TRADITIONAL, and only the Syamantaka section is sourced", () => {
  for (const s of k.VRATA_KATHA_SECTIONS) {
    assert.ok(["SOURCED_PURANIC", "TRADITIONAL"].includes(s.basis), `${s.heading}: has a basis`);
  }
  const sourced = k.VRATA_KATHA_SECTIONS.filter((s) => s.basis === "SOURCED_PURANIC");
  assert.equal(sourced.length, 1, "exactly one section follows a citable public-domain text");
  assert.match(sourced[0].heading, /Syamantaka/);
  // The Ganesha–Chandra sections are traditional, not falsely attributed.
  assert.ok(k.VRATA_KATHA_SECTIONS.find((s) => /feast and his fall/i.test(s.heading)).basis === "TRADITIONAL");
  assert.ok(k.VRATA_KATHA_SECTIONS.find((s) => /moon laughs/i.test(s.heading)).basis === "TRADITIONAL");
});

test("every identified source carries a work, locator, rights status, and what it was used for", () => {
  assert.ok(k.VRATA_KATHA_SOURCES.length >= 3);
  for (const s of k.VRATA_KATHA_SOURCES) {
    assert.ok(s.work && s.work.length > 0);
    assert.ok(s.locator && s.locator.length > 0);
    assert.ok(s.rightsStatus && s.rightsStatus.length > 0);
    assert.ok(s.usedFor && s.usedFor.length > 0);
    if (s.url) {
      assert.match(s.url, /^https:\/\//);
      assert.match(s.accessedISO ?? "", /^\d{4}-\d\d-\d\d$/);
    }
  }
  const joined = k.VRATA_KATHA_SOURCES
    .map((s) => `${s.work} ${s.locator} ${s.rightsStatus} ${s.url ?? ""}`)
    .join(" | ");
  // A concrete public-domain locator: the archive.org CC0 Sanyal volume.
  assert.match(joined, /archive\.org\/details\//);
  assert.match(joined, /CC0/i);
  assert.match(joined, /adhyaya[s]? 56/i);
  assert.match(joined, /(adhyaya 57|56[–-]57|chapter 57)/i);
  // The traditional material is present as its own explicitly-labelled source.
  assert.ok(k.VRATA_KATHA_SOURCES.some((s) => /NOT a single citable text/i.test(s.work)));
});

test("the retelling covers the two core episodes (Ganesha–Chandra curse, and the Syamantaka jewel)", () => {
  const en = k.VRATA_KATHA_SECTIONS.map((s) => `${s.heading}\n${s.body}`).join("\n");
  assert.match(en, /moon/i);
  assert.match(en, /curse/i);
  assert.match(en, /Syamantaka/);
  assert.match(en, /Jambavan/);
  assert.match(en, /Krishna/);
  assert.match(en, /false/i); // the "false blame" frame
});

/* -------------------------------------------------------------------------- */
/* Factual regression — the Syamantaka outcome, in BOTH languages             */
/* -------------------------------------------------------------------------- */

const syamantaka = () => k.VRATA_KATHA_SECTIONS.find((s) => /Syamantaka/.test(s.heading));

test("EN: Krishna marries Jambavati, marries Satyabhama, and RETURNS the jewel to Satrajita (no contradiction)", () => {
  const b = syamantaka().body;
  // Jambavan gives Jambavati.
  assert.match(b, /Jambavati to Krishna in marriage|gave his daughter\s+Jambavati/i);
  // Krishna DOES marry Satyabhama.
  assert.match(b, /Krishna married Satyabhama/i);
  // The jewel goes BACK to Satrajita — not kept, not "only accepted the apology".
  assert.match(b, /gave the jewel back to\s+Satrajita|returned the jewel to\s+Satrajita/i);
  // The old contradiction must be gone.
  assert.doesNotMatch(b, /accepted only the apology/i);
  assert.doesNotMatch(b, /the jewel too, though Krishna/i);
});

test("TE: same three facts, stated in Telugu (marries Jambavati, marries Satyabhama, returns the jewel)", () => {
  const b = syamantaka().bodyTe;
  assert.match(b, /జాంబవతిని/); // Jambavati
  assert.match(b, /సత్యభామను/); // Satyabhama
  assert.match(b, /వివాహమాడాడు|వివాహం చేశాడు/); // married
  // Jewel returned to Satrajit, kept by him.
  assert.match(b, /మణిని మాత్రం సత్రాజిత్తుకే/);
  assert.match(b, /తిరిగి ఇచ్చాడు/);
});

test("EN and TE agree on the outcome — both name Satyabhama and both send the jewel back", () => {
  const en = syamantaka().body;
  const te = syamantaka().bodyTe;
  assert.ok(/Satyabhama/.test(en) && /సత్యభామ/.test(te), "both name Satyabhama");
  assert.ok(/jewel back to\s+Satrajita|returned the jewel to\s+Satrajita/i.test(en), "EN: jewel returned");
  assert.ok(/మణిని మాత్రం సత్రాజిత్తుకే/.test(te), "TE: jewel returned");
  // Neither version says Krishna kept the jewel.
  assert.doesNotMatch(en, /Krishna kept the jewel|Krishna took the jewel for himself/i);
});
