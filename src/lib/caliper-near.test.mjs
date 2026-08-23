// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { libraryDocuments } from "./document.ts";
import { calculateTool, initialInputs } from "./engineering.ts";

const golden = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "caliper-near.golden.json"), "utf8"));

test("Near closed-form models match golden TypeScript defaults", () => {
  const ids = Object.keys(golden);
  assert.equal(ids.length, 8);
  const failed = [];
  for (const id of ids) {
    if (!libraryDocuments[id]) {
      failed.push(`${id}: not a library document`);
      continue;
    }
    const actual = calculateTool(id, initialInputs[id]);
    const expected = golden[id];
    if (actual.errors.length) failed.push(`${id}: ${actual.errors}`);
    if (actual.method !== expected.method) failed.push(`${id} method mismatch`);
    if (JSON.stringify(actual.warnings) !== JSON.stringify(expected.warnings)) failed.push(`${id} warnings mismatch`);
    const n = Math.min(actual.values.length, expected.values.length);
    if (actual.values.length !== expected.values.length) failed.push(`${id} value count ${actual.values.length} != ${expected.values.length}`);
    for (let i = 0; i < n; i++) {
      const got = actual.values[i];
      const want = expected.values[i];
      if (got.key !== want.key) failed.push(`${id}[${i}] key ${got.key} != ${want.key}`);
      if (got.label !== want.label) failed.push(`${id}.${want.key} label`);
      if (got.display !== want.display) failed.push(`${id}.${want.key} display ${JSON.stringify(got.display)} != ${JSON.stringify(want.display)}`);
      if (got.unit !== want.unit) failed.push(`${id}.${want.key} unit`);
    }
  }
  assert.equal(failed.length, 0, failed.join("\n"));
});
