/**
 * Split packed governing relations. ` · ` with spaces glues equations;
 * tight `·` is multiplication and stays inside a relation.
 */
export function splitRelations(formula: string) {
  const parts = formula
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1 && parts.every((part) => part.includes("="))) return parts;
  return [formula];
}

export function inlineRelations(formula: string) {
  return splitRelations(formula).join("; ");
}
