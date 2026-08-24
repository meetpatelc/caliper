import type { ReactNode } from "react";
import { cn } from "./cn";
import { instrumentClass } from "./panel";

/** One instrument glass: optional drawing band, then aligned Inputs | Results. */
export function InstrumentSheet({
  diagram,
  example,
  resultTitle = "Results",
  inputs,
  results,
  compact = false,
}: {
  diagram?: ReactNode;
  example?: ReactNode;
  resultTitle?: string;
  inputs: ReactNode;
  results: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={instrumentClass}>
      {diagram ? <div className="diagram-surface">{diagram}</div> : null}
      <div className={cn("grid gap-px", compact ? "grid-cols-1" : "lg:grid-cols-2")}>
        <div className="bg-surface p-4 sm:p-5">
          <div className="flex h-10 items-center justify-between gap-2">
            <h2 className="sheet-heading">Inputs</h2>
            {example ?? <span className="size-10 shrink-0" aria-hidden="true" />}
          </div>
          <div className="mt-4 grid gap-4">{inputs}</div>
        </div>
        <div className="bg-bg p-4 sm:p-5">
          <div className="flex h-10 items-center">
            <h2 className="sheet-heading">{resultTitle}</h2>
          </div>
          <div className="mt-4 grid gap-4">{results}</div>
        </div>
      </div>
    </div>
  );
}

export function QuantityName({ label, symbol }: { label: string; symbol?: string }) {
  return (
    <span className="flex items-baseline gap-2 text-sm">
      {label}
      {symbol ? <em className="font-mono text-xs not-italic text-accent">{symbol}</em> : null}
    </span>
  );
}

/** Live result: label, shop number, optional unit control. */
export function ResultQuantity({
  label,
  symbol,
  value,
  unit,
  caption,
}: {
  label: string;
  symbol?: string;
  value: ReactNode;
  unit?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <QuantityName label={label} symbol={symbol} />
      <span className="flex items-center gap-2">
        <p className="min-w-0 flex-1 font-mono text-3xl font-medium tabular-nums tracking-tight">{value}</p>
        {unit}
      </span>
      {caption}
    </div>
  );
}
