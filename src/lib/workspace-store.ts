import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ToolId } from "@/lib/catalog";
import {
  createProjectAccount,
  deleteCalculationAccount,
  deleteProjectAccount,
  deleteReviewAccount,
  saveCalculationAccount,
  saveReviewAccount,
  setFavoriteAccount,
} from "@/lib/desk-account";
import { DESK_STORAGE_KEY, deskPersistStorage, enqueueAccountWrite } from "@/lib/desk-mode";

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
  /**
   * Which side tabs the person chose to keep open. Persisted with the rest of
   * the desk, because a pinned rail is a working preference — it should survive
   * a reload the way a favourite does, not reset every visit.
   */
  pinnedTabs: string[];
  toggleFavorite: (id: ToolId) => void;
  setTabPinned: (id: string, pinned: boolean) => void;
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

/**
 * `key` coalesces repeated writes to the same thing — see enqueueAccountWrite.
 * Deletes are left unkeyed: they are not last-one-wins, and dropping one would
 * leave a row the user asked to remove.
 */
function sync(run: () => Promise<unknown>, key?: string) {
  enqueueAccountWrite(run, key);
}

export const useDeskStore = create<DeskState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],
      projects: [],
      calculations: [],
      reviews: [],
      activeProjectId: null,
      pinnedTabs: [],
      setTabPinned: (id, pinned) =>
        set((state) => ({
          pinnedTabs: pinned ? [...new Set([...state.pinnedTabs, id])] : state.pinnedTabs.filter((item) => item !== id),
        })),
      toggleFavorite: (id) => {
        const on = !get().favorites.includes(id);
        set((state) => ({
          favorites: on ? [id, ...state.favorites] : state.favorites.filter((item) => item !== id),
        }));
        sync(() => setFavoriteAccount({ data: { toolId: id, on } }), `favourite:${id}`);
      },
      touchRecent: (id) =>
        set((state) => ({
          recents: [id, ...state.recents.filter((item) => item !== id)].slice(0, 12),
        })),
      createProject: (name) => {
        const project: DeskProject = { id: uid(), name: name.trim() || "Untitled project", createdAt: new Date().toISOString() };
        set((state) => ({ projects: [project, ...state.projects], activeProjectId: project.id }));
        sync(() => createProjectAccount({ data: project }));
        return project;
      },
      setActiveProject: (id) => set({ activeProjectId: id }),
      deleteProject: (id) => {
        set((state) => {
          const projects = state.projects.filter((item) => item.id !== id);
          return {
            projects,
            calculations: state.calculations.filter((item) => item.projectId !== id),
            activeProjectId: state.activeProjectId === id ? (projects[0]?.id ?? null) : state.activeProjectId,
          };
        });
        sync(() => deleteProjectAccount({ data: id }));
      },
      saveCalculation: (entry) => {
        const record: SavedCalculation = { ...entry, id: uid(), savedAt: new Date().toISOString() };
        set((state) => ({ calculations: [record, ...state.calculations] }));
        sync(() => saveCalculationAccount({ data: record }), `calculation:${record.id}`);
        return record;
      },
      deleteCalculation: (id) => {
        set((state) => ({ calculations: state.calculations.filter((item) => item.id !== id) }));
        sync(() => deleteCalculationAccount({ data: id }));
      },
      saveReview: (entry) => {
        const record: ReviewSnapshot = { ...entry, id: uid(), savedAt: new Date().toISOString() };
        set((state) => ({ reviews: [record, ...state.reviews] }));
        sync(() => saveReviewAccount({ data: record }), `review:${record.id}`);
        return record;
      },
      deleteReview: (id) => {
        set((state) => ({ reviews: state.reviews.filter((item) => item.id !== id) }));
        sync(() => deleteReviewAccount({ data: id }));
      },
    }),
    {
      name: DESK_STORAGE_KEY,
      storage: createJSONStorage(() => deskPersistStorage()),
    },
  ),
);

export const selectProjectCalculations = (projectId: string) =>
  useDeskStore.getState().calculations.filter((item) => item.projectId === projectId);
