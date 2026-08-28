#!/usr/bin/env node
/**
 * Check that nothing in the build output issues a second CSP.
 *
 * The policy itself is no longer written here. It is issued per request by
 * `server/middleware/grok-pwa.ts`, because it carries a per-request nonce and
 * a nonce cannot live in a static header. What this script now guards is the
 * hazard that change introduced: a browser given two CSP headers enforces
 * *both*, so a leftover static rule in `.vercel/output/config.json` would
 * intersect with the per-request one and block every nonced script. The page
 * would not hydrate, and the header it came from would not be in the source.
 *
 * ── Why the nonce, and why the first attempt failed ──────────────────────
 *
 * Enforcement was tried once with a hash and it broke production: the app
 * never hydrated. `script-src` with a single hash covers the pre-paint theme
 * script and nothing else, and TanStack Start emits its own inline scripts for
 * the hydration payload and router state (`router-core/ssr/ssr-server.js:287`).
 * Their content changes with the page, so no fixed hash can cover them.
 *
 * They are, however, stamped from `router.options.ssr.nonce` — as are
 * `HeadContent`, `Scripts` and `ScriptOnce` — so setting that one option in
 * `getRouter()` covers every inline script the framework produces. Ours is
 * covered explicitly in `__root.tsx`. On the client, TanStack reads the nonce
 * back from the `<meta property="csp-nonce">` tag it writes for the purpose
 * (`router-core/load-client.js:1096`), so client-side navigation keeps working.
 *
 * ── The check that cleared the broken version ────────────────────────────
 *
 * Worth recording, because it looked exactly like a passing check: a
 * `securitypolicyviolation` listener attached from the console after load
 * cannot see violations raised while the document was parsing, which is when
 * every one of these fires. It reported zero because it was structurally
 * incapable of reporting anything else.
 *
 * The replacement is `scripts/csp-qa.mjs`, which loads a page cold with the
 * listener registered before any navigation and fails on the first violation.
 */
import { readFileSync, existsSync } from "node:fs";
import { buildPolicy } from "./csp-policy.mjs";

const CONFIG = ".vercel/output/config.json";

function main() {
  if (!existsSync(CONFIG)) {
    console.log("[csp] no build output — skipping");
    return;
  }
  const config = JSON.parse(readFileSync(CONFIG, "utf8"));
  const offenders = (config.routes ?? []).filter(
    (route) =>
      route.headers &&
      (route.headers["Content-Security-Policy"] ||
        route.headers["Content-Security-Policy-Report-Only"]),
  );
  if (offenders.length) {
    console.error(
      `[csp] ${offenders.length} static CSP route rule(s) in ${CONFIG}.\n` +
        "The policy is issued per request by server/middleware/grok-pwa.ts. A second\n" +
        "header here would be enforced alongside it and block every nonced script.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`[csp] per-request policy, no static rule: ${buildPolicy({ nonce: "…" })}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("csp.mjs")) main();
