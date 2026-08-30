import assert from "node:assert/strict";
import test from "node:test";
import { modelFingerprint, nextRevision } from "@/studio/lib/model-revision.ts";

/** @returns {any} a model that computes, so each case can change one thing. */
function model() {
  return {
    slug: "bolt-stress",
    title: "Bolt stress",
    description: "Average tensile stress from an axial load.",
    domain: "mechanics",
    fields: [
      { id: "force", label: "Axial force", family: "force", defaultValue: 20, defaultUnit: "kN" },
      { id: "area", label: "Stress area", family: "area", defaultValue: 84.3, defaultUnit: "mm²" },
    ],
    outputs: [{ id: "stress", label: "Stress", family: "stress", defaultUnit: "MPa", expression: "force / area" }],
    formula: "σ = F / As",
    purpose: "Screen the mean tensile stress on a bolt.",
    assumptions: ["Load is purely axial."],
    boundary: "Not a joint calculation.",
    interpretation: "Compare against the property class.",
    sourceLabel: "Author",
    sourceUrl: "",
    related: [],
  };
}

test("the same model fingerprints the same way twice", () => {
  assert.equal(modelFingerprint(model()), modelFingerprint(model()));
});

test("changing an expression is drift", () => {
  const edited = model();
  edited.outputs[0].expression = "force / (area * 2)";
  assert.notEqual(modelFingerprint(edited), modelFingerprint(model()));
});

test("changing a unit is drift, because the number moves", () => {
  const edited = model();
  edited.fields[1].defaultUnit = "cm²";
  assert.notEqual(modelFingerprint(edited), modelFingerprint(model()));
});

test("changing a table value is drift", () => {
  const before = model();
  before.tables = [
    {
      id: "t",
      name: "As",
      kind: "keyed",
      matchField: "size",
      columns: [{ id: "as", label: "As", family: "area", unit: "mm²" }],
      rows: [{ key: "M12", values: [84.3] }],
    },
  ];
  const after = structuredClone(before);
  after.tables[0].rows[0].values[0] = 84.5;
  assert.notEqual(modelFingerprint(after), modelFingerprint(before), "a corrected table entry must be visible");
});

/**
 * The judgement the module is built on. A warning that fires when nothing moved
 * is a warning nobody reads by the third time, so prose is deliberately out.
 */
test("editing prose is not drift", () => {
  const edited = model();
  edited.title = "Bolt tensile stress";
  edited.description = "A clearer description entirely.";
  edited.purpose = "Rewritten purpose.";
  edited.boundary = "A longer and better boundary statement.";
  edited.assumptions = ["Load is purely axial through the stress area."];
  edited.sourceLabel = "ISO 898-1";
  assert.equal(modelFingerprint(edited), modelFingerprint(model()));
});

test("changing an example value is not drift", () => {
  // A record carries its own inputs, so the default cannot change what that
  // record computes. Bumping here would warn someone whose numbers had not moved.
  const edited = model();
  edited.fields[0].defaultValue = 50;
  assert.equal(modelFingerprint(edited), modelFingerprint(model()));
});

test("a model with no history starts at revision 1", () => {
  assert.deepEqual(nextRevision(undefined, model()), { revision: 1, fingerprint: modelFingerprint(model()) });
});

test("saving without changing the maths keeps the revision", () => {
  const first = nextRevision(undefined, model());
  const prose = model();
  prose.title = "Renamed";
  assert.equal(nextRevision(first, prose).revision, 1);
});

test("changing the maths advances the revision once per change", () => {
  let state = nextRevision(undefined, model());
  assert.equal(state.revision, 1);

  const second = model();
  second.outputs[0].expression = "force / (area * 2)";
  state = nextRevision(state, second);
  assert.equal(state.revision, 2);

  // Saving the same model again must not keep counting.
  state = nextRevision(state, second);
  assert.equal(state.revision, 2);

  const third = model();
  third.outputs[0].expression = "force / (area * 3)";
  state = nextRevision(state, third);
  assert.equal(state.revision, 3);
});

test("reverting an edit does not pretend the history did not happen", () => {
  // The fingerprint returns to its old value; the revision does not. A reader
  // holding a v1 record and looking at a v3 model that happens to match again
  // is better served by "check it" than by a silent claim of sameness.
  let state = nextRevision(undefined, model());
  const changed = model();
  changed.outputs[0].expression = "force / (area * 2)";
  state = nextRevision(state, changed);
  state = nextRevision(state, model());
  assert.equal(state.revision, 3);
});
