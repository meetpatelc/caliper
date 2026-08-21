/**
 * Engineering Desk — Instrument Panel Atelier reminder:
 * This is the platform's dimensional trust layer. Every displayed unit resolves
 * to a declared canonical SI representation, and incompatible families never mix.
 */

export type UnitDefinition = {
  symbol: string;
  label: string;
  toCanonical: (value: number) => number;
  fromCanonical: (value: number) => number;
};

export type UnitFamilyDefinition = {
  id: string;
  label: string;
  canonicalUnit: string;
  domain: "foundation" | "mechanics" | "fluids" | "thermal" | "electrical";
  units: Record<string, UnitDefinition>;
};

const linear = (symbol: string, label: string, factor: number): UnitDefinition => ({
  symbol,
  label,
  toCanonical: (value) => value * factor,
  fromCanonical: (value) => value / factor,
});

const temperature = (symbol: string, label: string, toCanonical: (value: number) => number, fromCanonical: (value: number) => number): UnitDefinition => ({ symbol, label, toCanonical, fromCanonical });

export const unitFamilies = {
  length: { id: "length", label: "Length", canonicalUnit: "m", domain: "foundation", units: { m: linear("m", "metre", 1), mm: linear("mm", "millimetre", 1e-3), cm: linear("cm", "centimetre", 1e-2), km: linear("km", "kilometre", 1e3), µm: linear("µm", "micrometre", 1e-6), in: linear("in", "inch", 0.0254), ft: linear("ft", "foot", 0.3048), yd: linear("yd", "yard", 0.9144) } },
  area: { id: "area", label: "Area", canonicalUnit: "m²", domain: "foundation", units: { "m²": linear("m²", "square metre", 1), "mm²": linear("mm²", "square millimetre", 1e-6), "cm²": linear("cm²", "square centimetre", 1e-4), "in²": linear("in²", "square inch", 6.4516e-4), "ft²": linear("ft²", "square foot", 0.09290304) } },
  volume: { id: "volume", label: "Volume", canonicalUnit: "m³", domain: "foundation", units: { "m³": linear("m³", "cubic metre", 1), L: linear("L", "litre", 1e-3), mL: linear("mL", "millilitre", 1e-6), "ft³": linear("ft³", "cubic foot", 0.028316846592), "gal (US)": linear("gal (US)", "US gallon", 0.003785411784) } },
  mass: { id: "mass", label: "Mass", canonicalUnit: "kg", domain: "foundation", units: { kg: linear("kg", "kilogram", 1), g: linear("g", "gram", 1e-3), tonne: linear("t", "metric tonne", 1e3), lbm: linear("lbm", "pound mass", 0.45359237), oz: linear("oz", "ounce", 0.028349523125) } },
  time: { id: "time", label: "Time", canonicalUnit: "s", domain: "foundation", units: { s: linear("s", "second", 1), min: linear("min", "minute", 60), h: linear("h", "hour", 3600), day: linear("day", "day", 86400) } },
  angle: { id: "angle", label: "Angle", canonicalUnit: "rad", domain: "foundation", units: { rad: linear("rad", "radian", 1), deg: linear("°", "degree", Math.PI / 180), rev: linear("rev", "revolution", Math.PI * 2) } },
  force: { id: "force", label: "Force", canonicalUnit: "N", domain: "mechanics", units: { N: linear("N", "newton", 1), kN: linear("kN", "kilonewton", 1e3), MN: linear("MN", "meganewton", 1e6), lbf: linear("lbf", "pound-force", 4.4482216152605) } },
  pressure: { id: "pressure", label: "Pressure", canonicalUnit: "Pa", domain: "mechanics", units: { Pa: linear("Pa", "pascal", 1), kPa: linear("kPa", "kilopascal", 1e3), MPa: linear("MPa", "megapascal", 1e6), bar: linear("bar", "bar", 1e5), "bar(g)": linear("bar(g)", "bar gauge", 1e5), "bar(abs)": linear("bar(abs)", "bar absolute", 1e5), "kPa(abs)": linear("kPa(abs)", "kilopascal absolute", 1e3), mbar: linear("mbar", "millibar", 100), psi: linear("psi", "pounds per square inch", 6894.757293168), atm: linear("atm", "standard atmosphere", 101325) } },
  stress: { id: "stress", label: "Stress", canonicalUnit: "Pa", domain: "mechanics", units: { Pa: linear("Pa", "pascal", 1), kPa: linear("kPa", "kilopascal", 1e3), MPa: linear("MPa", "megapascal", 1e6), GPa: linear("GPa", "gigapascal", 1e9), "N/mm²": linear("N/mm²", "newton per square millimetre", 1e6), psi: linear("psi", "pounds per square inch", 6894.757293168), ksi: linear("ksi", "thousand pounds per square inch", 6894757.293168) } },
  torque: { id: "torque", label: "Torque", canonicalUnit: "N·m", domain: "mechanics", units: { "N·m": linear("N·m", "newton metre", 1), "kN·m": linear("kN·m", "kilonewton metre", 1e3), "lbf·ft": linear("lbf·ft", "pound-force foot", 1.3558179483314), "lbf·in": linear("lbf·in", "pound-force inch", 0.1129848290276167) } },
  acceleration: { id: "acceleration", label: "Acceleration", canonicalUnit: "m/s²", domain: "mechanics", units: { "m/s²": linear("m/s²", "metres per second squared", 1), g: linear("g", "standard gravity", 9.80665), "ft/s²": linear("ft/s²", "feet per second squared", 0.3048) } },
  speed: { id: "speed", label: "Speed", canonicalUnit: "m/s", domain: "mechanics", units: { "m/s": linear("m/s", "metres per second", 1), "mm/s": linear("mm/s", "millimetres per second", 1e-3), "m/min": linear("m/min", "metres per minute", 1 / 60), "mm/min": linear("mm/min", "millimetres per minute", 1 / 60000), "km/h": linear("km/h", "kilometres per hour", 1 / 3.6), mph: linear("mph", "miles per hour", 0.44704), "ft/s": linear("ft/s", "feet per second", 0.3048) } },
  energy: { id: "energy", label: "Energy / work", canonicalUnit: "J", domain: "thermal", units: { J: linear("J", "joule", 1), kJ: linear("kJ", "kilojoule", 1e3), MJ: linear("MJ", "megajoule", 1e6), Wh: linear("Wh", "watt-hour", 3600), kWh: linear("kWh", "kilowatt-hour", 3.6e6), Btu: linear("Btu", "British thermal unit", 1055.05585262) } },
  power: { id: "power", label: "Power / heat flow", canonicalUnit: "W", domain: "thermal", units: { W: linear("W", "watt", 1), kW: linear("kW", "kilowatt", 1e3), MW: linear("MW", "megawatt", 1e6), hp: linear("hp", "mechanical horsepower", 745.6998715822702), "Btu/h": linear("Btu/h", "British thermal units per hour", 0.293071070172) } },
  temperature: { id: "temperature", label: "Temperature", canonicalUnit: "K", domain: "thermal", units: { K: temperature("K", "kelvin", (value) => value, (value) => value), "°C": temperature("°C", "degree Celsius", (value) => value + 273.15, (value) => value - 273.15), "°F": temperature("°F", "degree Fahrenheit", (value) => (value - 32) * 5 / 9 + 273.15, (value) => (value - 273.15) * 9 / 5 + 32), "°R": temperature("°R", "degree Rankine", (value) => value * 5 / 9, (value) => value * 9 / 5) } },
  density: { id: "density", label: "Density", canonicalUnit: "kg/m³", domain: "fluids", units: { "kg/m³": linear("kg/m³", "kilograms per cubic metre", 1), "g/cm³": linear("g/cm³", "grams per cubic centimetre", 1e3), "lbm/ft³": linear("lbm/ft³", "pounds mass per cubic foot", 16.01846337396), "lbm/in³": linear("lbm/in³", "pounds mass per cubic inch", 27679.904710191) } },
  dynamicViscosity: { id: "dynamicViscosity", label: "Dynamic viscosity", canonicalUnit: "Pa·s", domain: "fluids", units: { "Pa·s": linear("Pa·s", "pascal second", 1), cP: linear("cP", "centipoise", 1e-3), P: linear("P", "poise", 0.1) } },
  kinematicViscosity: { id: "kinematicViscosity", label: "Kinematic viscosity", canonicalUnit: "m²/s", domain: "fluids", units: { "m²/s": linear("m²/s", "square metre per second", 1), cSt: linear("cSt", "centistokes", 1e-6), "ft²/s": linear("ft²/s", "square foot per second", 0.09290304) } },
  volumetricFlow: { id: "volumetricFlow", label: "Volumetric flow", canonicalUnit: "m³/s", domain: "fluids", units: { "m³/s": linear("m³/s", "cubic metres per second", 1), "L/s": linear("L/s", "litres per second", 1e-3), "L/min": linear("L/min", "litres per minute", 1 / 60000), "gal/min": linear("gal/min", "US gallons per minute", 6.30901964e-5), "US gpm": linear("US gpm", "US gallons per minute", 6.30901964e-5), cfm: linear("cfm", "cubic feet per minute", 4.719474432e-4) } },
  frequency: { id: "frequency", label: "Frequency", canonicalUnit: "Hz", domain: "electrical", units: { Hz: linear("Hz", "hertz", 1), kHz: linear("kHz", "kilohertz", 1e3), MHz: linear("MHz", "megahertz", 1e6), rpm: linear("rpm", "revolutions per minute", 1 / 60) } },
  voltage: { id: "voltage", label: "Voltage", canonicalUnit: "V", domain: "electrical", units: { V: linear("V", "volt", 1), mV: linear("mV", "millivolt", 1e-3), kV: linear("kV", "kilovolt", 1e3) } },
  current: { id: "current", label: "Current", canonicalUnit: "A", domain: "electrical", units: { A: linear("A", "ampere", 1), mA: linear("mA", "milliampere", 1e-3), kA: linear("kA", "kiloampere", 1e3) } },
  resistance: { id: "resistance", label: "Resistance", canonicalUnit: "Ω", domain: "electrical", units: { "Ω": linear("Ω", "ohm", 1), "kΩ": linear("kΩ", "kilo-ohm", 1e3), "MΩ": linear("MΩ", "mega-ohm", 1e6) } },
  capacitance: { id: "capacitance", label: "Capacitance", canonicalUnit: "F", domain: "electrical", units: { F: linear("F", "farad", 1), mF: linear("mF", "millifarad", 1e-3), "µF": linear("µF", "microfarad", 1e-6), nF: linear("nF", "nanofarad", 1e-9) } },
  charge: { id: "charge", label: "Electric charge", canonicalUnit: "C", domain: "electrical", units: { C: linear("C", "coulomb", 1), Ah: linear("Ah", "ampere-hour", 3600), mAh: linear("mAh", "milliampere-hour", 3.6) } },
  strain: { id: "strain", label: "Strain", canonicalUnit: "1", domain: "mechanics", units: { "1": linear("1", "strain", 1), "µε": linear("µε", "microstrain", 1e-6) } },
  secondMoment: { id: "secondMoment", label: "Second moment of area", canonicalUnit: "m⁴", domain: "mechanics", units: { "m⁴": linear("m⁴", "metre to the fourth", 1), "cm⁴": linear("cm⁴", "centimetre to the fourth", 1e-8), "mm⁴": linear("mm⁴", "millimetre to the fourth", 1e-12), "in⁴": linear("in⁴", "inch to the fourth", 4.162314256e-7) } },
} as const satisfies Record<string, UnitFamilyDefinition>;

export type UnitFamilyId = keyof typeof unitFamilies;

export const isUnitFamilyId = (value: string): value is UnitFamilyId => value in unitFamilies;
export const unitFamilyOptions = Object.values(unitFamilies).map((family) => ({ value: family.id, label: family.label, domain: family.domain }));
export const unitsForFamily = (familyId: UnitFamilyId) => Object.values(unitFamilies[familyId].units).map((unit) => ({ value: unit.symbol, label: unit.symbol }));

export const convertQuantity = (familyId: UnitFamilyId, value: number, fromUnit: string, toUnit: string) => {
  const family = unitFamilies[familyId];
  const from = family.units[fromUnit as keyof typeof family.units] as UnitDefinition | undefined;
  const to = family.units[toUnit as keyof typeof family.units] as UnitDefinition | undefined;
  if (!from || !to) throw new Error("Select compatible source and target units.");
  const canonical = from.toCanonical(value);
  return { converted: to.fromCanonical(canonical), canonical, canonicalUnit: family.canonicalUnit, family: family.label };
};
