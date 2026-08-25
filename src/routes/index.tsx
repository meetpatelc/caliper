import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { tools, type ToolId } from "@/lib/catalog";
// The generated relation index, NOT `@/lib/document` — importing the documents
// here pulls all ~123 of them into the entry chunk to render one line per card.
import { libraryFormulas } from "@/lib/library-formulas";
import { MODEL_COUNT, releasedDomains, savedHeadline } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedItem } from "@/components/ui/choice";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { SelectableCard } from "@/components/ui/selection";
import { EmptyState } from "@/components/ui/status";
import { FavouriteButton } from "@/components/favourite-button";
import { GoverningRelation } from "@/components/governing-relation";
import type { EngineeringDomain } from "@/lib/platform";

type LibrarySearch = { domain?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    domain: typeof search.domain === "string" ? search.domain : undefined,
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const domain = (search.domain as EngineeringDomain | undefined) ?? "all";
  const favorites = useDeskStore((state) => state.favorites);
  const toggleFavorite = useDeskStore((state) => state.toggleFavorite);
  const recents = useDeskStore((state) => state.recents);
  const calculations = useDeskStore((state) => state.calculations);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    return tools.filter((tool) => domain === "all" || tool.contract.domain === domain);
  }, [domain]);

  const grouped = releasedDomains
    .map((item) => ({ domain: item, tools: visible.filter((tool) => tool.contract.domain === item.id) }))
    .filter((group) => group.tools.length);

  const saved = calculations.slice(0, 3);
  const savedToolIds = new Set(saved.map((item) => item.toolId));
  const recentTools = recents
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool) => tool && !savedToolIds.has(tool.id))
    .slice(0, 4);

  return (
    <div className="page-wrap">
      <PageHeader
        kicker="Library"
        title="Every released model."
        lede={
          <>
            {MODEL_COUNT} finished calculators. Filter, search, open. To write your own, open{" "}
            <Link to="/studio" className="link-accent">
              Studio
            </Link>
            .
          </>
        }
      />

      {(saved.length > 0 || recentTools.length > 0) && (
        <section className="mt-12">
          <p className="eyebrow">Continue</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {saved.map((record) => {
              const tool = tools.find((item) => item.id === record.toolId);
              const headline = savedHeadline(record.resultJson);
              return (
                <Button key={record.id} asChild variant="outline" size="sm">
                  <Link
                    to="/tool/$toolId"
                    params={{ toolId: record.toolId }}
                    search={{ ...record.input, restore: "1" }}
                    className="whitespace-nowrap"
                  >
                    <span>{tool?.title ?? record.title}</span>
                    {headline ? <span className="font-mono text-xs text-muted">{headline}</span> : null}
                  </Link>
                </Button>
              );
            })}
            {recentTools.map((tool) => (
              <Button key={tool!.id} asChild variant="outline" size="sm">
                <Link to="/tool/$toolId" params={{ toolId: tool!.id }} className="whitespace-nowrap">
                  {tool!.title}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      <SegmentedControl aria-label="Domain filter" appearance="chip" className="mt-8">
        <SegmentedItem
          selected={domain === "all"}
          onClick={() => void navigate({ search: (prev) => ({ ...prev, domain: undefined }) })}
        >
          All · {tools.length}
        </SegmentedItem>
        {releasedDomains.map((item) => (
          <SegmentedItem
            key={item.id}
            selected={domain === item.id}
            onClick={() => void navigate({ search: (prev) => ({ ...prev, domain: item.id }) })}
          >
            {item.label} · {item.count}
          </SegmentedItem>
        ))}
      </SegmentedControl>

      <p className="mt-8 text-sm text-muted">{visible.length} shown</p>

      <div className="mt-8 grid gap-10">
        {grouped.map(({ domain: groupDomain, tools: groupTools }) => {
          const open = domain === groupDomain.id || expanded[groupDomain.id] || groupTools.length <= 8;
          const shown = open ? groupTools : groupTools.slice(0, 8);
          return (
            <section key={groupDomain.id}>
              <SectionHeader
                size="sm"
                className="mb-3"
                kicker={groupDomain.label}
                title={groupDomain.note}
                aside={<span className="font-mono text-xs text-muted">{groupTools.length}</span>}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {shown.map((tool) => {
                  const formula =
                    libraryFormulas[tool.id] ?? (tool.id === "fits" ? "cmax = ES − ei; imax = es − EI" : undefined);
                  return (
                    <SelectableCard
                      key={tool.id}
                      asChild
                      className="group relative grid h-full content-start bg-surface p-0"
                    >
                      <div>
                        <Link to="/tool/$toolId" params={{ toolId: tool.id }} className="grid h-full content-start gap-2 p-4 pr-12">
                          <strong className="section-title-sm">{tool.title}</strong>
                          <span className="line-clamp-2 text-sm leading-5 text-muted">{tool.description}</span>
                          {formula ? <GoverningRelation formula={formula} className="text-xs leading-5" /> : null}
                        </Link>
                        <FavouriteButton
                          compact
                          favourited={favorites.includes(tool.id as ToolId)}
                          onToggle={() => toggleFavorite(tool.id as ToolId)}
                          className="absolute right-3 top-3"
                        />
                      </div>
                    </SelectableCard>
                  );
                })}
              </div>
              {groupTools.length > 8 && domain !== groupDomain.id ? (
                <Button
                  variant="ghost"
                  className="mt-2 text-accent"
                  aria-expanded={open}
                  onClick={() => setExpanded((current) => ({ ...current, [groupDomain.id]: !current[groupDomain.id] }))}
                >
                  {open ? `Show fewer in ${groupDomain.label}` : `Show all ${groupTools.length} in ${groupDomain.label}`}
                </Button>
              ) : null}
            </section>
          );
        })}
      </div>

      {!visible.length && <EmptyState className="mt-8">Nothing in that domain.</EmptyState>}
    </div>
  );
}
