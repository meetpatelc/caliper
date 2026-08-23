/**
 * One-shot: lift Band-1 caliper models onto InstrumentDocument (SI expressions).
 * Writes src/lib/library-band1.ts and reports display mismatches vs current calculateTool.
 */
import { writeFileSync } from "node:fs";
import { caliperModels } from "../src/lib/caliper-models.ts";
import { toolFields, initialInputs, calculateTool } from "../../src/lib/engineering.ts";
import { tools } from "../../src/lib/catalog.ts";
import { convertQuantity, isUnitFamilyId, unitFamilies } from "../../src/lib/units.ts";
import { evaluateExpression } from "@instrument/formula";

const UNIT_HINT = {
  kg: ["mass", "kg"],
  g: ["mass", "g"],
  "m/s²": ["acceleration", "m/s²"],
  "m/s": ["speed", "m/s"],
  "mm/min": ["speed", "mm/min"],
  "m/min": ["speed", "m/min"],
  V: ["voltage", "V"],
  Ω: ["resistance", "Ω"],
  L: ["volume", "L"],
  "m³": ["volume", "m³"],
  "kg/m³": ["density", "kg/m³"],
  m: ["length", "m"],
  mm: ["length", "mm"],
  "mm²": ["area", "mm²"],
  "m²": ["area", "m²"],
  "kJ/kg·K": ["specificHeat", "kJ/(kg·K)"],
  "kJ/(kg·K)": ["specificHeat", "kJ/(kg·K)"],
  "J/(kg·K)": ["specificHeat", "J/(kg·K)"],
  "K or °C": ["temperatureDelta", "K"],
  K: ["temperature", "K"],
  "°C": ["temperature", "°C"],
  "—": ["dimensionless", "1"],
  ":1": ["dimensionless", "1"],
  MPa: ["stress", "MPa"],
  GPa: ["stress", "GPa"],
  "N/mm²": ["stress", "N/mm²"],
  N: ["force", "N"],
  kN: ["force", "kN"],
  "N·m": ["torque", "N·m"],
  s: ["time", "s"],
  min: ["time", "min"],
  rpm: ["frequency", "rpm"],
  "cm⁴": ["secondMoment", "cm⁴"],
  "mm⁴": ["secondMoment", "mm⁴"],
  "m⁴": ["secondMoment", "m⁴"],
  psi: ["pressure", "psi"],
  Pa: ["pressure", "Pa"],
  "kPa(abs)": ["pressure", "kPa(abs)"],
  kPa: ["pressure", "kPa"],
  "US gpm": ["volumetricFlow", "US gpm"],
  "L/min": ["volumetricFlow", "L/min"],
  "L/s": ["volumetricFlow", "L/s"],
  "m³/s": ["volumetricFlow", "m³/s"],
  "W/m·K": ["thermalConductivity", "W/(m·K)"],
  "W/(m·K)": ["thermalConductivity", "W/(m·K)"],
  "N/mm": ["stiffness", "N/mm"],
  "N/m": ["stiffness", "N/m"],
  deg: ["angle", "°"],
  "°": ["angle", "°"],
  rad: ["angle", "rad"],
  A: ["current", "A"],
  W: ["power", "W"],
  kW: ["power", "kW"],
  J: ["energy", "J"],
  kJ: ["energy", "kJ"],
  "µε": ["strain", "µε"],
  bar: ["pressure", "bar"],
  "%": ["dimensionless", "%"],
  "m liquid": ["length", "m"],
  "mm/rev": ["length", "mm"],
  "m/m": ["dimensionless", "1"],
  "µm/m·K": ["dimensionless", "1"],
  cycles: ["dimensionless", "1"],
  "kg·m²": null,
  "W/(m²·K)": null,
  "N·m/rad": null,
  "MPa√m": null,
  "kg/kmol": ["dimensionless", "1"],
  "kN/mm": null,
};

const OUTPUT_HINT = {
  ...UNIT_HINT,
  "mW": ["power", "mW"],
  "g": ["acceleration", "g"],
  "kg·m/s": null,
  "m³/kg": null,
  "cm³/min": null,
  "cm³/h": null,
  "N/mm": ["stiffness", "N/mm"],
  "W/K": null,
  "W/m²": null,
  "K/W": null,
  mol: null,
  "rad/s": null,
  "rad/s²": null,
  "indexes/min": null,
  "US gpm": ["volumetricFlow", "US gpm"],
};

