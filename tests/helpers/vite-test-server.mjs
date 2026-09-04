// A Vite server for tests that only ever call ssrLoadModule() - never a real
// dev server or a browser client. Left at Vite's defaults, two things make
// concurrent test files interfere with each other:
//
// 1. server.middlewareMode with no server for HMR to piggyback on makes Vite
//    fall back to a standalone HMR websocket on a fixed port (24678). Every
//    test file that calls createServer() the plain way binds that same port,
//    and Node's test runner runs test files concurrently in separate
//    processes, so "port already in use" is a real race, not a flake to work
//    around with retries.
// 2. Every test file's Vite instance shares the project's node_modules/.vite
//    dependency-optimizer cache by default. Concurrent optimizer runs writing
//    to the same cache directory can collide mid-rename (ENOTEMPTY).
//
// Neither problem is inherent to the tests themselves - ssrLoadModule() needs
// no HMR at all, and each test file's module graph is small enough that a
// private cache costs little. So: disable HMR outright, and give every
// server its own throwaway cache directory instead of sharing one.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";

import { createServer } from "vite";

export async function createTestViteServer(root) {
  const cacheDir = mkdtempSync(join(tmpdir(), "vedasaarathi-vite-test-"));

  after(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  return createServer({
    appType: "custom",
    configFile: false,
    root,
    cacheDir,
    resolve: { alias: { "@": root } },
    server: { middlewareMode: true, hmr: false },
  });
}
