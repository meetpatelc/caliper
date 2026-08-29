/**
 * How an ISO 286 fit is read out: the two outcomes, and the sum behind each.
 *
 * Separate from the page because it is the part worth testing, and a test
 * runner that strips TypeScript will not load a `.tsx` component. Pure
 * arithmetic and labelling; no rendering.
 */

/** Deviations in µm. The published tables are µm, and "87 − 23 = 64" reads. */
export const um = (mmValue: number) => Math.round(mmValue * 1000);

/**
 * An operand inside a subtraction rather than a value on its own: positives
 * bare, negatives bracketed. "+87 − +23" is harder to read than the arithmetic
 * it describes, and "35 − −34" is worse.
 */
export const operand = (value: number) => (value < 0 ? `(${value})` : String(value));

export type FitOutcome = {
  label: "Loosest" | "Tightest";
  kind: "clearance" | "interference";
  /** µm, always positive — the word carries the direction. */
  magnitude: number;
  /** mm, always positive, for the headline figure. */
  mmValue: number;
  /** The subtraction that produces `magnitude`, as shown. */
  working: string;
};

/**
 * The two outcomes of a fit, each with the subtraction behind it.
 *
 * Every fit has exactly two numbers worth reading: the loosest it can come out
 * and the tightest. What changes between fit types is not how many numbers but
 * what they should be *called* — and that is the whole bug this replaces.
 *
 * The page used to print `cmax` and `imax` under fixed labels. On a transition
 * fit that is right, and it is what the page defaults to, which is why it read
 * as correct for years. On a clearance fit it printed "Maximum interference:
 * −0.012 mm" — a negative tightness, which is not a quantity — while the number
 * a reader wants, the smallest clearance, was computed and thrown away.
 *
 * `cmin` is `−imax` and `imin` is `−cmax` by construction, so naming the sign
 * correctly is the entire fix; no third or fourth number is needed, and an
 * earlier attempt at showing all four buried the answer under its own
 * arithmetic.
 *
 * Both halves have to flip together. Naming the outcome by its sign while
 * keeping the original terms shipped, briefly, as
 * "Tightest — clearance 0.012 mm · es − EI = (-12) − 0 = 12 µm", which does not
 * add up. On a clearance fit the tightest outcome is `EI − es`, so each branch
 * carries its own terms.
 */
export function outcomes(fit: {
  ES: number;
  EI: number;
  es: number;
  ei: number;
  cmax: number;
  imax: number;
}): FitOutcome[] {
  const ES = um(fit.ES);
  const EI = um(fit.EI);
  const es = um(fit.es);
  const ei = um(fit.ei);
  const loose = um(fit.cmax);
  const tight = um(fit.imax);

  return [
    loose >= 0
      ? {
          label: "Loosest",
          kind: "clearance",
          magnitude: loose,
          mmValue: fit.cmax,
          working: `ES − ei = ${operand(ES)} − ${operand(ei)}`,
        }
      : {
          label: "Loosest",
          kind: "interference",
          magnitude: -loose,
          mmValue: -fit.cmax,
          working: `ei − ES = ${operand(ei)} − ${operand(ES)}`,
        },
    tight >= 0
      ? {
          label: "Tightest",
          kind: "interference",
          magnitude: tight,
          mmValue: fit.imax,
          working: `es − EI = ${operand(es)} − ${operand(EI)}`,
        }
      : {
          label: "Tightest",
          kind: "clearance",
          magnitude: -tight,
          mmValue: -fit.imax,
          working: `EI − es = ${operand(EI)} − ${operand(es)}`,
        },
  ];
}
