export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPercent(value: number, opts?: { maximumFractionDigits?: number }) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  }).format(value);
}

export function safeNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace?.(",", ".") ?? value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
