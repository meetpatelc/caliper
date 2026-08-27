import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { panelClass } from "./panel";

/**
 * A rotated tab clinging to the right edge that opens a panel beside the page.
 *
 * Non-modal on purpose, which is why this is not `OverlayDialog variant="drawer"`.
 * That drawer locks body scroll, paints a backdrop over everything, and marks
 * the header, main and footer `inert` — correct for a dialog demanding an
 * answer, wrong for a rail you consult *while* reading. You should be able to
 * open favourites, look at a model name, and keep scrolling the page behind it.
 *
 * The interaction loop is borrowed from `Menu`, which already solved the
 * non-modal case: close on outside pointerdown, close on Escape, restore focus
 * to the trigger. What is dropped is the anchored positioning, because this is
 * fixed to the viewport edge rather than hung under a button.
 *
 * Pinning exists because the two modes are genuinely different jobs. Glancing
 * at a favourite wants a panel that goes away; working through a list of them
 * wants one that stays. The old rail only did the second, and only above
 * 1440px — below that there was no favourites affordance at all.
 */
export function SideTab({
  label,
  icon,
  offset = 0,
  pinned = false,
  onPinnedChange,
  children,
}: {
  label: string;
  icon?: ReactNode;
  /** Stacking order down the right edge, in tab-heights from the top. */
  offset?: number;
  pinned?: boolean;
  onPinnedChange?: (next: boolean) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showing = open || pinned;

  useEffect(() => {
    // A pinned panel is part of the page, not a transient overlay: it should not
    // vanish because someone clicked the article next to it.
    if (!open || pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
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
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={showing}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "side-tab fixed right-0 z-30 flex items-center gap-1.5 rounded-l-md border border-r-0 border-border bg-surface px-2 py-3 text-xs font-medium",
          "hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          showing && "bg-elevated",
        )}
        style={{ top: `calc(6rem + ${offset} * 9.5rem)` }}
      >
        {icon}
        <span className="side-tab-label">{label}</span>
      </button>
      {showing ? (
        <div
          ref={panelRef}
          role="region"
          aria-label={label}
          className={cn(
            panelClass,
            "side-tab-panel fixed right-9 z-30 flex max-h-[min(28rem,70vh)] w-72 flex-col overflow-auto p-4 shadow-menu",
          )}
          style={{ top: `calc(6rem + ${offset} * 9.5rem)` }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">{label}</p>
            {onPinnedChange ? (
              <button
                type="button"
                aria-pressed={pinned}
                onClick={() => onPinnedChange(!pinned)}
                className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
              >
                {pinned ? "Unpin" : "Pin"}
              </button>
            ) : null}
          </div>
          <div className="mt-2">{children}</div>
        </div>
      ) : null}
    </>
  );
}
