import { Link, useNavigate } from "@tanstack/react-router";
import { ICON } from "@instrument/ui";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalculatorFrame } from "@/studio/components/calculator-frame";
import { domains } from "@/studio/lib/brand";
import {
  calculatorSchema,
  isBlankDraft,
  type FieldDefinition,
  type OutputDefinition,
  type WorkshopCalculator,
} from "@/studio/lib/calculator-types";
import { OFFICIAL_SLUGS } from "@/studio/lib/catalog";
import { validateExpression } from "@instrument/formula";
import { rewriteIdentifier, toIdentifier } from "@/studio/lib/identifiers";
import { retargetAuthoredField } from "@/studio/lib/evaluate";
import { unitFamilyOptions, unitId, unitsForFamily, type UnitFamilyId } from "@/lib/units";
import { uniqueSlug, useWorkshop } from "@/studio/lib/workshop-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { SegmentedControl, SegmentedItem } from "@/components/ui/choice";
import { PageHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { fieldErrorId, Field as FormField, Input, Select, Textarea } from "@/components/ui/field";
import { ErrorState, SuccessState } from "@/components/ui/status";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "name", label: "Name" },
  { id: "engine", label: "Engine" },
  { id: "method", label: "Method" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/**
 * The 33 quantity kinds, grouped.
 *
 * Every option already carries a `domain` — foundation, mechanics, thermal,
 * fluids, electrical — computed in `units.ts` and then thrown away here, so
 * both selects rendered one flat list of 33 and asked the author to scan it.
 * Grouping is free; it was already in the data.
 */
const FAMILY_GROUPS: { label: string; domain: string }[] = [
  { label: "Foundation", domain: "foundation" },
  { label: "Mechanics", domain: "mechanics" },
  { label: "Fluids", domain: "fluids" },
  { label: "Thermal", domain: "thermal" },
  { label: "Electrical", domain: "electrical" },
];

function QuantityKindOptions() {
  return (
    <>
      <option value="">Number — no conversion</option>
      {FAMILY_GROUPS.map((group) => {
        const options = unitFamilyOptions.filter((option) => option.domain === group.domain);
        if (!options.length) return null;
        return (
          <optgroup key={group.domain} label={group.label}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

const OPS = ["+", "-", "*", "/", "^", "(", ")", "sqrt("] as const;

/**
 * The unit, shown rather than offered until someone wants it.
 *
 * Picking a quantity kind already chooses a sensible unit, and most fields
 * never change it — so a second full select on every row was paying the price
 * of a control for an edit that rarely happens. Twelve inputs meant twelve of
 * them, which is most of what made this screen read as dense.
 *
 * It stays a real control: a button that reports the current unit and swaps to
 * the select on click, focused, so a keyboard user reaches it in one more press
 * rather than not at all.
 */
function UnitCell({
  family,
  unit,
  label,
  onChange,
}: {
  family: UnitFamilyId;
  unit: string;
  label: string;
  onChange: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const current = unitId(family, unit);
  const options = unitsForFamily(family);
  const shown = options.find((option) => option.id === current);

  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        className="justify-between font-mono text-xs"
        aria-label={`Unit for ${label || "this input"}: ${shown?.label ?? unit}. Change it.`}
        onClick={() => setEditing(true)}
      >
        {shown?.label ?? unit}
      </Button>
    );
  }
  return (
    <Select
      ref={selectRef}
      value={current}
      aria-label={`Unit for ${label || "this input"}`}
      onChange={(event) => {
        onChange(event.target.value);
        setEditing(false);
      }}
      onBlur={() => setEditing(false)}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function StudioEditor({ item }: { item: WorkshopCalculator }) {
  const navigate = useNavigate();
  const upsert = useWorkshop((state) => state.upsert);
  const remove = useWorkshop((state) => state.remove);
  const items = useWorkshop((state) => state.items);
  const [draft, setDraft] = useState<WorkshopCalculator>(item);
  const [step, setStep] = useState<StepId>(isBlankDraft(item) ? "name" : "engine");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeOutput, setActiveOutput] = useState(0);
  const expressionRef = useRef<HTMLInputElement>(null);

  const names = draft.fields.map((field) => field.id);
  const formulaErrors = draft.outputs.map((output) => validateExpression(output.expression, names));
  const formulaError = formulaErrors.find(Boolean);
  const parsed = calculatorSchema.safeParse(draft);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = useWorkshop.getState().items;
      const taken = new Set(current.filter((entry) => entry.id !== draft.id).map((entry) => entry.slug));
      for (const slug of OFFICIAL_SLUGS) taken.add(slug);
      const next = { ...draft, slug: uniqueSlug(draft.title, draft.id, taken) };
      upsert(next);
      if (next.slug !== draft.slug) setDraft(next);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft, upsert]);

  const persistNow = (next: WorkshopCalculator) => {
    const taken = new Set(items.filter((entry) => entry.id !== next.id).map((entry) => entry.slug));
    for (const slug of OFFICIAL_SLUGS) taken.add(slug);
    const withSlug = { ...next, slug: uniqueSlug(next.title, next.id, taken) };
    setDraft(withSlug);
    upsert(withSlug);
    return withSlug;
  };

  const renameField = (index: number, label: string) => {
    const taken = new Set(draft.fields.filter((_, i) => i !== index).map((field) => field.id));
    const nextId = toIdentifier(label || "x", taken);
    const previous = draft.fields[index];
    const fields = draft.fields.slice();
    fields[index] = { ...previous, label, id: nextId };
    const outputs = draft.outputs.map((output) => ({
      ...output,
      expression: rewriteIdentifier(output.expression, previous.id, nextId),
    }));
    setDraft({ ...draft, fields, outputs });
  };

  const patchField = (index: number, patch: Partial<FieldDefinition>) => {
    const fields = draft.fields.slice();
    fields[index] = { ...fields[index], ...patch };
    setDraft({ ...draft, fields });
  };

  const patchOutput = (index: number, patch: Partial<OutputDefinition>) => {
    const outputs = draft.outputs.slice();
    const current = outputs[index];
    if (patch.label && patch.label !== current.label) {
      const taken = new Set(outputs.filter((_, i) => i !== index).map((output) => output.id));
      outputs[index] = { ...current, ...patch, id: toIdentifier(patch.label, taken) };
    } else {
      outputs[index] = { ...current, ...patch };
    }
    setDraft({ ...draft, outputs });
  };

  const insertIntoExpression = (token: string) => {
    const index = Math.min(activeOutput, draft.outputs.length - 1);
    const output = draft.outputs[index];
    if (!output) return;
    const input = expressionRef.current;
    const current = output.expression;
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const lead = before.length && /[A-Za-z0-9_]/.test(before.slice(-1)) && /^[A-Za-z0-9_]/.test(token) ? " " : "";
    const tail = after.length && /[A-Za-z0-9_]/.test(after[0]) && /[A-Za-z0-9_)]$/.test(token) ? " " : "";
    const next = `${before}${lead}${token}${tail}${after}`;
    patchOutput(index, { expression: next });
    requestAnimationFrame(() => {
      input?.focus();
      const caret = start + lead.length + token.length + tail.length;
      input?.setSelectionRange(caret, caret);
    });
  };

  const publish = () => {
    const next = persistNow(draft);
    if (formulaError) {
      setStep("engine");
      toast.error(formulaError);
      return;
    }
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.join(".") ?? "";
      if (path.startsWith("fields") || path.startsWith("outputs") || path === "formula") setStep("engine");
      else if (["title", "description", "domain", "slug"].includes(String(issue?.path[0]))) setStep("name");
      else setStep("method");
      toast.error(issue?.message ?? "Finish the instrument before publishing.");
      return;
    }
    const published = { ...next, published: true };
    setDraft(published);
    upsert(published);
    toast.success("Published.");
  };

  const retract = () => {
    const next = { ...draft, published: false };
    setDraft(next);
    upsert(next);
    toast.success("Removed from the atlas.");
  };

  const preview = useMemo(() => draft, [draft]);

  return (
    <div className="page-wrap">
      <PageHeader
        size="page"
        kicker="Studio"
        title={draft.title}
        lede="Drafts autosave. Signed in, they live on your account. Method is only required to publish."
        actions={
          draft.published ? (
            <Button onClick={retract}>
              Unpublish
            </Button>
          ) : (
            <Button variant="accent" onClick={publish}>
              Publish
            </Button>
          )
        }
      />

      <SegmentedControl aria-label="Studio steps" className="mt-8 overflow-x-auto">
        {STEPS.map((entry) => (
          <SegmentedItem
            key={entry.id}
            selected={step === entry.id}
            current={step === entry.id ? "step" : undefined}
            onClick={() => setStep(entry.id)}
            className="shrink-0"
          >
            {entry.label}
          </SegmentedItem>
        ))}
      </SegmentedControl>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div>
          {step === "name" && (
            <fieldset className={cn(panelClass, "grid gap-3 p-4")}>
              <p className="eyebrow">What is this instrument</p>
              <FormField htmlFor="studio-title" label="Title">
                <Input
                  id="studio-title"
                  autoFocus
                  value={draft.title}
                  placeholder="Pipe mean velocity"
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </FormField>
              <FormField htmlFor="studio-description" label="One-line description">
                <Textarea
                  id="studio-description"
                  className="h-24"
                  value={draft.description}
                  placeholder="What it computes, and when you would reach for it."
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </FormField>
              <FormField htmlFor="studio-domain" label="Domain">
                <Select
                  id="studio-domain"
                  value={draft.domain}
                  onChange={(event) => setDraft({ ...draft, domain: event.target.value as WorkshopCalculator["domain"] })}
                >
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <p className="font-mono text-xs text-muted">slug · {draft.slug}</p>
              <Button variant="accent" className="mt-2" onClick={() => setStep("engine")}>
                Next — engine
              </Button>
            </fieldset>
          )}

          {step === "engine" && (
            <div className="grid gap-6">
              <fieldset className={cn(panelClass, "grid gap-3 p-4")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Inputs</p>
                    <p className="mt-1 text-sm text-muted">A name, a quantity kind, a typical value.</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-accent"
                    onClick={() => {
                      const taken = new Set(draft.fields.map((field) => field.id));
                      setDraft({
                        ...draft,
                        fields: [
                          ...draft.fields,
                          {
                            id: toIdentifier("input", taken),
                            label: "",
                            family: "length",
                            defaultValue: 1,
                            defaultUnit: "m",
                          },
                        ],
                      });
                    }}
                  >
                    <Plus size={ICON.inline} /> Add
                  </Button>
                </div>
                {draft.fields.map((field, index) => (
                  // Keyed by position, NOT by field.id. The id is derived from
                  // the label on every keystroke, so keying by it changed the
                  // key on every keystroke — React unmounted the row and
                  // remounted it, destroying the input mid-word. The symptom
                  // was having to click back into the box after every single
                  // character. A key has to be stable across exactly the edits
                  // the row survives, and a derived value never is.
                  <div key={index} className={cn(panelClass, "grid gap-2 bg-elevated p-3")}>
                    <div className="flex items-center gap-2">
                      <Input
                        value={field.label}
                        onChange={(event) => renameField(index, event.target.value)}
                        aria-label="Quantity name"
                        placeholder="Force, span, mass…"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={draft.fields.length <= 1}
                        className="text-muted hover:text-danger"
                        aria-label={`Remove ${field.label || "input"}`}
                        onClick={() => setDraft({ ...draft, fields: draft.fields.filter((_, i) => i !== index) })}
                      >
                        <Trash2 size={ICON.base} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5.5rem_6rem]">
                      <Select
                        value={field.family ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!value) {
                            patchField(index, { family: undefined, defaultUnit: field.defaultUnit || "1" });
                            return;
                          }
                          const family = value as UnitFamilyId;
                          const nextUnit = unitsForFamily(family)[0]?.id ?? field.defaultUnit;
                          patchField(index, { family, ...retargetAuthoredField({ ...field, family }, nextUnit) });
                        }}
                        aria-label="Quantity kind"
                      >
                        <QuantityKindOptions />
                      </Select>
                      <Input
                        inputMode="decimal"
                        value={Number.isFinite(field.defaultValue) ? String(field.defaultValue) : ""}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value)) patchField(index, { defaultValue: value });
                        }}
                        aria-label="Typical value"
                      />
                      {field.family ? (
                        <UnitCell
                          family={field.family}
                          unit={field.defaultUnit}
                          label={field.label}
                          onChange={(next) => patchField(index, retargetAuthoredField(field, next))}
                        />
                      ) : (
                        <Input
                          value={field.defaultUnit}
                          onChange={(event) => patchField(index, retargetAuthoredField(field, event.target.value || "1"))}
                          aria-label="Unit"
                        />
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted">in the formula as {field.id}</p>
                  </div>
                ))}
              </fieldset>

              <fieldset className={cn(panelClass, "grid gap-3 p-4")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Results</p>
                  {draft.outputs.length < 6 && (
                    <Button
                      variant="ghost"
                      className="text-accent"
                      onClick={() => {
                        const taken = new Set(draft.outputs.map((output) => output.id));
                        setDraft({
                          ...draft,
                          outputs: [
                            ...draft.outputs,
                            {
                              id: toIdentifier("result", taken),
                              label: "Result",
                              family: "dimensionless",
                              defaultUnit: "1",
                              expression: draft.fields[0]?.id ?? "1",
                            },
                          ],
                        });
                      }}
                    >
                      <Plus size={ICON.inline} /> Add
                    </Button>
                  )}
                </div>
                {draft.outputs.map((output, index) => (
                  // Same reason as the inputs above: patchOutput re-derives
                  // output.id from the label as it is typed.
                  <div key={index} className={cn(panelClass, "grid gap-2 bg-elevated p-3")}>
                    <div className="flex items-center gap-2">
                      <Input
                        value={output.label}
                        onChange={(event) => patchOutput(index, { label: event.target.value })}
                        placeholder="What comes out"
                        aria-label="Result name"
                      />
                      {draft.outputs.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted hover:text-danger"
                          aria-label="Remove result"
                          onClick={() => {
                            setDraft({ ...draft, outputs: draft.outputs.filter((_, i) => i !== index) });
                            setActiveOutput(0);
                          }}
                        >
                          <Trash2 size={ICON.base} />
                        </Button>
                      )}
                    </div>
                    <Input
                      ref={index === activeOutput ? expressionRef : undefined}
                      className={cn("font-mono", formulaErrors[index] && "border-danger")}
                      value={output.expression}
                      onFocus={() => setActiveOutput(index)}
                      onChange={(event) => patchOutput(index, { expression: event.target.value })}
                      aria-label="Expression"
                      aria-invalid={Boolean(formulaErrors[index])}
                      aria-describedby={formulaErrors[index] ? fieldErrorId(`studio-expression-${index}`) : undefined}
                      placeholder="x * y / z"
                    />
                    {formulaErrors[index] ? (
                      <ErrorState id={fieldErrorId(`studio-expression-${index}`)}>{formulaErrors[index]}</ErrorState>
                    ) : null}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem]">
                      <Select
                        value={output.family ?? ""}
                        aria-label={`${output.label || "Result"} quantity family`}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!value) {
                            patchOutput(index, { family: undefined, defaultUnit: output.defaultUnit || "1" });
                            return;
                          }
                          const family = value as UnitFamilyId;
                          patchOutput(index, { family, defaultUnit: unitsForFamily(family)[0]?.id ?? "dimensionless.one" });
                        }}
                      >
                        <QuantityKindOptions />
                      </Select>
                      {output.family ? (
                        <Select
                          value={unitId(output.family, output.defaultUnit)}
                          aria-label={`${output.label || "Result"} default unit`}
                          onChange={(event) => patchOutput(index, { defaultUnit: event.target.value })}
                        >
                          {unitsForFamily(output.family).map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          value={output.defaultUnit}
                          aria-label={`${output.label || "Result"} default unit`}
                          onChange={(event) => patchOutput(index, { defaultUnit: event.target.value || "1" })}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  {draft.fields.map((field) => (
                    <Button
                      key={field.id}
                      size="sm"
                      className="font-mono"
                      onClick={() => insertIntoExpression(field.id)}
                    >
                      {field.id}
                    </Button>
                  ))}
                  {OPS.map((op) => (
                    <Button
                      key={op}
                      size="sm"
                      className="min-w-10 px-2 font-mono text-muted"
                      onClick={() => insertIntoExpression(op === "sqrt(" ? "sqrt(" : op)}
                    >
                      {op === "sqrt(" ? "√" : op}
                    </Button>
                  ))}
                </div>
                {formulaError ? null : <SuccessState>Formula evaluates.</SuccessState>}
                <FormField htmlFor="studio-formula" label="How it should read on the page">
                  <Input
                    id="studio-formula"
                    className="font-mono"
                    value={draft.formula}
                    onChange={(event) => setDraft({ ...draft, formula: event.target.value })}
                    placeholder="V = 4 Q / (π D²)"
                  />
                </FormField>
                <Button variant="accent" onClick={() => setStep("method")}>
                  Next — method
                </Button>
              </fieldset>
            </div>
          )}

          {step === "method" && (
            <fieldset className={cn(panelClass, "grid gap-3 p-4")}>
              <p className="eyebrow">Method brief</p>
              <p className="text-sm leading-6 text-muted">
                Required to publish. Skip while you are still checking the number.
              </p>
              <FormField htmlFor="studio-purpose" label="Purpose">
                <Textarea
                  id="studio-purpose"
                  className="h-20"
                  value={draft.purpose}
                  placeholder="What question this answers."
                  onChange={(event) => setDraft({ ...draft, purpose: event.target.value })}
                />
              </FormField>
              <FormField htmlFor="studio-assumptions" label="Assumptions (one per line)">
                <Textarea
                  id="studio-assumptions"
                  className="h-24"
                  value={draft.assumptions.join("\n")}
                  placeholder={"Steady flow.\nIncompressible."}
                  onChange={(event) =>
                    setDraft({ ...draft, assumptions: event.target.value.split("\n").filter(Boolean) })
                  }
                />
              </FormField>
              <FormField htmlFor="studio-boundary" label="Boundary — what this is not">
                <Textarea
                  id="studio-boundary"
                  className="h-20"
                  value={draft.boundary}
                  placeholder="Not a code check. Not valid outside the stated geometry."
                  onChange={(event) => setDraft({ ...draft, boundary: event.target.value })}
                />
              </FormField>
              <FormField htmlFor="studio-interpretation" label="How to read the result">
                <Textarea
                  id="studio-interpretation"
                  className="h-20"
                  value={draft.interpretation}
                  placeholder="Treat this as a screen, then apply the project factor of safety."
                  onChange={(event) => setDraft({ ...draft, interpretation: event.target.value })}
                />
              </FormField>
              <div className="grid gap-2 sm:grid-cols-2">
                <FormField htmlFor="studio-source-label" label="Source label">
                  <Input
                    id="studio-source-label"
                    value={draft.sourceLabel}
                    onChange={(event) => setDraft({ ...draft, sourceLabel: event.target.value })}
                    placeholder="Source label"
                  />
                </FormField>
                <FormField htmlFor="studio-source-url" label="Source URL">
                  <Input
                    id="studio-source-url"
                    value={draft.sourceUrl}
                    onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                    placeholder="https://"
                  />
                </FormField>
              </div>
            </fieldset>
          )}

          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title="Delete this draft?"
            confirmLabel="Delete"
            onConfirm={() => {
              remove(draft.id);
              navigate({ to: "/workshop" });
            }}
          >
            {draft.title} will be removed from Project. This cannot be undone.
          </ConfirmDialog>
          <Button variant="ghost" className="mt-8 text-danger" onClick={() => setConfirmDelete(true)}>
            Delete draft
          </Button>
        </div>

        <aside className={cn(panelClass, "p-4 lg:sticky lg:top-20 lg:self-start")}>
          <p className="eyebrow">Live instrument</p>
          <p className="mt-1 text-sm text-muted">Edits compute immediately. Units convert to SI before the formula runs.</p>
          <div className="mt-4">
            <CalculatorFrame
              key={preview.fields.map((field) => `${field.id}:${field.defaultValue}:${field.defaultUnit}:${field.defaultOption ?? ""}`).join("|")}
              calculator={{ ...preview, origin: "workshop" }}
              compact
            />
          </div>
          <Button asChild variant="ghost" className="mt-4 text-accent">
            <Link to="/c/$slug" params={{ slug: draft.slug }}>
              Open full page →
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
