// @ts-nocheck
import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultFieldState, evaluateCalculator, retargetAuthoredDefault, retargetAuthoredField, retargetField } from "../lib/evaluate.ts";
import { FMEA_ERROR_ID, fmeaFieldA11y } from "../../lib/reviewRules.ts";
import { fieldErrorId } from "../../../packages/ui/src/field-id.ts";
import { unitsForFamily } from "../../lib/units.ts";
import { calculatorSchema } from "../lib/calculator-types.ts";
import { formatLimitMm } from "../lib/format-limit.ts";
import { computeFit } from "../lib/iso286.ts";
import { axialDocument, libraryDocuments } from "../../lib/document.ts";
import { calculateTool, initialInputs } from "../../lib/engineering.ts";

test("G-01 axial: 50 kN → N keeps 41.67 MPa", () => {
  const start = defaultFieldState(axialDocument);
  start.force = { value: "50", unit: "kN" };
  start.area = { value: "1200", unit: "mm²" };
  const before = evaluateCalculator(axialDocument, start);
  assert.equal(before.ok, true);
  if (!before.ok) return;
  assert.ok(Math.abs(Number(before.outputs[0].display) - 41.67) < 0.02);

  const force = retargetField("force", start.force.value, start.force.unit, "force.N");
  assert.equal(Number(force.value), 50000);
  assert.equal(force.unit, "force.N");
  const after = evaluateCalculator(axialDocument, { ...start, force });
  assert.equal(after.ok, true);
  if (!after.ok) return;
  assert.ok(Math.abs(after.outputs[0].canonical - before.outputs[0].canonical) < 1e-6);
});

test("G-01 pipe: 80 mm → m keeps mean velocity", () => {
  const tool = libraryDocuments.pipeVelocity;
  assert.ok(tool);
  const start = defaultFieldState(tool);
  const field = tool.fields.find((item) => item.id === "diameter");
  assert.ok(field);
  assert.equal(field.family, "length");
  const before = evaluateCalculator(tool, start);
  assert.equal(before.ok, true);
  if (!before.ok) return;
  const moved = retargetField(field.family, start.diameter.value, start.diameter.unit, "length.m");
  assert.equal(Number(moved.value), 0.08);
  const after = evaluateCalculator(tool, { ...start, diameter: moved });
  assert.equal(after.ok, true);
  if (!after.ok) return;
  assert.ok(Math.abs(after.outputs[0].canonical - before.outputs[0].canonical) < 1e-4);
});

test("non-numeric unit change does not invent a number", () => {
  const next = retargetField("force", "abc", "kN", "N");
  assert.equal(next.value, "abc");
  assert.equal(next.unit, "N");
});

test("Studio authored default 20 kN → N becomes 20000 and keeps canonical force", () => {
  const moved = retargetAuthoredDefault("force", 20, "kN", "force.N");
  assert.equal(moved.defaultValue, 20000);
  assert.equal(moved.defaultUnit, "force.N");

  const outputs = [{ id: "shown", label: "Force", family: "force", defaultUnit: "N", expression: "force" }];
  const before = evaluateCalculator(
    { fields: [{ id: "force", label: "Force", family: "force", defaultValue: 20, defaultUnit: "kN" }], outputs },
    { force: { value: "20", unit: "kN" } },
  );
  const after = evaluateCalculator(
    { fields: [{ id: "force", label: "Force", family: "force", defaultValue: moved.defaultValue, defaultUnit: moved.defaultUnit }], outputs },
    { force: { value: String(moved.defaultValue), unit: moved.defaultUnit } },
  );
  assert.equal(before.ok, true);
  assert.equal(after.ok, true);
  if (!before.ok || !after.ok) return;
  assert.equal(before.outputs[0].display, "20000");
  assert.equal(after.outputs[0].display, "20000");
  assert.ok(Math.abs(after.outputs[0].canonical - before.outputs[0].canonical) < 1e-9);
  assert.notEqual(moved.defaultValue, 20);
});

test("Studio 20 kN ↔ 20,000 N preserves 20 MPa axial stress", () => {
  const axial = {
    fields: [
      { id: "force", label: "Axial load", family: "force", defaultValue: 20, defaultUnit: "kN" },
      { id: "area", label: "Area", family: "area", defaultValue: 1000, defaultUnit: "mm²" },
    ],
    outputs: [{ id: "stress", label: "Average normal stress", family: "stress", defaultUnit: "MPa", expression: "force / area" }],
  };
  const knToN = retargetAuthoredField(axial.fields[0], "force.N");
  assert.equal(knToN.defaultValue, 20000);
  const nToKn = retargetAuthoredField({ ...axial.fields[0], ...knToN }, "force.kN");
  assert.equal(nToKn.defaultValue, 20);

  const before = evaluateCalculator(axial, { force: { value: "20", unit: "kN" }, area: { value: "1000", unit: "mm²" } });
  const after = evaluateCalculator(
    { ...axial, fields: [{ ...axial.fields[0], ...knToN }, axial.fields[1]] },
    { force: { value: "20000", unit: "force.N" }, area: { value: "1000", unit: "mm²" } },
  );
  assert.equal(before.ok && after.ok, true);
  if (!before.ok || !after.ok) return;
  assert.equal(before.outputs[0].display, "20");
  assert.equal(after.outputs[0].display, "20");
  assert.notEqual(after.outputs[0].display, "0.02");
  assert.ok(Math.abs(after.outputs[0].canonical - before.outputs[0].canonical) < 1e-9);
});

