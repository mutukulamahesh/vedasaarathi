// Checks the ACTUAL server-rendered responses of the production build
// (dist/server/index.js, the Worker entry), not just the metadata source:
// the homepage <head> (title, description, absolute canonical, Open Graph,
// Twitter card), the visible bilingual intro, /robots.txt and /sitemap.xml,
// and every bilingual entry page (lib/entry-pages.ts): <html lang>, own head
// metadata, self canonical, reciprocal hreflang and server-rendered topic text.
// Requires `npm run build` first.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const ORIGIN = "https://vedasaarathi.com";
const SHARE_IMAGE_URL = `${ORIGIN}/social/vedasaarathi-share.png`;

async function fetchFromWorker(path, accept = "*/*") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

/** All `<meta>`/`<link>` attribute maps in the document head. */
function headTags(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const tags = [];
  for (const m of head.matchAll(/<(meta|link)\b([^>]*)>/gi)) {
    const attrs = {};
    for (const a of m[2].matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) attrs[a[1].toLowerCase()] = a[2];
    tags.push({ tag: m[1].toLowerCase(), attrs });
  }
  return tags;
}

function metaContent(tags, key) {
  const t = tags.find((x) => x.tag === "meta" && (x.attrs.property === key || x.attrs.name === key));
  return t?.attrs.content;
}

test("homepage has no development preview metadata (regression: codex-preview shipped to production)", async () => {
  const response = await fetchFromWorker("/", "text/html");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.doesNotMatch(html, /codex-preview/i);
});

test("homepage renders title, description, absolute canonical, Open Graph and Twitter card", async () => {
  const html = await (await fetchFromWorker("/", "text/html")).text();
  const tags = headTags(html);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  assert.match(title, /VedaSaarathi/);
  assert.match(title, /Panchangam/);

  const description = metaContent(tags, "description") ?? "";
  assert.match(description, /location-aware/);
  assert.match(description, /Panchangam/);

  const canonical = tags.find((t) => t.tag === "link" && t.attrs.rel === "canonical");
  assert.equal(canonical?.attrs.href, `${ORIGIN}/`);

  assert.equal(metaContent(tags, "og:type"), "website");
  assert.equal(metaContent(tags, "og:url"), `${ORIGIN}/`);
  assert.equal(metaContent(tags, "og:site_name"), "VedaSaarathi");
  assert.equal(metaContent(tags, "og:title"), title);
  assert.ok(metaContent(tags, "og:description"));
  assert.equal(metaContent(tags, "og:image"), SHARE_IMAGE_URL);
  assert.equal(metaContent(tags, "og:image:width"), "1200");
  assert.equal(metaContent(tags, "og:image:height"), "630");
  assert.ok(metaContent(tags, "og:image:alt"));

  assert.equal(metaContent(tags, "twitter:card"), "summary_large_image");
  assert.ok(metaContent(tags, "twitter:title"));
  assert.ok(metaContent(tags, "twitter:description"));
  assert.equal(metaContent(tags, "twitter:image"), SHARE_IMAGE_URL);
});

test("manifest and icon links stay same-origin relative (PWA works on every host, CSP manifest-src 'self')", async () => {
  const tags = headTags(await (await fetchFromWorker("/", "text/html")).text());
  const manifest = tags.find((t) => t.tag === "link" && t.attrs.rel === "manifest");
  assert.equal(manifest?.attrs.href, "/manifest.webmanifest");
  for (const t of tags.filter((x) => x.tag === "link" && /icon/.test(x.attrs.rel ?? ""))) {
    assert.match(t.attrs.href, /^\/(?!\/)/, `${t.attrs.rel} href must be relative: ${t.attrs.href}`);
  }
});

test("sharing metadata advertises only live capabilities (no unimplemented pujas)", async () => {
  const html = await (await fetchFromWorker("/", "text/html")).text();
  const head = html.slice(0, html.indexOf("</head>"));
  assert.doesNotMatch(head, /Satyanarayana|Satyanarayan|Vratham/i);
});

test("homepage shows a visible plain-language introduction", async () => {
  const html = await (await fetchFromWorker("/", "text/html")).text();
  const intro = html.match(/<p class="welcome-copy welcome-intro">([^<]*)<\/p>/)?.[1];
  assert.equal(
    intro,
    "VedaSaarathi is a free Hindu Panchangam, festival and puja companion. Panchangam is the traditional Hindu calendar. Explore today’s Panchangam for your location, view upcoming festival dates with their sources and notes, and follow an available guided puja step by step.",
  );
  // Regression: festival dates are shown with their own sources and notes,
  // not claimed as uniformly calculated for the visitor's location.
  assert.doesNotMatch(intro, /festivals? (dates )?calculated for your location/i);
});

