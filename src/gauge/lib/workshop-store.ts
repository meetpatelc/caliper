import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  asCalculatorDefinition,
  emptyCalculator,
  starterCalculator,
  type CalculatorDefinition,
  type WorkshopCalculator,
} from "@/gauge/lib/calculator-types";
import { WORKSHOP_KEY } from "@/gauge/lib/brand";
import { OFFICIAL_SLUGS } from "@/gauge/lib/catalog";
import type { InstrumentDocument } from "@/lib/document";
import { deleteDraftAccount, upsertDraftAccount } from "@/lib/desk-account";
import { accountGuardedStorage, enqueueAccountWrite } from "@/lib/desk-mode";
import { slugify } from "@/lib/utils";

type WorkshopState = {
  hasHydrated: boolean;
  items: WorkshopCalculator[];
  setHasHydrated: (value: boolean) => void;
  upsert: (item: WorkshopCalculator) => void;
  createBlank: () => WorkshopCalculator;
  createStarter: () => WorkshopCalculator;
  createFrom: (seed: InstrumentDocument | CalculatorDefinition) => WorkshopCalculator;
  remove: (id: string) => void;
  get: (id: string) => WorkshopCalculator | undefined;
  bySlug: (slug: string) => WorkshopCalculator | undefined;
};

function newId() {
  return crypto.randomUUID();
}

export function uniqueSlug(title: string, id: string, taken: Set<string>) {
  const base = slugify(title) || "calculator";
  if (!taken.has(base)) return base;
  return `${base}-${id.slice(0, 6)}`;
}

function toItem(definition: CalculatorDefinition, title: string, existing: WorkshopCalculator[]): WorkshopCalculator {
  const id = newId();
  const taken = new Set<string>([...OFFICIAL_SLUGS, ...existing.map((item) => item.slug)]);
  return {
    ...structuredClone(definition),
    id,
    origin: "workshop",
    title,
    slug: uniqueSlug(title, id, taken),
    updatedAt: new Date().toISOString(),
    published: false,
  };
}

function normalizeWorkshopItem(item: WorkshopCalculator): WorkshopCalculator {
  const definition = asCalculatorDefinition(item);
  return {
    ...item,
    ...definition,
    id: item.id,
    origin: "workshop",
    updatedAt: item.updatedAt,
    published: item.published,
  };
}

function syncDraft(item: WorkshopCalculator) {
  const data = JSON.parse(JSON.stringify(item)) as WorkshopCalculator;
  enqueueAccountWrite(() => upsertDraftAccount({ data }));
}

export const useWorkshop = create<WorkshopState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      items: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      upsert: (item) => {
        const next = { ...item, updatedAt: new Date().toISOString() };
        set((state) => {
          const rest = state.items.filter((entry) => entry.id !== item.id);
          return { items: [next, ...rest] };
        });
        syncDraft(next);
      },
      createBlank: () => {
        const item = toItem(emptyCalculator(), "Untitled calculator", get().items);
        set((state) => ({ items: [item, ...state.items] }));
        syncDraft(item);
        return item;
      },
      createStarter: () => {
        const seed = starterCalculator();
        const item = toItem(seed, seed.title, get().items);
        set((state) => ({ items: [item, ...state.items] }));
        syncDraft(item);
        return item;
      },
      createFrom: (seed) => {
        const item = toItem(asCalculatorDefinition(seed), `${seed.title} (copy)`, get().items);
        set((state) => ({ items: [item, ...state.items] }));
        syncDraft(item);
        return item;
      },
      remove: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
        enqueueAccountWrite(() => deleteDraftAccount({ data: id }));
      },
      get: (id) => get().items.find((item) => item.id === id),
      bySlug: (slug) => get().items.find((item) => item.slug === slug),
    }),
    {
      name: WORKSHOP_KEY,
      storage: createJSONStorage(() => accountGuardedStorage()),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state?.items?.length) {
          useWorkshop.setState({
            hasHydrated: true,
            items: state.items.map(normalizeWorkshopItem),
          });
          return;
        }
        useWorkshop.setState({ hasHydrated: true });
      },
    },
  ),
);
