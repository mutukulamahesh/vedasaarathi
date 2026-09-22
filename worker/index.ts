/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

// Security headers for every response THIS Worker returns - the
// server-rendered document at "/", and the RSC/server-action and image
// endpoints. Cloudflare's assets binding serves plain static files
// (/assets/*, /audio/*, /icons/*, ...) directly and never reaches this code;
// those get the same nosniff/referrer/frame-options values from
// public/_headers instead (kept in sync by hand - two small files, not a
// generated pair, so "duplicated" is an acceptable, low-risk tradeoff here).
//
// The Content-Security-Policy below was written against what THIS app
// actually ships, checked in the browser, not applied blindly:
//   - script-src needs 'unsafe-inline': the SSR HTML carries its hydration
//     payload in inline <script> tags (the RSC chunk data); this is how
//     vinext/React Server Components hydration works here, not something
//     this app's own code controls.
//   - style-src needs 'unsafe-inline': several progress bars set a plain
//     `style={{ width: ... }}` React inline style (offline-download.tsx,
//     prepare-screen.tsx, candidate-review-screen.tsx, puja-screen.tsx,
//     components/ui/progress.tsx).
//   - connect-src/img-src/media-src/manifest-src are 'self' only: every
//     fetch, image and audio source this app uses is same-origin (checked -
//     no analytics, no CDN, no external API).
//   - No 'unsafe-eval', no external hosts anywhere: none are needed.
// frame-ancestors 'none' + X-Frame-Options: DENY (belt-and-suspenders: the
// former is what modern browsers honor, the latter covers older ones).
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  if (!headers.has("Content-Security-Policy")) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self'",
        "font-src 'self'",
        "media-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const res = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(res);
    }

    return withSecurityHeaders(await handler.fetch(request, env, ctx));
  },
};

export default worker;
