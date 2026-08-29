import type { InstrumentDocument } from "@/lib/document";
import type { FieldDefinition, TableDefinition } from "@/studio/lib/calculator-types";

/**
 * Translate a library document's lookups into the tables Studio understands.
 *
 * "Fork in studio" copies a shipped model into the editor so it can be fixed by
 * the person who found the fault rather than by whoever owns the repository.
 * For a plain formula model that worked. For the thirteen models that look a
 * value up — beam, lmtd, mmc, the bearing lives — it produced a calculator
 * whose expressions referenced tables that were never copied, and the editor
 * opened on `Unknown table "reactionDenom"`: an error about something the
 * person forking had never seen, on a model that works perfectly on its own
 * page.
 *
 * The two halves of the app express the same idea differently. A library
 * document holds `lookups` — a map from a choice value to a number — and reads
 * it with a `lookup(table, field)` call inside the expression. Studio holds
 * `tables` with rows and columns, matches a row from the input, and puts each
 * column into scope under its own name. Neither is wrong; they were written
 * eighteen months apart for different jobs.
 *
 * So this converts rather than copies, which means rewriting the expressions
 * too: `lookup(deflDenom, case)` becomes `deflDenom`, because in Studio the
 * matched row has already put that name in scope.
 *
 * It could only be written now. Before the table editor existed there was
 * nowhere for a converted table to go — a fork carrying `tables` would have
 * been a calculator with a section its own editor could not display.
 */

/** `lookup(name, field)` — the only form the library uses. */
const LOOKUP_CALL = /\blookup\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;

export type Adopted = {
  fields: FieldDefinition[];
  tables: TableDefinition[] | undefined;
  /** Expressions with every `lookup(...)` replaced by the column's own name. */
  rewrite: (expression: string) => string;
};

/**
 * Which input each lookup is keyed on, read from the expressions that use it.
 *
 * The document does not record the pairing anywhere — it lives only in the call
 * site, which is fine when the engine resolves it at evaluation time and no use
 * at all when it has to be turned into a table with a `matchField`.
 */
function keyedBy(document: InstrumentDocument) {
  const pairs = new Map<string, string>();
  const sources = [
    ...document.outputs.map((output) => output.expression),
    ...document.outputs.map((output) => output.when ?? ""),
  ];
  for (const source of sources) {
    for (const [, table, field] of source.matchAll(LOOKUP_CALL)) {
      const existing = pairs.get(table);
      // A lookup read against two different inputs cannot become one table.
      // Recorded as a clash rather than silently taking the first.
      if (existing && existing !== field) pairs.set(table, "");
      else if (!existing) pairs.set(table, field);
    }
  }
  return pairs;
}

export function adoptDocument(document: InstrumentDocument): Adopted {
  const fields: FieldDefinition[] = document.fields.map((field) => {
    if (!field.choice?.length) return { ...field } as FieldDefinition;
    // The library states the allowed strings; Studio wants value/label options
    // and an explicit `input` so the editor renders a dropdown rather than a
    // number box that silently rejects every entry.
    return {
      ...field,
      input: "choice",
      options: field.choice.map((value) => ({ value, label: value })),
      defaultOption: field.choice[0],
      family: field.family ?? "dimensionless",
      defaultUnit: field.defaultUnit || "1",
    } as FieldDefinition;
  });

  const pairs = keyedBy(document);
  const tables: TableDefinition[] = [];
  for (const [name, rows] of Object.entries(document.lookups ?? {})) {
    const matchField = pairs.get(name);
    // No call site, or two conflicting ones: leaving the table out would break
    // the fork silently, so the lookup is left alone and the expression keeps
    // its `lookup(...)` call — which the editor then reports honestly.
    if (!matchField) continue;
    tables.push({
      id: `${name}Table`.slice(0, 32),
      name,
      kind: "keyed",
      matchField,
      // No family: a lookup value is a bare coefficient — a denominator, a
      // life exponent, a 1/0 flag — and giving it one would invite a
      // conversion that has no meaning.
      columns: [{ id: name, label: name, family: undefined, unit: "1" }],
      rows: Object.entries(rows).map(([key, value]) => ({ key, values: [value] })),
    });
  }

  const convertible = new Set(tables.map((table) => table.name));
  const rewrite = (expression: string) =>
    expression.replace(LOOKUP_CALL, (whole, table: string) => (convertible.has(table) ? table : whole));

  return { fields, tables: tables.length ? tables : undefined, rewrite };
}

/**
 * Whether a document survives the trip into Studio unchanged.
 *
 * `isStudioDocument` only asked whether a document had a slug, fields and
 * outputs, so the fork button appeared on all 159 — including the ones that use
 * features Studio has no way to express. A conditional output is the one that
 * matters: Studio shows every result always, so forking `taylorToolLife`, whose
 * six outputs each carry a `when`, produces a calculator that computes and
 * displays the two results belonging to the mode you did not pick. Nothing
 * errors. It simply answers a question nobody asked, which on this product is
 * the worst of the available failures.
 *
 * Offering no button is the honest answer until Studio can carry the feature.
 */
export function adoptionLoss(document: InstrumentDocument): string | undefined {
  if (document.outputs.some((output) => output.when)) {
    return "shows different results depending on a choice, which Build cannot express yet";
  }
  if (document.outputs.some((output) => output.labels || output.labelChoice)) {
    return "renames its results depending on a choice, which Build cannot express yet";
  }
  if (document.warningsBy || document.methods) {
    return "changes its warnings or its method text depending on a choice, which Build cannot express yet";
  }
  return undefined;
}
