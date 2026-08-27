import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Electrical models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const electricalDocuments: Record<string, InstrumentDocument> = {
  ohm: libraryDoc("ohm", {
    fields: [
      { id: "voltage", label: "Applied voltage", symbol: "V", help: "Voltage across one ideal resistor in the displayed DC relationship.", family: "voltage", defaultValue: 24, defaultUnit: "V", signed: true },
      { id: "resistance", label: "Resistance", symbol: "R", help: "Constant ideal resistance of the single displayed component.", family: "resistance", defaultValue: 12, defaultUnit: "Ω" }
    ],
    outputs: [
      { id: "current", label: "Circuit current", family: "current", defaultUnit: "A", expression: "voltage/resistance" },
      { id: "power", label: "Resistor power", family: "power", defaultUnit: "W", expression: "voltage*(voltage/resistance)" },
      { id: "powerMilli", label: "Resistor power", defaultUnit: "mW", expression: "voltage*(voltage/resistance)*1000" }
    ],
    formula: "V = IR · P = VI = V²/R",
    warnings: ["This is one ideal DC resistor with constant resistance. It does not size wire, protection, a power source, thermal management, or any electrical installation, and it excludes AC, transients, and nonlinear components."],
  }),
  threePhasePower: libraryDoc("threePhasePower", {
    fields: [
      { id: "lineVoltage", label: "Declared line-to-line voltage", symbol: "VLL", help: "User-entered RMS line-to-line voltage; voltage drop, supply quality, and system configuration are not derived.", defaultValue: 480, defaultUnit: "V" },
      { id: "lineCurrent", label: "Declared line current", symbol: "I", help: "User-entered RMS line current; load balance, conductor sizing, and protection are not derived.", defaultValue: 30, defaultUnit: "A" },
      { id: "powerFactor", label: "Declared power factor", symbol: "PF", help: "User-entered scalar power factor from zero through one; harmonics and power-quality effects are not modeled.", defaultValue: 0.85, defaultUnit: "—", signed: true },
    ],
    outputs: [
      { id: "apparentPower", label: "Literal three-phase apparent power", defaultUnit: "kVA", expression: "(sqrt(3)*(lineVoltage)*(lineCurrent))/1000" },
      { id: "realPower", label: "Literal three-phase real power", defaultUnit: "kW", expression: "((sqrt(3)*(lineVoltage)*(lineCurrent))*(powerFactor))/1000" },
      { id: "lineVoltage", label: "Declared line-to-line voltage", family: "voltage", defaultUnit: "V", expression: "(lineVoltage)" },
      { id: "lineCurrent", label: "Declared line current", family: "current", defaultUnit: "A", expression: "(lineCurrent)" },
    ],
    formula: "S = √3·VLL·I · P = S·PF",
    warnings: ["This applies only the balanced scalar three-phase relation to user-declared line voltage, line current, and power factor. It does not determine phase balance, harmonics, conductor or breaker size, protection, voltage drop, grounding, available fault current, power-quality compliance, capacity, safety, suitability, or approval."],
  }),
};
