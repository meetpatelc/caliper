import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { panelClass } from "./panel";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function OverlayDialog({
  open,
  onClose,
  title,
  restoreFocusTo,
  variant = "modal",
  titleMode = "sr-only",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  restoreFocusTo?: RefObject<HTMLElement | null>;
  variant?: "modal" | "drawer";
  titleMode?: "sr-only" | "visible";
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  // There is no document to portal into during SSR, so the overlay stays out of
  // the server render and appears on the client. Overlays are only ever opened
  // by an interaction, so nothing is lost from the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    // Read the caller's restore target ONCE, while the overlay opens. Reading
    // `restoreFocusTo.current` in the cleanup instead would see whatever the
    // ref points at when the overlay closes — by then the trigger may have
    // unmounted, and focus would be restored to a detached node or lost to
    // <body>, dropping the keyboard user's place on the page.
    const restoreTarget = restoreFocusTo?.current ?? null;
    lastActive.current = (document.activeElement as HTMLElement | null) ?? restoreTarget;
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
      const remembered = lastActive.current;
      const restore = remembered && document.contains(remembered) ? remembered : restoreTarget;
      restore?.focus?.();
    };
  }, [open, restoreFocusTo]);

  if (!open || !mounted) return null;

  // Portalled to <body> because the open overlay marks `#main-content` inert to
  // hold the background back. Rendered in place, the dialog is a descendant of
  // that very element, so `inert` took the dialog with it: Confirm and Cancel
  // stopped responding to the mouse and could not be reached by keyboard
  // either, leaving a reload as the only way out. Programmatic .click() still
  // fired the handlers, which is how it stayed hidden from scripted checks.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-fg/45" aria-label={`Close ${title}`} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          variant === "drawer"
            ? "overlay-drawer absolute inset-y-0 right-0 flex w-72 flex-col border-l border-border bg-bg p-5"
            : cn(panelClass, "relative mx-auto mt-[12vh] w-[min(640px,calc(100%-1.5rem))] shadow-menu"),
        )}
      >
        <h2 id={titleId} className={titleMode === "visible" ? "section-title-sm px-5 pt-5" : "sr-only"}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
