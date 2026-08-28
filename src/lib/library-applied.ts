import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Applied systems models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const appliedDocuments: Record<string, InstrumentDocument> = {
  darcy: libraryDoc("darcy", {
    fields: [
      { id: "frictionFactor", label: "Darcy friction factor", symbol: "f", help: "User-entered Darcy (not Fanning) friction factor for the stated condition.", family: "dimensionless", defaultValue: 0.02, defaultUnit: "1" },
      { id: "length", label: "Pipe length", symbol: "L", help: "Straight developed-flow length for the major-loss screen.", family: "length", defaultValue: 25, defaultUnit: "m" },
      { id: "diameter", label: "Hydraulic diameter", symbol: "Dh", help: "Internal or hydraulic diameter of the displayed conduit.", family: "length", defaultValue: 50, defaultUnit: "mm" },
      { id: "density", label: "Fluid density", symbol: "ρ", help: "User-entered density at the stated fluid condition.", family: "density", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "velocity", label: "Mean velocity", symbol: "v", help: "User-entered mean cross-section velocity.", family: "speed", defaultValue: 1.8, defaultUnit: "m/s" }
    ],
    outputs: [
      { id: "pressureLoss", label: "Major friction pressure loss", family: "pressure", defaultUnit: "kPa", expression: "frictionFactor*(length/(diameter))*(density*velocity^2/2)" },
      { id: "headLoss", label: "Head loss in flowing fluid", family: "length", defaultUnit: "m", expression: "(frictionFactor*(length/(diameter))*(density*velocity^2/2))/(density*9.80665)" },
      { id: "dynamicPressure", label: "Dynamic pressure", family: "pressure", defaultUnit: "Pa", expression: "density*velocity^2/2" }
    ],
    formula: "Δp = f(L/D)(ρv²/2) · hL = Δp/(ρg)",
    warnings: ["This is Darcy–Weisbach major loss with a user-entered Darcy factor. It excludes fittings and minor losses, elevation, pumps, compressibility, entrance/development effects, non-Newtonian behavior, transient flow, pressure rating, and any pipe-size decision."],
  }),
};
