import { createFileRoute } from "@tanstack/react-router";
import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { Iso286Instrument } from "@/gauge/components/iso-286";
import { toolSearchFromUnknown } from "@/lib/search-params";

export const Route = createFileRoute("/tool/$toolId")({
  validateSearch: (search: Record<string, unknown>) => toolSearchFromUnknown(search),
  component: ToolRoute,
});

function ToolRoute() {
  const { toolId } = Route.useParams();
  const search = Route.useSearch();
  if (toolId === "fits") return <Iso286Instrument />;
  return <CalculatorWorkspace toolId={toolId} search={search} />;
}
