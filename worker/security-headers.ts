// Security headers for every response the Worker itself returns: the
// server-rendered documents ("/", the public entry pages and their /te/
// versions), the RSC/server-action responses, and the image endpoint.
//
// Static files (/assets/*, /audio/*, /icons/*, sw.js, ...) are served by the
// host's static-asset layer and never reach this code. public/_headers sets
// nosniff / referrer / frame-options for them on hosts that honour that
// file. The current production host does NOT apply public/_headers (checked
// 2026-10-07: static responses carry none of its headers, and /_headers is
// itself served as a downloadable file) - see
// docs/temp/security-privacy-licensing-review-2026-10-07.md.
//
// The Content-Security-Policy was checked in a real browser against what this
// app actually ships (2026-10-07, worker-backed `vite preview` of the
// production build, plus one read-only visit of production):
//   - script-src needs 'unsafe-inline': every server-rendered page carries
//     vinext's hydration bootstrap and RSC payload as inline <script> tags
//     (6-9 per page). With 'unsafe-inline' removed, every one is blocked and
//     the page never hydrates. vinext has nonce plumbing that could replace
//     'unsafe-inline' later; that is a separate, larger change (it must also
//     keep the offline service worker's cached pages working).
//   - style-src keeps 'unsafe-inline' as a cautious default, NOT because it
//     is known to be required. The server-rendered HTML contains no inline
//     style attributes or <style> tags, and the progress bars'
//     `style={{ width }}` (offline-download.tsx, prepare-screen.tsx,
//     candidate-review-screen.tsx, puja-screen.tsx) is applied by React on
//     the client through the CSSOM, which CSP does not block: with style-src
//     'self' only, the probed screens rendered identically with zero
//     violations. Not every screen was probed, so it is left as it was.
//   - connect-src/img-src/media-src/manifest-src are 'self' only: every
//     fetch, image and audio source this app uses is same-origin (no
//     analytics, no CDN, no external API).
//   - No 'unsafe-eval', no external hosts anywhere: none are needed.
// frame-ancestors 'none' + X-Frame-Options: DENY (belt-and-suspenders: the
// former is what modern browsers honour, the latter covers older ones).
//
// Strict-Transport-Security: the site is HTTPS-only already (HTTP redirects
// to HTTPS), but without HSTS a first visit typed as http:// can be
// intercepted before that redirect. One year, this host only. Adding
// includeSubDomains or preload is a separate owner decision: both affect
// every subdomain of the domain and preload is slow to undo.
//
// Permissions-Policy: geolocation stays allowed for this origin (the
// optional "Use my location" button needs it); camera, microphone, payment
// and USB are features this app never uses, so they are switched off for
// the page and anything it might embed.

export const CONTENT_SECURITY_POLICY = [
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
].join("; ");

export const STRICT_TRANSPORT_SECURITY = "max-age=31536000";

export const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(self), payment=(), usb=()";

export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY);
  headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
