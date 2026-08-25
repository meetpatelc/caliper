import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export const panelClass = "overflow-hidden rounded-md border border-border bg-surface";
export const panelHoverClass = "rounded-md border border-border transition-colors hover:bg-elevated";
export const instrumentClass = "instrument-sheet";

export function Panel({
  className,
  variant = "card",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "card" | "hover" }) {
  return <div className={cn(variant === "hover" ? panelHoverClass : panelClass, className)} {...props} />;
}
