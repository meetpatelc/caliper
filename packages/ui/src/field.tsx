import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";
import { fieldErrorId, fieldHintId } from "./field-id";

export { fieldErrorId };

type FieldA11y = { error?: string; errorId?: string; hintId?: string; required?: boolean };
const FieldContext = createContext<FieldA11y>({});

export function useFieldA11y(props: {
  "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-required"?: InputHTMLAttributes<HTMLInputElement>["aria-required"];
  required?: boolean;
}) {
  const ctx = useContext(FieldContext);
  // Hint first, then error: a reader announces them in listed order, and the
  // guidance is what tells you how to fix the complaint.
  const described = [
    ...new Set([props["aria-describedby"], ctx.hintId, ctx.error ? ctx.errorId : undefined].filter(Boolean)),
  ].join(" ");
  return {
    "aria-invalid": props["aria-invalid"] ?? (ctx.error ? true : undefined),
    "aria-describedby": described || undefined,
    "aria-errormessage": props["aria-errormessage"] ?? (ctx.error ? ctx.errorId : undefined),
    "aria-required": props["aria-required"] ?? (props.required || ctx.required ? true : undefined),
  };
}

export function Field({
  label,
  symbol,
  htmlFor,
  error,
  errorId: errorIdProp,
  hint,
  required,
  children,
}: {
  label: string;
  symbol?: string;
  htmlFor?: string;
  error?: string;
  errorId?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  const generatedId = useId();
  const base = htmlFor ?? generatedId;
  const errorId = error ? (errorIdProp ?? fieldErrorId(base)) : undefined;
  const hintId = hint ? fieldHintId(base) : undefined;
  return (
    <FieldContext.Provider value={{ error, errorId, hintId, required }}>
      <div className="grid gap-1.5">
        {/* The label wraps only the name and the control. The hint and the error
            are siblings, not children: inside the label they became part of the
            control's accessible name rather than its description. */}
        <label htmlFor={htmlFor} className="grid gap-1.5">
          <span className="flex items-baseline gap-2 text-sm">
            {label}
            {required ? (
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            ) : null}
            {symbol ? <em className="font-mono text-xs not-italic text-accent">{symbol}</em> : null}
          </span>
          {children}
        </label>
        {/* Both, not either. The guidance used to be replaced by the error —
            withdrawing the explanation at the moment it is needed. */}
        {hint ? (
          <span id={hintId} className="text-sm text-muted">
            {hint}
          </span>
        ) : null}
        {error ? (
          <small id={errorId} role="alert" className="text-xs leading-4 text-danger">
            {error}
          </small>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export const controlClass =
  "h-10 rounded-md border border-border bg-bg px-3 text-sm outline-none transition-colors hover:border-fg/25 disabled:opacity-40";
const invalid = "border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  const a11y = useFieldA11y(props);
  return (
    <input
      ref={ref}
      className={cn(
        controlClass,
        "min-w-0 flex-1",
        props.inputMode === "decimal" && "font-mono tabular-nums",
        a11y["aria-invalid"] && invalid,
        className,
      )}
      {...props}
      {...a11y}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  const a11y = useFieldA11y(props);
  return (
    <select ref={ref} className={cn(controlClass, a11y["aria-invalid"] && invalid, className)} {...props} {...a11y}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  const a11y = useFieldA11y(props);
  return (
    <textarea
      ref={ref}
      className={cn(controlClass, "h-auto min-w-0 py-2", a11y["aria-invalid"] && invalid, className)}
      {...props}
      {...a11y}
    />
  );
});

export function UnitSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select aria-label="Unit" className={cn(controlClass, "w-unit shrink-0 px-1 font-mono text-xs", className)} {...props}>
      {children}
    </select>
  );
}

export function UnitBadge({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-10 w-unit shrink-0 place-items-center rounded-md border border-border bg-bg font-mono text-xs text-muted">
      {children}
    </span>
  );
}

export function MeasurementField({
  children,
  invalid: invalidProp,
  className,
}: {
  children: ReactNode;
  invalid?: boolean;
  className?: string;
}) {
  const ctx = useContext(FieldContext);
  const isInvalid = invalidProp ?? Boolean(ctx.error);
  return (
    <span
      className={cn("measurement-field", isInvalid && "measurement-field-invalid", className)}
      data-invalid={isInvalid ? "true" : undefined}
    >
      {children}
    </span>
  );
}
