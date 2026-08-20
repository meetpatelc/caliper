export type ReviewRecordLedgerEntry = {
  id: number;
  projectId: number | null;
  workflowId: string;
  reviewArea: string;
};

export type ReviewRecordLedgerScope = "all" | "activeProject" | "privateInbox";

export const filterReviewRecords = <T extends ReviewRecordLedgerEntry>(records: T[], scope: ReviewRecordLedgerScope, activeProjectId: number | null): T[] => {
  if (scope === "privateInbox") return records.filter((record) => record.projectId === null);
  if (scope === "activeProject") return activeProjectId ? records.filter((record) => record.projectId === activeProjectId) : [];
  return records;
};

export const summarizeReviewRecords = (records: ReviewRecordLedgerEntry[]) => ({
  recordCount: records.length,
  workflowCount: new Set(records.map((record) => record.workflowId)).size,
  reviewAreas: Array.from(new Set(records.map((record) => record.reviewArea))).sort(),
});
