import { useMemo, useState } from "react";
import { officialBySlug } from "@/studio/lib/catalog";
import { formatDeviationMm, formatLimitMm } from "@/studio/lib/format-limit";
import {
  computeFit,
  fitLabel,
  HOLE_LETTERS,
  IT_GRADES,
  SHAFT_LETTERS,
  type HoleLetter,
  type ShaftLetter,
} from "@/studio/lib/iso286";
import { tools } from "@/lib/catalog";
import { relatedTools } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { InstrumentMethod, InstrumentNearby, InstrumentPage } from "@/components/instrument-page";
import { InstrumentSheet, QuantityName, ResultQuantity } from "@/components/instrument-sheet";
import { GoverningRelation } from "@/components/governing-relation";
import { ExampleButton } from "@/components/example-button";
import { FavouriteButton } from "@/components/favourite-button";
import { Button } from "@/components/ui/button";
import { ICON } from "@instrument/ui";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { MeasurementField } from "@/components/ui/measurement-field";
import { Field, Input, Select, UnitBadge } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/status";
import { Link } from "@tanstack/react-router";

// Resolved on use rather than at module evaluation. Read at module scope, these
// two make the whole site's SSR depend on chunk initialisation order: if this
// module happens to evaluate before the catalog it imports, `tools` is still
// undefined and every route 500s with "Cannot read properties of undefined
// (reading 'find')" — from a file that only one page uses. Any change to the
// import graph could tip it either way, which is exactly what made the failure
// look like it belonged to whichever edit happened to be in flight.
const fitsCalculator = () => officialBySlug.get("iso-286-fits")!;
const fitsTool = () => tools.find((item) => item.id === "fits")!;

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
    <svg viewBox="0 0 220 180" className="mx-auto max-h-48 w-full max-w-md" aria-hidden="true">
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

