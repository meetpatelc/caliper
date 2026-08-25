import { createMiddleware } from "@tanstack/react-start";

/**
 * Auth middleware for server functions — the standard way to get the caller's
 * verified user id. The session cookie is same-origin, so it rides along with
 * every server-function call automatically; call sites thread nothing.
 *
 *   import { createServerFn } from "@tanstack/react-start";
 *   import { getSql } from "@/lib/db";
 *   import { authMiddleware } from "@/lib/auth/middleware";
 *
 *   export const listTodos = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       const sql = await getSql();
 *       return sql`select * from todos where user_id = ${context.userId}`;
 *     });
 *
 * Signed out with auth on -> throws `UnauthorizedError` (see
 * `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`) it
 * resolves the shared dev user — but throws instead when a `DATABASE_URL` is
 * also set, so an app without sign-in must not use this at all. On the auth-on
 * path, use it on every server function that touches per-user data and scope
 * every query by `context.userId`.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    // ONLY import `*.server` modules here, so Vite never ships
    // `@tanstack/react-start/server` to the browser. `isolation.server.ts` keeps
    // its suffix for the same reason — keep this path in sync with the filename.
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { requireUserId } = await import("./verify.server");
    // Reject scripted cross-site/sibling requests before touching per-user data.
    assertSameSiteRequest();
    const userId = await requireUserId();
    return next({ context: { userId } });
  },
);

/**
 * Like `authMiddleware`, but additionally requires the caller to be on the
 * `ADMIN_EMAILS` allowlist (see `./admin.server`). Throws `ForbiddenError`
 * otherwise.
 *
 * Use this — not `authMiddleware` — for SHARED data that is not scoped to one
 * user. Where sign-up is open, "signed in" is not an authorization check.
 */
export const adminMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { requireAdminUser } = await import("./admin.server");
    assertSameSiteRequest();
    const user = await requireAdminUser();
    return next({ context: { userId: user.id } });
  },
);
