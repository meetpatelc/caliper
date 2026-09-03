import assert from "node:assert/strict";
import test from "node:test";
import { rankToolMatch, toolAliases, tools } from "./catalog.ts";

/**
 * The best match for a query, or null.
 * @param {string} query
 */
function best(query) {
  const ranked = tools
    .map((tool) => ({ tool, score: rankToolMatch(tool, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.tool ?? null;
}

test("what an engineer types finds what they meant", () => {
  /*
   * The plan called for rewriting all 169 descriptions "for search intent".
   * Checking first: descriptions already feed `searchableToolText` as a bag of
   * words, and `toolAliases` — a per-tool list the type system forces to be
   * exhaustive — carries the phrases people actually type. "pcd", "bolt
   * circle", "bolt pattern" are aliases, not description prose.
   *
   * So findability is handled by a mechanism built for it, and this pins that.
   * If a rewrite ever happens it is a readability change, and this test is what
   * says whether it quietly cost anything.
   */
  const expectations = [
    ["hoop stress", "thinVessel"],
    ["bolt circle", "pitchCircle"],
    ["feeds and speeds", "cuttingParameters"],
    ["beam deflection", "beam"],
    ["thermal expansion", "thermalExpansion"],
    ["goodman fatigue", "goodmanFatigue"],
    ["reynolds number", "reynoldsNumber"],
    ["torque to preload", "boltPreload"],
    ["orifice flow", "orificeFlow"],
    ["shaft torsion", "torsion"],
  ];
  const wrong = [];
  for (const [query, expected] of expectations) {
    const top = best(query);
    if (top?.id !== expected) wrong.push(`"${query}" -> ${top?.id ?? "nothing"}, expected ${expected}`);
  }
  assert.deepEqual(wrong, [], wrong.join("\n"));
});

test("every model carries the phrases someone would type for it", () => {
  // An empty alias list means a model is findable only by the words that happen
  // to be in its title. The type makes the map exhaustive; it cannot make the
  // lists non-empty, and an empty one is invisible until somebody fails to find
  // that model and assumes it does not exist.
  const bare = Object.entries(toolAliases)
    .filter(([, aliases]) => aliases.length === 0)
    .map(([id]) => id);
  assert.deepEqual(bare, [], `models with no search aliases: ${bare.join(", ")}`);
});

test("a model is findable by its own title", () => {
  // The floor below every alias: if typing the name on the card does not find
  // the card, nothing else about search matters.
  const unfindable = tools
    .filter((tool) => best(tool.title)?.id !== tool.id)
    .map((tool) => `${tool.id} ("${tool.title}")`);
  assert.deepEqual(unfindable, [], `not found by their own title:\n${unfindable.join("\n")}`);
});
