import { tools, type ToolDefinition, type ToolId } from "./catalog";
import { calculateTool, initialInputs } from "./engineering";
import { sourceRegistry } from "./platform";

export type ToolBrief = {
  toolId: ToolId;
  purpose: string;
  theory: string;
  governingRelation: string;
  sourceScope: string;
  useCase: string;
  inputContext: string;
  interpretation: string;
  boundary: string;
};

const domainTheory: Record<ToolDefinition["contract"]["domain"], string> = {
  foundation: "a defined unit, quantity, or elementary engineering relationship",
  mathematics: "a closed-form quantity, conversion, geometry, or dimension relationship",
  mechanics: "an equilibrium, stress–strain, deformation, stability, or energy relationship",
  dynamics: "a declared kinematic, inertia, force, torque, or timing relationship",
  materials: "a source-qualified material-property or condition relationship",
  fluids: "a stated continuity, pressure, head, or flow relationship",
  thermal: "a declared heat-transfer, thermal-resistance, or thermodynamic state relationship",
  electrical: "a stated electrical circuit or power relationship",
  quality: "a defined tolerance, variation, uncertainty, or capability arithmetic relationship",
  automation: "a declared motion, pneumatic, force, or timing relationship",
  manufacturing: "a declared geometric, process-rate, force, or time relationship",
  applied: "a visible systems-level budget, comparison, or declared operating relationship",
};

const createBrief = (tool: ToolDefinition): ToolBrief => ({
  toolId: tool.id,
  purpose: tool.description,
  theory: `${tool.sourceLabel} is registered for ${sourceRegistry.find((record) => tool.contract.sourceIds.includes(record.id))?.scope ?? tool.kicker.toLowerCase()}. ${tool.title} applies ${domainTheory[tool.contract.domain]} inside the stated ${tool.kicker.toLowerCase()} boundary.`,
  governingRelation: calculateTool(tool.id, initialInputs[tool.id]).method,
  sourceScope: sourceRegistry.filter((record) => tool.contract.sourceIds.includes(record.id)).map((record) => record.scope).join(" · ") || tool.sourceLabel,
  useCase: `Use this ${tool.kicker.toLowerCase()} workspace when the engineering question is specifically about ${tool.outputLabel.toLowerCase()} under the displayed assumptions—not a broader component or system decision.`,
  inputContext: `Establish ${tool.contract.prerequisites.join(", ")} from project evidence, drawings, measurements, specifications, or an independently justified upstream method before entering values.`,
  interpretation: `Read ${tool.outputLabel.toLowerCase()} as the literal response of the visible model only. Compare or act on it only through a separate, project-specific engineering process.`,
  boundary: tool.assumptions.join(" · "),
});

export const toolBriefs = Object.fromEntries(tools.map((tool) => [tool.id, createBrief(tool)])) as Record<ToolId, ToolBrief>;

export const getToolBrief = (toolId: ToolId) => toolBriefs[toolId];
