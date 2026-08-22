/**
 * Caliper adapter over @instrument/units.
 * Conversion math lives in the package. Shop overlay stays in fieldUnits.ts.
 */
import {
  convertQuantity as convert,
  getFamily,
  inventory,
  isUnitFamilyId as isFamily,
  unitFamilyOptions as kitOptions,
  unitsForFamily as kitUnits,
} from "@instrument/units";

const DOMAIN: Record<string, "foundation" | "mechanics" | "fluids" | "thermal" | "electrical"> = {
  dimensionless: "foundation",
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
  density: "fluids",
  dynamicViscosity: "fluids",
  kinematicViscosity: "fluids",
  volumetricFlow: "fluids",
  massFlow: "fluids",
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

export type UnitFamilyId = string;

export const isUnitFamilyId = (value: string): value is UnitFamilyId => isFamily(value);

export const unitFamilies = Object.fromEntries(
  inventory.families.map((family) => {
    const units = Object.fromEntries(
      family.units.flatMap((unit) => {
        const keys = new Set([unit.symbol, unit.id, ...unit.aliases]);
        const entry = { symbol: unit.symbol, label: unit.label };
        return [...keys].map((key) => [key, entry]);
      }),
    );
    return [
      family.id,
      {
        id: family.id,
        label: family.label,
        canonicalUnit: family.canonicalUnit,
        domain: DOMAIN[family.id] ?? "foundation",
        units,
      },
    ];
  }),
);

export const unitFamilyOptions = kitOptions.map((option) => ({
  ...option,
  domain: DOMAIN[option.value] ?? "foundation",
}));

export const unitsForFamily = (familyId: UnitFamilyId) => kitUnits(familyId).map(({ value, label }) => ({ value, label }));

export const convertQuantity = (familyId: UnitFamilyId, value: number, fromUnit: string, toUnit: string) => {
  const result = convert(familyId, value, fromUnit, toUnit);
  return {
    converted: result.converted,
    canonical: result.canonical,
    canonicalUnit: result.canonicalUnit,
    family: result.family,
  };
};

export { getFamily };
