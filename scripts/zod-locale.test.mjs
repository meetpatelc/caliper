import { strict as assert } from "node:assert";
import test from "node:test";
import { findMissingMarkers, LOCALE_MARKERS } from "./zod-locale.mjs";

test("a bundle carrying the locale passes", () => {
  assert.deepEqual(findMissingMarkers(LOCALE_MARKERS.join(" ")), []);
});

test("the fallback alone does not pass", () => {
  // What the broken bundle actually contained: zod's core default, and none of
  // the locale's own messages. A check that grepped for "Invalid input" would
  // have called this healthy.
  const broken = 'const x="Invalid input";';
  assert.deepEqual(findMissingMarkers(broken), LOCALE_MARKERS);
});

test("a partial locale still fails", () => {
  const partial = '"Too small: expected string to have >=2 characters"';
  const missing = findMissingMarkers(partial);
  assert.ok(missing.length > 0, "one marker present must not vouch for the rest");
  assert.ok(!missing.includes("Too small"));
});
