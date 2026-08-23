import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MeasurementField({
  children,
  invalid,
  className,
}: {
  children: ReactNode;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("measurement-field", invalid && "measurement-field-invalid", className)}
      data-invalid={invalid ? "true" : undefined}
    >
      {children}
    </span>
  );
}
