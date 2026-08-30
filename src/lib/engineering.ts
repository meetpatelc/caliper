/**
 * Engineering Desk — Instrument Panel Atelier reminder:
 * This is the numerical trust layer. Compute in canonical SI where practical,
 * expose model limits, and return structured validation instead of silent output.
 */

import type { ToolId } from "@/lib/catalog";
import { convertQuantity, isUnitFamilyId, unitSymbol, unitsForFamily, type UnitFamilyId } from "@/lib/units";
import { libraryDocuments, runLibraryDocument } from "@/lib/document";

export type { FieldKind, FieldDefinition } from "@/lib/engineering-types";
export { toolFields } from "@/lib/engineering-fields";
export { initialInputs } from "@/lib/engineering-defaults";

export type CalculationValue = { key: string; label: string; raw: number; display: string; unit: string; symbol?: string };
export type CalculationState = {
  values: CalculationValue[];
  warnings: string[];
  errors: string[];
  method: string;
};



const finite = (value: string, label: string, positive = true) => {
  if (value.trim() === "") throw new Error(`${label} is required.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number.`);
  if (positive && parsed <= 0) throw new Error(`${label} must be greater than zero.`);
  return parsed;
};

const round = (value: number, significant = 5) => {
  if (value === 0) return "0";
  const decimals = Math.max(0, significant - Math.floor(Math.log10(Math.abs(value))) - 1);
  return Number(value.toFixed(Math.min(decimals, 10))).toLocaleString("en-US", { maximumFractionDigits: Math.min(decimals, 10) });
};

const quantity = (key: string, label: string, raw: number, value: number, unit: string, significant = 5): CalculationValue => ({ key, label, raw, display: round(value, significant), unit });

const fromKiloNewton = (value: number) => value * 1000;
const fromGigaPascal = (value: number) => value * 1e9;
const fromCentimetre4 = (value: number) => value * 1e-8;

const calculateBeam = (input: Record<string, string>): CalculationState => {
  const load = fromKiloNewton(finite(input.load, "Point load"));
  const length = finite(input.length, "Span");
  const modulus = fromGigaPascal(finite(input.modulus, "Elastic modulus"));
  const inertia = fromCentimetre4(finite(input.inertia, "Second moment of area"));
  const isCantilever = input.case === "cantilever";
  const deflection = isCantilever ? (load * length ** 3) / (3 * modulus * inertia) : (load * length ** 3) / (48 * modulus * inertia);
  const moment = isCantilever ? load * length : (load * length) / 4;
  const reaction = isCantilever ? load : load / 2;
  return {
    values: [quantity("reaction", isCantilever ? "Fixed-end reaction" : "Reaction at each support", reaction, reaction / 1000, "kN"), quantity("moment", "Maximum bending moment", moment, moment / 1000, "kN·m"), quantity("deflection", "Maximum elastic deflection", deflection, deflection * 1000, "mm")],
    warnings: ["This response uses a narrow, linear-elastic straight-beam model. Check that support conditions, small-deflection behavior, load position, and bending axis match the diagram."],
    errors: [],
    method: isCantilever ? "δmax = PL³ / 3EI · Mmax = PL" : "δmax = PL³ / 48EI · Mmax = PL / 4",
  };
};

const calculateBeamDiagram = (input: Record<string, string>): CalculationState => {
  const span = finite(input.span, "Support span");
  const pointLoad = fromKiloNewton(finite(input.pointLoad, "Declared downward point load", false));
  const pointLocation = finite(input.pointLocation, "Point-load location from left");
  const uniformLoad = fromKiloNewton(finite(input.uniformLoad, "Declared full-span uniform load", false));
  if (pointLoad < 0 || uniformLoad < 0) throw new Error("Declared downward loads must not be negative.");
  if (pointLocation >= span) throw new Error("Point-load location must lie strictly between the supports.");
  if (pointLoad === 0 && uniformLoad === 0) throw new Error("Enter a nonzero point load or full-span uniform load.");
  const reactionLeft = (pointLoad * (span - pointLocation)) / span + (uniformLoad * span) / 2;
  const reactionRight = (pointLoad * pointLocation) / span + (uniformLoad * span) / 2;
  const momentAt = (x: number) => reactionLeft * x - (uniformLoad * x ** 2) / 2 - (x > pointLocation ? pointLoad * (x - pointLocation) : 0);
  const candidateLocations = [pointLocation];
  if (uniformLoad > 0) {
    const beforePointZeroShear = reactionLeft / uniformLoad;
    const afterPointZeroShear = (reactionLeft - pointLoad) / uniformLoad;
    if (beforePointZeroShear > 0 && beforePointZeroShear < pointLocation) candidateLocations.push(beforePointZeroShear);
    if (afterPointZeroShear > pointLocation && afterPointZeroShear < span) candidateLocations.push(afterPointZeroShear);
  }
  const peakLocation = candidateLocations.reduce((best, x) => Math.abs(momentAt(x)) > Math.abs(momentAt(best)) ? x : best, candidateLocations[0]);
  const momentAtPoint = momentAt(pointLocation);
  const peakMoment = momentAt(peakLocation);
  const shearLeftOfPoint = reactionLeft - uniformLoad * pointLocation;
  const shearRightOfPoint = shearLeftOfPoint - pointLoad;
  return { values: [quantity("leftReaction", "Left support reaction", reactionLeft, reactionLeft / 1000, "kN"), quantity("rightReaction", "Right support reaction", reactionRight, reactionRight / 1000, "kN"), quantity("shearLeftOfPoint", "Shear left of point load", shearLeftOfPoint, shearLeftOfPoint / 1000, "kN"), quantity("shearRightOfPoint", "Shear right of point load", shearRightOfPoint, shearRightOfPoint / 1000, "kN"), quantity("momentAtPoint", "Moment at point-load location", momentAtPoint, momentAtPoint / 1000, "kN·m"), quantity("peakMoment", "Largest-magnitude bending moment", peakMoment, peakMoment / 1000, "kN·m"), quantity("peakMomentLocation", "Peak-moment location from left", peakLocation, peakLocation, "m")], warnings: ["This is a static, simply supported single-span equilibrium screen with one downward point load and/or full-span downward uniform load. It does not produce a scaled plot, deflection, stress, connection, dynamic, plasticity, code, capacity, or approval result."], errors: [], method: "RA = P(L−a)/L + wL/2 · RB = Pa/L + wL/2 · V(x) = RA − wx − P·H(x−a) · M(x) = RAx − wx²/2 − P(x−a)H(x−a)" };
};


const calculateSection = (input: Record<string, string>): CalculationState => {
  const shape = input.shape;
  const outer = finite(input.width, shape === "rectangle" ? "Width" : "Outer diameter");
  let area = 0;
  let inertia = 0;
  let c = 0;
  if (shape === "rectangle") {
    const height = finite(input.height, "Height");
    area = outer * height;
    inertia = (outer * height ** 3) / 12;
    c = height / 2;
  } else if (shape === "circle") {
    area = (Math.PI * outer ** 2) / 4;
    inertia = (Math.PI * outer ** 4) / 64;
    c = outer / 2;
  } else {
    const inner = finite(input.innerDiameter, "Inner diameter");
    if (inner >= outer) throw new Error("Inner diameter must be smaller than the outer diameter.");
    area = (Math.PI * (outer ** 2 - inner ** 2)) / 4;
    inertia = (Math.PI * (outer ** 4 - inner ** 4)) / 64;
    c = outer / 2;
  }
  return {
    values: [quantity("area", "Cross-sectional area", area, area, "mm²"), quantity("inertia", "Second moment of area", inertia, inertia, "mm⁴"), quantity("sectionModulus", "Section modulus", inertia / c, inertia / c, "mm³")],
    warnings: ["Geometry values are calculated about the displayed centroidal horizontal axis. Verify the chosen axis and that the basic shape represents the actual section."],
    errors: [],
    method: shape === "rectangle" ? "A = bh · Iₓ = bh³ / 12 · Sₓ = Iₓ / (h/2)" : shape === "circle" ? "A = πD² / 4 · Iₓ = πD⁴ / 64 · Sₓ = Iₓ / (D/2)" : "A = π(D² − d²) / 4 · Iₓ = π(D⁴ − d⁴) / 64",
  };
};

const calculateTriangle = (input: Record<string, string>): CalculationState => {
  const a = finite(input.legA, "Horizontal leg");
  const b = finite(input.legB, "Vertical leg");
  const hypotenuse = Math.hypot(a, b);
  const alpha = Math.atan2(b, a) * 180 / Math.PI;
  return {
    values: [quantity("hypotenuse", "Hypotenuse", hypotenuse, hypotenuse, "mm"), quantity("area", "Triangle area", a * b / 2, a * b / 2, "mm²"), quantity("alpha", "Angle from horizontal", alpha, alpha, "°"), quantity("beta", "Other acute angle", 90 - alpha, 90 - alpha, "°")],
    warnings: ["This uses a flat Euclidean right triangle. It does not infer dimensions from a drawing, field measurement, tolerance, or a non-perpendicular geometry."],
    errors: [],
    method: "c = √(a² + b²) · A = ab / 2 · α = tan⁻¹(b/a)",
  };
};


const calculateFits = (input: Record<string, string>): CalculationState => {
  const holeMin = finite(input.holeMin, "Hole minimum", false); const holeMax = finite(input.holeMax, "Hole maximum", false); const shaftMin = finite(input.shaftMin, "Shaft minimum", false); const shaftMax = finite(input.shaftMax, "Shaft maximum", false);
  if (holeMax < holeMin || shaftMax < shaftMin) throw new Error("Each maximum limit must be greater than or equal to its minimum limit.");
  const minimumClearance = holeMin - shaftMax; const maximumClearance = holeMax - shaftMin;
  const classification = minimumClearance > 0 ? "Clearance fit" : maximumClearance < 0 ? "Interference fit" : "Transition fit";
  return { values: [quantity("minimumClearance", "Minimum clearance (+) / interference (−)", minimumClearance, minimumClearance, "mm"), quantity("maximumClearance", "Maximum clearance (+) / interference (−)", maximumClearance, maximumClearance, "mm"), quantity("holeTolerance", "Hole tolerance width", holeMax - holeMin, holeMax - holeMin, "mm"), quantity("shaftTolerance", "Shaft tolerance width", shaftMax - shaftMin, shaftMax - shaftMin, "mm")], warnings: [`${classification}. This workspace uses only stated size limits; form, position, texture, thermal growth, loading, and assembly method are excluded.`], errors: [], method: "Cmin = Hmin − Smax · Cmax = Hmax − Smin" };
};


