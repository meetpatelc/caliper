import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { acceptDraft } from "@/lib/ai/accept-draft";
import { draftRequestSchema, type DraftOutcome } from "@/lib/ai/draft-contract";

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
const WINDOW_MS = 60 * 60 * 1000;
const PER_HOUR = 10;
const recent = new Map<string, number[]>();

function withinRate(userId: string) {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= PER_HOUR) {
    recent.set(userId, hits);
    return false;
  }
  hits.push(now);
  recent.set(userId, hits);
  return true;
}

export const draftCalculatorFromBrief = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => draftRequestSchema.parse(data))
  .handler(async ({ context, data }): Promise<DraftOutcome> => {
    if (!withinRate(context.userId)) {
      return { ok: false, reason: "That is a lot of drafts in one hour. Try again later." };
    }
    // Imported here so the SDK and the key never enter a client bundle.
    const { draftCalculator, draftingEnabled } = await import("@/lib/ai/provider.server");
    if (!draftingEnabled()) {
      return { ok: false, reason: "Drafting is not configured on this deployment." };
    }
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
