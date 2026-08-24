import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/engine.mjs"), "utf8");

test("engine.mjs has no conversion factors; inventory.json is the only table", () => {
  assert.equal(src.includes("0.0254"), false);
  assert.equal(src.includes("273.15"), false);
  assert.equal(src.includes("6894"), false);
  assert.match(src, /resolveUnit/);
  assert.match(src, /unit\.factor/);
  assert.match(src, /unit\.scale/);
  assert.match(src, /unit\.offset/);
});
