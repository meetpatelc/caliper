type ProjectLinkedRecord = { projectId: number };
type OptionalProjectLinkedRecord = { projectId: number | null };

export const summarizeProjectLedger = (
  projectId: number | null,
  records: {
    calculations: ProjectLinkedRecord[];
    reports: ProjectLinkedRecord[];
    verificationMatrixEntries: ProjectLinkedRecord[];
    notes: ProjectLinkedRecord[];
    reviews: OptionalProjectLinkedRecord[];
  },
) => ({
  projectId,
  calculationCount: projectId ? records.calculations.filter((record) => record.projectId === projectId).length : 0,
  reportCount: projectId ? records.reports.filter((record) => record.projectId === projectId).length : 0,
  verificationMatrixEntryCount: projectId ? records.verificationMatrixEntries.filter((record) => record.projectId === projectId).length : 0,
  noteCount: projectId ? records.notes.filter((record) => record.projectId === projectId).length : 0,
  reviewCount: projectId ? records.reviews.filter((record) => record.projectId === projectId).length : 0,
});
