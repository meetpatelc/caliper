// First, deliberately: this configures zod before any module below it
// constructs a schema. See the note in that file.
import "@/lib/zod-config";
import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFoundPage } from "@/components/missing-page";
import { routeTree } from "./routeTree.gen";

/**
 * The CSP nonce for this request, or undefined off the server.
 *
 * Deliberately a `globalThis` lookup rather than an import of
 * `server/csp-nonce.ts`: this module is bundled for the browser too, and that
 * one imports `node:async_hooks`. On the client this returns undefined and
 * TanStack overwrites `options.ssr` from the `<meta property="csp-nonce">` tag
 * during hydration, so client-side navigation keeps stamping the right value.
 */
function requestNonce(): string | undefined {
  const store = (globalThis as { __instrumentCspNonce?: { getStore(): string | undefined } })
    .__instrumentCspNonce;
  return store?.getStore();
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    // Otherwise an unmatched URL gets TanStack Router's bare `<p>Not Found</p>`
    // with no shell and no way back, plus a server warning on every miss.
    defaultNotFoundComponent: NotFoundPage,
    // Read by `HeadContent`, `Scripts`, `ScriptOnce` and — the one that matters
    // — `ssr-server.js`, which stamps it onto the inline scripts carrying the
    // hydration payload and router state. Those are what broke the first
    // attempt at enforcement: their content changes with the page, so no hash
    // can cover them.
    ssr: { nonce: requestNonce() },
  });
}
