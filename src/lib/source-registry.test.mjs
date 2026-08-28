import assert from "node:assert/strict";
import test from "node:test";
import { sourceRegistry } from "@/lib/platform";
import { tools } from "@/lib/catalog";

/**
 * Tools cite sources by id; the registry holds the citation. Nothing tied the
 * two together, so moving attributions off MechaniCalc, FIRGELLI and RoyMech
 * renamed 18 ids on the tools and left 15 records behind — dangling references
 * on one side, dead entries on the other, and no symptom, because the tool page
 * renders its own sourceLabel and never consults the registry.
 *
 * A provenance claim that points at nothing is worse than none on a product
 * whose proposition is that the work can be checked.
 */
const registered = new Set(sourceRegistry.map((record) => record.id));

test("every source a tool cites exists in the registry", () => {
  const dangling = [];
  for (const tool of tools) {
    for (const id of tool.contract.sourceIds ?? []) {
      if (!registered.has(id)) dangling.push(`${tool.id} cites unknown source "${id}"`);
    }
  }
  assert.deepEqual(dangling, []);
});

test("every registry record is cited by something", () => {
  const cited = new Set();
  for (const tool of tools) for (const id of tool.contract.sourceIds ?? []) cited.add(id);
  const orphans = [...registered].filter((id) => !cited.has(id));
  assert.deepEqual(orphans, [], `unreferenced source records: ${orphans.join(", ")}`);
});

test("registry ids are unique and records are complete", () => {
  const seen = new Set();
  for (const record of sourceRegistry) {
    assert.ok(!seen.has(record.id), `duplicate source id "${record.id}"`);
    seen.add(record.id);
    assert.ok(record.label.trim().length > 2, `${record.id} has no label`);
    assert.ok(record.scope.trim().length > 2, `${record.id} has no scope`);
    // A printed work has no URL, and the citation is the label. Anything that
    // does carry one must be a real absolute address, not a fragment.
    if (record.url) assert.match(record.url, /^https?:\/\//, `${record.id} has a malformed url`);
  }
});

test("a tool cites the same source at most once", () => {
  const repeats = [];
  for (const tool of tools) {
    const ids = tool.contract.sourceIds ?? [];
    if (new Set(ids).size !== ids.length) repeats.push(tool.id);
  }
  assert.deepEqual(repeats, []);
});
