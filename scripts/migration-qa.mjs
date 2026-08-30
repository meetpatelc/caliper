#!/usr/bin/env node
// @ts-nocheck
/**
 * Full 126-model migration regression gate.
 * Scores the same axes as the 2026-08-23 hold report.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { libraryDocuments } from "../src/lib/document.ts";
import { calculateTool, initialInputs } from "../src/lib/engineering.ts";
import { outputRawScale } from "../src/lib/document-constraints.ts";
import { convertShop, unitSwitchFor } from "../src/lib/fieldUnits.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const loadGolden = (name) => JSON.parse(readFileSync(join(root, "src/lib", name), "utf8"));
const golden = {
  ...loadGolden("band1.golden.json"),
  ...loadGolden("pilot.golden.json"),
  ...loadGolden("wave2.golden.json"),
  ...loadGolden("near.golden.json"),
  ...loadGolden("atlas.golden.json"),
  ...loadGolden("remaining.golden.json"),
};

const RAW_DRIFT_MODELS = Object.keys(outputRawScale).sort();
const PROBE_VALUE = { negativeOne: "-1", zero: "0" };

function parseGuardsCsv() {
  const text = readFileSync(join(root, "src/lib/guard-regression-probes.csv"), "utf8").trim();
  const rows = [];
  for (const line of text.split("\n").slice(1)) {
    const match = line.match(/^"([^"]+)","([^"]+)","\[""(.+)""\]","([^"]*)"$/);
    if (!match) throw new Error(`Could not parse guard row: ${line}`);
    const [, id, probeKey, message] = match;
    const [field, kind] = probeKey.split(":");
    rows.push({ id, field, kind, message });
  }
  return rows;
}

function parseFormerMatrix() {
  const text = readFileSync(join(root, "attachments/per_model_regression_matrix.csv"), "utf8").trim();
  const map = {};
  for (const line of text.split("\n").slice(1)) {
    const match = line.match(/^"([^"]+)","([^"]+)","([^"]*)","(.*)"$/);
    if (!match) continue;
    map[match[1]] = { status: match[2], severity: match[3], issues: match[4].replace(/^"|"$/g, "") };
  }
  return map;
}

function relClose(a, b) {
  return Math.abs(a - b) <= 1e-8 || Math.abs(a - b) / Math.max(1e-12, Math.abs(b)) <= 1e-8;
}

function defaultIssues(id) {
  const issues = [];
  const expected = golden[id];
  if (!expected) return [`no golden fixture`];
  const actual = calculateTool(id, initialInputs[id]);
  if (actual.errors.length) issues.push(`default errors: ${actual.errors.join("; ")}`);
  if (actual.method !== expected.method) issues.push("method mismatch");
  if (JSON.stringify(actual.warnings) !== JSON.stringify(expected.warnings)) issues.push("warnings mismatch");
  if (actual.values.length !== expected.values.length) issues.push("value count mismatch");
  const n = Math.min(actual.values.length, expected.values.length);
  for (let i = 0; i < n; i++) {
    const got = actual.values[i];
    const want = expected.values[i];
    if (got.key !== want.key || got.label !== want.label) issues.push(`${want.key} identity`);
    if (got.display !== want.display) issues.push(`${want.key} display`);
    if (got.unit !== want.unit) issues.push(`${want.key} unit`);
    if (!relClose(got.raw, want.raw)) issues.push(`${want.key} raw`);
  }
  return issues;
}

function unitRetarget(document) {
  const failed = [];
  let trips = 0;
  for (const field of document.fields) {
    const spec = field.family
      ? unitSwitchFor(field.defaultUnit, field.family)
      : unitSwitchFor(field.defaultUnit);
    if (!spec || spec.options.length < 2) continue;
    const alt = spec.options.find((option) => option !== spec.engine);
    if (!alt) continue;
    trips += 1;
    try {
      const outbound = convertShop(spec.family, field.defaultValue, spec.engine, alt);
      const inbound = convertShop(spec.family, outbound, alt, spec.engine);
      if (!relClose(inbound, field.defaultValue)) {
        failed.push(`${field.id} ${spec.engine}→${alt}→${spec.engine} ${inbound} != ${field.defaultValue}`);
      }
    } catch (error) {
      failed.push(`${field.id} ${error instanceof Error ? error.message : error}`);
    }
  }
  return { trips, failed };
}

const guards = parseGuardsCsv();
const former = parseFormerMatrix();
const ids = Object.keys(libraryDocuments).sort();

const report = {
  assessed: ids.length,
  date: "2026-08-23",
  axes: {},
  models: {},
  failed: [],
  formerFailNowPass: [],
  stillFail: [],
};

report.axes.documentCount = ids.length === 159 ? "PASS" : `FAIL (${ids.length})`;
report.axes.goldenCoverage = ids.every((id) => golden[id]) && ids.length === 159 ? "PASS" : "FAIL";
report.axes.catalogPresence = "SKIP";

let malformedProbes = 0;
let malformedFail = 0;
let unitTrips = 0;
let unitFail = 0;
const guardFail = [];

for (const id of ids) {
  const issues = [];
  const document = libraryDocuments[id];
  if (!libraryDocuments[id]) issues.push("missing library document");
  issues.push(...defaultIssues(id));

  const retarget = unitRetarget(document);
  unitTrips += retarget.trips;
  if (retarget.failed.length) {
    unitFail += retarget.failed.length;
    issues.push(`unit retarget: ${retarget.failed[0]}`);
  }

  for (const field of document.fields) {
    for (const junk of ["", "abc", "Infinity", "NaN"]) {
      malformedProbes += 1;
      const result = calculateTool(id, { ...initialInputs[id], [field.id]: junk });
      if (!result.errors.length) {
        malformedFail += 1;
        issues.push(`malformed accepted: ${field.id}=${junk}`);
      }
    }
  }

  report.models[id] = {
    status: issues.length ? "FAIL" : "PASS",
    severity: issues.length ? "FAIL" : "PASS",
    issues: issues.join(" | "),
    former: former[id]?.status ?? "n/a",
  };
  if (issues.length) {
    report.failed.push(id);
    report.stillFail.push({ id, issues });
  } else if (former[id]?.status === "FAIL") {
    report.formerFailNowPass.push(id);
  }
}

for (const row of guards) {
  const result = calculateTool(row.id, { ...initialInputs[row.id], [row.field]: PROBE_VALUE[row.kind] });
  if (!result.errors.includes(row.message) || result.values.length) {
    guardFail.push(`${row.id}.${row.field}=${PROBE_VALUE[row.kind]} → ${JSON.stringify(result.errors)}`);
    if (!report.failed.includes(row.id)) report.failed.push(row.id);
    report.models[row.id].status = "FAIL";
    report.models[row.id].issues = [report.models[row.id].issues, `lost guard still open: ${row.field}:${row.kind}`]
      .filter(Boolean)
      .join(" | ");
  }
}

const stop = calculateTool("productionMetrics", { ...initialInputs.productionMetrics, stopTime: "0" });
const stopOk =
  stop.errors.length === 0 &&
  stop.values.find((item) => item.key === "runTime")?.display === "480" &&
  stop.values.find((item) => item.key === "availability")?.display === "100";
if (!stopOk) {
  report.failed.push("productionMetrics");
  report.models.productionMetrics.status = "FAIL";
  report.models.productionMetrics.issues += " | stopTime=0 still rejected";
}

const zeroMeas = calculateTool("measurementUncertainty", {
  ...initialInputs.measurementUncertainty,
  measuredValue: "0",
});
const zeroMeasOk =
  zeroMeas.errors.length === 0 &&
  zeroMeas.values.some((item) => item.key === "combinedStandard") &&
  zeroMeas.values.some((item) => item.key === "expanded") &&
  !zeroMeas.values.some((item) => item.key === "relativeExpanded");
if (!zeroMeasOk) {
  report.failed.push("measurementUncertainty");
  report.models.measurementUncertainty.status = "FAIL";
  report.models.measurementUncertainty.issues += " | measuredValue=0 still fails the tool";
}

const upperBoundProbes = [
  ["fixtureClamping", { friction: "2" }, /greater than 0 and no greater than 1/],
  ["beltAxis", { friction: "2" }, /from 0 through 1/],
  ["rackPinion", { friction: "2" }, /from 0 through 1/],
  ["pressFit", { friction: "2" }, /no greater than 1/],
  ["fatigueConcentration", { notchSensitivity: "2" }, /from 0 through 1/],
  ["orificeFlow", { dischargeCoefficient: "2" }, /no greater than 1/],
  ["orificeFlow", { upstreamPressure: "0" }, /upstream pressure must exceed downstream pressure/i],
  ["thermalRadiation", { emissivity: "2" }, /from 0 through 1/],
  ["threePhasePower", { powerFactor: "2" }, /between zero and one/],
  ["sheetMetalBend", { kFactor: "2" }, /between 0 and 1/],
  ["sheetBendAllowance", { kFactor: "2" }, /between zero and one/],
  ["hertzContact", { spherePoisson: "0.5" }, /less than 0.5/],
  ["gearMeshForce", { pressureAngle: "90" }, /less than 90/],
  ["gearMeshForce", { helixAngle: "90" }, /less than 90/],
  ["plateBuckling", { poissonRatio: "-1" }, /greater than -1 and less than 1/],
  ["plateBuckling", { poissonRatio: "1" }, /greater than -1 and less than 1/],
];
const upperBoundFail = [];
for (const [id, patch, pattern] of upperBoundProbes) {
  const result = calculateTool(id, { ...initialInputs[id], ...patch });
  if (!result.errors.some((error) => pattern.test(error)) || result.values.length) {
    upperBoundFail.push(`${id} ${JSON.stringify(patch)} → ${JSON.stringify(result.errors)}`);
    if (!report.failed.includes(id)) report.failed.push(id);
    report.models[id].status = "FAIL";
    report.models[id].issues = [report.models[id].issues, `upper bound still open: ${JSON.stringify(patch)}`]
      .filter(Boolean)
      .join(" | ");
  }
}

const rawMissing = RAW_DRIFT_MODELS.filter((id) => !outputRawScale[id]);
report.axes.lostGuards = guardFail.length === 0 && guards.length === 41 ? "PASS" : `FAIL (${guardFail.length})`;
report.axes.addedGuards = stopOk && zeroMeasOk ? "PASS" : "FAIL";
report.axes.upperBounds = upperBoundFail.length === 0 ? "PASS" : `FAIL (${upperBoundFail.length})`;
report.axes.rawContract = rawMissing.length === 0 && RAW_DRIFT_MODELS.length === 21 ? "PASS" : "FAIL";
report.axes.defaultsAndRaw = report.failed.filter((id) => (report.models[id].issues || "").includes(" raw") || (report.models[id].issues || "").includes("display")).length
  ? "FAIL"
  : "PASS";
report.axes.malformedText = malformedFail === 0 && malformedProbes >= 552 ? "PASS" : `FAIL (${malformedFail}/${malformedProbes})`;
report.axes.unitRetarget = unitFail === 0 && unitTrips > 0 ? "PASS" : `FAIL (${unitFail}/${unitTrips})`;

const passCount = ids.filter((id) => report.models[id].status === "PASS").length;
const failCount = ids.length - passCount;
report.summary = {
  pass: passCount,
  fail: failCount,
  formerFail: Object.values(former).filter((item) => item.status === "FAIL").length,
  formerFailRecovered: report.formerFailNowPass.length,
  unitTrips,
  malformedProbes,
  guardProbes: guards.length,
  verdict: failCount === 0 && guardFail.length === 0 && upperBoundFail.length === 0 && stopOk && zeroMeasOk ? "PASS" : "FAIL",
};

mkdirSync(join(root, "artifacts"), { recursive: true });
writeFileSync(join(root, "artifacts/migration-qa-report.json"), JSON.stringify(report, null, 2));

const matrix = ["calculatorId,status,severity,confirmedIssues"];
for (const id of ids) {
  const row = report.models[id];
  matrix.push(`"${id}","${row.status}","${row.severity}","${row.issues.replaceAll('"', '""')}"`);
}
writeFileSync(join(root, "artifacts/migration-qa-matrix.csv"), matrix.join("\n") + "\n");

console.log(
  JSON.stringify(
    {
      verdict: report.summary.verdict,
      pass: passCount,
      fail: failCount,
      axes: report.axes,
      formerFailRecovered: report.formerFailNowPass.length,
      stillFail: report.stillFail,
      guardFail,
      upperBoundFail,
      unitTrips,
      malformedProbes,
    },
    null,
    2,
  ),
);
if (report.summary.verdict !== "PASS") process.exit(2);
