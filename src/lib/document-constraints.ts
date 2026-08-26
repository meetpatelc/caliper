/**
 * Migration regression contract for data-driven library documents.
 * Field/document bounds restore the pre-migration TypeScript guards.
 * Output rawScale restores canonical raw values (SI / fraction) when the
 * shop-unit expression yields the displayed magnitude.
 */
import { evaluateExpression } from "@instrument/formula";

export type FieldBound = {
  min?: number;
  max?: number;
  gt?: number;
  lt?: number;
  integer?: boolean;
  afterUnsigned?: boolean;
  message: string;
  integerMessage?: string;
};

export type DocumentBound = {
  expression: string;
  min?: number;
  max?: number;
  gt?: number;
  lt?: number;
  when?: string;
  message: string;
};

/** Per-field domain bounds. Applied after finite parse, instead of the unsigned >0 default. */
export const fieldBounds: Record<string, Record<string, FieldBound>> = {
  additiveBuild: {
    supportFactor: { min: 0, message: "Declared support-material factor must not be negative." },
    materialRate: { min: 0, message: "Declared cost inputs must not be negative." },
    machineRate: { min: 0, message: "Declared cost inputs must not be negative." },
    fixedOverhead: { min: 0, message: "Declared cost inputs must not be negative." },
  },
  beltAxis: {
    friction: { min: 0, max: 1, message: "Declared guide friction coefficient must be from 0 through 1." },
  },
  beltTension: {
    looseSideTension: { min: 0, message: "Declared loose-side tension must not be negative in this scalar span model." },
  },
  buoyancyForce: {
    objectMass: { min: 0, message: "Declared object mass must not be negative." },
  },
  compressibleMassFlow: {
    specificHeatRatio: { gt: 1, message: "Declared specific-heat ratio must be greater than one." },
  },
  deflectionCheck: {
    declaredDeflection: { min: 0, message: "Declared calculated deflection must not be negative in this magnitude comparison." },
  },
  eccentricBoltGroup: {
    eccentricity: { min: 0, message: "Load eccentricity must not be negative." },
  },
  fatigueConcentration: {
    notchSensitivity: { min: 0, max: 1, message: "Declared notch sensitivity must be from 0 through 1." },
  },
  fixtureClamping: {
    friction: { gt: 0, max: 1, message: "Declared clamp/workpiece friction must be greater than 0 and no greater than 1." },
  },
  flywheelEnergy: {
    initialSpeed: { min: 0, message: "Declared speeds must not be negative in this speed-magnitude model." },
    finalSpeed: { min: 0, message: "Declared speeds must not be negative in this speed-magnitude model." },
  },
  gearMeshForce: {
    pressureAngle: { min: 0, lt: 90, message: "Declared transverse pressure angle must be from 0 through less than 90 degrees." },
    helixAngle: { min: 0, lt: 90, message: "Declared helix angle must be from 0 through less than 90 degrees." },
  },
  hertzContact: {
    spherePoisson: { min: 0, lt: 0.5, message: "Declared Poisson ratios must be at least 0 and less than 0.5 for this bounded model." },
    flatPoisson: { min: 0, lt: 0.5, message: "Declared Poisson ratios must be at least 0 and less than 0.5 for this bounded model." },
  },
  machiningTimeBudget: {
    nonCutAllowance: { min: 0, message: "Declared non-cut time allowance must be zero or greater." },
  },
  minorLosses: {
    sumK: { min: 0, message: "Declared total minor-loss coefficient must not be negative." },
  },
  orificeFlow: {
    dischargeCoefficient: { gt: 0, max: 1, message: "Discharge coefficient must be greater than 0 and no greater than 1." },
  },
  payloadInertia: {
    cgDistance: { min: 0, message: "Flange-to-CG distance must not be negative." },
  },
  plateBuckling: {
    poissonRatio: { gt: -1, lt: 1, message: "Declared Poisson ratio must be greater than -1 and less than 1." },
  },
  pressFit: {
    friction: { gt: 0, max: 1, message: "Declared friction coefficient must be greater than 0 and no greater than 1." },
  },
  productionMetrics: {
    stopTime: { min: 0, message: "Stop time must not be negative." },
  },
  pumpSystemHeadPoint: {
    quadraticLossCoefficient: { min: 0, message: "Declared quadratic-loss coefficient must be zero or greater." },
    flowPoint: { min: 0, message: "Declared flow point must be zero or greater." },
  },
  rackPinion: {
    friction: { min: 0, max: 1, message: "Declared guide friction coefficient must be from 0 through 1." },
    acceleration: { min: 0, message: "Declared linear acceleration must not be negative." },
  },
  sheetBendAllowance: {
    kFactor: { min: 0, max: 1, message: "Declared K factor must be between zero and one." },
  },
  sheetMetalBend: {
    kFactor: { min: 0, max: 1, message: "K-factor must be between 0 and 1." },
  },
  thermalRadiation: {
    emissivity: { min: 0, max: 1, message: "Surface emissivity must be from 0 through 1." },
  },
  thermalRcStep: {
    elapsedTime: { min: 0, message: "Declared elapsed time must be zero or greater." },
  },
  thermalResistance: {
    contactResistance: { min: 0, message: "Declared contact resistance must not be negative." },
  },
  threePhasePower: {
    powerFactor: { min: 0, max: 1, message: "Declared power factor must be between zero and one." },
  },
  toleranceStack: {
    t4: { min: 0, message: "Tolerance contributor magnitudes must not be negative." },
    t5: { min: 0, message: "Tolerance contributor magnitudes must not be negative." },
    t6: { min: 0, message: "Tolerance contributor magnitudes must not be negative." },
  },
  torqueSpeedDuty: {
    loadTorque: { min: 0, message: "Declared load torque must not be negative." },
  },
  weldGroup: {
    directForce: { min: 0, message: "Declared in-plane direct force and torsional moment magnitudes must not be negative." },
    torsionalMoment: { min: 0, message: "Declared in-plane direct force and torsional moment magnitudes must not be negative." },
  },
  motionProfile: {
    cruiseTime: { min: 0, message: "Cruise time cannot be negative." },
  },
  pneumatic: {
    efficiency: { afterUnsigned: true, max: 100, message: "Applied force factor must not exceed 100 percent." },
  },
  clampForce: {
    angle: { gt: 0, lt: 180, message: "Transfer angle must be greater than 0 and smaller than 180 degrees." },
    efficiency: { afterUnsigned: true, max: 100, message: "Transmission efficiency must not exceed 100 percent." },
  },
  leadScrew: {
    efficiency: { afterUnsigned: true, max: 100, message: "Mechanical efficiency must not exceed 100 percent." },
  },
  circularArc: {
    angle: { afterUnsigned: true, max: 360, message: "Central angle must not exceed 360 degrees." },
  },
  cuttingParameters: {
    efficiency: { afterUnsigned: true, max: 100, message: "Machine efficiency must not exceed 100 percent." },
  },
  drillingTime: {
    holes: {
      afterUnsigned: true,
      integer: true,
      message: "Hole count must be a whole number.",
      integerMessage: "Hole count must be a whole number.",
    },
  },
  sCurveProfile: {
    jerkPercent: { min: 0, max: 100, message: "Jerk percentage must be from 0 through 100." },
  },
  pinStress: {
    pinCount: {
      afterUnsigned: true,
      integer: true,
      min: 1,
      max: 72,
      message: "Identical pin count must be an integer from 1 through 72.",
      integerMessage: "Identical pin count must be an integer from 1 through 72.",
    },
  },
  gearToothStress: {
    toothCount: {
      afterUnsigned: true,
      integer: true,
      min: 6,
      max: 300,
      message: "Declared tooth count must be an integer from 6 through 300.",
      integerMessage: "Declared tooth count must be an integer from 6 through 300.",
    },
    formFactor: { afterUnsigned: true, max: 1, message: "Declared Lewis form factor must not exceed 1 in this bounded screen." },
  },
  driveRatio: {
    efficiency: { afterUnsigned: true, max: 100, message: "Transmission efficiency must not exceed 100 percent." },
    pressureAngle: { lt: 90, message: "Declared pressure and helix angles must be below 90 degrees." },
    helixAngle: { lt: 90, message: "Declared pressure and helix angles must be below 90 degrees." },
  },
  isentropicMachine: {
    gamma: { afterUnsigned: true, gt: 1, message: "Declared heat-capacity ratio must exceed 1." },
    efficiency: { afterUnsigned: true, max: 100, message: "Declared isentropic efficiency must be greater than 0% and no more than 100%." },
  },
};

