import { convertQuantity, isUnitFamilyId, unitId, unitSymbol, type UnitFamilyId } from "./units";

export type UnitSwitch = { family: UnitFamilyId; engine: string; options: string[] };

/** Desk trays — original Caliper short lists, as stable ids. */
const SHORT: Partial<Record<UnitFamilyId, string[]>> = {
  length: ["length.mm", "length.m", "length.in", "length.ft"],
  area: ["area.mm2", "area.m2", "area.in2"],
  volume: ["volume.L", "volume.m3", "volume.gal_us"],
  mass: ["mass.kg", "mass.lbm", "mass.g"],
  time: ["time.s", "time.min", "time.h"],
  angle: ["angle.degree", "angle.rad"],
  force: ["force.N", "force.kN", "force.lbf"],
  pressure: ["pressure.bar", "pressure.bar_gauge", "pressure.kPa", "pressure.MPa", "pressure.psi"],
  stress: ["stress.MPa", "stress.GPa", "stress.ksi", "stress.psi"],
  torque: ["torque.N_m", "torque.kN_m", "torque.lbf_ft"],
  acceleration: ["acceleration.m_s2", "acceleration.g", "acceleration.ft_s2"],
  speed: ["speed.m_s", "speed.m_min", "speed.mm_min", "speed.ft_s"],
  energy: ["energy.J", "energy.kJ", "energy.kWh"],
  power: ["power.W", "power.kW", "power.hp"],
  temperature: ["temperature.degC", "temperature.K", "temperature.degF"],
  density: ["density.kg_m3", "density.lbm_ft3"],
  volumetricFlow: ["volumetricFlow.L_min", "volumetricFlow.L_s", "volumetricFlow.us_gpm", "volumetricFlow.cfm"],
  frequency: ["frequency.rpm", "frequency.Hz"],
  voltage: ["voltage.V", "voltage.kV"],
  current: ["current.A", "current.mA"],
  resistance: ["resistance.ohm", "resistance.kohm"],
  strain: ["strain.micro", "strain.one"],
  secondMoment: ["secondMoment.cm4", "secondMoment.mm4", "secondMoment.in4"],
};

const skip = new Set(["—", "%", "unit", "units", "declared", "teeth", "cycles", "holes", "samples", "people", "observations", "coils", "turns", "starts", "TPI", ":1"]);

const ALIAS_FAMILY: Record<string, UnitFamilyId> = {
  "K or °C": "temperature",
  "mbar abs": "pressure",
  "°": "angle",
  deg: "angle",
};

export function unitSwitchFor(unit?: string): UnitSwitch | null {
  if (!unit || skip.has(unit)) return null;
  const familyId = ALIAS_FAMILY[unit] ?? inferFamily(unit);
  if (!familyId || !isUnitFamilyId(familyId)) return null;
  let engine: string;
  try {
    engine = unitId(familyId, unit === "K or °C" ? "°C" : unit === "mbar abs" ? "mbar" : unit === "°" || unit === "deg" ? "deg" : unit);
  } catch {
    return null;
  }
  const preferred = SHORT[familyId] ?? [];
  const options = [engine, ...preferred.filter((item) => item !== engine)];
  return { family: familyId, engine, options };
}

function inferFamily(token: string): UnitFamilyId | undefined {
  const families: UnitFamilyId[] = [
    "length",
    "area",
    "volume",
    "mass",
    "time",
    "angle",
    "force",
    "pressure",
    "stress",
    "torque",
    "acceleration",
    "speed",
    "energy",
    "power",
    "temperature",
    "density",
    "dynamicViscosity",
    "kinematicViscosity",
    "volumetricFlow",
    "frequency",
    "voltage",
    "current",
    "resistance",
    "capacitance",
    "charge",
    "strain",
    "secondMoment",
  ];
  for (const family of families) {
    try {
      unitId(family, token);
      return family;
    } catch {
      /* try next — Pa belongs to pressure first */
    }
  }
  return undefined;
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

export function shopLabel(family: UnitFamilyId, token: string) {
  return unitSymbol(family, token);
}
