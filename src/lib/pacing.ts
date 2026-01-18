import { useMemo } from "react";

export function isSameMonth(aYYYYMM: string, bYYYYMM: string) {
  return aYYYYMM === bYYYYMM;
}

export function monthMeta(monthYYYYMM: string, now = new Date()) {
  const [yStr, mStr] = monthYYYYMM.split("-");
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1; // 0-based

  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  const nowYYYYMM = now.toISOString().slice(0, 7);
  const isCurrent = isSameMonth(monthYYYYMM, nowYYYYMM);

  // Para meses não correntes: consideramos o mês "fechado" (sem projeção)
  const daysPassed = isCurrent ? Math.min(now.getDate(), totalDays) : totalDays;

  return { year, monthIndex, totalDays, daysPassed, isCurrent };
}

export function computeForecast(spend: number, monthYYYYMM: string, now = new Date()) {
  const { totalDays, daysPassed, isCurrent } = monthMeta(monthYYYYMM, now);

  if (!isCurrent) return spend;
  if (daysPassed <= 0) return spend;

  return (spend / daysPassed) * totalDays;
}

export function computeUtilizationPct(spend: number, budget: number) {
  if (budget <= 0) return 0;
  return (spend / budget) * 100;
}

export function computeForecastRatioPct(forecast: number, budget: number) {
  if (budget <= 0) return forecast > 0 ? Infinity : 0;
  return (forecast / budget) * 100;
}

export type SemaphoreStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export function computeSemaphoreStatus(forecast: number, budget: number): SemaphoreStatus {
  const ratio = budget > 0 ? forecast / budget : forecast > 0 ? Infinity : 0;
  if (ratio > 1.05) return "CRITICAL";
  if (ratio < 0.9) return "WARNING";
  return "HEALTHY";
}

export function useStableNow() {
  // Evita recomputar tudo a cada render por causa de new Date()
  return useMemo(() => new Date(), []);
}
