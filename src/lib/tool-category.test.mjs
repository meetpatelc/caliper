import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { tools, searchableToolText } from "./catalog.ts";

/** The union members, read from the source, since a type is erased at runtime. */
function declaredCategories() {
  const source = readFileSync(new URL("./tool-category.ts", import.meta.url), "utf8");
  return new Set([...source.matchAll(/^ {2}\| "([^"]+)"/gm)].map((m) => m[1]));
}

test("every declared category is actually used by a model", () => {
  // A member nobody uses is a keyword that matches nothing — worse than absent,
  // because it looks like the search covers a topic it does not.
  const used = new Set(tools.map((tool) => tool.category));
  const orphans = [...declaredCategories()].filter((category) => !used.has(category));
  assert.deepEqual(orphans, [], `declared but unused: ${orphans.join(", ")}`);
});

test("no category is the same words in another order", () => {
  /*
   * "Thermal & fluids" and "Fluids & thermal" were both in the catalogue. That
   * is one keyword typed two ways, not two keywords, and it splits the models
   * that answer a search between two spellings of the same idea.
   *
   * Deliberately narrow. Genuine near-neighbours like "Fasteners" and "Machine
   * elements" are different words people actually type, and merging those would
   * delete search terms — which is the whole job of this field.
   */
  const seen = new Map();
  for (const category of declaredCategories()) {
    const key = category
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .sort()
      .join(" ");
    const first = seen.get(key);
    assert.equal(first, undefined, `"${category}" is "${first}" reordered`);
    seen.set(key, category);
  }
});

test("a category still reaches the search haystack", () => {
  // The single reason this field exists. If it stops being searchable, the
  // whole list is dead weight and the next person will rightly delete it.
  const tool = tools.find((candidate) => candidate.category === "Fasteners");
  assert.ok(tool, "expected at least one model filed under Fasteners");
  assert.match(searchableToolText(tool), /fasteners/);
});
