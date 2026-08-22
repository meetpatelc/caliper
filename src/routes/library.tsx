import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Search, Star } from "lucide-react";
import { searchableToolText, tools, type ToolId } from "@/lib/catalog";
import { releasedDomains } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { panelClass } from "@/components/ui/panel";
import type { EngineeringDomain } from "@/lib/platform";

type LibrarySearch = { domain?: string; q?: string };

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    domain: typeof search.domain === "string" ? search.domain : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: Library,
});

function Library() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(search.q ?? "");
  const domain = (search.domain as EngineeringDomain | undefined) ?? "all";
  const favorites = useDeskStore((state) => state.favorites);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesDomain = domain === "all" || tool.contract.domain === domain;
      const matchesQuery = !normalized || searchableToolText(tool).includes(normalized);
      return matchesDomain && matchesQuery;
    });
  }, [domain, query]);

  const grouped = releasedDomains
    .map((item) => ({ domain: item, tools: visible.filter((tool) => tool.contract.domain === item.id) }))
    .filter((group) => group.tools.length);

  return (
    <div className="page-wrap">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="display-title mt-3">Every released model.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            {tools.length} ready calculators across {releasedDomains.length} domains. Filter, search, open. This is the desk — not a studio.
          </p>
        </div>
        <label className={cn(controlClass, "flex h-auto items-center gap-2 bg-surface py-1")}>
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              void navigate({ search: (prev) => ({ ...prev, q: value || undefined }), replace: true });
            }}
            placeholder="Search NPSH, axial, LMTD…"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
      </section>

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
        {grouped.map(({ domain: groupDomain, tools: groupTools }) => (
          <section key={groupDomain.id}>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="eyebrow">{groupDomain.label}</p>
                <h2 className="text-lg font-semibold">{groupDomain.note}</h2>
              </div>
              <span className="font-mono text-xs text-muted">{groupTools.length}</span>
            </div>
            <div className={panelClass}>
              {groupTools.map((tool) => (
                <Link
                  key={tool.id}
                  to="/tool/$toolId"
                  params={{ toolId: tool.id }}
                  className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 hover:bg-elevated sm:grid-cols-[1.4fr_1fr_auto] sm:items-center"
                >
                  <span>
                    <strong className="block">{tool.title}</strong>
                    <small className="text-muted">{tool.description}</small>
                  </span>
                  <span className="font-mono text-xs text-muted">{tool.outputLabel}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {favorites.includes(tool.id as ToolId) && <Star size={12} className="text-mark" fill="currentColor" />}
                    {tool.contract.validation}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!visible.length && <p className="mt-10 text-sm text-muted">No match. Try “member”, “NPSH”, or “units”.</p>}
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
