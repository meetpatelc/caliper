import { createFileRoute } from "@tanstack/react-router";
import { CalculatorWorkspace } from "@/components/calculator-workspace";

export const Route = createFileRoute("/tool/$toolId")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(search)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  },
  component: ToolRoute,
});

function ToolRoute() {
  const { toolId } = Route.useParams();
  const search = Route.useSearch();
  return <CalculatorWorkspace toolId={toolId} search={search} />;
}
