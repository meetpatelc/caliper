import assert from "node:assert/strict";
import test from "node:test";
import { libraryDocuments } from "@/lib/document";
import { unitFamilies, unitId } from "@/lib/units";

const outputs = Object.values(libraryDocuments).flatMap((doc) =>
  doc.outputs.map((output) => ({ slug: doc.slug, ...output })),
);

test("a declared family actually owns the unit the output displays in", () => {
  // The cheap mistake this catches: declaring `length` on an output whose unit
  // is kg. Nothing else in the pipeline would notice — the conversion would
  // throw at render, for one tool, only when someone opened it.
  const wrong = [];
  for (const output of outputs) {
    if (!output.family) continue;
    assert.ok(unitFamilies[output.family], `${output.slug}.${output.id} declares unknown family ${output.family}`);
    try {
      unitId(output.family, output.defaultUnit);
    } catch {
      wrong.push(`${output.slug}.${output.id}: ${output.family} does not own "${output.defaultUnit}"`);
    }
  }
  assert.deepEqual(wrong, [], wrong.join("\n"));
});

/**
 * A floor, not a target.
 *
 * Declaring a family changes how `raw` is read: with one, the number is taken
 * as canonical SI and converted for display; without one, it is shown as-is.
 * 193 of the library's outputs compute in display units already, so declaring a
 * family on those double-converts — which is why this cannot simply be filled
 * in, and why the count is pinned rather than required to be complete.
 *
 * Raise this number when more are done. It only goes up.
 */
test("output family coverage does not go backwards", () => {
  const declared = outputs.filter((output) => output.family).length;
  assert.ok(
    declared >= 253,
    `only ${declared} of ${outputs.length} outputs declare a family; this must not regress below 253`,
  );
});
