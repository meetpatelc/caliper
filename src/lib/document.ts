/**
 * Instrument calculator document — one schema.
 * Shop units on the glass, SI in the expression, kit conversion underneath.
 * Studio authors this record. Custom TypeScript is only for models this cannot say yet.
 */
import { evaluateExpression, FormulaError } from "@instrument/formula";
import { axialDocument } from "@/lib/document-axial";
import { convertQuantity, unitFamilies, unitSymbol, type UnitFamilyId } from "@/lib/units";
import { quantitySymbol } from "@/lib/quantity-symbols";
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
import { thermalDocuments } from "@/lib/library-thermal";
import { studioSeedDocuments } from "@/lib/library-studio-seeds";
import type { EngineeringDomain } from "@/lib/platform";
import {
  applyDocumentBounds,
  collectApplicabilityWarnings,
  applyFieldBound,
  fieldBounds,
  optionalOutputs,
  outputRawScale,
  remainingRawScale,
} from "@/lib/document-constraints";

export type InstrumentField = {
  id: string;
  label: string;
  symbol?: string;
  help?: string;
  family?: UnitFamilyId;
  defaultValue: number;
  defaultUnit: string;
  signed?: boolean;
  choice?: string[];
  choiceMessage?: string;
};

export type InstrumentOutput = {
  id: string;
  label: string;
  symbol?: string;
  family?: UnitFamilyId;
  defaultUnit: string;
  expression: string;
  when?: string;
  labels?: Record<string, string>;
  labelChoice?: string;
};

export type InstrumentDocument = {
  slug: string;
  title: string;
  description: string;
  domain: EngineeringDomain;
  fields: InstrumentField[];
  outputs: InstrumentOutput[];
  formula: string;
  purpose: string;
  assumptions: string[];
  boundary: string;
  interpretation: string;
  sourceLabel: string;
  sourceUrl: string;
  related: string[];
  warnings: string[];
  sketch?: string;
  lookups?: Record<string, Record<string, number>>;
  methods?: Record<string, string>;
  methodChoice?: string;
  warningsBy?: Record<string, string[]>;
  warningsChoice?: string;
};

type CalculationValue = { key: string; label: string; raw: number; display: string; unit: string; symbol?: string };
type CalculationState = { values: CalculationValue[]; warnings: string[]; errors: string[]; method: string };

const finite = (value: string, label: string, positive = true) => {
  if (value.trim() === "") throw new Error(`${label} is required.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number.`);
  if (positive && parsed <= 0) throw new Error(`${label} must be greater than zero.`);
  return parsed;
};

const round = (value: number, significant = 5) => {
  if (value === 0) return "0";
  const decimals = Math.max(0, significant - Math.floor(Math.log10(Math.abs(value))) - 1);
  return Number(value.toFixed(Math.min(decimals, 10))).toLocaleString("en-US", { maximumFractionDigits: Math.min(decimals, 10) });
};

const STUDIO_SEED_SLUGS = new Set(["gravitationalPe", "pipeVelocity", "dynamicPressure", "hydrostatic"]);

/**
 * The one Axial — Library card and Studio seed.
 *
 * Defined in its own module so Studio can import the seed without dragging
 * every library document into the entry chunk. Re-exported here so existing
 * `@/lib/document` importers are unaffected.
 */
export { axialDocument };

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

export function isStudioDocument(document: InstrumentDocument) {
  return Boolean(document.slug && document.fields.length && document.outputs.length);
}

export function studioDocuments() {
  return Object.values(libraryDocuments).filter((document) => STUDIO_SEED_SLUGS.has(document.slug));
}

const interpolate = (template: string, strings: Record<string, string>) =>
  template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, id) => (id in strings ? strings[id] : match));

const resolveLabel = (output: InstrumentOutput, strings: Record<string, string>) => {
  if (output.labels && output.labelChoice) {
    const chosen = strings[output.labelChoice];
    if (chosen && output.labels[chosen]) return interpolate(output.labels[chosen], strings);
  }
  return interpolate(output.label, strings);
};

