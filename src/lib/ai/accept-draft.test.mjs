import assert from "node:assert/strict";
import test from "node:test";
import { acceptDraft } from "@/lib/ai/accept-draft";
import { toJsonSchema } from "@/lib/ai/json-schema";
import { DRAFT_SYSTEM_PROMPT, draftedCalculatorSchema } from "@/lib/ai/draft-contract";

const sound = {
  title: "Hoop stress",
  description: "Membrane hoop stress in a thin-walled cylinder under internal pressure.",
  domain: "mechanics",
  fields: [
    { id: "pressure", label: "Internal pressure", family: "pressure", defaultValue: 1.2, defaultUnit: "MPa" },
    { id: "diameter", label: "Inside diameter", family: "length", defaultValue: 600, defaultUnit: "mm" },
    { id: "thickness", label: "Wall thickness", family: "length", defaultValue: 12, defaultUnit: "mm" },
  ],
  outputs: [
    { id: "hoop", label: "Hoop stress", family: "stress", defaultUnit: "MPa", expression: "pressure*diameter/(2*thickness)" },
  ],
  formula: "σ = pD / 2t",
  purpose: "Screen a thin-walled cylinder for membrane hoop stress.",
  assumptions: ["Thin wall", "Uniform internal pressure"],
  boundary: "Not valid below a diameter-to-thickness ratio of 20.",
  interpretation: "Hoop stress",
};

test("a sound draft is accepted and comes back with a worked example", () => {
  const outcome = acceptDraft(sound);
  assert.equal(outcome.ok, true, outcome.ok ? "" : outcome.reason);
  assert.equal(outcome.draft.title, "Hoop stress");
  assert.equal(outcome.preview.length, 1);
  // 1.2 MPa x 600 mm / (2 x 12 mm) = 30 MPa.
  assert.equal(outcome.preview[0].display, "30");
});

// The gate exists for output that parses and is still not usable. Each of these
// would otherwise reach the editor looking like somebody's work.
test("a draft that does not compute is refused, not shown", () => {
  const broken = { ...sound, outputs: [{ ...sound.outputs[0], expression: "pressure / nonexistent" }] };
  const outcome = acceptDraft(broken);
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /does not compute/i);
});

test("a draft whose result is not finite is refused", () => {
  const infinite = { ...sound, outputs: [{ ...sound.outputs[0], expression: "pressure / (thickness - thickness)" }] };
  const outcome = acceptDraft(infinite);
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /does not compute|finite/i);
});

test("a draft that misses the contract is refused whole, never partly applied", () => {
  const { outputs: _outputs, ...noOutputs } = sound;
  const outcome = acceptDraft(noOutputs);
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /contract/i);
});

test("colliding identifiers are caught before evaluation", () => {
  const collide = { ...sound, outputs: [{ ...sound.outputs[0], id: "pressure" }] };
  const outcome = acceptDraft(collide);
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /both an input and a result/i);
});

test("the model cannot author the fields that decide how a model is treated", () => {
  // slug and published are not in the drafting contract. Offering them must be
  // rejected rather than ignored: silently dropping them would let a future
  // change quietly start honouring them.
  const overreach = { ...sound, slug: "hand-verified", published: true };
  const outcome = acceptDraft(overreach);
  assert.equal(outcome.ok, false);
});

test("the schema handed to the model forbids invented keys", () => {
  // Structured outputs only constrain as tightly as the schema does; without
  // these two properties the constraint quietly becomes a suggestion.
  const schema = toJsonSchema(draftedCalculatorSchema);
  assert.equal(schema.additionalProperties, false);
  assert.ok(Array.isArray(schema.required) && schema.required.includes("outputs"));
  assert.ok(!("$schema" in schema));
});

test("an accepted draft is stamped as drafted, and cannot stamp itself", () => {
  const outcome = acceptDraft(sound);
  assert.equal(outcome.ok, true, outcome.ok ? "" : outcome.reason);
  assert.equal(outcome.draft.provenance, "assisted", "the label has to survive past the dialog that shows it");

  // The contract does not include `provenance`, and is `.strict()`, so a model
  // that tries to describe itself as hand-authored is rejected outright rather
  // than quietly overriding the stamp.
  const claiming = acceptDraft({ ...sound, provenance: undefined });
  assert.equal(claiming.ok, false, "a key outside the contract must not be accepted");
});

test("the contract the model works to does not expose provenance", () => {
  const schema = /** @type {any} */ (toJsonSchema(draftedCalculatorSchema));
  assert.equal(schema.properties.provenance, undefined, "the model must not be able to author its own provenance");
});

/**
 * The drafting prompt is code in every way that matters, and this rule was
 * learned by breaking it. Telling the model to "use MPa, not Pa" without
 * forbidding it to scale the expression produced a draft reading
 * 1,000,000 MPa — 10^12 Pa, off by a factor of a million — because the model
 * converted in the expression *and* the application converted again for
 * display. Before that instruction existed the same brief gave 5.000e+7 Pa:
 * right number, unreadable unit.
 *
 * `acceptDraft` did not catch it. It parses, computes and checks the result is
 * finite; it has no opinion about whether a stress of 10^12 Pa is plausible. So
 * the guard has to live in the prompt, and this pins it there.
 */
test("the prompt tells the model not to scale the expression to match the unit", () => {
  assert.match(DRAFT_SYSTEM_PROMPT, /LABEL ONLY/, "the display unit must be described as a label");
  assert.match(
    DRAFT_SYSTEM_PROMPT,
    /Do not scale, divide or convert/i,
    "the prompt must forbid converting inside the expression",
  );
  assert.match(
    DRAFT_SYSTEM_PROMPT,
    /1e6/,
    "the prompt should name the failure it prevents, not just the rule",
  );
  assert.match(DRAFT_SYSTEM_PROMPT, /SI base units/, "rule 4 must still require SI in the relation");
});
