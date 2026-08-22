/**
 * Engineering Desk — Instrument Panel Atelier reminder:
 * This is the numerical trust layer. Compute in canonical SI where practical,
 * expose model limits, and return structured validation instead of silent output.
 */

import type { ToolId } from "@/lib/catalog";
import { convertQuantity, isUnitFamilyId, unitFamilyOptions, unitSymbol, unitsForFamily, type UnitFamilyId } from "@/lib/units";

export type FieldKind = "number" | "select" | "text";
export type FieldDefinition = {
  key: string;
  label: string;
  symbol?: string;
  helper: string;
  kind: FieldKind;
  unit?: string;
  options?: { value: string; label: string }[];
};

export type CalculationValue = { key: string; label: string; raw: number; display: string; unit: string };
export type CalculationState = {
  values: CalculationValue[];
  warnings: string[];
  errors: string[];
  method: string;
};

export const toolFields: Record<ToolId, FieldDefinition[]> = {
  axial: [
    { key: "force", label: "Axial load", symbol: "F", helper: "Positive = tension; negative = compression.", kind: "number", unit: "kN" },
    { key: "area", label: "Cross-sectional area", symbol: "A", helper: "Uniform area, away from local load effects.", kind: "number", unit: "mm²" },
    { key: "length", label: "Original length", symbol: "L", helper: "Unloaded gauge length of the member.", kind: "number", unit: "mm" },
    { key: "modulus", label: "Elastic modulus", symbol: "E", helper: "Linear-elastic material modulus.", kind: "number", unit: "GPa" },
  ],
  beam: [
    { key: "case", label: "Boundary / load case", helper: "Only the diagrammed elementary cases are available.", kind: "select", options: [{ value: "cantilever", label: "Cantilever · end point load" }, { value: "simple", label: "Simply supported · center point load" }] },
    { key: "load", label: "Point load", symbol: "P", helper: "Downward magnitude at the diagrammed load point.", kind: "number", unit: "kN" },
    { key: "length", label: "Span", symbol: "L", helper: "Distance between the fixed point or supports.", kind: "number", unit: "m" },
    { key: "modulus", label: "Elastic modulus", symbol: "E", helper: "Assumes a homogeneous, linear-elastic member.", kind: "number", unit: "GPa" },
    { key: "inertia", label: "Second moment of area", symbol: "I", helper: "Use the bending-axis second moment of area.", kind: "number", unit: "cm⁴" },
  ],
  stability: [
    { key: "endCondition", label: "End condition", helper: "The effective-length factor is part of the ideal model.", kind: "select", options: [{ value: "1", label: "Pinned–pinned · K = 1.000" }, { value: "0.5", label: "Fixed–fixed · K = 0.500" }, { value: "0.699", label: "Fixed–pinned · K = 0.699" }, { value: "2", label: "Fixed–free · K = 2.000" }] },
    { key: "length", label: "Unsupported length", symbol: "L", helper: "Distance between lateral restraints.", kind: "number", unit: "m" },
    { key: "modulus", label: "Elastic modulus", symbol: "E", helper: "Elastic material property used by the ideal model.", kind: "number", unit: "GPa" },
    { key: "inertia", label: "Least second moment", symbol: "I", helper: "Use the smaller principal-axis value.", kind: "number", unit: "cm⁴" },
  ],
  section: [
    { key: "shape", label: "Cross-section", helper: "Basic closed forms with centroidal horizontal axis.", kind: "select", options: [{ value: "rectangle", label: "Rectangle" }, { value: "circle", label: "Solid circle" }, { value: "annulus", label: "Circular tube" }] },
    { key: "width", label: "Width / outer diameter", symbol: "b / D", helper: "For circle/tube, enter outer diameter here.", kind: "number", unit: "mm" },
    { key: "height", label: "Height", symbol: "h", helper: "Used for rectangle only.", kind: "number", unit: "mm" },
    { key: "innerDiameter", label: "Inner diameter", symbol: "d", helper: "Used for circular tube only.", kind: "number", unit: "mm" },
  ],
  converter: [
    { key: "category", label: "Quantity family", helper: "Only compatible units can be converted together.", kind: "select", options: unitFamilyOptions.map(({ value, label }) => ({ value, label })) },
    { key: "value", label: "Value", helper: "Enter a finite numerical value.", kind: "number" },
    { key: "from", label: "From unit", helper: "Source display unit.", kind: "select" },
    { key: "to", label: "To unit", helper: "Target display unit.", kind: "select" },
  ],
  triangle: [
    { key: "legA", label: "Horizontal leg", symbol: "a", helper: "One perpendicular leg of the displayed right triangle.", kind: "number", unit: "mm" },
    { key: "legB", label: "Vertical leg", symbol: "b", helper: "The second perpendicular leg of the displayed triangle.", kind: "number", unit: "mm" },
  ],
  coordinate: [
    { key: "x1", label: "Point A · x", symbol: "x₁", helper: "First point, x coordinate.", kind: "number", unit: "mm" },
    { key: "y1", label: "Point A · y", symbol: "y₁", helper: "First point, y coordinate.", kind: "number", unit: "mm" },
    { key: "z1", label: "Point A · z", symbol: "z₁", helper: "First point, z coordinate.", kind: "number", unit: "mm" },
    { key: "x2", label: "Point B · x", symbol: "x₂", helper: "Second point, x coordinate.", kind: "number", unit: "mm" },
    { key: "y2", label: "Point B · y", symbol: "y₂", helper: "Second point, y coordinate.", kind: "number", unit: "mm" },
    { key: "z2", label: "Point B · z", symbol: "z₂", helper: "Second point, z coordinate.", kind: "number", unit: "mm" },
  ],
  cylinder: [
    { key: "diameter", label: "Diameter", symbol: "D", helper: "Nominal outside diameter of a right circular cylinder.", kind: "number", unit: "mm" },
    { key: "length", label: "Cylinder length", symbol: "L", helper: "Axial length of the displayed cylinder.", kind: "number", unit: "mm" },
  ],
  density: [
    { key: "mass", label: "Mass", symbol: "m", helper: "User-entered mass; no material lookup is used.", kind: "number", unit: "kg" },
    { key: "volume", label: "Volume", symbol: "V", helper: "User-entered occupied volume.", kind: "number", unit: "L" },
  ],
  newton: [
    { key: "mass", label: "Mass", symbol: "m", helper: "Constant mass in the selected inertial-frame calculation.", kind: "number", unit: "kg" },
    { key: "acceleration", label: "Acceleration", symbol: "a", helper: "Signed one-dimensional acceleration; positive is the displayed positive direction.", kind: "number", unit: "m/s²" },
  ],
  kinetic: [
    { key: "mass", label: "Mass", symbol: "m", helper: "Constant translating mass.", kind: "number", unit: "kg" },
    { key: "speed", label: "Speed", symbol: "v", helper: "Classical translational speed magnitude.", kind: "number", unit: "m/s" },
  ],
  hydrostatic: [
    { key: "density", label: "Liquid density", symbol: "ρ", helper: "User-entered density for the stated liquid condition.", kind: "number", unit: "kg/m³" },
    { key: "depth", label: "Vertical depth", symbol: "h", helper: "Vertical distance below the free surface, not an inclined path length.", kind: "number", unit: "m" },
  ],
  continuity: [
    { key: "area1", label: "First flow area", symbol: "A₁", helper: "Area normal to the mean flow direction at section 1.", kind: "number", unit: "mm²" },
    { key: "velocity1", label: "First mean velocity", symbol: "v₁", helper: "User-entered mean velocity at section 1.", kind: "number", unit: "m/s" },
    { key: "area2", label: "Second flow area", symbol: "A₂", helper: "Area normal to the mean flow direction at section 2.", kind: "number", unit: "mm²" },
  ],
  sensibleHeat: [
    { key: "mass", label: "Mass", symbol: "m", helper: "Mass of the material undergoing temperature change.", kind: "number", unit: "kg" },
    { key: "specificHeat", label: "Specific heat", symbol: "c", helper: "User-entered value for the stated material and condition; no lookup is used.", kind: "number", unit: "kJ/kg·K" },
    { key: "deltaT", label: "Temperature change", symbol: "ΔT", helper: "Final minus initial temperature; sign indicates heating or cooling.", kind: "number", unit: "K or °C" },
  ],
  ohm: [
    { key: "voltage", label: "Applied voltage", symbol: "V", helper: "Voltage across one ideal resistor in the displayed DC relationship.", kind: "number", unit: "V" },
    { key: "resistance", label: "Resistance", symbol: "R", helper: "Constant ideal resistance of the single displayed component.", kind: "number", unit: "Ω" },
  ],
  fits: [
    { key: "holeMin", label: "Hole minimum", symbol: "Hmin", helper: "Lower stated limit for the internal mating feature.", kind: "number", unit: "mm" },
    { key: "holeMax", label: "Hole maximum", symbol: "Hmax", helper: "Upper stated limit for the internal mating feature.", kind: "number", unit: "mm" },
    { key: "shaftMin", label: "Shaft minimum", symbol: "Smin", helper: "Lower stated limit for the external mating feature.", kind: "number", unit: "mm" },
    { key: "shaftMax", label: "Shaft maximum", symbol: "Smax", helper: "Upper stated limit for the external mating feature.", kind: "number", unit: "mm" },
  ],
  toleranceStack: [
    { key: "nominal", label: "Nominal chain result", symbol: "N", helper: "Nominal one-dimensional result before contributor variation.", kind: "number", unit: "mm" },
    { key: "t1", label: "Contributor 1 tolerance", symbol: "±t₁", helper: "Symmetric stated tolerance magnitude for the first contributor.", kind: "number", unit: "mm" },
    { key: "t2", label: "Contributor 2 tolerance", symbol: "±t₂", helper: "Symmetric stated tolerance magnitude for the second contributor.", kind: "number", unit: "mm" },
    { key: "t3", label: "Contributor 3 tolerance", symbol: "±t₃", helper: "Symmetric stated tolerance magnitude for the third contributor.", kind: "number", unit: "mm" },
    { key: "t4", label: "Contributor 4 tolerance", symbol: "±t₄", helper: "Optional visible contributor; enter 0 when unused.", kind: "number", unit: "mm" },
    { key: "t5", label: "Contributor 5 tolerance", symbol: "±t₅", helper: "Optional visible contributor; enter 0 when unused.", kind: "number", unit: "mm" },
    { key: "t6", label: "Contributor 6 tolerance", symbol: "±t₆", helper: "Optional visible contributor; enter 0 when unused.", kind: "number", unit: "mm" },
  ],
  toleranceSampling: [
    { key: "nominal", label: "Nominal chain result", symbol: "N", helper: "Nominal one-dimensional result before sampled contributor variation.", kind: "number", unit: "mm" },
    { key: "t1", label: "Contributor 1 uniform half-width", symbol: "±t₁", helper: "User-declared symmetric uniform half-width; enter 0 only when unused.", kind: "number", unit: "mm" },
    { key: "t2", label: "Contributor 2 uniform half-width", symbol: "±t₂", helper: "User-declared symmetric uniform half-width; enter 0 only when unused.", kind: "number", unit: "mm" },
    { key: "t3", label: "Contributor 3 uniform half-width", symbol: "±t₃", helper: "User-declared symmetric uniform half-width; enter 0 only when unused.", kind: "number", unit: "mm" },
    { key: "t4", label: "Contributor 4 uniform half-width", symbol: "±t₄", helper: "Optional visible contributor; enter 0 when unused.", kind: "number", unit: "mm" },
    { key: "t5", label: "Contributor 5 uniform half-width", symbol: "±t₅", helper: "Optional visible contributor; enter 0 when unused.", kind: "number", unit: "mm" },
    { key: "t6", label: "Contributor 6 uniform half-width", symbol: "±t₆", helper: "Optional visible contributor; enter 0 when unused.", kind: "number", unit: "mm" },
    { key: "seed", label: "Declared integer seed", symbol: "seed", helper: "Visible non-negative integer state for reproducible local pseudo-random draws; it does not represent a physical population.", kind: "number", unit: "—" },
    { key: "sampleCount", label: "Declared sample count", symbol: "n", helper: "Finite number of local draws from 10 through 10,000; more draws do not validate the input model.", kind: "number", unit: "samples" },
  ],
  taylorToolLife: [
    { key: "mode", label: "Solve mode", helper: "Choose whether the entered independent condition is cutting speed or tool life.", kind: "select", options: [{ value: "lifeFromSpeed", label: "Solve tool life from cutting speed" }, { value: "speedFromLife", label: "Solve cutting speed from tool life" }] },
    { key: "taylorConstant", label: "Declared Taylor constant", symbol: "C", helper: "User-entered empirical constant in the compatible units for V·Tⁿ; it is not derived here.", kind: "number", unit: "(m/min)·minⁿ" },
    { key: "exponent", label: "Declared Taylor exponent", symbol: "n", helper: "User-entered positive exponent from the same matched empirical data as C.", kind: "number", unit: "—" },
    { key: "cuttingSpeed", label: "Declared cutting speed", symbol: "V", helper: "Used only in the solve-life mode; no cutting speed recommendation is made.", kind: "number", unit: "m/min" },
    { key: "toolLife", label: "Declared tool life", symbol: "T", helper: "Used only in the solve-speed mode; no tool-life target is selected.", kind: "number", unit: "min" },
  ],
  cuttingForce: [
    { key: "specificForce", label: "Declared specific cutting force", symbol: "kc", helper: "User-entered force coefficient for the stated material, tool, and condition; no lookup or inference is used.", kind: "number", unit: "N/mm²" },
    { key: "depth", label: "Depth of cut", symbol: "ap", helper: "Declared engaged depth in the simplified rectangular uncut-chip area.", kind: "number", unit: "mm" },
    { key: "feed", label: "Feed per revolution", symbol: "f", helper: "Declared feed per revolution in the simplified rectangular uncut-chip area.", kind: "number", unit: "mm/rev" },
    { key: "cuttingSpeed", label: "Declared cutting speed", symbol: "Vc", helper: "User-entered surface speed used only to convert force to ideal mechanical cutting power.", kind: "number", unit: "m/min" },
  ],
  weldGroup: [
    { key: "lineLength", label: "Length of each line weld", symbol: "L", helper: "Equal effective length of each of two parallel line welds in the symmetric model.", kind: "number", unit: "mm" },
    { key: "centerSpacing", label: "Center spacing between lines", symbol: "b", helper: "Perpendicular distance between the two equal parallel weld centrelines.", kind: "number", unit: "mm" },
    { key: "directForce", label: "Declared in-plane direct force", symbol: "F", helper: "Known resultant in-plane force magnitude distributed uniformly only in the displayed line-weld model.", kind: "number", unit: "N" },
    { key: "torsionalMoment", label: "Declared torsional moment", symbol: "M", helper: "In-plane torsional-moment magnitude about the symmetric weld-group centroid.", kind: "number", unit: "N·m" },
  ],
  position: [
    { key: "x", label: "Measured X offset", symbol: "Δx", helper: "Measured center offset in the declared datum frame.", kind: "number", unit: "mm" },
    { key: "y", label: "Measured Y offset", symbol: "Δy", helper: "Measured center offset in the declared datum frame.", kind: "number", unit: "mm" },
    { key: "tolerance", label: "Stated position tolerance", symbol: "⌀T", helper: "Diametrical positional tolerance for this simplified screen.", kind: "number", unit: "mm" },
  ],
  mmc: [
    { key: "featureType", label: "Feature type", helper: "Select internal hole or external pin for the displayed one-feature model.", kind: "select", options: [{ value: "hole", label: "Internal feature · hole" }, { value: "pin", label: "External feature · pin" }] },
    { key: "mmcSize", label: "MMC size", symbol: "MMC", helper: "Smallest permitted hole or largest permitted pin size.", kind: "number", unit: "mm" },
    { key: "actualSize", label: "Actual feature size", symbol: "A", helper: "Measured size of the same feature in the stated condition.", kind: "number", unit: "mm" },
    { key: "positionTolerance", label: "Position tolerance at MMC", symbol: "⌀T", helper: "Stated diametrical positional tolerance at MMC.", kind: "number", unit: "mm" },
  ],
  motionProfile: [
    { key: "distance", label: "Move distance", symbol: "s", helper: "Rest-to-rest travel distance for the stated linear or angular axis.", kind: "number", unit: "mm" },
    { key: "accelTime", label: "Acceleration time", symbol: "ta", helper: "Time for each equal acceleration and deceleration phase.", kind: "number", unit: "s" },
    { key: "cruiseTime", label: "Cruise time", symbol: "tc", helper: "Constant-velocity phase time; enter zero only for a triangular profile.", kind: "number", unit: "s" },
  ],
  reflectedInertia: [
    { key: "loadInertia", label: "Load inertia", symbol: "JL", helper: "Stated inertia at the driven side of the ideal reduction.", kind: "number", unit: "kg·m²" },
    { key: "gearRatio", label: "Reduction ratio", symbol: "N", helper: "Driven speed divided by motor speed is 1/N; enter N > 1 for reduction.", kind: "number", unit: ":1" },
    { key: "motorInertia", label: "Motor inertia", symbol: "JM", helper: "Rotor inertia for the stated motor condition.", kind: "number", unit: "kg·m²" },
  ],
  pneumatic: [
    { key: "bore", label: "Cylinder bore", symbol: "D", helper: "Nominal internal bore diameter.", kind: "number", unit: "mm" },
    { key: "rod", label: "Rod diameter", symbol: "d", helper: "Rod diameter used to reduce retract-side area.", kind: "number", unit: "mm" },
    { key: "pressure", label: "Operating pressure", symbol: "P", helper: "Pressure at the actuator, not nominal compressor rating.", kind: "number", unit: "bar(g)" },
    { key: "efficiency", label: "Applied force factor", symbol: "η", helper: "User-entered multiplier after friction and practical derating, from 0 to 100.", kind: "number", unit: "%" },
  ],
  clampForce: [
    { key: "actuatorForce", label: "Actuator force", symbol: "F", helper: "Known force at the stated linkage input.", kind: "number", unit: "kN" },
    { key: "angle", label: "Transfer angle", symbol: "θ", helper: "Angle between actuator direction and transferred force direction.", kind: "number", unit: "°" },
    { key: "efficiency", label: "Transmission efficiency", symbol: "η", helper: "User-entered multiplier for joint/friction losses, from 0 to 100.", kind: "number", unit: "%" },
  ],
  torsion: [
    { key: "torque", label: "Applied torque", symbol: "T", helper: "Steady transmitted torque for the displayed shaft segment.", kind: "number", unit: "N·m" },
    { key: "diameter", label: "Shaft diameter", symbol: "D", helper: "Uniform solid circular shaft diameter.", kind: "number", unit: "mm" },
    { key: "length", label: "Shaft length", symbol: "L", helper: "Uniform torsion length between the stated reference sections.", kind: "number", unit: "mm" },
    { key: "shearModulus", label: "Shear modulus", symbol: "G", helper: "Elastic shear modulus for the stated material condition.", kind: "number", unit: "GPa" },
    { key: "rpm", label: "Rotational speed", symbol: "n", helper: "Steady rotational speed for the power relationship.", kind: "number", unit: "rpm" },
  ],
  bearingLife: [
    { key: "bearingType", label: "Bearing type", helper: "Select the basic exponent only; equivalent load remains user-entered.", kind: "select", options: [{ value: "ball", label: "Ball bearing · p = 3" }, { value: "roller", label: "Roller bearing · p = 10/3" }] },
    { key: "dynamicRating", label: "Dynamic rating", symbol: "C", helper: "Published basic dynamic load rating for the specific bearing.", kind: "number", unit: "kN" },
    { key: "equivalentLoad", label: "Equivalent load", symbol: "P", helper: "User-entered equivalent dynamic load under stated operating conditions.", kind: "number", unit: "kN" },
    { key: "rpm", label: "Rotational speed", symbol: "n", helper: "Constant shaft speed for the time conversion.", kind: "number", unit: "rpm" },
  ],
  boltPreload: [
    { key: "torque", label: "Applied torque", symbol: "T", helper: "Applied tightening torque for the one stated fastener.", kind: "number", unit: "N·m" },
    { key: "diameter", label: "Nominal diameter", symbol: "D", helper: "Nominal bolt shank diameter used in the nut-factor relationship.", kind: "number", unit: "mm" },
    { key: "nutFactor", label: "Torque coefficient", symbol: "K", helper: "User-entered nut factor; friction and lubrication strongly affect it.", kind: "number", unit: "—" },
    { key: "uncertainty", label: "Preload uncertainty", symbol: "±u", helper: "User-entered one-sided uncertainty magnitude from 0 to 100.", kind: "number", unit: "%" },
  ],
  millingMrr: [
    { key: "axialDepth", label: "Axial depth", symbol: "ap", helper: "Engaged axial depth of cut for the stated milling operation.", kind: "number", unit: "mm" },
    { key: "radialWidth", label: "Radial engagement", symbol: "ae", helper: "Engaged radial width of cut for the stated operation.", kind: "number", unit: "mm" },
    { key: "tableFeed", label: "Table feed", symbol: "Vf", helper: "Programmed table-feed rate, not feed per tooth or per revolution.", kind: "number", unit: "mm/min" },
  ],
  lmtd: [
    { key: "arrangement", label: "Flow arrangement", helper: "Choose parallel or counterflow for the displayed terminal-temperature relationship.", kind: "select", options: [{ value: "counter", label: "Counterflow" }, { value: "parallel", label: "Parallel flow" }] },
    { key: "hotIn", label: "Hot-side inlet", symbol: "Th,i", helper: "Hot-stream temperature at its inlet.", kind: "number", unit: "°C" },
    { key: "hotOut", label: "Hot-side outlet", symbol: "Th,o", helper: "Hot-stream temperature at its outlet.", kind: "number", unit: "°C" },
    { key: "coldIn", label: "Cold-side inlet", symbol: "Tc,i", helper: "Cold-stream temperature at its inlet.", kind: "number", unit: "°C" },
    { key: "coldOut", label: "Cold-side outlet", symbol: "Tc,o", helper: "Cold-stream temperature at its outlet.", kind: "number", unit: "°C" },
    { key: "overallCoefficient", label: "Declared overall coefficient", symbol: "U", helper: "User-entered overall heat-transfer coefficient for the stated exchanger condition; it is not derived here.", kind: "number", unit: "W/(m²·K)" },
    { key: "area", label: "Declared transfer area", symbol: "A", helper: "User-entered effective transfer area; no geometry or fouling factor is inferred.", kind: "number", unit: "m²" },
  ],
  darcy: [
    { key: "frictionFactor", label: "Darcy friction factor", symbol: "f", helper: "User-entered Darcy (not Fanning) friction factor for the stated condition.", kind: "number", unit: "—" },
    { key: "length", label: "Pipe length", symbol: "L", helper: "Straight developed-flow length for the major-loss screen.", kind: "number", unit: "m" },
    { key: "diameter", label: "Hydraulic diameter", symbol: "Dh", helper: "Internal or hydraulic diameter of the displayed conduit.", kind: "number", unit: "mm" },
    { key: "density", label: "Fluid density", symbol: "ρ", helper: "User-entered density at the stated fluid condition.", kind: "number", unit: "kg/m³" },
    { key: "velocity", label: "Mean velocity", symbol: "v", helper: "User-entered mean cross-section velocity.", kind: "number", unit: "m/s" },
  ],
  thermalExpansion: [
    { key: "length", label: "Initial length", symbol: "L₀", helper: "Unloaded length at the stated initial temperature.", kind: "number", unit: "mm" },
    { key: "cte", label: "Linear expansion coefficient", symbol: "α", helper: "User-entered average CTE over the stated temperature interval.", kind: "number", unit: "µm/m·K" },
    { key: "deltaT", label: "Temperature change", symbol: "ΔT", helper: "Final minus initial temperature. Positive = heating.", kind: "number", unit: "K or °C" },
  ],
  thermalStress: [
    { key: "modulus", label: "Elastic modulus", symbol: "E", helper: "User-entered linear-elastic modulus for the stated material condition.", kind: "number", unit: "GPa" },
    { key: "cte", label: "Linear expansion coefficient", symbol: "α", helper: "User-entered average CTE over the stated temperature interval.", kind: "number", unit: "µm/m·K" },
    { key: "deltaT", label: "Temperature change", symbol: "ΔT", helper: "Final minus initial temperature. Positive = heating.", kind: "number", unit: "K or °C" },
  ],
  planeConduction: [
    { key: "conductivity", label: "Thermal conductivity", symbol: "k", helper: "User-entered conductivity at the stated material and temperature condition.", kind: "number", unit: "W/m·K" },
    { key: "area", label: "Heat-flow area", symbol: "A", helper: "Area normal to the assumed one-dimensional heat flow.", kind: "number", unit: "m²" },
    { key: "thickness", label: "Wall thickness", symbol: "L", helper: "Uniform thickness through the plane wall.", kind: "number", unit: "mm" },
    { key: "hotTemperature", label: "Hot-side surface", symbol: "Tₕ", helper: "Surface temperature at the named hot-side boundary.", kind: "number", unit: "°C" },
    { key: "coldTemperature", label: "Cold-side surface", symbol: "T𝚌", helper: "Surface temperature at the opposite named boundary.", kind: "number", unit: "°C" },
  ],
  bernoulli: [
    { key: "density", label: "Fluid density", symbol: "ρ", helper: "User-entered density for the stated fluid condition.", kind: "number", unit: "kg/m³" },
    { key: "velocity1", label: "Station 1 velocity", symbol: "v₁", helper: "Mean speed at station 1 on the selected streamline.", kind: "number", unit: "m/s" },
    { key: "elevation1", label: "Station 1 elevation", symbol: "z₁", helper: "Elevation relative to one common arbitrary datum.", kind: "number", unit: "m" },
    { key: "velocity2", label: "Station 2 velocity", symbol: "v₂", helper: "Mean speed at station 2 on the selected streamline.", kind: "number", unit: "m/s" },
    { key: "elevation2", label: "Station 2 elevation", symbol: "z₂", helper: "Elevation relative to the same datum as station 1.", kind: "number", unit: "m" },
  ],
  combinedStress: [
    { key: "axialStress", label: "Axial normal stress", symbol: "σa", helper: "Signed normal stress from direct axial loading at the point of interest.", kind: "number", unit: "MPa" },
    { key: "bendingStress", label: "Bending normal stress", symbol: "σb", helper: "Signed normal stress from bending at the same point and along the same axis.", kind: "number", unit: "MPa" },
    { key: "shearStress", label: "In-plane shear stress", symbol: "τxy", helper: "Signed in-plane shear stress at the same point.", kind: "number", unit: "MPa" },
  ],
  thinVessel: [
    { key: "pressure", label: "Internal gauge pressure", symbol: "p", helper: "Uniform internal gauge pressure; enter a positive magnitude.", kind: "number", unit: "MPa" },
    { key: "diameter", label: "Inside diameter", symbol: "D", helper: "Nominal inside diameter of the closed cylindrical shell.", kind: "number", unit: "mm" },
    { key: "thickness", label: "Wall thickness", symbol: "t", helper: "Uniform shell wall thickness for the thin-wall screen.", kind: "number", unit: "mm" },
  ],
  leadScrew: [
    { key: "axialForce", label: "Axial load", symbol: "F", helper: "Constant axial load at the nut in the stated direction.", kind: "number", unit: "kN" },
    { key: "lead", label: "Screw lead", symbol: "l", helper: "Linear nut travel per screw revolution.", kind: "number", unit: "mm/rev" },
    { key: "efficiency", label: "Mechanical efficiency", symbol: "η", helper: "User-entered combined screw/nut efficiency from 0 to 100.", kind: "number", unit: "%" },
    { key: "rpm", label: "Screw speed", symbol: "n", helper: "Constant screw rotational speed.", kind: "number", unit: "rpm" },
  ],
  airConsumption: [
    { key: "bore", label: "Cylinder bore", symbol: "D", helper: "Nominal internal bore diameter.", kind: "number", unit: "mm" },
    { key: "rod", label: "Rod diameter", symbol: "d", helper: "Rod diameter used for retract-side volume.", kind: "number", unit: "mm" },
    { key: "stroke", label: "Stroke", symbol: "s", helper: "Full extend and full retract travel per stated double-acting cycle.", kind: "number", unit: "mm" },
    { key: "pressure", label: "Operating pressure", symbol: "P", helper: "Gauge pressure at the cylinder; atmospheric pressure is added for the normalized free-air approximation.", kind: "number", unit: "bar(g)" },
    { key: "cycles", label: "Cycle rate", symbol: "c", helper: "Completed double-acting cycles per minute.", kind: "number", unit: "cycles/min" },
  ],
  gearRatio: [
    { key: "driverTeeth", label: "Driver teeth", symbol: "z₁", helper: "Tooth count of the input gear in one external gear pair.", kind: "number", unit: "teeth" },
    { key: "drivenTeeth", label: "Driven teeth", symbol: "z₂", helper: "Tooth count of the output gear in the same pair.", kind: "number", unit: "teeth" },
    { key: "inputRpm", label: "Input speed", symbol: "n₁", helper: "Constant driver rotational speed.", kind: "number", unit: "rpm" },
    { key: "inputTorque", label: "Input torque", symbol: "T₁", helper: "Steady driver torque.", kind: "number", unit: "N·m" },
    { key: "efficiency", label: "Transmission efficiency", symbol: "η", helper: "User-entered efficiency from 0 to 100.", kind: "number", unit: "%" },
  ],
  boltLoad: [
    { key: "diameter", label: "Bolt shank diameter", symbol: "d", helper: "Nominal unthreaded shank diameter used for the direct stress screen.", kind: "number", unit: "mm" },
    { key: "tension", label: "Known tensile load", symbol: "Ft", helper: "Direct known axial tension carried by this one bolt.", kind: "number", unit: "kN" },
    { key: "shear", label: "Known shear load", symbol: "Fs", helper: "Direct known transverse shear carried by this one bolt.", kind: "number", unit: "kN" },
    { key: "bearingLoad", label: "Known bearing load", symbol: "Fb", helper: "Direct load transferred through one stated bearing interface.", kind: "number", unit: "kN" },
    { key: "plateThickness", label: "Bearing thickness", symbol: "t", helper: "Loaded plate or washer thickness used for projected bearing area.", kind: "number", unit: "mm" },
  ],
  safetyMargin: [
    { key: "applied", label: "Applied stress magnitude", symbol: "σapp", helper: "Positive magnitude from one separately validated load case.", kind: "number", unit: "MPa" },
    { key: "allowable", label: "Allowable stress", symbol: "σallow", helper: "User-entered allowable on the same stress basis as the applied magnitude.", kind: "number", unit: "MPa" },
  ],
  circularArc: [
    { key: "radius", label: "Radius", symbol: "r", helper: "Nominal planar circle radius.", kind: "number", unit: "mm" },
    { key: "angle", label: "Central angle", symbol: "θ", helper: "Angle subtended by the arc from greater than 0 through 360 degrees.", kind: "number", unit: "°" },
  ],
  compressionSpring: [
    { key: "wire", label: "Wire diameter", symbol: "d", helper: "Round-wire diameter for the close-coiled spring model.", kind: "number", unit: "mm" },
    { key: "meanDiameter", label: "Mean coil diameter", symbol: "D", helper: "Centerline coil diameter, not outer or inner diameter.", kind: "number", unit: "mm" },
    { key: "activeCoils", label: "Active coils", symbol: "Na", helper: "Number of coils participating in elastic deflection.", kind: "number", unit: "coils" },
    { key: "shearModulus", label: "Shear modulus", symbol: "G", helper: "User-entered material shear modulus at the stated condition.", kind: "number", unit: "GPa" },
    { key: "deflection", label: "Applied deflection", symbol: "δ", helper: "Stated compression from the free configuration.", kind: "number", unit: "mm" },
  ],
  drillingTime: [
    { key: "diameter", label: "Drill diameter", symbol: "Dc", helper: "Nominal drill diameter used for cutting-speed arithmetic.", kind: "number", unit: "mm" },
    { key: "rpm", label: "Spindle speed", symbol: "n", helper: "Constant spindle speed during the stated cut.", kind: "number", unit: "rpm" },
    { key: "feedPerRev", label: "Feed per revolution", symbol: "fr", helper: "User-entered axial feed per spindle revolution.", kind: "number", unit: "mm/rev" },
    { key: "depth", label: "Cutting depth per hole", symbol: "ld", helper: "Entered drilling depth only; add approach and breakthrough separately if required.", kind: "number", unit: "mm" },
    { key: "holes", label: "Hole count", symbol: "i", helper: "Number of identical holes under the same stated process condition.", kind: "number", unit: "holes" },
  ],
  turningMrr: [
    { key: "depth", label: "Radial depth of cut", symbol: "ap", helper: "User-entered radial engagement depth under the stated turning condition.", kind: "number", unit: "mm" },
    { key: "feed", label: "Feed per revolution", symbol: "f", helper: "User-entered axial feed per workpiece revolution.", kind: "number", unit: "mm/rev" },
    { key: "cuttingSpeed", label: "Cutting speed", symbol: "Vc", helper: "User-entered surface cutting speed; this screen does not choose it.", kind: "number", unit: "m/min" },
  ],
  processCapability: [
    { key: "lsl", label: "Lower specification limit", symbol: "LSL", helper: "User-entered lower requirement limit on the measured characteristic.", kind: "number", unit: "unit" },
    { key: "usl", label: "Upper specification limit", symbol: "USL", helper: "User-entered upper requirement limit on the same characteristic.", kind: "number", unit: "unit" },
    { key: "mean", label: "Process mean", symbol: "x̄", helper: "Established process mean on the same measurement basis.", kind: "number", unit: "unit" },
    { key: "sigma", label: "Within-process standard deviation", symbol: "s", helper: "User-entered within-process standard deviation; establish its suitability separately.", kind: "number", unit: "unit" },
  ],
  extensionSpring: [
    { key: "initialTension", label: "Initial tension", symbol: "Fi", helper: "User-entered force holding coils together before extension.", kind: "number", unit: "N" },
    { key: "rate", label: "Spring rate", symbol: "k", helper: "User-entered rate over the declared working range.", kind: "number", unit: "N/mm" },
    { key: "extension", label: "Extension from free length", symbol: "x", helper: "User-entered extension in the stated linear range.", kind: "number", unit: "mm" },
  ],
  torsionSpring: [
    { key: "wire", label: "Wire diameter", symbol: "d", helper: "Nominal round-wire diameter.", kind: "number", unit: "mm" },
    { key: "meanDiameter", label: "Mean coil diameter", symbol: "D", helper: "Mean coil diameter; must be positive.", kind: "number", unit: "mm" },
    { key: "activeCoils", label: "Active coils", symbol: "n", helper: "User-entered active turns excluding inactive end effects.", kind: "number", unit: "turns" },
    { key: "modulus", label: "Elastic modulus", symbol: "E", helper: "User-entered Young’s modulus; no material selection is implied.", kind: "number", unit: "GPa" },
    { key: "angle", label: "Angular deflection", symbol: "θ", helper: "Applied spring angle in degrees.", kind: "number", unit: "deg" },
  ],
  keyway: [
    { key: "shaftDiameter", label: "Shaft diameter", symbol: "D", helper: "Nominal shaft diameter at the key engagement.", kind: "number", unit: "mm" },
    { key: "torque", label: "Transferred torque", symbol: "T", helper: "Known steady torque applied to the single keyed connection.", kind: "number", unit: "N·m" },
    { key: "width", label: "Key width", symbol: "w", helper: "Nominal rectangular key width at the shear plane.", kind: "number", unit: "mm" },
    { key: "height", label: "Key height", symbol: "h", helper: "Nominal rectangular key height; half height is used in the simplified bearing area.", kind: "number", unit: "mm" },
    { key: "length", label: "Engagement length", symbol: "L", helper: "Fully engaged key length under the stated direct-load model.", kind: "number", unit: "mm" },
  ],
  cuttingParameters: [
    { key: "diameter", label: "Cutter diameter", symbol: "Dc", helper: "Effective cutting diameter used for spindle-speed arithmetic.", kind: "number", unit: "mm" },
    { key: "cuttingSpeed", label: "Cutting speed", symbol: "vc", helper: "User-selected surface cutting speed; this workspace does not recommend it.", kind: "number", unit: "m/min" },
    { key: "teeth", label: "Number of teeth", symbol: "z", helper: "Engaged cutter tooth count used for the stated feed relation.", kind: "number", unit: "teeth" },
    { key: "chipLoad", label: "Feed per tooth", symbol: "fz", helper: "User-selected feed per tooth; this workspace does not select it.", kind: "number", unit: "mm/tooth" },
    { key: "axialDepth", label: "Axial depth of cut", symbol: "ap", helper: "Stated engaged axial cut depth.", kind: "number", unit: "mm" },
    { key: "radialWidth", label: "Radial width of cut", symbol: "ae", helper: "Stated engaged radial cut width.", kind: "number", unit: "mm" },
    { key: "specificForce", label: "Specific cutting force", symbol: "Kc", helper: "User-entered material/process force coefficient; no lookup is used.", kind: "number", unit: "MPa" },
    { key: "efficiency", label: "Machine efficiency", symbol: "η", helper: "User-entered machine efficiency from 0 to 100 used only in the stated power arithmetic.", kind: "number", unit: "%" },
  ],
  sheetMetalBend: [
    { key: "angle", label: "Bend angle", symbol: "B", helper: "Included bend angle in degrees for the one stated bend.", kind: "number", unit: "deg" },
    { key: "insideRadius", label: "Inside bend radius", symbol: "IR", helper: "Nominal inside bend radius.", kind: "number", unit: "mm" },
    { key: "thickness", label: "Material thickness", symbol: "MT", helper: "Nominal sheet thickness.", kind: "number", unit: "mm" },
    { key: "kFactor", label: "K-factor", symbol: "K", helper: "User-entered neutral-axis ratio; this screen does not select it.", kind: "number", unit: "—" },
    { key: "flange1", label: "First flange length", symbol: "L₁", helper: "First stated outside-to-apex flange length for the one-bend model.", kind: "number", unit: "mm" },
    { key: "flange2", label: "Second flange length", symbol: "L₂", helper: "Second stated outside-to-apex flange length for the one-bend model.", kind: "number", unit: "mm" },
  ],
  productionMetrics: [
    { key: "plannedTime", label: "Planned production time", symbol: "PPT", helper: "User-entered planned production window excluding only time your organization defines outside the plan.", kind: "number", unit: "min" },
    { key: "stopTime", label: "Stop time", symbol: "ST", helper: "User-entered tracked stop time inside the stated planned production window.", kind: "number", unit: "min" },
    { key: "idealCycle", label: "Ideal cycle time", symbol: "ICT", helper: "User-entered fastest achievable cycle time under the declared process basis.", kind: "number", unit: "s/unit" },
    { key: "totalCount", label: "Total count", symbol: "N", helper: "All pieces counted during the same stated production window.", kind: "number", unit: "units" },
    { key: "goodCount", label: "Good first-pass count", symbol: "G", helper: "User-classified first-pass good pieces; rework treatment must be consistent with the study.", kind: "number", unit: "units" },
    { key: "demand", label: "Demand in window", symbol: "D", helper: "Required quantity over the same stated planned production window, used only for takt arithmetic.", kind: "number", unit: "units" },
    { key: "operators", label: "Assigned operators", symbol: "nL", helper: "User-entered average assigned labor count over the stated production window.", kind: "number", unit: "people" },
  ],
  gageRr: [
    { key: "aP1t1", label: "Operator A · Part 1 · Trial 1", symbol: "A11", helper: "First raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "aP1t2", label: "Operator A · Part 1 · Trial 2", symbol: "A12", helper: "Second raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "aP2t1", label: "Operator A · Part 2 · Trial 1", symbol: "A21", helper: "Third raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "aP2t2", label: "Operator A · Part 2 · Trial 2", symbol: "A22", helper: "Fourth raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "bP1t1", label: "Operator B · Part 1 · Trial 1", symbol: "B11", helper: "Fifth raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "bP1t2", label: "Operator B · Part 1 · Trial 2", symbol: "B12", helper: "Sixth raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "bP2t1", label: "Operator B · Part 2 · Trial 1", symbol: "B21", helper: "Seventh raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
    { key: "bP2t2", label: "Operator B · Part 2 · Trial 2", symbol: "B22", helper: "Eighth raw observation in the fixed balanced study design.", kind: "number", unit: "unit" },
  ],
  gaugeBiasStudy: [
    { key: "referenceValue", label: "Declared reference value", symbol: "xref", helper: "Reference used for the stated arithmetic; this workspace does not choose or certify it.", kind: "number", unit: "unit" },
    { key: "observedMean", label: "Observed study mean", symbol: "ȳ", helper: "User-entered study mean on the same basis as the declared reference.", kind: "number", unit: "unit" },
    { key: "linearityReference1", label: "Linearity pair 1 reference", symbol: "x₁", helper: "Optional first declared reference; leave this and its observed field blank when unused.", kind: "number", unit: "unit" },
    { key: "linearityObserved1", label: "Linearity pair 1 observed mean", symbol: "ȳ₁", helper: "Optional observed mean paired to the first declared reference.", kind: "number", unit: "unit" },
    { key: "linearityReference2", label: "Linearity pair 2 reference", symbol: "x₂", helper: "Optional second declared reference; provided pairs must be contiguous.", kind: "number", unit: "unit" },
    { key: "linearityObserved2", label: "Linearity pair 2 observed mean", symbol: "ȳ₂", helper: "Optional observed mean paired to the second declared reference.", kind: "number", unit: "unit" },
    { key: "linearityReference3", label: "Linearity pair 3 reference", symbol: "x₃", helper: "Optional third declared reference; provided pairs must be contiguous.", kind: "number", unit: "unit" },
    { key: "linearityObserved3", label: "Linearity pair 3 observed mean", symbol: "ȳ₃", helper: "Optional observed mean paired to the third declared reference.", kind: "number", unit: "unit" },
    { key: "stabilityStart", label: "Stability check · start", symbol: "yₛ", helper: "Optional first time-ordered check value; leave all stability values blank when unused.", kind: "number", unit: "unit" },
    { key: "stabilityMiddle", label: "Stability check · middle", symbol: "yₘ", helper: "Optional second time-ordered check value; checks must be contiguous.", kind: "number", unit: "unit" },
    { key: "stabilityEnd", label: "Stability check · end", symbol: "yₑ", helper: "Optional third time-ordered check value; checks must be contiguous.", kind: "number", unit: "unit" },
  ],
  controlChart: [
    { key: "mode", label: "Chart mode", helper: "Choose the declared series form to calculate; no mode supplies a control-status conclusion.", kind: "select", options: [{ value: "xbarR", label: "X-bar / R · subgroup means and ranges" }, { value: "xbarS", label: "X-bar / S · subgroup means and sample s values" }, { value: "individualMr", label: "Individuals / MR · sequential values" }] },
    { key: "subgroupSize", label: "Declared subgroup size", symbol: "n", helper: "Required for X-bar modes only; enter an integer from 2 through 10.", kind: "number", unit: "observations" },
    { key: "subgroupMean1", label: "Subgroup 1 mean", symbol: "x̄₁", helper: "First declared subgroup mean; enter two through five contiguous subgroup summaries.", kind: "number", unit: "unit" },
    { key: "subgroupVariation1", label: "Subgroup 1 range / s", symbol: "R₁ or s₁", helper: "Enter range in X-bar/R mode or sample standard deviation in X-bar/S mode.", kind: "number", unit: "unit" },
    { key: "subgroupMean2", label: "Subgroup 2 mean", symbol: "x̄₂", helper: "Second declared subgroup mean.", kind: "number", unit: "unit" },
    { key: "subgroupVariation2", label: "Subgroup 2 range / s", symbol: "R₂ or s₂", helper: "Enter range in X-bar/R mode or sample standard deviation in X-bar/S mode.", kind: "number", unit: "unit" },
    { key: "subgroupMean3", label: "Subgroup 3 mean", symbol: "x̄₃", helper: "Optional third declared subgroup mean; summaries must be contiguous.", kind: "number", unit: "unit" },
    { key: "subgroupVariation3", label: "Subgroup 3 range / s", symbol: "R₃ or s₃", helper: "Optional variation paired to subgroup 3.", kind: "number", unit: "unit" },
    { key: "subgroupMean4", label: "Subgroup 4 mean", symbol: "x̄₄", helper: "Optional fourth declared subgroup mean; summaries must be contiguous.", kind: "number", unit: "unit" },
    { key: "subgroupVariation4", label: "Subgroup 4 range / s", symbol: "R₄ or s₄", helper: "Optional variation paired to subgroup 4.", kind: "number", unit: "unit" },
    { key: "subgroupMean5", label: "Subgroup 5 mean", symbol: "x̄₅", helper: "Optional fifth declared subgroup mean.", kind: "number", unit: "unit" },
    { key: "subgroupVariation5", label: "Subgroup 5 range / s", symbol: "R₅ or s₅", helper: "Optional variation paired to subgroup 5.", kind: "number", unit: "unit" },
    { key: "individual1", label: "Individual 1", symbol: "x₁", helper: "First time-ordered individual observation; enter two through five contiguous values.", kind: "number", unit: "unit" },
    { key: "individual2", label: "Individual 2", symbol: "x₂", helper: "Second time-ordered individual observation.", kind: "number", unit: "unit" },
    { key: "individual3", label: "Individual 3", symbol: "x₃", helper: "Optional third time-ordered individual observation; entries must be contiguous.", kind: "number", unit: "unit" },
    { key: "individual4", label: "Individual 4", symbol: "x₄", helper: "Optional fourth time-ordered individual observation; entries must be contiguous.", kind: "number", unit: "unit" },
    { key: "individual5", label: "Individual 5", symbol: "x₅", helper: "Optional fifth time-ordered individual observation.", kind: "number", unit: "unit" },
  ],
  measurementUncertainty: [
    { key: "measuredValue", label: "Measured value", symbol: "y", helper: "Reported value used only to express the relative expanded uncertainty.", kind: "number", unit: "unit" },
    { key: "typeA", label: "Type A standard component", symbol: "uA", helper: "User-entered standard uncertainty component from a stated statistical evaluation.", kind: "number", unit: "unit" },
    { key: "calibration", label: "Calibration standard component", symbol: "uCal", helper: "User-entered standard uncertainty component; convert any stated interval before entering.", kind: "number", unit: "unit" },
    { key: "resolution", label: "Resolution standard component", symbol: "uRes", helper: "User-entered standard uncertainty component for resolution or quantization.", kind: "number", unit: "unit" },
    { key: "environment", label: "Environmental standard component", symbol: "uEnv", helper: "User-entered standard uncertainty component for the stated environmental influence.", kind: "number", unit: "unit" },
    { key: "coverageFactor", label: "Coverage factor", symbol: "k", helper: "User-supplied multiplier only; this screen does not select k or assert coverage probability.", kind: "number", unit: "—" },
  ],
  thermalRadiation: [
    { key: "area", label: "Radiating area", symbol: "A", helper: "User-entered effective surface area facing the stated large surroundings.", kind: "number", unit: "m²" },
    { key: "emissivity", label: "Surface emissivity", symbol: "ε", helper: "User-entered gray-surface emissivity from 0 through 1; this screen does not select it.", kind: "number", unit: "—" },
    { key: "surfaceTemperature", label: "Surface temperature", symbol: "Ts", helper: "Absolute surface temperature in kelvins.", kind: "number", unit: "K" },
    { key: "surroundingTemperature", label: "Surroundings temperature", symbol: "Tsur", helper: "Effective large-surroundings absolute temperature in kelvins.", kind: "number", unit: "K" },
  ],
  shaftDesign: [
    { key: "torque", label: "Applied torque", symbol: "T", helper: "Stated steady torque for the solid-shaft screening model.", kind: "number", unit: "N·m" },
    { key: "shaftDiameter", label: "Existing shaft diameter", symbol: "d", helper: "Nominal solid circular diameter used for stress, twist, and stiffness calculations.", kind: "number", unit: "mm" },
    { key: "allowableShear", label: "Allowable shear stress", symbol: "τallow", helper: "User-entered allowable basis; this screen does not select material allowables or safety factors.", kind: "number", unit: "MPa" },
    { key: "length", label: "Support span / torsion length", symbol: "L", helper: "Stated simply-supported span and torsion length for this narrow screen.", kind: "number", unit: "mm" },
    { key: "shearModulus", label: "Shear modulus", symbol: "G", helper: "User-entered shear modulus at the stated condition.", kind: "number", unit: "GPa" },
    { key: "youngModulus", label: "Young’s modulus", symbol: "E", helper: "User-entered Young’s modulus at the stated condition.", kind: "number", unit: "GPa" },
    { key: "centerLoad", label: "Central transverse load", symbol: "F", helper: "Single stated central force for simply-supported deflection only.", kind: "number", unit: "N" },
    { key: "lineMass", label: "Uniform shaft line mass", symbol: "m′", helper: "User-entered uniform mass per unit length for the first-mode speed screen.", kind: "number", unit: "kg/m" },
  ],
  bearingLoad: [
    { key: "radialLoad", label: "Radial load", symbol: "Fr", helper: "User-entered constant radial bearing load for the stated condition.", kind: "number", unit: "N" },
    { key: "axialLoad", label: "Axial load", symbol: "Fa", helper: "User-entered constant axial bearing load for the stated condition.", kind: "number", unit: "N" },
    { key: "radialFactor", label: "Radial factor", symbol: "X", helper: "User-entered bearing-specific radial factor; this screen does not select X.", kind: "number", unit: "—" },
    { key: "axialFactor", label: "Axial factor", symbol: "Y", helper: "User-entered bearing-specific axial factor; this screen does not select Y.", kind: "number", unit: "—" },
    { key: "targetLife", label: "Target basic rating life", symbol: "L10", helper: "Requested basic rating life in millions of revolutions for reverse-rating arithmetic.", kind: "number", unit: "10⁶ rev" },
    { key: "lifeExponent", label: "Life exponent", symbol: "p", helper: "User-entered bearing-type exponent for basic rating-life arithmetic.", kind: "number", unit: "—" },
    { key: "staticRating", label: "Static load rating", symbol: "C0", helper: "User-entered catalog static load rating; no catalog selection occurs here.", kind: "number", unit: "N" },
    { key: "staticEquivalentLoad", label: "Static equivalent load", symbol: "P0", helper: "User-entered static equivalent load for the stated peak/load case.", kind: "number", unit: "N" },
    { key: "bore", label: "Bearing bore", symbol: "d", helper: "Bearing bore for the DN arithmetic only.", kind: "number", unit: "mm" },
    { key: "speed", label: "Rotational speed", symbol: "n", helper: "Rotational speed for the DN arithmetic only.", kind: "number", unit: "rpm" },
    { key: "dnLimit", label: "User-stated DN limit", symbol: "DNlim", helper: "User-entered catalog/process DN limit for comparison only.", kind: "number", unit: "mm·rpm" },
    { key: "preload", label: "Declared axial preload", symbol: "Fpre", helper: "User-entered preload shown only as a ratio of the stated equivalent load.", kind: "number", unit: "N" },
  ],
  formControl: [
    { key: "formType", label: "Declared form control", helper: "Choose the form category represented by the user-entered measurement record.", kind: "select", options: [{ value: "flatness", label: "Flatness" }, { value: "straightness", label: "Straightness" }, { value: "circularity", label: "Circularity / roundness" }, { value: "cylindricity", label: "Cylindricity" }] },
    { key: "measuredMinimum", label: "Measured minimum", symbol: "xmin", helper: "Minimum value from the declared measurement record and setup.", kind: "number", unit: "mm" },
    { key: "measuredMaximum", label: "Measured maximum", symbol: "xmax", helper: "Maximum value from the declared measurement record and setup.", kind: "number", unit: "mm" },
    { key: "statedTolerance", label: "Stated tolerance", symbol: "T", helper: "Drawing or study tolerance entered only to display an observed-span ratio; no compliance result is generated.", kind: "number", unit: "mm" },
  ],
  driveRatio: [
    { key: "driveType", label: "Declared drive family", helper: "Select only the geometry label for the stated ideal-ratio arithmetic; no topology or component selection occurs.", kind: "select", options: [{ value: "spur", label: "Spur gear" }, { value: "helical", label: "Helical gear" }, { value: "belt", label: "Belt drive" }, { value: "timingBelt", label: "Timing belt" }, { value: "chain", label: "Chain drive" }, { value: "worm", label: "Worm-style ideal ratio" }] },
    { key: "driverMeasure", label: "Driver teeth / pitch measure", symbol: "N1", helper: "Driver tooth count or compatible pitch-diameter measure used only in the ratio.", kind: "number", unit: "—" },
    { key: "drivenMeasure", label: "Driven teeth / pitch measure", symbol: "N2", helper: "Driven tooth count or compatible pitch-diameter measure used only in the ratio.", kind: "number", unit: "—" },
    { key: "inputSpeed", label: "Input speed", symbol: "n1", helper: "Declared driver speed.", kind: "number", unit: "rpm" },
    { key: "inputTorque", label: "Input torque", symbol: "T1", helper: "Declared driver torque.", kind: "number", unit: "N·m" },
    { key: "efficiency", label: "Transmission efficiency", symbol: "η", helper: "User-entered overall efficiency from 0 to 100; this screen does not select it.", kind: "number", unit: "%" },
    { key: "driverPitchDiameter", label: "Driver pitch diameter", symbol: "d1", helper: "Driver pitch diameter for pitch-line speed and tangential-force arithmetic.", kind: "number", unit: "mm" },
    { key: "pressureAngle", label: "Declared pressure angle", symbol: "φ", helper: "User-entered pressure angle for the elementary radial force decomposition.", kind: "number", unit: "deg" },
    { key: "helixAngle", label: "Declared helix angle", symbol: "β", helper: "Use zero for non-helical/belt/chain models; this screen reports an elementary axial-force component only.", kind: "number", unit: "deg" },
  ],
  motionDuty: [
    { key: "reflectedInertia", label: "Total reflected inertia", symbol: "J", helper: "User-entered total inertia referred to the stated motor/axis; no load inertia is inferred.", kind: "number", unit: "kg·m²" },
    { key: "startSpeed", label: "Start speed", symbol: "n0", helper: "Initial angular speed for the declared acceleration or deceleration interval.", kind: "number", unit: "rpm" },
    { key: "endSpeed", label: "End speed", symbol: "n1", helper: "Final angular speed for the declared acceleration or deceleration interval.", kind: "number", unit: "rpm" },
    { key: "accelTime", label: "Speed-change time", symbol: "tacc", helper: "Time over which the stated speed change occurs.", kind: "number", unit: "s" },
    { key: "constantTorque", label: "Declared running torque", symbol: "Trun", helper: "User-entered torque magnitude during the constant-torque segment.", kind: "number", unit: "N·m" },
    { key: "runningTime", label: "Running segment time", symbol: "trun", helper: "Duration assigned to the declared running torque.", kind: "number", unit: "s" },
    { key: "declaredDecelTorque", label: "Declared deceleration torque", symbol: "Tdec", helper: "User-entered torque magnitude during the deceleration segment for RMS arithmetic.", kind: "number", unit: "N·m" },
    { key: "decelTime", label: "Deceleration segment time", symbol: "tdec", helper: "Duration assigned to the declared deceleration torque.", kind: "number", unit: "s" },
  ],
  filletWeld: [
    { key: "legSize", label: "Equal fillet leg size", symbol: "a", helper: "Nominal equal-leg fillet dimension for this direct-load screen.", kind: "number", unit: "mm" },
    { key: "weldLength", label: "Effective weld length", symbol: "L", helper: "User-entered effective length per weld line; end returns are not inferred.", kind: "number", unit: "mm" },
    { key: "weldLines", label: "Number of weld lines", symbol: "n", helper: "User-entered effective parallel fillet-weld line count for equal direct-load sharing.", kind: "number", unit: "—" },
    { key: "directForce", label: "Direct applied force", symbol: "F", helper: "Stated direct force only; no eccentricity or moment distribution is modeled.", kind: "number", unit: "N" },
    { key: "allowableShear", label: "User-stated allowable shear", symbol: "τallow", helper: "User-entered allowable basis; this screen does not select consumables or code values.", kind: "number", unit: "MPa" },
    { key: "arcVoltage", label: "Arc voltage", symbol: "V", helper: "User-entered arc voltage for electrical heat-input arithmetic.", kind: "number", unit: "V" },
    { key: "arcCurrent", label: "Arc current", symbol: "I", helper: "User-entered arc current for electrical heat-input arithmetic.", kind: "number", unit: "A" },
    { key: "travelSpeed", label: "Travel speed", symbol: "v", helper: "User-entered travel speed for heat input per weld length.", kind: "number", unit: "mm/min" },
    { key: "arcEfficiency", label: "User-stated arc efficiency", symbol: "η", helper: "User-entered 0–100% thermal-efficiency factor; no process value is selected.", kind: "number", unit: "%" },
  ],
  threadDesign: [
    { key: "majorDiameter", label: "Metric thread major diameter", symbol: "Dmajor", helper: "User-entered nominal major diameter; no thread standard or class is selected.", kind: "number", unit: "mm" },
    { key: "pitch", label: "Thread pitch", symbol: "P", helper: "User-entered compatible metric pitch.", kind: "number", unit: "mm" },
    { key: "engagementPercent", label: "User-stated tap engagement", symbol: "E", helper: "Target tap engagement fraction from 0 to 100%; it is not measured actual engagement.", kind: "number", unit: "%" },
    { key: "engagementLength", label: "Thread engagement length", symbol: "Le", helper: "User-entered axial length of engaged threads for the simplified screening area.", kind: "number", unit: "mm" },
    { key: "threadsPerInch", label: "Thread frequency", symbol: "n", helper: "User-entered thread count per inch required by the reviewed root-shear-area equation.", kind: "number", unit: "TPI" },
    { key: "externalMajorMinimum", label: "External minimum major diameter", symbol: "Dsmin", helper: "User-entered external-thread minimum major diameter for the reviewed root-shear-area equation.", kind: "number", unit: "in" },
    { key: "internalPitchMaximum", label: "Internal maximum pitch diameter", symbol: "Enmax", helper: "User-entered internal-thread maximum pitch diameter for the reviewed root-shear-area equation.", kind: "number", unit: "in" },
    { key: "allowableShear", label: "User-stated internal-thread allowable", symbol: "τallow", helper: "User-entered shear allowable for screening only; material and standard selection are excluded.", kind: "number", unit: "MPa" },
    { key: "appliedAxialLoad", label: "Applied axial load", symbol: "F", helper: "User-entered direct axial load for the simplified pull-out utilization output.", kind: "number", unit: "N" },
  ],
  orificeFlow: [
    { key: "dischargeCoefficient", label: "Discharge coefficient", symbol: "Cd", helper: "User-entered dimensionless discharge coefficient from 0 through 1; this screen does not select it.", kind: "number", unit: "—" },
    { key: "orificeDiameter", label: "Orifice diameter", symbol: "D2", helper: "User-entered circular orifice diameter.", kind: "number", unit: "mm" },
    { key: "pipeDiameter", label: "Pipe internal diameter", symbol: "D1", helper: "User-entered circular upstream pipe internal diameter; it must exceed the orifice diameter.", kind: "number", unit: "mm" },
    { key: "upstreamPressure", label: "Upstream pressure", symbol: "p1", helper: "User-entered absolute or gauge pressure on a consistent basis.", kind: "number", unit: "Pa" },
    { key: "downstreamPressure", label: "Downstream pressure", symbol: "p2", helper: "User-entered pressure on the same basis as upstream pressure.", kind: "number", unit: "Pa" },
    { key: "density", label: "Fluid density", symbol: "ρ", helper: "User-entered incompressible fluid density at the stated condition.", kind: "number", unit: "kg/m³" },
  ],
  dimensionCheck: [
    { key: "leftMass", label: "Left mass exponent", symbol: "Mₗ", helper: "Entered exponent for SI base mass dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "leftLength", label: "Left length exponent", symbol: "Lₗ", helper: "Entered exponent for SI base length dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "leftTime", label: "Left time exponent", symbol: "Tₗ", helper: "Entered exponent for SI base time dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "leftCurrent", label: "Left current exponent", symbol: "Iₗ", helper: "Entered exponent for SI base electric-current dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "leftTemperature", label: "Left temperature exponent", symbol: "Θₗ", helper: "Entered exponent for SI base thermodynamic-temperature dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "leftAmount", label: "Left amount exponent", symbol: "Nₗ", helper: "Entered exponent for SI base amount-of-substance dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "leftLuminous", label: "Left luminous exponent", symbol: "Jₗ", helper: "Entered exponent for SI base luminous-intensity dimension on the left equation side.", kind: "number", unit: "—" },
    { key: "rightMass", label: "Right mass exponent", symbol: "Mᵣ", helper: "Entered exponent for SI base mass dimension on the right equation side.", kind: "number", unit: "—" },
    { key: "rightLength", label: "Right length exponent", symbol: "Lᵣ", helper: "Entered exponent for SI base length dimension on the right equation side.", kind: "number", unit: "—" },
    { key: "rightTime", label: "Right time exponent", symbol: "Tᵣ", helper: "Entered exponent for SI base time dimension on the right equation side.", kind: "number", unit: "—" },
    { key: "rightCurrent", label: "Right current exponent", symbol: "Iᵣ", helper: "Entered exponent for SI base electric-current dimension on the right equation side.", kind: "number", unit: "—" },
    { key: "rightTemperature", label: "Right temperature exponent", symbol: "Θᵣ", helper: "Entered exponent for SI base thermodynamic-temperature dimension on the right equation side.", kind: "number", unit: "—" },
    { key: "rightAmount", label: "Right amount exponent", symbol: "Nᵣ", helper: "Entered exponent for SI base amount-of-substance dimension on the right equation side.", kind: "number", unit: "—" },
    { key: "rightLuminous", label: "Right luminous exponent", symbol: "Jᵣ", helper: "Entered exponent for SI base luminous-intensity dimension on the right equation side.", kind: "number", unit: "—" },
  ],
  shaftCombined: [
    { key: "bendingMoment", label: "Bending moment", symbol: "M", helper: "Moment at the stated critical solid-shaft section; use a signed convention consistently.", kind: "number", unit: "N·m" },
    { key: "torque", label: "Applied torque", symbol: "T", helper: "Steady torque at the same shaft section; use a signed convention consistently.", kind: "number", unit: "N·m" },
    { key: "diameter", label: "Solid shaft diameter", symbol: "d", helper: "Nominal solid circular diameter at the same section.", kind: "number", unit: "mm" },
  ],
  mohrCircle: [
    { key: "sigmaX", label: "x normal stress", symbol: "σx", helper: "Signed plane-stress component; tension positive under the stated convention.", kind: "number", unit: "MPa" },
    { key: "sigmaY", label: "y normal stress", symbol: "σy", helper: "Signed plane-stress component at the same point.", kind: "number", unit: "MPa" },
    { key: "tauXY", label: "In-plane shear stress", symbol: "τxy", helper: "Signed shear stress at the same point and under one stated convention.", kind: "number", unit: "MPa" },
  ],
  pressFit: [
    { key: "shaftDiameter", label: "Shaft diameter", symbol: "Ds", helper: "Actual or nominal external diameter at the press-fit interface.", kind: "number", unit: "mm" },
    { key: "holeDiameter", label: "Hub bore diameter", symbol: "Di", helper: "Actual or nominal interface bore; it must be smaller than the shaft for this press-fit screen.", kind: "number", unit: "mm" },
    { key: "hubOuterDiameter", label: "Hub outer diameter", symbol: "Do", helper: "Outer hub diameter in the reference geometry factor; it must exceed the bore.", kind: "number", unit: "mm" },
    { key: "contactLength", label: "Contact length", symbol: "L", helper: "Uniform cylindrical interface engagement length.", kind: "number", unit: "mm" },
    { key: "modulus", label: "Declared elastic modulus", symbol: "E", helper: "Single user-entered modulus used by the simplified reference relation; no shaft/hub compliance split is modeled.", kind: "number", unit: "GPa" },
    { key: "friction", label: "Declared friction coefficient", symbol: "μ", helper: "User-entered interface coefficient from 0 through 1; this workspace does not select it.", kind: "number", unit: "—" },
  ],
  jointSeparation: [
    { key: "preload", label: "Declared preload", symbol: "Fp", helper: "Preload for one stated bolt/joint condition; uncertainty and loss are not modeled.", kind: "number", unit: "kN" },
    { key: "boltStiffness", label: "Bolt axial stiffness", symbol: "kb", helper: "User-entered equivalent axial bolt stiffness for the stated grip condition.", kind: "number", unit: "kN/mm" },
    { key: "memberStiffness", label: "Member axial stiffness", symbol: "km", helper: "User-entered equivalent axial clamped-member stiffness; geometry is not inferred.", kind: "number", unit: "kN/mm" },
    { key: "externalLoad", label: "External axial separating load", symbol: "P", helper: "Known applied separating load on this one joint; positive is separating and negative is compressive.", kind: "number", unit: "kN" },
  ],
  hydraulicCylinder: [
    { key: "bore", label: "Cylinder bore", symbol: "D", helper: "Stated inside bore diameter for a double-acting cylinder.", kind: "number", unit: "mm" },
    { key: "rod", label: "Rod diameter", symbol: "d", helper: "Stated rod diameter; it must be smaller than the bore.", kind: "number", unit: "mm" },
    { key: "pressure", label: "Declared working pressure", symbol: "p", helper: "Uniform fluid pressure at the actuator, not a pressure-rating check.", kind: "number", unit: "bar" },
    { key: "stroke", label: "Stroke", symbol: "s", helper: "One full linear travel used only for ideal swept volume and travel-time arithmetic.", kind: "number", unit: "mm" },
    { key: "flow", label: "Declared supply flow", symbol: "Q", helper: "Steady delivered flow; this screen does not model a circuit or losses.", kind: "number", unit: "L/min" },
  ],
  hydraulicPump: [
    { key: "displacement", label: "Pump displacement", symbol: "Vd", helper: "Geometric positive-displacement volume per shaft revolution.", kind: "number", unit: "cm³/rev" },
    { key: "speed", label: "Pump shaft speed", symbol: "n", helper: "Declared pump input speed in the steady operating point.", kind: "number", unit: "rpm" },
    { key: "pressure", label: "Declared pressure rise", symbol: "Δp", helper: "Pressure rise across the pump at the stated point, not a component pressure-rating check.", kind: "number", unit: "bar" },
    { key: "volumetricEfficiency", label: "Declared volumetric efficiency", symbol: "ηv", helper: "User-entered percentage used only to screen actual outlet flow.", kind: "number", unit: "%" },
    { key: "overallEfficiency", label: "Declared overall efficiency", symbol: "ηo", helper: "User-entered percentage used only to screen shaft input from hydraulic output.", kind: "number", unit: "%" },
  ],
  hydraulicMotor: [
    { key: "displacement", label: "Motor displacement", symbol: "Vd", helper: "Geometric positive-displacement volume per shaft revolution.", kind: "number", unit: "cm³/rev" },
    { key: "pressure", label: "Declared pressure drop", symbol: "Δp", helper: "Pressure drop across the motor at the stated point, not a component pressure-rating check.", kind: "number", unit: "bar" },
    { key: "flow", label: "Declared inlet flow", symbol: "Q", helper: "Steady inlet flow; the system circuit and leakage paths are not modeled.", kind: "number", unit: "L/min" },
    { key: "mechanicalEfficiency", label: "Declared mechanical efficiency", symbol: "ηm", helper: "User-entered percentage used only to screen shaft torque.", kind: "number", unit: "%" },
    { key: "volumetricEfficiency", label: "Declared volumetric efficiency", symbol: "ηv", helper: "User-entered percentage used only to screen shaft speed.", kind: "number", unit: "%" },
  ],
  hydraulicLine: [
    { key: "flow", label: "Declared line flow", symbol: "Q", helper: "Steady flow through one constant-ID circular line segment.", kind: "number", unit: "L/min" },
    { key: "insideDiameter", label: "Line inside diameter", symbol: "Di", helper: "Actual internal diameter, not nominal hose or pipe size.", kind: "number", unit: "mm" },
    { key: "lineLength", label: "Straight line length", symbol: "L", helper: "Declared straight length only; fittings, bends, and networks are excluded.", kind: "number", unit: "m" },
    { key: "frictionFactor", label: "Declared Darcy friction factor", symbol: "f", helper: "User-entered Darcy friction factor; it is not derived or selected by this workspace.", kind: "number", unit: "—" },
    { key: "fluidDensity", label: "Declared fluid density", symbol: "ρ", helper: "User-entered density at the stated fluid condition; viscosity and temperature changes are excluded.", kind: "number", unit: "kg/m³" },
    { key: "referenceVelocity", label: "Declared reference velocity", symbol: "vref", helper: "A user-stated comparison value; this workspace does not select an acceptable limit.", kind: "number", unit: "m/s" },
  ],
  orientationControl: [
    { key: "controlType", label: "Declared orientation control", helper: "Choose the record label only; this workspace does not interpret a drawing feature-control frame.", kind: "select", options: [{ value: "parallelism", label: "Parallelism" }, { value: "perpendicularity", label: "Perpendicularity" }, { value: "angularity", label: "Angularity" }] },
    { key: "minimumReading", label: "Lowest comparable reading", symbol: "rmin", helper: "Lowest reading from one documented datum/fixture and measurement setup; signed readings are allowed.", kind: "number", unit: "mm" },
    { key: "maximumReading", label: "Highest comparable reading", symbol: "rmax", helper: "Highest reading from the same documented datum/fixture and measurement setup.", kind: "number", unit: "mm" },
    { key: "tolerance", label: "Stated orientation tolerance", symbol: "T", helper: "Tolerance copied from the applicable controlled requirement; it is not inferred from a drawing.", kind: "number", unit: "mm" },
  ],
  profileRunout: [
    { key: "recordType", label: "Declared record type", helper: "Choose the record label only; this workspace does not construct a profile or runout tolerance zone.", kind: "select", options: [{ value: "profile", label: "Profile" }, { value: "circularRunout", label: "Circular runout" }, { value: "totalRunout", label: "Total runout" }] },
    { key: "minimumReading", label: "Lowest comparable indicator reading", symbol: "rmin", helper: "Lowest reading from the one documented fixture/datum setup; signed readings are allowed.", kind: "number", unit: "mm" },
    { key: "maximumReading", label: "Highest comparable indicator reading", symbol: "rmax", helper: "Highest reading from the same documented fixture/datum setup.", kind: "number", unit: "mm" },
    { key: "tolerance", label: "Stated profile/runout tolerance", symbol: "T", helper: "Tolerance copied from the applicable controlled requirement; this is not a drawing-parser field.", kind: "number", unit: "mm" },
  ],
  processPerformance: [
    { key: "lsl", label: "Lower specification limit", symbol: "LSL", helper: "User-entered two-sided lower specification limit on the same measurement basis as the mean and overall standard deviation.", kind: "number", unit: "declared" },
    { key: "usl", label: "Upper specification limit", symbol: "USL", helper: "User-entered two-sided upper specification limit; it must exceed the lower limit.", kind: "number", unit: "declared" },
    { key: "observations", label: "Optional local observations", symbol: "x1…xn", helper: "Leave blank to use entered mean/sigma. Otherwise paste 2–5,000 scalar values separated by spaces, commas, semicolons, or new lines; no headers, labels, or locale decimal commas.", kind: "text" },
    { key: "mean", label: "Process mean", symbol: "x̄", helper: "User-entered overall process mean, not inferred from raw observations in this bounded workspace.", kind: "number", unit: "declared" },
    { key: "overallSigma", label: "Overall standard deviation", symbol: "soverall", helper: "User-entered overall standard deviation used in Pp/Ppk, not within-subgroup sigma.", kind: "number", unit: "declared" },
  ],
  ballScrewSizing: [
    { key: "axialForce", label: "Declared axial force", symbol: "Fa", helper: "Steady axial force at the screw; preload, bearing, and seal torques are excluded.", kind: "number", unit: "N" },
    { key: "lead", label: "Screw lead", symbol: "P", helper: "Linear travel per revolution for the stated screw, not inferred from pitch or starts.", kind: "number", unit: "mm/rev" },
    { key: "speed", label: "Screw speed", symbol: "n", helper: "Steady screw speed used only for ideal linear-speed and mechanical-power arithmetic.", kind: "number", unit: "rpm" },
    { key: "efficiency", label: "Declared screw efficiency", symbol: "η", helper: "User-entered transmission efficiency; this workspace does not select or validate it.", kind: "number", unit: "%" },
  ],
  rackPinion: [
    { key: "mass", label: "Moved mass", symbol: "m", helper: "Declared total translated mass for a horizontal axis, including relevant moving components.", kind: "number", unit: "kg" },
    { key: "friction", label: "Declared guide friction coefficient", symbol: "μ", helper: "User-entered guide friction coefficient from 0 through 1; it is not selected by this workspace.", kind: "number", unit: "—" },
    { key: "acceleration", label: "Declared linear acceleration", symbol: "a", helper: "Peak horizontal acceleration for the stated move; profile and jerk are excluded.", kind: "number", unit: "m/s²" },
    { key: "externalForce", label: "Declared external axial force", symbol: "Fe", helper: "External horizontal resisting force added to the feed-force screen.", kind: "number", unit: "N" },
    { key: "pinionDiameter", label: "Pinion pitch diameter", symbol: "dp", helper: "Declared pitch diameter used for torque and rpm conversion; tooth geometry is excluded.", kind: "number", unit: "mm" },
    { key: "linearSpeed", label: "Requested linear speed", symbol: "v", helper: "Steady requested rack speed used only to calculate pinion rpm and mechanical power.", kind: "number", unit: "m/s" },
  ],
  beltAxis: [
    { key: "mass", label: "Moved mass", symbol: "m", helper: "Declared total translated load, including the relevant belt mass where applicable.", kind: "number", unit: "kg" },
    { key: "friction", label: "Declared guide friction coefficient", symbol: "μ", helper: "User-entered guide friction coefficient from 0 through 1; it is not selected by this workspace.", kind: "number", unit: "—" },
    { key: "pulleyDiameter", label: "Drive-pulley pitch diameter", symbol: "dp", helper: "Declared effective drive-pulley diameter; belt tooth engagement and bend limits are excluded.", kind: "number", unit: "mm" },
    { key: "linearSpeed", label: "Requested linear speed", symbol: "v", helper: "Steady requested belt speed used only for pulley rpm and mechanical-power arithmetic.", kind: "number", unit: "m/s" },
    { key: "efficiency", label: "Declared belt-axis efficiency", symbol: "η", helper: "User-entered transmission efficiency; this workspace does not select or validate it.", kind: "number", unit: "%" },
  ],
  cuttingPower: [
    { key: "depth", label: "Depth of cut", symbol: "ap", helper: "Declared radial turning depth of cut for the stated pass.", kind: "number", unit: "mm" },
    { key: "feed", label: "Feed per revolution", symbol: "f", helper: "Declared turning feed per revolution for the stated pass.", kind: "number", unit: "mm/rev" },
    { key: "cuttingSpeed", label: "Cutting speed", symbol: "vc", helper: "Declared cutting speed for the stated pass.", kind: "number", unit: "m/min" },
    { key: "specificForce", label: "Declared specific cutting force", symbol: "Kc", helper: "User-entered specific cutting force; no material or chip-thickness model is selected.", kind: "number", unit: "MPa" },
    { key: "efficiency", label: "Declared machine efficiency", symbol: "η", helper: "User-entered machine coefficient used only in the direct power screen.", kind: "number", unit: "%" },
  ],
  drillPointDepth: [
    { key: "diameter", label: "Drill diameter", symbol: "D", helper: "Declared drill diameter used for exact conical point geometry.", kind: "number", unit: "mm" },
    { key: "includedAngle", label: "Included point angle", symbol: "θ", helper: "Declared full included conical point angle; it must be between 0 and 180 degrees.", kind: "number", unit: "deg" },
    { key: "fullDiameterDepth", label: "Required full-diameter depth", symbol: "h", helper: "Depth of the requested full-diameter cylindrical portion, excluding the drill point.", kind: "number", unit: "mm" },
  ],
  toolDeflection: [
    { key: "lateralForce", label: "Declared lateral force", symbol: "F", helper: "Single lateral tip force for the ideal circular cantilever screen.", kind: "number", unit: "N" },
    { key: "overhang", label: "Free overhang", symbol: "L", helper: "Free cantilever length from the effective clamp plane to force application point.", kind: "number", unit: "mm" },
    { key: "coreDiameter", label: "Declared core diameter", symbol: "d", helper: "Circular effective core diameter; flute, neck, holder, and contact geometry are excluded.", kind: "number", unit: "mm" },
    { key: "modulus", label: "Declared elastic modulus", symbol: "E", helper: "User-entered linear-elastic modulus for the stated cutter material.", kind: "number", unit: "GPa" },
  ],
  fatigueConcentration: [
    { key: "kt", label: "Declared theoretical stress concentration", symbol: "Kt", helper: "User-entered elastic geometric stress-concentration factor; this workspace does not select it.", kind: "number", unit: "—" },
    { key: "notchSensitivity", label: "Declared notch sensitivity", symbol: "q", helper: "User-entered fatigue notch sensitivity from 0 through 1.", kind: "number", unit: "—" },
    { key: "nominalStress", label: "Declared nominal stress", symbol: "σnom", helper: "Optional nominal stress to display the direct Kf-adjusted effective stress.", kind: "number", unit: "MPa" },
  ],
  goodmanFatigue: [
    { key: "nominalAlternating", label: "Declared nominal alternating stress", symbol: "σa,nom", helper: "User-entered high-cycle alternating stress before the declared Kf multiplier.", kind: "number", unit: "MPa" },
    { key: "nominalMean", label: "Declared nominal mean stress", symbol: "σm,nom", helper: "User-entered mean stress before the declared Kf multiplier.", kind: "number", unit: "MPa" },
    { key: "kf", label: "Declared fatigue stress concentration", symbol: "Kf", helper: "User-entered fatigue concentration factor; no geometry or material inference is made.", kind: "number", unit: "—" },
    { key: "enduranceLimit", label: "Declared endurance limit", symbol: "Sn", helper: "User-entered corrected endurance limit for the specific stated condition.", kind: "number", unit: "MPa" },
    { key: "ultimateStrength", label: "Declared ultimate strength", symbol: "Su", helper: "User-entered ultimate tensile strength used in the Goodman denominator.", kind: "number", unit: "MPa" },
  ],
  minerDamage: [
    { key: "cycles1", label: "Bin 1 applied cycles", symbol: "n1", helper: "User-entered applied cycle count at stated life N1.", kind: "number", unit: "cycles" },
    { key: "life1", label: "Bin 1 stated cycles to failure", symbol: "N1", helper: "User-entered reference cycles-to-failure; no S-N curve is generated.", kind: "number", unit: "cycles" },
    { key: "cycles2", label: "Bin 2 applied cycles", symbol: "n2", helper: "User-entered applied cycle count at stated life N2.", kind: "number", unit: "cycles" },
    { key: "life2", label: "Bin 2 stated cycles to failure", symbol: "N2", helper: "User-entered reference cycles-to-failure; no S-N curve is generated.", kind: "number", unit: "cycles" },
    { key: "cycles3", label: "Bin 3 applied cycles", symbol: "n3", helper: "User-entered applied cycle count at stated life N3.", kind: "number", unit: "cycles" },
    { key: "life3", label: "Bin 3 stated cycles to failure", symbol: "N3", helper: "User-entered reference cycles-to-failure; no S-N curve is generated.", kind: "number", unit: "cycles" },
  ],
  planetaryGear: [
    { key: "sunTeeth", label: "Sun gear teeth", symbol: "Ns", helper: "Declared sun tooth count for a fixed-ring, sun-input, carrier-output configuration.", kind: "number", unit: "teeth" },
    { key: "ringTeeth", label: "Ring gear teeth", symbol: "Nr", helper: "Declared internal ring tooth count for the same standard planetary configuration.", kind: "number", unit: "teeth" },
    { key: "planetCount", label: "Declared planet count", symbol: "P", helper: "User-entered number of evenly spaced planets used only for the spacing-integer check.", kind: "number", unit: "—" },
    { key: "inputSpeed", label: "Sun input speed", symbol: "nin", helper: "Declared sun input speed for the fixed-ring ratio screen.", kind: "number", unit: "rpm" },
    { key: "inputTorque", label: "Sun input torque", symbol: "Tin", helper: "Declared sun input torque before user-entered efficiency.", kind: "number", unit: "N·m" },
    { key: "efficiency", label: "Declared planetary efficiency", symbol: "η", helper: "User-entered transmission efficiency; this workspace does not select or validate a design efficiency.", kind: "number", unit: "%" },
  ],
  wormDrive: [
    { key: "wheelTeeth", label: "Worm-wheel teeth", symbol: "Zw", helper: "Declared driven wheel tooth count for the ideal worm reduction.", kind: "number", unit: "teeth" },
    { key: "wormStarts", label: "Worm starts", symbol: "S", helper: "Declared worm thread starts; it is the ideal driving tooth count.", kind: "number", unit: "starts" },
    { key: "inputSpeed", label: "Worm input speed", symbol: "nin", helper: "Declared worm input speed for the ideal speed reduction.", kind: "number", unit: "rpm" },
    { key: "inputTorque", label: "Worm input torque", symbol: "Tin", helper: "Declared worm input torque before user-entered efficiency.", kind: "number", unit: "N·m" },
    { key: "efficiency", label: "Declared worm-drive efficiency", symbol: "η", helper: "User-entered drive efficiency; this workspace does not predict it.", kind: "number", unit: "%" },
  ],
  sCurveProfile: [
    { key: "distance", label: "Move distance", symbol: "d", helper: "Declared zero-start/zero-stop point-to-point travel distance.", kind: "number", unit: "mm" },
    { key: "topSpeed", label: "Top speed", symbol: "vmax", helper: "User-entered intended top speed used by the equivalent trapezoidal timing screen.", kind: "number", unit: "mm/s" },
    { key: "averageAcceleration", label: "Average acceleration", symbol: "aavg", helper: "User-entered average acceleration; not a controller tuning setting.", kind: "number", unit: "mm/s²" },
    { key: "jerkPercent", label: "Jerk percentage", symbol: "J%", helper: "Declared fraction of acceleration segment spent ramping, from 0 through 100 percent.", kind: "number", unit: "%" },
  ],
  torqueSpeedDuty: [
    { key: "inertia", label: "Reflected inertia", symbol: "J", helper: "User-entered total inertia referred to the shaft.", kind: "number", unit: "kg·m²" },
    { key: "speedChange", label: "Speed change", symbol: "Δn", helper: "Declared shaft speed change from the motion segment.", kind: "number", unit: "rpm" },
    { key: "accelerationTime", label: "Acceleration time", symbol: "ta", helper: "Declared acceleration-segment duration.", kind: "number", unit: "s" },
    { key: "loadTorque", label: "Declared load torque", symbol: "Tload", helper: "User-entered steady load torque for the acceleration segment.", kind: "number", unit: "N·m" },
    { key: "targetSpeed", label: "Target speed", symbol: "n", helper: "User-entered shaft speed at the evaluated duty point.", kind: "number", unit: "rpm" },
    { key: "availableTorque", label: "Stated available torque", symbol: "Tavail", helper: "User-entered available torque at target speed; no motor curve is generated.", kind: "number", unit: "N·m" },
  ],
  fixtureClamping: [
    { key: "machiningForce", label: "Declared horizontal machining force", symbol: "Fcut", helper: "User-entered horizontal machining force requiring frictional restraint.", kind: "number", unit: "N" },
    { key: "friction", label: "Declared clamp/workpiece friction", symbol: "μ", helper: "User-entered static friction coefficient for this narrow horizontal-force screen.", kind: "number", unit: "—" },
    { key: "serviceMultiplier", label: "Declared force multiplier", symbol: "M", helper: "User-entered multiplier for the stated force context; it is not a prescribed safety factor.", kind: "number", unit: "—" },
  ],
  pickPlaceCycle: [
    { key: "outboundTime", label: "Outbound travel time", symbol: "tout", helper: "User-entered travel time to the pick or place position.", kind: "number", unit: "s" },
    { key: "inboundTime", label: "Return travel time", symbol: "tback", helper: "User-entered return travel time for the same repeated cycle.", kind: "number", unit: "s" },
    { key: "pickDwell", label: "Pick dwell", symbol: "tpick", helper: "User-entered gripper or process dwell at pick.", kind: "number", unit: "s" },
    { key: "placeDwell", label: "Place dwell", symbol: "tplace", helper: "User-entered gripper or process dwell at place.", kind: "number", unit: "s" },
    { key: "auxiliaryTime", label: "Auxiliary time", symbol: "taux", helper: "User-entered transfer, sensing, or other time added to each cycle.", kind: "number", unit: "s" },
    { key: "cycles", label: "Repeated cycles", symbol: "N", helper: "Declared repeated cycle count for the batch-time result.", kind: "number", unit: "cycles" },
  ],
  payloadInertia: [
    { key: "eoatMass", label: "EOAT mass", symbol: "me", helper: "User-entered end-of-arm-tool mass.", kind: "number", unit: "kg" },
    { key: "productMass", label: "Product mass", symbol: "mp", helper: "User-entered handled product mass.", kind: "number", unit: "kg" },
    { key: "cgDistance", label: "Flange-to-CG distance", symbol: "r", helper: "User-entered center-of-gravity distance from the analyzed robot axis/flange.", kind: "number", unit: "m" },
  ],
  pneumaticCycleTime: [
    { key: "bore", label: "Cylinder bore", symbol: "D", helper: "User-entered cylinder bore for ideal head-end volume.", kind: "number", unit: "mm" },
    { key: "rod", label: "Rod diameter", symbol: "d", helper: "User-entered rod diameter for ideal retract annulus volume.", kind: "number", unit: "mm" },
    { key: "stroke", label: "Stroke", symbol: "L", helper: "User-entered travel stroke.", kind: "number", unit: "mm" },
    { key: "flow", label: "Declared actual cylinder flow", symbol: "Q", helper: "User-entered actual volumetric flow at the cylinder; not standard/free-air flow.", kind: "number", unit: "L/min" },
  ],
  valveCv: [
    { key: "cv", label: "Declared liquid Cv", symbol: "Cv", helper: "User-entered valve coefficient under a declared liquid-water convention.", kind: "number", unit: "—" },
    { key: "specificGravity", label: "Liquid specific gravity", symbol: "SG", helper: "User-entered liquid specific gravity relative to water at the declared condition.", kind: "number", unit: "—" },
    { key: "pressureDrop", label: "Liquid pressure drop", symbol: "ΔP", helper: "User-entered liquid pressure drop across the valve.", kind: "number", unit: "psi" },
    { key: "flow", label: "Declared liquid flow", symbol: "Q", helper: "User-entered liquid flow for the reverse required-Cv result.", kind: "number", unit: "US gpm" },
  ],
  vacuumHolding: [
    { key: "mass", label: "Handled mass", symbol: "m", helper: "User-entered handled workpiece mass.", kind: "number", unit: "kg" },
    { key: "acceleration", label: "Declared acceleration", symbol: "a", helper: "User-entered acceleration magnitude for the declared load case.", kind: "number", unit: "m/s²" },
    { key: "orientation", label: "Declared load case", symbol: "case", helper: "Choose the simplified vertical-normal or horizontal-transport relation.", kind: "select", options: [{ value: "vertical", label: "Horizontal cup · vertical lift" }, { value: "horizontal", label: "Horizontal transport" }], unit: "—" },
    { key: "friction", label: "Declared surface friction", symbol: "μ", helper: "Required only by the horizontal-transport relation; user must validate it by test.", kind: "number", unit: "—" },
    { key: "multiplier", label: "User force multiplier", symbol: "M", helper: "User-entered force multiplier; not a prescribed safety factor.", kind: "number", unit: "—" },
  ],
  additiveBuild: [
    { key: "partVolume", label: "Declared part volume", symbol: "Vpart", helper: "User-entered final solid volume from CAD or other declared source.", kind: "number", unit: "cm³" },
    { key: "density", label: "Declared material density", symbol: "ρ", helper: "User-entered density for the declared material/condition; no property lookup is applied.", kind: "number", unit: "g/cm³" },
    { key: "supportFactor", label: "Declared support-material factor", symbol: "s", helper: "User-entered support material as a percentage of the part mass; not inferred from geometry.", kind: "number", unit: "%" },
    { key: "buildRate", label: "Declared effective build rate", symbol: "R", helper: "User-entered effective part-plus-support build rate at the stated machine/process condition.", kind: "number", unit: "cm³/h" },
    { key: "materialRate", label: "Declared material rate", symbol: "cm", helper: "User-entered material cost rate.", kind: "number", unit: "currency/kg" },
    { key: "machineRate", label: "Declared machine rate", symbol: "ch", helper: "User-entered machine-hour cost rate.", kind: "number", unit: "currency/h" },
    { key: "fixedOverhead", label: "Declared fixed overhead", symbol: "C0", helper: "User-entered fixed setup/post-processing/other cost allocation.", kind: "number", unit: "currency" },
  ],
  gravityMoment: [
    { key: "mass", label: "Declared moving mass", symbol: "m", helper: "User-entered mass acting at the stated center of gravity.", kind: "number", unit: "kg" },
    { key: "cgRadius", label: "Pivot-to-CG radius", symbol: "r", helper: "User-entered pivot-to-center-of-gravity radius.", kind: "number", unit: "m" },
    { key: "angle", label: "Configuration angle from vertical", symbol: "θ", helper: "User-entered planar angle between the gravity line and the pivot-to-CG radius; 0° produces no gravity moment.", kind: "number", unit: "deg" },
    { key: "counterMoment", label: "Declared counter moment", symbol: "Mc", helper: "User-entered static counteracting moment at the same pivot and sign convention.", kind: "number", unit: "N·m" },
  ],
  pitchCircle: [
    { key: "pcd", label: "Pitch-circle diameter", symbol: "PCD", helper: "Nominal diameter through equal-spacing hole centers.", kind: "number", unit: "mm" },
    { key: "holeCount", label: "Equal hole count", symbol: "n", helper: "Integer count of equally spaced nominal hole centers.", kind: "number", unit: "holes" },
    { key: "startAngle", label: "First-hole angle", symbol: "θ₀", helper: "Angle of the first center from the positive X-axis in the displayed nominal coordinate frame.", kind: "number", unit: "deg" },
  ],
  regularPolygon: [
    { key: "sideCount", label: "Side count", symbol: "n", helper: "Integer count for a regular convex polygon, at least 3.", kind: "number", unit: "sides" },
    { key: "sideLength", label: "Side length", symbol: "s", helper: "Nominal equal side length of the regular polygon.", kind: "number", unit: "mm" },
  ],
  eccentricBoltGroup: [
    { key: "boltCount", label: "Equal bolt count", symbol: "n", helper: "Integer count of identical joints arranged at one common radius.", kind: "number", unit: "bolts" },
    { key: "patternRadius", label: "Pattern radius", symbol: "r", helper: "Centroid-to-bolt center radius for the concentric circular pattern.", kind: "number", unit: "mm" },
    { key: "appliedForce", label: "Declared in-plane load", symbol: "F", helper: "Positive magnitude of one in-plane shear load.", kind: "number", unit: "N" },
    { key: "eccentricity", label: "Load eccentricity", symbol: "e", helper: "Perpendicular offset between the force line and the bolt-pattern centroid.", kind: "number", unit: "mm" },
    { key: "boltDiameter", label: "Bolt shank diameter", symbol: "d", helper: "Nominal unthreaded shank diameter used only for nominal shear stress output.", kind: "number", unit: "mm" },
  ],
  pinStress: [
    { key: "appliedLoad", label: "Declared direct load", symbol: "F", helper: "Positive direct transverse load assumed to share equally across identical pins.", kind: "number", unit: "N" },
    { key: "pinCount", label: "Identical pin count", symbol: "n", helper: "Integer count of pins assumed to share direct load equally.", kind: "number", unit: "pins" },
    { key: "shearPlanes", label: "Shear-plane condition", symbol: "p", helper: "Choose one or two ideal shear planes through every identical pin.", kind: "select", options: [{ value: "1", label: "Single shear · one plane" }, { value: "2", label: "Double shear · two planes" }] },
    { key: "pinDiameter", label: "Pin diameter", symbol: "d", helper: "Nominal circular pin diameter at the stated shear plane.", kind: "number", unit: "mm" },
    { key: "plateThickness", label: "Bearing plate thickness", symbol: "t", helper: "Loaded plate thickness used for the projected bearing-area approximation.", kind: "number", unit: "mm" },
  ],
  gearToothStress: [
    { key: "gearType", label: "Gear tooth type", helper: "Select the narrow static spur or parallel-axis helical first-estimate relation.", kind: "select", options: [{ value: "spur", label: "Spur gear · β = 0°" }, { value: "helical", label: "Parallel-axis helical gear" }] },
    { key: "tangentialLoad", label: "Declared tangential tooth load", symbol: "Ft", helper: "Known static tangential mesh load; this workspace does not derive or select it.", kind: "number", unit: "N" },
    { key: "faceWidth", label: "Face width", symbol: "b", helper: "Nominal loaded face width for the stated spur-gear tooth.", kind: "number", unit: "mm" },
    { key: "module", label: "Normal module", symbol: "m", helper: "Nominal metric module for the stated spur-gear geometry.", kind: "number", unit: "mm" },
    { key: "toothCount", label: "Declared tooth count", symbol: "z", helper: "User-entered tooth count used only to expose the helical virtual-tooth arithmetic.", kind: "number", unit: "teeth" },
    { key: "helixAngle", label: "Declared helix angle", symbol: "β", helper: "Use 0° for a spur gear; the helical first-estimate relation is limited to a positive angle through 45°.", kind: "number", unit: "deg" },
    { key: "formFactor", label: "Declared Lewis form factor", symbol: "Y", helper: "User-entered dimensionless form factor for the declared tooth geometry; it is not selected here.", kind: "number", unit: "—" },
  ],
  vacuumEvacuation: [
    { key: "vesselVolume", label: "Declared evacuated volume", symbol: "V", helper: "Closed vessel and connected volume represented by this one stated volume.", kind: "number", unit: "L" },
    { key: "effectiveSpeed", label: "Declared effective pumping speed", symbol: "S", helper: "User-entered effective speed at the vessel for this interval; no pump curve or conductance calculation is applied.", kind: "number", unit: "L/s" },
    { key: "startPressure", label: "Start absolute pressure", symbol: "p₁", helper: "User-entered start pressure in the same absolute-pressure basis as the target pressure.", kind: "number", unit: "mbar abs" },
    { key: "targetPressure", label: "Target absolute pressure", symbol: "p₂", helper: "User-entered target pressure below the start pressure in the same absolute-pressure basis.", kind: "number", unit: "mbar abs" },
    { key: "targetTime", label: "Declared evacuation-time target", symbol: "tₜ", helper: "User-entered target interval used only for reverse effective-speed arithmetic.", kind: "number", unit: "s" },
  ],
  toggleForce: [
    { key: "inputForce", label: "Declared knee input force", symbol: "Fᵢₙ", helper: "Input force declared perpendicular to the symmetric toggle link line at the knee.", kind: "number", unit: "N" },
    { key: "halfAngle", label: "Link angle from dead centre", symbol: "θ", helper: "Positive pre-dead-centre angle of each link from the straight-line toggle position. The screen guards 0.5° and below.", kind: "number", unit: "°" },
  ],
  wristInertia: [
    { key: "eoatMass", label: "Declared EOAT mass", symbol: "mₑ", helper: "Mass of the declared end-of-arm tooling body only.", kind: "number", unit: "kg" },
    { key: "eoatCentroidalInertia", label: "Declared EOAT centroidal inertia", symbol: "Iₑ,cg", helper: "User-entered EOAT mass moment of inertia about the stated parallel centroidal axis.", kind: "number", unit: "kg·m²" },
    { key: "eoatOffset", label: "EOAT flange-axis offset", symbol: "rₑ", helper: "Perpendicular distance from the stated flange/wrist axis to the EOAT centre of mass.", kind: "number", unit: "m" },
    { key: "payloadMass", label: "Declared payload mass", symbol: "mₚ", helper: "Mass of the declared carried part or process payload.", kind: "number", unit: "kg" },
    { key: "payloadCentroidalInertia", label: "Declared payload centroidal inertia", symbol: "Iₚ,cg", helper: "User-entered payload mass moment of inertia about the stated parallel centroidal axis.", kind: "number", unit: "kg·m²" },
    { key: "payloadOffset", label: "Payload flange-axis offset", symbol: "rₚ", helper: "Perpendicular distance from the stated flange/wrist axis to the payload centre of mass.", kind: "number", unit: "m" },
  ],
  cycleBuilder: [
    { key: "step1Label", label: "Step 1 label", helper: "User-named first serial local work element.", kind: "text" }, { key: "step1Duration", label: "Step 1 duration", symbol: "t₁", helper: "Declared duration for the first serial local step.", kind: "number", unit: "s" },
    { key: "step2Label", label: "Step 2 label", helper: "User-named second serial local work element.", kind: "text" }, { key: "step2Duration", label: "Step 2 duration", symbol: "t₂", helper: "Declared duration for the second serial local step.", kind: "number", unit: "s" },
    { key: "step3Label", label: "Step 3 label", helper: "User-named third serial local work element.", kind: "text" }, { key: "step3Duration", label: "Step 3 duration", symbol: "t₃", helper: "Declared duration for the third serial local step.", kind: "number", unit: "s" },
    { key: "step4Label", label: "Step 4 label", helper: "User-named fourth serial local work element.", kind: "text" }, { key: "step4Duration", label: "Step 4 duration", symbol: "t₄", helper: "Declared duration for the fourth serial local step.", kind: "number", unit: "s" },
    { key: "step5Label", label: "Step 5 label", helper: "User-named fifth serial local work element.", kind: "text" }, { key: "step5Duration", label: "Step 5 duration", symbol: "t₅", helper: "Declared duration for the fifth serial local step.", kind: "number", unit: "s" },
    { key: "step6Label", label: "Step 6 label", helper: "User-named sixth serial local work element.", kind: "text" }, { key: "step6Duration", label: "Step 6 duration", symbol: "t₆", helper: "Declared duration for the sixth serial local step.", kind: "number", unit: "s" },
    { key: "cycleCount", label: "Declared repeated cycle count", symbol: "n", helper: "Integer count used only for the summed serial batch-time arithmetic.", kind: "number", unit: "cycles" },
  ],
  pneumaticLineLoss: [
    { key: "actualFlow", label: "Actual upstream volumetric flow", symbol: "Q", helper: "User-entered actual volumetric flow at the stated upstream condition; standard-flow conversion is excluded.", kind: "number", unit: "m³/min" },
    { key: "insideDiameter", label: "Pipe inside diameter", symbol: "D", helper: "Declared constant straight-pipe inside diameter.", kind: "number", unit: "mm" },
    { key: "pipeLength", label: "Straight pipe length", symbol: "L", helper: "Declared straight run length; fitting and network equivalents are excluded.", kind: "number", unit: "m" },
    { key: "frictionFactor", label: "Declared Darcy friction factor", symbol: "f", helper: "User-entered Darcy friction factor for the stated condition; it is not derived or selected here.", kind: "number", unit: "—" },
    { key: "density", label: "Declared upstream air density", symbol: "ρ", helper: "User-entered density at the stated upstream condition; density variation is excluded.", kind: "number", unit: "kg/m³" },
    { key: "upstreamPressure", label: "Upstream absolute pressure", symbol: "p₁", helper: "Declared upstream absolute pressure used only for the ten-percent approximation guard.", kind: "number", unit: "kPa abs" },
  ],
  tappingTorque: [
    { key: "threadDiameter", label: "Declared thread diameter", symbol: "d", helper: "Declared major-diameter planning input; no thread form or tolerance is inferred.", kind: "number", unit: "mm" },
    { key: "torqueCoefficient", label: "Declared torque coefficient", symbol: "k", helper: "User-entered empirical coefficient for the stated material/tool/process; it is not looked up or selected here.", kind: "number", unit: "N·m/mm³" },
    { key: "engagementFactor", label: "Declared engagement factor", symbol: "e", helper: "User-entered non-dimensional multiplier for the stated engagement/process context.", kind: "number", unit: "—" },
    { key: "spindleSpeed", label: "Declared spindle speed", symbol: "n", helper: "Steady rotational speed used only for mechanical power arithmetic.", kind: "number", unit: "rpm" },
  ],
  threadMachiningTime: [
    { key: "pitch", label: "Declared thread pitch", symbol: "p", helper: "Declared axial travel per revolution; no thread form or starts are inferred.", kind: "number", unit: "mm/rev" },
    { key: "travelLength", label: "Declared per-pass thread travel", symbol: "L", helper: "Axial travel per pass including any user-decided allowance.", kind: "number", unit: "mm" },
    { key: "spindleSpeed", label: "Declared spindle speed", symbol: "n", helper: "Constant speed used only for pitch-feed arithmetic.", kind: "number", unit: "rpm" },
    { key: "passCount", label: "Declared pass count", symbol: "N", helper: "Integer number of repeated equal-travel passes.", kind: "number", unit: "passes" },
    { key: "reversalTime", label: "Declared reversal / overhead per pass", symbol: "tr", helper: "User-entered time added once per pass; sequence details are excluded.", kind: "number", unit: "s" },
  ],
  reynoldsNumber: [
    { key: "density", label: "Declared fluid density", symbol: "ρ", helper: "User-entered density at the stated condition; this workspace does not derive properties.", kind: "number", unit: "kg/m³" },
    { key: "velocity", label: "Declared bulk velocity", symbol: "u", helper: "Representative velocity selected by the user for the stated passage.", kind: "number", unit: "m/s" },
    { key: "hydraulicDiameter", label: "Declared hydraulic diameter", symbol: "Dh", helper: "Characteristic hydraulic diameter for the stated passage; geometry is not derived.", kind: "number", unit: "m" },
    { key: "dynamicViscosity", label: "Declared dynamic viscosity", symbol: "μ", helper: "User-entered dynamic viscosity at the stated condition; temperature/property lookup is excluded.", kind: "number", unit: "Pa·s" },
    { key: "referenceThreshold", label: "Declared reference threshold", symbol: "Reref", helper: "Contextual divisor only; it does not classify flow or select a correlation.", kind: "number", unit: "—" },
  ],
  minorLosses: [
    { key: "sumK", label: "Declared total minor-loss coefficient", symbol: "ΣK", helper: "User-entered aggregate coefficient for the stated fittings/local effects; no coefficient is selected or inferred.", kind: "number", unit: "—" },
    { key: "density", label: "Declared fluid density", symbol: "ρ", helper: "User-entered density at the stated condition; property lookup is excluded.", kind: "number", unit: "kg/m³" },
    { key: "velocity", label: "Declared reference velocity", symbol: "v", helper: "User-entered velocity at the coefficient reference section; passage geometry is not derived.", kind: "number", unit: "m/s" },
  ],
  pipeSizing: [
    { key: "flow", label: "Declared volumetric flow", symbol: "Q", helper: "User-entered flow at the stated condition; fluid compressibility and leakage are excluded.", kind: "number", unit: "L/min" },
    { key: "targetVelocity", label: "Declared target velocity", symbol: "vtarget", helper: "User-entered reference velocity only; this workspace does not select a target or pipe schedule.", kind: "number", unit: "m/s" },
  ],
  buoyancyForce: [
    { key: "fluidDensity", label: "Declared fluid density", symbol: "ρf", helper: "Constant user-entered displaced-fluid density; stratification and property lookup are excluded.", kind: "number", unit: "kg/m³" },
    { key: "displacedVolume", label: "Declared displaced volume", symbol: "Vd", helper: "User-entered displaced volume at the stated immersion condition; geometry is not inferred.", kind: "number", unit: "L" },
    { key: "objectMass", label: "Declared object mass", symbol: "m", helper: "User-entered mass used only for gravitational-weight comparison.", kind: "number", unit: "kg" },
  ],
  submergedPlane: [
    { key: "fluidDensity", label: "Declared fluid density", symbol: "ρ", helper: "Constant user-entered density; density variation and fluid-property lookup are excluded.", kind: "number", unit: "kg/m³" },
    { key: "width", label: "Rectangle width", symbol: "b", helper: "User-entered horizontal width of a fully submerged vertical rectangle.", kind: "number", unit: "m" },
    { key: "height", label: "Rectangle height", symbol: "h", helper: "User-entered vertical height of the fully submerged rectangular plane.", kind: "number", unit: "m" },
    { key: "centroidDepth", label: "Declared centroid depth", symbol: "yc", helper: "Vertical depth of the rectangle centroid below the free surface; orientation is fixed to vertical.", kind: "number", unit: "m" },
  ],
  convectionHeat: [
    { key: "coefficient", label: "Declared convection coefficient", symbol: "h", helper: "User-entered heat-transfer coefficient for the stated setup; this workspace does not derive a correlation.", kind: "number", unit: "W/(m²·K)" },
    { key: "area", label: "Declared heat-transfer area", symbol: "A", helper: "User-entered effective area; geometry and fin efficiency are excluded.", kind: "number", unit: "m²" },
    { key: "deltaT", label: "Declared temperature difference", symbol: "ΔT", helper: "User-entered signed bulk-to-surface temperature difference; no temperature field is derived.", kind: "number", unit: "K" },
  ],
  thermalResistance: [
    { key: "hotCoefficient", label: "Declared hot-side convection coefficient", symbol: "hh", helper: "User-entered hot-side coefficient; no correlation or property calculation is performed.", kind: "number", unit: "W/(m²·K)" },
    { key: "hotArea", label: "Declared hot-side convection area", symbol: "Ah", helper: "User-entered effective hot-side area.", kind: "number", unit: "m²" },
    { key: "wallThickness", label: "Declared wall thickness", symbol: "L", helper: "User-entered one-dimensional wall thickness.", kind: "number", unit: "mm" },
    { key: "wallConductivity", label: "Declared wall conductivity", symbol: "k", helper: "User-entered conductivity at the stated condition; material selection is excluded.", kind: "number", unit: "W/(m·K)" },
    { key: "wallArea", label: "Declared wall conduction area", symbol: "Aw", helper: "User-entered one-dimensional conduction area.", kind: "number", unit: "m²" },
    { key: "contactResistance", label: "Declared contact resistance", symbol: "Rc", helper: "Optional user-entered lumped contact term; interface conditions are not inferred.", kind: "number", unit: "K/W" },
    { key: "coldCoefficient", label: "Declared cold-side convection coefficient", symbol: "hc", helper: "User-entered cold-side coefficient; no correlation or property calculation is performed.", kind: "number", unit: "W/(m²·K)" },
    { key: "coldArea", label: "Declared cold-side convection area", symbol: "Ac", helper: "User-entered effective cold-side area.", kind: "number", unit: "m²" },
    { key: "heatRate", label: "Declared heat rate", symbol: "Q̇", helper: "User-entered rate used only to calculate the total temperature difference across the declared series network.", kind: "number", unit: "W" },
  ],
  idealGas: [
    { key: "pressure", label: "Declared absolute pressure", symbol: "p", helper: "User-entered absolute pressure; gauge-to-absolute conversion is excluded.", kind: "number", unit: "kPa(abs)" },
    { key: "temperature", label: "Declared absolute temperature", symbol: "T", helper: "User-entered absolute temperature in kelvin; phase behavior is excluded.", kind: "number", unit: "K" },
    { key: "molarMass", label: "Declared molar mass", symbol: "M", helper: "User-entered molar mass for the stated gas; composition is not inferred.", kind: "number", unit: "kg/kmol" },
    { key: "volume", label: "Declared volume", symbol: "V", helper: "User-entered fixed volume used only for ideal-gas amount arithmetic.", kind: "number", unit: "m³" },
  ],
  isentropicMachine: [
    { key: "mode", label: "Declared machine mode", helper: "Select compressor or turbine sign convention; this workspace does not select equipment.", kind: "select", options: [{ value: "compressor", label: "Compressor" }, { value: "turbine", label: "Turbine" }] },
    { key: "inletTemperature", label: "Declared inlet temperature", symbol: "T1", helper: "User-entered absolute inlet temperature.", kind: "number", unit: "K" },
    { key: "inletPressure", label: "Declared inlet absolute pressure", symbol: "p1", helper: "User-entered absolute inlet pressure.", kind: "number", unit: "kPa(abs)" },
    { key: "outletPressure", label: "Declared outlet absolute pressure", symbol: "p2", helper: "User-entered absolute outlet pressure.", kind: "number", unit: "kPa(abs)" },
    { key: "gamma", label: "Declared heat-capacity ratio", symbol: "γ", helper: "User-entered constant ratio for the stated ideal gas; property inference is excluded.", kind: "number", unit: "—" },
    { key: "specificHeat", label: "Declared constant-pressure specific heat", symbol: "cp", helper: "User-entered value for stated work arithmetic.", kind: "number", unit: "kJ/(kg·K)" },
    { key: "massFlow", label: "Declared mass flow", symbol: "ṁ", helper: "User-entered steady mass flow.", kind: "number", unit: "kg/s" },
    { key: "efficiency", label: "Declared isentropic efficiency", symbol: "ηis", helper: "User-entered scalar efficiency used only for stated-work arithmetic.", kind: "number", unit: "%" },
  ],
  beamDiagram: [
    { key: "span", label: "Support span", symbol: "L", helper: "One simply supported span between reaction locations.", kind: "number", unit: "m" },
    { key: "pointLoad", label: "Declared downward point load", symbol: "P", helper: "Enter 0 when no point load is present; upward loading is outside this bounded model.", kind: "number", unit: "kN" },
    { key: "pointLocation", label: "Point-load location from left", symbol: "a", helper: "Used only when point load is nonzero; must lie strictly between supports.", kind: "number", unit: "m" },
    { key: "uniformLoad", label: "Declared full-span uniform load", symbol: "w", helper: "Enter 0 when absent; applies over the entire support span only.", kind: "number", unit: "kN/m" },
  ],
  triangleTruss: [
    { key: "span", label: "Support span", symbol: "L", helper: "Horizontal distance between the two lower pin supports.", kind: "number", unit: "m" },
    { key: "rise", label: "Apex rise", symbol: "h", helper: "Vertical apex distance above the lower chord.", kind: "number", unit: "m" },
    { key: "apexLoad", label: "Declared vertical apex load", symbol: "P", helper: "Downward static load at the apex joint only.", kind: "number", unit: "kN" },
  ],
  hertzContact: [
    { key: "normalForce", label: "Declared normal force", symbol: "F", helper: "Positive compressive normal load; tangential force is excluded.", kind: "number", unit: "N" },
    { key: "sphereRadius", label: "Sphere radius", symbol: "R", helper: "Nominal radius of the sphere against one locally flat body.", kind: "number", unit: "mm" },
    { key: "sphereModulus", label: "Sphere elastic modulus", symbol: "E₁", helper: "Declared linear-elastic modulus for the spherical body.", kind: "number", unit: "GPa" },
    { key: "spherePoisson", label: "Sphere Poisson ratio", symbol: "ν₁", helper: "Declared isotropic elastic ratio in the range 0 through less than 0.5.", kind: "number", unit: "—" },
    { key: "flatModulus", label: "Flat elastic modulus", symbol: "E₂", helper: "Declared linear-elastic modulus for the locally flat body.", kind: "number", unit: "GPa" },
    { key: "flatPoisson", label: "Flat Poisson ratio", symbol: "ν₂", helper: "Declared isotropic elastic ratio in the range 0 through less than 0.5.", kind: "number", unit: "—" },
  ],
  fractureIntensity: [
    { key: "geometryFactor", label: "Declared Mode-I geometry factor", symbol: "Y", helper: "User-entered dimensionless factor from a geometry-specific validated source; this workspace does not select it.", kind: "number", unit: "—" },
    { key: "tensileStress", label: "Declared remote tensile stress", symbol: "σ", helper: "User-entered nominal tensile stress in the stated linear-elastic model.", kind: "number", unit: "MPa" },
    { key: "crackHalfLength", label: "Declared crack half-length", symbol: "a", helper: "User-entered half crack length for the geometry-factor definition.", kind: "number", unit: "mm" },
    { key: "toughnessReference", label: "Declared toughness reference", symbol: "KIC", helper: "User-entered reference used only for literal ratio arithmetic; no fracture conclusion is made.", kind: "number", unit: "MPa√m" },
  ],
  deflectionCheck: [
    { key: "declaredDeflection", label: "Declared calculated deflection", symbol: "δ", helper: "User-entered deflection from a separately established model; no load model is inferred.", kind: "number", unit: "mm" },
    { key: "span", label: "Declared reference span", symbol: "L", helper: "User-entered span associated with the stated deflection reference.", kind: "number", unit: "mm" },
    { key: "referenceDenominator", label: "Declared reference denominator", symbol: "nref", helper: "User-entered scalar such as 240 or 360; this workspace does not select a requirement.", kind: "number", unit: "—" },
  ],
  cantileverFrame: [
    { key: "lateralLoad", label: "Declared lateral top load", symbol: "H", helper: "Positive lateral-load magnitude at the upper end of the one displayed vertical member.", kind: "number", unit: "N" },
    { key: "columnHeight", label: "Column height", symbol: "h", helper: "Vertical fixed-base-to-load distance of the one displayed cantilever member.", kind: "number", unit: "mm" },
  ],
  plateBuckling: [
    { key: "modulus", label: "Declared elastic modulus", symbol: "E", helper: "User-entered linear-elastic Young’s modulus for the stated plate material and condition.", kind: "number", unit: "GPa" },
    { key: "poissonRatio", label: "Declared Poisson ratio", symbol: "ν", helper: "User-entered isotropic elastic ratio strictly between −1 and 1; it is not looked up.", kind: "number", unit: "—" },
    { key: "thickness", label: "Declared plate thickness", symbol: "t", helper: "Uniform unstiffened plate thickness in the stated elastic model.", kind: "number", unit: "mm" },
    { key: "referenceWidth", label: "Declared reference width", symbol: "b", helper: "Width matched to the user-entered buckling coefficient definition; this workspace does not select it.", kind: "number", unit: "mm" },
    { key: "bucklingCoefficient", label: "Declared buckling coefficient", symbol: "k", helper: "User-entered dimensionless coefficient from a geometry/loading/boundary-specific source; no chart lookup is performed.", kind: "number", unit: "—" },
  ],
  screwCriticalSpeed: [
    { key: "rootDiameter", label: "Declared screw root diameter", symbol: "dr", helper: "User-entered minor/root diameter of the stated rotating screw; nominal diameter is not substituted.", kind: "number", unit: "mm" },
    { key: "unsupportedLength", label: "Declared unsupported length", symbol: "L", helper: "Distance between the stated bearing supports; end conditions and support selection are not inferred.", kind: "number", unit: "mm" },
    { key: "endFixityFactor", label: "Declared end-fixity factor", symbol: "Cs", helper: "User-entered factor matched to the stated support condition from a controlled source; no support-factor lookup is performed.", kind: "number", unit: "—" },
    { key: "operatingSpeed", label: "Declared operating speed", symbol: "n", helper: "User-entered steady screw speed used only for a literal ratio to the calculated critical speed.", kind: "number", unit: "rpm" },
  ],
  linearGuideLife: [
    { key: "rollingType", label: "Declared rolling-element type", helper: "Select the source’s ball or roller reference-travel/exponent model; no guide model is selected.", kind: "select", options: [{ value: "ball", label: "Ball guide · 50 km reference · exponent 3" }, { value: "roller", label: "Roller guide · 100 km reference · exponent 10/3" }] },
    { key: "dynamicRating", label: "Declared basic dynamic rating", symbol: "C", helper: "User-entered published basic dynamic load rating of one identified guide system.", kind: "number", unit: "N" },
    { key: "calculatedLoad", label: "Declared calculated load", symbol: "Pc", helper: "User-entered calculated load acting on the stated guide; this workspace does not derive equivalent loading.", kind: "number", unit: "N" },
    { key: "travelRate", label: "Declared travel rate", symbol: "v", helper: "User-entered constant total guide travel rate used only to convert nominal travel distance to a literal time value.", kind: "number", unit: "m/min" },
  ],
  brakingDuty: [
    { key: "regenerationType", label: "Declared regeneration type", helper: "Select the source’s normal-braking or overhauling-load average-wattage arithmetic; this does not determine the actual operating condition.", kind: "select", options: [{ value: "normal", label: "Normal braking · source average factor 1/2" }, { value: "overhauling", label: "Overhauling load · source average factor 1" }] },
    { key: "drivePower", label: "Declared motor / drive power", symbol: "MW", helper: "User-entered mechanical/electrical power basis in kW; motor selection and losses are excluded.", kind: "number", unit: "kW" },
    { key: "brakeTorqueMultiplier", label: "Declared brake-torque multiplier", symbol: "BT", helper: "User-entered multiplier such as 1.0 for 100% from a declared matched drive/resistor context.", kind: "number", unit: "—" },
    { key: "dcBusVoltage", label: "Declared DC-bus voltage", symbol: "Vdc", helper: "User-entered braking-bus voltage for the stated drive condition; it is not inferred from supply voltage.", kind: "number", unit: "V" },
    { key: "brakingTime", label: "Declared braking time", symbol: "tb", helper: "Time energized in each declared repeating braking interval.", kind: "number", unit: "s" },
    { key: "cycleTime", label: "Declared cycle time", symbol: "tc", helper: "Complete repeating interval used only for the literal duty calculation.", kind: "number", unit: "s" },
  ],
  ballScrewLife: [
    { key: "dynamicRating", label: "Declared axial dynamic rating", symbol: "Ca", helper: "User-entered basic axial dynamic load rating for one identified ball screw.", kind: "number", unit: "N" },
    { key: "axialLoad", label: "Declared applied axial load", symbol: "Fa", helper: "User-entered constant axial load in the stated direction; equivalent load is not derived.", kind: "number", unit: "N" },
    { key: "lead", label: "Declared screw lead", symbol: "Ph", helper: "User-entered linear travel per revolution for the stated ball screw.", kind: "number", unit: "mm/rev" },
    { key: "speed", label: "Declared screw speed", symbol: "n", helper: "User-entered rotating speed used only for literal time conversion.", kind: "number", unit: "rpm" },
    { key: "travelFraction", label: "Declared travel-time fraction", symbol: "ftravel", helper: "Percent of elapsed time at the declared rotating travel condition, from greater than 0 through 100.", kind: "number", unit: "%" },
  ],
  driveTrain: [
    { key: "inputSpeed", label: "Declared input speed", symbol: "n1", helper: "User-entered rotational input speed for the series-stage arithmetic.", kind: "number", unit: "rpm" },
    { key: "inputTorque", label: "Declared input torque", symbol: "T1", helper: "User-entered transmitted input torque; load dynamics and torque variation are excluded.", kind: "number", unit: "N·m" },
    { key: "stage1Ratio", label: "Declared stage 1 reduction ratio", symbol: "r1", helper: "User-entered speed-reduction magnitude for the first series stage.", kind: "number", unit: "—" },
    { key: "stage1Efficiency", label: "Declared stage 1 efficiency", symbol: "η1", helper: "User-entered efficiency strictly greater than 0 through 1; it is not predicted.", kind: "number", unit: "—" },
    { key: "stage2Ratio", label: "Declared stage 2 reduction ratio", symbol: "r2", helper: "User-entered speed-reduction magnitude for the second series stage; use 1 for no stage.", kind: "number", unit: "—" },
    { key: "stage2Efficiency", label: "Declared stage 2 efficiency", symbol: "η2", helper: "User-entered efficiency strictly greater than 0 through 1; it is not predicted.", kind: "number", unit: "—" },
    { key: "stage3Ratio", label: "Declared stage 3 reduction ratio", symbol: "r3", helper: "User-entered speed-reduction magnitude for the third series stage; use 1 for no stage.", kind: "number", unit: "—" },
    { key: "stage3Efficiency", label: "Declared stage 3 efficiency", symbol: "η3", helper: "User-entered efficiency strictly greater than 0 through 1; it is not predicted.", kind: "number", unit: "—" },
  ],
  rmsDutyTorque: [
    { key: "torque1", label: "Declared segment 1 torque", symbol: "T1", helper: "Signed torque held constant for the stated first duration; zero and negative values are permitted.", kind: "number", unit: "N·m" },
    { key: "duration1", label: "Declared segment 1 duration", symbol: "t1", helper: "Positive duration of the first user-defined duty segment.", kind: "number", unit: "s" },
    { key: "torque2", label: "Declared segment 2 torque", symbol: "T2", helper: "Signed torque held constant for the stated second duration; zero and negative values are permitted.", kind: "number", unit: "N·m" },
    { key: "duration2", label: "Declared segment 2 duration", symbol: "t2", helper: "Positive duration of the second user-defined duty segment.", kind: "number", unit: "s" },
    { key: "torque3", label: "Declared segment 3 torque", symbol: "T3", helper: "Signed torque held constant for the stated third duration; zero and negative values are permitted.", kind: "number", unit: "N·m" },
    { key: "duration3", label: "Declared segment 3 duration", symbol: "t3", helper: "Positive duration of the third user-defined duty segment.", kind: "number", unit: "s" },
  ],
  motorOperatingPoint: [
    { key: "motorClass", label: "Declared motor class", helper: "User-classified record label only; the same shaft-power relation is applied and no motor class is selected or compared.", kind: "select", options: [{ value: "servo", label: "Servo motor record" }, { value: "stepper", label: "Stepper motor record" }, { value: "ac", label: "AC motor record" }] },
    { key: "shaftTorque", label: "Declared shaft torque", symbol: "T", helper: "User-entered steady mechanical shaft torque at the stated operating point.", kind: "number", unit: "N·m" },
    { key: "shaftSpeed", label: "Declared shaft speed", symbol: "n", helper: "User-entered steady rotational speed at the stated operating point.", kind: "number", unit: "rpm" },
    { key: "referenceTorque", label: "Declared reference torque", symbol: "Tref", helper: "User-entered record-specific comparison reference; it is not validated against a motor curve.", kind: "number", unit: "N·m" },
    { key: "referencePower", label: "Declared reference power", symbol: "Pref", helper: "User-entered record-specific comparison reference; it is not validated against a motor rating.", kind: "number", unit: "kW" },
  ],
  gripperHold: [
    { key: "payloadMass", label: "Declared payload mass", symbol: "m", helper: "User-entered payload mass for the stated friction-only vertical hold screen.", kind: "number", unit: "kg" },
    { key: "verticalAcceleration", label: "Declared upward acceleration", symbol: "a", helper: "User-entered upward acceleration magnitude; trajectory and dynamic shock are excluded.", kind: "number", unit: "m/s²" },
    { key: "frictionCoefficient", label: "Declared jaw / payload friction", symbol: "μ", helper: "User-entered friction coefficient strictly greater than 0 through 1; contact behavior is not predicted.", kind: "number", unit: "—" },
    { key: "jawCount", label: "Declared gripping-jaw count", symbol: "z", helper: "Count of equally sharing parallel grip contacts for literal per-jaw force arithmetic.", kind: "number", unit: "—" },
    { key: "multiplier", label: "Declared force multiplier", symbol: "S", helper: "User-entered multiplier used only in the visible friction-hold arithmetic; it is not a safety approval.", kind: "number", unit: "—" },
  ],
  conveyorLine: [
    { key: "solveFor", label: "Declared conversion direction", helper: "Choose whether stated speed/pitch produces a rate or stated requested rate/pitch produces a line speed.", kind: "select", options: [{ value: "rate", label: "Calculate item rate from line speed" }, { value: "speed", label: "Calculate line speed from requested rate" }] },
    { key: "productPitch", label: "Declared center-to-center pitch", symbol: "p", helper: "Uniform product-center pitch in the travel direction; accumulation and product stability are excluded.", kind: "number", unit: "mm" },
    { key: "lineSpeed", label: "Declared conveyor line speed", symbol: "v", helper: "Required only when calculating item rate; use a positive stated speed in m/min.", kind: "number", unit: "m/min" },
    { key: "requestedRate", label: "Declared requested item rate", symbol: "q", helper: "Required only when calculating line speed; it is not validated as equipment capacity.", kind: "number", unit: "items/min" },
  ],
  robotReach: [
    { key: "targetX", label: "Declared target X offset", symbol: "x", helper: "User-entered target offset from the stated robot-base origin along X.", kind: "number", unit: "mm" },
    { key: "targetY", label: "Declared target Y offset", symbol: "y", helper: "User-entered target offset from the stated robot-base origin along Y.", kind: "number", unit: "mm" },
    { key: "targetZ", label: "Declared target Z offset", symbol: "z", helper: "User-entered target offset from the stated robot-base origin along Z.", kind: "number", unit: "mm" },
    { key: "referenceReach", label: "Declared radial reference reach", symbol: "Rref", helper: "User-entered reference radial reach for literal distance comparison; it is not a pose or workspace result.", kind: "number", unit: "mm" },
  ],
  robotPayloadMoment: [
    { key: "payloadMass", label: "Declared payload mass", symbol: "m", helper: "User-entered attached payload mass for static gravity arithmetic.", kind: "number", unit: "kg" },
    { key: "cogOffset", label: "Declared flange-to-CoG offset", symbol: "e", helper: "User-entered radial offset from the stated flange reference to payload center of gravity.", kind: "number", unit: "mm" },
  ],
  rotaryIndexing: [
    { key: "indexAngle", label: "Declared index angle", symbol: "α", helper: "User-entered angular displacement for one index; position accuracy and the motion profile are excluded.", kind: "number", unit: "deg" },
    { key: "moveTime", label: "Declared move time", symbol: "tmove", helper: "User-entered time for the index motion only; dwell and process timing are excluded.", kind: "number", unit: "s" },
    { key: "systemInertia", label: "Declared table-plus-load inertia", symbol: "I", helper: "User-entered rotational inertia about the declared indexing axis; geometry, gearing, and motor inertia are not derived.", kind: "number", unit: "kg·m²" },
  ],
  pneumaticDemandBudget: [
    { key: "normalizedAirPerCycle", label: "Declared normalized air demand per cycle", symbol: "qcycle", helper: "User-entered normalized free-air demand per one completed device cycle; cylinder geometry and pressure are not derived.", kind: "number", unit: "NL/cycle" },
    { key: "cycleRate", label: "Declared cycle rate per device", symbol: "ncycle", helper: "User-entered repeated cycles per minute for each stated active device.", kind: "number", unit: "cycles/min" },
    { key: "activeDeviceCount", label: "Declared active-device count", symbol: "z", helper: "Positive whole count of devices sharing the same declared demand record.", kind: "number", unit: "devices" },
    { key: "dutyFraction", label: "Declared active-time fraction", symbol: "D", helper: "Percent greater than 0 through 100 used only to scale stated repeated demand.", kind: "number", unit: "%" },
    { key: "referenceSupplyFlow", label: "Declared reference supply flow", symbol: "Qref", helper: "User-entered normalized reference flow for literal ratio arithmetic only; it is not a capacity rating or selection input.", kind: "number", unit: "NL/min" },
  ],
  hydraulicLossBudget: [
    { key: "pressureDrop", label: "Declared pressure drop", symbol: "Δp", helper: "User-entered pressure loss across the stated bounded circuit element or aggregate; no network is solved.", kind: "number", unit: "bar" },
    { key: "flow", label: "Declared hydraulic flow", symbol: "Q", helper: "User-entered flow through the stated pressure-drop record; duty, leakage, and flow distribution are not derived.", kind: "number", unit: "L/min" },
    { key: "activeTimeFraction", label: "Declared active-time fraction", symbol: "D", helper: "Percent greater than 0 through 100 used to report a literal time-scaled loss-power average.", kind: "number", unit: "%" },
  ],
  vacuumLeakageBudget: [
    { key: "leakagePerPoint", label: "Declared normalized leakage per active point", symbol: "qleak", helper: "User-entered normalized leakage demand for one active vacuum point; leakage is not inferred from a workpiece, conductance, or test.", kind: "number", unit: "NL/min" },
    { key: "activePointCount", label: "Declared active vacuum-point count", symbol: "z", helper: "Positive whole count of stated active vacuum points with the same declared leakage record.", kind: "number", unit: "points" },
    { key: "activeTimeFraction", label: "Declared active-time fraction", symbol: "D", helper: "Percent greater than 0 through 100 used only to scale the declared leakage demand.", kind: "number", unit: "%" },
    { key: "referenceSuctionFlow", label: "Declared reference suction flow", symbol: "Qref", helper: "User-entered reference suction-flow value for literal ratio arithmetic only; it is not a capacity result or selection input.", kind: "number", unit: "NL/min" },
  ],
  hydraulicAccumulatorState: [
    { key: "prechargePressure", label: "Declared precharge pressure", symbol: "P₀", helper: "User-entered absolute gas precharge pressure; no precharge guidance or selection is provided.", kind: "number", unit: "bar(abs)" },
    { key: "maximumWorkingPressure", label: "Declared maximum working pressure", symbol: "Pmax", helper: "User-entered absolute maximum gas pressure state for the stated cycle; pressure rating is not assessed.", kind: "number", unit: "bar(abs)" },
    { key: "minimumWorkingPressure", label: "Declared minimum working pressure", symbol: "Pmin", helper: "User-entered absolute minimum gas pressure state; it must exceed the stated precharge pressure for this bounded state relation.", kind: "number", unit: "bar(abs)" },
    { key: "prechargeGasVolume", label: "Declared precharge gas volume", symbol: "V₀", helper: "User-entered gas volume at the declared precharge state; vessel geometry and usable volume are not selected.", kind: "number", unit: "L" },
    { key: "polytropicExponent", label: "Declared polytropic exponent", symbol: "n", helper: "User-entered exponent from 1 through 1.67; no isothermal/adiabatic/process selection is made.", kind: "number", unit: "—" },
  ],
  hydraulicReservoirDwell: [
    { key: "workingVolume", label: "Declared working reservoir volume", symbol: "Vworking", helper: "User-entered liquid working volume; tank geometry, fluid level, and total vessel capacity are not derived.", kind: "number", unit: "L" },
    { key: "returnFlow", label: "Declared return or pump flow", symbol: "Qreturn", helper: "User-entered steady flow used only for literal volume-over-flow dwell arithmetic.", kind: "number", unit: "L/min" },
    { key: "referenceDwellTime", label: "Declared dwell-time reference", symbol: "tref", helper: "User-entered time reference for a literal equivalent-volume comparison; it is not a requirement or recommendation.", kind: "number", unit: "min" },
  ],
  darcyFrictionFactor: [
    { key: "mode", label: "Declared calculation mode", helper: "Choose the relation the user has already determined is applicable; this workspace does not classify the flow regime.", kind: "select", options: [{ value: "laminar", label: "Laminar relation · f = 64 / Re" }, { value: "swameeJain", label: "Swamee–Jain explicit relation" }] },
    { key: "reynoldsNumber", label: "Declared Reynolds number", symbol: "Re", helper: "User-entered dimensionless Reynolds number; viscosity, density, velocity, and regime are not derived.", kind: "number", unit: "—" },
    { key: "absoluteRoughness", label: "Declared absolute roughness", symbol: "ε", helper: "Required only for the selected Swamee–Jain relation; use a compatible length unit with the stated inside diameter.", kind: "number", unit: "mm" },
    { key: "insideDiameter", label: "Declared inside diameter", symbol: "D", helper: "Required only for the selected Swamee–Jain relation; use the same length unit as roughness.", kind: "number", unit: "mm" },
  ],
  pumpSystemHeadPoint: [
    { key: "staticHead", label: "Declared static-head offset", symbol: "Hstatic", helper: "User-entered static head at zero flow; elevation, pressure boundary, and other contributors are not derived.", kind: "number", unit: "m" },
    { key: "quadraticLossCoefficient", label: "Declared quadratic-loss coefficient", symbol: "K", helper: "User-entered coefficient in compatible head-per-flow-squared units; no pipe, valve, or fitting loss is derived.", kind: "number", unit: "m/(L/s)²" },
    { key: "flowPoint", label: "Declared flow point", symbol: "Q", helper: "User-entered flow point used only to report one literal system-head value.", kind: "number", unit: "L/s" },
  ],
  npshAvailableBudget: [
    { key: "surfacePressureHead", label: "Declared absolute surface-pressure head", symbol: "Hsurface", helper: "User-entered absolute pressure head at the liquid surface; atmospheric or tank pressure is not derived.", kind: "number", unit: "m" },
    { key: "staticSuctionHead", label: "Declared signed static suction head", symbol: "Hsuction", helper: "User-entered liquid-surface-to-pump elevation contribution; use positive for a stated flooded-suction contribution and negative for a stated lift.", kind: "number", unit: "m" },
    { key: "suctionLossHead", label: "Declared suction loss head", symbol: "Hloss", helper: "User-entered total suction-side loss head; no pipe, valve, fitting, or flow model is solved.", kind: "number", unit: "m" },
    { key: "vaporPressureHead", label: "Declared vapor-pressure head", symbol: "Hvapor", helper: "User-entered vapor-pressure head at the stated fluid condition; fluid properties and temperature are not derived.", kind: "number", unit: "m" },
    { key: "npshRequiredReference", label: "Declared NPSH-required reference", symbol: "NPSHr", helper: "User-entered pump-data reference used only for a literal stated-head difference; it is not assessed for adequacy.", kind: "number", unit: "m" },
  ],
  thermalRcStep: [
    { key: "constantPower", label: "Declared constant power step", symbol: "P", helper: "User-entered constant heat-generation step; time-varying loads and duty cycles are not modeled.", kind: "number", unit: "W" },
    { key: "thermalResistance", label: "Declared thermal resistance", symbol: "R", helper: "User-entered scalar thermal resistance for one ideal path; no hardware or path is derived or selected.", kind: "number", unit: "K/W" },
    { key: "thermalCapacitance", label: "Declared thermal capacitance", symbol: "C", helper: "User-entered scalar thermal capacitance for the same one ideal node; mass, material, and geometry are not derived.", kind: "number", unit: "J/K" },
    { key: "ambientTemperature", label: "Declared ambient temperature", symbol: "Tamb", helper: "User-entered constant reference temperature for this ideal step-response relation.", kind: "number", unit: "°C" },
    { key: "elapsedTime", label: "Declared elapsed time", symbol: "t", helper: "User-entered elapsed time after the stated constant power step; must be zero or greater.", kind: "number", unit: "s" },
  ],
  manningUniformFlow: [
    { key: "manningRoughness", label: "Declared Manning roughness coefficient", symbol: "n", helper: "User-entered roughness coefficient; material, vegetation, geometry, and roughness selection are not derived.", kind: "number", unit: "—" },
    { key: "hydraulicRadius", label: "Declared hydraulic radius", symbol: "R", helper: "User-entered hydraulic radius for the stated section; area and wetted perimeter are not inferred.", kind: "number", unit: "m" },
    { key: "energySlope", label: "Declared energy slope", symbol: "S", helper: "User-entered dimensionless energy slope for stated uniform, steady flow; a flow profile is not solved.", kind: "number", unit: "m/m" },
    { key: "flowArea", label: "Declared flow area", symbol: "A", helper: "User-entered wetted flow area; no channel section geometry or water depth is derived.", kind: "number", unit: "m²" },
  ],
  compressibleMassFlow: [
    { key: "flowArea", label: "Declared flow area", symbol: "A", helper: "User-entered flow area; nozzle, throat, and duct geometry are not derived.", kind: "number", unit: "m²" },
    { key: "totalPressure", label: "Declared total pressure", symbol: "pt", helper: "User-entered absolute total pressure; pressure losses and state conversion are not derived.", kind: "number", unit: "Pa" },
    { key: "totalTemperature", label: "Declared total temperature", symbol: "Tt", helper: "User-entered absolute total temperature; heat transfer and temperature state are not derived.", kind: "number", unit: "K" },
    { key: "machNumber", label: "Declared Mach number", symbol: "M", helper: "User-entered Mach number; this workspace does not determine flow regime or choking.", kind: "number", unit: "—" },
    { key: "specificHeatRatio", label: "Declared specific-heat ratio", symbol: "γ", helper: "User-entered ideal-gas specific-heat ratio; gas properties are not derived.", kind: "number", unit: "—" },
    { key: "gasConstant", label: "Declared specific gas constant", symbol: "R", helper: "User-entered specific gas constant; gas composition and properties are not derived.", kind: "number", unit: "J/(kg·K)" },
  ],
  machiningTimeBudget: [
    { key: "cuttingLength", label: "Declared cutting length", symbol: "Lcut", helper: "User-entered total path length while cutting; entries, exits, repositioning, and toolpath strategy are not derived.", kind: "number", unit: "mm" },
    { key: "feedRate", label: "Declared feed rate", symbol: "Ffeed", helper: "User-entered cutting feed rate; tool, material, speed, chip load, and quality are not selected or derived.", kind: "number", unit: "mm/min" },
    { key: "nonCutAllowance", label: "Declared non-cut time allowance", symbol: "tallowance", helper: "User-entered aggregate allowance for stated non-cut time; setup, handling, and machine motion are not predicted.", kind: "number", unit: "min" },
  ],
  threePhasePower: [
    { key: "lineVoltage", label: "Declared line-to-line voltage", symbol: "VLL", helper: "User-entered RMS line-to-line voltage; voltage drop, supply quality, and system configuration are not derived.", kind: "number", unit: "V" },
    { key: "lineCurrent", label: "Declared line current", symbol: "I", helper: "User-entered RMS line current; load balance, conductor sizing, and protection are not derived.", kind: "number", unit: "A" },
    { key: "powerFactor", label: "Declared power factor", symbol: "PF", helper: "User-entered scalar power factor from zero through one; harmonics and power-quality effects are not modeled.", kind: "number", unit: "—" },
  ],
  sheetBendAllowance: [
    { key: "bendAngle", label: "Declared bend angle", symbol: "θ", helper: "User-entered included bend angle; bend geometry and sequence are not inferred.", kind: "number", unit: "°" },
    { key: "insideRadius", label: "Declared inside bend radius", symbol: "R", helper: "User-entered inside radius; tooling and bend method are not selected.", kind: "number", unit: "mm" },
    { key: "thickness", label: "Declared sheet thickness", symbol: "T", helper: "User-entered thickness; material condition and tolerance are not derived.", kind: "number", unit: "mm" },
    { key: "kFactor", label: "Declared K factor", symbol: "K", helper: "User-entered neutral-axis ratio; no material, tooling, or process K-factor selection is performed.", kind: "number", unit: "—" },
  ],
  idealGasEntropyChange: [
    { key: "initialTemperature", label: "Declared initial temperature", symbol: "T₁", helper: "User-entered absolute temperature state; properties and process path are not inferred.", kind: "number", unit: "K" },
    { key: "finalTemperature", label: "Declared final temperature", symbol: "T₂", helper: "User-entered absolute temperature state; properties and process path are not inferred.", kind: "number", unit: "K" },
    { key: "initialPressure", label: "Declared initial pressure", symbol: "p₁", helper: "User-entered absolute pressure state; gas state and losses are not derived.", kind: "number", unit: "Pa" },
    { key: "finalPressure", label: "Declared final pressure", symbol: "p₂", helper: "User-entered absolute pressure state; gas state and losses are not derived.", kind: "number", unit: "Pa" },
    { key: "specificHeat", label: "Declared constant specific heat", symbol: "cp", helper: "User-entered constant-pressure specific heat; temperature dependence and gas identity are not derived.", kind: "number", unit: "J/(kg·K)" },
    { key: "gasConstant", label: "Declared specific gas constant", symbol: "R", helper: "User-entered specific gas constant; gas composition and properties are not derived.", kind: "number", unit: "J/(kg·K)" },
  ],
  bearingAdjustedLife: [
    { key: "dynamicRating", label: "Declared dynamic rating", symbol: "C", helper: "User-entered basic dynamic load rating for the stated bearing configuration.", kind: "number", unit: "kN" },
    { key: "equivalentLoad", label: "Declared equivalent load", symbol: "P", helper: "User-entered equivalent dynamic load; factor selection and load derivation are excluded.", kind: "number", unit: "kN" },
    { key: "lifeExponent", label: "Declared life exponent", symbol: "p", helper: "Use a stated matched exponent; 3 for ball or 10/3 for roller is not selected here.", kind: "number", unit: "—" },
    { key: "reliabilityFactor", label: "Declared reliability factor", symbol: "a₁", helper: "User-entered scalar from the stated governing source and reliability basis.", kind: "number", unit: "—" },
    { key: "materialFactor", label: "Declared material factor", symbol: "a₂", helper: "User-entered scalar for the stated material/process condition; no lookup is used.", kind: "number", unit: "—" },
    { key: "otherFactor", label: "Declared other-life factor", symbol: "a₃", helper: "User-entered scalar for stated operating effects; no condition is inferred.", kind: "number", unit: "—" },
    { key: "speed", label: "Declared rotating speed", symbol: "n", helper: "Constant speed used only to convert stated revolutions to operating hours.", kind: "number", unit: "rpm" },
  ],
  flywheelEnergy: [
    { key: "inertia", label: "Declared rotational inertia", symbol: "I", helper: "User-entered inertia about the stated rotation axis; geometry is not derived.", kind: "number", unit: "kg·m²" },
    { key: "initialSpeed", label: "Declared initial speed", symbol: "n₁", helper: "Initial non-negative speed magnitude for the stated rigid body.", kind: "number", unit: "rpm" },
    { key: "finalSpeed", label: "Declared final speed", symbol: "n₂", helper: "Final non-negative speed magnitude for the stated rigid body.", kind: "number", unit: "rpm" },
  ],
  frictionClutch: [
    { key: "frictionCoefficient", label: "Declared friction coefficient", symbol: "μ", helper: "User-entered interface coefficient for the stated condition; no material or condition is inferred.", kind: "number", unit: "—" },
    { key: "clampForce", label: "Declared axial clamp force", symbol: "Fa", helper: "User-entered normal clamp force on the stated friction interface.", kind: "number", unit: "N" },
    { key: "meanRadius", label: "Declared mean friction radius", symbol: "rm", helper: "User-entered effective mean friction radius; pressure distribution is excluded.", kind: "number", unit: "mm" },
    { key: "surfaceCount", label: "Declared active friction surfaces", symbol: "z", helper: "Positive integer number of active friction surfaces in the stated model.", kind: "number", unit: "surfaces" },
    { key: "torqueDemand", label: "Declared torque demand", symbol: "Td", helper: "User-entered reference torque for literal ratio arithmetic only.", kind: "number", unit: "N·m" },
  ],
  splineLoad: [
    { key: "torque", label: "Declared applied torque", symbol: "T", helper: "User-entered transmitted torque; transient and reversing loads are excluded.", kind: "number", unit: "N·m" },
    { key: "pitchDiameter", label: "Declared pitch diameter", symbol: "Dp", helper: "User-entered spline pitch diameter; standard geometry is not selected.", kind: "number", unit: "mm" },
    { key: "toothCount", label: "Declared tooth count", symbol: "z", helper: "Positive integer nominal tooth count in the stated spline connection.", kind: "number", unit: "teeth" },
    { key: "engagementLength", label: "Declared engagement length", symbol: "Le", helper: "User-entered engaged flank length per tooth.", kind: "number", unit: "mm" },
    { key: "flankHeight", label: "Declared effective flank height", symbol: "he", helper: "User-entered effective loaded flank height per tooth.", kind: "number", unit: "mm" },
    { key: "loadShare", label: "Declared effective load-share fraction", symbol: "ηshare", helper: "Visible fraction from greater than 0 through 1; contact distribution is not inferred.", kind: "number", unit: "—" },
  ],
  gearMeshForce: [
    { key: "torque", label: "Declared applied torque", symbol: "T", helper: "User-entered torque at the stated gear pitch circle; transients are excluded.", kind: "number", unit: "N·m" },
    { key: "pitchDiameter", label: "Declared operating pitch diameter", symbol: "dp", helper: "User-entered operating pitch diameter; geometry is not derived.", kind: "number", unit: "mm" },
    { key: "pressureAngle", label: "Declared transverse pressure angle", symbol: "αt", helper: "User-entered transverse working pressure angle in degrees.", kind: "number", unit: "deg" },
    { key: "helixAngle", label: "Declared helix angle", symbol: "β", helper: "User-entered helix angle in degrees; use 0 for a spur mesh.", kind: "number", unit: "deg" },
  ],
  beltTension: [
    { key: "driveTorque", label: "Declared drive torque", symbol: "T", helper: "User-entered torque transmitted at the stated pulley/sprocket pitch radius.", kind: "number", unit: "N·m" },
    { key: "pitchRadius", label: "Declared pitch radius", symbol: "rp", helper: "User-entered driving pulley or sprocket pitch radius.", kind: "number", unit: "mm" },
    { key: "looseSideTension", label: "Declared loose-side tension", symbol: "Floose", helper: "User-entered stated loose-side tension used only for the literal tight-side sum.", kind: "number", unit: "N" },
  ],
  vesselGeometry: [
    { key: "internalDiameter", label: "Declared internal diameter", symbol: "Di", helper: "User-entered inside diameter of the straight cylindrical shell.", kind: "number", unit: "mm" },
    { key: "straightLength", label: "Declared straight length", symbol: "L", helper: "User-entered cylindrical shell length between excluded heads or discontinuities.", kind: "number", unit: "mm" },
    { key: "wallThickness", label: "Declared wall thickness", symbol: "t", helper: "User-entered uniform shell thickness used only for nominal outer geometry.", kind: "number", unit: "mm" },
  ],
  threadTensileArea: [
    { key: "majorDiameter", label: "Declared basic major diameter", symbol: "D", helper: "User-entered external metric thread basic major diameter; a thread standard is not selected.", kind: "number", unit: "mm" },
    { key: "pitch", label: "Declared thread pitch", symbol: "P", helper: "User-entered thread pitch in mm; material and strength are not inferred.", kind: "number", unit: "mm" },
  ],
  couplingTorsion: [
    { key: "torque", label: "Declared transmitted torque", symbol: "T", helper: "User-entered torque at the stated coupling operating point; transient duty is excluded.", kind: "number", unit: "N·m" },
    { key: "torsionalStiffness", label: "Declared torsional stiffness", symbol: "kt", helper: "User-entered linear coupling torsional stiffness; geometry and supplier data are not inferred.", kind: "number", unit: "N·m/rad" },
  ],
  arithmeticScratchpad: [
    { key: "formulaName", label: "Formula / note name", helper: "A retained label for this saved arithmetic context; it is not parsed.", kind: "text" },
    { key: "expression", label: "Scalar expression", helper: "Allowed characters: numbers, parentheses, +, −, *, /, and ^. Variables and functions are intentionally unsupported.", kind: "text" },
    { key: "inputUnit", label: "Declared input unit", helper: "A user-entered context label for the scalar terms. This workspace does not convert or validate it.", kind: "text" },
    { key: "resultUnit", label: "Declared result unit", helper: "A user-entered display label only. This workspace does not check dimensions or convert units.", kind: "text" },
  ],
};

export const initialInputs: Record<ToolId, Record<string, string>> = {
  axial: { force: "10", area: "1000", length: "1000", modulus: "200" },
  beam: { case: "cantilever", load: "1", length: "1.2", modulus: "200", inertia: "120" },
  stability: { endCondition: "1", length: "1.5", modulus: "200", inertia: "25" },
  section: { shape: "rectangle", width: "60", height: "120", innerDiameter: "30" },
  converter: { category: "force", value: "1", from: "kN", to: "lbf" },
  triangle: { legA: "300", legB: "400" },
  coordinate: { x1: "0", y1: "0", z1: "0", x2: "300", y2: "400", z2: "120" },
  cylinder: { diameter: "100", length: "500" },
  density: { mass: "7.85", volume: "1" },
  newton: { mass: "10", acceleration: "2.5" },
  kinetic: { mass: "1000", speed: "20" },
  hydrostatic: { density: "1000", depth: "2.5" },
  continuity: { area1: "1000", velocity1: "2", area2: "400" },
  sensibleHeat: { mass: "10", specificHeat: "4.186", deltaT: "25" },
  ohm: { voltage: "24", resistance: "12" },
  fits: { holeMin: "25.000", holeMax: "25.021", shaftMin: "24.980", shaftMax: "24.993" },
  toleranceStack: { nominal: "100", t1: "0.10", t2: "0.05", t3: "0.03", t4: "0", t5: "0", t6: "0" },
  toleranceSampling: { nominal: "100", t1: "0.10", t2: "0.05", t3: "0.03", t4: "0", t5: "0", t6: "0", seed: "20260819", sampleCount: "1000" },
  taylorToolLife: { mode: "lifeFromSpeed", taylorConstant: "300", exponent: "0.25", cuttingSpeed: "150", toolLife: "16" },
  cuttingForce: { specificForce: "1800", depth: "2.5", feed: "0.20", cuttingSpeed: "180" },
  weldGroup: { lineLength: "100", centerSpacing: "80", directForce: "12000", torsionalMoment: "800" },
  position: { x: "0.003", y: "0.002", tolerance: "0.008" },
  mmc: { featureType: "hole", mmcSize: "10.0", actualSize: "10.15", positionTolerance: "0.20" },
  motionProfile: { distance: "500", accelTime: "0.25", cruiseTime: "0.50" },
  reflectedInertia: { loadInertia: "0.08", gearRatio: "5", motorInertia: "0.002" },
  pneumatic: { bore: "50", rod: "20", pressure: "6", efficiency: "85" },
  clampForce: { actuatorForce: "2.5", angle: "60", efficiency: "90" },
  torsion: { torque: "250", diameter: "35", length: "800", shearModulus: "79", rpm: "1450" },
  bearingLife: { bearingType: "ball", dynamicRating: "19.5", equivalentLoad: "4.8", rpm: "1450" },
  boltPreload: { torque: "80", diameter: "12", nutFactor: "0.20", uncertainty: "25" },
  millingMrr: { axialDepth: "4", radialWidth: "8", tableFeed: "900" },
  lmtd: { arrangement: "counter", hotIn: "80", hotOut: "60", coldIn: "20", coldOut: "45", overallCoefficient: "450", area: "4" },
  darcy: { frictionFactor: "0.020", length: "25", diameter: "50", density: "1000", velocity: "1.8" },
  thermalExpansion: { length: "1200", cte: "12", deltaT: "65" },
  thermalStress: { modulus: "200", cte: "12", deltaT: "65" },
  planeConduction: { conductivity: "0.8", area: "2.5", thickness: "120", hotTemperature: "80", coldTemperature: "20" },
  bernoulli: { density: "1000", velocity1: "1.5", elevation1: "0", velocity2: "3.0", elevation2: "0" },
  combinedStress: { axialStress: "45", bendingStress: "75", shearStress: "30" },
  thinVessel: { pressure: "1.2", diameter: "600", thickness: "12" },
  leadScrew: { axialForce: "4", lead: "10", efficiency: "82", rpm: "600" },
  airConsumption: { bore: "50", rod: "20", stroke: "250", pressure: "6", cycles: "18" },
  gearRatio: { driverTeeth: "20", drivenTeeth: "60", inputRpm: "1800", inputTorque: "18", efficiency: "92" },
  boltLoad: { diameter: "12", tension: "8", shear: "4", bearingLoad: "6", plateThickness: "8" },
  safetyMargin: { applied: "120", allowable: "250" },
  circularArc: { radius: "75", angle: "120" },
  compressionSpring: { wire: "4", meanDiameter: "32", activeCoils: "8", shearModulus: "79", deflection: "12" },
  drillingTime: { diameter: "10", rpm: "1500", feedPerRev: "0.10", depth: "35", holes: "6" },
  turningMrr: { depth: "2.5", feed: "0.25", cuttingSpeed: "180" },
  processCapability: { lsl: "9.80", usl: "10.20", mean: "10.04", sigma: "0.05" },
  extensionSpring: { initialTension: "8", rate: "1.5", extension: "20" },
  torsionSpring: { wire: "3", meanDiameter: "24", activeCoils: "8", modulus: "200", angle: "45" },
  keyway: { shaftDiameter: "40", torque: "200", width: "12", height: "8", length: "50" },
  cuttingParameters: { diameter: "100", cuttingSpeed: "125.6637", teeth: "10", chipLoad: "0.075", axialDepth: "5", radialWidth: "70", specificForce: "1800", efficiency: "80" },
  sheetMetalBend: { angle: "90", insideRadius: "2", thickness: "1.5", kFactor: "0.42", flange1: "40", flange2: "50" },
  productionMetrics: { plannedTime: "480", stopTime: "60", idealCycle: "45", totalCount: "500", goodCount: "480", demand: "600", operators: "4" },
  gageRr: { aP1t1: "10.0", aP1t2: "10.1", aP2t1: "20.0", aP2t2: "20.1", bP1t1: "10.2", bP1t2: "10.3", bP2t1: "20.2", bP2t2: "20.3" },
  gaugeBiasStudy: { referenceValue: "100.00", observedMean: "100.12", linearityReference1: "90", linearityObserved1: "90.08", linearityReference2: "100", linearityObserved2: "100.12", linearityReference3: "110", linearityObserved3: "110.18", stabilityStart: "100.10", stabilityMiddle: "100.12", stabilityEnd: "100.15" },
  controlChart: { mode: "xbarR", subgroupSize: "5", subgroupMean1: "10.0", subgroupVariation1: "1.8", subgroupMean2: "10.2", subgroupVariation2: "2.0", subgroupMean3: "9.9", subgroupVariation3: "1.7", subgroupMean4: "10.1", subgroupVariation4: "1.9", subgroupMean5: "10.0", subgroupVariation5: "1.8", individual1: "10.0", individual2: "10.2", individual3: "9.9", individual4: "10.1", individual5: "10.0" },
  measurementUncertainty: { measuredValue: "25", typeA: "0.04", calibration: "0.03", resolution: "0.02", environment: "0.01", coverageFactor: "2" },
  thermalRadiation: { area: "1.2", emissivity: "0.8", surfaceTemperature: "373.15", surroundingTemperature: "293.15" },
  shaftDesign: { torque: "100", shaftDiameter: "25", allowableShear: "40", length: "600", shearModulus: "80", youngModulus: "200", centerLoad: "500", lineMass: "0.8" },
  bearingLoad: { radialLoad: "2000", axialLoad: "800", radialFactor: "0.56", axialFactor: "1.6", targetLife: "20", lifeExponent: "3", staticRating: "18000", staticEquivalentLoad: "4500", bore: "35", speed: "1800", dnLimit: "100000", preload: "300" },
  formControl: { formType: "flatness", measuredMinimum: "-0.018", measuredMaximum: "0.026", statedTolerance: "0.05" },
  driveRatio: { driveType: "helical", driverMeasure: "20", drivenMeasure: "60", inputSpeed: "1800", inputTorque: "45", efficiency: "92", driverPitchDiameter: "80", pressureAngle: "20", helixAngle: "15" },
  motionDuty: { reflectedInertia: "0.012", startSpeed: "0", endSpeed: "1800", accelTime: "0.4", constantTorque: "1.8", runningTime: "1.2", declaredDecelTorque: "3.5", decelTime: "0.4" },
  filletWeld: { legSize: "6", weldLength: "100", weldLines: "2", directForce: "50000", allowableShear: "145", arcVoltage: "24", arcCurrent: "180", travelSpeed: "300", arcEfficiency: "80" },
  threadDesign: { majorDiameter: "10", pitch: "1.5", engagementPercent: "75", engagementLength: "12", threadsPerInch: "20", externalMajorMinimum: "0.248", internalPitchMaximum: "0.2175", allowableShear: "90", appliedAxialLoad: "4500" },
  orificeFlow: { dischargeCoefficient: "0.6", orificeDiameter: "50", pipeDiameter: "102", upstreamPressure: "100000", downstreamPressure: "80000", density: "1000" },
  dimensionCheck: { leftMass: "1", leftLength: "1", leftTime: "-2", leftCurrent: "0", leftTemperature: "0", leftAmount: "0", leftLuminous: "0", rightMass: "1", rightLength: "1", rightTime: "-2", rightCurrent: "0", rightTemperature: "0", rightAmount: "0", rightLuminous: "0" },
  shaftCombined: { bendingMoment: "450", torque: "300", diameter: "40" },
  mohrCircle: { sigmaX: "90", sigmaY: "30", tauXY: "40" },
  pressFit: { shaftDiameter: "50.025", holeDiameter: "50.000", hubOuterDiameter: "100", contactLength: "50", modulus: "200", friction: "0.15" },
  jointSeparation: { preload: "20", boltStiffness: "150", memberStiffness: "300", externalLoad: "18" },
  hydraulicCylinder: { bore: "80", rod: "45", pressure: "160", stroke: "500", flow: "30" },
  hydraulicPump: { displacement: "25", speed: "1500", pressure: "180", volumetricEfficiency: "92", overallEfficiency: "84" },
  hydraulicMotor: { displacement: "50", pressure: "160", flow: "45", mechanicalEfficiency: "88", volumetricEfficiency: "92" },
  hydraulicLine: { flow: "30", insideDiameter: "16", lineLength: "10", frictionFactor: "0.03", fluidDensity: "850", referenceVelocity: "4" },
  orientationControl: { controlType: "parallelism", minimumReading: "-0.012", maximumReading: "0.028", tolerance: "0.050" },
  profileRunout: { recordType: "circularRunout", minimumReading: "-0.018", maximumReading: "0.032", tolerance: "0.060" },
  processPerformance: { lsl: "9.80", usl: "10.20", observations: "", mean: "10.04", overallSigma: "0.06" },
  ballScrewSizing: { axialForce: "2500", lead: "10", speed: "1200", efficiency: "90" },
  rackPinion: { mass: "50", friction: "0.02", acceleration: "1.5", externalForce: "100", pinionDiameter: "80", linearSpeed: "1.2" },
  beltAxis: { mass: "30", friction: "0.02", pulleyDiameter: "60", linearSpeed: "1.5", efficiency: "92" },
  cuttingPower: { depth: "3", feed: "0.2", cuttingSpeed: "120", specificForce: "3100", efficiency: "80" },
  drillPointDepth: { diameter: "12", includedAngle: "135", fullDiameterDepth: "25" },
  toolDeflection: { lateralForce: "150", overhang: "50", coreDiameter: "12", modulus: "600" },
  fatigueConcentration: { kt: "2.2", notchSensitivity: "0.75", nominalStress: "120" },
  goodmanFatigue: { nominalAlternating: "80", nominalMean: "60", kf: "1.6", enduranceLimit: "180", ultimateStrength: "600" },
  minerDamage: { cycles1: "10000", life1: "100000", cycles2: "5000", life2: "50000", cycles3: "1000", life3: "10000" },
  planetaryGear: { sunTeeth: "24", ringTeeth: "96", planetCount: "3", inputSpeed: "1500", inputTorque: "10", efficiency: "92" },
  wormDrive: { wheelTeeth: "50", wormStarts: "1", inputSpeed: "1400", inputTorque: "5", efficiency: "70" },
  sCurveProfile: { distance: "200", topSpeed: "100", averageAcceleration: "500", jerkPercent: "50" },
  torqueSpeedDuty: { inertia: "0.002", speedChange: "1500", accelerationTime: "0.5", loadTorque: "1.2", targetSpeed: "1500", availableTorque: "2.5" },
  fixtureClamping: { machiningForce: "1800", friction: "0.19", serviceMultiplier: "2" },
  pickPlaceCycle: { outboundTime: "1.2", inboundTime: "1.1", pickDwell: "0.3", placeDwell: "0.3", auxiliaryTime: "0.2", cycles: "100" },
  payloadInertia: { eoatMass: "5", productMass: "2", cgDistance: "0.15" },
  pneumaticCycleTime: { bore: "50", rod: "20", stroke: "200", flow: "30" },
  valveCv: { cv: "1.5", specificGravity: "1", pressureDrop: "10", flow: "4.74" },
  vacuumHolding: { mass: "10", acceleration: "2", orientation: "vertical", friction: "0.5", multiplier: "1.5" },
  additiveBuild: { partVolume: "100", density: "1.24", supportFactor: "15", buildRate: "20", materialRate: "30", machineRate: "8", fixedOverhead: "5" },
  gravityMoment: { mass: "10", cgRadius: "0.3", angle: "30", counterMoment: "20" },
  pitchCircle: { pcd: "100", holeCount: "6", startAngle: "0" },
  regularPolygon: { sideCount: "6", sideLength: "20" },
  eccentricBoltGroup: { boltCount: "4", patternRadius: "100", appliedForce: "8000", eccentricity: "100", boltDiameter: "10" },
  pinStress: { appliedLoad: "12000", pinCount: "2", shearPlanes: "2", pinDiameter: "10", plateThickness: "8" },
  gearToothStress: { gearType: "spur", tangentialLoad: "1000", faceWidth: "50", module: "2", toothCount: "20", helixAngle: "0", formFactor: "0.30" },
  vacuumEvacuation: { vesselVolume: "100", effectiveSpeed: "10", startPressure: "1000", targetPressure: "100", targetTime: "20" },
  toggleForce: { inputForce: "350", halfAngle: "5" },
  wristInertia: { eoatMass: "5", eoatCentroidalInertia: "0.02", eoatOffset: "0.15", payloadMass: "2", payloadCentroidalInertia: "0.005", payloadOffset: "0.30" },
  cycleBuilder: { step1Label: "Approach", step1Duration: "1.2", step2Label: "Clamp", step2Duration: "0.8", step3Label: "Process", step3Duration: "4", step4Label: "Release", step4Duration: "1", step5Label: "Transfer", step5Duration: "2", step6Label: "Buffer", step6Duration: "0.5", cycleCount: "10" },
  pneumaticLineLoss: { actualFlow: "0.6", insideDiameter: "26.6", pipeLength: "25", frictionFactor: "0.02", density: "6.7", upstreamPressure: "600" },
  tappingTorque: { threadDiameter: "10", torqueCoefficient: "0.002", engagementFactor: "1.5", spindleSpeed: "500" },
  threadMachiningTime: { pitch: "1.5", travelLength: "30", spindleSpeed: "500", passCount: "6", reversalTime: "1.2" },
  reynoldsNumber: { density: "1000", velocity: "1.5", hydraulicDiameter: "0.02", dynamicViscosity: "0.001", referenceThreshold: "2300" },
  minorLosses: { sumK: "4.2", density: "1000", velocity: "2.5" },
  pipeSizing: { flow: "60", targetVelocity: "2" },
  buoyancyForce: { fluidDensity: "1000", displacedVolume: "12", objectMass: "10" },
  submergedPlane: { fluidDensity: "1000", width: "1.2", height: "0.8", centroidDepth: "2.5" },
  convectionHeat: { coefficient: "35", area: "1.8", deltaT: "25" },
  thermalResistance: { hotCoefficient: "80", hotArea: "1.5", wallThickness: "25", wallConductivity: "0.8", wallArea: "1.2", contactResistance: "0.02", coldCoefficient: "30", coldArea: "1.5", heatRate: "500" },
  idealGas: { pressure: "101.325", temperature: "293.15", molarMass: "28.97", volume: "1" },
  isentropicMachine: { mode: "compressor", inletTemperature: "300", inletPressure: "100", outletPressure: "500", gamma: "1.4", specificHeat: "1.005", massFlow: "0.5", efficiency: "80" },
  beamDiagram: { span: "2", pointLoad: "8", pointLocation: "0.8", uniformLoad: "2" },
  triangleTruss: { span: "3", rise: "2", apexLoad: "12" },
  hertzContact: { normalForce: "500", sphereRadius: "12", sphereModulus: "210", spherePoisson: "0.30", flatModulus: "70", flatPoisson: "0.33" },
  fractureIntensity: { geometryFactor: "1.12", tensileStress: "100", crackHalfLength: "5", toughnessReference: "50" },
  deflectionCheck: { declaredDeflection: "5", span: "2400", referenceDenominator: "360" },
  cantileverFrame: { lateralLoad: "12000", columnHeight: "3000" },
  plateBuckling: { modulus: "200", poissonRatio: "0.30", thickness: "3", referenceWidth: "250", bucklingCoefficient: "4" },
  screwCriticalSpeed: { rootDiameter: "16", unsupportedLength: "800", endFixityFactor: "1", operatingSpeed: "1200" },
  linearGuideLife: { rollingType: "ball", dynamicRating: "12000", calculatedLoad: "3000", travelRate: "12" },
  brakingDuty: { regenerationType: "normal", drivePower: "5.5", brakeTorqueMultiplier: "1.0", dcBusVoltage: "650", brakingTime: "2", cycleTime: "20" },
  ballScrewLife: { dynamicRating: "18000", axialLoad: "6000", lead: "10", speed: "1200", travelFraction: "40" },
  driveTrain: { inputSpeed: "1800", inputTorque: "12", stage1Ratio: "4", stage1Efficiency: "0.96", stage2Ratio: "3", stage2Efficiency: "0.96", stage3Ratio: "1", stage3Efficiency: "1" },
  rmsDutyTorque: { torque1: "8", duration1: "1", torque2: "3", duration2: "2", torque3: "-4", duration3: "1" },
  motorOperatingPoint: { motorClass: "servo", shaftTorque: "5", shaftSpeed: "1500", referenceTorque: "7", referencePower: "1.2" },
  gripperHold: { payloadMass: "2", verticalAcceleration: "1", frictionCoefficient: "0.2", jawCount: "2", multiplier: "2" },
  conveyorLine: { solveFor: "rate", productPitch: "250", lineSpeed: "30", requestedRate: "120" },
  robotReach: { targetX: "600", targetY: "300", targetZ: "400", referenceReach: "1000" },
  robotPayloadMoment: { payloadMass: "8", cogOffset: "250" },
  rotaryIndexing: { indexAngle: "60", moveTime: "0.5", systemInertia: "0.05" },
  pneumaticDemandBudget: { normalizedAirPerCycle: "1.2", cycleRate: "30", activeDeviceCount: "2", dutyFraction: "80", referenceSupplyFlow: "100" },
  hydraulicLossBudget: { pressureDrop: "25", flow: "60", activeTimeFraction: "40" },
  vacuumLeakageBudget: { leakagePerPoint: "2.5", activePointCount: "4", activeTimeFraction: "50", referenceSuctionFlow: "8" },
  hydraulicAccumulatorState: { prechargePressure: "90", maximumWorkingPressure: "200", minimumWorkingPressure: "120", prechargeGasVolume: "10", polytropicExponent: "1" },
  hydraulicReservoirDwell: { workingVolume: "150", returnFlow: "30", referenceDwellTime: "4" },
  darcyFrictionFactor: { mode: "swameeJain", reynoldsNumber: "100000", absoluteRoughness: "0.045", insideDiameter: "100" },
  pumpSystemHeadPoint: { staticHead: "10", quadraticLossCoefficient: "0.5", flowPoint: "4" },
  npshAvailableBudget: { surfacePressureHead: "10.33", staticSuctionHead: "-2", suctionLossHead: "0.5", vaporPressureHead: "0.3", npshRequiredReference: "3" },
  thermalRcStep: { constantPower: "20", thermalResistance: "2", thermalCapacitance: "50", ambientTemperature: "25", elapsedTime: "100" },
  manningUniformFlow: { manningRoughness: "0.03", hydraulicRadius: "1", energySlope: "0.001", flowArea: "5" },
  compressibleMassFlow: { flowArea: "0.01", totalPressure: "200000", totalTemperature: "300", machNumber: "0.5", specificHeatRatio: "1.4", gasConstant: "287" },
  machiningTimeBudget: { cuttingLength: "100", feedRate: "50", nonCutAllowance: "0.2" },
  threePhasePower: { lineVoltage: "480", lineCurrent: "30", powerFactor: "0.85" },
  sheetBendAllowance: { bendAngle: "90", insideRadius: "1", thickness: "1", kFactor: "0.5" },
  idealGasEntropyChange: { initialTemperature: "300", finalTemperature: "600", initialPressure: "100000", finalPressure: "200000", specificHeat: "1005", gasConstant: "287" },
  bearingAdjustedLife: { dynamicRating: "25", equivalentLoad: "5", lifeExponent: "3", reliabilityFactor: "1", materialFactor: "1", otherFactor: "1", speed: "1200" },
  flywheelEnergy: { inertia: "0.8", initialSpeed: "600", finalSpeed: "1800" },
  frictionClutch: { frictionCoefficient: "0.28", clampForce: "3200", meanRadius: "85", surfaceCount: "2", torqueDemand: "120" },
  splineLoad: { torque: "300", pitchDiameter: "50", toothCount: "10", engagementLength: "35", flankHeight: "3", loadShare: "0.6" },
  gearMeshForce: { torque: "100", pitchDiameter: "80", pressureAngle: "20", helixAngle: "15" },
  beltTension: { driveTorque: "120", pitchRadius: "75", looseSideTension: "350" },
  vesselGeometry: { internalDiameter: "500", straightLength: "1200", wallThickness: "8" },
  threadTensileArea: { majorDiameter: "12", pitch: "1.75" },
  couplingTorsion: { torque: "250", torsionalStiffness: "12000" },
  arithmeticScratchpad: { formulaName: "Bracket load subtotal", expression: "(1250 + 350) * 1.15", inputUnit: "N", resultUnit: "N" },
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
const fromSquareMillimetre = (value: number) => value * 1e-6;
const fromMillimetre = (value: number) => value * 1e-3;
const fromGigaPascal = (value: number) => value * 1e9;
const fromCentimetre4 = (value: number) => value * 1e-8;

const calculateAxial = (input: Record<string, string>): CalculationState => {
  const force = finite(input.force, "Axial load", false);
  const area = finite(input.area, "Cross-sectional area");
  const length = finite(input.length, "Original length");
  const modulus = finite(input.modulus, "Elastic modulus");
  const f = fromKiloNewton(force);
  const a = fromSquareMillimetre(area);
  const l = fromMillimetre(length);
  const e = fromGigaPascal(modulus);
  const stress = f / a;
  const strain = stress / e;
  const extension = strain * l;
  return {
    values: [quantity("stress", "Average normal stress", stress, stress / 1e6, "MPa"), quantity("strain", "Elastic strain", strain, strain * 1e6, "µε"), quantity("extension", "Ideal length change", extension, extension * 1000, "mm")],
    warnings: ["Average stress is a simplified measure; do not apply it at a local load introduction, notch, or connection without a suitable model."],
    errors: [],
    method: "σ = F / A · ε = σ / E · ΔL = FL / AE",
  };
};

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

const calculateTriangleTruss = (input: Record<string, string>): CalculationState => {
  const span = finite(input.span, "Support span");
  const rise = finite(input.rise, "Apex rise");
  const load = fromKiloNewton(finite(input.apexLoad, "Declared vertical apex load"));
  const halfSpan = span / 2;
  const diagonalLength = Math.hypot(halfSpan, rise);
  const sine = rise / diagonalLength;
  const cosine = halfSpan / diagonalLength;
  const supportReaction = load / 2;
  const diagonalCompression = supportReaction / sine;
  const bottomChordTension = diagonalCompression * cosine;
  return { values: [quantity("diagonalLength", "Each diagonal member length", diagonalLength, diagonalLength, "m"), quantity("leftReaction", "Left vertical support reaction", supportReaction, supportReaction / 1000, "kN"), quantity("rightReaction", "Right vertical support reaction", supportReaction, supportReaction / 1000, "kN"), quantity("diagonalCompression", "Each diagonal axial compression magnitude", diagonalCompression, diagonalCompression / 1000, "kN"), quantity("bottomChordTension", "Bottom-chord axial tension magnitude", bottomChordTension, bottomChordTension / 1000, "kN")], warnings: ["This is a symmetric three-member, pin-jointed, two-force-member equilibrium model with one vertical apex load. It excludes arbitrary truss topology, joint rigidity, member sizing, buckling, deflection, connection design, stability, code checks, and approval."], errors: [], method: "ΣFy = 0 · RA = RB = P/2 · Ndiagonal = (P/2)/sin θ · Nbottom = Ndiagonal cos θ" };
};

const calculateHertzContact = (input: Record<string, string>): CalculationState => {
  const force = finite(input.normalForce, "Declared normal force");
  const radius = fromMillimetre(finite(input.sphereRadius, "Sphere radius"));
  const sphereModulus = fromGigaPascal(finite(input.sphereModulus, "Sphere elastic modulus"));
  const flatModulus = fromGigaPascal(finite(input.flatModulus, "Flat elastic modulus"));
  const spherePoisson = finite(input.spherePoisson, "Sphere Poisson ratio", false);
  const flatPoisson = finite(input.flatPoisson, "Flat Poisson ratio", false);
  if (spherePoisson < 0 || spherePoisson >= 0.5 || flatPoisson < 0 || flatPoisson >= 0.5) throw new Error("Declared Poisson ratios must be at least 0 and less than 0.5 for this bounded model.");
  const reducedModulus = 1 / ((1 - spherePoisson ** 2) / sphereModulus + (1 - flatPoisson ** 2) / flatModulus);
  const contactRadius = ((3 * force * radius) / (4 * reducedModulus)) ** (1 / 3);
  const peakPressure = (3 * force) / (2 * Math.PI * contactRadius ** 2);
  const indentation = contactRadius ** 2 / radius;
  return { values: [quantity("reducedModulus", "Reduced elastic modulus", reducedModulus, reducedModulus / 1e9, "GPa"), quantity("contactRadius", "Contact radius", contactRadius, contactRadius * 1000, "mm"), quantity("contactDiameter", "Contact diameter", 2 * contactRadius, 2 * contactRadius * 1000, "mm"), quantity("peakPressure", "Peak Hertz pressure", peakPressure, peakPressure / 1e6, "MPa"), quantity("indentation", "Elastic approach", indentation, indentation * 1e6, "µm")], warnings: ["This is a smooth, frictionless, elastic, isotropic, homogeneous sphere-on-flat normal-contact screen. It excludes roughness, friction, plasticity, coatings, fatigue, thermal effects, surface finish, material selection, life, safety, and approval."], errors: [], method: "1/E* = (1−ν₁²)/E₁ + (1−ν₂²)/E₂ · a = [3FR/(4E*)]^(1/3) · p₀ = 3F/(2πa²)" };
};

const calculateFractureIntensity = (input: Record<string, string>): CalculationState => {
  const geometryFactor = finite(input.geometryFactor, "Declared Mode-I geometry factor");
  const tensileStress = finite(input.tensileStress, "Declared remote tensile stress");
  const crackHalfLength = finite(input.crackHalfLength, "Declared crack half-length");
  const toughnessReference = finite(input.toughnessReference, "Declared toughness reference");
  const stressIntensity = geometryFactor * tensileStress * Math.sqrt(Math.PI * crackHalfLength / 1000);
  const toughnessRatio = stressIntensity / toughnessReference;
  const arithmeticDifference = toughnessReference - stressIntensity;
  return { values: [quantity("stressIntensity", "Mode-I stress intensity", stressIntensity, stressIntensity, "MPa√m"), quantity("toughnessRatio", "Intensity / declared toughness reference", toughnessRatio, toughnessRatio, "—"), quantity("arithmeticDifference", "Declared-reference minus intensity", arithmeticDifference, arithmeticDifference, "MPa√m")], warnings: ["This is declared-geometry-factor Mode-I linear-elastic fracture-mechanics arithmetic. Stress intensity depends on detailed geometry and loading; this workspace does not infer a factor, establish LEFM applicability, determine fracture or crack growth, predict life, define inspection intervals, select a material, establish safety, or approve a design."], errors: [], method: "KI = Yσ√(πa) · ratio = KI / KIC,declared" };
};

const calculateDeflectionCheck = (input: Record<string, string>): CalculationState => {
  const declaredDeflection = finite(input.declaredDeflection, "Declared calculated deflection", false);
  const span = finite(input.span, "Declared reference span");
  const referenceDenominator = finite(input.referenceDenominator, "Declared reference denominator");
  if (declaredDeflection < 0) throw new Error("Declared calculated deflection must not be negative in this magnitude comparison.");
  const referenceDeflection = span / referenceDenominator;
  const ratio = declaredDeflection / referenceDeflection;
  const arithmeticDifference = referenceDeflection - declaredDeflection;
  return { values: [quantity("referenceDeflection", "Declared-reference deflection", referenceDeflection, referenceDeflection, "mm"), quantity("deflectionRatio", "Declared deflection / reference", ratio, ratio, "—"), quantity("arithmeticDifference", "Reference minus declared deflection", arithmeticDifference, arithmeticDifference, "mm")], warnings: ["This compares a user-entered calculated deflection to a user-entered span/reference denominator. It does not select a limit, validate the upstream deflection model, establish a serviceability requirement, judge adequacy, apply a code, or approve a design."], errors: [], method: "δreference = L / nreference · ratio = δdeclared / δreference" };
};

const calculateBearingAdjustedLife = (input: Record<string, string>): CalculationState => {
  const dynamicRating = finite(input.dynamicRating, "Declared dynamic rating");
  const equivalentLoad = finite(input.equivalentLoad, "Declared equivalent load");
  const lifeExponent = finite(input.lifeExponent, "Declared life exponent");
  const reliabilityFactor = finite(input.reliabilityFactor, "Declared reliability factor");
  const materialFactor = finite(input.materialFactor, "Declared material factor");
  const otherFactor = finite(input.otherFactor, "Declared other-life factor");
  const speed = finite(input.speed, "Declared rotating speed");
  const basicLifeMillion = (dynamicRating / equivalentLoad) ** lifeExponent;
  const combinedFactor = reliabilityFactor * materialFactor * otherFactor;
  const adjustedLifeMillion = basicLifeMillion * combinedFactor;
  const adjustedLifeHours = (adjustedLifeMillion * 1e6) / (speed * 60);
  return { values: [quantity("basicLifeMillion", "Basic rating life", basicLifeMillion, basicLifeMillion, "million rev"), quantity("combinedFactor", "Product of declared life factors", combinedFactor, combinedFactor, "—"), quantity("adjustedLifeMillion", "Declared-factor adjusted rating life", adjustedLifeMillion, adjustedLifeMillion, "million rev"), quantity("adjustedLifeHours", "Declared-factor adjusted operating life", adjustedLifeHours, adjustedLifeHours, "h")], warnings: ["This is a basic rating-life calculation with all reliability, material, and other factors supplied by the user. It is not a bearing selection, factor lookup, reliability prediction, variable-duty, misalignment, lubrication, temperature, mounting, static-adequacy, safety, or approval analysis."], errors: [], method: "L10 = (C/P)^p · Ladj = L10·a1·a2·a3 · hours = Ladj·10^6/(60n)" };
};

const calculateFlywheelEnergy = (input: Record<string, string>): CalculationState => {
  const inertia = finite(input.inertia, "Declared rotational inertia");
  const initialSpeed = finite(input.initialSpeed, "Declared initial speed", false);
  const finalSpeed = finite(input.finalSpeed, "Declared final speed", false);
  if (initialSpeed < 0 || finalSpeed < 0) throw new Error("Declared speeds must not be negative in this speed-magnitude model.");
  const initialOmega = (initialSpeed * 2 * Math.PI) / 60;
  const finalOmega = (finalSpeed * 2 * Math.PI) / 60;
  const initialEnergy = 0.5 * inertia * initialOmega ** 2;
  const finalEnergy = 0.5 * inertia * finalOmega ** 2;
  const energyChange = finalEnergy - initialEnergy;
  return { values: [quantity("initialAngularSpeed", "Initial angular speed", initialOmega, initialOmega, "rad/s"), quantity("finalAngularSpeed", "Final angular speed", finalOmega, finalOmega, "rad/s"), quantity("initialEnergy", "Initial rotational kinetic energy", initialEnergy, initialEnergy / 1000, "kJ"), quantity("finalEnergy", "Final rotational kinetic energy", finalEnergy, finalEnergy / 1000, "kJ"), quantity("energyChange", "Final minus initial energy", energyChange, energyChange / 1000, "kJ")], warnings: ["This is a rigid-body two-state rotational kinetic-energy calculation. It excludes rotating-body stress, containment, balance, overspeed, acceleration torque, transient dynamics, losses, material selection, safety, and approval."], errors: [], method: "ω = 2πn/60 · E = ½Iω² · ΔE = E2 − E1" };
};

const calculateFrictionClutch = (input: Record<string, string>): CalculationState => {
  const frictionCoefficient = finite(input.frictionCoefficient, "Declared friction coefficient");
  const clampForce = finite(input.clampForce, "Declared axial clamp force");
  const meanRadius = fromMillimetre(finite(input.meanRadius, "Declared mean friction radius"));
  const surfaceCount = finite(input.surfaceCount, "Declared active friction surfaces");
  const torqueDemand = finite(input.torqueDemand, "Declared torque demand");
  if (!Number.isInteger(surfaceCount)) throw new Error("Declared active friction surfaces must be a whole number.");
  const frictionTorque = surfaceCount * frictionCoefficient * clampForce * meanRadius;
  const demandRatio = frictionTorque / torqueDemand;
  const arithmeticDifference = frictionTorque - torqueDemand;
  return { values: [quantity("frictionTorque", "Declared friction-interface torque", frictionTorque, frictionTorque, "N·m"), quantity("demandRatio", "Friction torque / declared demand", demandRatio, demandRatio, "—"), quantity("arithmeticDifference", "Friction torque minus declared demand", arithmeticDifference, arithmeticDifference, "N·m")], warnings: ["This is a stated uniform-friction torque relation for a user-defined clutch or brake interface. It excludes temperature, energy absorption, wear, pressure distribution, actuation, engagement dynamics, material selection, capacity, safety, and approval."], errors: [], method: "Tfriction = z·μ·Fa·rm · ratio = Tfriction / Tdeclared" };
};

const calculateSplineLoad = (input: Record<string, string>): CalculationState => {
  const torque = finite(input.torque, "Declared applied torque");
  const pitchDiameter = finite(input.pitchDiameter, "Declared pitch diameter");
  const toothCount = finite(input.toothCount, "Declared tooth count");
  const engagementLength = finite(input.engagementLength, "Declared engagement length");
  const flankHeight = finite(input.flankHeight, "Declared effective flank height");
  const loadShare = finite(input.loadShare, "Declared effective load-share fraction");
  if (!Number.isInteger(toothCount)) throw new Error("Declared tooth count must be a whole number.");
  if (loadShare > 1) throw new Error("Declared effective load-share fraction must not exceed 1.");
  const tangentialForce = (2 * torque * 1000) / pitchDiameter;
  const effectiveToothCount = toothCount * loadShare;
  const forcePerEffectiveTooth = tangentialForce / effectiveToothCount;
  const flankArea = engagementLength * flankHeight;
  const nominalFlankPressure = forcePerEffectiveTooth / flankArea;
  return { values: [quantity("tangentialForce", "Tangential torque force", tangentialForce, tangentialForce, "N"), quantity("effectiveToothCount", "Declared effective loaded teeth", effectiveToothCount, effectiveToothCount, "teeth"), quantity("forcePerEffectiveTooth", "Force per declared effective tooth", forcePerEffectiveTooth, forcePerEffectiveTooth, "N"), quantity("nominalFlankPressure", "Nominal effective-tooth flank pressure", nominalFlankPressure, nominalFlankPressure, "MPa")], warnings: ["This is declared spline geometry and load-share arithmetic only. It excludes standards, tooth form, fit, root stress, fatigue, wear, misalignment, contact distribution, capacity, safety, and approval."], errors: [], method: "Ft = 2T/Dp · zeffective = z·ηshare · Ftooth = Ft/zeffective · pnominal = Ftooth/(Le·he)" };
};

const calculateGearMeshForce = (input: Record<string, string>): CalculationState => {
  const torque = finite(input.torque, "Declared applied torque");
  const pitchDiameter = finite(input.pitchDiameter, "Declared operating pitch diameter");
  const pressureAngle = finite(input.pressureAngle, "Declared transverse pressure angle", false);
  const helixAngle = finite(input.helixAngle, "Declared helix angle", false);
  if (pressureAngle < 0 || pressureAngle >= 90) throw new Error("Declared transverse pressure angle must be from 0 through less than 90 degrees.");
  if (helixAngle < 0 || helixAngle >= 90) throw new Error("Declared helix angle must be from 0 through less than 90 degrees.");
  const tangentialForce = (2 * torque * 1000) / pitchDiameter;
  const radialForce = tangentialForce * Math.tan((pressureAngle * Math.PI) / 180);
  const axialForce = tangentialForce * Math.tan((helixAngle * Math.PI) / 180);
  const resultantForce = Math.sqrt(tangentialForce ** 2 + radialForce ** 2 + axialForce ** 2);
  return { values: [quantity("tangentialForce", "Pitch-line tangential force", tangentialForce, tangentialForce, "N"), quantity("radialForce", "Declared-angle radial force", radialForce, radialForce, "N"), quantity("axialForce", "Declared-angle axial force", axialForce, axialForce, "N"), quantity("resultantForce", "Resultant mesh force", resultantForce, resultantForce, "N")], warnings: ["This is a static pitch-circle force decomposition for a user-defined parallel-axis spur or helical mesh. It excludes tooth geometry, mesh stiffness, shaft/bearing support, backlash, lubrication, vibration, tooth strength, durability, safety, and approval."], errors: [], method: "Ft = 2T/dp · Fr = Ft·tan(αt) · Fa = Ft·tan(β) · FN = √(Ft² + Fr² + Fa²)" };
};

const calculateBeltTension = (input: Record<string, string>): CalculationState => {
  const driveTorque = finite(input.driveTorque, "Declared drive torque");
  const pitchRadius = fromMillimetre(finite(input.pitchRadius, "Declared pitch radius"));
  const looseSideTension = finite(input.looseSideTension, "Declared loose-side tension", false);
  if (looseSideTension < 0) throw new Error("Declared loose-side tension must not be negative in this scalar span model.");
  const drivingTension = driveTorque / pitchRadius;
  const tightSideTension = drivingTension + looseSideTension;
  return { values: [quantity("drivingTension", "Torque-induced driving tension difference", drivingTension, drivingTension, "N"), quantity("declaredLooseSide", "Declared loose-side tension", looseSideTension, looseSideTension, "N"), quantity("tightSideTension", "Declared tight-side tension sum", tightSideTension, tightSideTension, "N")], warnings: ["This is a torque-to-driving-tension difference and stated loose-side sum only. It excludes pretension selection, wrap, friction, slip, fatigue, speed capability, bearing loading, belt/chain selection, safety, and approval."], errors: [], method: "ΔF = T/rp · Ftight = ΔF + Floose,declared" };
};

const calculateVesselGeometry = (input: Record<string, string>): CalculationState => {
  const internalDiameter = finite(input.internalDiameter, "Declared internal diameter");
  const straightLength = finite(input.straightLength, "Declared straight length");
  const wallThickness = finite(input.wallThickness, "Declared wall thickness");
  const internalRadius = internalDiameter / 2;
  const outerRadius = internalRadius + wallThickness;
  const internalVolume = Math.PI * internalRadius ** 2 * straightLength;
  const internalWettedArea = Math.PI * internalDiameter * straightLength;
  const shellVolume = Math.PI * (outerRadius ** 2 - internalRadius ** 2) * straightLength;
  return { values: [quantity("internalVolume", "Straight-cylinder internal volume", internalVolume / 1e9, internalVolume / 1e6, "L"), quantity("internalWettedArea", "Straight-cylinder internal wetted area", internalWettedArea / 1e6, internalWettedArea / 1e6, "m²"), quantity("shellVolume", "Nominal straight-shell material volume", shellVolume / 1e9, shellVolume / 1e6, "L")], warnings: ["This is straight cylindrical shell geometry only. It excludes heads, nozzles, discontinuities, membrane or local stress, pressure rating, corrosion allowance, external pressure, code compliance, safety, and approval."], errors: [], method: "Vi = π(Di/2)²L · Ai = πDiL · Vshell = π[(Di/2+t)² − (Di/2)²]L" };
};

const calculateThreadTensileArea = (input: Record<string, string>): CalculationState => {
  const majorDiameter = finite(input.majorDiameter, "Declared basic major diameter");
  const pitch = finite(input.pitch, "Declared thread pitch");
  const effectiveDiameter = majorDiameter - 0.938194 * pitch;
  if (effectiveDiameter <= 0) throw new Error("Declared major diameter and pitch must yield a positive tensile-area diameter.");
  const tensileArea = 0.7854 * effectiveDiameter ** 2;
  return { values: [quantity("effectiveDiameter", "Empirical tensile-area diameter", effectiveDiameter, effectiveDiameter, "mm"), quantity("tensileArea", "External thread tensile stress area", tensileArea, tensileArea, "mm²")], warnings: ["This is an empirical external metric-thread tensile-area relation from user-entered basic major diameter and pitch. It does not select a thread standard, determine material strength, preload, fatigue, stripping, tightening torque, acceptance, safety, or approval."], errors: [], method: "At = 0.7854(D − 0.938194P)²" };
};

const calculateCouplingTorsion = (input: Record<string, string>): CalculationState => {
  const torque = finite(input.torque, "Declared transmitted torque");
  const torsionalStiffness = finite(input.torsionalStiffness, "Declared torsional stiffness");
  const twistRad = torque / torsionalStiffness;
  const twistDeg = twistRad * 180 / Math.PI;
  const storedEnergy = torque ** 2 / (2 * torsionalStiffness);
  return { values: [quantity("twistRad", "Declared elastic twist", twistRad, twistRad, "rad"), quantity("twistDeg", "Declared elastic twist", twistDeg, twistDeg, "deg"), quantity("storedEnergy", "Linear elastic stored energy", storedEnergy, storedEnergy, "J")], warnings: ["This is declared linear torsional stiffness arithmetic for a coupling. It excludes coupling selection, torque capacity, flexible-element geometry, fatigue, resonance, damping, misalignment, shaft/bearing loads, safety, and approval."], errors: [], method: "θ = T/kt · U = T²/(2kt)" };
};

const calculateStability = (input: Record<string, string>): CalculationState => {
  const k = finite(input.endCondition, "Effective-length factor");
  const length = finite(input.length, "Unsupported length");
  const modulus = fromGigaPascal(finite(input.modulus, "Elastic modulus"));
  const inertia = fromCentimetre4(finite(input.inertia, "Least second moment"));
  const effectiveLength = k * length;
  const criticalLoad = (Math.PI ** 2 * modulus * inertia) / effectiveLength ** 2;
  return {
    values: [quantity("effectiveLength", "Effective length", effectiveLength, effectiveLength * 1000, "mm"), quantity("criticalLoad", "Ideal elastic critical load", criticalLoad, criticalLoad / 1000, "kN")],
    warnings: ["This is an ideal elastic stability estimate. It excludes imperfections, residual stress, eccentricity, inelastic behavior, connection restraint, and code-required resistance checks."],
    errors: [],
    method: "Pcr = π²EI / (KL)²",
  };
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

const calculateCoordinate = (input: Record<string, string>): CalculationState => {
  const x1 = finite(input.x1, "Point A x", false); const y1 = finite(input.y1, "Point A y", false); const z1 = finite(input.z1, "Point A z", false);
  const x2 = finite(input.x2, "Point B x", false); const y2 = finite(input.y2, "Point B y", false); const z2 = finite(input.z2, "Point B z", false);
  const dx = x2 - x1; const dy = y2 - y1; const dz = z2 - z1; const span = Math.hypot(dx, dy, dz);
  return {
    values: [quantity("dx", "x displacement", dx, dx, "mm"), quantity("dy", "y displacement", dy, dy, "mm"), quantity("dz", "z displacement", dz, dz, "mm"), quantity("span", "Straight-line span", span, span, "mm")],
    warnings: ["Coordinates must share one origin, axis convention, and unit. The result is a straight-line geometric span, not a routed path or a tolerance analysis."],
    errors: [],
    method: "d = √[(x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²]",
  };
};

const calculateCylinder = (input: Record<string, string>): CalculationState => {
  const diameter = finite(input.diameter, "Diameter"); const length = finite(input.length, "Cylinder length"); const radius = diameter / 2;
  const endArea = Math.PI * radius ** 2; const volume = endArea * length; const lateralArea = Math.PI * diameter * length;
  return {
    values: [quantity("volume", "Cylinder volume", volume, volume / 1e6, "L"), quantity("endArea", "End area", endArea, endArea, "mm²"), quantity("lateralArea", "Lateral surface", lateralArea, lateralArea, "mm²"), quantity("totalSurface", "Total outer surface", lateralArea + 2 * endArea, lateralArea + 2 * endArea, "mm²")],
    warnings: ["This is nominal closed-cylinder geometry. Wall thickness, end shape, internal fittings, deformation, and manufacturing tolerances are outside the model."],
    errors: [],
    method: "V = π(D/2)²L · Aend = π(D/2)² · Alateral = πDL",
  };
};

const calculateDensity = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Mass"); const volumeLitres = finite(input.volume, "Volume"); const volume = volumeLitres * 1e-3; const density = mass / volume;
  return {
    values: [quantity("density", "Average density", density, density, "kg/m³"), quantity("specificVolume", "Specific volume", 1 / density, 1 / density, "m³/kg"), quantity("specificGravity", "Specific gravity vs. water", density, density / 1000, "—")],
    warnings: ["Average density is derived only from the mass and volume entered here. It is not a condition-specific material-property lookup and should not be used as one."],
    errors: [],
    method: "ρ = m / V · v = 1 / ρ",
  };
};

const calculateNewton = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Mass"); const acceleration = finite(input.acceleration, "Acceleration", false); const force = mass * acceleration;
  return {
    values: [quantity("force", "Net force", force, force, "N"), quantity("forceKilo", "Net force", force, force / 1000, "kN"), quantity("accelerationG", "Acceleration magnitude", Math.abs(acceleration) / 9.80665, Math.abs(acceleration) / 9.80665, "g")],
    warnings: ["This is a net-force relationship in a stated inertial-frame context. It does not resolve individual loads, friction, gravity components, constraints, or a free-body diagram."],
    errors: [],
    method: "Fnet = ma",
  };
};

const calculateKinetic = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Mass"); const speed = finite(input.speed, "Speed", false); const energy = 0.5 * mass * speed ** 2; const momentum = mass * speed;
  return {
    values: [quantity("energy", "Kinetic energy", energy, energy / 1000, "kJ"), quantity("energyJ", "Kinetic energy", energy, energy, "J"), quantity("momentum", "Momentum magnitude", momentum, momentum, "kg·m/s")],
    warnings: ["This is the classical translational relationship. It excludes rotational energy, deformation, drag, gradients, and relativistic behavior."],
    errors: [],
    method: "KE = ½mv² · p = mv",
  };
};

const calculateHydrostatic = (input: Record<string, string>): CalculationState => {
  const density = finite(input.density, "Liquid density"); const depth = finite(input.depth, "Vertical depth"); const pressure = density * 9.80665 * depth;
  return {
    values: [quantity("pressure", "Gauge pressure", pressure, pressure / 1000, "kPa"), quantity("pressureBar", "Gauge pressure", pressure, pressure / 1e5, "bar"), quantity("head", "Pressure head", depth, depth, "m liquid")],
    warnings: ["This is the static hydrostatic relation for a uniform-density liquid. It excludes flow, gas compression, temperature-dependent density, vessel loads, and any pressure-rating or design decision."],
    errors: [],
    method: "pg = ρgh",
  };
};

const calculateContinuity = (input: Record<string, string>): CalculationState => {
  const area1 = finite(input.area1, "First flow area") * 1e-6; const velocity1 = finite(input.velocity1, "First mean velocity"); const area2 = finite(input.area2, "Second flow area") * 1e-6;
  const flow = area1 * velocity1; const velocity2 = flow / area2;
  return {
    values: [quantity("flow", "Volumetric flow rate", flow, flow * 1000, "L/s"), quantity("velocity2", "Second mean velocity", velocity2, velocity2, "m/s"), quantity("areaRatio", "Area ratio A₁/A₂", area1 / area2, area1 / area2, "—")],
    warnings: ["This is continuity for steady incompressible flow using mean section velocities. It does not calculate pressure change, loss, turbulence, cavitation, pipe sizing, or pump performance."],
    errors: [],
    method: "Q = A₁v₁ = A₂v₂",
  };
};

const calculateSensibleHeat = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Mass"); const specificHeat = finite(input.specificHeat, "Specific heat"); const deltaT = finite(input.deltaT, "Temperature change", false); const heat = mass * specificHeat * deltaT;
  return {
    values: [quantity("heat", "Heat transfer", heat * 1000, heat, "kJ"), quantity("heatJ", "Heat transfer", heat * 1000, heat * 1000, "J"), quantity("specificEnergy", "Energy per unit mass", specificHeat * deltaT, specificHeat * deltaT, "kJ/kg")],
    warnings: ["The specific heat is user-entered. This approximation requires no phase change and excludes heat loss, temperature-dependent properties, mixing, reaction, and work by/on the system."],
    errors: [],
    method: "Q = mcΔT",
  };
};

const calculateOhm = (input: Record<string, string>): CalculationState => {
  const voltage = finite(input.voltage, "Applied voltage", false); const resistance = finite(input.resistance, "Resistance"); const current = voltage / resistance; const power = voltage * current;
  return {
    values: [quantity("current", "Circuit current", current, current, "A"), quantity("power", "Resistor power", power, power, "W"), quantity("powerMilli", "Resistor power", power, power * 1000, "mW")],
    warnings: ["This is one ideal DC resistor with constant resistance. It does not size wire, protection, a power source, thermal management, or any electrical installation, and it excludes AC, transients, and nonlinear components."],
    errors: [],
    method: "V = IR · P = VI = V²/R",
  };
};

const calculateFits = (input: Record<string, string>): CalculationState => {
  const holeMin = finite(input.holeMin, "Hole minimum", false); const holeMax = finite(input.holeMax, "Hole maximum", false); const shaftMin = finite(input.shaftMin, "Shaft minimum", false); const shaftMax = finite(input.shaftMax, "Shaft maximum", false);
  if (holeMax < holeMin || shaftMax < shaftMin) throw new Error("Each maximum limit must be greater than or equal to its minimum limit.");
  const minimumClearance = holeMin - shaftMax; const maximumClearance = holeMax - shaftMin;
  const classification = minimumClearance > 0 ? "Clearance fit" : maximumClearance < 0 ? "Interference fit" : "Transition fit";
  return { values: [quantity("minimumClearance", "Minimum clearance (+) / interference (−)", minimumClearance, minimumClearance, "mm"), quantity("maximumClearance", "Maximum clearance (+) / interference (−)", maximumClearance, maximumClearance, "mm"), quantity("holeTolerance", "Hole tolerance width", holeMax - holeMin, holeMax - holeMin, "mm"), quantity("shaftTolerance", "Shaft tolerance width", shaftMax - shaftMin, shaftMax - shaftMin, "mm")], warnings: [`${classification}. This workspace uses only stated size limits; form, position, texture, thermal growth, loading, and assembly method are excluded.`], errors: [], method: "Cmin = Hmin − Smax · Cmax = Hmax − Smin" };
};

const calculateToleranceStack = (input: Record<string, string>): CalculationState => {
  const nominal = finite(input.nominal, "Nominal chain result", false); const t1 = finite(input.t1, "Contributor 1 tolerance"); const t2 = finite(input.t2, "Contributor 2 tolerance"); const t3 = finite(input.t3, "Contributor 3 tolerance"); const t4 = finite(input.t4 ?? "0", "Contributor 4 tolerance", false); const t5 = finite(input.t5 ?? "0", "Contributor 5 tolerance", false); const t6 = finite(input.t6 ?? "0", "Contributor 6 tolerance", false);
  const terms = [t1, t2, t3, t4, t5, t6]; if (terms.some((term) => term < 0)) throw new Error("Tolerance contributor magnitudes must not be negative."); const worstCase = terms.reduce((sum, term) => sum + Math.abs(term), 0); const rss = Math.hypot(...terms);
  return { values: [quantity("worstCase", "Worst-case stack tolerance", worstCase, worstCase, "mm"), quantity("rss", "RSS stack tolerance", rss, rss, "mm"), quantity("worstMin", "Worst-case lower result", nominal - worstCase, nominal - worstCase, "mm"), quantity("worstMax", "Worst-case upper result", nominal + worstCase, nominal + worstCase, "mm")], warnings: ["RSS is a statistical combination only when contributors are independent and the stated distribution assumption is justified. This is a linear one-dimensional stack, not a complete GD&T or assembly analysis; it makes no compliance, yield, or tolerance-recommendation claim."], errors: [], method: "TWC = Σ|tᵢ| · TRSS = √(Σtᵢ²), up to six visible contributors" };
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

const calculateCuttingForce = (input: Record<string, string>): CalculationState => {
  const specificForce = finite(input.specificForce, "Declared specific cutting force");
  const depth = finite(input.depth, "Depth of cut");
  const feed = finite(input.feed, "Feed per revolution");
  const cuttingSpeed = finite(input.cuttingSpeed, "Declared cutting speed");
  const uncutChipArea = depth * feed;
  const cuttingForce = specificForce * uncutChipArea;
  const idealPower = cuttingForce * cuttingSpeed / 60_000;
  return { values: [quantity("uncutChipArea", "Declared uncut-chip area", uncutChipArea, uncutChipArea, "mm²"), quantity("cuttingForce", "Tangential cutting force", cuttingForce, cuttingForce, "N"), quantity("idealPower", "Ideal cutting power", idealPower, idealPower, "kW"), quantity("forcePerDepth", "Force per declared depth", cuttingForce / depth, cuttingForce / depth, "N/mm")], warnings: ["This uses user-entered specific cutting force and a simplified rectangular uncut-chip area. It does not select a process, tool, material, coefficient, speed, feed, coolant, machine, or efficiency; model chip thinning, engagement, dynamics, chatter, wear, temperature, workholding, or safety; or approve machining."], errors: [], method: "Ac = ap·f · Fc = kc·Ac · Pideal = Fc·Vc/60,000" };
};

const calculateWeldGroup = (input: Record<string, string>): CalculationState => {
  const lineLength = finite(input.lineLength, "Length of each line weld");
  const centerSpacing = finite(input.centerSpacing, "Center spacing between lines");
  const directForce = finite(input.directForce, "Declared in-plane direct force", false);
  const torsionalMoment = finite(input.torsionalMoment, "Declared torsional moment", false) * 1000;
  if (directForce < 0 || torsionalMoment < 0) throw new Error("Declared in-plane direct force and torsional moment magnitudes must not be negative.");
  const totalLineLength = 2 * lineLength;
  const unitPolarMoment = lineLength * centerSpacing ** 2 / 2 + lineLength ** 3 / 6;
  const endpointRadius = Math.hypot(centerSpacing / 2, lineLength / 2);
  const directLineLoad = directForce / totalLineLength;
  const torsionalEndpointLineLoad = torsionalMoment * endpointRadius / unitPolarMoment;
  const quadratureLineLoad = Math.hypot(directLineLoad, torsionalEndpointLineLoad);
  return { values: [quantity("totalLineLength", "Total effective line length", totalLineLength, totalLineLength, "mm"), quantity("unitPolarMoment", "Unit-throat polar line property", unitPolarMoment, unitPolarMoment, "mm³"), quantity("endpointRadius", "Farthest endpoint radius", endpointRadius, endpointRadius, "mm"), quantity("directLineLoad", "Direct shear line load", directLineLoad, directLineLoad, "N/mm"), quantity("torsionalEndpointLineLoad", "Endpoint torsional line load", torsionalEndpointLineLoad, torsionalEndpointLineLoad, "N/mm"), quantity("quadratureLineLoad", "Quadrature line-load magnitude", quadratureLineLoad, quadratureLineLoad, "N/mm")], warnings: ["This is a two-equal-parallel-line, unit-throat preliminary weld-group model. The displayed quadrature magnitude is not a maximum vector resultant or code check. It does not model arbitrary weld geometry, throat/leg sizing, directional loading, vector addition at endpoints, eccentric force geometry, bending, fatigue, residual stress, distortion, heat input, weld procedure/quality, code provisions, capacity, safety, or approval."], errors: [], method: "Ltotal = 2L · Ju = Lb²/2 + L³/6 · qdirect = F/Ltotal · qtorsion,end = M·rmax/Ju" };
};

const calculatePosition = (input: Record<string, string>): CalculationState => {
  const x = finite(input.x, "Measured X offset", false); const y = finite(input.y, "Measured Y offset", false); const tolerance = finite(input.tolerance, "Stated position tolerance"); const radialOffset = Math.hypot(x, y); const diametricalDeviation = 2 * radialOffset; const remaining = tolerance - diametricalDeviation;
  return { values: [quantity("diametricalDeviation", "Diametrical position deviation", diametricalDeviation, diametricalDeviation, "mm"), quantity("radialOffset", "Radial center offset", radialOffset, radialOffset, "mm"), quantity("remainingMargin", "Remaining tolerance margin", remaining, remaining, "mm")], warnings: [remaining >= 0 ? "The calculated two-dimensional deviation is within the entered tolerance. Confirm datum establishment, feature size, orientation, depth, and inspection method separately." : "The calculated two-dimensional deviation exceeds the entered tolerance. Check measurement, datum frame, tolerance callout, and feature condition before drawing a conclusion."], errors: [], method: "⌀ deviation = 2√(Δx² + Δy²)" };
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

const calculateReflectedInertia = (input: Record<string, string>): CalculationState => {
  const load = finite(input.loadInertia, "Load inertia"); const ratio = finite(input.gearRatio, "Reduction ratio"); const motor = finite(input.motorInertia, "Motor inertia"); const reflected = load / ratio ** 2; const total = reflected + motor;
  return { values: [quantity("reflected", "Reflected load inertia", reflected, reflected, "kg·m²"), quantity("inertiaRatio", "Reflected-to-motor inertia ratio", reflected / motor, reflected / motor, "—"), quantity("total", "Motor-side total inertia", total, total, "kg·m²")], warnings: ["This reflects one rigid load through one ideal ratio. It excludes gearbox inertia, efficiency, backlash, compliance, duty cycle, peak torque, motor control behavior, and any motor-selection decision."], errors: [], method: "Jref = JL / N² · Jtotal = JM + Jref" };
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

const calculateTorsion = (input: Record<string, string>): CalculationState => {
  const torque = finite(input.torque, "Applied torque") ; const diameter = finite(input.diameter, "Shaft diameter") / 1000; const length = finite(input.length, "Shaft length") / 1000; const shearModulus = finite(input.shearModulus, "Shear modulus") * 1e9; const rpm = finite(input.rpm, "Rotational speed", false);
  const polarMoment = Math.PI * diameter ** 4 / 32; const radius = diameter / 2; const shearStress = torque * radius / polarMoment; const twist = torque * length / (shearModulus * polarMoment); const power = torque * (2 * Math.PI * rpm / 60);
  return { values: [quantity("shearStress", "Maximum torsional shear stress", shearStress, shearStress / 1e6, "MPa"), quantity("twistDeg", "Elastic angle of twist", twist, twist * 180 / Math.PI, "°"), quantity("power", "Transmitted mechanical power", power, power / 1000, "kW"), quantity("polarMoment", "Polar second moment", polarMoment, polarMoment * 1e12, "mm⁴")], warnings: ["This is a uniform solid circular elastic shaft under steady torque. It excludes stress concentration, combined bending, fatigue, keyways, bearings, critical speed, torsional vibration, material strength limits, and code or safety-factor decisions."], errors: [], method: "J = πD⁴/32 · τmax = Tc/J · φ = TL/GJ · P = Tω" };
};

const calculateBearingLife = (input: Record<string, string>): CalculationState => {
  const dynamicRating = finite(input.dynamicRating, "Dynamic rating"); const equivalentLoad = finite(input.equivalentLoad, "Equivalent load"); const rpm = finite(input.rpm, "Rotational speed"); const exponent = input.bearingType === "roller" ? 10 / 3 : 3; const millionRevolutions = (dynamicRating / equivalentLoad) ** exponent; const hours = millionRevolutions * 1e6 / (rpm * 60);
  return { values: [quantity("millionRevolutions", "Basic L10 life", millionRevolutions, millionRevolutions, "million rev"), quantity("hours", "Basic L10 life", hours, hours, "h"), quantity("loadRatio", "Dynamic-rating to equivalent-load ratio", dynamicRating / equivalentLoad, dynamicRating / equivalentLoad, "—")], warnings: ["This is a baseline statistical L10 rating-life screen for one entered equivalent load and constant speed. It excludes load-spectrum effects, lubrication, contamination, temperature, misalignment, shock, reliability adjustment, mounting, and manufacturer-specific life factors."], errors: [], method: input.bearingType === "roller" ? "L10 = (C/P)^(10/3) · hours = L10·10⁶/(60n)" : "L10 = (C/P)³ · hours = L10·10⁶/(60n)" };
};

const calculateBoltPreload = (input: Record<string, string>): CalculationState => {
  const torque = finite(input.torque, "Applied torque"); const diameter = finite(input.diameter, "Nominal diameter") / 1000; const nutFactor = finite(input.nutFactor, "Torque coefficient"); const uncertainty = finite(input.uncertainty, "Preload uncertainty") / 100;
  if (uncertainty > 1) throw new Error("Preload uncertainty must not exceed 100 percent.");
  const preload = torque / (nutFactor * diameter); const lower = preload * (1 - uncertainty); const upper = preload * (1 + uncertainty);
  return { values: [quantity("preload", "Nominal preload", preload, preload / 1000, "kN"), quantity("lower", "Estimated lower preload", lower, lower / 1000, "kN"), quantity("upper", "Estimated upper preload", upper, upper / 1000, "kN")], warnings: ["Torque is an indirect and friction-sensitive way to create preload. This screen does not determine allowable preload, bolt proof/yield, thread strength, joint stiffness, separation, fatigue, thermal effects, relaxation, lubrication procedure, or a safe tightening specification."], errors: [], method: "P = T / (K·D) · uncertainty band = P(1 ± u)" };
};

const calculateMillingMrr = (input: Record<string, string>): CalculationState => {
  const axialDepth = finite(input.axialDepth, "Axial depth"); const radialWidth = finite(input.radialWidth, "Radial engagement"); const tableFeed = finite(input.tableFeed, "Table feed"); const rate = axialDepth * radialWidth * tableFeed / 1000;
  return { values: [quantity("rate", "Theoretical material removal rate", rate, rate, "cm³/min"), quantity("hourly", "Theoretical hourly removed volume", rate, rate * 60, "cm³/h"), quantity("chipArea", "Engaged chip cross-section", axialDepth * radialWidth, axialDepth * radialWidth, "mm²")], warnings: ["This is theoretical rectangular-engagement volume. It does not choose feeds or speeds and excludes material machinability, spindle power/torque, tool geometry, chip thinning, tool life, runout, workholding, vibration, coolant, machine limits, and process qualification."], errors: [], method: "MRR = ap·ae·Vf / 1,000" };
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

const calculateDarcy = (input: Record<string, string>): CalculationState => {
  const factor = finite(input.frictionFactor, "Darcy friction factor"); const length = finite(input.length, "Pipe length"); const diameter = finite(input.diameter, "Hydraulic diameter") / 1000; const density = finite(input.density, "Fluid density"); const velocity = finite(input.velocity, "Mean velocity"); const pressureLoss = factor * (length / diameter) * (density * velocity ** 2 / 2); const headLoss = pressureLoss / (density * 9.80665);
  return { values: [quantity("pressureLoss", "Major friction pressure loss", pressureLoss, pressureLoss / 1000, "kPa"), quantity("headLoss", "Head loss in flowing fluid", headLoss, headLoss, "m"), quantity("dynamicPressure", "Dynamic pressure", density * velocity ** 2 / 2, density * velocity ** 2 / 2, "Pa")], warnings: ["This is Darcy–Weisbach major loss with a user-entered Darcy factor. It excludes fittings and minor losses, elevation, pumps, compressibility, entrance/development effects, non-Newtonian behavior, transient flow, pressure rating, and any pipe-size decision."], errors: [], method: "Δp = f(L/D)(ρv²/2) · hL = Δp/(ρg)" };
};

const calculateThermalExpansion = (input: Record<string, string>): CalculationState => {
  const length = finite(input.length, "Initial length");
  const cte = finite(input.cte, "Linear expansion coefficient") * 1e-6;
  const deltaT = finite(input.deltaT, "Temperature change", false);
  const strain = cte * deltaT;
  const extension = strain * length;
  return { values: [quantity("extension", "Ideal free length change", extension, extension, "mm"), quantity("finalLength", "Ideal final length", length + extension, length + extension, "mm"), quantity("thermalStrain", "Free thermal strain", strain, strain * 1e6, "µε")], warnings: ["This is ideal free linear expansion using a user-entered average CTE. It excludes restraint, temperature gradients, anisotropy, phase change, joints, nonlinear material response, property variation, and thermal-stress or design decisions."], errors: [], method: "ΔL = αL₀ΔT · εth = αΔT" };
};

const calculateThermalStress = (input: Record<string, string>): CalculationState => {
  const modulus = fromGigaPascal(finite(input.modulus, "Elastic modulus"));
  const cte = finite(input.cte, "Linear expansion coefficient") * 1e-6;
  const deltaT = finite(input.deltaT, "Temperature change", false);
  const strain = cte * deltaT;
  const stress = modulus * strain;
  return { values: [quantity("thermalStress", "Ideal restrained thermal stress", stress, stress / 1e6, "MPa"), quantity("freeStrain", "Suppressed free thermal strain", strain, strain * 1e6, "µε"), quantity("stressMagnitude", "Stress magnitude", Math.abs(stress), Math.abs(stress) / 1e6, "MPa")], warnings: ["This represents a uniform, fully restrained, linear-elastic axial member. It is not an allowable-stress, strength, fatigue, support-stiffness, thermal-gradient, creep, joint, or code-compliance calculation."], errors: [], method: "σth = EαΔT" };
};

const calculatePlaneConduction = (input: Record<string, string>): CalculationState => {
  const conductivity = finite(input.conductivity, "Thermal conductivity");
  const area = finite(input.area, "Heat-flow area");
  const thickness = finite(input.thickness, "Wall thickness") / 1000;
  const hot = finite(input.hotTemperature, "Hot-side surface", false);
  const cold = finite(input.coldTemperature, "Cold-side surface", false);
  const deltaT = hot - cold;
  const resistance = thickness / (conductivity * area);
  const rate = deltaT / resistance;
  return { values: [quantity("heatRate", "Conductive heat rate hot → cold", rate, rate, "W"), quantity("resistance", "Plane-wall thermal resistance", resistance, resistance, "K/W"), quantity("heatFlux", "Heat flux hot → cold", rate / area, rate / area, "W/m²")], warnings: ["This is steady, one-dimensional plane-wall conduction using one user-entered conductivity. It excludes contact resistance, convection, radiation, thermal bridges, multilayer interfaces, temperature-dependent properties, phase change, transient response, and insulation selection."], errors: [], method: "Q̇ = kA(Th − Tc)/L · Rth = L/(kA)" };
};

const calculateBernoulli = (input: Record<string, string>): CalculationState => {
  const density = finite(input.density, "Fluid density");
  const velocity1 = finite(input.velocity1, "Station 1 velocity");
  const elevation1 = finite(input.elevation1, "Station 1 elevation", false);
  const velocity2 = finite(input.velocity2, "Station 2 velocity");
  const elevation2 = finite(input.elevation2, "Station 2 elevation", false);
  const pressureChange = density * ((velocity1 ** 2 - velocity2 ** 2) / 2 + 9.80665 * (elevation1 - elevation2));
  const headChange = pressureChange / (density * 9.80665);
  return { values: [quantity("pressureChange", "Ideal pressure change p₂ − p₁", pressureChange, pressureChange / 1000, "kPa"), quantity("headChange", "Pressure-head change", headChange, headChange, "m liquid"), quantity("velocityHeadChange", "Velocity-head change", (velocity1 ** 2 - velocity2 ** 2) / (2 * 9.80665), (velocity1 ** 2 - velocity2 ** 2) / (2 * 9.80665), "m")], warnings: ["This is Bernoulli’s ideal steady, incompressible, frictionless streamline relationship with no pump, turbine, or loss term. It excludes real pipe loss, fittings, separation, compressibility, cavitation, transient flow, and pressure-rating or equipment-selection decisions."], errors: [], method: "p₁ + ½ρv₁² + ρgz₁ = p₂ + ½ρv₂² + ρgz₂" };
};

const calculateCombinedStress = (input: Record<string, string>): CalculationState => {
  const axial = finite(input.axialStress, "Axial normal stress", false);
  const bending = finite(input.bendingStress, "Bending normal stress", false);
  const shear = finite(input.shearStress, "In-plane shear stress", false);
  const normal = axial + bending;
  const radius = Math.hypot(normal / 2, shear);
  const principal1 = normal / 2 + radius;
  const principal2 = normal / 2 - radius;
  const vonMises = Math.sqrt(normal ** 2 + 3 * shear ** 2);
  return { values: [quantity("normalStress", "Combined normal stress σx", normal, normal, "MPa"), quantity("principal1", "First principal stress σ₁", principal1, principal1, "MPa"), quantity("principal2", "Second principal stress σ₂", principal2, principal2, "MPa"), quantity("maxShear", "Maximum in-plane shear", radius, radius, "MPa"), quantity("vonMises", "Plane-stress von Mises equivalent", vonMises, vonMises, "MPa")], warnings: ["This screen adds user-entered axial and bending normal stresses and combines them with one in-plane shear stress under plane stress. It excludes local stress concentration, multiaxial/through-thickness stress, material allowables, fatigue, buckling, contact, and safety-factor decisions."], errors: [], method: "σx = σa + σb · σ₁,₂ = σx/2 ± √[(σx/2)² + τxy²] · σvm = √(σx² + 3τxy²)" };
};

const calculateThinVessel = (input: Record<string, string>): CalculationState => {
  const pressure = finite(input.pressure, "Internal gauge pressure") * 1e6;
  const diameter = finite(input.diameter, "Inside diameter") / 1000;
  const thickness = finite(input.thickness, "Wall thickness") / 1000;
  const ratio = diameter / thickness;
  if (thickness / diameter > 0.1) throw new Error("This thin-wall screen requires wall thickness to be no greater than one tenth of the inside diameter.");
  const hoop = pressure * diameter / (2 * thickness);
  const longitudinal = pressure * diameter / (4 * thickness);
  return { values: [quantity("hoop", "Ideal hoop membrane stress", hoop, hoop / 1e6, "MPa"), quantity("longitudinal", "Ideal longitudinal membrane stress", longitudinal, longitudinal / 1e6, "MPa"), quantity("diameterThickness", "Inside diameter-to-thickness ratio", ratio, ratio, "—")], warnings: ["This is a closed cylindrical thin-shell membrane-stress relationship. It excludes thick-wall behavior, discontinuities, heads, nozzles, welds, external pressure, fatigue, corrosion allowance, material allowables, code requirements, relief sizing, and pressure-vessel certification."], errors: [], method: "σhoop = pD/(2t) · σlong = pD/(4t), closed thin cylinder" };
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

const calculateGearRatio = (input: Record<string, string>): CalculationState => {
  const driver = finite(input.driverTeeth, "Driver teeth");
  const driven = finite(input.drivenTeeth, "Driven teeth");
  const inputRpm = finite(input.inputRpm, "Input speed");
  const inputTorque = finite(input.inputTorque, "Input torque");
  const efficiency = finite(input.efficiency, "Transmission efficiency") / 100;
  if (efficiency > 1) throw new Error("Transmission efficiency must not exceed 100 percent.");
  const ratio = driven / driver;
  const outputRpm = inputRpm / ratio;
  const outputTorque = inputTorque * ratio * efficiency;
  const inputPower = inputTorque * (2 * Math.PI * inputRpm / 60);
  return { values: [quantity("ratio", "Speed reduction ratio", ratio, ratio, ":1"), quantity("outputRpm", "Ideal output speed", outputRpm, outputRpm, "rpm"), quantity("outputTorque", "Efficiency-adjusted output torque", outputTorque, outputTorque, "N·m"), quantity("inputPower", "Input mechanical power", inputPower, inputPower / 1000, "kW")], warnings: ["This screen covers one ideal external gear pair with a user-entered efficiency. It excludes tooth geometry, mesh force, strength, backlash, lubrication, shaft/bearing load, thermal behavior, vibration, noise, duty cycle, and gearbox or component selection."], errors: [], method: "i = z₂/z₁ · n₂ = n₁/i · T₂ = T₁iη" };
};

const calculateBoltLoad = (input: Record<string, string>): CalculationState => {
  const diameter = finite(input.diameter, "Bolt shank diameter") / 1000;
  const tension = finite(input.tension, "Known tensile load", false) * 1000;
  const shear = finite(input.shear, "Known shear load", false) * 1000;
  const bearingLoad = finite(input.bearingLoad, "Known bearing load", false) * 1000;
  const plateThickness = finite(input.plateThickness, "Bearing thickness") / 1000;
  const shankArea = Math.PI * diameter ** 2 / 4;
  const tensileStress = tension / shankArea;
  const shearStress = shear / shankArea;
  const bearingStress = bearingLoad / (diameter * plateThickness);
  const equivalent = Math.sqrt(tensileStress ** 2 + 3 * shearStress ** 2);
  return { values: [quantity("tensileStress", "Nominal shank tensile stress", tensileStress, tensileStress / 1e6, "MPa"), quantity("shearStress", "Nominal shank shear stress", shearStress, shearStress / 1e6, "MPa"), quantity("bearingStress", "Projected bearing stress", bearingStress, bearingStress / 1e6, "MPa"), quantity("equivalentStress", "Plane-stress equivalent", equivalent, equivalent / 1e6, "MPa")], warnings: ["This is a single-bolt, known-direct-load screen using nominal shank and projected bearing areas. It excludes threads/tensile-stress area, preload, joint stiffness, load distribution, eccentricity, friction, slip, prying, washer geometry, proof/yield allowables, fatigue, tear-out, thread stripping, and factor-of-safety conclusions."], errors: [], method: "σ = Ft/(πd²/4) · τ = Fs/(πd²/4) · σbearing = Fb/(dt)" };
};

const calculateSafetyMargin = (input: Record<string, string>): CalculationState => {
  const applied = finite(input.applied, "Applied stress magnitude");
  const allowable = finite(input.allowable, "Allowable stress");
  const factor = allowable / applied;
  return { values: [quantity("factor", "Allowable-to-applied factor", factor, factor, "—"), quantity("margin", "Margin of safety", factor - 1, factor - 1, "—"), quantity("utilization", "Utilization", applied / allowable, applied / allowable * 100, "%")], warnings: ["This is arithmetic on two user-entered like-for-like stress magnitudes. It does not establish an allowable, determine a governing load case, apply a design code, account for uncertainty or fatigue, or determine whether the resulting margin is acceptable."], errors: [], method: "Factor = σallow/σapp · margin = factor − 1 · utilization = σapp/σallow" };
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
  const cuttingSpeed = Math.PI * diameter * rpm / 1000;
  const feedRate = feedPerRev * rpm;
  const timeMinutes = depth * holes / feedRate;
  return { values: [quantity("cuttingSpeed", "Peripheral cutting speed", cuttingSpeed, cuttingSpeed, "m/min"), quantity("feedRate", "Spindle feed rate", feedRate, feedRate, "mm/min"), quantity("timeMinutes", "Nominal cutting time", timeMinutes, timeMinutes * 60, "s"), quantity("distance", "Total programmed cutting depth", depth * holes, depth * holes, "mm")], warnings: ["This is reference machining arithmetic for constant-speed, constant-feed drilling. It excludes approach, breakthrough, retract, peck cycles, tool wear, material and coolant effects, machine acceleration, fixturing, chip evacuation, spindle limits, power, quality, and process qualification."], errors: [], method: "vc = πDcn/1000 · vf = frn · Tc = ld·i/(frn)" };
};

const calculateTurningMrr = (input: Record<string, string>): CalculationState => {
  const depth = finite(input.depth, "Radial depth of cut");
  const feed = finite(input.feed, "Feed per revolution");
  const cuttingSpeed = finite(input.cuttingSpeed, "Cutting speed");
  const rate = depth * feed * cuttingSpeed;
  return { values: [quantity("rate", "Theoretical turning removal rate", rate, rate, "cm³/min"), quantity("hourly", "Theoretical hourly removed volume", rate * 60, rate * 60, "cm³/h"), quantity("chipSection", "Nominal chip cross-section", depth * feed, depth * feed, "mm²")], warnings: ["This is theoretical steady turning removal rate from user-entered depth, feed, and cutting speed. It excludes parameter selection, diameter variation, approach/retract, interruptions, insert geometry, tool wear, coolant, power, rigidity, chip control, machine limits, tolerance, surface integrity, and process qualification."], errors: [], method: "MRR = ap·f·Vc" };
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

const calculateExtensionSpring = (input: Record<string, string>): CalculationState => {
  const initialTension = finite(input.initialTension, "Initial tension", false);
  const rate = finite(input.rate, "Spring rate");
  const extension = finite(input.extension, "Extension", false);
  const elasticForce = rate * extension;
  const force = initialTension + elasticForce;
  return { values: [quantity("force", "Total extension-spring force", force, force, "N"), quantity("elasticForce", "Rate contribution", elasticForce, elasticForce, "N"), quantity("rate", "Declared spring rate", rate, rate, "N/mm")], warnings: ["This applies F = Fi + kx using user-entered rate and initial tension. It excludes hook geometry, pretension manufacture, coil contact, nonlinear travel, travel stops, fatigue, corrosion, material condition, dynamic response, and manufacturer load or life limits."], errors: [], method: "F = Fi + kx" };
};

const calculateTorsionSpring = (input: Record<string, string>): CalculationState => {
  const wire = finite(input.wire, "Wire diameter");
  const meanDiameter = finite(input.meanDiameter, "Mean coil diameter");
  const activeCoils = finite(input.activeCoils, "Active coils");
  const modulus = finite(input.modulus, "Elastic modulus");
  const angle = finite(input.angle, "Angular deflection", false);
  if (meanDiameter <= wire) throw new Error("Mean coil diameter must be larger than wire diameter.");
  const rate = (modulus * 1000 * wire ** 4) / (10.8 * meanDiameter * activeCoils);
  const moment = rate * angle;
  const bendingStress = (32 * Math.abs(moment)) / (Math.PI * wire ** 3);
  return { values: [quantity("rate", "Ideal angular spring rate", rate, rate, "N·mm/deg"), quantity("moment", "Applied spring moment", moment, moment, "N·mm"), quantity("stress", "Nominal wire bending stress", bendingStress, bendingStress, "MPa"), quantity("index", "Spring index", meanDiameter / wire, meanDiameter / wire, "—")], warnings: ["This is an elementary round-wire torsion-spring screen using stated modulus, geometry, and angle. It excludes leg geometry, coil contact, set, stress correction factors, fatigue, material heat treatment, residual stress, winding direction, coil clearance, tolerances, mounting, and design approval."], errors: [], method: "kθ = E·d⁴/(10.8·D·n) · M = kθ·θ · σnom = 32M/(πd³)" };
};

const calculateKeyway = (input: Record<string, string>): CalculationState => {
  const shaftDiameter = finite(input.shaftDiameter, "Shaft diameter") / 1000;
  const torque = finite(input.torque, "Transferred torque");
  const width = finite(input.width, "Key width") / 1000;
  const height = finite(input.height, "Key height") / 1000;
  const length = finite(input.length, "Engagement length") / 1000;
  if (width >= shaftDiameter) throw new Error("Key width must be smaller than shaft diameter.");
  const tangentialForce = 2 * torque / shaftDiameter;
  const shearStress = tangentialForce / (width * length);
  const bearingStress = tangentialForce / ((height / 2) * length);
  return { values: [quantity("tangentialForce", "Shaft tangential force", tangentialForce, tangentialForce, "N"), quantity("shearStress", "Nominal key shear stress", shearStress, shearStress / 1e6, "MPa"), quantity("bearingStress", "Nominal key bearing stress", bearingStress, bearingStress / 1e6, "MPa")], warnings: ["This is a single rectangular-key, steady-torque direct-stress screen. It excludes key/keyway standards selection, root stress concentration, shaft weakening, fit clearance, hub deformation, multiple keys, load sharing, assembly, fatigue, material allowables, lubrication, transients, and design approval."], errors: [], method: "Ft = 2T/D · τkey = Ft/(wL) · σbearing = Ft/[(h/2)L]" };
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

const calculateSheetMetalBend = (input: Record<string, string>): CalculationState => {
  const angle = finite(input.angle, "Bend angle");
  const insideRadius = finite(input.insideRadius, "Inside bend radius", false);
  const thickness = finite(input.thickness, "Material thickness");
  const kFactor = finite(input.kFactor, "K-factor", false);
  const flange1 = finite(input.flange1, "First flange length", false);
  const flange2 = finite(input.flange2, "Second flange length", false);
  if (angle >= 180) throw new Error("Bend angle must be less than 180 degrees.");
  if (kFactor < 0 || kFactor > 1) throw new Error("K-factor must be between 0 and 1.");
  const radians = angle * Math.PI / 180;
  const bendAllowance = radians * (insideRadius + kFactor * thickness);
  const outsideSetback = Math.tan(radians / 2) * (insideRadius + thickness);
  const bendDeduction = 2 * outsideSetback - bendAllowance;
  const flatLength = flange1 + flange2 - bendDeduction;
  return { values: [quantity("bendAllowance", "Bend allowance", bendAllowance, bendAllowance, "mm"), quantity("outsideSetback", "Outside setback", outsideSetback, outsideSetback, "mm"), quantity("bendDeduction", "Bend deduction", bendDeduction, bendDeduction, "mm"), quantity("flatLength", "One-bend flat-length estimate", flatLength, flatLength, "mm")], warnings: ["This is nominal one-bend K-factor arithmetic with user-entered inputs. It excludes K-factor selection, bend-radius rules, springback, tooling, grain direction, forming method, material condition, tolerances, bend relief, multi-bend sequencing, collision, and manufacturing qualification."], errors: [], method: "BA = (π/180)B(IR + K·MT) · OSSB = tan(B/2)(IR + MT) · BD = 2OSSB − BA · Flat = L₁ + L₂ − BD" };
};

const calculateProductionMetrics = (input: Record<string, string>): CalculationState => {
  const plannedTime = finite(input.plannedTime, "Planned production time");
  const stopTime = finite(input.stopTime, "Stop time", false);
  const idealCycle = finite(input.idealCycle, "Ideal cycle time");
  const totalCount = finite(input.totalCount, "Total count");
  const goodCount = finite(input.goodCount, "Good first-pass count", false);
  const demand = finite(input.demand, "Demand in window");
  const operators = finite(input.operators, "Assigned operators");
  if (stopTime >= plannedTime) throw new Error("Stop time must be smaller than planned production time.");
  if (goodCount > totalCount) throw new Error("Good first-pass count cannot exceed total count.");
  const runTime = plannedTime - stopTime;
  const availability = runTime / plannedTime;
  const performance = idealCycle * totalCount / (runTime * 60);
  if (performance > 1) throw new Error("Ideal cycle time produces performance greater than 100 percent; verify the stated inputs.");
  const quality = goodCount / totalCount;
  const oee = availability * performance * quality;
  const takt = plannedTime * 60 / demand;
  const throughput = totalCount / runTime;
  const capacity = plannedTime * 60 / idealCycle;
  const laborContent = operators * plannedTime / goodCount;
  return { values: [quantity("takt", "Takt time", takt, takt, "s/unit"), quantity("runTime", "Run time", runTime, runTime, "min"), quantity("throughput", "Actual throughput", throughput, throughput, "units/min"), quantity("capacity", "Ideal-window capacity", capacity, capacity, "units"), quantity("availability", "Availability", availability, availability * 100, "%"), quantity("performance", "Performance", performance, performance * 100, "%"), quantity("quality", "First-pass quality", quality, quality * 100, "%"), quantity("oee", "Overall equipment effectiveness", oee, oee * 100, "%"), quantity("laborContent", "Labor content per good unit", laborContent, laborContent, "labor-min/unit"), quantity("utilization", "Machine utilization", availability, availability * 100, "%")], warnings: ["This reports arithmetic from user-entered production records and uses the declared ideal cycle time. It does not validate downtime event classification, count integrity, rework policy, demand forecasting, labor allocation, targets, bottleneck behavior, shift calendars, routing, or a productivity conclusion."], errors: [], method: "Run = PPT−ST · A = Run/PPT · P = ICT·N/Run · Q = G/N · OEE = A·P·Q · takt = PPT/D" };
};

const calculateGageRr = (input: Record<string, string>): CalculationState => {
  const aP1t1 = finite(input.aP1t1, "Operator A Part 1 Trial 1", false);
  const aP1t2 = finite(input.aP1t2, "Operator A Part 1 Trial 2", false);
  const aP2t1 = finite(input.aP2t1, "Operator A Part 2 Trial 1", false);
  const aP2t2 = finite(input.aP2t2, "Operator A Part 2 Trial 2", false);
  const bP1t1 = finite(input.bP1t1, "Operator B Part 1 Trial 1", false);
  const bP1t2 = finite(input.bP1t2, "Operator B Part 1 Trial 2", false);
  const bP2t1 = finite(input.bP2t1, "Operator B Part 2 Trial 1", false);
  const bP2t2 = finite(input.bP2t2, "Operator B Part 2 Trial 2", false);
  const observations = [aP1t1, aP1t2, aP2t1, aP2t2, bP1t1, bP1t2, bP2t1, bP2t2];
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const grand = mean(observations);
  const partMeans = [mean([aP1t1, aP1t2, bP1t1, bP1t2]), mean([aP2t1, aP2t2, bP2t1, bP2t2])];
  const operatorMeans = [mean([aP1t1, aP1t2, aP2t1, aP2t2]), mean([bP1t1, bP1t2, bP2t1, bP2t2])];
  const cells = [[aP1t1, aP1t2], [aP2t1, aP2t2], [bP1t1, bP1t2], [bP2t1, bP2t2]];
  const cellMeans = cells.map(mean);
  const ssPart = 4 * partMeans.reduce((sum, value) => sum + (value - grand) ** 2, 0);
  const ssOperator = 4 * operatorMeans.reduce((sum, value) => sum + (value - grand) ** 2, 0);
  const ssRepeat = cells.reduce((sum, cell, index) => sum + cell.reduce((cellSum, value) => cellSum + (value - cellMeans[index]!) ** 2, 0), 0);
  const ssTotal = observations.reduce((sum, value) => sum + (value - grand) ** 2, 0);
  const ssInteraction = Math.max(0, ssTotal - ssPart - ssOperator - ssRepeat);
  const msPart = ssPart;
  const msOperator = ssOperator;
  const msInteraction = ssInteraction;
  const msRepeat = ssRepeat / 4;
  const repeatabilityVariance = msRepeat;
  const interactionVariance = Math.max((msInteraction - msRepeat) / 2, 0);
  const operatorVariance = Math.max((msOperator - msInteraction) / 4, 0);
  const partVariance = Math.max((msPart - msInteraction) / 4, 0);
  const gageRrVariance = repeatabilityVariance + interactionVariance + operatorVariance;
  const totalVariance = gageRrVariance + partVariance;
  const gageRrShare = totalVariance > 0 ? gageRrVariance / totalVariance : 0;
  return { values: [quantity("repeatabilityVariance", "Repeatability variance component", repeatabilityVariance, repeatabilityVariance, "unit²"), quantity("operatorVariance", "Operator variance component", operatorVariance, operatorVariance, "unit²"), quantity("interactionVariance", "Part × operator variance component", interactionVariance, interactionVariance, "unit²"), quantity("partVariance", "Part-to-part variance component", partVariance, partVariance, "unit²"), quantity("gageRrVariance", "Total Gage R&R variance", gageRrVariance, gageRrVariance, "unit²"), quantity("gageRrShare", "Gage R&R share of observed study variance", gageRrShare, gageRrShare * 100, "%"), quantity("repeatabilitySd", "Repeatability standard deviation", Math.sqrt(repeatabilityVariance), Math.sqrt(repeatabilityVariance), "unit")], warnings: ["This is a fixed balanced crossed 2-operator × 2-part × 2-trial ANOVA screen with non-negative component estimates. It does not support other study designs, test significance, assess normality, establish stability, assess bias/linearity/resolution, calculate uncertainty, classify Gage R&R adequacy, or approve a measurement system."], errors: [], method: "Crossed ANOVA: SSPart, SSOperator, SSPart×Operator, SSRepeatability · VarRepeat = MSRepeat · VarOperator = max[(MSOperator−MSInteraction)/(a·n),0]" };
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
  if (means.length !== variations.length) throw new Error("Subgroup means and variations must have the same number of entered summaries.");
  const grandMean = means.reduce((sum, value) => sum + value, 0) / means.length;
  const averageVariation = variations.reduce((sum, value) => sum + value, 0) / variations.length;
  const isRange = mode === "xbarR";
  const xFactor = isRange ? constants.a2 : constants.a3;
  const variationLowerFactor = isRange ? constants.d3 : constants.b3;
  const variationUpperFactor = isRange ? constants.d4 : constants.b4;
  const variationLabel = isRange ? "Range" : "Standard-deviation";
  return { values: [quantity("subgroupCount", "Subgroup summaries entered", means.length, means.length, "subgroups"), quantity("grandMean", "X-bar chart center line", grandMean, grandMean, "unit"), quantity("xbarUcl", "X-bar chart upper limit", grandMean + xFactor * averageVariation, grandMean + xFactor * averageVariation, "unit"), quantity("xbarLcl", "X-bar chart lower limit", grandMean - xFactor * averageVariation, grandMean - xFactor * averageVariation, "unit"), quantity("variationCenter", `${variationLabel} chart center line`, averageVariation, averageVariation, "unit"), quantity("variationUcl", `${variationLabel} chart upper limit`, variationUpperFactor * averageVariation, variationUpperFactor * averageVariation, "unit"), quantity("variationLcl", `${variationLabel} chart lower limit`, variationLowerFactor * averageVariation, variationLowerFactor * averageVariation, "unit")], warnings: ["This reports conventional X-bar/R or X-bar/S limit arithmetic from user-entered subgroup summaries. It does not recreate subgroup observations, test normality, independence, rational subgrouping, data integrity, special-cause signals, trends, rules, capability, process control, process acceptance, or a control decision."], errors: [], method: isRange ? "X-bar limits = x̄̄ ± A2·R̄ · R limits = D3/D4·R̄" : "X-bar limits = x̄̄ ± A3·s̄ · s limits = B3/B4·s̄" };
};

const calculateMeasurementUncertainty = (input: Record<string, string>): CalculationState => {
  const measuredValue = finite(input.measuredValue, "Measured value", false);
  const typeA = finite(input.typeA, "Type A standard component", false);
  const calibration = finite(input.calibration, "Calibration standard component", false);
  const resolution = finite(input.resolution, "Resolution standard component", false);
  const environment = finite(input.environment, "Environmental standard component", false);
  const coverageFactor = finite(input.coverageFactor, "Coverage factor");
  const combinedStandard = Math.sqrt(typeA ** 2 + calibration ** 2 + resolution ** 2 + environment ** 2);
  const expanded = coverageFactor * combinedStandard;
  const relativeExpanded = measuredValue === 0 ? null : expanded / Math.abs(measuredValue);
  return { values: [quantity("combinedStandard", "Combined standard uncertainty", combinedStandard, combinedStandard, "unit"), quantity("expanded", "Expanded uncertainty", expanded, expanded, "unit"), ...(relativeExpanded === null ? [] : [quantity("relativeExpanded", "Relative expanded uncertainty", relativeExpanded, relativeExpanded * 100, "%")])], warnings: ["This is root-sum-square arithmetic for user-entered independent standard uncertainty components in compatible units. It does not select distributions, convert stated intervals to standard uncertainties, evaluate correlations or sensitivity coefficients, determine degrees of freedom, choose a coverage factor, assert coverage probability, or certify a result."], errors: [], method: "uc = √(uA² + uCal² + uRes² + uEnv²) · U = k·uc" };
};

const calculateThermalRadiation = (input: Record<string, string>): CalculationState => {
  const area = finite(input.area, "Radiating area");
  const emissivity = finite(input.emissivity, "Surface emissivity", false);
  const surfaceTemperature = finite(input.surfaceTemperature, "Surface temperature");
  const surroundingTemperature = finite(input.surroundingTemperature, "Surroundings temperature");
  if (emissivity < 0 || emissivity > 1) throw new Error("Surface emissivity must be from 0 through 1.");
  const sigma = 5.670374419e-8;
  const heatFlux = emissivity * sigma * (surfaceTemperature ** 4 - surroundingTemperature ** 4);
  const netRadiation = heatFlux * area;
  const emittedPower = emissivity * sigma * surfaceTemperature ** 4 * area;
  return { values: [quantity("netRadiation", "Net radiation from surface", netRadiation, netRadiation, "W"), quantity("heatFlux", "Net radiative heat flux", heatFlux, heatFlux, "W/m²"), quantity("emittedPower", "Surface emitted radiation", emittedPower, emittedPower, "W")], warnings: ["This is gray-surface Stefan–Boltzmann exchange to large isothermal surroundings using user-entered emissivity and absolute temperatures. It excludes finite-surface view factors, enclosure geometry, spectral and directional behavior, participating gases/flames, reflections, solar load, convection, conduction, insulation, and transient temperature response."], errors: [], method: "qnet = εσA(Ts⁴ − Tsur⁴) · q''net = εσ(Ts⁴ − Tsur⁴)" };
};

const calculateShaftDesign = (input: Record<string, string>): CalculationState => {
  const torque = finite(input.torque, "Applied torque");
  const shaftDiameter = finite(input.shaftDiameter, "Existing shaft diameter");
  const allowableShear = finite(input.allowableShear, "Allowable shear stress");
  const length = finite(input.length, "Support span / torsion length");
  const shearModulus = finite(input.shearModulus, "Shear modulus");
  const youngModulus = finite(input.youngModulus, "Young’s modulus");
  const centerLoad = finite(input.centerLoad, "Central transverse load", false);
  const lineMass = finite(input.lineMass, "Uniform shaft line mass");
  const torqueNmm = torque * 1000;
  const minimumDiameter = Math.cbrt(16 * torqueNmm / (Math.PI * allowableShear));
  const torsionalStress = 16 * torqueNmm / (Math.PI * shaftDiameter ** 3);
  const polarMoment = Math.PI * shaftDiameter ** 4 / 32;
  const twistRadians = torqueNmm * length / (shearModulus * 1000 * polarMoment);
  const areaMoment = Math.PI * shaftDiameter ** 4 / 64;
  const centralDeflection = centerLoad * length ** 3 / (48 * youngModulus * 1000 * areaMoment);
  const lengthM = length / 1000;
  const areaMomentM4 = areaMoment * 1e-12;
  const criticalOmega = Math.PI / lengthM ** 2 * Math.sqrt(youngModulus * 1e9 * areaMomentM4 / lineMass);
  const criticalRpm = criticalOmega * 60 / (2 * Math.PI);
  return { values: [quantity("minimumDiameter", "Minimum torsion-only diameter", minimumDiameter, minimumDiameter, "mm"), quantity("torsionalStress", "Torsional shear stress", torsionalStress, torsionalStress, "MPa"), quantity("twist", "Torsional twist", twistRadians, twistRadians * 180 / Math.PI, "deg"), quantity("centralDeflection", "Central-load deflection", centralDeflection, centralDeflection, "mm"), quantity("criticalRpm", "First-mode critical-speed estimate", criticalRpm, criticalRpm, "rpm")], warnings: ["This is a solid circular shaft screen: torsion-only allowable sizing, Saint-Venant twist, a simply-supported single central-load deflection, and a uniform simply-supported first-mode speed estimate. It excludes combined fatigue, stress concentrations, keyway effects, bearing/support flexibility, damping, unbalance, couplings, attached disks, distributed auxiliary masses, thermal effects, buckling, alignment, and rotor-dynamics validation."], errors: [], method: "dmin = ∛(16T/πτallow) · τ = 16T/(πd³) · θ = TL/(GJ) · δcenter = FL³/(48EI) · ω₁ = (π/L²)√(EI/m′)" };
};

const calculateBearingLoad = (input: Record<string, string>): CalculationState => {
  const radialLoad = finite(input.radialLoad, "Radial load", false);
  const axialLoad = finite(input.axialLoad, "Axial load", false);
  const radialFactor = finite(input.radialFactor, "Radial factor", false);
  const axialFactor = finite(input.axialFactor, "Axial factor", false);
  const targetLife = finite(input.targetLife, "Target basic rating life");
  const lifeExponent = finite(input.lifeExponent, "Life exponent");
  const staticRating = finite(input.staticRating, "Static load rating");
  const staticEquivalentLoad = finite(input.staticEquivalentLoad, "Static equivalent load");
  const bore = finite(input.bore, "Bearing bore");
  const speed = finite(input.speed, "Rotational speed");
  const dnLimit = finite(input.dnLimit, "User-stated DN limit");
  const preload = finite(input.preload, "Declared axial preload", false);
  const equivalentLoad = radialFactor * radialLoad + axialFactor * axialLoad;
  if (equivalentLoad <= 0) throw new Error("The user-entered factors and loads must produce a positive equivalent dynamic load.");
  const requiredDynamicRating = equivalentLoad * targetLife ** (1 / lifeExponent);
  const staticRatio = staticRating / staticEquivalentLoad;
  const dn = bore * speed;
  const dnRatio = dn / dnLimit;
  const preloadRatio = preload / equivalentLoad;
  return { values: [quantity("equivalentLoad", "Equivalent dynamic load", equivalentLoad, equivalentLoad, "N"), quantity("requiredDynamicRating", "Required basic dynamic rating", requiredDynamicRating, requiredDynamicRating, "N"), quantity("staticRatio", "Static rating ratio C0/P0", staticRatio, staticRatio, "—"), quantity("dn", "DN value", dn, dn, "mm·rpm"), quantity("dnRatio", "DN / user-stated limit", dnRatio, dnRatio * 100, "%"), quantity("preloadRatio", "Preload / equivalent-load ratio", preloadRatio, preloadRatio * 100, "%")], warnings: ["This is constant-load basic rating arithmetic using user-entered bearing-specific X/Y factors, exponent, static load, and DN limit. It does not select a bearing, provide factor or limit values, model variable duty, use a modified-life method, assess lubricant/contamination/temperature, determine preload or stiffness, assess static adequacy, or replace a bearing manufacturer calculation."], errors: [], method: "P = XFr + YFa · Creq = P·L10^(1/p) · static ratio = C0/P0 · DN = d·n" };
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

const calculateMotionDuty = (input: Record<string, string>): CalculationState => {
  const reflectedInertia = finite(input.reflectedInertia, "Total reflected inertia");
  const startSpeed = finite(input.startSpeed, "Start speed", false);
  const endSpeed = finite(input.endSpeed, "End speed", false);
  const accelTime = finite(input.accelTime, "Speed-change time");
  const constantTorque = finite(input.constantTorque, "Declared running torque", false);
  const runningTime = finite(input.runningTime, "Running segment time", false);
  const declaredDecelTorque = finite(input.declaredDecelTorque, "Declared deceleration torque", false);
  const decelTime = finite(input.decelTime, "Deceleration segment time", false);
  const omegaStart = startSpeed * 2 * Math.PI / 60;
  const omegaEnd = endSpeed * 2 * Math.PI / 60;
  const angularAcceleration = (omegaEnd - omegaStart) / accelTime;
  const inertiaTorque = reflectedInertia * angularAcceleration;
  const totalCycleTime = accelTime + runningTime + decelTime;
  const rmsTorque = Math.sqrt((inertiaTorque ** 2 * accelTime + constantTorque ** 2 * runningTime + declaredDecelTorque ** 2 * decelTime) / totalCycleTime);
  const recoverableKineticEnergyUpperBound = Math.max(0, 0.5 * reflectedInertia * (omegaStart ** 2 - omegaEnd ** 2));
  return { values: [quantity("angularAcceleration", "Angular acceleration", angularAcceleration, angularAcceleration, "rad/s²"), quantity("inertiaTorque", "Inertia acceleration torque", inertiaTorque, inertiaTorque, "N·m"), quantity("totalCycleTime", "Declared total cycle time", totalCycleTime, totalCycleTime, "s"), quantity("rmsTorque", "Declared-duty RMS torque", rmsTorque, rmsTorque, "N·m"), quantity("recoverableKineticEnergyUpperBound", "Kinetic energy released if decelerating", recoverableKineticEnergyUpperBound, recoverableKineticEnergyUpperBound, "J")], warnings: ["This is declared-duty arithmetic: inertia acceleration torque from user-entered reflected inertia and speed change; RMS torque from three user-entered constant-torque segments; and a kinetic-energy upper bound only when the stated interval decelerates. It does not infer friction, gravity, cutting/process load, reflected inertia, motor capability, drive current, thermal limits, braking hardware, bus capacity, power regeneration, safety category, or motion-profile suitability."], errors: [], method: "α = (ω1−ω0)/tacc · Tacc = Jα · Trms = √(ΣTᵢ²tᵢ/Σtᵢ) · Ereleased = ½J(ω0²−ω1²)" };
};

const calculateFilletWeld = (input: Record<string, string>): CalculationState => {
  const legSize = finite(input.legSize, "Equal fillet leg size");
  const weldLength = finite(input.weldLength, "Effective weld length");
  const weldLines = finite(input.weldLines, "Number of weld lines");
  const directForce = finite(input.directForce, "Direct applied force", false);
  const allowableShear = finite(input.allowableShear, "User-stated allowable shear");
  const arcVoltage = finite(input.arcVoltage, "Arc voltage");
  const arcCurrent = finite(input.arcCurrent, "Arc current");
  const travelSpeed = finite(input.travelSpeed, "Travel speed");
  const arcEfficiency = finite(input.arcEfficiency, "User-stated arc efficiency");
  if (arcEfficiency > 100) throw new Error("User-stated arc efficiency must not exceed 100 percent.");
  const throat = 0.707 * legSize;
  const effectiveArea = throat * weldLength * weldLines;
  const directStress = directForce / effectiveArea;
  const requiredLeg = directForce / (0.707 * weldLength * allowableShear * weldLines);
  const heatInput = arcVoltage * arcCurrent * 60 * (arcEfficiency / 100) / (1000 * travelSpeed);
  return { values: [quantity("throat", "Effective throat thickness", throat, throat, "mm"), quantity("effectiveArea", "Effective throat area", effectiveArea, effectiveArea, "mm²"), quantity("directStress", "Direct throat shear stress", directStress, directStress, "MPa"), quantity("requiredLeg", "Required leg at stated allowable", requiredLeg, requiredLeg, "mm"), quantity("heatInput", "Electrical heat input", heatInput, heatInput, "kJ/mm")], warnings: ["This is equal-leg fillet-weld direct-load arithmetic with user-entered allowable, plus electrical heat input from user-entered arc settings. It excludes weld group eccentricity, bending/torsion, nonuniform load sharing, longitudinal/transverse direction effects, fatigue, residual stress, discontinuities, base-metal failure, electrode/process selection, code provisions, weld procedure qualification, heat-affected-zone effects, distortion, preheat/interpass control, inspection, and compliance."], errors: [], method: "t = 0.707a · Aeff = 0.707aLn · τ = F/Aeff · amin = F/(0.707Lτallow n) · HI = VI·60·η/(1000v)" };
};

const calculateThreadDesign = (input: Record<string, string>): CalculationState => {
  const majorDiameter = finite(input.majorDiameter, "Metric thread major diameter");
  const pitch = finite(input.pitch, "Thread pitch");
  const engagementPercent = finite(input.engagementPercent, "User-stated tap engagement");
  const engagementLength = finite(input.engagementLength, "Thread engagement length");
  const threadsPerInch = finite(input.threadsPerInch, "Thread frequency");
  const externalMajorMinimum = finite(input.externalMajorMinimum, "External minimum major diameter");
  const internalPitchMaximum = finite(input.internalPitchMaximum, "Internal maximum pitch diameter");
  const allowableShear = finite(input.allowableShear, "User-stated internal-thread allowable");
  const appliedAxialLoad = finite(input.appliedAxialLoad, "Applied axial load", false);
  if (engagementPercent > 100) throw new Error("User-stated tap engagement must not exceed 100 percent.");
  const targetTapDrill = majorDiameter - pitch * engagementPercent / 100;
  if (targetTapDrill <= 0) throw new Error("The requested tap drill must be positive; verify the major diameter, pitch, and engagement inputs.");
  const fullEngagementTapDrill = majorDiameter - pitch;
  const engagedThreads = engagementLength / pitch;
  const engagementLengthInches = engagementLength / 25.4;
  const rootShearAreaInches = Math.PI * threadsPerInch * engagementLengthInches * externalMajorMinimum * (1 / (2 * threadsPerInch) + 0.57735 * (externalMajorMinimum - internalPitchMaximum));
  if (rootShearAreaInches <= 0) throw new Error("The reviewed root-shear-area inputs must produce a positive area; verify TPI and the stated thread diameters.");
  const rootShearArea = rootShearAreaInches * 645.16;
  const pullOutCapacity = rootShearArea * allowableShear;
  const utilization = appliedAxialLoad / pullOutCapacity;
  return { values: [quantity("targetTapDrill", "Target tap drill at stated engagement", targetTapDrill, targetTapDrill, "mm"), quantity("fullEngagementTapDrill", "Basic major-minus-pitch drill", fullEngagementTapDrill, fullEngagementTapDrill, "mm"), quantity("engagedThreads", "Engaged thread pitches", engagedThreads, engagedThreads, "—"), quantity("rootShearArea", "Reviewed root-shear area", rootShearArea, rootShearArea, "mm²"), quantity("pullOutCapacity", "User-property thread-stripping capacity", pullOutCapacity, pullOutCapacity, "N"), quantity("utilization", "Applied load / screening capacity", utilization, utilization * 100, "%")], warnings: ["This combines source-stated basic metric tap-drill arithmetic with the reviewed internal-thread root-shear-area relation using user-entered TPI, minimum external major diameter, maximum internal pitch diameter, engagement length, and shear strength. It does not select a thread standard, fit/class, drill, tap, material, allowable, or actual engagement; it excludes load distribution, bending, fatigue, torque/tension interaction, thread damage, installation effects, joint stiffness, and acceptance/compliance."], errors: [], method: "Dtap = Dmajor − P·E · Ats = πnLeDsmin[1/(2n)+0.57735(Dsmin−Enmax)] · Fscreen = Atsτallow" };
};

const calculateOrificeFlow = (input: Record<string, string>): CalculationState => {
  const dischargeCoefficient = finite(input.dischargeCoefficient, "Discharge coefficient", false);
  const orificeDiameter = finite(input.orificeDiameter, "Orifice diameter");
  const pipeDiameter = finite(input.pipeDiameter, "Pipe internal diameter");
  const upstreamPressure = finite(input.upstreamPressure, "Upstream pressure", false);
  const downstreamPressure = finite(input.downstreamPressure, "Downstream pressure", false);
  const density = finite(input.density, "Fluid density");
  if (dischargeCoefficient <= 0 || dischargeCoefficient > 1) throw new Error("Discharge coefficient must be greater than 0 and no greater than 1.");
  if (orificeDiameter >= pipeDiameter) throw new Error("Pipe internal diameter must exceed the orifice diameter.");
  const pressureDrop = upstreamPressure - downstreamPressure;
  if (pressureDrop <= 0) throw new Error("Upstream pressure must exceed downstream pressure for this stated flow direction.");
  const diameterRatio = orificeDiameter / pipeDiameter;
  const orificeArea = Math.PI * (orificeDiameter / 1000) ** 2 / 4;
  const volumetricFlow = dischargeCoefficient * orificeArea * Math.sqrt(2 * pressureDrop / (density * (1 - diameterRatio ** 4)));
  const massFlow = volumetricFlow * density;
  const throatVelocity = volumetricFlow / orificeArea;
  return { values: [quantity("volumetricFlow", "Incompressible volumetric flow", volumetricFlow, volumetricFlow * 1000, "L/s"), quantity("massFlow", "Mass flow", massFlow, massFlow, "kg/s"), quantity("throatVelocity", "Orifice mean velocity", throatVelocity, throatVelocity, "m/s"), quantity("pressureDrop", "Stated pressure difference", pressureDrop, pressureDrop, "Pa"), quantity("diameterRatio", "Orifice / pipe diameter ratio", diameterRatio, diameterRatio, "—")], warnings: ["This is a steady incompressible pressure-drop screen with user-entered discharge coefficient and circular geometry. It excludes gases/compressibility, choked flow, cavitation, viscosity/Reynolds effects, non-Newtonian fluids, temperature change, pulsation, installation requirements, upstream/downstream disturbance, meter calibration, uncertainty, permanent pressure loss, and acceptance/compliance."], errors: [], method: "Q = CdA2√[2(p1−p2)/(ρ(1−β⁴))] · ṁ = ρQ · β = D2/D1" };
};

const calculateBallScrewSizing = (input: Record<string, string>): CalculationState => {
  const axialForce = finite(input.axialForce, "Declared axial force");
  const lead = finite(input.lead, "Screw lead");
  const speed = finite(input.speed, "Screw speed");
  const efficiency = finite(input.efficiency, "Declared screw efficiency");
  if (efficiency > 100) throw new Error("Declared screw efficiency must not exceed 100 percent.");
  const linearSpeed = lead * speed / 60000;
  const torque = axialForce * lead / 1000 / (2 * Math.PI * (efficiency / 100));
  const power = torque * 2 * Math.PI * speed / 60 / 1000;
  return { values: [quantity("linearSpeed", "Ideal linear speed", linearSpeed, linearSpeed, "m/s"), quantity("torque", "Declared-efficiency drive torque", torque, torque, "N·m"), quantity("power", "Mechanical drive power", power, power, "kW")], warnings: ["This is a steady lead-torque screen for a user-defined ball screw. It excludes preload, bearing and seal torque, drive inertia, acceleration/deceleration, critical speed, buckling, deflection, column load, screw/nut selection, life, lubrication, backlash, thermal effects, motor or gearbox selection, controls, safety, and system approval."], errors: [], method: "v = Pn/60000 · T = FaP/(2πη) · Pmech = Tω" };
};

const calculateCuttingPower = (input: Record<string, string>): CalculationState => {
  const depth = finite(input.depth, "Depth of cut"), feed = finite(input.feed, "Feed per revolution"), cuttingSpeed = finite(input.cuttingSpeed, "Cutting speed"), specificForce = finite(input.specificForce, "Declared specific cutting force"), efficiency = finite(input.efficiency, "Declared machine efficiency");
  if (efficiency > 100) throw new Error("Declared machine efficiency must not exceed 100 percent.");
  const cuttingPower = depth * feed * cuttingSpeed * specificForce / 60000, machinePower = cuttingPower / (efficiency / 100);
  return { values: [quantity("cuttingPower", "Ideal cutting power", cuttingPower, cuttingPower, "kW"), quantity("machinePower", "Declared-efficiency machine input", machinePower, machinePower, "kW")], warnings: ["Direct turning power screen only; parameter/tool selection, chip-thickness effects, chatter, thermal limits, wear, machine limits, safety, and production approval are excluded."], errors: [], method: "Pc = ap f vc Kc /(60 × 10³) · Pmachine = Pc/η" };
};

const calculateDrillPointDepth = (input: Record<string, string>): CalculationState => {
  const diameter = finite(input.diameter, "Drill diameter"), angle = finite(input.includedAngle, "Included point angle"), fullDepth = finite(input.fullDiameterDepth, "Required full-diameter depth");
  if (angle <= 0 || angle >= 180) throw new Error("Included point angle must be greater than 0 and less than 180 degrees.");
  const pointDepth = diameter / 2 / Math.tan((angle / 2) * Math.PI / 180);
  return { values: [quantity("pointDepth", "Geometric drill-point depth", pointDepth, pointDepth, "mm"), quantity("programmedDepth", "Programmed depth for declared full diameter", fullDepth + pointDepth, fullDepth + pointDepth, "mm")], warnings: ["Ideal conical-point geometry only; drilling variation, wear, runout, breakthrough allowance, workholding, machine motion, cutting parameters, safety, and manufacturing approval are excluded."], errors: [], method: "hpoint = (D/2)/tan(θ/2) · hprogram = hfull + hpoint" };
};

const calculateToolDeflection = (input: Record<string, string>): CalculationState => {
  const force = finite(input.lateralForce, "Declared lateral force"), overhang = finite(input.overhang, "Free overhang") / 1000, diameter = finite(input.coreDiameter, "Declared core diameter") / 1000, modulus = finite(input.modulus, "Declared elastic modulus") * 1e9;
  const inertia = Math.PI * diameter ** 4 / 64, deflection = force * overhang ** 3 / (3 * modulus * inertia), stress = 32 * force * overhang / (Math.PI * diameter ** 3) / 1e6;
  return { values: [quantity("inertia", "Circular core second moment", inertia, inertia, "m⁴"), quantity("deflection", "Ideal tip deflection", deflection * 1000, deflection * 1000, "mm"), quantity("stress", "Outer-fiber bending stress", stress, stress, "MPa")], warnings: ["Elementary circular constant-section cantilever only; flutes, taper, holder/spindle/fixture compliance, contact distribution, runout, dynamics, chatter, fatigue, tool selection, safety, and production approval are excluded."], errors: [], method: "I = πd⁴/64 · δ = FL³/(3EI) · σ = 32FL/(πd³)" };
};

const calculateFatigueConcentration = (input: Record<string, string>): CalculationState => {
  const kt = finite(input.kt, "Declared theoretical stress concentration"), q = finite(input.notchSensitivity, "Declared notch sensitivity", false), nominal = finite(input.nominalStress, "Declared nominal stress", false);
  if (kt < 1) throw new Error("Declared theoretical stress concentration must be at least one."); if (q < 0 || q > 1) throw new Error("Declared notch sensitivity must be from 0 through 1.");
  const kf = 1 + q * (kt - 1);
  return { values: [quantity("kf", "Fatigue stress concentration", kf, kf, "—"), quantity("effectiveStress", "Kf-adjusted nominal stress", kf * nominal, kf * nominal, "MPa")], warnings: ["This direct Kf relation uses user-entered Kt and notch sensitivity. It does not derive geometry, material behavior, fatigue strength, allowable stress, safety factor, life, or design approval."], errors: [], method: "Kf = 1 + q(Kt − 1) · σeffective = Kfσnom" };
};

const calculateGoodmanFatigue = (input: Record<string, string>): CalculationState => {
  const alt = finite(input.nominalAlternating, "Declared nominal alternating stress", false), mean = finite(input.nominalMean, "Declared nominal mean stress", false), kf = finite(input.kf, "Declared fatigue stress concentration"), endurance = finite(input.enduranceLimit, "Declared endurance limit"), ultimate = finite(input.ultimateStrength, "Declared ultimate strength");
  if (kf < 1) throw new Error("Declared fatigue stress concentration must be at least one.");
  const adjustedAlt = kf * alt, adjustedMean = kf * mean, utilization = adjustedAlt / endurance + adjustedMean / ultimate;
  return { values: [quantity("adjustedAlternating", "Kf-adjusted alternating stress", adjustedAlt, adjustedAlt, "MPa"), quantity("adjustedMean", "Kf-adjusted mean stress", adjustedMean, adjustedMean, "MPa"), quantity("utilization", "Linear Goodman utilization", utilization, utilization, "—")], warnings: ["This high-cycle linear Goodman screen does not establish a pass/fail criterion or model endurance modifiers, yield, low-cycle fatigue, multiaxial loading, reliability, life, or design approval."], errors: [], method: "σa = Kfσa,nom · σm = Kfσm,nom · U = σa/Sn + σm/Su" };
};

const calculateMinerDamage = (input: Record<string, string>): CalculationState => {
  const n1 = finite(input.cycles1, "Bin 1 applied cycles", false), N1 = finite(input.life1, "Bin 1 stated cycles to failure"), n2 = finite(input.cycles2, "Bin 2 applied cycles", false), N2 = finite(input.life2, "Bin 2 stated cycles to failure"), n3 = finite(input.cycles3, "Bin 3 applied cycles", false), N3 = finite(input.life3, "Bin 3 stated cycles to failure");
  const d1 = n1 / N1, d2 = n2 / N2, d3 = n3 / N3, total = d1 + d2 + d3;
  return { values: [quantity("damage1", "Bin 1 cycle ratio", d1, d1, "—"), quantity("damage2", "Bin 2 cycle ratio", d2, d2, "—"), quantity("damage3", "Bin 3 cycle ratio", d3, d3, "—"), quantity("totalDamage", "Three-bin linear damage sum", total, total, "—")], warnings: ["This three-bin Palmgren-Miner sum excludes sequence effects, stress-history generation, S-N curve fitting, nonlinear damage, crack growth, reliability, safety factors, failure prediction, and design approval."], errors: [], method: "D = n1/N1 + n2/N2 + n3/N3" };
};

const calculatePlanetaryGear = (input: Record<string, string>): CalculationState => {
  const sun = finite(input.sunTeeth, "Sun gear teeth"), ring = finite(input.ringTeeth, "Ring gear teeth"), planets = finite(input.planetCount, "Declared planet count"), speed = finite(input.inputSpeed, "Sun input speed"), torque = finite(input.inputTorque, "Sun input torque"), efficiency = finite(input.efficiency, "Declared planetary efficiency");
  if (ring <= sun) throw new Error("Ring gear teeth must exceed sun gear teeth for this fixed-ring planetary screen."); if ((ring - sun) % 2 !== 0) throw new Error("Ring and sun tooth difference must be even to yield nominal planet teeth."); if (efficiency > 100) throw new Error("Declared planetary efficiency must not exceed 100 percent.");
  const ratio = 1 + ring / sun, planetTeeth = (ring - sun) / 2, carrierSpeed = speed / ratio, carrierTorque = torque * ratio * efficiency / 100, spacingQuotient = (ring - sun) / planets;
  return { values: [quantity("ratio", "Fixed-ring reduction ratio", ratio, ratio, ":1"), quantity("planetTeeth", "Nominal planet teeth", planetTeeth, planetTeeth, "teeth"), quantity("spacingQuotient", "Planet-spacing tooth quotient", spacingQuotient, spacingQuotient, "—"), quantity("carrierSpeed", "Ideal carrier output speed", carrierSpeed, carrierSpeed, "rpm"), quantity("carrierTorque", "Declared-efficiency carrier torque", carrierTorque, carrierTorque, "N·m")], warnings: ["This is a fixed-ring, sun-input, carrier-output tooth and ratio screen. It does not verify complete planetary assembly, module/pressure angle compatibility, interference, load sharing, tooth stress, bearing loads, efficiency, heat, backlash, lubrication, durability, service duty, safety, or product selection."], errors: [], method: "i = 1 + Nr/Ns · Np = (Nr − Ns)/2 · ncarrier = nsun/i · Tcarrier = Tsun iη" };
};

const calculateWormDrive = (input: Record<string, string>): CalculationState => {
  const wheel = finite(input.wheelTeeth, "Worm-wheel teeth"), starts = finite(input.wormStarts, "Worm starts"), speed = finite(input.inputSpeed, "Worm input speed"), torque = finite(input.inputTorque, "Worm input torque"), efficiency = finite(input.efficiency, "Declared worm-drive efficiency");
  if (efficiency > 100) throw new Error("Declared worm-drive efficiency must not exceed 100 percent.");
  const ratio = wheel / starts, outputSpeed = speed / ratio, outputTorque = torque * ratio * efficiency / 100;
  return { values: [quantity("ratio", "Ideal worm reduction ratio", ratio, ratio, ":1"), quantity("outputSpeed", "Ideal wheel output speed", outputSpeed, outputSpeed, "rpm"), quantity("outputTorque", "Declared-efficiency wheel torque", outputTorque, outputTorque, "N·m")], warnings: ["This is a one-stage ideal tooth-ratio screen with a user-entered efficiency. It does not select a worm set, predict efficiency or self-locking, model tooth contact/stress, heat, lubrication, backlash, noise, duty, durability, safety, or product suitability."], errors: [], method: "i = Zw/S · nout = nin/i · Tout = Tin iη" };
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

const calculateTorqueSpeedDuty = (input: Record<string, string>): CalculationState => {
  const inertia = finite(input.inertia, "Reflected inertia"), speedChange = finite(input.speedChange, "Speed change"), accelerationTime = finite(input.accelerationTime, "Acceleration time"), loadTorque = finite(input.loadTorque, "Declared load torque", false), targetSpeed = finite(input.targetSpeed, "Target speed"), availableTorque = finite(input.availableTorque, "Stated available torque");
  if (loadTorque < 0) throw new Error("Declared load torque must not be negative.");
  const angularAcceleration = speedChange * (2 * Math.PI / 60) / accelerationTime;
  const accelerationTorque = inertia * angularAcceleration;
  const requiredTorque = loadTorque + accelerationTorque;
  const shaftPower = requiredTorque * targetSpeed * 2 * Math.PI / 60 / 1000;
  const torqueMargin = availableTorque - requiredTorque;
  return { values: [quantity("angularAcceleration", "Angular acceleration", angularAcceleration, angularAcceleration, "rad/s²"), quantity("accelerationTorque", "Inertia acceleration torque", accelerationTorque, accelerationTorque, "N·m"), quantity("requiredTorque", "Direct required acceleration torque", requiredTorque, requiredTorque, "N·m"), quantity("shaftPower", "Duty-point shaft power", shaftPower, shaftPower, "kW"), quantity("torqueMargin", "Stated torque minus direct requirement", torqueMargin, torqueMargin, "N·m")], warnings: ["This one-duty-point arithmetic uses user-entered reflected inertia, load torque, and available torque. It does not generate a motor torque-speed curve, assess peak/rated/RMS capacity, efficiency, thermal behavior, gearing, safety factor, tuning, motor or drive selection, or design approval."], errors: [], method: "α = Δn(2π/60)/ta · Tacc = Jα · Treq = Tload + Tacc · P = Treqω" };
};

const calculateFixtureClamping = (input: Record<string, string>): CalculationState => {
  const machiningForce = finite(input.machiningForce, "Declared horizontal machining force"), friction = finite(input.friction, "Declared clamp/workpiece friction", false), multiplier = finite(input.serviceMultiplier, "Declared force multiplier");
  if (friction <= 0 || friction > 1) throw new Error("Declared clamp/workpiece friction must be greater than zero and no more than one.");
  const designHorizontalForce = machiningForce * multiplier;
  const normalForce = designHorizontalForce / friction;
  return { values: [quantity("designHorizontalForce", "Multiplier-adjusted horizontal force", designHorizontalForce, designHorizontalForce, "N"), quantity("requiredNormalForce", "Friction-only required normal force", normalForce, normalForce, "N"), quantity("frictionCapacity", "Friction capacity at required normal force", normalForce * friction, normalForce * friction, "N")], warnings: ["This is a friction-only horizontal-force screen. It does not analyze stops, lift, moments, clamp geometry, load distribution, workpiece deformation, vibration, dynamic loads, machine table stiffness, clamp capacity, fixture selection, or safety approval."], errors: [], method: "Fdesign = Fcut M · Nrequired = Fdesign/μ · Ffriction = μN" };
};

const calculatePickPlaceCycle = (input: Record<string, string>): CalculationState => {
  const outbound = finite(input.outboundTime, "Outbound travel time", false), inbound = finite(input.inboundTime, "Return travel time", false), pick = finite(input.pickDwell, "Pick dwell", false), place = finite(input.placeDwell, "Place dwell", false), auxiliary = finite(input.auxiliaryTime, "Auxiliary time", false), cycles = finite(input.cycles, "Repeated cycles");
  const cycleTime = outbound + inbound + pick + place + auxiliary;
  if (cycleTime <= 0) throw new Error("Total pick-and-place cycle time must be greater than zero.");
  return { values: [quantity("cycleTime", "Declared repeated cycle time", cycleTime, cycleTime, "s"), quantity("hourlyThroughput", "Ideal hourly throughput", 3600 / cycleTime, 3600 / cycleTime, "cycles/h"), quantity("batchTime", "Declared-cycle batch duration", cycleTime * cycles / 60, cycleTime * cycles / 60, "min")], warnings: ["This is a repeated timing sum from user-entered travel, dwell, and auxiliary times. It does not simulate robot paths, acceleration, blending, queuing, overlap, controller behavior, reach, collision, faults, payload limits, uptime, safety, or throughput guarantees."], errors: [], method: "tcycle = tout + tback + tpick + tplace + taux · throughput = 3600/tcycle · tbatch = Ntcycle" };
};

const calculatePayloadInertia = (input: Record<string, string>): CalculationState => {
  const eoat = finite(input.eoatMass, "EOAT mass", false), product = finite(input.productMass, "Product mass", false), distance = finite(input.cgDistance, "Flange-to-CG distance", false);
  if (distance < 0) throw new Error("Flange-to-CG distance must not be negative.");
  const payload = eoat + product;
  const pointMassInertia = payload * distance ** 2;
  return { values: [quantity("payloadMass", "Declared total payload mass", payload, payload, "kg"), quantity("cgMoment", "Payload mass × CG distance", payload * distance, payload * distance, "kg·m"), quantity("pointMassInertia", "Point-mass payload inertia", pointMassInertia, pointMassInertia, "kg·m²")], warnings: ["This is a one-axis point-mass approximation using a single declared flange-to-CG distance. It does not calculate a full inertia tensor, model EOAT/product geometry, determine robot payload or axis limits, evaluate reach, motion, collision, capacity, safety, certification, or robot selection."], errors: [], method: "mpayload = me + mp · first moment = mpayload r · Ipoint = mpayload r²" };
};

const calculatePneumaticCycleTime = (input: Record<string, string>): CalculationState => {
  const bore = finite(input.bore, "Cylinder bore");
  const rod = finite(input.rod, "Rod diameter");
  const stroke = finite(input.stroke, "Stroke");
  const flow = finite(input.flow, "Declared actual cylinder flow");
  if (rod >= bore) throw new Error("Rod diameter must be smaller than cylinder bore.");
  const boreArea = Math.PI * bore ** 2 / 4;
  const rodArea = Math.PI * rod ** 2 / 4;
  const annulusArea = boreArea - rodArea;
  const extendVolume = boreArea * stroke;
  const retractVolume = annulusArea * stroke;
  const flowMm3PerSecond = flow * 1e6 / 60;
  const extendSpeed = flowMm3PerSecond / boreArea;
  const retractSpeed = flowMm3PerSecond / annulusArea;
  return {
    values: [
      quantity("extendVolume", "Ideal extend volume", extendVolume, extendVolume / 1e6, "L"),
      quantity("retractVolume", "Ideal retract volume", retractVolume, retractVolume / 1e6, "L"),
      quantity("extendSpeed", "Ideal extend speed", extendSpeed, extendSpeed, "mm/s"),
      quantity("retractSpeed", "Ideal retract speed", retractSpeed, retractSpeed, "mm/s"),
      quantity("extendTime", "Ideal extend time", stroke / extendSpeed, stroke / extendSpeed, "s"),
      quantity("retractTime", "Ideal retract time", stroke / retractSpeed, stroke / retractSpeed, "s"),
    ],
    warnings: ["This screen uses the user-declared actual volumetric flow at the cylinder. Do not enter SCFM, NL/min, or free-air flow unless it has already been converted to actual cylinder conditions. It does not model compressibility, pressure, valve Cv, tubing, flow controls, leakage, friction, load, acceleration, cushioning, end stops, or real cycle-time validation."],
    errors: [],
    method: "Ahead = πD²/4 · Aannulus = π(D² − d²)/4 · v = Qactual/A · t = L/v",
  };
};

const calculateValveCv = (input: Record<string, string>): CalculationState => {
  const cv = finite(input.cv, "Declared liquid Cv");
  const specificGravity = finite(input.specificGravity, "Liquid specific gravity");
  const pressureDrop = finite(input.pressureDrop, "Liquid pressure drop");
  const flow = finite(input.flow, "Declared liquid flow");
  const calculatedFlow = cv * Math.sqrt(pressureDrop / specificGravity);
  const requiredCv = flow * Math.sqrt(specificGravity / pressureDrop);
  return {
    values: [quantity("liquidFlow", "Flow from declared Cv", calculatedFlow, calculatedFlow, "US gpm"), quantity("requiredCv", "Required Cv from declared flow", requiredCv, requiredCv, "—")],
    warnings: ["This is a liquid-water Cv convention only. Do not use it for compressible air, pneumatic valve sizing, gas flow, flashing, choking, cavitation, viscosity correction, pressure-recovery correction, two-phase flow, or a manufacturer-specific valve rating/test condition. Confirm the supplier’s published flow method before selecting hardware."],
    errors: [],
    method: "Q = Cv√(ΔP/SG) · Cvrequired = Q√(SG/ΔP)",
  };
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

const calculateAdditiveBuild = (input: Record<string, string>): CalculationState => {
  const partVolume = finite(input.partVolume, "Declared part volume");
  const density = finite(input.density, "Declared material density");
  const supportFactor = finite(input.supportFactor, "Declared support-material factor", false);
  const buildRate = finite(input.buildRate, "Declared effective build rate");
  const materialRate = finite(input.materialRate, "Declared material rate", false);
  const machineRate = finite(input.machineRate, "Declared machine rate", false);
  const fixedOverhead = finite(input.fixedOverhead, "Declared fixed overhead", false);
  if (supportFactor < 0) throw new Error("Declared support-material factor must not be negative.");
  if (materialRate < 0 || machineRate < 0 || fixedOverhead < 0) throw new Error("Declared cost inputs must not be negative.");
  const partMass = partVolume * density;
  const supportMass = partMass * supportFactor / 100;
  const totalMass = partMass + supportMass;
  const effectiveVolume = partVolume * (1 + supportFactor / 100);
  const buildTime = effectiveVolume / buildRate;
  const materialCost = totalMass / 1000 * materialRate;
  const machineCost = buildTime * machineRate;
  const directCost = materialCost + machineCost + fixedOverhead;
  return {
    values: [
      quantity("partMass", "Declared part material mass", partMass, partMass, "g"),
      quantity("supportMass", "Declared support material mass", supportMass, supportMass, "g"),
      quantity("totalMaterialMass", "Part plus support material mass", totalMass, totalMass, "g"),
      quantity("effectiveBuildVolume", "Support-adjusted build volume", effectiveVolume, effectiveVolume, "cm³"),
      quantity("buildTime", "Effective build time", buildTime, buildTime, "h"),
      quantity("materialCost", "Declared material cost", materialCost, materialCost, "currency"),
      quantity("machineCost", "Declared machine-time cost", machineCost, machineCost, "currency"),
      quantity("directCost", "Direct estimated cost", directCost, directCost, "currency"),
    ],
    warnings: ["This is a direct estimate from user-entered volume, density, support factor, effective build rate, and cost rates. It does not read CAD/STL data, infer wall thickness, orientation, support geometry, infill, nesting, layer parameters, warmup/cooldown, setup, labor, post-processing, energy, scrap, yield, scheduling, machine availability, material qualification, printability, quality, lead time, quotation, or process/material/machine selection."],
    errors: [],
    method: "mpart = Vρ · msupport = mpart s · teffective = V(1+s)/R · Cdirect = (mpart + msupport)cm + teffective ch + C0",
  };
};

const calculateGravityMoment = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Declared moving mass");
  const cgRadius = finite(input.cgRadius, "Pivot-to-CG radius");
  const angle = finite(input.angle, "Configuration angle from vertical", false);
  const counterMoment = finite(input.counterMoment, "Declared counter moment", false);
  if (Math.abs(angle) > 180) throw new Error("Configuration angle from vertical must stay between -180° and 180°.");
  const gravityForce = mass * 9.81;
  const gravityMoment = gravityForce * cgRadius * Math.sin(angle * Math.PI / 180);
  const residualMoment = counterMoment - gravityMoment;
  return {
    values: [
      quantity("gravityForce", "Weight force", gravityForce, gravityForce, "N"),
      quantity("perpendicularLeverArm", "Gravity perpendicular lever arm", cgRadius * Math.sin(angle * Math.PI / 180), cgRadius * Math.sin(angle * Math.PI / 180), "m"),
      quantity("gravityMoment", "Signed gravity moment", gravityMoment, gravityMoment, "N·m"),
      quantity("residualMoment", "Counter moment minus gravity moment", residualMoment, residualMoment, "N·m"),
    ],
    warnings: ["This is a static single-point-mass, planar gravity-moment screen. It does not solve an over-center, toggle, or four-bar linkage; calculate actuator force/travel, joint reactions, locking, force amplification, self-locking, spring forces, friction, contact, dynamic/inertial loads, deflection, collision, stability, guard requirements, safety, or certification. Enter moments using a declared common sign convention and validate the real mechanism independently."],
    errors: [],
    method: "W = mg · r⊥ = r sin θ · Mg = mgr sin θ · Mresidual = Mc − Mg",
  };
};

const calculatePitchCircle = (input: Record<string, string>): CalculationState => {
  const pcd = finite(input.pcd, "Pitch-circle diameter");
  const holeCount = finite(input.holeCount, "Equal hole count");
  const startAngle = finite(input.startAngle, "First-hole angle", false);
  if (!Number.isInteger(holeCount) || holeCount < 2 || holeCount > 72) throw new Error("Equal hole count must be an integer from 2 through 72.");
  if (Math.abs(startAngle) > 360) throw new Error("First-hole angle must stay between -360° and 360°.");
  const radius = pcd / 2;
  const angularPitch = 360 / holeCount;
  const adjacentChord = 2 * radius * Math.sin(Math.PI / holeCount);
  const firstX = radius * Math.cos(startAngle * Math.PI / 180);
  const firstY = radius * Math.sin(startAngle * Math.PI / 180);
  const oppositeAngle = startAngle + 180;
  const oppositeX = radius * Math.cos(oppositeAngle * Math.PI / 180);
  const oppositeY = radius * Math.sin(oppositeAngle * Math.PI / 180);
  return { values: [quantity("radius", "Pitch-circle radius", radius, radius, "mm"), quantity("angularPitch", "Equal angular pitch", angularPitch, angularPitch, "°"), quantity("adjacentChord", "Adjacent-center chord", adjacentChord, adjacentChord, "mm"), quantity("firstX", "First-hole nominal X", firstX, firstX, "mm"), quantity("firstY", "First-hole nominal Y", firstY, firstY, "mm"), quantity("oppositeX", "180° opposite nominal X", oppositeX, oppositeX, "mm"), quantity("oppositeY", "180° opposite nominal Y", oppositeY, oppositeY, "mm")], warnings: ["This is equal-spacing nominal pitch-circle geometry only. It does not create CAD/CAM/G-code, select fasteners, calculate hole diameter or tolerance, interpret GD&T, establish datum references, assess positional accuracy, balance rotating components, determine manufacturability, or approve a drawing or part."], errors: [], method: "r = PCD/2 · Δθ = 360°/n · chord = 2r sin(π/n) · xi = r cos(θ₀+iΔθ) · yi = r sin(θ₀+iΔθ)" };
};

const calculateRegularPolygon = (input: Record<string, string>): CalculationState => {
  const sideCount = finite(input.sideCount, "Side count");
  const sideLength = finite(input.sideLength, "Side length");
  if (!Number.isInteger(sideCount) || sideCount < 3 || sideCount > 360) throw new Error("Side count must be an integer from 3 through 360 for this regular-polygon screen.");
  const halfAngle = Math.PI / sideCount;
  const perimeter = sideCount * sideLength;
  const apothem = sideLength / (2 * Math.tan(halfAngle));
  const circumradius = sideLength / (2 * Math.sin(halfAngle));
  const interiorAngle = (sideCount - 2) * 180 / sideCount;
  const area = 0.5 * apothem * perimeter;
  return { values: [quantity("perimeter", "Perimeter", perimeter, perimeter, "mm"), quantity("apothem", "Apothem", apothem, apothem, "mm"), quantity("circumradius", "Circumradius", circumradius, circumradius, "mm"), quantity("interiorAngle", "Each interior angle", interiorAngle, interiorAngle, "°"), quantity("area", "Regular-polygon area", area, area, "mm²")], warnings: ["This is planar regular-polygon closed-form geometry: every side and every interior angle are assumed equal. It does not calculate irregular polygons, tolerance zones, CAD/CAM geometry, feature position, material area allowance, manufacturability, structural response, or drawing compliance."], errors: [], method: "P = ns · a = s/[2 tan(π/n)] · R = s/[2 sin(π/n)] · α = (n−2)180°/n · A = aP/2" };
};

const calculateEccentricBoltGroup = (input: Record<string, string>): CalculationState => {
  const boltCount = finite(input.boltCount, "Equal bolt count");
  const patternRadius = finite(input.patternRadius, "Pattern radius");
  const appliedForce = finite(input.appliedForce, "Declared in-plane load");
  const eccentricity = finite(input.eccentricity, "Load eccentricity", false);
  const boltDiameter = finite(input.boltDiameter, "Bolt shank diameter");
  if (!Number.isInteger(boltCount) || boltCount < 2 || boltCount > 72) throw new Error("Equal bolt count must be an integer from 2 through 72.");
  if (eccentricity < 0) throw new Error("Load eccentricity must not be negative.");
  const directShear = appliedForce / boltCount;
  const moment = appliedForce * eccentricity;
  const polarRadiusSum = boltCount * patternRadius ** 2;
  const torsionalShear = moment * patternRadius / polarRadiusSum;
  const conservativeMaximum = directShear + torsionalShear;
  const shankArea = Math.PI * boltDiameter ** 2 / 4;
  const nominalShearStress = conservativeMaximum / shankArea;
  return { values: [quantity("moment", "Applied eccentric moment", moment, moment / 1000, "N·m"), quantity("directShear", "Direct shear per equal joint", directShear, directShear, "N"), quantity("torsionalShear", "Torsional shear magnitude per joint", torsionalShear, torsionalShear, "N"), quantity("conservativeMaximum", "Conservative scalar joint shear", conservativeMaximum, conservativeMaximum, "N"), quantity("nominalShearStress", "Nominal maximum shank shear stress", nominalShearStress, nominalShearStress, "MPa")], warnings: ["This is an equal-bolt, concentric circular-pattern, in-plane eccentric-shear screen. The displayed maximum is a conservative scalar sum of direct and torsional shear magnitudes rather than a resolved individual-bolt vector. It does not model arbitrary coordinates, unequal fastener stiffness, preload, friction/slip, axial tension, prying, out-of-plane loads, plate flexibility, interactions, fatigue, material allowables, failure, selection, or approval."], errors: [], method: "M = Fe · Vdirect = F/n · Σr² = nr² · Vtorsion = Mr/Σr² = M/(nr) · Vconservative = Vdirect + Vtorsion · τnom = Vconservative/(πd²/4)" };
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

const calculateVacuumEvacuation = (input: Record<string, string>): CalculationState => {
  const vesselVolume = finite(input.vesselVolume, "Declared evacuated volume");
  const effectiveSpeed = finite(input.effectiveSpeed, "Declared effective pumping speed");
  const startPressure = finite(input.startPressure, "Start absolute pressure");
  const targetPressure = finite(input.targetPressure, "Target absolute pressure");
  const targetTime = finite(input.targetTime, "Declared evacuation-time target");
  if (targetPressure >= startPressure) throw new Error("Target absolute pressure must be below the start absolute pressure.");
  const pressureRatio = startPressure / targetPressure;
  const logPressureRatio = Math.log(pressureRatio);
  const idealTime = vesselVolume / effectiveSpeed * logPressureRatio;
  const requiredEffectiveSpeed = vesselVolume / targetTime * logPressureRatio;
  const declaredToRequiredSpeedRatio = effectiveSpeed / requiredEffectiveSpeed;
  return { values: [quantity("pressureRatio", "Declared pressure ratio p₁/p₂", pressureRatio, pressureRatio, "—"), quantity("idealTime", "Ideal constant-speed evacuation time", idealTime, idealTime, "s"), quantity("requiredEffectiveSpeed", "Effective speed for declared time target", requiredEffectiveSpeed, requiredEffectiveSpeed, "L/s"), quantity("declaredToRequiredSpeedRatio", "Declared / required effective-speed ratio", declaredToRequiredSpeedRatio, declaredToRequiredSpeedRatio, "—")], warnings: ["This is a single constant-effective-speed, ideal logarithmic evacuation interval using user-declared vessel volume and effective pumping speed. It does not calculate pump curves, conductance, piping/network losses, leakage, desorption/outgassing, vapour load, thermal behavior, gas composition, compressible/choked flow, equipment sizing, pump selection, capacity, life, safety, or approval. Real evacuation time can be longer than this ideal arithmetic result."], errors: [], method: "t = (V/S) ln(p₁/p₂) · Srequired = (V/ttarget) ln(p₁/p₂)" };
};

const calculateToggleForce = (input: Record<string, string>): CalculationState => {
  const inputForce = finite(input.inputForce, "Declared knee input force");
  const halfAngle = finite(input.halfAngle, "Link angle from dead centre");
  if (halfAngle <= 0.5 || halfAngle > 45) throw new Error("Link angle from dead centre must be greater than 0.5° and no more than 45° for this singularity-guarded screen.");
  const tangent = Math.tan(halfAngle * Math.PI / 180);
  const mechanicalAdvantage = 1 / (2 * tangent);
  const outputForce = inputForce * mechanicalAdvantage;
  return { values: [quantity("mechanicalAdvantage", "Ideal symmetric toggle mechanical advantage", mechanicalAdvantage, mechanicalAdvantage, "—"), quantity("outputForce", "Ideal axial toggle output force", outputForce, outputForce, "N"), quantity("tangent", "Declared-angle tangent", tangent, tangent, "—")], warnings: ["This is an ideal, symmetric, planar, pre-dead-centre two-link toggle relation with a knee input perpendicular to the link line. It excludes link length and kinematics, frame/guide deflection, pin stress and clearance, friction, compliance, off-axis loading, stroke, actuation, over-centre travel, locking/self-locking, latch retention, material strength, fatigue, safety, and approval. It deliberately rejects the near-singular 0.5° and below range."], errors: [], method: "MA = 1/[2 tan(θ)] · Fout = Fin · MA" };
};

const calculateWristInertia = (input: Record<string, string>): CalculationState => {
  const eoatMass = finite(input.eoatMass, "Declared EOAT mass", false);
  const eoatCentroidalInertia = finite(input.eoatCentroidalInertia, "Declared EOAT centroidal inertia", false);
  const eoatOffset = finite(input.eoatOffset, "EOAT flange-axis offset", false);
  const payloadMass = finite(input.payloadMass, "Declared payload mass", false);
  const payloadCentroidalInertia = finite(input.payloadCentroidalInertia, "Declared payload centroidal inertia", false);
  const payloadOffset = finite(input.payloadOffset, "Payload flange-axis offset", false);
  const eoatShift = eoatMass * eoatOffset ** 2;
  const payloadShift = payloadMass * payloadOffset ** 2;
  const eoatAxisInertia = eoatCentroidalInertia + eoatShift;
  const payloadAxisInertia = payloadCentroidalInertia + payloadShift;
  const totalInertia = eoatAxisInertia + payloadAxisInertia;
  return { values: [quantity("totalMass", "Declared EOAT + payload mass", eoatMass + payloadMass, eoatMass + payloadMass, "kg"), quantity("eoatAxisInertia", "EOAT inertia about stated wrist axis", eoatAxisInertia, eoatAxisInertia, "kg·m²"), quantity("payloadAxisInertia", "Payload inertia about stated wrist axis", payloadAxisInertia, payloadAxisInertia, "kg·m²"), quantity("totalInertia", "Declared total wrist/tool inertia", totalInertia, totalInertia, "kg·m²")], warnings: ["This is a one-axis, user-entered parallel-axis inertia sum for two rigid declared bodies. It does not construct an inertia tensor, infer geometry, identify a robot axis, calculate motion dynamics, establish payload/reach/duty limits, validate collision, select hardware, establish safety, or approve a robot cell."], errors: [], method: "Iaxis = Icg + mr² · Itotal = IEOAT,axis + Ipayload,axis" };
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

const calculatePneumaticLineLoss = (input: Record<string, string>): CalculationState => {
  const actualFlow = finite(input.actualFlow, "Actual upstream volumetric flow");
  const insideDiameter = finite(input.insideDiameter, "Pipe inside diameter");
  const pipeLength = finite(input.pipeLength, "Straight pipe length", false);
  const frictionFactor = finite(input.frictionFactor, "Declared Darcy friction factor");
  const density = finite(input.density, "Declared upstream air density");
  const upstreamPressure = finite(input.upstreamPressure, "Upstream absolute pressure");
  if (frictionFactor > 1) throw new Error("Declared Darcy friction factor must not exceed 1 in this bounded screen.");
  const diameterMetres = insideDiameter / 1000;
  const area = Math.PI * diameterMetres ** 2 / 4;
  const velocity = actualFlow / 60 / area;
  const pressureLossPa = frictionFactor * (pipeLength / diameterMetres) * density * velocity ** 2 / 2;
  const lossRatio = pressureLossPa / (upstreamPressure * 1000);
  if (lossRatio >= 0.1) throw new Error("Calculated major loss must remain below 10% of upstream absolute pressure for this low-pressure approximation.");
  return { values: [quantity("area", "Declared pipe flow area", area, area * 1e6, "mm²"), quantity("velocity", "Mean upstream-density air velocity", velocity, velocity, "m/s"), quantity("pressureLoss", "Declared-density Darcy major loss", pressureLossPa, pressureLossPa / 1000, "kPa"), quantity("lossRatio", "Major loss / upstream absolute pressure", lossRatio, lossRatio * 100, "%")], warnings: ["This is a low-pressure straight-pipe compressed-air approximation using user-entered upstream density and Darcy friction factor. It is valid only while the calculated major loss remains below 10% of upstream absolute pressure. It excludes fittings/minor losses, networks, elevation, density/temperature variation, choked flow, compressor or valve selection, line sizing, capacity, safety, and approval."], errors: [], method: "A = πD²/4 · v = Q/A · Δp = f(L/D)(ρv²/2) · guard: Δp/p₁ < 10%" };
};

const calculateTappingTorque = (input: Record<string, string>): CalculationState => {
  const threadDiameter = finite(input.threadDiameter, "Declared thread diameter");
  const torqueCoefficient = finite(input.torqueCoefficient, "Declared torque coefficient");
  const engagementFactor = finite(input.engagementFactor, "Declared engagement factor");
  const spindleSpeed = finite(input.spindleSpeed, "Declared spindle speed", false);
  if (engagementFactor > 10) throw new Error("Declared engagement factor must not exceed 10 in this bounded planning screen.");
  const torque = torqueCoefficient * threadDiameter ** 3 * engagementFactor;
  const mechanicalPower = torque * 2 * Math.PI * spindleSpeed / 60 / 1000;
  return { values: [quantity("torque", "User-coefficient first-estimate tapping torque", torque, torque, "N·m"), quantity("mechanicalPower", "Ideal mechanical spindle power", mechanicalPower, mechanicalPower, "kW"), quantity("diameterCube", "Declared diameter cubed", threadDiameter ** 3, threadDiameter ** 3, "mm³")], warnings: ["This is a planning-only user-coefficient torque and mechanical-power arithmetic screen. It does not choose a tap, thread form, drill size, material, hardness, lubricant, cutting speed, engagement percentage, feed, tool life, machine capability, process parameters, or approve a tap operation."], errors: [], method: "T = k·d³·e · P = Tω = 2πTn/(60·1000)" };
};

const calculateThreadMachiningTime = (input: Record<string, string>): CalculationState => {
  const pitch = finite(input.pitch, "Declared thread pitch");
  const travelLength = finite(input.travelLength, "Declared per-pass thread travel");
  const spindleSpeed = finite(input.spindleSpeed, "Declared spindle speed");
  const passCount = finite(input.passCount, "Declared pass count");
  const reversalTime = finite(input.reversalTime, "Declared reversal / overhead per pass", false);
  if (!Number.isInteger(passCount) || passCount < 1 || passCount > 1000) throw new Error("Declared pass count must be an integer from 1 through 1,000.");
  const feedRate = pitch * spindleSpeed;
  const cuttingTimePerPass = travelLength / feedRate * 60;
  const totalCuttingTime = cuttingTimePerPass * passCount;
  const totalTime = totalCuttingTime + reversalTime * passCount;
  return { values: [quantity("feedRate", "Declared pitch-feed rate", feedRate, feedRate, "mm/min"), quantity("cuttingTimePerPass", "Declared travel time per pass", cuttingTimePerPass, cuttingTimePerPass, "s"), quantity("totalCuttingTime", "Declared repeated travel time", totalCuttingTime, totalCuttingTime, "s"), quantity("totalTime", "Declared travel + reversal time", totalTime, totalTime, "s")], warnings: ["This is declared thread-travel arithmetic only. It does not infer thread form, tool path, starts, infeed schedule, stock allowance, material, cutting conditions, tool life, machine acceleration, setup, non-cutting sequence, process suitability, or approval."], errors: [], method: "vf = p·n · tpass = L/vf · 60 · ttotal = N(tpass + tr)" };
};

const calculateReynoldsNumber = (input: Record<string, string>): CalculationState => {
  const density = finite(input.density, "Declared fluid density");
  const velocity = finite(input.velocity, "Declared bulk velocity", false);
  const hydraulicDiameter = finite(input.hydraulicDiameter, "Declared hydraulic diameter");
  const dynamicViscosity = finite(input.dynamicViscosity, "Declared dynamic viscosity");
  const referenceThreshold = finite(input.referenceThreshold, "Declared reference threshold");
  if (referenceThreshold <= 0) throw new Error("Declared reference threshold must be greater than zero.");
  const reynolds = density * velocity * hydraulicDiameter / dynamicViscosity;
  const kinematicViscosity = dynamicViscosity / density;
  return { values: [quantity("reynolds", "Reynolds number", reynolds, reynolds, "—"), quantity("kinematicViscosity", "Declared-condition kinematic viscosity", kinematicViscosity, kinematicViscosity, "m²/s"), quantity("thresholdRatio", "Ratio to declared reference threshold", reynolds / referenceThreshold, reynolds / referenceThreshold, "×")], warnings: ["This is a declared-property Reynolds-number arithmetic screen only. It does not classify a flow regime, select a friction factor or heat/mass-transfer correlation, calculate pressure loss, infer fluid properties, account for roughness, entrance effects, non-Newtonian behavior, multiphase flow, compressibility, geometry, equipment suitability, safety, or approval."], errors: [], method: "Re = ρuDh/μ = uDh/ν · ν = μ/ρ · ratio = Re/Reref" };
};

const calculateMinorLosses = (input: Record<string, string>): CalculationState => {
  const sumK = finite(input.sumK, "Declared total minor-loss coefficient", false);
  const density = finite(input.density, "Declared fluid density");
  const velocity = finite(input.velocity, "Declared reference velocity", false);
  if (sumK < 0) throw new Error("Declared total minor-loss coefficient must not be negative.");
  const dynamicPressure = density * velocity ** 2 / 2;
  const pressureLoss = sumK * dynamicPressure;
  const headLoss = pressureLoss / (density * 9.80665);
  return { values: [quantity("dynamicPressure", "Declared-section dynamic pressure", dynamicPressure, dynamicPressure, "Pa"), quantity("pressureLoss", "Declared-coefficient minor pressure loss", pressureLoss, pressureLoss, "Pa"), quantity("headLoss", "Equivalent liquid head loss", headLoss, headLoss, "m")], warnings: ["This is a user-entered aggregate-coefficient minor-loss arithmetic screen only. It does not choose or derive fitting coefficients, calculate friction or major loss, size pipe, model networks, elevation, compressibility, cavitation, transient effects, viscosity/temperature variation, pressure rating, equipment selection, safety, or approval."], errors: [], method: "Δpminor = ΣK·ρv²/2 · hminor = Δp/(ρg)" };
};

const calculatePipeSizing = (input: Record<string, string>): CalculationState => {
  const flow = finite(input.flow, "Declared volumetric flow");
  const targetVelocity = finite(input.targetVelocity, "Declared target velocity");
  const flowM3s = flow / 60000;
  const area = flowM3s / targetVelocity;
  const diameter = Math.sqrt(4 * area / Math.PI);
  return { values: [quantity("flow", "Declared volumetric flow", flowM3s, flowM3s, "m³/s"), quantity("requiredArea", "Required internal flow area at target velocity", area, area, "m²"), quantity("diameter", "Calculated circular inside diameter", diameter * 1000, diameter * 1000, "mm")], warnings: ["This is target-velocity circular-passage arithmetic only. It does not select a nominal pipe, tube, hose, schedule, material, wall thickness, pressure rating, fitting, pump, velocity target, pressure loss, structural support, corrosion allowance, fluid compatibility, safety, or approval."], errors: [], method: "D = √(4Q/(πvtarget)) · A = Q/vtarget" };
};

const calculateBuoyancyForce = (input: Record<string, string>): CalculationState => {
  const fluidDensity = finite(input.fluidDensity, "Declared fluid density");
  const displacedVolume = finite(input.displacedVolume, "Declared displaced volume");
  const objectMass = finite(input.objectMass, "Declared object mass", false);
  if (objectMass < 0) throw new Error("Declared object mass must not be negative.");
  const volumeM3 = displacedVolume / 1000;
  const buoyancy = fluidDensity * 9.80665 * volumeM3;
  const weight = objectMass * 9.80665;
  const netUpwardForce = buoyancy - weight;
  return { values: [quantity("buoyancy", "Constant-density buoyant force", buoyancy, buoyancy, "N"), quantity("weight", "Declared object gravitational weight", weight, weight, "N"), quantity("netUpwardForce", "Buoyancy minus declared weight", netUpwardForce, netUpwardForce, "N"), quantity("displacedMass", "Mass of declared displaced fluid", fluidDensity * volumeM3, fluidDensity * volumeM3, "kg")], warnings: ["This is constant-density displaced-volume force arithmetic only. It does not determine float or vessel stability, immersion equilibrium, free-surface effects, restoring moments, geometry, structural adequacy, material selection, pressure rating, installation conditions, safety, or approval."], errors: [], method: "FB = ρf·g·Vd · W = m·g · Fnet = FB − W" };
};

const calculateSubmergedPlane = (input: Record<string, string>): CalculationState => {
  const fluidDensity = finite(input.fluidDensity, "Declared fluid density");
  const width = finite(input.width, "Rectangle width");
  const height = finite(input.height, "Rectangle height");
  const centroidDepth = finite(input.centroidDepth, "Declared centroid depth");
  if (centroidDepth - height / 2 < 0) throw new Error("Declared centroid depth must keep the rectangular plane fully submerged below the free surface.");
  const area = width * height;
  const centroidalInertia = width * height ** 3 / 12;
  const resultantForce = fluidDensity * 9.80665 * centroidDepth * area;
  const centerOffset = centroidalInertia / (area * centroidDepth);
  const centerDepth = centroidDepth + centerOffset;
  return { values: [quantity("area", "Rectangle area", area, area, "m²"), quantity("resultantForce", "Hydrostatic resultant force", resultantForce, resultantForce / 1000, "kN"), quantity("centroidalInertia", "Rectangle centroidal second moment", centroidalInertia, centroidalInertia, "m⁴"), quantity("centerOffset", "Center-of-pressure offset below centroid", centerOffset, centerOffset, "m"), quantity("centerDepth", "Center-of-pressure depth below free surface", centerDepth, centerDepth, "m")], warnings: ["This is a fully submerged vertical rectangular-plane, constant-density hydrostatic arithmetic screen only. It does not analyze inclined or curved surfaces, variable density, free-surface motion, vessel or support structure, plate stress, fasteners, pressure rating, installation, safety, or approval."], errors: [], method: "F = ρgycA · Ix = bh³/12 · yCP = yc + Ix/(Ayc)" };
};

const calculateConvectionHeat = (input: Record<string, string>): CalculationState => {
  const coefficient = finite(input.coefficient, "Declared convection coefficient");
  const area = finite(input.area, "Declared heat-transfer area");
  const deltaT = finite(input.deltaT, "Declared temperature difference", false);
  const heatRate = coefficient * area * deltaT;
  return { values: [quantity("heatRate", "Declared convection heat rate", heatRate, heatRate, "W"), quantity("heatRateKw", "Declared convection heat rate", heatRate, heatRate / 1000, "kW"), quantity("conductance", "Declared convection conductance hA", coefficient * area, coefficient * area, "W/K")], warnings: ["This is user-entered convection coefficient arithmetic only. It does not derive a heat-transfer coefficient or correlation, determine flow regime, calculate a temperature field, model radiation, conduction, phase change, fins, contact resistance, material selection, service-temperature rating, equipment suitability, safety, or approval."], errors: [], method: "Q̇ = hAΔT" };
};

const calculateThermalResistance = (input: Record<string, string>): CalculationState => {
  const hotCoefficient = finite(input.hotCoefficient, "Declared hot-side convection coefficient");
  const hotArea = finite(input.hotArea, "Declared hot-side convection area");
  const wallThickness = finite(input.wallThickness, "Declared wall thickness") / 1000;
  const wallConductivity = finite(input.wallConductivity, "Declared wall conductivity");
  const wallArea = finite(input.wallArea, "Declared wall conduction area");
  const contactResistance = finite(input.contactResistance, "Declared contact resistance", false);
  const coldCoefficient = finite(input.coldCoefficient, "Declared cold-side convection coefficient");
  const coldArea = finite(input.coldArea, "Declared cold-side convection area");
  const heatRate = finite(input.heatRate, "Declared heat rate", false);
  if (contactResistance < 0) throw new Error("Declared contact resistance must not be negative.");
  const hotConvectionResistance = 1 / (hotCoefficient * hotArea);
  const wallResistance = wallThickness / (wallConductivity * wallArea);
  const coldConvectionResistance = 1 / (coldCoefficient * coldArea);
  const totalResistance = hotConvectionResistance + wallResistance + contactResistance + coldConvectionResistance;
  const totalTemperatureDifference = heatRate * totalResistance;
  return { values: [quantity("hotConvectionResistance", "Declared hot-side convection resistance", hotConvectionResistance, hotConvectionResistance, "K/W"), quantity("wallResistance", "Declared wall conduction resistance", wallResistance, wallResistance, "K/W"), quantity("coldConvectionResistance", "Declared cold-side convection resistance", coldConvectionResistance, coldConvectionResistance, "K/W"), quantity("totalResistance", "Declared series thermal resistance", totalResistance, totalResistance, "K/W"), quantity("totalTemperatureDifference", "Temperature difference at declared heat rate", totalTemperatureDifference, totalTemperatureDifference, "K")], warnings: ["This is a declared, one-dimensional series-resistance arithmetic screen. It does not derive convection coefficients, infer contact conditions, model radiation, phase change, parallel heat paths, thermal bridges, temperature-dependent properties, material selection, service-temperature rating, equipment suitability, safety, or approval."], errors: [], method: "Rtotal = 1/(hhAh) + L/(kAw) + Rc + 1/(hcAc) · ΔT = Q̇Rtotal" };
};

const calculateIdealGas = (input: Record<string, string>): CalculationState => {
  const pressure = finite(input.pressure, "Declared absolute pressure") * 1000;
  const temperature = finite(input.temperature, "Declared absolute temperature");
  const molarMass = finite(input.molarMass, "Declared molar mass") / 1000;
  const volume = finite(input.volume, "Declared volume");
  const universalGasConstant = 8.314462618;
  const moles = pressure * volume / (universalGasConstant * temperature);
  const mass = moles * molarMass;
  const density = mass / volume;
  const specificGasConstant = universalGasConstant / molarMass;
  return { values: [quantity("density", "Ideal-gas density", density, density, "kg/m³"), quantity("specificVolume", "Ideal-gas specific volume", 1 / density, 1 / density, "m³/kg"), quantity("amount", "Ideal-gas amount in declared volume", moles, moles, "mol"), quantity("mass", "Ideal-gas mass in declared volume", mass, mass, "kg"), quantity("specificGasConstant", "Specific gas constant from declared molar mass", specificGasConstant, specificGasConstant, "J/(kg·K)")], warnings: ["This is a user-entered ideal-gas equation-of-state arithmetic screen only. It does not convert gauge pressure, identify a gas, infer composition, model real-gas effects, phase change, mixtures, humidity, heat transfer, equipment selection, safety, operability, or approval."], errors: [], method: "pV = nRuT · ρ = pM/(RuT) = p/(RspecT)" };
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

const calculateRackPinion = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Moved mass");
  const friction = finite(input.friction, "Declared guide friction coefficient", false);
  const acceleration = finite(input.acceleration, "Declared linear acceleration", false);
  const externalForce = finite(input.externalForce, "Declared external axial force", false);
  const pinionDiameter = finite(input.pinionDiameter, "Pinion pitch diameter");
  const linearSpeed = finite(input.linearSpeed, "Requested linear speed");
  if (friction < 0 || friction > 1) throw new Error("Declared guide friction coefficient must be from 0 through 1.");
  if (acceleration < 0) throw new Error("Declared linear acceleration must not be negative.");
  const feedForce = mass * 9.80665 * friction + mass * acceleration + externalForce;
  if (feedForce <= 0) throw new Error("Calculated horizontal feed force must be greater than zero.");
  const torque = feedForce * pinionDiameter / 2000;
  const rpm = linearSpeed / (Math.PI * pinionDiameter / 1000) * 60;
  const power = feedForce * linearSpeed / 1000;
  return { values: [quantity("feedForce", "Horizontal feed force", feedForce, feedForce, "N"), quantity("linearSpeed", "Requested linear speed", linearSpeed, linearSpeed, "m/s"), quantity("torque", "Pinion torque", torque, torque, "N·m"), quantity("rpm", "Pinion speed at requested linear speed", rpm, rpm, "rpm"), quantity("power", "Mechanical linear power", power, power, "kW")], warnings: ["This is a horizontal, lumped-mass rack-and-pinion screen using user-entered friction, acceleration, external force, and pitch diameter. It excludes vertical/gravity axes, service factors, shock, gear mesh efficiency, tooth strength, backlash, lubrication, rack/pinion selection, gearbox or motor selection, rail loads, stiffness, positioning accuracy, controls, safety, and system approval."], errors: [], method: "Fr = mgμ + ma + Fe · Tp = Frdp/2 · np = 60v/(πdp) · P = Frv" };
};

const calculateBeltAxis = (input: Record<string, string>): CalculationState => {
  const mass = finite(input.mass, "Moved mass");
  const friction = finite(input.friction, "Declared guide friction coefficient", false);
  const pulleyDiameter = finite(input.pulleyDiameter, "Drive-pulley pitch diameter");
  const linearSpeed = finite(input.linearSpeed, "Requested linear speed");
  const efficiency = finite(input.efficiency, "Declared belt-axis efficiency");
  if (friction < 0 || friction > 1) throw new Error("Declared guide friction coefficient must be from 0 through 1.");
  if (efficiency > 100) throw new Error("Declared belt-axis efficiency must not exceed 100 percent.");
  const steadyForce = mass * 9.80665 * friction;
  const rpm = linearSpeed / (Math.PI * pulleyDiameter / 1000) * 60;
  const torque = steadyForce * pulleyDiameter / 2000 / (efficiency / 100);
  const power = steadyForce * linearSpeed / 1000;
  return { values: [quantity("steadyForce", "Steady guide-friction force", steadyForce, steadyForce, "N"), quantity("rpm", "Drive-pulley speed", rpm, rpm, "rpm"), quantity("torque", "Declared-efficiency drive torque", torque, torque, "N·m"), quantity("power", "Mechanical linear power", power, power, "kW")], warnings: ["This is a horizontal, steady-speed belt-axis screen using user-entered guide friction and efficiency. It excludes acceleration, belt stretch and tension, tooth engagement, pulley/belt selection, external process load, vertical/gravity axes, inertia, positioning accuracy, rail load, thermal/duty limits, motor or gearbox selection, controls, safety, and system approval."], errors: [], method: "Fa = mgμ · np = 60v/(πdp) · T = Fadp/(2η) · P = Fav" };
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

const calculateHydraulicCylinder = (input: Record<string, string>): CalculationState => {
  const bore = finite(input.bore, "Cylinder bore");
  const rod = finite(input.rod, "Rod diameter");
  const pressure = finite(input.pressure, "Declared working pressure");
  const stroke = finite(input.stroke, "Stroke");
  const flow = finite(input.flow, "Declared supply flow");
  if (rod >= bore) throw new Error("Rod diameter must be smaller than cylinder bore.");
  const boreArea = Math.PI * bore ** 2 / 4;
  const annulusArea = boreArea - Math.PI * rod ** 2 / 4;
  const pressurePa = pressure * 1e5;
  const extendForce = pressurePa * boreArea * 1e-6;
  const retractForce = pressurePa * annulusArea * 1e-6;
  const extendVolume = boreArea * stroke / 1e6;
  const retractVolume = annulusArea * stroke / 1e6;
  const extendSpeed = flow * 1e6 / 60 / boreArea;
  const retractSpeed = flow * 1e6 / 60 / annulusArea;
  const extendTime = stroke / extendSpeed;
  const retractTime = stroke / retractSpeed;
  return { values: [quantity("extendForce", "Ideal extension force", extendForce, extendForce / 1000, "kN"), quantity("retractForce", "Ideal retraction force", retractForce, retractForce / 1000, "kN"), quantity("extendVolume", "Extension swept volume", extendVolume, extendVolume, "L"), quantity("retractVolume", "Retraction swept volume", retractVolume, retractVolume, "L"), quantity("extendSpeed", "Ideal extension speed", extendSpeed, extendSpeed, "mm/s"), quantity("retractSpeed", "Ideal retraction speed", retractSpeed, retractSpeed, "mm/s"), quantity("extendTime", "Ideal extension travel time", extendTime, extendTime, "s"), quantity("retractTime", "Ideal retraction travel time", retractTime, retractTime, "s")], warnings: ["This is ideal double-acting cylinder arithmetic using declared pressure and steady delivered flow. It excludes pressure drops, friction/seal losses, side loading, rod buckling, cushioning, compressibility, valve dynamics, acceleration, mounting, structural loads, duty cycle, temperature, component ratings, and circuit or safety design."], errors: [], method: "Ap = πD²/4 · Aa = Ap−πd²/4 · F = pA · V = As · v = Q/A · t = s/v" };
};

const calculateHydraulicPump = (input: Record<string, string>): CalculationState => {
  const displacement = finite(input.displacement, "Pump displacement");
  const speed = finite(input.speed, "Pump shaft speed");
  const pressure = finite(input.pressure, "Declared pressure rise");
  const volumetricEfficiency = finite(input.volumetricEfficiency, "Declared volumetric efficiency");
  const overallEfficiency = finite(input.overallEfficiency, "Declared overall efficiency");
  if (volumetricEfficiency > 100 || overallEfficiency > 100) throw new Error("Declared efficiencies must not exceed 100 percent.");
  const idealFlow = displacement * speed / 1000;
  const actualFlow = idealFlow * volumetricEfficiency / 100;
  const hydraulicPower = pressure * actualFlow / 600;
  const shaftPower = hydraulicPower / (overallEfficiency / 100);
  const theoreticalTorque = pressure * 1e5 * displacement * 1e-6 / (2 * Math.PI);
  return { values: [quantity("idealFlow", "Ideal outlet flow", idealFlow, idealFlow, "L/min"), quantity("actualFlow", "Declared-efficiency outlet flow", actualFlow, actualFlow, "L/min"), quantity("hydraulicPower", "Hydraulic output power", hydraulicPower, hydraulicPower, "kW"), quantity("shaftPower", "Declared-efficiency shaft input power", shaftPower, shaftPower, "kW"), quantity("theoreticalTorque", "Theoretical pressure-displacement input torque", theoreticalTorque, theoreticalTorque, "N·m")], warnings: ["This is a steady positive-displacement pump screen using user-entered displacement, pressure, and efficiencies. It does not select a pump, motor, drive, relief setting, fluid, line, reservoir, cooling method, or rating; model cavitation, leakage beyond the declared efficiency, pressure ripple, heat balance, transient load, or component/system safety; or approve a fluid-power system."], errors: [], method: "Qideal = Vd·n · Qdeclared = ηvQideal · Phyd = ΔpQ/600 · Pin = Phyd/ηo · Ttheory = ΔpVd/(2π)" };
};

const calculateHydraulicMotor = (input: Record<string, string>): CalculationState => {
  const displacement = finite(input.displacement, "Motor displacement");
  const pressure = finite(input.pressure, "Declared pressure drop");
  const flow = finite(input.flow, "Declared inlet flow");
  const mechanicalEfficiency = finite(input.mechanicalEfficiency, "Declared mechanical efficiency");
  const volumetricEfficiency = finite(input.volumetricEfficiency, "Declared volumetric efficiency");
  if (mechanicalEfficiency > 100 || volumetricEfficiency > 100) throw new Error("Declared efficiencies must not exceed 100 percent.");
  const theoreticalTorque = pressure * 1e5 * displacement * 1e-6 / (2 * Math.PI);
  const actualTorque = theoreticalTorque * mechanicalEfficiency / 100;
  const idealSpeed = flow * 1000 / displacement;
  const actualSpeed = idealSpeed * volumetricEfficiency / 100;
  const hydraulicPower = pressure * flow / 600;
  const shaftPower = actualTorque * actualSpeed * 2 * Math.PI / 60 / 1000;
  return { values: [quantity("theoreticalTorque", "Theoretical shaft torque", theoreticalTorque, theoreticalTorque, "N·m"), quantity("actualTorque", "Declared-efficiency shaft torque", actualTorque, actualTorque, "N·m"), quantity("idealSpeed", "Ideal shaft speed", idealSpeed, idealSpeed, "rpm"), quantity("actualSpeed", "Declared-efficiency shaft speed", actualSpeed, actualSpeed, "rpm"), quantity("hydraulicPower", "Hydraulic input power", hydraulicPower, hydraulicPower, "kW"), quantity("shaftPower", "Declared-efficiency shaft output", shaftPower, shaftPower, "kW")], warnings: ["This is a steady positive-displacement hydraulic-motor screen using user-entered displacement, pressure, flow, and efficiencies. It does not select a motor, evaluate starting torque, load matching, speed limits, pressure ratings, leakage beyond the declared efficiencies, fluid condition, temperature, cavitation, heat, braking, controls, structural mounting, system transients, or safety/compliance."], errors: [], method: "Ttheory = ΔpVd/(2π) · Tdeclared = ηmTtheory · nideal = Q/Vd · ndeclar​ed = ηvnideal · Pshaft = Tω" };
};

const calculateHydraulicLine = (input: Record<string, string>): CalculationState => {
  const flow = finite(input.flow, "Declared line flow");
  const insideDiameter = finite(input.insideDiameter, "Line inside diameter");
  const lineLength = finite(input.lineLength, "Straight line length", false);
  const frictionFactor = finite(input.frictionFactor, "Declared Darcy friction factor");
  const fluidDensity = finite(input.fluidDensity, "Declared fluid density");
  const referenceVelocity = finite(input.referenceVelocity, "Declared reference velocity");
  if (frictionFactor > 1) throw new Error("Declared Darcy friction factor must not exceed 1 in this bounded screen.");
  const area = Math.PI * (insideDiameter / 1000) ** 2 / 4;
  const velocity = flow / 60000 / area;
  const majorLossPa = frictionFactor * (lineLength / (insideDiameter / 1000)) * fluidDensity * velocity ** 2 / 2;
  const referenceRatio = velocity / referenceVelocity;
  return { values: [quantity("area", "Internal flow area", area, area * 1e6, "mm²"), quantity("velocity", "Mean line velocity", velocity, velocity, "m/s"), quantity("majorLoss", "Declared-fluid Darcy major loss", majorLossPa, majorLossPa / 1000, "kPa"), quantity("referenceRatio", "Mean velocity / declared reference", referenceRatio, referenceRatio * 100, "%")], warnings: ["This calculates mean velocity and a user-factor Darcy major loss in one constant-ID, straight, steady hydraulic line. It does not select hose, tube, or pipe size; prescribe an acceptable velocity or friction factor; calculate Reynolds number, fittings/minor losses, bends, networks, elevation, surge, cavitation, viscosity/temperature variation, pressure rating, routing, hydraulic-system safety, or approval."], errors: [], method: "A = πDi²/4 · vmean = Q/A · Δpmajor = f(L/Di)(ρv²/2) · comparison = vmean/vref" };
};

const calculateShaftCombined = (input: Record<string, string>): CalculationState => {
  const bendingMoment = finite(input.bendingMoment, "Bending moment", false) * 1000;
  const torque = finite(input.torque, "Applied torque", false) * 1000;
  const diameter = finite(input.diameter, "Solid shaft diameter");
  const bendingStress = 32 * bendingMoment / (Math.PI * diameter ** 3);
  const torsionalShear = 16 * torque / (Math.PI * diameter ** 3);
  const center = bendingStress / 2;
  const radius = Math.hypot(center, torsionalShear);
  const principalOne = center + radius;
  const principalTwo = center - radius;
  const vonMises = Math.sqrt(bendingStress ** 2 + 3 * torsionalShear ** 2);
  return { values: [quantity("bendingStress", "Outer-fiber bending stress", bendingStress, bendingStress, "MPa"), quantity("torsionalShear", "Outer-fiber torsional shear", torsionalShear, torsionalShear, "MPa"), quantity("principalOne", "Maximum principal stress", principalOne, principalOne, "MPa"), quantity("principalTwo", "Minimum principal stress", principalTwo, principalTwo, "MPa"), quantity("vonMises", "Plane-stress von Mises equivalent", vonMises, vonMises, "MPa")], warnings: ["This is an elastic outer-fiber point-stress screen for one solid circular shaft section. It excludes axial load, stress concentrations, keyways, fillets, fluctuating loading, fatigue, material allowables, deflection, bearing reaction, torsional vibration, buckling, and design approval."], errors: [], method: "σb = 32M/(πd³) · τt = 16T/(πd³) · σvm = √(σb² + 3τt²)" };
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

const calculatePressFit = (input: Record<string, string>): CalculationState => {
  const shaftDiameter = finite(input.shaftDiameter, "Shaft diameter");
  const holeDiameter = finite(input.holeDiameter, "Hub bore diameter");
  const hubOuterDiameter = finite(input.hubOuterDiameter, "Hub outer diameter");
  const contactLength = finite(input.contactLength, "Contact length");
  const modulus = finite(input.modulus, "Declared elastic modulus");
  const friction = finite(input.friction, "Declared friction coefficient", false);
  if (shaftDiameter <= holeDiameter) throw new Error("Shaft diameter must exceed hub bore diameter for this press-fit screen.");
  if (hubOuterDiameter <= holeDiameter) throw new Error("Hub outer diameter must exceed the hub bore diameter.");
  if (friction <= 0 || friction > 1) throw new Error("Declared friction coefficient must be greater than 0 and no greater than 1.");
  const interference = shaftDiameter - holeDiameter;
  const geometryFactor = (hubOuterDiameter ** 2 - holeDiameter ** 2) / (hubOuterDiameter ** 2 + holeDiameter ** 2);
  const contactPressure = interference / holeDiameter * modulus * 1000 * geometryFactor;
  const frictionForce = Math.PI * (holeDiameter / 1000) * (contactLength / 1000) * contactPressure * 1e6 * friction;
  const holdingTorque = frictionForce * (holeDiameter / 2000);
  return { values: [quantity("interference", "Diametral interference", interference, interference, "mm"), quantity("geometryFactor", "Reference hub geometry factor", geometryFactor, geometryFactor, "—"), quantity("contactPressure", "Reference contact pressure", contactPressure, contactPressure, "MPa"), quantity("frictionForce", "Friction holding / assembly-force estimate", frictionForce, frictionForce / 1000, "kN"), quantity("holdingTorque", "Friction holding-torque estimate", holdingTorque, holdingTorque, "N·m")], warnings: ["This follows a simplified single-modulus, Lame-style hub geometry-factor relation with uniform interface pressure and user-entered friction. It does not split shaft and hub compliance, select a tolerance, assess yield or fit class, model temperature/assembly method/surface texture, include centrifugal unloading or dynamic/fatigue behavior, rate equipment, or approve a joint."], errors: [], method: "δ = Ds−Di · p = (δ/Di)E[(Do²−Di²)/(Do²+Di²)] · Fμ = πDiLpμ · Tμ = FμDi/2" };
};

const calculateJointSeparation = (input: Record<string, string>): CalculationState => {
  const preload = finite(input.preload, "Declared preload");
  const boltStiffness = finite(input.boltStiffness, "Bolt axial stiffness");
  const memberStiffness = finite(input.memberStiffness, "Member axial stiffness");
  const externalLoad = finite(input.externalLoad, "External axial separating load", false);
  const loadFraction = boltStiffness / (boltStiffness + memberStiffness);
  const boltLoadIncrease = loadFraction * externalLoad;
  const clampLoss = (1 - loadFraction) * externalLoad;
  const residualClamp = preload - clampLoss;
  const separationLoad = preload / (1 - loadFraction);
  const separationReserve = separationLoad - externalLoad;
  return { values: [quantity("loadFraction", "Bolt load fraction C", loadFraction, loadFraction * 100, "%"), quantity("boltLoadIncrease", "External-load share carried by bolt", boltLoadIncrease, boltLoadIncrease, "kN"), quantity("residualClamp", "Residual clamp force", residualClamp, residualClamp, "kN"), quantity("separationLoad", "Ideal separation-load threshold", separationLoad, separationLoad, "kN"), quantity("separationReserve", "Threshold minus stated external load", separationReserve, separationReserve, "kN")], warnings: ["This is a one-bolt, axial, linear parallel-spring screen with user-entered equivalent stiffnesses. It does not infer stiffness from geometry, distribute a system load among bolts, account for preload variation or relaxation, nonlinear contact, shear, bending, thermal effects, fatigue, gasket behavior, joint slip, safety factors, or prove that a joint will not separate."], errors: [], method: "C = kb/(kb+km) · ΔFb = CP · Fm = Fp−(1−C)P · Psep = Fp/(1−C)" };
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

const calculateCantileverFrame = (input: Record<string, string>): CalculationState => {
  const lateralLoad = finite(input.lateralLoad, "Declared lateral top load");
  const columnHeight = finite(input.columnHeight, "Column height") / 1000;
  const baseShear = lateralLoad;
  const baseMoment = lateralLoad * columnHeight;
  return { values: [quantity("baseShear", "Base shear magnitude", baseShear, baseShear, "N"), quantity("baseMoment", "Base couple-moment magnitude", baseMoment, baseMoment, "N·m")], warnings: ["This is one vertical cantilever-frame free-body equilibrium only: a single stated lateral top-load magnitude, base shear, and fixed-base couple moment. It excludes portal-frame redistribution, axial load, member stiffness, deflection, stress, connection behavior, second-order effects, stability, code requirements, safety factors, and approval."], errors: [], method: "Vbase = H · Mbase = Hh" };
};

const calculatePlateBuckling = (input: Record<string, string>): CalculationState => {
  const modulus = finite(input.modulus, "Declared elastic modulus") * 1e9;
  const poissonRatio = finite(input.poissonRatio, "Declared Poisson ratio", false);
  const thickness = finite(input.thickness, "Declared plate thickness");
  const referenceWidth = finite(input.referenceWidth, "Declared reference width");
  const bucklingCoefficient = finite(input.bucklingCoefficient, "Declared buckling coefficient");
  if (poissonRatio <= -1 || poissonRatio >= 1) throw new Error("Declared Poisson ratio must be strictly greater than −1 and less than 1.");
  const elasticPlateStiffnessTerm = Math.PI ** 2 * modulus / (12 * (1 - poissonRatio ** 2));
  const criticalStress = bucklingCoefficient * elasticPlateStiffnessTerm * (thickness / referenceWidth) ** 2;
  return { values: [quantity("criticalStress", "Elastic critical buckling stress", criticalStress / 1e6, criticalStress / 1e6, "MPa"), quantity("slendernessRatio", "Declared thickness / reference-width ratio", thickness / referenceWidth, thickness / referenceWidth, "—"), quantity("elasticPlateStiffnessTerm", "Elastic plate stiffness term", elasticPlateStiffnessTerm / 1e6, elasticPlateStiffnessTerm / 1e6, "MPa")], warnings: ["This calculates only the declared simply supported isotropic elastic plate-buckling relation using a user-entered coefficient. It does not select boundary conditions, load case, reference width, or buckling coefficient; and excludes plasticity, residual stress, geometric imperfections, post-buckling, stiffeners, connections, code requirements, safety factors, adequacy, and approval."], errors: [], method: "σcr = kπ²E/[12(1−ν²)](t/b)²" };
};

const calculateScrewCriticalSpeed = (input: Record<string, string>): CalculationState => {
  const rootDiameter = finite(input.rootDiameter, "Declared screw root diameter");
  const unsupportedLength = finite(input.unsupportedLength, "Declared unsupported length");
  const endFixityFactor = finite(input.endFixityFactor, "Declared end-fixity factor");
  const operatingSpeed = finite(input.operatingSpeed, "Declared operating speed");
  const rootDiameterInches = rootDiameter / 25.4;
  const unsupportedLengthInches = unsupportedLength / 25.4;
  const criticalSpeed = endFixityFactor * 4.76e6 * rootDiameterInches / unsupportedLengthInches ** 2;
  const operatingRatio = operatingSpeed / criticalSpeed;
  return { values: [quantity("criticalSpeed", "Calculated critical speed", criticalSpeed, criticalSpeed, "rpm"), quantity("operatingRatio", "Declared operating / critical-speed ratio", operatingRatio, operatingRatio, "—"), quantity("rootToLengthRatio", "Declared root-diameter / unsupported-length ratio", rootDiameter / unsupportedLength, rootDiameter / unsupportedLength, "—")], warnings: ["This applies the cited manufacturer critical-speed relation with user-entered root diameter, unsupported length, and end-fixity factor. It does not select a screw, bearing support, or fixity factor; predict actual shaft whirl/resonance; model straightness, preload, bearing stiffness, buckling, acceleration, drive control, load, fatigue, life, safety factor, suitability, or approval."], errors: [], method: "ncrit = Cs·4.76×10⁶·dr(in)/L(in)² · r = ndeclared/ncrit" };
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

const calculateBallScrewLife = (input: Record<string, string>): CalculationState => {
  const dynamicRating = finite(input.dynamicRating, "Declared axial dynamic rating");
  const axialLoad = finite(input.axialLoad, "Declared applied axial load");
  const lead = finite(input.lead, "Declared screw lead");
  const speed = finite(input.speed, "Declared screw speed");
  const travelFraction = finite(input.travelFraction, "Declared travel-time fraction");
  if (travelFraction > 100) throw new Error("Declared travel-time fraction must not exceed 100 percent.");
  const ratingToLoadRatio = dynamicRating / axialLoad;
  const nominalLifeRevolutions = ratingToLoadRatio ** 3 * 1e6;
  const idealTravelDistance = nominalLifeRevolutions * lead / 1e6;
  const rotatingTimeHours = nominalLifeRevolutions / (speed * 60);
  const literalElapsedTimeHours = rotatingTimeHours / (travelFraction / 100);
  return { values: [quantity("nominalLifeRevolutions", "Nominal life", nominalLifeRevolutions, nominalLifeRevolutions, "rev"), quantity("idealTravelDistance", "Ideal travel distance", idealTravelDistance, idealTravelDistance, "km"), quantity("rotatingTimeHours", "Literal rotating time", rotatingTimeHours, rotatingTimeHours, "h"), quantity("literalElapsedTimeHours", "Literal elapsed time at declared travel fraction", literalElapsedTimeHours, literalElapsedTimeHours, "h"), quantity("ratingToLoadRatio", "Declared dynamic-rating / axial-load ratio", ratingToLoadRatio, ratingToLoadRatio, "—")], warnings: ["This applies the cited constant-direction axial ball-screw nominal-life relation using user-entered dynamic rating and axial load, then makes ideal lead/speed/travel-fraction conversions. It does not derive equivalent loads, model shocks, vibration, fluctuating duty, mounting, lubrication, alignment, preload, screw/nut selection, safety, suitability, or approval."], errors: [], method: "L10 = (Ca/Fa)³·10⁶ rev · s = L10·Ph · telapsed = L10/[60n·ftravel]" };
};

const calculateDriveTrain = (input: Record<string, string>): CalculationState => {
  const inputSpeed = finite(input.inputSpeed, "Declared input speed");
  const inputTorque = finite(input.inputTorque, "Declared input torque");
  const stage1Ratio = finite(input.stage1Ratio, "Declared stage 1 reduction ratio");
  const stage2Ratio = finite(input.stage2Ratio, "Declared stage 2 reduction ratio");
  const stage3Ratio = finite(input.stage3Ratio, "Declared stage 3 reduction ratio");
  const stage1Efficiency = finite(input.stage1Efficiency, "Declared stage 1 efficiency");
  const stage2Efficiency = finite(input.stage2Efficiency, "Declared stage 2 efficiency");
  const stage3Efficiency = finite(input.stage3Efficiency, "Declared stage 3 efficiency");
  if (stage1Efficiency > 1 || stage2Efficiency > 1 || stage3Efficiency > 1) throw new Error("Each declared stage efficiency must not exceed 1.");
  const totalRatio = stage1Ratio * stage2Ratio * stage3Ratio;
  const totalEfficiency = stage1Efficiency * stage2Efficiency * stage3Efficiency;
  const outputSpeed = inputSpeed / totalRatio;
  const outputTorque = inputTorque * totalRatio * totalEfficiency;
  const inputPower = inputTorque * inputSpeed * (2 * Math.PI / 60);
  const outputPower = inputPower * totalEfficiency;
  const arithmeticLoss = inputPower - outputPower;
  return { values: [quantity("totalRatio", "Declared total reduction ratio", totalRatio, totalRatio, "—"), quantity("totalEfficiency", "Declared total efficiency", totalEfficiency, totalEfficiency * 100, "%"), quantity("outputSpeed", "Literal output speed", outputSpeed, outputSpeed, "rpm"), quantity("outputTorque", "Literal output torque", outputTorque, outputTorque, "N·m"), quantity("inputPower", "Literal input power", inputPower / 1000, inputPower / 1000, "kW"), quantity("outputPower", "Literal output power", outputPower / 1000, outputPower / 1000, "kW"), quantity("arithmeticLoss", "Declared-efficiency arithmetic loss", arithmeticLoss / 1000, arithmeticLoss / 1000, "kW")], warnings: ["This multiplies user-entered series ratios and efficiencies, then applies ideal speed/torque/power relationships. It does not select a gearbox or stage configuration; predict individual loss, efficiency, backlash, stiffness, lubrication, temperature, inertia, dynamics, rating, reliability, safety, suitability, or approval."], errors: [], method: "rtotal = r1r2r3 · ηtotal = η1η2η3 · n2 = n1/rtotal · T2 = T1rtotalηtotal" };
};

const calculateRmsDutyTorque = (input: Record<string, string>): CalculationState => {
  const torque1 = finite(input.torque1, "Declared segment 1 torque", false);
  const duration1 = finite(input.duration1, "Declared segment 1 duration");
  const torque2 = finite(input.torque2, "Declared segment 2 torque", false);
  const duration2 = finite(input.duration2, "Declared segment 2 duration");
  const torque3 = finite(input.torque3, "Declared segment 3 torque", false);
  const duration3 = finite(input.duration3, "Declared segment 3 duration");
  const cycleTime = duration1 + duration2 + duration3;
  const rmsTorque = Math.sqrt((torque1 ** 2 * duration1 + torque2 ** 2 * duration2 + torque3 ** 2 * duration3) / cycleTime);
  const absolutePeakTorque = Math.max(Math.abs(torque1), Math.abs(torque2), Math.abs(torque3));
  const signedMeanTorque = (torque1 * duration1 + torque2 * duration2 + torque3 * duration3) / cycleTime;
  return { values: [quantity("cycleTime", "Declared duty-cycle time", cycleTime, cycleTime, "s"), quantity("rmsTorque", "Declared RMS torque", rmsTorque, rmsTorque, "N·m"), quantity("absolutePeakTorque", "Declared absolute peak torque", absolutePeakTorque, absolutePeakTorque, "N·m"), quantity("signedMeanTorque", "Declared signed mean torque", signedMeanTorque, signedMeanTorque, "N·m")], warnings: ["This applies a three-segment root-mean-square torque relation to user-entered constant torque/time values. It does not derive an axis motion profile or load, determine motor/drive thermal capacity, compare torque-speed curves, infer a duty cycle, select a motor/drive, establish safety, suitability, or approval."], errors: [], method: "Trms = √[(T1²t1 + T2²t2 + T3²t3)/(t1 + t2 + t3)]" };
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

const calculateGripperHold = (input: Record<string, string>): CalculationState => {
  const payloadMass = finite(input.payloadMass, "Declared payload mass");
  const verticalAcceleration = finite(input.verticalAcceleration, "Declared upward acceleration", false);
  const frictionCoefficient = finite(input.frictionCoefficient, "Declared jaw / payload friction");
  const jawCount = finite(input.jawCount, "Declared gripping-jaw count");
  const multiplier = finite(input.multiplier, "Declared force multiplier");
  if (frictionCoefficient > 1) throw new Error("Declared jaw / payload friction must not exceed 1.");
  if (!Number.isInteger(jawCount)) throw new Error("Declared gripping-jaw count must be a whole number.");
  const verticalLoad = payloadMass * (9.80665 + verticalAcceleration);
  const totalGripForce = verticalLoad * multiplier / frictionCoefficient;
  const forcePerJaw = totalGripForce / jawCount;
  return { values: [quantity("verticalLoad", "Declared vertical payload load", verticalLoad, verticalLoad, "N"), quantity("totalGripForce", "Declared total normal gripping force", totalGripForce, totalGripForce, "N"), quantity("forcePerJaw", "Literal normal-force share per jaw", forcePerJaw, forcePerJaw, "N"), quantity("forceMultiplier", "Declared force multiplier", multiplier, multiplier, "—")], warnings: ["This applies a declared friction-only vertical-hold relation for equally sharing parallel grip contacts. It does not select a gripper, jaw, pad, pressure, or actuator; calculate contact geometry/stress, lateral or moment loads, compliance, force curves, dynamic shock, payload security, safety, suitability, or approval."], errors: [], method: "Fgrip = m(g + a)·S/μ · Fj = Fgrip/z" };
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

const calculateRobotReach = (input: Record<string, string>): CalculationState => {
  const targetX = finite(input.targetX, "Declared target X offset", false);
  const targetY = finite(input.targetY, "Declared target Y offset", false);
  const targetZ = finite(input.targetZ, "Declared target Z offset", false);
  const referenceReach = finite(input.referenceReach, "Declared radial reference reach");
  const radialDistance = Math.sqrt(targetX ** 2 + targetY ** 2 + targetZ ** 2);
  const referenceRatio = radialDistance / referenceReach;
  return { values: [quantity("radialDistance", "Literal target radial distance", radialDistance, radialDistance, "mm"), quantity("referenceReach", "Declared radial reference reach", referenceReach, referenceReach, "mm"), quantity("referenceRatio", "Literal distance / reference-reach ratio", referenceRatio, referenceRatio, "—")], warnings: ["This calculates only a target radial distance and literal comparison to a user-entered reference reach. It is not a six-axis robot workspace, pose, orientation, collision, joint-limit, singularity, path, payload, reachability, safety, suitability, or approval result."], errors: [], method: "r = √(x² + y² + z²) · rratio = r/Rref" };
};

const calculateRobotPayloadMoment = (input: Record<string, string>): CalculationState => {
  const payloadMass = finite(input.payloadMass, "Declared payload mass");
  const cogOffset = finite(input.cogOffset, "Declared flange-to-CoG offset");
  const gravityForce = payloadMass * 9.80665;
  const staticMoment = gravityForce * (cogOffset / 1000);
  return { values: [quantity("gravityForce", "Literal payload gravity force", gravityForce, gravityForce, "N"), quantity("staticMoment", "Literal static weight moment", staticMoment, staticMoment, "N·m"), quantity("cogOffset", "Declared flange-to-CoG offset", cogOffset, cogOffset, "mm")], warnings: ["This applies static gravity force and a declared flange-to-CoG lever arm. It does not compare a result to any robot payload/moment curve or capacity; calculate acceleration, inertia, motion, mounting, stability, safety, suitability, or approval."], errors: [], method: "Fg = m·g · Mstatic = Fg·e" };
};

const calculateRotaryIndexing = (input: Record<string, string>): CalculationState => {
  const indexAngle = finite(input.indexAngle, "Declared index angle");
  const moveTime = finite(input.moveTime, "Declared move time");
  const systemInertia = finite(input.systemInertia, "Declared table-plus-load inertia");
  const indexAngleRad = indexAngle * Math.PI / 180;
  const averageAngularSpeed = indexAngleRad / moveTime;
  const indexesPerMinute = 60 / moveTime;
  const kineticEnergy = 0.5 * systemInertia * averageAngularSpeed ** 2;
  return { values: [quantity("indexAngleRad", "Declared index angle in radians", indexAngleRad, indexAngleRad, "rad"), quantity("averageAngularSpeed", "Ideal average angular speed", averageAngularSpeed, averageAngularSpeed, "rad/s"), quantity("indexesPerMinute", "Literal move-only index rate", indexesPerMinute, indexesPerMinute, "indexes/min"), quantity("kineticEnergy", "Rotational kinetic energy at average speed", kineticEnergy, kineticEnergy, "J")], warnings: ["This applies only declared index-angle, move-time, and table-plus-load-inertia arithmetic. It excludes acceleration profile, peak/RMS torque, friction, gearing, motor/table selection, capacity, position accuracy, dwell/process timing, safety, suitability, and approval."], errors: [], method: "θ = α·π/180 · ωavg = θ/tmove · rate(move-only) = 60/tmove · KE = ½Iωavg²" };
};

const calculatePneumaticDemandBudget = (input: Record<string, string>): CalculationState => {
  const normalizedAirPerCycle = finite(input.normalizedAirPerCycle, "Declared normalized air demand per cycle");
  const cycleRate = finite(input.cycleRate, "Declared cycle rate per device");
  const activeDeviceCount = finite(input.activeDeviceCount, "Declared active-device count");
  const dutyFraction = finite(input.dutyFraction, "Declared active-time fraction");
  const referenceSupplyFlow = finite(input.referenceSupplyFlow, "Declared reference supply flow");
  if (!Number.isInteger(activeDeviceCount)) throw new Error("Declared active-device count must be a whole number.");
  if (dutyFraction > 100) throw new Error("Declared active-time fraction must not exceed 100 percent.");
  const aggregateCycleRate = cycleRate * activeDeviceCount * dutyFraction / 100;
  const averageNormalizedFlow = normalizedAirPerCycle * aggregateCycleRate;
  const referenceFlowRatio = averageNormalizedFlow / referenceSupplyFlow;
  return { values: [quantity("aggregateCycleRate", "Literal aggregate active cycle rate", aggregateCycleRate, aggregateCycleRate, "cycles/min"), quantity("averageNormalizedFlow", "Literal average normalized air demand", averageNormalizedFlow, averageNormalizedFlow, "NL/min"), quantity("referenceSupplyFlow", "Declared reference supply flow", referenceSupplyFlow, referenceSupplyFlow, "NL/min"), quantity("referenceFlowRatio", "Literal demand / reference-flow ratio", referenceFlowRatio, referenceFlowRatio, "—")], warnings: ["This aggregates only user-declared normalized air demand, cycle rate, active-device count, and active-time fraction. It does not derive cylinder consumption; select or size a compressor, FRL, tubing, valve, or vacuum generator; model pressure-drop networks, air storage, leaks, duty transients, compressor curves, air quality, capacity, safety, suitability, or approval."], errors: [], method: "nactive = ncycle·z·D/100 · Qavg = qcycle·nactive · ratio = Qavg/Qref" };
};

const calculateHydraulicLossBudget = (input: Record<string, string>): CalculationState => {
  const pressureDrop = finite(input.pressureDrop, "Declared pressure drop");
  const flow = finite(input.flow, "Declared hydraulic flow");
  const activeTimeFraction = finite(input.activeTimeFraction, "Declared active-time fraction");
  if (activeTimeFraction > 100) throw new Error("Declared active-time fraction must not exceed 100 percent.");
  const lossPower = pressureDrop * flow / 600;
  const averageLossPower = lossPower * activeTimeFraction / 100;
  const lossEnergyPerHour = averageLossPower;
  return { values: [quantity("lossPower", "Literal hydraulic pressure-drop power", lossPower, lossPower, "kW"), quantity("averageLossPower", "Literal active-time-scaled loss power", averageLossPower, averageLossPower, "kW"), quantity("lossEnergyPerHour", "Literal loss energy per elapsed hour", lossEnergyPerHour, lossEnergyPerHour, "kWh/elapsed h"), quantity("activeTimeFraction", "Declared active-time fraction", activeTimeFraction, activeTimeFraction, "%")], warnings: ["This multiplies only a declared pressure drop by a declared flow, then scales the result by a declared active-time fraction. It does not select a pump, valve, hose, reservoir, accumulator, cooler, or component; infer system efficiency; model networks, temperature, fluid properties, accumulators, heat rejection, duty cycles beyond the stated scalar fraction, capacity, safety, suitability, or approval."], errors: [], method: "Ploss = Δp·Q/600 · Pavg = Ploss·D/100 · Eper elapsed hour = Pavg·1 h" };
};

const calculateVacuumLeakageBudget = (input: Record<string, string>): CalculationState => {
  const leakagePerPoint = finite(input.leakagePerPoint, "Declared normalized leakage per active point");
  const activePointCount = finite(input.activePointCount, "Declared active vacuum-point count");
  const activeTimeFraction = finite(input.activeTimeFraction, "Declared active-time fraction");
  const referenceSuctionFlow = finite(input.referenceSuctionFlow, "Declared reference suction flow");
  if (!Number.isInteger(activePointCount)) throw new Error("Declared active vacuum-point count must be a whole number.");
  if (activeTimeFraction > 100) throw new Error("Declared active-time fraction must not exceed 100 percent.");
  const averageLeakageDemand = leakagePerPoint * activePointCount * activeTimeFraction / 100;
  const referenceSuctionRatio = averageLeakageDemand / referenceSuctionFlow;
  const leakageVolumePerHour = averageLeakageDemand * 60;
  return { values: [quantity("averageLeakageDemand", "Literal average normalized leakage demand", averageLeakageDemand, averageLeakageDemand, "NL/min"), quantity("referenceSuctionFlow", "Declared reference suction flow", referenceSuctionFlow, referenceSuctionFlow, "NL/min"), quantity("referenceSuctionRatio", "Literal leakage demand / reference-flow ratio", referenceSuctionRatio, referenceSuctionRatio, "—"), quantity("leakageVolumePerHour", "Literal leakage volume per elapsed hour", leakageVolumePerHour, leakageVolumePerHour, "NL/elapsed h")], warnings: ["This aggregates only user-declared normalized leakage demand, active vacuum-point count, and active-time fraction. It does not infer leakage from workpiece geometry, surface condition, conductance, porous materials, vacuum level, response time, or test data; select a vacuum generator, pump, pad, or number of pads; assess capacity, safety, suitability, or approval."], errors: [], method: "Qleak,avg = qleak·z·D/100 · ratio = Qleak,avg/Qref · Vper elapsed hour = 60·Qleak,avg" };
};

const calculateHydraulicAccumulatorState = (input: Record<string, string>): CalculationState => {
  const prechargePressure = finite(input.prechargePressure, "Declared precharge pressure");
  const maximumWorkingPressure = finite(input.maximumWorkingPressure, "Declared maximum working pressure");
  const minimumWorkingPressure = finite(input.minimumWorkingPressure, "Declared minimum working pressure");
  const prechargeGasVolume = finite(input.prechargeGasVolume, "Declared precharge gas volume");
  const polytropicExponent = finite(input.polytropicExponent, "Declared polytropic exponent");
  if (minimumWorkingPressure <= prechargePressure) throw new Error("Declared minimum working pressure must exceed declared precharge pressure.");
  if (maximumWorkingPressure <= minimumWorkingPressure) throw new Error("Declared maximum working pressure must exceed declared minimum working pressure.");
  if (polytropicExponent < 1 || polytropicExponent > 1.67) throw new Error("Declared polytropic exponent must be from 1 through 1.67.");
  const gasVolumeAtMaximum = prechargeGasVolume * (prechargePressure / maximumWorkingPressure) ** (1 / polytropicExponent);
  const gasVolumeAtMinimum = prechargeGasVolume * (prechargePressure / minimumWorkingPressure) ** (1 / polytropicExponent);
  const usableFluidVolume = gasVolumeAtMinimum - gasVolumeAtMaximum;
  return { values: [quantity("gasVolumeAtMaximum", "Literal gas volume at declared maximum pressure", gasVolumeAtMaximum, gasVolumeAtMaximum, "L"), quantity("gasVolumeAtMinimum", "Literal gas volume at declared minimum pressure", gasVolumeAtMinimum, gasVolumeAtMinimum, "L"), quantity("usableFluidVolume", "Literal usable fluid-volume difference", usableFluidVolume, usableFluidVolume, "L"), quantity("polytropicExponent", "Declared polytropic exponent", polytropicExponent, polytropicExponent, "—")], warnings: ["This applies a user-declared ideal polytropic gas-state relation to declared absolute pressures and precharge gas volume. It does not select an accumulator, precharge, gas, vessel technology, safety device, or operating pressure; infer temperature, derive a transient duty cycle, model flow/response, heat transfer, seal condition, capacity, safety, suitability, code compliance, or approval."], errors: [], method: "P₀·V₀ⁿ = P·Vⁿ · V(P) = V₀·(P₀/P)^(1/n) · ΔVfluid = V(Pmin) − V(Pmax)" };
};

const calculateHydraulicReservoirDwell = (input: Record<string, string>): CalculationState => {
  const workingVolume = finite(input.workingVolume, "Declared working reservoir volume");
  const returnFlow = finite(input.returnFlow, "Declared return or pump flow");
  const referenceDwellTime = finite(input.referenceDwellTime, "Declared dwell-time reference");
  const dwellTime = workingVolume / returnFlow;
  const referenceVolume = returnFlow * referenceDwellTime;
  const dwellReferenceRatio = dwellTime / referenceDwellTime;
  return { values: [quantity("dwellTime", "Literal reservoir dwell time", dwellTime, dwellTime, "min"), quantity("referenceVolume", "Literal volume at declared dwell-time reference", referenceVolume, referenceVolume, "L"), quantity("dwellReferenceRatio", "Literal dwell-time / reference ratio", dwellReferenceRatio, dwellReferenceRatio, "—"), quantity("returnFlow", "Declared return or pump flow", returnFlow, returnFlow, "L/min")], warnings: ["This divides only a declared working reservoir volume by a declared steady flow, then compares that result to a user-entered reference time. It does not select a reservoir, apply a rule-of-thumb, estimate cooling, aeration, contamination, geometry, fluid level, heat rejection, flow distribution, capacity, safety, suitability, or approval."], errors: [], method: "tdwell = Vworking/Qreturn · Vref = Qreturn·tref · ratio = tdwell/tref" };
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

const calculatePumpSystemHeadPoint = (input: Record<string, string>): CalculationState => {
  const staticHead = finite(input.staticHead, "Declared static-head offset", false);
  const quadraticLossCoefficient = finite(input.quadraticLossCoefficient, "Declared quadratic-loss coefficient", false);
  const flowPoint = finite(input.flowPoint, "Declared flow point", false);
  if (quadraticLossCoefficient < 0) throw new Error("Declared quadratic-loss coefficient must be zero or greater.");
  if (flowPoint < 0) throw new Error("Declared flow point must be zero or greater.");
  const quadraticLossHead = quadraticLossCoefficient * flowPoint ** 2;
  const systemHead = staticHead + quadraticLossHead;
  return { values: [quantity("systemHead", "Literal declared system head at flow point", systemHead, systemHead, "m"), quantity("staticHead", "Declared static-head offset", staticHead, staticHead, "m"), quantity("quadraticLossHead", "Literal declared quadratic loss head", quadraticLossHead, quadraticLossHead, "m"), quantity("flowPoint", "Declared flow point", flowPoint, flowPoint, "L/s")], warnings: ["This adds only a declared static-head offset to a declared quadratic-loss coefficient at one declared flow point. It does not derive the coefficient; model pipe, fitting, or valve losses; generate a full curve; find an operating point; compare a pump curve; select a pump; determine NPSH, capacity, efficiency, safety, suitability, or approval."], errors: [], method: "Hsystem(Q) = Hstatic + K·Q²" };
};

const calculateNpshAvailableBudget = (input: Record<string, string>): CalculationState => {
  const surfacePressureHead = finite(input.surfacePressureHead, "Declared absolute surface-pressure head");
  const staticSuctionHead = finite(input.staticSuctionHead, "Declared signed static suction head", false);
  const suctionLossHead = finite(input.suctionLossHead, "Declared suction loss head");
  const vaporPressureHead = finite(input.vaporPressureHead, "Declared vapor-pressure head");
  const npshRequiredReference = finite(input.npshRequiredReference, "Declared NPSH-required reference");
  const npshAvailable = surfacePressureHead + staticSuctionHead - suctionLossHead - vaporPressureHead;
  const statedHeadDifference = npshAvailable - npshRequiredReference;
  return { values: [quantity("npshAvailable", "Literal NPSH available", npshAvailable, npshAvailable, "m"), quantity("npshRequiredReference", "Declared NPSH-required reference", npshRequiredReference, npshRequiredReference, "m"), quantity("statedHeadDifference", "Literal NPSHa − declared NPSHr difference", statedHeadDifference, statedHeadDifference, "m"), quantity("staticSuctionHead", "Declared signed static suction head", staticSuctionHead, staticSuctionHead, "m")], warnings: ["This sums only user-declared surface-pressure, signed static-suction, suction-loss, and vapor-pressure heads, then subtracts a user-declared NPSH-required reference. It does not calculate properties, determine vapor pressure, derive losses, select a pump, determine cavitation risk, establish NPSH margin adequacy, capacity, safety, suitability, or approval."], errors: [], method: "NPSHa = Hsurface + Hsuction − Hloss − Hvapor · stated difference = NPSHa − NPSHr" };
};

const calculateThermalRcStep = (input: Record<string, string>): CalculationState => {
  const constantPower = finite(input.constantPower, "Declared constant power step");
  const thermalResistance = finite(input.thermalResistance, "Declared thermal resistance");
  const thermalCapacitance = finite(input.thermalCapacitance, "Declared thermal capacitance");
  const ambientTemperature = finite(input.ambientTemperature, "Declared ambient temperature", false);
  const elapsedTime = finite(input.elapsedTime, "Declared elapsed time", false);
  if (elapsedTime < 0) throw new Error("Declared elapsed time must be zero or greater.");
  const timeConstant = thermalResistance * thermalCapacitance;
  const steadyStateRise = constantPower * thermalResistance;
  const temperatureRise = steadyStateRise * (1 - Math.exp(-elapsedTime / timeConstant));
  const nodeTemperature = ambientTemperature + temperatureRise;
  return { values: [quantity("timeConstant", "Literal thermal time constant", timeConstant, timeConstant, "s"), quantity("temperatureRise", "Literal ideal temperature rise at elapsed time", temperatureRise, temperatureRise, "K"), quantity("nodeTemperature", "Literal ideal node temperature", nodeTemperature, nodeTemperature, "°C"), quantity("steadyStateRise", "Literal ideal steady-state temperature rise", steadyStateRise, steadyStateRise, "K")], warnings: ["This applies a user-declared constant power step to one ideal thermal RC node. It does not derive resistance or capacitance; determine thermal paths; select a heat sink, TIM, fan, or cooler; model multi-node conduction, convection, radiation, variable power, spatial temperature, material properties, junction limits, capacity, safety, suitability, or approval."], errors: [], method: "τ = R·C · ΔT(t) = P·R·(1 − e^(−t/τ)) · Tnode = Tamb + ΔT(t)" };
};

const calculateManningUniformFlow = (input: Record<string, string>): CalculationState => {
  const manningRoughness = finite(input.manningRoughness, "Declared Manning roughness coefficient");
  const hydraulicRadius = finite(input.hydraulicRadius, "Declared hydraulic radius");
  const energySlope = finite(input.energySlope, "Declared energy slope");
  const flowArea = finite(input.flowArea, "Declared flow area");
  const meanVelocity = (1 / manningRoughness) * hydraulicRadius ** (2 / 3) * Math.sqrt(energySlope);
  const discharge = flowArea * meanVelocity;
  return { values: [quantity("meanVelocity", "Literal metric Manning mean velocity", meanVelocity, meanVelocity, "m/s"), quantity("discharge", "Literal metric Manning discharge", discharge, discharge, "m³/s"), quantity("hydraulicRadius", "Declared hydraulic radius", hydraulicRadius, hydraulicRadius, "m"), quantity("flowArea", "Declared flow area", flowArea, flowArea, "m²")], warnings: ["This applies only the metric Manning uniform-flow relation to user-declared roughness, hydraulic radius, energy slope, and area. It does not infer cross-section geometry, select roughness, calculate normal depth or a water-surface profile, model nonuniform flow, design a channel, determine flood flow or capacity, safety, suitability, or approval."], errors: [], method: "v = (1/n)·R^(2/3)·S^(1/2) · Q = A·v (metric uniform-flow form)" };
};

const calculateCompressibleMassFlow = (input: Record<string, string>): CalculationState => {
  const flowArea = finite(input.flowArea, "Declared flow area");
  const totalPressure = finite(input.totalPressure, "Declared total pressure");
  const totalTemperature = finite(input.totalTemperature, "Declared total temperature");
  const machNumber = finite(input.machNumber, "Declared Mach number");
  const specificHeatRatio = finite(input.specificHeatRatio, "Declared specific-heat ratio", false);
  const gasConstant = finite(input.gasConstant, "Declared specific gas constant");
  if (specificHeatRatio <= 1) throw new Error("Declared specific-heat ratio must be greater than one.");
  const factor = 1 + ((specificHeatRatio - 1) / 2) * machNumber ** 2;
  const massFlow = (flowArea * totalPressure / Math.sqrt(totalTemperature)) * Math.sqrt(specificHeatRatio / gasConstant) * machNumber * factor ** (-(specificHeatRatio + 1) / (2 * (specificHeatRatio - 1)));
  return { values: [quantity("massFlow", "Literal ideal compressible mass flow", massFlow, massFlow, "kg/s"), quantity("machNumber", "Declared Mach number", machNumber, machNumber, "—"), quantity("flowArea", "Declared flow area", flowArea, flowArea, "m²"), quantity("totalPressure", "Declared total pressure", totalPressure, totalPressure, "Pa")], warnings: ["This applies NASA’s stated ideal isentropic mass-flow relation only to user-declared area, total state, Mach number, specific-heat ratio, and gas constant. It does not determine Mach number, gas properties, choking, nozzle or duct geometry, pressure losses, heat transfer, flow regime, capacity, safety, suitability, or approval."], errors: [], method: "ṁ = (A·pt/√Tt)·√(γ/R)·M·[1 + ((γ − 1)/2)·M²]^(−(γ + 1)/(2(γ − 1)))" };
};

const calculateMachiningTimeBudget = (input: Record<string, string>): CalculationState => {
  const cuttingLength = finite(input.cuttingLength, "Declared cutting length");
  const feedRate = finite(input.feedRate, "Declared feed rate");
  const nonCutAllowance = finite(input.nonCutAllowance, "Declared non-cut time allowance", false);
  if (nonCutAllowance < 0) throw new Error("Declared non-cut time allowance must be zero or greater.");
  const cuttingTime = cuttingLength / feedRate;
  const totalTime = cuttingTime + nonCutAllowance;
  return { values: [quantity("cuttingTime", "Literal cutting time", cuttingTime, cuttingTime, "min"), quantity("nonCutAllowance", "Declared non-cut time allowance", nonCutAllowance, nonCutAllowance, "min"), quantity("totalTime", "Literal declared total time", totalTime, totalTime, "min"), quantity("totalTimeSeconds", "Literal declared total time", totalTime * 60, totalTime * 60, "s")], warnings: ["This divides only user-declared cutting length by declared feed rate and adds a declared non-cut allowance. It does not select tools, feeds, speeds, materials, machines, or process strategy; calculate tool life, quality, cost, capacity, safety, suitability, or approval."], errors: [], method: "tcut = Lcut / Ffeed · ttotal = tcut + tallowance" };
};

const calculateThreePhasePower = (input: Record<string, string>): CalculationState => {
  const lineVoltage = finite(input.lineVoltage, "Declared line-to-line voltage");
  const lineCurrent = finite(input.lineCurrent, "Declared line current");
  const powerFactor = finite(input.powerFactor, "Declared power factor", false);
  if (powerFactor < 0 || powerFactor > 1) throw new Error("Declared power factor must be between zero and one.");
  const apparentPower = Math.sqrt(3) * lineVoltage * lineCurrent;
  const realPower = apparentPower * powerFactor;
  return { values: [quantity("apparentPower", "Literal three-phase apparent power", apparentPower / 1000, apparentPower / 1000, "kVA"), quantity("realPower", "Literal three-phase real power", realPower / 1000, realPower / 1000, "kW"), quantity("lineVoltage", "Declared line-to-line voltage", lineVoltage, lineVoltage, "V"), quantity("lineCurrent", "Declared line current", lineCurrent, lineCurrent, "A")], warnings: ["This applies only the balanced scalar three-phase relation to user-declared line voltage, line current, and power factor. It does not determine phase balance, harmonics, conductor or breaker size, protection, voltage drop, grounding, available fault current, power-quality compliance, capacity, safety, suitability, or approval."], errors: [], method: "S = √3·VLL·I · P = S·PF" };
};

const calculateSheetBendAllowance = (input: Record<string, string>): CalculationState => {
  const bendAngle = finite(input.bendAngle, "Declared bend angle");
  const insideRadius = finite(input.insideRadius, "Declared inside bend radius");
  const thickness = finite(input.thickness, "Declared sheet thickness");
  const kFactor = finite(input.kFactor, "Declared K factor", false);
  if (bendAngle >= 180) throw new Error("Declared bend angle must be less than 180 degrees.");
  if (kFactor < 0 || kFactor > 1) throw new Error("Declared K factor must be between zero and one.");
  const angleRadians = bendAngle * Math.PI / 180;
  const bendAllowance = angleRadians * (insideRadius + kFactor * thickness);
  const bendDeduction = 2 * (insideRadius + thickness) * Math.tan(angleRadians / 2) - bendAllowance;
  return { values: [quantity("bendAllowance", "Literal single-bend allowance", bendAllowance, bendAllowance, "mm"), quantity("bendDeduction", "Literal single-bend deduction", bendDeduction, bendDeduction, "mm"), quantity("neutralAxisRadius", "Literal neutral-axis radius", insideRadius + kFactor * thickness, insideRadius + kFactor * thickness, "mm"), quantity("bendAngle", "Declared bend angle", bendAngle, bendAngle, "°")], warnings: ["This applies only the stated single-bend allowance and deduction relations to user-declared angle, inside radius, thickness, and K factor. It does not select material, K factor, tooling, bend radius, bend method, process sequence, multi-bend flat pattern, tolerance, manufacturability, cost, capacity, safety, suitability, or approval."], errors: [], method: "BA = θ·(π/180)·(R + K·T) · BD = 2·(R + T)·tan(θ/2) − BA" };
};

const calculateIdealGasEntropyChange = (input: Record<string, string>): CalculationState => {
  const initialTemperature = finite(input.initialTemperature, "Declared initial temperature");
  const finalTemperature = finite(input.finalTemperature, "Declared final temperature");
  const initialPressure = finite(input.initialPressure, "Declared initial pressure");
  const finalPressure = finite(input.finalPressure, "Declared final pressure");
  const specificHeat = finite(input.specificHeat, "Declared constant specific heat");
  const gasConstant = finite(input.gasConstant, "Declared specific gas constant");
  const temperatureTerm = specificHeat * Math.log(finalTemperature / initialTemperature);
  const pressureTerm = gasConstant * Math.log(finalPressure / initialPressure);
  const entropyChange = temperatureTerm - pressureTerm;
  return { values: [quantity("entropyChange", "Literal ideal-gas specific entropy change", entropyChange, entropyChange, "J/(kg·K)"), quantity("temperatureTerm", "Literal temperature contribution", temperatureTerm, temperatureTerm, "J/(kg·K)"), quantity("pressureTerm", "Literal pressure contribution", pressureTerm, pressureTerm, "J/(kg·K)"), quantity("temperatureRatio", "Declared temperature ratio", finalTemperature / initialTemperature, finalTemperature / initialTemperature, "—")], warnings: ["This applies NASA’s constant-specific-heat ideal-gas pressure-temperature entropy relation only to user-declared state values. It does not determine gas properties, phase, process path, reversibility, heat or work transfer, state validity, isentropic efficiency, refrigeration, equipment, capacity, safety, suitability, or approval."], errors: [], method: "Δs = cp·ln(T₂/T₁) − R·ln(p₂/p₁)" };
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

export const calculateTool = (toolId: ToolId, input: Record<string, string>): CalculationState => {
  try {
    if (toolId === "axial") return calculateAxial(input);
    if (toolId === "beam") return calculateBeam(input);
    if (toolId === "beamDiagram") return calculateBeamDiagram(input);
    if (toolId === "triangleTruss") return calculateTriangleTruss(input);
    if (toolId === "hertzContact") return calculateHertzContact(input);
    if (toolId === "fractureIntensity") return calculateFractureIntensity(input);
    if (toolId === "deflectionCheck") return calculateDeflectionCheck(input);
    if (toolId === "cantileverFrame") return calculateCantileverFrame(input);
    if (toolId === "plateBuckling") return calculatePlateBuckling(input);
    if (toolId === "screwCriticalSpeed") return calculateScrewCriticalSpeed(input);
    if (toolId === "linearGuideLife") return calculateLinearGuideLife(input);
    if (toolId === "brakingDuty") return calculateBrakingDuty(input);
    if (toolId === "ballScrewLife") return calculateBallScrewLife(input);
    if (toolId === "driveTrain") return calculateDriveTrain(input);
    if (toolId === "rmsDutyTorque") return calculateRmsDutyTorque(input);
    if (toolId === "motorOperatingPoint") return calculateMotorOperatingPoint(input);
    if (toolId === "gripperHold") return calculateGripperHold(input);
    if (toolId === "conveyorLine") return calculateConveyorLine(input);
    if (toolId === "robotReach") return calculateRobotReach(input);
    if (toolId === "robotPayloadMoment") return calculateRobotPayloadMoment(input);
    if (toolId === "rotaryIndexing") return calculateRotaryIndexing(input);
    if (toolId === "pneumaticDemandBudget") return calculatePneumaticDemandBudget(input);
    if (toolId === "hydraulicLossBudget") return calculateHydraulicLossBudget(input);
    if (toolId === "vacuumLeakageBudget") return calculateVacuumLeakageBudget(input);
    if (toolId === "hydraulicAccumulatorState") return calculateHydraulicAccumulatorState(input);
    if (toolId === "hydraulicReservoirDwell") return calculateHydraulicReservoirDwell(input);
    if (toolId === "darcyFrictionFactor") return calculateDarcyFrictionFactor(input);
    if (toolId === "pumpSystemHeadPoint") return calculatePumpSystemHeadPoint(input);
    if (toolId === "npshAvailableBudget") return calculateNpshAvailableBudget(input);
    if (toolId === "thermalRcStep") return calculateThermalRcStep(input);
    if (toolId === "manningUniformFlow") return calculateManningUniformFlow(input);
    if (toolId === "compressibleMassFlow") return calculateCompressibleMassFlow(input);
    if (toolId === "machiningTimeBudget") return calculateMachiningTimeBudget(input);
    if (toolId === "threePhasePower") return calculateThreePhasePower(input);
    if (toolId === "sheetBendAllowance") return calculateSheetBendAllowance(input);
    if (toolId === "idealGasEntropyChange") return calculateIdealGasEntropyChange(input);
    if (toolId === "bearingAdjustedLife") return calculateBearingAdjustedLife(input);
    if (toolId === "flywheelEnergy") return calculateFlywheelEnergy(input);
    if (toolId === "frictionClutch") return calculateFrictionClutch(input);
    if (toolId === "splineLoad") return calculateSplineLoad(input);
    if (toolId === "gearMeshForce") return calculateGearMeshForce(input);
    if (toolId === "beltTension") return calculateBeltTension(input);
    if (toolId === "vesselGeometry") return calculateVesselGeometry(input);
    if (toolId === "threadTensileArea") return calculateThreadTensileArea(input);
    if (toolId === "couplingTorsion") return calculateCouplingTorsion(input);
    if (toolId === "stability") return calculateStability(input);
    if (toolId === "section") return calculateSection(input);
    if (toolId === "triangle") return calculateTriangle(input);
    if (toolId === "coordinate") return calculateCoordinate(input);
    if (toolId === "cylinder") return calculateCylinder(input);
    if (toolId === "density") return calculateDensity(input);
    if (toolId === "newton") return calculateNewton(input);
    if (toolId === "kinetic") return calculateKinetic(input);
    if (toolId === "hydrostatic") return calculateHydrostatic(input);
    if (toolId === "continuity") return calculateContinuity(input);
    if (toolId === "sensibleHeat") return calculateSensibleHeat(input);
    if (toolId === "ohm") return calculateOhm(input);
    if (toolId === "fits") return calculateFits(input);
    if (toolId === "toleranceStack") return calculateToleranceStack(input);
    if (toolId === "toleranceSampling") return calculateToleranceSampling(input);
    if (toolId === "taylorToolLife") return calculateTaylorToolLife(input);
    if (toolId === "cuttingForce") return calculateCuttingForce(input);
    if (toolId === "weldGroup") return calculateWeldGroup(input);
    if (toolId === "position") return calculatePosition(input);
    if (toolId === "mmc") return calculateMmc(input);
    if (toolId === "motionProfile") return calculateMotionProfile(input);
    if (toolId === "reflectedInertia") return calculateReflectedInertia(input);
    if (toolId === "pneumatic") return calculatePneumatic(input);
    if (toolId === "clampForce") return calculateClampForce(input);
    if (toolId === "torsion") return calculateTorsion(input);
    if (toolId === "bearingLife") return calculateBearingLife(input);
    if (toolId === "boltPreload") return calculateBoltPreload(input);
    if (toolId === "millingMrr") return calculateMillingMrr(input);
    if (toolId === "lmtd") return calculateLmtd(input);
    if (toolId === "darcy") return calculateDarcy(input);
    if (toolId === "thermalExpansion") return calculateThermalExpansion(input);
    if (toolId === "thermalStress") return calculateThermalStress(input);
    if (toolId === "planeConduction") return calculatePlaneConduction(input);
    if (toolId === "bernoulli") return calculateBernoulli(input);
    if (toolId === "combinedStress") return calculateCombinedStress(input);
    if (toolId === "thinVessel") return calculateThinVessel(input);
    if (toolId === "leadScrew") return calculateLeadScrew(input);
    if (toolId === "airConsumption") return calculateAirConsumption(input);
    if (toolId === "gearRatio") return calculateGearRatio(input);
    if (toolId === "boltLoad") return calculateBoltLoad(input);
    if (toolId === "safetyMargin") return calculateSafetyMargin(input);
    if (toolId === "circularArc") return calculateCircularArc(input);
    if (toolId === "compressionSpring") return calculateCompressionSpring(input);
    if (toolId === "drillingTime") return calculateDrillingTime(input);
    if (toolId === "turningMrr") return calculateTurningMrr(input);
    if (toolId === "processCapability") return calculateProcessCapability(input);
    if (toolId === "extensionSpring") return calculateExtensionSpring(input);
    if (toolId === "torsionSpring") return calculateTorsionSpring(input);
    if (toolId === "keyway") return calculateKeyway(input);
    if (toolId === "cuttingParameters") return calculateCuttingParameters(input);
    if (toolId === "sheetMetalBend") return calculateSheetMetalBend(input);
    if (toolId === "productionMetrics") return calculateProductionMetrics(input);
    if (toolId === "gageRr") return calculateGageRr(input);
    if (toolId === "gaugeBiasStudy") return calculateGaugeBiasStudy(input);
    if (toolId === "controlChart") return calculateControlChart(input);
    if (toolId === "measurementUncertainty") return calculateMeasurementUncertainty(input);
    if (toolId === "thermalRadiation") return calculateThermalRadiation(input);
    if (toolId === "shaftDesign") return calculateShaftDesign(input);
    if (toolId === "bearingLoad") return calculateBearingLoad(input);
    if (toolId === "formControl") return calculateFormControl(input);
    if (toolId === "driveRatio") return calculateDriveRatio(input);
    if (toolId === "motionDuty") return calculateMotionDuty(input);
    if (toolId === "filletWeld") return calculateFilletWeld(input);
    if (toolId === "threadDesign") return calculateThreadDesign(input);
    if (toolId === "orificeFlow") return calculateOrificeFlow(input);
    if (toolId === "dimensionCheck") return calculateDimensionCheck(input);
    if (toolId === "cuttingPower") return calculateCuttingPower(input);
    if (toolId === "drillPointDepth") return calculateDrillPointDepth(input);
    if (toolId === "toolDeflection") return calculateToolDeflection(input);
    if (toolId === "fatigueConcentration") return calculateFatigueConcentration(input);
    if (toolId === "goodmanFatigue") return calculateGoodmanFatigue(input);
    if (toolId === "minerDamage") return calculateMinerDamage(input);
    if (toolId === "planetaryGear") return calculatePlanetaryGear(input);
    if (toolId === "wormDrive") return calculateWormDrive(input);
    if (toolId === "sCurveProfile") return calculateSCurveProfile(input);
    if (toolId === "torqueSpeedDuty") return calculateTorqueSpeedDuty(input);
    if (toolId === "fixtureClamping") return calculateFixtureClamping(input);
    if (toolId === "pickPlaceCycle") return calculatePickPlaceCycle(input);
    if (toolId === "payloadInertia") return calculatePayloadInertia(input);
    if (toolId === "pneumaticCycleTime") return calculatePneumaticCycleTime(input);
    if (toolId === "valveCv") return calculateValveCv(input);
    if (toolId === "vacuumHolding") return calculateVacuumHolding(input);
    if (toolId === "additiveBuild") return calculateAdditiveBuild(input);
    if (toolId === "gravityMoment") return calculateGravityMoment(input);
    if (toolId === "pitchCircle") return calculatePitchCircle(input);
    if (toolId === "regularPolygon") return calculateRegularPolygon(input);
    if (toolId === "eccentricBoltGroup") return calculateEccentricBoltGroup(input);
    if (toolId === "pinStress") return calculatePinStress(input);
    if (toolId === "gearToothStress") return calculateGearToothStress(input);
    if (toolId === "vacuumEvacuation") return calculateVacuumEvacuation(input);
    if (toolId === "toggleForce") return calculateToggleForce(input);
    if (toolId === "wristInertia") return calculateWristInertia(input);
    if (toolId === "cycleBuilder") return calculateCycleBuilder(input);
    if (toolId === "pneumaticLineLoss") return calculatePneumaticLineLoss(input);
    if (toolId === "tappingTorque") return calculateTappingTorque(input);
    if (toolId === "threadMachiningTime") return calculateThreadMachiningTime(input);
    if (toolId === "reynoldsNumber") return calculateReynoldsNumber(input);
    if (toolId === "minorLosses") return calculateMinorLosses(input);
    if (toolId === "pipeSizing") return calculatePipeSizing(input);
    if (toolId === "buoyancyForce") return calculateBuoyancyForce(input);
    if (toolId === "submergedPlane") return calculateSubmergedPlane(input);
    if (toolId === "convectionHeat") return calculateConvectionHeat(input);
    if (toolId === "thermalResistance") return calculateThermalResistance(input);
    if (toolId === "idealGas") return calculateIdealGas(input);
    if (toolId === "isentropicMachine") return calculateIsentropicMachine(input);
    if (toolId === "ballScrewSizing") return calculateBallScrewSizing(input);
    if (toolId === "rackPinion") return calculateRackPinion(input);
    if (toolId === "beltAxis") return calculateBeltAxis(input);
    if (toolId === "orientationControl") return calculateOrientationControl(input);
    if (toolId === "profileRunout") return calculateProfileRunout(input);
    if (toolId === "processPerformance") return calculateProcessPerformance(input);
    if (toolId === "hydraulicCylinder") return calculateHydraulicCylinder(input);
    if (toolId === "hydraulicPump") return calculateHydraulicPump(input);
    if (toolId === "hydraulicMotor") return calculateHydraulicMotor(input);
    if (toolId === "hydraulicLine") return calculateHydraulicLine(input);
    if (toolId === "shaftCombined") return calculateShaftCombined(input);
    if (toolId === "mohrCircle") return calculateMohrCircle(input);
    if (toolId === "pressFit") return calculatePressFit(input);
    if (toolId === "jointSeparation") return calculateJointSeparation(input);
    if (toolId === "arithmeticScratchpad") return calculateArithmeticScratchpad(input);
    if (toolId === "converter") return calculateConverter(input);
    return { values: [], warnings: [], errors: [`No released method is registered for “${toolId}”.`], method: "Unregistered model" };
  } catch (error) {
    return { values: [], warnings: [], errors: [error instanceof Error ? error.message : "The current configuration could not be calculated."], method: "Awaiting valid inputs" };
  }
};
