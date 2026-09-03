import assert from "node:assert/strict";
import test from "node:test";
import { libraryDocuments } from "@/lib/document-library";
import { unitFamilies, unitId } from "@/lib/units";
import "@/lib/test-support/all-documents.mjs";

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
 * ── Correction, 2026-09-02 ──────────────────────────────────────────────
 *
 * A previous version of this note said 43 tools were inert: that
 * `calculateTool` dispatched them to hand-written evaluators which never read
 * the document, so declaring a family on one would move this count and change
 * nothing on the page. It named `clampForce`, `motionProfile`, `pneumatic` and
 * `beam` as examples, and told the next person to scope future batches around
 * them.
 *
 * That is wrong, and following it would have skipped live models. `computeTool`
 * tests `DOCUMENT_TOOL_IDS` before anything else, so for all 33 tools that have
 * both, the document branch wins and the hand-written evaluator underneath is
 * dead code. Checked by running each document alone and comparing:
 *
 *     clampForce      app 1.9486 kN   document alone 1.9486 kN   same
 *     motionProfile   app 2.6667 m/s² document alone 2.6667 m/s² same
 *     pneumatic       app 1.0014 kN   document alone 1.0014 kN   same
 *     beam            app 1 kN        document alone 1 kN        same
 *
 * So every document here is live, and the scope is not the problem.
 *
 * ── What the remainder actually is, measured ────────────────────────────
 *
 * Of the outputs with no family, taking only those with a real unit that some
 * family owns and no `rawScale` already correcting them:
 *
 *     0    could be declared with no observable change
 *     91   would move `raw` — kN→N, kW→W, mm→m, mm/s→m/s
 *     138  excluded: no family owns the unit, or it is a display convention
 *
 * Zero is the number that matters. There is no free subset to chip away at:
 * every remaining candidate computes in a display unit, so declaring its family
 * multiplies `raw` by the conversion factor. `raw` is what goes into
 * `result_json` when somebody saves a check, so this is a stored-data
 * migration, and it should ride with a `formulaVersion` bump so the record
 * drift notice tells a reader their number moved.
 *
 * The conclusion above was right. Its reasoning was not, and the reasoning is
 * what the next person would have acted on.
 */
test("output family coverage does not go backwards", () => {
  // 404 as of 2026-09-02. The floor said 275, which was 129 behind what the
  // library already declared — so it would have sat green through a regression
  // of a third of the coverage. A floor nobody raises stops being a floor.
  const declared = outputs.filter((output) => output.family).length;
  assert.ok(
    declared >= 404,
    `only ${declared} of ${outputs.length} outputs declare a family; this must not regress below 404`,
  );
});