/** Cross-field conditions evaluated on the parsed input scope before outputs. */
export const documentBounds: Record<string, DocumentBound[]> = {
  bearingLoad: [
    {
      expression: "radialFactor*radialLoad+axialFactor*axialLoad",
      gt: 0,
      message: "The user-entered factors and loads must produce a positive equivalent dynamic load.",
    },
  ],
  pneumatic: [{ expression: "bore-rod", gt: 0, message: "Rod diameter must be smaller than cylinder bore." }],
  airConsumption: [{ expression: "bore-rod", gt: 0, message: "Rod diameter must be smaller than cylinder bore." }],
  compressionSpring: [{ expression: "meanDiameter-wire", gt: 0, message: "Mean coil diameter must be larger than wire diameter." }],
  torsionSpring: [{ expression: "meanDiameter-wire", gt: 0, message: "Mean coil diameter must be larger than wire diameter." }],
  processCapability: [{ expression: "usl-lsl", gt: 0, message: "Upper specification limit must be larger than lower specification limit." }],
  formControl: [{ expression: "measuredMaximum-measuredMinimum", min: 0, message: "Measured maximum must be greater than or equal to measured minimum." }],
  orientationControl: [{ expression: "maximumReading-minimumReading", min: 0, message: "Highest comparable reading must be greater than or equal to the lowest reading." }],
  profileRunout: [{ expression: "maximumReading-minimumReading", min: 0, message: "Highest comparable indicator reading must be greater than or equal to the lowest reading." }],
  brakingDuty: [{ expression: "cycleTime-brakingTime", min: 0, message: "Declared braking time must not exceed the declared cycle time." }],
  mmc: [
    {
      when: "lookup(isHole, featureType)",
      expression: "actualSize-mmcSize",
      min: 0,
      message: "Actual hole size must be at least its stated MMC size.",
    },
    {
      when: "1-lookup(isHole, featureType)",
      expression: "mmcSize-actualSize",
      min: 0,
      message: "Actual pin size must not exceed its stated MMC size.",
    },
  ],
  lmtd: [
    {
      when: "lookup(isCounter, arrangement)",
      expression: "hotIn-coldOut",
      gt: 0,
      message: "Both terminal temperature differences must remain positive for this no-crossover LMTD screen.",
    },
    {
      when: "lookup(isCounter, arrangement)",
      expression: "hotOut-coldIn",
      gt: 0,
      message: "Both terminal temperature differences must remain positive for this no-crossover LMTD screen.",
    },
    {
      when: "1-lookup(isCounter, arrangement)",
      expression: "hotIn-coldIn",
      gt: 0,
      message: "Both terminal temperature differences must remain positive for this no-crossover LMTD screen.",
    },
    {
      when: "1-lookup(isCounter, arrangement)",
      expression: "hotOut-coldOut",
      gt: 0,
      message: "Both terminal temperature differences must remain positive for this no-crossover LMTD screen.",
    },
  ],
  isentropicMachine: [
    {
      when: "lookup(isCompressor, mode)",
      expression: "outletPressure/inletPressure",
      gt: 1,
      message: "A compressor screen requires outlet pressure above inlet pressure.",
    },
    {
      when: "1-lookup(isCompressor, mode)",
      expression: "inletPressure/outletPressure",
      gt: 1,
      message: "A turbine screen requires outlet pressure below inlet pressure.",
    },
  ],
  orificeFlow: [
    {
      expression: "upstreamPressure-downstreamPressure",
      min: 0,
      message: "Upstream pressure must exceed downstream pressure.",
    },
  ],
  gearToothStress: [
    {
      when: "1-lookup(isHelical, gearType)",
      expression: "helixAngle",
      min: 0,
      max: 0,
      message: "Declared helix angle must be 0° for the spur-gear relation.",
    },
    {
      when: "lookup(isHelical, gearType)",
      expression: "helixAngle",
      gt: 0,
      message: "Declared helix angle must be greater than 0° and no more than 45° for the helical first estimate.",
    },
    {
      when: "lookup(isHelical, gearType)",
      expression: "helixAngle",
      max: 45,
      message: "Declared helix angle must be greater than 0° and no more than 45° for the helical first estimate.",
    },
  ],
};