const calculateToleranceSampling = (input: Record<string, string>): CalculationState => {
  const nominal = finite(input.nominal, "Nominal chain result", false);
  const contributors = [1, 2, 3, 4, 5, 6].map((index) => finite(input[`t${index}`] ?? "0", `Contributor ${index} uniform half-width`, false));
  if (contributors.some((term) => term < 0)) throw new Error("Uniform contributor half-widths must not be negative.");
  if (!contributors.some((term) => term > 0)) throw new Error("At least one uniform contributor half-width must be greater than zero.");
  const seed = finite(input.seed, "Declared integer seed", false);
  const sampleCount = finite(input.sampleCount, "Declared sample count");
  if (!Number.isInteger(seed) || seed > 4_294_967_295) throw new Error("Declared integer seed must be a non-negative integer no greater than 4,294,967,295.");
  if (!Number.isInteger(sampleCount) || sampleCount < 10 || sampleCount > 10_000) throw new Error("Declared sample count must be an integer from 10 through 10,000.");
  let state = seed >>> 0;
  const nextUniform = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4_294_967_296;
  };
  const samples = Array.from({ length: sampleCount }, () => nominal + contributors.reduce((sum, halfWidth) => sum + (2 * nextUniform() - 1) * halfWidth, 0));
  const sampleMean = samples.reduce((sum, value) => sum + value, 0) / sampleCount;
  const sampleStandardDeviation = Math.sqrt(samples.reduce((sum, value) => sum + (value - sampleMean) ** 2, 0) / (sampleCount - 1));
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.round((sorted.length - 1) * fraction)]!;
  const worstCase = contributors.reduce((sum, term) => sum + term, 0);
  return { values: [quantity("sampleCount", "Generated local samples", sampleCount, sampleCount, "samples"), quantity("seed", "Reproducibility seed", seed, seed, "—"), quantity("sampleMean", "Generated sample mean", sampleMean, sampleMean, "mm"), quantity("sampleStandardDeviation", "Generated sample standard deviation", sampleStandardDeviation, sampleStandardDeviation, "mm"), quantity("sampleMinimum", "Generated sample minimum", sorted[0]!, sorted[0]!, "mm"), quantity("sampleMaximum", "Generated sample maximum", sorted.at(-1)!, sorted.at(-1)!, "mm"), quantity("p01", "Generated 1st percentile", percentile(0.01), percentile(0.01), "mm"), quantity("p99", "Generated 99th percentile", percentile(0.99), percentile(0.99), "mm"), quantity("declaredWorstCase", "Declared worst-case envelope half-width", worstCase, worstCase, "mm")], warnings: ["This is a reproducible local pseudo-random sample of a user-declared independent uniform linear stack. It does not infer contributor distributions or independence, model geometry or assembly, estimate a physical population, predict yield, determine capability/compliance, recommend tolerances, or approve an assembly."], errors: [], method: "xi = N + Σ[(2ui−1)·ti], ui from visible seeded LCG · reported percentiles use nearest generated rank" };
};

const calculateTaylorToolLife = (input: Record<string, string>): CalculationState => {
  const taylorConstant = finite(input.taylorConstant, "Declared Taylor constant");
  const exponent = finite(input.exponent, "Declared Taylor exponent");
  if (input.mode === "lifeFromSpeed") {
    const cuttingSpeed = finite(input.cuttingSpeed, "Declared cutting speed");
    const toolLife = (taylorConstant / cuttingSpeed) ** (1 / exponent);
    return { values: [quantity("cuttingSpeed", "Declared cutting speed", cuttingSpeed, cuttingSpeed, "m/min"), quantity("toolLife", "Taylor-relation tool life", toolLife, toolLife, "min"), quantity("relationResidual", "Relation residual", cuttingSpeed * toolLife ** exponent - taylorConstant, cuttingSpeed * toolLife ** exponent - taylorConstant, "(m/min)·minⁿ")], warnings: ["This solves only the user-entered empirical Taylor relation on the stated matched test basis. It does not select a tool or condition, derive C or n, account for feed/depth/coolant/material/coating/geometry, predict wear mechanisms, establish capability, or approve machining."], errors: [], method: "V·Tⁿ = C · T = (C/V)^(1/n)" };
  }
  if (input.mode === "speedFromLife") {
    const toolLife = finite(input.toolLife, "Declared tool life");
    const cuttingSpeed = taylorConstant / toolLife ** exponent;
    return { values: [quantity("toolLife", "Declared tool life", toolLife, toolLife, "min"), quantity("cuttingSpeed", "Taylor-relation cutting speed", cuttingSpeed, cuttingSpeed, "m/min"), quantity("relationResidual", "Relation residual", cuttingSpeed * toolLife ** exponent - taylorConstant, cuttingSpeed * toolLife ** exponent - taylorConstant, "(m/min)·minⁿ")], warnings: ["This solves only the user-entered empirical Taylor relation on the stated matched test basis. It does not select a tool or condition, derive C or n, account for feed/depth/coolant/material/coating/geometry, predict wear mechanisms, establish capability, or approve machining."], errors: [], method: "V·Tⁿ = C · V = C/Tⁿ" };
  }
  throw new Error("Solve mode must be tool life from speed or cutting speed from tool life.");
};


const calculateMmc = (input: Record<string, string>): CalculationState => {
  const mmcSize = finite(input.mmcSize, "MMC size"); const actualSize = finite(input.actualSize, "Actual feature size"); const tolerance = finite(input.positionTolerance, "Position tolerance at MMC"); const isHole = input.featureType === "hole"; const bonus = isHole ? actualSize - mmcSize : mmcSize - actualSize;
  if (bonus < 0) throw new Error(isHole ? "Actual hole size must be at least its stated MMC size." : "Actual pin size must not exceed its stated MMC size.");
  const virtualCondition = isHole ? mmcSize - tolerance : mmcSize + tolerance;
  return { values: [quantity("bonus", "Available bonus tolerance", bonus, bonus, "mm"), quantity("totalPosition", "Total position tolerance", tolerance + bonus, tolerance + bonus, "mm"), quantity("virtualCondition", "Simplified virtual condition", virtualCondition, virtualCondition, "mm")], warnings: ["This single-feature screen assumes one cylindrical feature, one MMC position control, and no datum shift, composite frame, projected zone, or functional-gage interpretation beyond the displayed formula."], errors: [], method: isHole ? "Bonus = actual hole − MMC hole · VC = MMC hole − ⌀T" : "Bonus = MMC pin − actual pin · VC = MMC pin + ⌀T" };
};

const calculateMotionProfile = (input: Record<string, string>): CalculationState => {
  const distance = finite(input.distance, "Move distance") / 1000; const accelTime = finite(input.accelTime, "Acceleration time"); const cruiseTime = finite(input.cruiseTime, "Cruise time", false);
  if (cruiseTime < 0) throw new Error("Cruise time cannot be negative.");
  const acceleration = distance / (accelTime * (accelTime + cruiseTime)); const peakSpeed = acceleration * accelTime; const totalTime = 2 * accelTime + cruiseTime;
  return { values: [quantity("acceleration", "Profile acceleration", acceleration, acceleration, "m/s²"), quantity("peakSpeed", "Peak speed", peakSpeed, peakSpeed, "m/s"), quantity("totalTime", "Total move time", totalTime, totalTime, "s"), quantity("distance", "Move distance", distance, distance * 1000, "mm")], warnings: ["This is an ideal symmetric trapezoidal/triangular profile. It excludes jerk limits, structural compliance, load inertia, friction, servo tuning, actuator force limits, and safety margins."], errors: [], method: "a = s / [ta(ta + tc)] · vmax = a·ta · T = 2ta + tc" };
};


const calculatePneumatic = (input: Record<string, string>): CalculationState => {
  const bore = finite(input.bore, "Cylinder bore") / 1000; const rod = finite(input.rod, "Rod diameter") / 1000; const pressure = finite(input.pressure, "Operating pressure") * 1e5; const efficiency = finite(input.efficiency, "Applied force factor") / 100;
  if (rod >= bore) throw new Error("Rod diameter must be smaller than cylinder bore.");
  if (efficiency > 1) throw new Error("Applied force factor must not exceed 100 percent.");
  const boreArea = Math.PI * bore ** 2 / 4; const rodArea = Math.PI * rod ** 2 / 4; const extend = pressure * boreArea * efficiency; const retract = pressure * (boreArea - rodArea) * efficiency;
  return { values: [quantity("extend", "Applied extend force", extend, extend / 1000, "kN"), quantity("retract", "Applied retract force", retract, retract / 1000, "kN"), quantity("boreArea", "Bore area", boreArea, boreArea * 1e6, "mm²"), quantity("retractArea", "Retract-side area", boreArea - rodArea, (boreArea - rodArea) * 1e6, "mm²")], warnings: ["Pressure times area is theoretical. The applied force factor is user-entered; supply pressure drop, speed, cushioning, side load, seal friction, air flow, impact energy, and safety functions remain outside this screen."], errors: [], method: "Fextend = P·Abore·η · Fretract = P(Abore − Arod)·η" };
};

const calculateClampForce = (input: Record<string, string>): CalculationState => {
  const force = finite(input.actuatorForce, "Actuator force") * 1000; const angle = finite(input.angle, "Transfer angle", false); const efficiency = finite(input.efficiency, "Transmission efficiency") / 100;
  if (angle <= 0 || angle >= 180) throw new Error("Transfer angle must be greater than 0 and smaller than 180 degrees.");
  if (efficiency > 1) throw new Error("Transmission efficiency must not exceed 100 percent.");
  const radians = angle * Math.PI / 180; const transferred = force * Math.sin(radians) * efficiency; const pivot = force * Math.abs(Math.cos(radians));
  return { values: [quantity("transferred", "Transferred clamp force", transferred, transferred / 1000, "kN"), quantity("pivot", "Ideal pivot-side component", pivot, pivot / 1000, "kN"), quantity("transferRatio", "Force transfer ratio", transferred / force, transferred / force, "—")], warnings: ["This is one planar transfer-angle relationship. It excludes linkage stiffness, bearing/friction variation, dynamics, buckling, contact geometry, retaining force under vibration, and machine-safety assessment."], errors: [], method: "Ftransfer = F·sin(θ)·η · Fpivot = F·|cos(θ)|" };
};


const calculateBearingLife = (input: Record<string, string>): CalculationState => {
  const dynamicRating = finite(input.dynamicRating, "Dynamic rating"); const equivalentLoad = finite(input.equivalentLoad, "Equivalent load"); const rpm = finite(input.rpm, "Rotational speed"); const exponent = input.bearingType === "roller" ? 10 / 3 : 3; const millionRevolutions = (dynamicRating / equivalentLoad) ** exponent; const hours = millionRevolutions * 1e6 / (rpm * 60);
  return { values: [quantity("millionRevolutions", "Basic L10 life", millionRevolutions, millionRevolutions, "million rev"), quantity("hours", "Basic L10 life", hours, hours, "h"), quantity("loadRatio", "Dynamic-rating to equivalent-load ratio", dynamicRating / equivalentLoad, dynamicRating / equivalentLoad, "—")], warnings: ["This is a baseline statistical L10 rating-life screen for one entered equivalent load and constant speed. It excludes load-spectrum effects, lubrication, contamination, temperature, misalignment, shock, reliability adjustment, mounting, and manufacturer-specific life factors."], errors: [], method: input.bearingType === "roller" ? "L10 = (C/P)^(10/3) · hours = L10·10⁶/(60n)" : "L10 = (C/P)³ · hours = L10·10⁶/(60n)" };
};


