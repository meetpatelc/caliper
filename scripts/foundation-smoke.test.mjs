import assert from "node:assert/strict";
import { test } from "node:test";
import { convertQuantity } from "@instrument/units";
import { calculateTool } from "../src/lib/engineering.ts";
import { unitsForFamily } from "../src/lib/units.ts";

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

test("Caliper input unit change keeps the quantity: 10 kN → 10000 N", () => {
  assert.equal(convertQuantity("force", 10, "kN", "N").converted, 10000);
});

test("bar(g) remains a label: 1 bar(g) = 1 bar", () => {
  assert.equal(convertQuantity("pressure", 1, "bar(g)", "bar").converted, 1);
});

test("absolute temperature is affine: 32 °F → 0 °C; ΔT is linear", () => {
  assert.equal(convertQuantity("temperature", 32, "°F", "°C").converted, 0);
  assert.equal(convertQuantity("temperatureDelta", 1, "temperatureDelta.K", "temperatureDelta.degC").converted, 1);
  assert.notEqual(convertQuantity("temperature", 1, "°F", "K").converted, 1);
});

test("Caliper menu uses unit ids; original extras (MN, yd) stay; Gauge-only families stay out", () => {
  assert.deepEqual(
    unitsForFamily("force").map((unit) => unit.id),
    ["force.N", "force.kN", "force.MN", "force.lbf"],
  );
  assert.ok(unitsForFamily("length").some((unit) => unit.id === "length.yd"));
});