/**
 * Shop-expression → canonical raw multiplier for the 21 TypeScript-parent contracts
 * that stored SI / fraction while the migrated expression yields the displayed unit.
 */
export const outputRawScale: Record<string, Record<string, number>> = {
  bearingLoad: { dnRatio: 0.01, preloadRatio: 0.01 },
  boltPreload: { preload: 1000, lower: 1000, upper: 1000 },
  driveTrain: { totalEfficiency: 0.01 },
  eccentricBoltGroup: { moment: 1000 },
  flywheelEnergy: { initialEnergy: 1000, finalEnergy: 1000, energyChange: 1000 },
  gageRr: { gageRrShare: 0.01 },
  gearRatio: { inputPower: 1000 },
  hertzContact: {
    reducedModulus: 1e9,
    contactRadius: 0.001,
    contactDiameter: 0.001,
    peakPressure: 1e6,
    indentation: 1e-6,
  },
  hydraulicCylinder: { extendForce: 1000, retractForce: 1000 },
  hydraulicLine: { area: 1e-6, majorLoss: 1000, referenceRatio: 0.01 },
  keyway: { shearStress: 1e6, bearingStress: 1e6 },
  measurementUncertainty: { relativeExpanded: 0.01 },
  orificeFlow: { volumetricFlow: 0.001 },
  pneumaticCycleTime: { extendVolume: 1e6, retractVolume: 1e6 },
  pneumaticLineLoss: { area: 1e-6, pressureLoss: 1000, lossRatio: 0.01 },
  pressFit: { frictionForce: 1000 },
  productionMetrics: {
    availability: 0.01,
    performance: 0.01,
    quality: 0.01,
    oee: 0.01,
    utilization: 0.01,
  },
  shaftDesign: { twist: Math.PI / 180 },
  submergedPlane: { resultantForce: 1000 },
  thinVessel: { hoop: 1e6, longitudinal: 1e6 },
  threadDesign: { utilization: 0.01 },
};