const calculateLmtd = (input: Record<string, string>): CalculationState => {
  const hotIn = finite(input.hotIn, "Hot-side inlet", false); const hotOut = finite(input.hotOut, "Hot-side outlet", false); const coldIn = finite(input.coldIn, "Cold-side inlet", false); const coldOut = finite(input.coldOut, "Cold-side outlet", false); const overallCoefficient = finite(input.overallCoefficient, "Declared overall coefficient"); const area = finite(input.area, "Declared transfer area"); const counter = input.arrangement === "counter";
  const delta1 = counter ? hotIn - coldOut : hotIn - coldIn; const delta2 = counter ? hotOut - coldIn : hotOut - coldOut;
  if (delta1 <= 0 || delta2 <= 0) throw new Error("Both terminal temperature differences must remain positive for this no-crossover LMTD screen.");
  const lmtd = Math.abs(delta1 - delta2) < 1e-10 ? delta1 : (delta1 - delta2) / Math.log(delta1 / delta2);
  const duty = overallCoefficient * area * lmtd;
  const requiredAreaPerKilowatt = 1000 / (overallCoefficient * lmtd);
  return { values: [quantity("lmtd", "Log mean temperature difference", lmtd, lmtd, "K or °C"), quantity("duty", "Declared-UA heat-transfer rate", duty, duty / 1000, "kW"), quantity("areaPerKilowatt", "Required area per 1 kW at declared U", requiredAreaPerKilowatt, requiredAreaPerKilowatt, "m²/kW"), quantity("delta1", "First terminal difference", delta1, delta1, "K or °C"), quantity("delta2", "Second terminal difference", delta2, delta2, "K or °C")], warnings: ["This evaluates only ideal parallel or counterflow LMTD and user-entered UA arithmetic. It excludes correction factors, phase change, heat capacity rates, fouling, heat-transfer-coefficient derivation, pressure drop, transient behavior, materials, exchanger design/selection/rating, safety, and approval."], errors: [], method: counter ? "ΔTlm = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2) · Q = UAΔTlm, counterflow" : "ΔTlm = (ΔT1 − ΔT2) / ln(ΔT1/ΔT2) · Q = UAΔTlm, parallel flow" };
};


const calculateLeadScrew = (input: Record<string, string>): CalculationState => {
  const force = finite(input.axialForce, "Axial load") * 1000;
  const lead = finite(input.lead, "Screw lead") / 1000;
  const efficiency = finite(input.efficiency, "Mechanical efficiency") / 100;
  const rpm = finite(input.rpm, "Screw speed");
  if (efficiency > 1) throw new Error("Mechanical efficiency must not exceed 100 percent.");
  const torque = force * lead / (2 * Math.PI * efficiency);
  const speed = lead * rpm / 60;
  const power = force * speed;
  return { values: [quantity("torque", "Ideal raising torque", torque, torque, "N·m"), quantity("speed", "Linear travel speed", speed, speed * 1000, "mm/s"), quantity("power", "Mechanical output power", power, power / 1000, "kW")], warnings: ["This is an ideal constant-load power-screw relationship using a user-entered efficiency. It excludes thread geometry verification, friction variation, back-driving, buckling, critical speed, bearings, misalignment, acceleration torque, duty cycle, lubrication, wear, and component selection."], errors: [], method: "T = F·l/(2πη) · v = l·n/60 · P = Fv" };
};

const calculateAirConsumption = (input: Record<string, string>): CalculationState => {
  const bore = finite(input.bore, "Cylinder bore") / 1000;
  const rod = finite(input.rod, "Rod diameter") / 1000;
  const stroke = finite(input.stroke, "Stroke") / 1000;
  const gaugePressure = finite(input.pressure, "Operating pressure");
  const cycles = finite(input.cycles, "Cycle rate");
  if (rod >= bore) throw new Error("Rod diameter must be smaller than cylinder bore.");
  const boreArea = Math.PI * bore ** 2 / 4;
  const rodArea = Math.PI * rod ** 2 / 4;
  const sweptVolume = (boreArea + (boreArea - rodArea)) * stroke;
  const absoluteRatio = gaugePressure + 1;
  const normalizedCycle = sweptVolume * absoluteRatio * 1000;
  return { values: [quantity("cycleAir", "Ideal normalized free air per cycle", normalizedCycle, normalizedCycle, "NL/cycle"), quantity("minuteAir", "Ideal normalized free-air rate", normalizedCycle * cycles, normalizedCycle * cycles, "NL/min"), quantity("sweptVolume", "Cylinder swept volume per cycle", sweptVolume, sweptVolume * 1000, "L/cycle")], warnings: ["This is an ideal double-acting full-stroke consumption estimate normalized to 1 bar absolute. It excludes dead volume, cushioning, valve/line loss, leakage, regulator dynamics, air temperature, compressor duty, load motion, speed control, and component sizing."], errors: [], method: "Vfree = (Aextend + Aretract)s·(Pgauge + 1 bar)" };
};


const calculateCircularArc = (input: Record<string, string>): CalculationState => {
  const radius = finite(input.radius, "Radius");
  const angle = finite(input.angle, "Central angle");
  if (angle > 360) throw new Error("Central angle must not exceed 360 degrees.");
  const radians = angle * Math.PI / 180;
  const arc = radius * radians;
  const chord = 2 * radius * Math.sin(radians / 2);
  const sector = radius ** 2 * radians / 2;
  const segment = sector - radius ** 2 * Math.sin(radians) / 2;
  return { values: [quantity("arc", "Arc length", arc, arc, "mm"), quantity("chord", "Chord length", chord, chord, "mm"), quantity("sector", "Sector area", sector, sector, "mm²"), quantity("segment", "Circular-segment area", segment, segment, "mm²")], warnings: ["This is nominal planar-circle geometry. It excludes manufacturing tolerances, three-dimensional curvature, material thickness, bend allowance, forming response, and any manufacturing or inspection decision."], errors: [], method: "s = rθ · c = 2r sin(θ/2) · Asector = r²θ/2 · Asegment = Asector − r²sinθ/2" };
};

const calculateCompressionSpring = (input: Record<string, string>): CalculationState => {
  const wire = finite(input.wire, "Wire diameter") / 1000;
  const meanDiameter = finite(input.meanDiameter, "Mean coil diameter") / 1000;
  const activeCoils = finite(input.activeCoils, "Active coils");
  const shearModulus = fromGigaPascal(finite(input.shearModulus, "Shear modulus"));
  const deflection = finite(input.deflection, "Applied deflection") / 1000;
  if (meanDiameter <= wire) throw new Error("Mean coil diameter must be larger than wire diameter.");
  const rate = shearModulus * wire ** 4 / (8 * meanDiameter ** 3 * activeCoils);
  const force = rate * deflection;
  const springIndex = meanDiameter / wire;
  const shearStress = 8 * force * meanDiameter / (Math.PI * wire ** 3);
  return { values: [quantity("rate", "Elementary spring rate", rate, rate / 1000, "N/mm"), quantity("force", "Ideal spring force", force, force, "N"), quantity("springIndex", "Spring index D/d", springIndex, springIndex, "—"), quantity("shearStress", "Uncorrected wire torsional shear", shearStress, shearStress / 1e6, "MPa")], warnings: ["This is an elementary close-coiled round-wire spring screen. It excludes Wahl/direct-shear correction, end condition, solid height, buckling, coil clash, residual stress, material allowables, fatigue, relaxation, corrosion, temperature, dynamics, and spring selection."], errors: [], method: "k = Gd⁴/(8D³Na) · F = kδ · τbasic = 8FD/(πd³)" };
};

const calculateDrillingTime = (input: Record<string, string>): CalculationState => {
  const diameter = finite(input.diameter, "Drill diameter");
  const rpm = finite(input.rpm, "Spindle speed");
  const feedPerRev = finite(input.feedPerRev, "Feed per revolution");
  const depth = finite(input.depth, "Cutting depth per hole");
  const holes = finite(input.holes, "Hole count");
  if (!Number.isInteger(holes)) throw new Error("Hole count must be a whole number.");
  const cuttingSpeed = Math.PI * diameter * rpm / 1000;
  const feedRate = feedPerRev * rpm;
  const timeMinutes = depth * holes / feedRate;
  return { values: [quantity("cuttingSpeed", "Peripheral cutting speed", cuttingSpeed, cuttingSpeed, "m/min"), quantity("feedRate", "Spindle feed rate", feedRate, feedRate, "mm/min"), quantity("timeMinutes", "Nominal cutting time", timeMinutes, timeMinutes * 60, "s"), quantity("distance", "Total programmed cutting depth", depth * holes, depth * holes, "mm")], warnings: ["This is reference machining arithmetic for constant-speed, constant-feed drilling. It excludes approach, breakthrough, retract, peck cycles, tool wear, material and coolant effects, machine acceleration, fixturing, chip evacuation, spindle limits, power, quality, and process qualification."], errors: [], method: "vc = πDcn/1000 · vf = frn · Tc = ld·i/(frn)" };
};


const calculateProcessCapability = (input: Record<string, string>): CalculationState => {
  const lsl = finite(input.lsl, "Lower specification limit", false);
  const usl = finite(input.usl, "Upper specification limit");
  const mean = finite(input.mean, "Process mean", false);
  const sigma = finite(input.sigma, "Within-process standard deviation");
  if (usl <= lsl) throw new Error("Upper specification limit must be larger than lower specification limit.");
  const cp = (usl - lsl) / (6 * sigma);
  const cpu = (usl - mean) / (3 * sigma);
  const cpl = (mean - lsl) / (3 * sigma);
  const cpk = Math.min(cpu, cpl);
  return { values: [quantity("cp", "Potential capability Cp", cp, cp, "—"), quantity("cpk", "Centered capability Cpk", cpk, cpk, "—"), quantity("cpu", "Upper capability Cpu", cpu, cpu, "—"), quantity("cpl", "Lower capability Cpl", cpl, cpl, "—")], warnings: ["Cp and Cpk compare user-entered specifications with user-entered process statistics. This screen does not establish statistical control, distribution suitability, rational subgrouping, measurement-system adequacy, sampling validity, customer requirements, capability thresholds, or production acceptance."], errors: [], method: "Cp = (USL−LSL)/(6s) · Cpk = min[(USL−x̄)/(3s), (x̄−LSL)/(3s)]" };
};


const calculateTorsionSpring = (input: Record<string, string>): CalculationState => {
  const wire = finite(input.wire, "Wire diameter");
  const meanDiameter = finite(input.meanDiameter, "Mean coil diameter");
  const activeCoils = finite(input.activeCoils, "Active coils");
  const modulus = finite(input.modulus, "Elastic modulus");
  const angle = finite(input.angle, "Angular deflection", false);
  if (meanDiameter <= wire) throw new Error("Mean coil diameter must be larger than wire diameter.");
  const ratePerTurn = (modulus * 1000 * wire ** 4) / (10.8 * meanDiameter * activeCoils);
  const rate = ratePerTurn / 360;
  const moment = rate * angle;
  const bendingStress = (32 * Math.abs(moment)) / (Math.PI * wire ** 3);
  return { values: [quantity("rate", "Ideal angular spring rate", rate, rate, "N·mm/deg"), quantity("moment", "Applied spring moment", moment, moment, "N·mm"), quantity("stress", "Nominal wire bending stress", bendingStress, bendingStress, "MPa"), quantity("index", "Spring index", meanDiameter / wire, meanDiameter / wire, "—")], warnings: ["This is an elementary round-wire torsion-spring screen using stated modulus, geometry, and angle. The 10.8 coefficient is a per-turn (360°) rate; it is divided by 360 so the displayed rate is per degree. It excludes leg geometry, coil contact, set, stress correction factors, fatigue, material heat treatment, residual stress, winding direction, coil clearance, tolerances, mounting, and design approval."], errors: [], method: "k_360 = E·d⁴/(10.8·D·n) · kθ = k_360/360 · M = kθ·θ · σnom = 32M/(πd³)" };
};


