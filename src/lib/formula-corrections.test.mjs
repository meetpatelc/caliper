// @ts-nocheck
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTool, initialInputs } from "./engineering.ts";
import { convertShop, hydrateDisplayInputs, unitSwitchFor, unitSwitchForResult } from "./fieldUnits.ts";

const run = (id, patch = {}) => calculateTool(id, { ...initialInputs[id], ...patch });

test("P0 torsionSpring: per-degree rate, default M = 976.56 N·mm, σ = 368.4 MPa", () => {
  const result = run("torsionSpring");
  assert.equal(result.errors.length, 0, String(result.errors));
  const moment = result.values.find((item) => item.key === "moment");
  const stress = result.values.find((item) => item.key === "stress");
  const rate = result.values.find((item) => item.key === "rate");
  assert.ok(Math.abs(moment.raw - 976.5625) < 1e-6, moment.raw);
  assert.ok(Math.abs(stress.raw - 368.41422) < 0.01, stress.raw);
  assert.ok(Math.abs(rate.raw - 21.7013888889) < 1e-6, rate.raw);
});

test("P0 torsionSpring: 0° → M = 0; 360° → one-turn moment", () => {
  const zero = run("torsionSpring", { angle: "0" });
  const turn = run("torsionSpring", { angle: "360" });
  assert.equal(zero.errors.length, 0);
  assert.equal(turn.errors.length, 0);
  assert.equal(zero.values.find((item) => item.key === "moment").raw, 0);
  assert.ok(Math.abs(turn.values.find((item) => item.key === "moment").raw - 7812.5) < 1e-6);
});

test("P1 shaftDesign: pinned–pinned ω₁ uses π²; default ≈ 18126 rpm", () => {
  const result = run("shaftDesign");
  assert.equal(result.errors.length, 0, String(result.errors));
  const rpm = result.values.find((item) => item.key === "criticalRpm");
  assert.ok(Math.abs(rpm.raw - 18126.0677) < 0.05, rpm.raw);
});

test("P2 density: specific-gravity raw is 7.85, not 7850", () => {
  const result = run("density");
  const sg = result.values.find((item) => item.key === "specificGravity");
  assert.ok(Math.abs(sg.raw - 7.85) < 1e-9, sg.raw);
  assert.equal(sg.display, "7.85");
});

test("P2 controlChart: negative subgroup range is rejected", () => {
  const result = run("controlChart", { subgroupVariation1: "-1.8" });
  assert.ok(result.errors.some((error) => /range/i.test(error)), String(result.errors));
});

test("P2 productionMetrics: negative stop time and zero goods are rejected", () => {
  const stop = run("productionMetrics", { stopTime: "-30" });
  const goods = run("productionMetrics", { goodCount: "0" });
  assert.ok(stop.errors.some((error) => /stop time/i.test(error)), String(stop.errors));
  assert.ok(goods.errors.some((error) => /good/i.test(error)), String(goods.errors));
});

test("C-01 LMTD difference outputs use temperatureDelta; 37.444 °C → 67.399 °F", () => {
  const result = run("lmtd");
  assert.equal(result.errors.length, 0, String(result.errors));
  const lmtd = result.values.find((item) => item.key === "lmtd");
  const spec = unitSwitchForResult(lmtd.key, lmtd.unit);
  assert.equal(spec.family, "temperatureDelta");
  const converted = convertShop(spec.family, lmtd.raw, spec.engine, "temperatureDelta.degF");
  assert.ok(Math.abs(converted - 67.3992) < 0.01, converted);
});

test("C-01 first terminal difference 35 °C → 63 °F", () => {
  const result = run("lmtd");
  const delta1 = result.values.find((item) => item.key === "delta1");
  const spec = unitSwitchForResult(delta1.key, delta1.unit);
  assert.equal(spec.family, "temperatureDelta");
  const converted = convertShop(spec.family, delta1.raw, spec.engine, "temperatureDelta.degF");
  assert.ok(Math.abs(converted - 63) < 1e-6, converted);
});

test("C-01 absolute temperature inputs stay on the temperature family", () => {
  const spec = unitSwitchFor("°C");
  assert.equal(spec.family, "temperature");
});

test("C-07 hydrateDisplayInputs retargets canonical values into stored display units", () => {
  const shown = hydrateDisplayInputs(
    [{ key: "force", unit: "kN" }],
    { force: "20" },
    { force: "force.N" },
  );
  assert.equal(Number(shown.force), 20000);
});

test("C-02 axial 10 MPa converts to ~1450 psi from the displayed unit, not SI raw", () => {
  const result = run("axial");
  const stress = result.values.find((item) => item.key === "stress");
  const spec = unitSwitchForResult(stress.key, stress.unit);
  assert.equal(spec.family, "stress");
  const fromDisplay = Number(stress.display);
  const converted = convertShop(spec.family, fromDisplay, spec.engine, "stress.psi");
  assert.ok(Math.abs(converted - 1450.38) < 1, converted);
});

test("P3 drillingTime: hole count must be a whole number", () => {
  const fraction = run("drillingTime", { holes: "6.5" });
  assert.ok(fraction.errors.some((error) => /whole number/i.test(error)), String(fraction.errors));
  const whole = run("drillingTime", { holes: "6" });
  assert.equal(whole.errors.length, 0, String(whole.errors));
});

test("P3 thermalExpansion: negative CTE is contraction on heating", () => {
  const result = run("thermalExpansion", { cte: "-6" });
  assert.equal(result.errors.length, 0, String(result.errors));
  const extension = result.values.find((item) => item.key === "extension");
  assert.ok(extension.raw < 0, extension.raw);
  assert.ok(Math.abs(Number(String(extension.display).replace(/,/g, "")) - -0.468) < 1e-9, extension.display);
});

