// Generates THIRD_PARTY_NOTICES.md (repo root) and public/THIRD_PARTY_NOTICES.txt
// (served by the app, precached for offline use) from the packages that are
// actually distributed with the app.
//
//   node scripts/generate-third-party-notices.mjs          # write both files
//   node scripts/generate-third-party-notices.mjs --check   # fail if stale
//
// Versions and licence texts are read from the INSTALLED packages
// (node_modules/<name>/package.json and its licence file) and each version is
// checked against package-lock.json. Nothing here is typed in from memory.
//
// Which packages are distributed: the list below was taken from the modules the
// production build actually emitted into the browser, server-rendering and
// React Server Components bundles (every `node_modules` path in each chunk), not
// from package.json. Transitive dependencies would appear in that list; none
// other than those below are bundled. Re-check it when dependencies change.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const OUT_ROOT = join(ROOT, "THIRD_PARTY_NOTICES.md");
export const OUT_PUBLIC = join(ROOT, "public", "THIRD_PARTY_NOTICES.txt");

const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n").trimEnd();
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

/** Packages bundled into the app's JavaScript. `where` comes from the build's
 * per-environment module lists (client / ssr / rsc). */
const JS_PACKAGES = [
  { name: "@vitejs/plugin-rsc", where: "browser and server bundles", licenseFile: null,
    fallbackLicense: "vendor/licenses/vite-plugin-react-LICENSE.txt",
    fallbackNote:
      "The installed package does not ship a licence file; its package.json declares MIT and points to " +
      "https://github.com/vitejs/vite-plugin-react (packages/plugin-rsc). The text below is that repository's " +
      "root LICENSE file (main branch, retrieved 2026-09-21) and is included because the package's own copyright " +
      "holders are not named in the installed files." },
  { name: "lucide-react", where: "browser and server bundles", licenseFile: "LICENSE" },
  { name: "mhah-panchang", where: "browser and server bundles (lazily loaded Panchanga engine chunk)", licenseFile: "LICENSE", mpl: true },
  { name: "react", where: "browser and server bundles", licenseFile: "LICENSE" },
  { name: "react-dom", where: "browser and server bundles", licenseFile: "LICENSE" },
  { name: "react-server-dom-webpack", where: "browser and server bundles", licenseFile: "LICENSE" },
  { name: "scheduler", where: "browser bundle", licenseFile: "LICENSE" },
  { name: "suncalc", where: "browser and server bundles", licenseFile: "LICENSE",
    declaredOverride: "BSD-2-Clause wording in its LICENSE file (no licence field in package.json)",
    declaredNote: "package.json declares no licence field; the LICENSE file shipped in the package is the licence text below." },
  { name: "vinext", where: "browser and server bundles", licenseFile: "LICENSE" },
];

/** Packages whose code/styles are compiled into the app's CSS. */
const CSS_PACKAGES = [
  { name: "tailwindcss", where: "compiled into the app stylesheet (its licence banner is kept at the top of that file)", licenseFile: "LICENSE" },
  { name: "tw-animate-css", where: "compiled into the app stylesheet", licenseFile: "LICENSE" },
];

/** Vendored file checked into this repository (imported by app/globals.css). */
const VENDORED = [
  { name: "shadcn Tailwind CSS (vendored file)", version: "4.13.0 (from the file name)",
    path: "vendor/shadcn-tailwind-4.13.0.css", licensePath: "vendor/shadcn-tailwind-4.13.0.LICENSE.md",
    where: "compiled into the app stylesheet" },
];

/** Facts about mhah-panchang, verified against the registry (see MPL_SECTION). */
const MHAH = {
  verifiedOn: "2026-09-21",
  tarball: "https://registry.npmjs.org/mhah-panchang/-/mhah-panchang-1.2.0.tgz",
  gitHead: "8e491cc69442f2ecbbf1194d511df5eee6ecc1bf",
};

function lockEntry(name) {
  const lock = readJson("package-lock.json");
  const e = lock.packages?.[`node_modules/${name}`];
  if (!e) throw new Error(`${name} is missing from package-lock.json`);
  return e;
}

function describe(pkg) {
  const dir = `node_modules/${pkg.name}`;
  if (!existsSync(join(ROOT, dir, "package.json"))) throw new Error(`${pkg.name} is not installed`);
  const json = readJson(`${dir}/package.json`);
  const lock = lockEntry(pkg.name);
  if (lock.version !== json.version) {
    throw new Error(`${pkg.name}: installed ${json.version} != package-lock ${lock.version}`);
  }
  let licenseText;
  let fallbackNote = null;
  if (pkg.licenseFile && existsSync(join(ROOT, dir, pkg.licenseFile))) {
    licenseText = read(`${dir}/${pkg.licenseFile}`);
  } else if (pkg.fallbackLicense) {
    licenseText = read(pkg.fallbackLicense);
    fallbackNote = pkg.fallbackNote;
  } else {
    throw new Error(`${pkg.name}: no licence file found`);
  }
  const repo = typeof json.repository === "string" ? json.repository : json.repository?.url;
  return {
    ...pkg,
    version: json.version,
    declared: json.license ?? "(none declared)",
    repo: repo ? repo.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "") : "(none declared in package.json)",
    integrity: lock.integrity ?? "(not recorded)",
    licenseText,
    fallbackNote,
  };
}

