import OpenAI from "openai";
import { stripNulls, toStrictJsonSchema } from "@/lib/ai/json-schema";
import { draftedCalculatorSchema, DRAFT_SYSTEM_PROMPT } from "@/lib/ai/draft-contract";
import type { DraftResult } from "@/lib/ai/provider-types";

export function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Not configurable by the caller, for the same reason the Anthropic one is not:
 * the request runs on the deployer's key. Overridable by the deployer through
 * the environment, because which models an account can reach differs per
 * account and a hard-coded name is a support ticket waiting to happen.
 */
const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5";

let client: OpenAI | undefined;
function openai() {
  client ??= new OpenAI();
  return client;
}

/**
 * Ask for one calculator, shaped by the schema rather than by hope.
 *
 * Uses the Responses API with `strict: true`, which constrains decoding to the
 * schema — so the usual failure, prose wrapped around JSON, cannot happen at
 * this layer. What can still happen is a well-formed calculator that is wrong,
 * which is why nothing here treats a successful parse as a successful draft.
 */
export async function draftWithOpenAI(brief: string): Promise<DraftResult> {
  try {
    const response = await openai().responses.create({
      model: MODEL,
      instructions: DRAFT_SYSTEM_PROMPT,
      input: brief,
      // Covers reasoning *and* the answer on a reasoning model, which is why
      // 16000 was not enough: a draft that reasoned for two minutes ran past
      // it and came back truncated, reported as "ran past the length limit".
      // The JSON itself is on the order of 1500 tokens; the rest is thinking.
      max_output_tokens: 48000,
      text: {
        format: {
          type: "json_schema",
          name: "drafted_calculator",
          schema: toStrictJsonSchema(draftedCalculatorSchema),
          strict: true,
        },
      },
    });

    // A refusal is a content part, not an error, and it carries the only
    // explanation the caller will get.
    for (const item of response.output ?? []) {
      if (item.type !== "message") continue;
      const refusal = item.content?.find((part) => part.type === "refusal");
      if (refusal && refusal.type === "refusal") {
        return {
          ok: false,
          failure: {
            kind: "refused",
            detail: "The model declined this brief. Rephrase it as an engineering relation.",
          },
        };
      }
    }

    // Truncation is worth naming separately: the JSON is invalid because it
    // stops mid-value, and "not valid JSON" would send someone hunting for a
    // syntax problem that is really a length problem.
    if (response.status === "incomplete") {
      const reason = response.incomplete_details?.reason ?? "unknown";
      return {
        ok: false,
        failure: {
          kind: "malformed",
          detail:
            reason === "max_output_tokens"
              ? "The draft ran past the length limit. Ask for a smaller calculator."
              : `The model stopped early (${reason}).`,
        },
      };
    }

    const text = response.output_text;
    if (!text) {
      return { ok: false, failure: { kind: "malformed", detail: "The model returned no calculator." } };
    }
    try {
      // Strict mode requires every optional key to be present and nullable, so
      // the response says `"help": null` where the contract means "absent".
      return { ok: true, value: stripNulls(JSON.parse(text)) };
    } catch {
      return { ok: false, failure: { kind: "malformed", detail: "The model's answer was not valid JSON." } };
    }
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      return { ok: false, failure: { kind: "upstream", detail: "Busy right now. Try again shortly." } };
    }
    if (error instanceof OpenAI.AuthenticationError) {
      return { ok: false, failure: { kind: "unavailable", detail: "Drafting is misconfigured on this deployment." } };
    }
    // 400 is almost always the schema, not the brief — strict mode rejects
    // keywords it does not support, and the message names the offending one.
    // Surfacing it is the difference between a one-line fix and a guess.
    if (error instanceof OpenAI.BadRequestError) {
      console.error("[drafting] OpenAI rejected the request:", error.message);
      return { ok: false, failure: { kind: "upstream", detail: "Drafting is misconfigured on this deployment." } };
    }
    if (error instanceof OpenAI.APIError) {
      return { ok: false, failure: { kind: "upstream", detail: `Drafting failed (${error.status}).` } };
    }
    return { ok: false, failure: { kind: "upstream", detail: "Drafting failed." } };
  }
}
