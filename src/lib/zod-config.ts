import { config, locales } from "zod";

/**
 * Stop zod probing for `Function` support.
 *
 * zod v4 decides once, lazily, whether it can use its JIT-compiled validation
 * path by running `Function("")` inside a try/catch. Under our enforced
 * Content-Security-Policy that call is blocked, the catch fires, and zod falls
 * back to the interpreted path — correct behaviour, and the fallback it was
 * written for.
 *
 * The probe is still reported as a `script-src` violation on every page load,
 * though, and that is worth removing: a console with one benign violation in
 * it on every page is a console nobody reads the next violation in. `jitless`
 * skips the probe, and costs nothing, because the JIT path is unavailable
 * under the policy either way.
 *
 * This has to run at module scope, and it has to run first. zod resolves the
 * probe when a schema is *constructed*, not when one is parsed, and several
 * modules build their schemas at module scope — so doing this inside
 * `getRouter()` is already too late.
 *
 * That makes it an import side effect, which `package.json` has to allow:
 * `"sideEffects"` was a flat `false`, so Rollup dropped this module from the
 * bundle entirely the first time it was written this way. The call vanished
 * and the violation kept firing, with nothing to show it had gone missing.
 * The field is now an allowlist naming this file.
 */
/**
 * Re-register the English locale, which the bundler removes.
 *
 * zod's own entry point does this for us — `zod/v4/classic/external.js` ends
 * with `config(en())` at module scope — and zod's `package.json` declares
 * `"sideEffects": false`, so Rolldown is told that statement cannot matter and
 * drops it. Nothing else references `en`, and the call returns a value nobody
 * reads, so there is no import left to keep it alive.
 *
 * What survives is a zod whose `localeError` is unset, and every built-in
 * message falls back to the core default — the literal string "Invalid input".
 * Publish reported it verbatim, so a draft missing its source label said
 * "Invalid input" and pointed at nothing. Custom messages were unaffected,
 * which is why this hid for so long: `Use a lowercase slug.` and
 * `Unknown unit family.` are ours and still shipped, so the validation
 * *looked* wired up.
 *
 * It only breaks in a build. `npm test` imports zod through Node, where the
 * side effect runs normally and every message is correct — so no test could
 * see it. `scripts/zod-locale.mjs` greps the built client bundle instead,
 * which is the only place the defect exists.
 *
 * This is the same trap as the `jitless` note above, one package over: a
 * side-effecting module-scope call inside a tree marked side-effect-free. Here
 * it is zod's declaration rather than ours, so the fix is to do the work again
 * somewhere the bundler has been told to keep.
 */
config({ ...locales.en(), jitless: true });
