#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { calculateTool, initialInputs, toolFields } from "../src/lib/engineering.ts";
import { libraryDocuments } from "../src/lib/document.ts";
import { tools } from "../src/lib/catalog.ts";

const remaining = Object.keys(initialInputs)
  .filter((id) => !(id in libraryDocuments))
  .sort();

const golden = {};
for (const id of remaining) {
  const result = calculateTool(id, initialInputs[id]);
  golden[id] = {
    values: result.values.map(({ key, label, raw, display, unit }) => ({ key, label, raw, display, unit })),
    warnings: result.warnings,
    errors: result.errors,
    method: result.method,
  };
}

writeFileSync(
  new URL("../src/lib/caliper-remaining.golden.json", import.meta.url),
  JSON.stringify(golden, null, 2) + "\n",
);

const catalog = {};
for (const id of remaining) {
  const tool = tools.find((item) => item.id === id);
  catalog[id] = {
    title: tool?.title,
    description: tool?.description,
    domain: tool?.contract.domain,
    assumptions: tool?.assumptions,
    sourceLabel: tool?.sourceLabel,
    sourceUrl: tool?.sourceUrl,
    outputLabel: tool?.outputLabel,
    fields: toolFields[id],
    defaults: initialInputs[id],
    defaultErrors: golden[id].errors,
  };
}

writeFileSync(
  new URL("../artifacts/remaining-43-meta.json", import.meta.url),
  JSON.stringify({ remaining, catalog, defaultMethods: Object.fromEntries(remaining.map((id) => [id, golden[id].method])) }, null, 2) + "\n",
);

console.log(JSON.stringify({ count: remaining.length, ids: remaining, defaultErrors: remaining.filter((id) => golden[id].errors.length) }, null, 2));
