import { z } from "zod";
import { domains, type DomainId } from "@/studio/lib/brand";
import { isUnitFamilyId, type UnitFamilyId } from "@/lib/units";
// The seed only — importing it from `@/lib/document` would pull that module's
// static library-*.ts imports (all ~123 documents) into the entry chunk.
import { axialDocument } from "@/lib/document-axial";
import type { InstrumentDocument } from "@/lib/document";
import { resolveSketchId } from "@/lib/diagrams";

const DOMAIN_IDS = domains.map((domain) => domain.id) as [DomainId, ...DomainId[]];

const optionalFamily = z
  .string()
  .refine((value) => !value || isUnitFamilyId(value), "Unknown unit family.")
  .optional()
  .transform((value): UnitFamilyId | undefined => (value && isUnitFamilyId(value) ? value : undefined));

export const fieldSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use a letter-first identifier."),
  label: z.string().min(1).max(80),
  family: optionalFamily,
  defaultValue: z.number().finite(),
  defaultUnit: z.string().min(1).max(24),
  help: z.string().max(240).optional(),
  symbol: z.string().max(12).optional(),
  input: z.enum(["number", "choice"]).optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(32),
        label: z.string().min(1).max(48),
      }),
    )
    .max(48)
    .optional(),
  defaultOption: z.string().max(32).optional(),
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
  signed: z.boolean().optional(),
});

export const tableColumnSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use a letter-first identifier."),
  label: z.string().min(1).max(80),
  family: optionalFamily,
  unit: z.string().min(1).max(24),
});

export const tableRowSchema = z.object({
  key: z.string().min(1).max(48).optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  values: z.array(z.number().finite()).min(1).max(16),
});

export const tableSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use a letter-first identifier."),
  name: z.string().min(1).max(80),
  kind: z.enum(["keyed", "range"]),
  matchField: z.string().min(1).max(32),
  matchUnit: z.string().max(24).optional(),
  columns: z.array(tableColumnSchema).min(1).max(16),
  rows: z.array(tableRowSchema).min(1).max(80),
});

export const outputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Use a letter-first identifier."),
  label: z.string().min(1).max(80),
  symbol: z.string().max(12).optional(),
  family: optionalFamily,
  defaultUnit: z.string().min(1).max(24),
  expression: z.string().min(1).max(400),
  precision: z.number().int().min(2).max(8).optional(),
  units: z.array(z.string().min(1).max(32)).max(24).optional(),
});

/**
 * A relational guard: an expression over the model's own fields, plus the
 * sentence to show when it does not hold.
 *
 * The Library carries 82 of these in `document-constraints.ts` and Studio had
 * none — its schema could only express per-field minimum and maximum, so there
 * was no way to say "hot inlet must exceed cold outlet" or "D/t >= 20". A model
 * written here could return a number the shipped equivalent would refuse.
 *
 * `severity` separates the two things a guard can mean, which the Library
 * learned the hard way: "error" is input that is invalid and must not compute,
 * "warning" is input the model will happily evaluate but was not derived for.
 * Collapsing them either blocks legitimate work or lets a wrong number through
 * looking exactly like a right one.
 */
export const constraintSchema = z.object({
  expression: z.string().min(1).max(240),
  // The comparison the expression must satisfy. At least one is required.
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  gt: z.number().finite().optional(),
  lt: z.number().finite().optional(),
  message: z.string().min(4).max(240),
  severity: z.enum(["error", "warning"]).default("error"),
}).refine(
  (c) => c.min !== undefined || c.max !== undefined || c.gt !== undefined || c.lt !== undefined,
  { message: "A constraint needs at least one of min, max, gt or lt." },
);