const calculateCuttingParameters = (input: Record<string, string>): CalculationState => {
  const diameter = finite(input.diameter, "Cutter diameter");
  const cuttingSpeed = finite(input.cuttingSpeed, "Cutting speed");
  const teeth = finite(input.teeth, "Number of teeth");
  const chipLoad = finite(input.chipLoad, "Feed per tooth");
  const axialDepth = finite(input.axialDepth, "Axial depth of cut");
  const radialWidth = finite(input.radialWidth, "Radial width of cut");
  const specificForce = finite(input.specificForce, "Specific cutting force");
  const efficiency = finite(input.efficiency, "Machine efficiency") / 100;
  if (efficiency > 1) throw new Error("Machine efficiency must not exceed 100 percent.");
  const rpm = 1000 * cuttingSpeed / (Math.PI * diameter);
  const feedRate = chipLoad * teeth * rpm;
  const chipLoadCheck = feedRate / (teeth * rpm);
  const removalRate = axialDepth * radialWidth * feedRate / 1000;
  const power = axialDepth * radialWidth * feedRate * specificForce / (60e6 * efficiency);
  return { values: [quantity("rpm", "Calculated spindle speed", rpm, rpm, "rpm"), quantity("feedRate", "Table feed rate", feedRate, feedRate, "mm/min"), quantity("chipLoad", "Feed per tooth", chipLoadCheck, chipLoadCheck, "mm/tooth"), quantity("mrr", "Theoretical material removal rate", removalRate, removalRate, "cm³/min"), quantity("power", "Specific-force power estimate", power, power, "kW")], warnings: ["This is face-milling reference arithmetic using user-entered cutting conditions, specific force, and efficiency. It excludes selection of speed/feed/tool/material parameters, tooth engagement variation, radial chip thinning, cutter geometry, runout, acceleration, spindle torque limits, rigidity, chatter, coolant, tool wear, fixture limits, thermal effects, surface quality, and process qualification."], errors: [], method: "n = 1000vc/(πDc) · vf = fz·z·n · MRR = ap·ae·vf/1000 · Pc = ap·ae·vf·Kc/(60·10⁶·η)" };
};


const calculateGaugeBiasStudy = (input: Record<string, string>): CalculationState => {
  const optional = (value: string | undefined, label: string) => value?.trim() === "" || value === undefined ? null : finite(value, label, false);
  const parsePair = (index: 1 | 2 | 3) => {
    const reference = optional(input[`linearityReference${index}`], `Linearity pair ${index} reference`);
    const observed = optional(input[`linearityObserved${index}`], `Linearity pair ${index} observed mean`);
    if ((reference === null) !== (observed === null)) throw new Error(`Linearity pair ${index} requires both a reference and observed mean.`);
    return reference === null || observed === null ? null : { reference, observed, bias: observed - reference };
  };
  const referenceValue = finite(input.referenceValue, "Declared reference value", false);
  const observedMean = finite(input.observedMean, "Observed study mean", false);
  const bias = observedMean - referenceValue;
  const relativeBias = referenceValue === 0 ? null : bias / Math.abs(referenceValue);
  const linearityPairs = [parsePair(1), parsePair(2), parsePair(3)];
  const firstEmptyPair = linearityPairs.findIndex((pair) => pair === null);
  if (firstEmptyPair >= 0 && linearityPairs.slice(firstEmptyPair).some((pair) => pair !== null)) throw new Error("Linearity pairs must be entered contiguously from pair 1.");
  const activePairs = linearityPairs.filter((pair): pair is NonNullable<typeof pair> => pair !== null);
  const stabilityChecks = [optional(input.stabilityStart, "Stability check start"), optional(input.stabilityMiddle, "Stability check middle"), optional(input.stabilityEnd, "Stability check end")];
  const firstEmptyCheck = stabilityChecks.findIndex((check) => check === null);
  if (firstEmptyCheck >= 0 && stabilityChecks.slice(firstEmptyCheck).some((check) => check !== null)) throw new Error("Stability checks must be entered contiguously from the start value.");
  const activeChecks = stabilityChecks.filter((check): check is number => check !== null);
  const linearitySpan = activePairs.length >= 2 ? Math.max(...activePairs.map((pair) => pair.bias)) - Math.min(...activePairs.map((pair) => pair.bias)) : null;
  const stabilitySpan = activeChecks.length >= 2 ? Math.max(...activeChecks) - Math.min(...activeChecks) : null;
  return { values: [quantity("bias", "Study bias", bias, bias, "unit"), ...(relativeBias === null ? [] : [quantity("relativeBias", "Relative study bias", relativeBias, relativeBias * 100, "%")]), quantity("linearityPointCount", "Declared linearity points", activePairs.length, activePairs.length, "points"), ...activePairs.map((pair, index) => quantity(`linearityBias${index + 1}`, `Linearity pair ${index + 1} bias`, pair.bias, pair.bias, "unit")), ...(linearitySpan === null ? [] : [quantity("linearitySpan", "Multi-point bias span", linearitySpan, linearitySpan, "unit")]), quantity("stabilityCheckCount", "Declared stability checks", activeChecks.length, activeChecks.length, "checks"), ...(stabilitySpan === null ? [] : [quantity("stabilitySpan", "Time-ordered stability span", stabilitySpan, stabilitySpan, "unit")])], warnings: ["This is literal arithmetic on user-entered reference/mean pairs and time-ordered check values. It does not choose or certify a reference, infer uncertainty, apply acceptance limits, make a conformance decision, substitute for calibration, evaluate drift causes, approve a measurement system, or release a product."], errors: [], method: "Bias = ȳ − xref · multi-point span = max(ȳi−xi) − min(ȳi−xi) · stability span = max(yt) − min(yt)" };
};

const controlChartConstants: Record<number, { a2: number; d3: number; d4: number; a3: number; b3: number; b4: number }> = {
  2: { a2: 1.88, d3: 0, d4: 3.267, a3: 2.659, b3: 0, b4: 3.267 },
  3: { a2: 1.023, d3: 0, d4: 2.575, a3: 1.954, b3: 0, b4: 2.568 },
  4: { a2: 0.729, d3: 0, d4: 2.282, a3: 1.628, b3: 0, b4: 2.266 },
  5: { a2: 0.577, d3: 0, d4: 2.115, a3: 1.427, b3: 0, b4: 2.089 },
  6: { a2: 0.483, d3: 0, d4: 2.004, a3: 1.287, b3: 0.03, b4: 1.97 },
  7: { a2: 0.419, d3: 0.076, d4: 1.924, a3: 1.182, b3: 0.118, b4: 1.882 },
  8: { a2: 0.373, d3: 0.136, d4: 1.864, a3: 1.099, b3: 0.185, b4: 1.815 },
  9: { a2: 0.337, d3: 0.184, d4: 1.816, a3: 1.032, b3: 0.239, b4: 1.761 },
  10: { a2: 0.308, d3: 0.223, d4: 1.777, a3: 0.975, b3: 0.284, b4: 1.716 },
};

const calculateControlChart = (input: Record<string, string>): CalculationState => {
  const mode = input.mode;
  const optional = (value: string | undefined, label: string) => value?.trim() === "" || value === undefined ? null : finite(value, label, false);
  const contiguous = (values: (number | null)[], label: string) => {
    const firstEmpty = values.findIndex((value) => value === null);
    if (firstEmpty >= 0 && values.slice(firstEmpty).some((value) => value !== null)) throw new Error(`${label} must be entered contiguously from item 1.`);
    const active = values.filter((value): value is number => value !== null);
    if (active.length < 2) throw new Error(`${label} require at least two values.`);
    return active;
  };
  const subgroupMeans = () => contiguous([1, 2, 3, 4, 5].map((index) => optional(input[`subgroupMean${index}`], `Subgroup ${index} mean`)), "Subgroup means");
  const subgroupVariations = () => contiguous([1, 2, 3, 4, 5].map((index) => optional(input[`subgroupVariation${index}`], `Subgroup ${index} range / s`)), "Subgroup variations");
  if (mode === "individualMr") {
    const individuals = contiguous([1, 2, 3, 4, 5].map((index) => optional(input[`individual${index}`], `Individual ${index}`)), "Individual observations");
    const individualMean = individuals.reduce((sum, value) => sum + value, 0) / individuals.length;
    const movingRanges = individuals.slice(1).map((value, index) => Math.abs(value - individuals[index]!));
    const averageMovingRange = movingRanges.reduce((sum, value) => sum + value, 0) / movingRanges.length;
    const e2 = 2.66;
    const d4 = 3.267;
    return { values: [quantity("observationCount", "Individual observations entered", individuals.length, individuals.length, "values"), quantity("individualCenter", "Individuals chart center line", individualMean, individualMean, "unit"), quantity("individualUcl", "Individuals chart upper limit", individualMean + e2 * averageMovingRange, individualMean + e2 * averageMovingRange, "unit"), quantity("individualLcl", "Individuals chart lower limit", individualMean - e2 * averageMovingRange, individualMean - e2 * averageMovingRange, "unit"), quantity("movingRangeCount", "Moving ranges calculated", movingRanges.length, movingRanges.length, "ranges"), quantity("movingRangeCenter", "Moving-range chart center line", averageMovingRange, averageMovingRange, "unit"), quantity("movingRangeUcl", "Moving-range chart upper limit", d4 * averageMovingRange, d4 * averageMovingRange, "unit"), quantity("movingRangeLcl", "Moving-range chart lower limit", 0, 0, "unit")], warnings: ["This reports conventional Individuals/MR limit arithmetic for the entered time order. It does not test normality, independence, rational subgrouping, data integrity, special-cause signals, trends, rules, capability, process control, process acceptance, or a control decision."], errors: [], method: "MRi = |xi−xi−1| · I limits = x̄ ± E2·MR̄ (E2 = 2.66) · MR limits = D3/D4·MR̄ (0 / 3.267)" };
  }
  if (mode !== "xbarR" && mode !== "xbarS") throw new Error("Chart mode must be X-bar/R, X-bar/S, or Individuals/MR.");
  const subgroupSize = finite(input.subgroupSize, "Declared subgroup size");
  if (!Number.isInteger(subgroupSize) || subgroupSize < 2 || subgroupSize > 10) throw new Error("Declared subgroup size must be an integer from 2 through 10.");
  const constants = controlChartConstants[subgroupSize]!;
  const means = subgroupMeans();
  const variations = subgroupVariations();
  const isRange = mode === "xbarR";
  if (variations.some((value) => value < 0)) throw new Error(isRange ? "Subgroup ranges cannot be negative." : "Subgroup standard deviations cannot be negative.");
  if (means.length !== variations.length) throw new Error("Subgroup means and variations must have the same number of entered summaries.");
  const grandMean = means.reduce((sum, value) => sum + value, 0) / means.length;
  const averageVariation = variations.reduce((sum, value) => sum + value, 0) / variations.length;
  const xFactor = isRange ? constants.a2 : constants.a3;
  const variationLowerFactor = isRange ? constants.d3 : constants.b3;
  const variationUpperFactor = isRange ? constants.d4 : constants.b4;
  const variationLabel = isRange ? "Range" : "Standard-deviation";
  return { values: [quantity("subgroupCount", "Subgroup summaries entered", means.length, means.length, "subgroups"), quantity("grandMean", "X-bar chart center line", grandMean, grandMean, "unit"), quantity("xbarUcl", "X-bar chart upper limit", grandMean + xFactor * averageVariation, grandMean + xFactor * averageVariation, "unit"), quantity("xbarLcl", "X-bar chart lower limit", grandMean - xFactor * averageVariation, grandMean - xFactor * averageVariation, "unit"), quantity("variationCenter", `${variationLabel} chart center line`, averageVariation, averageVariation, "unit"), quantity("variationUcl", `${variationLabel} chart upper limit`, variationUpperFactor * averageVariation, variationUpperFactor * averageVariation, "unit"), quantity("variationLcl", `${variationLabel} chart lower limit`, variationLowerFactor * averageVariation, variationLowerFactor * averageVariation, "unit")], warnings: ["This reports conventional X-bar/R or X-bar/S limit arithmetic from user-entered subgroup summaries. It does not recreate subgroup observations, test normality, independence, rational subgrouping, data integrity, special-cause signals, trends, rules, capability, process control, process acceptance, or a control decision."], errors: [], method: isRange ? "X-bar limits = x̄̄ ± A2·R̄ · R limits = D3/D4·R̄" : "X-bar limits = x̄̄ ± A3·s̄ · s limits = B3/B4·s̄" };
};


