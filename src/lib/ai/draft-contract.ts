import { z } from "zod";
import { calculatorSchema } from "@/studio/lib/calculator-types";

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
4. Every expression must be dimensionally consistent in SI base units. Field values arrive already converted to canonical SI, so write the relation in SI and let the display unit handle presentation.

5. Set each output defaultUnit to the unit an engineer writes on a drawing — MPa for stress, mm for a length, rpm for rotational speed, degrees for an angle. This is a LABEL ONLY. Do not scale, divide or convert anything in the expression to match it: the expression stays in SI base units exactly as rule 4 requires, and the application converts SI to defaultUnit on its own. Multiplying by 1e6 to "make it MPa" produces an answer a million times too large.
6. State what the model excludes. The boundary is not a disclaimer, it is the set of conditions under which the number is meaningless.
7. Add a constraint for every relation between fields that must hold — a temperature that must exceed another, a ratio that must stay in range. Use severity "error" when the input is invalid and "warning" when the model still computes but is outside the range it was derived for.

Expressions may use: + - * / ^ ( ), and sqrt, abs, ln, log, exp, sin, cos, tan, atan, atan2, min, max, pow, hypot, logmean. Reference fields by their id. The constant pi is available.

Prefer few, well-understood outputs over many uncertain ones.`;
