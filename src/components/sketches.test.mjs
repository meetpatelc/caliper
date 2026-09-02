import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "sketches.tsx"), "utf8");

/**
 * Pull the arrowheads out of one sketch function and say which way each points.
 *
 * An arrowhead here is two barbs from a shared tip: `M{x} {y} L{a} {b} M{x} {y}
 * L{c} {d}`. The tip is the point of the arrow and the barbs trail behind it,
 * so the direction is the tip's offset from the barbs — not the other way
 * round, which is the mistake the drawings themselves made.
 */
/** @param {string} functionName */
function arrowsIn(functionName) {
  const start = source.indexOf(`export function ${functionName}(`);
  assert.notEqual(start, -1, `no sketch named ${functionName}`);
  const next = source.indexOf("\nexport function ", start + 1);
  const body = source.slice(start, next === -1 ? undefined : next);

  const heads = [...body.matchAll(/d="M(\d+) (\d+) L(\d+) (\d+) M\1 \2 L(\d+) (\d+)"/g)];
  return heads.map((head) => {
    const [, x, y, barbX, barbY] = head.map(Number);
    const horizontal = Math.abs(barbX - x) > Math.abs(barbY - y);
    if (horizontal) return barbX > x ? "left" : "right";
    return barbY > y ? "up" : "down";
  });
}

test("a point load on a beam pushes down onto it", () => {
  // All three of these pointed up, off the beam, as though the load were
  // lifting it. The field help on that page says "Downward magnitude at the
  // diagrammed load point", so the drawing contradicted the text beside it.
  assert.deepEqual(arrowsIn("BeamDiagramSketch"), ["down"]);
  assert.deepEqual(arrowsIn("BeamSketch"), ["down", "down"]);
});

test("a column in compression is pressed from both ends", () => {
  // Labelled "Slender column, central compression" while both arrows pulled
  // outward, which is tension — on the buckling model.
  assert.deepEqual(arrowsIn("ColumnSketch"), ["down", "up"]);
});

test("a bar in tension is pulled from both ends", () => {
  // The one that was already right, kept here so the fix above cannot be
  // applied to it by mistake.
  assert.deepEqual(arrowsIn("AxialSketch"), ["left", "right"]);
});

test("cylinder supply pressure acts on the bore", () => {
  assert.deepEqual(arrowsIn("ActuatorSketch"), ["right", "right"]);
});

test("a compression spring is pushed, not pulled", () => {
  assert.deepEqual(arrowsIn("SpringSketch"), ["right"]);
});
