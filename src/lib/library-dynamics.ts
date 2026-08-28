import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Dynamics and motion models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const dynamicsDocuments: Record<string, InstrumentDocument> = {
  brakingDuty: libraryDoc("brakingDuty", {
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
      { id: "peakPower", label: "Declared peak braking power", family: "power", defaultUnit: "kW", expression: "(drivePower*brakeTorqueMultiplier)*1000" },
      { id: "dutyRatio", label: "Declared braking-duty ratio", defaultUnit: "%", expression: "brakingTime/cycleTime*100" },
      { id: "derivedResistance", label: "Source-relation derived resistance", family: "resistance", defaultUnit: "Ω", expression: "dcBusVoltage^2/(drivePower*1000*brakeTorqueMultiplier)" },
      { id: "peakCurrent", label: "Source-relation peak braking current", family: "current", defaultUnit: "A", expression: "sqrt((drivePower*1000*brakeTorqueMultiplier)/(dcBusVoltage^2/(drivePower*1000*brakeTorqueMultiplier)))" },
      { id: "averageWattage", label: "Source-relation average braking wattage", family: "power", defaultUnit: "kW", expression: "(drivePower*brakeTorqueMultiplier*(brakingTime/cycleTime)*lookup(avgFactor, regenerationType))*1000" },
    ],
    formula: "PW = MW·BT · R = Vdc²/PW · DC = tb/tc · DBRW = PW·DC·(1/2 normal, 1 overhauling)",
    warnings: ["This applies the cited declared-power, brake-torque multiplier, DC-bus voltage, and time-duty relations for the selected source arithmetic mode. It does not select a drive, resistor, minimum resistance, current limit, braking torque, regeneration type, enclosure, protection, wiring, thermal rating, deceleration profile, energy recovery, safety, suitability, or approval."],
  }),
  flywheelEnergy: libraryDoc("flywheelEnergy", {
    fields: [
      { id: "inertia", label: "Declared rotational inertia", symbol: "I", help: "User-entered inertia about the stated rotation axis; geometry is not derived.", defaultValue: 0.8, defaultUnit: "kg·m²" },
      { id: "initialSpeed", label: "Declared initial speed", symbol: "n₁", help: "Initial non-negative speed magnitude for the stated rigid body.", defaultValue: 600, defaultUnit: "rpm", signed: true },
      { id: "finalSpeed", label: "Declared final speed", symbol: "n₂", help: "Final non-negative speed magnitude for the stated rigid body.", defaultValue: 1800, defaultUnit: "rpm", signed: true },
    ],
    outputs: [
      { id: "initialAngularSpeed", label: "Initial angular speed", family: "angularSpeed", defaultUnit: "rad/s", expression: "initialSpeed*2*pi/60" },
      { id: "finalAngularSpeed", label: "Final angular speed", family: "angularSpeed", defaultUnit: "rad/s", expression: "finalSpeed*2*pi/60" },
      { id: "initialEnergy", label: "Initial rotational kinetic energy", defaultUnit: "kJ", expression: "0.5*inertia*(initialSpeed*2*pi/60)^2/1000" },
      { id: "finalEnergy", label: "Final rotational kinetic energy", defaultUnit: "kJ", expression: "0.5*inertia*(finalSpeed*2*pi/60)^2/1000" },
      { id: "energyChange", label: "Final minus initial energy", defaultUnit: "kJ", expression: "(0.5*inertia*(finalSpeed*2*pi/60)^2-0.5*inertia*(initialSpeed*2*pi/60)^2)/1000" },
    ],
    formula: "ω = 2πn/60 · E = ½Iω² · ΔE = E2 − E1",
    warnings: ["This is a rigid-body two-state rotational kinetic-energy calculation. It excludes rotating-body stress, containment, balance, overspeed, acceleration torque, transient dynamics, losses, material selection, safety, and approval."],
  }),
  kinetic: libraryDoc("kinetic", {
    fields: [
      { id: "mass", label: "Mass", symbol: "m", help: "Constant translating mass.", family: "mass", defaultValue: 1000, defaultUnit: "kg" },
      { id: "speed", label: "Speed", symbol: "v", help: "Classical translational speed magnitude.", family: "speed", defaultValue: 20, defaultUnit: "m/s", signed: true }
    ],
    outputs: [
      { id: "energy", label: "Kinetic energy", family: "energy", defaultUnit: "kJ", expression: "0.5*mass*speed^2" },
      { id: "energyJ", label: "Kinetic energy", family: "energy", defaultUnit: "J", expression: "0.5*mass*speed^2" },
      { id: "momentum", label: "Momentum magnitude", defaultUnit: "kg·m/s", expression: "mass*speed" }
    ],
    formula: "KE = ½mv² · p = mv",
    warnings: ["This is the classical translational relationship. It excludes rotational energy, deformation, drag, gradients, and relativistic behavior."],
  }),
  motorOperatingPoint: libraryDoc("motorOperatingPoint", {
    fields: [
      { id: "motorClass", label: "Declared motor class", help: "User-classified record label only; the same shaft-power relation is applied and no motor class is selected or compared.", defaultValue: 0, defaultUnit: "—", choice: ["servo", "stepper", "ac"], choiceMessage: "Select a supported declared motor class." },
      { id: "shaftTorque", label: "Declared shaft torque", symbol: "T", help: "User-entered steady mechanical shaft torque at the stated operating point.", defaultValue: 5, defaultUnit: "N·m" },
      { id: "shaftSpeed", label: "Declared shaft speed", symbol: "n", help: "User-entered steady rotational speed at the stated operating point.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "referenceTorque", label: "Declared reference torque", symbol: "Tref", help: "User-entered record-specific comparison reference; it is not validated against a motor curve.", defaultValue: 7, defaultUnit: "N·m" },
      { id: "referencePower", label: "Declared reference power", symbol: "Pref", help: "User-entered record-specific comparison reference; it is not validated against a motor rating.", defaultValue: 1.2, defaultUnit: "kW" },
    ],
    outputs: [
      { id: "angularSpeed", label: "Declared shaft angular speed", family: "angularSpeed", defaultUnit: "rad/s", expression: "shaftSpeed*2*pi/60" },
      { id: "shaftPower", label: "Literal mechanical shaft power", family: "power", defaultUnit: "kW", expression: "(shaftTorque*shaftSpeed*2*pi/60/1000)*1000" },
      { id: "torqueReferenceRatio", label: "Declared torque / reference-torque ratio", defaultUnit: "—", expression: "shaftTorque/referenceTorque" },
      { id: "powerReferenceRatio", label: "Literal shaft-power / reference-power ratio", defaultUnit: "—", expression: "(shaftTorque*shaftSpeed*2*pi/60)/(referencePower*1000)" },
    ],
    formula: "Pshaft = T·ω = T·n·2π/60 · rT = T/Tref · rP = Pshaft/Pref",
    warnings: ["This applies the mechanical shaft-power relation to a user-classified servo, stepper, or AC motor record, then reports literal ratios to user-entered references. It does not compare motor types; select a motor/drive; predict torque-speed, holding, pull-out, overload, voltage/current, control, thermal, duty, efficiency, safety, suitability, or approval."],
  }),
  newton: libraryDoc("newton", {
    fields: [
      { id: "mass", label: "Mass", symbol: "m", help: "Constant mass in the selected inertial-frame calculation.", family: "mass", defaultValue: 10, defaultUnit: "kg" },
      { id: "acceleration", label: "Acceleration", symbol: "a", help: "Signed one-dimensional acceleration; positive is the displayed positive direction.", family: "acceleration", defaultValue: 2.5, defaultUnit: "m/s²", signed: true }
    ],
    outputs: [
      { id: "force", label: "Net force", family: "force", defaultUnit: "N", expression: "mass*acceleration" },
      { id: "forceKilo", label: "Net force", family: "force", defaultUnit: "kN", expression: "mass*acceleration" },
      { id: "accelerationG", label: "Acceleration magnitude", family: "acceleration", defaultUnit: "g", expression: "(abs(acceleration)/9.80665)*9.80665" }
    ],
    formula: "Fnet = ma",
    warnings: ["This is a net-force relationship in a stated inertial-frame context. It does not resolve individual loads, friction, gravity components, constraints, or a free-body diagram."],
  }),
  rmsDutyTorque: libraryDoc("rmsDutyTorque", {
    fields: [
      { id: "torque1", label: "Declared segment 1 torque", symbol: "T1", help: "Signed torque held constant for the stated first duration; zero and negative values are permitted.", family: "torque", defaultValue: 8, defaultUnit: "N·m", signed: true },
      { id: "duration1", label: "Declared segment 1 duration", symbol: "t1", help: "Positive duration of the first user-defined duty segment.", family: "time", defaultValue: 1, defaultUnit: "s" },
      { id: "torque2", label: "Declared segment 2 torque", symbol: "T2", help: "Signed torque held constant for the stated second duration; zero and negative values are permitted.", family: "torque", defaultValue: 3, defaultUnit: "N·m", signed: true },
      { id: "duration2", label: "Declared segment 2 duration", symbol: "t2", help: "Positive duration of the second user-defined duty segment.", family: "time", defaultValue: 2, defaultUnit: "s" },
      { id: "torque3", label: "Declared segment 3 torque", symbol: "T3", help: "Signed torque held constant for the stated third duration; zero and negative values are permitted.", family: "torque", defaultValue: -4, defaultUnit: "N·m", signed: true },
      { id: "duration3", label: "Declared segment 3 duration", symbol: "t3", help: "Positive duration of the third user-defined duty segment.", family: "time", defaultValue: 1, defaultUnit: "s" }
    ],
    outputs: [
      { id: "cycleTime", label: "Declared duty-cycle time", family: "time", defaultUnit: "s", expression: "duration1+duration2+duration3" },
      { id: "rmsTorque", label: "Declared RMS torque", family: "torque", defaultUnit: "N·m", expression: "sqrt((torque1^2*duration1+torque2^2*duration2+torque3^2*duration3)/(duration1+duration2+duration3))" },
      { id: "absolutePeakTorque", label: "Declared absolute peak torque", family: "torque", defaultUnit: "N·m", expression: "max(abs(torque1),abs(torque2),abs(torque3))" },
      { id: "signedMeanTorque", label: "Declared signed mean torque", family: "torque", defaultUnit: "N·m", expression: "(torque1*duration1+torque2*duration2+torque3*duration3)/(duration1+duration2+duration3)" }
    ],
    formula: "Trms = √[(T1²t1 + T2²t2 + T3²t3)/(t1 + t2 + t3)]",
    warnings: ["This applies a three-segment root-mean-square torque relation to user-entered constant torque/time values. It does not derive an axis motion profile or load, determine motor/drive thermal capacity, compare torque-speed curves, infer a duty cycle, select a motor/drive, establish safety, suitability, or approval."],
  }),
  rotaryIndexing: libraryDoc("rotaryIndexing", {
    fields: [
      { id: "indexAngle", label: "Declared index angle", symbol: "α", help: "User-entered angular displacement for one index; position accuracy and the motion profile are excluded.", defaultValue: 60, defaultUnit: "deg" },
      { id: "moveTime", label: "Declared move time", symbol: "tmove", help: "User-entered time for the index motion only; dwell and process timing are excluded.", defaultValue: 0.5, defaultUnit: "s" },
      { id: "systemInertia", label: "Declared table-plus-load inertia", symbol: "I", help: "User-entered rotational inertia about the declared indexing axis; geometry, gearing, and motor inertia are not derived.", defaultValue: 0.05, defaultUnit: "kg·m²" },
    ],
    outputs: [
      { id: "indexAngleRad", label: "Declared index angle in radians", family: "angle", defaultUnit: "rad", expression: "indexAngle*pi/180" },
      { id: "averageAngularSpeed", label: "Ideal average angular speed", family: "angularSpeed", defaultUnit: "rad/s", expression: "(indexAngle*pi/180)/moveTime" },
      { id: "indexesPerMinute", label: "Literal move-only index rate", defaultUnit: "indexes/min", expression: "60/moveTime" },
      { id: "kineticEnergy", label: "Rotational kinetic energy at average speed", family: "energy", defaultUnit: "J", expression: "0.5*systemInertia*((indexAngle*pi/180)/moveTime)^2" },
    ],
    formula: "θ = α·π/180 · ωavg = θ/tmove · rate(move-only) = 60/tmove · KE = ½Iωavg²",
    warnings: ["This applies only declared index-angle, move-time, and table-plus-load-inertia arithmetic. It excludes acceleration profile, peak/RMS torque, friction, gearing, motor/table selection, capacity, position accuracy, dwell/process timing, safety, suitability, and approval."],
  }),
  screwCriticalSpeed: libraryDoc("screwCriticalSpeed", {
    fields: [
      { id: "rootDiameter", label: "Declared screw root diameter", symbol: "dr", help: "User-entered minor/root diameter of the stated rotating screw; nominal diameter is not substituted.", family: "length", defaultValue: 16, defaultUnit: "mm" },
      { id: "unsupportedLength", label: "Declared unsupported length", symbol: "L", help: "Distance between the stated bearing supports; end conditions and support selection are not inferred.", family: "length", defaultValue: 800, defaultUnit: "mm" },
      { id: "endFixityFactor", label: "Declared end-fixity factor", symbol: "Cs", help: "User-entered factor matched to the stated support condition from a controlled source; no support-factor lookup is performed.", family: "dimensionless", defaultValue: 1, defaultUnit: "1" },
      { id: "operatingSpeed", label: "Declared operating speed", symbol: "n", help: "User-entered steady screw speed used only for a literal ratio to the calculated critical speed.", family: "frequency", defaultValue: 1200, defaultUnit: "rpm" }
    ],
    outputs: [
      { id: "criticalSpeed", label: "Calculated critical speed", family: "frequency", defaultUnit: "rpm", expression: "(endFixityFactor*4.76e6*((rootDiameter/0.001)/25.4)/((unsupportedLength/0.001)/25.4)^2)*0.0166666666666667" },
      { id: "operatingRatio", label: "Declared operating / critical-speed ratio", family: "dimensionless", defaultUnit: "1", expression: "(operatingSpeed/0.0166666666666667)/(endFixityFactor*4.76e6*((rootDiameter/0.001)/25.4)/((unsupportedLength/0.001)/25.4)^2)" },
      { id: "rootToLengthRatio", label: "Declared root-diameter / unsupported-length ratio", family: "dimensionless", defaultUnit: "1", expression: "(rootDiameter/0.001)/(unsupportedLength/0.001)" }
    ],
    formula: "ncrit = Cs·4.76×10⁶·dr(in)/L(in)² · r = ndeclared/ncrit",
    warnings: ["This applies the cited manufacturer critical-speed relation with user-entered root diameter, unsupported length, and end-fixity factor. It does not select a screw, bearing support, or fixity factor; predict actual shaft whirl/resonance; model straightness, preload, bearing stiffness, buckling, acceleration, drive control, load, fatigue, life, safety factor, suitability, or approval."],
  }),
};
