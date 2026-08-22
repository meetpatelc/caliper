import assert from "node:assert/strict";
import { test } from "node:test";
import { coerceSearchValue, parseSearchPlain, stringifySearchPlain, toolSearchFromUnknown } from "../src/lib/search-params.ts";

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
