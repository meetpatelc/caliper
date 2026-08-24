import type { Conversion, FamilyDefinition, Inventory, UnitDefinition, UnitStatus } from "./types.ts";

export const inventory: Inventory;
export function getFamily(familyId: string): FamilyDefinition;
export function isUnitFamilyId(value: string): boolean;
export const unitFamilyOptions: Array<{ value: string; label: string }>;
export function resolveUnit(familyId: string, token: string): UnitDefinition;
export function unitsForFamily(familyId: string): Array<{
  id: string;
  value: string;
  label: string;
  status: UnitStatus;
}>;
export function convertQuantity(familyId: string, value: number, from: string, to: string): Conversion;
