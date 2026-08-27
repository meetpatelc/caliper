import type { ReactNode } from "react";
import { ICON } from "@instrument/ui";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page";
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
        <Link to="/" className="link-quiet inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={ICON.base} />
          {backLabel}
        </Link>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : <span />}
      </div>
      <PageHeader size="page" kicker={kicker} title={title} />
      <div className="mt-4">{children}</div>
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
  /**
   * Every caveat, not the first one.
   *
   * This took a single string, and the workspace passed `result.warnings[0]`.
   * A model that raises two warnings showed one and dropped the rest with no
   * indication — and because applicability warnings are unshifted to the front
   * (`document.ts`), the one that survived was not necessarily the one that
   * mattered least. The record page has always rendered all of them.
   */
  dont: string[];
  sourceLabel: string;
  sourceUrl?: string;
}) {
  return (
    <section className="no-print mt-12 border-t border-border pt-6" aria-labelledby="method-title">
      <p className="eyebrow">Method</p>
      <h2 id="method-title" className="section-title-sm mt-1">
        Equation, when, and don’t
      </h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      <GoverningRelation formula={formula} className="mt-4 text-sm" />
      <div className="mt-4 grid max-w-2xl gap-5 sm:grid-cols-2">
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
          <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-muted">
            {dont.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="link-accent mt-4 inline-flex text-sm hover:underline">
          {sourceLabel}
        </a>
      ) : (
        <p className="mt-4 text-sm text-muted">{sourceLabel}</p>
      )}
    </section>
  );
}

export function InstrumentNearby({ children }: { children: ReactNode }) {
  return <p className="no-print mt-8 text-sm text-muted">Nearby: {children}</p>;
}
