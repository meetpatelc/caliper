import { createAuthClient } from "better-auth/react";
import { runSignOut } from "../../../scripts/sign-out-plan.mjs";

/**
 * Better Auth client for this React SPA (browser-side).
 *
 * Talks to this app's OWN Better Auth at same-origin `/api/auth/*`. Sign-in is
 * email + password — call `authClient.signIn.email` / `authClient.signUp.email`
 * directly (see `src/routes/login.tsx`). There is no third-party provider.
 *
 * The `onRequest` hook attaches a bearer token when one is stored, which only
 * happens in an embedded-iframe host with partitioned cookies; on a normal
 * deploy no token exists and the session cookie is used unchanged.
 *
 * To sign out call `signOut()` below, NOT `authClient.signOut()`: the raw call
 * leaves any bearer token in place, and `onRequest` keeps re-attaching it, so
 * the visitor stays signed in.
 */
export const authClient = createAuthClient({
  fetchOptions: {
    onRequest(ctx) {
      const token = getBearerToken();
      if (token) ctx.headers.set("Authorization", `Bearer ${token}`);
      return ctx;
    },
  },
});

/**
 * True when sign-in UI should be shown — i.e. whenever `VITE_AUTH_ENABLED` is
 * not `"false"`. Setting it to `"false"` selects the dev user instead (see
 * `use-current-user`).
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

// ── Bearer token (embedded-host fallback) ────────────────────────────────────
// An embedded iframe host has partitioned cookies, so a session token stored
// here is attached to every Better Auth request (and to server functions, via
// `@/lib/auth/middleware`). Empty on a normal deploy, so the cookie path is
// untouched there.
const BEARER_KEY = "grok-auth.bearer-token";

/** The stored preview bearer token, or null. */
export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

/**
 * True in an embedded sandbox-host iframe, where the session lives in a bearer
 * token rather than a cookie — so clearing it locally is a complete sign-out.
 * False on a normal deploy, where only the server can end the session.
 */
function inEmbeddedHost(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".grok-sandbox.com")
  );
}

/**
 * Sign out of THIS app's local session, clear any bearer token, then redirect.
 *
 * Use this, never `authClient.signOut()` — see the note on `authClient`.
 * Sequencing lives in `scripts/sign-out-plan.mjs` so it can be unit-tested.
 *
 * **Rejects when deployed if the server never confirms.** There the session is
 * an HttpOnly cookie only the server can clear, so redirecting anyway would
 * report a sign-out that did not happen. `<SignOutButton />` handles that for
 * you; a hand-rolled control must catch it and let the visitor retry. In an
 * embedded host the local clear is sufficient, so it always resolves.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  await runSignOut({
    livePreview: inEmbeddedHost(),
    hasBearer: Boolean(getBearerToken()),
    // Better Auth resolves with `{ error }` instead of rejecting, so surface a
    // failed response as a rejection for the sequence to act on.
    requestSignOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign-out failed");
    },
    clearToken: () => setBearerToken(null),
    redirect: () => {
      window.location.href = redirectTo;
    },
  });
}
