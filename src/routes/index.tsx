import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { tools, type ToolId } from "@/lib/catalog";
import { libraryDocuments } from "@/lib/document";
import { MODEL_COUNT, releasedDomains, savedHeadline } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { panelClass, panelHoverClass } from "@/components/ui/panel";
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
      <section>
        <p className="eyebrow">Library</p>
        <h1 className="display-title mt-3">Every released model.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">
          {MODEL_COUNT} finished calculators. Filter, search, open. To write your own, open{" "}
          <Link to="/studio" className="text-accent hover:text-fg">
            Studio
          </Link>
          .
        </p>
      </section>

      {(saved.length > 0 || recentTools.length > 0) && (
        <section className="mt-8">
          <p className="eyebrow">Continue</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {saved.map((record) => {
              const tool = tools.find((item) => item.id === record.toolId);
              const headline = savedHeadline(record.resultJson);
              return (
                <Link
                  key={record.id}
                  to="/tool/$toolId"
                  params={{ toolId: record.toolId }}
                  search={{ ...record.input, restore: "1" }}
                  className={cn(panelClass, "px-3 py-2 text-sm hover:border-accent")}
                >
                  <span className="font-medium">{tool?.title ?? record.title}</span>
                  {headline ? <span className="ml-2 font-mono text-xs text-muted">{headline}</span> : null}
                </Link>
              );
            })}
            {recentTools.map((tool) => (
              <Link
                key={tool!.id}
                to="/tool/$toolId"
                params={{ toolId: tool!.id }}
                className={cn(panelClass, "px-3 py-2 text-sm hover:border-accent")}
              >
                {tool!.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-2" role="toolbar" aria-label="Domain filter">
        <FilterChip active={domain === "all"} onClick={() => void navigate({ search: (prev) => ({ ...prev, domain: undefined }) })}>
          All · {tools.length}
        </FilterChip>
        {releasedDomains.map((item) => (
          <FilterChip
            key={item.id}
            active={domain === item.id}
            onClick={() => void navigate({ search: (prev) => ({ ...prev, domain: item.id }) })}
          >
            {item.label} · {item.count}
          </FilterChip>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">{visible.length} shown</p>

      <div className="mt-6 grid gap-10">
        {grouped.map(({ domain: groupDomain, tools: groupTools }) => {
          const open = domain === groupDomain.id || expanded[groupDomain.id] || groupTools.length <= 8;
          const shown = open ? groupTools : groupTools.slice(0, 8);
          return (
            <section key={groupDomain.id}>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="eyebrow">{groupDomain.label}</p>
                  <h2 className="text-lg font-semibold">{groupDomain.note}</h2>
                </div>
                <span className="font-mono text-xs text-muted">{groupTools.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {shown.map((tool) => {
                  const formula = libraryDocuments[tool.id]?.formula;
                  return (
                    <Link
                      key={tool.id}
                      to="/tool/$toolId"
                      params={{ toolId: tool.id }}
                      className={cn(
                        panelHoverClass,
                        "grid h-full content-start gap-2 bg-surface p-4 hover:border-accent",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <strong className="text-base font-semibold tracking-[-0.02em]">{tool.title}</strong>
                        {favorites.includes(tool.id as ToolId) ? (
                          <Star size={12} className="mt-1 shrink-0 text-mark" fill="currentColor" />
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-sm leading-5 text-muted">{tool.description}</span>
                      {formula ? <GoverningRelation formula={formula} className="text-xs leading-5" /> : null}
                    </Link>
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

      {!visible.length && <p className="mt-10 text-sm text-muted">Nothing in that domain.</p>}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" aria-pressed={active} variant={active ? "accent" : "outline"} onClick={onClick} className="text-xs">
      {children}
    </Button>
  );
}
