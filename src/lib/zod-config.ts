import { config } from "zod";

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
config({ jitless: true });
