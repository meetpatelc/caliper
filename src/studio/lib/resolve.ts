import type { AnyCalculator } from "@/studio/lib/calculator-types";
import { officialBySlug, officialCalculators } from "@/studio/lib/catalog";

export function mergeCatalog(workshop: AnyCalculator[], published: AnyCalculator[] = []): AnyCalculator[] {
  const map = new Map<string, AnyCalculator>();
  for (const item of officialCalculators) map.set(item.slug, item);
  for (const item of published) if (!map.has(item.slug)) map.set(item.slug, item);
  for (const item of workshop) if (!map.has(item.slug)) map.set(item.slug, item);
  return [...map.values()];
}

export function findCalculator(slug: string, workshop: AnyCalculator[], published: AnyCalculator[] = []): AnyCalculator | undefined {
  return officialBySlug.get(slug) ?? workshop.find((item) => item.slug === slug) ?? published.find((item) => item.slug === slug);
}
