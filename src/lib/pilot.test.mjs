// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { libraryDocuments } from "./document.ts";
import { calculateTool, initialInputs } from "./engineering.ts";

const golden = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "pilot.golden.json"), "utf8"));
const PILOT_IDS = [
  "boltPreload",
  "thinVessel",
  "keyway",
  "goodmanFatigue",
  "gearRatio",
  "wormDrive",
  "beltTension",
  "frictionClutch",
  "cuttingPower",
  "drillPointDepth",
  "fixtureClamping",
  "pickPlaceCycle",
  "payloadInertia",
  "reynoldsNumber",
  "buoyancyForce",
  "flywheelEnergy",
];

const run = (id, patch = {}) => calculateTool(id, { ...initialInputs[id], ...patch });
const shown = (result, key) => result.values.find((item) => item.key === key)?.display;

test("Pilot declarative models match golden TypeScript defaults", () => {
  assert.equal(Object.keys(golden).length, 16);
  for (const id of PILOT_IDS) {
    assert.ok(libraryDocuments[id], `${id} is not a library document`);
    const actual = calculateTool(id, initialInputs[id]);
    const expected = golden[id];
    assert.equal(actual.errors.length, 0, `${id}: ${actual.errors}`);
    assert.equal(actual.method, expected.method, id);
    assert.deepEqual(actual.warnings, expected.warnings, id);
    assert.equal(actual.values.length, expected.values.length, id);
    for (let i = 0; i < expected.values.length; i++) {
      const got = actual.values[i];
      const want = expected.values[i];
      assert.equal(got.key, want.key, id);
      assert.equal(got.label, want.label, `${id}.${want.key} label`);
      assert.equal(got.display, want.display, `${id}.${want.key} display`);
      assert.equal(got.unit, want.unit, `${id}.${want.key} unit`);
    }
  }
});

test("Pilot probes match the previous TypeScript displays", () => {
  assert.equal(shown(run("boltPreload", { torque: "40", diameter: "10", nutFactor: "0.2", uncertainty: "10" }), "preload"), "20");
  assert.equal(shown(run("thinVessel", { pressure: "2", diameter: "400", thickness: "10" }), "hoop"), "40");
  assert.equal(shown(run("keyway", { torque: "100" }), "tangentialForce"), "5,000");
  assert.equal(shown(run("goodmanFatigue", { kf: "1" }), "adjustedAlternating"), "80");
  assert.equal(shown(run("gearRatio", { driverTeeth: "30", drivenTeeth: "30", efficiency: "100" }), "outputTorque"), "18");
  assert.equal(shown(run("wormDrive", { wormStarts: "2", efficiency: "50" }), "outputTorque"), "62.5");
  assert.equal(shown(run("beltTension", { looseSideTension: "0" }), "tightSideTension"), "1,600");
  assert.equal(shown(run("frictionClutch", { surfaceCount: "1" }), "frictionTorque"), "76.16");
  assert.equal(shown(run("cuttingPower", { efficiency: "100" }), "machinePower"), "3.72");
  assert.equal(shown(run("drillPointDepth", { includedAngle: "118" }), "pointDepth"), "3.6052");
  assert.equal(shown(run("fixtureClamping", { serviceMultiplier: "1", friction: "0.2" }), "requiredNormalForce"), "9,000");
  assert.equal(shown(run("pickPlaceCycle", { cycles: "1" }), "batchTime"), "0.051667");
  assert.equal(shown(run("payloadInertia", { productMass: "0" }), "pointMassInertia"), "0.1125");
  assert.equal(shown(run("reynoldsNumber", { velocity: "0.5" }), "reynolds"), "10,000");
  assert.equal(shown(run("buoyancyForce", { objectMass: "12" }), "netUpwardForce"), "0");
  assert.equal(shown(run("flywheelEnergy", { initialSpeed: "0", finalSpeed: "1000" }), "initialEnergy"), "0");
  assert.equal(shown(run("flywheelEnergy", { initialSpeed: "0", finalSpeed: "1000" }), "energyChange"), "4.3865");
});
