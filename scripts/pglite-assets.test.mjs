import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  PGLITE_RUNTIME_ASSETS,
  copyPgliteRuntimeAssets,
  referencedRuntimeAssets,
} from "./pglite-assets.mjs";

/** A stand-in `dist/` holding one tiny file per real runtime asset. */
async function fixtureDist() {
  const dir = await mkdtemp(join(tmpdir(), "pglite-dist-"));
  for (const asset of PGLITE_RUNTIME_ASSETS) await writeFile(join(dir, asset), asset);
  return dir;
}

async function fixtureServerDir() {
  return await mkdtemp(join(tmpdir(), "pglite-out-"));
}

test("finds the assets a bundled chunk resolves against itself", () => {
  const code = `let n = new URL("./pglite.data", import.meta.url);\nnew URL("./pglite.wasm", import.meta.url);\n`;
  assert.deepEqual(referencedRuntimeAssets(code), ["pglite.data", "pglite.wasm"]);
});

test("finds the bare locateFile names too", () => {
  assert.deepEqual(referencedRuntimeAssets(`var e = "initdb.wasm";`), ["initdb.wasm"]);
});

test("unrelated code references nothing", () => {
  assert.deepEqual(referencedRuntimeAssets(`import "pg";\nawait sql\`select 1\`;`), []);
});

test("copies each referenced asset next to the chunk that names it", async () => {
  const dist = await fixtureDist();
  const serverDir = await fixtureServerDir();
  await mkdir(join(serverDir, "_libs"), { recursive: true });
  await writeFile(
    join(serverDir, "_libs", "electric-sql__pglite.mjs"),
    `new URL("./pglite.data", import.meta.url); new URL("./pglite.wasm", import.meta.url); new URL("./initdb.wasm", import.meta.url);`,
  );

  const copied = await copyPgliteRuntimeAssets(serverDir, dist);

  assert.deepEqual(copied.sort(), ["_libs/initdb.wasm", "_libs/pglite.data", "_libs/pglite.wasm"]);
  const written = await readdir(join(serverDir, "_libs"));
  for (const asset of PGLITE_RUNTIME_ASSETS) assert.ok(written.includes(asset));
});

test("leaves a bundle that never loads PGLite alone", async () => {
  const dist = await fixtureDist();
  const serverDir = await fixtureServerDir();
  await writeFile(join(serverDir, "index.mjs"), `import "pg";\n`);

  assert.deepEqual(await copyPgliteRuntimeAssets(serverDir, dist), []);
  assert.deepEqual(await readdir(serverDir), ["index.mjs"]);
});

test("skips node_modules — an external package keeps its own assets", async () => {
  const dist = await fixtureDist();
  const serverDir = await fixtureServerDir();
  const pkg = join(serverDir, "node_modules", "@electric-sql", "pglite", "dist");
  await mkdir(pkg, { recursive: true });
  await writeFile(join(pkg, "index.js"), `new URL("./pglite.data", import.meta.url);`);

  assert.deepEqual(await copyPgliteRuntimeAssets(serverDir, dist), []);
  assert.deepEqual(await readdir(pkg), ["index.js"]);
});

test("no server bundle is not an error", async () => {
  const dist = await fixtureDist();
  assert.deepEqual(
    await copyPgliteRuntimeAssets(join(tmpdir(), "pglite-missing-output-dir"), dist),
    [],
  );
});

test("is a no-op when the package is not installed", async () => {
  const serverDir = await fixtureServerDir();
  await writeFile(join(serverDir, "index.mjs"), `new URL("./pglite.data", import.meta.url);`);
  assert.deepEqual(await copyPgliteRuntimeAssets(serverDir, null), []);
});
