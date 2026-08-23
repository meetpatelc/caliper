import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CircleAlert, Copy, Link2, PenLine, RotateCcw, Save, Star } from "lucide-react";
import { toast } from "sonner";
import MechanicalDiagram from "@/components/MechanicalDiagram";
import { InstrumentSheet, QuantityName } from "@/components/instrument-sheet";
import { GoverningRelation } from "@/components/governing-relation";
import { InstrumentMethod, InstrumentNearby, InstrumentPage } from "@/components/instrument-page";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, UnitBadge, UnitSelect, controlClass } from "@/components/ui/field";
import { MeasurementField } from "@/components/ui/measurement-field";
import { getTool, type ToolId } from "@/lib/catalog";
import { calculateTool, conversionUnits, initialInputs, toolFields, type ConversionGroup } from "@/lib/engineering";
import { groupResultValues } from "@/lib/resultPresentation";
import { convertShop, formatShop, hydrateDisplayInputs, parseShop, shopLabel, unitSwitchFor, unitSwitchForResult } from "@/lib/fieldUnits";
import { coerceSearchValue, sharePath, stringifySearchPlain } from "@/lib/search-params";
import { unitId, unitSymbol, type UnitFamilyId } from "@/lib/units";
import { buildCalculationPrintScope } from "@/lib/calculationSnapshot";
import { isFieldHidden, relatedTools } from "@/lib/desk";
import { libraryDocuments, isStudioDocument } from "@/lib/document";
import { resolveSketchId } from "@/lib/diagrams";
import { quantitySymbol } from "@/lib/quantity-symbols";
import { inlineRelations } from "@/lib/formula-display";
import { useDeskStore } from "@/lib/workspace-store";
import { useWorkshop } from "@/gauge/lib/workshop-store";
import { cn } from "@/lib/utils";

