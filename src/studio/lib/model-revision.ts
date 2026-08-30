import type { CalculatorDefinition } from "@/studio/lib/calculator-types";

/**
 * A revision number for a calculator someone built, bumped only when the
 * answer can change.
 *
 * Library models carry a hand-written `formulaVersion`, and `/record/` uses it
 * to tell a reader "this was made with v1.0.0, the current model is v1.1.0, so
 * the numbers below may differ from the ones the sender saw". That is the most
 * valuable thing in the app and Build calculators had no part in it:
 * `calculatorSchema` has no version field at all, so a record made from one
 * could never say whether the model had moved underneath it.
 *
 * Derived rather than typed, because a version somebody has to remember to bump
 * is a version that is wrong exactly when it matters — after a hurried fix. The
 * fingerprint is computed from the model itself, and the revision advances when
 * it changes.
 *
 * What goes into the fingerprint is the whole design. Only the parts that can
 * move a number: expressions, units, families, tables, constraints, the field
 * and output identifiers those refer to. Not the title, not the purpose, not
 * the boundary, and *not* the example values — a record carries its own inputs,
 * so changing the default cannot change what the record computes. Including
 * prose would bump the revision on a typo fix and put a warning in front of
 * someone whose numbers had not moved, which is how a warning stops being read.
 */

/** The parts of a calculator that can change what it computes. */
function computationalShape(model: CalculatorDefinition) {
  return {
    fields: model.fields.map((field) => ({
      id: field.id,
      family: field.family ?? null,
      unit: field.defaultUnit,
      input: field.input ?? null,
      // Which options exist changes which table rows are reachable.
      options: field.options?.map((option) => option.value) ?? null,
      minimum: field.minimum ?? null,
      maximum: field.maximum ?? null,
    })),
    outputs: model.outputs.map((output) => ({
      id: output.id,
      family: output.family ?? null,
      unit: output.defaultUnit,
      expression: output.expression,
      precision: output.precision ?? null,
    })),
    tables:
      model.tables?.map((table) => ({
        id: table.id,
        kind: table.kind,
        matchField: table.matchField,
        matchUnit: table.matchUnit ?? null,
        columns: table.columns.map((column) => ({ id: column.id, family: column.family ?? null, unit: column.unit })),
        rows: table.rows.map((row) => ({ key: row.key ?? null, min: row.min ?? null, max: row.max ?? null, values: row.values })),
      })) ?? null,
    constraints:
      model.constraints?.map((constraint) => ({
        expression: constraint.expression,
        min: constraint.min ?? null,
        max: constraint.max ?? null,
        gt: constraint.gt ?? null,
        lt: constraint.lt ?? null,
        severity: constraint.severity ?? "error",
      })) ?? null,
  };
}

/**
 * FNV-1a, run twice with different offsets and concatenated.
 *
 * Sixteen hex characters rather than eight. A collision here does not corrupt
 * anything — it means a drift warning that should have appeared does not — and
 * a silently missing warning is the exact failure this module exists to
 * prevent, so the extra pass is worth its cost.
 */
function hash(text: string) {
  const pass = (offset: number) => {
    let value = offset;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 0x01000193) >>> 0;
    }
    return value.toString(16).padStart(8, "0");
  };
  return `${pass(0x811c9dc5)}${pass(0x7fffffff)}`;
}

/** A stable string for the model's computational shape. */
export function modelFingerprint(model: CalculatorDefinition): string {
  return hash(JSON.stringify(computationalShape(model)));
}

export type Revisioned = { revision?: number; fingerprint?: string };

/**
 * The revision to show and stamp.
 *
 * Anything saved before this existed has no stored revision, and calling that
 * v1 is the honest reading: it has one version, the one in front of you.
 */
export function revisionOf(model: Revisioned): number {
  return model.revision ?? 1;
}

/**
 * The revision and fingerprint an edited model should carry.
 *
 * A model with no stored fingerprint is at revision 1 — it has not drifted from
 * anything, and starting it higher would imply a history that does not exist.
 */
export function nextRevision(previous: Revisioned | undefined, model: CalculatorDefinition): Required<Revisioned> {
  const fingerprint = modelFingerprint(model);
  if (!previous?.fingerprint) return { revision: previous?.revision ?? 1, fingerprint };
  if (previous.fingerprint === fingerprint) {
    return { revision: previous.revision ?? 1, fingerprint };
  }
  return { revision: (previous.revision ?? 1) + 1, fingerprint };
}
