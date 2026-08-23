import type { OfficialCalculator } from "@/gauge/lib/calculator-types";
import { domains, type DomainId } from "@/gauge/lib/brand";

const official: OfficialCalculator[] = [
  {
    origin: "official",
    slug: "metric-bolt-area",
    title: "Metric bolt tensile area",
    description: "ISO 898-1 coarse-pitch tensile stress area, then average stress from an axial load.",
    domain: "mechanics",
    fields: [
      {
        id: "size",
        label: "Bolt size",
        family: "dimensionless",
        defaultValue: 0,
        defaultUnit: "1",
        input: "choice",
        defaultOption: "M12",
        options: ["M6", "M8", "M10", "M12", "M16", "M20", "M24", "M30"].map((value) => ({ value, label: value })),
      },
      { id: "force", label: "Axial force", family: "force", defaultValue: 20, defaultUnit: "kN" },
    ],
    tables: [
      {
        id: "bolts",
        name: "ISO 898-1 coarse As",
        kind: "keyed",
        matchField: "size",
        columns: [{ id: "As", label: "Tensile stress area", family: "area", unit: "mm²" }],
        rows: [
          { key: "M6", values: [20.1] },
          { key: "M8", values: [36.6] },
          { key: "M10", values: [58.0] },
          { key: "M12", values: [84.3] },
          { key: "M16", values: [157] },
          { key: "M20", values: [245] },
          { key: "M24", values: [353] },
          { key: "M30", values: [561] },
        ],
      },
    ],
    outputs: [
      {
        id: "stress",
        label: "Average tensile stress",
        family: "stress",
        defaultUnit: "MPa",
        expression: "force / As",
        precision: 3,
      },
    ],
    formula: "σ = F / As",
    purpose: "Screen the mean tensile stress on a metric coarse bolt using the ISO 898-1 stress area.",
    assumptions: [
      "Coarse pitch, as-tabulated As.",
      "Load is purely axial through the stress area.",
      "No combined bending, prying, or shear.",
    ],
    boundary: "Not a code check, not a preload / torque spec, not a fatigue or joint-stiffness calculation.",
    interpretation: "Compare against the bolt grade allowable only after the project factor of safety.",
    sourceLabel: "ISO 898-1",
    sourceUrl: "https://www.iso.org/standard/70511.html",
    related: ["iso-286-fits"],
  },
  {
    origin: "official",
    engine: "iso286",
    slug: "iso-286-fits",
    title: "ISO 286 fits",
    description: "Hole and shaft limit deviations, clearance and interference from ISO 286:2010 classes.",
    domain: "mechanics",
    fields: [
      { id: "D", label: "Nominal size", family: "length", defaultValue: 100, defaultUnit: "mm" },
    ],
    outputs: [
      {
        id: "cmax",
        label: "Maximum clearance",
        family: "length",
        defaultUnit: "mm",
        expression: "D",
      },
    ],
    formula: "cmax = ES − ei    imax = es − EI",
    purpose: "First-pass ISO 286 hole/shaft fit from a nominal size and two tolerance classes (e.g. H9/n8).",
    assumptions: [
      "ISO 286-1/2:2010 tables, nominal sizes above 0 mm up to 500 mm.",
      "Hole-letter deviations are the inverse of the matching shaft letter.",
      "IT grades 5–12. js/JS is symmetric ±IT/2.",
    ],
    boundary: "Not a gauge-design or inspection plan. K/M/N hole values that ISO makes IT-grade dependent are the common inverse approximation. Not valid above 500 mm.",
    interpretation: "Clearance: the shaft is always smaller. Interference: always larger. Transition: either, depending on the actual produced sizes.",
    sourceLabel: "ISO 286:2010",
    sourceUrl: "https://www.iso.org/standard/45975.html",
    related: ["iso-286-fits"],
  },
];

export const officialCalculators = official;
export const officialBySlug = new Map(official.map((item) => [item.slug, item]));
export const OFFICIAL_SLUGS = new Set(official.map((item) => item.slug));

export function calculatorsForDomain(domain: DomainId) {
  return official.filter((item) => item.domain === domain);
}

export function relatedCalculators(slug: string, extra: OfficialCalculator[] = []) {
  const current = officialBySlug.get(slug);
  if (!current) return extra.slice(0, 4);
  const fromIds = current.related
    .map((id) => officialBySlug.get(id))
    .filter((item): item is OfficialCalculator => Boolean(item));
  return fromIds.slice(0, 4);
}

export function domainCounts(extra: { domain: DomainId }[] = []) {
  return domains.map((domain) => ({
    ...domain,
    count: official.filter((item) => item.domain === domain.id).length + extra.filter((item) => item.domain === domain.id).length,
  }));
}

export const FEATURED_SLUGS = ["iso-286-fits", "metric-bolt-area"] as const;
