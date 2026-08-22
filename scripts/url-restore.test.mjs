import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateTool, initialInputs } from "../src/lib/engineering.ts";
import { coerceSearchValue, parseSearchPlain, sharePath, stringifySearchPlain, toolSearchFromUnknown } from "../src/lib/search-params.ts";

test("plain query stays unquoted numbers", () => {
  assert.equal(stringifySearchPlain({ force: "50", area: "1200" }), "?force=50&area=1200");
  assert.deepEqual(parseSearchPlain("?force=50&area=1200"), { force: "50", area: "1200" });
});

test("legacy JSON-quoted values still restore", () => {
  assert.equal(coerceSearchValue('"50"'), "50");
  assert.equal(coerceSearchValue(50), "50");
  assert.deepEqual(parseSearchPlain("?force=%2250%22&area=1200"), { force: "50", area: "1200" });
  assert.deepEqual(toolSearchFromUnknown({ force: 50, restore: "1" }), { force: "50", restore: "1" });
});

test("restore flag is not written into shareable URLs", () => {
  assert.equal(stringifySearchPlain({ force: "50", restore: "1" }), "?force=50");
});

test("share path + parse + calculateTool restores axial 50 kN / 1200 mm²", () => {
  const keys = ["force", "area", "length", "modulus"];
  const input = { ...initialInputs.axial, force: "50", area: "1200", length: "250", modulus: "200" };
  const path = sharePath("axial", input, keys);
  assert.equal(path, "/tool/axial?force=50&area=1200&length=250&modulus=200");
  const search = parseSearchPlain(path.slice(path.indexOf("?")));
  const result = calculateTool("axial", { ...initialInputs.axial, ...search });
  assert.equal(result.errors.length, 0);
  const stress = result.values.find((item) => item.key === "stress");
  assert.ok(Math.abs(Number(stress.display) - 41.667) < 0.02, stress.display);
});

test("quoted legacy URL still calculates the same axial result", () => {
  const search = parseSearchPlain("?force=%2250%22&area=%221200%22&length=%22250%22&modulus=%22200%22");
  const result = calculateTool("axial", { ...initialInputs.axial, ...search });
  const stress = result.values.find((item) => item.key === "stress");
  assert.ok(Math.abs(Number(stress.display) - 41.667) < 0.02, stress.display);
});
