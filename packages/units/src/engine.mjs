import raw from "../data/inventory.json" with { type: "json" };

export const inventory = raw;

const families = new Map(inventory.families.map((family) => [family.id, family]));

export function getFamily(familyId) {
  const family = families.get(familyId);
  if (!family) throw new Error(`Unknown unit family: ${familyId}`);
  return family;
}

export function isUnitFamilyId(value) {
  return families.has(value);
}

export const unitFamilyOptions = inventory.families.map((family) => ({
  value: family.id,
  label: family.label,
}));

export function resolveUnit(familyId, token) {
  const family = getFamily(familyId);
  const exact = family.units.find((unit) => unit.id === token);
  if (exact) return exact;
  const bySymbol = family.units.find((unit) => unit.symbol === token);
  if (bySymbol) return bySymbol;
  const byAlias = family.units.find((unit) => unit.aliases.includes(token));
  if (byAlias) return byAlias;
  throw new Error(`Select compatible units (${familyId}: ${token}).`);
}

export function unitsForFamily(familyId) {
  return getFamily(familyId).units.map((unit) => ({
    id: unit.id,
    value: unit.symbol,
    label: unit.symbol,
    status: unit.status,
  }));
}

function toCanonical(unit, value) {
  if (unit.kind === "linear") return value * unit.factor;
  return value * unit.scale + unit.offset;
}

function fromCanonical(unit, canonical) {
  if (unit.kind === "linear") return canonical / unit.factor;
  return (canonical - unit.offset) / unit.scale;
}

export function convertQuantity(familyId, value, from, to) {
  const family = getFamily(familyId);
  const source = resolveUnit(familyId, from);
  const target = resolveUnit(familyId, to);
  const canonical = toCanonical(source, value);
  return {
    converted: fromCanonical(target, canonical),
    canonical,
    canonicalUnit: family.canonicalUnit,
    family: family.label,
    familyId: family.id,
    fromId: source.id,
    toId: target.id,
  };
}
