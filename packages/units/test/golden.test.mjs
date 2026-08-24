import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { convertQuantity, inventory } from "../src/engine.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { cases } = JSON.parse(readFileSync(join(root, "data/golden.json"), "utf8"));

const relTol = 1e-12;
const absTol = 1e-15;

function close(actual, expected) {
  const scale = Math.max(1, Math.abs(expected));
  return Math.abs(actual - expected) <= Math.max(absTol, relTol * scale);
}

test("production engine is the inventory: same family count, no extra units", () => {
  const disk = JSON.parse(readFileSync(join(root, "data/inventory.json"), "utf8"));
  assert.equal(inventory.families.length, disk.families.length);
  assert.equal(
    inventory.families.reduce((n, family) => n + family.units.length, 0),
    disk.families.reduce((n, family) => n + family.units.length, 0),
  );
  assert.equal(inventory.version, disk.version);
});

for (const item of cases) {
  test(`inventory → convertQuantity → golden (${item.id})`, () => {
    const result = convertQuantity(item.family, item.input, item.from, item.to);
    assert.equal(result.familyId, item.family);
    assert.equal(result.fromId, item.from);
    assert.equal(result.toId, item.to);
    assert.ok(
      close(result.converted, item.expected),
      `${item.id}: got ${result.converted}, expected ${item.expected}`,
    );
  });
}

test("symbols and aliases resolve only inside the family", () => {
  assert.equal(convertQuantity("length", 1, "in", "m").converted, 0.0254);
  assert.ok(close(convertQuantity("angle", 180, "deg", "rad").converted, Math.PI));
  assert.equal(convertQuantity("pressure", 1, "bar(g)", "bar").converted, 1);
  assert.throws(() => convertQuantity("stress", 1, "bar", "Pa"));
});
