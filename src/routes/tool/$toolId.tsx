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
  // Keyed by tool so React remounts on a tool change.
  //
  // Every piece of per-tool state here is a lazy `useState(() => …)`, which runs
  // on mount only. Without a key the workspace stays mounted while `toolId`
  // changes underneath it, so the previous tool's state renders against the new
  // tool's fields for a frame. Navigating from any calculator into the unit
  // converter threw outright — `input.category` was still the old tool's input,
  // so the family lookup got `undefined` and the page died with "Unknown unit
  // family: undefined". Reported from the field; a fresh page load always
  // worked, which is what made it look intermittent.
  return <CalculatorWorkspace key={toolId} toolId={toolId} search={search} />;
}
