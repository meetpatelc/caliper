import Anthropic from "@anthropic-ai/sdk";
import { toJsonSchema } from "@/lib/ai/json-schema";
import { draftedCalculatorSchema, DRAFT_SYSTEM_PROMPT } from "@/lib/ai/draft-contract";

/**
 * Whether drafting is available at all.
 *
 * Absent key, absent feature — the UI never offers it and the server function
 * refuses before doing any work. A half-wired button that fails on click is a
 * worse experience than one that was never shown, and this one would fail after
 * the user had written a paragraph.
 */
export function draftingEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * The model. Not configurable by the caller on purpose: the request runs on the
 * deployer's key, so the choice of model is a spending decision that belongs to
 * whoever pays for it, not to whoever types in the box.
 */
const MODEL = "claude-opus-5";

let client: Anthropic | undefined;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

export type DraftFailure = { kind: "unavailable" | "refused" | "malformed" | "upstream"; detail: string };

/**
 * Ask for one calculator, shaped by the schema rather than by hope.
 *
 * Structured outputs constrain the response to the drafting contract, so the
 * usual failure — prose wrapped around JSON, or JSON that nearly fits — cannot
 * happen at this layer. What can still happen is a well-formed calculator that
 * is wrong, which is why nothing here treats a successful parse as a
 * successful draft; that judgement belongs to the caller, and ultimately to a
 * person.
 */
export async function draftCalculator(brief: string): Promise<
  { ok: true; value: unknown } | { ok: false; failure: DraftFailure }
> {
  if (!draftingEnabled()) {
    return { ok: false, failure: { kind: "unavailable", detail: "Drafting is not configured on this deployment." } };
  }
  try {
    const response = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: DRAFT_SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: toJsonSchema(draftedCalculatorSchema),
        },
      },
      messages: [{ role: "user", content: brief }],
    });

    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        failure: { kind: "refused", detail: "The model declined this brief. Rephrase it as an engineering relation." },
      };
    }

    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") {
      return { ok: false, failure: { kind: "malformed", detail: "The model returned no calculator." } };
    }
    try {
      return { ok: true, value: JSON.parse(text.text) };
    } catch {
      return { ok: false, failure: { kind: "malformed", detail: "The model's answer was not valid JSON." } };
    }
  } catch (error) {
    // Typed first, so a rate limit reads as a rate limit rather than as a
    // generic failure the user is invited to retry immediately.
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, failure: { kind: "upstream", detail: "Busy right now. Try again shortly." } };
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, failure: { kind: "unavailable", detail: "Drafting is misconfigured on this deployment." } };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, failure: { kind: "upstream", detail: `Drafting failed (${error.status}).` } };
    }
    return { ok: false, failure: { kind: "upstream", detail: "Drafting failed." } };
  }
}
