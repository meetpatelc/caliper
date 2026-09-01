import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Button } from "./button";
import { panelHoverClass } from "./panel";

export function FilterChip({
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <Button
      type="button"
      aria-pressed={active}
      variant={active ? "accent" : "outline"}
      size="sm"
      className={cn("whitespace-nowrap", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function SelectableCard({
  selected,
  asChild = false,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { selected?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      {...(!asChild ? { type: "button" } : {})}
      /*
       * `aria-pressed`, the way FilterChip four lines up already does it.
       *
       * Selection was carried entirely by `border-accent` and a `data-selected`
       * attribute nothing assistive reads, so the review checklist announced
       * every rule identically whether or not it had been ticked — on a control
       * whose only purpose is recording which ones you have done.
       *
       * Only when this renders its own button. Under `asChild` the child is
       * often a label wrapping a radio, which carries its own state and would
       * be reading it out twice, in conflicting ways. Spread after, so a caller
       * that knows better still wins.
       */
      {...(!asChild && selected !== undefined ? { "aria-pressed": selected } : {})}
      className={cn(panelHoverClass, selected && "border-accent", className)}
      data-selected={selected ? "true" : undefined}
      {...props}
    />
  );
}
