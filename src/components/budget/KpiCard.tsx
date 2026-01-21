import * as React from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type KpiStatus = "success" | "warning" | "danger" | "neutral";
export type KpiTrend = "up" | "down" | "stable";

interface KpiCardProps {
  title: string;
  value: string;
  hint?: string;
  tooltip?: string;
  status?: KpiStatus;
  trend?: KpiTrend;
  trendLabel?: string;
}

const statusColors: Record<KpiStatus, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
};

const statusBgColors: Record<KpiStatus, string> = {
  success: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  neutral: "",
};

const trendIcons: Record<KpiTrend, React.ElementType> = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors: Record<KpiTrend, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  stable: "text-muted-foreground",
};

/**
 * Calcula o status do pacing baseado no percentual.
 * @param pacing Valor entre 0 e 1 (ex: 0.85 = 85%)
 * @param dayProgress Progresso do mês (0 a 1), para ajustar expectativa
 */
export function getPacingStatus(pacing: number | null, dayProgress?: number): KpiStatus {
  if (pacing == null) return "neutral";

  const expectedPacing = dayProgress ?? 1;
  const ratio = pacing / expectedPacing;

  if (ratio >= 0.9 && ratio <= 1.1) return "success";
  if (ratio >= 0.8 && ratio <= 1.2) return "warning";
  return "danger";
}

/**
 * Calcula a tendência baseada na variação.
 * @param current Valor atual
 * @param previous Valor anterior (ou esperado)
 */
export function getTrend(current: number | null, previous: number | null): KpiTrend {
  if (current == null || previous == null) return "stable";
  if (current > previous * 1.05) return "up";
  if (current < previous * 0.95) return "down";
  return "stable";
}

export function KpiCard({
  title,
  value,
  hint,
  tooltip,
  status = "neutral",
  trend,
  trendLabel
}: KpiCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  const cardContent = (
    <Card className={cn("transition-colors", status !== "neutral" && statusBgColors[status])}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {tooltip && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className={cn("text-2xl font-semibold tabular-nums", statusColors[status])}>
            {value}
          </div>
          {TrendIcon && trend && (
            <div className={cn("flex items-center gap-1 text-sm", trendColors[trend])}>
              <TrendIcon className="h-4 w-4" />
              {trendLabel && <span className="text-xs">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return cardContent;
}
