import assert from "node:assert/strict";
import test from "node:test";
import { emptyCalculator, starterCalculator } from "@/studio/lib/calculator-types";
import { toIdentifier } from "@/studio/lib/identifiers";
import { defaultFieldState, evaluateCalculator } from "@/studio/lib/evaluate";

/**
 * The blank seed's label and identifier have to agree.
 *
 * It shipped as `label: "Input"` with `id: "x"`, so the editor read "in the
 * formula as x" while the obvious expression — `input` — failed with Unknown
 * name. Renaming the field then derived the right identifier and rewrote the
 * expression, which made it look like the first edit had failed to save rather
 * than like the seed had never agreed with itself.
 *
 * Only the blank one. The starter is the real axial model, where "Axial load"
 * maps to `force` on purpose: a domain identifier is better than a mechanical
 * one, and the editor states the mapping under the field.
 */
test("the blank seed's identifiers are what its labels would produce", () => {
  const calc = emptyCalculator();
  const taken = new Set();
  for (const field of calc.fields) {
    assert.equal(field.id, toIdentifier(field.label, taken), `"${field.label}" should yield id "${field.id}"`);
    taken.add(field.id);
  }
});

test("the blank seed's expression references a field that exists", () => {
  const calc = emptyCalculator();
  const ids = new Set(calc.fields.map((field) => field.id));
  for (const output of calc.outputs) {
    for (const token of output.expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
      assert.ok(ids.has(token), `expression "${output.expression}" references unknown "${token}"`);
    }
  }
});

const seeds = [
  { name: "blank", make: emptyCalculator },
  { name: "starter", make: starterCalculator },
];

for (const { name, make } of seeds) {
  test(`the ${name} seed computes as shipped`, () => {
    const calc = make();
    const result = evaluateCalculator(calc, defaultFieldState(calc));
    assert.equal(result.ok, true, result.ok ? "" : result.error);
    for (const output of result.outputs) {
      assert.ok(Number.isFinite(output.canonical), `${output.label} is not finite`);
    }
  });
}
