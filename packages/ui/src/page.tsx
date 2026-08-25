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

/**
 * A section's kicker and heading, as one component.
 *
 * The pairing existed as two classes used together — `.eyebrow` above a
 * `.section-title` — which meant every call site re-decided the heading level,
 * the size, and whether to add `mt-1`. It resolved three different ways across
 * the app. Making it a component removes the choice rather than documenting it.
 *
 * `size="sm"` renders an h3 for headings nested inside an h2 section.
 * `aside` takes trailing content that sits on the heading's baseline — a count,
 * a link — instead of each caller inventing its own flex row.
 */
export function SectionHeader({
  kicker,
  title,
  size = "md",
  aside,
  className,
}: {
  kicker: ReactNode;
  title: ReactNode;
  size?: "md" | "sm";
  aside?: ReactNode;
  className?: string;
}) {
  const Heading = size === "sm" ? "h3" : "h2";
  const heading = (
    <div>
      <p className="eyebrow">{kicker}</p>
      <Heading className={cn(size === "sm" ? "section-title-sm" : "section-title", "mt-1")}>
        {title}
      </Heading>
    </div>
  );
  if (!aside) {
    return <div className={className}>{heading}</div>;
  }
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      {heading}
      {aside}
    </div>
  );
}
