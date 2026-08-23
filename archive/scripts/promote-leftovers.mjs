/**
 * One-shot: lift remaining caliper-models onto InstrumentDocument as shop pass-through.
 * Kit cannot convert kg·m², W/(m²·K), N·m/rad, MPa√m, kN/mm — family stays omitted.
 */
import { writeFileSync } from "node:fs";
import { caliperModels } from "../src/lib/caliper-models.ts";
import { toolFields, initialInputs } from "../../src/lib/engineering.ts";
import { tools } from "../../src/lib/catalog.ts";

const js = (value) => JSON.stringify(value);

const lines = [
  `import type { InstrumentDocument } from "@/lib/document";`,
  ``,
  `/** Leftover Band-1 algebra. Shop units stay on the glass; kit cannot convert every quantity yet. */`,
  `export const leftoverDocuments: Record<string, InstrumentDocument> = {`,
];

for (const [id, model] of Object.entries(caliperModels)) {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`No catalog card for ${id}`);
  const fields = toolFields[id];
  const defaults = initialInputs[id];
  const fieldLines = model.fields.map((field) => {
    const desk = fields.find((item) => item.key === field.id);
    if (!desk) throw new Error(`${id}.${field.id} missing from toolFields`);
    const value = Number(defaults[field.id]);
    if (!Number.isFinite(value)) throw new Error(`${id}.${field.id} default is not a number`);
    const parts = [
      `id: ${js(field.id)}`,
      `label: ${js(field.label)}`,
    ];
    if (desk.symbol) parts.push(`symbol: ${js(desk.symbol)}`);
    if (desk.helper) parts.push(`help: ${js(desk.helper)}`);
    parts.push(`defaultValue: ${value}`);
    parts.push(`defaultUnit: ${js(desk.unit ?? "1")}`);
    if (field.signed) parts.push(`signed: true`);
    return `      { ${parts.join(", ")} }`;
  });
  const outputLines = model.outputs.map(
    (output) =>
      `      { id: ${js(output.key)}, label: ${js(output.label)}, defaultUnit: ${js(output.unit)}, expression: ${js(output.display)} }`,
  );
  lines.push(`  ${id}: {`);
  lines.push(`    slug: ${js(id)},`);
  lines.push(`    title: ${js(tool.title)},`);
  lines.push(`    description: ${js(tool.description)},`);
  lines.push(`    domain: ${js(tool.contract.domain)},`);
  lines.push(`    fields: [`);
  lines.push(fieldLines.join(",\n") + ",");
  lines.push(`    ],`);
  lines.push(`    outputs: [`);
  lines.push(outputLines.join(",\n") + ",");
  lines.push(`    ],`);
  lines.push(`    formula: ${js(model.method)},`);
  lines.push(`    purpose: ${js(tool.description)},`);
  lines.push(`    assumptions: ${js(tool.assumptions)},`);
  lines.push(`    boundary: "Not a design stamp. Use only inside the stated model boundary.",`);
  lines.push(`    interpretation: ${js(tool.outputLabel)},`);
  lines.push(`    sourceLabel: ${js(tool.sourceLabel)},`);
  lines.push(`    sourceUrl: ${js(tool.sourceUrl)},`);
  lines.push(`    related: [],`);
  lines.push(`    warnings: ${js(model.warnings)},`);
  lines.push(`  },`);
}

lines.push(`};`);
lines.push(``);

writeFileSync(new URL("../../src/lib/library-leftovers.ts", import.meta.url), lines.join("\n"));
console.log(`wrote ${Object.keys(caliperModels).length} leftover documents`);