const calculateFormControl = (input: Record<string, string>): CalculationState => {
  const measuredMinimum = finite(input.measuredMinimum, "Measured minimum", false);
  const measuredMaximum = finite(input.measuredMaximum, "Measured maximum", false);
  const statedTolerance = finite(input.statedTolerance, "Stated tolerance");
  if (measuredMaximum < measuredMinimum) throw new Error("Measured maximum must be greater than or equal to measured minimum.");
  const formType = input.formType || "form";
  const observedSpan = measuredMaximum - measuredMinimum;
  const toleranceRatio = observedSpan / statedTolerance;
  return { values: [quantity("observedSpan", `Observed ${formType} extrema span`, observedSpan, observedSpan, "mm"), quantity("toleranceRatio", "Observed span / stated tolerance", toleranceRatio, toleranceRatio * 100, "%")], warnings: ["This subtracts user-entered extrema for a declared form-control record. It is not a minimum-zone algorithm and does not validate sampling density, filters, instrument calibration, probe compensation, datum/setup strategy, part geometry, drawing interpretation, uncertainty, or compliance."], errors: [], method: "Observed screening span = user-entered xmax − user-entered xmin" };
};

const calculateDriveRatio = (input: Record<string, string>): CalculationState => {
  const driverMeasure = finite(input.driverMeasure, "Driver teeth / pitch measure");
  const drivenMeasure = finite(input.drivenMeasure, "Driven teeth / pitch measure");
  const inputSpeed = finite(input.inputSpeed, "Input speed");
  const inputTorque = finite(input.inputTorque, "Input torque", false);
  const efficiency = finite(input.efficiency, "Transmission efficiency");
  const driverPitchDiameter = finite(input.driverPitchDiameter, "Driver pitch diameter");
  const pressureAngle = finite(input.pressureAngle, "Declared pressure angle", false);
  const helixAngle = finite(input.helixAngle, "Declared helix angle", false);
  if (efficiency > 100) throw new Error("Transmission efficiency must not exceed 100 percent.");
  if (pressureAngle >= 90 || helixAngle >= 90) throw new Error("Declared pressure and helix angles must be below 90 degrees.");
  const ratio = drivenMeasure / driverMeasure;
  const outputSpeed = inputSpeed / ratio;
  const outputTorque = inputTorque * ratio * efficiency / 100;
  const pitchLineSpeed = Math.PI * (driverPitchDiameter / 1000) * inputSpeed / 60;
  const tangentialForce = driverPitchDiameter === 0 ? 0 : 2 * inputTorque / (driverPitchDiameter / 1000);
  const radialForce = tangentialForce * Math.tan(pressureAngle * Math.PI / 180);
  const axialForce = input.driveType === "helical" ? tangentialForce * Math.tan(helixAngle * Math.PI / 180) : 0;
  return { values: [quantity("ratio", "Driven / driver ratio", ratio, ratio, "—"), quantity("outputSpeed", "Ideal output speed", outputSpeed, outputSpeed, "rpm"), quantity("outputTorque", "Output torque with stated efficiency", outputTorque, outputTorque, "N·m"), quantity("pitchLineSpeed", "Driver pitch-line speed", pitchLineSpeed, pitchLineSpeed, "m/s"), quantity("tangentialForce", "Driver tangential force", tangentialForce, tangentialForce, "N"), quantity("radialForce", "Elementary radial force component", radialForce, radialForce, "N"), quantity("axialForce", "Elementary axial force component", axialForce, axialForce, "N")], warnings: ["This is an ideal user-declared drive-ratio screen. It uses a simple pitch-circle tangential-force relation and an elementary pressure/helix-angle force decomposition; axial force is reported only for the declared helical option. It excludes component selection, planetary topology, gear tooth strength, mesh stiffness, backlash, lubrication, heat, durability, manufacturing quality, belt/chain tension, vibration, dynamic load factors, bearing reactions, and system validation."], errors: [], method: "i = N2/N1 · n2 = n1/i · T2 = T1·i·η · v = πd1n1/60 · Ft = 2T1/d1" };
};


const calculateSCurveProfile = (input: Record<string, string>): CalculationState => {
  const distance = finite(input.distance, "Move distance"), topSpeed = finite(input.topSpeed, "Top speed"), averageAcceleration = finite(input.averageAcceleration, "Average acceleration"), jerkPercent = finite(input.jerkPercent, "Jerk percentage", false);
  if (jerkPercent < 0 || jerkPercent > 100) throw new Error("Jerk percentage must be from 0 through 100.");
  const fullAccelTime = topSpeed / averageAcceleration, fullAccelDistance = topSpeed * fullAccelTime;
  const reachesTopSpeed = distance >= fullAccelDistance;
  const peakSpeed = reachesTopSpeed ? topSpeed : Math.sqrt(distance * averageAcceleration);
  const accelerationTime = peakSpeed / averageAcceleration;
  const cruiseTime = reachesTopSpeed ? (distance - fullAccelDistance) / topSpeed : 0;
  const totalTime = 2 * accelerationTime + cruiseTime;
  const peakAcceleration = averageAcceleration / (1 - jerkPercent * 0.005);
  const jerkRampTime = accelerationTime * jerkPercent / 200;
  return { values: [quantity("peakSpeed", "Profile peak speed", peakSpeed, peakSpeed, "mm/s"), quantity("accelerationTime", "Acceleration segment time", accelerationTime, accelerationTime, "s"), quantity("cruiseTime", "Constant-speed time", cruiseTime, cruiseTime, "s"), quantity("totalTime", "Equivalent point-to-point time", totalTime, totalTime, "s"), quantity("peakAcceleration", "Jerk-percent peak acceleration", peakAcceleration, peakAcceleration, "mm/s²"), quantity("jerkRampTime", "Per-ramp jerk time", jerkRampTime, jerkRampTime, "s")], warnings: ["This symmetric zero-start/zero-stop S-curve screen preserves equivalent trapezoidal timing using user-entered average acceleration and jerk percentage. It does not generate controller commands, model short-move sampling, validate axis limits or tuning, predict vibration, overshoot, mechanical load, safety, or motion-system suitability."], errors: [], method: "tacc = v/aavg · vpeak = min(vmax, √(d aavg)) · ttotal = 2tacc + tcruise · apeak = aavg/(1 − 0.005J%)" };
};


const calculateVacuumHolding = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Handled mass");
  const acceleration = finite(input.acceleration, "Declared acceleration", false);
  const multiplier = finite(input.multiplier, "User force multiplier");
  const isHorizontalTransport = input.orientation === "horizontal";
  const friction = finite(input.friction, "Declared surface friction");
  const gravityForce = mass * 9.81;
  const accelerationForce = mass * acceleration;
  const baseForce = isHorizontalTransport ? gravityForce + accelerationForce / friction : gravityForce + accelerationForce;
  const requiredHoldingForce = baseForce * multiplier;
  return {
    values: [
      quantity("gravityForce", "Weight component", gravityForce, gravityForce, "N"),
      quantity("accelerationForce", "Inertial force component", accelerationForce, accelerationForce, "N"),
      quantity("baseForce", isHorizontalTransport ? "Horizontal-transport base holding force" : "Vertical-lift base holding force", baseForce, baseForce, "N"),
      quantity("requiredHoldingForce", "Multiplier-adjusted required holding force", requiredHoldingForce, requiredHoldingForce, "N"),
    ],
    warnings: ["This is a simplified theoretical holding-force requirement for the selected declared load case. It does not select suction cups, count cups, calculate cup area, infer surface quality, assess seal/leakage, prescribe a safety factor, validate friction, determine vacuum level, size pumps or ejectors, analyze moments, certify handling safety, or approve an end-of-arm tool. Validate the full worst-case handling sequence and system on the real workpiece."],
    errors: [],
    method: isHorizontalTransport ? "FTH = m(g + a/μ)M" : "FTH = m(g + a)M",
  };
};


const calculatePinStress = (input: Record<string, string>): CalculationState => {
  const appliedLoad = finite(input.appliedLoad, "Declared direct load");
  const pinCount = finite(input.pinCount, "Identical pin count");
  const shearPlanes = finite(input.shearPlanes, "Shear-plane condition");
  const pinDiameter = finite(input.pinDiameter, "Pin diameter");
  const plateThickness = finite(input.plateThickness, "Bearing plate thickness");
  if (!Number.isInteger(pinCount) || pinCount < 1 || pinCount > 72) throw new Error("Identical pin count must be an integer from 1 through 72.");
  if (shearPlanes !== 1 && shearPlanes !== 2) throw new Error("Shear-plane condition must be single shear or double shear.");
  const loadPerPin = appliedLoad / pinCount;
  const shearArea = Math.PI * pinDiameter ** 2 / 4;
  const nominalShear = loadPerPin / (shearPlanes * shearArea);
  const projectedBearingArea = pinDiameter * plateThickness;
  const projectedBearingStress = loadPerPin / projectedBearingArea;
  return { values: [quantity("loadPerPin", "Direct load per equal pin", loadPerPin, loadPerPin, "N"), quantity("shearArea", "One nominal pin shear area", shearArea, shearArea, "mm²"), quantity("nominalShear", "Nominal pin shear stress", nominalShear, nominalShear, "MPa"), quantity("projectedBearingArea", "Projected plate bearing area per pin", projectedBearingArea, projectedBearingArea, "mm²"), quantity("projectedBearingStress", "Projected plate bearing stress", projectedBearingStress, projectedBearingStress, "MPa")], warnings: ["This assumes identical pins share the entered direct load equally, uses circular nominal shear area, and applies a projected-area bearing approximation. It does not evaluate pin bending, clearance, load-sharing variation, local contact/Hertz stress, yielding, fatigue, stress concentrations, material allowables, hole edge distance, joint geometry, selection, or approval."], errors: [], method: "Fpin = F/n · As = πd²/4 · τnom = Fpin/(pAs) · Aprojected = dt · σbearing = Fpin/(dt)" };
};

