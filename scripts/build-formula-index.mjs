#!/usr/bin/env node
// @ts-check
/**
 * Generate `src/lib/library-formulas.ts` — the id → governing-relation map the
 * Library landing page renders on each card.
 *
 * Why this exists: the landing page needs ONE short string per model, but
 * reading it from `libraryDocuments` imports all ~123 documents (fields,
 * expressions, assumptions, warnings, sources) into the entry chunk that every
 * visitor downloads before seeing anything. The documents stay the single
 * source of truth; this projects the one field the list needs.
 *
 * The generated file is committed, so nothing is added to the build. Drift is
 * impossible because `library-formulas.test.mjs` regenerates it in memory and
 * fails if it differs from what is on disk.
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs \
 *     scripts/build-formula-index.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const OUTPUT_REL_PATH = "src/lib/library-formulas.ts";

/**
 * Build the file contents for a given id → formula map.
 * @param {Array<[string, string]>} entries
 * @returns {string}
 */
export function renderFormulaIndex(entries) {
  const lines = entries.map(([id, formula]) => {
    // JSON.stringify handles the quotes, backslashes and non-ASCII symbols
    // (σ, π, ·, ²) these relations are full of.
    return `  ${JSON.stringify(id)}: ${JSON.stringify(formula)},`;
  });
  return `/**
 * GENERATED — do not edit by hand.
 * Run: node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/build-formula-index.mjs
 *
 * The governing relation shown on each Library card, projected out of
 * \`libraryDocuments\` so the landing page does not import every document just to
 * render one line per model. \`library-formulas.test.mjs\` fails if this drifts
 * from the documents it came from.
 */
export const libraryFormulas: Record<string, string> = {
${lines.join("\n")}
};
`;
}

/**
 * The id → formula pairs, in document order, for every document with one.
 * @param {Record<string, { formula?: string }>} documents
 * @returns {Array<[string, string]>}
 */
export function formulaEntries(documents) {
  /** @type {Array<[string, string]>} */
  const entries = [];
  for (const [id, document] of Object.entries(documents)) {
    const formula = document?.formula;
    if (typeof formula === "string" && formula.length > 0) entries.push([id, formula]);
  }
  return entries;
}

async function main() {
  const { libraryDocuments } = await import("../src/lib/document-library.ts");
  const entries = formulaEntries(libraryDocuments);
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  writeFileSync(join(root, OUTPUT_REL_PATH), renderFormulaIndex(entries), "utf8");
  console.log(`build-formula-index: wrote ${entries.length} relations to ${OUTPUT_REL_PATH}`);
}

if (process.argv[1]?.endsWith("build-formula-index.mjs")) {
  await main();
}
