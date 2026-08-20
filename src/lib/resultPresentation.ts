import type { CalculationValue } from "./engineering";

export type ResultValueGroup = { label: string; primary: CalculationValue; alternatives: CalculationValue[] };

/** Groups repeated labels so alternative units are presented as one physical quantity. */
export function groupResultValues(values: CalculationValue[]): ResultValueGroup[] {
  const groups = new Map<string, CalculationValue[]>();
  for (const value of values) groups.set(value.label, [...(groups.get(value.label) ?? []), value]);
  return Array.from(groups.entries()).map(([label, group]) => ({ label, primary: group[0], alternatives: group.slice(1) }));
}
