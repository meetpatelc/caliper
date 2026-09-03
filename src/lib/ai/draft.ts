import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { acceptDraft } from "@/lib/ai/accept-draft";
import { draftRequestSchema, type DraftOutcome } from "@/lib/ai/draft-contract";
import { judgeDraftBudget, type BudgetVerdict } from "@/lib/ai/draft-budget";

/**
 * Draft a calculator from a written brief.
 *
 * Signed in, and rate limited per account. Both matter for the same reason:
 * every call spends the deployer's money on somebody else's request. An
 * anonymous endpoint that bills the owner per invocation is a bill waiting to
 * be run up, and it is the kind of thing that is obvious only after it happens.
 *
 * The draft is returned to the caller, never persisted and never published. It
 * lands in the Studio editor as an unsaved draft so the person who asked for it
 * has to look at it before it can become anything.
 */
/**
 * Count the last hour, decide, and record the call.
 *
 * This was a `Map<string, number[]>` in module scope, and on a serverless
 * platform that is not a rate limit. Each instance carries its own Map, a cold
 * start begins at zero, and the number of instances is chosen by traffic — so
 * the real ceiling was accounts times concurrent instances. Sign-up is open, so
 * accounts are free to mint. The counter has to live where the money does.
 *
 * The insert happens before the provider call, not after. A draft that fails
 * upstream still cost a request and still has to count, or a failing key
 * becomes an unmetered retry loop. Charging for the attempt is the safe
 * direction to be wrong in.
 *
 * Not transactional, and does not need to be. Two calls racing can both read
 * ninety-nine and both proceed; the overrun is bounded by concurrency and the
 * next call sees a hundred and one. A lock here would serialise every draft to
 * protect against being one over an hourly cap that is itself a judgement.
 */
async function spendDraftCall(userId: string): Promise<BudgetVerdict> {
  const { getSql } = await import("@/lib/db");
  // node:crypto rather than the global. Dynamically imported like the db, so it
  // never enters a client bundle, and guaranteed present on the server — the
  // one place in this repo that reaches for the global `crypto` guards it with
  // a fallback, which suggests a runtime here has lacked it.
  const { randomUUID } = await import("node:crypto");
  const sql = await getSql();
  const [counts] = await sql<{ account: number; global: number }>`
    select
      count(*) filter (where user_id = ${userId})::int as account,
      count(*)::int as global
    from ai_draft_calls
    where created_at > now() - interval '1 hour'
  `;
  const verdict = judgeDraftBudget({
    accountCallsThisHour: counts?.account ?? 0,
    globalCallsThisHour: counts?.global ?? 0,
  });
  if (!verdict.allowed) return verdict;
  await sql`
    insert into ai_draft_calls (id, user_id)
    values (${randomUUID()}, ${userId})
  `;
  /*
   * Drop what can no longer affect a decision.
   *
   * Nothing read these rows beyond the last hour, and nothing deleted them, so
   * the table was pure growth carrying a per-account timestamp long after it
   * stopped counting for anything. A day of history is far more than the
   * one-hour window needs and leaves room to look at recent usage by hand.
   *
   * On the insert path rather than a scheduled job: it runs exactly when rows
   * are created, needs no scheduler, and is bounded by the same cap that
   * bounds the inserts. Failing to prune must not fail the draft the caller
   * paid for, so it is deliberately swallowed — the next call tries again.
   */
  try {
    await sql`delete from ai_draft_calls where created_at < now() - interval '1 day'`;
  } catch {
    /* housekeeping, not the request */
  }
  return verdict;
}

export const draftCalculatorFromBrief = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => draftRequestSchema.parse(data))
  .handler(async ({ context, data }): Promise<DraftOutcome> => {
    // Imported here so the SDK and the key never enter a client bundle.
    const { draftCalculator, draftingEnabled } = await import("@/lib/ai/provider.server");
    // Configuration before budget: a deployment with no key spends nothing, and
    // charging a call against an account for a service that cannot run would be
    // a limit on a thing that never happened.
    if (!draftingEnabled()) {
      return { ok: false, reason: "Drafting is not configured on this deployment." };
    }
    const budget = await spendDraftCall(context.userId);
    if (!budget.allowed) return { ok: false, reason: budget.reason };
    const result = await draftCalculator(data.brief);
    if (!result.ok) return { ok: false, reason: result.failure.detail };
    return acceptDraft(result.value);
  });

/**
 * Whether the UI should offer drafting at all.
 *
 * Deliberately separate and unauthenticated: the client needs to know whether
 * to render the control before it knows who is looking, and the answer leaks
 * nothing beyond "this deployment has drafting configured".
 */
export const draftingAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { draftingEnabled } = await import("@/lib/ai/provider.server");
  return { enabled: draftingEnabled() };
});
