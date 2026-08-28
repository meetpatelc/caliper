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

/**
 * The same contract, in the shape OpenAI's strict mode insists on.
 *
 * Strict mode is stricter than JSON Schema: every object must list *every*
 * property in `required` and set `additionalProperties: false`. There is no
 * way to say "optional". The supported way to express an absent value is a
 * nullable type, so that is what an optional property becomes here.
 *
 * Done as a transform at the boundary, deliberately, rather than by rewriting
 * `calculatorSchema`. That schema is what the Studio editor validates against
 * and what every saved calculator already satisfies; bending it to suit one
 * vendor's decoder would push a serialisation detail into the middle of the
 * app. The provider adapts to the contract, not the other way round.
 *
 * The nulls this invites back are removed by `stripNulls` before zod sees the
 * response, because zod's `.optional()` means absent, not null.
 */
export function toStrictJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  return strictify(toJsonSchema(schema)) as Record<string, unknown>;
}

/** Subschema keys whose values are single schemas. */
const SINGLE = ["items", "additionalItems", "not", "if", "then", "else", "contains"];
/** Subschema keys whose values are arrays of schemas. */
const MANY = ["anyOf", "oneOf", "allOf", "prefixItems"];
/** Keys whose values are maps of name to schema. */
const NAMED = ["$defs", "definitions", "properties"];

function strictify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictify);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = { ...(node as Record<string, unknown>) };

  for (const key of NAMED) {
    const bag = out[key];
    if (bag && typeof bag === "object" && !Array.isArray(bag)) {
      out[key] = Object.fromEntries(
        Object.entries(bag as Record<string, unknown>).map(([name, value]) => [name, strictify(value)]),
      );
    }
  }
  for (const key of SINGLE) {
    if (out[key] !== undefined) out[key] = strictify(out[key]);
  }
  for (const key of MANY) {
    if (Array.isArray(out[key])) out[key] = (out[key] as unknown[]).map(strictify);
  }

  const properties = out.properties;
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
    const bag = properties as Record<string, unknown>;
    const names = Object.keys(bag);
    const alreadyRequired = new Set(Array.isArray(out.required) ? (out.required as string[]) : []);
    for (const name of names) {
      if (!alreadyRequired.has(name)) bag[name] = nullable(bag[name]);
    }
    out.required = names;
    out.additionalProperties = false;
  }
  return out;
}

/**
 * Widen a schema to admit null.
 *
 * A plain `type` becomes a two-member type list, which keeps the schema
 * readable. Anything with an `enum` or a composition keyword is wrapped in
 * `anyOf` instead — adding "null" to the type of an enum would describe a value
 * the enum itself still forbids.
 */
function nullable(schema: unknown): unknown {
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    const node = schema as Record<string, unknown>;
    const composed = node.enum !== undefined || MANY.some((key) => node[key] !== undefined) || node.$ref !== undefined;
    if (typeof node.type === "string" && !composed) {
      return { ...node, type: [node.type, "null"] };
    }
  }
  return { anyOf: [schema, { type: "null" }] };
}

/**
 * Drop every null the strict schema invited back in.
 *
 * `.optional()` in zod means the key is absent, not that it is null — so a
 * response echoing `"help": null` fails validation on a field the model was
 * right to leave out. Nothing in the drafting contract is legitimately null,
 * which is what makes this safe to do wholesale.
 */
export function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripNulls(item)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === null) continue;
      out[key] = stripNulls(item);
    }
    return out as unknown as T;
  }
  return value;
}
