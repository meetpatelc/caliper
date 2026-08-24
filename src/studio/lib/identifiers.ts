export function toIdentifier(label: string, taken: Set<string>) {
  let base = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  if (!base) base = "x";
  if (!/^[a-z_]/.test(base)) base = `x_${base}`;
  let id = base;
  let n = 2;
  while (taken.has(id)) {
    id = `${base.slice(0, 20)}_${n}`;
    n += 1;
  }
  return id;
}

export function rewriteIdentifier(source: string, from: string, to: string) {
  if (!from || from === to) return source;
  const pattern = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  return source.replace(pattern, to);
}
