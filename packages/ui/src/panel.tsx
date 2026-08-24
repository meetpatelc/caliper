import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export const panelClass = "overflow-hidden rounded-lg border border-border bg-surface";
export const panelHoverClass = "rounded-lg border border-border transition-colors hover:bg-elevated";
export const instrumentClass = "instrument-sheet";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(panelClass, className)} {...props} />;
}
