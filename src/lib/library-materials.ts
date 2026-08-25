import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Material properties models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const materialsDocuments: Record<string, InstrumentDocument> = {
  thermalExpansion: libraryDoc("thermalExpansion", {
    fields: [
      { id: "length", label: "Initial length", symbol: "L₀", help: "Unloaded length at the stated initial temperature.", family: "length", defaultValue: 1200, defaultUnit: "mm" },
      { id: "cte", label: "Linear expansion coefficient", symbol: "α", help: "Signed average CTE over the stated temperature interval. Negative means contraction on heating.", family: "dimensionless", defaultValue: 12, defaultUnit: "1", signed: true },
      { id: "deltaT", label: "Temperature change", symbol: "ΔT", help: "Final minus initial temperature. Positive = heating.", family: "temperatureDelta", defaultValue: 65, defaultUnit: "K", signed: true }
    ],
    outputs: [
      { id: "extension", label: "Ideal free length change", family: "length", defaultUnit: "mm", expression: "(cte*1e-6*deltaT*(length/0.001))*0.001" },
      { id: "finalLength", label: "Ideal final length", family: "length", defaultUnit: "mm", expression: "((length/0.001)+cte*1e-6*deltaT*(length/0.001))*0.001" },
      { id: "thermalStrain", label: "Free thermal strain", family: "strain", defaultUnit: "µε", expression: "cte*1e-6*deltaT" }
    ],
    formula: "ΔL = αL₀ΔT · εth = αΔT",
    warnings: ["This is ideal free linear expansion using a user-entered signed average CTE; a negative coefficient is contraction on heating. It excludes restraint, temperature gradients, anisotropy, phase change, joints, nonlinear material response, property variation, and thermal-stress or design decisions."],
  }),
  thermalStress: libraryDoc("thermalStress", {
    fields: [
      { id: "modulus", label: "Elastic modulus", symbol: "E", help: "User-entered linear-elastic modulus for the stated material condition.", family: "stress", defaultValue: 200, defaultUnit: "GPa" },
      { id: "cte", label: "Linear expansion coefficient", symbol: "α", help: "User-entered average CTE over the stated temperature interval.", family: "dimensionless", defaultValue: 12, defaultUnit: "1" },
      { id: "deltaT", label: "Temperature change", symbol: "ΔT", help: "Final minus initial temperature. Positive = heating.", family: "temperatureDelta", defaultValue: 65, defaultUnit: "K", signed: true }
    ],
    outputs: [
      { id: "thermalStress", label: "Ideal restrained thermal stress", family: "stress", defaultUnit: "MPa", expression: "(modulus/1000000000)*1e9*cte*1e-6*deltaT" },
      { id: "freeStrain", label: "Suppressed free thermal strain", family: "strain", defaultUnit: "µε", expression: "cte*1e-6*deltaT" },
      { id: "stressMagnitude", label: "Stress magnitude", family: "stress", defaultUnit: "MPa", expression: "abs((modulus/1000000000)*1e9*cte*1e-6*deltaT)" }
    ],
    formula: "σth = EαΔT",
    warnings: ["This represents a uniform, fully restrained, linear-elastic axial member. It is not an allowable-stress, strength, fatigue, support-stiffness, thermal-gradient, creep, joint, or code-compliance calculation."],
  }),
};
