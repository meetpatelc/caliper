import { runCaliperModel, type CaliperModel } from "@/lib/caliper-runner";

/** Empty on purpose. Remaining algebra lives on InstrumentDocument. */
export const caliperModels: Record<string, CaliperModel> = {};

export function runDeclarative(toolId: string, input: Record<string, string>) {
  const model = caliperModels[toolId];
  if (!model) throw new Error(`No declarative model for ${toolId}.`);
  return runCaliperModel(model, input);
}
