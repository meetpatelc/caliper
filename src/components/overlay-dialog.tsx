import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { panelClass } from "@/components/ui/panel";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function OverlayDialog({
  open,
  onClose,
  title,
  restoreFocusTo,
  variant = "modal",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  restoreFocusTo?: RefObject<HTMLElement | null>;
  variant?: "modal" | "drawer";
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    lastActive.current = (document.activeElement as HTMLElement | null) ?? restoreFocusTo?.current ?? null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusables = () =>
      [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
    requestAnimationFrame(() => {
      const first = focusables()[0];
      first?.focus();
    });
    const inertTargets = [document.querySelector("header"), document.getElementById("main-content"), document.querySelector("footer")].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    inertTargets.forEach((element) => element.setAttribute("inert", ""));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      inertTargets.forEach((element) => element.removeAttribute("inert"));
      const restore = restoreFocusTo?.current ?? lastActive.current;
      restore?.focus?.();
    };
  }, [open, restoreFocusTo]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-fg/45" aria-label={`Close ${title}`} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          variant === "drawer"
            ? "absolute inset-y-0 right-0 flex w-72 flex-col border-l border-border bg-bg p-5"
            : cn(panelClass, "relative mx-auto mt-[12vh] w-[min(640px,calc(100%-1.5rem))] shadow-menu"),
        )}
      >
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
