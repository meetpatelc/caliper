/** Tolerance-aware millimetre labels that keep distinct ISO limits distinct. */
export function formatLimitMm(value: number, spanMm = 0.001) {
  if (!Number.isFinite(value)) return "—";
  const places = Math.min(6, Math.max(3, Math.ceil(-Math.log10(Math.max(Math.abs(spanMm), 1e-6)))));
  return value.toFixed(places);
}

export function formatDeviationMm(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const places = Math.min(6, Math.max(3, Math.ceil(-Math.log10(Math.abs(value))) + 1));
  return value.toFixed(places).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