function hint(unit, table) {
  if (!unit) return ["dimensionless", "1"];
  if (unit in table) return table[unit];
  return undefined;
}

function factorFor(family, unit) {
  if (!family) return 1;
  try {
    return convertQuantity(family, 1, unit, unit).canonical;
  } catch {
    return null;
  }
}

function rewrite(expr, factors) {
  const ids = Object.keys(factors).sort((a, b) => b.length - a.length);
  let next = expr;
  for (const id of ids) {
    const factor = factors[id];
    const token = factor === 1 ? id : `(${id}/${formatNum(factor)})`;
    next = next.replace(new RegExp(`\\b${id}\\b`, "g"), token);
  }
  return next;
}

function formatNum(value) {
  if (Number.isInteger(value)) return String(value);
  const text = value.toPrecision(15).replace(/\.?0+$/, "");
  return text.includes("e") ? value.toExponential() : text;
}

function round(value, significant = 5) {
  if (value === 0) return "0";
  const decimals = Math.max(0, significant - Math.floor(Math.log10(Math.abs(value))) - 1);
  return Number(value.toFixed(Math.min(decimals, 10))).toLocaleString("en-US", { maximumFractionDigits: Math.min(decimals, 10) });
}

function jsString(value) {
  return JSON.stringify(value);
}

const skipped = [];
const mismatches = [];
const documents = [];

for (const [id, model] of Object.entries(caliperModels)) {
  const fields = toolFields[id];
  const tool = tools.find((item) => item.id === id);
  if (!fields || !tool) {
    skipped.push([id, "missing toolFields"]);
    continue;
  }
  const mapped = [];
  const factors = {};
  let ok = true;
  for (const field of fields) {
    const modelField = model.fields.find((item) => item.id === field.key) ?? { id: field.key, label: field.label };
    const mappedUnit = hint(field.unit, UNIT_HINT);
    if (mappedUnit === null) {
      skipped.push([id, `unmapped field unit ${field.unit}`]);
      ok = false;
      break;
    }
    const family = mappedUnit?.[0];
    const defaultUnit = mappedUnit?.[1] ?? "1";
    if (family && !isUnitFamilyId(family)) {
      skipped.push([id, `family ${family} not on desk`]);
      ok = false;
      break;
    }
    const factor = family === "temperature" ? 1 : family ? factorFor(family, defaultUnit) : 1;
    if (factor == null) {
      skipped.push([id, `cannot convert ${field.unit}`]);
      ok = false;
      break;
    }
    factors[field.key] = factor;
    mapped.push({
      id: field.key,
      label: field.label,
      symbol: field.symbol,
      help: field.helper,
      family,
      defaultValue: Number(initialInputs[id]?.[field.key] ?? 0),
      defaultUnit,
      signed: modelField.signed,
      kind: field.kind,
    });
  }
  if (!ok) continue;

  const input = initialInputs[id];
  const current = calculateTool(id, input);
  const scope = {};
  try {
    for (const field of mapped) {
      const shop = Number(input[field.id]);
      scope[field.id] = field.family ? convertQuantity(field.family, shop, field.defaultUnit, field.defaultUnit).canonical : shop;
    }
  } catch (error) {
    skipped.push([id, `scope ${error.message}`]);
    continue;
  }

  const outputs = [];
  for (let i = 0; i < model.outputs.length; i++) {
    const output = model.outputs[i];
    const expected = current.values[i]?.display;
    const mappedUnit = hint(output.unit, OUTPUT_HINT);
    const family = mappedUnit === null || mappedUnit === undefined ? undefined : mappedUnit[0];
    const defaultUnit = mappedUnit && mappedUnit[1] ? mappedUnit[1] : output.unit;
    const displayExpr = rewrite(output.display, factors);
    const rawExpr = rewrite(output.raw, factors);
    const usableFamily = family && isUnitFamilyId(family) && factorFor(family, defaultUnit) != null ? family : undefined;
    let expression = displayExpr;
    if (usableFamily) {
      const k = factorFor(usableFamily, defaultUnit);
      const fromDisplay = k === 1 ? displayExpr : `(${displayExpr})*${formatNum(k)}`;
      expression = fromDisplay;
      try {
        const rawVal = evaluateExpression(rawExpr, scope);
        const shown = round(convertQuantity(usableFamily, rawVal, unitFamilies[usableFamily].canonicalUnit, defaultUnit).converted);
        if (shown === expected) expression = rawExpr;
      } catch {
        /* keep display path */
      }
    }
    outputs.push({
      id: output.key,
      label: output.label,
      family: usableFamily,
      defaultUnit: usableFamily ? defaultUnit : output.unit,
      expression,
    });
  }

  const displayOk = [];
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    let canonical;
    try {
      canonical = evaluateExpression(output.expression, scope);
    } catch (error) {
      mismatches.push([id, output.id, `eval ${error.message}`]);
      continue;
    }
    let display;
    if (output.family) {
      try {
        display = round(convertQuantity(output.family, canonical, unitFamilies[output.family].canonicalUnit, output.defaultUnit).converted);
      } catch (error) {
        mismatches.push([id, output.id, `out ${error.message}`]);
        continue;
      }
    } else {
      display = round(canonical);
    }
    const expected = current.values[i]?.display;
    if (display !== expected) {
      mismatches.push([id, output.id, `got ${display} want ${expected}`]);
    } else {
      displayOk.push(output.id);
    }
  }


  documents.push({
    id,
    title: tool.title,
    description: tool.description,
    domain: tool.contract.domain,
    fields: mapped.filter((field) => field.kind !== "select" || true).map((field) => ({
      id: field.id,
      label: field.label,
      symbol: field.symbol,
      help: field.help,
      family: field.family,
      defaultValue: field.defaultValue,
      defaultUnit: field.defaultUnit,
      signed: field.signed,
    })),
    outputs,
    formula: model.method,
    purpose: tool.description,
    assumptions: tool.assumptions,
    boundary: "Not a design stamp. Use only inside the stated model boundary.",
    interpretation: tool.outputLabel,
    sourceLabel: tool.sourceLabel,
    sourceUrl: tool.sourceUrl,
    related: [],
    warnings: model.warnings,
  });
}

