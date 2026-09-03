// @ts-nocheck
/**
 * `library-formulas.ts` is generated from `libraryDocuments`. A generated file
 * that nobody checks is a second source of truth waiting to disagree, so this
 * regenerates it in memory and fails when the committed file differs.
 *
 * If this fails, do not hand-edit the generated file — rerun:
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs \
 *     scripts/build-formula-index.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  OUTPUT_REL_PATH,
  formulaEntries,
  renderFormulaIndex,
} from "../../scripts/build-formula-index.mjs";
import { libraryDocuments } from "./document-library.ts";
import { libraryFormulas } from "./library-formulas.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("the committed formula index matches the documents", () => {
  const expected = renderFormulaIndex(formulaEntries(libraryDocuments));
  const actual = readFileSync(join(ROOT, OUTPUT_REL_PATH), "utf8");
  assert.equal(
    actual,
    expected,
    "library-formulas.ts is stale — rerun scripts/build-formula-index.mjs",
  );
});

test("every indexed relation is the document's own string", () => {
  for (const [id, formula] of Object.entries(libraryFormulas)) {
    assert.equal(formula, libraryDocuments[id]?.formula, `${id} relation differs`);
  }
});

test("every document with a relation is in the index", () => {
  for (const [id, document] of Object.entries(libraryDocuments)) {
    if (!document.formula) continue;
    assert.ok(id in libraryFormulas, `${id} has a relation but is not indexed`);
  }
});

test("the index carries only strings, so the landing page stays light", () => {
  // Guards the point of the split: if this ever became a projection of whole
  // documents, the entry chunk would quietly grow back.
  for (const [id, formula] of Object.entries(libraryFormulas)) {
    assert.equal(typeof formula, "string", `${id} is not a string`);
  }
});
