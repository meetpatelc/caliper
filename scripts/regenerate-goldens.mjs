#!/usr/bin/env node
/**
 * Rewrite the golden fixtures, but only where `raw` moved.
 *
 * The G2 migration changes what `raw` means for an output — from a display-unit
 * number to canonical SI — while every displayed value stays exactly as it was.
 * That is the whole claim, and this script is what makes it checkable: it
 * refuses to write anything if a key, label, display string, unit, warning,
 * error or method text differs. Only `raw` may move.
 *
 * Without that refusal, regenerating goldens after a data change is just
 * recording whatever the code now does, which is the opposite of a fixture.
 *
 * Membership is taken from the files themselves — each golden is regenerated
 * for exactly the tool ids it already contains — so the partitioning across the
 * six files cannot drift as a side effect of running this.
 *
 *   node scripts/regenerate-goldens.mjs          # report only
 *   node scripts/regenerate-goldens.mjs --write  # write if only raw differs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { calculateTool, initialInputs } from "../src/lib/engineering.ts";

const WRITE = process.argv.includes("--write");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const FILES = [
  "atlas.golden.json",
  "band1.golden.json",
  "near.golden.json",
  "pilot.golden.json",
  "remaining.golden.json",
  "wave2.golden.json",
];

let rawMoved = 0;
const violations = [];
const pending = [];

for (const name of FILES) {
  const path = join(root, "src/lib", name);
  const golden = JSON.parse(readFileSync(path, "utf8"));
  const next = {};

  for (const id of Object.keys(golden)) {
    const inputs = initialInputs[id];
    if (!inputs) {
      violations.push(`${name}: ${id} has no initial inputs — it would vanish from the fixture`);
      next[id] = golden[id];
      continue;
    }
    const result = calculateTool(id, inputs);
    const before = golden[id];

    const values = result.values.map(({ key, label, raw, display, unit }) => ({
      key,
      label,
      raw,
      display,
      unit,
    }));

    if (values.length !== before.values.length) {
      violations.push(
        `${name}: ${id} produces ${values.length} values, the fixture has ${before.values.length}`,
      );
    } else {
      for (const [index, value] of values.entries()) {
        const was = before.values[index];
        for (const field of ["key", "label", "display", "unit"]) {
          if (value[field] !== was[field]) {
            violations.push(
              `${name}: ${id}.${was.key ?? index} ${field} changed: ${JSON.stringify(was[field])} -> ${JSON.stringify(value[field])}`,
            );
          }
        }
        if (value.raw !== was.raw) rawMoved += 1;
      }
    }

    for (const field of ["warnings", "errors", "method"]) {
      const a = JSON.stringify(before[field]);
      const b = JSON.stringify(result[field]);
      if (a !== b) violations.push(`${name}: ${id} ${field} changed`);
    }

    next[id] = { values, warnings: result.warnings, errors: result.errors, method: result.method };
  }

  pending.push({ path, name, body: JSON.stringify(next, null, 2) + "\n" });
}

console.log(`raw values that moved: ${rawMoved}`);

if (violations.length) {
  console.error(`\nREFUSING TO WRITE — ${violations.length} visible change(s):\n`);
  for (const line of violations.slice(0, 40)) console.error(`  ${line}`);
  if (violations.length > 40) console.error(`  … and ${violations.length - 40} more`);
  console.error("\nEvery one of these is something a reader would see. Fix the change, not the fixture.");
  process.exit(1);
}

if (!WRITE) {
  console.log("nothing visible changed. Re-run with --write to update the fixtures.");
  process.exit(0);
}

for (const file of pending) writeFileSync(file.path, file.body);
console.log(`wrote ${pending.length} fixtures`);
