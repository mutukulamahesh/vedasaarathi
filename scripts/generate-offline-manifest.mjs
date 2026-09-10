// Build-generated offline precache manifest (blocker: OFFLINE COMPLETENESS).
//
// Runs after `vinext build`. Walks dist/client and writes
// dist/client/offline-manifest.json (and public/offline-manifest.json for the
// second build pass) — the EXACT list of URLs an offline download must cache to
// be 100% complete, plus a CONTENT version.
//
// Why a build step and not a DOM scrape: lazy route/vendor chunks (e.g.
// mhah-panchang, only imported when the Panchanga is computed) are NOT in the
// initial document, so a scrape of <script>/<link> misses them and a "download"
// that skips them is not actually usable offline. The build output has every
// emitted chunk, so this list is complete by construction.
//
// The version is a sha256 over each included file's URL AND its actual bytes —
// not its byte size — so a rebuilt asset with the same length but different
// content produces a different version (and the offline copy is correctly
// flagged stale).

import { createHash } from "node:crypto";
import {
  existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync,
} from "node:fs";
import { join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLIENT = join(ROOT, "dist", "client");
const OUT = join(CLIENT, "offline-manifest.json");
// vinext only serves a URL if a file backs it in public/ at BUILD time (it
// registers public/ files as routes). So the manifest is also written here and
// the build runs a second pass; see scripts/build-verified.sh.
const PUBLIC_OUT = join(ROOT, "public", "offline-manifest.json");

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

/** The exact files an offline download must cache, as `{ url, fullPath }`. */
function collectFiles(clientDir) {
  const found = new Map(); // url -> fullPath
  for (const f of ROOT_FILES) {
    const full = join(clientDir, f);
    if (existsSync(full)) found.set(`/${f}`, full);
  }
  for (const { dir, re } of INCLUDE) {
    const base = join(clientDir, dir);
    if (!existsSync(base)) continue;
    for (const full of walk(base)) {
      if (!re.test(full)) continue;
      const url = "/" + relative(clientDir, full).split(sep).join(posix.sep);
      found.set(url, full);
    }
  }
  return found;
}

/**
 * Compute the offline manifest for a built client directory. Pure — reads the
 * filesystem, writes nothing. The version is content-addressed: sha256 over
 * `${url}\0${sha256(file bytes)}` for every included file, sorted. Two builds
 * with byte-identical assets get the same version; changing ANY file's content
 * (even without changing its size) changes the version.
 */
export function buildOfflineManifest(clientDir) {
  const files = collectFiles(clientDir);
  const urls = new Set(SHELL);
  const contentLines = [];
  for (const [url, fullPath] of files) {
    urls.add(url);
    const fileHash = createHash("sha256").update(readFileSync(fullPath)).digest("hex");
    contentLines.push(`${url}\0${fileHash}`);
  }
  const sorted = [...urls].sort();
  const version = createHash("sha256")
    .update(contentLines.sort().join("\n"))
    .digest("hex")
    .slice(0, 12);
  return { version, count: sorted.length, urls: sorted };
}

function main() {
  if (!existsSync(CLIENT)) {
    console.error("generate-offline-manifest: dist/client is missing — run the build first.");
    process.exit(1);
  }

  const { version, count, urls } = buildOfflineManifest(CLIENT);
  const json = JSON.stringify(
    { version, generatedAt: new Date().toISOString(), count, urls },
    null,
    2,
  ) + "\n";
  writeFileSync(OUT, json);
  writeFileSync(PUBLIC_OUT, json);

  const audio = urls.filter((u) => u.startsWith("/audio/")).length;
  const code = urls.filter((u) => u.startsWith("/assets/")).length;
  console.log(
    `generate-offline-manifest: ${count} URLs ` +
      `(${code} JS/CSS chunks, ${audio} audio, content version ${version}) -> ` +
      `dist/client/offline-manifest.json + public/offline-manifest.json`,
  );

  // Sanity: the lazily-imported Panchanga engine chunk MUST be in the list, or
  // an offline download would not be able to compute the Panchanga.
  if (!urls.some((u) => /mhah-panchang/.test(u))) {
    console.error(
      "generate-offline-manifest: mhah-panchang chunk not found in dist/client/assets — offline Panchanga would fail.",
    );
    process.exit(1);
  }
}

const invokedDirectly = (() => {
  try {
    return (
      process.argv[1] &&
      realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();
if (invokedDirectly) main();
