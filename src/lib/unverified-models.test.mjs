import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { tools } from "@/lib/catalog";

/**
 * Which models are pinned only against themselves.
 *
 * `formula-truth.test.mjs` says it best: the golden suites pin each model
 * against its own output at capture time, so they catch drift and cannot catch
 * a formula that was already wrong — the wrong value becomes the expectation
 * and the suite reports green forever.
 *
 * That is fine for a relation anyone can check by inspection. It is not fine
 * for the empirical ones, where the constant, the exponent or the coefficient
 * came from a fit rather than from first principles: nobody reading the
 * expression can tell whether 0.0666 or 0.0667 is the published figure, and a
 * golden fixture will defend either one indefinitely.
 *
 * So this file does not test those models. It records that they are untested in
 * the only sense that matters, and fails if the list grows — a new empirical
 * model must either come with a worked example in `formula-truth.test.mjs` or
 * be added here deliberately, by someone who has read this.
 *
 * Removing a name from the list is the goal. Each one needs a single worked
 * example from a textbook or the standard, recomputed independently and named
 * to its source, in `formula-truth.test.mjs`.
 */
const AWAITING_INDEPENDENT_CHECK = [
  // Swamee–Jain is an explicit fit to Colebrook–White; the exponents are the
  // fit, not the physics.
  "darcyFrictionFactor",
  // Discharge coefficient and the β⁴ velocity-of-approach term.
  "orificeFlow",
  // Manning's n and the 2/3 / 1/2 exponents.
  "manningUniformFlow",
  // Taylor's C and n are per tool/work material, tabulated not derived.
  "taylorToolLife",
  // Gage R&R: the ANOVA constants and the study's degrees of freedom.
  "gageRr",
  // Polytropic index for accumulator charge/discharge.
  "hydraulicAccumulatorState",
  // Thread shear areas: the engagement geometry factors.
  "threadDesign",
  "threadTensileArea",
  // OEE is a definition, but availability/performance/quality boundaries vary.
  "productionMetrics",
  // Choked-flow constant and the specific-heat-ratio term.
  "compressibleMassFlow",
  // Cv at non-unity specific gravity.
  "valveCv",
];

const truthSource = readFileSync("src/lib/formula-truth.test.mjs", "utf8");
/** @param {string} id */
const hasIndependentCheck = (id) => new RegExp(`["']${id}["']`).test(truthSource);

test("every model awaiting an independent check is a real model", () => {
  const known = /** @type {Set<string>} */ (new Set(tools.map((tool) => tool.id)));
  const unknown = AWAITING_INDEPENDENT_CHECK.filter((id) => !known.has(id));
  assert.deepEqual(unknown, [], "a renamed or deleted model left a stale entry here");
});

test("nothing on the list has quietly acquired one without being removed", () => {
  // The good failure. When a worked example lands in formula-truth, this fires
  // and the name comes off the list — so the list shrinks deliberately rather
  // than rotting into a record of what used to be true.
  const nowChecked = AWAITING_INDEPENDENT_CHECK.filter(hasIndependentCheck);
  assert.deepEqual(
    nowChecked,
    [],
    `these now have an independent check — remove them from AWAITING_INDEPENDENT_CHECK:\n  ${nowChecked.join("\n  ")}`,
  );
});

test("the list does not grow without someone deciding it should", () => {
  // A ceiling, not a floor. It exists so adding an empirical model without a
  // worked example is a deliberate act with a diff attached, rather than
  // something that happens by not thinking about it.
  assert.ok(
    AWAITING_INDEPENDENT_CHECK.length <= 11,
    `${AWAITING_INDEPENDENT_CHECK.length} models await an independent check; the ceiling is 11. `
      + "Add a worked example to formula-truth.test.mjs instead of raising this.",
  );
});
