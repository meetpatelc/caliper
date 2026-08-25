// @ts-nocheck
/**
 * A Studio publish used to fire six writes for one draft inside a second, and
 * the client spent its retry budget competing with itself — telling the user
 * their work had not saved when it had. These pin the behaviour that replaced
 * it.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createSingleFlight } from "./single-flight.ts";

const settle = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0)); };
const direct = (run) => run();

test("a burst for one key costs two writes, not six", async () => {
  const seen = [];
  const q = createSingleFlight(direct);
  let release;
  const held = new Promise((r) => { release = r; });
  q.push("draft:a", async () => { seen.push("w1"); await held; });
  for (const n of ["w2", "w3", "w4", "w5", "w6"]) q.push("draft:a", async () => { seen.push(n); });
  release();
  await settle();
  assert.equal(seen.length, 2, `expected 2 writes, got ${seen.join(",")}`);
  assert.equal(seen[0], "w1", "the first write must not be delayed");
  assert.equal(seen[1], "w6", "the write that lands must carry the newest state");
});

test("different keys never cancel each other", async () => {
  const seen = [];
  const q = createSingleFlight(direct);
  q.push("draft:b", async () => { seen.push("draft"); });
  q.push("favourite:x", async () => { seen.push("favourite"); });
  await settle();
  assert.deepEqual(seen.sort(), ["draft", "favourite"]);
});

test("a failed write does not wedge the key", async () => {
  const seen = [];
  const q = createSingleFlight(direct);
  let release;
  const held = new Promise((r) => { release = r; });
  q.push("k", async () => { seen.push("boom"); await held; throw new Error("network"); });
  q.push("k", async () => { seen.push("after"); });
  release();
  await settle();
  assert.deepEqual(seen, ["boom", "after"], "later state must still land after a failure");
  assert.equal(q.pending(), false);
});

test("pending is visible while work is outstanding", async () => {
  const q = createSingleFlight(direct);
  let release;
  const held = new Promise((r) => { release = r; });
  q.push("k", async () => { await held; });
  assert.equal(q.pending(), true, "in flight");
  release();
  await settle();
  assert.equal(q.pending(), false, "drained");
});
