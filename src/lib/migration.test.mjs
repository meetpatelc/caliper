// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { libraryDocuments } from "./document-library.ts";
import { calculateTool, initialInputs } from "./engineering.ts";
import { outputRawScale } from "./document-constraints.ts";
import "@/lib/test-support/all-documents.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const loadGolden = (name) => JSON.parse(readFileSync(join(here, name), "utf8"));
const golden = {
  ...loadGolden("band1.golden.json"),
  ...loadGolden("pilot.golden.json"),
  ...loadGolden("wave2.golden.json"),
  ...loadGolden("near.golden.json"),
  ...loadGolden("atlas.golden.json"),
  ...loadGolden("remaining.golden.json"),
};

const PROBE_VALUE = { negativeOne: "-1", zero: "0" };

function parseGuardsCsv() {
  const text = readFileSync(join(here, "guard-regression-probes.csv"), "utf8").trim();
  const rows = [];
  for (const line of text.split("\n").slice(1)) {
    const match = line.match(/^"([^"]+)","([^"]+)","\[""(.+)""\]","([^"]*)"$/);
    assert.ok(match, `Could not parse guard row: ${line}`);
    const [, id, probeKey, message, keys] = match;
    const [field, kind] = probeKey.split(":");
    rows.push({ id, field, kind, message, keys: keys.split("|") });
  }
  return rows;
}

test("126 migrated library documents plus remaining closed-form documents are present", () => {
  assert.equal(Object.keys(libraryDocuments).length, 159);
});

test("Every migrated document has a committed golden fixture", () => {
  const missing = Object.keys(libraryDocuments).filter((id) => !golden[id]);
  assert.deepEqual(missing, []);
  const original126 = Object.keys(golden).filter((id) => id in libraryDocuments);
  assert.equal(original126.length, 159);
});

test("Default visible results, method, warnings, and canonical raw match fixtures", () => {
  const failed = [];
  for (const id of Object.keys(libraryDocuments)) {
    const expected = golden[id];
    const actual = calculateTool(id, initialInputs[id]);
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
      const rel = Math.abs(got.raw - want.raw) / Math.max(1e-12, Math.abs(want.raw));
      if (rel > 1e-8 && Math.abs(got.raw - want.raw) > 1e-8) {
        failed.push(`${id}.${want.key} raw ${got.raw} != ${want.raw}`);
      }
    }
  }
  assert.equal(failed.length, 0, failed.join("\n"));
});

test("Lost TypeScript domain guards reject the recorded probes", () => {
  const rows = parseGuardsCsv();
  assert.equal(rows.length, 41);
  const failed = [];
  for (const row of rows) {
    const value = PROBE_VALUE[row.kind];
    const result = calculateTool(row.id, { ...initialInputs[row.id], [row.field]: value });
    if (!result.errors.includes(row.message)) {
      failed.push(`${row.id}.${row.field}=${value} errors=${JSON.stringify(result.errors)}`);
    }
    if (result.values.length) failed.push(`${row.id}.${row.field}=${value} still produced values`);
  }
  assert.equal(failed.length, 0, failed.join("\n"));
});

test("productionMetrics allows zero stop time (no-downtime boundary)", () => {
  const result = calculateTool("productionMetrics", { ...initialInputs.productionMetrics, stopTime: "0" });
  assert.equal(result.errors.length, 0, String(result.errors));
  const runTime = result.values.find((item) => item.key === "runTime");
  const availability = result.values.find((item) => item.key === "availability");
  assert.equal(runTime.display, "480");
  assert.equal(availability.display, "100");
  assert.ok(Math.abs(availability.raw - 1) < 1e-12, availability.raw);
});

test("measurementUncertainty measuredValue=0 keeps absolute results", () => {
  const result = calculateTool("measurementUncertainty", { ...initialInputs.measurementUncertainty, measuredValue: "0" });
  assert.equal(result.errors.length, 0, String(result.errors));
  const keys = result.values.map((item) => item.key);
  assert.ok(keys.includes("combinedStandard"));
  assert.ok(keys.includes("expanded"));
  assert.equal(keys.includes("relativeExpanded"), false);
  assert.ok(result.warnings.some((warning) => /undefined/i.test(warning)));
});

