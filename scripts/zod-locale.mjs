// @ts-check
/**
 * Assert that zod's English locale survived bundling.
 *
 * zod registers its messages as a module-scope side effect at the bottom of
 * `zod/v4/classic/external.js`:
 *
 *   import en from "../locales/en.js";
 *   config(en());
 *
 * and zod's own `package.json` says `"sideEffects": false`. That tells Rolldown
 * the statement cannot matter, so it is dropped: the call's return value is
 * unused and nothing else imports `en`. What ships is a zod with no
 * `localeError`, and every built-in message collapses to the core fallback —
 * the literal string "Invalid input".
 *
 * The user found it the expensive way. Publishing a drafted calculator with a
 * blank source label showed a toast reading, in full, "Invalid input", and sent
 * them to a step with no indication of which field was wrong. The message
 * should have been "Too small: expected string to have >=2 characters".
 *
 * `src/lib/zod-config.ts` re-registers the locale, and this is the check that
 * can see whether that worked. It has to run against the build, because that is
 * the only place the defect exists — under Node the side effect runs normally,
 * so every unit test passes on a bundle that is broken. That is the same shape
 * as the stale-server CSP run and the post-load violation listener: a check
 * that cannot observe the failure is indistinguishable from a passing one.
 *
 * Runs from `npm run build`, in the same post-build slot as
 * `patch-ssr-exports.mjs` and `pglite-assets.mjs`.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** Where Vite writes the client bundle Vercel serves verbatim. */
export const CLIENT_ASSET_DIR = ".vercel/output/static/assets";

/**
 * Messages built by `zod/v4/locales/en.js` and by nothing else in the tree.
 *
 * Deliberately not "Invalid input": that string is the *fallback*, lives in
 * zod's core, and is present either way — grepping for it would pass on both
 * the broken and the fixed bundle, which is the failure this file exists to
 * avoid.
 */
export const LOCALE_MARKERS = ["Too small", "Too big", "Invalid option"];

/** @param {string} source */
export function findMissingMarkers(source) {
  return LOCALE_MARKERS.filter((marker) => !source.includes(marker));
}

async function main() {
  let entries;
  try {
    entries = await readdir(CLIENT_ASSET_DIR);
  } catch {
    console.error(`[zod-locale] ${CLIENT_ASSET_DIR} is missing — run this after vite build.`);
    process.exitCode = 1;
    return;
  }

  const scripts = entries.filter((name) => name.endsWith(".js"));
  if (!scripts.length) {
    console.error(`[zod-locale] no .js in ${CLIENT_ASSET_DIR} — nothing to check.`);
    process.exitCode = 1;
    return;
  }

  const sources = await Promise.all(scripts.map((name) => readFile(join(CLIENT_ASSET_DIR, name), "utf8")));
  const missing = findMissingMarkers(sources.join("\n"));

  if (missing.length) {
    console.error(
      [
        `[zod-locale] zod's English locale is not in the client bundle (missing: ${missing.join(", ")}).`,
        "Every validation message will read \"Invalid input\" on the deployed site.",
        "src/lib/zod-config.ts must call config() with locales.en(), and package.json's",
        '"sideEffects" allowlist must still name that file.',
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.log(`[zod-locale] locale present across ${scripts.length} client chunk(s).`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("zod-locale.mjs")) {
  await main();
}