function emitField(field) {
  const parts = [
    `id: ${jsString(field.id)}`,
    `label: ${jsString(field.label)}`,
  ];
  if (field.symbol) parts.push(`symbol: ${jsString(field.symbol)}`);
  if (field.help) parts.push(`help: ${jsString(field.help)}`);
  if (field.family) parts.push(`family: ${jsString(field.family)}`);
  parts.push(`defaultValue: ${Number.isFinite(field.defaultValue) ? field.defaultValue : 0}`);
  parts.push(`defaultUnit: ${jsString(field.defaultUnit)}`);
  if (field.signed) parts.push("signed: true");
  return `      { ${parts.join(", ")} }`;
}

function emitOutput(output) {
  const parts = [
    `id: ${jsString(output.id)}`,
    `label: ${jsString(output.label)}`,
  ];
  if (output.family) parts.push(`family: ${jsString(output.family)}`);
  parts.push(`defaultUnit: ${jsString(output.defaultUnit)}`);
  parts.push(`expression: ${jsString(output.expression)}`);
  return `      { ${parts.join(", ")} }`;
}

const body = documents
  .map((doc) => `  ${doc.id}: {
    slug: ${jsString(doc.id)},
    title: ${jsString(doc.title)},
    description: ${jsString(doc.description)},
    domain: ${jsString(doc.domain)},
    fields: [
${doc.fields.map(emitField).join(",\n")}
    ],
    outputs: [
${doc.outputs.map(emitOutput).join(",\n")}
    ],
    formula: ${jsString(doc.formula)},
    purpose: ${jsString(doc.purpose)},
    assumptions: ${jsString(doc.assumptions)},
    boundary: ${jsString(doc.boundary)},
    interpretation: ${jsString(doc.interpretation)},
    sourceLabel: ${jsString(doc.sourceLabel)},
    sourceUrl: ${jsString(doc.sourceUrl)},
    related: [],
    warnings: ${jsString(doc.warnings)},
  }`)
  .join(",\n");

const file = `import type { InstrumentDocument } from "@/lib/document";

export const band1Documents: Record<string, InstrumentDocument> = {
${body}
};
`;

writeFileSync(new URL("../../src/lib/library-band1.ts", import.meta.url), file);
console.log("wrote", documents.length, "documents");
console.log("skipped", skipped.length, skipped);
console.log("mismatches", mismatches.length);
for (const row of mismatches.slice(0, 80)) console.log(" ", row.join(" · "));
