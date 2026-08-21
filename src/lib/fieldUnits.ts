import { convertQuantity, isUnitFamilyId, unitFamilies, type UnitFamilyId } from "./units";

export type UnitSwitch = { family: UnitFamilyId; engine: string; options: string[] };

const SHORT: Partial<Record<UnitFamilyId, string[]>> = {
  length: ["mm", "m", "in", "ft"],
  area: ["mm²", "m²", "in²"],
  volume: ["L", "m³", "gal (US)"],
  mass: ["kg", "lbm", "g"],
  time: ["s", "min", "h"],
  angle: ["deg", "°", "rad"],
  force: ["N", "kN", "lbf"],
  pressure: ["bar", "bar(g)", "kPa", "MPa", "psi"],
  stress: ["MPa", "GPa", "ksi", "psi"],
  torque: ["N·m", "kN·m", "lbf·ft"],
  acceleration: ["m/s²", "g", "ft/s²"],
  speed: ["m/s", "m/min", "mm/min", "ft/s"],
  energy: ["J", "kJ", "kWh"],
  power: ["W", "kW", "hp"],
  temperature: ["°C", "K", "°F"],
  density: ["kg/m³", "lbm/ft³"],
  volumetricFlow: ["L/min", "L/s", "gal/min", "cfm"],
  frequency: ["rpm", "Hz"],
  voltage: ["V", "kV"],
  current: ["A", "mA"],
  resistance: ["Ω", "kΩ"],
  strain: ["µε", "1"],
  secondMoment: ["cm⁴", "mm⁴", "in⁴"],
};

const UNIT_FAMILY: Record<string, UnitFamilyId> = {};
for (const family of Object.values(unitFamilies)) {
  for (const symbol of Object.keys(family.units)) {
    if (!UNIT_FAMILY[symbol]) UNIT_FAMILY[symbol] = family.id as UnitFamilyId;
  }
}

UNIT_FAMILY["K or °C"] = "temperature";
UNIT_FAMILY["mbar abs"] = "pressure";
UNIT_FAMILY["°"] = "angle";

const skip = new Set(["—", "%", "unit", "units", "declared", "teeth", "cycles", "holes", "samples", "people", "observations", "coils", "turns", "starts", "TPI", ":1"]);

export function unitSwitchFor(unit?: string): UnitSwitch | null {
  if (!unit || skip.has(unit)) return null;
  const familyId = UNIT_FAMILY[unit];
  if (!familyId || !isUnitFamilyId(familyId)) return null;
  const family = unitFamilies[familyId];
  const engine = unit === "K or °C" ? "°C" : unit === "mbar abs" ? "mbar" : unit === "°" ? "deg" : unit;
  if (!(engine in family.units)) return null;
  const preferred = SHORT[familyId] ?? Object.keys(family.units);
  const options = [engine, ...preferred.filter((item) => item !== engine && item in family.units)];
  return { family: familyId, engine, options };
}

export function convertShop(family: UnitFamilyId, value: number, fromUnit: string, toUnit: string) {
  if (fromUnit === toUnit) return value;
  return convertQuantity(family, value, fromUnit, toUnit).converted;
}

export function formatShop(value: number) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 1 : abs >= 1 ? 3 : 4;
  return value.toFixed(digits).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

export function parseShop(value: string) {
  const numeric = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}
