import assert from "node:assert/strict";
import { test } from "node:test";
import { convertQuantity } from "@instrument/units";
import { calculateTool } from "../src/lib/engineering.ts";

test("Caliper axial: 50 kN / 1200 mm² → 41.666… MPa via calculateTool", () => {
  const result = calculateTool("axial", { force: "50", area: "1200", length: "250", modulus: "200" });
  assert.equal(result.errors.length, 0);
  const stress = result.values.find((item) => item.key === "stress");
  assert.ok(stress);
  assert.equal(stress.unit, "MPa");
  assert.ok(Math.abs(Number(stress.display) - 41.6666666667) < 0.02, stress.display);
});

test("Caliper converter uses the shared engine: 1 in → 0.0254 m", () => {
  const result = calculateTool("converter", { category: "length", value: "1", from: "in", to: "m" });
  assert.equal(result.errors.length, 0);
  const converted = result.values.find((item) => item.key === "converted");
  assert.equal(Number(converted.display), 0.0254);
  assert.equal(convertQuantity("length", 1, "in", "m").converted, 0.0254);
});

test("bar(g) remains a label: 1 bar(g) = 1 bar", () => {
  assert.equal(convertQuantity("pressure", 1, "bar(g)", "bar").converted, 1);
});
