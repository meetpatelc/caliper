import type { FmeaResult, ReviewArea, ReviewRule, SelectionWorkflow, TradeResult } from "./reviewRules";

export type DocumentTemplateKind = "report" | "designBasis" | "checklist" | "changeSummary";

export type DocumentTemplateInput = {
  kind: DocumentTemplateKind;
  title: string;
  area: ReviewArea;
  areaLabel: string;
  rules: ReviewRule[];
  completedRuleIds: string[];
  workflow: SelectionWorkflow;
  workflowChecks: string[];
  notes: string;
  optionAName: string;
  optionBName: string;
  criteria: { label: string; weight: string; optionA: string; optionB: string }[];
  trade: TradeResult | null;
  fmea: FmeaResult | null;
  severity: string;
  occurrence: string;
  detection: string;
};

const templateLabels: Record<DocumentTemplateKind, string> = {
  report: "Engineering evidence report",
  designBasis: "Design-basis record",
  checklist: "Evidence checklist",
  changeSummary: "Change-summary record",
};

export const buildReviewTemplate = (input: DocumentTemplateInput): string => {
  const title = input.title.trim() || "Engineering evidence record";
  const activeRules = input.rules.filter((rule) => rule.area === input.area);
  const checkedRuleLines = activeRules.map((rule) => `- [${input.completedRuleIds.includes(rule.id) ? "x" : " "}] **${rule.title}** — Evidence: ${rule.evidence}`);
  const workflowLines = input.workflow.evidence.map((item, index) => `- [${input.workflowChecks.includes(`${input.workflow.id}-${index}`) ? "x" : " "}] ${item}`);
  const criteriaLines = input.criteria.map((criterion) => `- ${criterion.label || "Unnamed criterion"}: weight ${criterion.weight || "—"}; ${input.optionAName || "Option A"} ${criterion.optionA || "—"}; ${input.optionBName || "Option B"} ${criterion.optionB || "—"}`);
  const intro = input.kind === "designBasis"
    ? "This record states visible user-entered bases, evidence checks, and calculation context for a preliminary design discussion."
    : input.kind === "checklist"
      ? "This record presents the current state of visible evidence checks without evaluating their adequacy."
      : input.kind === "changeSummary"
        ? "This record captures the visible review state and user notes that describe a proposed or observed change."
        : "This report compiles visible user-entered review evidence and arithmetic into a local, deterministic record.";
  return [
    `# ${templateLabels[input.kind]} — ${title}`,
    "",
    "## Purpose and boundary",
    intro,
    "This generator does not infer missing facts, select an option, validate evidence, approve a design, or use AI.",
    "",
    "## Review scope",
    `- Area: ${input.areaLabel}`,
    `- Workflow: ${input.workflow.title}`,
    `- Workflow boundary: ${input.workflow.boundary}`,
    "",
    "## Review evidence",
    ...(checkedRuleLines.length ? checkedRuleLines : ["- No rules are defined for the selected area."]),
    "",
    "## Workflow evidence",
    ...workflowLines,
    "",
    "## User-recorded notes",
    input.notes.trim() || "No notes entered.",
    "",
    "## Decision-matrix inputs",
    ...(criteriaLines.length ? criteriaLines : ["- No criteria entered."]),
    input.trade ? `- Weighted scores: ${input.optionAName || "Option A"} ${input.trade.normalizedA.toFixed(2)} / 10; ${input.optionBName || "Option B"} ${input.trade.normalizedB.toFixed(2)} / 10.` : "- Weighted score output unavailable because visible inputs are incomplete.",
    "",
    "## FMEA arithmetic input",
    input.fmea ? `- Severity ${input.severity}; occurrence ${input.occurrence}; detection ${input.detection}; RPN ${input.fmea.rpn}.` : "- FMEA output unavailable because visible ratings are incomplete.",
    "",
    "## Stated limitations",
    "This generated text is a local record of visible inputs and deterministic arithmetic only. It is not a recommendation, certification, conformance determination, procurement action, safety decision, or engineering approval.",
  ].join("\n");
};
