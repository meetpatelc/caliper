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
 * Most of the library's remaining outputs compute in display units already, so
 * declaring a family on those double-converts — which is why this cannot simply
 * be filled in, and why the count is pinned rather than required to be
 * complete.
 *
 * What the remainder actually costs, measured rather than estimated:
 *
 * The mechanical fix is to multiply the expression by the display unit's factor
 * so it emits canonical SI, then declare the family. Applied to all 243
 * candidates, that leaves every *displayed* value identical — and moves `raw`
 * on 131 of them. Excluding the 63 that already carry a `rawScale` entry (that
 * table exists to fix exactly this, and rescaling those would apply the
 * correction twice) and the units that are display conventions rather than
 * symbols — `—`, `×`, `:1`, `deg`, whose family would override the authored
 * label with a canonical symbol and change `0.78 —` into `0.78 1` — the number
 * of outputs that can be converted with no observable change at all is zero.
 *
 * So the remainder is not cleanup. `raw` is what gets written into
 * `result_json` when somebody saves a check, so changing it means new records
 * carry a different basis from old ones for the same output. That is a stored
 * data migration, and it should ride with a `formulaVersion` bump so the record
 * drift notice tells the reader their number moved.
 *
 * Raise this number when more are done. It only goes up.
 *
 * ── One more thing, found the hard way ──────────────────────────────────
 *
 * This count is taken over `libraryDocuments`, and for 43 tools that is not
 * what anybody sees. `calculateTool` dispatches those to hand-written
 * evaluators in `engineering.ts` — `if (toolId === "clampForce") return
 * calculateClampForce(input)` and 42 more — which never read the document's
 * outputs at all. Declaring a family on one of those changes this number and
 * changes nothing on the page.
 *
 * `clampForce` is the clearest case. Its document declares no family, yet its
 * golden shows raw 1948.56 displayed as "1.9486 kN" — a conversion the
 * no-family branch of `document.ts` cannot perform, because the hand-written
 * evaluator produced it instead.
 *
 * So any future batch has to be scoped to document-driven tools first. A
 * scope taken from `libraryDocuments` alone looked like 44 clean candidates
 * and included at least `clampForce`, `motionProfile`, `pneumatic`,
 * `cuttingParameters` and `beam`, all of them inert.
 */
test("output family coverage does not go backwards", () => {
  const declared = outputs.filter((output) => output.family).length;
  assert.ok(
    declared >= 275,
    `only ${declared} of ${outputs.length} outputs declare a family; this must not regress below 275`,
  );
});
