import assert from "node:assert/strict";
import test from "node:test";
import { inventory } from "../src/engine.mjs";

/**
 * Dimension exponents as [mass, length, time, temperature, current].
 *
 * The point of carrying these is that the units layer currently knows kN → N
 * and does not know that force × length = torque. Nothing — no type, no runtime
 * check, no test — could catch `1e5` where `1e6` belongs.
 *
 * The exponents alone assert nothing, though: a table of numbers can be wrong
 * as easily as the code it is meant to police. So they are checked here against
 * physical relations that are true by definition, which is a claim that can
 * actually fail.
 */
const dim = (id) => {
  const family = inventory.families.find((f) => f.id === id);
  assert.ok(family, `no family ${id}`);
  assert.ok(Array.isArray(family.dimension), `${id} has no dimension`);
  return family.dimension;
};

const mul = (a, b) => a.map((x, i) => x + b[i]);
const div = (a, b) => a.map((x, i) => x - b[i]);

test("every family declares a dimension of the right shape", () => {
  for (const family of inventory.families) {
    assert.ok(Array.isArray(family.dimension), `${family.id} is missing a dimension`);
    assert.equal(family.dimension.length, 5, `${family.id} has the wrong number of exponents`);
    for (const value of family.dimension) assert.ok(Number.isInteger(value), `${family.id} has a non-integer exponent`);
  }
});

test("defining relations hold", () => {
  assert.deepEqual(mul(dim("mass"), dim("acceleration")), dim("force"), "F = m·a");
  assert.deepEqual(div(dim("force"), dim("area")), dim("stress"), "σ = F / A");
  assert.deepEqual(mul(dim("force"), dim("length")), dim("torque"), "T = F·r");
  assert.deepEqual(mul(dim("power"), dim("time")), dim("energy"), "E = P·t");
  assert.deepEqual(div(dim("mass"), dim("volume")), dim("density"), "ρ = m / V");
  assert.deepEqual(div(dim("length"), dim("time")), dim("speed"), "v = x / t");
  assert.deepEqual(div(dim("speed"), dim("time")), dim("acceleration"), "a = v / t");
  assert.deepEqual(div(dim("volume"), dim("time")), dim("volumetricFlow"), "Q = V / t");
  assert.deepEqual(div(dim("mass"), dim("time")), dim("massFlow"), "ṁ = m / t");
  assert.deepEqual(div(dim("force"), dim("length")), dim("stiffness"), "k = F / x");
  assert.deepEqual(div(dim("dynamicViscosity"), dim("density")), dim("kinematicViscosity"), "ν = μ / ρ");
  assert.deepEqual(mul(dim("voltage"), dim("current")), dim("power"), "P = V·I");
  assert.deepEqual(div(dim("voltage"), dim("current")), dim("resistance"), "R = V / I");
  assert.deepEqual(mul(dim("current"), dim("time")), dim("charge"), "Q = I·t");
  assert.deepEqual(div(dim("charge"), dim("voltage")), dim("capacitance"), "C = Q / V");
  assert.deepEqual(div(dim("energy"), mul(dim("mass"), dim("temperatureDelta"))), dim("specificHeat"), "c = E / (m·ΔT)");
  assert.deepEqual(
    div(dim("power"), mul(dim("length"), dim("temperatureDelta"))),
    dim("thermalConductivity"),
    "k = P / (L·ΔT)",
  );
  assert.deepEqual(div(dim("time"), dim("time")).join(), dim("frequency").map(() => 0).join(), "sanity: t/t is dimensionless");
  assert.deepEqual(div([0, 0, 0, 0, 0], dim("time")), dim("frequency"), "f = 1 / t");
});

test("quantities that share a dimension are recorded as sharing it", () => {
  // Not an accident and not a bug: torque and energy are both M·L²·T⁻², and
  // pressure and stress are both M·L⁻¹·T⁻². They are told apart by convention,
  // never by dimension, so a dimensional check can never separate them — worth
  // pinning so nobody later "fixes" one of them.
  assert.deepEqual(dim("torque"), dim("energy"));
  assert.deepEqual(dim("pressure"), dim("stress"));
  assert.deepEqual(dim("temperature"), dim("temperatureDelta"));
});

test("the ratio families really are dimensionless", () => {
  for (const id of ["dimensionless", "strain", "angle"]) {
    assert.deepEqual(dim(id), [0, 0, 0, 0, 0], `${id} should carry no dimension`);
  }
});
