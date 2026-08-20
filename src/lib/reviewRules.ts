/**
 * Engineering Desk — transparent review rules.
 * This module contains no model calls and no inferred recommendations.
 * Users choose the context, complete evidence fields, and inspect the arithmetic.
 */

export type ReviewArea = "engineering" | "drawing" | "bom" | "dfm" | "assumptions" | "safety" | "tolerance" | "calculation";

export type ReviewRule = {
  id: string;
  area: ReviewArea;
  title: string;
  prompt: string;
  evidence: string;
};

export type SelectionWorkflow = {
  id: "coupling" | "motorGearbox" | "linearActuator" | "gripperEoat" | "robotReachPayload" | "reservoir" | "fabricationRules" | "datumModel" | "cmmDeviation" | "beltChainDrive" | "pneumaticValveFlow" | "architectureComparison";
  title: string;
  scope: string;
  evidence: string[];
  boundary: string;
};

export const reviewAreas: { id: ReviewArea; label: string; scope: string }[] = [
  { id: "engineering", label: "Engineering review", scope: "Scope, interfaces, load cases, and validation plan." },
  { id: "drawing", label: "Drawing review", scope: "Dimensions, datums, notes, revision, and inspection communication." },
  { id: "bom", label: "BOM review", scope: "Identity, quantity, revision, sourcing, and material traceability." },
  { id: "dfm", label: "DFM / manufacturability", scope: "Process, access, tooling, tolerances, and inspection feasibility." },
  { id: "assumptions", label: "Assumption check", scope: "Declared inputs, boundary conditions, evidence, and invalidation triggers." },
  { id: "safety", label: "Safety-factor review", scope: "Demand basis, allowable basis, margins, uncertainty, and governing case." },
  { id: "tolerance", label: "Tolerance review", scope: "Functional chain, datum strategy, contributors, assembly risk, and inspection method." },
  { id: "calculation", label: "Calculation review", scope: "Units, method version, source, independent check, and conclusion boundary." },
];

export const reviewRules: ReviewRule[] = [
  { id: "eng-scope", area: "engineering", title: "Functional scope stated", prompt: "Name the function, use environment, interfaces, and exclusions.", evidence: "Requirement, interface control, or design brief identifier." },
  { id: "eng-loads", area: "engineering", title: "Load cases enumerated", prompt: "List steady, transient, handling, assembly, and abnormal load cases that govern the question.", evidence: "Load-case ledger and source." },
  { id: "eng-validation", area: "engineering", title: "Validation path declared", prompt: "State how the preliminary result will be independently checked, tested, or reviewed.", evidence: "Verification method and accountable owner." },
  { id: "drawing-datums", area: "drawing", title: "Datum strategy coherent", prompt: "Confirm datum references support the functional assembly and inspection setup.", evidence: "Drawing zone, datum scheme, or inspection setup." },
  { id: "drawing-limits", area: "drawing", title: "Limits and notes complete", prompt: "Confirm dimensions, tolerances, material, finish, and special notes are unambiguous.", evidence: "Drawing revision and affected callouts." },
  { id: "bom-identity", area: "bom", title: "Part identity and revision controlled", prompt: "Confirm each item has an unambiguous identifier and correct revision.", evidence: "BOM revision and source system record." },
  { id: "bom-sourcing", area: "bom", title: "Sourcing assumptions visible", prompt: "Record approved source, alternates, lead-time risk, and any qualification needs.", evidence: "Approved vendor list or procurement note." },
  { id: "dfm-process", area: "dfm", title: "Process path feasible", prompt: "State the intended process and confirm geometry, access, and setup assumptions.", evidence: "Process route, supplier input, or manufacturing plan." },
  { id: "dfm-inspection", area: "dfm", title: "Inspection route feasible", prompt: "State how critical features will be measured in the intended production setting.", evidence: "Inspection plan, gage concept, or CMM program basis." },
  { id: "assump-inputs", area: "assumptions", title: "Input basis recorded", prompt: "Record every material property, coefficient, condition, or empirical factor with source and condition.", evidence: "Source, edition, retrieval date, and applicability note." },
  { id: "assump-boundary", area: "assumptions", title: "Invalidation triggers listed", prompt: "List what geometry, environment, loading, material, or process changes invalidate the method.", evidence: "Model boundary and change-control trigger." },
  { id: "safety-demand", area: "safety", title: "Demand and allowable basis comparable", prompt: "Confirm demand and allowable are on matching stress, temperature, time, and reliability bases.", evidence: "Load case, allowable source, and conversion notes." },
  { id: "safety-margin", area: "safety", title: "Governing margin identified", prompt: "Record the controlling factor or margin and the uncertainty not captured in the preliminary model.", evidence: "Calculation record and sensitivity note." },
  { id: "tol-chain", area: "tolerance", title: "Functional chain mapped", prompt: "Identify all contributors, directions, assembly conditions, and the functional gap/interference target.", evidence: "Tolerance-chain sketch or calculation record." },
  { id: "tol-measure", area: "tolerance", title: "Measurement convention stated", prompt: "State measurement setup, datum reference frame, gage resolution, and uncertainty approach.", evidence: "Inspection method or metrology plan." },
  { id: "calc-units", area: "calculation", title: "Units and signs independently checked", prompt: "Check quantities, unit transformations, signs, and order of magnitude independent of the calculator output.", evidence: "Independent arithmetic or peer check." },
  { id: "calc-source", area: "calculation", title: "Method and source traceable", prompt: "Record the formula version, source link, assumption list, and stated exclusion boundary.", evidence: "Workspace source card and project note." },
];

