// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { libraryDocuments } from "./document.ts";
import { calculateTool, initialInputs } from "./engineering.ts";

const golden = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "band1.golden.json"), "utf8"));

test("Band-1 declarative models match golden defaults", () => {
  const ids = Object.keys(golden);
  assert.equal(ids.length, 51);
  for (const id of ids) {
    assert.ok(libraryDocuments[id], `${id} is not a library document`);
    const actual = calculateTool(id, initialInputs[id]);
    const expected = golden[id];
    assert.equal(actual.errors.length, 0, `${id}: ${actual.errors}`);
    assert.equal(actual.method, expected.method, id);
    assert.deepEqual(actual.warnings, expected.warnings, id);
    assert.equal(actual.values.length, expected.values.length, id);
    for (let i = 0; i < expected.values.length; i++) {
      const got = actual.values[i];
      const want = expected.values[i];
      assert.equal(got.key, want.key, id);
      assert.equal(got.label, want.label, `${id}.${want.key} label`);
      assert.equal(got.display, want.display, `${id}.${want.key} display`);
    }
  }
});