const resolveMethod = (document: InstrumentDocument, strings: Record<string, string>) => {
  if (document.methods) {
    const choiceId = document.methodChoice ?? document.fields.find((field) => field.choice)?.id;
    const chosen = choiceId ? strings[choiceId] : undefined;
    if (chosen && document.methods[chosen]) return document.methods[chosen];
  }
  return interpolate(document.formula, strings);
};

const parseField = (toolId: string, field: InstrumentField, rawInput: string) => {
  const bound = fieldBounds[toolId]?.[field.id];
  if (bound?.afterUnsigned) {
    const parsed = finite(rawInput, field.label, true);
    applyFieldBound(parsed, bound);
    return parsed;
  }
  if (bound) {
    if (rawInput.trim() === "") throw new Error(`${field.label} is required.`);
    const parsed = Number(rawInput);
    if (!Number.isFinite(parsed)) throw new Error(`${field.label} must be a finite number.`);
    applyFieldBound(parsed, bound);
    return parsed;
  }
  return finite(rawInput, field.label, !field.signed);
};

export function runLibraryDocument(toolId: string, input: Record<string, string>): CalculationState {
  const document = libraryDocuments[toolId];
  if (!document) throw new Error(`No library document for ${toolId}.`);
  const scope: Record<string, number> = {};
  const strings: Record<string, string> = {};
  for (const field of document.fields) {
    if (field.choice) {
      const value = (input[field.id] ?? "").trim();
      if (!field.choice.includes(value)) throw new Error(field.choiceMessage ?? `Select a supported ${field.label.toLowerCase()}.`);
      strings[field.id] = value;
      const asNumber = Number(value);
      if (value !== "" && Number.isFinite(asNumber)) scope[field.id] = asNumber;
      continue;
    }
    const shop = parseField(toolId, field, input[field.id] ?? "");
    if (!field.family) {
      scope[field.id] = shop;
      continue;
    }
    const family = field.family;
    const converted = convertQuantity(family, shop, field.defaultUnit, field.defaultUnit);
    scope[field.id] = converted.canonical;
  }
  const context = { strings, tables: document.lookups ?? {} };
  applyDocumentBounds(toolId, scope, context);
  const chosenWarnings =
    document.warningsBy && document.warningsChoice
      ? document.warningsBy[strings[document.warningsChoice]]
      : undefined;
  const warnings = (chosenWarnings ?? document.warnings).map((warning) => interpolate(warning, strings));
  // Applicability first: if the model is being used outside the range it was
  // derived for, that outranks its standing caveats.
  warnings.unshift(...collectApplicabilityWarnings(toolId, scope, context));
  const values: CalculationValue[] = [];
  for (const output of document.outputs) {
    if (output.when) {
      const flag = evaluateExpression(output.when, scope, context);
      if (flag === 0) continue;
    }
    let shopOrCanonical: number;
    try {
      shopOrCanonical = evaluateExpression(output.expression, scope, context);
    } catch (error) {
      const skipMessage = optionalOutputs[toolId]?.[output.id];
      if (skipMessage && error instanceof FormulaError) {
        warnings.push(skipMessage);
        continue;
      }
      throw error;
    }
    const scale = outputRawScale[toolId]?.[output.id] ?? remainingRawScale[toolId]?.[output.id] ?? 1;
    const label = resolveLabel(output, strings);
    if (!output.family) {
      values.push({
        key: output.id,
        label,
        symbol: quantitySymbol(output.id, output.symbol),
        raw: shopOrCanonical * scale,
        display: round(shopOrCanonical),
        unit: output.defaultUnit,
      });
      continue;
    }
    const family = output.family;
    const shop = convertQuantity(family, shopOrCanonical, unitFamilies[family].canonicalUnit, output.defaultUnit);
    values.push({
      key: output.id,
      label,
      symbol: quantitySymbol(output.id, output.symbol),
      raw: shopOrCanonical * scale,
      display: round(shop.converted),
      unit: unitSymbol(family, output.defaultUnit),
    });
  }
  return { values, warnings, errors: [], method: resolveMethod(document, strings) };
};
