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
  assert.match(src, /localhost/, "skips registration on localhost dev");
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
