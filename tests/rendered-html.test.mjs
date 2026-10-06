// Checks the ACTUAL server-rendered responses of the production build
// (dist/server/index.js, the Worker entry), not just the metadata source:
// the homepage <head> (title, description, absolute canonical, Open Graph,
// Twitter card), the visible bilingual intro, /robots.txt and /sitemap.xml.
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
  assert.match(html, /<p class="welcome-copy welcome-intro">VedaSaarathi is a free Hindu Panchangam, festival and puja companion\./);
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

test("/sitemap.xml is XML and lists only the public homepage", async () => {
  const response = await fetchFromWorker("/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^(application|text)\/xml\b/i);
  const body = await response.text();
  assert.match(body, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [`${ORIGIN}/`]);
});
