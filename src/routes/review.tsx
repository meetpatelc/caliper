import { createFileRoute, Link } from "@tanstack/react-router";
import { ICON } from "@instrument/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Minus, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import {
  calculateFmea,
  calculateTradeStudy,
  FMEA_ERROR_ID,
  fmeaFieldA11y,
  reviewAreas,
  reviewRules,
  selectionWorkflows,
  type ReviewArea,
} from "@/lib/reviewRules";
import { buildReviewTemplate, type DocumentTemplateKind } from "@/lib/reviewTemplates";
import { Button } from "@/components/ui/button";
import { SegmentedControl, SegmentedItem } from "@/components/ui/choice";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { panelClass } from "@/components/ui/panel";
import { SelectableCard } from "@/components/ui/selection";
import { ErrorState } from "@/components/ui/status";
import { cn } from "@/lib/utils";
import { useDeskStore } from "@/lib/workspace-store";
import { useDeskStatus } from "@/lib/desk-mode";
import { decideReviewRestore } from "@/lib/review-restore";
import { downloadTextFile, fileSlug } from "@/lib/download";

type ReviewSearch = { id?: string };

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review · Instrument" },
      { name: "description", content: "Engineering review: checklists, weighted trade study, and FMEA arithmetic." },
      { property: "og:title", content: "Review · Instrument" },
      { property: "og:description", content: "Engineering review: checklists, weighted trade study, and FMEA arithmetic." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ReviewSearch => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: ReviewPage,
});

type Criterion = { label: string; weight: string; optionA: string; optionB: string };

const starter: Criterion[] = [
  { label: "Functional performance", weight: "4", optionA: "7", optionB: "7" },
  { label: "Safety / risk controls", weight: "5", optionA: "8", optionB: "6" },
  { label: "Manufacturing / lifecycle", weight: "3", optionA: "6", optionB: "8" },
];

