/**
 * @instrument/formula — expression truth only.
 * Callers convert with @instrument/units, then pass canonical numbers.
 * Do not put product catalogs, field caps, domains, or Studio here.
 */

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  exp: (x) => Math.exp(x),
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
  pow: (a, b) => a ** b,
  hypot: (...xs) => Math.hypot(...xs),
  atan: (x) => Math.atan(x),
  atan2: (y, x) => Math.atan2(y, x),
  logmean: (a, b) => (Math.abs(a - b) < 1e-10 ? a : (a - b) / Math.log(a / b)),
  eq: (a, b) => (Math.abs(a - b) < 1e-12 ? 1 : 0),
};

export class FormulaError extends Error {
  fieldId?: string;
  constructor(message: string, fieldId?: string) {
    super(message);
    this.name = "FormulaError";
    this.fieldId = fieldId;
  }
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

export type FormulaContext = {
  strings?: Record<string, string>;
  tables?: Record<string, Record<string, number>>;
};

type Tok =
  | { kind: "num"; value: number }
  | { kind: "id"; value: string }
  | { kind: "op"; value: string };

function tokenize(source: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && /[0-9.]/.test(source[i])) i += 1;
      if ((source[i] === "e" || source[i] === "E") && i + 1 < source.length) {
        const signOrDigit = source[i + 1];
        if (signOrDigit === "+" || signOrDigit === "-" || /[0-9]/.test(signOrDigit)) {
          i += 1;
          if (source[i] === "+" || source[i] === "-") i += 1;
          const expStart = i;
          while (i < source.length && /[0-9]/.test(source[i])) i += 1;
          if (i === expStart) throw new Error(`Bad number "${source.slice(start, i)}".`);
        }
      }
      const raw = source.slice(start, i);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(`Bad number "${raw}".`);
      tokens.push({ kind: "num", value });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i += 1;
      tokens.push({ kind: "id", value: source.slice(start, i) });
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character "${ch}".`);
  }
  return tokens;
}

function columnKey(
  tokenValue: string,
  numberValue: number | undefined,
  strings: Record<string, string>,
  table: Record<string, number> | undefined,
) {
  if (table && tokenValue in table && !(tokenValue in strings)) return tokenValue;
  if (tokenValue in strings) return strings[tokenValue];
  if (numberValue != null && Number.isInteger(numberValue)) return String(numberValue);
  return tokenValue;
}

export function evaluateExpression(source: string, scope: Record<string, number>, context: FormulaContext = {}): number {
  const tokens = tokenize(source);
  let index = 0;
  const strings = context.strings ?? {};
  const tables = context.tables ?? {};

  const peek = (): Tok | undefined => tokens[index];
  const take = (): Tok => {
    const token = tokens[index];
    if (!token) throw new Error("Unexpected end of formula.");
    index += 1;
    return token;
  };
  const match = (value: string) => {
    const token = peek();
    if (token?.kind === "op" && token.value === value) {
      take();
      return true;
    }
    return false;
  };

  function parseAdd(): number {
    let left = parseMul();
    for (;;) {
      const token = peek();
      if (token?.kind !== "op" || (token.value !== "+" && token.value !== "-")) break;
      take();
      const right = parseMul();
      left = token.value === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMul(): number {
    let left = parsePow();
    for (;;) {
      const token = peek();
      if (token?.kind !== "op" || (token.value !== "*" && token.value !== "/")) break;
      take();
      const rightStart = index;
      const right = parsePow();
      if (token.value === "/" && right === 0) {
        const divisor = tokens[rightStart];
        const fieldId = divisor?.kind === "id" ? divisor.value : undefined;
        throw new FormulaError("Division by zero.", fieldId);
      }
      left = token.value === "*" ? left * right : left / right;
    }
    return left;
  }

  function parsePow(): number {
    const left = parseUnary();
    const token = peek();
    if (token?.kind === "op" && token.value === "^") {
      take();
      return left ** parsePow();
    }
    return left;
  }

  function parseUnary(): number {
    if (match("+")) return parseUnary();
    if (match("-")) return -parseUnary();
    return parsePrimary();
  }

  function parsePrimary(): number {
    const token = peek();
    if (!token) throw new Error("Unexpected end of formula.");
    if (token.kind === "num") {
      take();
      return token.value;
    }
    if (token.kind === "id") {
      take();
      if (match("(")) {
        if (token.value === "lookup") {
          const tableTok = peek();
          if (tableTok?.kind !== "id") throw new Error("lookup(table, column) needs a table name.");
          take();
          if (!match(",")) throw new Error("lookup(table, column) needs a column.");
          const table = tables[tableTok.value];
          if (!table) throw new Error(`Unknown table "${tableTok.value}".`);
          const colTok = peek();
          let key: string;
          if (colTok?.kind === "id") {
            take();
            key = columnKey(colTok.value, scope[colTok.value], strings, table);
          } else if (colTok?.kind === "num") {
            take();
            key = Number.isInteger(colTok.value) ? String(colTok.value) : String(colTok.value);
          } else {
            throw new Error("lookup column must be a name or number.");
          }
          if (!match(")")) throw new Error("Missing closing parenthesis.");
          if (!(key in table)) throw new Error(`No column "${key}" in ${tableTok.value}.`);
          return table[key];
        }
        const fn = FUNCTIONS[token.value];
        if (!fn) throw new Error(`Unknown function "${token.value}".`);
        const args: number[] = [];
        if (!match(")")) {
          args.push(parseAdd());
          while (match(",")) args.push(parseAdd());
          if (!match(")")) throw new Error("Missing closing parenthesis.");
        }
        const result = fn(...args);
        if (!Number.isFinite(result)) throw new Error(`Function "${token.value}" returned a non-finite value.`);
        return result;
      }
      if (token.value in scope) return scope[token.value];
      if (token.value in CONSTANTS) return CONSTANTS[token.value];
      throw new Error(`Unknown name "${token.value}".`);
    }
    if (match("(")) {
      const value = parseAdd();
      if (!match(")")) throw new Error("Missing closing parenthesis.");
      return value;
    }
    throw new Error("Expected a number, name, or parenthesis.");
  }

  const value = parseAdd();
  if (index < tokens.length) throw new Error("Unexpected tokens after formula.");
  if (!Number.isFinite(value)) throw new Error("Result is not finite.");
  return value;
}

export function validateExpression(
  source: string,
  names: string[],
  tables: Array<{ id: string; columns: string[] }> = [],
) {
  const scope = Object.fromEntries(names.map((name) => [name, 1]));
  const tableMap = Object.fromEntries(
    tables.map((table) => [table.id, Object.fromEntries(table.columns.map((column) => [column, 1]))]),
  );
  const firstColumn = tables[0]?.columns[0] ?? "1";
  const strings = Object.fromEntries(names.map((name) => [name, firstColumn]));
  try {
    evaluateExpression(source, scope, { strings, tables: tableMap });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid formula.";
  }
}
