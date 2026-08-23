import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GoverningRelation } from "@/components/governing-relation";

/**
 * Global instrument scaffold.
 * Library models and Studio copies fill the same slots.
 * Compact Studio preview uses InstrumentSheet only — not this page.
 */
export function InstrumentPage({
  backLabel = "All models",
  actions,
  kicker,
  title,
  children,
  nearby,
  method,
}: {
  backLabel?: string;
  actions?: ReactNode;
  kicker: string;
  title: string;
  children: ReactNode;
  nearby?: ReactNode;
  method?: ReactNode;
}) {
  return (
    <div className="page-wrap">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft size={15} />
          {backLabel}
        </Link>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : <span />}
      </div>
      <p className="eyebrow">{kicker}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{title}</h1>
      <div className="mt-5">{children}</div>
      {nearby}
      {method}
    </div>
  );
}

export function InstrumentMethod({
  description,
  formula,
  when,
  dont,
  sourceLabel,
  sourceUrl,
}: {
  description?: string;
  formula: string;
  when: string[];
  dont: string;
  sourceLabel: string;
  sourceUrl?: string;
}) {
  return (
    <section className="no-print mt-8 border-t border-border pt-6" aria-labelledby="method-title">
      <p className="eyebrow">Method</p>
      <h2 id="method-title" className="mt-1 text-lg font-semibold tracking-[-0.03em]">
        Equation, when, and don’t
      </h2>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      <GoverningRelation formula={formula} className="mt-4 text-sm" />
      <div className="mt-5 grid max-w-2xl gap-5 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">When</p>
          <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-muted">
            {when.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Don’t</p>
          <p className="mt-2 text-sm leading-6 text-muted">{dont}</p>
        </div>
      </div>
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm text-accent hover:underline">
          {sourceLabel}
        </a>
      ) : (
        <p className="mt-5 text-sm text-muted">{sourceLabel}</p>
      )}
    </section>
  );
}

export function InstrumentNearby({ children }: { children: ReactNode }) {
  return <p className="no-print mt-6 text-sm text-muted">Nearby: {children}</p>;
}
