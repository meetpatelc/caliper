import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Who a request appears to come from, for rate limiting.
 *
 * **Server-only** (`.server.ts` suffix), and it has to be its own module rather
 * than a few lines inline. `@tanstack/react-start/server` reaches Node's
 * `AsyncLocalStorage`, so a non-`.server` module importing it ships that to the
 * browser; and importing it *dynamically* from a dual module does not avoid
 * that so much as break differently.
 *
 * That second failure is the one this file exists for, and it was live on the
 * deployed site: `submitFeedback` did
 *
 *     const { getRequestHeader } = await import("@tanstack/react-start/server");
 *
 * which the bundler emitted as
 *
 *     await import("./ssr.mjs").then((n) => n.s).then((n) => n.t)
 *
 * — a two-hop chain through the SSR entry's namespace. `scripts/patch-ssr-exports.mjs`
 * then rebinds that `s` to the real server entry so Nitro's renderer can call
 * `mod.s.fetch`, at which point `.t` on it is `undefined`. Every feedback
 * submission failed with "Cannot destructure property 'getRequestHeader'",
 * server-side, after the user had written their message.
 *
 * A static import inside a `.server.ts` module resolves to a direct binding
 * (`import { a as getRequestHeader } from "./ssr2.mjs"`) with no namespace hop
 * to rebind, which is what every other server module here already does.
 */
export function senderKey(): string {
  // Vercel sets these at its own edge; locally there is no proxy and every
  // sender collapses to one key, which is correct for one machine.
  return (
    getRequestHeader("x-vercel-forwarded-for") ??
    getRequestHeader("x-real-ip") ??
    getRequestHeader("x-forwarded-for") ??
    "local"
  );
}
