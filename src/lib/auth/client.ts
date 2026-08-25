import { createAuthClient } from "better-auth/react";
import { runSignOut } from "../../../scripts/sign-out-plan.mjs";

/**
 * Better Auth client for this React SPA (browser-side).
 *
 * Talks to this app's OWN Better Auth at same-origin `/api/auth/*`, and the
 * session rides the `__Host-` cookie that goes with every same-origin request.
 * Sign-in is email + password — call `authClient.signIn.email` /
 * `authClient.signUp.email` directly (see `src/routes/login.tsx`). There is no
 * third-party provider.
 *
 * To sign out call `signOut()` below, NOT `authClient.signOut()`: only the
 * former waits for the server to confirm before leaving the page.
 */
export const authClient = createAuthClient();

/**
 * True when sign-in UI should be shown — i.e. whenever `VITE_AUTH_ENABLED` is
 * not `"false"`. Setting it to `"false"` selects the dev user instead (see
 * `use-current-user`).
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/**
 * Sign out of this app's session, then redirect.
 *
 * Use this, never `authClient.signOut()` — see the note on `authClient`.
 * Sequencing lives in `scripts/sign-out-plan.mjs` so it can be unit-tested.
 *
 * **Rejects if the server never confirms.** The session is an HttpOnly cookie
 * only the server can clear, so redirecting anyway would report a sign-out that
 * did not happen. `<SignOutButton />` handles that for you; a hand-rolled
 * control must catch it and let the visitor retry.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  await runSignOut({
    // Better Auth resolves with `{ error }` instead of rejecting, so surface a
    // failed response as a rejection for the sequence to act on.
    requestSignOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign-out failed");
    },
    redirect: () => {
      window.location.href = redirectTo;
    },
  });
}
