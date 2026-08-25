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

export function libraryDoc(id: string, spec: LibraryDocSpec): InstrumentDocument {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Missing catalog entry ${id}`);
  return {
    slug: id,
    title: tool.title,
    description: tool.description,
    domain: tool.contract.domain,
    fields: spec.fields,
    outputs: spec.outputs,
    formula: spec.formula,
    purpose: tool.description,
    assumptions: tool.assumptions,
    boundary: LIBRARY_BOUNDARY,
    interpretation: tool.outputLabel,
    sourceLabel: tool.sourceLabel,
    sourceUrl: tool.sourceUrl,
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
