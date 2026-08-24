import { Link, useNavigate } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnyCalculator, WorkshopCalculator } from "@/studio/lib/calculator-types";
import { isPackedCalculator } from "@/studio/lib/calculator-types";
import { relatedCalculators } from "@/studio/lib/catalog";
import { defaultFieldState, evaluateCalculator, retargetField, type FieldState } from "@/studio/lib/evaluate";
import { useWorkshop } from "@/studio/lib/workshop-store";
import { unitId, unitsForFamily, type UnitFamilyId } from "@/lib/units";
import { resolveSketchId } from "@/lib/diagrams";
import { libraryDocuments } from "@/lib/document";
import { tools, type ToolId } from "@/lib/catalog";
import { domains } from "@/lib/platform";
import MechanicalDiagram from "@/components/MechanicalDiagram";
import { InstrumentSheet, ResultQuantity } from "@/components/instrument-sheet";
import { GoverningRelation } from "@/components/governing-relation";
import { InstrumentMethod, InstrumentNearby, InstrumentPage } from "@/components/instrument-page";
import { ExampleButton } from "@/components/example-button";
import { MeasurementField } from "@/components/ui/measurement-field";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, UnitBadge, UnitSelect } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/status";

function sketchForCalculator(calculator: AnyCalculator) {
  const direct = resolveSketchId(calculator.slug, calculator.sketch);
  if (direct) return direct;
  const baseTitle = calculator.title.replace(/\s*\(copy\)\s*$/i, "").trim().toLowerCase();
  const origin = Object.values(libraryDocuments).find((document) => document.title.toLowerCase() === baseTitle);
  return origin ? resolveSketchId(origin.slug, origin.sketch) : undefined;
}

function kickerForCalculator(calculator: AnyCalculator) {
  const baseTitle = calculator.title.replace(/\s*\(copy\)\s*$/i, "").trim().toLowerCase();
  const tool = tools.find((item) => item.id === calculator.slug || item.title.toLowerCase() === baseTitle);
  if (tool?.kicker) return tool.kicker;
  return domains.find((item) => item.id === calculator.domain)?.label ?? calculator.domain;
}

