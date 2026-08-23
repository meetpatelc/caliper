import type { CalculatorDefinition, TableDefinition } from "@/gauge/lib/calculator-types";
import { convertQuantity, type UnitFamilyId } from "@/lib/units";

export function resolveTables(
  calculator: Pick<CalculatorDefinition, "fields" | "tables">,
  fields: Record<string, { value: string; unit: string }>,
): { numbers: Record<string, number>; tables: Record<string, Record<string, number>> } {
  const numbers: Record<string, number> = {};
  const tables: Record<string, Record<string, number>> = {};
  for (const table of calculator.tables ?? []) {
    const field = calculator.fields.find((item) => item.id === table.matchField);
    if (!field) throw new Error(`Table "${table.name}" needs an input named ${table.matchField}.`);
    const state = fields[table.matchField];
    const row = matchRow(table, field.family, field.label, state);
    if (row.values.length !== table.columns.length) {
      throw new Error(`Table "${table.name}" row does not match its columns.`);
    }
    const cols: Record<string, number> = {};
    table.columns.forEach((column, index) => {
      const raw = row.values[index];
      const canonical = column.family ? convertQuantity(column.family, raw, column.unit, column.unit).canonical : raw;
      cols[column.id] = canonical;
      if (column.id in numbers) throw new Error(`Table column ${column.id} collides with another name. Rename it.`);
      numbers[column.id] = canonical;
    });
    tables[table.id] = cols;
  }
  return { numbers, tables };
}

function matchRow(
  table: TableDefinition,
  family: UnitFamilyId | undefined,
  label: string,
  state: { value: string; unit: string } | undefined,
) {
  if (table.kind === "keyed") {
    const key = state?.value ?? "";
    const row = table.rows.find((item) => item.key === key);
    if (!row) throw new Error(`${label} "${key}" is not in ${table.name}.`);
    return row;
  }
  const raw = Number(state?.value);
  if (!Number.isFinite(raw)) throw new Error(`Enter a number for ${label}.`);
  const unit = table.matchUnit || state?.unit || "1";
  const x = family ? convertQuantity(family, raw, state?.unit ?? unit, unit).converted : raw;
  const row = table.rows.find(
    (item) => x > (item.min ?? Number.NEGATIVE_INFINITY) && x <= (item.max ?? Number.POSITIVE_INFINITY),
  );
  if (!row) throw new Error(`${label} ${x} ${unit} is outside ${table.name}.`);
  return row;
}
