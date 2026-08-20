export type ReviewRevisionSnapshot = {
  reviewArea: string;
  workflowId: string;
  reviewChecksJson: string;
  workflowChecksJson: string;
  tradeStudyJson: string;
  fmeaJson: string;
  notes: string;
};

export type ReviewRevisionDifference = {
  field: string;
  left: string;
  right: string;
};

const display = (value: string) => value.length ? value : "(empty)";

export const compareReviewRevisions = (left: ReviewRevisionSnapshot, right: ReviewRevisionSnapshot): ReviewRevisionDifference[] => {
  const fields: { field: string; left: string; right: string }[] = [
    { field: "Review area", left: left.reviewArea, right: right.reviewArea },
    { field: "Workflow", left: left.workflowId, right: right.workflowId },
    { field: "Review evidence checks", left: left.reviewChecksJson, right: right.reviewChecksJson },
    { field: "Workflow evidence checks", left: left.workflowChecksJson, right: right.workflowChecksJson },
    { field: "Trade-study inputs", left: left.tradeStudyJson, right: right.tradeStudyJson },
    { field: "FMEA inputs", left: left.fmeaJson, right: right.fmeaJson },
    { field: "Evidence notes", left: left.notes, right: right.notes },
  ];
  return fields.filter((entry) => entry.left !== entry.right).map((entry) => ({ ...entry, left: display(entry.left), right: display(entry.right) }));
};
