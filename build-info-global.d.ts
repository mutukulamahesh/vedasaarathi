// Ambient type for __VS_BUILD__, a compile-time constant vite.config.ts bakes
// directly into the client bundle (see its `define` block) so the build
// identifier About shows can never drift from the code actually running -
// no fetch, so no cache (this app's own service worker included) can serve a
// stale or too-new value for it. Read only via
// components/platform/about-screen.tsx.
interface VsBuildInfo {
  commit: string | null;
  commitShort: string | null;
  dirty: boolean;
  builtAt: string;
}
declare const __VS_BUILD__: VsBuildInfo;