const calculateGearToothStress = (input: Record<string, string>): CalculationState => {
  const gearType = input.gearType === "helical" ? "helical" : "spur";
  const tangentialLoad = finite(input.tangentialLoad, "Declared tangential tooth load");
  const faceWidth = finite(input.faceWidth, "Face width");
  const module = finite(input.module, "Normal module");
  const toothCount = finite(input.toothCount, "Declared tooth count");
  const helixAngle = finite(input.helixAngle, "Declared helix angle", false);
  const formFactor = finite(input.formFactor, "Declared Lewis form factor");
  if (!Number.isInteger(toothCount) || toothCount < 6 || toothCount > 300) throw new Error("Declared tooth count must be an integer from 6 through 300.");
  if (gearType === "spur" && helixAngle !== 0) throw new Error("Declared helix angle must be 0° for the spur-gear relation.");
  if (gearType === "helical" && (helixAngle <= 0 || helixAngle > 45)) throw new Error("Declared helix angle must be greater than 0° and no more than 45° for the helical first estimate.");
  if (formFactor > 1) throw new Error("Declared Lewis form factor must not exceed 1 in this bounded screen.");
  const beta = helixAngle * Math.PI / 180;
  const normalForce = gearType === "helical" ? tangentialLoad / Math.cos(beta) : tangentialLoad;
  const virtualToothCount = gearType === "helical" ? toothCount / Math.cos(beta) ** 3 : toothCount;
  const loadedSection = faceWidth * module * formFactor;
  const rootStress = normalForce / loadedSection;
  return { values: [quantity("normalForce", gearType === "helical" ? "Declared helical normal tooth force" : "Spur tangential tooth force", normalForce, normalForce, "N"), quantity("virtualToothCount", gearType === "helical" ? "Helical virtual tooth count" : "Declared tooth count", virtualToothCount, virtualToothCount, "teeth"), quantity("loadedSection", "Lewis-type loaded section factor", loadedSection, loadedSection, "mm²"), quantity("rootStress", `Static Lewis-type ${gearType} root bending stress`, rootStress, rootStress, "MPa")], warnings: ["This is a basic static Lewis-type spur/helical root-bending arithmetic screen using a user-entered form factor. For the parallel-axis helical first estimate it exposes normal force and virtual tooth count, but does not select a form factor or apply rating factors. It does not select module, pressure angle, material, hardness, tooth form, or Lewis factor; calculate dynamic factors, contact stress, AGMA/ISO rating, mesh load distribution, lubrication, life, reliability, gearbox design, or approval."], errors: [], method: gearType === "helical" ? "Fb = Ft/cos β · zv = z/cos³ β · σF = Fb/(b m Y)" : "σF = Ft/(b m Y)" };
};


const calculateCycleBuilder = (input: Record<string, string>): CalculationState => {
  const steps = [1, 2, 3, 4, 5, 6].map((index) => ({ label: input[`step${index}Label`]?.trim() || `Step ${index}`, duration: finite(input[`step${index}Duration`], `Step ${index} duration`, false) }));
  const cycleCount = finite(input.cycleCount, "Declared repeated cycle count");
  if (!Number.isInteger(cycleCount) || cycleCount < 1 || cycleCount > 1_000_000) throw new Error("Declared repeated cycle count must be an integer from 1 through 1,000,000.");
  const cycleTime = steps.reduce((sum, step) => sum + step.duration, 0);
  if (cycleTime <= 0) throw new Error("At least one declared serial step duration must be greater than zero.");
  const longest = steps.reduce((largest, step) => step.duration > largest.duration ? step : largest, steps[0]);
  const idealThroughput = 3600 / cycleTime;
  const batchTime = cycleTime * cycleCount;
  return { values: [quantity("cycleTime", "Declared serial local cycle time", cycleTime, cycleTime, "s"), quantity("longestStep", `Longest declared local step · ${longest.label}`, longest.duration, longest.duration, "s"), quantity("idealThroughput", "Ideal repeated-cycle throughput", idealThroughput, idealThroughput, "cycles/h"), quantity("batchTime", "Declared repeated-cycle batch time", batchTime, batchTime, "s")], warnings: ["This sums up to six user-named, serial, local step durations and reports ideal repeated-cycle arithmetic only. It does not infer missing steps, construct a schedule, model parallel work, queues, downtime, changeovers, OEE, staffing, bottlenecks, capacity, takt compliance, quality, safety, or approval."], errors: [], method: "tcycle = Σti · throughputideal = 3600/tcycle · tbatch = n·tcycle" };
};


const calculateIsentropicMachine = (input: Record<string, string>): CalculationState => {
  const inletTemperature = finite(input.inletTemperature, "Declared inlet temperature");
  const inletPressure = finite(input.inletPressure, "Declared inlet absolute pressure");
  const outletPressure = finite(input.outletPressure, "Declared outlet absolute pressure");
  const gamma = finite(input.gamma, "Declared heat-capacity ratio");
  const specificHeat = finite(input.specificHeat, "Declared constant-pressure specific heat");
  const massFlow = finite(input.massFlow, "Declared mass flow", false);
  const efficiency = finite(input.efficiency, "Declared isentropic efficiency") / 100;
  if (gamma <= 1) throw new Error("Declared heat-capacity ratio must exceed 1.");
  if (efficiency <= 0 || efficiency > 1) throw new Error("Declared isentropic efficiency must be greater than 0% and no more than 100%.");
  const pressureRatio = outletPressure / inletPressure;
  const isCompressor = input.mode === "compressor";
  if ((isCompressor && pressureRatio <= 1) || (!isCompressor && pressureRatio >= 1)) throw new Error(isCompressor ? "A compressor screen requires outlet pressure above inlet pressure." : "A turbine screen requires outlet pressure below inlet pressure.");
  const isentropicOutletTemperature = inletTemperature * pressureRatio ** ((gamma - 1) / gamma);
  const isentropicSpecificWork = specificHeat * Math.abs(isentropicOutletTemperature - inletTemperature);
  const actualSpecificWork = isCompressor ? isentropicSpecificWork / efficiency : isentropicSpecificWork * efficiency;
  const actualOutletTemperature = isCompressor ? inletTemperature + actualSpecificWork / specificHeat : inletTemperature - actualSpecificWork / specificHeat;
  const power = massFlow * actualSpecificWork;
  return { values: [quantity("pressureRatio", "Declared pressure ratio p₂/p₁", pressureRatio, pressureRatio, "—"), quantity("isentropicOutletTemperature", "Isentropic outlet temperature", isentropicOutletTemperature, isentropicOutletTemperature, "K"), quantity("actualOutletTemperature", "Declared-efficiency outlet temperature", actualOutletTemperature, actualOutletTemperature, "K"), quantity("specificWork", isCompressor ? "Declared-efficiency compressor specific work input" : "Declared-efficiency turbine specific work output", actualSpecificWork, actualSpecificWork, "kJ/kg"), quantity("power", isCompressor ? "Declared-efficiency compressor shaft power input" : "Declared-efficiency turbine shaft power output", power, power, "kW")], warnings: ["This is ideal-gas isentropic state and user-entered-efficiency work arithmetic only. It does not select or rate equipment, use compressor maps, evaluate surge, choking, staging, cooling, losses beyond the declared efficiency, controls, mechanical design, safety, operability, or approval."], errors: [], method: isCompressor ? "T2s/T1 = (p2/p1)^((γ−1)/γ) · wis = cp(T2s−T1) · wactual = wis/ηis · P = ṁw" : "T2s/T1 = (p2/p1)^((γ−1)/γ) · wis = cp(T1−T2s) · wactual = ηis·wis · P = ṁw" };
};


const calculateOrientationControl = (input: Record<string, string>): CalculationState => {
  const minimumReading = finite(input.minimumReading, "Lowest comparable reading", false);
  const maximumReading = finite(input.maximumReading, "Highest comparable reading", false);
  const tolerance = finite(input.tolerance, "Stated orientation tolerance");
  if (maximumReading < minimumReading) throw new Error("Highest comparable reading must be greater than or equal to the lowest reading.");
  const variation = maximumReading - minimumReading;
  const ratio = variation / tolerance;
  const difference = tolerance - variation;
  return { values: [quantity("variation", "Observed orientation-reading variation", variation, variation, "mm"), quantity("ratio", "Observed variation / stated tolerance", ratio, ratio * 100, "%"), quantity("difference", "Stated tolerance − observed variation", difference, difference, "mm")], warnings: [`This is extrema subtraction for a user-declared ${input.controlType || "orientation"} record. It does not establish datum simulation, validate feature-control-frame syntax, construct a tolerance zone, choose a measurement strategy, compensate instruments, assess repeatability, determine conformance, or certify drawing compliance.`], errors: [], method: "observed variation = rmax − rmin · ratio = observed variation / stated tolerance" };
};

const calculateProfileRunout = (input: Record<string, string>): CalculationState => {
  const minimumReading = finite(input.minimumReading, "Lowest comparable indicator reading", false);
  const maximumReading = finite(input.maximumReading, "Highest comparable indicator reading", false);
  const tolerance = finite(input.tolerance, "Stated profile/runout tolerance");
  if (maximumReading < minimumReading) throw new Error("Highest comparable indicator reading must be greater than or equal to the lowest reading.");
  const variation = maximumReading - minimumReading;
  const ratio = variation / tolerance;
  const difference = tolerance - variation;
  return { values: [quantity("variation", "Observed indicator variation", variation, variation, "mm"), quantity("ratio", "Observed variation / stated tolerance", ratio, ratio * 100, "%"), quantity("difference", "Stated tolerance − observed variation", difference, difference, "mm")], warnings: [`This is extrema subtraction for a user-declared ${input.recordType || "profile/runout"} record. It does not establish a datum axis, construct profile or runout zones, parse feature-control frames, select fixture/CMM/indicator strategy, assess measurement uncertainty, determine conformance, or certify drawing compliance.`], errors: [], method: "observed variation = rmax − rmin · ratio = observed variation / stated tolerance" };
};

const parseObservationList = (source: string) => {
  const tokens = source.trim().split(/[\s,;]+/).filter(Boolean);
  if (tokens.length < 2) throw new Error("Optional local observations must contain at least two scalar values.");
  if (tokens.length > 5000) throw new Error("Optional local observations are limited to 5,000 scalar values in this browser workspace.");
  const values = tokens.map((token) => Number(token));
  if (values.some((value) => !Number.isFinite(value))) throw new Error("Optional local observations must contain only scalar numeric values without headers or labels.");
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const overallSigma = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
  if (overallSigma <= 0) throw new Error("Optional local observations must have non-zero sample variation for Pp/Ppk arithmetic.");
  return { count: values.length, mean, overallSigma };
};