test("Valid zero/boundary inputs that the parent accepted still calculate", () => {
  const cases = [
    ["beltTension", { looseSideTension: "0" }, "tightSideTension"],
    ["flywheelEnergy", { initialSpeed: "0", finalSpeed: "1000" }, "initialEnergy"],
    ["payloadInertia", { productMass: "0" }, "pointMassInertia"],
    ["toleranceStack", { t4: "0", t5: "0", t6: "0" }, "worstCase"],
    ["threePhasePower", { powerFactor: "0" }, "realPower"],
    ["threePhasePower", { powerFactor: "1" }, "realPower"],
    ["thermalRcStep", { elapsedTime: "0" }, "nodeTemperature"],
    ["machiningTimeBudget", { nonCutAllowance: "0" }, "totalTime"],
  ];
  for (const [id, patch, key] of cases) {
    const result = calculateTool(id, { ...initialInputs[id], ...patch });
    assert.equal(result.errors.length, 0, `${id} ${JSON.stringify(patch)} ${result.errors}`);
    assert.ok(result.values.find((item) => item.key === key), `${id} missing ${key}`);
  }
});

test("Exclusive domain bounds match the TypeScript parent", () => {
  const reject = [
    ["threePhasePower", { powerFactor: "1.2" }, /between zero and one/i],
    ["hertzContact", { spherePoisson: "0.5" }, /less than 0.5/i],
    ["orificeFlow", { dischargeCoefficient: "0" }, /greater than 0/i],
    ["orificeFlow", { dischargeCoefficient: "1.1" }, /no greater than 1/i],
    ["orificeFlow", { upstreamPressure: "0" }, /upstream pressure must exceed downstream pressure/i],
    ["pressFit", { friction: "0" }, /greater than 0/i],
    ["compressibleMassFlow", { specificHeatRatio: "1" }, /greater than one/i],
    ["gearMeshForce", { helixAngle: "90" }, /less than 90/i],
    ["fixtureClamping", { friction: "2" }, /greater than 0 and no greater than 1/],
    ["plateBuckling", { poissonRatio: "-1" }, /greater than -1 and less than 1/],
    ["plateBuckling", { poissonRatio: "1" }, /greater than -1 and less than 1/],
    ["beltAxis", { friction: "2" }, /from 0 through 1/],
    ["rackPinion", { friction: "2" }, /from 0 through 1/],
    ["fatigueConcentration", { notchSensitivity: "2" }, /from 0 through 1/],
    ["thermalRadiation", { emissivity: "2" }, /from 0 through 1/],
    ["sheetMetalBend", { kFactor: "2" }, /between 0 and 1/],
    ["sheetBendAllowance", { kFactor: "2" }, /between zero and one/],
  ];
  for (const [id, patch, pattern] of reject) {
    const result = calculateTool(id, { ...initialInputs[id], ...patch });
    assert.ok(result.errors.some((error) => pattern.test(error)), `${id} ${JSON.stringify(patch)} ${result.errors}`);
    assert.equal(result.values.length, 0, `${id} ${JSON.stringify(patch)} still produced values`);
  }
  const accept = [
    ["orificeFlow", { dischargeCoefficient: "1" }],
    ["orificeFlow", { upstreamPressure: "80000" }],
    ["pressFit", { friction: "1" }],
    ["hertzContact", { spherePoisson: "0" }],
    ["thermalRadiation", { emissivity: "0" }],
    ["thermalRadiation", { emissivity: "1" }],
    ["gearMeshForce", { helixAngle: "0" }],
    ["fixtureClamping", { friction: "1" }],
    ["plateBuckling", { poissonRatio: "0" }],
  ];
  for (const [id, patch] of accept) {
    const result = calculateTool(id, { ...initialInputs[id], ...patch });
    assert.equal(result.errors.length, 0, `${id} ${JSON.stringify(patch)} ${result.errors}`);
  }
});

test("Malformed text is rejected for every migrated input field", () => {
  const failed = [];
  let probes = 0;
  for (const [id, document] of Object.entries(libraryDocuments)) {
    for (const field of document.fields) {
      for (const junk of ["", "abc", "Infinity", "NaN"]) {
        probes += 1;
        const result = calculateTool(id, { ...initialInputs[id], [field.id]: junk });
        if (!result.errors.length) failed.push(`${id}.${field.id}=${JSON.stringify(junk)} accepted`);
      }
    }
  }
  assert.ok(probes >= 552, `expected at least 552 malformed probes, got ${probes}`);
  assert.equal(failed.length, 0, failed.join("\n"));
});

test("Raw-scale contract covers the 21 drifted TypeScript parents", () => {
  const expected = [
    "bearingLoad",
    "boltPreload",
    "driveTrain",
    "eccentricBoltGroup",
    "flywheelEnergy",
    "gageRr",
    "gearRatio",
    "hertzContact",
    "hydraulicCylinder",
    "hydraulicLine",
    "keyway",
    "measurementUncertainty",
    "orificeFlow",
    "pneumaticCycleTime",
    "pneumaticLineLoss",
    "pressFit",
    "productionMetrics",
    "shaftDesign",
    "submergedPlane",
    "thinVessel",
    "threadDesign",
  ];
  assert.deepEqual(Object.keys(outputRawScale).sort(), expected.sort());
});
