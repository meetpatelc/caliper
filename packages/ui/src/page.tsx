import type { ReactNode } from "react";
import { cn } from "./cn";

export function PageHeader({
  kicker,
  title,
  lede,
  actions,
  size = "display",
  className,
  ledeClassName,
}: {
  kicker: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  size?: "display" | "page";
  className?: string;
  ledeClassName?: string;
}) {
  const heading = (
    <div>
      <p className="eyebrow">{kicker}</p>
      <h1 className={size === "page" ? "page-title mt-1" : "display-title mt-3"}>{title}</h1>
      {lede ? <div className={cn("lede", ledeClassName)}>{lede}</div> : null}
    </div>
  );
  if (!actions) {
    return <header className={className}>{heading}</header>;
  }
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      {heading}
      <div className="flex flex-wrap gap-2">{actions}</div>
    </header>
  );
}
