// @ts-nocheck
/**
 * The catalog and the library documents both describe every model, and most
 * documents repeat the catalog verbatim.
 *
 * Two authoring styles are in the tree. `library-remaining.ts` uses a factory
 * that DERIVES title, description, domain, assumptions and source from the
 * catalog entry — 33 models. The other six files inline all of it as literals —
 * 125 models. The literals are the older style, and every one of them is a
 * second place the same sentence can change.
 *
 * Nothing checked that the two agreed. Measured when this was written: 155 of
 * 159 documents matched the catalog exactly, so the duplication was pure
 * redundancy rather than divergence — but only by luck, since an edit to either
 * side would have gone unnoticed.
 *
 * This pins that. A document may override a catalog field only by appearing in
 * INTENTIONAL_OVERRIDES with a reason. Everything else must match, so editing a
 * title in one place and not the other fails here instead of shipping two
 * different names for the same model.
 *
 * The long-term fix is to converge the 125 literals onto the factory, at which
 * point most of this becomes structurally impossible. Until then, this is the
 * guard.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { libraryDocuments } from "./document-library.ts";
import { tools } from "./catalog.ts";
import "@/lib/test-support/all-documents.mjs";

/**
 * Documents whose prose is deliberately richer than the catalog's. These are
 * the hand-written Studio seeds: the catalog needs a terse card label, while
 * the document is what an engineer reads next to the result — "Water services
 * often target 1–3 m/s" is worth more there than "Mean velocity".
 *
 * Add an entry only for text a reader is better off seeing; never to silence a
 * mismatch you did not mean to create.
 */
const INTENTIONAL_OVERRIDES = {
  axial: ["description", "purpose", "interpretation"],
  dynamicPressure: ["description", "assumptions", "purpose", "interpretation"],
  gravitationalPe: ["description", "assumptions", "purpose", "interpretation"],
  pipeVelocity: ["description", "assumptions", "purpose", "interpretation"],
};

/** How each document field maps onto the catalog entry that owns it. */
function comparisons(doc, tool) {
  return [
    ["title", doc.title, tool.title],
    ["description", doc.description, tool.description],
    ["domain", doc.domain, tool.contract.domain],
    ["sourceLabel", doc.sourceLabel, tool.sourceLabel],
    ["sourceUrl", doc.sourceUrl, tool.sourceUrl],
    ["assumptions", JSON.stringify(doc.assumptions), JSON.stringify(tool.assumptions)],
    ["purpose", doc.purpose, tool.description],
    ["interpretation", doc.interpretation, tool.outputLabel],
  ];
}

const byId = new Map(tools.map((tool) => [tool.id, tool]));

test("every library document has a catalog entry", () => {
  for (const id of Object.keys(libraryDocuments)) {
    assert.ok(byId.has(id), `${id} is a document with no catalog entry`);
  }
});

test("documents match the catalog except where an override is declared", () => {
  const unexpected = [];
  for (const [id, doc] of Object.entries(libraryDocuments)) {
    const tool = byId.get(id);
    if (!tool) continue;
    const allowed = INTENTIONAL_OVERRIDES[id] ?? [];
    for (const [field, docValue, catalogValue] of comparisons(doc, tool)) {
      if (docValue === undefined) continue;
      if (docValue === catalogValue) continue;
      if (allowed.includes(field)) continue;
      unexpected.push(`${id}.${field}\n    document: ${docValue}\n    catalog:  ${catalogValue}`);
    }
  }
  assert.deepEqual(
    unexpected,
    [],
    `document/catalog disagreements with no declared override:\n\n${unexpected.join("\n\n")}`,
  );
});

test("every declared override is actually still overriding something", () => {
  // A stale entry here would quietly permit a future real mismatch on that
  // field, so an override that no longer differs must be deleted.
  for (const [id, fields] of Object.entries(INTENTIONAL_OVERRIDES)) {
    const doc = libraryDocuments[id];
    const tool = byId.get(id);
    assert.ok(doc, `override declared for unknown document ${id}`);
    assert.ok(tool, `override declared for unknown catalog entry ${id}`);
    const differing = comparisons(doc, tool)
      .filter(([, docValue, catalogValue]) => docValue !== undefined && docValue !== catalogValue)
      .map(([field]) => field);
    for (const field of fields) {
      assert.ok(
        differing.includes(field),
        `${id}.${field} is declared as an intentional override but now matches the catalog — remove it`,
      );
    }
  }
});
