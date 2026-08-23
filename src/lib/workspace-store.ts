import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolId } from "@/lib/catalog";

export type SavedCalculation = {
  id: string;
  projectId: string;
  toolId: ToolId;
  title: string;
  input: Record<string, string>;
  method: string;
  resultJson: string;
  savedAt: string;
};

export type DeskProject = {
  id: string;
  name: string;
  createdAt: string;
};

export type ReviewSnapshot = {
  id: string;
  title: string;
  area: string;
  payloadJson: string;
  savedAt: string;
};

type DeskState = {
  favorites: ToolId[];
  recents: ToolId[];
  projects: DeskProject[];
  calculations: SavedCalculation[];
  reviews: ReviewSnapshot[];
  activeProjectId: string | null;
  toggleFavorite: (id: ToolId) => void;
  touchRecent: (id: ToolId) => void;
  createProject: (name: string) => DeskProject;
  setActiveProject: (id: string | null) => void;
  deleteProject: (id: string) => void;
  saveCalculation: (entry: Omit<SavedCalculation, "id" | "savedAt">) => SavedCalculation;
  deleteCalculation: (id: string) => void;
  saveReview: (entry: Omit<ReviewSnapshot, "id" | "savedAt">) => ReviewSnapshot;
  deleteReview: (id: string) => void;
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;

export const useDeskStore = create<DeskState>()(
  persist(
    (set) => ({
      favorites: [],
      recents: [],
      projects: [],
      calculations: [],
      reviews: [],
      activeProjectId: null,
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [id, ...state.favorites],
        })),
      touchRecent: (id) =>
        set((state) => ({
          recents: [id, ...state.recents.filter((item) => item !== id)].slice(0, 12),
        })),
      createProject: (name) => {
        const project: DeskProject = { id: uid(), name: name.trim() || "Untitled project", createdAt: new Date().toISOString() };
        set((state) => ({ projects: [project, ...state.projects], activeProjectId: project.id }));
        return project;
      },
      setActiveProject: (id) => set({ activeProjectId: id }),
      deleteProject: (id) =>
        set((state) => {
          const projects = state.projects.filter((item) => item.id !== id);
          return {
            projects,
            calculations: state.calculations.filter((item) => item.projectId !== id),
            activeProjectId: state.activeProjectId === id ? (projects[0]?.id ?? null) : state.activeProjectId,
          };
        }),
      saveCalculation: (entry) => {
        const record: SavedCalculation = { ...entry, id: uid(), savedAt: new Date().toISOString() };
        set((state) => ({ calculations: [record, ...state.calculations] }));
        return record;
      },
      deleteCalculation: (id) => set((state) => ({ calculations: state.calculations.filter((item) => item.id !== id) })),
      saveReview: (entry) => {
        const record: ReviewSnapshot = { ...entry, id: uid(), savedAt: new Date().toISOString() };
        set((state) => ({ reviews: [record, ...state.reviews] }));
        return record;
      },
      deleteReview: (id) => set((state) => ({ reviews: state.reviews.filter((item) => item.id !== id) })),
    }),
    { name: "caliper-desk-v1" },
  ),
);

export const selectProjectCalculations = (projectId: string) =>
  useDeskStore.getState().calculations.filter((item) => item.projectId === projectId);
