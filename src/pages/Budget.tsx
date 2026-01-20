import * as React from "react";
import { endOfMonth, format, isSameMonth, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
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
  totalLeads: number | null;
  cpl: number | null;
};

type UnitRow = {
  unit: string;
  planned: number;
  spend: number;
};

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// State type for Weekly Drawer
type SelectedUnitState = {
  unit: string;
  rows: WeeklyViewRow[];
} | null;

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
  const [selectedUnit, setSelectedUnit] = React.useState<SelectedUnitState>(null);

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
      filters.businessUnit ?? "__all__",
      filters.course ?? "__all__",
      filters.week ?? "__all__",
    ],
    enabled: !!client && !!budgetColsQuery.data,
    queryFn: async () => {
      const budgetCols = budgetColsQuery.data!;

      let fromDate: string;
      let toDate: string;

      if (filters.week) {
        // If week filter is active, restrict range to that week
        const wDate = new Date(filters.week);
        fromDate = format(startOfWeek(wDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        toDate = format(endOfWeek(wDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
      } else {
        // Otherwise use the full month view
        fromDate = format(startOfWeek(monthStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
        toDate = format(endOfWeek(monthEnd, { weekStartsOn: 1 }), "yyyy-MM-dd");
      }

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

      // --- Realizado (view semanal: vw_dashboard_semanal_detalhado)
      let weeklyQ = (client as SupabaseClient)
        .from("vw_dashboard_semanal_detalhado")
        .select("*")
        .gte("data_inicio_semana", fromDate)
        .lte("data_inicio_semana", toDate);

      if (filters.platform) weeklyQ = weeklyQ.eq("platform", filters.platform);
      if (filters.businessUnit) weeklyQ = weeklyQ.eq("business_unit", filters.businessUnit);
      if (filters.course) weeklyQ = weeklyQ.eq("course", filters.course);

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
        const leadsVal = r.leads ?? r.leads_total ?? r.conversions ?? 0;

        return {
          ...r,
          leads: Number(leadsVal),
          funnel_stage: meta.funnel ?? null,
          location: meta.location ?? null,
        };
      });

      console.log("WeeklyRows Debug:", {
        count: weeklyRows.length,
        sample: weeklyRows.slice(0, 3),
        totalLeads: weeklyRows.reduce((a, b) => a + Number(b.leads || 0), 0)
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

      const totalLeads = (weeklyRows ?? []).reduce((acc: number, r: WeeklyViewRow) => acc + safeNumber(r?.leads), 0);
      const cpl = totalLeads > 0 ? spendMonth / totalLeads : null;

      const kpis: BudgetKpis = {
        plannedMonth,
        spendMonth,
        spendSemEad,
        forecast: plannedMonth > 0 ? forecast : null,
        netVariance,
        pacing,
        totalLeads,
        cpl,
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="KPIs Financeiros">
        <KpiCard
          title="Budget Total"
          value={isLoading ? "…" : kpis?.plannedMonth != null ? brl(kpis.plannedMonth) : "-"}
          hint="Soma do budget planejado"
          tooltip="Valor total planejado para investimento em mídia no mês selecionado."
          status="neutral"
        />
        <KpiCard
          title="Gasto Realizado"
          value={isLoading ? "…" : kpis?.spendMonth != null ? brl(kpis.spendMonth) : "-"}
          hint="Valor executado até hoje"
          tooltip="Total já investido nas campanhas até o momento (Realizado)."
          status="neutral"
        />
        <KpiCard
          title="Pacing Global"
          value={isLoading ? "…" : kpis?.pacing != null ? pct(kpis.pacing) : "-"}
          hint="% gasto / budget"
          tooltip="Velocidade consumo do budget. Verde = Dentro do planejado."
          status={(() => {
            if (isLoading || kpis?.pacing == null) return "neutral";
            const now = new Date();
            const isCurrent = isSameMonth(monthStart, now);
            const totalDays = monthEnd.getDate();
            const dayOfMonth = isCurrent ? Math.min(now.getDate(), totalDays) : totalDays;
            const expectedPacing = dayOfMonth / totalDays;
            return getPacingStatus(kpis.pacing, expectedPacing);
          })()}
        />
        <KpiCard
          title="Net Variance"
          value={isLoading ? "…" : kpis?.netVariance != null ? brl(kpis.netVariance) : "-"}
          hint="Budget - Forecast"
          tooltip="Sobra ou falta projetada. Amarelo/Positivo = Sobra (Sub-investimento). Vermelho/Negativo = Estouro. Verde ~ 0."
          status={(() => {
            if (isLoading || kpis?.netVariance == null || kpis?.plannedMonth == null) return "neutral";
            const variance = kpis.netVariance;
            const threshold = kpis.plannedMonth * 0.05; // 5% de tolerância

            // Se sobrar muito dinheiro (Positivo > 5%), é ruim (Amarelo - Atenção Sub-investimento)
            if (variance > threshold) return "warning";

            // Se estourar o budget (Negativo < -5%), é ruim (Vermelho - Estouro)
            if (variance < -threshold) return "danger";

            // Se estiver próximo de 0 (dentro de +/- 5%), é bom (Verde - Execução Perfeita)
            return "success";
          })()}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 pt-2" aria-label="KPIs Performance">
        <KpiCard
          title="Forecast"
          value={isLoading ? "…" : kpis?.forecast != null ? brl(kpis.forecast) : "-"}
          hint="Projeção de fechamento"
          tooltip="Quanto vamos gastar se continuarmos no ritmo atual."
          status="neutral"
        />
        <KpiCard
          title="Leads Totais"
          value={isLoading ? "…" : kpis?.totalLeads != null ? kpis.totalLeads.toLocaleString('pt-BR') : "-"}
          hint="Volume de inscritos"
          tooltip="Total de leads gerados no período selecionado."
          status="neutral"
        />
        <KpiCard
          title="CPL Médio"
          value={isLoading ? "…" : kpis?.cpl != null ? brl(kpis.cpl) : "-"}
          hint="Custo por Lead"
          tooltip="Eficiência: Quanto custou cada lead em média (Gasto / Leads)."
          status={(() => {
            // Regra de exemplo: Abaixo de 50 é bom, acima de 100 é ruim? 
            // Como não temos meta definida no banco, deixamos neutro ou fixo por enquanto.
            // O usuário disse: Se CPL R$ 200 é fracasso.
            return "neutral";
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
              <div className="grid h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                Carregando… (Verifique se vw_dashboard_semanal_detalhado existe)
              </div>
            ) : (
              <InvestmentTreeTable
                data={budgetDataQuery.data?.weeklyRows ?? []}
                onViewWeekly={(node) => {
                  // Create WeeklyData from Node
                  const rows = budgetDataQuery.data?.weeklyRows ?? [];

                  // Filter rows based on Node Context
                  let filtered = rows;

                  // Logic based on level or ID analysis
                  // Level 0: Group (EAD, Branding, Mkt Conversão)
                  // Level 1: Subgroup or Unit/Platform
                  // Level 2: Course or Platform
                  // Level 3: Platform

                  // Simplistic filtering by matching strings - robust enough for display
                  const id = node.id.toLowerCase();
                  const label = node.label.toLowerCase();

                  if (id === "1-ead" || node.level === 0 && label.includes("ead")) {
                    filtered = rows.filter(r =>
                      (r.unidade?.toLowerCase().includes("ead") || r.curso?.toLowerCase().includes("ead"))
                    );
                  } else if (id === "2-branding" || node.level === 0 && label.includes("branding")) {
                    filtered = rows.filter(r =>
                      (r.funnel_stage?.toLowerCase().includes("brand") || r.unidade?.toLowerCase().includes("branding") || r.unidade?.toLowerCase().includes("institucional"))
                    );
                  } else if (id === "3-conversion") {
                    // Conversão = NOT EAD AND NOT Branding
                    filtered = rows.filter(r => {
                      const u = r.unidade?.toLowerCase() || "";
                      const c = r.curso?.toLowerCase() || "";
                      const f = r.funnel_stage?.toLowerCase() || "";

                      const isEad = u.includes("ead") || c.includes("ead") || u.startsWith("ead ");
                      const isBranding = f.includes("brand") || u.includes("branding") || u.includes("institucional");

                      return !isEad && !isBranding;
                    });
                  } else if (id.startsWith("ead-")) {
                    // EAD Platform specific
                    const platform = node.label.toLowerCase();
                    filtered = rows.filter(r =>
                      (r.unidade?.toLowerCase().includes("ead") || r.curso?.toLowerCase().includes("ead")) &&
                      r.plataforma?.toLowerCase() === platform
                    );
                  } else if (id.startsWith("brand-")) {
                    // Branding Platform specific
                    const platform = node.label.toLowerCase();
                    filtered = rows.filter(r =>
                      (r.funnel_stage?.toLowerCase().includes("brand") || r.unidade?.toLowerCase().includes("branding") || r.unidade?.toLowerCase().includes("institucional")) &&
                      r.plataforma?.toLowerCase() === platform
                    );
                  } else {
                    // Deeper levels
                    if (node.level === 1 && id.includes("med")) {
                      filtered = rows.filter(r => r.curso?.toLowerCase().includes("medicina"));
                    }
                    else if (id === "3.1-med") {
                      filtered = rows.filter(r => r.curso?.toLowerCase().includes("medicina"));
                    }
                    else if (id.startsWith("med-")) {
                      // Medicina Platform specific
                      const platform = node.label.toLowerCase();
                      filtered = rows.filter(r =>
                        r.curso?.toLowerCase().includes("medicina") &&
                        r.plataforma?.toLowerCase() === platform
                      );
                    }
                    else if (id === "3.2-courses") {
                      // 3.2 Cursos = Conversion (ALL) - Medicina
                      filtered = rows.filter(r => {
                        const u = r.unidade?.toLowerCase() || "";
                        const c = r.curso?.toLowerCase() || "";
                        const f = r.funnel_stage?.toLowerCase() || "";

                        const isEad = u.includes("ead") || c.includes("ead") || u.startsWith("ead ");
                        const isBranding = f.includes("brand") || u.includes("branding") || u.includes("institucional");
                        const isMed = c.includes("medicina");

                        return !isEad && !isBranding && !isMed;
                      });
                    }
                    else if (id.startsWith("unit-")) {
                      // Filter by label appearance in rows + Context of "3.2 Cursos" (Not EAD, Not Branding, Not Med)
                      const search = node.label.toLowerCase();

                      const isTargetGroup = (r: any) => {
                        const u = r.unidade?.toLowerCase() || "";
                        const c = r.curso?.toLowerCase() || "";
                        const f = r.funnel_stage?.toLowerCase() || "";

                        const isEad = u.includes("ead") || c.includes("ead") || u.startsWith("ead ");
                        const isBranding = f.includes("brand") || u.includes("branding") || u.includes("institucional");
                        const isMed = c.includes("medicina");

                        return !isEad && !isBranding && !isMed;
                      };

                      if (node.level === 2) {
                        // Likely a Unit in "3.2 Cursos" -> "Ulbra Canoas"
                        filtered = rows.filter(r => r.unidade?.toLowerCase() === search && isTargetGroup(r));
                      } else if (node.level === 3) {
                        // Level 3: Unit -> Course
                        // ID format: `unit-${unitLabel}-${courseLabel}`
                        // We must parse the ID to get the UNIT name, because "Geral" or "Psicologia" interacts with multiple units.
                        const parts = id.split("-");
                        if (parts.length >= 3) {
                          // parts[0] = "unit"
                          // parts[1] = Unit Name (might contain dashes? NO, unit key logic in TreeTable uses unitLabel directly. If unit has dashes, we might have issues. Assuming logic matches TreeTable creation)
                          // TreeTable construction: id: `unit-${unitLabel}-${courseLabel}`
                          const unitName = parts[1];
                          const courseName = parts.slice(2).join("-"); // Course name might have dashes

                          filtered = rows.filter(r =>
                            r.unidade?.toLowerCase() === unitName.toLowerCase() &&
                            (r.curso?.toLowerCase() === courseName.toLowerCase() || (courseName.toLowerCase() === 'geral' && r.curso === null)) &&
                            isTargetGroup(r)
                          );
                        } else {
                          // Fallback if ID parsing fails
                          filtered = rows.filter(r => (r.curso?.toLowerCase() === search || (search === 'geral' && r.curso === null)) && isTargetGroup(r));
                        }
                      } else if (node.level === 4) {
                        // Level 4: Unit -> Course -> Platform
                        // ID format: `unit-${unitLabel}-${courseLabel}-${platform}`
                        const parts = id.split("-");
                        if (parts.length >= 4) {
                          const unitName = parts[1];
                          const platformName = parts[parts.length - 1]; // Last part is platform
                          const courseName = parts.slice(2, parts.length - 1).join("-");

                          filtered = rows.filter(r =>
                            r.unidade?.toLowerCase() === unitName.toLowerCase() &&
                            (r.curso?.toLowerCase() === courseName.toLowerCase() || (courseName.toLowerCase() === 'geral' && r.curso === null)) &&
                            r.plataforma?.toLowerCase() === platformName.toLowerCase() &&
                            isTargetGroup(r)
                          );
                        }
                      }
                    }
                  }

                  // Fallback: If level >= 2 and we are unsure, just filter by text matching unit or course column
                  if (node.level >= 2 && !id.startsWith("unit-") && !id.startsWith("med-")) {
                    const txt = node.label.toLowerCase();
                    filtered = rows.filter(r =>
                      r.unidade?.toLowerCase() === txt ||
                      r.curso?.toLowerCase() === txt ||
                      r.plataforma?.toLowerCase() === txt
                    );
                  }

                  setSelectedUnit({
                    unit: node.label,
                    planned: node.budget,
                    real: node.spend,
                    rows: filtered
                  });
                }}
              />
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
        unitName={selectedUnit?.unit ?? null}
        weeklyData={(() => {
          if (!selectedUnit) return [];
          const byWeek = new Map<string, { semana: string; weekStart: string; orcado: number; realizado: number }>();

          for (const r of selectedUnit.rows) {
            // Already filtered by onViewWeekly logic
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
