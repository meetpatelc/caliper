import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { tools } from "@/lib/catalog";
import { releasedDomains } from "@/lib/desk";
import { panelClass } from "@/components/ui/panel";
import { governedReferenceData } from "@/lib/referenceData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reference")({ component: ReferencePage });

function ReferencePage() {
  return (
    <div className="page-wrap">
      <p className="eyebrow">Method library</p>
      <h1 className="display-title mt-3">The number is only as good as the model.</h1>
      <p className="lede max-w-2xl">
        Sources explain the concept. Each workspace still declares its own narrow boundary. Read both before treating a result as evidence.
      </p>

      <ol className="mt-10 grid gap-3 md:grid-cols-3">
        {[
          ["01", "Check the boundary", "Use the workspace only when geometry, loading, and material assumptions match the question."],
          ["02", "Check the quantity", "Keep units compatible and inspect display precision before comparing sources."],
          ["03", "Check the context", "Treat every output as a starting point for independent project-specific verification."],
        ].map(([n, title, copy]) => (
          <li key={n} className={cn(panelClass, "p-4")}>
            <p className="font-mono text-xs text-accent">{n}</p>
            <h2 className="section-title-sm mt-2">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
          </li>
        ))}
      </ol>

      <section className="mt-14">
        <p className="eyebrow">Governed reference data</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Version, range, and source before a value.</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {governedReferenceData.map((dataset) => (
            <article key={dataset.id} className={`${panelClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{dataset.id.replace(/-/g, " ")}</p>
                  <h3 className="section-title-sm mt-1">{dataset.title}</h3>
                </div>
                <a href={dataset.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${dataset.sourceLabel}`}>
                  <ArrowUpRight size={16} />
                </a>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
                <div>
                  <dt className="eyebrow">Version</dt>
                  <dd className="text-fg">{dataset.version}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Source</dt>
                  <dd className="text-fg">{dataset.sourceLabel}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Coverage</dt>
                  <dd>{dataset.coverage}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Range</dt>
                  <dd>{dataset.range}</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-2">
                {dataset.values.map((record) => (
                  <div key={record.label} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2 text-sm">
                    <strong>{record.label}</strong>
                    <span className="font-mono text-xs">
                      {record.value}
                      {record.unit !== "—" ? ` · ${record.unit}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <p className="eyebrow">Workspace provenance</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Every released method, one step away</h2>
        <div className="mt-6 grid gap-8">
          {releasedDomains.map((domain) => {
            const domainTools = tools.filter((tool) => tool.contract.domain === domain.id);
            if (!domainTools.length) return null;
            return (
              <section key={domain.id}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="eyebrow">{domain.label}</p>
                  <span className="font-mono text-xs text-muted">{domainTools.length}</span>
                </div>
                <div className={cn(panelClass)}>
                  {domainTools.map((tool) => (
                    <div key={tool.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-b-0">
                      <Link to="/tool/$toolId" params={{ toolId: tool.id }} className="link-row">
                        {tool.title}
                      </Link>
                      <a href={tool.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-muted hover:text-fg">
                        {tool.sourceLabel} <ArrowUpRight size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
