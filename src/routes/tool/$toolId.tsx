import { createFileRoute } from "@tanstack/react-router";
import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { toolSearchFromUnknown } from "@/lib/search-params";

export const Route = createFileRoute("/tool/$toolId")({
  validateSearch: (search: Record<string, unknown>) => toolSearchFromUnknown(search),
  component: ToolRoute,
});

function ToolRoute() {
  const { toolId } = Route.useParams();
  const search = Route.useSearch();
  return <CalculatorWorkspace toolId={toolId} search={search} />;
}
