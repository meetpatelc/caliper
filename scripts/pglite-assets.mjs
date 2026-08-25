// @ts-check
/**
 * Copy PGLite's WASM + filesystem bundle into the built server function.
 *
 * `@electric-sql/pglite` loads its three runtime files by URL relative to its
 * own module — `new URL("./pglite.wasm", import.meta.url)`, and the same for
 * `./pglite.data` and `./initdb.wasm`. Bundling inlines the package's JS but
 * leaves those URLs alone, so the emitted chunk (Nitro names it
 * `_libs/electric-sql__pglite.mjs`) looks for the files NEXT TO ITSELF, in a
 * directory the bundler never puts them in:
 *
 *   [db] PGLite bootstrap failed: Error: ENOENT, open
 *     .vercel/output/functions/__server.func/_libs/pglite.data
 *
 * That is a deploy gap, not a `vite preview` quirk: `.vercel/output` is the
 * artifact Vercel uploads verbatim, and `src/lib/db.ts` falls back to embedded
 * PGLite whenever `DATABASE_URL` is unset — so an app deployed with no database
 * configured would crash the server on boot (the failed bootstrap rejects
 * unhandled) instead of running on the fallback it is supposed to have.
 *
 * Runs from `npm run build`, after Vite/Nitro has written the bundle — the
 * same post-build slot as `scripts/patch-ssr-exports.mjs`. It deliberately does
 * NOT hook Nitro's `compiled`: a `hooks.compiled` in the Nitro config REPLACES
 * the preset's own, and the vercel preset writes `config.json` and
 * `.vc-config.json` from that hook — silently losing them breaks the deploy
 * artifact far worse than the missing assets do.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

/**
 * The files PGLite reads at runtime, by the name it resolves against its own
 * module URL. `pglite.data` is the Postgres filesystem image, the two `.wasm`
 * files are the engine and the `initdb` that builds a fresh cluster.
 */
export const PGLITE_RUNTIME_ASSETS = ["pglite.data", "pglite.wasm", "initdb.wasm"];

/** Bundled JS the scan reads; anything else in the output can't hold a chunk. */
const SCANNED_EXTENSIONS = [".mjs", ".js", ".cjs"];

/**
 * Which runtime assets a built chunk resolves against its own location.
 *
 * Matching on the bare filename covers both forms the bundle keeps: the
 * `new URL("./pglite.wasm", import.meta.url)` calls in PGLite's own code and
 * the plain `"pglite.data"` strings Emscripten's loader passes to `locateFile`.
 *
 * @param {string} code
 * @returns {string[]}
 */
export function referencedRuntimeAssets(code) {
  return PGLITE_RUNTIME_ASSETS.filter((asset) => code.includes(asset));
}

/**
 * `@electric-sql/pglite`'s `dist/`, or `null` when the package isn't installed
 * (an app that never imports it must still build).
 * @returns {string | null}
 */
export function pgliteDistDir() {
  try {
    return dirname(createRequire(import.meta.url).resolve("@electric-sql/pglite"));
  } catch {
    return null;
  }
}

/**
 * Every directory under `dir` holding bundled JS that names a runtime asset,
 * mapped to the assets it names.
 *
 * `node_modules/` is skipped: a package left external there is loaded from its
 * own installed `dist/`, which already has the files beside it.
 *
 * @param {string} dir
 * @returns {Promise<Map<string, Set<string>>>}
 */
async function findAssetTargets(dir) {
  /** @type {Map<string, Set<string>>} */
  const targets = new Map();

  /** @param {string} current */
  async function walk(current) {
    /** @type {import("node:fs").Dirent[]} */
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return; // no server bundle (or no read access) — nothing to fix up
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        await walk(path);
        continue;
      }
      if (!SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;
      const assets = referencedRuntimeAssets(await readFile(path, "utf8"));
      if (assets.length === 0) continue;
      const existing = targets.get(current);
      if (existing) for (const asset of assets) existing.add(asset);
      else targets.set(current, new Set(assets));
    }
  }

  await walk(dir);
  return targets;
}

/**
 * Put every runtime asset the built server bundle references next to the chunk
 * that references it. Idempotent — a rebuilt bundle just overwrites.
 *
 * @param {string} serverDir Root of the built server function.
 * @param {string | null} [distDir] Source `dist/`; defaults to the installed package.
 * @returns {Promise<string[]>} Paths written, relative to `serverDir`.
 */
export async function copyPgliteRuntimeAssets(serverDir, distDir = pgliteDistDir()) {
  if (!distDir) return [];
  const targets = await findAssetTargets(serverDir);
  /** @type {string[]} */
  const copied = [];
  for (const [dir, assets] of targets) {
    for (const asset of assets) {
      const from = resolve(distDir, asset);
      const to = resolve(dir, asset);
      if (from === to) continue; // scanning the package in place
      await mkdir(dirname(to), { recursive: true });
      // Let a missing source throw: shipping a bundle that reaches for a file
      // it can't find is exactly the failure this step exists to prevent.
      await copyFile(from, to);
      copied.push(relative(serverDir, to).split("\\").join("/"));
    }
  }
  return copied;
}

/** Where the vercel preset writes the server function. */
export const SERVER_FUNC_REL_PATH = ".vercel/output/functions/__server.func";

if (process.argv[1]?.endsWith("pglite-assets.mjs")) {
  const serverDir = join(process.cwd(), SERVER_FUNC_REL_PATH);
  const copied = await copyPgliteRuntimeAssets(serverDir);
  if (copied.length > 0) {
    console.info(`pglite-assets: copied ${copied.join(", ")} into the server bundle`);
  }
}
