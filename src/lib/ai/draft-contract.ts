import { z } from "zod";
import { calculatorSchema, fieldSchema, outputSchema } from "@/studio/lib/calculator-types";
import { UNIT_IDS, unitSymbol, type UnitFamilyId } from "@/lib/units";

/**
 * What the model is allowed to author, and what it is not.
 *
 * Deliberately a *subset* of `calculatorSchema`. Slug, provenance and anything
 * else that decides how a model is treated downstream are set here, not by the
 * model — otherwise a generated calculator could declare itself hand-verified
 * simply by saying so.
 *
 * Everything the model does author is parsed by the same zod schema the Studio
 * editor uses. There is no second, looser validation path for generated
 * content: it either satisfies the contract a human-authored model satisfies,
 * or it is rejected whole. Partially-applied output is worse than none, because
 * it looks like something somebody chose.
 */
/**
 * One question instead of two: the unit, as `family.unit`.
 *
 * `calculatorSchema` keeps `family` and `defaultUnit` as separate properties,
 * which is right for the editor — they are two separate controls, and the unit
 * select is repopulated when the family changes. It was wrong to ask a model
 * for them separately. Sent as two independent enums, every value is legal and
 * nothing describes the pair, so a draft arrived with family `massFlow` and
 * unit `kg/m³` and was thrown away whole.
 *
 * Both were bare strings before that. "how much does a steel bar weigh" failed
 * three times in a row on this one property: `Unknown unit family.` when
 * `family` was any string at all, `Select compatible units (area: mm^2)` when
 * only the family was an enum, and the massFlow/density mismatch when both were
 * enums but independent. Asking once ends the sequence, because a pair that
 * does not resolve can no longer be expressed.
 *
 * The split back into the editor's two properties happens here, so everything
 * downstream — `acceptDraft`, `evaluateCalculator`, the editor — still sees the
 * shape it already understands. `defaultUnit` becomes the symbol rather than
 * the id, because that is what the unit select's options are keyed by and what
 * every saved model stores.
 */
const draftedUnit = z.enum(UNIT_IDS);

/**
 * @returns the editor's `family` and `defaultUnit` for one `family.unit` id.
 *
 * The cast is sound by construction: `UNIT_IDS` is built from the inventory's
 * own families, so the text before the first dot is always a family id.
 */
function splitUnit(id: string) {
  const family = id.slice(0, id.indexOf(".")) as UnitFamilyId;
  return { family, defaultUnit: unitSymbol(family, id) };
}

/**
 * The editor's field and output shapes, with the two unit properties replaced
 * by the single one, and put back afterwards.
 *
 * `units` — a result's alternative units — is dropped rather than converted.
 * It is optional, it is a second place for a family mismatch to appear, and a
 * draft nobody has checked yet has no business offering unit choices.
 */
const draftedField = fieldSchema
  .omit({ family: true, defaultUnit: true })
  .extend({ unit: draftedUnit })
  .transform(({ unit, ...rest }) => ({ ...rest, ...splitUnit(unit) }));

const draftedOutput = outputSchema
  .omit({ family: true, defaultUnit: true, units: true })
  .extend({ unit: draftedUnit })
  .transform(({ unit, ...rest }) => ({ ...rest, ...splitUnit(unit) }));

export const draftedCalculatorSchema = calculatorSchema
  .pick({
    title: true,
    description: true,
    domain: true,
    fields: true,
    outputs: true,
    constraints: true,
    formula: true,
    purpose: true,
    assumptions: true,
    boundary: true,
    interpretation: true,
  })
  .extend({
    fields: z.array(draftedField).min(1).max(12),
    outputs: z.array(draftedOutput).min(1).max(6),
  })
  .strict();

export type DraftedCalculator = z.infer<typeof draftedCalculatorSchema>;

/** Free text in, one calculator out. Capped so a prompt cannot become a payload. */
export const draftRequestSchema = z.object({
  brief: z.string().trim().min(20).max(4000),
});

/** A draft, with the provenance the model was never allowed to set itself. */
export type AssistedDraft = DraftedCalculator & { provenance: typeof ASSISTED_PROVENANCE };