const RULE = "=".repeat(78);
const THIN = "-".repeat(78);

function block(c) {
  const lines = [
    RULE,
    `${c.name} ${c.version}`,
    RULE,
    `Declared licence : ${c.declaredOverride ?? c.declared}`,
    `Source           : ${c.repo}`,
    `Distributed in   : ${c.where}`,
    `Lockfile hash    : ${c.integrity}`,
  ];
  if (c.declaredNote) lines.push(`Note             : ${c.declaredNote}`);
  if (c.fallbackNote) lines.push(`Note             : ${c.fallbackNote}`);
  lines.push("", "Licence text:", THIN, c.licenseText, THIN, "");
  return lines.join("\n");
}

function vendoredBlock(v) {
  return [
    RULE,
    `${v.name} ${v.version}`,
    RULE,
    `File in this repository : ${v.path}`,
    `Licence file supplied with it : ${v.licensePath}`,
    `Distributed in   : ${v.where}`,
    "",
    "Licence text:",
    THIN,
    read(v.licensePath),
    THIN,
    "",
  ].join("\n");
}

function mplSection(m) {
  return [
    RULE,
    "MPL-2.0 component: mhah-panchang " + m.version,
    RULE,
    `Package          : mhah-panchang ${m.version}`,
    `Licence          : Mozilla Public License, version 2.0 (full text below, from the package's own LICENSE file)`,
    `Author (package.json) : ${readJson("node_modules/mhah-panchang/package.json").author ?? "(none)"}`,
    `Distributed version : ${m.version}, the compiled ES-module build from the package's dist/ folder,`,
    "                     shipped as a lazily loaded JavaScript chunk (Panchanga engine).",
    "Modified?        : NO. The installed files are byte-for-byte identical to the package published on",
    `                   the npm registry (compared file by file on ${MHAH.verifiedOn}), and the registry`,
    "                   tarball's SHA-512 matches the hash recorded in this project's package-lock.json:",
    `                   ${m.integrity}`,
    "                   VedaSaarathi's own code only imports the package; it does not change any",
    "                   MPL-covered file. VedaSaarathi's own files are separate works under ASCOR LABS'",
    "                   terms; the MPL applies to the mhah-panchang files, not to them.",
    "",
    "Where the corresponding Source Code Form is available (for exactly this version):",
    `  ${MHAH.tarball}`,
    "  This is the package tarball for version " + m.version + "; it contains the TypeScript source in its src/",
    "  folder (index.ts, mhahPanchang.ts, mhahPanchangImpl.ts and the other src/*.ts files) alongside the",
    "  compiled dist/ files. Check that the download's SHA-512 equals the hash above, or fetch it with:",
    `  npm pack mhah-panchang@${m.version}`,
    `  The registry lists gitHead ${MHAH.gitHead} for this version. The package metadata declares no`,
    "  repository or homepage URL; a GitHub address mentioned in a commented-out badge in the package's",
    `  README (omkarpattanaik/mhah-panchanga) returned "Not Found" on ${MHAH.verifiedOn}, so it is not relied on here.`,
    "",
  ].join("\n");
}

export function generate() {
  const js = JS_PACKAGES.map(describe);
  const css = CSS_PACKAGES.map(describe);
  const mhah = js.find((c) => c.mpl);
  const header = [
    "VedaSaarathi - THIRD-PARTY NOTICES",
    "",
    "VedaSaarathi is a project by ASCOR LABS. Copyright (c) 2026 ASCOR LABS. All rights reserved for",
    "ASCOR LABS' own original code and content. This file does not change that, and ASCOR LABS does not",
    "claim ownership of anything listed below. Each item below belongs to its own authors and is",
    "distributed under its own licence, reproduced in full. They are NOT all under one licence:",
    "",
    ...[...js, ...css].map((c) => `  - ${c.name} ${c.version}: ${c.declaredOverride ?? c.declared}`),
    `  - ${VENDORED[0].name} ${VENDORED[0].version}: MIT (see its licence text below)`,
    "",
    "The list was determined from the code and styles the production build actually packages into the",
    "app (browser bundle, server-rendering bundle, and stylesheet), and each version is the installed",
    "version, checked against package-lock.json. Build-time tools that are not shipped are not listed.",
    "Traditional texts, festival and Panchanga sources, and other reference material are cited in the",
    "app's content records and are not software; they are outside this file.",
    "",
  ].join("\n");
  const parts = [
    header,
    mplSection(mhah),
    ...js.map(block),
    ...css.map(block),
    ...VENDORED.map(vendoredBlock),
  ];
  // Licence texts are reproduced verbatim: do not collapse or re-wrap whitespace.
  return parts.join("\n").trimEnd() + "\n";
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  const text = generate();
  if (process.argv.includes("--check")) {
    const stale = [OUT_ROOT, OUT_PUBLIC].filter((p) => !existsSync(p) || readFileSync(p, "utf8") !== text);
    if (stale.length) {
      console.error("THIRD_PARTY_NOTICES is stale or missing:", stale.join(", "));
      process.exit(1);
    }
    console.log("THIRD_PARTY_NOTICES is up to date.");
  } else {
    writeFileSync(OUT_ROOT, text);
    writeFileSync(OUT_PUBLIC, text);
    console.log(`Wrote THIRD_PARTY_NOTICES.md and public/THIRD_PARTY_NOTICES.txt (${text.length} bytes).`);
  }
}