/** Remaining-43 shop-display → TypeScript-parent raw multipliers. */
export const remainingRawScale: Record<string, Record<string, number>> = {
  beam: { reaction: 1000, moment: 1000, deflection: 0.001 },
  pneumatic: { extend: 1000, retract: 1000, boreArea: 1e-6, retractArea: 1e-6 },
  clampForce: { transferred: 1000, pivot: 1000 },
  motionProfile: { distance: 0.001 },
  leadScrew: { speed: 0.001, power: 1000 },
  airConsumption: { sweptVolume: 0.001 },
  compressionSpring: { rate: 1000, shearStress: 1e6 },
  drillingTime: { timeMinutes: 1 / 60 },
  formControl: { toleranceRatio: 0.01 },
  orientationControl: { ratio: 0.01 },
  profileRunout: { ratio: 0.01 },
  brakingDuty: { dutyRatio: 0.01 },
  motorOperatingPoint: {},
  lmtd: { duty: 1000 },
  bearingLife: {},
};

/** Outputs that must not fail the whole document when their expression is undefined. */
export const optionalOutputs: Record<string, Record<string, string>> = {
  measurementUncertainty: {
    relativeExpanded: "Relative expanded uncertainty is undefined when the measured value is zero.",
  },
};

export function applyFieldBound(value: number, bound: FieldBound) {
  if (bound.min != null && value < bound.min) throw new Error(bound.message);
  if (bound.max != null && value > bound.max) throw new Error(bound.message);
  if (bound.gt != null && value <= bound.gt) throw new Error(bound.message);
  if (bound.lt != null && value >= bound.lt) throw new Error(bound.message);
  if (bound.integer && !Number.isInteger(value)) throw new Error(bound.integerMessage ?? bound.message);
}

