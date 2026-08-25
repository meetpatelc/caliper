// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { libraryDocuments } from "./document.ts";
import { calculateTool, initialInputs } from "./engineering.ts";

const golden = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "caliper-remaining.golden.json"), "utf8"));
/**
 * The golden covers two kinds of model: those that became library documents,
 * and those that stayed hand-written TypeScript. This used to read the id list
 * out of `library-remaining.ts` — the migration wave they happened to be
 * converted in. That file is gone now that documents are grouped by domain, and
 * the wave was never what the test meant: it meant "is this a document yet".
 * Ask that directly.
 */
const IDS = Object.keys(golden).filter((id) => libraryDocuments[id]).sort();
const relClose = (a, b) => Math.abs(a - b) <= 1e-8 || Math.abs(a - b) / Math.max(1e-12, Math.abs(b)) <= 1e-8;

test("Remaining closed-form documents match frozen TypeScript goldens", () => {
  const failed = [];
  for (const id of IDS) {
    const expected = golden[id];
    const actual = calculateTool(id, initialInputs[id]);
    if (!expected) failed.push(`${id}: no golden`);
    if (actual.errors.length) failed.push(`${id}: ${actual.errors}`);
    if (actual.method !== expected.method) failed.push(`${id} method`);
    if (JSON.stringify(actual.warnings) !== JSON.stringify(expected.warnings)) failed.push(`${id} warnings`);
    if (actual.values.length !== expected.values.length) failed.push(`${id} value count`);
    const n = Math.min(actual.values.length, expected.values.length);
    for (let i = 0; i < n; i++) {
      const got = actual.values[i];
      const want = expected.values[i];
      if (got.key !== want.key) failed.push(`${id}[${i}] key`);
      if (got.label !== want.label) failed.push(`${id}.${want.key} label`);
      if (got.display !== want.display) failed.push(`${id}.${want.key} display ${JSON.stringify(got.display)} != ${JSON.stringify(want.display)}`);
      if (got.unit !== want.unit) failed.push(`${id}.${want.key} unit`);
      if (!relClose(got.raw, want.raw)) failed.push(`${id}.${want.key} raw ${got.raw} != ${want.raw}`);
    }
  }
  assert.equal(failed.length, 0, failed.join("\n"));
});

test("Remaining TypeScript-irreducible models still have goldens and are not documents", () => {
  const stay = [
    "arithmeticScratchpad",
    "beamDiagram",
    "controlChart",
    "converter",
    "cycleBuilder",
    "fits",
    "gaugeBiasStudy",
    "processPerformance",
    "section",
    "toleranceSampling",
  ];
  for (const id of stay) {
    assert.equal(libraryDocuments[id], undefined, `${id} is now a document — move it out of this list`);
    const expected = golden[id];
    const actual = calculateTool(id, initialInputs[id]);
    assert.ok(expected, `${id} missing golden`);
    assert.equal(actual.errors.length, 0, `${id}: ${actual.errors}`);
    assert.equal(actual.method, expected.method, id);
    assert.deepEqual(actual.warnings, expected.warnings, id);
  }
});

test("Remaining migrated models restore TypeScript domain guards", () => {
  const reject = [
    ["pneumatic", { rod: "50" }, /smaller than cylinder bore/],
    ["airConsumption", { rod: "50" }, /smaller than cylinder bore/],
    ["clampForce", { angle: "0" }, /greater than 0 and smaller than 180/],
    ["clampForce", { efficiency: "101" }, /must not exceed 100 percent/],
    ["leadScrew", { efficiency: "101" }, /must not exceed 100 percent/],
    ["circularArc", { angle: "361" }, /must not exceed 360/],
    ["compressionSpring", { meanDiameter: "4" }, /larger than wire diameter/],
    ["torsionSpring", { meanDiameter: "3" }, /larger than wire diameter/],
    ["drillingTime", { holes: "1.5" }, /whole number/],
    ["processCapability", { usl: "9.8" }, /larger than lower specification/],
    ["sCurveProfile", { jerkPercent: "-1" }, /from 0 through 100/],
    ["pinStress", { pinCount: "0.5" }, /integer from 1 through 72/],
    ["pinStress", { shearPlanes: "3" }, /single shear or double shear/],
    ["formControl", { measuredMaximum: "-0.02" }, /greater than or equal to measured minimum/],
    ["mmc", { actualSize: "9.9" }, /at least its stated MMC size/],
    ["lmtd", { coldOut: "90" }, /terminal temperature differences/],
    ["brakingDuty", { brakingTime: "30" }, /must not exceed the declared cycle time/],
    ["gearToothStress", { helixAngle: "10" }, /must be 0/],
    ["isentropicMachine", { outletPressure: "50" }, /outlet pressure above inlet/],
    ["driveRatio", { helixAngle: "90" }, /below 90 degrees/],
    ["linearGuideLife", { rollingType: "plain" }, /supported rolling-element type/],
    ["motionProfile", { cruiseTime: "-0.1" }, /cannot be negative/],
  ];
  for (const [id, patch, pattern] of reject) {
    const result = calculateTool(id, { ...initialInputs[id], ...patch });
    assert.ok(result.errors.some((error) => pattern.test(error)), `${id} ${JSON.stringify(patch)} ${result.errors}`);
    assert.equal(result.values.length, 0, `${id} still produced values`);
  }
});

