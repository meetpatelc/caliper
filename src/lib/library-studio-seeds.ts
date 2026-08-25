import type { InstrumentDocument } from "@/lib/document";

/**
 * The Studio seeds. These stay hand-written literals rather than deriving from
 * the catalog: their prose is deliberately richer than the terse card text a
 * Library tile needs, because this is what an engineer reads beside the result.
 * `catalog-document-agreement.test.mjs` records that divergence as intentional.
 */
export const studioSeedDocuments: Record<string, InstrumentDocument> = {
  dynamicPressure: {
    slug: "dynamicPressure",
    title: "Dynamic pressure",
    description: "Bernoulli dynamic pressure from density and speed.",
    domain: "fluids",
    fields: [
      { id: "density", label: "Density", symbol: "ρ", help: "Free-stream or mean-duct density at the stated condition.", family: "density", defaultValue: 1.225, defaultUnit: "kg/m³" },
      { id: "speed", label: "Speed", symbol: "V", help: "Free-stream or mean duct speed.", family: "speed", defaultValue: 20, defaultUnit: "m/s" },
    ],
    outputs: [
      { id: "q", label: "Dynamic pressure", family: "pressure", defaultUnit: "Pa", expression: "0.5 * density * speed^2" },
    ],
    formula: "q = ½ ρ V²",
    purpose: "Kinetic term in Bernoulli’s equation, used as a wind or duct screen.",
    assumptions: ["Incompressible.", "Uniform density.", "Speed is the free-stream or mean duct speed."],
    boundary: "Not a stagnation-temperature calculation and not a Cd-applied load.",
    interpretation: "Multiply by an area and a coefficient to estimate a force. State both.",
    sourceLabel: "Bernoulli",
    sourceUrl: "https://en.wikipedia.org/wiki/Dynamic_pressure",
    related: ["pipeVelocity", "bernoulli"],
    warnings: ["This is the kinetic term ½ρV². It is not a stagnation temperature, not a drag load, and not a code wind pressure."],
  },
  gravitationalPe: {
    slug: "gravitationalPe",
    title: "Gravitational potential energy",
    description: "Change in gravitational PE near Earth's surface.",
    domain: "dynamics",
    fields: [
      { id: "mass", label: "Mass", symbol: "m", help: "Mass of the body whose height changes.", family: "mass", defaultValue: 80, defaultUnit: "kg" },
      { id: "height", label: "Height", symbol: "h", help: "Height measured along the gravity vector, relative to a chosen datum.", family: "length", defaultValue: 2, defaultUnit: "m" },
      { id: "gravity", label: "Gravity", symbol: "g", help: "Local gravitational acceleration, treated as constant.", family: "acceleration", defaultValue: 9.80665, defaultUnit: "m/s²" },
    ],
    outputs: [
      { id: "energy", label: "Potential energy", family: "energy", defaultUnit: "J", expression: "mass * gravity * height" },
    ],
    formula: "PE = m g h",
    purpose: "Near-field gravitational PE relative to a chosen datum.",
    assumptions: ["Constant g.", "Height measured along the gravity vector.", "No stored elastic energy."],
    boundary: "Not orbital mechanics. Datum must be stated before comparing numbers.",
    interpretation: "A positive result is energy available if the mass falls through h.",
    sourceLabel: "Standard particle mechanics",
    sourceUrl: "https://en.wikipedia.org/wiki/Gravitational_energy",
    related: ["kinetic"],
    warnings: ["This is near-field gravitational PE on a constant-g Earth. It is not orbital mechanics, not elastic energy, and not a drop-height safety result."],
  },
  pipeVelocity: {
    slug: "pipeVelocity",
    title: "Pipe mean velocity",
    description: "Continuity: velocity from volumetric flow and inside diameter.",
    domain: "fluids",
    fields: [
      { id: "flow", label: "Volumetric flow", symbol: "Q", help: "Steady volumetric flow through a circular full-flowing pipe.", family: "volumetricFlow", defaultValue: 8, defaultUnit: "L/s" },
      { id: "diameter", label: "Inside diameter", symbol: "D", help: "Internal diameter of the circular passage.", family: "length", defaultValue: 80, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "speed", label: "Mean velocity", family: "speed", defaultUnit: "m/s", expression: "4 * flow / (pi * diameter^2)" },
    ],
    formula: "V = 4 Q / (π D²)",
    purpose: "Mean velocity in a circular full-flowing pipe.",
    assumptions: ["Incompressible.", "Pipe running full.", "Uniform density."],
    boundary: "Not a compressible-flow number and not a two-phase velocity.",
    interpretation: "Water services often target 1–3 m/s. Check erosion and pressure drop next.",
    sourceLabel: "Continuity",
    sourceUrl: "https://en.wikipedia.org/wiki/Continuity_equation",
    related: ["dynamicPressure", "continuity", "pipeSizing"],
    warnings: ["This is mean velocity from continuity in a circular full pipe. It does not size the pipe, calculate pressure drop, or classify the flow regime."],
  },
};
