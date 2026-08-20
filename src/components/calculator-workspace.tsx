import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, Copy, Download, Printer, RotateCcw, Save, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import MechanicalDiagram from "@/components/MechanicalDiagram";
import MethodBrief from "@/components/MethodBrief";
import { getTool, type ToolId } from "@/lib/catalog";
import { calculateTool, conversionUnits, initialInputs, toolFields, type ConversionGroup } from "@/lib/engineering";
import { getToolBrief } from "@/lib/toolBriefs";
import { groupResultValues } from "@/lib/resultPresentation";
import { buildCalculationPrintScope, buildCalculationSnapshot, extractSnapshotInput } from "@/lib/calculationSnapshot";
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
  const importRef = useRef<HTMLInputElement>(null);
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
    setInput({ ...initialInputs[tool.id], ...pickKnown(search, tool.id) });
    touchRecent(tool.id);
  }, [tool?.id]);

  useEffect(() => {
    if (!tool || search.restore !== "1") return;
    const restored = { ...initialInputs[tool.id], ...pickKnown(search, tool.id) };
    setInput(restored);
    void navigate({ to: "/tool/$toolId", params: { toolId: tool.id }, search: restored, replace: true, resetScroll: false });
  }, [tool?.id, search.restore, navigate]);

  const result = useMemo(() => (tool ? calculateTool(tool.id, input) : null), [tool, input]);

  useEffect(() => {
    if (!tool) return;
    const handle = window.setTimeout(() => {
      void navigate({ to: "/tool/$toolId", params: { toolId: tool.id }, search: input, replace: true, resetScroll: false });
    }, 280);
    return () => window.clearTimeout(handle);
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
  const brief = getToolBrief(tool.id);
  const pinned = favorites.includes(tool.id);
  const Icon = tool.icon;
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

  const exportSnapshot = () => {
    if (result.errors.length) return;
    const snapshot = buildCalculationSnapshot(tool, input, result);
    const href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${tool.id}-calculation-snapshot.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 800);
    toast.success("Snapshot exported.");
  };

  const importSnapshot = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("Snapshots are limited to 1 MB.");
      return;
    }
    try {
      setInput(extractSnapshotInput(JSON.parse(await file.text()), tool.id));
      toast.success("Inputs restored from snapshot.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Snapshot could not be imported.");
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
    saveCalculation({
      projectId,
      toolId: tool.id,
      title: `${tool.title} · ${new Date().toLocaleString()}`,
      input,
      method: result.method,
      resultJson: JSON.stringify({ values: result.values, warnings: result.warnings }),
    });
    toast.success("Saved to Projects. No sign-in required.");
  };

  const related = relatedTools(tool.id);

  return (
    <div className="page-wrap">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/library" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft size={15} />
          All models
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(tool.id)}
          className={cn("inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated", pinned && "border-mark text-mark")}
        >
          <Star size={14} fill={pinned ? "currentColor" : "none"} />
          {pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_280px] xl:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-elevated text-accent">
              <Icon size={18} />
            </span>
            <p className="eyebrow text-accent">{tool.kicker}</p>
          </div>
          <h1 className="display-title mt-4">{tool.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{tool.description}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="eyebrow">Posture</p>
          <p className="mt-2 font-mono text-xs leading-5 text-muted">
            {tool.contract.domain} · v{tool.contract.formulaVersion} · {tool.contract.validation} · tier {tool.contract.safetyTier}
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(220px,280px)]">
        <aside id="inputs" className="bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Conditions</p>
              <h2 className="mt-1 text-lg font-semibold">Inputs</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" onClick={() => { setInput({ ...initialInputs[tool.id] }); toast.success("Example restored."); }}>
              <RotateCcw size={13} />
              Example
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {fields.map((field) => {
              if (isFieldHidden(tool.id, field.key, input)) return null;
              const converterUnit = tool.id === "converter" && (field.key === "from" || field.key === "to");
              const options = converterUnit ? conversionUnits(input.category as ConversionGroup).map((unit) => ({ value: unit, label: unit })) : field.options;
              const fieldId = `${tool.id}-${field.key}`;
              const fieldError = result.errors.find((error) => error.toLowerCase().includes(field.label.toLowerCase()));
              return (
                <label key={field.key} htmlFor={fieldId} className="grid gap-1.5">
                  <span className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span>{field.label}</span>
                    {field.symbol && <em className="font-mono text-[11px] not-italic text-muted">{field.symbol}</em>}
                  </span>
                  {field.kind === "select" || converterUnit ? (
                    <select id={fieldId} value={input[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} aria-invalid={Boolean(fieldError)} className={cn("h-11 rounded-md border border-border bg-bg px-3 text-sm", fieldError && "border-danger")}>
                      {options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.kind === "text" ? (
                    field.key === "observations" ? (
                      <textarea id={fieldId} rows={4} value={input[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} className={cn("rounded-md border border-border bg-bg px-3 py-2 text-sm", fieldError && "border-danger")} />
                    ) : (
                      <input id={fieldId} type="text" value={input[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} className={cn("h-11 rounded-md border border-border bg-bg px-3 text-sm", fieldError && "border-danger")} />
                    )
                  ) : (
                    <span className="relative">
                      <input id={fieldId} inputMode="decimal" value={input[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} className={cn("h-11 w-full rounded-md border border-border bg-bg px-3 pr-16 font-mono text-sm tabular-nums", fieldError && "border-danger")} />
                      {field.unit && <b className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center font-mono text-[11px] font-normal text-muted">{field.unit}</b>}
                    </span>
                  )}
                  <small className={cn("text-[11px] leading-4 text-muted", fieldError && "text-danger")}>{fieldError ?? field.helper}</small>
                </label>
              );
            })}
          </div>
        </aside>

        <div className="bg-bg">
          <div className="diagram-surface">
            <MechanicalDiagram toolId={tool.id} variant={tool.id === "beam" ? input.case : tool.id === "section" ? input.shape : undefined} />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <p className="eyebrow">Active method</p>
            <code className="font-mono text-[11px] leading-4 text-muted">{result.method}</code>
          </div>
          <section id="results" className="p-5" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Response</p>
                <h2 className="mt-1 text-lg font-semibold">{result.errors.length ? "Resolve the input state" : "Result, with context"}</h2>
              </div>
              {!result.errors.length && (
                <div className="no-print flex flex-wrap gap-2">
                  <input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={importSnapshot} />
                  <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-elevated" onClick={() => importRef.current?.click()}><Upload size={13} className="mr-1 inline" />Import</button>
                  <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-elevated" onClick={saveLocal}><Save size={13} className="mr-1 inline" />Save</button>
                  <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-elevated" onClick={exportSnapshot}><Download size={13} className="mr-1 inline" />JSON</button>
                  <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-elevated" onClick={() => window.print()}><Printer size={13} className="mr-1 inline" />Print</button>
                  <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-elevated" onClick={copySummary}><Copy size={13} className="mr-1 inline" />Copy</button>
                </div>
              )}
            </div>
            {result.errors.length ? (
              <div className="mt-5 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                <CircleAlert size={16} />
                <p>{result.errors[0]}</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {groupResultValues(result.values).map((group) => (
                  <div key={group.label} className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-xs text-muted">{group.label}</p>
                    <p className="mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight">
                      {group.primary.display}
                      <span className="ml-2 text-sm text-muted">{group.primary.unit}</span>
                    </p>
                    {group.alternatives.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] text-muted">
                        {group.alternatives.map((item) => (
                          <span key={item.key}>
                            {item.display} {item.unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {result.warnings[0] && !result.errors.length && <p className="mt-4 text-sm text-mark">{result.warnings[0]}</p>}
          </section>
        </div>

        <aside className="bg-surface p-5">
          <p className="eyebrow">Model boundary</p>
          <ul className="mt-3 grid gap-2 text-sm leading-5 text-muted">
            {tool.assumptions.map((assumption) => (
              <li key={assumption} className="border-l-2 border-accent pl-3">{assumption}</li>
            ))}
          </ul>
          <a href={tool.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm text-accent hover:underline">
            {tool.sourceLabel}
          </a>
          {related.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="eyebrow">Nearby models</p>
              <ul className="mt-3 grid gap-2">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link to="/tool/$toolId" params={{ toolId: item.id }} className="text-sm hover:text-accent">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      <MethodBrief tool={tool} brief={brief} activeMethod={result.method} />

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

function pickKnown(search: Record<string, string>, toolId: ToolId) {
  const allowed = new Set(toolFields[toolId].map((field) => field.key));
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    if (allowed.has(key) && typeof value === "string") next[key] = value;
  }
  return next;
}
