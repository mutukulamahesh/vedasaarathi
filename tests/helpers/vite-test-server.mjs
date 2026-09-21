// A Vite server for tests that only ever call ssrLoadModule() - never a real
// dev server or a browser client. Left at Vite's defaults, two things make
// concurrent test files interfere with each other:
//
// 1. In middleware mode with no httpServer to attach to, Vite's websocket
//    layer always creates its own standalone http.Server and binds it to
//    port 24678, regardless of `hmr`. Setting `hmr: false` only disables the
//    HMR *protocol* (module-reload messages) - createWebSocketServer() in
//    vite/dist/node/chunks/node.js still runs unconditionally and still
//    listens on that port for the "vite-ping" reconnection socket, unless
//    `server.ws` is itself set to `false`. Only `ws: false` takes the early
//    return that skips creating that server (and its port bind) entirely.
//    Every test file that left `ws` at its default bound the same port, and
//    Node's test runner runs test files concurrently in separate processes,
//    so "port already in use" was a real race, not a flake to work around
//    with retries.
// 2. Every test file's Vite instance shares the project's node_modules/.vite
//    dependency-optimizer cache by default. Concurrent optimizer runs writing
//    to the same cache directory can collide mid-rename (ENOTEMPTY).
//
// Neither problem is inherent to the tests themselves - ssrLoadModule() needs
// no websocket of any kind, and each test file's module graph is small enough
// that a private cache costs little. So: disable the websocket server
// outright, and give every server its own throwaway cache directory instead
// of sharing one.
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
    server: { middlewareMode: true, hmr: false, ws: false },
  });
}
