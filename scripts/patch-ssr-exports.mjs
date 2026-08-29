/**
 * Rolldown can split the SSR entry into ssr.mjs + ssr2.mjs that import each
 * other, and re-export an unbound `ssr_exports`. Nitro's renderer loads
 * `ssr.mjs` and calls `.fetch` on that export, which on an empty object is
 * nothing. Bind it to the real server entry and load `__exportAll` from
 * _runtime so the cycle is gone. Idempotent.
 *
 * Nothing here may assume WHICH single letter an export landed on. Rolldown
 * assigns those from the set of exports in the chunk, so adding one binding
 * anywhere in the server graph renumbers the rest. An earlier version keyed
 * on `s` and `c`; adding a single `getRequestHeader` import moved them, at
 * which point it deleted `var ssr_exports = {}` without rewriting the export
 * that still named it and every route 500'd with "Export 'ssr_exports' is
 * not defined in module".
 *
 * It also used to REBIND the namespace export to the server entry, which
 * broke every consumer that reaches through it. Rolldown emits a two-hop
 * `import("./ssr.mjs").then((n) => n.<ns>).then((n) => n.t)` for dynamic
 * imports of `@tanstack/react-start/server`, and with `<ns>` rebound to the
 * entry, `.t` is undefined. That is not hypothetical: it failed every
 * feedback submission in production, and it still sits in better-auth's
 * `tanstack-start-cookies` plugin, which reaches for `setCookie` that way to
 * write the session cookie after sign-in.
 *
 * So the namespace is populated rather than replaced: it inherits from the
 * server entry, so `.fetch` still resolves for Nitro, and carries `t` for the
 * two-hop importers. Idempotent.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const MARKER = "/* patched: ssr_exports bound */";
import { join } from "node:path";

export function patchSsrExports(src) {
  if (src.includes(MARKER)) return src;
  // Rolldown names `ssr_exports` in the export list without always declaring
  // it, and when it does declare it the object is empty. Either way the fix is
  // the same: put a real one in front of the export statement.
  if (!/\bssr_exports\b/.test(src)) return src;

  let next = src.replace(/(?:\n)?var ssr_exports = \{\};\n(?=export \{)/, "\n");

  // Inherit from the server entry rather than copying it, so a method reading
  // `this` still resolves, and hang the chunk's namespace off `t` where the
  // two-hop dynamic imports look for it.
  const declaration =
    `${MARKER}\nvar ssr_exports = Object.assign(Object.create(server_default), { t: server_exports });\n`;

  const exportAt = next.search(/^export \{/m);
  if (exportAt === -1) {
    throw new Error("patch-ssr-exports: ssr_exports is referenced but there is no export statement to precede.");
  }
  for (const name of ["server_default", "server_exports"]) {
    if (!new RegExp(`\\bas ${name}\\b|\\bvar ${name}\\b`).test(next)) {
      throw new Error(
        `patch-ssr-exports: ${name} is not in scope in ssr.mjs. The chunk shape changed — fix the rule, not the output.`,
      );
    }
  }
  return next.slice(0, exportAt) + declaration + next.slice(exportAt);
}

export function patchSsr2Cycle(src) {
  // Again: the letter is whatever Rolldown chose this build.
  const fromSsr = /import\s*\{\s*[A-Za-z_$][\w$]* as __exportAll\$1\s*\}\s*from\s*"\.\/ssr\.mjs";\n?/;
  if (!fromSsr.test(src)) return src;
  if (src.includes('import { r as __exportAll$1 } from "../_runtime.mjs"')) {
    return src.replace(fromSsr, "");
  }
  return src.replace(fromSsr, 'import { r as __exportAll$1 } from "../_runtime.mjs";\n');
}

const root = join(process.cwd(), ".vercel/output/functions/__server.func/_ssr");
const ssrFile = join(root, "ssr.mjs");
const ssr2File = join(root, "ssr2.mjs");

if (process.argv[1]?.endsWith("patch-ssr-exports.mjs")) {
  let changed = false;

  if (existsSync(ssrFile)) {
    const src = readFileSync(ssrFile, "utf8");
    const next = patchSsrExports(src);
    if (next !== src) {
      writeFileSync(ssrFile, next);
      changed = true;
    }
  }

  if (existsSync(ssr2File)) {
    const src = readFileSync(ssr2File, "utf8");
    const next = patchSsr2Cycle(src);
    if (next !== src) {
      writeFileSync(ssr2File, next);
      changed = true;
    }
  }

  if (changed) console.info("patch-ssr-exports: bound the SSR namespace export to the server entry");
}
