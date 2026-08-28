/**
 * Shapes shared by the field data and the evaluator.
 *
 * Its own module so the data can type itself without importing the evaluator —
 * a data file that imports the thing it feeds puts them in the wrong order in
 * the module graph, and this codebase has already been bitten three times by
 * chunk initialisation order.
 */
export type FieldKind = "number" | "select" | "text";
export type FieldDefinition = {
  key: string;
  label: string;
  symbol?: string;
  helper: string;
  kind: FieldKind;
  unit?: string;
  options?: { value: string; label: string }[];
};
