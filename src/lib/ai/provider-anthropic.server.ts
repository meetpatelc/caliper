import Anthropic from "@anthropic-ai/sdk";
import { toJsonSchema } from "@/lib/ai/json-schema";
import { draftedCalculatorSchema, DRAFT_SYSTEM_PROMPT } from "@/lib/ai/draft-contract";
import type { DraftResult } from "@/lib/ai/provider-types";

export function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * The model. Not configurable by the caller on purpose: the request runs on the
 * deployer's key, so the choice of model is a spending decision that belongs to
 * whoever pays for it, not to whoever types in the box.
 */
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";

let client: Anthropic | undefined;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

export async function draftWithAnthropic(brief: string): Promise<DraftResult> {
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