function ReviewPage() {
  const { id: restoreId } = Route.useSearch();
  const saveReview = useDeskStore((state) => state.saveReview);
  const reviews = useDeskStore((state) => state.reviews);
  const { accountMode, hydrating } = useDeskStatus();
  const [area, setArea] = useState<ReviewArea>("engineering");
  const [complete, setComplete] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [optionAName, setOptionAName] = useState("Option A");
  const [optionBName, setOptionBName] = useState("Option B");
  const [criteria, setCriteria] = useState<Criterion[]>(starter);
  const [severity, setSeverity] = useState("6");
  const [occurrence, setOccurrence] = useState("4");
  const [detection, setDetection] = useState("5");
  const [workflowId, setWorkflowId] = useState(selectionWorkflows[0].id);
  const [workflowChecks, setWorkflowChecks] = useState<string[]>([]);
  const [title, setTitle] = useState("Evidence review");
  const [templateKind, setTemplateKind] = useState<DocumentTemplateKind>("report");

  /*
   * Restoring from a link has to survive the desk arriving late.
   *
   * This read the store once, on mount, and depended only on the id. Signed
   * out that is fine, because localStorage rehydrates synchronously. Signed in
   * it is not: the account view is blanked immediately and refilled when the
   * server answers, so the snapshot is genuinely absent for the first few
   * hundred milliseconds. The effect saw an empty list, said "no longer here"
   * about a snapshot that was on its way, and never looked again — a link to
   * your own saved review reported it deleted.
   *
   * So it watches `reviews` as well, treats an empty desk as "not yet" while
   * `hydrating` is set, and uses a ref rather than state to fire once: the
   * restore writes to eleven pieces of state, and re-running it would stamp
   * over edits made since.
   */
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    const record = restoreId ? reviews.find((item) => item.id === restoreId) : undefined;
    const decision = decideReviewRestore({
      requestedId: restoreId,
      restoredId: restoredRef.current,
      hasRecord: Boolean(record),
      hydrating,
    });
    if (decision === "idle" || decision === "wait") return;
    restoredRef.current = restoreId ?? null;
    if (decision === "missing" || !record) {
      toast.error("That review snapshot is no longer here.");
      return;
    }
    try {
      const payload = JSON.parse(record.payloadJson) as {
        complete?: string[];
        workflowId?: (typeof selectionWorkflows)[number]["id"];
        workflowChecks?: string[];
        notes?: string;
        criteria?: Criterion[];
        optionAName?: string;
        optionBName?: string;
        severity?: string;
        occurrence?: string;
        detection?: string;
      };
      setTitle(record.title);
      setArea((record.area as ReviewArea) || "engineering");
      setComplete(payload.complete ?? []);
      setWorkflowId(payload.workflowId ?? selectionWorkflows[0].id);
      setWorkflowChecks(payload.workflowChecks ?? []);
      setNotes(payload.notes ?? "");
      setCriteria(payload.criteria?.length ? payload.criteria : starter);
      setOptionAName(payload.optionAName ?? "Option A");
      setOptionBName(payload.optionBName ?? "Option B");
      setSeverity(payload.severity ?? "6");
      setOccurrence(payload.occurrence ?? "4");
      setDetection(payload.detection ?? "5");
      toast.success("Review snapshot restored.");
    } catch {
      toast.error("Review snapshot could not be read.");
    }
  }, [restoreId, reviews, hydrating]);

  const activeRules = reviewRules.filter((rule) => rule.area === area);
  const activeWorkflow = selectionWorkflows.find((item) => item.id === workflowId) ?? selectionWorkflows[0];
  const trade = useMemo(() => {
    try {
      return { result: calculateTradeStudy(criteria.map((item) => ({ weight: Number(item.weight), optionA: Number(item.optionA), optionB: Number(item.optionB) }))), error: "" };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Study cannot be calculated." };
    }
  }, [criteria]);
  const fmea = useMemo(() => {
    try {
      return { result: calculateFmea({ severity: Number(severity), occurrence: Number(occurrence), detection: Number(detection) }), error: "" };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "FMEA cannot be calculated." };
    }
  }, [severity, occurrence, detection]);

  const template = useMemo(
    () =>
      buildReviewTemplate({
        kind: templateKind,
        title,
        area,
        areaLabel: reviewAreas.find((item) => item.id === area)?.label ?? "Engineering review",
        rules: reviewRules,
        completedRuleIds: complete,
        workflow: activeWorkflow,
        workflowChecks,
        notes,
        optionAName,
        optionBName,
        criteria,
        trade: trade.result,
        fmea: fmea.result,
        severity,
        occurrence,
        detection,
      }),
    [templateKind, title, area, complete, activeWorkflow, workflowChecks, notes, optionAName, optionBName, criteria, trade.result, fmea.result, severity, occurrence, detection],
  );

  const persist = () => {
    saveReview({
      title: title.trim() || "Evidence review",
      area,
      payloadJson: JSON.stringify({ complete, workflowId, workflowChecks, notes, criteria, optionAName, optionBName, severity, occurrence, detection }),
    });
    toast.success(accountMode ? "Review snapshot saved on this account." : "Review snapshot saved on this device.");
  };

  const download = () => {
    downloadTextFile(`${fileSlug(title, "review")}-${templateKind}.md`, template, "text/markdown");
  };

  return (
    <div className="page-wrap">
      <PageHeader
        kicker="Evidence, not a verdict"
        title="Engineering review"
        ledeClassName="max-w-2xl"
        lede="Checklists, a scored trade study, and FMEA arithmetic you control. Nothing here infers a recommendation or signs a design."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={cn(panelClass, "h-fit p-2")}>
          <SegmentedControl aria-label="Review area" orientation="vertical" appearance="plain">
            {reviewAreas.map((item) => (
              <SegmentedItem
                key={item.id}
                selected={area === item.id}
                onClick={() => setArea(item.id)}
                className="w-full justify-start"
              >
                {item.label}
              </SegmentedItem>
            ))}
          </SegmentedControl>
        </aside>
        <div className="grid gap-4">
          {activeRules.map((rule) => {
            const on = complete.includes(rule.id);
            return (
              <SelectableCard
                key={rule.id}
                selected={on}
                onClick={() => setComplete((current) => (on ? current.filter((id) => id !== rule.id) : [...current, rule.id]))}
                className="flex h-auto w-full justify-start gap-3 p-4 text-left"
              >
                <span className={`mt-0.5 grid size-5 place-items-center rounded-sm border ${on ? "border-ok bg-ok text-bg" : "border-border"}`}>
                  {on && <Check size={ICON.inline} />}
                </span>
                <span>
                  <strong className="block">{rule.title}</strong>
                  <small className="text-muted">{rule.prompt}</small>
                  <em className="mt-1 block text-xs not-italic text-muted">Evidence: {rule.evidence}</em>
                </span>
              </SelectableCard>
            );
          })}
        </div>
      </div>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className={cn(panelClass, "min-w-0 overflow-hidden p-5")}>
          <SectionHeader
            kicker={<>Trade study</>}
            title={<>Weighted comparison</>}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field htmlFor="option-a" label="Option A">
              <Input id="option-a" value={optionAName} onChange={(event) => setOptionAName(event.target.value)} />
            </Field>
            <Field htmlFor="option-b" label="Option B">
              <Input id="option-b" value={optionBName} onChange={(event) => setOptionBName(event.target.value)} />
            </Field>
          </div>
          <div className="mt-4 grid gap-3">
            {criteria.map((criterion, index) => (
              <fieldset key={index} className={cn(panelClass, "grid min-w-0 gap-2 p-3 sm:grid-cols-[1fr_70px_70px_70px_auto]")}>
                <legend className="sr-only">Criterion {index + 1}</legend>
                <Input
                  value={criterion.label}
                  onChange={(event) => setCriteria((current) => current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
                  aria-label={`Criterion ${index + 1} name`}
                />
                <Input value={criterion.weight} onChange={(event) => setCriteria((current) => current.map((item, i) => (i === index ? { ...item, weight: event.target.value } : item)))} className="font-mono" aria-label={`Criterion ${index + 1} weight`} />
                <Input value={criterion.optionA} onChange={(event) => setCriteria((current) => current.map((item, i) => (i === index ? { ...item, optionA: event.target.value } : item)))} className="font-mono" aria-label={`Criterion ${index + 1} ${optionAName} score`} />
                <Input value={criterion.optionB} onChange={(event) => setCriteria((current) => current.map((item, i) => (i === index ? { ...item, optionB: event.target.value } : item)))} className="font-mono" aria-label={`Criterion ${index + 1} ${optionBName} score`} />
                <Button variant="ghost" size="icon" onClick={() => setCriteria((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)))} aria-label={`Remove criterion ${index + 1}`}>
                  <Minus size={ICON.inline} />
                </Button>
              </fieldset>
            ))}
          </div>
          <Button variant="ghost" className="mt-2 text-accent" onClick={() => setCriteria((current) => [...current, { label: "New criterion", weight: "1", optionA: "5", optionB: "5" }])}>
            <Plus size={ICON.inline} /> Add criterion
          </Button>
          {trade.error ? <ErrorState className="mt-4">{trade.error}</ErrorState> : trade.result && (
            <p className="mt-4 font-mono text-sm">
              {optionAName}: {trade.result.normalizedA.toFixed(2)} · {optionBName}: {trade.result.normalizedB.toFixed(2)}
            </p>
          )}
        </div>
        <div className={cn(panelClass, "min-w-0 overflow-hidden p-5")}>
          <SectionHeader
            kicker={<>FMEA arithmetic</>}
            title={<>Severity × occurrence × detection</>}
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                ["Severity", severity, setSeverity],
                ["Occurrence", occurrence, setOccurrence],
                ["Detection", detection, setDetection],
              ] as const
            ).map(([label, value, setter]) => {
              const a11y = fmeaFieldA11y(fmea.error, value);
              return (
                <Field key={label} htmlFor={`fmea-${label}`} label={label}>
                  <Input
                    id={`fmea-${label}`}
                    value={value}
                    onChange={(event) => setter(event.target.value)}
                    className="font-mono"
                    inputMode="numeric"
                    aria-invalid={a11y["aria-invalid"]}
                    aria-describedby={a11y["aria-describedby"]}
                  />
                </Field>
              );
            })}
          </div>
          {fmea.error ? (
            <ErrorState id={FMEA_ERROR_ID} className="mt-4">
              {fmea.error}
            </ErrorState>
          ) : (
            fmea.result && (
              <>
                <p className="mt-4 font-mono text-2xl tabular-nums">RPN {fmea.result.rpn}</p>
                {fmea.result.severityNotice ? (
                  <p role="status" className="mt-3 border-l-2 border-danger pl-3 text-sm leading-6 text-muted">
                    {fmea.result.severityNotice}
                  </p>
                ) : null}
              </>
            )
          )}
          <Field htmlFor="review-workflow" label="Selection workflow">
            <Select id="review-workflow" className="w-full min-w-0 max-w-full" value={workflowId} onChange={(event) => setWorkflowId(event.target.value as typeof workflowId)}>
              {selectionWorkflows.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-sm text-muted">{activeWorkflow.scope}</p>
          <ul className="mt-2 grid gap-2">
            {activeWorkflow.evidence.map((item, index) => {
              const id = `${activeWorkflow.id}-${index}`;
              const on = workflowChecks.includes(id);
              return (
                <li key={id}>
                  <SelectableCard
                    selected={on}
                    onClick={() => setWorkflowChecks((current) => (on ? current.filter((entry) => entry !== id) : [...current, id]))}
                    className="flex h-auto w-full justify-start gap-2 p-3 text-left"
                  >
                    <span className={`mt-0.5 size-4 rounded-sm border ${on ? "border-ok bg-ok" : "border-border"}`} />
                    {item}
                  </SelectableCard>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={cn(panelClass, "mt-8 min-w-0 overflow-hidden p-5")}>
        <p className="eyebrow">Record</p>
        <div className="mt-2 grid min-w-0 gap-3 md:grid-cols-2">
          <Field htmlFor="review-title" label="Snapshot title">
            <Input id="review-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Evidence review" />
          </Field>
          <Field htmlFor="review-template" label="Export template">
            <Select id="review-template" className="w-full min-w-0 max-w-full" value={templateKind} onChange={(event) => setTemplateKind(event.target.value as DocumentTemplateKind)}>
              <option value="report">Report template</option>
              <option value="checklist">Checklist template</option>
              <option value="designBasis">Design-basis record</option>
              <option value="changeSummary">Change-summary record</option>
            </Select>
          </Field>
        </div>
        <Field htmlFor="review-notes" label="Notes">
          <Textarea id="review-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full" placeholder="Optional context for this snapshot" />
        </Field>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="accent" onClick={persist}>
            <Save size={ICON.base} /> Save snapshot
          </Button>
          <Button onClick={download}>
            <Download size={ICON.base} /> Download markdown
          </Button>
        </div>
        {reviews.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            {reviews.length} snapshot{reviews.length === 1 ? "" : "s"} saved. Open one from{" "}
            <Link to="/workshop" className="link-accent">
              Project
            </Link>{" "}
            to continue.
          </p>
        )}
      </section>
    </div>
  );
}