const calculateProcessPerformance = (input: Record<string, string>): CalculationState => {
  const lsl = finite(input.lsl, "Lower specification limit", false);
  const usl = finite(input.usl, "Upper specification limit", false);
  const imported = input.observations?.trim() ? parseObservationList(input.observations) : null;
  const mean = imported?.mean ?? finite(input.mean, "Process mean", false);
  const overallSigma = imported?.overallSigma ?? finite(input.overallSigma, "Overall standard deviation");
  if (usl <= lsl) throw new Error("Upper specification limit must exceed lower specification limit.");
  const pp = (usl - lsl) / (6 * overallSigma);
  const ppl = (mean - lsl) / (3 * overallSigma);
  const ppu = (usl - mean) / (3 * overallSigma);
  const ppk = Math.min(ppl, ppu);
  const centeringRatio = ppk / pp;
  const derivedValues = imported ? [quantity("observationCount", "Imported observation count", imported.count, imported.count, "values"), quantity("derivedMean", "Derived observation mean", mean, mean, "declared"), quantity("derivedOverallSigma", "Derived sample standard deviation", overallSigma, overallSigma, "declared")] : [];
  return { values: [...derivedValues, quantity("pp", "Pp (overall spread index)", pp, pp, "—"), quantity("ppl", "PPL (lower performance)", ppl, ppl, "—"), quantity("ppu", "PPU (upper performance)", ppu, ppu, "—"), quantity("ppk", "Ppk (nearest-side performance)", ppk, ppk, "—"), quantity("centeringRatio", "Ppk / Pp centering comparison", centeringRatio, centeringRatio * 100, "%")], warnings: [imported ? "The pasted observation list was parsed locally into an arithmetic mean and sample standard deviation. It accepts scalar numeric values only; it does not preserve headers, subgroup/time order, traceability, measurement-system evidence, or source files." : "This reports formula values using a user-entered overall standard deviation in a stated normal-analysis context.", "This screen does not test normality or stability, create control charts, account for measurement-system error, calculate confidence bounds, select a benchmark, recommend acceptance, or establish process or product capability."], errors: [], method: imported ? "x̄ = Σxi/n · soverall = √[Σ(xi−x̄)²/(n−1)] · Pp/Ppk use the derived sample values" : "Pp = (USL−LSL)/(6soverall) · PPL = (x̄−LSL)/(3soverall) · PPU = (USL−x̄)/(3soverall) · Ppk = min(PPL, PPU)" };
};


const calculateMohrCircle = (input: Record<string, string>): CalculationState => {
  const sigmaX = finite(input.sigmaX, "x normal stress", false);
  const sigmaY = finite(input.sigmaY, "y normal stress", false);
  const tauXY = finite(input.tauXY, "In-plane shear stress", false);
  const center = (sigmaX + sigmaY) / 2;
  const radius = Math.hypot((sigmaX - sigmaY) / 2, tauXY);
  const principalOne = center + radius;
  const principalTwo = center - radius;
  const principalAngle = 0.5 * Math.atan2(2 * tauXY, sigmaX - sigmaY) * 180 / Math.PI;
  const doublePrincipalAngle = 2 * principalAngle;
  const doubleMaxShearAngle = doublePrincipalAngle + 90;
  return { values: [quantity("center", "Mohr circle center stress", center, center, "MPa"), quantity("radius", "Mohr circle radius / max in-plane shear", radius, radius, "MPa"), quantity("principalOne", "Maximum principal stress", principalOne, principalOne, "MPa"), quantity("principalTwo", "Minimum principal stress", principalTwo, principalTwo, "MPa"), quantity("principalAngle", "One principal-plane orientation", principalAngle, principalAngle, "°"), quantity("doublePrincipalAngle", "Mohr-circle double angle to principal plane", doublePrincipalAngle, doublePrincipalAngle, "°"), quantity("doubleMaxShearAngle", "Mohr-circle double angle to max-shear plane", doubleMaxShearAngle, doubleMaxShearAngle, "°")], warnings: ["This transforms one entered plane-stress state at one point. The reported angle follows the entered sign convention and is one of two orthogonal principal-plane orientations; the two Mohr-circle double-angle outputs are shown explicitly. It excludes 3D stress, stress gradients, principal strain, material failure criteria, buckling, fatigue, fracture, local concentration, and any design or compliance decision."], errors: [], method: "σavg = (σx + σy)/2 · R = √[((σx−σy)/2)² + τxy²] · σ1,2 = σavg ± R · 2θp = atan2(2τxy, σx−σy) · 2θs = 2θp + 90°" };
};


const calculateDimensionCheck = (input: Record<string, string>): CalculationState => {
  const dimensions = [
    ["Mass", "leftMass", "rightMass"], ["Length", "leftLength", "rightLength"], ["Time", "leftTime", "rightTime"], ["Electric current", "leftCurrent", "rightCurrent"], ["Temperature", "leftTemperature", "rightTemperature"], ["Amount of substance", "leftAmount", "rightAmount"], ["Luminous intensity", "leftLuminous", "rightLuminous"],
  ] as const;
  const differences = dimensions.map(([label, leftKey, rightKey]) => ({ label, difference: finite(input[leftKey], `${label} exponent`, false) - finite(input[rightKey], `${label} exponent`, false) }));
  const consistent = differences.every(({ difference }) => Math.abs(difference) < 1e-12);
  return { values: [quantity("consistent", "Entered dimensions match (1=yes, 0=no)", consistent ? 1 : 0, consistent ? 1 : 0, "—"), ...differences.map(({ label, difference }) => quantity(`delta${label.replaceAll(" ", "")}`, `${label} exponent difference (left − right)`, difference, difference, "—"))], warnings: ["This compares only the two entered base-dimension vectors. It does not parse symbols or equations, infer a quantity’s dimensions, convert units, assess constants, prove numerical correctness, validate signs or boundary conditions, or establish physical-model validity."], errors: [], method: "Compare entered exponent vectors over SI base dimensions: [M, L, T, I, Θ, N, J]left − [M, L, T, I, Θ, N, J]right" };
};

const evaluateFixedArithmetic = (source: string) => {
  if (!source.trim()) throw new Error("Scalar expression is required.");
  const tokens: string[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const match = /^\s*(?:(\d*\.?\d+(?:[eE][+-]?\d+)?)|([()+\-*/^]))/.exec(source.slice(cursor));
    if (!match) throw new Error("Scalar expression contains an unsupported character or token.");
    tokens.push(match[1] ?? match[2]);
    cursor += match[0].length;
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const primary = (): number => {
    const token = take();
    if (token === "(") {
      const result = expression();
      if (take() !== ")") throw new Error("Scalar expression has unmatched parentheses.");
      return result;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error("Scalar expression is incomplete or malformed.");
    return value;
  };
  const unary = (): number => {
    if (peek() === "+") { take(); return unary(); }
    if (peek() === "-") { take(); return -unary(); }
    return primary();
  };
  const power = (): number => {
    let value = unary();
    if (peek() === "^") { take(); value = value ** power(); }
    if (!Number.isFinite(value)) throw new Error("Scalar expression result must be finite.");
    return value;
  };
  const product = (): number => {
    let value = power();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = power();
      if (operator === "/" && right === 0) throw new Error("Scalar expression cannot divide by zero.");
      value = operator === "*" ? value * right : value / right;
      if (!Number.isFinite(value)) throw new Error("Scalar expression result must be finite.");
    }
    return value;
  };
  const expression = (): number => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = product();
      value = operator === "+" ? value + right : value - right;
      if (!Number.isFinite(value)) throw new Error("Scalar expression result must be finite.");
    }
    return value;
  };
  const result = expression();
  if (index !== tokens.length) throw new Error("Scalar expression has an unsupported operator sequence.");
  return result;
};

const calculateArithmeticScratchpad = (input: Record<string, string>): CalculationState => {
  const result = evaluateFixedArithmetic(input.expression);
  const name = input.formulaName.trim() || "Scratchpad result";
  const inputUnit = input.inputUnit?.trim() || "declared";
  const unit = input.resultUnit?.trim() || "declared";
  return { values: [quantity("result", name, result, result, unit, 8)], warnings: [`Declared input label: ${inputUnit}. This evaluates only the displayed scalar arithmetic grammar. Formula names and unit labels are retained user context, not parsed or validated. It does not support variables, functions, unit conversion, dimension checking, symbolic algebra, code execution, or engineering-model validation.`], errors: [], method: "Fixed grammar: number · ( ) · + · − · * · / · ^" };
};


const calculateLinearGuideLife = (input: Record<string, string>): CalculationState => {
  if (input.rollingType !== "ball" && input.rollingType !== "roller") throw new Error("Select a supported rolling-element type.");
  const dynamicRating = finite(input.dynamicRating, "Declared basic dynamic rating");
  const calculatedLoad = finite(input.calculatedLoad, "Declared calculated load");
  const travelRate = finite(input.travelRate, "Declared travel rate");
  const ballGuide = input.rollingType === "ball";
  const exponent = ballGuide ? 3 : 10 / 3;
  const referenceTravel = ballGuide ? 50 : 100;
  const ratingToLoadRatio = dynamicRating / calculatedLoad;
  const nominalLifeKm = referenceTravel * ratingToLoadRatio ** exponent;
  const literalTravelTimeHours = nominalLifeKm * 1000 / (travelRate * 60);
  return { values: [quantity("nominalLifeKm", "Nominal travel life", nominalLifeKm, nominalLifeKm, "km"), quantity("literalTravelTimeHours", "Literal time at declared travel rate", literalTravelTimeHours, literalTravelTimeHours, "h"), quantity("ratingToLoadRatio", "Declared dynamic-rating / calculated-load ratio", ratingToLoadRatio, ratingToLoadRatio, "—")], warnings: ["This applies the cited nominal ball/roller linear-guide travel-life relation using user-entered dynamic rating and calculated load, then makes a literal time conversion at the declared constant travel rate. It does not select a rail/block, derive equivalent or moment loading, model acceleration, load distribution, lubrication, contamination, alignment, rigidity, reliability modifiers, installation, safety, suitability, or approval."], errors: [], method: "L10 = Lref(C/Pc)^p · thours = L10·1000/(v·60)" };
};

const calculateBrakingDuty = (input: Record<string, string>): CalculationState => {
  if (input.regenerationType !== "normal" && input.regenerationType !== "overhauling") throw new Error("Select a supported regeneration type.");
  const drivePower = finite(input.drivePower, "Declared motor / drive power") * 1000;
  const brakeTorqueMultiplier = finite(input.brakeTorqueMultiplier, "Declared brake-torque multiplier");
  const dcBusVoltage = finite(input.dcBusVoltage, "Declared DC-bus voltage");
  const brakingTime = finite(input.brakingTime, "Declared braking time");
  const cycleTime = finite(input.cycleTime, "Declared cycle time");
  if (brakingTime > cycleTime) throw new Error("Declared braking time must not exceed the declared cycle time.");
  const peakPower = drivePower * brakeTorqueMultiplier;
  const dutyRatio = brakingTime / cycleTime;
  const derivedResistance = dcBusVoltage ** 2 / peakPower;
  const peakCurrent = Math.sqrt(peakPower / derivedResistance);
  const averageWattage = peakPower * dutyRatio * (input.regenerationType === "normal" ? 0.5 : 1);
  return { values: [quantity("peakPower", "Declared peak braking power", peakPower / 1000, peakPower / 1000, "kW"), quantity("dutyRatio", "Declared braking-duty ratio", dutyRatio, dutyRatio * 100, "%"), quantity("derivedResistance", "Source-relation derived resistance", derivedResistance, derivedResistance, "Ω"), quantity("peakCurrent", "Source-relation peak braking current", peakCurrent, peakCurrent, "A"), quantity("averageWattage", "Source-relation average braking wattage", averageWattage / 1000, averageWattage / 1000, "kW")], warnings: ["This applies the cited declared-power, brake-torque multiplier, DC-bus voltage, and time-duty relations for the selected source arithmetic mode. It does not select a drive, resistor, minimum resistance, current limit, braking torque, regeneration type, enclosure, protection, wiring, thermal rating, deceleration profile, energy recovery, safety, suitability, or approval."], errors: [], method: "PW = MW·BT · R = Vdc²/PW · DC = tb/tc · DBRW = PW·DC·(1/2 normal, 1 overhauling)" };
};


