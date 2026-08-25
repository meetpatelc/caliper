import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Fluid flow and hydraulics models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const fluidsDocuments: Record<string, InstrumentDocument> = {
  bernoulli: libraryDoc("bernoulli", {
    fields: [
      { id: "density", label: "Fluid density", symbol: "ρ", help: "User-entered density for the stated fluid condition.", family: "density", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "velocity1", label: "Station 1 velocity", symbol: "v₁", help: "Mean speed at station 1 on the selected streamline.", family: "speed", defaultValue: 1.5, defaultUnit: "m/s" },
      { id: "elevation1", label: "Station 1 elevation", symbol: "z₁", help: "Elevation relative to one common arbitrary datum.", family: "length", defaultValue: 0, defaultUnit: "m", signed: true },
      { id: "velocity2", label: "Station 2 velocity", symbol: "v₂", help: "Mean speed at station 2 on the selected streamline.", family: "speed", defaultValue: 3, defaultUnit: "m/s" },
      { id: "elevation2", label: "Station 2 elevation", symbol: "z₂", help: "Elevation relative to the same datum as station 1.", family: "length", defaultValue: 0, defaultUnit: "m", signed: true }
    ],
    outputs: [
      { id: "pressureChange", label: "Ideal pressure change p₂ − p₁", family: "pressure", defaultUnit: "kPa", expression: "density*((velocity1^2-velocity2^2)/2+9.80665*(elevation1-elevation2))" },
      { id: "headChange", label: "Pressure-head change", family: "length", defaultUnit: "m", expression: "(density*((velocity1^2-velocity2^2)/2+9.80665*(elevation1-elevation2)))/(density*9.80665)" },
      { id: "velocityHeadChange", label: "Velocity-head change", family: "length", defaultUnit: "m", expression: "(velocity1^2-velocity2^2)/(2*9.80665)" }
    ],
    formula: "p₁ + ½ρv₁² + ρgz₁ = p₂ + ½ρv₂² + ρgz₂",
    warnings: ["This is Bernoulli’s ideal steady, incompressible, frictionless streamline relationship with no pump, turbine, or loss term. It excludes real pipe loss, fittings, separation, compressibility, cavitation, transient flow, and pressure-rating or equipment-selection decisions."],
  }),
  buoyancyForce: libraryDoc("buoyancyForce", {
    fields: [
      { id: "fluidDensity", label: "Declared fluid density", symbol: "ρf", help: "Constant user-entered displaced-fluid density; stratification and property lookup are excluded.", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "displacedVolume", label: "Declared displaced volume", symbol: "Vd", help: "User-entered displaced volume at the stated immersion condition; geometry is not inferred.", defaultValue: 12, defaultUnit: "L" },
      { id: "objectMass", label: "Declared object mass", symbol: "m", help: "User-entered mass used only for gravitational-weight comparison.", defaultValue: 10, defaultUnit: "kg", signed: true },
    ],
    outputs: [
      { id: "buoyancy", label: "Constant-density buoyant force", defaultUnit: "N", expression: "fluidDensity*9.80665*(displacedVolume/1000)" },
      { id: "weight", label: "Declared object gravitational weight", defaultUnit: "N", expression: "objectMass*9.80665" },
      { id: "netUpwardForce", label: "Buoyancy minus declared weight", defaultUnit: "N", expression: "fluidDensity*9.80665*(displacedVolume/1000)-objectMass*9.80665" },
      { id: "displacedMass", label: "Mass of declared displaced fluid", defaultUnit: "kg", expression: "fluidDensity*(displacedVolume/1000)" },
    ],
    formula: "FB = ρf·g·Vd · W = m·g · Fnet = FB − W",
    warnings: ["This is constant-density displaced-volume force arithmetic only. It does not determine float or vessel stability, immersion equilibrium, free-surface effects, restoring moments, geometry, structural adequacy, material selection, pressure rating, installation conditions, safety, or approval."],
  }),
  compressibleMassFlow: libraryDoc("compressibleMassFlow", {
    fields: [
      { id: "flowArea", label: "Declared flow area", symbol: "A", help: "User-entered flow area; nozzle, throat, and duct geometry are not derived.", defaultValue: 0.01, defaultUnit: "m²" },
      { id: "totalPressure", label: "Declared total pressure", symbol: "pt", help: "User-entered absolute total pressure; pressure losses and state conversion are not derived.", defaultValue: 200000, defaultUnit: "Pa" },
      { id: "totalTemperature", label: "Declared total temperature", symbol: "Tt", help: "User-entered absolute total temperature; heat transfer and temperature state are not derived.", defaultValue: 300, defaultUnit: "K" },
      { id: "machNumber", label: "Declared Mach number", symbol: "M", help: "User-entered Mach number; this workspace does not determine flow regime or choking.", defaultValue: 0.5, defaultUnit: "—" },
      { id: "specificHeatRatio", label: "Declared specific-heat ratio", symbol: "γ", help: "User-entered ideal-gas specific-heat ratio; gas properties are not derived.", defaultValue: 1.4, defaultUnit: "—", signed: true },
      { id: "gasConstant", label: "Declared specific gas constant", symbol: "R", help: "User-entered specific gas constant; gas composition and properties are not derived.", defaultValue: 287, defaultUnit: "J/(kg·K)" },
    ],
    outputs: [
      { id: "massFlow", label: "Literal ideal compressible mass flow", defaultUnit: "kg/s", expression: "(((flowArea)*(totalPressure)/sqrt((totalTemperature)))*sqrt((specificHeatRatio)/(gasConstant))*(machNumber)*(1+(((specificHeatRatio)-1)/2)*((machNumber))^(2))^(-((specificHeatRatio)+1)/(2*((specificHeatRatio)-1))))" },
      { id: "machNumber", label: "Declared Mach number", defaultUnit: "—", expression: "(machNumber)" },
      { id: "flowArea", label: "Declared flow area", defaultUnit: "m²", expression: "(flowArea)" },
      { id: "totalPressure", label: "Declared total pressure", defaultUnit: "Pa", expression: "(totalPressure)" },
    ],
    formula: "ṁ = (A·pt/√Tt)·√(γ/R)·M·[1 + ((γ − 1)/2)·M²]^(−(γ + 1)/(2(γ − 1)))",
    warnings: ["This applies NASA’s stated ideal isentropic mass-flow relation only to user-declared area, total state, Mach number, specific-heat ratio, and gas constant. It does not determine Mach number, gas properties, choking, nozzle or duct geometry, pressure losses, heat transfer, flow regime, capacity, safety, suitability, or approval."],
  }),
  continuity: libraryDoc("continuity", {
    fields: [
      { id: "area1", label: "First flow area", symbol: "A₁", help: "Area normal to the mean flow direction at section 1.", family: "area", defaultValue: 1000, defaultUnit: "mm²" },
      { id: "velocity1", label: "First mean velocity", symbol: "v₁", help: "User-entered mean velocity at section 1.", family: "speed", defaultValue: 2, defaultUnit: "m/s" },
      { id: "area2", label: "Second flow area", symbol: "A₂", help: "Area normal to the mean flow direction at section 2.", family: "area", defaultValue: 400, defaultUnit: "mm²" }
    ],
    outputs: [
      { id: "flow", label: "Volumetric flow rate", family: "volumetricFlow", defaultUnit: "L/s", expression: "(area1/0.000001)*1e-6*velocity1" },
      { id: "velocity2", label: "Second mean velocity", family: "speed", defaultUnit: "m/s", expression: "((area1/0.000001)*1e-6*velocity1)/((area2/0.000001)*1e-6)" },
      { id: "areaRatio", label: "Area ratio A₁/A₂", family: "dimensionless", defaultUnit: "1", expression: "(area1/0.000001)/(area2/0.000001)" }
    ],
    formula: "Q = A₁v₁ = A₂v₂",
    warnings: ["This is continuity for steady incompressible flow using mean section velocities. It does not calculate pressure change, loss, turbulence, cavitation, pipe sizing, or pump performance."],
  }),
  darcyFrictionFactor: libraryDoc("darcyFrictionFactor", {
    fields: [
      { id: "mode", label: "Declared calculation mode", help: "Choose the relation the user has already determined is applicable; this workspace does not classify the flow regime.", defaultValue: 0, defaultUnit: "—", choice: ["laminar", "swameeJain"], choiceMessage: "Declared calculation mode must be laminar or Swamee–Jain." },
      { id: "reynoldsNumber", label: "Declared Reynolds number", symbol: "Re", help: "User-entered dimensionless Reynolds number; viscosity, density, velocity, and regime are not derived.", defaultValue: 100000, defaultUnit: "—" },
      { id: "absoluteRoughness", label: "Declared absolute roughness", symbol: "ε", help: "Required only for the selected Swamee–Jain relation; use a compatible length unit with the stated inside diameter.", defaultValue: 0.045, defaultUnit: "mm" },
      { id: "insideDiameter", label: "Declared inside diameter", symbol: "D", help: "Required only for the selected Swamee–Jain relation; use the same length unit as roughness.", defaultValue: 100, defaultUnit: "mm" },
    ],
    lookups: { isLaminar: { laminar: 1, swameeJain: 0 } },
    methods: {
      laminar: "fD = 64 / Re",
      swameeJain: "fD = 0.25 / [log10(ε/(3.7D) + 5.74/Re^0.9)]²",
    },
    methodChoice: "mode",
    outputs: [
      { id: "frictionFactor", label: "Literal Darcy friction factor", defaultUnit: "—", expression: "64/reynoldsNumber", when: "lookup(isLaminar, mode)" },
      { id: "reynoldsNumber", label: "Declared Reynolds number", defaultUnit: "—", expression: "reynoldsNumber", when: "lookup(isLaminar, mode)" },
      { id: "relativeRoughness", label: "Relative roughness not applied by declared mode", defaultUnit: "—", expression: "0", when: "lookup(isLaminar, mode)" },
      { id: "frictionFactor", label: "Literal Darcy friction factor", defaultUnit: "—", expression: "0.25/log(absoluteRoughness/insideDiameter/3.7+5.74/reynoldsNumber^0.9)^2", when: "1-lookup(isLaminar, mode)" },
      { id: "reynoldsNumber", label: "Declared Reynolds number", defaultUnit: "—", expression: "reynoldsNumber", when: "1-lookup(isLaminar, mode)" },
      { id: "relativeRoughness", label: "Literal declared relative roughness", defaultUnit: "—", expression: "absoluteRoughness/insideDiameter", when: "1-lookup(isLaminar, mode)" },
    ],
    formula: "fD = 0.25 / [log10(ε/(3.7D) + 5.74/Re^0.9)]²",
    warnings: ["The user declares the Swamee–Jain relation; this workspace does not classify flow regime or solve Colebrook iteratively. It does not calculate pressure drop, determine fluid properties, select pipe, pump, or fittings, solve a pipe network, establish capacity, safety, suitability, or approval."],
    warningsChoice: "mode",
    warningsBy: {
      laminar: ["The user declares the laminar relation; this workspace does not classify flow regime. It does not calculate pressure drop, determine fluid properties, select pipe, pump, or fittings, solve a pipe network, establish capacity, safety, suitability, or approval."],
      swameeJain: ["The user declares the Swamee–Jain relation; this workspace does not classify flow regime or solve Colebrook iteratively. It does not calculate pressure drop, determine fluid properties, select pipe, pump, or fittings, solve a pipe network, establish capacity, safety, suitability, or approval."],
    },
  }),
  hydraulicAccumulatorState: libraryDoc("hydraulicAccumulatorState", {
    fields: [
      { id: "prechargePressure", label: "Declared precharge pressure", symbol: "P₀", help: "User-entered absolute gas precharge pressure; no precharge guidance or selection is provided.", defaultValue: 90, defaultUnit: "bar(abs)" },
      { id: "maximumWorkingPressure", label: "Declared maximum working pressure", symbol: "Pmax", help: "User-entered absolute maximum gas pressure state for the stated cycle; pressure rating is not assessed.", defaultValue: 200, defaultUnit: "bar(abs)" },
      { id: "minimumWorkingPressure", label: "Declared minimum working pressure", symbol: "Pmin", help: "User-entered absolute minimum gas pressure state; it must exceed the stated precharge pressure for this bounded state relation.", defaultValue: 120, defaultUnit: "bar(abs)" },
      { id: "prechargeGasVolume", label: "Declared precharge gas volume", symbol: "V₀", help: "User-entered gas volume at the declared precharge state; vessel geometry and usable volume are not selected.", defaultValue: 10, defaultUnit: "L" },
      { id: "polytropicExponent", label: "Declared polytropic exponent", symbol: "n", help: "User-entered exponent from 1 through 1.67; no isothermal/adiabatic/process selection is made.", defaultValue: 1, defaultUnit: "—" },
    ],
    outputs: [
      { id: "gasVolumeAtMaximum", label: "Literal gas volume at declared maximum pressure", defaultUnit: "L", expression: "((prechargeGasVolume)*((prechargePressure)/((maximumWorkingPressure)))^((1/(polytropicExponent))))" },
      { id: "gasVolumeAtMinimum", label: "Literal gas volume at declared minimum pressure", defaultUnit: "L", expression: "((prechargeGasVolume)*((prechargePressure)/((minimumWorkingPressure)))^((1/(polytropicExponent))))" },
      { id: "usableFluidVolume", label: "Literal usable fluid-volume difference", defaultUnit: "L", expression: "(((prechargeGasVolume)*((prechargePressure)/((minimumWorkingPressure)))^((1/(polytropicExponent))))-((prechargeGasVolume)*((prechargePressure)/((maximumWorkingPressure)))^((1/(polytropicExponent)))))" },
      { id: "polytropicExponent", label: "Declared polytropic exponent", defaultUnit: "—", expression: "(polytropicExponent)" },
    ],
    formula: "P₀·V₀ⁿ = P·Vⁿ · V(P) = V₀·(P₀/P)^(1/n) · ΔVfluid = V(Pmin) − V(Pmax)",
    warnings: ["This applies a user-declared ideal polytropic gas-state relation to declared absolute pressures and precharge gas volume. It does not select an accumulator, precharge, gas, vessel technology, safety device, or operating pressure; infer temperature, derive a transient duty cycle, model flow/response, heat transfer, seal condition, capacity, safety, suitability, code compliance, or approval."],
  }),
  hydraulicCylinder: libraryDoc("hydraulicCylinder", {
    fields: [
      { id: "bore", label: "Cylinder bore", symbol: "D", help: "Stated inside bore diameter for a double-acting cylinder.", defaultValue: 80, defaultUnit: "mm" },
      { id: "rod", label: "Rod diameter", symbol: "d", help: "Stated rod diameter; it must be smaller than the bore.", defaultValue: 45, defaultUnit: "mm" },
      { id: "pressure", label: "Declared working pressure", symbol: "p", help: "Uniform fluid pressure at the actuator, not a pressure-rating check.", defaultValue: 160, defaultUnit: "bar" },
      { id: "stroke", label: "Stroke", symbol: "s", help: "One full linear travel used only for ideal swept volume and travel-time arithmetic.", defaultValue: 500, defaultUnit: "mm" },
      { id: "flow", label: "Declared supply flow", symbol: "Q", help: "Steady delivered flow; this screen does not model a circuit or losses.", defaultValue: 30, defaultUnit: "L/min" },
    ],
    outputs: [
      { id: "extendForce", label: "Ideal extension force", defaultUnit: "kN", expression: "(((pressure)*1e5)*(pi*((bore))^(2)/4)*1e-6)/1000" },
      { id: "retractForce", label: "Ideal retraction force", defaultUnit: "kN", expression: "(((pressure)*1e5)*((pi*((bore))^(2)/4)-pi*((rod))^(2)/4)*1e-6)/1000" },
      { id: "extendVolume", label: "Extension swept volume", defaultUnit: "L", expression: "((pi*((bore))^(2)/4)*(stroke)/1e6)" },
      { id: "retractVolume", label: "Retraction swept volume", defaultUnit: "L", expression: "(((pi*((bore))^(2)/4)-pi*((rod))^(2)/4)*(stroke)/1e6)" },
      { id: "extendSpeed", label: "Ideal extension speed", defaultUnit: "mm/s", expression: "((flow)*1e6/60/(pi*((bore))^(2)/4))" },
      { id: "retractSpeed", label: "Ideal retraction speed", defaultUnit: "mm/s", expression: "((flow)*1e6/60/((pi*((bore))^(2)/4)-pi*((rod))^(2)/4))" },
      { id: "extendTime", label: "Ideal extension travel time", defaultUnit: "s", expression: "((stroke)/((flow)*1e6/60/(pi*((bore))^(2)/4)))" },
      { id: "retractTime", label: "Ideal retraction travel time", defaultUnit: "s", expression: "((stroke)/((flow)*1e6/60/((pi*((bore))^(2)/4)-pi*((rod))^(2)/4)))" },
    ],
    formula: "Ap = πD²/4 · Aa = Ap−πd²/4 · F = pA · V = As · v = Q/A · t = s/v",
    warnings: ["This is ideal double-acting cylinder arithmetic using declared pressure and steady delivered flow. It excludes pressure drops, friction/seal losses, side loading, rod buckling, cushioning, compressibility, valve dynamics, acceleration, mounting, structural loads, duty cycle, temperature, component ratings, and circuit or safety design."],
  }),
  hydraulicLine: libraryDoc("hydraulicLine", {
    fields: [
      { id: "flow", label: "Declared line flow", symbol: "Q", help: "Steady flow through one constant-ID circular line segment.", defaultValue: 30, defaultUnit: "L/min" },
      { id: "insideDiameter", label: "Line inside diameter", symbol: "Di", help: "Actual internal diameter, not nominal hose or pipe size.", defaultValue: 16, defaultUnit: "mm" },
      { id: "lineLength", label: "Straight line length", symbol: "L", help: "Declared straight length only; fittings, bends, and networks are excluded.", defaultValue: 10, defaultUnit: "m", signed: true },
      { id: "frictionFactor", label: "Declared Darcy friction factor", symbol: "f", help: "User-entered Darcy friction factor; it is not derived or selected by this workspace.", defaultValue: 0.03, defaultUnit: "—" },
      { id: "fluidDensity", label: "Declared fluid density", symbol: "ρ", help: "User-entered density at the stated fluid condition; viscosity and temperature changes are excluded.", defaultValue: 850, defaultUnit: "kg/m³" },
      { id: "referenceVelocity", label: "Declared reference velocity", symbol: "vref", help: "A user-stated comparison value; this workspace does not select an acceptable limit.", defaultValue: 4, defaultUnit: "m/s" },
    ],
    outputs: [
      { id: "area", label: "Internal flow area", defaultUnit: "mm²", expression: "(pi*((insideDiameter)/(1000))^(2)/4)*1e6" },
      { id: "velocity", label: "Mean line velocity", defaultUnit: "m/s", expression: "((flow)/60000/(pi*((insideDiameter)/(1000))^(2)/4))" },
      { id: "majorLoss", label: "Declared-fluid Darcy major loss", defaultUnit: "kPa", expression: "((frictionFactor)*((lineLength)/((insideDiameter)/1000))*(fluidDensity)*(((flow)/60000/(pi*((insideDiameter)/(1000))^(2)/4)))^(2)/2)/1000" },
      { id: "referenceRatio", label: "Mean velocity / declared reference", defaultUnit: "%", expression: "(((flow)/60000/(pi*((insideDiameter)/(1000))^(2)/4))/(referenceVelocity))*100" },
    ],
    formula: "A = πDi²/4 · vmean = Q/A · Δpmajor = f(L/Di)(ρv²/2) · comparison = vmean/vref",
    warnings: ["This calculates mean velocity and a user-factor Darcy major loss in one constant-ID, straight, steady hydraulic line. It does not select hose, tube, or pipe size; prescribe an acceptable velocity or friction factor; calculate Reynolds number, fittings/minor losses, bends, networks, elevation, surge, cavitation, viscosity/temperature variation, pressure rating, routing, hydraulic-system safety, or approval."],
  }),
  hydraulicLossBudget: libraryDoc("hydraulicLossBudget", {
    fields: [
      { id: "pressureDrop", label: "Declared pressure drop", symbol: "Δp", help: "User-entered pressure loss across the stated bounded circuit element or aggregate; no network is solved.", defaultValue: 25, defaultUnit: "bar" },
      { id: "flow", label: "Declared hydraulic flow", symbol: "Q", help: "User-entered flow through the stated pressure-drop record; duty, leakage, and flow distribution are not derived.", defaultValue: 60, defaultUnit: "L/min" },
      { id: "activeTimeFraction", label: "Declared active-time fraction", symbol: "D", help: "Percent greater than 0 through 100 used to report a literal time-scaled loss-power average.", defaultValue: 40, defaultUnit: "%" },
    ],
    outputs: [
      { id: "lossPower", label: "Literal hydraulic pressure-drop power", defaultUnit: "kW", expression: "((pressureDrop)*(flow)/600)" },
      { id: "averageLossPower", label: "Literal active-time-scaled loss power", defaultUnit: "kW", expression: "(((pressureDrop)*(flow)/600)*(activeTimeFraction)/100)" },
      { id: "lossEnergyPerHour", label: "Literal loss energy per elapsed hour", defaultUnit: "kWh/elapsed h", expression: "((((pressureDrop)*(flow)/600)*(activeTimeFraction)/100))" },
      { id: "activeTimeFraction", label: "Declared active-time fraction", defaultUnit: "%", expression: "(activeTimeFraction)" },
    ],
    formula: "Ploss = Δp·Q/600 · Pavg = Ploss·D/100 · Eper elapsed hour = Pavg·1 h",
    warnings: ["This multiplies only a declared pressure drop by a declared flow, then scales the result by a declared active-time fraction. It does not select a pump, valve, hose, reservoir, accumulator, cooler, or component; infer system efficiency; model networks, temperature, fluid properties, accumulators, heat rejection, duty cycles beyond the stated scalar fraction, capacity, safety, suitability, or approval."],
  }),
  hydraulicMotor: libraryDoc("hydraulicMotor", {
    fields: [
      { id: "displacement", label: "Motor displacement", symbol: "Vd", help: "Geometric positive-displacement volume per shaft revolution.", defaultValue: 50, defaultUnit: "cm³/rev" },
      { id: "pressure", label: "Declared pressure drop", symbol: "Δp", help: "Pressure drop across the motor at the stated point, not a component pressure-rating check.", defaultValue: 160, defaultUnit: "bar" },
      { id: "flow", label: "Declared inlet flow", symbol: "Q", help: "Steady inlet flow; the system circuit and leakage paths are not modeled.", defaultValue: 45, defaultUnit: "L/min" },
      { id: "mechanicalEfficiency", label: "Declared mechanical efficiency", symbol: "ηm", help: "User-entered percentage used only to screen shaft torque.", defaultValue: 88, defaultUnit: "%" },
      { id: "volumetricEfficiency", label: "Declared volumetric efficiency", symbol: "ηv", help: "User-entered percentage used only to screen shaft speed.", defaultValue: 92, defaultUnit: "%" },
    ],
    outputs: [
      { id: "theoreticalTorque", label: "Theoretical shaft torque", defaultUnit: "N·m", expression: "((pressure)*1e5*(displacement)*1e-6/(2*pi))" },
      { id: "actualTorque", label: "Declared-efficiency shaft torque", defaultUnit: "N·m", expression: "(((pressure)*1e5*(displacement)*1e-6/(2*pi))*(mechanicalEfficiency)/100)" },
      { id: "idealSpeed", label: "Ideal shaft speed", defaultUnit: "rpm", expression: "((flow)*1000/(displacement))" },
      { id: "actualSpeed", label: "Declared-efficiency shaft speed", defaultUnit: "rpm", expression: "(((flow)*1000/(displacement))*(volumetricEfficiency)/100)" },
      { id: "hydraulicPower", label: "Hydraulic input power", defaultUnit: "kW", expression: "((pressure)*(flow)/600)" },
      { id: "shaftPower", label: "Declared-efficiency shaft output", defaultUnit: "kW", expression: "((((pressure)*1e5*(displacement)*1e-6/(2*pi))*(mechanicalEfficiency)/100)*(((flow)*1000/(displacement))*(volumetricEfficiency)/100)*2*pi/60/1000)" },
    ],
    formula: "Ttheory = ΔpVd/(2π) · Tdeclared = ηmTtheory · nideal = Q/Vd · ndeclar​ed = ηvnideal · Pshaft = Tω",
    warnings: ["This is a steady positive-displacement hydraulic-motor screen using user-entered displacement, pressure, flow, and efficiencies. It does not select a motor, evaluate starting torque, load matching, speed limits, pressure ratings, leakage beyond the declared efficiencies, fluid condition, temperature, cavitation, heat, braking, controls, structural mounting, system transients, or safety/compliance."],
  }),
  hydraulicPump: libraryDoc("hydraulicPump", {
    fields: [
      { id: "displacement", label: "Pump displacement", symbol: "Vd", help: "Geometric positive-displacement volume per shaft revolution.", defaultValue: 25, defaultUnit: "cm³/rev" },
      { id: "speed", label: "Pump shaft speed", symbol: "n", help: "Declared pump input speed in the steady operating point.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "pressure", label: "Declared pressure rise", symbol: "Δp", help: "Pressure rise across the pump at the stated point, not a component pressure-rating check.", defaultValue: 180, defaultUnit: "bar" },
      { id: "volumetricEfficiency", label: "Declared volumetric efficiency", symbol: "ηv", help: "User-entered percentage used only to screen actual outlet flow.", defaultValue: 92, defaultUnit: "%" },
      { id: "overallEfficiency", label: "Declared overall efficiency", symbol: "ηo", help: "User-entered percentage used only to screen shaft input from hydraulic output.", defaultValue: 84, defaultUnit: "%" },
    ],
    outputs: [
      { id: "idealFlow", label: "Ideal outlet flow", defaultUnit: "L/min", expression: "((displacement)*(speed)/1000)" },
      { id: "actualFlow", label: "Declared-efficiency outlet flow", defaultUnit: "L/min", expression: "(((displacement)*(speed)/1000)*(volumetricEfficiency)/100)" },
      { id: "hydraulicPower", label: "Hydraulic output power", defaultUnit: "kW", expression: "((pressure)*(((displacement)*(speed)/1000)*(volumetricEfficiency)/100)/600)" },
      { id: "shaftPower", label: "Declared-efficiency shaft input power", defaultUnit: "kW", expression: "(((pressure)*(((displacement)*(speed)/1000)*(volumetricEfficiency)/100)/600)/((overallEfficiency)/100))" },
      { id: "theoreticalTorque", label: "Theoretical pressure-displacement input torque", defaultUnit: "N·m", expression: "((pressure)*1e5*(displacement)*1e-6/(2*pi))" },
    ],
    formula: "Qideal = Vd·n · Qdeclared = ηvQideal · Phyd = ΔpQ/600 · Pin = Phyd/ηo · Ttheory = ΔpVd/(2π)",
    warnings: ["This is a steady positive-displacement pump screen using user-entered displacement, pressure, and efficiencies. It does not select a pump, motor, drive, relief setting, fluid, line, reservoir, cooling method, or rating; model cavitation, leakage beyond the declared efficiency, pressure ripple, heat balance, transient load, or component/system safety; or approve a fluid-power system."],
  }),
  hydraulicReservoirDwell: libraryDoc("hydraulicReservoirDwell", {
    fields: [
      { id: "workingVolume", label: "Declared working reservoir volume", symbol: "Vworking", help: "User-entered liquid working volume; tank geometry, fluid level, and total vessel capacity are not derived.", family: "volume", defaultValue: 150, defaultUnit: "L" },
      { id: "returnFlow", label: "Declared return or pump flow", symbol: "Qreturn", help: "User-entered steady flow used only for literal volume-over-flow dwell arithmetic.", family: "volumetricFlow", defaultValue: 30, defaultUnit: "L/min" },
      { id: "referenceDwellTime", label: "Declared dwell-time reference", symbol: "tref", help: "User-entered time reference for a literal equivalent-volume comparison; it is not a requirement or recommendation.", family: "time", defaultValue: 4, defaultUnit: "min" }
    ],
    outputs: [
      { id: "dwellTime", label: "Literal reservoir dwell time", family: "time", defaultUnit: "min", expression: "((workingVolume/0.001)/(returnFlow/0.0000166666666666667))*60" },
      { id: "referenceVolume", label: "Literal volume at declared dwell-time reference", family: "volume", defaultUnit: "L", expression: "((returnFlow/0.0000166666666666667)*(referenceDwellTime/60))*0.001" },
      { id: "dwellReferenceRatio", label: "Literal dwell-time / reference ratio", family: "dimensionless", defaultUnit: "1", expression: "((workingVolume/0.001)/(returnFlow/0.0000166666666666667))/(referenceDwellTime/60)" },
      { id: "returnFlow", label: "Declared return or pump flow", family: "volumetricFlow", defaultUnit: "L/min", expression: "((returnFlow/0.0000166666666666667))*0.0000166666666666667" }
    ],
    formula: "tdwell = Vworking/Qreturn · Vref = Qreturn·tref · ratio = tdwell/tref",
    warnings: ["This divides only a declared working reservoir volume by a declared steady flow, then compares that result to a user-entered reference time. It does not select a reservoir, apply a rule-of-thumb, estimate cooling, aeration, contamination, geometry, fluid level, heat rejection, flow distribution, capacity, safety, suitability, or approval."],
  }),
  hydrostatic: libraryDoc("hydrostatic", {
    fields: [
      { id: "density", label: "Liquid density", symbol: "ρ", help: "User-entered density for the stated liquid condition.", family: "density", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "depth", label: "Vertical depth", symbol: "h", help: "Vertical distance below the free surface, not an inclined path length.", family: "length", defaultValue: 2.5, defaultUnit: "m" }
    ],
    outputs: [
      { id: "pressure", label: "Gauge pressure", family: "pressure", defaultUnit: "kPa", expression: "density*9.80665*depth" },
      { id: "pressureBar", label: "Gauge pressure", family: "pressure", defaultUnit: "bar", expression: "density*9.80665*depth" },
      { id: "head", label: "Pressure head", family: "length", defaultUnit: "m", expression: "depth" }
    ],
    formula: "pg = ρgh",
    warnings: ["This is the static hydrostatic relation for a uniform-density liquid. It excludes flow, gas compression, temperature-dependent density, vessel loads, and any pressure-rating or design decision."],
  }),
  manningUniformFlow: libraryDoc("manningUniformFlow", {
    fields: [
      { id: "manningRoughness", label: "Declared Manning roughness coefficient", symbol: "n", help: "User-entered roughness coefficient; material, vegetation, geometry, and roughness selection are not derived.", family: "dimensionless", defaultValue: 0.03, defaultUnit: "1" },
      { id: "hydraulicRadius", label: "Declared hydraulic radius", symbol: "R", help: "User-entered hydraulic radius for the stated section; area and wetted perimeter are not inferred.", family: "length", defaultValue: 1, defaultUnit: "m" },
      { id: "energySlope", label: "Declared energy slope", symbol: "S", help: "User-entered dimensionless energy slope for stated uniform, steady flow; a flow profile is not solved.", family: "dimensionless", defaultValue: 0.001, defaultUnit: "1" },
      { id: "flowArea", label: "Declared flow area", symbol: "A", help: "User-entered wetted flow area; no channel section geometry or water depth is derived.", family: "area", defaultValue: 5, defaultUnit: "m²" }
    ],
    outputs: [
      { id: "meanVelocity", label: "Literal metric Manning mean velocity", family: "speed", defaultUnit: "m/s", expression: "(1/manningRoughness)*hydraulicRadius^(2/3)*sqrt(energySlope)" },
      { id: "discharge", label: "Literal metric Manning discharge", family: "volumetricFlow", defaultUnit: "m³/s", expression: "flowArea*(1/manningRoughness)*hydraulicRadius^(2/3)*sqrt(energySlope)" },
      { id: "hydraulicRadius", label: "Declared hydraulic radius", family: "length", defaultUnit: "m", expression: "hydraulicRadius" },
      { id: "flowArea", label: "Declared flow area", family: "area", defaultUnit: "m²", expression: "flowArea" }
    ],
    formula: "v = (1/n)·R^(2/3)·S^(1/2) · Q = A·v (metric uniform-flow form)",
    warnings: ["This applies only the metric Manning uniform-flow relation to user-declared roughness, hydraulic radius, energy slope, and area. It does not infer cross-section geometry, select roughness, calculate normal depth or a water-surface profile, model nonuniform flow, design a channel, determine flood flow or capacity, safety, suitability, or approval."],
  }),
  minorLosses: libraryDoc("minorLosses", {
    fields: [
      { id: "sumK", label: "Declared total minor-loss coefficient", symbol: "ΣK", help: "User-entered aggregate coefficient for the stated fittings/local effects; no coefficient is selected or inferred.", defaultValue: 4.2, defaultUnit: "—", signed: true },
      { id: "density", label: "Declared fluid density", symbol: "ρ", help: "User-entered density at the stated condition; property lookup is excluded.", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "velocity", label: "Declared reference velocity", symbol: "v", help: "User-entered velocity at the coefficient reference section; passage geometry is not derived.", defaultValue: 2.5, defaultUnit: "m/s", signed: true },
    ],
    outputs: [
      { id: "dynamicPressure", label: "Declared-section dynamic pressure", defaultUnit: "Pa", expression: "((density)*((velocity))^(2)/2)" },
      { id: "pressureLoss", label: "Declared-coefficient minor pressure loss", defaultUnit: "Pa", expression: "((sumK)*((density)*((velocity))^(2)/2))" },
      { id: "headLoss", label: "Equivalent liquid head loss", defaultUnit: "m", expression: "(((sumK)*(((density))*((velocity))^(2)/2))/((density)*9.80665))" },
    ],
    formula: "Δpminor = ΣK·ρv²/2 · hminor = Δp/(ρg)",
    warnings: ["This is a user-entered aggregate-coefficient minor-loss arithmetic screen only. It does not choose or derive fitting coefficients, calculate friction or major loss, size pipe, model networks, elevation, compressibility, cavitation, transient effects, viscosity/temperature variation, pressure rating, equipment selection, safety, or approval."],
  }),
  npshAvailableBudget: libraryDoc("npshAvailableBudget", {
    fields: [
      { id: "surfacePressureHead", label: "Declared absolute surface-pressure head", symbol: "Hsurface", help: "User-entered absolute pressure head at the liquid surface; atmospheric or tank pressure is not derived.", family: "length", defaultValue: 10.33, defaultUnit: "m" },
      { id: "staticSuctionHead", label: "Declared signed static suction head", symbol: "Hsuction", help: "User-entered liquid-surface-to-pump elevation contribution; use positive for a stated flooded-suction contribution and negative for a stated lift.", family: "length", defaultValue: -2, defaultUnit: "m", signed: true },
      { id: "suctionLossHead", label: "Declared suction loss head", symbol: "Hloss", help: "User-entered total suction-side loss head; no pipe, valve, fitting, or flow model is solved.", family: "length", defaultValue: 0.5, defaultUnit: "m" },
      { id: "vaporPressureHead", label: "Declared vapor-pressure head", symbol: "Hvapor", help: "User-entered vapor-pressure head at the stated fluid condition; fluid properties and temperature are not derived.", family: "length", defaultValue: 0.3, defaultUnit: "m" },
      { id: "npshRequiredReference", label: "Declared NPSH-required reference", symbol: "NPSHr", help: "User-entered pump-data reference used only for a literal stated-head difference; it is not assessed for adequacy.", family: "length", defaultValue: 3, defaultUnit: "m" }
    ],
    outputs: [
      { id: "npshAvailable", label: "Literal NPSH available", family: "length", defaultUnit: "m", expression: "surfacePressureHead+staticSuctionHead-suctionLossHead-vaporPressureHead" },
      { id: "npshRequiredReference", label: "Declared NPSH-required reference", family: "length", defaultUnit: "m", expression: "npshRequiredReference" },
      { id: "statedHeadDifference", label: "Literal NPSHa − declared NPSHr difference", family: "length", defaultUnit: "m", expression: "surfacePressureHead+staticSuctionHead-suctionLossHead-vaporPressureHead-npshRequiredReference" },
      { id: "staticSuctionHead", label: "Declared signed static suction head", family: "length", defaultUnit: "m", expression: "staticSuctionHead" }
    ],
    formula: "NPSHa = Hsurface + Hsuction − Hloss − Hvapor · stated difference = NPSHa − NPSHr",
    warnings: ["This sums only user-declared surface-pressure, signed static-suction, suction-loss, and vapor-pressure heads, then subtracts a user-declared NPSH-required reference. It does not calculate properties, determine vapor pressure, derive losses, select a pump, determine cavitation risk, establish NPSH margin adequacy, capacity, safety, suitability, or approval."],
  }),
  orificeFlow: libraryDoc("orificeFlow", {
    fields: [
      { id: "dischargeCoefficient", label: "Discharge coefficient", symbol: "Cd", help: "User-entered dimensionless discharge coefficient from 0 through 1; this screen does not select it.", defaultValue: 0.6, defaultUnit: "—", signed: true },
      { id: "orificeDiameter", label: "Orifice diameter", symbol: "D2", help: "User-entered circular orifice diameter.", defaultValue: 50, defaultUnit: "mm" },
      { id: "pipeDiameter", label: "Pipe internal diameter", symbol: "D1", help: "User-entered circular upstream pipe internal diameter; it must exceed the orifice diameter.", defaultValue: 102, defaultUnit: "mm" },
      { id: "upstreamPressure", label: "Upstream pressure", symbol: "p1", help: "User-entered absolute or gauge pressure on a consistent basis.", defaultValue: 100000, defaultUnit: "Pa", signed: true },
      { id: "downstreamPressure", label: "Downstream pressure", symbol: "p2", help: "User-entered pressure on the same basis as upstream pressure.", defaultValue: 80000, defaultUnit: "Pa", signed: true },
      { id: "density", label: "Fluid density", symbol: "ρ", help: "User-entered incompressible fluid density at the stated condition.", defaultValue: 1000, defaultUnit: "kg/m³" },
    ],
    outputs: [
      { id: "volumetricFlow", label: "Incompressible volumetric flow", defaultUnit: "L/s", expression: "((dischargeCoefficient)*(pi*((orificeDiameter)/(1000))^(2)/4)*sqrt(2*((upstreamPressure)-(downstreamPressure))/((density)*(1-(((orificeDiameter)/(pipeDiameter)))^(4)))))*1000" },
      { id: "massFlow", label: "Mass flow", defaultUnit: "kg/s", expression: "(((dischargeCoefficient)*(pi*((orificeDiameter)/(1000))^(2)/4)*sqrt(2*((upstreamPressure)-(downstreamPressure))/(((density))*(1-(((orificeDiameter)/(pipeDiameter)))^(4)))))*(density))" },
      { id: "throatVelocity", label: "Orifice mean velocity", defaultUnit: "m/s", expression: "(((dischargeCoefficient)*(pi*((orificeDiameter)/(1000))^(2)/4)*sqrt(2*((upstreamPressure)-(downstreamPressure))/((density)*(1-(((orificeDiameter)/(pipeDiameter)))^(4)))))/(pi*((orificeDiameter)/(1000))^(2)/4))" },
      { id: "pressureDrop", label: "Stated pressure difference", defaultUnit: "Pa", expression: "((upstreamPressure)-(downstreamPressure))" },
      { id: "diameterRatio", label: "Orifice / pipe diameter ratio", defaultUnit: "—", expression: "((orificeDiameter)/(pipeDiameter))" },
    ],
    formula: "Q = CdA2√[2(p1−p2)/(ρ(1−β⁴))] · ṁ = ρQ · β = D2/D1",
    warnings: ["This is a steady incompressible pressure-drop screen with user-entered discharge coefficient and circular geometry. It excludes gases/compressibility, choked flow, cavitation, viscosity/Reynolds effects, non-Newtonian fluids, temperature change, pulsation, installation requirements, upstream/downstream disturbance, meter calibration, uncertainty, permanent pressure loss, and acceptance/compliance."],
  }),
  pipeSizing: libraryDoc("pipeSizing", {
    fields: [
      { id: "flow", label: "Declared volumetric flow", symbol: "Q", help: "User-entered flow at the stated condition; fluid compressibility and leakage are excluded.", family: "volumetricFlow", defaultValue: 60, defaultUnit: "L/min" },
      { id: "targetVelocity", label: "Declared target velocity", symbol: "vtarget", help: "User-entered reference velocity only; this workspace does not select a target or pipe schedule.", family: "speed", defaultValue: 2, defaultUnit: "m/s" }
    ],
    outputs: [
      { id: "flow", label: "Declared volumetric flow", family: "volumetricFlow", defaultUnit: "m³/s", expression: "(flow/0.0000166666666666667)/60000" },
      { id: "requiredArea", label: "Required internal flow area at target velocity", family: "area", defaultUnit: "m²", expression: "((flow/0.0000166666666666667)/60000)/targetVelocity" },
      { id: "diameter", label: "Calculated circular inside diameter", family: "length", defaultUnit: "mm", expression: "(sqrt(4*(((flow/0.0000166666666666667)/60000)/targetVelocity)/pi)*1000)*0.001" }
    ],
    formula: "D = √(4Q/(πvtarget)) · A = Q/vtarget",
    warnings: ["This is target-velocity circular-passage arithmetic only. It does not select a nominal pipe, tube, hose, schedule, material, wall thickness, pressure rating, fitting, pump, velocity target, pressure loss, structural support, corrosion allowance, fluid compatibility, safety, or approval."],
  }),
  pneumaticLineLoss: libraryDoc("pneumaticLineLoss", {
    fields: [
      { id: "actualFlow", label: "Actual upstream volumetric flow", symbol: "Q", help: "User-entered actual volumetric flow at the stated upstream condition; standard-flow conversion is excluded.", defaultValue: 0.6, defaultUnit: "m³/min" },
      { id: "insideDiameter", label: "Pipe inside diameter", symbol: "D", help: "Declared constant straight-pipe inside diameter.", defaultValue: 26.6, defaultUnit: "mm" },
      { id: "pipeLength", label: "Straight pipe length", symbol: "L", help: "Declared straight run length; fitting and network equivalents are excluded.", defaultValue: 25, defaultUnit: "m", signed: true },
      { id: "frictionFactor", label: "Declared Darcy friction factor", symbol: "f", help: "User-entered Darcy friction factor for the stated condition; it is not derived or selected here.", defaultValue: 0.02, defaultUnit: "—" },
      { id: "density", label: "Declared upstream air density", symbol: "ρ", help: "User-entered density at the stated upstream condition; density variation is excluded.", defaultValue: 6.7, defaultUnit: "kg/m³" },
      { id: "upstreamPressure", label: "Upstream absolute pressure", symbol: "p₁", help: "Declared upstream absolute pressure used only for the ten-percent approximation guard.", defaultValue: 600, defaultUnit: "kPa abs" },
    ],
    outputs: [
      { id: "area", label: "Declared pipe flow area", defaultUnit: "mm²", expression: "(pi*(((insideDiameter)/1000))^(2)/4)*1e6" },
      { id: "velocity", label: "Mean upstream-density air velocity", defaultUnit: "m/s", expression: "((actualFlow)/60/(pi*(((insideDiameter)/1000))^(2)/4))" },
      { id: "pressureLoss", label: "Declared-density Darcy major loss", defaultUnit: "kPa", expression: "((frictionFactor)*((pipeLength)/((insideDiameter)/1000))*(density)*(((actualFlow)/60/(pi*(((insideDiameter)/1000))^(2)/4)))^(2)/2)/1000" },
      { id: "lossRatio", label: "Major loss / upstream absolute pressure", defaultUnit: "%", expression: "(((frictionFactor)*((pipeLength)/((insideDiameter)/1000))*(density)*(((actualFlow)/60/(pi*(((insideDiameter)/1000))^(2)/4)))^(2)/2)/((upstreamPressure)*1000))*100" },
    ],
    formula: "A = πD²/4 · v = Q/A · Δp = f(L/D)(ρv²/2) · guard: Δp/p₁ < 10%",
    warnings: ["This is a low-pressure straight-pipe compressed-air approximation using user-entered upstream density and Darcy friction factor. It is valid only while the calculated major loss remains below 10% of upstream absolute pressure. It excludes fittings/minor losses, networks, elevation, density/temperature variation, choked flow, compressor or valve selection, line sizing, capacity, safety, and approval."],
  }),
  pumpSystemHeadPoint: libraryDoc("pumpSystemHeadPoint", {
    fields: [
      { id: "staticHead", label: "Declared static-head offset", symbol: "Hstatic", help: "User-entered static head at zero flow; elevation, pressure boundary, and other contributors are not derived.", defaultValue: 10, defaultUnit: "m", signed: true },
      { id: "quadraticLossCoefficient", label: "Declared quadratic-loss coefficient", symbol: "K", help: "User-entered coefficient in compatible head-per-flow-squared units; no pipe, valve, or fitting loss is derived.", defaultValue: 0.5, defaultUnit: "m/(L/s)²", signed: true },
      { id: "flowPoint", label: "Declared flow point", symbol: "Q", help: "User-entered flow point used only to report one literal system-head value.", defaultValue: 4, defaultUnit: "L/s", signed: true },
    ],
    outputs: [
      { id: "systemHead", label: "Literal declared system head at flow point", defaultUnit: "m", expression: "((staticHead)+((quadraticLossCoefficient)*((flowPoint))^(2)))" },
      { id: "staticHead", label: "Declared static-head offset", defaultUnit: "m", expression: "(staticHead)" },
      { id: "quadraticLossHead", label: "Literal declared quadratic loss head", defaultUnit: "m", expression: "((quadraticLossCoefficient)*((flowPoint))^(2))" },
      { id: "flowPoint", label: "Declared flow point", defaultUnit: "L/s", expression: "(flowPoint)" },
    ],
    formula: "Hsystem(Q) = Hstatic + K·Q²",
    warnings: ["This adds only a declared static-head offset to a declared quadratic-loss coefficient at one declared flow point. It does not derive the coefficient; model pipe, fitting, or valve losses; generate a full curve; find an operating point; compare a pump curve; select a pump; determine NPSH, capacity, efficiency, safety, suitability, or approval."],
  }),
  reynoldsNumber: libraryDoc("reynoldsNumber", {
    fields: [
      { id: "density", label: "Declared fluid density", symbol: "ρ", help: "User-entered density at the stated condition; this workspace does not derive properties.", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "velocity", label: "Declared bulk velocity", symbol: "u", help: "Representative velocity selected by the user for the stated passage.", defaultValue: 1.5, defaultUnit: "m/s", signed: true },
      { id: "hydraulicDiameter", label: "Declared hydraulic diameter", symbol: "Dh", help: "Characteristic hydraulic diameter for the stated passage; geometry is not derived.", defaultValue: 0.02, defaultUnit: "m" },
      { id: "dynamicViscosity", label: "Declared dynamic viscosity", symbol: "μ", help: "User-entered dynamic viscosity at the stated condition; temperature/property lookup is excluded.", defaultValue: 0.001, defaultUnit: "Pa·s" },
      { id: "referenceThreshold", label: "Declared reference threshold", symbol: "Reref", help: "Contextual divisor only; it does not classify flow or select a correlation.", defaultValue: 2300, defaultUnit: "—" },
    ],
    outputs: [
      { id: "reynolds", label: "Reynolds number", defaultUnit: "—", expression: "density*velocity*hydraulicDiameter/dynamicViscosity" },
      { id: "kinematicViscosity", label: "Declared-condition kinematic viscosity", defaultUnit: "m²/s", expression: "dynamicViscosity/density" },
      { id: "thresholdRatio", label: "Ratio to declared reference threshold", defaultUnit: "×", expression: "(density*velocity*hydraulicDiameter/dynamicViscosity)/referenceThreshold" },
    ],
    formula: "Re = ρuDh/μ = uDh/ν · ν = μ/ρ · ratio = Re/Reref",
    warnings: ["This is a declared-property Reynolds-number arithmetic screen only. It does not classify a flow regime, select a friction factor or heat/mass-transfer correlation, calculate pressure loss, infer fluid properties, account for roughness, entrance effects, non-Newtonian behavior, multiphase flow, compressibility, geometry, equipment suitability, safety, or approval."],
  }),
  submergedPlane: libraryDoc("submergedPlane", {
    fields: [
      { id: "fluidDensity", label: "Declared fluid density", symbol: "ρ", help: "Constant user-entered density; density variation and fluid-property lookup are excluded.", defaultValue: 1000, defaultUnit: "kg/m³" },
      { id: "width", label: "Rectangle width", symbol: "b", help: "User-entered horizontal width of a fully submerged vertical rectangle.", defaultValue: 1.2, defaultUnit: "m" },
      { id: "height", label: "Rectangle height", symbol: "h", help: "User-entered vertical height of the fully submerged rectangular plane.", defaultValue: 0.8, defaultUnit: "m" },
      { id: "centroidDepth", label: "Declared centroid depth", symbol: "yc", help: "Vertical depth of the rectangle centroid below the free surface; orientation is fixed to vertical.", defaultValue: 2.5, defaultUnit: "m" },
    ],
    outputs: [
      { id: "area", label: "Rectangle area", defaultUnit: "m²", expression: "((width)*(height))" },
      { id: "resultantForce", label: "Hydrostatic resultant force", defaultUnit: "kN", expression: "((fluidDensity)*9.80665*(centroidDepth)*((width)*(height)))/1000" },
      { id: "centroidalInertia", label: "Rectangle centroidal second moment", defaultUnit: "m⁴", expression: "((width)*((height))^(3)/12)" },
      { id: "centerOffset", label: "Center-of-pressure offset below centroid", defaultUnit: "m", expression: "(((width)*((height))^(3)/12)/(((width)*(height))*(centroidDepth)))" },
      { id: "centerDepth", label: "Center-of-pressure depth below free surface", defaultUnit: "m", expression: "((centroidDepth)+(((width)*((height))^(3)/12)/(((width)*(height))*(centroidDepth))))" },
    ],
    formula: "F = ρgycA · Ix = bh³/12 · yCP = yc + Ix/(Ayc)",
    warnings: ["This is a fully submerged vertical rectangular-plane, constant-density hydrostatic arithmetic screen only. It does not analyze inclined or curved surfaces, variable density, free-surface motion, vessel or support structure, plate stress, fasteners, pressure rating, installation, safety, or approval."],
  }),
  vacuumEvacuation: libraryDoc("vacuumEvacuation", {
    fields: [
      { id: "vesselVolume", label: "Declared evacuated volume", symbol: "V", help: "Closed vessel and connected volume represented by this one stated volume.", defaultValue: 100, defaultUnit: "L" },
      { id: "effectiveSpeed", label: "Declared effective pumping speed", symbol: "S", help: "User-entered effective speed at the vessel for this interval; no pump curve or conductance calculation is applied.", defaultValue: 10, defaultUnit: "L/s" },
      { id: "startPressure", label: "Start absolute pressure", symbol: "p₁", help: "User-entered start pressure in the same absolute-pressure basis as the target pressure.", defaultValue: 1000, defaultUnit: "mbar abs" },
      { id: "targetPressure", label: "Target absolute pressure", symbol: "p₂", help: "User-entered target pressure below the start pressure in the same absolute-pressure basis.", defaultValue: 100, defaultUnit: "mbar abs" },
      { id: "targetTime", label: "Declared evacuation-time target", symbol: "tₜ", help: "User-entered target interval used only for reverse effective-speed arithmetic.", defaultValue: 20, defaultUnit: "s" },
    ],
    outputs: [
      { id: "pressureRatio", label: "Declared pressure ratio p₁/p₂", defaultUnit: "—", expression: "((startPressure)/(targetPressure))" },
      { id: "idealTime", label: "Ideal constant-speed evacuation time", defaultUnit: "s", expression: "((vesselVolume)/(effectiveSpeed)*(ln(((startPressure)/(targetPressure)))))" },
      { id: "requiredEffectiveSpeed", label: "Effective speed for declared time target", defaultUnit: "L/s", expression: "((vesselVolume)/(targetTime)*(ln(((startPressure)/(targetPressure)))))" },
      { id: "declaredToRequiredSpeedRatio", label: "Declared / required effective-speed ratio", defaultUnit: "—", expression: "((effectiveSpeed)/((vesselVolume)/(targetTime)*(ln(((startPressure)/(targetPressure))))))" },
    ],
    formula: "t = (V/S) ln(p₁/p₂) · Srequired = (V/ttarget) ln(p₁/p₂)",
    warnings: ["This is a single constant-effective-speed, ideal logarithmic evacuation interval using user-declared vessel volume and effective pumping speed. It does not calculate pump curves, conductance, piping/network losses, leakage, desorption/outgassing, vapour load, thermal behavior, gas composition, compressible/choked flow, equipment sizing, pump selection, capacity, life, safety, or approval. Real evacuation time can be longer than this ideal arithmetic result."],
  }),
  vacuumLeakageBudget: libraryDoc("vacuumLeakageBudget", {
    fields: [
      { id: "leakagePerPoint", label: "Declared normalized leakage per active point", symbol: "qleak", help: "User-entered normalized leakage demand for one active vacuum point; leakage is not inferred from a workpiece, conductance, or test.", defaultValue: 2.5, defaultUnit: "NL/min" },
      { id: "activePointCount", label: "Declared active vacuum-point count", symbol: "z", help: "Positive whole count of stated active vacuum points with the same declared leakage record.", defaultValue: 4, defaultUnit: "points" },
      { id: "activeTimeFraction", label: "Declared active-time fraction", symbol: "D", help: "Percent greater than 0 through 100 used only to scale the declared leakage demand.", defaultValue: 50, defaultUnit: "%" },
      { id: "referenceSuctionFlow", label: "Declared reference suction flow", symbol: "Qref", help: "User-entered reference suction-flow value for literal ratio arithmetic only; it is not a capacity result or selection input.", defaultValue: 8, defaultUnit: "NL/min" },
    ],
    outputs: [
      { id: "averageLeakageDemand", label: "Literal average normalized leakage demand", defaultUnit: "NL/min", expression: "((leakagePerPoint)*(activePointCount)*(activeTimeFraction)/100)" },
      { id: "referenceSuctionFlow", label: "Declared reference suction flow", defaultUnit: "NL/min", expression: "(referenceSuctionFlow)" },
      { id: "referenceSuctionRatio", label: "Literal leakage demand / reference-flow ratio", defaultUnit: "—", expression: "(((leakagePerPoint)*(activePointCount)*(activeTimeFraction)/100)/(referenceSuctionFlow))" },
      { id: "leakageVolumePerHour", label: "Literal leakage volume per elapsed hour", defaultUnit: "NL/elapsed h", expression: "(((leakagePerPoint)*(activePointCount)*(activeTimeFraction)/100)*60)" },
    ],
    formula: "Qleak,avg = qleak·z·D/100 · ratio = Qleak,avg/Qref · Vper elapsed hour = 60·Qleak,avg",
    warnings: ["This aggregates only user-declared normalized leakage demand, active vacuum-point count, and active-time fraction. It does not infer leakage from workpiece geometry, surface condition, conductance, porous materials, vacuum level, response time, or test data; select a vacuum generator, pump, pad, or number of pads; assess capacity, safety, suitability, or approval."],
  }),
  valveCv: libraryDoc("valveCv", {
    fields: [
      { id: "cv", label: "Declared liquid Cv", symbol: "Cv", help: "User-entered valve coefficient under a declared liquid-water convention.", family: "dimensionless", defaultValue: 1.5, defaultUnit: "1" },
      { id: "specificGravity", label: "Liquid specific gravity", symbol: "SG", help: "User-entered liquid specific gravity relative to water at the declared condition.", family: "dimensionless", defaultValue: 1, defaultUnit: "1" },
      { id: "pressureDrop", label: "Liquid pressure drop", symbol: "ΔP", help: "User-entered liquid pressure drop across the valve.", family: "pressure", defaultValue: 10, defaultUnit: "psi" },
      { id: "flow", label: "Declared liquid flow", symbol: "Q", help: "User-entered liquid flow for the reverse required-Cv result.", family: "volumetricFlow", defaultValue: 4.74, defaultUnit: "US gpm" }
    ],
    outputs: [
      { id: "liquidFlow", label: "Flow from declared Cv", family: "volumetricFlow", defaultUnit: "US gpm", expression: "(cv*sqrt((pressureDrop/6894.757293168)/specificGravity))*0.0000630901964" },
      { id: "requiredCv", label: "Required Cv from declared flow", family: "dimensionless", defaultUnit: "1", expression: "(flow/0.0000630901964)*sqrt(specificGravity/(pressureDrop/6894.757293168))" }
    ],
    formula: "Q = Cv√(ΔP/SG) · Cvrequired = Q√(SG/ΔP)",
    warnings: ["This is a liquid-water Cv convention only. Do not use it for compressible air, pneumatic valve sizing, gas flow, flashing, choking, cavitation, viscosity correction, pressure-recovery correction, two-phase flow, or a manufacturer-specific valve rating/test condition. Confirm the supplier’s published flow method before selecting hardware."],
  }),
};