export type DraftOutcome =
  | { ok: true; draft: AssistedDraft; preview: { label: string; display: string; unit: string }[] }
  | { ok: false; reason: string };

/**
 * Provenance, carried on the draft and never inferred later.
 *
 * A generated model is a *draft*, and the difference between "a person worked
 * this out" and "a language model proposed this and nobody has checked it" is
 * the single most important thing this feature has to preserve. The whole
 * product rests on being able to check the work; a model that hides where it
 * came from spends that credibility without asking.
 */
export const ASSISTED_PROVENANCE = "assisted" as const;

/**
 * The instruction the model works to.
 *
 * Written to constrain rather than encourage: the failure mode for generated
 * engineering content is confident output that is subtly wrong, so the rules
 * below are mostly about refusing to invent — no fabricated coefficients, no
 * standards it cannot cite, no claim the boundary does not support.
 */
export const DRAFT_SYSTEM_PROMPT = `You draft engineering calculators for a tool whose entire proposition is that a user can check the work. A wrong number here reaches a real design.

Rules, in order of importance:

1. Only express relations you are certain of from first principles or a widely taught standard result. If you are not certain, say so in the boundary rather than guessing a coefficient.
2. Never invent empirical constants, table values, or material properties. If a relation needs one, make it an input field the user supplies rather than a number you assert.
3. Do not cite a standard, code, or handbook. Attribution is assigned by a human afterwards.
4. Every expression is evaluated in SI base units. The application converts each field from its declared unit into SI before the expression runs, so write the relation in SI and never scale anything inside it. An expression may reference input field ids and nothing else: results are each computed from the inputs alone, so one result cannot use another. Repeat the sub-expression instead. A bar's mass is density * length * width * height, not density * V with V worked out as a separate result.

5. Every input and every result names its unit as a single "unit" identifier of the form family.unit — length.mm, stress.MPa, density.kg_m3, dimensionless.one. Pick from the list the schema gives you; there is no other vocabulary.

6. A field's defaultValue is written in the unit that field declares. It is the number a person would type into the box, not the SI equivalent: a 50 mm free length is defaultValue 50 with unit length.mm, never 0.05. Rule 4 describes what the expression receives; it does not describe what you write here. Writing the SI number beside a display unit produced a compression spring 50 microns long and a rate of 10000 N/mm.

7. Choose each result's unit the way an engineer writes it on a drawing — stress.MPa, not stress.Pa; length.mm, not length.m; angularSpeed.rpm; angle.degree. This is a LABEL ONLY. Do not scale, divide or convert anything in the expression to match it: the expression stays in SI base units exactly as rule 4 requires, and the application converts SI to the declared unit on its own. Multiplying by 1e6 to "make it MPa" produces an answer a million times too large.
8. Give every field a default that is a recognisable example of the real thing. A pressure vessel is hundreds of millimetres across, not tenths; a bolt is M8 to M24; a shaft turns in the hundreds or thousands of rpm. The defaults are the worked example a reader meets first, and they are how the model is judged before anything is typed.

9. Keep that example comfortably inside the range the model is valid over, never on its edge. The defaults must satisfy every constraint you write under rule 11, with margin to spare — a draft whose own example trips its own guard is rejected outright, and a spring compressed to solid height by its own default force is not a worked example. If the relation needs a diameter-to-thickness ratio above 20, choose 40, not 20. A reader should see the model working, not sitting exactly where it stops being true.

10. State what the model excludes. The boundary is not a disclaimer, it is the set of conditions under which the number is meaningless.
11. Add a constraint for every relation between fields that must hold — a temperature that must exceed another, a ratio that must stay in range. Use severity "error" when the input is invalid and "warning" when the model still computes but is outside the range it was derived for.

Expressions may use: + - * / ^ ( ), and sqrt, abs, ln, log, exp, sin, cos, tan, atan, atan2, min, max, pow, hypot, logmean. Reference fields by their id. The constant pi is available.

Prefer few, well-understood outputs over many uncertain ones.`;