export function CalculatorFrame({
  calculator,
  compact = false,
  actions,
}: {
  calculator: AnyCalculator;
  compact?: boolean;
  actions?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const createFrom = useWorkshop((state) => state.createFrom);
  const [fields, setFields] = useState(() => defaultFieldState(calculator));
  const [outputUnits, setOutputUnits] = useState(() =>
    Object.fromEntries(calculator.outputs.map((output) => [output.id, output.defaultUnit])),
  );
  const fieldState = useMemo(() => {
    const next: Record<string, FieldState> = {};
    for (const field of calculator.fields) {
      const fallback: FieldState =
        field.input === "choice"
          ? {
              value: field.defaultOption ?? field.options?.[0]?.value ?? "",
              unit: field.defaultUnit,
            }
          : { value: String(field.defaultValue), unit: field.defaultUnit };
      const current = fields[field.id];
      if (!current) {
        next[field.id] = fallback;
      } else if (field.input === "choice" && field.options?.length && !field.options.some((option) => option.value === current.value)) {
        next[field.id] = fallback;
      } else {
        next[field.id] = current;
      }
    }
    return next;
  }, [calculator.fields, fields]);
  const unitState = useMemo(() => {
    const next: Record<string, string> = {};
    for (const output of calculator.outputs) {
      next[output.id] = outputUnits[output.id] ?? output.defaultUnit;
    }
    return next;
  }, [calculator.outputs, outputUnits]);
  const result = useMemo(
    () => evaluateCalculator(calculator, fieldState, unitState),
    [calculator, fieldState, unitState],
  );
  const related = relatedCalculators(calculator.slug);
  const sketchId = sketchForCalculator(calculator);

  const setField = (id: string, patch: Partial<FieldState>) => {
    setFields((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const changeInputUnit = (id: string, family: UnitFamilyId, nextUnit: string) => {
    const current = fieldState[id];
    setField(id, retargetField(family, current?.value ?? "", current?.unit ?? nextUnit, nextUnit));
  };

  const fieldErrorFor = (id: string) =>
    !result.ok && result.fieldId === id ? result.error : undefined;

  const sheet = (
      <InstrumentSheet
        compact={compact}
        diagram={
          !compact && sketchId ? <MechanicalDiagram toolId={sketchId as ToolId} /> : undefined
        }
        example={
          <ExampleButton
            onRestore={() => {
              setFields(defaultFieldState(calculator));
              setOutputUnits(
                Object.fromEntries(calculator.outputs.map((output) => [output.id, output.defaultUnit])),
              );
            }}
          />
        }
        resultTitle={result.ok ? "Results" : compact ? "Results" : "Resolve the input state"}
        inputs={
            <div className="grid gap-4">
              {calculator.fields.map((field) => {
                const choice = field.input === "choice";
                const fieldError = fieldErrorFor(field.id);
                const family = field.family;
                return (
                  <div key={field.id} className="grid gap-2">
                  <Field
                    htmlFor={`frame-${field.id}`}
                    label={field.label}
                    symbol={field.symbol}
                    error={fieldError}
                    hint={!compact ? field.help : undefined}
                  >
                    {choice ? (
                      <Select
                        id={`frame-${field.id}`}
                        value={fieldState[field.id]?.value ?? field.defaultOption ?? ""}
                        onChange={(event) => setField(field.id, { value: event.target.value })}
                        aria-invalid={Boolean(fieldError)}
                      >
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <MeasurementField invalid={Boolean(fieldError)}>
                        <Input
                          id={`frame-${field.id}`}
                          inputMode="decimal"
                          value={fieldState[field.id]?.value ?? ""}
                          onChange={(event) => setField(field.id, { value: event.target.value })}
                          aria-invalid={Boolean(fieldError)}
                        />
                        {family ? (
                          <UnitSelect
                            aria-label={`${field.label} unit`}
                            value={unitId(family, fieldState[field.id]?.unit ?? field.defaultUnit)}
                            onChange={(event) => changeInputUnit(field.id, family, event.target.value)}
                          >
                            {unitsForFamily(family).map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.label}
                              </option>
                            ))}
                          </UnitSelect>
                        ) : field.defaultUnit ? (
                          <UnitBadge>{field.defaultUnit}</UnitBadge>
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
          <>
            {result.ok ? (
              <ul className="grid gap-4">
                {result.outputs.map((output) => {
                  const definition = calculator.outputs.find((item) => item.id === output.id);
                  const family = definition?.family;
                  return (
                    <li key={output.id}>
                      <ResultQuantity
                        label={output.label}
                        symbol={output.symbol}
                        value={output.display}
                        unit={
                          family ? (
                            <UnitSelect
                              aria-label={`${output.label} unit`}
                              value={unitId(family, unitState[output.id])}
                              onChange={(event) =>
                                setOutputUnits((current) => ({ ...current, [output.id]: event.target.value }))
                              }
                            >
                              {unitsForFamily(family, definition?.units).map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.label}
                                </option>
                              ))}
                            </UnitSelect>
                          ) : (
                            <UnitBadge>{output.unit}</UnitBadge>
                          )
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ErrorState aria-hidden={compact || undefined}>
                {compact ? "Preview cannot run until the expression is valid." : result.error}
              </ErrorState>
            )}
            <GoverningRelation formula={calculator.formula} className="text-sm" />
          </>
        }
      />
  );

  if (compact) return <div className="grid gap-4">{sheet}</div>;

  const workshopItem = calculator.origin === "workshop" ? (calculator as WorkshopCalculator) : null;

  return (
    <InstrumentPage
      kicker={kickerForCalculator(calculator)}
      title={calculator.title}
      actions={
        <>
          {workshopItem ? (
            <Button
              variant="outline"
              onClick={() => void navigate({ to: "/studio/$id", params: { id: workshopItem.id } })}
            >
              <PenLine size={14} />
              Edit in studio
            </Button>
          ) : !isPackedCalculator(calculator) ? (
            <Button
              variant="outline"
              onClick={() => {
                const item = createFrom(calculator);
                void navigate({ to: "/studio/$id", params: { id: item.id } });
              }}
            >
              <PenLine size={14} />
              Fork in studio
            </Button>
          ) : null}
          {actions}
        </>
      }
      nearby={
        related.length > 0 ? (
          <InstrumentNearby>
            {related.map((item, index) => (
              <span key={item.slug}>
                {index > 0 ? " · " : null}
                <Link to="/c/$slug" params={{ slug: item.slug }} className="link-row">
                  {item.title}
                </Link>
              </span>
            ))}
          </InstrumentNearby>
        ) : null
      }
      method={
        <InstrumentMethod
          description={calculator.description}
          formula={calculator.formula}
          when={calculator.assumptions}
          dont={calculator.boundary}
          sourceLabel={calculator.sourceLabel}
          sourceUrl={calculator.sourceUrl}
        />
      }
    >
      {sheet}
    </InstrumentPage>
  );
}
