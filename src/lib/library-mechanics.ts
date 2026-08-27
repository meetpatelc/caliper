import type { InstrumentDocument } from "@/lib/document";
import { libraryDoc } from "@/lib/library-doc";

/** Structural and machine mechanics models. Catalog owns the prose; each entry owns its fields, expressions and warnings. */
export const mechanicsDocuments: Record<string, InstrumentDocument> = {
  ballScrewLife: libraryDoc("ballScrewLife", {
    fields: [
      { id: "dynamicRating", label: "Declared axial dynamic rating", symbol: "Ca", help: "User-entered basic axial dynamic load rating for one identified ball screw.", defaultValue: 18000, defaultUnit: "N" },
      { id: "axialLoad", label: "Declared applied axial load", symbol: "Fa", help: "User-entered constant axial load in the stated direction; equivalent load is not derived.", defaultValue: 6000, defaultUnit: "N" },
      { id: "lead", label: "Declared screw lead", symbol: "Ph", help: "User-entered linear travel per revolution for the stated ball screw.", defaultValue: 10, defaultUnit: "mm/rev" },
      { id: "speed", label: "Declared screw speed", symbol: "n", help: "User-entered rotating speed used only for literal time conversion.", defaultValue: 1200, defaultUnit: "rpm" },
      { id: "travelFraction", label: "Declared travel-time fraction", symbol: "ftravel", help: "Percent of elapsed time at the declared rotating travel condition, from greater than 0 through 100.", defaultValue: 40, defaultUnit: "%" },
    ],
    outputs: [
      { id: "nominalLifeRevolutions", label: "Nominal life", defaultUnit: "rev", expression: "((((dynamicRating)/(axialLoad)))^(3)*1e6)" },
      { id: "idealTravelDistance", label: "Ideal travel distance", defaultUnit: "km", expression: "(((((dynamicRating)/(axialLoad)))^(3)*1e6)*(lead)/1e6)" },
      { id: "rotatingTimeHours", label: "Literal rotating time", defaultUnit: "h", expression: "(((((dynamicRating)/(axialLoad)))^(3)*1e6)/((speed)*60))" },
      { id: "literalElapsedTimeHours", label: "Literal elapsed time at declared travel fraction", defaultUnit: "h", expression: "((((((dynamicRating)/(axialLoad)))^(3)*1e6)/((speed)*60))/((travelFraction)/100))" },
      { id: "ratingToLoadRatio", label: "Declared dynamic-rating / axial-load ratio", defaultUnit: "—", expression: "((dynamicRating)/(axialLoad))" },
    ],
    formula: "L10 = (Ca/Fa)³·10⁶ rev · s = L10·Ph · telapsed = L10/[60n·ftravel]",
    warnings: ["This applies the cited constant-direction axial ball-screw nominal-life relation using user-entered dynamic rating and axial load, then makes ideal lead/speed/travel-fraction conversions. It does not derive equivalent loads, model shocks, vibration, fluctuating duty, mounting, lubrication, alignment, preload, screw/nut selection, safety, suitability, or approval."],
  }),
  ballScrewSizing: libraryDoc("ballScrewSizing", {
    fields: [
      { id: "axialForce", label: "Declared axial force", symbol: "Fa", help: "Steady axial force at the screw; preload, bearing, and seal torques are excluded.", defaultValue: 2500, defaultUnit: "N" },
      { id: "lead", label: "Screw lead", symbol: "P", help: "Linear travel per revolution for the stated screw, not inferred from pitch or starts.", defaultValue: 10, defaultUnit: "mm/rev" },
      { id: "speed", label: "Screw speed", symbol: "n", help: "Steady screw speed used only for ideal linear-speed and mechanical-power arithmetic.", defaultValue: 1200, defaultUnit: "rpm" },
      { id: "efficiency", label: "Declared screw efficiency", symbol: "η", help: "User-entered transmission efficiency; this workspace does not select or validate it.", defaultValue: 90, defaultUnit: "%" },
    ],
    outputs: [
      { id: "linearSpeed", label: "Ideal linear speed", family: "speed", defaultUnit: "m/s", expression: "((lead)*(speed)/60000)" },
      { id: "torque", label: "Declared-efficiency drive torque", family: "torque", defaultUnit: "N·m", expression: "((axialForce)*(lead)/1000/(2*pi*((efficiency)/100)))" },
      { id: "power", label: "Mechanical drive power", defaultUnit: "kW", expression: "(((axialForce)*(lead)/1000/(2*pi*((efficiency)/100)))*2*pi*(speed)/60/1000)" },
    ],
    formula: "v = Pn/60000 · T = FaP/(2πη) · Pmech = Tω",
    warnings: ["This is a steady lead-torque screen for a user-defined ball screw. It excludes preload, bearing and seal torque, drive inertia, acceleration/deceleration, critical speed, buckling, deflection, column load, screw/nut selection, life, lubrication, backlash, thermal effects, motor or gearbox selection, controls, safety, and system approval."],
  }),
  beam: libraryDoc("beam", {
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
  bearingAdjustedLife: libraryDoc("bearingAdjustedLife", {
    fields: [
      { id: "dynamicRating", label: "Declared dynamic rating", symbol: "C", help: "User-entered basic dynamic load rating for the stated bearing configuration.", family: "force", defaultValue: 25, defaultUnit: "kN" },
      { id: "equivalentLoad", label: "Declared equivalent load", symbol: "P", help: "User-entered equivalent dynamic load; factor selection and load derivation are excluded.", family: "force", defaultValue: 5, defaultUnit: "kN" },
      { id: "lifeExponent", label: "Declared life exponent", symbol: "p", help: "Use a stated matched exponent; 3 for ball or 10/3 for roller is not selected here.", family: "dimensionless", defaultValue: 3, defaultUnit: "1" },
      { id: "reliabilityFactor", label: "Declared reliability factor", symbol: "a₁", help: "User-entered scalar from the stated governing source and reliability basis.", family: "dimensionless", defaultValue: 1, defaultUnit: "1" },
      { id: "materialFactor", label: "Declared material factor", symbol: "a₂", help: "User-entered scalar for the stated material/process condition; no lookup is used.", family: "dimensionless", defaultValue: 1, defaultUnit: "1" },
      { id: "otherFactor", label: "Declared other-life factor", symbol: "a₃", help: "User-entered scalar for stated operating effects; no condition is inferred.", family: "dimensionless", defaultValue: 1, defaultUnit: "1" },
      { id: "speed", label: "Declared rotating speed", symbol: "n", help: "Constant speed used only to convert stated revolutions to operating hours.", family: "frequency", defaultValue: 1200, defaultUnit: "rpm" }
    ],
    outputs: [
      { id: "basicLifeMillion", label: "Basic rating life", defaultUnit: "million rev", expression: "((dynamicRating/1000)/(equivalentLoad/1000))^lifeExponent" },
      { id: "combinedFactor", label: "Product of declared life factors", family: "dimensionless", defaultUnit: "1", expression: "reliabilityFactor*materialFactor*otherFactor" },
      { id: "adjustedLifeMillion", label: "Declared-factor adjusted rating life", defaultUnit: "million rev", expression: "((dynamicRating/1000)/(equivalentLoad/1000))^lifeExponent*reliabilityFactor*materialFactor*otherFactor" },
      { id: "adjustedLifeHours", label: "Declared-factor adjusted operating life", defaultUnit: "h", expression: "(((dynamicRating/1000)/(equivalentLoad/1000))^lifeExponent*reliabilityFactor*materialFactor*otherFactor)*1e6/((speed/0.0166666666666667)*60)" }
    ],
    formula: "L10 = (C/P)^p · Ladj = L10·a1·a2·a3 · hours = Ladj·10^6/(60n)",
    warnings: ["This is a basic rating-life calculation with all reliability, material, and other factors supplied by the user. It is not a bearing selection, factor lookup, reliability prediction, variable-duty, misalignment, lubrication, temperature, mounting, static-adequacy, safety, or approval analysis."],
  }),
  bearingLife: libraryDoc("bearingLife", {
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
  bearingLoad: libraryDoc("bearingLoad", {
    fields: [
      { id: "radialLoad", label: "Radial load", help: "User-entered constant radial bearing load for the stated condition.", defaultValue: 2000, defaultUnit: "N", signed: true },
      { id: "axialLoad", label: "Axial load", help: "User-entered constant axial bearing load for the stated condition.", defaultValue: 800, defaultUnit: "N", signed: true },
      { id: "radialFactor", label: "Radial factor", help: "User-entered bearing-specific radial factor; this screen does not select X.", defaultValue: 0.56, defaultUnit: "—", signed: true },
      { id: "axialFactor", label: "Axial factor", help: "User-entered bearing-specific axial factor; this screen does not select Y.", defaultValue: 1.6, defaultUnit: "—", signed: true },
      { id: "targetLife", label: "Target basic rating life", help: "Requested basic rating life in millions of revolutions for reverse-rating arithmetic.", defaultValue: 20, defaultUnit: "10⁶ rev" },
      { id: "lifeExponent", label: "Life exponent", help: "User-entered bearing-type exponent for basic rating-life arithmetic.", defaultValue: 3, defaultUnit: "—" },
      { id: "staticRating", label: "Static load rating", help: "User-entered catalog static load rating; no catalog selection occurs here.", defaultValue: 18000, defaultUnit: "N" },
      { id: "staticEquivalentLoad", label: "Static equivalent load", help: "User-entered static equivalent load for the stated peak/load case.", defaultValue: 4500, defaultUnit: "N" },
      { id: "bore", label: "Bearing bore", help: "Bearing bore for the DN arithmetic only.", defaultValue: 35, defaultUnit: "mm" },
      { id: "speed", label: "Rotational speed", help: "Rotational speed for the DN arithmetic only.", defaultValue: 1800, defaultUnit: "rpm" },
      { id: "dnLimit", label: "User-stated DN limit", help: "User-entered catalog/process DN limit for comparison only.", defaultValue: 100000, defaultUnit: "mm·rpm" },
      { id: "preload", label: "Declared axial preload", help: "User-entered preload shown only as a ratio of the stated equivalent load.", defaultValue: 300, defaultUnit: "N", signed: true },
    ],
    outputs: [
      { id: "equivalentLoad", label: "Equivalent dynamic load", family: "force", defaultUnit: "N", expression: "radialFactor*radialLoad+axialFactor*axialLoad" },
      { id: "requiredDynamicRating", label: "Required basic dynamic rating", family: "force", defaultUnit: "N", expression: "(radialFactor*radialLoad+axialFactor*axialLoad)*targetLife^(1/lifeExponent)" },
      { id: "staticRatio", label: "Static rating ratio C0/P0", defaultUnit: "—", expression: "staticRating/staticEquivalentLoad" },
      { id: "dn", label: "DN value", defaultUnit: "mm·rpm", expression: "bore*speed" },
      { id: "dnRatio", label: "DN / user-stated limit", defaultUnit: "%", expression: "bore*speed/dnLimit*100" },
      { id: "preloadRatio", label: "Preload / equivalent-load ratio", defaultUnit: "%", expression: "preload/(radialFactor*radialLoad+axialFactor*axialLoad)*100" },
    ],
    formula: "P = XFr + YFa · Creq = P·L10^(1/p) · static ratio = C0/P0 · DN = d·n",
    warnings: ["This is constant-load basic rating arithmetic using user-entered bearing-specific X/Y factors, exponent, static load, and DN limit. It does not select a bearing, provide factor or limit values, model variable duty, use a modified-life method, assess lubricant/contamination/temperature, determine preload or stiffness, assess static adequacy, or replace a bearing manufacturer calculation."],
  }),
  beltAxis: libraryDoc("beltAxis", {
    fields: [
      { id: "mass", label: "Moved mass", symbol: "m", help: "Declared total translated load, including the relevant belt mass where applicable.", defaultValue: 30, defaultUnit: "kg" },
      { id: "friction", label: "Declared guide friction coefficient", symbol: "μ", help: "User-entered guide friction coefficient from 0 through 1; it is not selected by this workspace.", defaultValue: 0.02, defaultUnit: "—", signed: true },
      { id: "pulleyDiameter", label: "Drive-pulley pitch diameter", symbol: "dp", help: "Declared effective drive-pulley diameter; belt tooth engagement and bend limits are excluded.", defaultValue: 60, defaultUnit: "mm" },
      { id: "linearSpeed", label: "Requested linear speed", symbol: "v", help: "Steady requested belt speed used only for pulley rpm and mechanical-power arithmetic.", defaultValue: 1.5, defaultUnit: "m/s" },
      { id: "efficiency", label: "Declared belt-axis efficiency", symbol: "η", help: "User-entered transmission efficiency; this workspace does not select or validate it.", defaultValue: 92, defaultUnit: "%" },
    ],
    outputs: [
      { id: "steadyForce", label: "Steady guide-friction force", family: "force", defaultUnit: "N", expression: "((mass)*9.80665*(friction))" },
      { id: "rpm", label: "Drive-pulley speed", defaultUnit: "rpm", expression: "((linearSpeed)/(pi*(pulleyDiameter)/1000)*60)" },
      { id: "torque", label: "Declared-efficiency drive torque", family: "torque", defaultUnit: "N·m", expression: "(((mass)*9.80665*(friction))*(pulleyDiameter)/2000/((efficiency)/100))" },
      { id: "power", label: "Mechanical linear power", defaultUnit: "kW", expression: "(((mass)*9.80665*(friction))*(linearSpeed)/1000)" },
    ],
    formula: "Fa = mgμ · np = 60v/(πdp) · T = Fadp/(2η) · P = Fav",
    warnings: ["This is a horizontal, steady-speed belt-axis screen using user-entered guide friction and efficiency. It excludes acceleration, belt stretch and tension, tooth engagement, pulley/belt selection, external process load, vertical/gravity axes, inertia, positioning accuracy, rail load, thermal/duty limits, motor or gearbox selection, controls, safety, and system approval."],
  }),
  beltTension: libraryDoc("beltTension", {
    fields: [
      { id: "driveTorque", label: "Declared drive torque", symbol: "T", help: "User-entered torque transmitted at the stated pulley/sprocket pitch radius.", defaultValue: 120, defaultUnit: "N·m" },
      { id: "pitchRadius", label: "Declared pitch radius", symbol: "rp", help: "User-entered driving pulley or sprocket pitch radius.", defaultValue: 75, defaultUnit: "mm" },
      { id: "looseSideTension", label: "Declared loose-side tension", symbol: "Floose", help: "User-entered stated loose-side tension used only for the literal tight-side sum.", defaultValue: 350, defaultUnit: "N", signed: true },
    ],
    outputs: [
      { id: "drivingTension", label: "Torque-induced driving tension difference", family: "force", defaultUnit: "N", expression: "driveTorque*1000/pitchRadius" },
      { id: "declaredLooseSide", label: "Declared loose-side tension", family: "force", defaultUnit: "N", expression: "looseSideTension" },
      { id: "tightSideTension", label: "Declared tight-side tension sum", family: "force", defaultUnit: "N", expression: "driveTorque*1000/pitchRadius+looseSideTension" },
    ],
    formula: "ΔF = T/rp · Ftight = ΔF + Floose,declared",
    warnings: ["This is a torque-to-driving-tension difference and stated loose-side sum only. It excludes pretension selection, wrap, friction, slip, fatigue, speed capability, bearing loading, belt/chain selection, safety, and approval."],
  }),
  boltLoad: libraryDoc("boltLoad", {
    fields: [
      { id: "diameter", label: "Bolt shank diameter", symbol: "d", help: "Nominal unthreaded shank diameter used for the direct stress screen.", family: "length", defaultValue: 12, defaultUnit: "mm" },
      { id: "tension", label: "Known tensile load", symbol: "Ft", help: "Direct known axial tension carried by this one bolt.", family: "force", defaultValue: 8, defaultUnit: "kN", signed: true },
      { id: "shear", label: "Known shear load", symbol: "Fs", help: "Direct known transverse shear carried by this one bolt.", family: "force", defaultValue: 4, defaultUnit: "kN", signed: true },
      { id: "bearingLoad", label: "Known bearing load", symbol: "Fb", help: "Direct load transferred through one stated bearing interface.", family: "force", defaultValue: 6, defaultUnit: "kN", signed: true },
      { id: "plateThickness", label: "Bearing thickness", symbol: "t", help: "Loaded plate or washer thickness used for projected bearing area.", family: "length", defaultValue: 8, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "tensileStress", label: "Nominal shank tensile stress", family: "stress", defaultUnit: "MPa", expression: "((tension/1000)*1000)/(pi*((diameter/0.001)/1000)^2/4)" },
      { id: "shearStress", label: "Nominal shank shear stress", family: "stress", defaultUnit: "MPa", expression: "((shear/1000)*1000)/(pi*((diameter/0.001)/1000)^2/4)" },
      { id: "bearingStress", label: "Projected bearing stress", family: "stress", defaultUnit: "MPa", expression: "((bearingLoad/1000)*1000)/(((diameter/0.001)/1000)*((plateThickness/0.001)/1000))" },
      { id: "equivalentStress", label: "Plane-stress equivalent", family: "stress", defaultUnit: "MPa", expression: "sqrt((((tension/1000)*1000)/(pi*((diameter/0.001)/1000)^2/4))^2+3*(((shear/1000)*1000)/(pi*((diameter/0.001)/1000)^2/4))^2)" }
    ],
    formula: "σ = Ft/(πd²/4) · τ = Fs/(πd²/4) · σbearing = Fb/(dt)",
    warnings: ["This is a single-bolt, known-direct-load screen using nominal shank and projected bearing areas. It excludes threads/tensile-stress area, preload, joint stiffness, load distribution, eccentricity, friction, slip, prying, washer geometry, proof/yield allowables, fatigue, tear-out, thread stripping, and factor-of-safety conclusions."],
  }),
  boltPreload: libraryDoc("boltPreload", {
    fields: [
      { id: "torque", label: "Applied torque", symbol: "T", help: "Applied tightening torque for the one stated fastener.", defaultValue: 80, defaultUnit: "N·m" },
      { id: "diameter", label: "Nominal diameter", symbol: "D", help: "Nominal bolt shank diameter used in the nut-factor relationship.", defaultValue: 12, defaultUnit: "mm" },
      { id: "nutFactor", label: "Torque coefficient", symbol: "K", help: "User-entered nut factor; friction and lubrication strongly affect it.", defaultValue: 0.2, defaultUnit: "—" },
      { id: "uncertainty", label: "Preload uncertainty", symbol: "±u", help: "User-entered one-sided uncertainty magnitude from 0 to 100.", defaultValue: 25, defaultUnit: "%" },
    ],
    outputs: [
      { id: "preload", label: "Nominal preload", defaultUnit: "kN", expression: "torque/(nutFactor*diameter)" },
      { id: "lower", label: "Estimated lower preload", defaultUnit: "kN", expression: "torque/(nutFactor*diameter)*(1-uncertainty/100)" },
      { id: "upper", label: "Estimated upper preload", defaultUnit: "kN", expression: "torque/(nutFactor*diameter)*(1+uncertainty/100)" },
    ],
    formula: "P = T / (K·D) · uncertainty band = P(1 ± u)",
    warnings: ["Torque is an indirect and friction-sensitive way to create preload. This screen does not determine allowable preload, bolt proof/yield, thread strength, joint stiffness, separation, fatigue, thermal effects, relaxation, lubrication procedure, or a safe tightening specification."],
  }),
  cantileverFrame: libraryDoc("cantileverFrame", {
    fields: [
      { id: "lateralLoad", label: "Declared lateral top load", symbol: "H", help: "Positive lateral-load magnitude at the upper end of the one displayed vertical member.", family: "force", defaultValue: 12000, defaultUnit: "N" },
      { id: "columnHeight", label: "Column height", symbol: "h", help: "Vertical fixed-base-to-load distance of the one displayed cantilever member.", family: "length", defaultValue: 3000, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "baseShear", label: "Base shear magnitude", family: "force", defaultUnit: "N", expression: "lateralLoad" },
      { id: "baseMoment", label: "Base couple-moment magnitude", family: "torque", defaultUnit: "N·m", expression: "lateralLoad*((columnHeight/0.001)/1000)" }
    ],
    formula: "Vbase = H · Mbase = Hh",
    warnings: ["This is one vertical cantilever-frame free-body equilibrium only: a single stated lateral top-load magnitude, base shear, and fixed-base couple moment. It excludes portal-frame redistribution, axial load, member stiffness, deflection, stress, connection behavior, second-order effects, stability, code requirements, safety factors, and approval."],
  }),
  combinedStress: libraryDoc("combinedStress", {
    fields: [
      { id: "axialStress", label: "Axial normal stress", symbol: "σa", help: "Signed normal stress from direct axial loading at the point of interest.", family: "stress", defaultValue: 45, defaultUnit: "MPa", signed: true },
      { id: "bendingStress", label: "Bending normal stress", symbol: "σb", help: "Signed normal stress from bending at the same point and along the same axis.", family: "stress", defaultValue: 75, defaultUnit: "MPa", signed: true },
      { id: "shearStress", label: "In-plane shear stress", symbol: "τxy", help: "Signed in-plane shear stress at the same point.", family: "stress", defaultValue: 30, defaultUnit: "MPa", signed: true }
    ],
    outputs: [
      { id: "normalStress", label: "Combined normal stress σx", family: "stress", defaultUnit: "MPa", expression: "((axialStress/1000000)+(bendingStress/1000000))*1000000" },
      { id: "principal1", label: "First principal stress σ₁", family: "stress", defaultUnit: "MPa", expression: "(((axialStress/1000000)+(bendingStress/1000000))/2+sqrt((((axialStress/1000000)+(bendingStress/1000000))/2)^2+(shearStress/1000000)^2))*1000000" },
      { id: "principal2", label: "Second principal stress σ₂", family: "stress", defaultUnit: "MPa", expression: "(((axialStress/1000000)+(bendingStress/1000000))/2-sqrt((((axialStress/1000000)+(bendingStress/1000000))/2)^2+(shearStress/1000000)^2))*1000000" },
      { id: "maxShear", label: "Maximum in-plane shear", family: "stress", defaultUnit: "MPa", expression: "(sqrt((((axialStress/1000000)+(bendingStress/1000000))/2)^2+(shearStress/1000000)^2))*1000000" },
      { id: "vonMises", label: "Plane-stress von Mises equivalent", family: "stress", defaultUnit: "MPa", expression: "(sqrt(((axialStress/1000000)+(bendingStress/1000000))^2+3*(shearStress/1000000)^2))*1000000" }
    ],
    formula: "σx = σa + σb · σ₁,₂ = σx/2 ± √[(σx/2)² + τxy²] · σvm = √(σx² + 3τxy²)",
    warnings: ["This screen adds user-entered axial and bending normal stresses and combines them with one in-plane shear stress under plane stress. It excludes local stress concentration, multiaxial/through-thickness stress, material allowables, fatigue, buckling, contact, and safety-factor decisions."],
  }),
  compressionSpring: libraryDoc("compressionSpring", {
    fields: [
      { id: "wire", label: "Wire diameter", symbol: "d", help: "Round-wire diameter for the close-coiled spring model.", defaultValue: 4, defaultUnit: "mm" },
      { id: "meanDiameter", label: "Mean coil diameter", symbol: "D", help: "Centerline coil diameter, not outer or inner diameter.", defaultValue: 32, defaultUnit: "mm" },
      { id: "activeCoils", label: "Active coils", symbol: "Na", help: "Number of coils participating in elastic deflection.", defaultValue: 8, defaultUnit: "coils" },
      { id: "shearModulus", label: "Shear modulus", symbol: "G", help: "User-entered material shear modulus at the stated condition.", defaultValue: 79, defaultUnit: "GPa" },
      { id: "deflection", label: "Applied deflection", symbol: "δ", help: "Stated compression from the free configuration.", defaultValue: 12, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "rate", label: "Elementary spring rate", defaultUnit: "N/mm", expression: "shearModulus*1e9*(wire/1000)^4/(8*(meanDiameter/1000)^3*activeCoils)/1000" },
      { id: "force", label: "Ideal spring force", family: "force", defaultUnit: "N", expression: "shearModulus*1e9*(wire/1000)^4/(8*(meanDiameter/1000)^3*activeCoils)*(deflection/1000)" },
      { id: "springIndex", label: "Spring index D/d", defaultUnit: "—", expression: "meanDiameter/wire" },
      { id: "shearStress", label: "Uncorrected wire torsional shear", defaultUnit: "MPa", expression: "8*(shearModulus*1e9*(wire/1000)^4/(8*(meanDiameter/1000)^3*activeCoils)*(deflection/1000))*(meanDiameter/1000)/(pi*(wire/1000)^3)/1e6" },
    ],
    formula: "k = Gd⁴/(8D³Na) · F = kδ · τbasic = 8FD/(πd³)",
    warnings: ["This is an elementary close-coiled round-wire spring screen. It excludes Wahl/direct-shear correction, end condition, solid height, buckling, coil clash, residual stress, material allowables, fatigue, relaxation, corrosion, temperature, dynamics, and spring selection."],
  }),
  conveyorLine: libraryDoc("conveyorLine", {
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
  couplingTorsion: libraryDoc("couplingTorsion", {
    fields: [
      { id: "torque", label: "Declared transmitted torque", symbol: "T", help: "User-entered torque at the stated coupling operating point; transient duty is excluded.", defaultValue: 250, defaultUnit: "N·m" },
      { id: "torsionalStiffness", label: "Declared torsional stiffness", symbol: "kt", help: "User-entered linear coupling torsional stiffness; geometry and supplier data are not inferred.", defaultValue: 12000, defaultUnit: "N·m/rad" },
    ],
    outputs: [
      { id: "twistRad", label: "Declared elastic twist", family: "angle", defaultUnit: "rad", expression: "torque/torsionalStiffness" },
      { id: "twistDeg", label: "Declared elastic twist", defaultUnit: "deg", expression: "torque/torsionalStiffness*180/pi" },
      { id: "storedEnergy", label: "Linear elastic stored energy", family: "energy", defaultUnit: "J", expression: "torque^2/(2*torsionalStiffness)" },
    ],
    formula: "θ = T/kt · U = T²/(2kt)",
    warnings: ["This is declared linear torsional stiffness arithmetic for a coupling. It excludes coupling selection, torque capacity, flexible-element geometry, fatigue, resonance, damping, misalignment, shaft/bearing loads, safety, and approval."],
  }),
  deflectionCheck: libraryDoc("deflectionCheck", {
    fields: [
      { id: "declaredDeflection", label: "Declared calculated deflection", symbol: "δ", help: "User-entered deflection from a separately established model; no load model is inferred.", defaultValue: 5, defaultUnit: "mm", signed: true },
      { id: "span", label: "Declared reference span", symbol: "L", help: "User-entered span associated with the stated deflection reference.", defaultValue: 2400, defaultUnit: "mm" },
      { id: "referenceDenominator", label: "Declared reference denominator", symbol: "nref", help: "User-entered scalar such as 240 or 360; this workspace does not select a requirement.", defaultValue: 360, defaultUnit: "—" },
    ],
    outputs: [
      { id: "referenceDeflection", label: "Declared-reference deflection", defaultUnit: "mm", expression: "((span)/(referenceDenominator))" },
      { id: "deflectionRatio", label: "Declared deflection / reference", defaultUnit: "—", expression: "((declaredDeflection)/((span)/(referenceDenominator)))" },
      { id: "arithmeticDifference", label: "Reference minus declared deflection", defaultUnit: "mm", expression: "(((span)/(referenceDenominator))-(declaredDeflection))" },
    ],
    formula: "δreference = L / nreference · ratio = δdeclared / δreference",
    warnings: ["This compares a user-entered calculated deflection to a user-entered span/reference denominator. It does not select a limit, validate the upstream deflection model, establish a serviceability requirement, judge adequacy, apply a code, or approve a design."],
  }),
  dimensionCheck: libraryDoc("dimensionCheck", {
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
  driveRatio: libraryDoc("driveRatio", {
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
      { id: "outputTorque", label: "Output torque with stated efficiency", family: "torque", defaultUnit: "N·m", expression: "inputTorque*(drivenMeasure/driverMeasure)*efficiency/100" },
      { id: "pitchLineSpeed", label: "Driver pitch-line speed", family: "speed", defaultUnit: "m/s", expression: "pi*(driverPitchDiameter/1000)*inputSpeed/60" },
      { id: "tangentialForce", label: "Driver tangential force", family: "force", defaultUnit: "N", expression: "2*inputTorque*1000/(driverPitchDiameter+eq(driverPitchDiameter,0))*(1-eq(driverPitchDiameter,0))" },
      { id: "radialForce", label: "Elementary radial force component", family: "force", defaultUnit: "N", expression: "2*inputTorque*1000/(driverPitchDiameter+eq(driverPitchDiameter,0))*(1-eq(driverPitchDiameter,0))*tan(pressureAngle*pi/180)" },
      { id: "axialForce", label: "Elementary axial force component", family: "force", defaultUnit: "N", expression: "lookup(isHelical, driveType)*2*inputTorque*1000/(driverPitchDiameter+eq(driverPitchDiameter,0))*(1-eq(driverPitchDiameter,0))*tan(helixAngle*pi/180)" },
    ],
    formula: "i = N2/N1 · n2 = n1/i · T2 = T1·i·η · v = πd1n1/60 · Ft = 2T1/d1",
    warnings: ["This is an ideal user-declared drive-ratio screen. It uses a simple pitch-circle tangential-force relation and an elementary pressure/helix-angle force decomposition; axial force is reported only for the declared helical option. It excludes component selection, planetary topology, gear tooth strength, mesh stiffness, backlash, lubrication, heat, durability, manufacturing quality, belt/chain tension, vibration, dynamic load factors, bearing reactions, and system validation."],
  }),
  driveTrain: libraryDoc("driveTrain", {
    fields: [
      { id: "inputSpeed", label: "Declared input speed", symbol: "n1", help: "User-entered rotational input speed for the series-stage arithmetic.", defaultValue: 1800, defaultUnit: "rpm" },
      { id: "inputTorque", label: "Declared input torque", symbol: "T1", help: "User-entered transmitted input torque; load dynamics and torque variation are excluded.", defaultValue: 12, defaultUnit: "N·m" },
      { id: "stage1Ratio", label: "Declared stage 1 reduction ratio", symbol: "r1", help: "User-entered speed-reduction magnitude for the first series stage.", defaultValue: 4, defaultUnit: "—" },
      { id: "stage1Efficiency", label: "Declared stage 1 efficiency", symbol: "η1", help: "User-entered efficiency strictly greater than 0 through 1; it is not predicted.", defaultValue: 0.96, defaultUnit: "—" },
      { id: "stage2Ratio", label: "Declared stage 2 reduction ratio", symbol: "r2", help: "User-entered speed-reduction magnitude for the second series stage; use 1 for no stage.", defaultValue: 3, defaultUnit: "—" },
      { id: "stage2Efficiency", label: "Declared stage 2 efficiency", symbol: "η2", help: "User-entered efficiency strictly greater than 0 through 1; it is not predicted.", defaultValue: 0.96, defaultUnit: "—" },
      { id: "stage3Ratio", label: "Declared stage 3 reduction ratio", symbol: "r3", help: "User-entered speed-reduction magnitude for the third series stage; use 1 for no stage.", defaultValue: 1, defaultUnit: "—" },
      { id: "stage3Efficiency", label: "Declared stage 3 efficiency", symbol: "η3", help: "User-entered efficiency strictly greater than 0 through 1; it is not predicted.", defaultValue: 1, defaultUnit: "—" },
    ],
    outputs: [
      { id: "totalRatio", label: "Declared total reduction ratio", defaultUnit: "—", expression: "((stage1Ratio)*(stage2Ratio)*(stage3Ratio))" },
      { id: "totalEfficiency", label: "Declared total efficiency", defaultUnit: "%", expression: "((stage1Efficiency)*(stage2Efficiency)*(stage3Efficiency))*100" },
      { id: "outputSpeed", label: "Literal output speed", defaultUnit: "rpm", expression: "((inputSpeed)/((stage1Ratio)*(stage2Ratio)*(stage3Ratio)))" },
      { id: "outputTorque", label: "Literal output torque", family: "torque", defaultUnit: "N·m", expression: "((inputTorque)*((stage1Ratio)*(stage2Ratio)*(stage3Ratio))*((stage1Efficiency)*(stage2Efficiency)*(stage3Efficiency)))" },
      { id: "inputPower", label: "Literal input power", defaultUnit: "kW", expression: "((inputTorque)*(inputSpeed)*(2*pi/60))/1000" },
      { id: "outputPower", label: "Literal output power", defaultUnit: "kW", expression: "(((inputTorque)*(inputSpeed)*(2*pi/60))*((stage1Efficiency)*(stage2Efficiency)*(stage3Efficiency)))/1000" },
      { id: "arithmeticLoss", label: "Declared-efficiency arithmetic loss", defaultUnit: "kW", expression: "(((inputTorque)*(inputSpeed)*(2*pi/60))-(((inputTorque)*(inputSpeed)*(2*pi/60))*((stage1Efficiency)*(stage2Efficiency)*(stage3Efficiency))))/1000" },
    ],
    formula: "rtotal = r1r2r3 · ηtotal = η1η2η3 · n2 = n1/rtotal · T2 = T1rtotalηtotal",
    warnings: ["This multiplies user-entered series ratios and efficiencies, then applies ideal speed/torque/power relationships. It does not select a gearbox or stage configuration; predict individual loss, efficiency, backlash, stiffness, lubrication, temperature, inertia, dynamics, rating, reliability, safety, suitability, or approval."],
  }),
  eccentricBoltGroup: libraryDoc("eccentricBoltGroup", {
    fields: [
      { id: "boltCount", label: "Equal bolt count", symbol: "n", help: "Integer count of identical joints arranged at one common radius.", defaultValue: 4, defaultUnit: "bolts" },
      { id: "patternRadius", label: "Pattern radius", symbol: "r", help: "Centroid-to-bolt center radius for the concentric circular pattern.", defaultValue: 100, defaultUnit: "mm" },
      { id: "appliedForce", label: "Declared in-plane load", symbol: "F", help: "Positive magnitude of one in-plane shear load.", defaultValue: 8000, defaultUnit: "N" },
      { id: "eccentricity", label: "Load eccentricity", symbol: "e", help: "Perpendicular offset between the force line and the bolt-pattern centroid.", defaultValue: 100, defaultUnit: "mm", signed: true },
      { id: "boltDiameter", label: "Bolt shank diameter", symbol: "d", help: "Nominal unthreaded shank diameter used only for nominal shear stress output.", defaultValue: 10, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "moment", label: "Applied eccentric moment", family: "torque", defaultUnit: "N·m", expression: "((appliedForce)*(eccentricity))/1000" },
      { id: "directShear", label: "Direct shear per equal joint", family: "force", defaultUnit: "N", expression: "((appliedForce)/(boltCount))" },
      { id: "torsionalShear", label: "Torsional shear magnitude per joint", family: "force", defaultUnit: "N", expression: "(((appliedForce)*(eccentricity))*(patternRadius)/((boltCount)*(((patternRadius)))^(2)))" },
      { id: "conservativeMaximum", label: "Conservative scalar joint shear", family: "force", defaultUnit: "N", expression: "(((appliedForce)/(boltCount))+(((appliedForce)*(eccentricity))*(patternRadius)/((boltCount)*(((patternRadius)))^(2))))" },
      { id: "nominalShearStress", label: "Nominal maximum shank shear stress", defaultUnit: "MPa", expression: "((((appliedForce)/(boltCount))+(((appliedForce)*(eccentricity))*(patternRadius)/((boltCount)*(((patternRadius)))^(2))))/(pi*((boltDiameter))^(2)/4))" },
    ],
    formula: "M = Fe · Vdirect = F/n · Σr² = nr² · Vtorsion = Mr/Σr² = M/(nr) · Vconservative = Vdirect + Vtorsion · τnom = Vconservative/(πd²/4)",
    warnings: ["This is an equal-bolt, concentric circular-pattern, in-plane eccentric-shear screen. The displayed maximum is a conservative scalar sum of direct and torsional shear magnitudes rather than a resolved individual-bolt vector. It does not model arbitrary coordinates, unequal fastener stiffness, preload, friction/slip, axial tension, prying, out-of-plane loads, plate flexibility, interactions, fatigue, material allowables, failure, selection, or approval."],
  }),
  extensionSpring: libraryDoc("extensionSpring", {
    fields: [
      { id: "initialTension", label: "Initial tension", symbol: "Fi", help: "User-entered force holding coils together before extension.", family: "force", defaultValue: 8, defaultUnit: "N", signed: true },
      { id: "rate", label: "Spring rate", symbol: "k", help: "User-entered rate over the declared working range.", family: "stiffness", defaultValue: 1.5, defaultUnit: "N/mm" },
      { id: "extension", label: "Extension from free length", symbol: "x", help: "User-entered extension in the stated linear range.", family: "length", defaultValue: 20, defaultUnit: "mm", signed: true }
    ],
    outputs: [
      { id: "force", label: "Total extension-spring force", family: "force", defaultUnit: "N", expression: "initialTension+(rate/1000)*(extension/0.001)" },
      { id: "elasticForce", label: "Rate contribution", family: "force", defaultUnit: "N", expression: "(rate/1000)*(extension/0.001)" },
      { id: "rate", label: "Declared spring rate", family: "stiffness", defaultUnit: "N/mm", expression: "((rate/1000))*1000" }
    ],
    formula: "F = Fi + kx",
    warnings: ["This applies F = Fi + kx using user-entered rate and initial tension. It excludes hook geometry, pretension manufacture, coil contact, nonlinear travel, travel stops, fatigue, corrosion, material condition, dynamic response, and manufacturer load or life limits."],
  }),
  fatigueConcentration: libraryDoc("fatigueConcentration", {
    fields: [
      { id: "kt", label: "Declared theoretical stress concentration", symbol: "Kt", help: "User-entered elastic geometric stress-concentration factor; this workspace does not select it.", defaultValue: 2.2, defaultUnit: "—" },
      { id: "notchSensitivity", label: "Declared notch sensitivity", symbol: "q", help: "User-entered fatigue notch sensitivity from 0 through 1.", defaultValue: 0.75, defaultUnit: "—", signed: true },
      { id: "nominalStress", label: "Declared nominal stress", symbol: "σnom", help: "Optional nominal stress to display the direct Kf-adjusted effective stress.", defaultValue: 120, defaultUnit: "MPa", signed: true },
    ],
    outputs: [
      { id: "kf", label: "Fatigue stress concentration", defaultUnit: "—", expression: "(1+(notchSensitivity)*((kt)-1))" },
      { id: "effectiveStress", label: "Kf-adjusted nominal stress", defaultUnit: "MPa", expression: "(1+(notchSensitivity)*((kt)-1))*(nominalStress)" },
    ],
    formula: "Kf = 1 + q(Kt − 1) · σeffective = Kfσnom",
    warnings: ["This direct Kf relation uses user-entered Kt and notch sensitivity. It does not derive geometry, material behavior, fatigue strength, allowable stress, safety factor, life, or design approval."],
  }),
  fractureIntensity: libraryDoc("fractureIntensity", {
    fields: [
      { id: "geometryFactor", label: "Declared Mode-I geometry factor", symbol: "Y", help: "User-entered dimensionless factor from a geometry-specific validated source; this workspace does not select it.", defaultValue: 1.12, defaultUnit: "—" },
      { id: "tensileStress", label: "Declared remote tensile stress", symbol: "σ", help: "User-entered nominal tensile stress in the stated linear-elastic model.", defaultValue: 100, defaultUnit: "MPa" },
      { id: "crackHalfLength", label: "Declared crack half-length", symbol: "a", help: "User-entered half crack length for the geometry-factor definition.", defaultValue: 5, defaultUnit: "mm" },
      { id: "toughnessReference", label: "Declared toughness reference", symbol: "KIC", help: "User-entered reference used only for literal ratio arithmetic; no fracture conclusion is made.", defaultValue: 50, defaultUnit: "MPa√m" },
    ],
    outputs: [
      { id: "stressIntensity", label: "Mode-I stress intensity", defaultUnit: "MPa√m", expression: "geometryFactor*tensileStress*sqrt(pi*crackHalfLength/1000)" },
      { id: "toughnessRatio", label: "Intensity / declared toughness reference", defaultUnit: "—", expression: "geometryFactor*tensileStress*sqrt(pi*crackHalfLength/1000)/toughnessReference" },
      { id: "arithmeticDifference", label: "Declared-reference minus intensity", defaultUnit: "MPa√m", expression: "toughnessReference-geometryFactor*tensileStress*sqrt(pi*crackHalfLength/1000)" },
    ],
    formula: "KI = Yσ√(πa) · ratio = KI / KIC,declared",
    warnings: ["This is declared-geometry-factor Mode-I linear-elastic fracture-mechanics arithmetic. Stress intensity depends on detailed geometry and loading; this workspace does not infer a factor, establish LEFM applicability, determine fracture or crack growth, predict life, define inspection intervals, select a material, establish safety, or approve a design."],
  }),
  frictionClutch: libraryDoc("frictionClutch", {
    fields: [
      { id: "frictionCoefficient", label: "Declared friction coefficient", symbol: "μ", help: "User-entered interface coefficient for the stated condition; no material or condition is inferred.", defaultValue: 0.28, defaultUnit: "—" },
      { id: "clampForce", label: "Declared axial clamp force", symbol: "Fa", help: "User-entered normal clamp force on the stated friction interface.", defaultValue: 3200, defaultUnit: "N" },
      { id: "meanRadius", label: "Declared mean friction radius", symbol: "rm", help: "User-entered effective mean friction radius; pressure distribution is excluded.", defaultValue: 85, defaultUnit: "mm" },
      { id: "surfaceCount", label: "Declared active friction surfaces", symbol: "z", help: "Positive integer number of active friction surfaces in the stated model.", defaultValue: 2, defaultUnit: "surfaces" },
      { id: "torqueDemand", label: "Declared torque demand", symbol: "Td", help: "User-entered reference torque for literal ratio arithmetic only.", defaultValue: 120, defaultUnit: "N·m" },
    ],
    outputs: [
      { id: "frictionTorque", label: "Declared friction-interface torque", family: "torque", defaultUnit: "N·m", expression: "surfaceCount*frictionCoefficient*clampForce*(meanRadius/1000)" },
      { id: "demandRatio", label: "Friction torque / declared demand", defaultUnit: "—", expression: "surfaceCount*frictionCoefficient*clampForce*(meanRadius/1000)/torqueDemand" },
      { id: "arithmeticDifference", label: "Friction torque minus declared demand", family: "torque", defaultUnit: "N·m", expression: "surfaceCount*frictionCoefficient*clampForce*(meanRadius/1000)-torqueDemand" },
    ],
    formula: "Tfriction = z·μ·Fa·rm · ratio = Tfriction / Tdeclared",
    warnings: ["This is a stated uniform-friction torque relation for a user-defined clutch or brake interface. It excludes temperature, energy absorption, wear, pressure distribution, actuation, engagement dynamics, material selection, capacity, safety, and approval."],
  }),
  gearMeshForce: libraryDoc("gearMeshForce", {
    fields: [
      { id: "torque", label: "Declared applied torque", symbol: "T", help: "User-entered torque at the stated gear pitch circle; transients are excluded.", defaultValue: 100, defaultUnit: "N·m" },
      { id: "pitchDiameter", label: "Declared operating pitch diameter", symbol: "dp", help: "User-entered operating pitch diameter; geometry is not derived.", defaultValue: 80, defaultUnit: "mm" },
      { id: "pressureAngle", label: "Declared transverse pressure angle", symbol: "αt", help: "User-entered transverse working pressure angle in degrees.", defaultValue: 20, defaultUnit: "deg", signed: true },
      { id: "helixAngle", label: "Declared helix angle", symbol: "β", help: "User-entered helix angle in degrees; use 0 for a spur mesh.", defaultValue: 15, defaultUnit: "deg", signed: true },
    ],
    outputs: [
      { id: "tangentialForce", label: "Pitch-line tangential force", family: "force", defaultUnit: "N", expression: "((2*(torque)*1000)/(pitchDiameter))" },
      { id: "radialForce", label: "Declared-angle radial force", family: "force", defaultUnit: "N", expression: "(((2*(torque)*1000)/(pitchDiameter))*tan(((pressureAngle)*pi)/180))" },
      { id: "axialForce", label: "Declared-angle axial force", family: "force", defaultUnit: "N", expression: "(((2*(torque)*1000)/(pitchDiameter))*tan(((helixAngle)*pi)/180))" },
      { id: "resultantForce", label: "Resultant mesh force", family: "force", defaultUnit: "N", expression: "(sqrt((((2*(torque)*1000)/(pitchDiameter)))^(2)+((((2*(torque)*1000)/(pitchDiameter))*tan(((pressureAngle)*pi)/180)))^(2)+((((2*(torque)*1000)/(pitchDiameter))*tan(((helixAngle)*pi)/180)))^(2)))" },
    ],
    formula: "Ft = 2T/dp · Fr = Ft·tan(αt) · Fa = Ft·tan(β) · FN = √(Ft² + Fr² + Fa²)",
    warnings: ["This is a static pitch-circle force decomposition for a user-defined parallel-axis spur or helical mesh. It excludes tooth geometry, mesh stiffness, shaft/bearing support, backlash, lubrication, vibration, tooth strength, durability, safety, and approval."],
  }),
  gearRatio: libraryDoc("gearRatio", {
    fields: [
      { id: "driverTeeth", label: "Driver teeth", symbol: "z₁", help: "Tooth count of the input gear in one external gear pair.", defaultValue: 20, defaultUnit: "teeth" },
      { id: "drivenTeeth", label: "Driven teeth", symbol: "z₂", help: "Tooth count of the output gear in the same pair.", defaultValue: 60, defaultUnit: "teeth" },
      { id: "inputRpm", label: "Input speed", symbol: "n₁", help: "Constant driver rotational speed.", defaultValue: 1800, defaultUnit: "rpm" },
      { id: "inputTorque", label: "Input torque", symbol: "T₁", help: "Steady driver torque.", defaultValue: 18, defaultUnit: "N·m" },
      { id: "efficiency", label: "Transmission efficiency", symbol: "η", help: "User-entered efficiency from 0 to 100.", defaultValue: 92, defaultUnit: "%" },
    ],
    outputs: [
      { id: "ratio", label: "Speed reduction ratio", defaultUnit: ":1", expression: "drivenTeeth/driverTeeth" },
      { id: "outputRpm", label: "Ideal output speed", defaultUnit: "rpm", expression: "inputRpm/(drivenTeeth/driverTeeth)" },
      { id: "outputTorque", label: "Efficiency-adjusted output torque", family: "torque", defaultUnit: "N·m", expression: "inputTorque*(drivenTeeth/driverTeeth)*(efficiency/100)" },
      { id: "inputPower", label: "Input mechanical power", defaultUnit: "kW", expression: "inputTorque*(2*pi*inputRpm/60)/1000" },
    ],
    formula: "i = z₂/z₁ · n₂ = n₁/i · T₂ = T₁iη",
    warnings: ["This screen covers one ideal external gear pair with a user-entered efficiency. It excludes tooth geometry, mesh force, strength, backlash, lubrication, shaft/bearing load, thermal behavior, vibration, noise, duty cycle, and gearbox or component selection."],
  }),
  gearToothStress: libraryDoc("gearToothStress", {
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
      { id: "normalForce", label: "Spur tangential tooth force", family: "force", defaultUnit: "N", expression: "tangentialLoad/(cos(helixAngle*pi/180)^lookup(isHelical, gearType))", labelChoice: "gearType", labels: { helical: "Declared helical normal tooth force", spur: "Spur tangential tooth force" } },
      { id: "virtualToothCount", label: "Declared tooth count", defaultUnit: "teeth", expression: "toothCount/cos(helixAngle*pi/180)^(3*lookup(isHelical, gearType))", labelChoice: "gearType", labels: { helical: "Helical virtual tooth count", spur: "Declared tooth count" } },
      { id: "loadedSection", label: "Lewis-type loaded section factor", defaultUnit: "mm²", expression: "faceWidth*module*formFactor" },
      { id: "rootStress", label: "Static Lewis-type {gearType} root bending stress", defaultUnit: "MPa", expression: "tangentialLoad/(cos(helixAngle*pi/180)^lookup(isHelical, gearType))/(faceWidth*module*formFactor)" },
    ],
    formula: "σF = Ft/(b m Y)",
    warnings: ["This is a basic static Lewis-type spur/helical root-bending arithmetic screen using a user-entered form factor. For the parallel-axis helical first estimate it exposes normal force and virtual tooth count, but does not select a form factor or apply rating factors. It does not select module, pressure angle, material, hardness, tooth form, or Lewis factor; calculate dynamic factors, contact stress, AGMA/ISO rating, mesh load distribution, lubrication, life, reliability, gearbox design, or approval."],
  }),
  goodmanFatigue: libraryDoc("goodmanFatigue", {
    fields: [
      { id: "nominalAlternating", label: "Declared nominal alternating stress", symbol: "σa,nom", help: "User-entered high-cycle alternating stress before the declared Kf multiplier.", defaultValue: 80, defaultUnit: "MPa", signed: true },
      { id: "nominalMean", label: "Declared nominal mean stress", symbol: "σm,nom", help: "User-entered mean stress before the declared Kf multiplier.", defaultValue: 60, defaultUnit: "MPa", signed: true },
      { id: "kf", label: "Declared fatigue stress concentration", symbol: "Kf", help: "User-entered fatigue concentration factor; no geometry or material inference is made.", defaultValue: 1.6, defaultUnit: "—" },
      { id: "enduranceLimit", label: "Declared endurance limit", symbol: "Sn", help: "User-entered corrected endurance limit for the specific stated condition.", defaultValue: 180, defaultUnit: "MPa" },
      { id: "ultimateStrength", label: "Declared ultimate strength", symbol: "Su", help: "User-entered ultimate tensile strength used in the Goodman denominator.", defaultValue: 600, defaultUnit: "MPa" },
    ],
    outputs: [
      { id: "adjustedAlternating", label: "Kf-adjusted alternating stress", defaultUnit: "MPa", expression: "kf*nominalAlternating" },
      { id: "adjustedMean", label: "Kf-adjusted mean stress", defaultUnit: "MPa", expression: "kf*nominalMean" },
      { id: "utilization", label: "Linear Goodman utilization", defaultUnit: "—", expression: "kf*nominalAlternating/enduranceLimit+kf*nominalMean/ultimateStrength" },
    ],
    formula: "σa = Kfσa,nom · σm = Kfσm,nom · U = σa/Sn + σm/Su",
    warnings: ["This high-cycle linear Goodman screen does not establish a pass/fail criterion or model endurance modifiers, yield, low-cycle fatigue, multiaxial loading, reliability, life, or design approval."],
  }),
  gravityMoment: libraryDoc("gravityMoment", {
    fields: [
      { id: "mass", label: "Declared moving mass", symbol: "m", help: "User-entered mass acting at the stated center of gravity.", defaultValue: 10, defaultUnit: "kg" },
      { id: "cgRadius", label: "Pivot-to-CG radius", symbol: "r", help: "User-entered pivot-to-center-of-gravity radius.", defaultValue: 0.3, defaultUnit: "m" },
      { id: "angle", label: "Configuration angle from vertical", symbol: "θ", help: "User-entered planar angle between the gravity line and the pivot-to-CG radius; 0° produces no gravity moment.", defaultValue: 30, defaultUnit: "deg", signed: true },
      { id: "counterMoment", label: "Declared counter moment", symbol: "Mc", help: "User-entered static counteracting moment at the same pivot and sign convention.", defaultValue: 20, defaultUnit: "N·m", signed: true },
    ],
    outputs: [
      { id: "gravityForce", label: "Weight force", family: "force", defaultUnit: "N", expression: "((mass)*9.81)" },
      { id: "perpendicularLeverArm", label: "Gravity perpendicular lever arm", family: "length", defaultUnit: "m", expression: "(cgRadius)*sin((angle)*pi/180)" },
      { id: "gravityMoment", label: "Signed gravity moment", family: "torque", defaultUnit: "N·m", expression: "(((mass)*9.81)*(cgRadius)*sin((angle)*pi/180))" },
      { id: "residualMoment", label: "Counter moment minus gravity moment", family: "torque", defaultUnit: "N·m", expression: "((counterMoment)-(((mass)*9.81)*(cgRadius)*sin((angle)*pi/180)))" },
    ],
    formula: "W = mg · r⊥ = r sin θ · Mg = mgr sin θ · Mresidual = Mc − Mg",
    warnings: ["This is a static single-point-mass, planar gravity-moment screen. It does not solve an over-center, toggle, or four-bar linkage; calculate actuator force/travel, joint reactions, locking, force amplification, self-locking, spring forces, friction, contact, dynamic/inertial loads, deflection, collision, stability, guard requirements, safety, or certification. Enter moments using a declared common sign convention and validate the real mechanism independently."],
  }),
  gripperHold: libraryDoc("gripperHold", {
    fields: [
      { id: "payloadMass", label: "Declared payload mass", symbol: "m", help: "User-entered payload mass for the stated friction-only vertical hold screen.", defaultValue: 2, defaultUnit: "kg" },
      { id: "verticalAcceleration", label: "Declared upward acceleration", symbol: "a", help: "User-entered upward acceleration magnitude; trajectory and dynamic shock are excluded.", defaultValue: 1, defaultUnit: "m/s²", signed: true },
      { id: "frictionCoefficient", label: "Declared jaw / payload friction", symbol: "μ", help: "User-entered friction coefficient strictly greater than 0 through 1; contact behavior is not predicted.", defaultValue: 0.2, defaultUnit: "—" },
      { id: "jawCount", label: "Declared gripping-jaw count", symbol: "z", help: "Count of equally sharing parallel grip contacts for literal per-jaw force arithmetic.", defaultValue: 2, defaultUnit: "—" },
      { id: "multiplier", label: "Declared force multiplier", symbol: "S", help: "User-entered multiplier used only in the visible friction-hold arithmetic; it is not a safety approval.", defaultValue: 2, defaultUnit: "—" },
    ],
    outputs: [
      { id: "verticalLoad", label: "Declared vertical payload load", family: "force", defaultUnit: "N", expression: "((payloadMass)*(9.80665+(verticalAcceleration)))" },
      { id: "totalGripForce", label: "Declared total normal gripping force", family: "force", defaultUnit: "N", expression: "(((payloadMass)*(9.80665+(verticalAcceleration)))*(multiplier)/(frictionCoefficient))" },
      { id: "forcePerJaw", label: "Literal normal-force share per jaw", family: "force", defaultUnit: "N", expression: "((((payloadMass)*(9.80665+(verticalAcceleration)))*(multiplier)/(frictionCoefficient))/(jawCount))" },
      { id: "forceMultiplier", label: "Declared force multiplier", defaultUnit: "—", expression: "(multiplier)" },
    ],
    formula: "Fgrip = m(g + a)·S/μ · Fj = Fgrip/z",
    warnings: ["This applies a declared friction-only vertical-hold relation for equally sharing parallel grip contacts. It does not select a gripper, jaw, pad, pressure, or actuator; calculate contact geometry/stress, lateral or moment loads, compliance, force curves, dynamic shock, payload security, safety, suitability, or approval."],
  }),
  hertzContact: libraryDoc("hertzContact", {
    fields: [
      { id: "normalForce", label: "Declared normal force", symbol: "F", help: "Positive compressive normal load; tangential force is excluded.", defaultValue: 500, defaultUnit: "N" },
      { id: "sphereRadius", label: "Sphere radius", symbol: "R", help: "Nominal radius of the sphere against one locally flat body.", defaultValue: 12, defaultUnit: "mm" },
      { id: "sphereModulus", label: "Sphere elastic modulus", symbol: "E₁", help: "Declared linear-elastic modulus for the spherical body.", defaultValue: 210, defaultUnit: "GPa" },
      { id: "spherePoisson", label: "Sphere Poisson ratio", symbol: "ν₁", help: "Declared isotropic elastic ratio in the range 0 through less than 0.5.", defaultValue: 0.3, defaultUnit: "—", signed: true },
      { id: "flatModulus", label: "Flat elastic modulus", symbol: "E₂", help: "Declared linear-elastic modulus for the locally flat body.", defaultValue: 70, defaultUnit: "GPa" },
      { id: "flatPoisson", label: "Flat Poisson ratio", symbol: "ν₂", help: "Declared isotropic elastic ratio in the range 0 through less than 0.5.", defaultValue: 0.33, defaultUnit: "—", signed: true },
    ],
    outputs: [
      { id: "reducedModulus", label: "Reduced elastic modulus", defaultUnit: "GPa", expression: "(1/((1-((spherePoisson))^(2))/((sphereModulus)*1e9)+(1-((flatPoisson))^(2))/((flatModulus)*1e9)))/1e9" },
      { id: "contactRadius", label: "Contact radius", defaultUnit: "mm", expression: "(((3*(normalForce)*((sphereRadius)*0.001))/(4*((1/((1-((spherePoisson))^(2))/((sphereModulus)*1e9)+(1-((flatPoisson))^(2))/((flatModulus)*1e9))))))^((1/3)))*1000" },
      { id: "contactDiameter", label: "Contact diameter", defaultUnit: "mm", expression: "2*(((3*(normalForce)*((sphereRadius)*0.001))/(4*((1/((1-((spherePoisson))^(2))/((sphereModulus)*1e9)+(1-((flatPoisson))^(2))/((flatModulus)*1e9))))))^((1/3)))*1000" },
      { id: "peakPressure", label: "Peak Hertz pressure", defaultUnit: "MPa", expression: "((3*(normalForce))/(2*pi*((((3*(normalForce)*((sphereRadius)*0.001))/(4*((1/((1-((spherePoisson))^(2))/((sphereModulus)*1e9)+(1-((flatPoisson))^(2))/((flatModulus)*1e9))))))^((1/3))))^(2)))/1e6" },
      { id: "indentation", label: "Elastic approach", defaultUnit: "µm", expression: "(((((3*(normalForce)*((sphereRadius)*0.001))/(4*((1/((1-((spherePoisson))^(2))/((sphereModulus)*1e9)+(1-((flatPoisson))^(2))/((flatModulus)*1e9))))))^((1/3))))^(2)/((sphereRadius)*0.001))*1e6" },
    ],
    formula: "1/E* = (1−ν₁²)/E₁ + (1−ν₂²)/E₂ · a = [3FR/(4E*)]^(1/3) · p₀ = 3F/(2πa²)",
    warnings: ["This is a smooth, frictionless, elastic, isotropic, homogeneous sphere-on-flat normal-contact screen. It excludes roughness, friction, plasticity, coatings, fatigue, thermal effects, surface finish, material selection, life, safety, and approval."],
  }),
  jointSeparation: libraryDoc("jointSeparation", {
    fields: [
      { id: "preload", label: "Declared preload", symbol: "Fp", help: "Preload for one stated bolt/joint condition; uncertainty and loss are not modeled.", defaultValue: 20, defaultUnit: "kN" },
      { id: "boltStiffness", label: "Bolt axial stiffness", symbol: "kb", help: "User-entered equivalent axial bolt stiffness for the stated grip condition.", defaultValue: 150, defaultUnit: "kN/mm" },
      { id: "memberStiffness", label: "Member axial stiffness", symbol: "km", help: "User-entered equivalent axial clamped-member stiffness; geometry is not inferred.", defaultValue: 300, defaultUnit: "kN/mm" },
      { id: "externalLoad", label: "External axial separating load", symbol: "P", help: "Known applied separating load on this one joint; positive is separating and negative is compressive.", defaultValue: 18, defaultUnit: "kN", signed: true },
    ],
    outputs: [
      { id: "loadFraction", label: "Bolt load fraction C", defaultUnit: "%", expression: "boltStiffness/(boltStiffness+memberStiffness)*100" },
      { id: "boltLoadIncrease", label: "External-load share carried by bolt", defaultUnit: "kN", expression: "boltStiffness/(boltStiffness+memberStiffness)*externalLoad" },
      { id: "residualClamp", label: "Residual clamp force", defaultUnit: "kN", expression: "preload-(1-boltStiffness/(boltStiffness+memberStiffness))*externalLoad" },
      { id: "separationLoad", label: "Ideal separation-load threshold", defaultUnit: "kN", expression: "preload/(1-boltStiffness/(boltStiffness+memberStiffness))" },
      { id: "separationReserve", label: "Threshold minus stated external load", defaultUnit: "kN", expression: "preload/(1-boltStiffness/(boltStiffness+memberStiffness))-externalLoad" },
    ],
    formula: "C = kb/(kb+km) · ΔFb = CP · Fm = Fp−(1−C)P · Psep = Fp/(1−C)",
    warnings: ["This is a one-bolt, axial, linear parallel-spring screen with user-entered equivalent stiffnesses. It does not infer stiffness from geometry, distribute a system load among bolts, account for preload variation or relaxation, nonlinear contact, shear, bending, thermal effects, fatigue, gasket behavior, joint slip, safety factors, or prove that a joint will not separate."],
  }),
  keyway: libraryDoc("keyway", {
    fields: [
      { id: "shaftDiameter", label: "Shaft diameter", symbol: "D", help: "Nominal shaft diameter at the key engagement.", defaultValue: 40, defaultUnit: "mm" },
      { id: "torque", label: "Transferred torque", symbol: "T", help: "Known steady torque applied to the single keyed connection.", defaultValue: 200, defaultUnit: "N·m" },
      { id: "width", label: "Key width", symbol: "w", help: "Nominal rectangular key width at the shear plane.", defaultValue: 12, defaultUnit: "mm" },
      { id: "height", label: "Key height", symbol: "h", help: "Nominal rectangular key height; half height is used in the simplified bearing area.", defaultValue: 8, defaultUnit: "mm" },
      { id: "length", label: "Engagement length", symbol: "L", help: "Fully engaged key length under the stated direct-load model.", defaultValue: 50, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "tangentialForce", label: "Shaft tangential force", family: "force", defaultUnit: "N", expression: "2*torque/(shaftDiameter/1000)" },
      { id: "shearStress", label: "Nominal key shear stress", defaultUnit: "MPa", expression: "2*torque*1000/(shaftDiameter*width*length)" },
      { id: "bearingStress", label: "Nominal key bearing stress", defaultUnit: "MPa", expression: "4000*torque/(shaftDiameter*height*length)" },
    ],
    formula: "Ft = 2T/D · τkey = Ft/(wL) · σbearing = Ft/[(h/2)L]",
    warnings: ["This is a single rectangular-key, steady-torque direct-stress screen. It excludes key/keyway standards selection, root stress concentration, shaft weakening, fit clearance, hub deformation, multiple keys, load sharing, assembly, fatigue, material allowables, lubrication, transients, and design approval."],
  }),
  linearGuideLife: libraryDoc("linearGuideLife", {
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
  minerDamage: libraryDoc("minerDamage", {
    fields: [
      { id: "cycles1", label: "Bin 1 applied cycles", symbol: "n1", help: "User-entered applied cycle count at stated life N1.", family: "dimensionless", defaultValue: 10000, defaultUnit: "1", signed: true },
      { id: "life1", label: "Bin 1 stated cycles to failure", symbol: "N1", help: "User-entered reference cycles-to-failure; no S-N curve is generated.", family: "dimensionless", defaultValue: 100000, defaultUnit: "1" },
      { id: "cycles2", label: "Bin 2 applied cycles", symbol: "n2", help: "User-entered applied cycle count at stated life N2.", family: "dimensionless", defaultValue: 5000, defaultUnit: "1", signed: true },
      { id: "life2", label: "Bin 2 stated cycles to failure", symbol: "N2", help: "User-entered reference cycles-to-failure; no S-N curve is generated.", family: "dimensionless", defaultValue: 50000, defaultUnit: "1" },
      { id: "cycles3", label: "Bin 3 applied cycles", symbol: "n3", help: "User-entered applied cycle count at stated life N3.", family: "dimensionless", defaultValue: 1000, defaultUnit: "1", signed: true },
      { id: "life3", label: "Bin 3 stated cycles to failure", symbol: "N3", help: "User-entered reference cycles-to-failure; no S-N curve is generated.", family: "dimensionless", defaultValue: 10000, defaultUnit: "1" }
    ],
    outputs: [
      { id: "damage1", label: "Bin 1 cycle ratio", family: "dimensionless", defaultUnit: "1", expression: "cycles1/life1" },
      { id: "damage2", label: "Bin 2 cycle ratio", family: "dimensionless", defaultUnit: "1", expression: "cycles2/life2" },
      { id: "damage3", label: "Bin 3 cycle ratio", family: "dimensionless", defaultUnit: "1", expression: "cycles3/life3" },
      { id: "totalDamage", label: "Three-bin linear damage sum", family: "dimensionless", defaultUnit: "1", expression: "cycles1/life1+cycles2/life2+cycles3/life3" }
    ],
    formula: "D = n1/N1 + n2/N2 + n3/N3",
    warnings: ["This three-bin Palmgren-Miner sum excludes sequence effects, stress-history generation, S-N curve fitting, nonlinear damage, crack growth, reliability, safety factors, failure prediction, and design approval."],
  }),
  mohrCircle: libraryDoc("mohrCircle", {
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
  motionDuty: libraryDoc("motionDuty", {
    fields: [
      { id: "reflectedInertia", label: "Total reflected inertia", symbol: "J", help: "User-entered total inertia referred to the stated motor/axis; no load inertia is inferred.", defaultValue: 0.012, defaultUnit: "kg·m²" },
      { id: "startSpeed", label: "Start speed", symbol: "n0", help: "Initial angular speed for the declared acceleration or deceleration interval.", defaultValue: 0, defaultUnit: "rpm", signed: true },
      { id: "endSpeed", label: "End speed", symbol: "n1", help: "Final angular speed for the declared acceleration or deceleration interval.", defaultValue: 1800, defaultUnit: "rpm", signed: true },
      { id: "accelTime", label: "Speed-change time", symbol: "tacc", help: "Time over which the stated speed change occurs.", defaultValue: 0.4, defaultUnit: "s" },
      { id: "constantTorque", label: "Declared running torque", symbol: "Trun", help: "User-entered torque magnitude during the constant-torque segment.", defaultValue: 1.8, defaultUnit: "N·m", signed: true },
      { id: "runningTime", label: "Running segment time", symbol: "trun", help: "Duration assigned to the declared running torque.", defaultValue: 1.2, defaultUnit: "s", signed: true },
      { id: "declaredDecelTorque", label: "Declared deceleration torque", symbol: "Tdec", help: "User-entered torque magnitude during the deceleration segment for RMS arithmetic.", defaultValue: 3.5, defaultUnit: "N·m", signed: true },
      { id: "decelTime", label: "Deceleration segment time", symbol: "tdec", help: "Duration assigned to the declared deceleration torque.", defaultValue: 0.4, defaultUnit: "s", signed: true },
    ],
    outputs: [
      { id: "angularAcceleration", label: "Angular acceleration", defaultUnit: "rad/s²", expression: "(endSpeed*2*pi/60-startSpeed*2*pi/60)/accelTime" },
      { id: "inertiaTorque", label: "Inertia acceleration torque", family: "torque", defaultUnit: "N·m", expression: "reflectedInertia*((endSpeed*2*pi/60-startSpeed*2*pi/60)/accelTime)" },
      { id: "totalCycleTime", label: "Declared total cycle time", family: "time", defaultUnit: "s", expression: "accelTime+runningTime+decelTime" },
      { id: "rmsTorque", label: "Declared-duty RMS torque", family: "torque", defaultUnit: "N·m", expression: "sqrt(((reflectedInertia*((endSpeed*2*pi/60-startSpeed*2*pi/60)/accelTime))^2*accelTime+constantTorque^2*runningTime+declaredDecelTorque^2*decelTime)/(accelTime+runningTime+decelTime))" },
      { id: "recoverableKineticEnergyUpperBound", label: "Kinetic energy released if decelerating", family: "energy", defaultUnit: "J", expression: "max(0,0.5*reflectedInertia*((startSpeed*2*pi/60)^2-(endSpeed*2*pi/60)^2))" },
    ],
    formula: "α = (ω1−ω0)/tacc · Tacc = Jα · Trms = √(ΣTᵢ²tᵢ/Σtᵢ) · Ereleased = ½J(ω0²−ω1²)",
    warnings: ["This is declared-duty arithmetic: inertia acceleration torque from user-entered reflected inertia and speed change; RMS torque from three user-entered constant-torque segments; and a kinetic-energy upper bound only when the stated interval decelerates. It does not infer friction, gravity, cutting/process load, reflected inertia, motor capability, drive current, thermal limits, braking hardware, bus capacity, power regeneration, safety category, or motion-profile suitability."],
  }),
  payloadInertia: libraryDoc("payloadInertia", {
    fields: [
      { id: "eoatMass", label: "EOAT mass", symbol: "me", help: "User-entered end-of-arm-tool mass.", defaultValue: 5, defaultUnit: "kg", signed: true },
      { id: "productMass", label: "Product mass", symbol: "mp", help: "User-entered handled product mass.", defaultValue: 2, defaultUnit: "kg", signed: true },
      { id: "cgDistance", label: "Flange-to-CG distance", symbol: "r", help: "User-entered center-of-gravity distance from the analyzed robot axis/flange.", defaultValue: 0.15, defaultUnit: "m", signed: true },
    ],
    outputs: [
      { id: "payloadMass", label: "Declared total payload mass", family: "mass", defaultUnit: "kg", expression: "eoatMass+productMass" },
      { id: "cgMoment", label: "Payload mass × CG distance", defaultUnit: "kg·m", expression: "(eoatMass+productMass)*cgDistance" },
      { id: "pointMassInertia", label: "Point-mass payload inertia", defaultUnit: "kg·m²", expression: "(eoatMass+productMass)*cgDistance^2" },
    ],
    formula: "mpayload = me + mp · first moment = mpayload r · Ipoint = mpayload r²",
    warnings: ["This is a one-axis point-mass approximation using a single declared flange-to-CG distance. It does not calculate a full inertia tensor, model EOAT/product geometry, determine robot payload or axis limits, evaluate reach, motion, collision, capacity, safety, certification, or robot selection."],
  }),
  pinStress: libraryDoc("pinStress", {
    fields: [
      { id: "appliedLoad", label: "Declared direct load", symbol: "F", help: "Positive direct transverse load assumed to share equally across identical pins.", defaultValue: 12000, defaultUnit: "N" },
      { id: "pinCount", label: "Identical pin count", symbol: "n", help: "Integer count of pins assumed to share direct load equally.", defaultValue: 2, defaultUnit: "pins" },
      { id: "shearPlanes", label: "Shear-plane condition", symbol: "p", help: "Choose one or two ideal shear planes through every identical pin.", defaultValue: 2, defaultUnit: "—", choice: ["1", "2"], choiceMessage: "Shear-plane condition must be single shear or double shear." },
      { id: "pinDiameter", label: "Pin diameter", symbol: "d", help: "Nominal circular pin diameter at the stated shear plane.", defaultValue: 10, defaultUnit: "mm" },
      { id: "plateThickness", label: "Bearing plate thickness", symbol: "t", help: "Loaded plate thickness used for the projected bearing-area approximation.", defaultValue: 8, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "loadPerPin", label: "Direct load per equal pin", family: "force", defaultUnit: "N", expression: "appliedLoad/pinCount" },
      { id: "shearArea", label: "One nominal pin shear area", defaultUnit: "mm²", expression: "pi*pinDiameter^2/4" },
      { id: "nominalShear", label: "Nominal pin shear stress", defaultUnit: "MPa", expression: "(appliedLoad/pinCount)/(shearPlanes*pi*pinDiameter^2/4)" },
      { id: "projectedBearingArea", label: "Projected plate bearing area per pin", defaultUnit: "mm²", expression: "pinDiameter*plateThickness" },
      { id: "projectedBearingStress", label: "Projected plate bearing stress", defaultUnit: "MPa", expression: "(appliedLoad/pinCount)/(pinDiameter*plateThickness)" },
    ],
    formula: "Fpin = F/n · As = πd²/4 · τnom = Fpin/(pAs) · Aprojected = dt · σbearing = Fpin/(dt)",
    warnings: ["This assumes identical pins share the entered direct load equally, uses circular nominal shear area, and applies a projected-area bearing approximation. It does not evaluate pin bending, clearance, load-sharing variation, local contact/Hertz stress, yielding, fatigue, stress concentrations, material allowables, hole edge distance, joint geometry, selection, or approval."],
  }),
  planetaryGear: libraryDoc("planetaryGear", {
    fields: [
      { id: "sunTeeth", label: "Sun gear teeth", symbol: "Ns", help: "Declared sun tooth count for a fixed-ring, sun-input, carrier-output configuration.", defaultValue: 24, defaultUnit: "teeth" },
      { id: "ringTeeth", label: "Ring gear teeth", symbol: "Nr", help: "Declared internal ring tooth count for the same standard planetary configuration.", defaultValue: 96, defaultUnit: "teeth" },
      { id: "planetCount", label: "Declared planet count", symbol: "P", help: "User-entered number of evenly spaced planets used only for the spacing-integer check.", defaultValue: 3, defaultUnit: "—" },
      { id: "inputSpeed", label: "Sun input speed", symbol: "nin", help: "Declared sun input speed for the fixed-ring ratio screen.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "inputTorque", label: "Sun input torque", symbol: "Tin", help: "Declared sun input torque before user-entered efficiency.", defaultValue: 10, defaultUnit: "N·m" },
      { id: "efficiency", label: "Declared planetary efficiency", symbol: "η", help: "User-entered transmission efficiency; this workspace does not select or validate a design efficiency.", defaultValue: 92, defaultUnit: "%" },
    ],
    outputs: [
      { id: "ratio", label: "Fixed-ring reduction ratio", defaultUnit: ":1", expression: "(1+(ringTeeth)/(sunTeeth))" },
      { id: "planetTeeth", label: "Nominal planet teeth", defaultUnit: "teeth", expression: "(((ringTeeth)-(sunTeeth))/2)" },
      { id: "spacingQuotient", label: "Planet-spacing tooth quotient", defaultUnit: "—", expression: "(((ringTeeth)-(sunTeeth))/(planetCount))" },
      { id: "carrierSpeed", label: "Ideal carrier output speed", defaultUnit: "rpm", expression: "((inputSpeed)/(1+(ringTeeth)/(sunTeeth)))" },
      { id: "carrierTorque", label: "Declared-efficiency carrier torque", family: "torque", defaultUnit: "N·m", expression: "((inputTorque)*(1+(ringTeeth)/(sunTeeth))*(efficiency)/100)" },
    ],
    formula: "i = 1 + Nr/Ns · Np = (Nr − Ns)/2 · ncarrier = nsun/i · Tcarrier = Tsun iη",
    warnings: ["This is a fixed-ring, sun-input, carrier-output tooth and ratio screen. It does not verify complete planetary assembly, module/pressure angle compatibility, interference, load sharing, tooth stress, bearing loads, efficiency, heat, backlash, lubrication, durability, service duty, safety, or product selection."],
  }),
  plateBuckling: libraryDoc("plateBuckling", {
    fields: [
      { id: "modulus", label: "Declared elastic modulus", symbol: "E", help: "User-entered linear-elastic Young’s modulus for the stated plate material and condition.", defaultValue: 200, defaultUnit: "GPa" },
      { id: "poissonRatio", label: "Declared Poisson ratio", symbol: "ν", help: "User-entered isotropic elastic ratio strictly between −1 and 1; it is not looked up.", defaultValue: 0.3, defaultUnit: "—", signed: true },
      { id: "thickness", label: "Declared plate thickness", symbol: "t", help: "Uniform unstiffened plate thickness in the stated elastic model.", defaultValue: 3, defaultUnit: "mm" },
      { id: "referenceWidth", label: "Declared reference width", symbol: "b", help: "Width matched to the user-entered buckling coefficient definition; this workspace does not select it.", defaultValue: 250, defaultUnit: "mm" },
      { id: "bucklingCoefficient", label: "Declared buckling coefficient", symbol: "k", help: "User-entered dimensionless coefficient from a geometry/loading/boundary-specific source; no chart lookup is performed.", defaultValue: 4, defaultUnit: "—" },
    ],
    outputs: [
      { id: "criticalStress", label: "Elastic critical buckling stress", defaultUnit: "MPa", expression: "((bucklingCoefficient)*((pi)^(2)*(modulus*1e9)/(12*(1-((poissonRatio))^(2))))*((thickness)/((referenceWidth)))^(2))/1e6" },
      { id: "slendernessRatio", label: "Declared thickness / reference-width ratio", defaultUnit: "—", expression: "(thickness)/(referenceWidth)" },
      { id: "elasticPlateStiffnessTerm", label: "Elastic plate stiffness term", defaultUnit: "MPa", expression: "((pi)^(2)*(modulus*1e9)/(12*(1-((poissonRatio))^(2))))/1e6" },
    ],
    formula: "σcr = kπ²E/[12(1−ν²)](t/b)²",
    warnings: ["This calculates only the declared simply supported isotropic elastic plate-buckling relation using a user-entered coefficient. It does not select boundary conditions, load case, reference width, or buckling coefficient; and excludes plasticity, residual stress, geometric imperfections, post-buckling, stiffeners, connections, code requirements, safety factors, adequacy, and approval."],
  }),
  pressFit: libraryDoc("pressFit", {
    fields: [
      { id: "shaftDiameter", label: "Shaft diameter", symbol: "Ds", help: "Actual or nominal external diameter at the press-fit interface.", defaultValue: 50.025, defaultUnit: "mm" },
      { id: "holeDiameter", label: "Hub bore diameter", symbol: "Di", help: "Actual or nominal interface bore; it must be smaller than the shaft for this press-fit screen.", defaultValue: 50, defaultUnit: "mm" },
      { id: "hubOuterDiameter", label: "Hub outer diameter", symbol: "Do", help: "Outer hub diameter in the reference geometry factor; it must exceed the bore.", defaultValue: 100, defaultUnit: "mm" },
      { id: "contactLength", label: "Contact length", symbol: "L", help: "Uniform cylindrical interface engagement length.", defaultValue: 50, defaultUnit: "mm" },
      { id: "modulus", label: "Declared elastic modulus", symbol: "E", help: "Single user-entered modulus used by the simplified reference relation; no shaft/hub compliance split is modeled.", defaultValue: 200, defaultUnit: "GPa" },
      { id: "friction", label: "Declared friction coefficient", symbol: "μ", help: "User-entered interface coefficient from 0 through 1; this workspace does not select it.", defaultValue: 0.15, defaultUnit: "—", signed: true },
    ],
    outputs: [
      { id: "interference", label: "Diametral interference", defaultUnit: "mm", expression: "((shaftDiameter)-(holeDiameter))" },
      { id: "geometryFactor", label: "Reference hub geometry factor", defaultUnit: "—", expression: "((((hubOuterDiameter))^(2)-((holeDiameter))^(2))/(((hubOuterDiameter))^(2)+((holeDiameter))^(2)))" },
      { id: "contactPressure", label: "Reference contact pressure", defaultUnit: "MPa", expression: "(((shaftDiameter)-(holeDiameter))/(holeDiameter)*(modulus)*1000*((((hubOuterDiameter))^(2)-(((holeDiameter)))^(2))/(((hubOuterDiameter))^(2)+(((holeDiameter)))^(2))))" },
      { id: "frictionForce", label: "Friction holding / assembly-force estimate", defaultUnit: "kN", expression: "(pi*((holeDiameter)/1000)*((contactLength)/1000)*(((shaftDiameter)-((holeDiameter)))/((holeDiameter))*(modulus)*1000*((((hubOuterDiameter))^(2)-((((holeDiameter))))^(2))/(((hubOuterDiameter))^(2)+((((holeDiameter))))^(2))))*1e6*(friction))/1000" },
      { id: "holdingTorque", label: "Friction holding-torque estimate", family: "torque", defaultUnit: "N·m", expression: "((pi*(((holeDiameter))/1000)*((contactLength)/1000)*(((shaftDiameter)-(((holeDiameter))))/(((holeDiameter)))*(modulus)*1000*((((hubOuterDiameter))^(2)-(((((holeDiameter)))))^(2))/(((hubOuterDiameter))^(2)+(((((holeDiameter)))))^(2))))*1e6*(friction))*((holeDiameter)/2000))" },
    ],
    formula: "δ = Ds−Di · p = (δ/Di)E[(Do²−Di²)/(Do²+Di²)] · Fμ = πDiLpμ · Tμ = FμDi/2",
    warnings: ["This follows a simplified single-modulus, Lame-style hub geometry-factor relation with uniform interface pressure and user-entered friction. It does not split shaft and hub compliance, select a tolerance, assess yield or fit class, model temperature/assembly method/surface texture, include centrifugal unloading or dynamic/fatigue behavior, rate equipment, or approve a joint."],
  }),
  rackPinion: libraryDoc("rackPinion", {
    fields: [
      { id: "mass", label: "Moved mass", symbol: "m", help: "Declared total translated mass for a horizontal axis, including relevant moving components.", defaultValue: 50, defaultUnit: "kg" },
      { id: "friction", label: "Declared guide friction coefficient", symbol: "μ", help: "User-entered guide friction coefficient from 0 through 1; it is not selected by this workspace.", defaultValue: 0.02, defaultUnit: "—", signed: true },
      { id: "acceleration", label: "Declared linear acceleration", symbol: "a", help: "Peak horizontal acceleration for the stated move; profile and jerk are excluded.", defaultValue: 1.5, defaultUnit: "m/s²", signed: true },
      { id: "externalForce", label: "Declared external axial force", symbol: "Fe", help: "External horizontal resisting force added to the feed-force screen.", defaultValue: 100, defaultUnit: "N", signed: true },
      { id: "pinionDiameter", label: "Pinion pitch diameter", symbol: "dp", help: "Declared pitch diameter used for torque and rpm conversion; tooth geometry is excluded.", defaultValue: 80, defaultUnit: "mm" },
      { id: "linearSpeed", label: "Requested linear speed", symbol: "v", help: "Steady requested rack speed used only to calculate pinion rpm and mechanical power.", defaultValue: 1.2, defaultUnit: "m/s" },
    ],
    outputs: [
      { id: "feedForce", label: "Horizontal feed force", family: "force", defaultUnit: "N", expression: "((mass)*9.80665*(friction)+(mass)*(acceleration)+(externalForce))" },
      { id: "linearSpeed", label: "Requested linear speed", family: "speed", defaultUnit: "m/s", expression: "(linearSpeed)" },
      { id: "torque", label: "Pinion torque", family: "torque", defaultUnit: "N·m", expression: "(((mass)*9.80665*(friction)+(mass)*(acceleration)+(externalForce))*(pinionDiameter)/2000)" },
      { id: "rpm", label: "Pinion speed at requested linear speed", defaultUnit: "rpm", expression: "((linearSpeed)/(pi*(pinionDiameter)/1000)*60)" },
      { id: "power", label: "Mechanical linear power", defaultUnit: "kW", expression: "(((mass)*9.80665*(friction)+(mass)*(acceleration)+(externalForce))*(linearSpeed)/1000)" },
    ],
    formula: "Fr = mgμ + ma + Fe · Tp = Frdp/2 · np = 60v/(πdp) · P = Frv",
    warnings: ["This is a horizontal, lumped-mass rack-and-pinion screen using user-entered friction, acceleration, external force, and pitch diameter. It excludes vertical/gravity axes, service factors, shock, gear mesh efficiency, tooth strength, backlash, lubrication, rack/pinion selection, gearbox or motor selection, rail loads, stiffness, positioning accuracy, controls, safety, and system approval."],
  }),
  robotPayloadMoment: libraryDoc("robotPayloadMoment", {
    fields: [
      { id: "payloadMass", label: "Declared payload mass", symbol: "m", help: "User-entered attached payload mass for static gravity arithmetic.", family: "mass", defaultValue: 8, defaultUnit: "kg" },
      { id: "cogOffset", label: "Declared flange-to-CoG offset", symbol: "e", help: "User-entered radial offset from the stated flange reference to payload center of gravity.", family: "length", defaultValue: 250, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "gravityForce", label: "Literal payload gravity force", family: "force", defaultUnit: "N", expression: "payloadMass*9.80665" },
      { id: "staticMoment", label: "Literal static weight moment", family: "torque", defaultUnit: "N·m", expression: "payloadMass*9.80665*((cogOffset/0.001)/1000)" },
      { id: "cogOffset", label: "Declared flange-to-CoG offset", family: "length", defaultUnit: "mm", expression: "((cogOffset/0.001))*0.001" }
    ],
    formula: "Fg = m·g · Mstatic = Fg·e",
    warnings: ["This applies static gravity force and a declared flange-to-CoG lever arm. It does not compare a result to any robot payload/moment curve or capacity; calculate acceleration, inertia, motion, mounting, stability, safety, suitability, or approval."],
  }),
  robotReach: libraryDoc("robotReach", {
    fields: [
      { id: "targetX", label: "Declared target X offset", symbol: "x", help: "User-entered target offset from the stated robot-base origin along X.", family: "length", defaultValue: 600, defaultUnit: "mm", signed: true },
      { id: "targetY", label: "Declared target Y offset", symbol: "y", help: "User-entered target offset from the stated robot-base origin along Y.", family: "length", defaultValue: 300, defaultUnit: "mm", signed: true },
      { id: "targetZ", label: "Declared target Z offset", symbol: "z", help: "User-entered target offset from the stated robot-base origin along Z.", family: "length", defaultValue: 400, defaultUnit: "mm", signed: true },
      { id: "referenceReach", label: "Declared radial reference reach", symbol: "Rref", help: "User-entered reference radial reach for literal distance comparison; it is not a pose or workspace result.", family: "length", defaultValue: 1000, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "radialDistance", label: "Literal target radial distance", family: "length", defaultUnit: "mm", expression: "(sqrt((targetX/0.001)^2+(targetY/0.001)^2+(targetZ/0.001)^2))*0.001" },
      { id: "referenceReach", label: "Declared radial reference reach", family: "length", defaultUnit: "mm", expression: "((referenceReach/0.001))*0.001" },
      { id: "referenceRatio", label: "Literal distance / reference-reach ratio", family: "dimensionless", defaultUnit: "1", expression: "sqrt((targetX/0.001)^2+(targetY/0.001)^2+(targetZ/0.001)^2)/(referenceReach/0.001)" }
    ],
    formula: "r = √(x² + y² + z²) · rratio = r/Rref",
    warnings: ["This calculates only a target radial distance and literal comparison to a user-entered reference reach. It is not a six-axis robot workspace, pose, orientation, collision, joint-limit, singularity, path, payload, reachability, safety, suitability, or approval result."],
  }),
  sCurveProfile: libraryDoc("sCurveProfile", {
    fields: [
      { id: "distance", label: "Move distance", symbol: "d", help: "Declared zero-start/zero-stop point-to-point travel distance.", defaultValue: 200, defaultUnit: "mm" },
      { id: "topSpeed", label: "Top speed", symbol: "vmax", help: "User-entered intended top speed used by the equivalent trapezoidal timing screen.", defaultValue: 100, defaultUnit: "mm/s" },
      { id: "averageAcceleration", label: "Average acceleration", symbol: "aavg", help: "User-entered average acceleration; not a controller tuning setting.", defaultValue: 500, defaultUnit: "mm/s²" },
      { id: "jerkPercent", label: "Jerk percentage", symbol: "J%", help: "Declared fraction of acceleration segment spent ramping, from 0 through 100 percent.", defaultValue: 50, defaultUnit: "%", signed: true },
    ],
    outputs: [
      { id: "peakSpeed", label: "Profile peak speed", defaultUnit: "mm/s", expression: "min(topSpeed, sqrt(distance*averageAcceleration))" },
      { id: "accelerationTime", label: "Acceleration segment time", family: "time", defaultUnit: "s", expression: "min(topSpeed, sqrt(distance*averageAcceleration))/averageAcceleration" },
      { id: "cruiseTime", label: "Constant-speed time", family: "time", defaultUnit: "s", expression: "max(0, (distance-topSpeed^2/averageAcceleration)/topSpeed)" },
      { id: "totalTime", label: "Equivalent point-to-point time", family: "time", defaultUnit: "s", expression: "2*min(topSpeed, sqrt(distance*averageAcceleration))/averageAcceleration+max(0, (distance-topSpeed^2/averageAcceleration)/topSpeed)" },
      { id: "peakAcceleration", label: "Jerk-percent peak acceleration", defaultUnit: "mm/s²", expression: "averageAcceleration/(1-jerkPercent*0.005)" },
      { id: "jerkRampTime", label: "Per-ramp jerk time", family: "time", defaultUnit: "s", expression: "min(topSpeed, sqrt(distance*averageAcceleration))/averageAcceleration*jerkPercent/200" },
    ],
    formula: "tacc = v/aavg · vpeak = min(vmax, √(d aavg)) · ttotal = 2tacc + tcruise · apeak = aavg/(1 − 0.005J%)",
    warnings: ["This symmetric zero-start/zero-stop S-curve screen preserves equivalent trapezoidal timing using user-entered average acceleration and jerk percentage. It does not generate controller commands, model short-move sampling, validate axis limits or tuning, predict vibration, overshoot, mechanical load, safety, or motion-system suitability."],
  }),
  shaftCombined: libraryDoc("shaftCombined", {
    fields: [
      { id: "bendingMoment", label: "Bending moment", symbol: "M", help: "Moment at the stated critical solid-shaft section; use a signed convention consistently.", family: "torque", defaultValue: 450, defaultUnit: "N·m", signed: true },
      { id: "torque", label: "Applied torque", symbol: "T", help: "Steady torque at the same shaft section; use a signed convention consistently.", family: "torque", defaultValue: 300, defaultUnit: "N·m", signed: true },
      { id: "diameter", label: "Solid shaft diameter", symbol: "d", help: "Nominal solid circular diameter at the same section.", family: "length", defaultValue: 40, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "bendingStress", label: "Outer-fiber bending stress", family: "stress", defaultUnit: "MPa", expression: "(32*(bendingMoment*1000)/(pi*(diameter/0.001)^3))*1000000" },
      { id: "torsionalShear", label: "Outer-fiber torsional shear", family: "stress", defaultUnit: "MPa", expression: "(16*(torque*1000)/(pi*(diameter/0.001)^3))*1000000" },
      { id: "principalOne", label: "Maximum principal stress", family: "stress", defaultUnit: "MPa", expression: "((32*(bendingMoment*1000)/(pi*(diameter/0.001)^3))/2+sqrt(((32*(bendingMoment*1000)/(pi*(diameter/0.001)^3))/2)^2+(16*(torque*1000)/(pi*(diameter/0.001)^3))^2))*1000000" },
      { id: "principalTwo", label: "Minimum principal stress", family: "stress", defaultUnit: "MPa", expression: "((32*(bendingMoment*1000)/(pi*(diameter/0.001)^3))/2-sqrt(((32*(bendingMoment*1000)/(pi*(diameter/0.001)^3))/2)^2+(16*(torque*1000)/(pi*(diameter/0.001)^3))^2))*1000000" },
      { id: "vonMises", label: "Plane-stress von Mises equivalent", family: "stress", defaultUnit: "MPa", expression: "(sqrt((32*(bendingMoment*1000)/(pi*(diameter/0.001)^3))^2+3*(16*(torque*1000)/(pi*(diameter/0.001)^3))^2))*1000000" }
    ],
    formula: "σb = 32M/(πd³) · τt = 16T/(πd³) · σvm = √(σb² + 3τt²)",
    warnings: ["This is an elastic outer-fiber point-stress screen for one solid circular shaft section. It excludes axial load, stress concentrations, keyways, fillets, fluctuating loading, fatigue, material allowables, deflection, bearing reaction, torsional vibration, buckling, and design approval."],
  }),
  shaftDesign: libraryDoc("shaftDesign", {
    fields: [
      { id: "torque", label: "Applied torque", help: "Stated steady torque for the solid-shaft screening model.", defaultValue: 100, defaultUnit: "N·m" },
      { id: "shaftDiameter", label: "Existing shaft diameter", help: "Nominal solid circular diameter used for stress, twist, and stiffness calculations.", defaultValue: 25, defaultUnit: "mm" },
      { id: "allowableShear", label: "Allowable shear stress", help: "User-entered allowable basis; this screen does not select material allowables or safety factors.", defaultValue: 40, defaultUnit: "MPa" },
      { id: "length", label: "Support span / torsion length", help: "Stated simply-supported span and torsion length for this narrow screen.", defaultValue: 600, defaultUnit: "mm" },
      { id: "shearModulus", label: "Shear modulus", help: "User-entered shear modulus at the stated condition.", defaultValue: 80, defaultUnit: "GPa" },
      { id: "youngModulus", label: "Young’s modulus", help: "User-entered Young’s modulus at the stated condition.", defaultValue: 200, defaultUnit: "GPa" },
      { id: "centerLoad", label: "Central transverse load", help: "Single stated central force for simply-supported deflection only.", defaultValue: 500, defaultUnit: "N", signed: true },
      { id: "lineMass", label: "Uniform shaft line mass", help: "User-entered uniform mass per unit length for the first-mode speed screen.", defaultValue: 0.8, defaultUnit: "kg/m" },
    ],
    outputs: [
      { id: "minimumDiameter", label: "Minimum torsion-only diameter", defaultUnit: "mm", expression: "(16*(torque*1000)/(pi*allowableShear))^(1/3)" },
      { id: "torsionalStress", label: "Torsional shear stress", defaultUnit: "MPa", expression: "16*(torque*1000)/(pi*shaftDiameter^3)" },
      { id: "twist", label: "Torsional twist", defaultUnit: "deg", expression: "((torque*1000)*length/(shearModulus*1000*(pi*shaftDiameter^4/32)))*180/pi" },
      { id: "centralDeflection", label: "Central-load deflection", defaultUnit: "mm", expression: "centerLoad*length^3/(48*youngModulus*1000*(pi*shaftDiameter^4/64))" },
      { id: "criticalRpm", label: "First-mode critical-speed estimate", defaultUnit: "rpm", expression: "(pi^2/(length/1000)^2*sqrt(youngModulus*1e9*(pi*shaftDiameter^4/64*1e-12)/lineMass))*60/(2*pi)" },
    ],
    formula: "dmin = ∛(16T/πτallow) · τ = 16T/(πd³) · θ = TL/(GJ) · δcenter = FL³/(48EI) · ω₁ = (π²/L²)√(EI/m′)",
    warnings: ["This is a solid circular shaft screen: torsion-only allowable sizing, Saint-Venant twist, a simply-supported single central-load deflection, and a uniform simply-supported first-mode speed estimate. It excludes combined fatigue, stress concentrations, keyway effects, bearing/support flexibility, damping, unbalance, couplings, attached disks, distributed auxiliary masses, thermal effects, buckling, alignment, and rotor-dynamics validation."],
  }),
  splineLoad: libraryDoc("splineLoad", {
    fields: [
      { id: "torque", label: "Declared applied torque", symbol: "T", help: "User-entered transmitted torque; transient and reversing loads are excluded.", defaultValue: 300, defaultUnit: "N·m" },
      { id: "pitchDiameter", label: "Declared pitch diameter", symbol: "Dp", help: "User-entered spline pitch diameter; standard geometry is not selected.", defaultValue: 50, defaultUnit: "mm" },
      { id: "toothCount", label: "Declared tooth count", symbol: "z", help: "Positive integer nominal tooth count in the stated spline connection.", defaultValue: 10, defaultUnit: "teeth" },
      { id: "engagementLength", label: "Declared engagement length", symbol: "Le", help: "User-entered engaged flank length per tooth.", defaultValue: 35, defaultUnit: "mm" },
      { id: "flankHeight", label: "Declared effective flank height", symbol: "he", help: "User-entered effective loaded flank height per tooth.", defaultValue: 3, defaultUnit: "mm" },
      { id: "loadShare", label: "Declared effective load-share fraction", symbol: "ηshare", help: "Visible fraction from greater than 0 through 1; contact distribution is not inferred.", defaultValue: 0.6, defaultUnit: "—" },
    ],
    outputs: [
      { id: "tangentialForce", label: "Tangential torque force", family: "force", defaultUnit: "N", expression: "((2*(torque)*1000)/(pitchDiameter))" },
      { id: "effectiveToothCount", label: "Declared effective loaded teeth", defaultUnit: "teeth", expression: "((toothCount)*(loadShare))" },
      { id: "forcePerEffectiveTooth", label: "Force per declared effective tooth", family: "force", defaultUnit: "N", expression: "(((2*(torque)*1000)/(pitchDiameter))/((toothCount)*(loadShare)))" },
      { id: "nominalFlankPressure", label: "Nominal effective-tooth flank pressure", defaultUnit: "MPa", expression: "((((2*(torque)*1000)/(pitchDiameter))/((toothCount)*(loadShare)))/((engagementLength)*(flankHeight)))" },
    ],
    formula: "Ft = 2T/Dp · zeffective = z·ηshare · Ftooth = Ft/zeffective · pnominal = Ftooth/(Le·he)",
    warnings: ["This is declared spline geometry and load-share arithmetic only. It excludes standards, tooth form, fit, root stress, fatigue, wear, misalignment, contact distribution, capacity, safety, and approval."],
  }),
  stability: libraryDoc("stability", {
    fields: [
      { id: "endCondition", label: "End condition", help: "The effective-length factor is part of the ideal model.", family: "dimensionless", defaultValue: 1, defaultUnit: "1" },
      { id: "length", label: "Unsupported length", symbol: "L", help: "Distance between lateral restraints.", family: "length", defaultValue: 1.5, defaultUnit: "m" },
      { id: "modulus", label: "Elastic modulus", symbol: "E", help: "Elastic material property used by the ideal model.", family: "stress", defaultValue: 200, defaultUnit: "GPa" },
      { id: "inertia", label: "Least second moment", symbol: "I", help: "Use the smaller principal-axis value.", family: "secondMoment", defaultValue: 25, defaultUnit: "cm⁴" }
    ],
    outputs: [
      { id: "effectiveLength", label: "Effective length", family: "length", defaultUnit: "mm", expression: "endCondition*length" },
      { id: "criticalLoad", label: "Ideal elastic critical load", family: "force", defaultUnit: "kN", expression: "(pi^2*((modulus/1000000000)*1e9)*((inertia/1e-8)*1e-8))/(endCondition*length)^2" }
    ],
    formula: "Pcr = π²EI / (KL)²",
    warnings: ["This is an ideal elastic stability estimate. It excludes imperfections, residual stress, eccentricity, inelastic behavior, connection restraint, and code-required resistance checks."],
  }),
  thinVessel: libraryDoc("thinVessel", {
    fields: [
      { id: "pressure", label: "Internal gauge pressure", symbol: "p", help: "Uniform internal gauge pressure; enter a positive magnitude.", defaultValue: 1.2, defaultUnit: "MPa" },
      { id: "diameter", label: "Inside diameter", symbol: "D", help: "Nominal inside diameter of the closed cylindrical shell.", defaultValue: 600, defaultUnit: "mm" },
      { id: "thickness", label: "Wall thickness", symbol: "t", help: "Uniform shell wall thickness for the thin-wall screen.", defaultValue: 12, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "hoop", label: "Ideal hoop membrane stress", defaultUnit: "MPa", expression: "pressure*diameter/(2*thickness)" },
      { id: "longitudinal", label: "Ideal longitudinal membrane stress", defaultUnit: "MPa", expression: "pressure*diameter/(4*thickness)" },
      { id: "diameterThickness", label: "Inside diameter-to-thickness ratio", defaultUnit: "—", expression: "diameter/thickness" },
    ],
    formula: "σhoop = pD/(2t) · σlong = pD/(4t), closed thin cylinder",
    warnings: ["This is a closed cylindrical thin-shell membrane-stress relationship. It excludes thick-wall behavior, discontinuities, heads, nozzles, welds, external pressure, fatigue, corrosion allowance, material allowables, code requirements, relief sizing, and pressure-vessel certification."],
  }),
  threadTensileArea: libraryDoc("threadTensileArea", {
    fields: [
      { id: "majorDiameter", label: "Declared basic major diameter", symbol: "D", help: "User-entered external metric thread basic major diameter; a thread standard is not selected.", defaultValue: 12, defaultUnit: "mm" },
      { id: "pitch", label: "Declared thread pitch", symbol: "P", help: "User-entered thread pitch in mm; material and strength are not inferred.", defaultValue: 1.75, defaultUnit: "mm" },
    ],
    outputs: [
      { id: "effectiveDiameter", label: "Empirical tensile-area diameter", defaultUnit: "mm", expression: "((majorDiameter)-0.938194*(pitch))" },
      { id: "tensileArea", label: "External thread tensile stress area", defaultUnit: "mm²", expression: "(0.7854*(((majorDiameter)-0.938194*(pitch)))^(2))" },
    ],
    formula: "At = 0.7854(D − 0.938194P)²",
    warnings: ["This is an empirical external metric-thread tensile-area relation from user-entered basic major diameter and pitch. It does not select a thread standard, determine material strength, preload, fatigue, stripping, tightening torque, acceptance, safety, or approval."],
  }),
  toolDeflection: libraryDoc("toolDeflection", {
    fields: [
      { id: "lateralForce", label: "Declared lateral force", symbol: "F", help: "Single lateral tip force for the ideal circular cantilever screen.", family: "force", defaultValue: 150, defaultUnit: "N" },
      { id: "overhang", label: "Free overhang", symbol: "L", help: "Free cantilever length from the effective clamp plane to force application point.", family: "length", defaultValue: 50, defaultUnit: "mm" },
      { id: "coreDiameter", label: "Declared core diameter", symbol: "d", help: "Circular effective core diameter; flute, neck, holder, and contact geometry are excluded.", family: "length", defaultValue: 12, defaultUnit: "mm" },
      { id: "modulus", label: "Declared elastic modulus", symbol: "E", help: "User-entered linear-elastic modulus for the stated cutter material.", family: "stress", defaultValue: 600, defaultUnit: "GPa" }
    ],
    outputs: [
      { id: "inertia", label: "Circular core second moment", family: "secondMoment", defaultUnit: "m⁴", expression: "pi*((coreDiameter/0.001)/1000)^4/64" },
      { id: "deflection", label: "Ideal tip deflection", family: "length", defaultUnit: "mm", expression: "(lateralForce*((overhang/0.001)/1000)^3/(3*((modulus/1000000000)*1e9)*(pi*((coreDiameter/0.001)/1000)^4/64))*1000)*0.001" },
      { id: "stress", label: "Outer-fiber bending stress", family: "stress", defaultUnit: "MPa", expression: "(32*lateralForce*((overhang/0.001)/1000)/(pi*((coreDiameter/0.001)/1000)^3)/1e6)*1000000" }
    ],
    formula: "I = πd⁴/64 · δ = FL³/(3EI) · σ = 32FL/(πd³)",
    warnings: ["Elementary circular constant-section cantilever only; flutes, taper, holder/spindle/fixture compliance, contact distribution, runout, dynamics, chatter, fatigue, tool selection, safety, and production approval are excluded."],
  }),
  torqueSpeedDuty: libraryDoc("torqueSpeedDuty", {
    fields: [
      { id: "inertia", label: "Reflected inertia", symbol: "J", help: "User-entered total inertia referred to the shaft.", defaultValue: 0.002, defaultUnit: "kg·m²" },
      { id: "speedChange", label: "Speed change", symbol: "Δn", help: "Declared shaft speed change from the motion segment.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "accelerationTime", label: "Acceleration time", symbol: "ta", help: "Declared acceleration-segment duration.", defaultValue: 0.5, defaultUnit: "s" },
      { id: "loadTorque", label: "Declared load torque", symbol: "Tload", help: "User-entered steady load torque for the acceleration segment.", defaultValue: 1.2, defaultUnit: "N·m", signed: true },
      { id: "targetSpeed", label: "Target speed", symbol: "n", help: "User-entered shaft speed at the evaluated duty point.", defaultValue: 1500, defaultUnit: "rpm" },
      { id: "availableTorque", label: "Stated available torque", symbol: "Tavail", help: "User-entered available torque at target speed; no motor curve is generated.", defaultValue: 2.5, defaultUnit: "N·m" },
    ],
    outputs: [
      { id: "angularAcceleration", label: "Angular acceleration", defaultUnit: "rad/s²", expression: "((speedChange)*(2*pi/60)/(accelerationTime))" },
      { id: "accelerationTorque", label: "Inertia acceleration torque", family: "torque", defaultUnit: "N·m", expression: "((inertia)*((speedChange)*(2*pi/60)/(accelerationTime)))" },
      { id: "requiredTorque", label: "Direct required acceleration torque", family: "torque", defaultUnit: "N·m", expression: "((loadTorque)+((inertia)*((speedChange)*(2*pi/60)/(accelerationTime))))" },
      { id: "shaftPower", label: "Duty-point shaft power", defaultUnit: "kW", expression: "(((loadTorque)+((inertia)*((speedChange)*(2*pi/60)/(accelerationTime))))*(targetSpeed)*2*pi/60/1000)" },
      { id: "torqueMargin", label: "Stated torque minus direct requirement", family: "torque", defaultUnit: "N·m", expression: "((availableTorque)-((loadTorque)+((inertia)*((speedChange)*(2*pi/60)/(accelerationTime)))))" },
    ],
    formula: "α = Δn(2π/60)/ta · Tacc = Jα · Treq = Tload + Tacc · P = Treqω",
    warnings: ["This one-duty-point arithmetic uses user-entered reflected inertia, load torque, and available torque. It does not generate a motor torque-speed curve, assess peak/rated/RMS capacity, efficiency, thermal behavior, gearing, safety factor, tuning, motor or drive selection, or design approval."],
  }),
  torsion: libraryDoc("torsion", {
    fields: [
      { id: "torque", label: "Applied torque", symbol: "T", help: "Steady transmitted torque for the displayed shaft segment.", family: "torque", defaultValue: 250, defaultUnit: "N·m" },
      { id: "diameter", label: "Shaft diameter", symbol: "D", help: "Uniform solid circular shaft diameter.", family: "length", defaultValue: 35, defaultUnit: "mm" },
      { id: "length", label: "Shaft length", symbol: "L", help: "Uniform torsion length between the stated reference sections.", family: "length", defaultValue: 800, defaultUnit: "mm" },
      { id: "shearModulus", label: "Shear modulus", symbol: "G", help: "Elastic shear modulus for the stated material condition.", family: "stress", defaultValue: 79, defaultUnit: "GPa" },
      { id: "rpm", label: "Rotational speed", symbol: "n", help: "Steady rotational speed for the power relationship.", family: "frequency", defaultValue: 1450, defaultUnit: "rpm", signed: true }
    ],
    outputs: [
      { id: "shearStress", label: "Maximum torsional shear stress", family: "stress", defaultUnit: "MPa", expression: "torque*((diameter/0.001)/1000/2)/(pi*((diameter/0.001)/1000)^4/32)" },
      { id: "twistDeg", label: "Elastic angle of twist", family: "angle", defaultUnit: "°", expression: "torque*((length/0.001)/1000)/(((shearModulus/1000000000)*1e9)*(pi*((diameter/0.001)/1000)^4/32))" },
      { id: "power", label: "Transmitted mechanical power", family: "power", defaultUnit: "kW", expression: "torque*(2*pi*(rpm/0.0166666666666667)/60)" },
      { id: "polarMoment", label: "Polar second moment", family: "secondMoment", defaultUnit: "mm⁴", expression: "pi*((diameter/0.001)/1000)^4/32" }
    ],
    formula: "J = πD⁴/32 · τmax = Tc/J · φ = TL/GJ · P = Tω",
    warnings: ["This is a uniform solid circular elastic shaft under steady torque. It excludes stress concentration, combined bending, fatigue, keyways, bearings, critical speed, torsional vibration, material strength limits, and code or safety-factor decisions."],
  }),
  torsionSpring: libraryDoc("torsionSpring", {
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
  triangleTruss: libraryDoc("triangleTruss", {
    fields: [
      { id: "span", label: "Support span", symbol: "L", help: "Horizontal distance between the two lower pin supports.", family: "length", defaultValue: 3, defaultUnit: "m" },
      { id: "rise", label: "Apex rise", symbol: "h", help: "Vertical apex distance above the lower chord.", family: "length", defaultValue: 2, defaultUnit: "m" },
      { id: "apexLoad", label: "Declared vertical apex load", symbol: "P", help: "Downward static load at the apex joint only.", family: "force", defaultValue: 12, defaultUnit: "kN" }
    ],
    outputs: [
      { id: "diagonalLength", label: "Each diagonal member length", family: "length", defaultUnit: "m", expression: "sqrt((span/2)^2+rise^2)" },
      { id: "leftReaction", label: "Left vertical support reaction", family: "force", defaultUnit: "kN", expression: "((apexLoad/1000)*1000)/2" },
      { id: "rightReaction", label: "Right vertical support reaction", family: "force", defaultUnit: "kN", expression: "((apexLoad/1000)*1000)/2" },
      { id: "diagonalCompression", label: "Each diagonal axial compression magnitude", family: "force", defaultUnit: "kN", expression: "(((apexLoad/1000)*1000)/2)/(rise/sqrt((span/2)^2+rise^2))" },
      { id: "bottomChordTension", label: "Bottom-chord axial tension magnitude", family: "force", defaultUnit: "kN", expression: "(((apexLoad/1000)*1000)/2)/(rise/sqrt((span/2)^2+rise^2))*((span/2)/sqrt((span/2)^2+rise^2))" }
    ],
    formula: "ΣFy = 0 · RA = RB = P/2 · Ndiagonal = (P/2)/sin θ · Nbottom = Ndiagonal cos θ",
    warnings: ["This is a symmetric three-member, pin-jointed, two-force-member equilibrium model with one vertical apex load. It excludes arbitrary truss topology, joint rigidity, member sizing, buckling, deflection, connection design, stability, code checks, and approval."],
  }),
  vesselGeometry: libraryDoc("vesselGeometry", {
    fields: [
      { id: "internalDiameter", label: "Declared internal diameter", symbol: "Di", help: "User-entered inside diameter of the straight cylindrical shell.", family: "length", defaultValue: 500, defaultUnit: "mm" },
      { id: "straightLength", label: "Declared straight length", symbol: "L", help: "User-entered cylindrical shell length between excluded heads or discontinuities.", family: "length", defaultValue: 1200, defaultUnit: "mm" },
      { id: "wallThickness", label: "Declared wall thickness", symbol: "t", help: "User-entered uniform shell thickness used only for nominal outer geometry.", family: "length", defaultValue: 8, defaultUnit: "mm" }
    ],
    outputs: [
      { id: "internalVolume", label: "Straight-cylinder internal volume", family: "volume", defaultUnit: "L", expression: "pi*((internalDiameter/0.001)/2)^2*(straightLength/0.001)/1e9" },
      { id: "internalWettedArea", label: "Straight-cylinder internal wetted area", family: "area", defaultUnit: "m²", expression: "pi*(internalDiameter/0.001)*(straightLength/0.001)/1e6" },
      { id: "shellVolume", label: "Nominal straight-shell material volume", family: "volume", defaultUnit: "L", expression: "pi*(((internalDiameter/0.001)/2+(wallThickness/0.001))^2-((internalDiameter/0.001)/2)^2)*(straightLength/0.001)/1e9" }
    ],
    formula: "Vi = π(Di/2)²L · Ai = πDiL · Vshell = π[(Di/2+t)² − (Di/2)²]L",
    warnings: ["This is straight cylindrical shell geometry only. It excludes heads, nozzles, discontinuities, membrane or local stress, pressure rating, corrosion allowance, external pressure, code compliance, safety, and approval."],
  }),
  wormDrive: libraryDoc("wormDrive", {
    fields: [
      { id: "wheelTeeth", label: "Worm-wheel teeth", symbol: "Zw", help: "Declared driven wheel tooth count for the ideal worm reduction.", defaultValue: 50, defaultUnit: "teeth" },
      { id: "wormStarts", label: "Worm starts", symbol: "S", help: "Declared worm thread starts; it is the ideal driving tooth count.", defaultValue: 1, defaultUnit: "starts" },
      { id: "inputSpeed", label: "Worm input speed", symbol: "nin", help: "Declared worm input speed for the ideal speed reduction.", defaultValue: 1400, defaultUnit: "rpm" },
      { id: "inputTorque", label: "Worm input torque", symbol: "Tin", help: "Declared worm input torque before user-entered efficiency.", defaultValue: 5, defaultUnit: "N·m" },
      { id: "efficiency", label: "Declared worm-drive efficiency", symbol: "η", help: "User-entered drive efficiency; this workspace does not predict it.", defaultValue: 70, defaultUnit: "%" },
    ],
    outputs: [
      { id: "ratio", label: "Ideal worm reduction ratio", defaultUnit: ":1", expression: "wheelTeeth/wormStarts" },
      { id: "outputSpeed", label: "Ideal wheel output speed", defaultUnit: "rpm", expression: "inputSpeed/(wheelTeeth/wormStarts)" },
      { id: "outputTorque", label: "Declared-efficiency wheel torque", family: "torque", defaultUnit: "N·m", expression: "inputTorque*(wheelTeeth/wormStarts)*(efficiency/100)" },
    ],
    formula: "i = Zw/S · nout = nin/i · Tout = Tin iη",
    warnings: ["This is a one-stage ideal tooth-ratio screen with a user-entered efficiency. It does not select a worm set, predict efficiency or self-locking, model tooth contact/stress, heat, lubrication, backlash, noise, duty, durability, safety, or product suitability."],
  }),
};
