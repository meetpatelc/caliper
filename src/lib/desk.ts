import { tools, type ToolId } from "@/lib/catalog";
import { domains } from "@/lib/platform";

export const APP_NAME = "Library";
export const APP_TAGLINE = "Set the numbers. Keep the model in frame.";
export const APP_JOB = "Open a finished model and get a number.";
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

export function savedHeadline(resultJson: string): string {
  try {
    const values = JSON.parse(resultJson)?.values as { display?: string; unit?: string }[] | undefined;
    const first = values?.[0];
    if (!first?.display) return "";
    return `${first.display} ${first.unit ?? ""}`.trim();
  } catch {
    return "";
  }
}

export function openDeskSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("instrument:open-search"));
}

export function isFieldHidden(toolId: ToolId, key: string, input: Record<string, string>) {
  if (toolId === "converter" && key === "to") return true;
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
