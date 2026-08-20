import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Search, ShieldCheck, Star } from "lucide-react";
import { tools } from "@/lib/catalog";
import { APP_NAME, MODEL_COUNT, releasedDomains } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";

export const Route = createFileRoute("/")({ component: Home });

const featuredIds = ["axial", "beam", "converter", "mohrCircle", "hydraulicCylinder", "threePhasePower", "controlChart", "idealGas"];

function Home() {
  const recents = useDeskStore((state) => state.recents);
  const favorites = useDeskStore((state) => state.favorites);
  const featured = featuredIds.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);
  const recentTools = recents.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean).slice(0, 6);
  const pinned = favorites.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean).slice(0, 6);

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="page-wrap py-14 sm:py-20">
          <p className="eyebrow text-accent">{APP_NAME} · {MODEL_COUNT} released models</p>
          <h1 className="display-title mt-4 max-w-3xl">
            Set the numbers.
            <br />
            Keep the model in frame.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            A local-first engineering workspace. Every calculator carries units, assumptions, the governing relation, and a source — not just an answer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/library" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg">
              Open the library <ArrowUpRight size={16} />
            </Link>
            <Link to="/tool/$toolId" params={{ toolId: "converter" }} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm hover:bg-elevated">
              Convert units
            </Link>
          </div>
          <p className="mt-6 font-mono text-[11px] tracking-[0.12em] text-muted">SI CANONICAL · DECLARED UNITS · PRELIMINARY ONLY</p>
        </div>
      </section>

      <div className="page-wrap">
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label="Released models" value={String(MODEL_COUNT)} />
          <Stat label="Domains in play" value={String(releasedDomains.length)} />
          <Stat label="Save locally" value="No login" />
        </section>

        {(recentTools.length > 0 || pinned.length > 0) && (
          <section className="mt-12 grid gap-8 lg:grid-cols-2">
            {recentTools.length > 0 && (
              <div>
                <p className="eyebrow">Continue</p>
                <h2 className="mt-1 text-xl font-semibold">Recent</h2>
                <ul className="mt-4 grid gap-2">
                  {recentTools.map((tool) => (
                    <li key={tool!.id}>
                      <Link to="/tool/$toolId" params={{ toolId: tool!.id }} className="flex items-center justify-between rounded-md border border-border px-3 py-3 hover:bg-elevated">
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
                      <Link to="/tool/$toolId" params={{ toolId: tool!.id }} className="flex items-center justify-between rounded-md border border-border px-3 py-3 hover:bg-elevated">
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

        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Frequent models</h2>
            </div>
            <Link to="/library" className="text-sm text-accent">
              All {MODEL_COUNT} →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((tool) => (
              <Link key={tool!.id} to="/tool/$toolId" params={{ toolId: tool!.id }} className="rounded-lg border border-border bg-surface p-4 hover:border-accent">
                <p className="eyebrow">{tool!.category}</p>
                <h3 className="mt-2 text-lg font-semibold">{tool!.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{tool!.description}</p>
                <p className="mt-3 font-mono text-[11px] text-accent">{tool!.outputLabel}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <p className="eyebrow">Atlas</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Browse by domain</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {releasedDomains.map((domain) => (
              <Link key={domain.id} to="/library" search={{ domain: domain.id }} className="rounded-lg border border-border p-4 hover:bg-elevated">
                <p className="font-medium">{domain.label}</p>
                <p className="mt-1 text-sm text-muted">{domain.note}</p>
                <p className="mt-3 font-mono text-[11px] text-accent">{domain.count} models</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 flex flex-wrap items-start justify-between gap-6 rounded-xl border border-border bg-surface p-6">
          <div className="max-w-xl">
            <ShieldCheck className="text-accent" size={22} />
            <h2 className="mt-3 text-xl font-semibold">A first-pass check is not a design approval.</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use a result inside the stated geometry, loading, and material boundary. Verify against the codes, specifications, and judgment that apply to the actual project.</p>
          </div>
          <Link to="/about" className="text-sm text-accent">
            Read the limits →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-2xl">{value}</p>
    </div>
  );
}