export function Iso286Instrument() {
  const [D, setD] = useState("100");
  const [holeLetter, setHoleLetter] = useState<HoleLetter>("H");
  const [holeGrade, setHoleGrade] = useState(9);
  const [shaftLetter, setShaftLetter] = useState<ShaftLetter>("n");
  const [shaftGrade, setShaftGrade] = useState(8);
  const favorites = useDeskStore((state) => state.favorites);
  const toggleFavorite = useDeskStore((state) => state.toggleFavorite);
  const favourited = favorites.includes("fits");
  const nearby = relatedTools("fits");

  // The other 168 models offer Copy result; this one is a bespoke page and was
  // left without it. Save and Copy link still are: both need the page to round
  // trip its state through the URL, and it currently reads none — a saved check
  // that cannot reopen is worse than no button.
  const copyResult = async () => {
    if (!result.ok) return;
    const f = result.fit;
    const summary = [
      `${fitsTool().title} — ${f.holeClass}/${f.shaftClass} at ⌀${D} mm`,
      `Fit: ${fitLabel(f.kind)}`,
      `Maximum clearance: ${mm(f.cmax)} mm`,
      `Maximum interference: ${mm(f.imax)} mm`,
      `Hole: ${mm(f.holeMin, "limit")} / ${mm(f.holeMax, "limit")} mm`,
      `Shaft: ${mm(f.shaftMin, "limit")} / ${mm(f.shaftMax, "limit")} mm`,
      `Method: ${fitsCalculator().formula}`,
      `Boundary: ${fitsTool().assumptions.join("; ")}`,
    ].join(String.fromCharCode(10));
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Result copied with method context.");
    } catch {
      toast.error("Clipboard unavailable. Select the result text instead.");
    }
  };

  const result = useMemo(() => {
    const diameter = Number(D);
    try {
      return { ok: true as const, fit: computeFit(diameter, holeLetter, holeGrade, shaftLetter, shaftGrade) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not evaluate." };
    }
  }, [D, holeLetter, holeGrade, shaftLetter, shaftGrade]);

  return (
    <InstrumentPage
      kicker={fitsTool().kicker}
      title={fitsTool().title}
      actions={
        <>
          <Button onClick={copyResult} disabled={!result.ok}>
            <Copy size={ICON.inline} />
            Copy result
          </Button>
          <FavouriteButton favourited={favourited} onToggle={() => toggleFavorite("fits")} />
        </>
      }
      nearby={
        nearby.length > 0 ? (
          <InstrumentNearby>
            {nearby.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? " · " : null}
                <Link to="/tool/$toolId" params={{ toolId: item.id }} className="link-row">
                  {item.title}
                </Link>
              </span>
            ))}
          </InstrumentNearby>
        ) : null
      }
      method={
        <InstrumentMethod
          description={fitsCalculator().description}
          formula={fitsCalculator().formula}
          when={fitsCalculator().assumptions}
          dont={fitsCalculator().boundary}
          sourceLabel={fitsCalculator().sourceLabel}
          sourceUrl={fitsCalculator().sourceUrl}
        />
      }
    >
      <InstrumentSheet
        diagram={result.ok ? <FitDiagram ES={result.fit.ES} EI={result.fit.EI} es={result.fit.es} ei={result.fit.ei} /> : undefined}
        resultTitle={result.ok ? "Results" : "Resolve the input state"}
        example={
          <ExampleButton
            onRestore={() => {
              setD("100");
              setHoleLetter("H");
              setHoleGrade(9);
              setShaftLetter("n");
              setShaftGrade(8);
            }}
          />
        }
        inputs={
          <>
            <Field htmlFor="iso-D" label="Nominal size" symbol="D">
              <MeasurementField>
                <Input id="iso-D" inputMode="decimal" value={D} onChange={(event) => setD(event.target.value)} />
                <UnitBadge>mm</UnitBadge>
              </MeasurementField>
            </Field>
            <div className="grid gap-2">
              <QuantityName label="Hole class" symbol={`${holeLetter}${holeGrade}`} />
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="Hole letter" value={holeLetter} onChange={(event) => setHoleLetter(event.target.value as HoleLetter)}>
                  {HOLE_LETTERS.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Hole IT grade" value={String(holeGrade)} onChange={(event) => setHoleGrade(Number(event.target.value))}>
                  {IT_GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </Select>
              </div>
              {result.ok ? (
                <dl className="grid grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-1 font-mono text-sm text-muted">
                  <dt>ES</dt>
                  <dd className="tabular-nums text-fg">{mm(result.fit.ES)}</dd>
                  <dd>mm</dd>
                  <dt>EI</dt>
                  <dd className="tabular-nums text-fg">{mm(result.fit.EI)}</dd>
                  <dd>mm</dd>
                </dl>
              ) : null}
            </div>
            <div className="grid gap-2">
              <QuantityName label="Shaft class" symbol={`${shaftLetter}${shaftGrade}`} />
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="Shaft letter" value={shaftLetter} onChange={(event) => setShaftLetter(event.target.value as ShaftLetter)}>
                  {SHAFT_LETTERS.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Shaft IT grade" value={String(shaftGrade)} onChange={(event) => setShaftGrade(Number(event.target.value))}>
                  {IT_GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </Select>
              </div>
              {result.ok ? (
                <dl className="grid grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-1 font-mono text-sm text-muted">
                  <dt>es</dt>
                  <dd className="tabular-nums text-fg">{mm(result.fit.es)}</dd>
                  <dd>mm</dd>
                  <dt>ei</dt>
                  <dd className="tabular-nums text-fg">{mm(result.fit.ei)}</dd>
                  <dd>mm</dd>
                </dl>
              ) : null}
            </div>
          </>
        }
        results={
          result.ok ? (
            <>
              <ResultQuantity
                label="Fit"
                value={fitLabel(result.fit.kind)}
                caption={
                  <p className="font-mono text-xs text-muted">
                    {result.fit.holeClass}/{result.fit.shaftClass}
                  </p>
                }
              />
              <ResultQuantity
                label="Maximum clearance"
                symbol="cmax"
                value={mm(result.fit.cmax)}
                unit={<UnitBadge>mm</UnitBadge>}
              />
              <ResultQuantity
                label="Maximum interference"
                symbol="imax"
                value={mm(result.fit.imax)}
                unit={<UnitBadge>mm</UnitBadge>}
              />
              <dl className="grid grid-cols-2 gap-2 font-mono text-xs text-muted">
                <div>Hole max {mm(result.fit.holeMax, "limit")} mm</div>
                <div>Shaft max {mm(result.fit.shaftMax, "limit")} mm</div>
                <div>Hole min {mm(result.fit.holeMin, "limit")} mm</div>
                <div>Shaft min {mm(result.fit.shaftMin, "limit")} mm</div>
              </dl>
              <GoverningRelation formula={fitsCalculator().formula} className="text-sm" />
            </>
          ) : (
            <ErrorState>{result.error}</ErrorState>
          )
        }
      />
    </InstrumentPage>
  );
}
