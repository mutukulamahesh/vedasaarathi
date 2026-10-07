// Bilingual public entry pages (lib/entry-pages.ts, lib/entry-metadata.ts,
// components/entry/*, app/<topic>/page.tsx, app/te/<topic>/page.tsx).
//
// Domain-level checks, no network or browser: the URL scheme, the per-page
// head metadata (own title/description, self canonical, reciprocal
// hreflang), the sitemap list, the server-rendered topic text (real content,
// Bathukamma's per-day evidence and REVIEW_REQUIRED status kept, no computed
// Panchanga for an unknown visitor, no Satyanarayana), and the app's entry
// mechanism (opens the right screen in the link's language WITHOUT writing
// any preference). The served HTML is checked in tests/rendered-html.test.mjs
// and real-browser behaviour in tests/e2e/entry-pages.e2e.mjs.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://vedasaarathi.test/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const entry = await vite.ssrLoadModule("/lib/entry-pages.ts");
const meta = await vite.ssrLoadModule("/lib/entry-metadata.ts");
const site = await vite.ssrLoadModule("/lib/site.ts");
const content = await vite.ssrLoadModule("/components/entry/entry-topic-content.tsx");
const schedules = await vite.ssrLoadModule("/lib/panchanga/festival-schedules.ts");
const rules = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");
const page = await vite.ssrLoadModule("/app/page.tsx");

const ORIGIN = "https://vedasaarathi.com";
const TOPICS = ["panchangam", "festivals", "bathukamma-2026", "vinayaka-chavithi-puja"];

const html = (topic, language) =>
  renderToStaticMarkup(React.createElement(content.EntryTopicContent, { topic, language }));
const text = (markup) => markup.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("URL scheme: /<slug> for English, /te/<slug> for Telugu, the same slug in both", () => {
  assert.deepEqual([...entry.ENTRY_TOPICS], TOPICS);
  for (const t of TOPICS) {
    assert.equal(entry.entryPath(t, "EN"), `/${t}`);
    assert.equal(entry.entryPath(t, "TE"), `/te/${t}`);
  }
  assert.deepEqual([...entry.ENTRY_PAGE_PATHS], [...TOPICS.map((t) => `/${t}`), ...TOPICS.map((t) => `/te/${t}`)]);
  assert.equal(entry.languageForPath("/te/panchangam"), "TE");
  assert.equal(entry.languageForPath("/te"), "TE");
  assert.equal(entry.languageForPath("/panchangam"), "EN");
  assert.equal(entry.languageForPath("/"), "EN");
  assert.equal(entry.languageForPath("/tea"), "EN", "only the /te segment, not a prefix match");
});

test("every entry path has a real route file, and no other public topic is added", () => {
  for (const p of entry.ENTRY_PAGE_PATHS) {
    assert.ok(existsSync(new URL(`../app${p}/page.tsx`, import.meta.url)), `missing route for ${p}`);
  }
  assert.ok(!existsSync(new URL("../app/satyanarayana-vratham", import.meta.url)));
  assert.ok(!existsSync(new URL("../app/te/satyanarayana-vratham", import.meta.url)));
});

