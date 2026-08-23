import { evaluateExpression } from "@instrument/formula";

export type CaliperField = { id: string; label: string; signed?: boolean };
export type CaliperLocal = { id: string; expression: string };
export type CaliperOutput = { key: string; label: string; raw: string; display: string; unit: string };
export type CaliperModel = {
  fields: CaliperField[];
  locals?: CaliperLocal[];
  outputs: CaliperOutput[];
  method: string;
  warnings: string[];
};

type CalculationValue = { key: string; label: string; raw: number; display: string; unit: string };
type CalculationState = { values: CalculationValue[]; warnings: string[]; errors: string[]; method: string };

const finite = (value: string, label: string, positive = true) => {
  if (value.trim() === "") throw new Error(`${label} is required.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number.`);
  if (positive && parsed <= 0) throw new Error(`${label} must be greater than zero.`);
  return parsed;
};

const round = (value: number, significant = 5) => {
  if (value === 0) return "0";
  const decimals = Math.max(0, significant - Math.floor(Math.log10(Math.abs(value))) - 1);
  return Number(value.toFixed(Math.min(decimals, 10))).toLocaleString("en-US", { maximumFractionDigits: Math.min(decimals, 10) });
};

const quantity = (key: string, label: string, raw: number, value: number, unit: string): CalculationValue => ({
  key,
  label,
  raw,
  display: round(value),
  unit,
});

export function runCaliperModel(model: CaliperModel, input: Record<string, string>): CalculationState {
  const scope: Record<string, number> = {};
  for (const field of model.fields) {
    scope[field.id] = finite(input[field.id] ?? "", field.label, !field.signed);
  }
  for (const local of model.locals ?? []) {
    scope[local.id] = evaluateExpression(local.expression, scope);
  }
  const values = model.outputs.map((output) =>
    quantity(output.key, output.label, evaluateExpression(output.raw, scope), evaluateExpression(output.display, scope), output.unit),
  );
  return { values, warnings: model.warnings, errors: [], method: model.method };
}
