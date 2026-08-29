/**
 * Turn pasted or uploaded spreadsheet text into table rows.
 *
 * The point of this module is that a standards table should be entered once,
 * by copying it, rather than typed cell by cell. Everything that ships today is
 * eight numbers or fewer, but the tables worth adding are not: ISO 286 is about
 * 290 values, and nobody types that twice without getting a digit wrong.
 *
 * Deliberately reads the *clipboard's* text rather than a spreadsheet file.
 * Copying cells out of Excel, Google Sheets or LibreOffice puts them on the
 * clipboard as tab-separated text, and so does selecting a table in a web page
 * or a PDF — so one parser covers every source a person actually has, without
 * a spreadsheet dependency. A `.csv` file is the same text arriving a different
 * way, which is why `parseTableText` does not care which it was.
 *
 * Nothing here throws. A pasted table is somebody's data and it will be messy —
 * a footnote row, a merged header, a stray unit in a cell — and the useful
 * response is to show what was understood and say what was skipped, not to
 * reject the paste and lose it.
 */

/** What a parsed table looks like before the author maps it onto columns. */
export type ParsedTable = {
  /** Header text for the value columns, in order. Empty when there was no header. */
  headers: string[];
  /** The key column's header, for a keyed table. */
  keyHeader: string;
  rows: ParsedRow[];
  /** What was skipped or repaired, phrased for the person who pasted it. */
  issues: string[];
};

export type ParsedRow = {
  /** Keyed tables: the string a dropdown option must match. */
  key?: string;
  /** Range tables: the band this row covers. */
  min?: number;
  max?: number;
  values: number[];
};

export type TableKind = "keyed" | "range";

/**
 * Split one line, honouring quoted fields.
 *
 * Excel quotes any cell containing the delimiter, and doubles a literal quote
 * inside one. A naive `split` turns a single cell reading `1,234` into two
 * columns and silently shifts every value after it one place left — which is
 * the worst possible failure here, because the table still looks plausible.
 */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

/**
 * Guess the delimiter from the first non-empty line.
 *
 * Tab wins outright when present, because that is what a spreadsheet paste is
 * and a tab never appears inside a pasted cell. Otherwise the winner is
 * whichever of `;` and `,` occurs more often — semicolon first, since a file
 * that uses it is almost always from a locale where the comma is the decimal
 * mark, and that changes how the numbers must be read.
 */
export function detectDelimiter(text: string): { delimiter: string; decimalComma: boolean } {
  const line = text.split(/\r?\n/).find((entry) => entry.trim().length) ?? "";
  if (line.includes("\t")) return { delimiter: "\t", decimalComma: false };
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  if (semicolons >= commas && semicolons > 0) return { delimiter: ";", decimalComma: true };
  return { delimiter: ",", decimalComma: false };
}

/**
 * Read one cell as a number, or `undefined` if it is not one.
 *
 * Spreadsheets export numbers wearing all sorts of decoration: thousands
 * separators, a leading currency or comparison symbol, a trailing unit, a
 * non-breaking space where a space was meant, a Unicode minus. Each of those is
 * stripped rather than refused, because a table that rejects "1 234" is a table
 * nobody can paste into.
 *
 * `decimalComma` decides what a comma means. In a semicolon-delimited file
 * `0,45` is forty-five hundredths; in a comma-delimited one it cannot be, so a
 * comma there is a thousands separator and nothing else.
 */
