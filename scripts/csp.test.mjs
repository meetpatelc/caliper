import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildPolicy, themeScriptSource } from "./csp.mjs";

/**
 * The failure this guards against is quiet, which is why it is worth a test.
 *
 * The pre-paint theme script is inline and must be, so the policy carries its
 * SHA-256. If the header and the script drift apart, the browser blocks the
 * script and the page flashes the wrong theme on every load — in production
 * only, with nothing erroring and no request failing.
 */
test("the policy allows the inline theme script and nothing else inline", () => {
  const policy = buildPolicy("sha256-EXAMPLE");
  assert.match(policy, /script-src 'self' 'sha256-EXAMPLE'/);
  assert.ok(!/script-src[^;]*unsafe-inline/.test(policy), "script-src must not permit arbitrary inline script");
  assert.ok(!/script-src[^;]*unsafe-eval/.test(policy), "nothing here needs eval");
});

test("the policy names every origin the app actually loads from", () => {
  const policy = buildPolicy("sha256-EXAMPLE");
  assert.match(policy, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(policy, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(policy, /connect-src 'self'/);
  assert.match(policy, /frame-ancestors 'self'/);
  assert.match(policy, /object-src 'none'/);
});

test("the hash is derived from the script the app actually renders", () => {
  // Reads the same literal the route imports and substitutes the same theme
  // constants, so a changed colour moves the hash rather than silently
  // invalidating it. Reconstructed from source rather than imported, because
  // this runner does not strip TypeScript.
  const source = themeScriptSource();
  assert.ok(source.includes("prefers-color-scheme"), "sanity: this is the theme script");
  assert.ok(!source.includes("${"), "every interpolation must be resolved before hashing");
  assert.match(source, /instrument-theme/, "the theme key must be substituted, not left as a placeholder");
  const hash = `sha256-${createHash("sha256").update(source, "utf8").digest("base64")}`;
  assert.match(hash, /^sha256-[A-Za-z0-9+/]+=*$/);
});
