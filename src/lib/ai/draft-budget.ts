/**
 * How many drafts may be spent, per account and in total.
 *
 * Separated from the endpoint so the numbers can be read, reasoned about and
 * tested without a database or a provider key. The decision is arithmetic; the
 * counting is I/O, and only the first of those is interesting.
 */

/** Per account. Enough to iterate on a brief, not enough to mine the budget. */
export const DRAFTS_PER_ACCOUNT_PER_HOUR = 10;

/**
 * Across everybody. The one that actually protects the card.
 *
 * Deliberately not a multiple of the per-account limit: it is a spend ceiling,
 * not a headcount. Eleven busy accounts should hit this and stop, because the
 * cost of the twelfth is the same whoever it belongs to. Sign-up is open, so
 * the per-account number is a courtesy and this is the guarantee.
 */
export const DRAFTS_GLOBAL_PER_HOUR = 100;

export type BudgetVerdict =
  | { allowed: true }
  | { allowed: false; scope: "account" | "global"; reason: string };

/**
 * Decide from two counts already taken over the last hour.
 *
 * `>=` rather than `>`: the counts are of calls already made, and this runs
 * before the call being asked for. With `>` the effective limits would each be
 * one higher than they read, which is the kind of off-by-one nobody notices
 * until they are reconciling an invoice against a constant.
 *
 * The global check comes first. When both are exhausted the honest thing to
 * say is that the service is busy, not that the person has been greedy.
 */
export function judgeDraftBudget({
  accountCallsThisHour,
  globalCallsThisHour,
}: {
  accountCallsThisHour: number;
  globalCallsThisHour: number;
}): BudgetVerdict {
  if (globalCallsThisHour >= DRAFTS_GLOBAL_PER_HOUR) {
    return {
      allowed: false,
      scope: "global",
      // Says it is not about them, and that waiting is the fix. No number:
      // publishing the global ceiling only tells someone what to exhaust.
      reason: "Drafting is busy across the site right now. Try again in an hour.",
    };
  }
  if (accountCallsThisHour >= DRAFTS_PER_ACCOUNT_PER_HOUR) {
    return {
      allowed: false,
      scope: "account",
      reason: `That is ${DRAFTS_PER_ACCOUNT_PER_HOUR} drafts in an hour, which is the limit for one account. Try again later.`,
    };
  }
  return { allowed: true };
}
