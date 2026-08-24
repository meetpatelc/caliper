import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inventory = JSON.parse(readFileSync(join(root, "data/inventory.json"), "utf8"));
const golden = JSON.parse(readFileSync(join(root, "data/golden.json"), "utf8"));

test("kinds are linear and affine only; reference-dependent conversions are not in this version", () => {
  assert.deepEqual(inventory.kinds, ["linear", "affine"]);
  assert.equal(inventory.referenceDependent, false);
});

test("family ids are unique and every family has a canonical unit that exists", () => {
  const ids = inventory.families.map((family) => family.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const family of inventory.families) {
    const symbols = family.units.map((unit) => unit.symbol);
    const canonical = family.units.find((unit) => unit.symbol === family.canonicalUnit && unit.status === "canonical");
    assert.ok(canonical, `${family.id} missing canonical ${family.canonicalUnit}`);
    assert.equal(new Set(family.units.map((unit) => unit.id)).size, family.units.length, family.id);
  }
});

test("unit ids are globally unique; symbols may repeat across families", () => {
  const ids = inventory.families.flatMap((family) => family.units.map((unit) => unit.id));
  assert.equal(new Set(ids).size, ids.length);
  const pa = inventory.families.flatMap((family) => family.units.filter((unit) => unit.symbol === "Pa"));
  assert.ok(pa.length >= 2, "Pa must exist on more than one family; identity is the id");
  assert.ok(pa.every((unit) => unit.id.startsWith(unit.id.split(".")[0])));
});

test("bar(g) is compatibility-only and matches bar's factor", () => {
  const pressure = inventory.families.find((family) => family.id === "pressure");
  const bar = pressure.units.find((unit) => unit.id === "pressure.bar");
  const gauge = pressure.units.find((unit) => unit.id === "pressure.bar_gauge");
  const abs = pressure.units.find((unit) => unit.id === "pressure.bar_abs");
  assert.equal(gauge.status, "compatibility");
  assert.equal(abs.status, "compatibility");
  assert.equal(gauge.factor, bar.factor);
  assert.equal(abs.factor, bar.factor);
  assert.match(gauge.note, /No atmospheric-reference/);
});

test("absolute temperature is affine; delta temperature is linear", () => {
  const absolute = inventory.families.find((family) => family.id === "temperature");
  const delta = inventory.families.find((family) => family.id === "temperatureDelta");
  assert.ok(absolute.units.every((unit) => unit.kind === "affine"));
  assert.ok(delta.units.every((unit) => unit.kind === "linear"));
});

test("gal/min and US gpm collapse to one unit; deg and ° collapse to angle.degree", () => {
  const flow = inventory.families.find((family) => family.id === "volumetricFlow");
  const gpm = flow.units.filter((unit) => unit.aliases.includes("US gpm") || unit.symbol === "gal/min");
  assert.equal(gpm.length, 1);
  assert.equal(gpm[0].id, "volumetricFlow.us_gpm");
  const angle = inventory.families.find((family) => family.id === "angle");
  const degree = angle.units.find((unit) => unit.id === "angle.degree");
  assert.equal(degree.symbol, "°");
  assert.ok(degree.aliases.includes("deg"));
});

test("every family has at least one golden case bound to real unit ids", () => {
  const covered = new Set(golden.cases.map((item) => item.family));
  for (const family of inventory.families) {
    assert.ok(covered.has(family.id), `missing golden coverage for ${family.id}`);
  }
  const ids = new Set(inventory.families.flatMap((family) => family.units.map((unit) => unit.id)));
  for (const item of golden.cases) {
    assert.ok(ids.has(item.from), item.from);
    assert.ok(ids.has(item.to), item.to);
  }
});
