-- Every AI draft spends the deployer's money on somebody else's request.
--
-- The limit was an in-memory Map keyed by user id. That is not a limit on a
-- serverless platform: each instance carries its own Map, a cold start begins
-- at zero, and the number of instances is decided by traffic. The real ceiling
-- was accounts x concurrent instances -- and sign-up is open, so accounts are
-- free to mint. A bill, waiting.
--
-- One row per call, so the count is a fact in the database rather than a hope
-- about which instance answered. Two windows read off the same table: per
-- account, so one person cannot spend the budget, and global, so everybody
-- together cannot either. The global one is the money backstop; feedback has
-- had the same shape since it shipped.
--
-- Rows are the audit trail as well as the counter. Nothing here records what
-- was asked for -- the brief goes to the provider and is never stored -- only
-- that an account spent a call at a time.
create table if not exists ai_draft_calls (
  id         text not null primary key,
  user_id    text not null,
  created_at timestamptz not null default now()
);

-- Both queries filter on created_at within the last hour; the per-account one
-- filters on user_id first. Without these, the count degrades as the table
-- grows and the rate check becomes the slowest part of the request.
create index if not exists ai_draft_calls_created_at_idx on ai_draft_calls (created_at);
create index if not exists ai_draft_calls_user_created_idx on ai_draft_calls (user_id, created_at);
