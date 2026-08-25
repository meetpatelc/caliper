/**
 * Admin allowlist (server-only).
 *
 * Some data is shared rather than per-user — the feedback inbox is everyone's
 * messages in one list — so `authMiddleware` alone is not an authorization
 * check for it: with open sign-up, "any signed-in user" is "anyone".
 *
 * Membership comes from `ADMIN_EMAILS` (comma-separated). It is matched against
 * the *verified session* email, never a client-supplied one.
 *
 * Fails closed: an unset or empty `ADMIN_EMAILS` means nobody is an admin, so
 * forgetting to configure it hides the data rather than exposing it.
 */
import type { VerifiedUser } from "./verify.server";

/**
 * Thrown when a caller is authenticated but not permitted. Carries
 * `status: 403` — distinct from `UnauthorizedError` (401), because signing in
 * as someone else is not a remedy.
 */
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

/** Lowercased admin emails from `ADMIN_EMAILS`; empty when unconfigured. */
export function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when `email` is on the allowlist. An empty allowlist admits nobody. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/**
 * Resolve the caller and confirm they are an admin, or throw `ForbiddenError`.
 * Use via `adminMiddleware` (`./middleware`) rather than calling directly.
 */
export async function requireAdminUser(bearerToken?: string): Promise<VerifiedUser> {
  // Imported here, not at module scope, so the allowlist helpers above stay
  // free of server-only dependencies and can be unit-tested directly.
  const { getSessionUser } = await import("./verify.server");
  const user = await getSessionUser(bearerToken);
  if (!user || !isAdminEmail(user.email)) throw new ForbiddenError();
  return user;
}
