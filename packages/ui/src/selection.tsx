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
      className={cn(panelHoverClass, selected && "border-accent", className)}
      data-selected={selected ? "true" : undefined}
      {...props}
    />
  );
}
