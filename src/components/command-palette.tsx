import { Command } from "cmdk";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { tools, searchableToolText } from "@/lib/catalog";
import { MODEL_COUNT, releasedDomains } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";

const pages = [
  { href: "/", label: "Desk" },
  { href: "/library", label: "Library" },
  { href: "/review", label: "Engineering review" },
  { href: "/reference", label: "Method library" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "Limits & about" },
  { href: "/feedback", label: "Feedback" },
] as const;

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const favorites = useDeskStore((state) => state.favorites);
  const recents = useDeskStore((state) => state.recents);
  const go = (href: string, toolId?: string) => {
    onOpenChange(false);
    if (toolId) {
      void navigate({ to: "/tool/$toolId", params: { toolId } });
      return;
    }
    void navigate({
      to: href as "/" | "/library" | "/review" | "/reference" | "/projects" | "/about" | "/feedback",
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-fg/45" aria-label="Close search" onClick={() => onOpenChange(false)} />
      <div className="relative mx-auto mt-[12vh] w-[min(640px,calc(100%-1.5rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
        <Command
          label="Search Caliper"
          className="bg-surface text-fg"
          filter={(value, search) => {
            const query = search.trim().toLowerCase();
            if (!query) return 1;
            return value.toLowerCase().includes(query) ? 1 : 0;
          }}
        >
          <Command.Input
            autoFocus
            placeholder={`Search ${MODEL_COUNT} models, domains, or pages`}
            className="w-full border-b border-border bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
          />
          <Command.List className="max-h-[min(420px,60vh)] overflow-auto p-2">
            <Command.Empty className="px-3 py-6 text-sm text-muted">No match. Try “beam”, “NPSH”, or “units”.</Command.Empty>
            {recents.length > 0 && (
              <Command.Group heading="Recent" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                {recents
                  .map((id) => tools.find((tool) => tool.id === id))
                  .filter(Boolean)
                  .map((tool) => (
                    <Command.Item key={`recent-${tool!.id}`} value={`recent ${tool!.id} ${searchableToolText(tool!)}`} onSelect={() => go(`/tool/${tool!.id}`, tool!.id)} className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated">
                      <span>{tool!.title}</span>
                      <span className="font-mono text-[11px] text-muted">{tool!.outputLabel}</span>
                    </Command.Item>
                  ))}
              </Command.Group>
            )}
            {favorites.length > 0 && (
              <Command.Group heading="Pinned" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                {favorites
                  .map((id) => tools.find((tool) => tool.id === id))
                  .filter(Boolean)
                  .map((tool) => (
                    <Command.Item key={`fav-${tool!.id}`} value={`pinned ${tool!.id} ${searchableToolText(tool!)}`} onSelect={() => go(`/tool/${tool!.id}`, tool!.id)} className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated">
                      <span>{tool!.title}</span>
                      <Star size={12} className="text-mark" fill="currentColor" />
                    </Command.Item>
                  ))}
              </Command.Group>
            )}
            <Command.Group heading="Pages" className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
              {pages.map((page) => (
                <Command.Item key={page.href} value={page.label} onSelect={() => go(page.href)} className="cursor-pointer rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated">
                  {page.label}
                </Command.Item>
              ))}
            </Command.Group>
            {releasedDomains.map((domain) => {
              const group = tools.filter((tool) => tool.contract.domain === domain.id);
              if (!group.length) return null;
              return (
                <Command.Group key={domain.id} heading={domain.label} className="px-1 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                  {group.map((tool) => (
                    <Command.Item key={tool.id} value={`${tool.id} ${searchableToolText(tool)}`} onSelect={() => go(`/tool/${tool.id}`, tool.id)} className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-elevated">
                      <span>{tool.title}</span>
                      <span className="hidden font-mono text-[11px] text-muted sm:inline">{tool.outputLabel}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
