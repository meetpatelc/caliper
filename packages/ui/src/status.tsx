import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type StatusSlots = {
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

function StatusFrame({
  title,
  children,
  action,
  className,
  role,
  tone,
}: StatusSlots & { role?: "status" | "alert"; tone: "muted" | "danger" }) {
  const titleClass = tone === "danger" ? "font-medium text-danger" : "font-medium text-fg";
  const bodyClass = tone === "danger" ? "text-sm text-danger" : "text-sm text-muted";
  if (!title && !action) {
    return (
      <p className={cn(bodyClass, className)} role={role}>
        {children}
      </p>
    );
  }
  return (
    <div className={cn(bodyClass, className)} role={role}>
      {title ? <p className={titleClass}>{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function LoadingState({
  variant = "text",
  title,
  action,
  className,
  children = "Loading.",
}: StatusSlots & { variant?: "text" | "bar" | "block" | "avatar" }) {
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
    <StatusFrame title={title} action={action} className={className} role="status" tone="muted">
      {children}
    </StatusFrame>
  );
}

export function EmptyState({ title, children, action, className }: StatusSlots) {
  return (
    <StatusFrame title={title} action={action} className={className} role="status" tone="muted">
      {children}
    </StatusFrame>
  );
}

export function ErrorState({
  title,
  children,
  action,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & StatusSlots) {
  if (!title && !action) {
    return (
      <p className={cn("text-sm text-danger", className)} role="alert" {...props}>
        {children}
      </p>
    );
  }
  return (
    <div className={cn("text-sm text-danger", className)} role="alert" {...props}>
      {title ? <p className="font-medium text-danger">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
