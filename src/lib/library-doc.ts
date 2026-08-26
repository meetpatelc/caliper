import { tools } from "@/lib/catalog";
import type { InstrumentDocument, InstrumentField, InstrumentOutput } from "@/lib/document";

/**
 * Build a library document from its catalog entry plus the parts only the
 * document knows.
 *
 * The catalog is the traceability spine: it already owns each model's title,
 * description, domain, assumptions, output label and source. Repeating those in
 * the document made every one of them a second place the same sentence could
 * change, and nothing checked that the two agreed.
 *
 * So a document supplies only what the catalog cannot: the fields a user types
 * into, the expressions, the governing relation, and the warnings. Everything
 * else is derived here, which makes catalog/document divergence structurally
 * impossible rather than merely tested for.
 *
 * The four Studio seeds (axial, gravitationalPe, pipeVelocity, dynamicPressure)
 * stay hand-written literals: their prose is deliberately richer than the
 * catalog's terse card text, and `catalog-document-agreement.test.mjs` records
 * that as intentional.
 */
export type LibraryDocSpec = {
  fields: InstrumentField[];
  outputs: InstrumentOutput[];
  formula: string;
  warnings: string[];
  sketch?: string;
  lookups?: InstrumentDocument["lookups"];
  methods?: Record<string, string>;
  methodChoice?: string;
  warningsBy?: Record<string, string[]>;
  warningsChoice?: string;
};

/** Every derived document carries the same boundary statement. */
export const LIBRARY_BOUNDARY = "Not a design stamp. Use only inside the stated model boundary.";

/**
 * Read the catalog entry on first use, then remember it.
 *
 * `libraryDoc` is called 156 times at module scope to build every library
 * document. Reading `tools` there made the whole site's SSR depend on chunk
 * initialisation order: the source import graph is acyclic, but Rollup's chunk
 * graph need not be, so a build could evaluate a `library-*` chunk before the
 * catalog chunk. When that happened `tools` was undefined and *every route*
 * returned 500 — from a change that had nothing to do with any of this. It
 * fired four times in a single day's work, each time looking like it belonged
 * to whichever edit was in flight.
 *
 * Deferring the read to first property access moves it to render time, long
 * after every module has initialised, and removes the ordering question
 * entirely. The missing-entry check moves with it: still thrown, just on use.
 */
function catalogEntry(id: string) {
  let cached: (typeof tools)[number] | undefined;
  return () => {
    if (!cached) {
      cached = tools.find((item) => item.id === id);
      if (!cached) throw new Error(`Missing catalog entry ${id}`);
    }
    return cached;
  };
}

export function libraryDoc(id: string, spec: LibraryDocSpec): InstrumentDocument {
  const entry = catalogEntry(id);
  return {
    slug: id,
    get title() {
      return entry().title;
    },
    get description() {
      return entry().description;
    },
    get domain() {
      return entry().contract.domain;
    },
    fields: spec.fields,
    outputs: spec.outputs,
    formula: spec.formula,
    get purpose() {
      return entry().description;
    },
    get assumptions() {
      return entry().assumptions;
    },
    boundary: LIBRARY_BOUNDARY,
    get interpretation() {
      return entry().outputLabel;
    },
    get sourceLabel() {
      return entry().sourceLabel;
    },
    get sourceUrl() {
      return entry().sourceUrl;
    },
    related: [],
    warnings: spec.warnings,
    sketch: spec.sketch,
    lookups: spec.lookups,
    methods: spec.methods,
    methodChoice: spec.methodChoice,
    warningsBy: spec.warningsBy,
    warningsChoice: spec.warningsChoice,
  };
}