export const selectionWorkflows: SelectionWorkflow[] = [
  { id: "coupling", title: "Coupling requirements record", scope: "Capture declared torque, speed, duty, shaft interfaces, misalignment, environment, and validation evidence before a supplier/product review.", evidence: ["Nominal, peak, and transient torque basis", "Speed range, starts/stops, reversals, and duty cycle", "Shaft geometry, keyway/fit, axial space, and interface drawing", "Declared angular/parallel/axial misalignment and environment", "Supplier data sheet, application rating basis, and validation plan"], boundary: "This workflow does not calculate a coupling rating, prescribe a service factor, select a coupling, or approve the drivetrain." },
  { id: "motorGearbox", title: "Motor and gearbox requirements record", scope: "Capture demanded motion, torque, inertia, supply, thermal, control, and installation context before a motor or gearbox comparison.", evidence: ["Target speed range, acceleration, move profile, and duty cycle", "Load torque, inertia basis, reflected-inertia assumptions, and peak/continuous needs", "Supply, controls, feedback, braking, and regenerative-energy constraints", "Ambient, enclosure, mounting, cable, and service environment", "Candidate data sheets and independent thermal/application validation plan"], boundary: "This workflow does not choose a motor, drive, gearbox, brake, or safety function, and it does not establish thermal or application suitability." },
  { id: "linearActuator", title: "Linear actuator requirements record", scope: "Capture force, speed, stroke, duty, mounting, side-load, and positional requirements before a linear actuator comparison.", evidence: ["Force direction, load cases, acceleration, and friction basis", "Stroke, speed, positioning/repeatability, and motion-duty requirements", "Mounting, alignment, side-load/moment, and end-stop constraints", "Environment, ingress, lubrication, cable routing, and maintenance constraints", "Candidate rating data, life/critical-speed limits, and independent validation plan"], boundary: "This workflow does not select an actuator, rail, screw, belt, motor, sensor, or safety system and does not establish life or stability." },
  { id: "gripperEoat", title: "Gripper and EOAT requirements record", scope: "Capture payload, geometry, grip/load cases, acceleration, interfaces, utilities, and failure controls before EOAT comparison.", evidence: ["Part mass, center of gravity, contact geometry, and surface condition", "Required grip/holding load cases, acceleration, orientation, and process forces", "Robot flange interface, payload inertia, reach, and clearance envelope", "Air/vacuum/electrical utilities, sensing, cycle time, and maintenance context", "Failure mode, retention/guarding controls, supplier data, and validation test plan"], boundary: "This workflow does not select grippers, cups, fingers, tooling, vacuum sources, safety factors, or safety controls and does not approve part retention." },
  { id: "robotReachPayload", title: "Robot reach and payload evidence record", scope: "Capture pose envelope, payload, center of gravity, inertia, cycle and collision evidence before robot/system comparison.", evidence: ["All required TCP poses, reach, orientation, and clearance envelope", "Payload mass, center of gravity, inertia, tool changes, and utilities", "Cycle profile, acceleration, duty, process force, and cabling constraints", "Cell boundaries, collision zones, guarding, and recovery constraints", "Candidate robot envelope data and offline/physical validation plan"], boundary: "This workflow does not calculate robot kinematics, select a robot, validate collision-free motion, establish safeguarding, or approve the cell." },
  { id: "reservoir", title: "Hydraulic reservoir requirements record", scope: "Capture fluid, flow, dwell, thermal, contamination, geometry, venting, and maintenance evidence before reservoir comparison.", evidence: ["Fluid type, return flow, residence/dwell target, and operating duty", "Temperature range, heat rejection basis, and cooling/heating constraints", "Contamination control, filtration, deaeration, and breather requirements", "Space, mounting, suction/return layout, level sensing, and service access", "Candidate manufacturer data and system-level validation plan"], boundary: "This workflow does not size a reservoir, prescribe filtration/cooling, select a tank, establish fluid cleanliness, or approve hydraulic-system safety." },
  { id: "fabricationRules", title: "Fabrication-rule evidence record", scope: "Capture material/process-specific evidence for minimum bend radius, hole-to-edge, tooling access, and inspection feasibility before a DFM decision.", evidence: ["Controlled material designation, form, thickness, and condition", "Intended manufacturing process, bend orientation, tooling, and setup basis", "Supplier or controlled process data for radius, edge, and feature constraints", "Feature geometry, tolerances, finish, and inspection-access evidence", "Revision-controlled drawing, deviation process, and validation plan"], boundary: "This workflow does not prescribe minimum bend radius or hole-to-edge values, infer material allowables, select a process/tool, or approve manufacturability." },
  { id: "datumModel", title: "Datum-model evidence record", scope: "Capture functional datum sequence, simulated setup, projected-zone intent, material condition, and datum-shift rationale before drawing or inspection review.", evidence: ["Functional assembly interfaces and datum feature order", "Datum simulators, contact conditions, and inspection setup concept", "Projected-zone requirement, extent, and fastener/feature rationale", "Material-condition modifiers, permitted datum shift, and drawing references", "Inspection strategy, CMM/fixture record, and controlled review approval path"], boundary: "This workflow does not construct a GD&T tolerance zone, calculate datum shift, interpret a feature-control frame, validate inspection programming, or establish drawing compliance." },
  { id: "cmmDeviation", title: "CMM deviation evidence record", scope: "Capture manual point/deviation inputs, alignment, datum frame, sampling, probe, uncertainty, and result-record context before inspection evaluation.", evidence: ["Controlled part/drawing revision and inspected feature definition", "Alignment strategy, datum reference frame, and setup/fixturing record", "Point/sample plan, probe/stylus configuration, filter, and temperature context", "Raw deviations, reported extrema/position result, and uncertainty basis", "Program revision, calibration/verification status, and independent disposition path"], boundary: "This workflow does not process point clouds, reconstruct minimum zones, calculate true position from raw CMM data, determine conformity, or approve an inspection result." },
  { id: "beltChainDrive", title: "Belt, timing-belt, and chain-drive evidence record", scope: "Capture declared speed ratio, transmitted duty, geometry, environment, alignment/tension or lubrication, and catalogue evidence before a belt, timing-belt, or chain-drive comparison.", evidence: ["Input/output speed, ratio, power or torque basis, starts/stops, reversals, and duty cycle", "Center distance, shaft geometry, space envelope, layout, wrap/engagement, and adjustment range", "Declared peak/steady load, acceleration, shock, vibration, and service environment", "Alignment, tensioning or slack, lubrication, guarding, and maintenance requirements", "Candidate controlled catalogue/data-sheet limits and independent installation/life validation plan"], boundary: "This workflow does not calculate or prescribe a service factor, select a belt, chain, pulley, sprocket, or tensioner, determine rating/life, establish installation suitability, or approve a drive." },
  { id: "pneumaticValveFlow", title: "Pneumatic valve and flow evidence record", scope: "Capture supply/exhaust conditions, flow basis, cylinder demand, tubing, valve interfaces, environment, and controlled candidate data before any pneumatic-valve comparison.", evidence: ["Supply, pilot, exhaust, and downstream pressure basis with stated absolute/gauge convention", "Cylinder bore/rod/stroke, required speed, cycle/duty, and declared air-volume basis", "Actual versus standard flow convention, tube length/inside diameter, and fitting/network context", "Valve function, ports, coil/pilot/supply constraints, response expectations, and electrical interface", "Environment, air quality, mounting, maintenance, controlled candidate data, and independent circuit validation plan"], boundary: "This workflow does not calculate compressible flow, sonic conductance, pressure-drop allowance, or circuit capacity; it does not select a valve, establish pneumatic-system suitability, or approve a pneumatic system." },
  { id: "architectureComparison", title: "Architecture-comparison evidence record", scope: "Capture functional decomposition, interfaces, alternatives, constraints, risks, verification, and lifecycle context before using the visible user-scored comparison matrix.", evidence: ["Functional decomposition, use scenarios, external interfaces, and explicit exclusions", "Named architecture alternatives with boundaries, dependencies, and single-point-of-failure context", "Load, timing, power, controls, data, environment, service, and maintainability constraints", "Declared risks, unknowns, change triggers, and mitigation evidence without risk acceptance inference", "Verification approach, ownership, decision record, and controlled assumptions/sources"], boundary: "This workflow does not generate alternatives, calculate architecture performance, validate integration, select an architecture, establish safety, or approve a decision." },
];

