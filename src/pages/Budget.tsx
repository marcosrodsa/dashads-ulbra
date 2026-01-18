import * as React from "react";
import { endOfMonth, format, isSameMonth, startOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SupabaseDebugBanner } from "@/components/debug/SupabaseDebugBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolveBudgetColumns } from "@/integrations/supabase/budgetSchema";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";
import { resolvePerformanceMetricColumns } from "@/integrations/supabase/performanceMetricsSchema";

type BudgetKpis = {
  plannedMonth: number | null;
  spendMonth: number | null;
  forecast: number | null;
  netVariance: number | null;
  pacing: number | null;
};

type UnitRow = {
  unit: string;
  planned: number;
  spend: number;
};

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

function safeNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function BudgetPage() {
  const { filters } = useFilters();
  const client = React.useMemo(() => getSupabaseClient(), []);

  const monthStart = startOfMonth(filters.month);
  const monthEnd = endOfMonth(filters.month);

  const budgetColsQuery = useQuery({
    queryKey: ["budget", "cols"],
    queryFn: () => resolveBudgetColumns(client as SupabaseClient),
    enabled: !!client,
    staleTime: 1000 * 60 * 60,
  });

  const perfColsQuery = useQuery({
    queryKey: ["budget", "perfCols"],
    queryFn: async () => {
      const [dims, metrics] = await Promise.all([
        resolvePerformanceDailyColumns(client as SupabaseClient),
        resolvePerformanceMetricColumns(client as SupabaseClient),
      ]);
      return { ...dims, ...metrics };
    },
    enabled: !!client,
    staleTime: 1000 * 60 * 60,
  });

  const budgetDataQuery = useQuery({
    queryKey: [
      "budget",
      "data",
      format(monthStart, "yyyy-MM"),
      filters.platform ?? "__all__",
      filters.businessUnit ?? "__all__",
    ],
    enabled: !!client && !!budgetColsQuery.data && !!perfColsQuery.data,
    queryFn: async () => {
      const budgetCols = budgetColsQuery.data!;
      const perfCols = perfColsQuery.data!;

      const fromDate = format(monthStart, "yyyy-MM-dd");
      const toDate = format(monthEnd, "yyyy-MM-dd");

      // --- Budget (planejado)
      const budgetSelectCols = Array.from(
        new Set(
          [budgetCols.monthCol, budgetCols.plannedCol, budgetCols.platformCol, budgetCols.unitCol].filter(
            Boolean
          ) as string[]
        )
      ).join(",");

      let budgetQ = (client as SupabaseClient)
        .from("fact_ads_budget")
        .select(budgetSelectCols)
        .gte(budgetCols.monthCol, fromDate)
        .lte(budgetCols.monthCol, toDate);

      if (budgetCols.platformCol && filters.platform) {
        budgetQ = budgetQ.eq(budgetCols.platformCol, filters.platform);
      }

      if (budgetCols.unitCol && filters.businessUnit) {
        budgetQ = budgetQ.eq(budgetCols.unitCol, filters.businessUnit);
      }

      const { data: budgetRows, error: budgetErr } = await budgetQ;
      if (budgetErr) throw budgetErr;

      // --- Performance (realizado)
      const perfSelectCols = Array.from(
        new Set([perfCols.dateCol, perfCols.businessUnitCol, perfCols.spendCol, perfCols.platformCol].filter(Boolean))
      ).join(",");

      let perfQ = (client as SupabaseClient)
        .from("fact_ads_performance_daily")
        .select(perfSelectCols)
        .gte(perfCols.dateCol, fromDate)
        .lte(perfCols.dateCol, toDate);

      if (perfCols.platformCol && filters.platform) {
        perfQ = perfQ.eq(perfCols.platformCol, filters.platform);
      }

      if (filters.businessUnit) {
        perfQ = perfQ.eq(perfCols.businessUnitCol, filters.businessUnit);
      }

      const { data: perfRows, error: perfErr } = await perfQ;
      if (perfErr) throw perfErr;

      const plannedMonth = (budgetRows ?? []).reduce(
        (acc: number, r: any) => acc + safeNumber(r?.[budgetCols.plannedCol]),
        0
      );

      const spendMonth = (perfRows ?? []).reduce(
        (acc: number, r: any) => acc + safeNumber(r?.[perfCols.spendCol]),
        0
      );

      // Série diária (pacing acumulado)
      const byDay = new Map<string, number>();
      for (const r of perfRows ?? []) {
        const iso = String(r?.[perfCols.dateCol] ?? "");
        const dayKey = iso ? iso.slice(0, 10) : "";
        if (!dayKey) continue;
        byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + safeNumber(r?.[perfCols.spendCol]));
      }

      const daysSorted = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, spend]) => ({ day, spend }));

      let running = 0;
      const dailySeries = daysSorted.map((d) => {
        running += d.spend;
        const dayOfMonth = Number(d.day.slice(8, 10));
        const totalDays = monthEnd.getDate();
        const ideal = plannedMonth > 0 ? (plannedMonth * dayOfMonth) / totalDays : 0;
        return { day: d.day, spendCum: running, idealCum: ideal };
      });

      // Matriz por unidade (campaign_name) quando houver granularidade no budget
      const plannedByUnit = new Map<string, number>();
      if (budgetCols.unitCol) {
        for (const r of budgetRows ?? []) {
          const unit = String(r?.[budgetCols.unitCol] ?? "").trim();
          if (!unit) continue;
          plannedByUnit.set(unit, (plannedByUnit.get(unit) ?? 0) + safeNumber(r?.[budgetCols.plannedCol]));
        }
      }

      const spendByUnit = new Map<string, number>();
      for (const r of perfRows ?? []) {
        const unit = String(r?.[perfCols.businessUnitCol] ?? "").trim();
        if (!unit) continue;
        spendByUnit.set(unit, (spendByUnit.get(unit) ?? 0) + safeNumber(r?.[perfCols.spendCol]));
      }

      const unitKeys = Array.from(new Set([...plannedByUnit.keys(), ...spendByUnit.keys()]));
      const unitRows: UnitRow[] = unitKeys
        .map((u) => ({
          unit: u,
          planned: plannedByUnit.get(u) ?? 0,
          spend: spendByUnit.get(u) ?? 0,
        }))
        .sort((a, b) => (b.planned || b.spend) - (a.planned || a.spend));

      // KPIs (forecast simples)
      const now = new Date();
      const isCurrent = isSameMonth(monthStart, now);
      const totalDays = monthEnd.getDate();
      const dayOfMonth = Math.min(now.getDate(), totalDays);

      const spendToDate = isCurrent
        ? (perfRows ?? []).reduce((acc: number, r: any) => {
            const iso = String(r?.[perfCols.dateCol] ?? "");
            const d = iso ? new Date(iso) : null;
            if (!d) return acc;
            if (d <= now) return acc + safeNumber(r?.[perfCols.spendCol]);
            return acc;
          }, 0)
        : spendMonth;

      const forecast = isCurrent && dayOfMonth > 0 ? (spendToDate / dayOfMonth) * totalDays : spendMonth;
      const pacing = plannedMonth > 0 ? spendMonth / plannedMonth : null;
      const netVariance = plannedMonth > 0 ? plannedMonth - forecast : null;

      const kpis: BudgetKpis = {
        plannedMonth: plannedMonth,
        spendMonth: spendMonth,
        forecast: plannedMonth > 0 ? forecast : null,
        netVariance,
        pacing,
      };

      return {
        kpis,
        dailySeries,
        unitRows,
        budgetHasUnitGranularity: !!budgetCols.unitCol,
      };
    },
  });

  const isLoading =
    budgetColsQuery.isLoading || perfColsQuery.isLoading || budgetDataQuery.isLoading;

  const error = (budgetColsQuery.error || perfColsQuery.error || budgetDataQuery.error) as any;

  const kpis = budgetDataQuery.data?.kpis;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <SupabaseDebugBanner />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Controle de Budget</h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva de orçado vs realizado (mês, unidade, curso e plataforma).
        </p>
      </header>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar dados</CardTitle>
            <CardDescription>
              Verifique permissões de leitura nas tabelas e os nomes das colunas (budget / spend).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{String(error?.message ?? error)}</pre>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="KPIs">
        <KpiCard
          title="Budget Total"
          value={isLoading ? "…" : kpis?.plannedMonth != null ? brl(kpis.plannedMonth) : "-"}
          hint="Soma do budget planejado"
        />
        <KpiCard
          title="Forecast"
          value={isLoading ? "…" : kpis?.forecast != null ? brl(kpis.forecast) : "-"}
          hint="Projeção de fechamento"
        />
        <KpiCard
          title="Net Variance"
          value={
            isLoading
              ? "…"
              : kpis?.netVariance != null
                ? brl(kpis.netVariance)
                : "-"
          }
          hint="Budget - forecast"
        />
        <KpiCard
          title="Pacing Global"
          value={isLoading ? "…" : kpis?.pacing != null ? pct(kpis.pacing) : "-"}
          hint="% gasto / budget"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Gráficos">
        <Card>
          <CardHeader>
            <CardTitle>Progresso de Budget por Unidade</CardTitle>
            <CardDescription>
              Planejado vs gasto (Top 12 por budget/spend). Unidade = campaign_name.
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
                  <BarChart
                    data={(budgetDataQuery.data?.unitRows ?? []).slice(0, 12)}
                    margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="unit" hide />
                    <YAxis tickFormatter={(v) => brl(Number(v))} width={90} />
                    <Tooltip
                      formatter={(value: any, name: any) => [brl(Number(value)), name]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Bar dataKey="planned" name="Planejado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spend" name="Gasto" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {!isLoading && budgetDataQuery.data && !budgetDataQuery.data.budgetHasUnitGranularity ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Aviso: seu fact_ads_budget não tem coluna de unidade/campaign_name; o gráfico por unidade usa apenas o gasto.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pacing Diário Acumulado</CardTitle>
            <CardDescription>Linha ideal vs curva real acumulada.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Carregando…
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={budgetDataQuery.data?.dailySeries ?? []}
                    margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickFormatter={(v) => format(new Date(v), "dd") as any} />
                    <YAxis tickFormatter={(v) => brl(Number(v))} width={90} />
                    <Tooltip formatter={(value: any) => brl(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="idealCum"
                      name="Ideal"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="spendCum"
                      name="Real"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Tabela matriz">
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Investimento</CardTitle>
            <CardDescription>
              Ordenada por maior budget (ou spend); sinaliza inconsistências (budget=0 e spend&gt;0).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid h-56 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Carregando…
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade (campaign)</TableHead>
                      <TableHead className="text-right">Planejado</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">Pacing</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(budgetDataQuery.data?.unitRows ?? []).slice(0, 50).map((r) => {
                      const pacing = r.planned > 0 ? r.spend / r.planned : null;
                      const variance = r.planned > 0 ? r.planned - r.spend : null;
                      const inconsistent = r.planned === 0 && r.spend > 0;

                      return (
                        <TableRow key={r.unit} className={inconsistent ? "bg-muted" : undefined}>
                          <TableCell className="max-w-[420px] truncate" title={r.unit}>
                            {r.unit}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{brl(r.planned)}</TableCell>
                          <TableCell className="text-right tabular-nums">{brl(r.spend)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {pacing != null ? pct(pacing) : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {variance != null ? brl(variance) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