export const calculatorSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug."),
  title: z.string().min(2).max(80),
  description: z.string().min(8).max(280),
  domain: z.enum(DOMAIN_IDS),
  fields: z.array(fieldSchema).min(1).max(12),
  outputs: z.array(outputSchema).min(1).max(6),
  constraints: z.array(constraintSchema).max(12).optional(),
  tables: z.array(tableSchema).max(6).optional(),
  formula: z.string().min(1).max(240),
  purpose: z.string().min(8).max(400),
  assumptions: z.array(z.string().min(1).max(240)).min(1).max(8),
  boundary: z.string().min(8).max(400),
  interpretation: z.string().min(8).max(400),
  sourceLabel: z.string().min(2).max(80),
  sourceUrl: z.string().max(240),
  related: z.array(z.string()).max(6),
  warnings: z.array(z.string().min(1).max(800)).max(8).optional(),
  sketch: z.string().max(64).optional(),
});

export type FieldDefinition = z.infer<typeof fieldSchema>;
export type OutputDefinition = z.infer<typeof outputSchema>;
export type TableDefinition = z.infer<typeof tableSchema>;
export type CalculatorDefinition = z.infer<typeof calculatorSchema>;

export type WorkshopCalculator = CalculatorDefinition & {
  id: string;
  origin: "workshop";
  updatedAt: string;
  published: boolean;
};

export type OfficialCalculator = CalculatorDefinition & {
  origin: "official";
  engine?: "formula" | "iso286";
};

export type PublishedCalculator = CalculatorDefinition & {
  origin: "published";
  id: string;
  authorLabel: string;
};

export type AnyCalculator = OfficialCalculator | WorkshopCalculator | PublishedCalculator;

export function normalizeDomain(value: string): DomainId {
  if (value === "fundamentals") return "foundation";
  if ((DOMAIN_IDS as readonly string[]).includes(value)) return value as DomainId;
  return "mechanics";
}

export function asCalculatorDefinition(seed: InstrumentDocument | CalculatorDefinition): CalculatorDefinition {
  return {
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    domain: normalizeDomain(String(seed.domain)),
    fields: seed.fields.map((field) => ({
      ...field,
      family: field.family && isUnitFamilyId(field.family) ? field.family : undefined,
    })),
    outputs: seed.outputs.map((output) => ({
      ...output,
      family: output.family && isUnitFamilyId(output.family) ? output.family : undefined,
    })),
    tables: "tables" in seed ? seed.tables : undefined,
    formula: seed.formula,
    purpose: seed.purpose,
    assumptions: seed.assumptions,
    boundary: seed.boundary,
    interpretation: seed.interpretation,
    sourceLabel: seed.sourceLabel,
    sourceUrl: seed.sourceUrl,
    related: seed.related,
    warnings: "warnings" in seed && Array.isArray(seed.warnings) ? seed.warnings : undefined,
    sketch: resolveSketchId(seed.slug, "sketch" in seed ? seed.sketch : undefined),
  };
}

export function starterCalculator(): CalculatorDefinition {
  return asCalculatorDefinition(axialDocument);
}

export function emptyCalculator(): CalculatorDefinition {
  return {
    slug: "untitled",
    title: "Untitled calculator",
    description: "",
    domain: "mechanics",
    fields: [{ id: "x", label: "Input", family: "dimensionless", defaultValue: 1, defaultUnit: "1" }],
    outputs: [
      {
        id: "result",
        label: "Result",
        family: "dimensionless",
        defaultUnit: "1",
        expression: "x",
        precision: 4,
      },
    ],
    formula: "",
    purpose: "",
    assumptions: [],
    boundary: "",
    interpretation: "",
    sourceLabel: "Author",
    sourceUrl: "",
    related: [],
  };
}

export function isBlankDraft(item: { title: string; formula: string }) {
  return item.title === "Untitled calculator" && item.formula === "";
}

export function isPackedCalculator(item: {
  origin?: string;
  engine?: "formula" | "iso286";
  tables?: unknown[] | undefined;
}) {
  return item.engine === "iso286" || Boolean(item.tables && item.tables.length > 0);
}
