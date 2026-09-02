import assert from "node:assert/strict";
import test from "node:test";
import { decideReviewRestore, reviewFingerprint } from "./review-restore.ts";

const base = { requestedId: "rev-1", restoredId: null, hasRecord: false, hydrating: false };

test("no id in the link means nothing to do", () => {
  assert.equal(decideReviewRestore({ ...base, requestedId: undefined }), "idle");
  assert.equal(decideReviewRestore({ ...base, requestedId: undefined, hydrating: true }), "idle");
});

test("the record is here, so restore it", () => {
  assert.equal(decideReviewRestore({ ...base, hasRecord: true }), "restore");
});

test("an empty desk that is still arriving is not a missing snapshot", () => {
  // The bug. Signed in, the account view is blanked on mount and refilled when
  // the server answers, so this is the state a direct link lands in — and it
  // used to produce "That review snapshot is no longer here" for a snapshot
  // that was on its way.
  assert.equal(decideReviewRestore({ ...base, hydrating: true }), "wait");
});

test("an empty desk that has settled is a missing snapshot", () => {
  assert.equal(decideReviewRestore({ ...base, hydrating: false }), "missing");
});

test("waiting resolves once the records land", () => {
  /** @type {string | null} */
  let restoredId = null;
  /** @type {(hasRecord: boolean, hydrating: boolean) => string} */
  const step = (hasRecord, hydrating) => {
    const decision = decideReviewRestore({ ...base, restoredId, hasRecord, hydrating });
    if (decision === "restore" || decision === "missing") restoredId = base.requestedId;
    return decision;
  };
  assert.equal(step(false, true), "wait");
  assert.equal(step(false, true), "wait");
  assert.equal(step(true, false), "restore");
  // And never a second time, because restoring overwrites every field on the
  // page — a re-run would discard whatever was typed after it.
  assert.equal(step(true, false), "idle");
});

test("a snapshot deleted while the page is open does not re-announce itself", () => {
  const afterRestore = { ...base, restoredId: "rev-1", hasRecord: false, hydrating: false };
  assert.equal(decideReviewRestore(afterRestore), "idle");
});

test("the same snapshot fingerprints the same, a changed one does not", () => {
  const base = { title: "Evidence review", area: "engineering", payloadJson: '{"notes":"a"}' };
  assert.equal(reviewFingerprint(base), reviewFingerprint({ ...base }));
  assert.notEqual(reviewFingerprint(base), reviewFingerprint({ ...base, title: "Second pass" }));
  assert.notEqual(reviewFingerprint(base), reviewFingerprint({ ...base, area: "drawing" }));
  assert.notEqual(reviewFingerprint(base), reviewFingerprint({ ...base, payloadJson: '{"notes":"b"}' }));
});

test("fields cannot be smuggled across the separator", () => {
  // Joining on a character the JSON can contain would let a title ending in
  // the separator impersonate a different area, and two genuinely different
  // snapshots would count as one and silently fail to save.
  const a = reviewFingerprint({ title: "x", area: "y", payloadJson: "z" });
  const b = reviewFingerprint({ title: "x\u0000y", area: "", payloadJson: "z" });
  assert.notEqual(a, b);
});
