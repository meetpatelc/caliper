import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Motion and automation models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const automationDocuments: Record<string, InstrumentDocument> = {
  airConsumption: libraryDoc("airConsumption", {
    fields: [
      { id: "bore", label: "Cylinder bore", symbol: "D", help: "Nominal internal bore diameter.", defaultValue: 50, defaultUnit: "mm" },
      { id: "rod", label: "Rod diameter", symbol: "d", help: "Rod diameter used for retract-side volume.", defaultValue: 20, defaultUnit: "mm" },
      { id: "stroke", label: "Stroke", symbol: "s", help: "Full extend and full retract travel per stated double-acting cycle.", defaultValue: 250, defaultUnit: "mm" },
      { id: "pressure", label: "Operating pressure", symbol: "P", help: "Gauge pressure at the cylinder; atmospheric pressure is added for the normalized free-air approximation.", defaultValue: 6, defaultUnit: "bar(g)" },
      { id: "cycles", label: "Cycle rate", symbol: "c", help: "Completed double-acting cycles per minute.", defaultValue: 18, defaultUnit: "cycles/min" },
    ],
    outputs: [
      { id: "cycleAir", label: "Ideal normalized free air per cycle", defaultUnit: "NL/cycle", expression: "pi*(2*bore^2-rod^2)/4*(stroke/1e6)*(pressure+1)" },
      { id: "minuteAir", label: "Ideal normalized free-air rate", defaultUnit: "NL/min", expression: "pi*(2*bore^2-rod^2)/4*(stroke/1e6)*(pressure+1)*cycles" },
      { id: "sweptVolume", label: "Cylinder swept volume per cycle", defaultUnit: "L/cycle", expression: "pi*(2*bore^2-rod^2)/4*(stroke/1e6)" },
    ],
    formula: "Vfree = (Aextend + Aretract)s·(Pgauge + 1 bar)",
    warnings: ["This is an ideal double-acting full-stroke consumption estimate normalized to 1 bar absolute. It excludes dead volume, cushioning, valve/line loss, leakage, regulator dynamics, air temperature, compressor duty, load motion, speed control, and component sizing."],
  }),
  clampForce: libraryDoc("clampForce", {
    fields: [
      { id: "actuatorForce", label: "Actuator force", symbol: "F", help: "Known force at the stated linkage input.", defaultValue: 2.5, defaultUnit: "kN" },
      { id: "angle", label: "Transfer angle", symbol: "θ", help: "Angle between actuator direction and transferred force direction.", defaultValue: 60, defaultUnit: "°", signed: true },
      { id: "efficiency", label: "Transmission efficiency", symbol: "η", help: "User-entered multiplier for joint/friction losses, from 0 to 100.", defaultValue: 90, defaultUnit: "%" },
    ],
    outputs: [
      { id: "transferred", label: "Transferred clamp force", defaultUnit: "kN", expression: "actuatorForce*sin(angle*pi/180)*efficiency/100" },
      { id: "pivot", label: "Ideal pivot-side component", defaultUnit: "kN", expression: "actuatorForce*abs(cos(angle*pi/180))" },
      { id: "transferRatio", label: "Force transfer ratio", defaultUnit: "—", expression: "sin(angle*pi/180)*efficiency/100" },
    ],
    formula: "Ftransfer = F·sin(θ)·η · Fpivot = F·|cos(θ)|",
    warnings: ["This is one planar transfer-angle relationship. It excludes linkage stiffness, bearing/friction variation, dynamics, buckling, contact geometry, retaining force under vibration, and machine-safety assessment."],
  }),
  leadScrew: libraryDoc("leadScrew", {
    fields: [
      { id: "axialForce", label: "Axial load", symbol: "F", help: "Constant axial load at the nut in the stated direction.", defaultValue: 4, defaultUnit: "kN" },
      { id: "lead", label: "Screw lead", symbol: "l", help: "Linear nut travel per screw revolution.", defaultValue: 10, defaultUnit: "mm/rev" },
      { id: "efficiency", label: "Mechanical efficiency", symbol: "η", help: "User-entered combined screw/nut efficiency from 0 to 100.", defaultValue: 82, defaultUnit: "%" },
      { id: "rpm", label: "Screw speed", symbol: "n", help: "Constant screw rotational speed.", defaultValue: 600, defaultUnit: "rpm" },
    ],
    outputs: [
      { id: "torque", label: "Ideal raising torque", family: "torque", defaultUnit: "N·m", expression: "axialForce*1000*(lead/1000)/(2*pi*efficiency/100)" },
      { id: "speed", label: "Linear travel speed", defaultUnit: "mm/s", expression: "lead*rpm/60" },
      { id: "power", label: "Mechanical output power", defaultUnit: "kW", expression: "axialForce*1000*(lead/1000)*rpm/60/1000" },
    ],
    formula: "T = F·l/(2πη) · v = l·n/60 · P = Fv",
    warnings: ["This is an ideal constant-load power-screw relationship using a user-entered efficiency. It excludes thread geometry verification, friction variation, back-driving, buckling, critical speed, bearings, misalignment, acceleration torque, duty cycle, lubrication, wear, and component selection."],
  }),
  motionProfile: libraryDoc("motionProfile", {
    fields: [
      { id: "distance", label: "Move distance", symbol: "s", help: "Rest-to-rest travel distance for the stated linear or angular axis.", defaultValue: 500, defaultUnit: "mm" },
      { id: "accelTime", label: "Acceleration time", symbol: "ta", help: "Time for each equal acceleration and deceleration phase.", defaultValue: 0.25, defaultUnit: "s" },
      { id: "cruiseTime", label: "Cruise time", symbol: "tc", help: "Constant-velocity phase time; enter zero only for a triangular profile.", defaultValue: 0.5, defaultUnit: "s", signed: true },
    ],
    outputs: [
      { id: "acceleration", label: "Profile acceleration", family: "acceleration", defaultUnit: "m/s²", expression: "(distance/1000)/(accelTime*(accelTime+cruiseTime))" },
      { id: "peakSpeed", label: "Peak speed", family: "speed", defaultUnit: "m/s", expression: "(distance/1000)/(accelTime+cruiseTime)" },
      { id: "totalTime", label: "Total move time", family: "time", defaultUnit: "s", expression: "2*accelTime+cruiseTime" },
      { id: "distance", label: "Move distance", defaultUnit: "mm", expression: "distance" },
    ],
    formula: "a = s / [ta(ta + tc)] · vmax = a·ta · T = 2ta + tc",
    warnings: ["This is an ideal symmetric trapezoidal/triangular profile. It excludes jerk limits, structural compliance, load inertia, friction, servo tuning, actuator force limits, and safety margins."],
  }),
  pneumatic: libraryDoc("pneumatic", {
    fields: [
      { id: "bore", label: "Cylinder bore", symbol: "D", help: "Nominal internal bore diameter.", defaultValue: 50, defaultUnit: "mm" },
      { id: "rod", label: "Rod diameter", symbol: "d", help: "Rod diameter used to reduce retract-side area.", defaultValue: 20, defaultUnit: "mm" },
      { id: "pressure", label: "Operating pressure", symbol: "P", help: "Pressure at the actuator, not nominal compressor rating.", defaultValue: 6, defaultUnit: "bar(g)" },
      { id: "efficiency", label: "Applied force factor", symbol: "η", help: "User-entered multiplier after friction and practical derating, from 0 to 100.", defaultValue: 85, defaultUnit: "%" },
    ],
    outputs: [
      { id: "extend", label: "Applied extend force", defaultUnit: "kN", expression: "pressure*pi*bore^2*efficiency/4e6" },
      { id: "retract", label: "Applied retract force", defaultUnit: "kN", expression: "pressure*pi*(bore^2-rod^2)*efficiency/4e6" },
      { id: "boreArea", label: "Bore area", defaultUnit: "mm²", expression: "pi*bore^2/4" },
      { id: "retractArea", label: "Retract-side area", defaultUnit: "mm²", expression: "pi*(bore^2-rod^2)/4" },
    ],
    formula: "Fextend = P·Abore·η · Fretract = P(Abore − Arod)·η",
    warnings: ["Pressure times area is theoretical. The applied force factor is user-entered; supply pressure drop, speed, cushioning, side load, seal friction, air flow, impact energy, and safety functions remain outside this screen."],
  }),
  pneumaticCycleTime: libraryDoc("pneumaticCycleTime", {
    fields: [
      { id: "bore", label: "Cylinder bore", symbol: "D", help: "User-entered cylinder bore for ideal head-end volume.", defaultValue: 50, defaultUnit: "mm" },
      { id: "rod", label: "Rod diameter", symbol: "d", help: "User-entered rod diameter for ideal retract annulus volume.", defaultValue: 20, defaultUnit: "mm" },
      { id: "stroke", label: "Stroke", symbol: "L", help: "User-entered travel stroke.", defaultValue: 200, defaultUnit: "mm" },
      { id: "flow", label: "Declared actual cylinder flow", symbol: "Q", help: "User-entered actual volumetric flow at the cylinder; not standard/free-air flow.", defaultValue: 30, defaultUnit: "L/min" },
    ],
    outputs: [
      { id: "extendVolume", label: "Ideal extend volume", defaultUnit: "L", expression: "((pi*((bore))^(2)/4)*(stroke))/1e6" },
      { id: "retractVolume", label: "Ideal retract volume", defaultUnit: "L", expression: "(((pi*((bore))^(2)/4)-(pi*((rod))^(2)/4))*(stroke))/1e6" },
      { id: "extendSpeed", label: "Ideal extend speed", defaultUnit: "mm/s", expression: "(((flow)*1e6/60)/(pi*((bore))^(2)/4))" },
      { id: "retractSpeed", label: "Ideal retract speed", defaultUnit: "mm/s", expression: "(((flow)*1e6/60)/((pi*((bore))^(2)/4)-(pi*((rod))^(2)/4)))" },
      { id: "extendTime", label: "Ideal extend time", family: "time", defaultUnit: "s", expression: "(stroke)/(((flow)*1e6/60)/(pi*((bore))^(2)/4))" },
      { id: "retractTime", label: "Ideal retract time", family: "time", defaultUnit: "s", expression: "(stroke)/(((flow)*1e6/60)/((pi*((bore))^(2)/4)-(pi*((rod))^(2)/4)))" },
    ],
    formula: "Ahead = πD²/4 · Aannulus = π(D² − d²)/4 · v = Qactual/A · t = L/v",
    warnings: ["This screen uses the user-declared actual volumetric flow at the cylinder. Do not enter SCFM, NL/min, or free-air flow unless it has already been converted to actual cylinder conditions. It does not model compressibility, pressure, valve Cv, tubing, flow controls, leakage, friction, load, acceleration, cushioning, end stops, or real cycle-time validation."],
  }),
  pneumaticDemandBudget: libraryDoc("pneumaticDemandBudget", {
    fields: [
      { id: "normalizedAirPerCycle", label: "Declared normalized air demand per cycle", symbol: "qcycle", help: "User-entered normalized free-air demand per one completed device cycle; cylinder geometry and pressure are not derived.", defaultValue: 1.2, defaultUnit: "NL/cycle" },
      { id: "cycleRate", label: "Declared cycle rate per device", symbol: "ncycle", help: "User-entered repeated cycles per minute for each stated active device.", defaultValue: 30, defaultUnit: "cycles/min" },
      { id: "activeDeviceCount", label: "Declared active-device count", symbol: "z", help: "Positive whole count of devices sharing the same declared demand record.", defaultValue: 2, defaultUnit: "devices" },
      { id: "dutyFraction", label: "Declared active-time fraction", symbol: "D", help: "Percent greater than 0 through 100 used only to scale stated repeated demand.", defaultValue: 80, defaultUnit: "%" },
      { id: "referenceSupplyFlow", label: "Declared reference supply flow", symbol: "Qref", help: "User-entered normalized reference flow for literal ratio arithmetic only; it is not a capacity rating or selection input.", defaultValue: 100, defaultUnit: "NL/min" },
    ],
    outputs: [
      { id: "aggregateCycleRate", label: "Literal aggregate active cycle rate", defaultUnit: "cycles/min", expression: "((cycleRate)*(activeDeviceCount)*(dutyFraction)/100)" },
      { id: "averageNormalizedFlow", label: "Literal average normalized air demand", defaultUnit: "NL/min", expression: "((normalizedAirPerCycle)*((cycleRate)*(activeDeviceCount)*(dutyFraction)/100))" },
      { id: "referenceSupplyFlow", label: "Declared reference supply flow", defaultUnit: "NL/min", expression: "(referenceSupplyFlow)" },
      { id: "referenceFlowRatio", label: "Literal demand / reference-flow ratio", defaultUnit: "—", expression: "(((normalizedAirPerCycle)*((cycleRate)*(activeDeviceCount)*(dutyFraction)/100))/(referenceSupplyFlow))" },
    ],
    formula: "nactive = ncycle·z·D/100 · Qavg = qcycle·nactive · ratio = Qavg/Qref",
    warnings: ["This aggregates only user-declared normalized air demand, cycle rate, active-device count, and active-time fraction. It does not derive cylinder consumption; select or size a compressor, FRL, tubing, valve, or vacuum generator; model pressure-drop networks, air storage, leaks, duty transients, compressor curves, air quality, capacity, safety, suitability, or approval."],
  }),
  reflectedInertia: libraryDoc("reflectedInertia", {
    fields: [
      { id: "loadInertia", label: "Load inertia", symbol: "JL", help: "Stated inertia at the driven side of the ideal reduction.", defaultValue: 0.08, defaultUnit: "kg·m²" },
      { id: "gearRatio", label: "Reduction ratio", symbol: "N", help: "Driven speed divided by motor speed is 1/N; enter N > 1 for reduction.", defaultValue: 5, defaultUnit: ":1" },
      { id: "motorInertia", label: "Motor inertia", symbol: "JM", help: "Rotor inertia for the stated motor condition.", defaultValue: 0.002, defaultUnit: "kg·m²" },
    ],
    outputs: [
      { id: "reflected", label: "Reflected load inertia", family: "momentOfInertia", defaultUnit: "kg·m²", expression: "loadInertia/gearRatio^2" },
      { id: "inertiaRatio", label: "Reflected-to-motor inertia ratio", defaultUnit: "—", expression: "(loadInertia/gearRatio^2)/motorInertia" },
      { id: "total", label: "Motor-side total inertia", family: "momentOfInertia", defaultUnit: "kg·m²", expression: "loadInertia/gearRatio^2+motorInertia" },
    ],
    formula: "Jref = JL / N² · Jtotal = JM + Jref",
    warnings: ["This reflects one rigid load through one ideal ratio. It excludes gearbox inertia, efficiency, backlash, compliance, duty cycle, peak torque, motor control behavior, and any motor-selection decision."],
  }),
  toggleForce: libraryDoc("toggleForce", {
    fields: [
      { id: "inputForce", label: "Declared knee input force", symbol: "Fᵢₙ", help: "Input force declared perpendicular to the symmetric toggle link line at the knee.", defaultValue: 350, defaultUnit: "N" },
      { id: "halfAngle", label: "Link angle from dead centre", symbol: "θ", help: "Positive pre-dead-centre angle of each link from the straight-line toggle position. The screen guards 0.5° and below.", defaultValue: 5, defaultUnit: "°" },
    ],
    outputs: [
      { id: "mechanicalAdvantage", label: "Ideal symmetric toggle mechanical advantage", defaultUnit: "—", expression: "(1/(2*(tan((halfAngle)*pi/180))))" },
      { id: "outputForce", label: "Ideal axial toggle output force", family: "force", defaultUnit: "N", expression: "((inputForce)*(1/(2*(tan((halfAngle)*pi/180)))))" },
      { id: "tangent", label: "Declared-angle tangent", defaultUnit: "—", expression: "(tan((halfAngle)*pi/180))" },
    ],
    formula: "MA = 1/[2 tan(θ)] · Fout = Fin · MA",
    warnings: ["This is an ideal, symmetric, planar, pre-dead-centre two-link toggle relation with a knee input perpendicular to the link line. It excludes link length and kinematics, frame/guide deflection, pin stress and clearance, friction, compliance, off-axis loading, stroke, actuation, over-centre travel, locking/self-locking, latch retention, material strength, fatigue, safety, and approval. It deliberately rejects the near-singular 0.5° and below range."],
  }),
  vacuumHolding: libraryDoc("vacuumHolding", {
    fields: [
      { id: "mass", label: "Handled mass", symbol: "m", help: "User-entered handled workpiece mass.", defaultValue: 10, defaultUnit: "kg" },
      { id: "acceleration", label: "Declared acceleration", symbol: "a", help: "User-entered acceleration magnitude for the declared load case.", defaultValue: 2, defaultUnit: "m/s²", signed: true },
      { id: "orientation", label: "Declared load case", symbol: "case", help: "Choose the simplified vertical-normal or horizontal-transport relation.", defaultValue: 0, defaultUnit: "—", choice: ["vertical", "horizontal"] },
      { id: "friction", label: "Declared surface friction", symbol: "μ", help: "Required only by the horizontal-transport relation; user must validate it by test.", defaultValue: 0.5, defaultUnit: "—" },
      { id: "multiplier", label: "User force multiplier", symbol: "M", help: "User-entered force multiplier; not a prescribed safety factor.", defaultValue: 1.5, defaultUnit: "—" },
    ],
    lookups: { useFriction: { horizontal: 1, vertical: 0 } },
    methods: {
      horizontal: "FTH = m(g + a/μ)M",
      vertical: "FTH = m(g + a)M",
    },
    methodChoice: "orientation",
    outputs: [
      { id: "gravityForce", label: "Weight component", family: "force", defaultUnit: "N", expression: "mass*9.81" },
      { id: "accelerationForce", label: "Inertial force component", family: "force", defaultUnit: "N", expression: "mass*acceleration" },
      { id: "baseForce", label: "Vertical-lift base holding force", family: "force", defaultUnit: "N", expression: "mass*9.81+mass*acceleration*(lookup(useFriction, orientation)/friction+(1-lookup(useFriction, orientation)))", labelChoice: "orientation", labels: { horizontal: "Horizontal-transport base holding force", vertical: "Vertical-lift base holding force" } },
      { id: "requiredHoldingForce", label: "Multiplier-adjusted required holding force", family: "force", defaultUnit: "N", expression: "(mass*9.81+mass*acceleration*(lookup(useFriction, orientation)/friction+(1-lookup(useFriction, orientation))))*multiplier" },
    ],
    formula: "FTH = m(g + a)M",
    warnings: ["This is a simplified theoretical holding-force requirement for the selected declared load case. It does not select suction cups, count cups, calculate cup area, infer surface quality, assess seal/leakage, prescribe a safety factor, validate friction, determine vacuum level, size pumps or ejectors, analyze moments, certify handling safety, or approve an end-of-arm tool. Validate the full worst-case handling sequence and system on the real workpiece."],
  }),
  wristInertia: libraryDoc("wristInertia", {
    fields: [
      { id: "eoatMass", label: "Declared EOAT mass", symbol: "mₑ", help: "Mass of the declared end-of-arm tooling body only.", defaultValue: 5, defaultUnit: "kg", signed: true },
      { id: "eoatCentroidalInertia", label: "Declared EOAT centroidal inertia", symbol: "Iₑ,cg", help: "User-entered EOAT mass moment of inertia about the stated parallel centroidal axis.", defaultValue: 0.02, defaultUnit: "kg·m²", signed: true },
      { id: "eoatOffset", label: "EOAT flange-axis offset", symbol: "rₑ", help: "Perpendicular distance from the stated flange/wrist axis to the EOAT centre of mass.", defaultValue: 0.15, defaultUnit: "m", signed: true },
      { id: "payloadMass", label: "Declared payload mass", symbol: "mₚ", help: "Mass of the declared carried part or process payload.", defaultValue: 2, defaultUnit: "kg", signed: true },
      { id: "payloadCentroidalInertia", label: "Declared payload centroidal inertia", symbol: "Iₚ,cg", help: "User-entered payload mass moment of inertia about the stated parallel centroidal axis.", defaultValue: 0.005, defaultUnit: "kg·m²", signed: true },
      { id: "payloadOffset", label: "Payload flange-axis offset", symbol: "rₚ", help: "Perpendicular distance from the stated flange/wrist axis to the payload centre of mass.", defaultValue: 0.3, defaultUnit: "m", signed: true },
    ],
    outputs: [
      { id: "totalMass", label: "Declared EOAT + payload mass", family: "mass", defaultUnit: "kg", expression: "eoatMass+payloadMass" },
      { id: "eoatAxisInertia", label: "EOAT inertia about stated wrist axis", family: "momentOfInertia", defaultUnit: "kg·m²", expression: "eoatCentroidalInertia+eoatMass*eoatOffset^2" },
      { id: "payloadAxisInertia", label: "Payload inertia about stated wrist axis", family: "momentOfInertia", defaultUnit: "kg·m²", expression: "payloadCentroidalInertia+payloadMass*payloadOffset^2" },
      { id: "totalInertia", label: "Declared total wrist/tool inertia", family: "momentOfInertia", defaultUnit: "kg·m²", expression: "eoatCentroidalInertia+eoatMass*eoatOffset^2+payloadCentroidalInertia+payloadMass*payloadOffset^2" },
    ],
    formula: "Iaxis = Icg + mr² · Itotal = IEOAT,axis + Ipayload,axis",
    warnings: ["This is a one-axis, user-entered parallel-axis inertia sum for two rigid declared bodies. It does not construct an inertia tensor, infer geometry, identify a robot axis, calculate motion dynamics, establish payload/reach/duty limits, validate collision, select hardware, establish safety, or approve a robot cell."],
  }),
};
