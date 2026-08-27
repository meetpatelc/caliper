import assert from "node:assert/strict";
import test from "node:test";
import { defaultFieldState, evaluateCalculator } from "@/studio/lib/evaluate";

/**
 * The Library carries 82 cross-field guards; Studio had none, so a model
 * written there could return a number the shipped equivalent would refuse.
 * This is the heat-exchanger case that made the gap concrete.
 */
const exchanger = {
  fields: [
    { id: "hotIn", label: "Hot inlet", defaultValue: 90, defaultUnit: "1" },
    { id: "coldOut", label: "Cold outlet", defaultValue: 60, defaultUnit: "1" },
  ],
  outputs: [{ id: "approach", label: "Approach", defaultUnit: "1", expression: "hotIn - coldOut" }],
  constraints: [
    {
      expression: "hotIn - coldOut",
      gt: 0,
      message: "Hot inlet must exceed cold outlet — this is a temperature cross.",
      severity: "error",
    },
  ],
};

const run = (/** @type {any} */ calc, /** @type {Record<string, unknown>} */ overrides = {}) => {
  const state = defaultFieldState(calc);
  for (const [id, value] of Object.entries(overrides)) state[id] = { ...state[id], value: String(value) };
  return evaluateCalculator(calc, state);
};

test("a relational guard stops a calculation the fields alone would allow", () => {
  const ok = run(exchanger);
  assert.equal(ok.ok, true);
  assert.equal(ok.outputs[0].display, "30");

  // Both values are individually fine; only their relation is wrong, which is
  // exactly what per-field minimum and maximum cannot say.
  const crossed = run(exchanger, { hotIn: 50, coldOut: 60 });
  assert.equal(crossed.ok, false);
  assert.match(crossed.error, /temperature cross/i);
});

test("a warning lets the number through and says the model is out of range", () => {
  const vessel = {
    fields: [
      { id: "diameter", label: "Diameter", defaultValue: 600, defaultUnit: "1" },
      { id: "thickness", label: "Thickness", defaultValue: 12, defaultUnit: "1" },
    ],
    outputs: [{ id: "ratio", label: "D/t", defaultUnit: "1", expression: "diameter / thickness" }],
    constraints: [
      { expression: "diameter / thickness", min: 20, message: "Not a thin wall below D/t = 20.", severity: "warning" },
    ],
  };
  const thin = run(vessel);
  assert.equal(thin.ok, true);
  assert.deepEqual(thin.warnings, []);

  const thick = run(vessel, { thickness: 120 });
  assert.equal(thick.ok, true, "a warning must not block the calculation");
  assert.equal(thick.outputs[0].display, "5");
  assert.match(thick.warnings.join(" "), /not a thin wall/i);
});

test("a guard that cannot be evaluated is not treated as a failure", () => {
  const broken = {
    fields: [{ id: "x", label: "X", defaultValue: 2, defaultUnit: "1" }],
    outputs: [{ id: "y", label: "Y", defaultUnit: "1", expression: "x * 2" }],
    constraints: [{ expression: "nonexistent + 1", gt: 0, message: "unreachable", severity: "error" }],
  };
  const result = run(broken);
  assert.equal(result.ok, true, "an unevaluable guard must not block a valid model");
  assert.equal(result.outputs[0].display, "4");
});

test("a model with no constraints still evaluates and reports no warnings", () => {
  const plain = {
    fields: [{ id: "x", label: "X", defaultValue: 3, defaultUnit: "1" }],
    outputs: [{ id: "y", label: "Y", defaultUnit: "1", expression: "x ^ 2" }],
  };
  const result = run(plain);
  assert.equal(result.ok, true);
  assert.equal(result.outputs[0].display, "9");
  assert.deepEqual(result.warnings, []);
});