test("Review FMEA error links all three ratings", () => {
  const error = "Each FMEA rating must be an integer from 1 to 10.";
  for (const value of ["6", "4", "99"]) {
    const props = fmeaFieldA11y(error, value);
    assert.equal(props["aria-invalid"], true);
    assert.equal(props["aria-describedby"], FMEA_ERROR_ID);
  }
  const ok = fmeaFieldA11y("", "6");
  assert.equal(ok["aria-invalid"], false);
  assert.equal(ok["aria-describedby"], undefined);
});

test("Field error id is stable from the control htmlFor", () => {
  assert.equal(fieldErrorId("axial-force"), "axial-force-error");
  assert.equal(fieldErrorId("fmea-Detection"), "fmea-Detection-error");
});

test("G-01 dimensionless output units do not include percent unless asked", () => {
  const units = unitsForFamily("dimensionless", ["1"]);
  assert.equal(units.some((unit) => unit.id.includes("percent") || unit.label === "%"), false);
});

test("G-02 ISO 286 H9/n8 limits stay distinct at 100 mm", () => {
  const fit = computeFit(100, "H", 9, "n", 8);
  const holeMax = formatLimitMm(fit.holeMax);
  const shaftMax = formatLimitMm(fit.shaftMax);
  const holeMin = formatLimitMm(fit.holeMin);
  const shaftMin = formatLimitMm(fit.shaftMin);
  assert.notEqual(holeMax, shaftMax);
  assert.notEqual(holeMax, holeMin);
  assert.ok(holeMax.includes("100.087") || Number(holeMax) === fit.holeMax);
  assert.ok(Number(holeMax) !== Number(shaftMax));
  assert.ok(Number(holeMin) !== Number(shaftMin) || holeMin !== shaftMin);
});

test("G-03 zero area maps division-by-zero to the area field", () => {
  const start = defaultFieldState(axialDocument);
  const result = evaluateCalculator(axialDocument, { ...start, area: { value: "0", unit: start.area.unit } });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.fieldId, "area");
  assert.match(result.error, /zero/i);
});

test("P2 three-phase power factor must be between 0 and 1", () => {
  const high = calculateTool("threePhasePower", { ...initialInputs.threePhasePower, powerFactor: "1.2" });
  assert.ok(high.errors.some((error) => /between zero and one/i.test(error)), String(high.errors));
  const low = calculateTool("threePhasePower", { ...initialInputs.threePhasePower, powerFactor: "-0.1" });
  assert.ok(low.errors.some((error) => /between zero and one/i.test(error)), String(low.errors));
  const zero = calculateTool("threePhasePower", { ...initialInputs.threePhasePower, powerFactor: "0" });
  assert.equal(zero.errors.length, 0, String(zero.errors));
  const one = calculateTool("threePhasePower", { ...initialInputs.threePhasePower, powerFactor: "1" });
  assert.equal(one.errors.length, 0, String(one.errors));
});

test("pass-through leftover: no family means the shop number is the formula number", () => {
  const tool = libraryDocuments.reflectedInertia;
  assert.ok(tool);
  assert.equal(tool.fields[0].family, undefined);
  const start = defaultFieldState(tool);
  const result = evaluateCalculator(tool, start);
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  if (!result.ok) return;
  assert.ok(Math.abs(result.outputs[0].canonical - 0.0032) < 1e-9, result.outputs[0].canonical);
  assert.equal(result.outputs[0].unit, "kg·m²");
});

test("calculatorSchema accepts Library domains and omitted family", () => {
  const parsed = calculatorSchema.safeParse({
    slug: "reflected-inertia-copy",
    title: "Reflected inertia copy",
    description: "Fork of a leftover that the kit cannot convert yet.",
    domain: "dynamics",
    fields: [{ id: "loadInertia", label: "Load inertia", defaultValue: 0.08, defaultUnit: "kg·m²" }],
    outputs: [{ id: "reflected", label: "Reflected load inertia", defaultUnit: "kg·m²", expression: "loadInertia / 25" }],
    formula: "Jref = JL / N²",
    purpose: "Pass-through leftover fork with no unit family.",
    assumptions: ["Ideal rigid transmission"],
    boundary: "Not a design stamp. Kit has no kg·m² family.",
    interpretation: "Read the number as entered.",
    sourceLabel: "Author",
    sourceUrl: "",
    related: [],
  });
  assert.equal(parsed.success, true, parsed.success ? "" : parsed.error.issues.map((issue) => issue.message).join("; "));
  if (!parsed.success) return;
  assert.equal(parsed.data.domain, "dynamics");
  assert.equal(parsed.data.fields[0].family, undefined);
});
