import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { stripNulls, toJsonSchema, toStrictJsonSchema } from "@/lib/ai/json-schema";
import { UNIT_IDS } from "@/lib/units";
import { draftedCalculatorSchema } from "@/lib/ai/draft-contract";

/**
 * These guard a failure that produces no error at all.
 *
 * Structured outputs constrain the model exactly as tightly as the schema
 * handed to the API. A transform that drops `additionalProperties: false`, or
 * that leaves an optional key out of `required`, does not throw — the request
 * succeeds and the model is simply freer than intended. The symptom arrives
 * later, as a draft that fails validation for no visible reason.
 */

/**
 * @param {any} node
 * @param {(node: any) => void} visit
 */
function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) walk(value, visit);
}

test("every object is closed and lists every property as required", () => {
  const schema = /** @type {any} */ (toStrictJsonSchema(draftedCalculatorSchema));
  let objects = 0;
  walk(schema, (node) => {
    if (!node.properties || typeof node.properties !== "object") return;
    objects += 1;
    assert.equal(node.additionalProperties, false, "an open object lets the model invent keys");
    assert.deepEqual(
      [...(node.required ?? [])].sort(),
      Object.keys(node.properties).sort(),
      "strict mode has no notion of optional — every key must be required",
    );
  });
  assert.ok(objects > 3, `expected the contract to contain several objects, saw ${objects}`);
});

test("keys that were optional become nullable rather than disappearing", () => {
  const schema = z.object({
    needed: z.string(),
    spare: z.string().optional(),
    choice: z.enum(["a", "b"]).optional(),
  });
  const strict = /** @type {any} */ (toStrictJsonSchema(schema));
  assert.deepEqual([...strict.required].sort(), ["choice", "needed", "spare"]);

  // A plain type widens in place; an enum cannot, because "null" would not be
  // one of its members — so that one is wrapped instead.
  assert.deepEqual(strict.properties.spare.type, ["string", "null"]);
  assert.ok(Array.isArray(strict.properties.choice.anyOf), "an enum must be wrapped, not retyped");
  assert.ok(strict.properties.choice.anyOf.some((/** @type {any} */ branch) => branch.type === "null"));

  // A required key is left exactly as it was.
  assert.equal(strict.properties.needed.type, "string");
});

test("the non-strict schema is left alone, so Anthropic still sees optionals", () => {
  const plain = /** @type {any} */ (toJsonSchema(draftedCalculatorSchema));
  const required = new Set(plain.required ?? []);
  assert.ok(!required.has("constraints"), "constraints is optional in the contract");
  assert.equal(plain.$schema, undefined, "the dialect marker is noise to the API");
});

test("nulls are stripped, because zod optional means absent and not null", () => {
  const cleaned = stripNulls({
    title: "Hoop stress",
    fields: [{ id: "p", help: null, nested: { symbol: null, keep: 0 } }],
    constraints: null,
  });
  assert.deepEqual(cleaned, { title: "Hoop stress", fields: [{ id: "p", nested: { keep: 0 } }] });
});

test("stripping keeps falsy values that are not null", () => {
  // The bug this pins: a filter written as `if (!value) continue` would delete
  // a zero default, an empty string, and false — all legitimate here.
  assert.deepEqual(stripNulls({ a: 0, b: "", c: false, d: null }), { a: 0, b: "", c: false });
});

/**
 * Found by using the button, not by reading the code.
 *
 * The brief was "how much does a steel bar weigh", and it failed three times on
 * this one property. `Unknown unit family.` when `family` went out as a bare
 * string. `Select compatible units (area: mm^2)` once the family was an enum
 * but the unit was not. Then family `massFlow` with unit `kg/m3` — two enums,
 * each satisfied, describing a pair that does not exist.
 *
 * The third one is why the contract asks once, for a `family.unit` id. Two
 * independent enums cannot express a dependency, and strict structured outputs
 * have no `if`/`then` to add one, so the only way to make the pair valid is to
 * stop treating it as a pair.
 */
test("the unit is one closed identifier naming both family and unit", () => {
  const plain = /** @type {any} */ (toJsonSchema(draftedCalculatorSchema));
  for (const where of ["fields", "outputs"]) {
    const properties = plain.properties[where].items.properties;
    assert.deepEqual(properties.unit.enum, [...UNIT_IDS], `${where} must offer every known unit`);
    assert.equal(properties.family, undefined, `${where} must not ask for the family separately`);
    assert.equal(properties.defaultUnit, undefined, `${where} must not ask for the unit separately`);
  }
  // The pair that failed: both halves legal, the combination not.
  assert.ok(UNIT_IDS.includes("density.kg_m3"));
  assert.ok(!UNIT_IDS.includes("massFlow.kg_m3"), "the id form is what makes the mismatch unrepresentable");

  const strict = /** @type {any} */ (toStrictJsonSchema(draftedCalculatorSchema));
  const node = strict.properties.fields.items.properties.unit;
  const enumerated = node.enum ?? (node.anyOf ?? []).find((/** @type {any} */ e) => Array.isArray(e.enum))?.enum;
  assert.deepEqual(enumerated, [...UNIT_IDS], "the enum must survive the strict transform");
});
