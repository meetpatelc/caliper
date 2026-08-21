import type { ToolId } from "@/lib/catalog";
import { sketchFor } from "@/components/sketches";

export default function MechanicalDiagram({ toolId, variant }: { toolId: ToolId; variant?: string }) {
  return <div className="mechanical-diagram w-full">{sketchFor(toolId, variant)}</div>;
}
