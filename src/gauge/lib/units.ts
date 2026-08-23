/**
 * Gauge adapter: the kit is the conversion truth.
 * This file is only the Gauge-approved family/unit menu (original Gauge table).
 */
import {
  convertQuantity as convert,
  inventory,
  resolveUnit,
  unitFamilyOptions as kitOptions,
} from "@instrument/units";

/** Original Gauge families, original order. */
const FAMILIES = [
  "dimensionless",
  "length",
  "area",
  "volume",
  "mass",
  "time",
  "force",
  "pressure",
  "stress",
  "strain",
  "torque",
  "acceleration",
  "speed",
  "energy",
  "power",
  "temperature",
  "temperatureDelta",
  "density",
  "dynamicViscosity",
  "volumetricFlow",
  "voltage",
  "current",
  "resistance",
  "specificHeat",
  "thermalConductivity",
  "massFlow",
  "secondMoment",
  "stiffness",
  "frequency",
  "angle",
] as const;

/** Original Gauge units as stable ids. Symbols are display only. */
const MENU: Record<(typeof FAMILIES)[number], readonly string[]> = {
  dimensionless: ["dimensionless.one", "dimensionless.percent"],
  length: ["length.m", "length.mm", "length.um", "length.cm", "length.km", "length.in", "length.ft"],
  area: ["area.m2", "area.mm2", "area.cm2", "area.in2", "area.ft2"],
  volume: ["volume.m3", "volume.L", "volume.ft3"],
  mass: ["mass.kg", "mass.g", "mass.tonne", "mass.lbm"],
  time: ["time.s", "time.min", "time.h"],
  force: ["force.N", "force.kN", "force.lbf"],
  pressure: ["pressure.Pa", "pressure.kPa", "pressure.MPa", "pressure.bar", "pressure.psi"],
  stress: ["stress.Pa", "stress.MPa", "stress.GPa", "stress.ksi"],
  strain: ["strain.micro", "strain.one"],
  torque: ["torque.N_m", "torque.lbf_ft"],
  acceleration: ["acceleration.m_s2", "acceleration.g"],
  speed: ["speed.m_s", "speed.km_h", "speed.mph", "speed.ft_s"],
  energy: ["energy.J", "energy.kJ", "energy.MJ", "energy.kWh"],
  power: ["power.W", "power.kW", "power.hp"],
  temperature: ["temperature.K", "temperature.degC", "temperature.degF"],
  temperatureDelta: ["temperatureDelta.K", "temperatureDelta.degC", "temperatureDelta.degF"],
  density: ["density.kg_m3", "density.g_cm3", "density.lbm_ft3"],
  dynamicViscosity: ["dynamicViscosity.Pa_s", "dynamicViscosity.cP"],
  volumetricFlow: ["volumetricFlow.m3_s", "volumetricFlow.L_s", "volumetricFlow.L_min", "volumetricFlow.us_gpm"],
  voltage: ["voltage.V", "voltage.kV"],
  current: ["current.A", "current.mA"],
  resistance: ["resistance.ohm", "resistance.kohm"],
  specificHeat: ["specificHeat.J_kg_K", "specificHeat.kJ_kg_K"],
  thermalConductivity: ["thermalConductivity.W_m_K"],
  massFlow: ["massFlow.kg_s", "massFlow.kg_h"],
  secondMoment: ["secondMoment.m4", "secondMoment.mm4", "secondMoment.cm4", "secondMoment.in4"],
  stiffness: ["stiffness.N_m", "stiffness.N_mm", "stiffness.lbf_in"],
  frequency: ["frequency.Hz", "frequency.rpm"],
  angle: ["angle.rad", "angle.degree"],
};

export type UnitFamilyId = (typeof FAMILIES)[number];

export const isUnitFamilyId = (value: string): value is UnitFamilyId => (FAMILIES as readonly string[]).includes(value);

export function unitId(familyId: string, token: string) {
  return resolveUnit(familyId, token).id;
}

export function unitSymbol(familyId: string, token: string) {
  return resolveUnit(familyId, token).symbol;
}

export const unitFamilies = Object.fromEntries(
  inventory.families
    .filter((family) => isUnitFamilyId(family.id))
    .map((family) => [
      family.id,
      {
        id: family.id,
        label: family.label,
        canonicalUnit: family.canonicalUnit,
        units: Object.fromEntries(
          family.units.flatMap((unit) => {
            const keys = new Set([unit.symbol, unit.id, ...unit.aliases]);
            const entry = { symbol: unit.symbol, label: unit.label };
            return [...keys].map((key) => [key, entry]);
          }),
        ),
      },
    ]),
);

export const unitFamilyOptions = kitOptions.filter((option) => isUnitFamilyId(option.value));

export function unitsForFamily(familyId: UnitFamilyId, allowed?: string[]) {
  const ids = MENU[familyId] ?? [];
  const all = ids.map((id) => {
    const unit = resolveUnit(familyId, id);
    return { id: unit.id, value: unit.id, label: unit.symbol };
  });
  if (!allowed?.length) return all;
  const allow = new Set(allowed.map((token) => resolveUnit(familyId, token).id));
  const filtered = all.filter((unit) => allow.has(unit.id));
  return filtered.length ? filtered : all;
}

export function convertQuantity(familyId: UnitFamilyId, value: number, fromUnit: string, toUnit: string) {
  const result = convert(familyId, value, fromUnit, toUnit);
  return {
    converted: result.converted,
    canonical: result.canonical,
    canonicalUnit: result.canonicalUnit,
  };
}
