// Cloudflare Workers ambient types (Fetcher, D1Database, the `cloudflare:workers`
// module, etc.) for `tsc`. The runtime build gets these from the Cloudflare Vite
// plugin; this reference makes a plain `tsc --noEmit` type-check succeed too.
/// <reference types="@cloudflare/workers-types" />

// Bindings this worker may receive. `DB` is optional because `.openai/hosting.json`
// leaves `d1` null by default; db/index.ts guards for its absence at runtime.
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}
