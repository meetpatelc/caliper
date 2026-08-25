import assert from "node:assert/strict";
import { test } from "node:test";
import { SIGN_OUT_TIMEOUT_MS, runSignOut, settleWithin } from "./sign-out-plan.mjs";

const TEST_TIMEOUT_MS = 20;

const hangs = () => new Promise(() => {});
const rejects = () => Promise.reject(new Error("network down"));

/**
 * A `runSignOut` call with the browser effects replaced by recorders, so each
 * test asserts on what actually happened rather than on how it was written.
 */
function harness(overrides = {}) {
  /** @type {string[]} */
  const order = [];
  let requests = 0;
  const steps = {
    requestSignOut: () => {
      requests += 1;
      return Promise.resolve();
    },
    redirect: () => order.push("redirect"),
    timeoutMs: TEST_TIMEOUT_MS,
    ...overrides,
  };
  return {
    order,
    requestCount: () => requests,
    run: () => runSignOut(steps),
  };
}

test("settleWithin reports ok, failed and timeout distinctly", async () => {
  assert.equal(await settleWithin(() => Promise.resolve(), TEST_TIMEOUT_MS), "ok");
  assert.equal(await settleWithin(rejects, TEST_TIMEOUT_MS), "failed");
  assert.equal(await settleWithin(hangs, TEST_TIMEOUT_MS), "timeout");
});

test("settleWithin treats a synchronous throw as a failure, not a crash", async () => {
  assert.equal(
    await settleWithin(() => {
      throw new Error("boom");
    }, TEST_TIMEOUT_MS),
    "failed",
  );
});

test("a confirmed sign-out redirects", async () => {
  const h = harness();
  await h.run();
  assert.equal(h.requestCount(), 1);
  assert.deepEqual(h.order, ["redirect"]);
});

test("a failed sign-out throws and does NOT redirect", async () => {
  // The session is an HttpOnly cookie only the server can clear, so redirecting
  // here would report a sign-out that did not happen.
  const h = harness({ requestSignOut: rejects });
  await assert.rejects(h.run(), /still signed in/);
  assert.deepEqual(h.order, []);
});

test("a timed-out sign-out throws and does NOT redirect", async () => {
  const h = harness({ requestSignOut: hangs });
  await assert.rejects(h.run(), /timed out — you are still signed in/);
  assert.deepEqual(h.order, []);
});

test("the failure message distinguishes a timeout from a rejection", async () => {
  await assert.rejects(harness({ requestSignOut: hangs }).run(), /timed out/);
  await assert.rejects(harness({ requestSignOut: rejects }).run(), /Sign-out failed/);
});

test("the default bound is generous but finite", () => {
  // Only the server can end this session, so it gets a long window — but a
  // wedged request must still surface as a retryable failure rather than
  // spinning forever.
  assert.equal(SIGN_OUT_TIMEOUT_MS, 10_000);
});
