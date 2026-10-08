// Response security headers set by the Worker (worker/security-headers.ts).
// Regression guard for the 2026-10-07 security review: the CSP must stay
// same-origin only with no 'unsafe-eval', HSTS must be present, and the
// Permissions-Policy must keep geolocation available to this origin (the
// optional "Use my location" button) while switching off unused features.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { withSecurityHeaders, CONTENT_SECURITY_POLICY, PERMISSIONS_POLICY, STRICT_TRANSPORT_SECURITY } =
  await vite.ssrLoadModule("/worker/security-headers.ts");

const directives = (csp) =>
  Object.fromEntries(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/);
    return [name, values];
  }));

test("every security header is set on a Worker response", () => {
  const res = withSecurityHeaders(new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }));
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(res.headers.get("X-Frame-Options"), "DENY");
  assert.equal(res.headers.get("Content-Security-Policy"), CONTENT_SECURITY_POLICY);
  assert.equal(res.headers.get("Strict-Transport-Security"), STRICT_TRANSPORT_SECURITY);
  assert.equal(res.headers.get("Permissions-Policy"), PERMISSIONS_POLICY);
  assert.equal(res.headers.get("content-type"), "text/html", "existing headers are kept");
});

test("status, status text and body are passed through unchanged", async () => {
  const res = withSecurityHeaders(new Response("missing", { status: 404, statusText: "Not Found" }));
  assert.equal(res.status, 404);
  assert.equal(res.statusText, "Not Found");
  assert.equal(await res.text(), "missing");
});

test("an upstream CSP is not overwritten", () => {
  const res = withSecurityHeaders(new Response("", { headers: { "Content-Security-Policy": "default-src 'none'" } }));
  assert.equal(res.headers.get("Content-Security-Policy"), "default-src 'none'");
});

test("CSP: same-origin only, no eval, no plugins, no framing, no base-tag hijack", () => {
  const d = directives(CONTENT_SECURITY_POLICY);
  assert.deepEqual(d["default-src"], ["'self'"]);
  for (const name of ["img-src", "font-src", "media-src", "connect-src", "manifest-src", "worker-src", "form-action"]) {
    assert.deepEqual(d[name], ["'self'"], `${name} is 'self' only`);
  }
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'none'"]);
  assert.deepEqual(d["frame-ancestors"], ["'none'"]);
  assert.ok(!CONTENT_SECURITY_POLICY.includes("unsafe-eval"), "no 'unsafe-eval'");
  assert.ok(!/https?:|\*/.test(CONTENT_SECURITY_POLICY), "no external host or wildcard anywhere");
  // Required by vinext's inline hydration scripts - proven in a browser
  // (see worker/security-headers.ts); kept to exactly these two sources.
  assert.deepEqual(d["script-src"], ["'self'", "'unsafe-inline'"]);
});

test("HSTS: one year, this host only (subdomains/preload are an owner decision)", () => {
  assert.equal(STRICT_TRANSPORT_SECURITY, "max-age=31536000");
  assert.ok(!/includeSubDomains|preload/i.test(STRICT_TRANSPORT_SECURITY));
});

test("Permissions-Policy keeps geolocation for this origin and disables unused features", () => {
  const entries = Object.fromEntries(PERMISSIONS_POLICY.split(",").map((e) => e.trim().split("=")));
  assert.equal(entries.geolocation, "(self)", "the optional 'Use my location' button must keep working");
  for (const f of ["camera", "microphone", "payment", "usb"]) assert.equal(entries[f], "()", `${f} disabled`);
});
