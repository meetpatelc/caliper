import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { looksLikeEmail } from "./feedback.ts";

test("ordinary addresses pass", () => {
  for (const value of ["a@b.co", "meet.patel+tag@example.com", "  spaced@example.com  "]) {
    assert.equal(looksLikeEmail(value), true, value);
  }
});

test("the typo class is caught", () => {
  // The point is not RFC conformance — only sending to an address proves it
  // works. It is catching the mistakes that make a reply impossible.
  for (const value of ["", "   ", "no-at-sign", "no@dot", "@example.com", "name@", "two @example.com"]) {
    assert.equal(looksLikeEmail(value), false, JSON.stringify(value));
  }
});

test("the form validates through the shared function, not its own copy", () => {
  /*
   * The browser check is a courtesy that saves a round trip; the server is the
   * gate, because /feedback is unauthenticated. Two patterns would drift, and
   * the way drift shows up is a form that accepts what the server rejects —
   * costing somebody the message they had just finished typing.
   *
   * So the route may not carry an address pattern of its own. It imports the
   * one in this module or it does not validate at all.
   */
  const route = readFileSync(new URL("../routes/feedback.tsx", import.meta.url), "utf8");
  assert.match(route, /looksLikeEmail/, "the route should call the shared validator");
  assert.doesNotMatch(route, /@\[\^/, "the route should not carry its own address pattern");
});
