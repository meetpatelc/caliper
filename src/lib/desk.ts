import { tools, type ToolId } from "@/lib/catalog";
import { domains } from "@/lib/platform";

export const APP_NAME = "Caliper";
export const APP_TAGLINE = "Engineering models, in view.";
export const MODEL_COUNT = tools.length;

export const activeDomains = domains.map((domain) => {
  const count = tools.filter((tool) => tool.contract.domain === domain.id).length;
  return {
    ...domain,
    count,
    state: count > 0 ? ("released" as const) : domain.state,
  };
});

export const releasedDomains = activeDomains.filter((domain) => domain.state === "released");

export function isFieldHidden(toolId: ToolId, key: string, input: Record<string, string>) {
  if (toolId === "section" && ((key === "height" && input.shape !== "rectangle") || (key === "innerDiameter" && input.shape !== "annulus"))) {
    return true;
  }
  const controlSubgroupField = key === "subgroupSize" || key.startsWith("subgroupMean") || key.startsWith("subgroupVariation");
  const controlIndividualField = key.startsWith("individual");
  if (
    toolId === "controlChart" &&
    ((input.mode === "individualMr" && controlSubgroupField) || (input.mode !== "individualMr" && controlIndividualField))
  ) {
    return true;
  }
  if (
    toolId === "taylorToolLife" &&
    ((input.mode === "lifeFromSpeed" && key === "toolLife") || (input.mode === "speedFromLife" && key === "cuttingSpeed"))
  ) {
    return true;
  }
  if (toolId === "darcyFrictionFactor" && input.mode === "laminar" && (key === "absoluteRoughness" || key === "insideDiameter")) {
    return true;
  }
  return false;
}

export function relatedTools(toolId: ToolId, limit = 4) {
  const current = tools.find((tool) => tool.id === toolId);
  if (!current) return [];
  return tools.filter((tool) => tool.id !== toolId && tool.contract.domain === current.contract.domain).slice(0, limit);
}