test("Valid zero/boundary remaining inputs still calculate", () => {
  const cases = [
    ["motionProfile", { cruiseTime: "0" }, "peakSpeed"],
    ["sCurveProfile", { jerkPercent: "0" }, "peakAcceleration"],
    ["sCurveProfile", { jerkPercent: "100" }, "peakAcceleration"],
    ["formControl", { measuredMinimum: "0.026" }, "observedSpan"],
    ["clampForce", { efficiency: "100" }, "transferred"],
    ["circularArc", { angle: "360" }, "arc"],
    ["mohrCircle", { sigmaX: "-10", sigmaY: "0", tauXY: "0" }, "center"],
    ["dimensionCheck", { leftMass: "0" }, "consistent"],
    ["driveRatio", { helixAngle: "0", driveType: "spur" }, "axialForce"],
    ["gearToothStress", { helixAngle: "0" }, "rootStress"],
    ["pneumatic", { efficiency: "100" }, "extend"],
  ];
  for (const [id, patch, key] of cases) {
    const result = calculateTool(id, { ...initialInputs[id], ...patch });
    assert.equal(result.errors.length, 0, `${id} ${JSON.stringify(patch)} ${result.errors}`);
    assert.ok(result.values.find((item) => item.key === key), `${id} missing ${key}`);
  }
});

test("Alternate choice modes keep TypeScript method, labels, and numbers", () => {
  const beam = calculateTool("beam", { ...initialInputs.beam, case: "simple" });
  assert.equal(beam.errors.length, 0, String(beam.errors));
  assert.equal(beam.method, "δmax = PL³ / 48EI · Mmax = PL / 4");
  assert.equal(beam.values.find((item) => item.key === "reaction").label, "Reaction at each support");
  assert.equal(beam.values.find((item) => item.key === "reaction").display, "0.5");
  assert.equal(beam.values.find((item) => item.key === "deflection").display, "0.15");

  const conveyor = calculateTool("conveyorLine", { ...initialInputs.conveyorLine, solveFor: "speed" });
  assert.equal(conveyor.method, "v = q·p/1000");
  assert.equal(conveyor.values[0].key, "lineSpeed");
  assert.equal(conveyor.values[0].label, "Literal line speed");
  assert.match(conveyor.warnings[0], /requested item rate/);

  const pin = calculateTool("mmc", { ...initialInputs.mmc, featureType: "pin", actualSize: "9.9" });
  assert.equal(pin.method, "Bonus = MMC pin − actual pin · VC = MMC pin + ⌀T");
  assert.equal(pin.values.find((item) => item.key === "bonus").display, "0.1");

  const helical = calculateTool("gearToothStress", { ...initialInputs.gearToothStress, gearType: "helical", helixAngle: "15" });
  assert.equal(helical.errors.length, 0, String(helical.errors));
  assert.equal(helical.values.find((item) => item.key === "normalForce").label, "Declared helical normal tooth force");
  assert.match(helical.values.find((item) => item.key === "rootStress").label, /helical/);

  const turbine = calculateTool("isentropicMachine", {
    ...initialInputs.isentropicMachine,
    mode: "turbine",
    inletPressure: "500",
    outletPressure: "100",
  });
  assert.equal(turbine.errors.length, 0, String(turbine.errors));
  assert.match(turbine.method, /wactual = ηis·wis/);
  assert.match(turbine.values.find((item) => item.key === "specificWork").label, /turbine/);
});
