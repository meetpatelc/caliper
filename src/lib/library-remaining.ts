import { tools } from "@/lib/catalog";
import type { InstrumentDocument, InstrumentField, InstrumentOutput } from "@/lib/document";

type RemainingSpec = {
  fields: InstrumentField[];
  outputs: InstrumentOutput[];
  formula: string;
  warnings: string[];
  lookups?: InstrumentDocument["lookups"];
  methods?: Record<string, string>;
  methodChoice?: string;
  warningsBy?: Record<string, string[]>;
  warningsChoice?: string;
};

function remaining(id: string, spec: RemainingSpec): InstrumentDocument {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Missing catalog entry ${id}`);
  return {
    slug: id,
    title: tool.title,
    description: tool.description,
    domain: tool.contract.domain,
    fields: spec.fields,
    outputs: spec.outputs,
    formula: spec.formula,
    purpose: tool.description,
    assumptions: tool.assumptions,
    boundary: "Not a design stamp. Use only inside the stated model boundary.",
    interpretation: tool.outputLabel,
    sourceLabel: tool.sourceLabel,
    sourceUrl: tool.sourceUrl,
    related: [],
    warnings: spec.warnings,
    lookups: spec.lookups,
    methods: spec.methods,
    methodChoice: spec.methodChoice,
    warningsBy: spec.warningsBy,
    warningsChoice: spec.warningsChoice,
  };
}

export const remainingDocuments: Record<string, InstrumentDocument> = {
  triangle: remaining("triangle", {
    fields: [
      { id: "legA", label: "Horizontal leg", symbol: "a", help: "One perpendicular leg of the displayed right triangle.", defaultValue: 300, defaultUnit: "mm" },
      { id: "legB", label: "Vertical leg", symbol: "b", help: "The second perpendicular leg of the displayed triangle.", defaultValue: 400, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "hypotenuse", label: "Hypotenuse", defaultUnit: "mm", expression: "hypot(legA, legB)" },
      { id: "area", label: "Triangle area", defaultUnit: "mm²", expression: "legA*legB/2" },
      { id: "alpha", label: "Angle from horizontal", defaultUnit: "°", expression: "atan2(legB, legA)*180/pi" },
      { id: "beta", label: "Other acute angle", defaultUnit: "°", expression: "90-atan2(legB, legA)*180/pi" },
    ],
    formula: "c = √(a² + b²) · A = ab / 2 · α = tan⁻¹(b/a)",
    warnings: ["This uses a flat Euclidean right triangle. It does not infer dimensions from a drawing, field measurement, tolerance, or a non-perpendicular geometry."],
  }),
  mohrCircle: remaining("mohrCircle", {
    fields: [
      { id: "sigmaX", label: "x normal stress", symbol: "σx", help: "Signed plane-stress component; tension positive under the stated convention.", defaultValue: 90, defaultUnit: "MPa", signed: true },
      { id: "sigmaY", label: "y normal stress", symbol: "σy", help: "Signed plane-stress component at the same point.", defaultValue: 30, defaultUnit: "MPa", signed: true },
      { id: "tauXY", label: "In-plane shear stress", symbol: "τxy", help: "Signed shear stress at the same point and under one stated convention.", defaultValue: 40, defaultUnit: "MPa", signed: true },
    ],
    outputs: [
      { id: "center", label: "Mohr circle center stress", defaultUnit: "MPa", expression: "(sigmaX+sigmaY)/2" },
      { id: "radius", label: "Mohr circle radius / max in-plane shear", defaultUnit: "MPa", expression: "hypot((sigmaX-sigmaY)/2, tauXY)" },
      { id: "principalOne", label: "Maximum principal stress", defaultUnit: "MPa", expression: "(sigmaX+sigmaY)/2+hypot((sigmaX-sigmaY)/2, tauXY)" },
      { id: "principalTwo", label: "Minimum principal stress", defaultUnit: "MPa", expression: "(sigmaX+sigmaY)/2-hypot((sigmaX-sigmaY)/2, tauXY)" },
      { id: "principalAngle", label: "One principal-plane orientation", defaultUnit: "°", expression: "0.5*atan2(2*tauXY, sigmaX-sigmaY)*180/pi" },
      { id: "doublePrincipalAngle", label: "Mohr-circle double angle to principal plane", defaultUnit: "°", expression: "atan2(2*tauXY, sigmaX-sigmaY)*180/pi" },
      { id: "doubleMaxShearAngle", label: "Mohr-circle double angle to max-shear plane", defaultUnit: "°", expression: "atan2(2*tauXY, sigmaX-sigmaY)*180/pi+90" },
    ],
    formula: "σavg = (σx + σy)/2 · R = √[((σx−σy)/2)² + τxy²] · σ1,2 = σavg ± R · 2θp = atan2(2τxy, σx−σy) · 2θs = 2θp + 90°",
    warnings: ["This transforms one entered plane-stress state at one point. The reported angle follows the entered sign convention and is one of two orthogonal principal-plane orientations; the two Mohr-circle double-angle outputs are shown explicitly. It excludes 3D stress, stress gradients, principal strain, material failure criteria, buckling, fatigue, fracture, local concentration, and any design or compliance decision."],
  }),
  motionProfile: remaining("motionProfile", {
    fields: [
      { id: "distance", label: "Move distance", symbol: "s", help: "Rest-to-rest travel distance for the stated linear or angular axis.", defaultValue: 500, defaultUnit: "mm" },
      { id: "accelTime", label: "Acceleration time", symbol: "ta", help: "Time for each equal acceleration and deceleration phase.", defaultValue: 0.25, defaultUnit: "s" },
      { id: "cruiseTime", label: "Cruise time", symbol: "tc", help: "Constant-velocity phase time; enter zero only for a triangular profile.", defaultValue: 0.5, defaultUnit: "s", signed: true },
    ],
    outputs: [
      { id: "acceleration", label: "Profile acceleration", defaultUnit: "m/s²", expression: "(distance/1000)/(accelTime*(accelTime+cruiseTime))" },
      { id: "peakSpeed", label: "Peak speed", defaultUnit: "m/s", expression: "(distance/1000)/(accelTime+cruiseTime)" },
      { id: "totalTime", label: "Total move time", defaultUnit: "s", expression: "2*accelTime+cruiseTime" },
      { id: "distance", label: "Move distance", defaultUnit: "mm", expression: "distance" },
    ],
    formula: "a = s / [ta(ta + tc)] · vmax = a·ta · T = 2ta + tc",
    warnings: ["This is an ideal symmetric trapezoidal/triangular profile. It excludes jerk limits, structural compliance, load inertia, friction, servo tuning, actuator force limits, and safety margins."],
  }),
  pneumatic: remaining("pneumatic", {
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
  clampForce: remaining("clampForce", {
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
  leadScrew: remaining("leadScrew", {
    fields: [
      { id: "axialForce", label: "Axial load", symbol: "F", help: "Constant axial load at the nut in the stated direction.", defaultValue: 4, defaultUnit: "kN" },
      { id: "lead", label: "Screw lead", symbol: "l", help: "Linear nut travel per screw revolution.", defaultValue: 10, defaultUnit: "mm/rev" },
      { id: "efficiency", label: "Mechanical efficiency", symbol: "η", help: "User-entered combined screw/nut efficiency from 0 to 100.", defaultValue: 82, defaultUnit: "%" },
      { id: "rpm", label: "Screw speed", symbol: "n", help: "Constant screw rotational speed.", defaultValue: 600, defaultUnit: "rpm" },
    ],
    outputs: [
      { id: "torque", label: "Ideal raising torque", defaultUnit: "N·m", expression: "axialForce*1000*(lead/1000)/(2*pi*efficiency/100)" },
      { id: "speed", label: "Linear travel speed", defaultUnit: "mm/s", expression: "lead*rpm/60" },
      { id: "power", label: "Mechanical output power", defaultUnit: "kW", expression: "axialForce*1000*(lead/1000)*rpm/60/1000" },
    ],
    formula: "T = F·l/(2πη) · v = l·n/60 · P = Fv",
    warnings: ["This is an ideal constant-load power-screw relationship using a user-entered efficiency. It excludes thread geometry verification, friction variation, back-driving, buckling, critical speed, bearings, misalignment, acceleration torque, duty cycle, lubrication, wear, and component selection."],
  }),
  airConsumption: remaining("airConsumption", {
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
  circularArc: remaining("circularArc", {
    fields: [
      { id: "radius", label: "Radius", symbol: "r", help: "Nominal planar circle radius.", defaultValue: 75, defaultUnit: "mm" },
      { id: "angle", label: "Central angle", symbol: "θ", help: "Angle subtended by the arc from greater than 0 through 360 degrees.", defaultValue: 120, defaultUnit: "°" },
    ],
    outputs: [
      { id: "arc", label: "Arc length", defaultUnit: "mm", expression: "radius*angle*pi/180" },
      { id: "chord", label: "Chord length", defaultUnit: "mm", expression: "2*radius*sin(angle*pi/360)" },
      { id: "sector", label: "Sector area", defaultUnit: "mm²", expression: "radius^2*(angle*pi/180)/2" },
      { id: "segment", label: "Circular-segment area", defaultUnit: "mm²", expression: "radius^2*(angle*pi/180)/2-radius^2*sin(angle*pi/180)/2" },
    ],
    formula: "s = rθ · c = 2r sin(θ/2) · Asector = r²θ/2 · Asegment = Asector − r²sinθ/2",
    warnings: ["This is nominal planar-circle geometry. It excludes manufacturing tolerances, three-dimensional curvature, material thickness, bend allowance, forming response, and any manufacturing or inspection decision."],
  }),
  compressionSpring: remaining("compressionSpring", {
    fields: [
      { id: "wire", label: "Wire diameter", symbol: "d", help: "Round-wire diameter for the close-coiled spring model.", defaultValue: 4, defaultUnit: "mm" },
      { id: "meanDiameter", label: "Mean coil diameter", symbol: "D", help: "Centerline coil diameter, not outer or inner diameter.", defaultValue: 32, defaultUnit: "mm" },
      { id: "activeCoils", label: "Active coils", symbol: "Na", help: "Number of coils participating in elastic deflection.", defaultValue: 8, defaultUnit: "coils" },
      { id: "shearModulus", label: "Shear modulus", symbol: "G", help: "User-entered material shear modulus at the stated condition.", defaultValue: 79, defaultUnit: "GPa" },
      { id: "deflection", label: "Applied deflection", symbol: "δ", help: "Stated compression from the free configuration.", defaultValue: 12, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "rate", label: "Elementary spring rate", defaultUnit: "N/mm", expression: "shearModulus*1e9*(wire/1000)^4/(8*(meanDiameter/1000)^3*activeCoils)/1000" },
      { id: "force", label: "Ideal spring force", defaultUnit: "N", expression: "shearModulus*1e9*(wire/1000)^4/(8*(meanDiameter/1000)^3*activeCoils)*(deflection/1000)" },
      { id: "springIndex", label: "Spring index D/d", defaultUnit: "—", expression: "meanDiameter/wire" },
      { id: "shearStress", label: "Uncorrected wire torsional shear", defaultUnit: "MPa", expression: "8*(shearModulus*1e9*(wire/1000)^4/(8*(meanDiameter/1000)^3*activeCoils)*(deflection/1000))*(meanDiameter/1000)/(pi*(wire/1000)^3)/1e6" },
    ],
    formula: "k = Gd⁴/(8D³Na) · F = kδ · τbasic = 8FD/(πd³)",
    warnings: ["This is an elementary close-coiled round-wire spring screen. It excludes Wahl/direct-shear correction, end condition, solid height, buckling, coil clash, residual stress, material allowables, fatigue, relaxation, corrosion, temperature, dynamics, and spring selection."],
  }),
  drillingTime: remaining("drillingTime", {
    fields: [
      { id: "diameter", label: "Drill diameter", symbol: "Dc", help: "Nominal drill diameter used for cutting-speed arithmetic.", defaultValue: 10, defaultUnit: "mm" },
      { id: "rpm", label: "Spindle speed", symbol: "n", help: "Constant spindle speed during the stated cut.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "feedPerRev", label: "Feed per revolution", symbol: "fr", help: "User-entered axial feed per spindle revolution.", defaultValue: 0.1, defaultUnit: "mm/rev" },
      { id: "depth", label: "Cutting depth per hole", symbol: "ld", help: "Entered drilling depth only; add approach and breakthrough separately if required.", defaultValue: 35, defaultUnit: "mm" },
      { id: "holes", label: "Hole count", symbol: "i", help: "Whole number of identical holes under the same stated process condition.", defaultValue: 6, defaultUnit: "holes" },
    ],
    outputs: [
      { id: "cuttingSpeed", label: "Peripheral cutting speed", defaultUnit: "m/min", expression: "pi*diameter*rpm/1000" },
      { id: "feedRate", label: "Spindle feed rate", defaultUnit: "mm/min", expression: "feedPerRev*rpm" },
      { id: "timeMinutes", label: "Nominal cutting time", defaultUnit: "s", expression: "depth*holes/(feedPerRev*rpm)*60" },
      { id: "distance", label: "Total programmed cutting depth", defaultUnit: "mm", expression: "depth*holes" },
    ],
    formula: "vc = πDcn/1000 · vf = frn · Tc = ld·i/(frn)",
    warnings: ["This is reference machining arithmetic for constant-speed, constant-feed drilling. It excludes approach, breakthrough, retract, peck cycles, tool wear, material and coolant effects, machine acceleration, fixturing, chip evacuation, spindle limits, power, quality, and process qualification."],
  }),
  processCapability: remaining("processCapability", {
    fields: [
      { id: "lsl", label: "Lower specification limit", symbol: "LSL", help: "User-entered lower requirement limit on the measured characteristic.", defaultValue: 9.8, defaultUnit: "unit", signed: true },
      { id: "usl", label: "Upper specification limit", symbol: "USL", help: "User-entered upper requirement limit on the same characteristic.", defaultValue: 10.2, defaultUnit: "unit" },
      { id: "mean", label: "Process mean", symbol: "x̄", help: "Established process mean on the same measurement basis.", defaultValue: 10.04, defaultUnit: "unit", signed: true },
      { id: "sigma", label: "Within-process standard deviation", symbol: "s", help: "User-entered within-process standard deviation; establish its suitability separately.", defaultValue: 0.05, defaultUnit: "unit" },
    ],
    outputs: [
      { id: "cp", label: "Potential capability Cp", defaultUnit: "—", expression: "(usl-lsl)/(6*sigma)" },
      { id: "cpk", label: "Centered capability Cpk", defaultUnit: "—", expression: "min((usl-mean)/(3*sigma), (mean-lsl)/(3*sigma))" },
      { id: "cpu", label: "Upper capability Cpu", defaultUnit: "—", expression: "(usl-mean)/(3*sigma)" },
      { id: "cpl", label: "Lower capability Cpl", defaultUnit: "—", expression: "(mean-lsl)/(3*sigma)" },
    ],
    formula: "Cp = (USL−LSL)/(6s) · Cpk = min[(USL−x̄)/(3s), (x̄−LSL)/(3s)]",
    warnings: ["Cp and Cpk compare user-entered specifications with user-entered process statistics. This screen does not establish statistical control, distribution suitability, rational subgrouping, measurement-system adequacy, sampling validity, customer requirements, capability thresholds, or production acceptance."],
  }),
  torsionSpring: remaining("torsionSpring", {
    fields: [
      { id: "wire", label: "Wire diameter", symbol: "d", help: "Nominal round-wire diameter.", defaultValue: 3, defaultUnit: "mm" },
      { id: "meanDiameter", label: "Mean coil diameter", symbol: "D", help: "Mean coil diameter; must be positive.", defaultValue: 24, defaultUnit: "mm" },
      { id: "activeCoils", label: "Active coils", symbol: "n", help: "User-entered active turns excluding inactive end effects.", defaultValue: 8, defaultUnit: "turns" },
      { id: "modulus", label: "Elastic modulus", symbol: "E", help: "User-entered Young’s modulus; no material selection is implied.", defaultValue: 200, defaultUnit: "GPa" },
      { id: "angle", label: "Angular deflection", symbol: "θ", help: "Applied spring angle in degrees.", defaultValue: 45, defaultUnit: "deg", signed: true },
    ],
    outputs: [
      { id: "rate", label: "Ideal angular spring rate", defaultUnit: "N·mm/deg", expression: "(modulus*1000*wire^4)/(10.8*meanDiameter*activeCoils)/360" },
      { id: "moment", label: "Applied spring moment", defaultUnit: "N·mm", expression: "(modulus*1000*wire^4)/(10.8*meanDiameter*activeCoils)/360*angle" },
      { id: "stress", label: "Nominal wire bending stress", defaultUnit: "MPa", expression: "32*abs((modulus*1000*wire^4)/(10.8*meanDiameter*activeCoils)/360*angle)/(pi*wire^3)" },
      { id: "index", label: "Spring index", defaultUnit: "—", expression: "meanDiameter/wire" },
    ],
    formula: "k_360 = E·d⁴/(10.8·D·n) · kθ = k_360/360 · M = kθ·θ · σnom = 32M/(πd³)",
    warnings: ["This is an elementary round-wire torsion-spring screen using stated modulus, geometry, and angle. The 10.8 coefficient is a per-turn (360°) rate; it is divided by 360 so the displayed rate is per degree. It excludes leg geometry, coil contact, set, stress correction factors, fatigue, material heat treatment, residual stress, winding direction, coil clearance, tolerances, mounting, and design approval."],
  }),
  cuttingParameters: remaining("cuttingParameters", {
    fields: [
      { id: "diameter", label: "Cutter diameter", symbol: "Dc", help: "Effective cutting diameter used for spindle-speed arithmetic.", defaultValue: 100, defaultUnit: "mm" },
      { id: "cuttingSpeed", label: "Cutting speed", symbol: "vc", help: "User-selected surface cutting speed; this workspace does not recommend it.", defaultValue: 125.6637, defaultUnit: "m/min" },
      { id: "teeth", label: "Number of teeth", symbol: "z", help: "Engaged cutter tooth count used for the stated feed relation.", defaultValue: 10, defaultUnit: "teeth" },
      { id: "chipLoad", label: "Feed per tooth", symbol: "fz", help: "User-selected feed per tooth; this workspace does not select it.", defaultValue: 0.075, defaultUnit: "mm/tooth" },
      { id: "axialDepth", label: "Axial depth of cut", symbol: "ap", help: "Stated engaged axial cut depth.", defaultValue: 5, defaultUnit: "mm" },
      { id: "radialWidth", label: "Radial width of cut", symbol: "ae", help: "Stated engaged radial cut width.", defaultValue: 70, defaultUnit: "mm" },
      { id: "specificForce", label: "Specific cutting force", symbol: "Kc", help: "User-entered material/process force coefficient; no lookup is used.", defaultValue: 1800, defaultUnit: "MPa" },
      { id: "efficiency", label: "Machine efficiency", symbol: "η", help: "User-entered machine efficiency from 0 to 100 used only in the stated power arithmetic.", defaultValue: 80, defaultUnit: "%" },
    ],
    outputs: [
      { id: "rpm", label: "Calculated spindle speed", defaultUnit: "rpm", expression: "1000*cuttingSpeed/(pi*diameter)" },
      { id: "feedRate", label: "Table feed rate", defaultUnit: "mm/min", expression: "chipLoad*teeth*1000*cuttingSpeed/(pi*diameter)" },
      { id: "chipLoad", label: "Feed per tooth", defaultUnit: "mm/tooth", expression: "chipLoad" },
      { id: "mrr", label: "Theoretical material removal rate", defaultUnit: "cm³/min", expression: "axialDepth*radialWidth*chipLoad*teeth*1000*cuttingSpeed/(pi*diameter)/1000" },
      { id: "power", label: "Specific-force power estimate", defaultUnit: "kW", expression: "axialDepth*radialWidth*chipLoad*teeth*1000*cuttingSpeed/(pi*diameter)*specificForce/(60e6*efficiency/100)" },
    ],
    formula: "n = 1000vc/(πDc) · vf = fz·z·n · MRR = ap·ae·vf/1000 · Pc = ap·ae·vf·Kc/(60·10⁶·η)",
    warnings: ["This is face-milling reference arithmetic using user-entered cutting conditions, specific force, and efficiency. It excludes selection of speed/feed/tool/material parameters, tooth engagement variation, radial chip thinning, cutter geometry, runout, acceleration, spindle torque limits, rigidity, chatter, coolant, tool wear, fixture limits, thermal effects, surface quality, and process qualification."],
  }),
  pinStress: remaining("pinStress", {
    fields: [
      { id: "appliedLoad", label: "Declared direct load", symbol: "F", help: "Positive direct transverse load assumed to share equally across identical pins.", defaultValue: 12000, defaultUnit: "N" },
      { id: "pinCount", label: "Identical pin count", symbol: "n", help: "Integer count of pins assumed to share direct load equally.", defaultValue: 2, defaultUnit: "pins" },
      { id: "shearPlanes", label: "Shear-plane condition", symbol: "p", help: "Choose one or two ideal shear planes through every identical pin.", defaultValue: 2, defaultUnit: "—", choice: ["1", "2"], choiceMessage: "Shear-plane condition must be single shear or double shear." },
      { id: "pinDiameter", label: "Pin diameter", symbol: "d", help: "Nominal circular pin diameter at the stated shear plane.", defaultValue: 10, defaultUnit: "mm" },
      { id: "plateThickness", label: "Bearing plate thickness", symbol: "t", help: "Loaded plate thickness used for the projected bearing-area approximation.", defaultValue: 8, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "loadPerPin", label: "Direct load per equal pin", defaultUnit: "N", expression: "appliedLoad/pinCount" },
      { id: "shearArea", label: "One nominal pin shear area", defaultUnit: "mm²", expression: "pi*pinDiameter^2/4" },
      { id: "nominalShear", label: "Nominal pin shear stress", defaultUnit: "MPa", expression: "(appliedLoad/pinCount)/(shearPlanes*pi*pinDiameter^2/4)" },
      { id: "projectedBearingArea", label: "Projected plate bearing area per pin", defaultUnit: "mm²", expression: "pinDiameter*plateThickness" },
      { id: "projectedBearingStress", label: "Projected plate bearing stress", defaultUnit: "MPa", expression: "(appliedLoad/pinCount)/(pinDiameter*plateThickness)" },
    ],
    formula: "Fpin = F/n · As = πd²/4 · τnom = Fpin/(pAs) · Aprojected = dt · σbearing = Fpin/(dt)",
    warnings: ["This assumes identical pins share the entered direct load equally, uses circular nominal shear area, and applies a projected-area bearing approximation. It does not evaluate pin bending, clearance, load-sharing variation, local contact/Hertz stress, yielding, fatigue, stress concentrations, material allowables, hole edge distance, joint geometry, selection, or approval."],
  }),
  dimensionCheck: remaining("dimensionCheck", {
    fields: [
      { id: "leftMass", label: "Left mass exponent", symbol: "Mₗ", help: "Entered exponent for SI base mass dimension on the left equation side.", defaultValue: 1, defaultUnit: "—", signed: true },
      { id: "leftLength", label: "Left length exponent", symbol: "Lₗ", help: "Entered exponent for SI base length dimension on the left equation side.", defaultValue: 1, defaultUnit: "—", signed: true },
      { id: "leftTime", label: "Left time exponent", symbol: "Tₗ", help: "Entered exponent for SI base time dimension on the left equation side.", defaultValue: -2, defaultUnit: "—", signed: true },
      { id: "leftCurrent", label: "Left current exponent", symbol: "Iₗ", help: "Entered exponent for SI base electric-current dimension on the left equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "leftTemperature", label: "Left temperature exponent", symbol: "Θₗ", help: "Entered exponent for SI base thermodynamic-temperature dimension on the left equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "leftAmount", label: "Left amount exponent", symbol: "Nₗ", help: "Entered exponent for SI base amount-of-substance dimension on the left equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "leftLuminous", label: "Left luminous exponent", symbol: "Jₗ", help: "Entered exponent for SI base luminous-intensity dimension on the left equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "rightMass", label: "Right mass exponent", symbol: "Mᵣ", help: "Entered exponent for SI base mass dimension on the right equation side.", defaultValue: 1, defaultUnit: "—", signed: true },
      { id: "rightLength", label: "Right length exponent", symbol: "Lᵣ", help: "Entered exponent for SI base length dimension on the right equation side.", defaultValue: 1, defaultUnit: "—", signed: true },
      { id: "rightTime", label: "Right time exponent", symbol: "Tᵣ", help: "Entered exponent for SI base time dimension on the right equation side.", defaultValue: -2, defaultUnit: "—", signed: true },
      { id: "rightCurrent", label: "Right current exponent", symbol: "Iᵣ", help: "Entered exponent for SI base electric-current dimension on the right equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "rightTemperature", label: "Right temperature exponent", symbol: "Θᵣ", help: "Entered exponent for SI base thermodynamic-temperature dimension on the right equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "rightAmount", label: "Right amount exponent", symbol: "Nᵣ", help: "Entered exponent for SI base amount-of-substance dimension on the right equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
      { id: "rightLuminous", label: "Right luminous exponent", symbol: "Jᵣ", help: "Entered exponent for SI base luminous-intensity dimension on the right equation side.", defaultValue: 0, defaultUnit: "—", signed: true },
    ],
    outputs: [
      { id: "consistent", label: "Entered dimensions match (1=yes, 0=no)", defaultUnit: "—", expression: "eq(leftMass,rightMass)*eq(leftLength,rightLength)*eq(leftTime,rightTime)*eq(leftCurrent,rightCurrent)*eq(leftTemperature,rightTemperature)*eq(leftAmount,rightAmount)*eq(leftLuminous,rightLuminous)" },
      { id: "deltaMass", label: "Mass exponent difference (left − right)", defaultUnit: "—", expression: "leftMass-rightMass" },
      { id: "deltaLength", label: "Length exponent difference (left − right)", defaultUnit: "—", expression: "leftLength-rightLength" },
      { id: "deltaTime", label: "Time exponent difference (left − right)", defaultUnit: "—", expression: "leftTime-rightTime" },
      { id: "deltaElectriccurrent", label: "Electric current exponent difference (left − right)", defaultUnit: "—", expression: "leftCurrent-rightCurrent" },
      { id: "deltaTemperature", label: "Temperature exponent difference (left − right)", defaultUnit: "—", expression: "leftTemperature-rightTemperature" },
      { id: "deltaAmountofsubstance", label: "Amount of substance exponent difference (left − right)", defaultUnit: "—", expression: "leftAmount-rightAmount" },
      { id: "deltaLuminousintensity", label: "Luminous intensity exponent difference (left − right)", defaultUnit: "—", expression: "leftLuminous-rightLuminous" },
    ],
    formula: "Compare entered exponent vectors over SI base dimensions: [M, L, T, I, Θ, N, J]left − [M, L, T, I, Θ, N, J]right",
    warnings: ["This compares only the two entered base-dimension vectors. It does not parse symbols or equations, infer a quantity’s dimensions, convert units, assess constants, prove numerical correctness, validate signs or boundary conditions, or establish physical-model validity."],
  }),
  sCurveProfile: remaining("sCurveProfile", {
    fields: [
      { id: "distance", label: "Move distance", symbol: "d", help: "Declared zero-start/zero-stop point-to-point travel distance.", defaultValue: 200, defaultUnit: "mm" },
      { id: "topSpeed", label: "Top speed", symbol: "vmax", help: "User-entered intended top speed used by the equivalent trapezoidal timing screen.", defaultValue: 100, defaultUnit: "mm/s" },
      { id: "averageAcceleration", label: "Average acceleration", symbol: "aavg", help: "User-entered average acceleration; not a controller tuning setting.", defaultValue: 500, defaultUnit: "mm/s²" },
      { id: "jerkPercent", label: "Jerk percentage", symbol: "J%", help: "Declared fraction of acceleration segment spent ramping, from 0 through 100 percent.", defaultValue: 50, defaultUnit: "%", signed: true },
    ],
    outputs: [
      { id: "peakSpeed", label: "Profile peak speed", defaultUnit: "mm/s", expression: "min(topSpeed, sqrt(distance*averageAcceleration))" },
      { id: "accelerationTime", label: "Acceleration segment time", defaultUnit: "s", expression: "min(topSpeed, sqrt(distance*averageAcceleration))/averageAcceleration" },
      { id: "cruiseTime", label: "Constant-speed time", defaultUnit: "s", expression: "max(0, (distance-topSpeed^2/averageAcceleration)/topSpeed)" },
      { id: "totalTime", label: "Equivalent point-to-point time", defaultUnit: "s", expression: "2*min(topSpeed, sqrt(distance*averageAcceleration))/averageAcceleration+max(0, (distance-topSpeed^2/averageAcceleration)/topSpeed)" },
      { id: "peakAcceleration", label: "Jerk-percent peak acceleration", defaultUnit: "mm/s²", expression: "averageAcceleration/(1-jerkPercent*0.005)" },
      { id: "jerkRampTime", label: "Per-ramp jerk time", defaultUnit: "s", expression: "min(topSpeed, sqrt(distance*averageAcceleration))/averageAcceleration*jerkPercent/200" },
    ],
    formula: "tacc = v/aavg · vpeak = min(vmax, √(d aavg)) · ttotal = 2tacc + tcruise · apeak = aavg/(1 − 0.005J%)",
    warnings: ["This symmetric zero-start/zero-stop S-curve screen preserves equivalent trapezoidal timing using user-entered average acceleration and jerk percentage. It does not generate controller commands, model short-move sampling, validate axis limits or tuning, predict vibration, overshoot, mechanical load, safety, or motion-system suitability."],
  }),
  formControl: remaining("formControl", {
    fields: [
      { id: "formType", label: "Declared form control", help: "Choose the form category represented by the user-entered measurement record.", defaultValue: 0, defaultUnit: "—", choice: ["flatness", "straightness", "circularity", "cylindricity"] },
      { id: "measuredMinimum", label: "Measured minimum", symbol: "xmin", help: "Minimum value from the declared measurement record and setup.", defaultValue: -0.018, defaultUnit: "mm", signed: true },
      { id: "measuredMaximum", label: "Measured maximum", symbol: "xmax", help: "Maximum value from the declared measurement record and setup.", defaultValue: 0.026, defaultUnit: "mm", signed: true },
      { id: "statedTolerance", label: "Stated tolerance", symbol: "T", help: "Drawing or study tolerance entered only to display an observed-span ratio; no compliance result is generated.", defaultValue: 0.05, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "observedSpan", label: "Observed {formType} extrema span", defaultUnit: "mm", expression: "measuredMaximum-measuredMinimum" },
      { id: "toleranceRatio", label: "Observed span / stated tolerance", defaultUnit: "%", expression: "(measuredMaximum-measuredMinimum)/statedTolerance*100" },
    ],
    formula: "Observed screening span = user-entered xmax − user-entered xmin",
    warnings: ["This subtracts user-entered extrema for a declared form-control record. It is not a minimum-zone algorithm and does not validate sampling density, filters, instrument calibration, probe compensation, datum/setup strategy, part geometry, drawing interpretation, uncertainty, or compliance."],
  }),
  orientationControl: remaining("orientationControl", {
    fields: [
      { id: "controlType", label: "Declared orientation control", help: "Choose the record label only; this workspace does not interpret a drawing feature-control frame.", defaultValue: 0, defaultUnit: "—", choice: ["parallelism", "perpendicularity", "angularity"] },
      { id: "minimumReading", label: "Lowest comparable reading", symbol: "rmin", help: "Lowest reading from one documented datum/fixture and measurement setup; signed readings are allowed.", defaultValue: -0.012, defaultUnit: "mm", signed: true },
      { id: "maximumReading", label: "Highest comparable reading", symbol: "rmax", help: "Highest reading from the same documented datum/fixture and measurement setup.", defaultValue: 0.028, defaultUnit: "mm", signed: true },
      { id: "tolerance", label: "Stated orientation tolerance", symbol: "T", help: "Tolerance copied from the applicable controlled requirement; it is not inferred from a drawing.", defaultValue: 0.05, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "variation", label: "Observed orientation-reading variation", defaultUnit: "mm", expression: "maximumReading-minimumReading" },
      { id: "ratio", label: "Observed variation / stated tolerance", defaultUnit: "%", expression: "(maximumReading-minimumReading)/tolerance*100" },
      { id: "difference", label: "Stated tolerance − observed variation", defaultUnit: "mm", expression: "tolerance-(maximumReading-minimumReading)" },
    ],
    formula: "observed variation = rmax − rmin · ratio = observed variation / stated tolerance",
    warnings: ["This is extrema subtraction for a user-declared {controlType} record. It does not establish datum simulation, validate feature-control-frame syntax, construct a tolerance zone, choose a measurement strategy, compensate instruments, assess repeatability, determine conformance, or certify drawing compliance."],
  }),
  profileRunout: remaining("profileRunout", {
    fields: [
      { id: "recordType", label: "Declared record type", help: "Choose the record label only; this workspace does not construct a profile or runout tolerance zone.", defaultValue: 0, defaultUnit: "—", choice: ["profile", "circularRunout", "totalRunout"] },
      { id: "minimumReading", label: "Lowest comparable indicator reading", symbol: "rmin", help: "Lowest reading from the one documented fixture/datum setup; signed readings are allowed.", defaultValue: -0.018, defaultUnit: "mm", signed: true },
      { id: "maximumReading", label: "Highest comparable indicator reading", symbol: "rmax", help: "Highest reading from the same documented fixture/datum setup.", defaultValue: 0.032, defaultUnit: "mm", signed: true },
      { id: "tolerance", label: "Stated profile/runout tolerance", symbol: "T", help: "Tolerance copied from the applicable controlled requirement; this is not a drawing-parser field.", defaultValue: 0.06, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "variation", label: "Observed indicator variation", defaultUnit: "mm", expression: "maximumReading-minimumReading" },
      { id: "ratio", label: "Observed variation / stated tolerance", defaultUnit: "%", expression: "(maximumReading-minimumReading)/tolerance*100" },
      { id: "difference", label: "Stated tolerance − observed variation", defaultUnit: "mm", expression: "tolerance-(maximumReading-minimumReading)" },
    ],
    formula: "observed variation = rmax − rmin · ratio = observed variation / stated tolerance",
    warnings: ["This is extrema subtraction for a user-declared {recordType} record. It does not establish a datum axis, construct profile or runout zones, parse feature-control frames, select fixture/CMM/indicator strategy, assess measurement uncertainty, determine conformance, or certify drawing compliance."],
  }),
  beam: remaining("beam", {
    fields: [
      { id: "case", label: "Boundary / load case", help: "Only the diagrammed elementary cases are available.", defaultValue: 0, defaultUnit: "—", choice: ["cantilever", "simple"] },
      { id: "load", label: "Point load", symbol: "P", help: "Downward magnitude at the diagrammed load point.", defaultValue: 1, defaultUnit: "kN" },
      { id: "length", label: "Span", symbol: "L", help: "Distance between the fixed point or supports.", defaultValue: 1.2, defaultUnit: "m" },
      { id: "modulus", label: "Elastic modulus", symbol: "E", help: "Assumes a homogeneous, linear-elastic member.", defaultValue: 200, defaultUnit: "GPa" },
      { id: "inertia", label: "Second moment of area", symbol: "I", help: "Use the bending-axis second moment of area.", defaultValue: 120, defaultUnit: "cm⁴" },
    ],
    lookups: {
      deflDenom: { cantilever: 3, simple: 48 },
      momentDenom: { cantilever: 1, simple: 4 },
      reactionDenom: { cantilever: 1, simple: 2 },
    },
    methods: {
      cantilever: "δmax = PL³ / 3EI · Mmax = PL",
      simple: "δmax = PL³ / 48EI · Mmax = PL / 4",
    },
    methodChoice: "case",
    outputs: [
      { id: "reaction", label: "Fixed-end reaction", defaultUnit: "kN", expression: "load/lookup(reactionDenom, case)", labelChoice: "case", labels: { cantilever: "Fixed-end reaction", simple: "Reaction at each support" } },
      { id: "moment", label: "Maximum bending moment", defaultUnit: "kN·m", expression: "load*length/lookup(momentDenom, case)" },
      { id: "deflection", label: "Maximum elastic deflection", defaultUnit: "mm", expression: "load*length^3*1e5/(lookup(deflDenom, case)*modulus*inertia)" },
    ],
    formula: "δmax = PL³ / 3EI · Mmax = PL",
    warnings: ["This response uses a narrow, linear-elastic straight-beam model. Check that support conditions, small-deflection behavior, load position, and bending axis match the diagram."],
  }),
  linearGuideLife: remaining("linearGuideLife", {
    fields: [
      { id: "rollingType", label: "Declared rolling-element type", help: "Select the source’s ball or roller reference-travel/exponent model; no guide model is selected.", defaultValue: 0, defaultUnit: "—", choice: ["ball", "roller"], choiceMessage: "Select a supported rolling-element type." },
      { id: "dynamicRating", label: "Declared basic dynamic rating", symbol: "C", help: "User-entered published basic dynamic load rating of one identified guide system.", defaultValue: 12000, defaultUnit: "N" },
      { id: "calculatedLoad", label: "Declared calculated load", symbol: "Pc", help: "User-entered calculated load acting on the stated guide; this workspace does not derive equivalent loading.", defaultValue: 3000, defaultUnit: "N" },
      { id: "travelRate", label: "Declared travel rate", symbol: "v", help: "User-entered constant total guide travel rate used only to convert nominal travel distance to a literal time value.", defaultValue: 12, defaultUnit: "m/min" },
    ],
    lookups: { lifeRef: { ball: 50, roller: 100 }, lifeExp: { ball: 3, roller: 10 / 3 } },
    outputs: [
      { id: "nominalLifeKm", label: "Nominal travel life", defaultUnit: "km", expression: "lookup(lifeRef, rollingType)*(dynamicRating/calculatedLoad)^lookup(lifeExp, rollingType)" },
      { id: "literalTravelTimeHours", label: "Literal time at declared travel rate", defaultUnit: "h", expression: "lookup(lifeRef, rollingType)*(dynamicRating/calculatedLoad)^lookup(lifeExp, rollingType)*1000/(travelRate*60)" },
      { id: "ratingToLoadRatio", label: "Declared dynamic-rating / calculated-load ratio", defaultUnit: "—", expression: "dynamicRating/calculatedLoad" },
    ],
    formula: "L10 = Lref(C/Pc)^p · thours = L10·1000/(v·60)",
    warnings: ["This applies the cited nominal ball/roller linear-guide travel-life relation using user-entered dynamic rating and calculated load, then makes a literal time conversion at the declared constant travel rate. It does not select a rail/block, derive equivalent or moment loading, model acceleration, load distribution, lubrication, contamination, alignment, rigidity, reliability modifiers, installation, safety, suitability, or approval."],
  }),
  brakingDuty: remaining("brakingDuty", {
    fields: [
      { id: "regenerationType", label: "Declared regeneration type", help: "Select the source’s normal-braking or overhauling-load average-wattage arithmetic; this does not determine the actual operating condition.", defaultValue: 0, defaultUnit: "—", choice: ["normal", "overhauling"], choiceMessage: "Select a supported regeneration type." },
      { id: "drivePower", label: "Declared motor / drive power", symbol: "MW", help: "User-entered mechanical/electrical power basis in kW; motor selection and losses are excluded.", defaultValue: 5.5, defaultUnit: "kW" },
      { id: "brakeTorqueMultiplier", label: "Declared brake-torque multiplier", symbol: "BT", help: "User-entered multiplier such as 1.0 for 100% from a declared matched drive/resistor context.", defaultValue: 1, defaultUnit: "—" },
      { id: "dcBusVoltage", label: "Declared DC-bus voltage", symbol: "Vdc", help: "User-entered braking-bus voltage for the stated drive condition; it is not inferred from supply voltage.", defaultValue: 650, defaultUnit: "V" },
      { id: "brakingTime", label: "Declared braking time", symbol: "tb", help: "Time energized in each declared repeating braking interval.", defaultValue: 2, defaultUnit: "s" },
      { id: "cycleTime", label: "Declared cycle time", symbol: "tc", help: "Complete repeating interval used only for the literal duty calculation.", defaultValue: 20, defaultUnit: "s" },
    ],
    lookups: { avgFactor: { normal: 0.5, overhauling: 1 } },
    outputs: [
      { id: "peakPower", label: "Declared peak braking power", defaultUnit: "kW", expression: "drivePower*brakeTorqueMultiplier" },
      { id: "dutyRatio", label: "Declared braking-duty ratio", defaultUnit: "%", expression: "brakingTime/cycleTime*100" },
      { id: "derivedResistance", label: "Source-relation derived resistance", defaultUnit: "Ω", expression: "dcBusVoltage^2/(drivePower*1000*brakeTorqueMultiplier)" },
      { id: "peakCurrent", label: "Source-relation peak braking current", defaultUnit: "A", expression: "sqrt((drivePower*1000*brakeTorqueMultiplier)/(dcBusVoltage^2/(drivePower*1000*brakeTorqueMultiplier)))" },
      { id: "averageWattage", label: "Source-relation average braking wattage", defaultUnit: "kW", expression: "drivePower*brakeTorqueMultiplier*(brakingTime/cycleTime)*lookup(avgFactor, regenerationType)" },
    ],
    formula: "PW = MW·BT · R = Vdc²/PW · DC = tb/tc · DBRW = PW·DC·(1/2 normal, 1 overhauling)",
    warnings: ["This applies the cited declared-power, brake-torque multiplier, DC-bus voltage, and time-duty relations for the selected source arithmetic mode. It does not select a drive, resistor, minimum resistance, current limit, braking torque, regeneration type, enclosure, protection, wiring, thermal rating, deceleration profile, energy recovery, safety, suitability, or approval."],
  }),
  motorOperatingPoint: remaining("motorOperatingPoint", {
    fields: [
      { id: "motorClass", label: "Declared motor class", help: "User-classified record label only; the same shaft-power relation is applied and no motor class is selected or compared.", defaultValue: 0, defaultUnit: "—", choice: ["servo", "stepper", "ac"], choiceMessage: "Select a supported declared motor class." },
      { id: "shaftTorque", label: "Declared shaft torque", symbol: "T", help: "User-entered steady mechanical shaft torque at the stated operating point.", defaultValue: 5, defaultUnit: "N·m" },
      { id: "shaftSpeed", label: "Declared shaft speed", symbol: "n", help: "User-entered steady rotational speed at the stated operating point.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "referenceTorque", label: "Declared reference torque", symbol: "Tref", help: "User-entered record-specific comparison reference; it is not validated against a motor curve.", defaultValue: 7, defaultUnit: "N·m" },
      { id: "referencePower", label: "Declared reference power", symbol: "Pref", help: "User-entered record-specific comparison reference; it is not validated against a motor rating.", defaultValue: 1.2, defaultUnit: "kW" },
    ],
    outputs: [
      { id: "angularSpeed", label: "Declared shaft angular speed", defaultUnit: "rad/s", expression: "shaftSpeed*2*pi/60" },
      { id: "shaftPower", label: "Literal mechanical shaft power", defaultUnit: "kW", expression: "shaftTorque*shaftSpeed*2*pi/60/1000" },
      { id: "torqueReferenceRatio", label: "Declared torque / reference-torque ratio", defaultUnit: "—", expression: "shaftTorque/referenceTorque" },
      { id: "powerReferenceRatio", label: "Literal shaft-power / reference-power ratio", defaultUnit: "—", expression: "(shaftTorque*shaftSpeed*2*pi/60)/(referencePower*1000)" },
    ],
    formula: "Pshaft = T·ω = T·n·2π/60 · rT = T/Tref · rP = Pshaft/Pref",
    warnings: ["This applies the mechanical shaft-power relation to a user-classified servo, stepper, or AC motor record, then reports literal ratios to user-entered references. It does not compare motor types; select a motor/drive; predict torque-speed, holding, pull-out, overload, voltage/current, control, thermal, duty, efficiency, safety, suitability, or approval."],
  }),
  conveyorLine: remaining("conveyorLine", {
    fields: [
      { id: "solveFor", label: "Declared conversion direction", help: "Choose whether stated speed/pitch produces a rate or stated requested rate/pitch produces a line speed.", defaultValue: 0, defaultUnit: "—", choice: ["rate", "speed"], choiceMessage: "Select a supported conversion direction." },
      { id: "productPitch", label: "Declared center-to-center pitch", symbol: "p", help: "Uniform product-center pitch in the travel direction; accumulation and product stability are excluded.", defaultValue: 250, defaultUnit: "mm" },
      { id: "lineSpeed", label: "Declared conveyor line speed", symbol: "v", help: "Required only when calculating item rate; use a positive stated speed in m/min.", defaultValue: 30, defaultUnit: "m/min" },
      { id: "requestedRate", label: "Declared requested item rate", symbol: "q", help: "Required only when calculating line speed; it is not validated as equipment capacity.", defaultValue: 120, defaultUnit: "items/min" },
    ],
    lookups: { isRate: { rate: 1, speed: 0 } },
    methods: {
      rate: "q = v·1000/p",
      speed: "v = q·p/1000",
    },
    methodChoice: "solveFor",
    outputs: [
      { id: "itemRate", label: "Literal item rate", defaultUnit: "items/min", expression: "lineSpeed*1000/productPitch", when: "lookup(isRate, solveFor)" },
      { id: "lineSpeed", label: "Declared line speed", defaultUnit: "m/min", expression: "lineSpeed", when: "lookup(isRate, solveFor)" },
      { id: "pitchDensity", label: "Declared items per metre at pitch", defaultUnit: "items/m", expression: "1000/productPitch", when: "lookup(isRate, solveFor)" },
      { id: "lineSpeed", label: "Literal line speed", defaultUnit: "m/min", expression: "requestedRate*productPitch/1000", when: "1-lookup(isRate, solveFor)" },
      { id: "itemRate", label: "Declared requested item rate", defaultUnit: "items/min", expression: "requestedRate", when: "1-lookup(isRate, solveFor)" },
      { id: "pitchDensity", label: "Declared items per metre at pitch", defaultUnit: "items/m", expression: "1000/productPitch", when: "1-lookup(isRate, solveFor)" },
    ],
    formula: "q = v·1000/p",
    warnings: ["This converts a declared uniform pitch and stated steady conveyor line speed into a literal item rate. It does not select or size a conveyor, validate accumulation, transfers, product stability, dwell/process requirements, equipment capacity, safety, suitability, or approval."],
    warningsChoice: "solveFor",
    warningsBy: {
      rate: ["This converts a declared uniform pitch and stated steady conveyor line speed into a literal item rate. It does not select or size a conveyor, validate accumulation, transfers, product stability, dwell/process requirements, equipment capacity, safety, suitability, or approval."],
      speed: ["This converts a declared requested item rate and uniform pitch into a literal conveyor line speed. It does not select or size a conveyor, validate accumulation, transfers, product stability, dwell/process requirements, equipment capacity, safety, suitability, or approval."],
    },
  }),
  darcyFrictionFactor: remaining("darcyFrictionFactor", {
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
  taylorToolLife: remaining("taylorToolLife", {
    fields: [
      { id: "mode", label: "Solve mode", help: "Choose whether the entered independent condition is cutting speed or tool life.", defaultValue: 0, defaultUnit: "—", choice: ["lifeFromSpeed", "speedFromLife"], choiceMessage: "Solve mode must be tool life from speed or cutting speed from tool life." },
      { id: "taylorConstant", label: "Declared Taylor constant", symbol: "C", help: "User-entered empirical constant in the compatible units for V·Tⁿ; it is not derived here.", defaultValue: 300, defaultUnit: "(m/min)·minⁿ" },
      { id: "exponent", label: "Declared Taylor exponent", symbol: "n", help: "User-entered positive exponent from the same matched empirical data as C.", defaultValue: 0.25, defaultUnit: "—" },
      { id: "cuttingSpeed", label: "Declared cutting speed", symbol: "V", help: "Used only in the solve-life mode; no cutting speed recommendation is made.", defaultValue: 150, defaultUnit: "m/min" },
      { id: "toolLife", label: "Declared tool life", symbol: "T", help: "Used only in the solve-speed mode; no tool-life target is selected.", defaultValue: 16, defaultUnit: "min" },
    ],
    lookups: { isLife: { lifeFromSpeed: 1, speedFromLife: 0 } },
    methods: {
      lifeFromSpeed: "V·Tⁿ = C · T = (C/V)^(1/n)",
      speedFromLife: "V·Tⁿ = C · V = C/Tⁿ",
    },
    methodChoice: "mode",
    outputs: [
      { id: "cuttingSpeed", label: "Declared cutting speed", defaultUnit: "m/min", expression: "cuttingSpeed", when: "lookup(isLife, mode)" },
      { id: "toolLife", label: "Taylor-relation tool life", defaultUnit: "min", expression: "(taylorConstant/cuttingSpeed)^(1/exponent)", when: "lookup(isLife, mode)" },
      { id: "relationResidual", label: "Relation residual", defaultUnit: "(m/min)·minⁿ", expression: "cuttingSpeed*((taylorConstant/cuttingSpeed)^(1/exponent))^exponent-taylorConstant", when: "lookup(isLife, mode)" },
      { id: "toolLife", label: "Declared tool life", defaultUnit: "min", expression: "toolLife", when: "1-lookup(isLife, mode)" },
      { id: "cuttingSpeed", label: "Taylor-relation cutting speed", defaultUnit: "m/min", expression: "taylorConstant/toolLife^exponent", when: "1-lookup(isLife, mode)" },
      { id: "relationResidual", label: "Relation residual", defaultUnit: "(m/min)·minⁿ", expression: "(taylorConstant/toolLife^exponent)*toolLife^exponent-taylorConstant", when: "1-lookup(isLife, mode)" },
    ],
    formula: "V·Tⁿ = C · T = (C/V)^(1/n)",
    warnings: ["This solves only the user-entered empirical Taylor relation on the stated matched test basis. It does not select a tool or condition, derive C or n, account for feed/depth/coolant/material/coating/geometry, predict wear mechanisms, establish capability, or approve machining."],
  }),
  mmc: remaining("mmc", {
    fields: [
      { id: "featureType", label: "Feature type", help: "Select internal hole or external pin for the displayed one-feature model.", defaultValue: 0, defaultUnit: "—", choice: ["hole", "pin"] },
      { id: "mmcSize", label: "MMC size", symbol: "MMC", help: "Smallest permitted hole or largest permitted pin size.", defaultValue: 10, defaultUnit: "mm" },
      { id: "actualSize", label: "Actual feature size", symbol: "A", help: "Measured size of the same feature in the stated condition.", defaultValue: 10.15, defaultUnit: "mm" },
      { id: "positionTolerance", label: "Position tolerance at MMC", symbol: "⌀T", help: "Stated diametrical positional tolerance at MMC.", defaultValue: 0.2, defaultUnit: "mm" },
    ],
    lookups: { isHole: { hole: 1, pin: 0 } },
    methods: {
      hole: "Bonus = actual hole − MMC hole · VC = MMC hole − ⌀T",
      pin: "Bonus = MMC pin − actual pin · VC = MMC pin + ⌀T",
    },
    methodChoice: "featureType",
    outputs: [
      { id: "bonus", label: "Available bonus tolerance", defaultUnit: "mm", expression: "(2*lookup(isHole, featureType)-1)*(actualSize-mmcSize)" },
      { id: "totalPosition", label: "Total position tolerance", defaultUnit: "mm", expression: "positionTolerance+(2*lookup(isHole, featureType)-1)*(actualSize-mmcSize)" },
      { id: "virtualCondition", label: "Simplified virtual condition", defaultUnit: "mm", expression: "mmcSize+(1-2*lookup(isHole, featureType))*positionTolerance" },
    ],
    formula: "Bonus = actual hole − MMC hole · VC = MMC hole − ⌀T",
    warnings: ["This single-feature screen assumes one cylindrical feature, one MMC position control, and no datum shift, composite frame, projected zone, or functional-gage interpretation beyond the displayed formula."],
  }),
  bearingLife: remaining("bearingLife", {
    fields: [
      { id: "bearingType", label: "Bearing type", help: "Select the basic exponent only; equivalent load remains user-entered.", defaultValue: 0, defaultUnit: "—", choice: ["ball", "roller"] },
      { id: "dynamicRating", label: "Dynamic rating", symbol: "C", help: "Published basic dynamic load rating for the specific bearing.", defaultValue: 19.5, defaultUnit: "kN" },
      { id: "equivalentLoad", label: "Equivalent load", symbol: "P", help: "User-entered equivalent dynamic load under stated operating conditions.", defaultValue: 4.8, defaultUnit: "kN" },
      { id: "rpm", label: "Rotational speed", symbol: "n", help: "Constant shaft speed for the time conversion.", defaultValue: 1450, defaultUnit: "rpm" },
    ],
    lookups: { lifeExp: { ball: 3, roller: 10 / 3 } },
    methods: {
      ball: "L10 = (C/P)³ · hours = L10·10⁶/(60n)",
      roller: "L10 = (C/P)^(10/3) · hours = L10·10⁶/(60n)",
    },
    methodChoice: "bearingType",
    outputs: [
      { id: "millionRevolutions", label: "Basic L10 life", defaultUnit: "million rev", expression: "(dynamicRating/equivalentLoad)^lookup(lifeExp, bearingType)" },
      { id: "hours", label: "Basic L10 life", defaultUnit: "h", expression: "(dynamicRating/equivalentLoad)^lookup(lifeExp, bearingType)*1e6/(rpm*60)" },
      { id: "loadRatio", label: "Dynamic-rating to equivalent-load ratio", defaultUnit: "—", expression: "dynamicRating/equivalentLoad" },
    ],
    formula: "L10 = (C/P)³ · hours = L10·10⁶/(60n)",
    warnings: ["This is a baseline statistical L10 rating-life screen for one entered equivalent load and constant speed. It excludes load-spectrum effects, lubrication, contamination, temperature, misalignment, shock, reliability adjustment, mounting, and manufacturer-specific life factors."],
  }),
  lmtd: remaining("lmtd", {
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
  driveRatio: remaining("driveRatio", {
    fields: [
      { id: "driveType", label: "Declared drive family", help: "Select only the geometry label for the stated ideal-ratio arithmetic; no topology or component selection occurs.", defaultValue: 0, defaultUnit: "—", choice: ["spur", "helical", "belt", "timingBelt", "chain", "worm"] },
      { id: "driverMeasure", label: "Driver teeth / pitch measure", symbol: "N1", help: "Driver tooth count or compatible pitch-diameter measure used only in the ratio.", defaultValue: 20, defaultUnit: "—" },
      { id: "drivenMeasure", label: "Driven teeth / pitch measure", symbol: "N2", help: "Driven tooth count or compatible pitch-diameter measure used only in the ratio.", defaultValue: 60, defaultUnit: "—" },
      { id: "inputSpeed", label: "Input speed", symbol: "n1", help: "Declared driver speed.", defaultValue: 1800, defaultUnit: "rpm" },
      { id: "inputTorque", label: "Input torque", symbol: "T1", help: "Declared driver torque.", defaultValue: 45, defaultUnit: "N·m", signed: true },
      { id: "efficiency", label: "Transmission efficiency", symbol: "η", help: "User-entered overall efficiency from 0 to 100; this screen does not select it.", defaultValue: 92, defaultUnit: "%" },
      { id: "driverPitchDiameter", label: "Driver pitch diameter", symbol: "d1", help: "Driver pitch diameter for pitch-line speed and tangential-force arithmetic.", defaultValue: 80, defaultUnit: "mm" },
      { id: "pressureAngle", label: "Declared pressure angle", symbol: "φ", help: "User-entered pressure angle for the elementary radial force decomposition.", defaultValue: 20, defaultUnit: "deg", signed: true },
      { id: "helixAngle", label: "Declared helix angle", symbol: "β", help: "Use zero for non-helical/belt/chain models; this screen reports an elementary axial-force component only.", defaultValue: 15, defaultUnit: "deg", signed: true },
    ],
    lookups: { isHelical: { helical: 1, spur: 0, belt: 0, timingBelt: 0, chain: 0, worm: 0 } },
    outputs: [
      { id: "ratio", label: "Driven / driver ratio", defaultUnit: "—", expression: "drivenMeasure/driverMeasure" },
      { id: "outputSpeed", label: "Ideal output speed", defaultUnit: "rpm", expression: "inputSpeed/(drivenMeasure/driverMeasure)" },
      { id: "outputTorque", label: "Output torque with stated efficiency", defaultUnit: "N·m", expression: "inputTorque*(drivenMeasure/driverMeasure)*efficiency/100" },
      { id: "pitchLineSpeed", label: "Driver pitch-line speed", defaultUnit: "m/s", expression: "pi*(driverPitchDiameter/1000)*inputSpeed/60" },
      { id: "tangentialForce", label: "Driver tangential force", defaultUnit: "N", expression: "2*inputTorque*1000/(driverPitchDiameter+eq(driverPitchDiameter,0))*(1-eq(driverPitchDiameter,0))" },
      { id: "radialForce", label: "Elementary radial force component", defaultUnit: "N", expression: "2*inputTorque*1000/(driverPitchDiameter+eq(driverPitchDiameter,0))*(1-eq(driverPitchDiameter,0))*tan(pressureAngle*pi/180)" },
      { id: "axialForce", label: "Elementary axial force component", defaultUnit: "N", expression: "lookup(isHelical, driveType)*2*inputTorque*1000/(driverPitchDiameter+eq(driverPitchDiameter,0))*(1-eq(driverPitchDiameter,0))*tan(helixAngle*pi/180)" },
    ],
    formula: "i = N2/N1 · n2 = n1/i · T2 = T1·i·η · v = πd1n1/60 · Ft = 2T1/d1",
    warnings: ["This is an ideal user-declared drive-ratio screen. It uses a simple pitch-circle tangential-force relation and an elementary pressure/helix-angle force decomposition; axial force is reported only for the declared helical option. It excludes component selection, planetary topology, gear tooth strength, mesh stiffness, backlash, lubrication, heat, durability, manufacturing quality, belt/chain tension, vibration, dynamic load factors, bearing reactions, and system validation."],
  }),
  vacuumHolding: remaining("vacuumHolding", {
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
      { id: "gravityForce", label: "Weight component", defaultUnit: "N", expression: "mass*9.81" },
      { id: "accelerationForce", label: "Inertial force component", defaultUnit: "N", expression: "mass*acceleration" },
      { id: "baseForce", label: "Vertical-lift base holding force", defaultUnit: "N", expression: "mass*9.81+mass*acceleration*(lookup(useFriction, orientation)/friction+(1-lookup(useFriction, orientation)))", labelChoice: "orientation", labels: { horizontal: "Horizontal-transport base holding force", vertical: "Vertical-lift base holding force" } },
      { id: "requiredHoldingForce", label: "Multiplier-adjusted required holding force", defaultUnit: "N", expression: "(mass*9.81+mass*acceleration*(lookup(useFriction, orientation)/friction+(1-lookup(useFriction, orientation))))*multiplier" },
    ],
    formula: "FTH = m(g + a)M",
    warnings: ["This is a simplified theoretical holding-force requirement for the selected declared load case. It does not select suction cups, count cups, calculate cup area, infer surface quality, assess seal/leakage, prescribe a safety factor, validate friction, determine vacuum level, size pumps or ejectors, analyze moments, certify handling safety, or approve an end-of-arm tool. Validate the full worst-case handling sequence and system on the real workpiece."],
  }),
  gearToothStress: remaining("gearToothStress", {
    fields: [
      { id: "gearType", label: "Gear tooth type", help: "Select the narrow static spur or parallel-axis helical first-estimate relation.", defaultValue: 0, defaultUnit: "—", choice: ["spur", "helical"] },
      { id: "tangentialLoad", label: "Declared tangential tooth load", symbol: "Ft", help: "Known static tangential mesh load; this workspace does not derive or select it.", defaultValue: 1000, defaultUnit: "N" },
      { id: "faceWidth", label: "Face width", symbol: "b", help: "Nominal loaded face width for the stated spur-gear tooth.", defaultValue: 50, defaultUnit: "mm" },
      { id: "module", label: "Normal module", symbol: "m", help: "Nominal metric module for the stated spur-gear geometry.", defaultValue: 2, defaultUnit: "mm" },
      { id: "toothCount", label: "Declared tooth count", symbol: "z", help: "User-entered tooth count used only to expose the helical virtual-tooth arithmetic.", defaultValue: 20, defaultUnit: "teeth" },
      { id: "helixAngle", label: "Declared helix angle", symbol: "β", help: "Use 0° for a spur gear; the helical first-estimate relation is limited to a positive angle through 45°.", defaultValue: 0, defaultUnit: "deg", signed: true },
      { id: "formFactor", label: "Declared Lewis form factor", symbol: "Y", help: "User-entered dimensionless form factor for the declared tooth geometry; it is not selected here.", defaultValue: 0.3, defaultUnit: "—" },
    ],
    lookups: { isHelical: { helical: 1, spur: 0 } },
    methods: {
      helical: "Fb = Ft/cos β · zv = z/cos³ β · σF = Fb/(b m Y)",
      spur: "σF = Ft/(b m Y)",
    },
    methodChoice: "gearType",
    outputs: [
      { id: "normalForce", label: "Spur tangential tooth force", defaultUnit: "N", expression: "tangentialLoad/(cos(helixAngle*pi/180)^lookup(isHelical, gearType))", labelChoice: "gearType", labels: { helical: "Declared helical normal tooth force", spur: "Spur tangential tooth force" } },
      { id: "virtualToothCount", label: "Declared tooth count", defaultUnit: "teeth", expression: "toothCount/cos(helixAngle*pi/180)^(3*lookup(isHelical, gearType))", labelChoice: "gearType", labels: { helical: "Helical virtual tooth count", spur: "Declared tooth count" } },
      { id: "loadedSection", label: "Lewis-type loaded section factor", defaultUnit: "mm²", expression: "faceWidth*module*formFactor" },
      { id: "rootStress", label: "Static Lewis-type {gearType} root bending stress", defaultUnit: "MPa", expression: "tangentialLoad/(cos(helixAngle*pi/180)^lookup(isHelical, gearType))/(faceWidth*module*formFactor)" },
    ],
    formula: "σF = Ft/(b m Y)",
    warnings: ["This is a basic static Lewis-type spur/helical root-bending arithmetic screen using a user-entered form factor. For the parallel-axis helical first estimate it exposes normal force and virtual tooth count, but does not select a form factor or apply rating factors. It does not select module, pressure angle, material, hardness, tooth form, or Lewis factor; calculate dynamic factors, contact stress, AGMA/ISO rating, mesh load distribution, lubrication, life, reliability, gearbox design, or approval."],
  }),
  isentropicMachine: remaining("isentropicMachine", {
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
      { id: "isentropicOutletTemperature", label: "Isentropic outlet temperature", defaultUnit: "K", expression: "inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)" },
      { id: "actualOutletTemperature", label: "Declared-efficiency outlet temperature", defaultUnit: "K", expression: "inletTemperature+(2*lookup(isCompressor, mode)-1)*specificHeat*abs(inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)-inletTemperature)*(lookup(isCompressor, mode)/(efficiency/100)+(1-lookup(isCompressor, mode))*efficiency/100)/specificHeat" },
      { id: "specificWork", label: "Declared-efficiency compressor specific work input", defaultUnit: "kJ/kg", expression: "specificHeat*abs(inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)-inletTemperature)*(lookup(isCompressor, mode)/(efficiency/100)+(1-lookup(isCompressor, mode))*efficiency/100)", labelChoice: "mode", labels: { compressor: "Declared-efficiency compressor specific work input", turbine: "Declared-efficiency turbine specific work output" } },
      { id: "power", label: "Declared-efficiency compressor shaft power input", defaultUnit: "kW", expression: "massFlow*specificHeat*abs(inletTemperature*(outletPressure/inletPressure)^((gamma-1)/gamma)-inletTemperature)*(lookup(isCompressor, mode)/(efficiency/100)+(1-lookup(isCompressor, mode))*efficiency/100)", labelChoice: "mode", labels: { compressor: "Declared-efficiency compressor shaft power input", turbine: "Declared-efficiency turbine shaft power output" } },
    ],
    formula: "T2s/T1 = (p2/p1)^((γ−1)/γ) · wis = cp(T2s−T1) · wactual = wis/ηis · P = ṁw",
    warnings: ["This is ideal-gas isentropic state and user-entered-efficiency work arithmetic only. It does not select or rate equipment, use compressor maps, evaluate surge, choking, staging, cooling, losses beyond the declared efficiency, controls, mechanical design, safety, operability, or approval."],
  }),
};



