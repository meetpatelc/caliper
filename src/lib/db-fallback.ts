/**
 * Saying out loud when a DEPLOYED app is running on the embedded PGLite
 * fallback.
 *
 * The fallback exists so an app works with nothing configured — the live
 * preview, a fresh clone, a sandbox (see `dbSource` in `./db.ts`). Deployed,
 * the same fallback is a data-loss trap wearing a healthy face: PGLite is
 * in-memory and per-instance, so every serverless instance boots an empty
 * database, instances disagree with each other, and writes vanish when an
 * instance recycles. Nothing errors; the data is just quietly gone.
 *
 * So the fallback stays (a deploy that hasn't picked a database yet still
 * runs), but it announces itself in the function logs instead of passing for
 * a working database.
 */

/**
 * Environment markers set by the hosting platform, not by a local run.
 * `vite preview` also runs the production bundle, so `NODE_ENV` cannot tell
 * the two apart — only the platform's own variable can. Add a host's marker
 * here when the app starts deploying to one.
 */
const DEPLOYMENT_MARKERS = ["VERCEL"];

/** Whether this process is a deployed instance rather than a local run. */
export function isDeployedRuntime(env: Record<string, string | undefined>): boolean {
  return DEPLOYMENT_MARKERS.some((marker) => Boolean(env[marker]?.trim()));
}

export const FALLBACK_DATA_LOSS_WARNING =
  "[db] DATABASE_URL is not set, so this DEPLOYED app is running on the embedded " +
  "PGLite fallback. That database is in-memory and per-instance: every instance " +
  "starts empty, instances do not share data, and writes are lost when an instance " +
  "recycles. Set DATABASE_URL to a Postgres connection string (see .env.example).";

/**
 * The warning to log for a process on the PGLite fallback, or `null` when the
 * fallback is being used as intended (locally, where losing the data on
 * restart is the expected trade).
 *
 * Only meaningful on the PGLite path — `dbSource` has already established that
 * `DATABASE_URL` is unset by the time this is called.
 */
export function fallbackDataLossWarning(env: Record<string, string | undefined>): string | null {
  return isDeployedRuntime(env) ? FALLBACK_DATA_LOSS_WARNING : null;
}
