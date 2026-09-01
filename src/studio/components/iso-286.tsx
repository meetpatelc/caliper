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
import { outcomes } from "@/studio/lib/iso286-outcomes";
import { tools } from "@/lib/catalog";
import { relatedTools } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { useDeskStatus } from "@/lib/desk-mode";
import { FITS_DEFAULT, fitsFromSearch, fitsToSearch, type FitsState } from "@/studio/lib/fits-url";
import { InstrumentMethod, InstrumentNearby, InstrumentPage } from "@/components/instrument-page";
import { InstrumentSheet, QuantityName, ResultQuantity } from "@/components/instrument-sheet";
import { GoverningRelation } from "@/components/governing-relation";
import { ExampleButton } from "@/components/example-button";
import { FavouriteButton } from "@/components/favourite-button";
import { Button } from "@/components/ui/button";
import { ICON } from "@instrument/ui";
import { Copy, Link as LinkIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { MeasurementField } from "@/components/ui/measurement-field";
import { Field, Input, Select, UnitBadge } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/status";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";

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
  /*
   * State lives in the URL, like every other model's does.
   *
   * It did not, and that is why this page had no "Save this check" and no
   * shareable link: both need the page to round trip, and a saved check that
   * cannot reopen is worse than no button. So the buttons were left off rather
   * than made to lie — an honest gap, but still a gap, on the model people
   * arrive at most often from a search engine.
   *
   * `replace` on every change: picking through IT grades is browsing, not
   * navigating, and each step would otherwise be a Back-button stop.
   */
  const search = useSearch({ from: "/tool/$toolId" });
  const navigate = useNavigate();
  const initial = fitsFromSearch(search, { hole: HOLE_LETTERS, shaft: SHAFT_LETTERS, grades: IT_GRADES });
  const [D, setD] = useState(initial.diameter);
  const [holeLetter, setHoleLetter] = useState<HoleLetter>(initial.holeLetter as HoleLetter);
  const [holeGrade, setHoleGrade] = useState(initial.holeGrade);
  const [shaftLetter, setShaftLetter] = useState<ShaftLetter>(initial.shaftLetter as ShaftLetter);
  const [shaftGrade, setShaftGrade] = useState(initial.shaftGrade);
  const favorites = useDeskStore((state) => state.favorites);
  const toggleFavorite = useDeskStore((state) => state.toggleFavorite);
  const saveCalculation = useDeskStore((state) => state.saveCalculation);
  const createProject = useDeskStore((state) => state.createProject);
  const setActiveProject = useDeskStore((state) => state.setActiveProject);
  const activeProjectId = useDeskStore((state) => state.activeProjectId);
  const projects = useDeskStore((state) => state.projects);
  const { accountMode } = useDeskStatus();
  const favourited = favorites.includes("fits");
  const nearby = relatedTools("fits");

  const publishState = (next: Partial<FitsState>) => {
    const merged = fitsToSearch({
      diameter: next.diameter ?? D,
      holeLetter: next.holeLetter ?? holeLetter,
      holeGrade: next.holeGrade ?? holeGrade,
      shaftLetter: next.shaftLetter ?? shaftLetter,
      shaftGrade: next.shaftGrade ?? shaftGrade,
    });
    void navigate({ to: "/tool/$toolId", params: { toolId: "fits" }, search: merged, replace: true, resetScroll: false });
  };

  const copyResult = async () => {
    if (!result.ok) return;
    const f = result.fit;
    const summary = [
      `${fitsTool().title} — ${f.holeClass}/${f.shaftClass} at ⌀${D} mm`,
      `Fit: ${fitLabel(f.kind)}`,
      `Clearance: ${mm(f.cmin)} to ${mm(f.cmax)} mm`,
      `Interference: ${mm(f.imin)} to ${mm(f.imax)} mm`,
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

  const copyLink = async () => {
    const query = new URLSearchParams(fitsToSearch({ diameter: D, holeLetter, holeGrade, shaftLetter, shaftGrade }));
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tool/fits?${query}`);
      toast.success("Link copied. It opens this fit with these classes.");
    } catch {
      toast.error("Clipboard unavailable. Copy the address bar instead.");
    }
  };

  // Mirrors the shared workspace's save, including the part that matters: it
  // makes a project if there is not one, rather than refusing.
  const saveLocal = () => {
    if (!result.ok) {
      toast.error("Resolve the input state before saving.");
      return;
    }
    let projectId = activeProjectId ?? projects[0]?.id;
    if (!projectId) projectId = createProject("Saved").id;
    else setActiveProject(projectId);
    const fit = result.fit;
    saveCalculation({
      projectId,
      toolId: "fits",
      title: `${fitsTool().title} · ${fit.holeClass}/${fit.shaftClass} ⌀${D} mm`,
      input: fitsToSearch({ diameter: D, holeLetter, holeGrade, shaftLetter, shaftGrade }),
      method: fitsCalculator().formula,
      resultJson: JSON.stringify({ fit }),
    });
    toast.success(accountMode ? "Saved on this account. Reopen it from Project." : "Saved on this device. Reopen it from Project.");
  };

  return (
    <InstrumentPage
      kicker={fitsTool().kicker}
      title={fitsTool().title}
      actions={
        <>
          <Button variant="accent" onClick={saveLocal} disabled={!result.ok}>
            <Save size={ICON.inline} />
            Save this check
          </Button>
          <Button onClick={copyResult} disabled={!result.ok}>
            <Copy size={ICON.inline} />
            Copy result
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <LinkIcon size={ICON.inline} />
            Copy link
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
          dont={[fitsCalculator().boundary]}
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
              setD(FITS_DEFAULT.diameter);
              setHoleLetter(FITS_DEFAULT.holeLetter as HoleLetter);
              setHoleGrade(FITS_DEFAULT.holeGrade);
              setShaftLetter(FITS_DEFAULT.shaftLetter as ShaftLetter);
              setShaftGrade(FITS_DEFAULT.shaftGrade);
              publishState(FITS_DEFAULT);
            }}
          />
        }
        inputs={
          <>
            <Field htmlFor="iso-D" label="Nominal size" symbol="D">
              <MeasurementField>
                <Input id="iso-D" inputMode="decimal" value={D} onChange={(event) => { setD(event.target.value); publishState({ diameter: event.target.value }); }} />
                <UnitBadge>mm</UnitBadge>
              </MeasurementField>
            </Field>
            <div className="grid gap-2">
              <QuantityName label="Hole class" symbol={`${holeLetter}${holeGrade}`} />
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="Hole letter" value={holeLetter} onChange={(event) => { setHoleLetter(event.target.value as HoleLetter); publishState({ holeLetter: event.target.value }); }}>
                  {HOLE_LETTERS.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Hole IT grade" value={String(holeGrade)} onChange={(event) => { setHoleGrade(Number(event.target.value)); publishState({ holeGrade: Number(event.target.value) }); }}>
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
                <Select aria-label="Shaft letter" value={shaftLetter} onChange={(event) => { setShaftLetter(event.target.value as ShaftLetter); publishState({ shaftLetter: event.target.value }); }}>
                  {SHAFT_LETTERS.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Shaft IT grade" value={String(shaftGrade)} onChange={(event) => { setShaftGrade(Number(event.target.value)); publishState({ shaftGrade: Number(event.target.value) }); }}>
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
              {outcomes(result.fit).map((outcome) => (
                <ResultQuantity
                  key={outcome.label}
                  label={`${outcome.label} — ${outcome.kind}`}
                  value={mm(outcome.mmValue)}
                  unit={<UnitBadge>mm</UnitBadge>}
                  caption={
                    <p className="font-mono text-xs text-muted">
                      {outcome.working} = {outcome.magnitude} µm
                    </p>
                  }
                />
              ))}

              <dl className="grid grid-cols-2 gap-2 font-mono text-xs text-muted">
                <div>Hole width IT{holeGrade} {result.fit.IT_hole} µm</div>
                <div>Shaft width IT{shaftGrade} {result.fit.IT_shaft} µm</div>
              </dl>

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