export type TradeInput = { weight: number; optionA: number; optionB: number };
export type TradeResult = { scoreA: number; scoreB: number; weightTotal: number; normalizedA: number; normalizedB: number };
export type FmeaInput = { severity: number; occurrence: number; detection: number };
export type FmeaResult = { rpn: number; severityShare: number; occurrenceShare: number; detectionShare: number };

export const calculateTradeStudy = (inputs: TradeInput[]): TradeResult => {
  if (!inputs.length) throw new Error("Add at least one criterion.");
  const weightTotal = inputs.reduce((sum, input) => sum + input.weight, 0);
  if (!Number.isFinite(weightTotal) || weightTotal <= 0) throw new Error("Weights must sum to a positive finite value.");
  for (const input of inputs) {
    if (![input.weight, input.optionA, input.optionB].every(Number.isFinite)) throw new Error("Every weight and score must be finite.");
    if (input.weight < 0 || input.optionA < 0 || input.optionB < 0 || input.optionA > 10 || input.optionB > 10) throw new Error("Weights must be non-negative and option scores must be from 0 to 10.");
  }
  const scoreA = inputs.reduce((sum, input) => sum + input.weight * input.optionA, 0);
  const scoreB = inputs.reduce((sum, input) => sum + input.weight * input.optionB, 0);
  return { scoreA, scoreB, weightTotal, normalizedA: scoreA / weightTotal, normalizedB: scoreB / weightTotal };
};

export const calculateFmea = ({ severity, occurrence, detection }: FmeaInput): FmeaResult => {
  if (![severity, occurrence, detection].every(Number.isFinite)) throw new Error("Severity, occurrence, and detection ratings must be finite.");
  if (![severity, occurrence, detection].every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 10)) throw new Error("Each FMEA rating must be an integer from 1 to 10.");
  const rpn = severity * occurrence * detection;
  return { rpn, severityShare: severity / 10, occurrenceShare: occurrence / 10, detectionShare: detection / 10 };
};
