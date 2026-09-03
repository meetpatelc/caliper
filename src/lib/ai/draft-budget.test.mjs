import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAFTS_GLOBAL_PER_HOUR,
  DRAFTS_PER_ACCOUNT_PER_HOUR,
  judgeDraftBudget,
} from "./draft-budget.ts";

const judge = (accountCallsThisHour, globalCallsThisHour) =>
  judgeDraftBudget({ accountCallsThisHour, globalCallsThisHour });

test("an idle hour allows the call", () => {
  assert.equal(judge(0, 0).allowed, true);
});

test("the limit is the limit, not one past it", () => {
  /*
   * The counts are of calls already made and this runs before the one being
   * asked for, so the boundary is `>=`. With `>` each limit would be one
   * higher than it reads — the kind of off-by-one nobody notices until they
   * are reconciling an invoice against a constant.
   */
  assert.equal(judge(DRAFTS_PER_ACCOUNT_PER_HOUR - 1, 0).allowed, true, "the last one allowed");
  assert.equal(judge(DRAFTS_PER_ACCOUNT_PER_HOUR, 0).allowed, false, "the one after it is not");
  assert.equal(judge(0, DRAFTS_GLOBAL_PER_HOUR - 1).allowed, true);
  assert.equal(judge(0, DRAFTS_GLOBAL_PER_HOUR).allowed, false);
});

test("a busy account is told it is them", () => {
  const verdict = judge(DRAFTS_PER_ACCOUNT_PER_HOUR, 0);
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.scope, "account");
  assert.match(verdict.reason, /one account/);
});

test("a busy site is told it is not them", () => {
  // Blaming the person for a shared ceiling sends them looking for a mistake
  // they did not make.
  const verdict = judge(0, DRAFTS_GLOBAL_PER_HOUR);
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.scope, "global");
  assert.match(verdict.reason, /across the site/);
  assert.doesNotMatch(verdict.reason, /your|you have/i);
});

test("the global ceiling wins when both are exhausted", () => {
  // Both are true; only one is useful. "The site is busy" tells them waiting
  // will fix it, which is the actionable half.
  assert.equal(judge(DRAFTS_PER_ACCOUNT_PER_HOUR, DRAFTS_GLOBAL_PER_HOUR).scope, "global");
});

test("the global ceiling is not a headcount", () => {
  /*
   * If global were per-account times some number of accounts, it would be a
   * limit on people rather than on spend, and the cost of the next call is the
   * same whoever it belongs to. It also has to be reachable: a global ceiling
   * below the per-account one would make the account limit unreachable and
   * every refusal would read "the site is busy" to a single user alone on it.
   */
  assert.ok(
    DRAFTS_GLOBAL_PER_HOUR > DRAFTS_PER_ACCOUNT_PER_HOUR,
    "one account must not be able to exhaust the site on its own allowance",
  );
});

test("no refusal names the global ceiling", () => {
  // Publishing it only tells someone what to exhaust.
  const verdict = judge(0, DRAFTS_GLOBAL_PER_HOUR);
  assert.equal(verdict.allowed, false);
  if (verdict.allowed) return;
  assert.doesNotMatch(verdict.reason, new RegExp(String(DRAFTS_GLOBAL_PER_HOUR)));
});

test("counts above the ceiling still refuse", () => {
  // Races mean the count can overshoot; that must not read as under the limit.
  assert.equal(judge(999, 0).allowed, false);
  assert.equal(judge(0, 999).allowed, false);
});
