// Load a project TypeScript module from a plain Node script (build validator,
// audio generator) via Vite's SSR loader. Standalone - unlike the test helper
// it does not touch node:test.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

export async function withProjectModule(specifier, fn) {
  const cacheDir = mkdtempSync(join(tmpdir(), "vedasaarathi-script-"));
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: "silent",
    cacheDir,
    server: { middlewareMode: true, ws: false, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: { alias: { "@": ROOT.replace(/\/$/, "") } },
  });
  try {
    const mod = await server.ssrLoadModule(specifier);
    return await fn(mod);
  } finally {
    await server.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
}
