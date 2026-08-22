import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, Copy, RotateCcw, Save, Star } from "lucide-react";
import { toast } from "sonner";
import MechanicalDiagram from "@/components/MechanicalDiagram";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, UnitBadge, UnitSelect, controlClass } from "@/components/ui/field";
import { getTool, type ToolId } from "@/lib/catalog";
import { calculateTool, conversionUnits, initialInputs, toolFields, type ConversionGroup } from "@/lib/engineering";
import { groupResultValues } from "@/lib/resultPresentation";
import { convertShop, formatShop, parseShop, shopLabel, unitSwitchFor } from "@/lib/fieldUnits";
import { coerceSearchValue, stringifySearchPlain } from "@/lib/search-params";
import { unitId, unitSymbol, type UnitFamilyId } from "@/lib/units";
import { buildCalculationPrintScope } from "@/lib/calculationSnapshot";
import { isFieldHidden, relatedTools } from "@/lib/desk";
import { useDeskStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function CalculatorWorkspace({ toolId, search }: { toolId: string; search: Record<string, string> }) {
  const tool = getTool(toolId);
  const navigate = useNavigate();
  const [input, setInput] = useState<Record<string, string>>(() => {
    if (!tool) return {};
    return { ...initialInputs[tool.id], ...pickKnown(search, tool.id) };
  });
  const [resultUnit, setResultUnit] = useState<Record<string, string>>({});
  const [displayInput, setDisplayInput] = useState<Record<string, string>>(() => {
    if (!tool) return {};
    return { ...initialInputs[tool.id], ...pickKnown(search, tool.id) };
  });
  const [displayUnit, setDisplayUnit] = useState<Record<string, string>>(() => {
    if (!tool) return {};
    return Object.fromEntries(
      toolFields[tool.id].map((field) => [field.key, unitSwitchFor(field.unit)?.engine ?? field.unit ?? ""]),
    );
  });
  const lastWrittenSearch = useRef(stringifySearchPlain(pickKnown(search, tool?.id ?? "axial")));
  const favorites = useDeskStore((state) => state.favorites);
  const toggleFavorite = useDeskStore((state) => state.toggleFavorite);
  const touchRecent = useDeskStore((state) => state.touchRecent);
  const projects = useDeskStore((state) => state.projects);
  const activeProjectId = useDeskStore((state) => state.activeProjectId);
  const setActiveProject = useDeskStore((state) => state.setActiveProject);
  const createProject = useDeskStore((state) => state.createProject);
  const saveCalculation = useDeskStore((state) => state.saveCalculation);

  useEffect(() => {
    if (!tool) return;
    const fromUrl = pickKnown(search, tool.id);
    const next = { ...initialInputs[tool.id], ...fromUrl };
    setInput(next);
    setResultUnit({});
    setDisplayUnit(Object.fromEntries(toolFields[tool.id].map((field) => [field.key, unitSwitchFor(field.unit)?.engine ?? field.unit ?? ""])));
    setDisplayInput(Object.fromEntries(toolFields[tool.id].map((field) => [field.key, next[field.key] ?? ""])));
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
    setDisplayInput(Object.fromEntries(toolFields[tool.id].map((field) => [field.key, next[field.key] ?? ""])));
    lastWrittenSearch.current = incoming;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply URL changes; tool object identity is not the trigger
  }, [tool?.id, search]);

  const result = useMemo(() => (tool ? calculateTool(tool.id, input) : null), [tool, input]);

  useEffect(() => {
    if (!tool) return;
    const handle = window.setTimeout(() => {
      lastWrittenSearch.current = stringifySearchPlain(pickKnown(input, tool.id));
      void navigate({ to: "/tool/$toolId", params: { toolId: tool.id }, search: input, replace: true, resetScroll: false });
    }, 280);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist the live input map; tool object identity is not the trigger
  }, [input, tool?.id, navigate]);

  if (!tool || !result) {
    return (
      <div className="page-wrap">
        <p className="eyebrow">Unknown model</p>
        <h1 className="display-title mt-3">This route is not a released calculator.</h1>
        <Link to="/library" className="mt-6 inline-flex text-sm text-accent">
          Back to library
        </Link>
      </div>
    );
  }

  const fields = toolFields[tool.id];
  const pinned = favorites.includes(tool.id);
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
    setDisplayUnit((current) => ({ ...current, [key]: nextUnit }));
    if (!spec || !Number.isFinite(engineValue)) return;
    try {
      setDisplayInput((current) => ({ ...current, [key]: formatShop(convertShop(spec.family, engineValue, spec.engine, nextUnit)) }));
    } catch {
      /* keep the typed value */
    }
  };

  const copySummary = async () => {
    if (result.errors.length) return;
    const summary = `${tool.title}\n${result.values.map((item) => `${item.label}: ${item.display} ${item.unit}`).join("\n")}\nMethod: ${result.method}\nBoundary: ${tool.assumptions.join("; ")}`;
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
      projectId = createProject("Desk project").id;
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
    toast.success("Saved to this browser. Reopen it from the desk.");
  };

  const related = relatedTools(tool.id);

  return (
    <div className="page-wrap">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/library" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft size={15} />
          All models
        </Link>
        <Button variant={pinned ? "mark" : "outline"} onClick={() => toggleFavorite(tool.id)}>
          <Star size={14} fill={pinned ? "currentColor" : "none"} />
          {pinned ? "Pinned" : "Pin"}
        </Button>
      </div>

      <p className="eyebrow">{tool.kicker}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{tool.title}</h1>

      <section className="mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <aside id="inputs" className="bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inputs</h2>
            <Button variant="ghost" size="sm" onClick={() => {
                const next = { ...initialInputs[tool.id] };
                setInput(next);
                setDisplayUnit(Object.fromEntries(fields.map((field) => [field.key, field.unit ?? ""])));
                setDisplayInput(Object.fromEntries(fields.map((field) => [field.key, next[field.key] ?? ""])));
                toast.success("Example restored.");
              }}
            >
              <RotateCcw size={13} />
              Example
            </Button>
          </div>
          <div className="mt-4 grid gap-4">
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
                <Field key={field.key} htmlFor={fieldId} label={field.label} symbol={field.symbol} error={fieldError}>
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
                    <span className="flex gap-2">
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
                    </span>
                  )}
                </Field>
              );
            })}
          </div>
        </aside>

        <div id="results" className="bg-bg">
          <div className="diagram-surface">
            <MechanicalDiagram toolId={tool.id} variant={tool.id === "beam" ? input.case : tool.id === "section" ? input.shape : undefined} />
          </div>
          <section className="p-4 sm:p-5" aria-live="polite">
            <h2 className="text-base font-semibold">{result.errors.length ? "Resolve the input state" : "Results"}</h2>
            {result.errors.length ? (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                <CircleAlert size={16} />
                <p>{result.errors[0]}</p>
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-4">
                  {groupResultValues(result.values).map((group) => {
                    const spec = unitSwitchFor(group.primary.unit);
                    const stored = resultUnit[group.label] ?? (spec ? spec.engine : group.primary.unit);
                    const numeric = parseShop(group.primary.display);
                    let shown = tidyDisplay(group.primary.display);
                    if (spec && Number.isFinite(numeric) && stored !== spec.engine && stored !== group.primary.unit) {
                      try {
                        shown = formatShop(convertShop(spec.family, numeric, group.primary.unit, stored));
                      } catch {
                        shown = tidyDisplay(group.primary.display);
                      }
                    }
                    const options = spec ? spec.options : [group.primary, ...group.alternatives].map((item) => item.unit);
                    const canSwitch = options.length > 1;
                    return (
                      <div key={group.label} className="grid gap-1.5">
                        <span className="text-sm">{group.label}</span>
                        <span className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 font-mono text-3xl font-medium tabular-nums tracking-tight">{shown}</p>
                          {canSwitch && spec ? (
                            <UnitSelect
                              aria-label={`${group.label} unit`}
                              value={stored}
                              onChange={(event) => setResultUnit((current) => ({ ...current, [group.label]: event.target.value }))}
                            >
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {shopLabel(spec.family, option)}
                                </option>
                              ))}
                            </UnitSelect>
                          ) : (
                            <UnitBadge>{group.primary.unit}</UnitBadge>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="accent" onClick={saveLocal}>
                      <Save size={13} />
                      Save this check
                    </Button>
                    <Button onClick={copySummary}>
                      <Copy size={13} />
                      Copy
                    </Button>
                  </div>
              </>
            )}
          </section>
        </div>
      </section>

      {related.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          Nearby:{" "}
          {related.map((item, index) => (
            <span key={item.id}>
              {index > 0 ? " · " : null}
              <Link to="/tool/$toolId" params={{ toolId: item.id }} className="text-fg hover:text-accent">
                {item.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {printScope && (
        <section className="print-sheet mt-8">
          <p className="eyebrow">Caliper · calculation snapshot</p>
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
    </div>
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
