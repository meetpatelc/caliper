#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { calculateTool, initialInputs } from "../src/lib/engineering.ts";
import { remainingDocuments } from "../src/lib/library-remaining.ts";

const golden = JSON.parse(readFileSync(new URL("../src/lib/remaining.golden.json", import.meta.url), "utf8"));
const relClose = (a, b) => Math.abs(a - b) <= 1e-8 || Math.abs(a - b) / Math.max(1e-12, Math.abs(b)) <= 1e-8;
const failed = [];
for (const id of Object.keys(remainingDocuments).sort()) {
  const expected = golden[id];
  const actual = calculateTool(id, initialInputs[id]);
  if (!expected) {
    failed.push(`${id}: no golden`);
    continue;
  }
  if (actual.errors.length) failed.push(`${id} errors: ${actual.errors.join("; ")}`);
  if (actual.method !== expected.method) failed.push(`${id} method\n  got ${JSON.stringify(actual.method)}\n  want ${JSON.stringify(expected.method)}`);
  if (JSON.stringify(actual.warnings) !== JSON.stringify(expected.warnings)) {
    failed.push(`${id} warnings\n  got ${JSON.stringify(actual.warnings)}\n  want ${JSON.stringify(expected.warnings)}`);
  }
  if (actual.values.length !== expected.values.length) failed.push(`${id} value count ${actual.values.length} != ${expected.values.length}`);
  const n = Math.min(actual.values.length, expected.values.length);
  for (let i = 0; i < n; i++) {
    const got = actual.values[i];
    const want = expected.values[i];
    if (got.key !== want.key) failed.push(`${id}[${i}] key ${got.key} != ${want.key}`);
    if (got.label !== want.label) failed.push(`${id}.${want.key} label ${JSON.stringify(got.label)} != ${JSON.stringify(want.label)}`);
    if (got.display !== want.display) failed.push(`${id}.${want.key} display ${JSON.stringify(got.display)} != ${JSON.stringify(want.display)}`);
    if (got.unit !== want.unit) failed.push(`${id}.${want.key} unit ${got.unit} != ${want.unit}`);
    if (!relClose(got.raw, want.raw)) failed.push(`${id}.${want.key} raw ${got.raw} != ${want.raw}`);
  }
}
console.log(JSON.stringify({ migrated: Object.keys(remainingDocuments).length, failed: failed.length, details: failed }, null, 2));
if (failed.length) process.exit(2);
