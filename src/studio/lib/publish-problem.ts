import type { $ZodIssue } from "zod/v4/core";

/**
 * Turn the first schema failure into a sentence that names the field.
 *
 * Publish used to toast `issue.message` verbatim. Two things were wrong with
 * that. The message never said *which* field — "Too small: expected string to
 * have >=2 characters" is true and useless when the form has fourteen of them —
 * and the step it switched to could hold half a dozen fields, so the person was
 * dropped on a panel and left to guess. On a drafted calculator the answer was
 * always the same field, `sourceLabel`, which the accept path deliberately
 * leaves blank because a model has no source to cite.
 *
 * It was worse than that in a build: zod's English locale is dropped by the
 * bundler, so the deployed toast read, in full, "Invalid input". That is fixed
 * in `src/lib/zod-config.ts`, but the naming here is what makes the message
 * actionable, and it holds even if a message ever degrades again.
 */

/** The label each key wears in the form, so the sentence matches what is on screen. */
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "One-line description",
  domain: "Domain",
  slug: "Address",
  fields: "Inputs",
  outputs: "Results",
  formula: "How it should read on the page",
  purpose: "Purpose",
  assumptions: "Assumptions",
  boundary: "Boundary",
  interpretation: "How to read the result",
  sourceLabel: "Source label",
  sourceUrl: "Source URL",
  constraints: "Guards",
  tables: "Tables",
  related: "Related models",
  warnings: "Warnings",
};

/** Rows are addressed the way the panel numbers them: from one, not from zero. */
const ROW_LABELS: Record<string, string> = { fields: "Input", outputs: "Result", constraints: "Guard", tables: "Table" };

function labelFor(path: readonly PropertyKey[]) {
  const key = String(path[0] ?? "");
  const row = ROW_LABELS[key];
  if (row !== undefined && typeof path[1] === "number") {
    const inner = path[2] === undefined ? "" : ` (${String(path[2])})`;
    return `${row} ${path[1] + 1}${inner}`;
  }
  return FIELD_LABELS[key];
}

/**
 * The predicate, phrased for a reader rather than for a schema.
 *
 * Only the length and presence codes are rewritten. Everything else — the
 * regex messages, `Unknown unit family.`, the constraint refinement — is text
 * we wrote for exactly this moment, so it is passed through unchanged.
 */
function predicateFor(issue: $ZodIssue, offending: unknown) {
  if (issue.code === "invalid_type" && offending === undefined) return "is missing.";

  if (issue.code === "too_small") {
    const minimum = Number(issue.minimum);
    // Blank and too-short are different problems and deserve different
    // sentences. `sourceLabel` has a minimum of 2, so keying off the minimum
    // told someone who had typed nothing at all to add a character. A
    // `too_small` issue does not carry the value it rejected, hence the walk.
    if (issue.origin === "string") {
      return offending === "" ? "is required." : `needs at least ${minimum} characters.`;
    }
    if (issue.origin === "array") {
      return minimum === 1 ? "needs at least one entry." : `needs at least ${minimum} entries.`;
    }
  }

  if (issue.code === "too_big") {
    const maximum = Number(issue.maximum);
    if (issue.origin === "string") return `is longer than ${maximum} characters.`;
    if (issue.origin === "array") return `has more than ${maximum} entries.`;
  }

  return null;
}

/** The value the issue points at, or `undefined` if the path does not resolve. */
function valueAt(source: unknown, path: readonly PropertyKey[]) {
  let current = source;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

export function publishProblem(issue: $ZodIssue | undefined, draft?: unknown): string {
  if (!issue) return "Finish the instrument before publishing.";

  const label = labelFor(issue.path ?? []);
  if (!label) return issue.message;

  const predicate = predicateFor(issue, valueAt(draft, issue.path ?? []));
  return predicate ? `${label} ${predicate}` : `${label} — ${issue.message}`;
}

/**
 * Every distinct problem, not just the first one.
 *
 * Publishing reported `issues[0]` and stopped, so a draft missing three things
 * took three attempts to find out — fix one, press Publish, discover the next.
 * The validator has known all of them the whole time.
 *
 * Deduplicated by message: several fields with no unit produce the same
 * sentence, and repeating it once per field turns a short list into a wall
 * that says nothing extra.
 */
export function publishProblems(issues: readonly $ZodIssue[], draft?: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const issue of issues) {
    const message = publishProblem(issue, draft);
    if (seen.has(message)) continue;
    seen.add(message);
    out.push(message);
  }
  return out.length ? out : [publishProblem(undefined)];
}

/**
 * The two halves of the message: what to fix first, and what else is waiting.
 *
 * The first problem is the one the editor jumps to, so it goes in the title
 * where it is read. The rest go in the description as a count and a list, so
 * the size of the job is visible without a toast that fills the screen.
 */
export function publishProblemSummary(problems: readonly string[]): { title: string; description?: string } {
  const [first, ...rest] = problems;
  if (!rest.length) return { title: first };
  const shown = rest.slice(0, 3);
  const remainder = rest.length - shown.length;
  const tail = remainder > 0 ? ` And ${remainder} more.` : "";
  return {
    title: first,
    description: `${rest.length} more to fix. ${shown.join(" ")}${tail}`,
  };
}
