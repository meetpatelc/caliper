import type { ToolId } from "@/lib/catalog";
import { ToolSketch } from "@/components/sketches";

export default function MechanicalDiagram({ toolId, variant }: { toolId: ToolId; variant?: string }) {
  return (
    <div className="mechanical-diagram w-full">
      <ToolSketch toolId={toolId} variant={variant} />
    </div>
  );
}