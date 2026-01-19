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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type InvestmentMatrixUnitGroup } from "@/components/budget/InvestmentMatrix";
import { InvestmentTreeTable } from "@/components/budget/InvestmentTreeTable";
import { KpiCard, getPacingStatus, type KpiStatus } from "@/components/budget/KpiCard";
import { WeeklyDrawer, type WeeklyData } from "@/components/budget/WeeklyDrawer";
import { WeeklyComparisonChart } from "@/components/budget/WeeklyComparisonChart";
import { FunnelStrategyChart } from "@/components/budget/FunnelStrategyChart";
import { ChartTooltip } from "@/components/budget/ChartTooltip";
import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolveBudgetColumns } from "@/integrations/supabase/budgetSchema";

type WeeklyViewRow = {
  data_inicio_semana: string; // date
  semana_label: string;
  unidade: string | null;
  plataforma: string | null;
  curso: string | null;
  orcamento_semanal: number | string | null;
  gasto_real: number | string | null;
  diferenca: number | string | null;
  leads: number | string | null;
  percentual_consumido: number | string | null;
  funnel_stage?: string | null;
  location?: string | null;
};

type BudgetKpis = {
  plannedMonth: number | null;
  spendMonth: number | null;
  spendSemEad: number | null;
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

  // Estado para drill-down semanal
  const [selectedUnit, setSelectedUnit] = React.useState<string | null>(null);

  const monthStart = startOfMonth(filters.month);
  const monthEnd = endOfMonth(filters.month);

  const budgetColsQuery = useQuery({
    queryKey: ["budget", "cols"],
    queryFn: () => resolveBudgetColumns(client as SupabaseClient),
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
      filters.course ?? "__all__",
    ],
    enabled: !!client && !!budgetColsQuery.data,
    queryFn: async () => {
      const budgetCols = budgetColsQuery.data!;

      const fromDate = format(monthStart, "yyyy-MM-dd");
      const toDate = format(monthEnd, "yyyy-MM-dd");

      // --- Budget (planejado)
      const budgetSelectCols = Array.from(
        new Set(
          [budgetCols.monthCol, budgetCols.plannedCol, budgetCols.platformCol, budgetCols.unitCol].filter(Boolean) as string[]
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

      // --- Realizado (view semanal)
      let weeklyQ = (client as SupabaseClient)
        .from("vw_dashboard_semanal_detalhado")
        .select(
          "data_inicio_semana,semana_label,unidade,plataforma,curso,orcamento_semanal,gasto_real,diferenca,leads,percentual_consumido",
        )
        .gte("data_inicio_semana", fromDate)
        .lte("data_inicio_semana", toDate);

      if (filters.platform) weeklyQ = weeklyQ.eq("plataforma", filters.platform);
      if (filters.businessUnit) weeklyQ = weeklyQ.eq("unidade", filters.businessUnit);
      if (filters.course) weeklyQ = weeklyQ.eq("curso", filters.course);

      const { data: weeklyRowsRaw, error: weeklyErr } = await weeklyQ;
      if (weeklyErr) throw weeklyErr;

      // Buscar metadados (funnel, location) da tabela bruta (fact_ads_budget)
      // para enriquecer a view semanal que pode não ter essas colunas.
      let metadataMap = new Map<string, { funnel?: string; location?: string }>();

      const metaCols = [
        budgetCols.unitCol,
        budgetCols.funnelCol,
        budgetCols.locationCol
      ].filter(Boolean) as string[];

      // Só busca se tivermos configurado colunas de unidade e funil/local
      if (budgetCols.unitCol && (budgetCols.funnelCol || budgetCols.locationCol)) {
        // Pequeno hack: buscar distinct units/funnels. 
        // Supabase não tem select distinct fácil via JS client numa única query sem RPC.
        // Vamos buscar tudo (filtrado pelo mês/filtro) e de-duplicar no cliente.
        // Limitando colunas para leveza.
        let metaQ = (client as SupabaseClient)
          .from("fact_ads_budget")
          .select(metaCols.join(","))
          .gte(budgetCols.monthCol, fromDate)
          .lte(budgetCols.monthCol, toDate);

        if (filters.businessUnit && budgetCols.unitCol) {
          metaQ = metaQ.eq(budgetCols.unitCol, filters.businessUnit);
        }

        const { data: metaData } = await metaQ;

        if (metaData) {
          metaData.forEach((row: any) => {
            const u = row[budgetCols.unitCol!] as string;
            if (!u) return;
            // De-duplicate: first implies last seen or just ignore overwrite
            if (!metadataMap.has(u)) {
              const funnel = budgetCols.funnelCol ? row[budgetCols.funnelCol] : null;
              const location = budgetCols.locationCol ? row[budgetCols.locationCol] : null;
              metadataMap.set(u, { funnel, location });
            }
          });
        }
      }

      const weeklyRows: WeeklyViewRow[] = (weeklyRowsRaw ?? []).map((r) => {
        const unit = r.unidade ?? "";
        const meta = metadataMap.get(unit) ?? {};
        return {
          ...r,
          funnel_stage: meta.funnel ?? null,
          location: meta.location ?? null,
        };
      });

      const plannedMonth = (budgetRows ?? []).reduce((acc: number, r: any) => acc + safeNumber(r?.[budgetCols.plannedCol]), 0);

      const spendMonth = (weeklyRows ?? []).reduce(
        (acc: number, r: WeeklyViewRow) => acc + safeNumber(r?.gasto_real),
        0
      );

      // Função helper para verificar se é EAD
      const isEadUnit = (unit: string) => {
        const u = unit.toLowerCase();
        return u.includes('ead') || u === '1. ead' || u.startsWith('ead ');
      };

      // Gasto sem EAD
      const spendSemEad = (weeklyRows ?? []).reduce(
        (acc: number, r: WeeklyViewRow) => {
          const unit = String(r?.unidade ?? "").trim();
          if (isEadUnit(unit)) return acc;
          return acc + safeNumber(r?.gasto_real);
        },
        0
      );

      // Série "semanal" (pacing acumulado)
      const byWeek = new Map<string, { spend: number; label: string }>();
      for (const r of (weeklyRows ?? []) as WeeklyViewRow[]) {
        const iso = String(r?.data_inicio_semana ?? "").slice(0, 10);
        if (!iso) continue;
        const curr = byWeek.get(iso) ?? { spend: 0, label: r?.semana_label ?? iso };
        curr.spend += safeNumber(r?.gasto_real);
        if (r?.semana_label) curr.label = r.semana_label;
        byWeek.set(iso, curr);
      }

      const weeksSorted = Array.from(byWeek.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, v]) => ({ weekStart, spend: v.spend, label: v.label }));

      let running = 0;
      const dailySeries = weeksSorted.map((w) => {
        running += w.spend;
        const d = new Date(w.weekStart);
        const dayOfMonth = Number(format(d, "dd"));
        const totalDays = monthEnd.getDate();
        const weekEndDay = Math.min(dayOfMonth + 6, totalDays);
        const ideal = plannedMonth > 0 ? (plannedMonth * weekEndDay) / totalDays : 0;
        return { day: w.weekStart, label: w.label, spendCum: running, idealCum: ideal };
      });

      // Matriz por unidade (detalhe Unidade > Curso > Plataforma) usando a view semanal
      const labelOr = (v: string | null | undefined, fallback: string) => {
        const s = String(v ?? "").trim();
        return s ? s : fallback;
      };

      type Agg = { budget: number; spend: number };
      const unitAgg = new Map<string, Agg>();
      const courseAgg = new Map<string, Agg>(); // key: unit||course
      const platformAgg = new Map<string, Agg>(); // key: unit||course||platform

      for (const r of (weeklyRows ?? []) as WeeklyViewRow[]) {
        const unit = labelOr(r.unidade, "(Sem unidade)");
        const platform = labelOr(r.plataforma, "(Sem plataforma)");
        const course = labelOr(r.curso, "(Sem curso)");

        const budget = safeNumber(r.orcamento_semanal);
        const spend = safeNumber(r.gasto_real);

        const uKey = unit;
        const cKey = `${unit}||${course}`;
        const pKey = `${unit}||${course}||${platform}`;

        const u = unitAgg.get(uKey) ?? { budget: 0, spend: 0 };
        u.budget += budget;
        u.spend += spend;
        unitAgg.set(uKey, u);

        const c = courseAgg.get(cKey) ?? { budget: 0, spend: 0 };
        c.budget += budget;
        c.spend += spend;
        courseAgg.set(cKey, c);

        const p = platformAgg.get(pKey) ?? { budget: 0, spend: 0 };
        p.budget += budget;
        p.spend += spend;
        platformAgg.set(pKey, p);
      }

      const investmentMatrix: InvestmentMatrixUnitGroup[] = Array.from(unitAgg.entries())
        .map(([unit, u]) => {
          const courses = Array.from(courseAgg.entries())
            .filter(([k]) => k.startsWith(`${unit}||`))
            .map(([k, cAgg]) => {
              const course = k.split("||")[1] ?? "(Sem curso)";

              const platforms = Array.from(platformAgg.entries())
                .filter(([pk]) => pk.startsWith(`${unit}||${course}||`))
                .map(([pk, pAgg]) => {
                  const platform = pk.split("||")[2] ?? "(Sem plataforma)";
                  return { platform, budget: pAgg.budget, spend: pAgg.spend };
                })
                .sort((a, b) => (b.budget || b.spend) - (a.budget || a.spend));

              return {
                course,
                budget: cAgg.budget,
                spend: cAgg.spend,
                platforms,
              };
            })
            .sort((a, b) => (b.budget || b.spend) - (a.budget || a.spend));

          return { unit, budget: u.budget, spend: u.spend, courses };
        })
        .filter((u) => u.unit !== "(Sem unidade)")
        .sort((a, b) => (b.budget || b.spend) - (a.budget || a.spend));

      // Matriz simples por unidade (para gráficos existentes)
      const plannedByUnit = new Map<string, number>();
      if (budgetCols.unitCol) {
        for (const r of budgetRows ?? []) {
          const unit = String(r?.[budgetCols.unitCol] ?? "").trim();
          if (!unit) continue;
          plannedByUnit.set(unit, (plannedByUnit.get(unit) ?? 0) + safeNumber(r?.[budgetCols.plannedCol]));
        }
      }

      const spendByUnit = new Map<string, number>();
      for (const r of (weeklyRows ?? []) as WeeklyViewRow[]) {
        const unit = String(r?.unidade ?? "").trim();
        if (!unit) continue;
        spendByUnit.set(unit, (spendByUnit.get(unit) ?? 0) + safeNumber(r?.gasto_real));
      }

      const unitKeys = Array.from(new Set([...plannedByUnit.keys(), ...spendByUnit.keys()]));
      const unitRows: UnitRow[] = unitKeys
        .map((u) => ({ unit: u, planned: plannedByUnit.get(u) ?? 0, spend: spendByUnit.get(u) ?? 0 }))
        .sort((a, b) => (b.planned || b.spend) - (a.planned || a.spend));

      // KPIs (forecast simples)
      const now = new Date();
      const isCurrent = isSameMonth(monthStart, now);
      const totalDays = monthEnd.getDate();
      const dayOfMonth = Math.min(now.getDate(), totalDays);

      const spendToDate = isCurrent
        ? (weeklyRows ?? []).reduce((acc: number, r: WeeklyViewRow) => {
          const iso = String(r?.data_inicio_semana ?? "");
          const d = iso ? new Date(iso) : null;
          if (!d) return acc;
          if (d <= now) return acc + safeNumber(r?.gasto_real);
          return acc;
        }, 0)
        : spendMonth;

      const forecast = isCurrent && dayOfMonth > 0 ? (spendToDate / dayOfMonth) * totalDays : spendMonth;
      const pacing = plannedMonth > 0 ? spendMonth / plannedMonth : null;
      const netVariance = plannedMonth > 0 ? plannedMonth - forecast : null;

      const kpis: BudgetKpis = {
        plannedMonth,
        spendMonth,
        spendSemEad,
        forecast: plannedMonth > 0 ? forecast : null,
        netVariance,
        pacing,
      };

      return {
        kpis,
        dailySeries,
        unitRows,
        investmentMatrix,
        weeklyRows,
        budgetHasUnitGranularity: !!budgetCols.unitCol,
      };
    },
  });

  const isLoading = budgetColsQuery.isLoading || budgetDataQuery.isLoading;

  const error = (budgetColsQuery.error || budgetDataQuery.error) as any;

  const kpis = budgetDataQuery.data?.kpis;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" aria-label="KPIs">
        <KpiCard
          title="Budget Total"
          value={isLoading ? "…" : kpis?.plannedMonth != null ? brl(kpis.plannedMonth) : "-"}
          hint="Soma do budget planejado"
          tooltip="Valor total planejado para investimento em mídia no mês selecionado, considerando todas as unidades e plataformas."
          status="neutral"
        />
        <KpiCard
          title="Forecast"
          value={isLoading ? "…" : kpis?.forecast != null ? brl(kpis.forecast) : "-"}
          hint="Projeção de fechamento"
          tooltip="Estimativa de quanto será gasto até o fim do mês, baseado no ritmo atual de consumo. Calculado como: (gasto até hoje / dia do mês) × total de dias."
          status={(() => {
            if (isLoading || kpis?.forecast == null || kpis?.plannedMonth == null) return "neutral";
            const ratio = kpis.forecast / kpis.plannedMonth;
            if (ratio <= 1.05) return "success";
            if (ratio <= 1.15) return "warning";
            return "danger";
          })()}
          trend={(() => {
            if (isLoading || kpis?.forecast == null || kpis?.plannedMonth == null) return undefined;
            const ratio = kpis.forecast / kpis.plannedMonth;
            if (ratio > 1.05) return "up";
            if (ratio < 0.95) return "down";
            return "stable";
          })()}
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
          tooltip="Diferença entre o budget planejado e o forecast. Valor positivo indica economia projetada; negativo indica estouro."
          status={(() => {
            if (isLoading || kpis?.netVariance == null) return "neutral";
            if (kpis.netVariance >= 0) return "success";
            if (kpis.netVariance >= -kpis.plannedMonth! * 0.1) return "warning";
            return "danger";
          })()}
          trend={(() => {
            if (isLoading || kpis?.netVariance == null) return undefined;
            if (kpis.netVariance > 0) return "up";
            if (kpis.netVariance < 0) return "down";
            return "stable";
          })()}
        />
        <KpiCard
          title="Pacing Global"
          value={isLoading ? "…" : kpis?.pacing != null ? pct(kpis.pacing) : "-"}
          hint="% gasto / budget"
          tooltip="Percentual do budget já consumido. Compare com o progresso do mês (ex: dia 15 de um mês de 30 = 50% esperado). Verde = on track, Vermelho = desvio."
          status={(() => {
            if (isLoading || kpis?.pacing == null) return "neutral";
            // Calcular o progresso esperado do mês
            const now = new Date();
            const isCurrent = isSameMonth(monthStart, now);
            const totalDays = monthEnd.getDate();
            const dayOfMonth = isCurrent ? Math.min(now.getDate(), totalDays) : totalDays;
            const expectedPacing = dayOfMonth / totalDays;
            return getPacingStatus(kpis.pacing, expectedPacing);
          })()}
          trend={(() => {
            if (isLoading || kpis?.pacing == null) return undefined;
            // Calcular o progresso esperado do mês
            const now = new Date();
            const isCurrent = isSameMonth(monthStart, now);
            const totalDays = monthEnd.getDate();
            const dayOfMonth = isCurrent ? Math.min(now.getDate(), totalDays) : totalDays;
            const expectedPacing = dayOfMonth / totalDays;
            if (kpis.pacing > expectedPacing * 1.1) return "up";
            if (kpis.pacing < expectedPacing * 0.9) return "down";
            return "stable";
          })()}
          trendLabel={(() => {
            if (isLoading || kpis?.pacing == null) return undefined;
            const now = new Date();
            const isCurrent = isSameMonth(monthStart, now);
            const totalDays = monthEnd.getDate();
            const dayOfMonth = isCurrent ? Math.min(now.getDate(), totalDays) : totalDays;
            const expectedPacing = dayOfMonth / totalDays;
            const diff = ((kpis.pacing - expectedPacing) * 100).toFixed(0);
            return `${Number(diff) > 0 ? "+" : ""}${diff}pp`;
          })()}
        />
        <KpiCard
          title="Gasto Presencial"
          value={isLoading ? "…" : kpis?.spendSemEad != null ? brl(kpis.spendSemEad) : "-"}
          hint="Total sem EAD"
          tooltip="Gasto acumulado excluindo unidades de EAD. Útil para analisar o investimento apenas no ensino presencial."
          status={(() => {
            if (isLoading || kpis?.spendSemEad == null || kpis?.spendMonth == null) return "neutral";
            return "neutral";
          })()}
          trendLabel={(() => {
            if (isLoading || kpis?.spendSemEad == null || kpis?.spendMonth == null || kpis.spendMonth === 0) return undefined;
            const eadSpend = kpis.spendMonth - kpis.spendSemEad;
            const eadPct = (eadSpend / kpis.spendMonth) * 100;
            return `EAD: ${eadPct.toFixed(0)}%`;
          })()}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Gráficos">
        <Card>
          <CardHeader>
            <CardTitle>Progresso de Budget por Unidade</CardTitle>
            <CardDescription>Planejado vs gasto (Top 12 por budget/spend).</CardDescription>
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
                    margin={{ top: 8, right: 30, bottom: 8, left: 45 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="unit"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                      width={80}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    />
                    <Bar dataKey="planned" name="Planejado" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="spend" name="Gasto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
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
            <CardTitle>Pacing Semanal Acumulado</CardTitle>
            <CardDescription>Linha ideal vs curva real (acumulado por início de semana).</CardDescription>
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
                    margin={{ top: 8, right: 30, bottom: 8, left: 45 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(v) => format(new Date(v), "dd") as any}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                      width={80}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                    />
                    <Line
                      type="monotone"
                      dataKey="idealCum"
                      name="Ideal"
                      stroke="#cbd5e1"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="spendCum"
                      name="Real"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </section>

      <section aria-label="Visão Estratégica" className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyComparisonChart data={budgetDataQuery.data?.weeklyRows ?? []} />
        </div>
        <div>
          <FunnelStrategyChart data={budgetDataQuery.data?.investmentMatrix ?? []} />
        </div>
      </section>

      <section aria-label="Tabela matriz">
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Investimento</CardTitle>
            <CardDescription>
              Visão hierárquica por estratégia, unidade e localização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid h-56 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Carregando…
              </div>
            ) : (
              <InvestmentTreeTable data={budgetDataQuery.data?.weeklyRows ?? []} />
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="text-xs text-muted-foreground">
        Filtros ativos: {JSON.stringify({ ...filters, month: filters.month.toISOString().slice(0, 10) })}
      </footer>

      {/* Drawer de drill-down semanal */}
      <WeeklyDrawer
        open={selectedUnit !== null}
        onOpenChange={(open) => !open && setSelectedUnit(null)}
        unitName={selectedUnit}
        weeklyData={(() => {
          if (!selectedUnit) return [];
          // Agregar dados semanais para a unidade selecionada
          const weeklyRows = budgetDataQuery.data?.weeklyRows ?? [];
          const byWeek = new Map<string, { semana: string; weekStart: string; orcado: number; realizado: number }>();

          for (const r of weeklyRows as any[]) {
            const unit = String(r?.unidade ?? "").trim();
            if (unit !== selectedUnit) continue;

            const weekStart = String(r?.data_inicio_semana ?? "").slice(0, 10);
            if (!weekStart) continue;

            const curr = byWeek.get(weekStart) ?? {
              semana: r?.semana_label ?? weekStart,
              weekStart,
              orcado: 0,
              realizado: 0
            };
            curr.orcado += Number(r?.orcamento_semanal ?? 0) || 0;
            curr.realizado += Number(r?.gasto_real ?? 0) || 0;
            if (r?.semana_label) curr.semana = r.semana_label;
            byWeek.set(weekStart, curr);
          }

          return Array.from(byWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        })()}
      />
    </div >
  );
}
