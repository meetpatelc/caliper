import { defaultFieldState, evaluateCalculator } from "@/studio/lib/evaluate";
import { draftedCalculatorSchema, type DraftOutcome } from "@/lib/ai/draft-contract";

/**
 * Decide whether a drafted calculator is fit to put in front of someone.
 *
 * Three gates, and a draft has to clear all of them:
 *
 * 1. **It parses against the same schema a human-authored model parses
 *    against.** No looser path for generated content.
 * 2. **It computes.** A calculator that throws on its own default values is not
 *    a draft, it is noise — and noise that arrives looking like work is worse
 *    than an error message, because somebody has to read it to find that out.
 * 3. **Its outputs are finite.** An expression can parse, evaluate, and hand
 *    back Infinity; that number would render as a result.
 *
 * What this deliberately does *not* do is judge whether the physics is right.
 * Nothing here can. That is why the draft is labelled, never auto-published,
 * and lands in the editor rather than in the library.
 */
export function acceptDraft(value: unknown): DraftOutcome {
  const parsed = draftedCalculatorSchema.safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return { ok: false, reason: `The draft did not fit the calculator contract — ${where}${first?.message ?? "invalid"}.` };
  }

  const draft = parsed.data;

  const duplicateField = firstDuplicate(draft.fields.map((field) => field.id));
  if (duplicateField) return { ok: false, reason: `Two inputs share the id "${duplicateField}".` };
  const duplicateOutput = firstDuplicate(draft.outputs.map((output) => output.id));
  if (duplicateOutput) return { ok: false, reason: `Two results share the id "${duplicateOutput}".` };
  const collision = draft.outputs.find((output) => draft.fields.some((field) => field.id === output.id));
  if (collision) return { ok: false, reason: `"${collision.id}" is both an input and a result.` };

  const evaluation = evaluateCalculator(draft, defaultFieldState(draft));
  if (!evaluation.ok) {
    return { ok: false, reason: `The draft does not compute with its own example values — ${evaluation.error}` };
  }
  const nonFinite = evaluation.outputs.find((output) => !Number.isFinite(output.canonical));
  if (nonFinite) {
    return { ok: false, reason: `"${nonFinite.label}" does not resolve to a finite number.` };
  }

  return {
    ok: true,
    draft,
    preview: evaluation.outputs.map((output) => ({
      label: output.label,
      display: output.display,
      unit: output.unit,
    })),
  };
}

function firstDuplicate(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}
