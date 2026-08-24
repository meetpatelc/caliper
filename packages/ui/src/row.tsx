import type { ReactNode } from "react";
import { cn } from "./cn";
import { panelClass } from "./panel";

/** Title + optional meta + trailing actions. Same interaction as Project checks/reviews. */
export function DataRow({
  eyebrow,
  title,
  meta,
  actions,
  align = "center",
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  align?: "center" | "start";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        panelClass,
        "flex flex-wrap justify-between gap-3 px-4 py-3",
        align === "start" ? "items-start" : "items-center",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <div className={eyebrow ? "mt-1" : undefined}>{title}</div>
        {meta ? <div className="mt-1">{meta}</div> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
