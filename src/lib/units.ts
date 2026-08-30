/**
 * Desk unit menu: the kit is the conversion truth.
 * This file is only the Instrument-approved family/unit tray (original short lists).
 */
import {
  convertQuantity as convert,
  inventory,
  resolveUnit,
  unitFamilyOptions as kitOptions,
} from "@instrument/units";

/**
 * Every unit family the app knows, in one place.
 *
 * Exported because the drafting contract turns this into a JSON Schema enum:
 * a model asked for a "family" as a bare string has to guess which forty words
 * are legal, and a wrong guess throws away the whole draft after a minute of
 * work. As an enum, structured output cannot emit one that does not exist.
 */
export const FAMILIES = [
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
  "temperatureDelta",
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
  "dimensionless",
  "specificHeat",
  "thermalConductivity",
  "stiffness",
  "massFlow",
  "momentOfInertia",
  "angularSpeed",
  "angularAcceleration",
  "thermalResistance",
  "specificVolume",
  "heatFlux",
  "specificEnergy",
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
  stiffness: "mechanics",
  dimensionless: "foundation",
  density: "fluids",
  dynamicViscosity: "fluids",
  kinematicViscosity: "fluids",
  volumetricFlow: "fluids",
  energy: "thermal",
  power: "thermal",
  temperature: "thermal",
  temperatureDelta: "thermal",
  specificHeat: "thermal",
  thermalConductivity: "thermal",
  frequency: "electrical",
  voltage: "electrical",
  current: "electrical",
  resistance: "electrical",
  capacitance: "electrical",
  charge: "electrical",
};

/** The original unit set, as stable ids. */
const MENU: Record<(typeof FAMILIES)[number], readonly string[]> = {
  length: ["length.m", "length.mm", "length.cm", "length.km", "length.um", "length.in", "length.ft", "length.yd"],
  area: ["area.m2", "area.mm2", "area.cm2", "area.in2", "area.ft2"],
  volume: ["volume.m3", "volume.L", "volume.mL", "volume.ft3", "volume.gal_us"],
  mass: ["mass.kg", "mass.g", "mass.tonne", "mass.lbm", "mass.oz"],
  time: ["time.s", "time.min", "time.h", "time.day"],
  angle: ["angle.rad", "angle.degree", "angle.rev"],
  // kgf sits between the metric and imperial entries because that is where it
  // belongs to a reader, not because of any ordering rule. It was the one unit
  // the inventory defined and no picker offered — the engine has always
  // converted it, so the omission showed up as a unit that exists everywhere
  // except in the list you choose from.
  force: ["force.N", "force.kN", "force.MN", "force.kgf", "force.lbf"],
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
  temperatureDelta: ["temperatureDelta.K", "temperatureDelta.degC", "temperatureDelta.degF"],
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
  dimensionless: ["dimensionless.one", "dimensionless.percent"],
  specificHeat: ["specificHeat.J_kg_K", "specificHeat.kJ_kg_K"],
  thermalConductivity: ["thermalConductivity.W_m_K"],
  stiffness: ["stiffness.N_m", "stiffness.N_mm", "stiffness.lbf_in"],
  massFlow: ["massFlow.kg_s", "massFlow.kg_h"],
  momentOfInertia: ["momentOfInertia.kg_m2", "momentOfInertia.kg_cm2"],
  angularSpeed: ["angularSpeed.rad_s", "angularSpeed.rpm"],
  angularAcceleration: ["angularAcceleration.rad_s2"],
  thermalResistance: ["thermalResistance.K_W"],
  specificVolume: ["specificVolume.m3_kg"],
  heatFlux: ["heatFlux.W_m2"],
  specificEnergy: ["specificEnergy.J_kg", "specificEnergy.kJ_kg"],
};

export type UnitFamilyId = (typeof FAMILIES)[number];

/**
 * Every unit symbol the app will accept, across all families.
 *
 * The same reason `FAMILIES` is exported: the drafting contract sends this to
 * the provider as an enum. `defaultUnit` went out as a bare string, and a draft
 * for "how much does a steel bar weigh" came back with an area in `mm^2` — a
 * spelling `resolveUnit` does not know, because it matches on the full id, the
 * symbol, or a listed alias, and `mm^2` is none of the three. The draft was
 * discarded after a minute of work over a caret.
 *
 * Symbols rather than ids, because that is what the editor's unit select emits
 * and therefore what every saved model already stores: the id `area.mm2` is
 * accepted too, but nothing in the app writes it that way.
 *
 * Deliberately not per-family. JSON Schema cannot make one property's enum
 * depend on another's value without `if`/`then`, which strict structured
 * outputs do not support, so pairing a symbol with the wrong family stays
 * possible — and stays caught by evaluation. Misspelling one does not.
 */
/**
 * Every unit the app knows, as `family.unit` — one identifier naming both.
 *
 * `family` and `defaultUnit` were sent to the provider as two independent
 * enums, which makes each value legal and says nothing about the pair. A draft
 * came back with family `massFlow` and unit `kg/m³`: both real, together
 * meaningless, and `resolveUnit` threw, so the draft was discarded. JSON Schema
 * cannot make one property's enum depend on another's value without `if`/`then`,
 * which strict structured outputs do not support — so the two questions are
 * asked as one, and the drafting contract splits the answer back apart.
 *
 * A mismatch stops being caught and starts being unrepresentable.
 */
export const UNIT_IDS = inventory.families
  .flatMap((family) => family.units.map((unit) => unit.id))
  .sort() as [string, ...string[]];

export const UNIT_SYMBOLS = [
  ...new Set(inventory.families.flatMap((family) => family.units.map((unit) => unit.symbol))),
].sort() as [string, ...string[]];

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

export const unitsForFamily = (familyId: UnitFamilyId, allowed?: string[]) => {
  const all = (MENU[familyId] ?? []).map((id) => {
    const unit = resolveUnit(familyId, id);
    return { id: unit.id, value: unit.id, label: unit.symbol };
  });
  if (!allowed?.length) return all;
  const allow = new Set(allowed.map((token) => resolveUnit(familyId, token).id));
  const filtered = all.filter((unit) => allow.has(unit.id));
  return filtered.length ? filtered : all;
};

export const convertQuantity = (familyId: UnitFamilyId, value: number, fromUnit: string, toUnit: string) => {
  const result = convert(familyId, value, fromUnit, toUnit);
  return {
    converted: result.converted,
    canonical: result.canonical,
    canonicalUnit: result.canonicalUnit,
    family: result.family,
  };
};
