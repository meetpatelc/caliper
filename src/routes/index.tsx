import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { tools, type ToolId } from "@/lib/catalog";
// The generated relation index, NOT `@/lib/document` — importing the documents
// here pulls all ~123 of them into the entry chunk to render one line per card.
import { libraryFormulas } from "@/lib/library-formulas";
import { releasedDomains, savedHeadline } from "@/lib/desk";
import { homeDemo } from "@/lib/home-demo.generated";
import { PARENT_NAME } from "@/lib/instrument";
import { cn } from "@/lib/utils";
import { useDeskStore } from "@/lib/workspace-store";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedItem } from "@/components/ui/choice";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { SelectableCard } from "@/components/ui/selection";
import { EmptyState } from "@/components/ui/status";
import { FavouriteButton } from "@/components/favourite-button";
import { GoverningRelation } from "@/components/governing-relation";
import type { EngineeringDomain } from "@/lib/platform";

type LibrarySearch = { domain?: string };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instrument · Engineering models you can check" },
      { name: "description", content: "See exactly how a result is calculated — the method, assumptions, sources and limits stay visible next to the number." },
      { property: "og:title", content: "Instrument · Engineering models you can check" },
      { property: "og:description", content: "See exactly how a result is calculated — the method, assumptions, sources and limits stay visible next to the number." },
    ],
  }),
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

  const grouped = releasedDomains()
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
      {/*
        Story, then proof, then the rooms, then the catalogue.

        This page used to open with "Library — every released model" above the
        filter and every card. That described the markup accurately and the
        product poorly: a first-time visitor met an inventory and had to work
        out what the thing was. The positioning already existed on /about,
        where nobody arriving for the first time reads it.

        The count is deliberately not in the opening line. It invites the one
        comparison this product loses — somebody always has more calculators —
        and reframes the page as a shelf when the claim is that the work can be
        checked. It survives beside the filter, where it scopes what you are
        about to narrow.
      */}
      {/*
        Claim on the left, proof on the right, so the argument lands in one
        beat. Stacked, the example sat below the fold on a laptop and the page
        made its case twice — once in prose and again, later, in evidence.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-10">
        {/*
          One cell: the claim, then the rooms beneath it. Stacked on a phone this
          reads claim, rooms, example — the rooms are four short lines, so the
          proof still arrives early, and putting the example first would have
          opened the page on a calculator before saying what the site is.
        */}
        <div className="grid content-start gap-8">
          <PageHeader
            className="lg:pt-1"
            kicker={PARENT_NAME}
            title="Engineering models you can check."
            lede="See exactly how a result is calculated. The method, the assumptions it rests on, the source, and the boundary where it stops being valid all stay next to the number."
          />

        {/*
          Four rooms, named once. Without this the site reads as a calculator
          directory, because the front page was the directory — nothing said a
          result can be saved, extended, or reviewed.

          They sit here rather than in a band below because the claim column is
          241px against a 484px example, and the resulting 242px of dead space
          read as a missing element rather than as breathing room. Filling it
          with the rooms puts the whole "what is this" argument — the claim, the
          product, and the proof — on one screen, and removes a band from
          further down, so the catalogue rises again.
        */}
          <div className="grid gap-2">
            <p className="text-sm leading-6">
              <span className="font-medium">Library</span>
              <span className="text-muted"> — finished models, below.</span>
              </p>
            {[
              { to: "/studio", label: "Build", note: "write a unit-aware check, method attached." },
              { to: "/review", label: "Review", note: "evidence checklists and trade studies." },
              { to: "/workshop", label: "Project", note: "drafts and saved checks." },
            ].map((room) => (
              <p key={room.label} className="text-sm leading-6">
                <Link to={room.to} className="link-accent font-medium">
                  {room.label}
                </Link>
                <span className="text-muted"> — {room.note}</span>
            </p>
            ))}
            <p className="mt-1 text-sm text-muted">
              Saving does not require an account.{" "}
              <Link to="/about" className="link-accent">
                What this is, and what it is not
              </Link>
              .
            </p>
          </div>
        </div>

        <div className={cn(panelClass, "p-5")}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">Worked example</p>
            <Link to="/tool/$toolId" params={{ toolId: homeDemo.toolId }} className="link-accent text-sm">
              Open this model
            </Link>
          </div>
          <p className="mt-1 text-base font-medium">{homeDemo.title}</p>

          {/* Inputs beside results: cause and effect in one glance. Stacked,
              you read the inputs and then scrolled past them to find the
              number they produced. */}
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="eyebrow">Inputs</p>
              <dl className="mt-2 grid gap-1.5">
                {homeDemo.inputs.map((input) => (
                  <div key={input.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-muted">
                      {input.label}
                      {input.symbol ? <span className="ml-1.5 font-mono text-xs">{input.symbol}</span> : null}
                    </dt>
                    <dd className="whitespace-nowrap font-mono text-sm tabular-nums">
                      {input.value} {input.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <p className="eyebrow">Results</p>
              <dl className="mt-2 grid gap-1.5">
                {homeDemo.outputs.map((output, index) => (
                  <div key={output.label} className="flex items-baseline justify-between gap-3">
                    <dt className={cn("text-sm", index === 0 ? "text-fg" : "text-muted")}>
                      {output.label}
                      {output.symbol ? <span className="ml-1.5 font-mono text-xs">{output.symbol}</span> : null}
                    </dt>
                    <dd
                      className={cn(
                        "whitespace-nowrap font-mono tabular-nums",
                        index === 0 ? "text-base font-medium" : "text-sm text-muted",
                      )}
                    >
                      {output.display} {output.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-border pt-4">
            <div>
              <p className="eyebrow">Relation</p>
              <p className="mt-1 font-mono text-sm leading-6">{homeDemo.formula}</p>
            </div>
            <div>
              <p className="eyebrow">Assumptions</p>
              <p className="mt-1 text-sm leading-6 text-muted">{homeDemo.assumptions.join(" · ")}</p>
            </div>
            <div>
              <p className="eyebrow">Source</p>
              <p className="mt-1 text-sm leading-6">
                <a href={homeDemo.sourceUrl} target="_blank" rel="noreferrer" className="link-accent">
                  {homeDemo.sourceLabel}
                </a>
              </p>
            </div>
            <div>
              <p className="eyebrow">Where it stops</p>
              <p className="mt-1 text-sm leading-6 text-muted">{homeDemo.boundary}</p>
            </div>
          </div>
        </div>
      </div>

      {(saved.length > 0 || recentTools.length > 0) && (
        <section className="mt-12">
          <p className="eyebrow">Continue</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {saved.map((record) => {
              const tool = tools.find((item) => item.id === record.toolId);
              const headline = savedHeadline(record.resultJson);
              return (
                <Button key={record.id} asChild variant="outline">
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
              <Button key={tool!.id} asChild variant="outline">
                <Link to="/tool/$toolId" params={{ toolId: tool!.id }} className="whitespace-nowrap">
                  {tool!.title}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* No "Browse" eyebrow: it repeated what the heading already said, which
          is clutter above the one control that actually narrows the library.
          The count lives here rather than in the opening line — beside the
          control it scopes, it is a fact; at the top it was a boast. */}
      {/*
        No count here. It was a number that has to be maintained to stay true,
        and the list immediately below it is better evidence than the number
        ever was — a reader can see how many there are by looking.
      */}
      <SectionHeader className="mt-12" title="Pick a field." />
      <SegmentedControl aria-label="Domain filter" appearance="chip" className="mt-4">
        <SegmentedItem
          selected={domain === "all"}
          onClick={() => void navigate({ search: (prev) => ({ ...prev, domain: undefined }) })}
        >
          All
        </SegmentedItem>
        {releasedDomains().map((item) => (
          <SegmentedItem
            key={item.id}
            selected={domain === item.id}
            onClick={() => void navigate({ search: (prev) => ({ ...prev, domain: item.id }) })}
          >
            {item.label}
          </SegmentedItem>
        ))}
      </SegmentedControl>

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
