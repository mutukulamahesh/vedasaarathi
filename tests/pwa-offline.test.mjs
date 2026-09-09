// PWA / offline scaffolding: the web manifest, the service worker, and the
// registration component. Section 8.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const repo = fileURLToPath(new URL("..", import.meta.url));

const manifest = JSON.parse(readFileSync(`${repo}/public/manifest.webmanifest`, "utf8"));
const sw = readFileSync(`${repo}/public/sw.js`, "utf8");

test("web manifest is installable: name, start_url, scope, standalone, theme, and 192+512 icons", () => {
  assert.equal(manifest.name, "VedaSaarathi");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192"), "a 192 icon");
  assert.ok(sizes.includes("512x512"), "a 512 icon");
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"), "a maskable icon");
});

test("service worker: versioned caches, cleans old ones, and never touches cross-origin", () => {
  assert.match(sw, /const VERSION\s*=/);
  assert.match(sw, /caches\.keys\(\)/, "enumerates caches on activate");
  assert.match(sw, /caches\.delete/, "deletes stale caches");
  assert.match(sw, /url\.origin !== self\.location\.origin/, "bails on cross-origin");
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
});

test("service worker: navigations are network-first with a cached shell fallback; assets + audio are cache-first", () => {
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /navigationStrategy/);
  assert.match(sw, /cacheFirst/);
  assert.match(sw, /\/audio\//, "audio has its own handling");
  assert.match(sw, /You're offline/, "an offline fallback document");
});

test("the registration component renders nothing and is a client component", () => {
  const src = readFileSync(`${repo}/components/platform/pwa-register.tsx`, "utf8");
  assert.match(src, /^"use client";/);
  assert.match(src, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  // Registers in a production build even on localhost (so the offline flow is
  // testable); only the Vite dev server (which injects /@vite/client) is skipped.
  assert.match(src, /@vite\/client/, "skips only the Vite dev server");
});

test("root layout links the manifest, sets theme-color, and mounts the SW register", async () => {
  const src = readFileSync(`${repo}/app/layout.tsx`, "utf8");
  assert.match(src, /manifest: "\/manifest\.webmanifest"/);
  assert.match(src, /themeColor:/);
  assert.match(src, /<PwaRegister\s*\/>/);
});

test("PwaRegister mounts without throwing in an SSR render", async () => {
  const vite = await createTestViteServer(root);
  after(async () => {
    await vite.close();
  });
  const { PwaRegister } = await vite.ssrLoadModule("/components/platform/pwa-register.tsx");
  const html = renderToStaticMarkup(React.createElement(PwaRegister));
  assert.equal(html, "");
});

test("the service worker keeps the versioned offline-download caches across deploys, and reads them first", () => {
  assert.match(sw, /OFFLINE_PREFIX\s*=\s*"vs-offline-"/, "offline caches are matched by a version prefix");
  assert.match(
    sw,
    /!k\.startsWith\(OFFLINE_PREFIX\)/,
    "activate cleanup preserves every vs-offline-<version> cache",
  );
  assert.match(
    sw,
    /caches\.keys\(\)\)\.filter\(\(k\) => k\.startsWith\(OFFLINE_PREFIX\)\)/,
    "fromOfflineDownload scans every prefix-matched cache",
  );
  assert.match(sw, /fromOfflineDownload/, "every strategy checks the offline download first");
});

test("Home renders the 'Download for offline use' control", async () => {
  const vite = await createTestViteServer(root);
  after(async () => {
    await vite.close();
  });
  const page = await vite.ssrLoadModule("/app/page.tsx");
  const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
  const html = renderToStaticMarkup(
    React.createElement(page.HomeScreen, {
      setScreen: () => {}, openPreparation: () => {}, mode: "SELF", participantCount: 1,
      materialsReady: 0, todayEpochDay: 20000, nowMs: Date.parse("2026-09-14T06:00:00Z"),
      location: { status: "NOT_SET" }, featuredPuja: VINAYAKA_PUJA,
    }),
  );
  assert.match(html, /class="offline-download"/);
  assert.match(html, /offline use/i);
});
