import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MissingPage, PageLoading } from "@/components/missing-page";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import { PARENT_NAME } from "@/lib/instrument";
import { findCalculator } from "@/studio/lib/resolve";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { defaultFieldState, evaluateCalculator, type FieldState } from "@/studio/lib/evaluate";
import { splitRecordSearch } from "@/lib/search-params";
import { unitSymbol } from "@/lib/units";
import { revisionOf } from "@/studio/lib/model-revision";

/**
 * A calculation record for a calculator someone built.
 *
 * `/record/$toolId` has done this for Library models for a long time, and the
 * most valuable thing on the page is the line that appears when the stamp in
 * the link does not match the model: "made with v2, the current model is v3, so
 * the numbers below may differ from the ones the sender saw." That sentence is
 * the difference between a calculation and a calculation you can defend three
 * months later in a review.
 *
 * Build calculators had no part in it, because `calculatorSchema` carries no
 * version — so a check made from one could never say whether the model had
 * moved underneath it. `model-revision.ts` supplies the number; this renders
 * the same page against it.
 *
 * Resolves out of the viewer's own workshop, which is the honest limit today:
 * a Build calculator is visible only to its author, so this is an audit trail
 * for your own work rather than something to send. The drift line is the part
 * that matters either way, and it works the moment sharing does.
 */
export const Route = createFileRoute("/record/c/$slug")({
  validateSearch: (search: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(search).map(([key, value]) => [key, String(value ?? "")])),
  head: ({ params }) => ({
    meta: [{ title: `Record · ${params.slug} · ${PARENT_NAME}` }],
    // Same reasoning as the short-link route: the resource lives in the
    // viewer's browser, so the server cannot answer 404 honestly, and a record
    // of one person's inputs is not a page to index either way.
    links: [{ rel: "robots", href: "noindex" }],
  }),
  component: WorkshopRecord,
});

/** A field's unit as an engineer writes it, from whichever token was stored. */
function readableUnit(field: { family?: string; defaultUnit: string }, stated?: string) {
  const token = stated || field.defaultUnit;
  if (!field.family) return token;
  try {
    return unitSymbol(field.family, token);
  } catch {
    // An unresolvable token is still worth showing: it is what the record says.
    return token;
  }
}

function WorkshopRecord() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const workshop = useWorkshop((state) => state.items);
  const hasHydrated = useWorkshop((state) => state.hasHydrated);
  const calculator = findCalculator(slug, workshop);

  const { input: stated, stampedVersion } = splitRecordSearch(search);

  const evaluation = useMemo(() => {
    if (!calculator) return undefined;
    // The link's values over the model's defaults: a record states the
    // conditions it was made under, and anything it does not state is whatever
    // the model offers.
    const state: Record<string, FieldState> = { ...defaultFieldState(calculator) };
    for (const field of calculator.fields) {
      const value = stated[field.id];
      if (value === undefined) continue;
      state[field.id] = { value, unit: stated[`${field.id}_u`] ?? state[field.id]?.unit ?? field.defaultUnit };
    }
    return evaluateCalculator(calculator, state);
  }, [calculator, stated]);

  if (!hasHydrated && !calculator) return <PageLoading kicker="Record" />;

  if (!calculator) {
    return (
      <MissingPage
        kicker="Record"
        title="That instrument is not here."
        to="/workshop"
        backLabel="Back to your work"
      />
    );
  }

  const current = revisionOf(calculator as { revision?: number; fingerprint?: string });
  const drifted = Boolean(stampedVersion && stampedVersion !== String(current));

  return (
    <div className="page-wrap">
      <PageHeader
        size="page"
        kicker="Calculation record"
        title={calculator.title}
        lede={`Model revision ${current}. A record of the inputs shown and the output they produce.`}
        actions={
          <Link to="/c/$slug" params={{ slug }} className="link-accent">
            Open in the calculator
          </Link>
        }
      />

      {drifted && (
        <div role="status" className="mt-8 border-l-2 border-danger bg-danger/8 p-4 text-sm leading-6">
          <p className="font-medium">This record was produced by an earlier version of the model.</p>
          <p className="mt-1 text-muted">
            Made with {calculator.title} v{stampedVersion}; the current model is v{current}. The numbers below are
            recomputed with the current model, so they may differ from the ones recorded. Check the method before
            relying on either.
          </p>
        </div>
      )}

      <SectionHeader className="mt-12" kicker="Conditions" title="What was entered." />
      <div className={cn(panelClass, "mt-4 overflow-x-auto")}>
        <table className="w-full text-sm">
          <tbody>
            {calculator.fields.map((field) => (
              <tr key={field.id} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-medium">
                  {field.label}
                </th>
                <td className="p-3 text-right tabular-nums">
                  {stated[field.id] ?? (field.input === "choice" ? field.defaultOption : field.defaultValue)}{" "}
                  {/*
                    The symbol, not the stored token. Studio's unit select
                    writes the full id, so this read "20 force.kN" — accurate,
                    and not how anyone writes down a load on a record they
                    intend to defend later.
                  */}
                  {field.input === "choice" ? "" : readableUnit(field, stated[`${field.id}_u`])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader className="mt-12" kicker="Result" title="What it produces." />
      {evaluation?.ok ? (
        <div className={cn(panelClass, "mt-4 overflow-x-auto")}>
          <table className="w-full text-sm">
            <tbody>
              {evaluation.outputs.map((output) => (
                <tr key={output.id} className="border-b border-border last:border-0">
                  <th scope="row" className="p-3 text-left font-medium">
                    {output.label}
                  </th>
                  <td className="p-3 text-right tabular-nums">
                    {output.display} {output.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-danger">
          These inputs do not produce a result: {evaluation?.error ?? "the model could not be evaluated."}
        </p>
      )}

      <SectionHeader className="mt-12" kicker="Method" title="What it rests on." />
      <div className="mt-4 grid gap-3 text-sm leading-6">
        <p className="font-mono text-xs text-muted">{calculator.formula}</p>
        <p>{calculator.purpose}</p>
        <p className="text-muted">{calculator.boundary}</p>
        {calculator.provenance === "assisted" && (
          <p className="text-muted">
            <span className="font-medium">A model drafted this calculator.</span> That it computes is not the same as
            being right.
          </p>
        )}
      </div>
    </div>
  );
}
