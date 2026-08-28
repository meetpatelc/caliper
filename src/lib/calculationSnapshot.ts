import type { CalculationState } from "./engineering";

type SnapshotTool = {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  assumptions: string[];
  contract: { formulaVersion: string; domain: string; safetyTier: string };
};

export const buildCalculationSnapshot = (tool: SnapshotTool, input: Record<string, string>, result: CalculationState) => ({
  format: "engineering-desk-calculation-snapshot/v1",
  tool: {
    id: tool.id,
    title: tool.title,
    formulaVersion: tool.contract.formulaVersion,
    domain: tool.contract.domain,
    safetyTier: tool.contract.safetyTier,
  },
  input,
  result: { values: result.values, warnings: result.warnings, method: result.method },
  source: { label: tool.sourceLabel, url: tool.sourceUrl },
  boundaries: tool.assumptions,
  boundary: "This local export records displayed inputs, formula output, method, source link, and stated boundaries. It is not an approval, certification, or engineering conclusion.",
});

export const extractSnapshotInput = (payload: unknown, expectedToolId: string): Record<string, string> => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Import file must contain a calculator snapshot object.");
  const snapshot = payload as Record<string, unknown>;
  if (snapshot.format !== "engineering-desk-calculation-snapshot/v1") throw new Error("Import file is not an Engineering Desk calculator snapshot.");
  if (!snapshot.tool || typeof snapshot.tool !== "object" || Array.isArray(snapshot.tool) || (snapshot.tool as Record<string, unknown>).id !== expectedToolId) throw new Error("Import snapshot belongs to a different calculator workspace.");
  if (!snapshot.input || typeof snapshot.input !== "object" || Array.isArray(snapshot.input)) throw new Error("Import snapshot does not contain typed calculator inputs.");
  const entries = Object.entries(snapshot.input as Record<string, unknown>);
  if (entries.some(([, value]) => typeof value !== "string")) throw new Error("Import snapshot inputs must be string values from an exported calculator state.");
  return Object.fromEntries(entries) as Record<string, string>;
};

/**
 * Assumptions worth showing beside the inputs they qualify.
 *
 * 42 of the library's assumptions are, word for word, the label of one of that
 * model's own input fields — "Declared bulk velocity" listed as a boundary on a
 * page with a field called Declared bulk velocity. That is not a limit, it is
 * the input's name a second time, and it renders a screen below the field it
 * duplicates.
 *
 * Filtered at render rather than removed from the data: the assumption is not
 * *wrong*, it just carries nothing the visible field does not already say, and
 * the data is shared with the record, the print sheet and the clipboard
 * summary. Where the field is on screen, the echo is noise; the rule is applied
 * wherever both are shown together.
 *
 * Anything that says more than a label — including a phrase that merely opens
 * one, like "Uniform solid circular shaft" against a hint reading "Uniform
 * solid circular shaft diameter" — is kept. Those are shorter than the hint but
 * not contained by it, and trimming on a prefix match would start deleting
 * real qualifications.
 */
export function assumptionsBeside(
  assumptions: string[],
  fieldLabels: string[],
  /**
   * Help text rendered on the same screen. Optional, and only supplied where it
   * is actually visible: the record and the print sheet list input *labels*, not
   * their help text, so an assumption that a helper covers is still the only
   * place that limit appears there.
   */
  fieldHelpers: string[] = [],
): string[] {
  const labels = new Set(fieldLabels.map((label) => label.trim().toLowerCase()));
  const helpers = fieldHelpers.map((helper) => helper.trim().toLowerCase()).filter(Boolean);
  return assumptions.filter((assumption) => {
    const value = assumption.trim().toLowerCase();
    if (labels.has(value)) return false;
    // A helper that opens with the assumption says the same thing and then says
    // more — "Constant mass" against "Constant mass in the selected
    // inertial-frame calculation." Printing both puts the identical opening
    // words on screen twice, and the shorter one is the copy that adds nothing.
    return !helpers.some((helper) => helper.startsWith(value));
  });
}

export const buildCalculationPrintScope = (tool: SnapshotTool, input: Record<string, string>, result: CalculationState, inputLabels: Record<string, string>) => ({
  title: tool.title,
  formulaVersion: tool.contract.formulaVersion,
  input: Object.entries(input).map(([key, value]) => ({ label: inputLabels[key] ?? key, value })),
  values: result.values.map(({ label, display, unit }) => ({ label, display, unit })),
  method: result.method,
  source: { label: tool.sourceLabel, url: tool.sourceUrl },
  boundaries: assumptionsBeside(tool.assumptions, Object.keys(input).map((key) => inputLabels[key] ?? key)),
  boundary: "This printout is a record of displayed inputs and deterministic formula output. It is not an approval, certification, or engineering conclusion.",
});
