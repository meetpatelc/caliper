import { axialDocument } from "@/lib/document-axial";
import { appliedDocuments } from "@/lib/library-applied";
import { automationDocuments } from "@/lib/library-automation";
import { dynamicsDocuments } from "@/lib/library-dynamics";
import { electricalDocuments } from "@/lib/library-electrical";
import { fluidsDocuments } from "@/lib/library-fluids";
import { foundationDocuments } from "@/lib/library-foundation";
import { manufacturingDocuments } from "@/lib/library-manufacturing";
import { materialsDocuments } from "@/lib/library-materials";
import { mathematicsDocuments } from "@/lib/library-mathematics";
import { mechanicsDocuments } from "@/lib/library-mechanics";
import { qualityDocuments } from "@/lib/library-quality";
import { studioSeedDocuments } from "@/lib/library-studio-seeds";
import { thermalDocuments } from "@/lib/library-thermal";
import type { InstrumentDocument } from "@/lib/document";

/**
 * Every library document at once, statically.
 *
 * Importing this file pulls all thirteen domain modules into whatever chunk
 * reaches it — 346 kB of source, 143 kB gzipped once built. That is the right
 * trade for Node, where there is no chunk and no network, and for the two
 * places that genuinely need to look across the whole library: Studio matching
 * a fork back to the model it came from, and the fixture suites.
 *
 * It is the wrong trade for a model page, which needs exactly one document.
 * That is why this lives apart from `document.ts` rather than inside it: the
 * calculation path imports the runner and the registry, never this file, so a
 * static edge from one route cannot quietly put the whole library back into the
 * shared chunk. If a component here starts importing this, that is the
 * regression, and `npm run qa:payload` is what notices.
 */
export const libraryDocuments: Record<string, InstrumentDocument> = {
  axial: axialDocument,
  ...appliedDocuments,
  ...automationDocuments,
  ...dynamicsDocuments,
  ...electricalDocuments,
  ...fluidsDocuments,
  ...foundationDocuments,
  ...manufacturingDocuments,
  ...materialsDocuments,
  ...mathematicsDocuments,
  ...mechanicsDocuments,
  ...qualityDocuments,
  ...thermalDocuments,
  ...studioSeedDocuments,
};

const STUDIO_SEED_SLUGS = new Set(["gravitationalPe", "pipeVelocity", "dynamicPressure", "hydrostatic"]);

export function studioDocuments() {
  return Object.values(libraryDocuments).filter((document) => STUDIO_SEED_SLUGS.has(document.slug));
}
