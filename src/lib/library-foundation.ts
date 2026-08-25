import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Fundamentals and unit integrity models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const foundationDocuments: Record<string, InstrumentDocument> = {
  density: libraryDoc("density", {
    fields: [
      { id: "mass", label: "Mass", symbol: "m", help: "User-entered mass; no material lookup is used.", family: "mass", defaultValue: 7.85, defaultUnit: "kg" },
      { id: "volume", label: "Volume", symbol: "V", help: "User-entered occupied volume.", family: "volume", defaultValue: 1, defaultUnit: "L" }
    ],
    outputs: [
      { id: "density", label: "Average density", family: "density", defaultUnit: "kg/m³", expression: "mass/((volume/0.001)*1e-3)" },
      { id: "specificVolume", label: "Specific volume", defaultUnit: "m³/kg", expression: "1/(mass/((volume/0.001)*1e-3))" },
      { id: "specificGravity", label: "Specific gravity vs. water", family: "dimensionless", defaultUnit: "1", expression: "mass/((volume/0.001)*1e-3)/1000" }
    ],
    formula: "ρ = m / V · v = 1 / ρ",
    warnings: ["Average density is derived only from the mass and volume entered here. It is not a condition-specific material-property lookup and should not be used as one."],
  }),
  safetyMargin: libraryDoc("safetyMargin", {
    fields: [
      { id: "applied", label: "Applied stress magnitude", symbol: "σapp", help: "Positive magnitude from one separately validated load case.", family: "stress", defaultValue: 120, defaultUnit: "MPa" },
      { id: "allowable", label: "Allowable stress", symbol: "σallow", help: "User-entered allowable on the same stress basis as the applied magnitude.", family: "stress", defaultValue: 250, defaultUnit: "MPa" }
    ],
    outputs: [
      { id: "factor", label: "Allowable-to-applied factor", family: "dimensionless", defaultUnit: "1", expression: "(allowable/1000000)/(applied/1000000)" },
      { id: "margin", label: "Margin of safety", family: "dimensionless", defaultUnit: "1", expression: "(allowable/1000000)/(applied/1000000)-1" },
      { id: "utilization", label: "Utilization", family: "dimensionless", defaultUnit: "%", expression: "(applied/1000000)/(allowable/1000000)" }
    ],
    formula: "Factor = σallow/σapp · margin = factor − 1 · utilization = σapp/σallow",
    warnings: ["This is arithmetic on two user-entered like-for-like stress magnitudes. It does not establish an allowable, determine a governing load case, apply a design code, account for uncertainty or fatigue, or determine whether the resulting margin is acceptable."],
  }),
};
