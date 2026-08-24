import { createContext, useContext, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { Button } from "./button";
import { FilterChip } from "./selection";

type Appearance = "plain" | "solid" | "chip";

const SegmentedContext = createContext<{ appearance: Appearance }>({ appearance: "plain" });

export function SegmentedControl({
  "aria-label": ariaLabel,
  orientation = "horizontal",
  appearance = "plain",
  className,
  children,
}: {
  "aria-label": string;
  orientation?: "horizontal" | "vertical";
  appearance?: Appearance;
  className?: string;
  children: ReactNode;
}) {
  return (
    <SegmentedContext.Provider value={{ appearance }}>
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(orientation === "vertical" ? "grid gap-1" : "flex flex-wrap gap-1", className)}
      >
        {children}
      </div>
    </SegmentedContext.Provider>
  );
}

export function SegmentedItem({
  selected,
  current,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  current?: "page" | "step" | boolean;
  children: ReactNode;
}) {
  const { appearance } = useContext(SegmentedContext);
  const ariaCurrent = current === true ? "true" : current || undefined;
  if (appearance === "chip") {
    return (
      <FilterChip active={selected} aria-current={ariaCurrent} className={className} {...props}>
        {children}
      </FilterChip>
    );
  }
  if (appearance === "solid") {
    return (
      <Button
        type="button"
        variant={selected ? "accent" : "outline"}
        aria-pressed={selected}
        aria-current={ariaCurrent}
        className={className}
        {...props}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={ariaCurrent ? undefined : selected}
      aria-current={ariaCurrent}
      className={cn(selected && "bg-elevated text-fg", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
