import { randomBytes } from "node:crypto";

/**
 * The Content-Security-Policy, in one place.
 *
 * Shared deliberately: the policy is now issued per request by the PWA
 * middleware (`server/middleware/pwa.ts`) because it carries a per-request
 * nonce, while `scripts/csp.mjs` still needs the same directive list at build
 * time to keep the generated output honest. Two copies of a header this
 * fiddly would drift, and the failure mode of a drifted CSP is a silently
 * broken page rather than a failing check.
 */

/**
 * @param {{ nonce?: string }} [options]
 *   `nonce` adds `'nonce-…'` to `script-src`. Every inline script the app emits
 *   — the pre-paint theme script and the ones TanStack Start writes for the
 *   hydration payload and router state — carries this value.
 */
export function buildPolicy({ nonce } = {}) {
  const scriptSrc = ["'self'"];
  if (nonce) scriptSrc.push(`'nonce-${nonce}'`);
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Google Fonts serves the stylesheet; 'unsafe-inline' is required because
    // the UI libraries in use (sonner, cmdk, recharts) inject <style> at
    // runtime. Narrowing this means replacing those, not tightening a header.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // data: covers inline SVG sketches. https: is here for one reason only —
    // account avatars come from whatever origin the provider hands back.
    "img-src 'self' data: https:",
    "connect-src 'self'",
    // Modernises the X-Frame-Options above it, which is kept for older agents.
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/**
 * 16 bytes of randomness, base64 — the length CSP implementations expect.
 *
 * Only ever called on a server (the middleware, or this repo’s own scripts),
 * so the node builtin is imported directly rather than injected.
 */
export function createNonce() {
  return randomBytes(16).toString("base64");
}
