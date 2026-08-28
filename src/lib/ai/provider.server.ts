import { anthropicConfigured, draftWithAnthropic } from "@/lib/ai/provider-anthropic.server";
import { openaiConfigured, draftWithOpenAI } from "@/lib/ai/provider-openai.server";
import type { DraftFailure, DraftResult, ProviderId } from "@/lib/ai/provider-types";

export type { DraftFailure, DraftResult, ProviderId };

/**
 * Which provider this deployment drafts with.
 *
 * `AI_PROVIDER` decides when it is set, and is then honoured even if the key is
 * missing — so a deployment that names a provider and forgets its key reports
 * drafting as unconfigured rather than quietly answering from the other one.
 * Silently falling back would mean a bill on an account nobody meant to use,
 * and a model nobody chose.
 *
 * Unset, the present key decides. OpenAI wins a tie only because a deployment
 * carrying both keys has to resolve somehow; name the provider to be sure.
 */
export function activeProvider(): ProviderId | null {
  const named = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (named === "openai" || named === "anthropic") return named;
  if (named) return null;
  if (openaiConfigured()) return "openai";
  if (anthropicConfigured()) return "anthropic";
  return null;
}

/**
 * Whether drafting is available at all.
 *
 * Absent key, absent feature — the UI never offers it and the server function
 * refuses before doing any work. A half-wired button that fails on click is a
 * worse experience than one that was never shown, and this one would fail after
 * the user had written a paragraph.
 */
export function draftingEnabled() {
  const provider = activeProvider();
  if (provider === "openai") return openaiConfigured();
  if (provider === "anthropic") return anthropicConfigured();
  return false;
}

/**
 * Ask for one calculator, shaped by the schema rather than by hope.
 *
 * Both providers are kept wired so switching is an environment variable rather
 * than a change to this file. They return the same shape, and the caller —
 * `acceptDraft` — applies the same gates to whichever answered: it parses
 * against the same zod schema a human-authored model parses against, it has to
 * compute with its own example values, and its outputs have to be finite.
 *
 * None of that judges whether the physics is right. Nothing here can, which is
 * why the draft is labelled, never auto-published, and lands in the editor
 * rather than in the library.
 */
export async function draftCalculator(brief: string): Promise<DraftResult> {
  const provider = activeProvider();
  if (!provider || !draftingEnabled()) {
    return {
      ok: false,
      failure: { kind: "unavailable", detail: "Drafting is not configured on this deployment." },
    };
  }
  return provider === "openai" ? draftWithOpenAI(brief) : draftWithAnthropic(brief);
}
