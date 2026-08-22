import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, Search, ShieldCheck, Star } from "lucide-react";
import { tools } from "@/lib/catalog";
import { APP_NAME, MODEL_COUNT, openDeskSearch, releasedDomains, savedHeadline, SIBLING } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { buttonVariants } from "@/components/ui/button";
import { panelClass, panelHoverClass } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const featuredIds = ["axial", "beam", "npshAvailableBudget", "threePhasePower", "lmtd", "controlChart"];

function Home() {
  const recents = useDeskStore((state) => state.recents);
  const favorites = useDeskStore((state) => state.favorites);
  const calculations = useDeskStore((state) => state.calculations);
  const featured = featuredIds.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);
  const saved = calculations.slice(0, 4);
  const savedToolIds = new Set(saved.map((item) => item.toolId));
  const recentTools = recents
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool) => tool && !savedToolIds.has(tool.id))
    .slice(0, 4);
  const pinned = favorites.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean).slice(0, 4);

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="page-wrap py-10 sm:py-16">
          <p className="eyebrow">{APP_NAME} · ready desk</p>
          <h1 className="display-title mt-4 max-w-3xl">
            Set the numbers.
            <br />
            Keep the model in frame.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            {MODEL_COUNT} finished models. Open one, set the inputs, read the result. No account.
          </p>
          <button
            type="button"
            onClick={openDeskSearch}
            className="mt-8 flex h-14 w-full max-w-xl items-center gap-3 rounded-lg border border-border bg-bg px-4 text-left text-muted hover:border-accent hover:text-fg"
          >
            <Search size={18} className="shrink-0 text-accent" />
            <span className="flex-1 truncate text-sm sm:text-base">Search NPSH, axial, LMTD…</span>
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted sm:inline">⌘K</kbd>
          </button>
          <p className="mt-5 font-mono text-xs tracking-[0.12em] text-muted">
            {MODEL_COUNT} MODELS · DECLARED UNITS · PRELIMINARY ONLY
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted">
            To write your own, that’s{" "}
            <a href={SIBLING.url} className="text-accent hover:text-fg">
              {SIBLING.name}
            </a>
            .
          </p>
        </div>
      </section>

      <div className="page-wrap">
        {saved.length > 0 && (
          <section>
            <p className="eyebrow">Continue</p>
            <h2 className="mt-1 text-xl font-semibold">Last checks</h2>
            <ul className="mt-4 grid gap-2">
              {saved.map((record) => {
                const tool = tools.find((item) => item.id === record.toolId);
                const headline = savedHeadline(record.resultJson);
                return (
                  <li key={record.id} className={cn(panelClass, "px-4 py-3")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/tool/$toolId"
                          params={{ toolId: record.toolId }}
                          search={{ ...record.input, restore: "1" }}
                          className="font-medium hover:text-accent"
                        >
                          {tool?.title ?? record.title}
                        </Link>
                        {headline && <p className="mt-1 font-mono text-lg tabular-nums">{headline}</p>}
                        <p className="mt-1 flex items-center gap-1 font-mono text-xs text-muted">
                          <Clock3 size={12} />
                          {relativeTime(record.savedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/tool/$toolId"
                          params={{ toolId: record.toolId }}
                          search={{ ...record.input, restore: "1" }}
                          className={buttonVariants({ variant: "accent" })}
                        >
                          Reopen
                        </Link>
                        <Link to="/review" className={buttonVariants()}>
                          Review
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link to="/projects" className="mt-3 inline-flex text-sm text-accent">
              All saved checks →
            </Link>
          </section>
        )}

        {(recentTools.length > 0 || pinned.length > 0) && (
          <section className={saved.length ? "mt-12 grid gap-8 lg:grid-cols-2" : "grid gap-8 lg:grid-cols-2"}>
            {recentTools.length > 0 && (
              <div>
                <p className="eyebrow">Recent</p>
                <h2 className="mt-1 text-xl font-semibold">Opened here</h2>
                <ul className="mt-4 grid gap-2">
                  {recentTools.map((tool) => (
                    <li key={tool!.id}>
                      <Link
                        to="/tool/$toolId"
                        params={{ toolId: tool!.id }}
                        className={cn(panelHoverClass, "flex items-center justify-between px-3 py-3")}
                      >
                        <span>{tool!.title}</span>
                        <Search size={14} className="text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pinned.length > 0 && (
              <div>
                <p className="eyebrow">Pinned</p>
                <h2 className="mt-1 text-xl font-semibold">Favorites</h2>
                <ul className="mt-4 grid gap-2">
                  {pinned.map((tool) => (
                    <li key={tool!.id}>
                      <Link
                        to="/tool/$toolId"
                        params={{ toolId: tool!.id }}
                        className={cn(panelHoverClass, "flex items-center justify-between px-3 py-3")}
                      >
                        <span>{tool!.title}</span>
                        <Star size={14} className="text-mark" fill="currentColor" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className={saved.length || recentTools.length || pinned.length ? "mt-14" : ""}>
          <p className="eyebrow">Atlas</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Browse by domain</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {releasedDomains.map((domain) => (
              <Link
                key={domain.id}
                to="/library"
                search={{ domain: domain.id }}
                className={cn(panelHoverClass, "p-4")}
              >
                <p className="font-medium">{domain.label}</p>
                <p className="mt-1 text-sm text-muted">{domain.note}</p>
                <p className="mt-3 font-mono text-xs text-accent">{domain.count} models</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Frequent models</h2>
            </div>
            <Link to="/library" className="text-sm text-accent">
              Library →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((tool) => (
              <Link
                key={tool!.id}
                to="/tool/$toolId"
                params={{ toolId: tool!.id }}
                className={cn(panelClass, "p-4 hover:border-accent")}
              >
                <p className="eyebrow">{tool!.category}</p>
                <h3 className="mt-2 text-lg font-semibold">{tool!.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{tool!.description}</p>
                <p className="mt-3 font-mono text-xs text-accent">{tool!.outputLabel}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className={cn(panelClass, "mt-14 flex flex-wrap items-start justify-between gap-6 p-6")}>
          <div className="max-w-xl">
            <ShieldCheck className="text-accent" size={22} />
            <h2 className="mt-3 text-xl font-semibold">A first-pass check is not a design stamp.</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use a result inside the stated geometry, loading, and material boundary. Verify against the codes that apply to the actual project.
            </p>
          </div>
          <Link to="/about" className="inline-flex items-center gap-1 text-sm text-accent">
            Limits <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
    </div>
  );
}

function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(delta / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
