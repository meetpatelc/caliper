import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { Button } from "./button";

export const SearchTrigger = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { shortcut?: string; children: ReactNode }
>(function SearchTrigger({ shortcut, className, children, ...props }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className={cn(
        "min-h-10 justify-start gap-2 bg-surface font-normal text-muted hover:border-accent hover:text-fg",
        className,
      )}
      {...props}
    >
      {children}
      {shortcut ? <kbd className="kbd">{shortcut}</kbd> : null}
    </Button>
  );
});
