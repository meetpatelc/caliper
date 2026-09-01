/**
 * The ISO 286 page's state as query parameters.
 *
 * This page is bespoke — it is the one model whose inputs are two class letters
 * and two IT grades rather than a list of quantities — so it never joined the
 * shared workspace, and it never joined the URL either. That is why it had no
 * "Save this check" and no shareable link while the other 168 models did: a
 * saved check that cannot reopen is worse than no button, so the buttons were
 * left off rather than made to lie.
 *
 * Parsing is total. Anything unreadable falls back to the default rather than
 * throwing, because these values arrive from a URL someone may have typed,
 * truncated, or copied out of a chat client that ate the last character.
 */
export type FitsState = {
  diameter: string;
  holeLetter: string;
  holeGrade: number;
  shaftLetter: string;
  shaftGrade: number;
};

export const FITS_DEFAULT: FitsState = {
  diameter: "100",
  holeLetter: "H",
  holeGrade: 9,
  shaftLetter: "n",
  shaftGrade: 8,
};

export const FITS_KEYS = ["d", "hole", "holeIt", "shaft", "shaftIt"] as const;

export function fitsFromSearch(
  search: Record<string, string>,
  allowed: { hole: readonly string[]; shaft: readonly string[]; grades: readonly number[] },
): FitsState {
  const grade = (raw: string | undefined, fallback: number) => {
    const value = Number(raw);
    return Number.isInteger(value) && allowed.grades.includes(value) ? value : fallback;
  };
  // Diameter stays a string: it is a text field, and re-formatting what someone
  // typed the moment the page loads is its own small betrayal.
  const diameter = (search.d ?? "").trim();
  return {
    diameter: diameter && Number.isFinite(Number(diameter)) ? diameter : FITS_DEFAULT.diameter,
    holeLetter: allowed.hole.includes(search.hole ?? "") ? (search.hole as string) : FITS_DEFAULT.holeLetter,
    holeGrade: grade(search.holeIt, FITS_DEFAULT.holeGrade),
    shaftLetter: allowed.shaft.includes(search.shaft ?? "") ? (search.shaft as string) : FITS_DEFAULT.shaftLetter,
    shaftGrade: grade(search.shaftIt, FITS_DEFAULT.shaftGrade),
  };
}

export function fitsToSearch(state: FitsState): Record<string, string> {
  return {
    d: state.diameter,
    hole: state.holeLetter,
    holeIt: String(state.holeGrade),
    shaft: state.shaftLetter,
    shaftIt: String(state.shaftGrade),
  };
}
