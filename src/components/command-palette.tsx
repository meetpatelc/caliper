import { Command } from "cmdk";
import { ICON } from "@instrument/ui";
import { useRouter } from "@tanstack/react-router";
import { ClipboardList, PenLine, Star } from "lucide-react";
import { useMemo, useState, type RefObject } from "react";
import { OverlayDialog } from "@/components/overlay-dialog";
import { EmptyState } from "@/components/ui/status";
import { getTool, tools, scoreSearchMatch, searchableToolText } from "@/lib/catalog";
import { releasedDomains, savedHeadline } from "@/lib/desk";
import { PAGE_NAV } from "@/lib/nav";
import { officialCalculators } from "@/studio/lib/catalog";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { useDeskStore } from "@/lib/workspace-store";

const itemClass =
  "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated";

export function CommandPalette({
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const favorites = useDeskStore((state) => state.favorites);
  const recents = useDeskStore((state) => state.recents);
  const calculations = useDeskStore((state) => state.calculations);
  const reviews = useDeskStore((state) => state.reviews);
  const projects = useDeskStore((state) => state.projects);
  const workshop = useWorkshop((state) => state.items);

  /*
   * Clear the query on the way out.
   *
   * This component stays mounted — the dialog inside it unmounts when closed,
   * but `query` lives here — so the next Ctrl+K reopened on whatever was typed
   * last, with last time's results already showing. Typing then appended to it:
   * search "torsion", close, search "beam", and the box reads "torsionbeam" and
   * matches nothing. Every palette people have muscle memory for opens empty.
   */
  const close = () => {
    setQuery("");
    onOpenChange(false);
  };

  const go = (href: string) => {
    close();
    router.history.push(href);
  };

  const recentIds = new Set(recents);
  const favoriteIds = new Set(favorites);
  const favouriteTools = favorites.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);

  // Only worth showing for a multi-word query: a single word already ranks
  // fine inside its group, and a "best match" heading over one obvious result
  // is noise. Ties keep catalog order, so the list is stable between keystrokes.
  const bestMatches = useMemo(() => {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (terms.length < 2) return [];
    return tools
      .map((tool) => ({ tool, score: scoreSearchMatch(searchableToolText(tool), query) }))
      .filter((entry) => entry.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.tool);
  }, [query]);

  return (
    <OverlayDialog open={open} onClose={close} title="Search Instrument" restoreFocusTo={restoreFocusTo}>
      <Command
        label="Search Instrument"
        className="bg-surface text-fg"
        filter={(value, search) => {
          const query = search.trim().toLowerCase();
          if (!query) return 1;
          // Word order is not something a person typing into a search box should
          // have to guess, so terms match in any order.
          //
          // Score by the share of terms that hit, rather than demanding all of
          // them. This returned 1 or 0, which threw away cmdk's ranking *and*
          // made "no match" all-or-nothing: "cv valve sizing" found nothing
          // because "sizing" appears nowhere, and "feeds and speeds" found
          // nothing because the text says "speed". Both are one unmatched word
          // away from the right tool, and both used to return an empty list.
          //
          // A single-term query still scores 1 or 0, so nothing gets noisier;
          // only multi-word queries gain the partial result, and they arrive
          // ordered by how much of the query they actually matched.
          return scoreSearchMatch(value, query);
        }}
      >
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search models, favourites, checks, reviews, drafts"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
        />
        <Command.List className="max-h-[min(420px,60vh)] overflow-auto p-2">
          <Command.Empty className="px-3 py-6">
            <EmptyState>No match. Try a favourite, a saved check, or a model name.</EmptyState>
          </Command.Empty>
          {/* cmdk ranks inside a group but keeps the groups in render order, so
              the closest answer can sit below a weaker one from an earlier
              domain — "cv valve sizing" found Liquid valve Cv in fifth place,
              under three mechanics tools matching one word each. This lifts the
              best few to the top, scored by the same rule the filter uses. */}
          {bestMatches.length > 0 && (
            <Command.Group heading="Best match" className="px-1 py-1">
              {bestMatches.map((tool) => (
                <Command.Item
                  key={`best-${tool.id}`}
                  value={`best ${tool.id} ${searchableToolText(tool)}`}
                  onSelect={() => go(`/tool/${tool.id}`)}
                  className={itemClass}
                >
                  <span>{tool.title}</span>
                  <span className="meta">{tool.outputLabel}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {recents.length > 0 && (
            <Command.Group heading="Recent" className="px-1 py-1">
              {recents
                .map((id) => tools.find((tool) => tool.id === id))
                .filter(Boolean)
                .map((tool) => (
                  <Command.Item
                    key={`recent-${tool!.id}`}
                    value={`recent ${tool!.id} ${searchableToolText(tool!)}`}
                    onSelect={() => go(`/tool/${tool!.id}`)}
                    className={itemClass}
                  >
                    <span>{tool!.title}</span>
                    <span className="meta">{tool!.outputLabel}</span>
                  </Command.Item>
                ))}
            </Command.Group>
          )}
          {favouriteTools.length > 0 && (
            <Command.Group heading="Favourites" className="px-1 py-1">
              {favouriteTools.map((tool) => (
                <Command.Item
                  key={`fav-${tool!.id}`}
                  value={`favourite favorites favourites ${tool!.id} ${searchableToolText(tool!)}`}
                  onSelect={() => go(`/tool/${tool!.id}`)}
                  className={itemClass}
                >
                  <span>{tool!.title}</span>
                  <Star size={ICON.inline} className="shrink-0 text-mark" fill="currentColor" />
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {calculations.length > 0 && (
            <Command.Group heading="Saved checks" className="px-1 py-1">
              {calculations.map((record) => {
                const tool = getTool(record.toolId);
                const headline = savedHeadline(record.resultJson);
                const folder = projects.find((project) => project.id === record.projectId)?.name;
                return (
                  <Command.Item
                    key={`check-${record.id}`}
                    value={`saved check snapshot ${record.title} ${tool?.title ?? ""} ${record.toolId} ${record.method} ${headline} ${folder ?? ""}`}
                    onSelect={() => {
                      onOpenChange(false);
                      void router.navigate({
                        to: "/tool/$toolId",
                        params: { toolId: record.toolId },
                        search: { ...record.input, restore: "1" },
                      });
                    }}
                    className={itemClass}
                  >
                    <span>{record.title}</span>
                    <span className="hidden meta sm:inline">
                      {headline || tool?.title || "saved check"}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}
          {reviews.length > 0 && (
            <Command.Group heading="Reviews" className="px-1 py-1">
              {reviews.map((record) => (
                <Command.Item
                  key={`review-${record.id}`}
                  value={`review snapshot ${record.title} ${record.area}`}
                  onSelect={() => {
                    onOpenChange(false);
                    void router.navigate({ to: "/review", search: { id: record.id } });
                  }}
                  className={itemClass}
                >
                  <span>{record.title}</span>
                  <span className="inline-flex items-center gap-1 meta">
                    <ClipboardList size={ICON.inline} className="hidden sm:inline" />
                    {record.area}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {workshop.length > 0 && (
            <Command.Group heading="Build drafts" className="px-1 py-1">
              {workshop.map((item) => (
                <Command.Item
                  key={`draft-${item.id}`}
                  value={`studio draft ${item.title} ${item.slug} ${item.domain} ${item.description} ${item.formula}`}
                  onSelect={() => {
                    onOpenChange(false);
                    void router.navigate({ to: "/studio/$id", params: { id: item.id } });
                  }}
                  className={itemClass}
                >
                  <span>{item.title}</span>
                  <span className="inline-flex items-center gap-1 meta">
                    <PenLine size={ICON.inline} className="hidden sm:inline" />
                    {item.published ? "published" : "draft"}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Pages" className="px-1 py-1">
            {PAGE_NAV.map((page) => (
              <Command.Item key={page.href} value={page.label} onSelect={() => go(page.href)} className={itemClass}>
                {page.label}
              </Command.Item>
            ))}
          </Command.Group>
          {releasedDomains().map((domain) => {
            const group = tools.filter((tool) => tool.contract.domain === domain.id && !recentIds.has(tool.id) && !favoriteIds.has(tool.id));
            if (!group.length) return null;
            return (
              <Command.Group key={domain.id} heading={domain.label} className="px-1 py-1">
                {group.map((tool) => (
                  <Command.Item
                    key={tool.id}
                    value={`${tool.id} ${searchableToolText(tool)}`}
                    onSelect={() => go(`/tool/${tool.id}`)}
                    className={itemClass}
                  >
                    <span>{tool.title}</span>
                    <span className="hidden meta sm:inline">{tool.outputLabel}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}
          <Command.Group className="px-1 py-1">
            {officialCalculators
              .filter((item) => item.slug !== "iso-286-fits")
              .map((item) => (
                <Command.Item
                  key={`official-${item.slug}`}
                  value={`${item.title} ${item.slug} ${item.domain} ${item.description} ${item.formula}`}
                  onSelect={() => go(`/c/${item.slug}`)}
                  className={itemClass}
                >
                  <span>{item.title}</span>
                  <span className="hidden meta sm:inline">{item.formula}</span>
                </Command.Item>
              ))}
          </Command.Group>
        </Command.List>
      </Command>
    </OverlayDialog>
  );
}