export function CalculatorWorkspace({ toolId, search }: { toolId: string; search: Record<string, string> }) {
  const tool = getTool(toolId);
  const navigate = useNavigate();
  const [input, setInput] = useState<Record<string, string>>(() => {
    if (!tool) return {};
    return { ...initialInputs[tool.id], ...pickKnown(search, tool.id) };
  });
  const [resultUnit, setResultUnit] = useState<Record<string, string>>(() => loadStoredUnits(toolId)?.result ?? {});
  const [displayInput, setDisplayInput] = useState<Record<string, string>>(() => {
    if (!tool) return {};
    const stored = loadStoredUnits(tool.id)?.display;
    const canonical = { ...initialInputs[tool.id], ...pickKnown(search, tool.id) };
    return hydrateDisplayInputs(toolFields[tool.id], canonical, stored);
  });
  const [displayUnit, setDisplayUnit] = useState<Record<string, string>>(() => {
    if (!tool) return {};
    const stored = loadStoredUnits(tool.id)?.display;
    return Object.fromEntries(
      toolFields[tool.id].map((field) => [
        field.key,
        stored?.[field.key] ?? unitSwitchFor(field.unit)?.engine ?? field.unit ?? "",
      ]),
    );
  });
  const displayUnitRef = useRef(displayUnit);
  displayUnitRef.current = displayUnit;
  const lastWrittenSearch = useRef(stringifySearchPlain(pickKnown(search, tool?.id ?? "axial")));
  const favorites = useDeskStore((state) => state.favorites);
  const toggleFavorite = useDeskStore((state) => state.toggleFavorite);
  const touchRecent = useDeskStore((state) => state.touchRecent);
  const projects = useDeskStore((state) => state.projects);
  const activeProjectId = useDeskStore((state) => state.activeProjectId);
  const setActiveProject = useDeskStore((state) => state.setActiveProject);
  const createProject = useDeskStore((state) => state.createProject);
  const saveCalculation = useDeskStore((state) => state.saveCalculation);
  const createFrom = useWorkshop((state) => state.createFrom);
  const libraryDocument = tool ? libraryDocuments[tool.id] : undefined;

  useEffect(() => {
    if (!tool) return;
    const fromUrl = pickKnown(search, tool.id);
    const stored = loadStoredUnits(tool.id);
    const next = { ...initialInputs[tool.id], ...fromUrl };
    setInput(next);
    setResultUnit(stored?.result ?? {});
    const nextDisplay = Object.fromEntries(
      toolFields[tool.id].map((field) => [
        field.key,
        stored?.display?.[field.key] ?? unitSwitchFor(field.unit)?.engine ?? field.unit ?? "",
      ]),
    );
    setDisplayUnit(nextDisplay);
    setDisplayInput(hydrateDisplayInputs(toolFields[tool.id], next, nextDisplay));
    lastWrittenSearch.current = stringifySearchPlain(fromUrl);
    touchRecent(tool.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset inputs only when the model changes
  }, [tool?.id]);

  useEffect(() => {
    if (!tool) return;
    const fromUrl = pickKnown(search, tool.id);
    const incoming = stringifySearchPlain(fromUrl);
    if (incoming === lastWrittenSearch.current) return;
    const next = { ...initialInputs[tool.id], ...fromUrl };
    setInput(next);
    setDisplayInput(hydrateDisplayInputs(toolFields[tool.id], next, displayUnitRef.current));
    lastWrittenSearch.current = incoming;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply URL changes; tool object identity is not the trigger
  }, [tool?.id, search]);

  const result = useMemo(() => (tool ? calculateTool(tool.id, input) : null), [tool, input]);

  const displayGroups = useMemo(() => {
    if (!result || result.errors.length) return [];
    return groupResultValues(result.values).map((group) => {
      const spec = unitSwitchForResult(group.primary.key, group.primary.unit);
      const stored = resultUnit[group.label] ?? (spec ? spec.engine : group.primary.unit);
      const fromDisplay = parseShop(group.primary.display);
      let shown = tidyDisplay(group.primary.display);
      if (spec && Number.isFinite(fromDisplay) && stored !== spec.engine && stored !== group.primary.unit) {
        try {
          shown = formatShop(convertShop(spec.family, fromDisplay, spec.engine, stored));
        } catch {
          shown = tidyDisplay(group.primary.display);
        }
      }
      const options = spec ? spec.options : [group.primary, ...group.alternatives].map((item) => item.unit);
      const unitLabel = spec ? shopLabel(spec.family, stored) : group.primary.unit;
      return { group, spec, stored, shown, options, canSwitch: options.length > 1, unitLabel };
    });
  }, [result, resultUnit]);

  useEffect(() => {
    if (!tool) return;
    const handle = window.setTimeout(() => {
      const desired = stringifySearchPlain(pickKnown(input, tool.id));
      lastWrittenSearch.current = desired;
      void navigate({ to: "/tool/$toolId", params: { toolId: tool.id }, search: input, replace: true, resetScroll: false });
      if (desired && window.location.search !== desired) {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${desired}`);
      }
    }, 280);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist the live input map; tool object identity is not the trigger
  }, [input, tool?.id, navigate]);

  if (!tool || !result) {
    return (
      <div className="page-wrap">
        <p className="eyebrow">Unknown model</p>
        <h1 className="display-title mt-3">This route is not a released calculator.</h1>
        <Link to="/" className="mt-6 inline-flex text-sm text-accent">
          Back to library
        </Link>
      </div>
    );
  }

  const fields = toolFields[tool.id];
  const favourited = favorites.includes(tool.id);
  const printScope = !result.errors.length
    ? buildCalculationPrintScope(
        tool,
        input,
        result,
        Object.fromEntries(fields.map((field) => [field.key, field.label])),
      )
    : null;

  const update = (key: string, value: string) => {
    if (tool.id === "converter" && key === "category") {
      const units = conversionUnits(value as ConversionGroup);
      setInput((current) => ({ ...current, category: value, from: units[0], to: units[1] ?? units[0] }));
      setResultUnit((current) => {
        const next = { ...current };
        delete next["Converted value"];
        delete next["Canonical SI value"];
        persistStoredUnits(tool.id, displayUnit, next);
        return next;
      });
      return;
    }
    setInput((current) => ({ ...current, [key]: value }));
    setDisplayInput((current) => ({ ...current, [key]: value }));
  };

  const onNumberChange = (key: string, value: string, engineUnit?: string) => {
    setDisplayInput((current) => ({ ...current, [key]: value }));
    const spec = unitSwitchFor(engineUnit);
    const shownUnit = displayUnit[key] || engineUnit;
    const numeric = parseShop(value);
    if (!spec || !shownUnit || !Number.isFinite(numeric)) {
      setInput((current) => ({ ...current, [key]: value }));
      return;
    }
    try {
      const engine = convertShop(spec.family, numeric, shownUnit, spec.engine);
      setInput((current) => ({ ...current, [key]: String(engine) }));
    } catch {
      setInput((current) => ({ ...current, [key]: value }));
    }
  };

  const onUnitChange = (key: string, nextUnit: string, engineUnit?: string) => {
    const spec = unitSwitchFor(engineUnit);
    const engineValue = parseShop(input[key] ?? "");
    setDisplayUnit((current) => {
      const next = { ...current, [key]: nextUnit };
      if (tool) persistStoredUnits(tool.id, next, resultUnit);
      return next;
    });
    if (!spec || !Number.isFinite(engineValue)) return;
    try {
      setDisplayInput((current) => ({ ...current, [key]: formatShop(convertShop(spec.family, engineValue, spec.engine, nextUnit)) }));
    } catch {
      /* keep the typed value */
    }
  };

  const copyLink = async () => {
    const path = sharePath(
      tool.id,
      input,
      toolFields[tool.id].map((field) => field.key),
    );
    const href = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(href);
      toast.success("Link copied. It opens this model with these numbers.");
    } catch {
      toast.error("Clipboard unavailable. Copy the address bar instead.");
    }
  };

  const copySummary = async () => {
    if (result.errors.length) return;
    const lines = displayGroups.length
      ? displayGroups.map((item) => `${item.group.label}: ${item.shown} ${item.unitLabel}`)
      : result.values.map((item) => `${item.label}: ${item.display} ${item.unit}`);
    const summary = `${tool.title}\n${lines.join("\n")}\nMethod: ${inlineRelations(result.method)}\nBoundary: ${tool.assumptions.join("; ")}`;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Result copied with method context.");
    } catch {
      toast.error("Clipboard unavailable. Select the result text instead.");
    }
  };

  const saveLocal = () => {
    if (result.errors.length) {
      toast.error("Resolve the input state before saving.");
      return;
    }
    let projectId = activeProjectId ?? projects[0]?.id;
    if (!projectId) {
      projectId = createProject("Saved").id;
    } else {
      setActiveProject(projectId);
    }
    const primary = groupResultValues(result.values)[0]?.primary;
    const headline = primary ? `${primary.display} ${primary.unit}` : tool.title;
    saveCalculation({
      projectId,
      toolId: tool.id,
      title: `${tool.title} · ${headline}`,
      input,
      method: result.method,
      resultJson: JSON.stringify({ values: result.values, warnings: result.warnings }),
    });
    toast.success("Saved on this device. Reopen it from Project.");
  };

  const related = relatedTools(tool.id);
  const sketchId = resolveSketchId(tool.id);

  return (
    <InstrumentPage
      kicker={tool.kicker}
      title={tool.title}
      actions={
        <>
          {libraryDocument && isStudioDocument(libraryDocument) ? (
            <Button
              variant="outline"
              onClick={() => {
                const item = createFrom(libraryDocument);
                void navigate({ to: "/studio/$id", params: { id: item.id } });
              }}
            >
              <PenLine size={14} />
              Fork in studio
            </Button>
          ) : null}
          <Button variant={favourited ? "mark" : "outline"} onClick={() => toggleFavorite(tool.id)}>
            <Star size={14} fill={favourited ? "currentColor" : "none"} />
            {favourited ? "Favourited" : "Favourite"}
          </Button>
        </>
      }
      nearby={
        related.length > 0 ? (
          <InstrumentNearby>
            {related.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? " · " : null}
                <Link to="/tool/$toolId" params={{ toolId: item.id }} className="text-fg hover:text-accent">
                  {item.title}
                </Link>
              </span>
            ))}
          </InstrumentNearby>
        ) : null
      }
      method={
        !result.errors.length ? (
          <InstrumentMethod
            description={tool.description}
            formula={result.method}
            when={tool.assumptions}
            dont={result.warnings[0] ?? "This is a first-pass number, not a code check or approval."}
            sourceLabel={tool.sourceLabel}
            sourceUrl={tool.sourceUrl}
          />
        ) : undefined
      }
    >
        <InstrumentSheet
          diagram={
            sketchId ? (
              <MechanicalDiagram
                toolId={tool.id}
                variant={tool.id === "beam" ? input.case : tool.id === "section" ? input.shape : undefined}
              />
            ) : undefined
          }
          resultTitle={result.errors.length ? "Resolve the input state" : "Results"}
          example={
            <Button
              variant="ghost"
              className="h-10 min-h-10"
              onClick={() => {
                const next = { ...initialInputs[tool.id] };
                const nextDisplay = Object.fromEntries(fields.map((field) => [field.key, unitSwitchFor(field.unit)?.engine ?? field.unit ?? ""]));
                setInput(next);
                setDisplayUnit(nextDisplay);
                setDisplayInput(hydrateDisplayInputs(fields, next, nextDisplay));
                setResultUnit({});
                persistStoredUnits(tool.id, nextDisplay, {});
                toast.success("Example restored.");
              }}
            >
              <RotateCcw size={13} />
              Example
            </Button>
          }
          inputs={
            <div id="inputs" className="grid gap-4">
            {fields.map((field) => {
              if (isFieldHidden(tool.id, field.key, input)) return null;
              const converterUnit = tool.id === "converter" && (field.key === "from" || field.key === "to");
              const converterOptions = converterUnit
                ? conversionUnits(input.category as ConversionGroup).map((unit) => ({
                    value: unit,
                    label: unitSymbol(input.category as UnitFamilyId, unit),
                  }))
                : null;
              const options = converterOptions ?? field.options;
              const fieldId = `${tool.id}-${field.key}`;
              const fieldError = result.errors.find((error) => error.toLowerCase().includes(field.label.toLowerCase()));
              const spec = unitSwitchFor(field.unit);
              return (
                <div key={field.key} className="grid gap-2">
                <Field htmlFor={fieldId} label={field.label} symbol={field.symbol} error={fieldError}>
                  {field.kind === "select" || converterUnit ? (
                    <Select
                      id={fieldId}
                      value={
                        converterUnit
                          ? unitId(input.category as UnitFamilyId, input[field.key] ?? "")
                          : (input[field.key] ?? "")
                      }
                      onChange={(event) => update(field.key, event.target.value)}
                      aria-invalid={Boolean(fieldError)}
                    >
                      {options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : field.kind === "text" ? (
                    field.key === "observations" ? (
                      <textarea
                        id={fieldId}
                        rows={4}
                        value={input[field.key] ?? ""}
                        onChange={(event) => update(field.key, event.target.value)}
                        className={cn(controlClass, "h-auto py-2", fieldError && "border-danger")}
                      />
                    ) : (
                      <Input
                        id={fieldId}
                        type="text"
                        value={input[field.key] ?? ""}
                        onChange={(event) => update(field.key, event.target.value)}
                        aria-invalid={Boolean(fieldError)}
                      />
                    )
                  ) : (
                    <MeasurementField invalid={Boolean(fieldError)}>
                      <Input
                        id={fieldId}
                        inputMode="decimal"
                        value={displayInput[field.key] ?? input[field.key] ?? ""}
                        onChange={(event) => onNumberChange(field.key, event.target.value, field.unit)}
                        aria-invalid={Boolean(fieldError)}
                      />
                      {spec && tool.id !== "converter" ? (
                        <UnitSelect
                          aria-label={`${field.label} unit`}
                          value={displayUnit[field.key] || spec.engine}
                          onChange={(event) => onUnitChange(field.key, event.target.value, field.unit)}
                        >
                          {spec.options.map((option) => (
                            <option key={option} value={option}>
                              {shopLabel(spec.family, option)}
                            </option>
                          ))}
                        </UnitSelect>
                      ) : field.unit ? (
                        <UnitBadge>{field.unit}</UnitBadge>
                      ) : null}
                    </MeasurementField>
                  )}
                </Field>
                {!fieldError && field.helper ? (
                  <span className="text-sm text-muted">{field.helper}</span>
                ) : null}
                </div>
              );
            })}
            </div>
          }
          results={
            <div id="results" aria-live="polite" className="grid gap-4">
            {result.errors.length ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                <CircleAlert size={16} />
                <p>{result.errors[0]}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {displayGroups.map(({ group, spec, stored, shown, options, canSwitch, unitLabel }) => (
                      <div key={group.label} className="grid gap-1.5">
                        <QuantityName
                          label={group.label}
                          symbol={quantitySymbol(group.primary.key, group.primary.symbol)}
                        />
                        <span className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 font-mono text-3xl font-medium tabular-nums tracking-tight">{shown}</p>
                          {canSwitch && spec ? (
                            <UnitSelect
                              aria-label={`${group.label} unit`}
                              value={stored}
                              onChange={(event) => {
                                const nextUnit = event.target.value;
                                setResultUnit((current) => {
                                  const next = { ...current, [group.label]: nextUnit };
                                  persistStoredUnits(tool.id, displayUnit, next);
                                  return next;
                                });
                                if (tool.id === "converter" && group.primary.key === "converted") {
                                  update("to", nextUnit);
                                }
                              }}
                            >
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {shopLabel(spec.family, option)}
                                </option>
                              ))}
                            </UnitSelect>
                          ) : (
                            <UnitBadge>{unitLabel}</UnitBadge>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
                <GoverningRelation formula={result.method} className="text-sm" />
                <div className="flex flex-wrap gap-2">
                    <Button variant="accent" onClick={saveLocal}>
                      <Save size={13} />
                      Save this check
                    </Button>
                    <Button onClick={copySummary}>
                      <Copy size={13} />
                      Copy result
                    </Button>
                    <Button onClick={copyLink}>
                      <Link2 size={13} />
                      Copy link
                    </Button>
                  </div>
              </>
            )}
            </div>
          }
        />

      {printScope && (
        <section className="print-sheet mt-8 hidden print:block">
          <p className="eyebrow">Calculation snapshot</p>
          <h1>{printScope.title}</h1>
          <p>Formula version {printScope.formulaVersion}</p>
          <h2>Conditions</h2>
          <table>
            <tbody>
              {printScope.input.map((item) => (
                <tr key={item.label}>
                  <th>{item.label}</th>
                  <td>{item.value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Calculated response</h2>
          <table>
            <tbody>
              {printScope.values.map((item) => (
                <tr key={`${item.label}-${item.unit}`}>
                  <th>{item.label}</th>
                  <td>
                    {item.display} {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Method</h2>
          <p>{printScope.method}</p>
          <h2>Source</h2>
          <p>
            {printScope.source.label}: {printScope.source.url}
          </p>
          <h2>Boundaries</h2>
          <ul>
            {printScope.boundaries.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>
          <p>{printScope.boundary}</p>
        </section>
      )}
    </InstrumentPage>
  );
}

function tidyDisplay(display: string) {
  if (!/^-?\d+\.\d+$/.test(display)) return display;
  return display.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}

function pickKnown(search: Record<string, string>, toolId: ToolId) {
  const allowed = new Set(toolFields[toolId].map((field) => field.key));
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    const text = coerceSearchValue(value);
    if (allowed.has(key) && text !== undefined && text !== "") next[key] = text;
  }
  return next;
}

type StoredUnits = { display: Record<string, string>; result: Record<string, string> };

function unitStorageKey(toolId: string) {
  return `instrument-caliper-units:${toolId}`;
}

function loadStoredUnits(toolId?: string): StoredUnits | null {
  if (!toolId || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(unitStorageKey(toolId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUnits;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      display: parsed.display && typeof parsed.display === "object" ? parsed.display : {},
      result: parsed.result && typeof parsed.result === "object" ? parsed.result : {},
    };
  } catch {
    return null;
  }
}

function persistStoredUnits(toolId: string, display: Record<string, string>, result: Record<string, string>) {
  try {
    sessionStorage.setItem(unitStorageKey(toolId), JSON.stringify({ display, result }));
  } catch {
    /* private mode */
  }
}