test("URLs are topic-level only: no person, lineage, place or coordinates", () => {
  for (const p of entry.ENTRY_PAGE_PATHS) {
    assert.match(p, /^(\/te)?\/[a-z0-9-]+$/);
    assert.doesNotMatch(p, /[?#=]/);
  }
});

test("sitemap list = '/' plus exactly the shipped entry pages", () => {
  assert.deepEqual([...site.INDEXABLE_PATHS], ["/", ...entry.ENTRY_PAGE_PATHS]);
});

test("each page has its own title/description, self canonical, reciprocal hreflang and own OG/Twitter text", () => {
  const titles = new Set([site.SITE_TITLE]);
  const descriptions = new Set([site.SITE_DESCRIPTION]);
  for (const t of TOPICS) {
    const en = meta.entryMetadata(t, "EN");
    const te = meta.entryMetadata(t, "TE");
    for (const [lang, m] of [["EN", en], ["TE", te]]) {
      const self = `${ORIGIN}${entry.entryPath(t, lang)}`;
      assert.ok(!titles.has(m.title), `${t} ${lang}: title must be distinct`);
      assert.ok(!descriptions.has(m.description), `${t} ${lang}: description must be distinct`);
      titles.add(m.title);
      descriptions.add(m.description);
      assert.equal(m.alternates.canonical, self);
      assert.equal(m.openGraph.url, self);
      assert.equal(m.openGraph.title, m.title);
      assert.equal(m.openGraph.description, m.description);
      assert.equal(m.twitter.title, m.title);
      assert.equal(m.twitter.card, "summary_large_image");
      assert.equal(m.openGraph.images[0].url, `${ORIGIN}${site.SHARE_IMAGE.path}`);
      assert.deepEqual(m.alternates.languages, {
        en: `${ORIGIN}/${t}`, te: `${ORIGIN}/te/${t}`, "x-default": `${ORIGIN}/${t}`,
      });
      assert.doesNotMatch(`${m.title} ${m.description}`, /Satyanarayana|సత్యనారాయణ/);
    }
    // Reciprocal: both versions carry the identical alternate map.
    assert.deepEqual(en.alternates.languages, te.alternates.languages);
  }
});

test("Telugu head text is Telugu; English head text is English", () => {
  for (const t of TOPICS) {
    assert.match(meta.entryMetadata(t, "TE").title, /[ఀ-౿]/);
    assert.doesNotMatch(meta.entryMetadata(t, "EN").title, /[ఀ-౿]/);
  }
});

test("the Bathukamma deep link targets the schedule's own day 1 and its rule", () => {
  const day1 = schedules.BATHUKAMMA_2026.days.find((d) => d.day === 1);
  assert.equal(entry.BATHUKAMMA_ENTRY.dateISO, day1.dateISO);
  const r = rules.festivalRule(entry.BATHUKAMMA_ENTRY.ruleId);
  assert.equal(r.method, "published-schedule");
  assert.equal(r.scheduleDay, 1);
  const target = entry.ENTRY_TARGETS["bathukamma-2026"];
  assert.deepEqual(target.calendarYM, { year: 2026, month: 10 });
});

test("topic text: every page has real, topic-specific content and a link to its sibling", () => {
  for (const t of TOPICS) {
    for (const lang of ["EN", "TE"]) {
      const m = html(t, lang);
      const other = lang === "EN" ? "TE" : "EN";
      assert.ok(text(m).length > 400, `${t} ${lang}: too little text`);
      assert.match(m, new RegExp(`href="${entry.entryPath(t, other)}" hrefLang="${other === "TE" ? "te" : "en"}"`));
      assert.match(m, new RegExp(`<section class="entry-topic" lang="${lang === "TE" ? "te" : "en"}"`));
      assert.doesNotMatch(m, /Satyanarayana|సత్యనారాయణ/);
    }
  }
});

test("Panchangam topic text never shows computed values or an assumed city", () => {
  for (const lang of ["EN", "TE"]) {
    const s = text(html("panchangam", lang));
    assert.doesNotMatch(s, /\b\d{1,2}:\d{2}\b/, "no clock times");
    assert.doesNotMatch(s, /Hyderabad|Frisco|హైదరాబాద్/, "no city");
  }
  assert.match(text(html("panchangam", "EN")), /we never guess your city/);
});

test("Bathukamma topic text keeps every day's evidence status, basis, source and REVIEW_REQUIRED", () => {
  const sched = schedules.BATHUKAMMA_2026;
  for (const lang of ["EN", "TE"]) {
    const m = html("bathukamma-2026", lang);
    const s = text(m);
    for (const d of sched.days) assert.match(m, new RegExp(`<time dateTime="${d.dateISO}"`));
    assert.match(s, /Telangana-specific — not a universal Telugu or South Indian practice/);
    assert.ok(s.includes(lang === "TE" ? sched.familyNoteTe : sched.familyNote));
    for (const loc of sched.locations) {
      assert.ok(s.includes(loc.label), `${lang}: ${loc.label} listed`);
      for (const d of sched.days) {
        const ev = schedules.scheduleDayEvidence(loc, d.day);
        assert.ok(s.includes(ev.basis), `${lang}: ${loc.id} day ${d.day} basis shown`);
        assert.ok(s.includes(`Evidence status: ${ev.evidenceStatus}; review status: ${loc.reviewStatus}.`));
        assert.ok(m.includes(`href="${ev.provenanceUrl}"`));
      }
    }
    assert.doesNotMatch(s, /verified|priest-approved|ఆమోదించిన/i);
  }
});

test("Bathukamma evidence runs group only identical consecutive days (Hyderabad: 1 / 2-8 / 9)", () => {
  const hyd = schedules.BATHUKAMMA_2026.locations.find((l) => l.id === "hyderabad");
  const runs = content.evidenceRuns(hyd, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(runs.map((r) => [r.fromDay, r.toDay, r.evidence.evidenceStatus]), [
    [1, 1, "separately-sourced"], [2, 8, "sequence-inferred"], [9, 9, "published-date"],
  ]);
});

test("Vinayaka topic text states the beta status honestly and adds no ritual instructions", () => {
  const s = text(html("vinayaka-chavithi-puja", "EN"));
  assert.match(s, /not yet priest-reviewed/);
  assert.doesNotMatch(s, /priest-approved guide|verified/i);
  assert.match(s, /I don’t know/);
});

test("civil dates are formatted without a time zone (deterministic)", () => {
  assert.equal(content.formatCivilDate("2026-10-10", "EN"), "Saturday, 10 October 2026");
  assert.equal(content.formatCivilDate("2026-10-18", "TE"), "18 అక్టోబర్ 2026, ఆదివారం");
});

test("the app opens an entry on its screen, in the link's language, writing nothing", () => {
  localStorage.clear();
  const render = (topic, language) => renderToStaticMarkup(
    React.createElement(page.VedaSaarathiApp, {
      entry: { topic, language },
      entryContent: React.createElement("p", { className: "probe" }, `probe-${topic}`),
    }),
  );
  const pan = render("panchangam", "TE");
  assert.match(pan, /id="today-card"/);
  assert.match(pan, /స్వాగతం/);
  assert.match(pan, /probe-panchangam/);
  const fest = render("festivals", "EN");
  assert.match(fest, /<h1>Hindu calendar<\/h1>/);
  const bat = render("bathukamma-2026", "EN");
  assert.match(bat, /October 2026/);
  const vin = render("vinayaka-chavithi-puja", "EN");
  assert.match(vin, /<h1>Vinayaka Chavithi<\/h1>/);
  assert.equal(localStorage.length, 0, "an entry render never writes preferences");
  // Without an entry, "/" is unchanged: Home, no topic slot.
  const home = renderToStaticMarkup(React.createElement(page.default));
  assert.match(home, /<h1>Welcome<\/h1>/);
  assert.doesNotMatch(home, /entry-topic-slot/);
});

test("Home links to every entry page with ordinary <a href> links, both languages", () => {
  const home = renderToStaticMarkup(React.createElement(page.default));
  for (const p of entry.ENTRY_PAGE_PATHS) assert.match(home, new RegExp(`<a[^>]* href="${p}"`));
});

test("the root layout's <html lang> comes from the request path via proxy.ts, never trusted from the client", () => {
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /headers\.set\(CONTENT_LANG_HEADER/);
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /=== "te" \? "te" : "en"/);
});
