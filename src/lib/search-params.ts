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

export function toolSearchFromUnknown(search: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    const next = coerceSearchValue(value);
    if (next !== undefined) out[key] = next;
  }
  return out;
}
