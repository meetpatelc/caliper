/**
 * The one Axial document — Library card and Studio seed.
 *
 * It lives apart from `./document` on purpose. `calculator-types.ts` imports it
 * for `starterCalculator()`, and importing it FROM `./document` pulled that
 * module's static `library-*.ts` imports — all ~123 documents — into the entry
 * chunk every visitor downloads. Keeping the seed standalone keeps that graph
 * out of the landing page.
 *
 * The type import below is type-only, so it is erased and creates no runtime
 * cycle with `./document`, which re-exports this value.
 */
import type { InstrumentDocument } from "@/lib/document";

export const axialDocument: InstrumentDocument = {
  slug: "axial",
  title: "Axial response",
  description: "Average stress, elastic strain, and ideal length change for a prismatic member under axial load.",
  domain: "mechanics",
  fields: [
    {
      id: "force",
      label: "Axial load",
      symbol: "F",
      help: "Positive = tension; negative = compression.",
      family: "force",
      defaultValue: 10,
      defaultUnit: "kN",
      signed: true,
    },
    {
      id: "area",
      label: "Cross-sectional area",
      symbol: "A",
      help: "Uniform area, away from local load effects.",
      family: "area",
      defaultValue: 1000,
      defaultUnit: "mm²",
    },
    {
      id: "length",
      label: "Original length",
      symbol: "L",
      help: "Unloaded gauge length of the member.",
      family: "length",
      defaultValue: 1000,
      defaultUnit: "mm",
    },
    {
      id: "modulus",
      label: "Elastic modulus",
      symbol: "E",
      help: "Linear-elastic material modulus.",
      family: "stress",
      defaultValue: 200,
      defaultUnit: "GPa",
    },
  ],
  outputs: [
    { id: "stress", label: "Average normal stress", family: "stress", defaultUnit: "MPa", expression: "force / area" },
    { id: "strain", label: "Elastic strain", family: "strain", defaultUnit: "µε", expression: "force / area / modulus" },
    {
      id: "extension",
      label: "Ideal length change",
      family: "length",
      defaultUnit: "mm",
      expression: "force / area / modulus * length",
    },
  ],
  formula: "σ = F / A · ε = σ / E · ΔL = FL / AE",
  purpose: "First-pass average axial stress, elastic strain, and ideal length change in a prismatic member.",
  assumptions: ["Uniform cross-section", "Axial loading", "Linear-elastic response"],
  boundary: "Not a local peak, not a connection, not a code check.",
  interpretation: "Compare with an allowable only after applying the project factor of safety and section class.",
  sourceLabel: "Boston University mechanics notes",
  sourceUrl: "https://www.bu.edu/moss/mechanics-of-materials-axial-load/",
  related: [],
  warnings: [
    "Average stress is a simplified measure; do not apply it at a local load introduction, notch, or connection without a suitable model.",
  ],
};
