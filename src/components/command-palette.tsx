import { Command } from "cmdk";
import { useRouter } from "@tanstack/react-router";
import { ClipboardList, PenLine, Star } from "lucide-react";
import type { RefObject } from "react";
import { OverlayDialog } from "@/components/overlay-dialog";
import { EmptyState } from "@/components/ui/status";
import { getTool, tools, searchableToolText } from "@/lib/catalog";
import { releasedDomains, savedHeadline } from "@/lib/desk";
import { officialCalculators } from "@/studio/lib/catalog";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { useDeskStore } from "@/lib/workspace-store";

const pages = [
  { href: "/", label: "Library" },
  { href: "/studio", label: "Studio" },
  { href: "/workshop", label: "Project" },
  { href: "/review", label: "Review" },
  { href: "/about", label: "Limits & about" },
  { href: "/feedback", label: "Feedback" },
  { href: "/reference", label: "Method library" },
] as const;

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
  const favorites = useDeskStore((state) => state.favorites);
  const recents = useDeskStore((state) => state.recents);
  const calculations = useDeskStore((state) => state.calculations);
  const reviews = useDeskStore((state) => state.reviews);
  const projects = useDeskStore((state) => state.projects);
  const workshop = useWorkshop((state) => state.items);

  const go = (href: string) => {
    onOpenChange(false);
    router.history.push(href);
  };

  const recentIds = new Set(recents);
  const favoriteIds = new Set(favorites);
  const favouriteTools = favorites.map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);

  return (
    <OverlayDialog open={open} onClose={() => onOpenChange(false)} title="Search Instrument" restoreFocusTo={restoreFocusTo}>
      <Command
        label="Search Instrument"
        className="bg-surface text-fg"
        filter={(value, search) => {
          const query = search.trim().toLowerCase();
          if (!query) return 1;
          return value.toLowerCase().includes(query) ? 1 : 0;
        }}
      >
        <Command.Input
          autoFocus
          placeholder="Search models, favourites, checks, reviews, drafts"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
        />
        <Command.List className="max-h-[min(420px,60vh)] overflow-auto p-2">
          <Command.Empty className="px-3 py-6">
            <EmptyState>No match. Try a favourite, a saved check, or a model name.</EmptyState>
          </Command.Empty>
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
                  <Star size={12} className="shrink-0 text-mark" fill="currentColor" />
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
                    <ClipboardList size={11} className="hidden sm:inline" />
                    {record.area}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {workshop.length > 0 && (
            <Command.Group heading="Studio drafts" className="px-1 py-1">
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
                    <PenLine size={11} className="hidden sm:inline" />
                    {item.published ? "published" : "draft"}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Pages" className="px-1 py-1">
            {pages.map((page) => (
              <Command.Item key={page.href} value={page.label} onSelect={() => go(page.href)} className={itemClass}>
                {page.label}
              </Command.Item>
            ))}
          </Command.Group>
          {releasedDomains.map((domain) => {
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
