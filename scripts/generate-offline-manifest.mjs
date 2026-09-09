// Build-generated offline precache manifest (blocker: OFFLINE COMPLETENESS).
//
// Runs after `vinext build`. Walks dist/client and writes
// dist/client/offline-manifest.json — the EXACT list of URLs an offline
// download must cache to be 100% complete, plus a content version.
//
// Why a build step and not a DOM scrape: lazy route/vendor chunks (e.g.
// mhah-panchang, only imported when the Panchanga is computed) are NOT in the
// initial document, so a scrape of <script>/<link> misses them and a "download"
// that skips them is not actually usable offline. The build output has every
// emitted chunk, so this list is complete by construction.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLIENT = join(ROOT, "dist", "client");
const OUT = join(CLIENT, "offline-manifest.json");
// vinext only serves a URL if a file backs it in public/ at BUILD time (it
// registers public/ files as routes). So the manifest is also written here and
// the build runs a second pass; see scripts/build-verified.sh.
const PUBLIC_OUT = join(ROOT, "public", "offline-manifest.json");

if (!existsSync(CLIENT)) {
  console.error("generate-offline-manifest: dist/client is missing — run the build first.");
  process.exit(1);
}

/** The app shell (server-rendered, not a file on disk). */
const SHELL = ["/"];

/** Root files worth precaching (mirrors lib/offline/download.ts SHELL_URLS). */
const ROOT_FILES = ["sw.js", "favicon.svg", "manifest.webmanifest"];

/** Extension allow-list per directory. Everything else on disk (audio
 * .meta.json / .sha256 / .txt sidecars, Next template SVGs, _headers, .vite)
 * is deliberately excluded. */
const INCLUDE = [
  { dir: "assets", re: /\.(?:js|css|woff2?|ttf|otf)$/ },
  { dir: "icons", re: /\.(?:png|svg|ico)$/ },
  { dir: "audio", re: /\.mp3$/ },
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const urls = new Set(SHELL);
const sizeLines = [];

for (const f of ROOT_FILES) {
  const full = join(CLIENT, f);
  if (existsSync(full)) {
    urls.add(`/${f}`);
    sizeLines.push(`/${f}\0${statSync(full).size}`);
  }
}

for (const { dir, re } of INCLUDE) {
  const base = join(CLIENT, dir);
  if (!existsSync(base)) continue;
  for (const full of walk(base)) {
    if (!re.test(full)) continue;
    const url = "/" + relative(CLIENT, full).split(sep).join(posix.sep);
    urls.add(url);
    sizeLines.push(`${url}\0${statSync(full).size}`);
  }
}

const sorted = [...urls].sort();
const version = createHash("sha256")
  .update(sizeLines.sort().join("\n"))
  .digest("hex")
  .slice(0, 12);

const manifest = {
  version,
  generatedAt: new Date().toISOString(),
  count: sorted.length,
  urls: sorted,
};

const json = JSON.stringify(manifest, null, 2) + "\n";
writeFileSync(OUT, json);
writeFileSync(PUBLIC_OUT, json);

const audio = sorted.filter((u) => u.startsWith("/audio/")).length;
const code = sorted.filter((u) => u.startsWith("/assets/")).length;
console.log(
  `generate-offline-manifest: ${sorted.length} URLs ` +
    `(${code} JS/CSS chunks, ${audio} audio, version ${version}) -> ` +
    `dist/client/offline-manifest.json + public/offline-manifest.json`,
);

// Sanity: the lazily-imported Panchanga engine chunk MUST be in the list, or an
// offline download would not be able to compute the Panchanga.
if (!sorted.some((u) => /mhah-panchang/.test(u))) {
  console.error("generate-offline-manifest: mhah-panchang chunk not found in dist/client/assets — offline Panchanga would fail.");
  process.exit(1);
}
