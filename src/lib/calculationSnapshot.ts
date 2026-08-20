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

export const buildCalculationPrintScope = (tool: SnapshotTool, input: Record<string, string>, result: CalculationState, inputLabels: Record<string, string>) => ({
  title: tool.title,
  formulaVersion: tool.contract.formulaVersion,
  input: Object.entries(input).map(([key, value]) => ({ label: inputLabels[key] ?? key, value })),
  values: result.values.map(({ label, display, unit }) => ({ label, display, unit })),
  method: result.method,
  source: { label: tool.sourceLabel, url: tool.sourceUrl },
  boundaries: tool.assumptions,
  boundary: "This printout is a record of displayed inputs and deterministic formula output. It is not an approval, certification, or engineering conclusion.",
});
