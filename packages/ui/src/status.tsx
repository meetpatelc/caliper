import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function LoadingState({
  variant = "text",
  className,
  children = "Loading.",
}: {
  variant?: "text" | "bar" | "block" | "avatar";
  className?: string;
  children?: ReactNode;
}) {
  if (variant === "bar") {
    return <div className={cn("h-8 w-48 animate-pulse rounded-md bg-elevated", className)} aria-hidden="true" />;
  }
  if (variant === "block") {
    return <div className={cn("h-40 animate-pulse rounded-md bg-surface", className)} aria-hidden="true" />;
  }
  if (variant === "avatar") {
    return <div className={cn("size-10 shrink-0 animate-pulse rounded-md bg-elevated", className)} aria-hidden="true" />;
  }
  return (
    <p className={cn("text-sm text-muted", className)} role="status">
      {children}
    </p>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted", className)}>{children}</p>;
}

export function ErrorState({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p className={cn("text-sm text-danger", className)} role="alert" {...props}>
      {children}
    </p>
  );
}
