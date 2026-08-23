import { Link } from "@tanstack/react-router";
import { BookOpenText, CircleAlert, ClipboardList, Compass, Sigma } from "lucide-react";
import { useMemo, useState } from "react";
import type { OfficialCalculator } from "@/gauge/lib/calculator-types";
import { relatedCalculators } from "@/gauge/lib/catalog";
import { buttonVariants, panelHoverClass } from "@instrument/ui";
import { cn } from "@/lib/utils";
import { formatDeviationMm, formatLimitMm } from "@/gauge/lib/format-limit";
import { MeasurementField } from "@/components/ui/measurement-field";
import {
  computeFit,
  fitLabel,
  HOLE_LETTERS,
  IT_GRADES,
  SHAFT_LETTERS,
  type HoleLetter,
  type ShaftLetter,
} from "@/gauge/lib/iso286";

function mm(value: number, kind: "limit" | "deviation" = "deviation") {
  return kind === "limit" ? formatLimitMm(value) : formatDeviationMm(value);
}

function FitDiagram({
  ES,
  EI,
  es,
  ei,
}: {
  ES: number;
  EI: number;
  es: number;
  ei: number;
}) {
  const values = [ES, EI, es, ei, 0];
  const max = Math.max(...values.map((v) => Math.abs(v)), 1e-6);
  const y = (v: number) => 16 + ((max - v) / (2 * max)) * 140;
  const zero = y(0);
  const holeTop = y(Math.max(ES, EI));
  const holeBot = y(Math.min(ES, EI));
  const shaftTop = y(Math.max(es, ei));
  const shaftBot = y(Math.min(es, ei));

  return (
    <svg viewBox="0 0 220 180" className="w-full border border-border bg-elevated" aria-hidden="true">
      <line x1="24" y1={zero} x2="210" y2={zero} stroke="var(--color-border)" strokeWidth="1" />
      <text x="8" y={zero + 4} className="fill-muted" fontSize="9" fontFamily="IBM Plex Mono, monospace">
        0
      </text>
      <rect x="48" y={holeTop} width="44" height={Math.max(holeBot - holeTop, 2)} fill="var(--color-surface)" stroke="var(--color-fg)" strokeWidth="2" />
      <rect
        x="128"
        y={shaftTop}
        width="44"
        height={Math.max(shaftBot - shaftTop, 2)}
        fill="color-mix(in srgb, var(--color-mark) 35%, transparent)"
        stroke="var(--color-mark)"
        strokeWidth="2"
      />
      <text x="70" y="12" textAnchor="middle" className="fill-muted" fontSize="9" fontFamily="IBM Plex Sans, sans-serif">
        Hole
      </text>
      <text x="150" y="12" textAnchor="middle" className="fill-muted" fontSize="9" fontFamily="IBM Plex Sans, sans-serif">
        Shaft
      </text>
    </svg>
  );
}

