/**
 * Rolldown can split the SSR entry into ssr.mjs + ssr2.mjs that import each
 * other, and re-export an unbound `ssr_exports` as `s`. Nitro's renderer loads
 * `ssr.mjs` then calls `mod.s.fetch`. Bind `s` to the real server entry and
 * load `__exportAll` from _runtime so the cycle is gone. Idempotent.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function patchSsrExports(src) {
  let next = src.replace(/\bssr_exports as s\b/, "server_default as s");
  next = next.replace(/(?:\n)?var ssr_exports = \{\};\n(?=export \{)/, "\n");
  return next;
}

export function patchSsr2Cycle(src) {
  const fromSsr = /import\s*\{\s*c as __exportAll\$1\s*\}\s*from\s*"\.\/ssr\.mjs";\n?/;
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

  if (changed) console.info("patch-ssr-exports: pointed ssr.mjs `s` at the server entry");
}
