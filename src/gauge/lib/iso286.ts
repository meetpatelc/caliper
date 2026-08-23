/** ISO 286-1/2:2010 — standard tolerances and fundamental deviations, ≤ 500 mm. Values in µm. */

const SIZE_LIMITS = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500] as const;

const IT: Record<number, number[]> = {
  5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
  6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
  10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
  12: [100, 120, 150, 180, 210, 250, 300, 350, 400, 460, 520, 570, 630],
};

/** Absolute fundamental deviation (µm) by size-range index. Sign applied per letter family. */
const FD: Record<string, number[]> = {
  c: [60, 70, 80, 95, 110, 120, 140, 150, 170, 180, 190, 200, 220],
  d: [20, 30, 40, 50, 65, 80, 100, 120, 145, 170, 190, 210, 230],
  e: [14, 20, 25, 32, 40, 50, 60, 72, 85, 100, 110, 125, 135],
  f: [6, 10, 13, 16, 20, 25, 30, 36, 43, 50, 56, 62, 68],
  g: [2, 4, 5, 6, 7, 9, 10, 12, 14, 15, 17, 18, 20],
  h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  k: [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5],
  m: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
  n: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68],
  r: [10, 15, 19, 23, 28, 34, 41, 51, 65, 77, 94, 108, 122],
  s: [14, 19, 23, 28, 35, 43, 53, 66, 87, 102, 122, 137, 151],
  u: [18, 23, 28, 33, 41, 48, 60, 75, 102, 120, 146, 166, 190],
};

export const HOLE_LETTERS = ["C", "D", "E", "F", "G", "H", "JS", "K", "M", "N", "P", "R", "S", "U"] as const;
export const SHAFT_LETTERS = ["c", "d", "e", "f", "g", "h", "js", "k", "m", "n", "p", "r", "s", "u"] as const;
export const IT_GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const;

export type HoleLetter = (typeof HOLE_LETTERS)[number];
export type ShaftLetter = (typeof SHAFT_LETTERS)[number];
export type FitKind = "clearance" | "transition" | "interference";

export type IsoFit = {
  D: number;
  holeClass: string;
  shaftClass: string;
  IT_hole: number;
  IT_shaft: number;
  ES: number;
  EI: number;
  es: number;
  ei: number;
  holeMax: number;
  holeMin: number;
  shaftMax: number;
  shaftMin: number;
  cmax: number;
  cmin: number;
  imax: number;
  imin: number;
  kind: FitKind;
};

function rangeIndex(diameterMm: number) {
  if (!(diameterMm > 0) || diameterMm > 500) {
    throw new Error("ISO 286 tables here cover nominal sizes above 0 mm up to 500 mm.");
  }
  return SIZE_LIMITS.findIndex((limit) => diameterMm <= limit);
}

function itValue(grade: number, index: number) {
  const row = IT[grade];
  if (!row) throw new Error(`IT${grade} is not in this table (use IT5–IT12).`);
  return row[index];
}

function fdValue(letter: string, index: number) {
  const key = letter.toLowerCase();
  if (key === "js") return 0;
  const row = FD[key];
  if (!row) throw new Error(`Deviation ${letter} is not in this table.`);
  return row[index];
}

function shaftLimits(letter: ShaftLetter, grade: number, index: number) {
  const it = itValue(grade, index);
  const key = letter.toLowerCase();
  if (key === "js") {
    const half = it / 2;
    return { es: half, ei: -half, it };
  }
  const fd = fdValue(letter, index);
  if ("cdefgh".includes(key)) {
    const es = -fd;
    return { es, ei: es - it, it };
  }
  const ei = fd;
  return { es: ei + it, ei, it };
}

function holeLimits(letter: HoleLetter, grade: number, index: number) {
  const shaft = shaftLimits(letter.toLowerCase() as ShaftLetter, grade, index);
  return { ES: -shaft.ei, EI: -shaft.es, it: shaft.it };
}

export function computeFit(
  diameterMm: number,
  holeLetter: HoleLetter,
  holeGrade: number,
  shaftLetter: ShaftLetter,
  shaftGrade: number,
): IsoFit {
  const index = rangeIndex(diameterMm);
  const hole = holeLimits(holeLetter, holeGrade, index);
  const shaft = shaftLimits(shaftLetter, shaftGrade, index);
  const ES = hole.ES / 1000;
  const EI = hole.EI / 1000;
  const es = shaft.es / 1000;
  const ei = shaft.ei / 1000;
  const cmax = ES - ei;
  const cmin = EI - es;
  const imax = es - EI;
  const imin = ei - ES;
  let kind: FitKind = "transition";
  if (cmin >= 0) kind = "clearance";
  else if (cmax <= 0) kind = "interference";
  return {
    D: diameterMm,
    holeClass: `${holeLetter}${holeGrade}`,
    shaftClass: `${shaftLetter}${shaftGrade}`,
    IT_hole: hole.it,
    IT_shaft: shaft.it,
    ES,
    EI,
    es,
    ei,
    holeMax: diameterMm + ES,
    holeMin: diameterMm + EI,
    shaftMax: diameterMm + es,
    shaftMin: diameterMm + ei,
    cmax,
    cmin,
    imax,
    imin,
    kind,
  };
}

export function fitLabel(kind: FitKind) {
  if (kind === "clearance") return "Clearance fit";
  if (kind === "interference") return "Interference fit";
  return "Transition fit";
}
