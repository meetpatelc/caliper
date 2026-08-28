import assert from "node:assert/strict";
import test from "node:test";
import { buildPolicy, createNonce } from "./csp-policy.mjs";

/**
 * The failure this guards against is quiet, which is why it is worth a test.
 *
 * Enforcement broke production once already. The policy has to permit exactly
 * the inline scripts the app emits — via a nonce, since their content changes
 * per request — and nothing else. A policy that quietly grows `unsafe-inline`
 * would pass every other check in the repo while giving up the whole point.
 */
test("script-src carries the nonce and no blanket inline escape", () => {
  const policy = buildPolicy({ nonce: "EXAMPLE" });
  assert.match(policy, /script-src 'self' 'nonce-EXAMPLE'/);
  assert.ok(
    !/script-src[^;]*unsafe-inline/.test(policy),
    "script-src must not permit arbitrary inline script",
  );
  assert.ok(!/script-src[^;]*unsafe-eval/.test(policy), "nothing here needs eval");
});

test("without a nonce nothing inline is allowed", () => {
  // The no-nonce shape is what a misconfigured caller would emit. It must fail
  // closed — deny the scripts — rather than fall back to permitting them.
  const policy = buildPolicy();
  assert.match(policy, /script-src 'self'(;|$)/);
  assert.ok(!/nonce-/.test(policy));
});

test("the policy names every origin the app actually loads from", () => {
  const policy = buildPolicy({ nonce: "EXAMPLE" });
  assert.match(policy, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(policy, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(policy, /connect-src 'self'/);
  assert.match(policy, /frame-ancestors 'self'/);
  assert.match(policy, /object-src 'none'/);
});

test("each nonce is fresh and long enough to be worth having", () => {
  const a = createNonce();
  const b = createNonce();
  assert.notEqual(a, b, "a reused nonce is no better than 'unsafe-inline'");
  // 16 bytes base64. Anything shorter is guessable within a page's lifetime.
  assert.ok(Buffer.from(a, "base64").length >= 16);
});
