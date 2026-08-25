import { createFileRoute } from "@tanstack/react-router";
import { getTool } from "@/lib/catalog";
import { PARENT_NAME } from "@/lib/instrument";
import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { Iso286Instrument } from "@/studio/components/iso-286";
import { toolSearchFromUnknown } from "@/lib/search-params";

export const Route = createFileRoute("/tool/$toolId")({
  validateSearch: (search: Record<string, unknown>) => toolSearchFromUnknown(search),
  // Every page previously shared one <title>, so 169 calculators were
  // indistinguishable in tabs, history, bookmarks and search results.
  head: ({ params }) => {
    const tool = getTool(params.toolId);
    if (!tool) return {};
    const title = `${tool.title} · ${PARENT_NAME}`;
    return {
      meta: [
        { title },
        { name: "description", content: tool.description },
        { property: "og:title", content: title },
        { property: "og:description", content: tool.description },
      ],
    };
  },
  component: ToolRoute,
});

function ToolRoute() {
  const { toolId } = Route.useParams();
  const search = Route.useSearch();
  if (toolId === "fits") return <Iso286Instrument />;
  return <CalculatorWorkspace toolId={toolId} search={search} />;
}
