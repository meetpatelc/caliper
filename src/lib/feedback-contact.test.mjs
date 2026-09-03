import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { looksLikeEmail, parseFeedbackInput } from "./feedback.ts";

const wellFormed = ["a@b.co", "meet.patel+tag@example.com", "  spaced@example.com  "];
const malformed = ["", "   ", "no-at-sign", "no@dot", "@example.com", "name@", "two @example.com"];

test("ordinary addresses pass", () => {
  for (const value of wellFormed) assert.equal(looksLikeEmail(value), true, value);
});

test("the typo class is caught", () => {
  // The point is not RFC conformance — only sending to an address proves it
  // works. It is catching the mistakes that make a reply impossible.
  for (const value of malformed) assert.equal(looksLikeEmail(value), false, JSON.stringify(value));
});

test("the form and the server reach the same verdict on every address", () => {
  /*
   * This is the test that was missing, and its absence hid a live defect.
   *
   * The suite used to check only `looksLikeEmail` plus the fact that the route
   * imports it — both green while the server validated with `z.email()` and
   * disagreed on six of ten realistic addresses. Every disagreement went the
   * same way: the form accepted, the server refused, and the sender lost the
   * message they had just written to a generic "Could not submit."
   *
   * So compare the two verdicts directly, on the addresses that actually
   * differed. `très@example.com` is the one that matters most — a perfectly
   * ordinary address that the stricter validator rejects.
   */
  const cases = [
    ...wellFormed,
    ...malformed,
    "a@b.c",
    "x@y.z",
    "a..b@example.com",
    "a@-example.com",
    "a@example..com",
    "très@example.com",
    "a@b.verylongtld",
    "user@localhost",
  ];
  const disagreements = [];
  for (const value of cases) {
    const form = looksLikeEmail(value);
    const server = parseFeedbackInput({ kind: "bug", contact: value, message: "m", pagePath: "/" }).success;
    if (form !== server) disagreements.push(`${JSON.stringify(value)}: form ${form}, server ${server}`);
  }
  assert.deepEqual(disagreements, [], disagreements.join("\n"));
});

test("a valid international address is accepted end to end", () => {
  // The concrete regression. Named on its own so a failure says what broke
  // rather than pointing at a list.
  assert.equal(looksLikeEmail("très@example.com"), true);
  assert.equal(
    parseFeedbackInput({ kind: "bug", contact: "très@example.com", message: "m", pagePath: "/" }).success,
    true,
  );
});

test("the form validates through the shared function, not its own copy", () => {
  // The browser check saves a round trip; the server is the gate, because
  // /feedback is unauthenticated. Two patterns would drift, and drift here
  // costs somebody the message they had just finished typing.
  const route = readFileSync(new URL("../routes/feedback.tsx", import.meta.url), "utf8");
  assert.match(route, /looksLikeEmail/, "the route should call the shared validator");
  assert.doesNotMatch(route, /@\[\^/, "the route should not carry its own address pattern");
});
