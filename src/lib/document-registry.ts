import { axialDocument } from "@/lib/document-axial";
import { studioSeedDocuments } from "@/lib/library-studio-seeds";
// `import type`, so this is erased and creates no runtime edge back to
// document.ts — which is the module whose static imports this file exists to
// avoid pulling in.
import type { InstrumentDocument } from "@/lib/document";

/**
 * Which documents this browser has actually fetched.
 *
 * Every model page used to ship all 159 of them. `document.ts` spread thirteen
 * domain modules into one object, `engineering.ts` imported that object to run
 * a single calculation, and every route that can calculate anything therefore
 * pulled the lot: 143 kB gzipped of model data on a 391 kB page, 37% of it, to
 * render one calculator that needs one document.
 *
 * A static import cannot be split — the bundler has to assume the whole object
 * is reachable — so the fix is to fetch a domain on demand and keep what comes
 * back here. The catalogue already records each tool's domain, and 155 of the
 * 158 library documents live in the module matching it; the three that do not
 * are studio seeds, which are eager below along with axial because both are
 * small enough that lazily loading them would cost more than it saves.
 *
 * Registration is an explicit call, never a module-scope side effect. This
 * package sets `sideEffects: false`, so a bare `register(...)` at the top level
 * of a domain module is exactly the kind of statement the bundler is entitled
 * to delete — and it has done so before in this repository, to zod's locale
 * registration, with no error and no missing file, just wrong output.
 */
/*
 * Seeded in the initialiser, not by a `register(...)` call underneath it.
 *
 * A bare call at module scope is a statement, and under `sideEffects: false`
 * the bundler is entitled to decide it does nothing and delete it — which is
 * precisely the failure this file's header describes. Written as the Map's
 * initial value it is part of the declaration, so it survives for exactly as
 * long as `loaded` is used, which is always.
 *
 * Axial is the front page's worked example and the Studio seed, so it is wanted
 * on first paint anyway. The seeds are 5 kB, and are the three documents whose
 * catalogue domain does not match the module they live in — having them eagerly
 * removes that special case rather than encoding it.
 */
const loaded = new Map<string, InstrumentDocument>(
  Object.entries({ axial: axialDocument, ...studioSeedDocuments }),
);

/**
 * One dynamic import per domain, written out rather than built from a string.
 *
 * `import(name)` with a variable is opaque to the bundler and produces no
 * chunk. Each specifier here is a literal, so each becomes its own file, and
 * naming the export explicitly rather than spreading the namespace keeps the
 * reference visible to tree-shaking.
 */
const DOMAIN_LOADERS: Record<string, () => Promise<Record<string, InstrumentDocument>>> = {
  applied: async () => (await import("@/lib/library-applied")).appliedDocuments,
  automation: async () => (await import("@/lib/library-automation")).automationDocuments,
  dynamics: async () => (await import("@/lib/library-dynamics")).dynamicsDocuments,
  electrical: async () => (await import("@/lib/library-electrical")).electricalDocuments,
  fluids: async () => (await import("@/lib/library-fluids")).fluidsDocuments,
  foundation: async () => (await import("@/lib/library-foundation")).foundationDocuments,
  manufacturing: async () => (await import("@/lib/library-manufacturing")).manufacturingDocuments,
  materials: async () => (await import("@/lib/library-materials")).materialsDocuments,
  mathematics: async () => (await import("@/lib/library-mathematics")).mathematicsDocuments,
  mechanics: async () => (await import("@/lib/library-mechanics")).mechanicsDocuments,
  quality: async () => (await import("@/lib/library-quality")).qualityDocuments,
  thermal: async () => (await import("@/lib/library-thermal")).thermalDocuments,
};

export function register(documents: Record<string, InstrumentDocument>): void {
  for (const [id, document] of Object.entries(documents)) loaded.set(id, document);
}

export function getDocument(id: string): InstrumentDocument | undefined {
  return loaded.get(id);
}

export function hasDocument(id: string): boolean {
  return loaded.has(id);
}

/** Every document fetched so far. Not every document that exists. */
export function loadedDocuments(): Record<string, InstrumentDocument> {
  return Object.fromEntries(loaded);
}

const inFlight = new Map<string, Promise<void>>();

/**
 * Fetch a domain's documents, once.
 *
 * Deduplicated by domain rather than guarded by a boolean, so two components
 * asking at the same time share one request instead of racing to a half-filled
 * map. An unknown domain resolves rather than throwing: the caller's next step
 * is a lookup that will fail with the document's own name, which says more than
 * "unknown domain" ever could.
 */
export async function loadDomain(domain: string): Promise<void> {
  const loader = DOMAIN_LOADERS[domain];
  if (!loader) return;
  const existing = inFlight.get(domain);
  if (existing) return existing;
  const task = loader()
    .then(register)
    .catch((error) => {
      // Let the next attempt try again rather than caching the failure: this
      // is a network fetch, and a flaky one should not disable a model for the
      // life of the page.
      inFlight.delete(domain);
      throw error;
    });
  inFlight.set(domain, task);
  return task;
}

/** Every domain, for Node and for anything that genuinely needs all of them. */
export async function loadAllDomains(): Promise<void> {
  await Promise.all(Object.keys(DOMAIN_LOADERS).map((domain) => loadDomain(domain)));
}