const calculateMotorOperatingPoint = (input: Record<string, string>): CalculationState => {
  if (input.motorClass !== "servo" && input.motorClass !== "stepper" && input.motorClass !== "ac") throw new Error("Select a supported declared motor class.");
  const shaftTorque = finite(input.shaftTorque, "Declared shaft torque");
  const shaftSpeed = finite(input.shaftSpeed, "Declared shaft speed");
  const referenceTorque = finite(input.referenceTorque, "Declared reference torque");
  const referencePower = finite(input.referencePower, "Declared reference power") * 1000;
  const angularSpeed = shaftSpeed * (2 * Math.PI / 60);
  const shaftPower = shaftTorque * angularSpeed;
  const torqueReferenceRatio = shaftTorque / referenceTorque;
  const powerReferenceRatio = shaftPower / referencePower;
  return { values: [quantity("angularSpeed", "Declared shaft angular speed", angularSpeed, angularSpeed, "rad/s"), quantity("shaftPower", "Literal mechanical shaft power", shaftPower / 1000, shaftPower / 1000, "kW"), quantity("torqueReferenceRatio", "Declared torque / reference-torque ratio", torqueReferenceRatio, torqueReferenceRatio, "—"), quantity("powerReferenceRatio", "Literal shaft-power / reference-power ratio", powerReferenceRatio, powerReferenceRatio, "—")], warnings: ["This applies the mechanical shaft-power relation to a user-classified servo, stepper, or AC motor record, then reports literal ratios to user-entered references. It does not compare motor types; select a motor/drive; predict torque-speed, holding, pull-out, overload, voltage/current, control, thermal, duty, efficiency, safety, suitability, or approval."], errors: [], method: "Pshaft = T·ω = T·n·2π/60 · rT = T/Tref · rP = Pshaft/Pref" };
};


const calculateConveyorLine = (input: Record<string, string>): CalculationState => {
  if (input.solveFor !== "rate" && input.solveFor !== "speed") throw new Error("Select a supported conversion direction.");
  const productPitch = finite(input.productPitch, "Declared center-to-center pitch");
  const pitchDensity = 1000 / productPitch;
  if (input.solveFor === "rate") {
    const lineSpeed = finite(input.lineSpeed, "Declared conveyor line speed");
    const itemRate = lineSpeed * pitchDensity;
    return { values: [quantity("itemRate", "Literal item rate", itemRate, itemRate, "items/min"), quantity("lineSpeed", "Declared line speed", lineSpeed, lineSpeed, "m/min"), quantity("pitchDensity", "Declared items per metre at pitch", pitchDensity, pitchDensity, "items/m")], warnings: ["This converts a declared uniform pitch and stated steady conveyor line speed into a literal item rate. It does not select or size a conveyor, validate accumulation, transfers, product stability, dwell/process requirements, equipment capacity, safety, suitability, or approval."], errors: [], method: "q = v·1000/p" };
  }
  const requestedRate = finite(input.requestedRate, "Declared requested item rate");
  const lineSpeed = requestedRate * productPitch / 1000;
  return { values: [quantity("lineSpeed", "Literal line speed", lineSpeed, lineSpeed, "m/min"), quantity("itemRate", "Declared requested item rate", requestedRate, requestedRate, "items/min"), quantity("pitchDensity", "Declared items per metre at pitch", pitchDensity, pitchDensity, "items/m")], warnings: ["This converts a declared requested item rate and uniform pitch into a literal conveyor line speed. It does not select or size a conveyor, validate accumulation, transfers, product stability, dwell/process requirements, equipment capacity, safety, suitability, or approval."], errors: [], method: "v = q·p/1000" };
};


const calculateDarcyFrictionFactor = (input: Record<string, string>): CalculationState => {
  const mode = input.mode;
  const reynoldsNumber = finite(input.reynoldsNumber, "Declared Reynolds number");
  if (mode !== "laminar" && mode !== "swameeJain") throw new Error("Declared calculation mode must be laminar or Swamee–Jain.");
  if (mode === "laminar") {
    const frictionFactor = 64 / reynoldsNumber;
    return { values: [quantity("frictionFactor", "Literal Darcy friction factor", frictionFactor, frictionFactor, "—"), quantity("reynoldsNumber", "Declared Reynolds number", reynoldsNumber, reynoldsNumber, "—"), quantity("relativeRoughness", "Relative roughness not applied by declared mode", 0, 0, "—")], warnings: ["The user declares the laminar relation; this workspace does not classify flow regime. It does not calculate pressure drop, determine fluid properties, select pipe, pump, or fittings, solve a pipe network, establish capacity, safety, suitability, or approval."], errors: [], method: "fD = 64 / Re" };
  }
  const absoluteRoughness = finite(input.absoluteRoughness, "Declared absolute roughness");
  const insideDiameter = finite(input.insideDiameter, "Declared inside diameter");
  const relativeRoughness = absoluteRoughness / insideDiameter;
  const frictionFactor = 0.25 / Math.log10(relativeRoughness / 3.7 + 5.74 / reynoldsNumber ** 0.9) ** 2;
  return { values: [quantity("frictionFactor", "Literal Darcy friction factor", frictionFactor, frictionFactor, "—"), quantity("reynoldsNumber", "Declared Reynolds number", reynoldsNumber, reynoldsNumber, "—"), quantity("relativeRoughness", "Literal declared relative roughness", relativeRoughness, relativeRoughness, "—")], warnings: ["The user declares the Swamee–Jain relation; this workspace does not classify flow regime or solve Colebrook iteratively. It does not calculate pressure drop, determine fluid properties, select pipe, pump, or fittings, solve a pipe network, establish capacity, safety, suitability, or approval."], errors: [], method: "fD = 0.25 / [log10(ε/(3.7D) + 5.74/Re^0.9)]²" };
};


export type ConversionGroup = UnitFamilyId;
export const conversionUnits = (category: ConversionGroup) => unitsForFamily(category).map((unit) => unit.value);

const calculateConverter = (input: Record<string, string>): CalculationState => {
  if (!isUnitFamilyId(input.category)) throw new Error("Select a supported quantity family.");
  const category = input.category;
  const value = finite(input.value, "Value", false);
  const conversion = convertQuantity(category, value, input.from, input.to);
  const toLabel = unitSymbol(category, input.to);
  const fromLabel = unitSymbol(category, input.from);
  return {
    values: [quantity("converted", "Converted value", conversion.converted, conversion.converted, toLabel, 7), quantity("canonical", "Canonical SI value", conversion.canonical, conversion.canonical, conversion.canonicalUnit, 7)],
    warnings: ["Only units from the same quantity family are available together. Display precision is rounded; the canonical value is retained separately."],
    errors: [],
    method: `Canonical SI conversion: ${fromLabel} → ${conversion.canonicalUnit} → ${toLabel}`,
  };
};

/**
 * A number that is not finite is not a result.
 *
 * Overflow used to reach the glass: a section height of 1e300 rendered
 * "inertia = ∞ mm⁴" beside a 300-digit area, with no error. CONTRIBUTING is
 * explicit that invalid input must produce a visible error rather than a
 * silent fallback, and an engineer reading ∞ off a screening tool is exactly
 * the failure this app exists to avoid.
 */
const guardFinite = (state: CalculationState): CalculationState => {
  const bad = state.values.filter((value) => !Number.isFinite(value.raw));
  if (!bad.length) return state;
  return {
    values: [],
    warnings: [],
    errors: [
      `${bad.map((value) => value.label).join(", ")} overflowed to a value the model cannot express. Reduce the magnitude of the inputs.`,
    ],
    method: state.method,
  };
};

const computeTool = (toolId: ToolId, input: Record<string, string>): CalculationState => {
    if (toolId in libraryDocuments) return runLibraryDocument(toolId, input);
    if (toolId === "beam") return calculateBeam(input);
    if (toolId === "beamDiagram") return calculateBeamDiagram(input);
    if (toolId === "linearGuideLife") return calculateLinearGuideLife(input);
    if (toolId === "brakingDuty") return calculateBrakingDuty(input);
    if (toolId === "motorOperatingPoint") return calculateMotorOperatingPoint(input);
    if (toolId === "conveyorLine") return calculateConveyorLine(input);
    if (toolId === "darcyFrictionFactor") return calculateDarcyFrictionFactor(input);
    if (toolId === "section") return calculateSection(input);
    if (toolId === "triangle") return calculateTriangle(input);
    if (toolId === "fits") return calculateFits(input);
    if (toolId === "toleranceSampling") return calculateToleranceSampling(input);
    if (toolId === "taylorToolLife") return calculateTaylorToolLife(input);
    if (toolId === "mmc") return calculateMmc(input);
    if (toolId === "motionProfile") return calculateMotionProfile(input);
    if (toolId === "pneumatic") return calculatePneumatic(input);
    if (toolId === "clampForce") return calculateClampForce(input);
    if (toolId === "bearingLife") return calculateBearingLife(input);
    if (toolId === "lmtd") return calculateLmtd(input);
    if (toolId === "leadScrew") return calculateLeadScrew(input);
    if (toolId === "airConsumption") return calculateAirConsumption(input);
    if (toolId === "circularArc") return calculateCircularArc(input);
    if (toolId === "compressionSpring") return calculateCompressionSpring(input);
    if (toolId === "drillingTime") return calculateDrillingTime(input);
    if (toolId === "processCapability") return calculateProcessCapability(input);
    if (toolId === "torsionSpring") return calculateTorsionSpring(input);
    if (toolId === "cuttingParameters") return calculateCuttingParameters(input);
    if (toolId === "gaugeBiasStudy") return calculateGaugeBiasStudy(input);
    if (toolId === "controlChart") return calculateControlChart(input);
    if (toolId === "formControl") return calculateFormControl(input);
    if (toolId === "driveRatio") return calculateDriveRatio(input);
    if (toolId === "dimensionCheck") return calculateDimensionCheck(input);
    if (toolId === "sCurveProfile") return calculateSCurveProfile(input);
    if (toolId === "vacuumHolding") return calculateVacuumHolding(input);
    if (toolId === "pinStress") return calculatePinStress(input);
    if (toolId === "gearToothStress") return calculateGearToothStress(input);
    if (toolId === "cycleBuilder") return calculateCycleBuilder(input);
    if (toolId === "isentropicMachine") return calculateIsentropicMachine(input);
    if (toolId === "orientationControl") return calculateOrientationControl(input);
    if (toolId === "profileRunout") return calculateProfileRunout(input);
    if (toolId === "processPerformance") return calculateProcessPerformance(input);
    if (toolId === "mohrCircle") return calculateMohrCircle(input);
    if (toolId === "arithmeticScratchpad") return calculateArithmeticScratchpad(input);
    if (toolId === "converter") return calculateConverter(input);
  return { values: [], warnings: [], errors: [`No released method is registered for “${toolId}”.`], method: "Unregistered model" };
};

export const calculateTool = (toolId: ToolId, input: Record<string, string>): CalculationState => {
  try {
    return guardFinite(computeTool(toolId, input));
  } catch (error) {
    return { values: [], warnings: [], errors: [error instanceof Error ? error.message : "The current configuration could not be calculated."], method: "Awaiting valid inputs" };
  }
};
