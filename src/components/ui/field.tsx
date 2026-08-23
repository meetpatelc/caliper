/* eslint-disable react-refresh/only-export-components -- kit field re-exports */
import { forwardRef, type InputHTMLAttributes } from "react";
import { Field, Select, UnitSelect, UnitBadge, controlClass } from "@instrument/ui";
import { cn } from "@/lib/utils";

export { Field, Select, UnitSelect, UnitBadge, controlClass };

const invalid = "border-danger";

/** Same control as kit Input, with a forwarded host ref (formula caret, focus restore). */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          controlClass,
          "min-w-0 flex-1",
          props.inputMode === "decimal" && "font-mono tabular-nums",
          props["aria-invalid"] && invalid,
          className,
        )}
        {...props}
      />
    );
  },
);
