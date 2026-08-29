import { useEffect, useMemo, useRef, useState } from "react";
import { ICON } from "@instrument/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, CircleAlert, Copy, FileText, Link2, PenLine, Save } from "lucide-react";
import { toast } from "sonner";
import MechanicalDiagram from "@/components/MechanicalDiagram";
import { InstrumentSheet, ResultQuantity } from "@/components/instrument-sheet";
import { GoverningRelation } from "@/components/governing-relation";
import { ResultBoundary, SafetyTierNotice } from "@/components/safety-tier";
import { InstrumentMethod, InstrumentNearby, InstrumentPage } from "@/components/instrument-page";
import { ExampleButton } from "@/components/example-button";
import { FavouriteButton } from "@/components/favourite-button";
import { MissingPage } from "@/components/missing-page";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, UnitBadge, UnitSelect } from "@/components/ui/field";
import { MeasurementField } from "@/components/ui/measurement-field";
import { ErrorState } from "@/components/ui/status";
import { Menu, MenuItem } from "@/components/ui/menu";
import { getTool, type ToolId } from "@/lib/catalog";
import { calculateTool, conversionUnits, initialInputs, toolFields, type ConversionGroup } from "@/lib/engineering";
import { groupResultValues } from "@/lib/resultPresentation";
import { convertShop, formatShop, hydrateDisplayInputs, parseShop, shopLabel, unitSwitchFor, unitSwitchForResult } from "@/lib/fieldUnits";
import { coerceSearchValue, recordPath, sharePath, stringifySearchPlain } from "@/lib/search-params";
import { unitId, unitSymbol, type UnitFamilyId } from "@/lib/units";
import { assumptionsBeside, buildCalculationPrintScope } from "@/lib/calculationSnapshot";
import { isFieldHidden, relatedTools } from "@/lib/desk";
import { libraryDocuments, isStudioDocument } from "@/lib/document";
import { adoptionLoss } from "@/studio/lib/adopt-document";
import { resolveSketchId } from "@/lib/diagrams";
import { quantitySymbol } from "@/lib/quantity-symbols";
import { inlineRelations } from "@/lib/formula-display";
import { useDeskStore } from "@/lib/workspace-store";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { useDeskStatus } from "@/lib/desk-mode";

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
  const [copyOpen, setCopyOpen] = useState(false);
  const copyTriggerRef = useRef<HTMLButtonElement>(null);
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
  const { accountMode } = useDeskStatus();
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
      <MissingPage
        kicker="Unknown model"
        title="This route is not a released calculator."
        to="/"
        backLabel="Back to library"
      />
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
      const before = displayInput[key] ?? "";
      const beforeUnit = displayUnit[key] || engineUnit;
      const after = formatShop(convertShop(spec.family, engineValue, spec.engine, nextUnit));
      setDisplayInput((current) => ({ ...current, [key]: after }));
      // Switching the unit converts the number and leaves the quantity alone —
      // 1 kg becomes 1000 g, and the result does not move. That is the safe
      // reading for an input: the alternative, keeping the digits and changing
      // what they mean, would silently scale someone's load by a thousand.
      //
      // Safe, but not obvious: the field changes under the cursor with nothing
      // to explain it, which is what prompted "not sure best for user wanting
      // switch units". So say what happened. One toast id, so holding down the
      // menu replaces rather than stacks.
      if (before && after !== before) {
        toast(`${before} ${beforeUnit} = ${after} ${nextUnit}`, {
          id: "unit-switch",
          description: "Same quantity, different unit — the result is unchanged.",
        });
      }
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

  /**
   * The record is the artefact an engineer files, so it gets its own link
   * rather than being buried behind the browser's print dialog. Same params as
   * `copyLink`, different destination: `/record/...` renders the finished
   * calculation, `/tool/...` reopens the controls.
   */
  const copyRecordLink = async () => {
    if (result.errors.length) {
      toast.error("Resolve the input state before sharing a record.");
      return;
    }
    // Stamped with the model version that produced it, so a later correction to
    // the model shows up as a notice on this link instead of silently changing
    // the number under whoever was sent it.
    const path = recordPath(
      tool.id,
      input,
      toolFields[tool.id].map((field) => field.key),
      tool.contract.formulaVersion,
    );
    const href = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(href);
      toast.success("Record link copied. It opens the finished calculation.");
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
    toast.success(accountMode ? "Saved on this account. Reopen it from Project." : "Saved on this device. Reopen it from Project.");
  };

  const related = relatedTools(tool.id);
  const sketchId = resolveSketchId(tool.id);

  return (
    <InstrumentPage
      kicker={tool.kicker}
      title={tool.title}
      actions={
        <>
          {/*
            `adoptionLoss` withholds the button where the copy would quietly
            differ from the original — a model whose results appear, vanish or
            change name with a choice. Build shows every result always, so
            forking one of those produces a calculator that computes and
            displays the answer belonging to the mode you did not pick. It does
            not error, which is what makes it the worse failure.
          */}
          {libraryDocument && isStudioDocument(libraryDocument) && !adoptionLoss(libraryDocument) ? (
            <Button
              variant="outline"
              onClick={() => {
                const item = createFrom(libraryDocument);
                void navigate({ to: "/studio/$id", params: { id: item.id } });
              }}
            >
              <PenLine size={ICON.inline} />
              Fork in studio
            </Button>
          ) : null}
          <FavouriteButton favourited={favourited} onToggle={() => toggleFavorite(tool.id)} />
        </>
      }
      nearby={
        related.length > 0 ? (
          <InstrumentNearby>
            {related.map((item, index) => (
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
        !result.errors.length ? (
          <InstrumentMethod
            description={tool.description}
            formula={result.method}
            when={assumptionsBeside(
              tool.assumptions,
              fields.map((field) => field.label),
              fields.map((field) => field.helper ?? ""),
            )}
            dont={result.warnings.length ? result.warnings : ["This is a first-pass number, not a code check or approval."]}
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
            <ExampleButton
              onRestore={() => {
                const next = { ...initialInputs[tool.id] };
                const nextDisplay = Object.fromEntries(fields.map((field) => [field.key, unitSwitchFor(field.unit)?.engine ?? field.unit ?? ""]));
                setInput(next);
                setDisplayUnit(nextDisplay);
                setDisplayInput(hydrateDisplayInputs(fields, next, nextDisplay));
                setResultUnit({});
                persistStoredUnits(tool.id, nextDisplay, {});
              }}
            />
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
                <Field htmlFor={fieldId} label={field.label} symbol={field.symbol} error={fieldError} hint={field.helper}>
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
                      <Textarea
                        id={fieldId}
                        rows={4}
                        value={input[field.key] ?? ""}
                        onChange={(event) => update(field.key, event.target.value)}
                        aria-invalid={Boolean(fieldError)}
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
                </div>
              );
            })}
            </div>
          }
          results={
            <div id="results" aria-live="polite" className="grid gap-4">
            <SafetyTierNotice tier={tool.contract.safetyTier} />
            {result.errors.length ? (
              <ErrorState variant="banner" className="flex items-start gap-2">
                <CircleAlert size={ICON.base} />
                <p>{result.errors[0]}</p>
              </ErrorState>
            ) : (
              <>
                <div className="grid gap-4">
                  {displayGroups.map(({ group, spec, stored, shown, options, canSwitch, unitLabel }) => (
                      <ResultQuantity
                        key={group.label}
                        label={group.label}
                        symbol={quantitySymbol(group.primary.key, group.primary.symbol)}
                        value={shown}
                        unit={
                          canSwitch && spec ? (
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
                          )
                        }
                      />
                    ))}
                </div>
                <GoverningRelation formula={result.method} className="text-sm" />
                <ResultBoundary />
                {/* One action and one menu, not four buttons.
                    "Copy result", "Copy link" and "Copy record" read as three
                    spellings of the same verb, and the two that differ most —
                    a link that reopens the controls versus a link to the
                    finished document — were the hardest to tell apart. The
                    menu labels say what you get instead of repeating how. */}
                <div className="flex flex-wrap gap-2">
                    <Button variant="accent" onClick={saveLocal}>
                      <Save size={ICON.inline} />
                      Save this check
                    </Button>
                    <div className="relative">
                      <Button
                        ref={copyTriggerRef}
                        aria-haspopup="menu"
                        aria-expanded={copyOpen}
                        onClick={() => setCopyOpen((current) => !current)}
                      >
                        <Copy size={ICON.inline} />
                        Copy
                        <ChevronDown size={ICON.inline} aria-hidden="true" />
                      </Button>
                      <Menu
                        open={copyOpen}
                        onClose={() => setCopyOpen(false)}
                        label="Copy"
                        restoreFocusTo={copyTriggerRef}
                        className="left-0 mt-1 w-64"
                      >
                        <MenuItem onClick={() => { setCopyOpen(false); void copySummary(); }}>
                          <Copy size={ICON.inline} aria-hidden="true" />
                          The numbers and method
                        </MenuItem>
                        <MenuItem onClick={() => { setCopyOpen(false); void copyLink(); }}>
                          <Link2 size={ICON.inline} aria-hidden="true" />
                          A link that reopens this
                        </MenuItem>
                        <MenuItem onClick={() => { setCopyOpen(false); void copyRecordLink(); }}>
                          <FileText size={ICON.inline} aria-hidden="true" />
                          A link to the record
                        </MenuItem>
                      </Menu>
                    </div>
                </div>
              </>
            )}
            </div>
          }
        />

      {printScope && (
        <section className="print-sheet mt-12 hidden print:block">
          <p className="eyebrow">Calculation snapshot</p>
          {/* Repeats the page heading for the printed sheet, so it is not a
              second h1 — the page already has one. */}
          <h2>{printScope.title}</h2>
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
