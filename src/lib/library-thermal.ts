import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Thermal and heat transfer models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const thermalDocuments: Record<string, InstrumentDocument> = {
  convectionHeat: libraryDoc("convectionHeat", {
    fields: [
      { id: "coefficient", label: "Declared convection coefficient", symbol: "h", help: "User-entered heat-transfer coefficient for the stated setup; this workspace does not derive a correlation.", defaultValue: 35, defaultUnit: "W/(m²·K)" },
      { id: "area", label: "Declared heat-transfer area", symbol: "A", help: "User-entered effective area; geometry and fin efficiency are excluded.", defaultValue: 1.8, defaultUnit: "m²" },
      { id: "deltaT", label: "Declared temperature difference", symbol: "ΔT", help: "User-entered signed bulk-to-surface temperature difference; no temperature field is derived.", defaultValue: 25, defaultUnit: "K", signed: true },
    ],
    outputs: [
      { id: "heatRate", label: "Declared convection heat rate", family: "power", defaultUnit: "W", expression: "coefficient*area*deltaT" },
      { id: "heatRateKw", label: "Declared convection heat rate", defaultUnit: "kW", expression: "coefficient*area*deltaT/1000" },
      { id: "conductance", label: "Declared convection conductance hA", defaultUnit: "W/K", expression: "coefficient*area" },
    ],
    formula: "Q̇ = hAΔT",
    warnings: ["This is user-entered convection coefficient arithmetic only. It does not derive a heat-transfer coefficient or correlation, determine flow regime, calculate a temperature field, model radiation, conduction, phase change, fins, contact resistance, material selection, service-temperature rating, equipment suitability, safety, or approval."],
  }),
  idealGas: libraryDoc("idealGas", {
    fields: [
      { id: "pressure", label: "Declared absolute pressure", symbol: "p", help: "User-entered absolute pressure; gauge-to-absolute conversion is excluded.", family: "pressure", defaultValue: 101.325, defaultUnit: "kPa(abs)" },
      { id: "temperature", label: "Declared absolute temperature", symbol: "T", help: "User-entered absolute temperature in kelvin; phase behavior is excluded.", family: "temperature", defaultValue: 293.15, defaultUnit: "K" },
      { id: "molarMass", label: "Declared molar mass", symbol: "M", help: "User-entered molar mass for the stated gas; composition is not inferred.", family: "dimensionless", defaultValue: 28.97, defaultUnit: "1" },
      { id: "volume", label: "Declared volume", symbol: "V", help: "User-entered fixed volume used only for ideal-gas amount arithmetic.", family: "volume", defaultValue: 1, defaultUnit: "m³" }
    ],
    outputs: [
      { id: "density", label: "Ideal-gas density", family: "density", defaultUnit: "kg/m³", expression: "((pressure)*volume/(8.314462618*temperature))*(molarMass/1000)/volume" },
      { id: "specificVolume", label: "Ideal-gas specific volume", family: "specificVolume", defaultUnit: "m³/kg", expression: "1/(((pressure)*volume/(8.314462618*temperature))*(molarMass/1000)/volume)" },
      { id: "amount", label: "Ideal-gas amount in declared volume", defaultUnit: "mol", expression: "(pressure)*volume/(8.314462618*temperature)" },
      { id: "mass", label: "Ideal-gas mass in declared volume", family: "mass", defaultUnit: "kg", expression: "((pressure)*volume/(8.314462618*temperature))*(molarMass/1000)" },
      { id: "specificGasConstant", label: "Specific gas constant from declared molar mass", family: "specificHeat", defaultUnit: "J/(kg·K)", expression: "8.314462618/(molarMass/1000)" }
    ],
    formula: "pV = nRuT · ρ = pM/(RuT) = p/(RspecT)",
    warnings: ["This is a user-entered ideal-gas equation-of-state arithmetic screen only. It does not convert gauge pressure, identify a gas, infer composition, model real-gas effects, phase change, mixtures, humidity, heat transfer, equipment selection, safety, operability, or approval."],
  }),
  idealGasEntropyChange: libraryDoc("idealGasEntropyChange", {
    fields: [
      { id: "initialTemperature", label: "Declared initial temperature", symbol: "T₁", help: "User-entered absolute temperature state; properties and process path are not inferred.", family: "temperature", defaultValue: 300, defaultUnit: "K" },
      { id: "finalTemperature", label: "Declared final temperature", symbol: "T₂", help: "User-entered absolute temperature state; properties and process path are not inferred.", family: "temperature", defaultValue: 600, defaultUnit: "K" },
      { id: "initialPressure", label: "Declared initial pressure", symbol: "p₁", help: "User-entered absolute pressure state; gas state and losses are not derived.", family: "pressure", defaultValue: 100000, defaultUnit: "Pa" },
      { id: "finalPressure", label: "Declared final pressure", symbol: "p₂", help: "User-entered absolute pressure state; gas state and losses are not derived.", family: "pressure", defaultValue: 200000, defaultUnit: "Pa" },
      { id: "specificHeat", label: "Declared constant specific heat", symbol: "cp", help: "User-entered constant-pressure specific heat; temperature dependence and gas identity are not derived.", family: "specificHeat", defaultValue: 1005, defaultUnit: "J/(kg·K)" },
      { id: "gasConstant", label: "Declared specific gas constant", symbol: "R", help: "User-entered specific gas constant; gas composition and properties are not derived.", family: "specificHeat", defaultValue: 287, defaultUnit: "J/(kg·K)" }
    ],
    outputs: [
      { id: "entropyChange", label: "Literal ideal-gas specific entropy change", family: "specificHeat", defaultUnit: "J/(kg·K)", expression: "specificHeat*ln(finalTemperature/initialTemperature)-gasConstant*ln(finalPressure/initialPressure)" },
      { id: "temperatureTerm", label: "Literal temperature contribution", family: "specificHeat", defaultUnit: "J/(kg·K)", expression: "specificHeat*ln(finalTemperature/initialTemperature)" },
      { id: "pressureTerm", label: "Literal pressure contribution", family: "specificHeat", defaultUnit: "J/(kg·K)", expression: "gasConstant*ln(finalPressure/initialPressure)" },
      { id: "temperatureRatio", label: "Declared temperature ratio", family: "dimensionless", defaultUnit: "1", expression: "finalTemperature/initialTemperature" }
    ],
    formula: "Δs = cp·ln(T₂/T₁) − R·ln(p₂/p₁)",
    warnings: ["This applies NASA’s constant-specific-heat ideal-gas pressure-temperature entropy relation only to user-declared state values. It does not determine gas properties, phase, process path, reversibility, heat or work transfer, state validity, isentropic efficiency, refrigeration, equipment, capacity, safety, suitability, or approval."],
  }),
  isentropicMachine: libraryDoc("isentropicMachine", {
    fields: [
      { id: "mode", label: "Declared machine mode", help: "Select compressor or turbine sign convention; this workspace does not select equipment.", defaultValue: 0, defaultUnit: "—", choice: ["compressor", "turbine"] },
      { id: "inletTemperature", label: "Declared inlet temperature", symbol: "T1", help: "User-entered absolute inlet temperature.", defaultValue: 300, defaultUnit: "K" },
      { id: "inletPressure", label: "Declared inlet absolute pressure", symbol: "p1", help: "User-entered absolute inlet pressure.", defaultValue: 100, defaultUnit: "kPa(abs)" },
      { id: "outletPressure", label: "Declared outlet absolute pressure", symbol: "p2", help: "User-entered absolute outlet pressure.", defaultValue: 500, defaultUnit: "kPa(abs)" },
      { id: "gamma", label: "Declared heat-capacity ratio", symbol: "γ", help: "User-entered constant ratio for the stated ideal gas; property inference is excluded.", defaultValue: 1.4, defaultUnit: "—" },
      { id: "specificHeat", label: "Declared constant-pressure specific heat", symbol: "cp", help: "User-entered value for stated work arithmetic.", defaultValue: 1.005, defaultUnit: "kJ/(kg·K)" },
      { id: "massFlow", label: "Declared mass flow", symbol: "ṁ", help: "User-entered steady mass flow.", defaultValue: 0.5, defaultUnit: "kg/s", signed: true },
      { id: "efficiency", label: "Declared isentropic efficiency", symbol: "ηis", help: "User-entered scalar efficiency used only for stated-work arithmetic.", defaultValue: 80, defaultUnit: "%" },
    ],
    lookups: { isCompressor: { compressor: 1, turbine: 0 } },
    methods: {
      compressor: "T2s/T1 = (p2/p1)^((γ−1)/γ) · wis = cp(T2s−T1) · wactual = wis/ηis · P = ṁw",
      turbine: "T2s/T1 = (p2/p1)^((γ−1)/γ) · wis = cp(T1−T2s) · wactual = ηis·wis · P = ṁw",
    },
    methodChoice: "mode",
    outputs: [
      { id: "pressureRatio", label: "Declared pressure ratio p₂/p₁", defaultUnit: "—", expression: "outletPressure/inletPressure" },
      { id: "isentropicOutletTemperature", label: "Isentropic outlet temperature", family: "temperature", defaultUnit: "K", expression: "inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)" },
      { id: "actualOutletTemperature", label: "Declared-efficiency outlet temperature", family: "temperature", defaultUnit: "K", expression: "inletTemperature+(2*lookup(isCompressor, mode)-1)*specificHeat*abs(inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)-inletTemperature)*(lookup(isCompressor, mode)/(efficiency/100)+(1-lookup(isCompressor, mode))*efficiency/100)/specificHeat" },
      { id: "specificWork", label: "Declared-efficiency compressor specific work input", defaultUnit: "kJ/kg", expression: "specificHeat*abs(inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)-inletTemperature)*(lookup(isCompressor, mode)/(efficiency/100)+(1-lookup(isCompressor, mode))*efficiency/100)", labelChoice: "mode", labels: { compressor: "Declared-efficiency compressor specific work input", turbine: "Declared-efficiency turbine specific work output" } },
      { id: "power", label: "Declared-efficiency compressor shaft power input", defaultUnit: "kW", expression: "massFlow*specificHeat*abs(inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)-inletTemperature)*(lookup(isCompressor, mode)/(efficiency/100)+(1-lookup(isCompressor, mode))*efficiency/100)", labelChoice: "mode", labels: { compressor: "Declared-efficiency compressor shaft power input", turbine: "Declared-efficiency turbine shaft power output" } },
    ],
    formula: "T2s/T1 = (p2/p1)^((γ−1)/γ) · wis = cp(T2s−T1) · wactual = wis/ηis · P = ṁw",
    warnings: ["This is ideal-gas isentropic state and user-entered-efficiency work arithmetic only. It does not select or rate equipment, use compressor maps, evaluate surge, choking, staging, cooling, losses beyond the declared efficiency, controls, mechanical design, safety, operability, or approval."],
  }),
  lmtd: libraryDoc("lmtd", {
    fields: [
      { id: "arrangement", label: "Flow arrangement", help: "Choose parallel or counterflow for the displayed terminal-temperature relationship.", defaultValue: 0, defaultUnit: "—", choice: ["counter", "parallel"] },
      { id: "hotIn", label: "Hot-side inlet", symbol: "Th,i", help: "Hot-stream temperature at its inlet.", defaultValue: 80, defaultUnit: "°C", signed: true },
      { id: "hotOut", label: "Hot-side outlet", symbol: "Th,o", help: "Hot-stream temperature at its outlet.", defaultValue: 60, defaultUnit: "°C", signed: true },
      { id: "coldIn", label: "Cold-side inlet", symbol: "Tc,i", help: "Cold-stream temperature at its inlet.", defaultValue: 20, defaultUnit: "°C", signed: true },
      { id: "coldOut", label: "Cold-side outlet", symbol: "Tc,o", help: "Cold-stream temperature at its outlet.", defaultValue: 45, defaultUnit: "°C", signed: true },
      { id: "overallCoefficient", label: "Declared overall coefficient", symbol: "U", help: "User-entered overall heat-transfer coefficient for the stated exchanger condition; it is not derived here.", defaultValue: 450, defaultUnit: "W/(m²·K)" },
      { id: "area", label: "Declared transfer area", symbol: "A", help: "User-entered effective transfer area; no geometry or fouling factor is inferred.", defaultValue: 4, defaultUnit: "m²" },
    ],
    lookups: { isCounter: { counter: 1, parallel: 0 } },
    methods: {
      counter: "ΔTlm = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2) · Q = UAΔTlm, counterflow",
      parallel: "ΔTlm = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2) · Q = UAΔTlm, parallel flow",
    },
    methodChoice: "arrangement",
    outputs: [
      { id: "lmtd", label: "Log mean temperature difference", defaultUnit: "K or °C", expression: "logmean(lookup(isCounter, arrangement)*(hotIn-coldOut)+(1-lookup(isCounter, arrangement))*(hotIn-coldIn), lookup(isCounter, arrangement)*(hotOut-coldIn)+(1-lookup(isCounter, arrangement))*(hotOut-coldOut))" },
      { id: "duty", label: "Declared-UA heat-transfer rate", defaultUnit: "kW", expression: "overallCoefficient*area*logmean(lookup(isCounter, arrangement)*(hotIn-coldOut)+(1-lookup(isCounter, arrangement))*(hotIn-coldIn), lookup(isCounter, arrangement)*(hotOut-coldIn)+(1-lookup(isCounter, arrangement))*(hotOut-coldOut))/1000" },
      { id: "areaPerKilowatt", label: "Required area per 1 kW at declared U", defaultUnit: "m²/kW", expression: "1000/(overallCoefficient*logmean(lookup(isCounter, arrangement)*(hotIn-coldOut)+(1-lookup(isCounter, arrangement))*(hotIn-coldIn), lookup(isCounter, arrangement)*(hotOut-coldIn)+(1-lookup(isCounter, arrangement))*(hotOut-coldOut)))" },
      { id: "delta1", label: "First terminal difference", defaultUnit: "K or °C", expression: "lookup(isCounter, arrangement)*(hotIn-coldOut)+(1-lookup(isCounter, arrangement))*(hotIn-coldIn)" },
      { id: "delta2", label: "Second terminal difference", defaultUnit: "K or °C", expression: "lookup(isCounter, arrangement)*(hotOut-coldIn)+(1-lookup(isCounter, arrangement))*(hotOut-coldOut)" },
    ],
    formula: "ΔTlm = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2) · Q = UAΔTlm, counterflow",
    warnings: ["This evaluates only ideal parallel or counterflow LMTD and user-entered UA arithmetic. It excludes correction factors, phase change, heat capacity rates, fouling, heat-transfer-coefficient derivation, pressure drop, transient behavior, materials, exchanger design/selection/rating, safety, and approval."],
  }),
  planeConduction: libraryDoc("planeConduction", {
    fields: [
      { id: "conductivity", label: "Thermal conductivity", symbol: "k", help: "User-entered conductivity at the stated material and temperature condition.", family: "thermalConductivity", defaultValue: 0.8, defaultUnit: "W/(m·K)" },
      { id: "area", label: "Heat-flow area", symbol: "A", help: "Area normal to the assumed one-dimensional heat flow.", family: "area", defaultValue: 2.5, defaultUnit: "m²" },
      { id: "thickness", label: "Wall thickness", symbol: "L", help: "Uniform thickness through the plane wall.", family: "length", defaultValue: 120, defaultUnit: "mm" },
      { id: "hotTemperature", label: "Hot-side surface", symbol: "Tₕ", help: "Surface temperature at the named hot-side boundary.", family: "temperature", defaultValue: 80, defaultUnit: "°C", signed: true },
      { id: "coldTemperature", label: "Cold-side surface", symbol: "T𝚌", help: "Surface temperature at the opposite named boundary.", family: "temperature", defaultValue: 20, defaultUnit: "°C", signed: true }
    ],
    outputs: [
      { id: "heatRate", label: "Conductive heat rate hot → cold", family: "power", defaultUnit: "W", expression: "(hotTemperature-coldTemperature)/((thickness)/(conductivity*area))" },
      { id: "resistance", label: "Plane-wall thermal resistance", family: "thermalResistance", defaultUnit: "K/W", expression: "(thickness)/(conductivity*area)" },
      { id: "heatFlux", label: "Heat flux hot → cold", family: "heatFlux", defaultUnit: "W/m²", expression: "((hotTemperature-coldTemperature)/((thickness)/(conductivity*area)))/area" }
    ],
    formula: "Q̇ = kA(Th − Tc)/L · Rth = L/(kA)",
    warnings: ["This is steady, one-dimensional plane-wall conduction using one user-entered conductivity. It excludes contact resistance, convection, radiation, thermal bridges, multilayer interfaces, temperature-dependent properties, phase change, transient response, and insulation selection."],
  }),
  sensibleHeat: libraryDoc("sensibleHeat", {
    fields: [
      { id: "mass", label: "Mass", symbol: "m", help: "Mass of the material undergoing temperature change.", family: "mass", defaultValue: 10, defaultUnit: "kg" },
      { id: "specificHeat", label: "Specific heat", symbol: "c", help: "User-entered value for the stated material and condition; no lookup is used.", family: "specificHeat", defaultValue: 4.186, defaultUnit: "kJ/(kg·K)" },
      { id: "deltaT", label: "Temperature change", symbol: "ΔT", help: "Final minus initial temperature; sign indicates heating or cooling.", family: "temperatureDelta", defaultValue: 25, defaultUnit: "K", signed: true }
    ],
    outputs: [
      { id: "heat", label: "Heat transfer", family: "energy", defaultUnit: "kJ", expression: "mass*(specificHeat/1000)*deltaT*1000" },
      { id: "heatJ", label: "Heat transfer", family: "energy", defaultUnit: "J", expression: "mass*(specificHeat/1000)*deltaT*1000" },
      { id: "specificEnergy", label: "Energy per unit mass", defaultUnit: "kJ/kg", expression: "(specificHeat/1000)*deltaT" }
    ],
    formula: "Q = mcΔT",
    warnings: ["The specific heat is user-entered. This approximation requires no phase change and excludes heat loss, temperature-dependent properties, mixing, reaction, and work by/on the system."],
  }),
  thermalRadiation: libraryDoc("thermalRadiation", {
    fields: [
      { id: "area", label: "Radiating area", help: "User-entered effective surface area facing the stated large surroundings.", defaultValue: 1.2, defaultUnit: "m²" },
      { id: "emissivity", label: "Surface emissivity", help: "User-entered gray-surface emissivity from 0 through 1; this screen does not select it.", defaultValue: 0.8, defaultUnit: "—", signed: true },
      { id: "surfaceTemperature", label: "Surface temperature", help: "Absolute surface temperature in kelvins.", defaultValue: 373.15, defaultUnit: "K" },
      { id: "surroundingTemperature", label: "Surroundings temperature", help: "Effective large-surroundings absolute temperature in kelvins.", defaultValue: 293.15, defaultUnit: "K" },
    ],
    outputs: [
      { id: "netRadiation", label: "Net radiation from surface", family: "power", defaultUnit: "W", expression: "emissivity*5.670374419e-8*(surfaceTemperature^4-surroundingTemperature^4)*area" },
      { id: "heatFlux", label: "Net radiative heat flux", family: "heatFlux", defaultUnit: "W/m²", expression: "emissivity*5.670374419e-8*(surfaceTemperature^4-surroundingTemperature^4)" },
      { id: "emittedPower", label: "Surface emitted radiation", family: "power", defaultUnit: "W", expression: "emissivity*5.670374419e-8*surfaceTemperature^4*area" },
    ],
    formula: "qnet = εσA(Ts⁴ − Tsur⁴) · q''net = εσ(Ts⁴ − Tsur⁴)",
    warnings: ["This is gray-surface Stefan–Boltzmann exchange to large isothermal surroundings using user-entered emissivity and absolute temperatures. It excludes finite-surface view factors, enclosure geometry, spectral and directional behavior, participating gases/flames, reflections, solar load, convection, conduction, insulation, and transient temperature response."],
  }),
  thermalRcStep: libraryDoc("thermalRcStep", {
    fields: [
      { id: "constantPower", label: "Declared constant power step", symbol: "P", help: "User-entered constant heat-generation step; time-varying loads and duty cycles are not modeled.", defaultValue: 20, defaultUnit: "W" },
      { id: "thermalResistance", label: "Declared thermal resistance", symbol: "R", help: "User-entered scalar thermal resistance for one ideal path; no hardware or path is derived or selected.", defaultValue: 2, defaultUnit: "K/W" },
      { id: "thermalCapacitance", label: "Declared thermal capacitance", symbol: "C", help: "User-entered scalar thermal capacitance for the same one ideal node; mass, material, and geometry are not derived.", defaultValue: 50, defaultUnit: "J/K" },
      { id: "ambientTemperature", label: "Declared ambient temperature", symbol: "Tamb", help: "User-entered constant reference temperature for this ideal step-response relation.", defaultValue: 25, defaultUnit: "°C", signed: true },
      { id: "elapsedTime", label: "Declared elapsed time", symbol: "t", help: "User-entered elapsed time after the stated constant power step; must be zero or greater.", defaultValue: 100, defaultUnit: "s", signed: true },
    ],
    outputs: [
      { id: "timeConstant", label: "Literal thermal time constant", family: "time", defaultUnit: "s", expression: "((thermalResistance)*(thermalCapacitance))" },
      { id: "temperatureRise", label: "Literal ideal temperature rise at elapsed time", family: "temperatureDelta", defaultUnit: "K", expression: "(((constantPower)*(thermalResistance))*(1-exp(-(elapsedTime)/((thermalResistance)*(thermalCapacitance)))))" },
      { id: "nodeTemperature", label: "Literal ideal node temperature", defaultUnit: "°C", expression: "((ambientTemperature)+(((constantPower)*(thermalResistance))*(1-exp(-(elapsedTime)/((thermalResistance)*(thermalCapacitance))))))" },
      { id: "steadyStateRise", label: "Literal ideal steady-state temperature rise", family: "temperatureDelta", defaultUnit: "K", expression: "((constantPower)*(thermalResistance))" },
    ],
    formula: "τ = R·C · ΔT(t) = P·R·(1 − e^(−t/τ)) · Tnode = Tamb + ΔT(t)",
    warnings: ["This applies a user-declared constant power step to one ideal thermal RC node. It does not derive resistance or capacitance; determine thermal paths; select a heat sink, TIM, fan, or cooler; model multi-node conduction, convection, radiation, variable power, spatial temperature, material properties, junction limits, capacity, safety, suitability, or approval."],
  }),
  thermalResistance: libraryDoc("thermalResistance", {
    fields: [
      { id: "hotCoefficient", label: "Declared hot-side convection coefficient", symbol: "hh", help: "User-entered hot-side coefficient; no correlation or property calculation is performed.", defaultValue: 80, defaultUnit: "W/(m²·K)" },
      { id: "hotArea", label: "Declared hot-side convection area", symbol: "Ah", help: "User-entered effective hot-side area.", defaultValue: 1.5, defaultUnit: "m²" },
      { id: "wallThickness", label: "Declared wall thickness", symbol: "L", help: "User-entered one-dimensional wall thickness.", defaultValue: 25, defaultUnit: "mm" },
      { id: "wallConductivity", label: "Declared wall conductivity", symbol: "k", help: "User-entered conductivity at the stated condition; material selection is excluded.", defaultValue: 0.8, defaultUnit: "W/(m·K)" },
      { id: "wallArea", label: "Declared wall conduction area", symbol: "Aw", help: "User-entered one-dimensional conduction area.", defaultValue: 1.2, defaultUnit: "m²" },
      { id: "contactResistance", label: "Declared contact resistance", symbol: "Rc", help: "Optional user-entered lumped contact term; interface conditions are not inferred.", defaultValue: 0.02, defaultUnit: "K/W", signed: true },
      { id: "coldCoefficient", label: "Declared cold-side convection coefficient", symbol: "hc", help: "User-entered cold-side coefficient; no correlation or property calculation is performed.", defaultValue: 30, defaultUnit: "W/(m²·K)" },
      { id: "coldArea", label: "Declared cold-side convection area", symbol: "Ac", help: "User-entered effective cold-side area.", defaultValue: 1.5, defaultUnit: "m²" },
      { id: "heatRate", label: "Declared heat rate", symbol: "Q̇", help: "User-entered rate used only to calculate the total temperature difference across the declared series network.", defaultValue: 500, defaultUnit: "W", signed: true },
    ],
    outputs: [
      { id: "hotConvectionResistance", label: "Declared hot-side convection resistance", family: "thermalResistance", defaultUnit: "K/W", expression: "(1/((hotCoefficient)*(hotArea)))" },
      { id: "wallResistance", label: "Declared wall conduction resistance", family: "thermalResistance", defaultUnit: "K/W", expression: "((wallThickness/1000)/((wallConductivity)*(wallArea)))" },
      { id: "coldConvectionResistance", label: "Declared cold-side convection resistance", family: "thermalResistance", defaultUnit: "K/W", expression: "(1/((coldCoefficient)*(coldArea)))" },
      { id: "totalResistance", label: "Declared series thermal resistance", family: "thermalResistance", defaultUnit: "K/W", expression: "((1/((hotCoefficient)*(hotArea)))+((wallThickness/1000)/((wallConductivity)*(wallArea)))+(contactResistance)+(1/((coldCoefficient)*(coldArea))))" },
      { id: "totalTemperatureDifference", label: "Temperature difference at declared heat rate", family: "temperatureDelta", defaultUnit: "K", expression: "((heatRate)*((1/((hotCoefficient)*(hotArea)))+((wallThickness/1000)/((wallConductivity)*(wallArea)))+(contactResistance)+(1/((coldCoefficient)*(coldArea)))))" },
    ],
    formula: "Rtotal = 1/(hhAh) + L/(kAw) + Rc + 1/(hcAc) · ΔT = Q̇Rtotal",
    warnings: ["This is a declared, one-dimensional series-resistance arithmetic screen. It does not derive convection coefficients, infer contact conditions, model radiation, phase change, parallel heat paths, thermal bridges, temperature-dependent properties, material selection, service-temperature rating, equipment suitability, safety, or approval."],
  }),
};
