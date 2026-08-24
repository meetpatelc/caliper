import type { CalculatorDefinition } from "@/studio/lib/calculator-types";
import { evaluateExpression, FormulaError } from "@instrument/formula";
import { resolveTables } from "@/studio/lib/tables";
import { convertQuantity, isUnitFamilyId, unitFamilies, unitId, unitSymbol, type UnitFamilyId } from "@/lib/units";
import { formatNumber } from "@/lib/utils";
import { quantitySymbol } from "@/lib/quantity-symbols";

export type FieldState = { value: string; unit: string };

export type OutputResult = {
  id: string;
  label: string;
  symbol?: string;
  display: string;
  unit: string;
  canonical: number;
  canonicalUnit: string;
};

export type Evaluation =
  | { ok: true; outputs: OutputResult[]; scope: Record<string, number> }
  | { ok: false; error: string; fieldId?: string };

type Evaluable = Pick<CalculatorDefinition, "fields" | "outputs" | "tables">;

export function defaultFieldState(calculator: Evaluable): Record<string, FieldState> {
  return Object.fromEntries(
    calculator.fields.map((field) => [
      field.id,
      field.input === "choice"
        ? { value: field.defaultOption ?? field.options?.[0]?.value ?? "", unit: field.defaultUnit }
        : { value: String(field.defaultValue), unit: field.defaultUnit },
    ]),
  );
}

/** Keep the physical quantity; rewrite the typed number into `toUnit`. Non-numeric text is left as-is. */
export function retargetField(family: UnitFamilyId, value: string, fromUnit: string, toUnit: string): FieldState {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return { value, unit: toUnit };
  if (fromUnit === toUnit) return { value, unit: toUnit };
  const { converted } = convertQuantity(family, numeric, fromUnit, toUnit);
  return { value: formatNumber(converted, 6), unit: toUnit };
}

/** Studio authored default: same physical quantity, rewritten into the newly chosen unit. */
export function retargetAuthoredDefault(
  family: UnitFamilyId,
  defaultValue: number,
  fromUnit: string,
  toUnit: string,
): { defaultValue: number; defaultUnit: string } {
  if (fromUnit === toUnit || !Number.isFinite(defaultValue)) {
    return { defaultValue, defaultUnit: toUnit };
  }
  const { converted } = convertQuantity(family, defaultValue, fromUnit, toUnit);
  if (!Number.isFinite(converted)) return { defaultValue, defaultUnit: toUnit };
  return { defaultValue: converted, defaultUnit: toUnit };
}

function familyForUnits(fromUnit: string, toUnit: string): UnitFamilyId | undefined {
  const families = Object.keys(unitFamilies) as UnitFamilyId[];
  for (const family of families) {
    if (!isUnitFamilyId(family)) continue;
    try {
      unitId(family, fromUnit);
      unitId(family, toUnit);
      return family;
    } catch {
      /* try next family */
    }
  }
  return undefined;
}

/** Convert an authored Studio field into `nextUnit` whenever both units share a family. */
export function retargetAuthoredField(
  field: { family?: UnitFamilyId; defaultValue: number; defaultUnit: string },
  nextUnit: string,
): { defaultValue: number; defaultUnit: string } {
  const unit = nextUnit || "1";
  const family = field.family ?? familyForUnits(field.defaultUnit, unit);
  if (!family) return { defaultValue: field.defaultValue, defaultUnit: unit };
  try {
    return retargetAuthoredDefault(family, field.defaultValue, field.defaultUnit, unit);
  } catch {
    return { defaultValue: field.defaultValue, defaultUnit: unit };
  }
}

export function evaluateCalculator(
  calculator: Evaluable,
  fields: Record<string, FieldState>,
  outputUnits?: Record<string, string>,
): Evaluation {
  const scope: Record<string, number> = {};
  const strings: Record<string, string> = {};
  try {
    for (const field of calculator.fields) {
      const state = fields[field.id];
      if (field.input === "choice") {
        const value = state?.value ?? field.defaultOption ?? field.options?.[0]?.value ?? "";
        if (!value) throw new FormulaError(`Choose a value for ${field.label}.`, field.id);
        strings[field.id] = value;
        const numeric = Number(value);
        if (Number.isFinite(numeric)) scope[field.id] = numeric;
        continue;
      }
      const raw = Number(state?.value);
      if (!Number.isFinite(raw)) throw new FormulaError(`Enter a number for ${field.label}.`, field.id);
      const canonical = field.family
        ? convertQuantity(field.family, raw, state.unit, state.unit).canonical
        : raw;
      scope[field.id] = canonical;
      if (typeof field.minimum === "number" && typeof field.maximum === "number") {
        if (canonical < field.minimum || canonical > field.maximum) {
          throw new FormulaError(`${field.label} must be between ${field.minimum} and ${field.maximum}.`, field.id);
        }
      } else if (typeof field.minimum === "number" && canonical < field.minimum) {
        throw new FormulaError(`${field.label} must be at least ${field.minimum}.`, field.id);
      } else if (typeof field.maximum === "number" && canonical > field.maximum) {
        throw new FormulaError(`${field.label} must be at most ${field.maximum}.`, field.id);
      }
    }
    const resolved = resolveTables(calculator, fields);
    for (const [name, value] of Object.entries(resolved.numbers)) {
      if (name in scope) throw new Error(`Table column ${name} collides with an input. Rename it.`);
      scope[name] = value;
    }
    const outputs: OutputResult[] = calculator.outputs.map((output) => {
      const canonical = evaluateExpression(output.expression, scope, { strings, tables: resolved.tables });
      if (!output.family) {
        return {
          id: output.id,
          label: output.label,
          symbol: quantitySymbol(output.id, output.symbol),
          display: formatNumber(canonical, output.precision ?? 4),
          unit: output.defaultUnit,
          canonical,
          canonicalUnit: output.defaultUnit,
        };
      }
      const family = output.family;
      const requested = outputUnits?.[output.id] ?? output.defaultUnit;
      let unit = requested;
      if (output.units?.length) {
        const allowedIds = new Set(output.units.map((token) => unitId(family, token)));
        let requestedId = "";
        try {
          requestedId = unitId(family, requested);
        } catch {
          requestedId = "";
        }
        if (!allowedIds.has(requestedId)) unit = output.defaultUnit;
      }
      const converted = convertQuantity(family, canonical, unitFamilies[family].canonicalUnit, unit);
      return {
        id: output.id,
        label: output.label,
        symbol: quantitySymbol(output.id, output.symbol),
        display: formatNumber(converted.converted, output.precision ?? 4),
        unit: unitSymbol(family, unit),
        canonical,
        canonicalUnit: converted.canonicalUnit,
      };
    });
    return { ok: true, outputs, scope };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not evaluate.",
      fieldId: error instanceof FormulaError ? error.fieldId : undefined,
    };
  }
}
