import { createFileRoute, notFound } from "@tanstack/react-router";
import { getTool } from "@/lib/catalog";
import { PARENT_NAME } from "@/lib/instrument";
import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { Iso286Instrument } from "@/studio/components/iso-286";
import { toolSearchFromUnknown } from "@/lib/search-params";
import { seoLinks, seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/tool/$toolId")({
  validateSearch: (search: Record<string, unknown>) => toolSearchFromUnknown(search),
  // An unknown tool id answered 200 with a "not a released calculator" page.
  // The page was right and the status was not: a search engine indexes it, a
  // monitor reading status codes sees success, and a broken link in someone
  // else's document looks alive. `notFound()` renders the same recovery page
  // with the status the response actually means.
  beforeLoad: ({ params }) => {
    if (params.toolId !== "fits" && !getTool(params.toolId)) throw notFound();
  },
  // Every page previously shared one <title>, so 169 calculators were
  // indistinguishable in tabs, history, bookmarks and search results.
  head: ({ params }) => {
    const tool = getTool(params.toolId);
    // A missing calculator still deserves a name; it was inheriting the bare
    // app title, so every dead link looked identical in a tab or a search result.
    if (!tool) return { meta: [{ title: `Not found · ${PARENT_NAME}` }] };
    const title = `${tool.title} · ${PARENT_NAME}`;
    /*
     * The canonical points at the bare path, deliberately dropping the query.
     *
     * Every model takes its inputs from the query string and writes them back
     * as they change, so one model page has an unbounded number of URLs —
     * `?force=25&area=1000`, the same values in another order, a colleague's
     * numbers, a link from a record. Left alone a crawler treats each as its
     * own page, splits whatever authority the model has between them, and
     * indexes whichever it happened to find. There are 169 of these, and they
     * are the reason the site is worth finding at all.
     */
    const path = `/tool/${params.toolId}`;
    return {
      meta: seoMeta({ title, description: tool.description, path }),
      links: seoLinks(path),
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
