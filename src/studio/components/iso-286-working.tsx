import { useMemo, useState } from "react";
import {
  computeFit,
  fitLabel,
  HOLE_LETTERS,
  IT_GRADES,
  SHAFT_LETTERS,
  type HoleLetter,
  type ShaftLetter,
} from "@/studio/lib/iso286";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { Field, Input, Select, UnitBadge } from "@/components/ui/field";
import { MeasurementField } from "@/components/ui/measurement-field";
import { ErrorState } from "@/components/ui/status";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

/**
 * ISO 286 fits, with the arithmetic shown.
 *
 * A second page beside `/tool/fits`, not a replacement for it. The shipped page
 * prints the answer; this one prints the subtraction that produces it, so a
 * reader can check the result rather than take it. Both import the same
 * `computeFit`, so the numbers cannot differ — only what is displayed does.
 *
 * It exists to be compared against the original and deleted if it is worse.
 * Nothing else imports it and nothing else links to it, so removing this file
 * and its route leaves the shipped page untouched.
 *
 * Two things the shipped page computes and discards, which is most of the
 * reason this exists:
 *
 *   cmin, imin   Only the maxima are shown. On a clearance fit that means the
 *                page prints "maximum interference: −0.012 mm" — a negative
 *                tightness, which reads like a fault — while the useful number,
 *                the minimum clearance, is calculated and thrown away.
 *   IT widths    The tolerance width of each part, which is what the grade
 *                actually means.
 *
 * The arithmetic is rendered from the same object that produced the answer, and
 * never retyped. `iso-286-working.test.mjs` pins that: every operand shown has
 * to reproduce the value `computeFit` returned.
 */

/** Deviations are µm here. The published tables are µm, and "87 − 23 = 64" reads. */
const um = (mmValue: number) => Math.round(mmValue * 1000);
const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/**
 * An operand inside a subtraction, rather than a value on its own.
 *
 * "+87 − +23" is harder to read than the arithmetic it describes, and
 * "35 − −34" is worse. Positives go bare, negatives get brackets, which is how
 * the sum would be written down.
 */
const operand = (value: number) => (value < 0 ? `(${value})` : String(value));

/**
 * One line of working: the named operands, and the number they produce.
 *
 * Built from the fit itself so the sum shown and the answer shown are the same
 * arithmetic. Typing "87 − 23 = 64" into the markup would make this page the
 * one place on the site whose numbers nobody checks.
 */
function workingRows(fit: ReturnType<typeof computeFit>) {
  const ES = um(fit.ES);
  const EI = um(fit.EI);
  const es = um(fit.es);
  const ei = um(fit.ei);
  return [
    { label: "Clearance, largest", terms: "ES − ei", a: ES, b: ei, value: ES - ei },
    { label: "Clearance, smallest", terms: "EI − es", a: EI, b: es, value: EI - es },
    { label: "Interference, largest", terms: "es − EI", a: es, b: EI, value: es - EI },
    { label: "Interference, smallest", terms: "ei − ES", a: ei, b: ES, value: ei - ES },
  ];
}

