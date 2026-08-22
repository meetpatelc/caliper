import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTool, initialInputs } from "../src/lib/engineering.ts";

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