test("the sharing image is a real, locally hosted 1200x630 PNG", () => {
  const file = new URL("../public/social/vedasaarathi-share.png", import.meta.url);
  assert.ok(existsSync(file));
  const bytes = readFileSync(file);
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(bytes.readUInt32BE(16), 1200);
  assert.equal(bytes.readUInt32BE(20), 630);
  assert.ok(bytes.length > 10_000 && bytes.length < 600_000, `unexpected size ${bytes.length}`);
});

test("/robots.txt is plain text, allows crawling and points at the absolute sitemap", async () => {
  const response = await fetchFromWorker("/robots.txt");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain\b/i);
  const body = await response.text();
  assert.match(body, /^User-Agent: \*$/m);
  assert.match(body, /^Allow: \/$/m);
  assert.doesNotMatch(body, /^Disallow: \/$/m);
  assert.match(body, new RegExp(`^Sitemap: ${ORIGIN}/sitemap\\.xml$`, "m"));
});

const TOPICS = ["panchangam", "festivals", "bathukamma-2026", "vinayaka-chavithi-puja"];
const ENTRY_PATHS = [...TOPICS.map((t) => `/${t}`), ...TOPICS.map((t) => `/te/${t}`)];

test("/sitemap.xml is XML and lists the homepage plus exactly the shipped entry pages", async () => {
  const response = await fetchFromWorker("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^(application|text)\/xml\b/i);
  const body = await response.text();
  assert.match(body, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [`${ORIGIN}/`, ...ENTRY_PATHS.map((p) => `${ORIGIN}${p}`)]);
  // Each entry page lists both language versions (reciprocal alternates).
  for (const t of TOPICS) {
    const block = body.split("<url>").find((b) => b.includes(`<loc>${ORIGIN}/te/${t}</loc>`));
    assert.match(block, new RegExp(`hreflang="en" href="${ORIGIN}/${t}"`));
    assert.match(block, new RegExp(`hreflang="te" href="${ORIGIN}/te/${t}"`));
  }
});

for (const path of ENTRY_PATHS) {
  const te = path.startsWith("/te/");
  const topic = path.replace(/^\/te/, "").slice(1);
  test(`${path}: served HTML has lang, own title/description, self canonical, reciprocal hreflang, OG/Twitter and topic text`, async () => {
    const response = await fetchFromWorker(path, "text/html");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`<html lang="${te ? "te" : "en"}"`));
    const tags = headTags(html);
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    assert.ok(title && !/Free Hindu Panchangam, Festival & Puja Companion/.test(title), `own title: ${title}`);
    if (te) assert.match(title, /[\u0C00-\u0C7F]/);
    const canonical = tags.find((t) => t.tag === "link" && t.attrs.rel === "canonical");
    assert.equal(canonical?.attrs.href, `${ORIGIN}${path}`);
    const alt = Object.fromEntries(tags
      .filter((t) => t.tag === "link" && t.attrs.rel === "alternate" && t.attrs.hreflang)
      .map((t) => [t.attrs.hreflang, t.attrs.href]));
    assert.deepEqual(alt, { en: `${ORIGIN}/${topic}`, te: `${ORIGIN}/te/${topic}`, "x-default": `${ORIGIN}/${topic}` });
    assert.equal(metaContent(tags, "og:url"), `${ORIGIN}${path}`);
    assert.equal(metaContent(tags, "og:title"), title);
    assert.equal(metaContent(tags, "twitter:title"), title);
    assert.equal(metaContent(tags, "og:image"), SHARE_IMAGE_URL);
    // Real topic text in the initial HTML, outside any script.
    const body = html.slice(html.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "");
    assert.match(body, new RegExp(`<section class="entry-topic" lang="${te ? "te" : "en"}"`));
    assert.match(body, new RegExp(`<a href="${te ? `/${topic}` : `/te/${topic}`}" hrefLang="${te ? "en" : "te"}"`));
    assert.doesNotMatch(html.slice(0, html.indexOf("</head>")), /Satyanarayana|Vratham/i);
  });
}

test("the content-language header cannot be spoofed by a client", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  const res = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", "x-vedasaarathi-content-lang": "te" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.match(await res.text(), /<html lang="en"/);
});

test("Bathukamma entry page keeps per-day evidence status and REVIEW_REQUIRED in the initial HTML", async () => {
  const html = await (await fetchFromWorker("/bathukamma-2026", "text/html")).text();
  for (const s of ["separately-sourced", "sequence-inferred", "published-date", "product-selected"]) {
    assert.ok(html.includes(`Evidence status: <!-- -->${s}<!-- -->; review status: <!-- -->REVIEW_REQUIRED`)
      || html.includes(`Evidence status: ${s}; review status: REVIEW_REQUIRED`), s);
  }
});
