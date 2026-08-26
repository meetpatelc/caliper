/** Plain query strings for shareable desk URLs. Not TanStack's JSON search. */

export function coerceSearchValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const quote = trimmed[0];
    if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") {
          return String(parsed);
        }
      } catch {
        return trimmed.slice(1, -1);
      }
    }
  }
  return trimmed;
}

export function parseSearchPlain(searchStr: string): Record<string, string> {
  const raw = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    const next = coerceSearchValue(value);
    if (next !== undefined && next !== "") out[key] = next;
  }
  return out;
}

export function stringifySearchPlain(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key === "restore") continue;
    const next = coerceSearchValue(value);
    if (next === undefined || next === "") continue;
    params.set(key, next);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function sharePath(toolId: string, input: Record<string, unknown>, allowedKeys: string[]) {
  const allowed = new Set(allowedKeys);
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    const text = coerceSearchValue(value);
    if (text !== undefined && text !== "") next[key] = text;
  }
  return `/tool/${toolId}${stringifySearchPlain(next)}`;
}

export function toolSearchFromUnknown(search: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    const next = coerceSearchValue(value);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

/**
 * The formula version a shared record was produced under.
 *
 * A record link carries inputs, not an answer — the page recomputes when it is
 * opened. That makes it a live link rather than a photograph, and it means a
 * correction to a model silently changes every link already sent: same URL,
 * same-looking page, a different number, and nothing telling the reader.
 *
 * Stamping the version at the moment the link is made is what makes the change
 * visible later. It cannot be applied retroactively — a link sent before this
 * existed carries no stamp and nothing can infer one — which is why this has to
 * be in place *before* a model is corrected, not after.
 */
export const RECORD_VERSION_KEY = "fv";

export function recordPath(
  toolId: string,
  input: Record<string, unknown>,
  allowedKeys: string[],
  formulaVersion: string,
) {
  const path = sharePath(toolId, input, allowedKeys).replace("/tool/", "/record/");
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set(RECORD_VERSION_KEY, formulaVersion);
  return `${base}?${params.toString()}`;
}

/** Split a record's search into the model's inputs and the stamp beside them. */
export function splitRecordSearch(search: Record<string, string>): {
  input: Record<string, string>;
  stampedVersion?: string;
} {
  const { [RECORD_VERSION_KEY]: stampedVersion, ...input } = search;
  return { input, stampedVersion: stampedVersion || undefined };
}
