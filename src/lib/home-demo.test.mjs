import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDemo, renderDemoModule } from "../../scripts/generate-home-demo.mjs";
import { homeDemo } from "@/lib/home-demo.generated";

/**
 * The front page shows a worked example and argues that the work can be
 * checked. If that example is allowed to drift from the model it names, the
 * homepage becomes the one page on the site making a claim nobody verifies —
 * and the version of this that was proposed by hand paired a cantilever
 * formula with simply-supported assumptions, which is exactly the mistake this
 * costs the most.
 */

test("the committed demo is what the model actually produces", () => {
  const fresh = buildDemo();
  assert.deepEqual(
    JSON.parse(JSON.stringify(homeDemo)),
    fresh,
    "src/lib/home-demo.generated.ts is stale — run node scripts/generate-home-demo.mjs",
  );
});

test("the generated file on disk matches the generator byte for byte", () => {
  // Catches a hand-edit of the generated module that happens to parse.
  const onDisk = readFileSync("src/lib/home-demo.generated.ts", "utf8");
  assert.equal(onDisk, renderDemoModule(buildDemo()));
});

test("the example is checkable in the reader's head", () => {
  // 10 kN over 1000 mm² is 10 MPa. That arithmetic is the entire reason this
  // model is the one on the front page, so it is worth pinning: if the seed
  // values change to something a reader cannot verify at a glance, the demo
  // stops making its own argument.
  const load = homeDemo.inputs.find((input) => input.unit === "kN");
  const area = homeDemo.inputs.find((input) => input.unit === "mm²");
  const stress = homeDemo.outputs[0];
  assert.ok(load && area, "the demo should show a load and an area");
  assert.equal(stress.unit, "MPa");
  assert.equal(
    Number(stress.display),
    (Number(load.value) * 1000) / Number(area.value),
    "the headline number must be the load over the area",
  );
});

test("the demo carries the parts the page promises", () => {
  assert.ok(homeDemo.formula.length > 0, "a relation");
  assert.ok(homeDemo.assumptions.length > 0, "assumptions");
  assert.ok(homeDemo.boundary.length > 0, "a boundary");
  assert.ok(homeDemo.outputs.length > 0, "a result");
});
