/**
 * Request-scoped CSP nonce, shared between whoever sets the header and the
 * router that stamps the scripts.
 *
 * The two ends are far apart and cannot pass a value directly: the request
 * handler owns the response, but the nonce has to reach `getRouter()` in
 * `src/router.tsx`, which Start calls per request and hands no arguments. An
 * `AsyncLocalStorage` bridges them — the handler runs the rest of the chain
 * inside `runWithNonce`, so the render, wherever it happens, reads it back.
 *
 * Plain `.mjs` on purpose. The PWA chrome has two halves — the Vite plugin for
 * dev and preview, the Nitro middleware for the deployed app — and both must
 * issue the same policy or the thing is only testable in production. That is
 * the arrangement that let the last CSP attempt reach users unverified.
 *
 * Published on `globalThis` rather than imported by the router because
 * `src/router.tsx` is also bundled for the browser, and a static
 * `node:async_hooks` import would follow it there. The router does an optional
 * lookup that is simply `undefined` on the client — which is correct: the
 * client reads its nonce from the `<meta property="csp-nonce">` tag TanStack
 * writes for the purpose.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export const CSP_NONCE_GLOBAL = "__instrumentCspNonce";

// Reused across hot reloads and across the several entry points this module
// may be pulled through, so the router never reads a different store than the
// one the request handler wrote to.
const globals = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (globalThis));
const store = /** @type {AsyncLocalStorage<string>} */ (
  globals[CSP_NONCE_GLOBAL] ?? new AsyncLocalStorage()
);
globals[CSP_NONCE_GLOBAL] = store;

/**
 * @template T
 * @param {string} nonce
 * @param {() => T} fn
 * @returns {T}
 */
export function runWithNonce(nonce, fn) {
  return store.run(nonce, fn);
}
