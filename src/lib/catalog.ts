/**
 * The catalog surface: the models, how to find one, and the source cards.
 *
 * The two large literals live in `catalog-tools.ts` and `catalog-aliases.ts`
 * and are re-exported here, so every existing importer is unaffected.
 */
export * from "@/lib/catalog-tools";
export { toolAliases } from "@/lib/catalog-aliases";

import { tools, type ToolDefinition } from "@/lib/catalog-tools";
import { toolAliases } from "@/lib/catalog-aliases";


export const getTool = (id: string | undefined) => tools.find((tool) => tool.id === id);


export const searchableToolText = (tool: ToolDefinition) => [tool.id, tool.title, tool.description, tool.category, tool.contract.domain, ...toolAliases[tool.id]].join(" ").toLowerCase();

/**
 * How well a haystack answers a query, as a share of the words that hit.
 *
 * Shared so the palette's filter and its best-match list cannot disagree about
 * what "matching" means — two implementations of a ranking rule is how a search
 * box ends up showing one order and filtering by another.
 *
 * Word order is ignored deliberately: "bolt torque" and "torque bolt" are the
 * same question. A single-term query still scores 1 or 0.
 */
export function scoreSearchMatch(haystack: string, query: string): number {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const text = haystack.toLowerCase();
  const hits = terms.filter((term) => text.includes(term)).length;
  return hits === 0 ? 0 : hits / terms.length;
}

export const sourceCards = [
  {
    label: "Unit conventions",
    title: "NIST Guide to the SI",
    note: "A basis for explicit unit conversion and convenient display magnitudes.",
    url: "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors",
  },
  {
    label: "Mechanics context",
    title: "Boston University: Axial Load",
    note: "Average stress assumptions, statics, strain, and displacement context.",
    url: "https://www.bu.edu/moss/mechanics-of-materials-axial-load/",
  },
  {
    label: "Beam method",
    title: "Roark's Formulas for Stress and Strain",
    note: "Boundary conditions, internal reactions, sign conventions, and common deflection cases.",
    url: "",
  },
  {
    label: "Stability method",
    title: "Shigley's Mechanical Engineering Design",
    note: "Effective length, slenderness, end conditions, and model distinctions.",
    url: "",
  },
];

export const researchPrinciples = [
  "Units stay attached to every quantity.",
  "Assumptions are visible before the result is trusted.",
  "Sources and method notes remain one step away.",
  "A screening result is never a certification.",
];
