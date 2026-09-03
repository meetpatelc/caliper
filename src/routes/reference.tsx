import { createFileRoute, Link } from "@tanstack/react-router";
import { jsonLdScript, pageJsonLd, seoLinks, seoMeta } from "@/lib/seo";
import { ICON } from "@instrument/ui";
import { ArrowUpRight } from "lucide-react";
import { tools } from "@/lib/catalog";
import { releasedDomains } from "@/lib/desk";
import { panelClass } from "@/components/ui/panel";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { governedReferenceData } from "@/lib/referenceData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reference")({   head: () => ({
    meta: seoMeta({ title: "Method library · Instrument", description: "Version, range and source for every released method.", path: "/reference" }),
    links: seoLinks("/reference"),
    scripts: jsonLdScript(pageJsonLd("CollectionPage", { title: "Method library · Instrument", description: "Version, range and source for every released method.", path: "/reference" })),
  }),
  component: ReferencePage });

function ReferencePage() {
  return (
    <div className="page-wrap">
      <PageHeader
        kicker="Method library"
        title="The number is only as good as the model."
        ledeClassName="max-w-2xl"
        lede="Sources explain the concept. Each workspace still declares its own narrow boundary. Read both before treating a result as evidence."
      />

      <ol className="mt-8 grid gap-3 md:grid-cols-3">
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

      <section className="mt-12">
        <SectionHeader
          kicker={<>Governed reference data</>}
          title={<>Version, range, and source before a value.</>}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {governedReferenceData.map((dataset) => (
            <article key={dataset.id} className={`${panelClass} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SectionHeader size="sm"
                    kicker={<>{dataset.id.replace(/-/g, " ")}</>}
                    title={<>{dataset.title}</>}
                  />
                </div>
                {dataset.sourceUrl ? (
                  <a href={dataset.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${dataset.sourceLabel}`}>
                    <ArrowUpRight size={ICON.base} />
                  </a>
                ) : null}
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

      <section className="mt-12">
        <SectionHeader
          kicker={<>Workspace provenance</>}
          title={<>Every released method, one step away</>}
        />
        <div className="mt-8 grid gap-8">
          {releasedDomains().map((domain) => {
            const domainTools = tools.filter((tool) => tool.contract.domain === domain.id);
            if (!domainTools.length) return null;
            return (
              <section key={domain.id}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="eyebrow">{domain.label}</p>
                  {/* Same lone digit as the Library's section headers, and the
                      same fix: visually terse, audibly a number with a noun. */}
                  <span className="font-mono text-xs text-muted">
                    {domainTools.length}
                    <span className="sr-only"> models in {domain.label}</span>
                  </span>
                </div>
                <div className={cn(panelClass)}>
                  {domainTools.map((tool) => (
                    <div key={tool.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 last:border-b-0">
                      <Link to="/tool/$toolId" params={{ toolId: tool.id }} className="link-row">
                        {tool.title}
                      </Link>
                      {/*
                        A source with no URL is named, not linked. Most of the
                        library now cites a document rather than a page — Roark,
                        Shigley, NASA RP-1228, ISO 1101 — and this rendered every
                        one as `<a href="">`, which reloads /reference. Fifty-one
                        citations that looked clickable and went nowhere, on the
                        page whose whole job is letting someone check the source.
                        `instrument-page.tsx` already got this right; this did not.
                      */}
                      {tool.sourceUrl ? (
                        <a href={tool.sourceUrl} target="_blank" rel="noreferrer" className="meta link-quiet inline-flex items-center gap-1">
                          {tool.sourceLabel} <ArrowUpRight size={ICON.inline} />
                        </a>
                      ) : (
                        <span className="meta text-muted">{tool.sourceLabel}</span>
                      )}
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