export function Iso286WorkingInstrument() {
  const [D, setD] = useState("100");
  const [holeLetter, setHoleLetter] = useState<HoleLetter>("H");
  const [holeGrade, setHoleGrade] = useState(9);
  const [shaftLetter, setShaftLetter] = useState<ShaftLetter>("n");
  const [shaftGrade, setShaftGrade] = useState(8);

  const result = useMemo(() => {
    try {
      return { ok: true as const, fit: computeFit(Number(D), holeLetter, holeGrade, shaftLetter, shaftGrade) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not evaluate." };
    }
  }, [D, holeLetter, holeGrade, shaftLetter, shaftGrade]);

  return (
    <div className="page-wrap">
      <PageHeader
        kicker="Comparison"
        title="ISO 286 fits, with the working shown."
        lede={
          <>
            The same calculation as{" "}
            <Link to="/tool/$toolId" params={{ toolId: "fits" }} className="link-accent">
              the shipped page
            </Link>
            , from the same code, printing the subtraction rather than only its answer. Here to be
            compared against it.
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className={cn(panelClass, "grid gap-4 p-5")}>
          <Field htmlFor="w-D" label="Nominal size" symbol="D">
            <MeasurementField>
              <Input id="w-D" inputMode="decimal" value={D} onChange={(event) => setD(event.target.value)} />
              <UnitBadge>mm</UnitBadge>
            </MeasurementField>
          </Field>

          <div className="grid gap-2">
            <p className="text-sm font-medium">
              Hole <span className="font-mono text-muted">{holeLetter}{holeGrade}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Select aria-label="Hole letter" value={holeLetter} onChange={(e) => setHoleLetter(e.target.value as HoleLetter)}>
                {HOLE_LETTERS.map((letter) => (
                  <option key={letter} value={letter}>{letter}</option>
                ))}
              </Select>
              <Select aria-label="Hole IT grade" value={String(holeGrade)} onChange={(e) => setHoleGrade(Number(e.target.value))}>
                {IT_GRADES.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">
              Shaft <span className="font-mono text-muted">{shaftLetter}{shaftGrade}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Select aria-label="Shaft letter" value={shaftLetter} onChange={(e) => setShaftLetter(e.target.value as ShaftLetter)}>
                {SHAFT_LETTERS.map((letter) => (
                  <option key={letter} value={letter}>{letter}</option>
                ))}
              </Select>
              <Select aria-label="Shaft IT grade" value={String(shaftGrade)} onChange={(e) => setShaftGrade(Number(e.target.value))}>
                {IT_GRADES.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {result.ok ? (
          <div className={cn(panelClass, "p-5")}>
            <p className="eyebrow">Fit</p>
            <p className="mt-1 text-lg font-medium">
              {fitLabel(result.fit.kind)}{" "}
              <span className="font-mono text-sm text-muted">
                {result.fit.holeClass}/{result.fit.shaftClass}
              </span>
            </p>

            <SectionHeader className="mt-6" title="The working" />
            <p className="mt-1 text-sm leading-6 text-muted">
              Deviations in µm from the nominal size. Every line is the sum, not a restatement of it.
            </p>
            <dl className="mt-3 grid gap-1.5">
              {workingRows(result.fit).map((row) => (
                <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <dt className="text-sm text-muted">{row.label}</dt>
                  <dd className="font-mono text-sm tabular-nums">
                    <span className="text-muted">{row.terms} = </span>
                    {operand(row.a)} − {operand(row.b)} ={" "}
                    <span className="text-base font-medium">{signed(row.value)}</span>
                    <span className="ml-1 text-muted">µm</span>
                  </dd>
                </div>
              ))}
            </dl>

            <SectionHeader className="mt-6" title="Where those came from" />
            <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted">Hole ES / EI</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {signed(um(result.fit.ES))} / {signed(um(result.fit.EI))} µm
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted">Hole width IT{holeGrade}</dt>
                <dd className="font-mono text-sm tabular-nums">{result.fit.IT_hole} µm</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted">Shaft es / ei</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {signed(um(result.fit.es))} / {signed(um(result.fit.ei))} µm
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted">Shaft width IT{shaftGrade}</dt>
                <dd className="font-mono text-sm tabular-nums">{result.fit.IT_shaft} µm</dd>
              </div>
            </dl>

            <SectionHeader className="mt-6" title="As dimensions" />
            <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted">Hole</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {result.fit.holeMin.toFixed(3)} / {result.fit.holeMax.toFixed(3)} mm
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted">Shaft</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {result.fit.shaftMin.toFixed(3)} / {result.fit.shaftMax.toFixed(3)} mm
                </dd>
              </div>
            </dl>

            <p className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted">
              Deviations are the published ISO 286-1/2:2010 limits, not a formula approximation of
              them. A positive clearance is a gap; a negative one is interference, and the same
              number appears with its sign flipped in the interference rows.
            </p>
          </div>
        ) : (
          <ErrorState>{result.error}</ErrorState>
        )}
      </div>
    </div>
  );
}