export function Iso286Instrument({ calculator }: { calculator: OfficialCalculator }) {
  const [D, setD] = useState("100");
  const [holeLetter, setHoleLetter] = useState<HoleLetter>("H");
  const [holeGrade, setHoleGrade] = useState(9);
  const [shaftLetter, setShaftLetter] = useState<ShaftLetter>("n");
  const [shaftGrade, setShaftGrade] = useState(8);
  const related = relatedCalculators(calculator.slug);

  const result = useMemo(() => {
    const diameter = Number(D);
    try {
      return { ok: true as const, fit: computeFit(diameter, holeLetter, holeGrade, shaftLetter, shaftGrade) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not evaluate." };
    }
  }, [D, holeLetter, holeGrade, shaftLetter, shaftGrade]);

  return (
    <div className="grid gap-8">
      <header>
        <p className="eyebrow">{calculator.domain}</p>
        <h1 className="display-title mt-3">{calculator.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{calculator.description}</p>
      </header>

      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-surface p-4 sm:p-5">
          <p className="eyebrow">Inputs</p>
          <label className="mt-4 grid gap-2">
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span>Nominal size</span>
              <span className="font-mono text-muted" aria-hidden="true">
                D
              </span>
            </span>
            <MeasurementField>
              <input
                className="field-control tabular-nums"
                inputMode="decimal"
                value={D}
                onChange={(event) => setD(event.target.value)}
                aria-label="Nominal size"
              />
              <span className="grid place-items-center text-sm text-muted">mm</span>
            </MeasurementField>
          </label>

          <p className="eyebrow mt-6">Tolerance hub (hole)</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className="field-control" value={holeLetter} onChange={(event) => setHoleLetter(event.target.value as HoleLetter)} aria-label="Hole letter">
              {HOLE_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
            <select className="field-control" value={holeGrade} onChange={(event) => setHoleGrade(Number(event.target.value))} aria-label="Hole IT grade">
              {IT_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          {result.ok && (
            <dl className="mt-3 grid grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-1 font-mono text-sm">
              <dt className="text-muted">ES</dt>
              <dd className="tabular-nums">{mm(result.fit.ES, "deviation")}</dd>
              <dd className="text-muted">mm</dd>
              <dt className="text-muted">EI</dt>
              <dd className="tabular-nums">{mm(result.fit.EI, "deviation")}</dd>
              <dd className="text-muted">mm</dd>
            </dl>
          )}

          <p className="eyebrow mt-6">Tolerance shaft</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className="field-control" value={shaftLetter} onChange={(event) => setShaftLetter(event.target.value as ShaftLetter)} aria-label="Shaft letter">
              {SHAFT_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
            <select className="field-control" value={shaftGrade} onChange={(event) => setShaftGrade(Number(event.target.value))} aria-label="Shaft IT grade">
              {IT_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          {result.ok && (
            <dl className="mt-3 grid grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-1 font-mono text-sm">
              <dt className="text-muted">es</dt>
              <dd className="tabular-nums">{mm(result.fit.es, "deviation")}</dd>
              <dd className="text-muted">mm</dd>
              <dt className="text-muted">ei</dt>
              <dd className="tabular-nums">{mm(result.fit.ei, "deviation")}</dd>
              <dd className="text-muted">mm</dd>
            </dl>
          )}
        </section>

        <section className="bg-elevated p-4 sm:p-5">
          <p className="eyebrow">Result</p>
          {result.ok ? (
            <>
              <p className="mt-3 text-lg font-semibold">{fitLabel(result.fit.kind)}</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {result.fit.holeClass}/{result.fit.shaftClass} · IT hole {result.fit.IT_hole} µm · IT shaft {result.fit.IT_shaft} µm
              </p>
              <ul className="mt-4 grid gap-3">
                <li>
                  <p className="text-sm text-muted">Maximum clearance</p>
                  <p className="font-mono text-3xl tabular-nums tracking-tight">
                    {mm(result.fit.cmax, "deviation")} <span className="text-base text-muted">mm</span>
                  </p>
                </li>
                <li>
                  <p className="text-sm text-muted">Maximum interference</p>
                  <p className="font-mono text-3xl tabular-nums tracking-tight">
                    {mm(result.fit.imax, "deviation")} <span className="text-base text-muted">mm</span>
                  </p>
                </li>
              </ul>
              <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs text-muted">
                <div>Hole max {mm(result.fit.holeMax, "limit")} mm</div>
                <div>Shaft max {mm(result.fit.shaftMax, "limit")} mm</div>
                <div>Hole min {mm(result.fit.holeMin, "limit")} mm</div>
                <div>Shaft min {mm(result.fit.shaftMin, "limit")} mm</div>
              </dl>
              <div className="mt-5">
                <FitDiagram ES={result.fit.ES} EI={result.fit.EI} es={result.fit.es} ei={result.fit.ei} />
              </div>
              <p className="mt-6 font-mono text-sm text-accent">{calculator.formula}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-danger">{result.error}</p>
          )}
        </section>
      </div>

      <section id="method">
        <p className="eyebrow">Method brief</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Read the model before the number.</h2>
        <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
          <article className="bg-surface p-4">
            <Compass size={16} className="text-accent" />
            <p className="eyebrow mt-3">Purpose</p>
            <p className="mt-2 text-sm leading-6 text-muted">{calculator.purpose}</p>
          </article>
          <article className="bg-surface p-4">
            <Sigma size={16} className="text-accent" />
            <p className="eyebrow mt-3">Governing relation</p>
            <code className="mt-2 block font-mono text-sm leading-6">{calculator.formula}</code>
          </article>
          <article className="bg-surface p-4">
            <ClipboardList size={16} className="text-accent" />
            <p className="eyebrow mt-3">Assumptions</p>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">
              {calculator.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="bg-surface p-4">
            <CircleAlert size={16} className="text-mark" />
            <p className="eyebrow mt-3">Boundary</p>
            <p className="mt-2 text-sm leading-6 text-muted">{calculator.boundary}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{calculator.interpretation}</p>
          </article>
        </div>
        <a href={calculator.sourceUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost" }), "mt-4 text-accent")}>
          <BookOpenText size={16} />
          {calculator.sourceLabel}
        </a>
      </section>

      {related.length > 0 && (
        <section>
          <p className="eyebrow">Related instruments</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/c/$slug"
                  params={{ slug: item.slug }}
                  className={cn(panelHoverClass, "flex min-h-10 items-center justify-between px-3 py-3")}
                >
                  <span>{item.title}</span>
                  <span className="font-mono text-xs text-muted">{item.domain}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
