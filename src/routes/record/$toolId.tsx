import { createFileRoute, Link } from "@tanstack/react-router";
import { getTool, type ToolId } from "@/lib/catalog";
import { calculateTool, initialInputs, toolFields } from "@/lib/engineering";
import { buildCalculationPrintScope } from "@/lib/calculationSnapshot";
import { splitRecordSearch, toolSearchFromUnknown } from "@/lib/search-params";
import { PARENT_NAME } from "@/lib/instrument";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { MissingPage } from "@/components/missing-page";
import { GoverningRelation } from "@/components/governing-relation";
import { cn } from "@/lib/utils";

/**
 * A calculation as a document, not a control panel.
 *
 * `/tool/:id?…` already reopens a model with given numbers, but it hands you
 * the interactive workspace. What an engineer files in a design folder — and
 * what is worth sending to a colleague — is the finished thing: the inputs
 * that were used, the number that came out, the method, and the boundary the
 * number is only valid inside.
 *
 * Entirely derived from the URL. Nothing is stored, so a record cannot expire,
 * cannot leak someone's account, and stays readable by anyone with the link.
 * That also makes every shared record a real page rather than a redirect.
 */
export const Route = createFileRoute("/record/$toolId")({
  validateSearch: (search: Record<string, unknown>) => toolSearchFromUnknown(search),
  head: ({ params, match }) => {
    const tool = getTool(params.toolId);
    if (!tool) return {};
    const search = (match.search ?? {}) as Record<string, string>;
    const { input: stated } = splitRecordSearch(search);
    const input = { ...(initialInputs[params.toolId as ToolId] ?? {}), ...stated };
    const result = calculateTool(params.toolId as ToolId, input);
    const headline = result.values[0];
    // The result belongs in the title: a shared link should say what it found,
    // not just which calculator was opened.
    const summary = headline ? `${headline.display} ${headline.unit}` : tool.title;
    const title = `${tool.title}: ${summary} · ${PARENT_NAME}`;
    return {
      meta: [
        { title },
        { name: "description", content: `${tool.description} Method: ${result.method}` },
        { property: "og:title", content: title },
        { property: "og:description", content: `${tool.description} Method: ${result.method}` },
      ],
    };
  },
  component: RecordPage,
});

function RecordPage() {
  const { toolId } = Route.useParams();
  const search = Route.useSearch();
  const tool = getTool(toolId);

  if (!tool) {
    return (
      <MissingPage
        kicker="Missing record"
        title="That is not a released calculator."
        to="/"
        backLabel="Back to library"
      />
    );
  }

  const fields = toolFields[tool.id] ?? [];
  const { input: stated, stampedVersion } = splitRecordSearch(search);
  const input = { ...(initialInputs[tool.id] ?? {}), ...stated };
  const result = calculateTool(tool.id, input);
  const labels = Object.fromEntries(fields.map((field) => [field.key, field.label]));

  if (result.errors.length) {
    return (
      <MissingPage
        kicker="Record"
        title="These inputs do not produce a result."
        to="/"
        backLabel="Back to library"
      />
    );
  }

  const record = buildCalculationPrintScope(tool, input, result, labels);
  // A stamp that disagrees with the model that just ran is the whole point of
  // carrying one. An absent stamp says nothing — links shared before stamping
  // existed cannot be reasoned about, which is why the stamp had to come first.
  const drifted = Boolean(stampedVersion && stampedVersion !== record.formulaVersion);

  return (
    <div className="page-wrap">
      <PageHeader
        size="page"
        kicker="Calculation record"
        title={tool.title}
        lede={`Formula version ${record.formulaVersion}. A record of the inputs shown and the output they produce.`}
        actions={
          <Link to="/tool/$toolId" params={{ toolId: tool.id }} search={stated} className="link-accent">
            Open in the calculator
          </Link>
        }
      />

      {drifted ? (
        <div
          role="status"
          className="mt-8 border-l-2 border-danger bg-danger/8 p-4 text-sm leading-6"
        >
          <p className="font-medium">This record was produced by an earlier version of the model.</p>
          <p className="mt-1 text-muted">
            Made with {tool.title} v{stampedVersion}; the current model is v{record.formulaVersion}. The
            numbers below are recomputed with the current model, so they may differ from the ones the
            sender saw. Check the method before relying on either.
          </p>
        </div>
      ) : null}

      <SectionHeader className="mt-12" kicker="Conditions" title="What was entered." />
      <div className={cn(panelClass, "mt-4 overflow-x-auto")}>
        <table className="w-full text-sm">
          <tbody>
            {record.input.map((item) => (
              <tr key={item.label} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-medium">{item.label}</th>
                <td className="p-3 text-right font-mono tabular-nums">{item.value || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader className="mt-12" kicker="Result" title="What it produces." />
      <div className={cn(panelClass, "mt-4 overflow-x-auto")}>
        <table className="w-full text-sm">
          <tbody>
            {record.values.map((item) => (
              <tr key={`${item.label}-${item.unit}`} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-medium">{item.label}</th>
                <td className="p-3 text-right font-mono tabular-nums">
                  {item.display} <span className="text-muted">{item.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader className="mt-12" kicker="Method" title="How it was calculated." />
      <GoverningRelation formula={record.method} className="mt-4 text-sm" />

      <SectionHeader className="mt-12" kicker="Boundary" title="Where this number stops being valid." />
      <ul className="mt-4 grid gap-2 text-sm">
        {record.boundaries.map((boundary) => (
          <li key={boundary} className="text-muted">{boundary}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">{record.boundary}</p>
      {result.warnings.map((warning) => (
        <p key={warning} className="mt-2 text-sm text-muted">{warning}</p>
      ))}

      <p className="mt-8 text-sm text-muted">
        Source:{" "}
        <a href={record.source.url} target="_blank" rel="noreferrer" className="link-accent">
          {record.source.label}
        </a>
      </p>
    </div>
  );
}
