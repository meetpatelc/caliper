import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { panelClass } from "./panel";

export type SideTabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  /** Omit to make a tab that cannot be pinned open. */
  pinnable?: boolean;
};

/**
 * Rotated tabs on the right edge, each opening a panel beside the page.
 *
 * Non-modal on purpose, which is why this is not `OverlayDialog variant="drawer"`.
 * That drawer locks body scroll, paints a backdrop, and marks the header, main
 * and footer `inert` — correct for a dialog demanding an answer, wrong for a
 * rail you consult *while* reading.
 *
 * The tabs and the panels are positioned by different rules, and that split is
 * the point. Tabs sit at fixed offsets down the edge so they are always in the
 * same place. Panels are laid out as a **single stacked column**, because they
 * are up to 28rem tall while the tabs are 9.5rem apart: anchoring each panel to
 * its own tab let a pinned Favourites and an opened Convert overlap, silently
 * clipping the favourites list from six entries to three. Stacking removes the
 * whole class rather than tuning offsets until it looks right.
 */
export function SideTabs({
  items,
  pinned,
  onPinnedChange,
}: {
  items: SideTabItem[];
  pinned: string[];
  onPinnedChange: (id: string, next: boolean) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const triggersRef = useRef(new Map<string, HTMLButtonElement>());
  const columnRef = useRef<HTMLDivElement>(null);

  const showing = items.filter((item) => item.id === open || pinned.includes(item.id));

  useEffect(() => {
    // A pinned panel is part of the page, not a transient overlay, so it should
    // not vanish because someone clicked the article beside it. Only the
    // transiently-opened one closes.
    if (!open || pinned.includes(open)) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (columnRef.current?.contains(target)) return;
      for (const trigger of triggersRef.current.values()) if (trigger.contains(target)) return;
      setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      triggersRef.current.get(open)?.focus();
      setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, pinned]);

  return (
    <>
      {items.map((item, index) => {
        const isShowing = item.id === open || pinned.includes(item.id);
        return (
          <button
            key={item.id}
            ref={(node) => {
              if (node) triggersRef.current.set(item.id, node);
              else triggersRef.current.delete(item.id);
            }}
            type="button"
            aria-expanded={isShowing}
            aria-label={item.label}
            onClick={() => setOpen((current) => (current === item.id ? null : item.id))}
            className={cn(
              "side-tab fixed right-0 z-30 flex items-center gap-1.5 rounded-l-md border border-r-0 border-border bg-surface px-2 py-3 text-xs font-medium",
              "hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              isShowing && "bg-elevated",
            )}
            style={{ top: `calc(6rem + ${index} * 9.5rem)` }}
          >
            {item.icon}
            <span className="side-tab-label">{item.label}</span>
          </button>
        );
      })}

      {showing.length ? (
        <div
          ref={columnRef}
          // The column scrolls rather than the page when several panels are open
          // together, so a pinned panel plus a tall one cannot run off-screen.
          className="side-tab-column fixed right-9 top-24 z-30 flex max-h-[calc(100vh-8rem)] w-72 flex-col gap-2 overflow-y-auto"
        >
          {showing.map((item) => (
            <div
              key={item.id}
              role="region"
              aria-label={item.label}
              className={cn(panelClass, "side-tab-panel flex max-h-[28rem] shrink-0 flex-col overflow-auto p-4 shadow-menu")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">{item.label}</p>
                {item.pinnable ? (
                  <button
                    type="button"
                    aria-pressed={pinned.includes(item.id)}
                    onClick={() => onPinnedChange(item.id, !pinned.includes(item.id))}
                    className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
                  >
                    {pinned.includes(item.id) ? "Unpin" : "Pin"}
                  </button>
                ) : null}
              </div>
              <div className="mt-2">{item.content}</div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
