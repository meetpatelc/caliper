import { Command } from "cmdk";
import { useRouter } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { RefObject } from "react";
import { OverlayDialog } from "@/components/overlay-dialog";
import { tools, searchableToolText } from "@/lib/catalog";
import { MODEL_COUNT, releasedDomains } from "@/lib/desk";
import { officialCalculators } from "@/gauge/lib/catalog";
import { useWorkshop } from "@/gauge/lib/workshop-store";
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
  const workshop = useWorkshop((state) => state.items);

  const go = (href: string) => {
    onOpenChange(false);
    router.history.push(href);
  };

  const recentIds = new Set(recents);
  const favoriteIds = new Set(favorites);

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
          placeholder={`Search ${MODEL_COUNT} models`}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
        />
        <Command.List className="max-h-[min(420px,60vh)] overflow-auto p-2">
          <Command.Empty className="px-3 py-6 text-sm text-muted">No match. Try “beam”, “NPSH”, or “axial”.</Command.Empty>
          {recents.length > 0 && (
            <Command.Group heading="Recent" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
              {recents
                .map((id) => tools.find((tool) => tool.id === id))
                .filter(Boolean)
                .map((tool) => (
                  <Command.Item
                    key={`recent-${tool!.id}`}
                    value={`recent ${tool!.id} ${searchableToolText(tool!)}`}
                    onSelect={() => go(`/tool/${tool!.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated"
                  >
                    <span>{tool!.title}</span>
                    <span className="font-mono text-[11px] text-muted">{tool!.outputLabel}</span>
                  </Command.Item>
                ))}
            </Command.Group>
          )}
          {favorites.filter((id) => !recentIds.has(id)).length > 0 && (
            <Command.Group heading="Pinned" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
              {favorites
                .filter((id) => !recentIds.has(id))
                .map((id) => tools.find((tool) => tool.id === id))
                .filter(Boolean)
                .map((tool) => (
                  <Command.Item
                    key={`fav-${tool!.id}`}
                    value={`pinned ${tool!.id} ${searchableToolText(tool!)}`}
                    onSelect={() => go(`/tool/${tool!.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated"
                  >
                    <span>{tool!.title}</span>
                    <Star size={12} className="text-mark" fill="currentColor" />
                  </Command.Item>
                ))}
            </Command.Group>
          )}
          <Command.Group heading="Pages" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
            {pages.map((page) => (
              <Command.Item
                key={page.href}
                value={page.label}
                onSelect={() => go(page.href)}
                className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated"
              >
                {page.label}
              </Command.Item>
            ))}
          </Command.Group>
          {workshop.length > 0 && (
            <Command.Group heading="Project" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
              {workshop.map((item) => (
                <Command.Item
                  key={`yours-${item.id}`}
                  value={`yours ${item.title} ${item.slug} ${item.domain} ${item.description}`}
                  onSelect={() => go(`/c/${item.slug}`)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated"
                >
                  <span>{item.title}</span>
                  <span className="hidden font-mono text-[11px] text-muted sm:inline">{item.published ? "published" : "draft"}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          {releasedDomains.map((domain) => {
            const group = tools.filter((tool) => tool.contract.domain === domain.id && !recentIds.has(tool.id) && !favoriteIds.has(tool.id));
            if (!group.length) return null;
            return (
              <Command.Group key={domain.id} heading={domain.label} className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                {group.map((tool) => (
                  <Command.Item
                    key={tool.id}
                    value={`${tool.id} ${searchableToolText(tool)}`}
                    onSelect={() => go(`/tool/${tool.id}`)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated"
                  >
                    <span>{tool.title}</span>
                    <span className="hidden font-mono text-[11px] text-muted sm:inline">{tool.outputLabel}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}
          <Command.Group className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
            {officialCalculators.map((item) => (
              <Command.Item
                key={`official-${item.slug}`}
                value={`${item.title} ${item.slug} ${item.domain} ${item.description} ${item.formula}`}
                onSelect={() => go(`/c/${item.slug}`)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated"
              >
                <span>{item.title}</span>
                <span className="hidden font-mono text-[11px] text-muted sm:inline">{item.formula}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </OverlayDialog>
  );
}
