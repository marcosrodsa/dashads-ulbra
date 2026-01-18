import * as React from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Legend,
  Line,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";
import { resolvePerformanceMetricColumns } from "@/integrations/supabase/performanceMetricsSchema";

function safeNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pct(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function dateOnly(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export default function PerformancePage() {
  const { filters } = useFilters();
  const client = React.useMemo(() => getSupabaseClient(), []);

  const monthStart = startOfMonth(filters.month);
  const monthEnd = endOfMonth(filters.month);

  const colsQuery = useQuery({
    queryKey: ["performance", "cols"],
    enabled: !!client,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const [dims, metrics] = await Promise.all([
        resolvePerformanceDailyColumns(client as SupabaseClient),
        resolvePerformanceMetricColumns(client as SupabaseClient),
      ]);
      return { ...dims, ...metrics };
    },
  });

  const dataQuery = useQuery({
    queryKey: [
      "performance",
      "data",
      format(monthStart, "yyyy-MM"),
      filters.platform ?? "__all__",
      filters.businessUnit ?? "__all__",
    ],
    enabled: !!client && !!colsQuery.data,
    queryFn: async () => {
      const cols = colsQuery.data!;

      const selectCols = Array.from(
        new Set(
          [
            cols.dateCol,
            cols.businessUnitCol,
            cols.platformCol,
            cols.spendCol,
            cols.impressionsCol,
            cols.clicksCol,
            cols.conversionsCol,
          ].filter(Boolean)
        )
      ).join(",");

      let q = (client as SupabaseClient)
        .from("fact_ads_performance_daily")
        .select(selectCols)
        .gte(cols.dateCol, dateOnly(monthStart))
        .lte(cols.dateCol, dateOnly(monthEnd));

      if (cols.platformCol && filters.platform) q = q.eq(cols.platformCol, filters.platform);
      if (filters.businessUnit) q = q.eq(cols.businessUnitCol, filters.businessUnit);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];

      // --- Weekday aggregation (Volume vs Qualidade)
      const byWeekday = new Map<number, { volume: number; clicks: number; impressions: number }>();
      for (let i = 0; i < 7; i++) byWeekday.set(i, { volume: 0, clicks: 0, impressions: 0 });

      const volumeKey = cols.conversionsCol ?? cols.clicksCol ?? null;
      for (const r of rows as any[]) {
        const iso = String(r?.[cols.dateCol] ?? "");
        if (!iso) continue;
        const d = new Date(iso);
        const wd = d.getDay();
        const bucket = byWeekday.get(wd)!;

        if (volumeKey) bucket.volume += safeNumber(r?.[volumeKey]);
        if (cols.clicksCol) bucket.clicks += safeNumber(r?.[cols.clicksCol]);
        if (cols.impressionsCol) bucket.impressions += safeNumber(r?.[cols.impressionsCol]);
      }

      const weekdaySeries = Array.from(byWeekday.entries()).map(([wd, v]) => {
        const rateDen = v.clicks > 0 ? v.clicks : v.impressions;
        const rate = rateDen > 0 ? v.volume / rateDen : 0;
        return { weekday: WEEKDAYS[wd], volume: v.volume, rate };
      });

      // --- Campaign aggregation (Investimento vs CPA)
      const byUnit = new Map<string, { spend: number; conv: number }>();
      for (const r of rows as any[]) {
        const unit = String(r?.[cols.businessUnitCol] ?? "").trim();
        if (!unit) continue;
        const curr = byUnit.get(unit) ?? { spend: 0, conv: 0 };
        curr.spend += safeNumber(r?.[cols.spendCol]);
        if (cols.conversionsCol) curr.conv += safeNumber(r?.[cols.conversionsCol]);
        byUnit.set(unit, curr);
      }

      const scatterSeries = Array.from(byUnit.entries()).map(([unit, v]) => {
        const cpa = v.conv > 0 ? v.spend / v.conv : null;
        return { unit, spend: v.spend, cpa, conv: v.conv };
      });

      return { weekdaySeries, scatterSeries, hasConversions: !!cols.conversionsCol };
    },
  });

  const isLoading = colsQuery.isLoading || dataQuery.isLoading;
  const error = (colsQuery.error || dataQuery.error) as any;

  const missingQualityInputs =
    !!colsQuery.data && !colsQuery.data.clicksCol && !colsQuery.data.impressionsCol;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inteligência Tática</h1>
        <p className="text-sm text-muted-foreground">Análise de eficiência e comportamento ao longo do mês.</p>
      </header>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar dados</CardTitle>
            <CardDescription>Verifique permissões (RLS) e nomes das colunas na fact_ads_performance_daily.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{String(error?.message ?? error)}</pre>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Gráficos de performance">
        <Card>
          <CardHeader>
            <CardTitle>Volume vs Qualidade</CardTitle>
            <CardDescription>
              Volume por dia da semana e taxa (volume / clicks ou impressions).
              {missingQualityInputs ? " (Sem clicks/impressions: taxa indisponível)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Carregando…
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dataQuery.data?.weekdaySeries ?? []} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="weekday" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => pct(Number(v))} />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        if (name === "Taxa") return [pct(Number(value)), name];
                        return [Number(value).toLocaleString("pt-BR"), name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="volume" name="Volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    {!missingQualityInputs ? (
                      <Line yAxisId="right" type="monotone" dataKey="rate" name="Taxa" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investimento vs CPA</CardTitle>
            <CardDescription>Por unidade (campaign_name): X=spend, Y=CPA (spend/conversions).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Carregando…
              </div>
            ) : !dataQuery.data?.hasConversions ? (
              <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Coluna de conversions não detectada — não consigo calcular CPA.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="spend" name="Spend" tickFormatter={(v) => brl(Number(v))} />
                    <YAxis dataKey="cpa" name="CPA" tickFormatter={(v) => brl(Number(v))} />
                    <ZAxis dataKey="conv" range={[60, 220]} name="Conversões" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value: any, name: any, props: any) => {
                        if (name === "Spend") return [brl(Number(value)), name];
                        if (name === "CPA") return [brl(Number(value)), name];
                        if (name === "Conversões") return [Number(value).toLocaleString("pt-BR"), name];
                        // unit via props.payload
                        return [String(value), name];
                      }}
                      labelFormatter={(_, payload) => {
                        const p = (payload?.[0] as any)?.payload;
                        return p?.unit ? `Unidade: ${p.unit}` : "";
                      }}
                    />
                    <Scatter name="Unidades" data={dataQuery.data?.scatterSeries ?? []} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="text-xs text-muted-foreground">
        Filtros ativos: {JSON.stringify({ ...filters, month: filters.month.toISOString().slice(0, 10) })}
      </footer>
    </div>
  );
}
