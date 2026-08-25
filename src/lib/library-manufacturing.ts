import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Machining and manufacturing models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const manufacturingDocuments: Record<string, InstrumentDocument> = {
  additiveBuild: libraryDoc("additiveBuild", {
    fields: [
      { id: "partVolume", label: "Declared part volume", symbol: "Vpart", help: "User-entered final solid volume from CAD or other declared source.", defaultValue: 100, defaultUnit: "cm³" },
      { id: "density", label: "Declared material density", symbol: "ρ", help: "User-entered density for the declared material/condition; no property lookup is applied.", defaultValue: 1.24, defaultUnit: "g/cm³" },
      { id: "supportFactor", label: "Declared support-material factor", symbol: "s", help: "User-entered support material as a percentage of the part mass; not inferred from geometry.", defaultValue: 15, defaultUnit: "%", signed: true },
      { id: "buildRate", label: "Declared effective build rate", symbol: "R", help: "User-entered effective part-plus-support build rate at the stated machine/process condition.", defaultValue: 20, defaultUnit: "cm³/h" },
      { id: "materialRate", label: "Declared material rate", symbol: "cm", help: "User-entered material cost rate.", defaultValue: 30, defaultUnit: "currency/kg", signed: true },
      { id: "machineRate", label: "Declared machine rate", symbol: "ch", help: "User-entered machine-hour cost rate.", defaultValue: 8, defaultUnit: "currency/h", signed: true },
      { id: "fixedOverhead", label: "Declared fixed overhead", symbol: "C0", help: "User-entered fixed setup/post-processing/other cost allocation.", defaultValue: 5, defaultUnit: "currency", signed: true },
    ],
    outputs: [
      { id: "partMass", label: "Declared part material mass", defaultUnit: "g", expression: "((partVolume)*(density))" },
      { id: "supportMass", label: "Declared support material mass", defaultUnit: "g", expression: "(((partVolume)*(density))*(supportFactor)/100)" },
      { id: "totalMaterialMass", label: "Part plus support material mass", defaultUnit: "g", expression: "(((partVolume)*(density))+(((partVolume)*(density))*(supportFactor)/100))" },
      { id: "effectiveBuildVolume", label: "Support-adjusted build volume", defaultUnit: "cm³", expression: "((partVolume)*(1+(supportFactor)/100))" },
      { id: "buildTime", label: "Effective build time", defaultUnit: "h", expression: "(((partVolume)*(1+(supportFactor)/100))/(buildRate))" },
      { id: "materialCost", label: "Declared material cost", defaultUnit: "currency", expression: "((((partVolume)*(density))+(((partVolume)*(density))*(supportFactor)/100))/1000*(materialRate))" },
      { id: "machineCost", label: "Declared machine-time cost", defaultUnit: "currency", expression: "((((partVolume)*(1+(supportFactor)/100))/(buildRate))*(machineRate))" },
      { id: "directCost", label: "Direct estimated cost", defaultUnit: "currency", expression: "(((((partVolume)*(density))+(((partVolume)*(density))*(supportFactor)/100))/1000*(materialRate))+((((partVolume)*(1+(supportFactor)/100))/(buildRate))*(machineRate))+(fixedOverhead))" },
    ],
    formula: "mpart = Vρ · msupport = mpart s · teffective = V(1+s)/R · Cdirect = (mpart + msupport)cm + teffective ch + C0",
    warnings: ["This is a direct estimate from user-entered volume, density, support factor, effective build rate, and cost rates. It does not read CAD/STL data, infer wall thickness, orientation, support geometry, infill, nesting, layer parameters, warmup/cooldown, setup, labor, post-processing, energy, scrap, yield, scheduling, machine availability, material qualification, printability, quality, lead time, quotation, or process/material/machine selection."],
  }),
  cuttingForce: libraryDoc("cuttingForce", {
    fields: [
      { id: "specificForce", label: "Declared specific cutting force", symbol: "kc", help: "User-entered force coefficient for the stated material, tool, and condition; no lookup or inference is used.", family: "stress", defaultValue: 1800, defaultUnit: "N/mm²" },
      { id: "depth", label: "Depth of cut", symbol: "ap", help: "Declared engaged depth in the simplified rectangular uncut-chip area.", family: "length", defaultValue: 2.5, defaultUnit: "mm" },
      { id: "feed", label: "Feed per revolution", symbol: "f", help: "Declared feed per revolution in the simplified rectangular uncut-chip area.", family: "length", defaultValue: 0.2, defaultUnit: "mm" },
      { id: "cuttingSpeed", label: "Declared cutting speed", symbol: "Vc", help: "User-entered surface speed used only to convert force to ideal mechanical cutting power.", family: "speed", defaultValue: 180, defaultUnit: "m/min" }
    ],
    outputs: [
      { id: "uncutChipArea", label: "Declared uncut-chip area", family: "area", defaultUnit: "mm²", expression: "((depth/0.001)*(feed/0.001))*0.000001" },
      { id: "cuttingForce", label: "Tangential cutting force", family: "force", defaultUnit: "N", expression: "(specificForce/1000000)*(depth/0.001)*(feed/0.001)" },
      { id: "idealPower", label: "Ideal cutting power", family: "power", defaultUnit: "kW", expression: "((specificForce/1000000)*(depth/0.001)*(feed/0.001)*(cuttingSpeed/0.0166666666666667)/60000)*1000" },
      { id: "forcePerDepth", label: "Force per declared depth", family: "stiffness", defaultUnit: "N/mm", expression: "((specificForce/1000000)*(feed/0.001))*1000" }
    ],
    formula: "Ac = ap·f · Fc = kc·Ac · Pideal = Fc·Vc/60,000",
    warnings: ["This uses user-entered specific cutting force and a simplified rectangular uncut-chip area. It does not select a process, tool, material, coefficient, speed, feed, coolant, machine, or efficiency; model chip thinning, engagement, dynamics, chatter, wear, temperature, workholding, or safety; or approve machining."],
  }),
  cuttingParameters: libraryDoc("cuttingParameters", {
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
  cuttingPower: libraryDoc("cuttingPower", {
    fields: [
      { id: "depth", label: "Depth of cut", symbol: "ap", help: "Declared radial turning depth of cut for the stated pass.", defaultValue: 3, defaultUnit: "mm" },
      { id: "feed", label: "Feed per revolution", symbol: "f", help: "Declared turning feed per revolution for the stated pass.", defaultValue: 0.2, defaultUnit: "mm/rev" },
      { id: "cuttingSpeed", label: "Cutting speed", symbol: "vc", help: "Declared cutting speed for the stated pass.", defaultValue: 120, defaultUnit: "m/min" },
      { id: "specificForce", label: "Declared specific cutting force", symbol: "Kc", help: "User-entered specific cutting force; no material or chip-thickness model is selected.", defaultValue: 3100, defaultUnit: "MPa" },
      { id: "efficiency", label: "Declared machine efficiency", symbol: "η", help: "User-entered machine coefficient used only in the direct power screen.", defaultValue: 80, defaultUnit: "%" },
    ],
    outputs: [
      { id: "cuttingPower", label: "Ideal cutting power", defaultUnit: "kW", expression: "depth*feed*cuttingSpeed*specificForce/60000" },
      { id: "machinePower", label: "Declared-efficiency machine input", defaultUnit: "kW", expression: "depth*feed*cuttingSpeed*specificForce/60000/(efficiency/100)" },
    ],
    formula: "Pc = ap f vc Kc /(60 × 10³) · Pmachine = Pc/η",
    warnings: ["Direct turning power screen only; parameter/tool selection, chip-thickness effects, chatter, thermal limits, wear, machine limits, safety, and production approval are excluded."],
  }),
  drillPointDepth: libraryDoc("drillPointDepth", {
    fields: [
      { id: "diameter", label: "Drill diameter", symbol: "D", help: "Declared drill diameter used for exact conical point geometry.", defaultValue: 12, defaultUnit: "mm" },
      { id: "includedAngle", label: "Included point angle", symbol: "θ", help: "Declared full included conical point angle; it must be between 0 and 180 degrees.", defaultValue: 135, defaultUnit: "deg" },
      { id: "fullDiameterDepth", label: "Required full-diameter depth", symbol: "h", help: "Depth of the requested full-diameter cylindrical portion, excluding the drill point.", defaultValue: 25, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "pointDepth", label: "Geometric drill-point depth", defaultUnit: "mm", expression: "diameter/2/tan((includedAngle/2)*pi/180)" },
      { id: "programmedDepth", label: "Programmed depth for declared full diameter", defaultUnit: "mm", expression: "fullDiameterDepth+diameter/2/tan((includedAngle/2)*pi/180)" },
    ],
    formula: "hpoint = (D/2)/tan(θ/2) · hprogram = hfull + hpoint",
    warnings: ["Ideal conical-point geometry only; drilling variation, wear, runout, breakthrough allowance, workholding, machine motion, cutting parameters, safety, and manufacturing approval are excluded."],
  }),
  drillingTime: libraryDoc("drillingTime", {
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
  filletWeld: libraryDoc("filletWeld", {
    fields: [
      { id: "legSize", label: "Equal fillet leg size", help: "Nominal equal-leg fillet dimension for this direct-load screen.", defaultValue: 6, defaultUnit: "mm" },
      { id: "weldLength", label: "Effective weld length", help: "User-entered effective length per weld line; end returns are not inferred.", defaultValue: 100, defaultUnit: "mm" },
      { id: "weldLines", label: "Number of weld lines", help: "User-entered effective parallel fillet-weld line count for equal direct-load sharing.", defaultValue: 2, defaultUnit: "—" },
      { id: "directForce", label: "Direct applied force", help: "Stated direct force only; no eccentricity or moment distribution is modeled.", defaultValue: 50000, defaultUnit: "N", signed: true },
      { id: "allowableShear", label: "User-stated allowable shear", help: "User-entered allowable basis; this screen does not select consumables or code values.", defaultValue: 145, defaultUnit: "MPa" },
      { id: "arcVoltage", label: "Arc voltage", help: "User-entered arc voltage for electrical heat-input arithmetic.", defaultValue: 24, defaultUnit: "V" },
      { id: "arcCurrent", label: "Arc current", help: "User-entered arc current for electrical heat-input arithmetic.", defaultValue: 180, defaultUnit: "A" },
      { id: "travelSpeed", label: "Travel speed", help: "User-entered travel speed for heat input per weld length.", defaultValue: 300, defaultUnit: "mm/min" },
      { id: "arcEfficiency", label: "User-stated arc efficiency", help: "User-entered 0–100% thermal-efficiency factor; no process value is selected.", defaultValue: 80, defaultUnit: "%" },
    ],
    outputs: [
      { id: "throat", label: "Effective throat thickness", defaultUnit: "mm", expression: "0.707*legSize" },
      { id: "effectiveArea", label: "Effective throat area", defaultUnit: "mm²", expression: "0.707*legSize*weldLength*weldLines" },
      { id: "directStress", label: "Direct throat shear stress", defaultUnit: "MPa", expression: "directForce/(0.707*legSize*weldLength*weldLines)" },
      { id: "requiredLeg", label: "Required leg at stated allowable", defaultUnit: "mm", expression: "directForce/(0.707*weldLength*allowableShear*weldLines)" },
      { id: "heatInput", label: "Electrical heat input", defaultUnit: "kJ/mm", expression: "arcVoltage*arcCurrent*60*(arcEfficiency/100)/(1000*travelSpeed)" },
    ],
    formula: "t = 0.707a · Aeff = 0.707aLn · τ = F/Aeff · amin = F/(0.707Lτallow n) · HI = VI·60·η/(1000v)",
    warnings: ["This is equal-leg fillet-weld direct-load arithmetic with user-entered allowable, plus electrical heat input from user-entered arc settings. It excludes weld group eccentricity, bending/torsion, nonuniform load sharing, longitudinal/transverse direction effects, fatigue, residual stress, discontinuities, base-metal failure, electrode/process selection, code provisions, weld procedure qualification, heat-affected-zone effects, distortion, preheat/interpass control, inspection, and compliance."],
  }),
  fixtureClamping: libraryDoc("fixtureClamping", {
    fields: [
      { id: "machiningForce", label: "Declared horizontal machining force", symbol: "Fcut", help: "User-entered horizontal machining force requiring frictional restraint.", defaultValue: 1800, defaultUnit: "N" },
      { id: "friction", label: "Declared clamp/workpiece friction", symbol: "μ", help: "User-entered static friction coefficient for this narrow horizontal-force screen.", defaultValue: 0.19, defaultUnit: "—" },
      { id: "serviceMultiplier", label: "Declared force multiplier", symbol: "M", help: "User-entered multiplier for the stated force context; it is not a prescribed safety factor.", defaultValue: 2, defaultUnit: "—" },
    ],
    outputs: [
      { id: "designHorizontalForce", label: "Multiplier-adjusted horizontal force", defaultUnit: "N", expression: "machiningForce*serviceMultiplier" },
      { id: "requiredNormalForce", label: "Friction-only required normal force", defaultUnit: "N", expression: "machiningForce*serviceMultiplier/friction" },
      { id: "frictionCapacity", label: "Friction capacity at required normal force", defaultUnit: "N", expression: "machiningForce*serviceMultiplier" },
    ],
    formula: "Fdesign = Fcut M · Nrequired = Fdesign/μ · Ffriction = μN",
    warnings: ["This is a friction-only horizontal-force screen. It does not analyze stops, lift, moments, clamp geometry, load distribution, workpiece deformation, vibration, dynamic loads, machine table stiffness, clamp capacity, fixture selection, or safety approval."],
  }),
  machiningTimeBudget: libraryDoc("machiningTimeBudget", {
    fields: [
      { id: "cuttingLength", label: "Declared cutting length", symbol: "Lcut", help: "User-entered total path length while cutting; entries, exits, repositioning, and toolpath strategy are not derived.", defaultValue: 100, defaultUnit: "mm" },
      { id: "feedRate", label: "Declared feed rate", symbol: "Ffeed", help: "User-entered cutting feed rate; tool, material, speed, chip load, and quality are not selected or derived.", defaultValue: 50, defaultUnit: "mm/min" },
      { id: "nonCutAllowance", label: "Declared non-cut time allowance", symbol: "tallowance", help: "User-entered aggregate allowance for stated non-cut time; setup, handling, and machine motion are not predicted.", defaultValue: 0.2, defaultUnit: "min", signed: true },
    ],
    outputs: [
      { id: "cuttingTime", label: "Literal cutting time", defaultUnit: "min", expression: "((cuttingLength)/(feedRate))" },
      { id: "nonCutAllowance", label: "Declared non-cut time allowance", defaultUnit: "min", expression: "(nonCutAllowance)" },
      { id: "totalTime", label: "Literal declared total time", defaultUnit: "min", expression: "(((cuttingLength)/(feedRate))+(nonCutAllowance))" },
      { id: "totalTimeSeconds", label: "Literal declared total time", defaultUnit: "s", expression: "(((cuttingLength)/(feedRate))+(nonCutAllowance))*60" },
    ],
    formula: "tcut = Lcut / Ffeed · ttotal = tcut + tallowance",
    warnings: ["This divides only user-declared cutting length by declared feed rate and adds a declared non-cut allowance. It does not select tools, feeds, speeds, materials, machines, or process strategy; calculate tool life, quality, cost, capacity, safety, suitability, or approval."],
  }),
  millingMrr: libraryDoc("millingMrr", {
    fields: [
      { id: "axialDepth", label: "Axial depth", symbol: "ap", help: "Engaged axial depth of cut for the stated milling operation.", family: "length", defaultValue: 4, defaultUnit: "mm" },
      { id: "radialWidth", label: "Radial engagement", symbol: "ae", help: "Engaged radial width of cut for the stated operation.", family: "length", defaultValue: 8, defaultUnit: "mm" },
      { id: "tableFeed", label: "Table feed", symbol: "Vf", help: "Programmed table-feed rate, not feed per tooth or per revolution.", family: "speed", defaultValue: 900, defaultUnit: "mm/min" }
    ],
    outputs: [
      { id: "rate", label: "Theoretical material removal rate", defaultUnit: "cm³/min", expression: "(axialDepth/0.001)*(radialWidth/0.001)*(tableFeed/0.0000166666666666667)/1000" },
      { id: "hourly", label: "Theoretical hourly removed volume", defaultUnit: "cm³/h", expression: "(axialDepth/0.001)*(radialWidth/0.001)*(tableFeed/0.0000166666666666667)/1000*60" },
      { id: "chipArea", label: "Engaged chip cross-section", family: "area", defaultUnit: "mm²", expression: "((axialDepth/0.001)*(radialWidth/0.001))*0.000001" }
    ],
    formula: "MRR = ap·ae·Vf / 1,000",
    warnings: ["This is theoretical rectangular-engagement volume. It does not choose feeds or speeds and excludes material machinability, spindle power/torque, tool geometry, chip thinning, tool life, runout, workholding, vibration, coolant, machine limits, and process qualification."],
  }),
  pickPlaceCycle: libraryDoc("pickPlaceCycle", {
    fields: [
      { id: "outboundTime", label: "Outbound travel time", symbol: "tout", help: "User-entered travel time to the pick or place position.", defaultValue: 1.2, defaultUnit: "s", signed: true },
      { id: "inboundTime", label: "Return travel time", symbol: "tback", help: "User-entered return travel time for the same repeated cycle.", defaultValue: 1.1, defaultUnit: "s", signed: true },
      { id: "pickDwell", label: "Pick dwell", symbol: "tpick", help: "User-entered gripper or process dwell at pick.", defaultValue: 0.3, defaultUnit: "s", signed: true },
      { id: "placeDwell", label: "Place dwell", symbol: "tplace", help: "User-entered gripper or process dwell at place.", defaultValue: 0.3, defaultUnit: "s", signed: true },
      { id: "auxiliaryTime", label: "Auxiliary time", symbol: "taux", help: "User-entered transfer, sensing, or other time added to each cycle.", defaultValue: 0.2, defaultUnit: "s", signed: true },
      { id: "cycles", label: "Repeated cycles", symbol: "N", help: "Declared repeated cycle count for the batch-time result.", defaultValue: 100, defaultUnit: "cycles" },
    ],
    outputs: [
      { id: "cycleTime", label: "Declared repeated cycle time", defaultUnit: "s", expression: "outboundTime+inboundTime+pickDwell+placeDwell+auxiliaryTime" },
      { id: "hourlyThroughput", label: "Ideal hourly throughput", defaultUnit: "cycles/h", expression: "3600/(outboundTime+inboundTime+pickDwell+placeDwell+auxiliaryTime)" },
      { id: "batchTime", label: "Declared-cycle batch duration", defaultUnit: "min", expression: "(outboundTime+inboundTime+pickDwell+placeDwell+auxiliaryTime)*cycles/60" },
    ],
    formula: "tcycle = tout + tback + tpick + tplace + taux · throughput = 3600/tcycle · tbatch = Ntcycle",
    warnings: ["This is a repeated timing sum from user-entered travel, dwell, and auxiliary times. It does not simulate robot paths, acceleration, blending, queuing, overlap, controller behavior, reach, collision, faults, payload limits, uptime, safety, or throughput guarantees."],
  }),
  productionMetrics: libraryDoc("productionMetrics", {
    fields: [
      { id: "plannedTime", label: "Planned production time", help: "User-entered planned production window excluding only time your organization defines outside the plan.", defaultValue: 480, defaultUnit: "min" },
      { id: "stopTime", label: "Stop time", help: "User-entered tracked stop time inside the stated planned production window.", defaultValue: 60, defaultUnit: "min" },
      { id: "idealCycle", label: "Ideal cycle time", help: "User-entered fastest achievable cycle time under the declared process basis.", defaultValue: 45, defaultUnit: "s/unit" },
      { id: "totalCount", label: "Total count", help: "All pieces counted during the same stated production window.", defaultValue: 500, defaultUnit: "units" },
      { id: "goodCount", label: "Good first-pass count", help: "User-classified first-pass good pieces; rework treatment must be consistent with the study.", defaultValue: 480, defaultUnit: "units" },
      { id: "demand", label: "Demand in window", help: "Required quantity over the same stated planned production window, used only for takt arithmetic.", defaultValue: 600, defaultUnit: "units" },
      { id: "operators", label: "Assigned operators", help: "User-entered average assigned labor count over the stated production window.", defaultValue: 4, defaultUnit: "people" },
    ],
    outputs: [
      { id: "takt", label: "Takt time", defaultUnit: "s/unit", expression: "plannedTime*60/demand" },
      { id: "runTime", label: "Run time", defaultUnit: "min", expression: "plannedTime-stopTime" },
      { id: "throughput", label: "Actual throughput", defaultUnit: "units/min", expression: "totalCount/(plannedTime-stopTime)" },
      { id: "capacity", label: "Ideal-window capacity", defaultUnit: "units", expression: "plannedTime*60/idealCycle" },
      { id: "availability", label: "Availability", defaultUnit: "%", expression: "(plannedTime-stopTime)/plannedTime*100" },
      { id: "performance", label: "Performance", defaultUnit: "%", expression: "idealCycle*totalCount/((plannedTime-stopTime)*60)*100" },
      { id: "quality", label: "First-pass quality", defaultUnit: "%", expression: "goodCount/totalCount*100" },
      { id: "oee", label: "Overall equipment effectiveness", defaultUnit: "%", expression: "((plannedTime-stopTime)/plannedTime)*(idealCycle*totalCount/((plannedTime-stopTime)*60))*(goodCount/totalCount)*100" },
      { id: "laborContent", label: "Labor content per good unit", defaultUnit: "labor-min/unit", expression: "operators*plannedTime/goodCount" },
      { id: "utilization", label: "Machine utilization", defaultUnit: "%", expression: "(plannedTime-stopTime)/plannedTime*100" },
    ],
    formula: "Run = PPT−ST · A = Run/PPT · P = ICT·N/Run · Q = G/N · OEE = A·P·Q · takt = PPT/D",
    warnings: ["This reports arithmetic from user-entered production records and uses the declared ideal cycle time. It does not validate downtime event classification, count integrity, rework policy, demand forecasting, labor allocation, targets, bottleneck behavior, shift calendars, routing, or a productivity conclusion."],
  }),
  sheetBendAllowance: libraryDoc("sheetBendAllowance", {
    fields: [
      { id: "bendAngle", label: "Declared bend angle", symbol: "θ", help: "User-entered included bend angle; bend geometry and sequence are not inferred.", defaultValue: 90, defaultUnit: "°" },
      { id: "insideRadius", label: "Declared inside bend radius", symbol: "R", help: "User-entered inside radius; tooling and bend method are not selected.", defaultValue: 1, defaultUnit: "mm" },
      { id: "thickness", label: "Declared sheet thickness", symbol: "T", help: "User-entered thickness; material condition and tolerance are not derived.", defaultValue: 1, defaultUnit: "mm" },
      { id: "kFactor", label: "Declared K factor", symbol: "K", help: "User-entered neutral-axis ratio; no material, tooling, or process K-factor selection is performed.", defaultValue: 0.5, defaultUnit: "—", signed: true },
    ],
    outputs: [
      { id: "bendAllowance", label: "Literal single-bend allowance", defaultUnit: "mm", expression: "(((bendAngle)*pi/180)*((insideRadius)+(kFactor)*(thickness)))" },
      { id: "bendDeduction", label: "Literal single-bend deduction", defaultUnit: "mm", expression: "(2*((insideRadius)+(thickness))*tan(((bendAngle)*pi/180)/2)-(((bendAngle)*pi/180)*(((insideRadius))+(kFactor)*((thickness)))))" },
      { id: "neutralAxisRadius", label: "Literal neutral-axis radius", defaultUnit: "mm", expression: "(insideRadius)+(kFactor)*(thickness)" },
      { id: "bendAngle", label: "Declared bend angle", defaultUnit: "°", expression: "(bendAngle)" },
    ],
    formula: "BA = θ·(π/180)·(R + K·T) · BD = 2·(R + T)·tan(θ/2) − BA",
    warnings: ["This applies only the stated single-bend allowance and deduction relations to user-declared angle, inside radius, thickness, and K factor. It does not select material, K factor, tooling, bend radius, bend method, process sequence, multi-bend flat pattern, tolerance, manufacturability, cost, capacity, safety, suitability, or approval."],
  }),
  sheetMetalBend: libraryDoc("sheetMetalBend", {
    fields: [
      { id: "angle", label: "Bend angle", help: "Included bend angle in degrees for the one stated bend.", defaultValue: 90, defaultUnit: "deg" },
      { id: "insideRadius", label: "Inside bend radius", help: "Nominal inside bend radius.", defaultValue: 2, defaultUnit: "mm", signed: true },
      { id: "thickness", label: "Material thickness", help: "Nominal sheet thickness.", defaultValue: 1.5, defaultUnit: "mm" },
      { id: "kFactor", label: "K-factor", help: "User-entered neutral-axis ratio; this screen does not select it.", defaultValue: 0.42, defaultUnit: "—", signed: true },
      { id: "flange1", label: "First flange length", help: "First stated outside-to-apex flange length for the one-bend model.", defaultValue: 40, defaultUnit: "mm", signed: true },
      { id: "flange2", label: "Second flange length", help: "Second stated outside-to-apex flange length for the one-bend model.", defaultValue: 50, defaultUnit: "mm", signed: true },
    ],
    outputs: [
      { id: "bendAllowance", label: "Bend allowance", defaultUnit: "mm", expression: "(angle*pi/180)*(insideRadius+kFactor*thickness)" },
      { id: "outsideSetback", label: "Outside setback", defaultUnit: "mm", expression: "tan((angle*pi/180)/2)*(insideRadius+thickness)" },
      { id: "bendDeduction", label: "Bend deduction", defaultUnit: "mm", expression: "2*tan((angle*pi/180)/2)*(insideRadius+thickness)-(angle*pi/180)*(insideRadius+kFactor*thickness)" },
      { id: "flatLength", label: "One-bend flat-length estimate", defaultUnit: "mm", expression: "flange1+flange2-(2*tan((angle*pi/180)/2)*(insideRadius+thickness)-(angle*pi/180)*(insideRadius+kFactor*thickness))" },
    ],
    formula: "BA = (π/180)B(IR + K·MT) · OSSB = tan(B/2)(IR + MT) · BD = 2OSSB − BA · Flat = L₁ + L₂ − BD",
    warnings: ["This is nominal one-bend K-factor arithmetic with user-entered inputs. It excludes K-factor selection, bend-radius rules, springback, tooling, grain direction, forming method, material condition, tolerances, bend relief, multi-bend sequencing, collision, and manufacturing qualification."],
  }),
  tappingTorque: libraryDoc("tappingTorque", {
    fields: [
      { id: "threadDiameter", label: "Declared thread diameter", symbol: "d", help: "Declared major-diameter planning input; no thread form or tolerance is inferred.", defaultValue: 10, defaultUnit: "mm" },
      { id: "torqueCoefficient", label: "Declared torque coefficient", symbol: "k", help: "User-entered empirical coefficient for the stated material/tool/process; it is not looked up or selected here.", defaultValue: 0.002, defaultUnit: "N·m/mm³" },
      { id: "engagementFactor", label: "Declared engagement factor", symbol: "e", help: "User-entered non-dimensional multiplier for the stated engagement/process context.", defaultValue: 1.5, defaultUnit: "—" },
      { id: "spindleSpeed", label: "Declared spindle speed", symbol: "n", help: "Steady rotational speed used only for mechanical power arithmetic.", defaultValue: 500, defaultUnit: "rpm", signed: true },
    ],
    outputs: [
      { id: "torque", label: "User-coefficient first-estimate tapping torque", defaultUnit: "N·m", expression: "((torqueCoefficient)*((threadDiameter))^(3)*(engagementFactor))" },
      { id: "mechanicalPower", label: "Ideal mechanical spindle power", defaultUnit: "kW", expression: "(((torqueCoefficient)*((threadDiameter))^(3)*(engagementFactor))*2*pi*(spindleSpeed)/60/1000)" },
      { id: "diameterCube", label: "Declared diameter cubed", defaultUnit: "mm³", expression: "((threadDiameter))^(3)" },
    ],
    formula: "T = k·d³·e · P = Tω = 2πTn/(60·1000)",
    warnings: ["This is a planning-only user-coefficient torque and mechanical-power arithmetic screen. It does not choose a tap, thread form, drill size, material, hardness, lubricant, cutting speed, engagement percentage, feed, tool life, machine capability, process parameters, or approve a tap operation."],
  }),
  taylorToolLife: libraryDoc("taylorToolLife", {
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
  threadDesign: libraryDoc("threadDesign", {
    fields: [
      { id: "majorDiameter", label: "Metric thread major diameter", symbol: "Dmajor", help: "User-entered nominal major diameter; no thread standard or class is selected.", defaultValue: 10, defaultUnit: "mm" },
      { id: "pitch", label: "Thread pitch", symbol: "P", help: "User-entered compatible metric pitch.", defaultValue: 1.5, defaultUnit: "mm" },
      { id: "engagementPercent", label: "User-stated tap engagement", symbol: "E", help: "Target tap engagement fraction from 0 to 100%; it is not measured actual engagement.", defaultValue: 75, defaultUnit: "%" },
      { id: "engagementLength", label: "Thread engagement length", symbol: "Le", help: "User-entered axial length of engaged threads for the simplified screening area.", defaultValue: 12, defaultUnit: "mm" },
      { id: "threadsPerInch", label: "Thread frequency", symbol: "n", help: "User-entered thread count per inch required by the reviewed root-shear-area equation.", defaultValue: 20, defaultUnit: "TPI" },
      { id: "externalMajorMinimum", label: "External minimum major diameter", symbol: "Dsmin", help: "User-entered external-thread minimum major diameter for the reviewed root-shear-area equation.", defaultValue: 0.248, defaultUnit: "in" },
      { id: "internalPitchMaximum", label: "Internal maximum pitch diameter", symbol: "Enmax", help: "User-entered internal-thread maximum pitch diameter for the reviewed root-shear-area equation.", defaultValue: 0.2175, defaultUnit: "in" },
      { id: "allowableShear", label: "User-stated internal-thread allowable", symbol: "τallow", help: "User-entered shear allowable for screening only; material and standard selection are excluded.", defaultValue: 90, defaultUnit: "MPa" },
      { id: "appliedAxialLoad", label: "Applied axial load", symbol: "F", help: "User-entered direct axial load for the simplified pull-out utilization output.", defaultValue: 4500, defaultUnit: "N", signed: true },
    ],
    outputs: [
      { id: "targetTapDrill", label: "Target tap drill at stated engagement", defaultUnit: "mm", expression: "((majorDiameter)-(pitch)*(engagementPercent)/100)" },
      { id: "fullEngagementTapDrill", label: "Basic major-minus-pitch drill", defaultUnit: "mm", expression: "((majorDiameter)-(pitch))" },
      { id: "engagedThreads", label: "Engaged thread pitches", defaultUnit: "—", expression: "((engagementLength)/(pitch))" },
      { id: "rootShearArea", label: "Reviewed root-shear area", defaultUnit: "mm²", expression: "((pi*(threadsPerInch)*((engagementLength)/25.4)*(externalMajorMinimum)*(1/(2*(threadsPerInch))+0.57735*((externalMajorMinimum)-(internalPitchMaximum))))*645.16)" },
      { id: "pullOutCapacity", label: "User-property thread-stripping capacity", defaultUnit: "N", expression: "(((pi*(threadsPerInch)*((engagementLength)/25.4)*(externalMajorMinimum)*(1/(2*(threadsPerInch))+0.57735*((externalMajorMinimum)-(internalPitchMaximum))))*645.16)*(allowableShear))" },
      { id: "utilization", label: "Applied load / screening capacity", defaultUnit: "%", expression: "((appliedAxialLoad)/(((pi*(threadsPerInch)*((engagementLength)/25.4)*(externalMajorMinimum)*(1/(2*(threadsPerInch))+0.57735*((externalMajorMinimum)-(internalPitchMaximum))))*645.16)*(allowableShear)))*100" },
    ],
    formula: "Dtap = Dmajor − P·E · Ats = πnLeDsmin[1/(2n)+0.57735(Dsmin−Enmax)] · Fscreen = Atsτallow",
    warnings: ["This combines source-stated basic metric tap-drill arithmetic with the reviewed internal-thread root-shear-area relation using user-entered TPI, minimum external major diameter, maximum internal pitch diameter, engagement length, and shear strength. It does not select a thread standard, fit/class, drill, tap, material, allowable, or actual engagement; it excludes load distribution, bending, fatigue, torque/tension interaction, thread damage, installation effects, joint stiffness, and acceptance/compliance."],
  }),
  threadMachiningTime: libraryDoc("threadMachiningTime", {
    fields: [
      { id: "pitch", label: "Declared thread pitch", symbol: "p", help: "Declared axial travel per revolution; no thread form or starts are inferred.", defaultValue: 1.5, defaultUnit: "mm/rev" },
      { id: "travelLength", label: "Declared per-pass thread travel", symbol: "L", help: "Axial travel per pass including any user-decided allowance.", defaultValue: 30, defaultUnit: "mm" },
      { id: "spindleSpeed", label: "Declared spindle speed", symbol: "n", help: "Constant speed used only for pitch-feed arithmetic.", defaultValue: 500, defaultUnit: "rpm" },
      { id: "passCount", label: "Declared pass count", symbol: "N", help: "Integer number of repeated equal-travel passes.", defaultValue: 6, defaultUnit: "passes" },
      { id: "reversalTime", label: "Declared reversal / overhead per pass", symbol: "tr", help: "User-entered time added once per pass; sequence details are excluded.", defaultValue: 1.2, defaultUnit: "s", signed: true },
    ],
    outputs: [
      { id: "feedRate", label: "Declared pitch-feed rate", defaultUnit: "mm/min", expression: "((pitch)*(spindleSpeed))" },
      { id: "cuttingTimePerPass", label: "Declared travel time per pass", defaultUnit: "s", expression: "((travelLength)/((pitch)*(spindleSpeed))*60)" },
      { id: "totalCuttingTime", label: "Declared repeated travel time", defaultUnit: "s", expression: "(((travelLength)/((pitch)*(spindleSpeed))*60)*(passCount))" },
      { id: "totalTime", label: "Declared travel + reversal time", defaultUnit: "s", expression: "((((travelLength)/((pitch)*(spindleSpeed))*60)*((passCount)))+(reversalTime)*(passCount))" },
    ],
    formula: "vf = p·n · tpass = L/vf · 60 · ttotal = N(tpass + tr)",
    warnings: ["This is declared thread-travel arithmetic only. It does not infer thread form, tool path, starts, infeed schedule, stock allowance, material, cutting conditions, tool life, machine acceleration, setup, non-cutting sequence, process suitability, or approval."],
  }),
  turningMrr: libraryDoc("turningMrr", {
    fields: [
      { id: "depth", label: "Radial depth of cut", symbol: "ap", help: "User-entered radial engagement depth under the stated turning condition.", family: "length", defaultValue: 2.5, defaultUnit: "mm" },
      { id: "feed", label: "Feed per revolution", symbol: "f", help: "User-entered axial feed per workpiece revolution.", family: "length", defaultValue: 0.25, defaultUnit: "mm" },
      { id: "cuttingSpeed", label: "Cutting speed", symbol: "Vc", help: "User-entered surface cutting speed; this screen does not choose it.", family: "speed", defaultValue: 180, defaultUnit: "m/min" }
    ],
    outputs: [
      { id: "rate", label: "Theoretical turning removal rate", defaultUnit: "cm³/min", expression: "(depth/0.001)*(feed/0.001)*(cuttingSpeed/0.0166666666666667)" },
      { id: "hourly", label: "Theoretical hourly removed volume", defaultUnit: "cm³/h", expression: "(depth/0.001)*(feed/0.001)*(cuttingSpeed/0.0166666666666667)*60" },
      { id: "chipSection", label: "Nominal chip cross-section", family: "area", defaultUnit: "mm²", expression: "((depth/0.001)*(feed/0.001))*0.000001" }
    ],
    formula: "MRR = ap·f·Vc",
    warnings: ["This is theoretical steady turning removal rate from user-entered depth, feed, and cutting speed. It excludes parameter selection, diameter variation, approach/retract, interruptions, insert geometry, tool wear, coolant, power, rigidity, chip control, machine limits, tolerance, surface integrity, and process qualification."],
  }),
  weldGroup: libraryDoc("weldGroup", {
    fields: [
      { id: "lineLength", label: "Length of each line weld", symbol: "L", help: "Equal effective length of each of two parallel line welds in the symmetric model.", defaultValue: 100, defaultUnit: "mm" },
      { id: "centerSpacing", label: "Center spacing between lines", symbol: "b", help: "Perpendicular distance between the two equal parallel weld centrelines.", defaultValue: 80, defaultUnit: "mm" },
      { id: "directForce", label: "Declared in-plane direct force", symbol: "F", help: "Known resultant in-plane force magnitude distributed uniformly only in the displayed line-weld model.", defaultValue: 12000, defaultUnit: "N", signed: true },
      { id: "torsionalMoment", label: "Declared torsional moment", symbol: "M", help: "In-plane torsional-moment magnitude about the symmetric weld-group centroid.", defaultValue: 800, defaultUnit: "N·m", signed: true },
    ],
    outputs: [
      { id: "totalLineLength", label: "Total effective line length", defaultUnit: "mm", expression: "(2*(lineLength))" },
      { id: "unitPolarMoment", label: "Unit-throat polar line property", defaultUnit: "mm³", expression: "((lineLength)*((centerSpacing))^(2)/2+((lineLength))^(3)/6)" },
      { id: "endpointRadius", label: "Farthest endpoint radius", defaultUnit: "mm", expression: "(sqrt(((centerSpacing)/2)^2+((lineLength)/2)^2))" },
      { id: "directLineLoad", label: "Direct shear line load", defaultUnit: "N/mm", expression: "((directForce)/(2*(lineLength)))" },
      { id: "torsionalEndpointLineLoad", label: "Endpoint torsional line load", defaultUnit: "N/mm", expression: "((torsionalMoment*1000)*(sqrt(((centerSpacing)/2)^2+((lineLength)/2)^2))/((lineLength)*((centerSpacing))^(2)/2+((lineLength))^(3)/6))" },
      { id: "quadratureLineLoad", label: "Quadrature line-load magnitude", defaultUnit: "N/mm", expression: "(sqrt((((directForce)/(2*(lineLength))))^2+(((torsionalMoment*1000)*(sqrt(((centerSpacing)/2)^2+((lineLength)/2)^2))/((lineLength)*((centerSpacing))^(2)/2+((lineLength))^(3)/6)))^2))" },
    ],
    formula: "Ltotal = 2L · Ju = Lb²/2 + L³/6 · qdirect = F/Ltotal · qtorsion,end = M·rmax/Ju",
    warnings: ["This is a two-equal-parallel-line, unit-throat preliminary weld-group model. The displayed quadrature magnitude is not a maximum vector resultant or code check. It does not model arbitrary weld geometry, throat/leg sizing, directional loading, vector addition at endpoints, eccentric force geometry, bending, fatigue, residual stress, distortion, heat input, weld procedure/quality, code provisions, capacity, safety, or approval."],
  }),
};
