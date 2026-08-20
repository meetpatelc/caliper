type Project = { id: number; name: string; description?: string | null; status?: string | null };
type ProjectRecord = { id: number; projectId: number };
type ProjectReviewRecord = { id: number; projectId: number | null };

export const buildProjectInventory = <C extends ProjectRecord, R extends ProjectRecord, M extends ProjectRecord, N extends ProjectRecord, V extends ProjectReviewRecord>(
  project: Project,
  records: { calculations: C[]; reports: R[]; verificationMatrixEntries: M[]; notes: N[]; reviews: V[] },
) => ({
  format: "engineering-desk-project-inventory/v1",
  project: { id: project.id, name: project.name, description: project.description ?? null, status: project.status ?? null },
  records: {
    calculations: records.calculations.filter((record) => record.projectId === project.id),
    reports: records.reports.filter((record) => record.projectId === project.id),
    verificationMatrixEntries: records.verificationMatrixEntries.filter((record) => record.projectId === project.id),
    notes: records.notes.filter((record) => record.projectId === project.id),
    reviews: records.reviews.filter((record) => record.projectId === project.id),
  },
  boundary: "Inventory exports retained user records linked to this project. It does not validate records or create an engineering conclusion.",
});