export function parseNumber(raw: string, decimalComma = false): number | undefined {
  let text = raw.trim();
  if (!text) return undefined;
  // Unicode minus and non-breaking spaces come straight out of copied tables.
  text = text.replace(/−/g, "-").replace(/\s/g, "");
  text = decimalComma ? text.replace(/\./g, "").replace(/,/g, ".") : text.replace(/,/g, "");
  // A leading comparison symbol survives from band headings like "> 3".
  text = text.replace(/^[<>≤≥=~≈+]+/, "");
  // A trailing unit: "84.3 mm²", "20.1mm2".
  const match = text.match(/^[-]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
}

/** A header row is one whose value cells are text rather than numbers. */
function looksLikeHeader(cells: string[], skip: number, decimalComma: boolean) {
  const values = cells.slice(skip);
  if (!values.length) return false;
  return values.every((cell) => cell.length > 0 && parseNumber(cell, decimalComma) === undefined);
}

/**
 * Parse pasted text into rows.
 *
 * Column layout is positional and stated up front rather than guessed, because
 * guessing wrong here is invisible: a keyed table read as a range table still
 * produces rows, still saves, and is simply wrong for every lookup afterwards.
 * A keyed table is `key, …values`; a range table is `min, max, …values`.
 */
export function parseTableText(text: string, kind: TableKind = "keyed"): ParsedTable {
  const issues: string[] = [];
  const { delimiter, decimalComma } = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (!lines.length) return { headers: [], keyHeader: "", rows: [], issues: ["Nothing to read — the paste was empty."] };

  const leading = kind === "range" ? 2 : 1;
  const table = lines.map((line) => splitLine(line, delimiter));

  // Excel pads short rows with empty trailing cells; width is the widest row.
  const width = Math.max(...table.map((cells) => cells.length));
  if (width <= leading) {
    issues.push(
      kind === "range"
        ? "Needs at least three columns: lower bound, upper bound, then one value."
        : "Needs at least two columns: the key, then one value.",
    );
    return { headers: [], keyHeader: "", rows: [], issues };
  }

  let headers: string[] = [];
  let keyHeader = "";
  let start = 0;
  if (looksLikeHeader(table[0], leading, decimalComma)) {
    keyHeader = table[0][0] ?? "";
    headers = table[0].slice(leading, width);
    start = 1;
  } else {
    issues.push("No header row found — columns are numbered.");
    headers = Array.from({ length: width - leading }, (_, index) => `Column ${index + 1}`);
  }

  const rows: ParsedRow[] = [];
  for (let index = start; index < table.length; index += 1) {
    const cells = table[index];
    const values: number[] = [];
    let bad = false;
    for (let column = leading; column < width; column += 1) {
      const parsed = parseNumber(cells[column] ?? "", decimalComma);
      if (parsed === undefined) {
        bad = true;
        break;
      }
      values.push(parsed);
    }

    if (bad || values.length !== width - leading) {
      // Almost always a footnote, a units line, or a merged section heading.
      issues.push(`Row ${index + 1} skipped — "${(cells[0] ?? "").slice(0, 24)}" has a cell that is not a number.`);
      continue;
    }

    if (kind === "range") {
      const min = parseNumber(cells[0] ?? "", decimalComma);
      const max = parseNumber(cells[1] ?? "", decimalComma);
      if (min === undefined || max === undefined) {
        issues.push(`Row ${index + 1} skipped — the band bounds are not both numbers.`);
        continue;
      }
      if (max <= min) {
        issues.push(`Row ${index + 1} skipped — the upper bound is not above the lower one.`);
        continue;
      }
      rows.push({ min, max, values });
      continue;
    }

    const key = cells[0]?.trim() ?? "";
    if (!key) {
      issues.push(`Row ${index + 1} skipped — no key in the first column.`);
      continue;
    }
    rows.push({ key, values });
  }

  const seen = new Set<string>();
  for (const row of rows) {
    if (row.key === undefined) continue;
    if (seen.has(row.key)) issues.push(`"${row.key}" appears more than once; the first one wins.`);
    seen.add(row.key);
  }

  if (!rows.length) issues.push("No usable rows — check that the values are numbers.");
  return { headers, keyHeader, rows, issues };
}

/**
 * A column label, reduced to an identifier an expression can reference.
 *
 * Pasted headers carry their unit — "As (mm²)", "Rm, MPa" — which is useful to
 * a reader and unusable as a name, so the parenthetical is dropped and what is
 * left is camel-cased. The unit is not thrown away: `unitHintFrom` reads it, so
 * the author is offered the unit the spreadsheet already said.
 */
export function identifierFrom(header: string, taken: Set<string>): string {
  const base = header
    .replace(/\([^)]*\)/g, " ")
    // Both places a header carries its unit, dropped the same way `unitHintFrom`
    // finds them — otherwise "Tensile strength, MPa" names itself
    // `tensileStrengthMpa` while the unit picker separately offers MPa.
    .replace(/,\s*[^,]+$/, " ")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0]?.toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
  let candidate = /^[A-Za-z_]/.test(base) ? base : `col${base}`;
  if (!candidate) candidate = "col";
  candidate = candidate.slice(0, 32);
  let unique = candidate;
  let suffix = 2;
  while (taken.has(unique)) unique = `${candidate}${suffix++}`;
  return unique;
}

/** The unit a header names in brackets or after a comma, if it names one. */
export function unitHintFrom(header: string): string | undefined {
  const bracketed = header.match(/\(([^)]+)\)/);
  if (bracketed) return bracketed[1].trim() || undefined;
  const trailing = header.match(/,\s*([^,]+)$/);
  return trailing ? trailing[1].trim() || undefined : undefined;
}
