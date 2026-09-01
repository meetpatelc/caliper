// First, deliberately: this configures zod before any module below it
// constructs a schema. See the note in that file.
import "@/lib/zod-config";
import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { NotFoundPage } from "@/components/missing-page";
import { parseSearchPlain, stringifySearchPlain } from "@/lib/search-params";
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
    /*
     * Plain query strings, not TanStack's JSON search.
     *
     * The default stringifier JSON-encodes every value, so setting the axial
     * load to 25 produced `?force=%2225%22&area=%221000%22…`. It round trips
     * correctly and it is unreadable, and these URLs exist to be shared — into
     * a message, a drawing note, an email to somebody checking your work. The
     * quoting is the first thing they see about the tool.
     *
     * The two functions have been in `search-params.ts` since the shareable
     * links were built; they were used to render href strings and never wired
     * into the router, so every navigate wrote the JSON form back. Two pages
     * then patched it up afterwards with `history.replaceState`, which raced
     * the router and only sometimes won. Doing it here removes the race and
     * the workaround.
     *
     * `parseSearchPlain` still unwraps quoted values, so links already sent in
     * the JSON form keep working.
     */
    parseSearch: parseSearchPlain,
    stringifySearch: stringifySearchPlain,
  });
}
