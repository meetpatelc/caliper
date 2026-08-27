import { z } from "zod";

/**
 * The drafting contract, as JSON Schema for structured outputs.
 *
 * Zod 4 converts this natively, which is worth preferring over a hand-rolled
 * walk: structured outputs only constrain the model as tightly as the schema
 * does, and the two properties that matter — `additionalProperties: false` and
 * a complete `required` list — are exactly the ones a partial converter drops
 * silently. A loosened schema does not fail; it just quietly lets the model
 * return keys nothing validates.
 *
 * `io: "input"` because the model is producing the value that will be *parsed*,
 * not the value zod outputs after transforms.
 */
export function toJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { io: "input", target: "draft-2020-12" }) as Record<string, unknown>;
  // The dialect marker is meaningful to a validator and noise to the API.
  delete generated.$schema;
  return generated;
}