export function applyDocumentBounds(
  toolId: string,
  scope: Record<string, number>,
  context: { strings?: Record<string, string>; tables?: Record<string, Record<string, number>> } = {},
) {
  for (const bound of documentBounds[toolId] ?? []) {
    if (bound.when) {
      const flag = evaluateExpression(bound.when, scope, context);
      if (flag === 0) continue;
    }
    const value = evaluateExpression(bound.expression, scope, context);
    if (bound.min != null && value < bound.min) throw new Error(bound.message);
    if (bound.max != null && value > bound.max) throw new Error(bound.message);
    if (bound.gt != null && !(value > bound.gt)) throw new Error(bound.message);
    if (bound.lt != null && !(value < bound.lt)) throw new Error(bound.message);
  }
}

/**
 * Applicability warnings — the model runs, but outside the range it was derived
 * for. Distinct from `documentBounds`, which rejects input that is invalid:
 * D/t = 5 is a perfectly well-formed vessel, it is just not a thin-walled one,
 * and refusing to compute it would be wrong. Saying nothing is also wrong,
 * because the number that comes back looks exactly like a valid one.
 */
export type ApplicabilityWarning = {
  expression: string;
  min?: number;
  max?: number;
  gt?: number;
  lt?: number;
  message: string;
};

export const applicabilityWarnings: Record<string, ApplicabilityWarning[]> = {
  thinVessel: [
    {
      expression: "diameter/thickness",
      // Membrane theory assumes stress is uniform through the wall. Below about
      // D/t = 20 the through-wall gradient stops being negligible and the hoop
      // stress reported here reads low.
      min: 20,
      message:
        "Diameter-to-thickness is below 20, so this is not a thin wall. Membrane theory understates the hoop stress here — use a thick-wall (Lamé) treatment.",
    },
  ],
  // `stability` wants the same treatment and cannot have it yet. Euler buckling
  // is elastic, so below a critical slenderness it returns a load the column
  // cannot reach — it squashes first. Testing for that needs the squash load,
  // σy·A, and the model takes neither cross-sectional area nor yield strength:
  // its inputs are end condition, length, modulus and second moment. Adding the
  // check means adding two inputs, which changes what the model asks of the
  // person using it. That is a product decision, not a guard.
};

export function collectApplicabilityWarnings(
  toolId: string,
  scope: Record<string, number>,
  context: { strings?: Record<string, string>; tables?: Record<string, Record<string, number>> } = {},
): string[] {
  const found: string[] = [];
  for (const rule of applicabilityWarnings[toolId] ?? []) {
    let value: number;
    try {
      value = evaluateExpression(rule.expression, scope, context);
    } catch {
      // A rule that cannot be evaluated is not a finding. The bounds and the
      // outputs themselves already report a genuinely broken input.
      continue;
    }
    if (!Number.isFinite(value)) continue;
    const outside =
      (rule.min != null && value < rule.min) ||
      (rule.max != null && value > rule.max) ||
      (rule.gt != null && !(value > rule.gt)) ||
      (rule.lt != null && !(value < rule.lt));
    if (outside) found.push(rule.message);
  }
  return found;
}
