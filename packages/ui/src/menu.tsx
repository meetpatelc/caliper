import { Slot } from "@radix-ui/react-slot";
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode, type RefObject } from "react";
import { cn } from "./cn";
import { Button, buttonVariants } from "./button";
import { panelClass } from "./panel";

const ITEM = '[role="menuitem"]:not([disabled])';

export function Menu({
  open,
  onClose,
  label,
  restoreFocusTo,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  restoreFocusTo?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const items = () => [...(panel?.querySelectorAll<HTMLElement>(ITEM) ?? [])];
    requestAnimationFrame(() => items()[0]?.focus());
    const onPointer = (event: PointerEvent) => {
      if (!panel?.contains(event.target as Node) && event.target !== restoreFocusTo?.current) {
        onCloseRef.current();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        restoreFocusTo?.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
        return;
      }
      const list = items();
      if (!list.length) return;
      event.preventDefault();
      const index = list.findIndex((item) => item === document.activeElement);
      if (event.key === "Home") {
        list[0].focus();
        return;
      }
      if (event.key === "End") {
        list[list.length - 1].focus();
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = index < 0 ? 0 : (index + delta + list.length) % list.length;
      list[next].focus();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, restoreFocusTo]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-labelledby={labelId}
      className={cn(panelClass, "absolute right-0 top-full z-40 mt-1 w-56 p-2", className)}
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>
      {children}
    </div>
  );
}

export function MenuItem({
  asChild = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLElement> & { asChild?: boolean; children: ReactNode }) {
  if (asChild) {
    return (
      <Slot role="menuitem" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start", className)} {...props} />
    );
  }
  return (
    <Button type="button" role="menuitem" variant="ghost" className={cn("w-full justify-start", className)} {...props} />
  );
}
