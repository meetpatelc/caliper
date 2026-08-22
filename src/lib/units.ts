/**
 * Caliper adapter: the kit is the conversion truth.
 * This file is only the Caliper-approved family/unit menu (original Caliper table).
 */
import {
  convertQuantity as convert,
  inventory,
  resolveUnit,
  unitFamilyOptions as kitOptions,
} from "@instrument/units";

const FAMILIES = [
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
] as const;

const DOMAIN: Record<string, "foundation" | "mechanics" | "fluids" | "thermal" | "electrical"> = {
  length: "foundation",
  area: "foundation",
  volume: "foundation",
  mass: "foundation",
  time: "foundation",
  angle: "foundation",
  force: "mechanics",
  pressure: "mechanics",
  stress: "mechanics",
  torque: "mechanics",
  acceleration: "mechanics",
  speed: "mechanics",
  strain: "mechanics",
  secondMoment: "mechanics",
  density: "fluids",
  dynamicViscosity: "fluids",
  kinematicViscosity: "fluids",
  volumetricFlow: "fluids",
  energy: "thermal",
  power: "thermal",
  temperature: "thermal",
  frequency: "electrical",
  voltage: "electrical",
  current: "electrical",
  resistance: "electrical",
  capacitance: "electrical",
  charge: "electrical",
};

/** Original Caliper units as stable ids. */
const MENU: Record<(typeof FAMILIES)[number], readonly string[]> = {
  length: ["length.m", "length.mm", "length.cm", "length.km", "length.um", "length.in", "length.ft", "length.yd"],
  area: ["area.m2", "area.mm2", "area.cm2", "area.in2", "area.ft2"],
  volume: ["volume.m3", "volume.L", "volume.mL", "volume.ft3", "volume.gal_us"],
  mass: ["mass.kg", "mass.g", "mass.tonne", "mass.lbm", "mass.oz"],
  time: ["time.s", "time.min", "time.h", "time.day"],
  angle: ["angle.rad", "angle.degree", "angle.rev"],
  force: ["force.N", "force.kN", "force.MN", "force.lbf"],
  pressure: [
    "pressure.Pa",
    "pressure.kPa",
    "pressure.MPa",
    "pressure.bar",
    "pressure.bar_gauge",
    "pressure.bar_abs",
    "pressure.kPa_abs",
    "pressure.mbar",
    "pressure.psi",
    "pressure.atm",
  ],
  stress: ["stress.Pa", "stress.kPa", "stress.MPa", "stress.GPa", "stress.N_per_mm2", "stress.psi", "stress.ksi"],
  torque: ["torque.N_m", "torque.kN_m", "torque.lbf_ft", "torque.lbf_in"],
  acceleration: ["acceleration.m_s2", "acceleration.g", "acceleration.ft_s2"],
  speed: ["speed.m_s", "speed.mm_s", "speed.m_min", "speed.mm_min", "speed.km_h", "speed.mph", "speed.ft_s"],
  energy: ["energy.J", "energy.kJ", "energy.MJ", "energy.Wh", "energy.kWh", "energy.Btu"],
  power: ["power.W", "power.kW", "power.MW", "power.hp", "power.Btu_h"],
  temperature: ["temperature.K", "temperature.degC", "temperature.degF", "temperature.degR"],
  density: ["density.kg_m3", "density.g_cm3", "density.lbm_ft3", "density.lbm_in3"],
  dynamicViscosity: ["dynamicViscosity.Pa_s", "dynamicViscosity.cP", "dynamicViscosity.P"],
  kinematicViscosity: ["kinematicViscosity.m2_s", "kinematicViscosity.cSt", "kinematicViscosity.ft2_s"],
  volumetricFlow: [
    "volumetricFlow.m3_s",
    "volumetricFlow.L_s",
    "volumetricFlow.L_min",
    "volumetricFlow.us_gpm",
    "volumetricFlow.cfm",
  ],
  frequency: ["frequency.Hz", "frequency.kHz", "frequency.MHz", "frequency.rpm"],
  voltage: ["voltage.V", "voltage.mV", "voltage.kV"],
  current: ["current.A", "current.mA", "current.kA"],
  resistance: ["resistance.ohm", "resistance.kohm", "resistance.Mohm"],
  capacitance: ["capacitance.F", "capacitance.mF", "capacitance.uF", "capacitance.nF"],
  charge: ["charge.C", "charge.Ah", "charge.mAh"],
  strain: ["strain.one", "strain.micro"],
  secondMoment: ["secondMoment.m4", "secondMoment.cm4", "secondMoment.mm4", "secondMoment.in4"],
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
        domain: DOMAIN[family.id] ?? "foundation",
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

export const unitFamilyOptions = kitOptions
  .filter((option) => isUnitFamilyId(option.value))
  .map((option) => ({ ...option, domain: DOMAIN[option.value] ?? "foundation" }));

export const unitsForFamily = (familyId: UnitFamilyId) =>
  (MENU[familyId] ?? []).map((id) => {
    const unit = resolveUnit(familyId, id);
    return { id: unit.id, value: unit.id, label: unit.symbol };
  });

export const convertQuantity = (familyId: UnitFamilyId, value: number, fromUnit: string, toUnit: string) => {
  const result = convert(familyId, value, fromUnit, toUnit);
  return {
    converted: result.converted,
    canonical: result.canonical,
    canonicalUnit: result.canonicalUnit,
    family: result.family,
  };
};
