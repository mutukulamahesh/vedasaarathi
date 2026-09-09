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
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /Bhagavata Purana 10\.56/);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /Not copied from Nanduri/i);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /commercial website/i);
  assert.match(k.VRATA_KATHA_RIGHTS_BASIS, /not priest-reviewed/i);
  assert.equal(k.VRATA_KATHA_STATUS, "BETA_CANDIDATE_RETELLING");
  assert.match(k.VRATA_KATHA_CONTENT_VERSION, /vrata-katha-retelling-v1/);
});

test("every identified source carries a work, locator, rights status, and what it was used for", () => {
  assert.ok(k.VRATA_KATHA_SOURCES.length >= 2);
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
  const works = k.VRATA_KATHA_SOURCES.map((s) => s.work).join(" | ");
  assert.match(works, /Bhagavata Purana/);
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
