import assert from "node:assert/strict";
import test from "node:test";
import { libraryDocuments, isStudioDocument } from "@/lib/document";
import { asCalculatorDefinition, calculatorSchema, MAX_FIELDS, MAX_OUTPUTS } from "@/studio/lib/calculator-types";
import { adoptDocument, adoptionLoss } from "@/studio/lib/adopt-document";
import { uniqueSlug } from "@/studio/lib/workshop-store";
import { defaultFieldState, evaluateCalculator } from "@/studio/lib/evaluate";

/** Exactly what `createFrom` does, so the test forks the way the button does. */
function fork(/** @type {any} */ document) {
  const definition = asCalculatorDefinition(document);
  const title = `${document.title} (copy)`;
  return {
    ...structuredClone(definition),
    id: "test",
    origin: "workshop",
    title,
    slug: uniqueSlug(title, "test01", new Set()),
    updatedAt: new Date().toISOString(),
    published: false,
  };
}

test("a lookup becomes a keyed table on the field it was read against", () => {
  const beam = libraryDocuments.beam;
  const adopted = adoptDocument(beam);
  const table = (adopted.tables ?? []).find((entry) => entry.name === "deflDenom");
  assert.ok(table, "deflDenom must survive the trip");
  assert.equal(table.kind, "keyed");
  assert.equal(table.matchField, "case", "read from `lookup(deflDenom, case)`, the only place it is recorded");
  assert.deepEqual(table.rows, [
    { key: "cantilever", values: [3] },
    { key: "simple", values: [48] },
  ]);
});

test("the expression is rewritten, because Studio puts the column in scope directly", () => {
  const adopted = adoptDocument(libraryDocuments.beam);
  assert.equal(adopted.rewrite("load/lookup(reactionDenom, case)"), "load/reactionDenom");
  assert.equal(
    adopted.rewrite("load*length^3*1e5/(lookup(deflDenom, case)*modulus*inertia)"),
    "load*length^3*1e5/(deflDenom*modulus*inertia)",
  );
});

test("a lookup with no call site is left alone rather than half-converted", () => {
  const document = {
    ...libraryDocuments.beam,
    lookups: { ...libraryDocuments.beam.lookups, orphan: { a: 1, b: 2 } },
  };
  const adopted = adoptDocument(document);
  assert.ok(!(adopted.tables ?? []).some((table) => table.name === "orphan"));
  assert.equal(adopted.rewrite("lookup(orphan, case)"), "lookup(orphan, case)", "left readable, not silently dropped");
});

test("a choice field becomes a dropdown Studio can render", () => {
  const adopted = adoptDocument(libraryDocuments.beam);
  const field = adopted.fields.find((entry) => entry.id === "case");
  assert.ok(field, "beam's boundary-case field must survive");
  assert.equal(field.input, "choice");
  assert.deepEqual(
    (field.options ?? []).map((option) => option.value),
    ["cantilever", "simple"],
  );
  assert.equal(field.defaultOption, "cantilever");
});

/**
 * The regression this whole module exists for.
 *
 * Forking `beam` used to open the editor on `Unknown table "reactionDenom"` —
 * an error naming something the person forking had never seen, on a model whose
 * own page works. Nine models failed this way, all of them among the more
 * interesting ones, which is why "fork it and fix it" was never really an
 * answer for the tools most likely to need fixing.
 */
test("every model that offers a fork produces a calculator that computes", () => {
  const broken = [];
  for (const document of Object.values(libraryDocuments)) {
    if (!isStudioDocument(document) || adoptionLoss(document)) continue;
    const parsed = calculatorSchema.safeParse(fork(document));
    if (!parsed.success) {
      broken.push(`${document.slug}: schema ${parsed.error.issues[0].path.join(".")}`);
      continue;
    }
    const run = evaluateCalculator(parsed.data, defaultFieldState(parsed.data));
    if (!run.ok) broken.push(`${document.slug}: ${run.error}`);
  }
  // Not just the lookup failures: if the button is offered at all, the copy has
  // to parse and compute. Anything that cannot must say why through
  // `adoptionLoss` and withhold the button, rather than handing someone an
  // editor full of errors about a model that works on its own page.
  assert.deepEqual(broken, [], `forks offered but broken:\n  ${broken.join("\n  ")}`);
});

test("the schema caps fit what the Library actually ships", () => {
  // Fourteen models were refused by limits chosen for hand-authoring, not by
  // anything wrong with the models. Raising them is only correct while the
  // Library stays inside the new numbers, so this is where that is checked.
  const offered = Object.values(libraryDocuments).filter(
    (document) => isStudioDocument(document) && !adoptionLoss(document),
  );
  const overFields = offered.filter((document) => document.fields.length > MAX_FIELDS);
  const overOutputs = offered.filter((document) => document.outputs.length > MAX_OUTPUTS);
  assert.deepEqual(overFields.map((d) => `${d.slug}:${d.fields.length}`), []);
  assert.deepEqual(overOutputs.map((d) => `${d.slug}:${d.outputs.length}`), []);
});

test("a model whose results depend on a choice does not offer a fork", () => {
  // Build shows every result always. Forking `taylorToolLife`, whose six
  // outputs each carry a `when`, would compute and display the two results
  // belonging to the mode you did not pick — no error, just an answer to a
  // question nobody asked.
  assert.match(adoptionLoss(libraryDocuments.taylorToolLife) ?? "", /different results/);
  assert.match(adoptionLoss(libraryDocuments.beam) ?? "", /renames its results/);
  assert.equal(adoptionLoss(libraryDocuments.axial), undefined, "a plain formula model loses nothing");
});
