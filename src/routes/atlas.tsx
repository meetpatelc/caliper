import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PenLine, Search } from "lucide-react";
import { z } from "zod";
import { type DomainId } from "@/gauge/lib/brand";
import { officialBySlug, officialCalculators, FEATURED_SLUGS, domainCounts } from "@/gauge/lib/catalog";
import { mergeCatalog } from "@/gauge/lib/resolve";
import { useWorkshop } from "@/gauge/lib/workshop-store";
import { Button, buttonVariants, panelClass } from "@instrument/ui";
import { cn } from "@/lib/utils";
import { MODEL_COUNT } from "@/lib/desk";

const searchSchema = z.object({
  domain: z.string().optional(),
});

export const Route = createFileRoute("/atlas")({
  validateSearch: (search) => searchSchema.parse(search),
  component: AtlasPage,
});

function AtlasPage() {
  const { domain } = Route.useSearch();
  const navigate = useNavigate();
  const createBlank = useWorkshop((state) => state.createBlank);
  const workshop = useWorkshop((state) => state.items);
  const featured = FEATURED_SLUGS.map((slug) => officialBySlug.get(slug)).filter(Boolean);
  const atlas = domainCounts(workshop).filter((item) => item.count > 0);
  const all = mergeCatalog(workshop, []);
  const active = domain as DomainId | undefined;
  const visible = active ? all.filter((item) => item.domain === active) : all;

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="page-wrap py-10 sm:py-16">
          <p className="eyebrow">Still open</p>
          <h1 className="display-title mt-4 max-w-3xl">
            These models still compute.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Not a second catalog. Library is the finished models. Studio is where you write. This page is only what has not joined Library yet.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("gauge:open-search"))}
              className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-md border border-border bg-bg px-4 text-left text-muted hover:border-accent hover:text-fg sm:max-w-xl"
            >
              <Search size={18} className="shrink-0 text-accent" />
              <span className="flex-1 truncate text-sm sm:text-base">Search NPSH, axial, Reynolds…</span>
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-xs sm:inline">⌘K</kbd>
            </button>
            <Button
              variant="accent"
              className="h-14 px-5"
              onClick={() => {
                const item = createBlank();
                void navigate({ to: "/studio/$id", params: { id: item.id } });
              }}
            >
              <PenLine size={16} />
              Create from scratch
            </Button>
          </div>
          <p className="mt-5 font-mono text-xs tracking-[0.12em] text-muted">
            {officialCalculators.length} MODELS · DECLARED UNITS · PRELIMINARY ONLY
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Need a finished calculator?{" "}
            <Link to="/" className="text-accent hover:text-fg">
              Library
            </Link>{" "}
            has {MODEL_COUNT}.
          </p>
        </div>
      </section>

      <div className="page-wrap">
        <section>
          <p className="eyebrow">Still here</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Browse by domain</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {atlas.map((item) => (
              <Link
                key={item.id}
                to="/atlas"
                search={{ domain: item.id }}
                className="rounded-md border border-border p-4 hover:bg-elevated"
              >
                <p className="font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-muted">{item.note}</p>
                <p className="mt-3 font-mono text-xs text-accent">{item.count} instruments</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Frequent instruments</h2>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((tool) => (
              <Link
                key={tool!.slug}
                to="/c/$slug"
                params={{ slug: tool!.slug }}
                className="rounded-md border border-border bg-surface p-4 hover:border-accent"
              >
                <p className="eyebrow">{tool!.domain}</p>
                <h3 className="mt-2 text-lg font-semibold">{tool!.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{tool!.description}</p>
                <p className="mt-3 font-mono text-xs text-accent">{tool!.formula}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <p className="eyebrow">Remaining</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Every leftover instrument.</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/atlas" className={cn(buttonVariants({ variant: !active ? "accent" : "outline" }))}>
              All
            </Link>
            {atlas.map((item) => (
              <Link
                key={item.id}
                to="/atlas"
                search={{ domain: item.id }}
                className={cn(buttonVariants({ variant: active === item.id ? "accent" : "outline" }))}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {visible.map((item) => (
              <li key={`${item.origin}-${item.slug}`}>
                <Link to="/c/$slug" params={{ slug: item.slug }} className={cn(panelClass, "block p-4 hover:border-accent")}>
                  <p className="eyebrow">
                    {item.domain}
                    {item.origin !== "official" ? " · draft" : ""}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                  <p className="mt-3 font-mono text-xs text-accent">{item.formula}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
