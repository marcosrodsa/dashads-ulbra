import * as React from "react";
import { endOfMonth, format, isSameMonth, startOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ComposedChart,
  Area,
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
import { PlatformDonutChart } from "@/components/budget/PlatformDonutChart";
import { ChartTooltip } from "@/components/budget/ChartTooltip";
import { DashboardFilterBar } from "@/components/budget/DashboardFilterBar";
import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolveBudgetColumns } from "@/integrations/supabase/budgetSchema";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";
import { resolvePerformanceMetricColumns } from "@/integrations/supabase/performanceMetricsSchema";

type WeeklyViewRow = {
  data_inicio_semana: string; // date
  semana_label: string;
  unidade: string | null;
  plataforma: string | null;
  curso: string | null;
  orcamento_semanal: number;
  gasto_real: number;
  diferenca: number;
  leads: number;
  percentual_consumido: number;
  funnel_stage?: string | null;
  location?: string | null;
};

type BudgetKpis = {
  plannedTotal: number | null;
  spendTotal: number | null;
  spendSemEad: number | null;
  spendBranding: number | null;
  forecast: number | null;
  netVariance: number | null;
  pacing: number | null;
  totalLeads: number | null;
  performanceLeads: number | null;
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

  // Use selected range or fallback to current month
  const rangeStart = filters.dateRange?.from ?? startOfMonth(new Date());
  // Fix: If 'to' is missing (single day selection), use 'from' instead of end of month.
  const rangeEnd = filters.dateRange?.to ?? filters.dateRange?.from ?? endOfMonth(rangeStart);

  // Calculate Effective Range (Week takes precedence)
  let effectiveStart = rangeStart;
  let effectiveEnd = rangeEnd;

  if (filters.week) {
    const datePart = String(filters.week).slice(0, 10);
    const wDate = new Date(`${datePart}T00:00:00`);
    effectiveStart = startOfWeek(wDate, { weekStartsOn: 1 });
    effectiveEnd = endOfWeek(wDate, { weekStartsOn: 1 });
  } else {
    effectiveStart = rangeStart;
    effectiveEnd = rangeEnd;
  }


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
      format(effectiveStart, "yyyy-MM-dd"),
      format(effectiveEnd, "yyyy-MM-dd"),
      filters.platform ?? "__all__",
      filters.businessUnit ?? "__all__",
      filters.businessUnit ?? "__all__", // Duplicate in original? Keeping structure.
      filters.course ?? "__all__",
      filters.week ?? "__all__",
    ],
    enabled: !!client && !!budgetColsQuery.data,
    queryFn: async () => {
      const budgetCols = budgetColsQuery.data!;

      const effectiveStartStr = format(effectiveStart, "yyyy-MM-dd");
      const effectiveEndStr = format(effectiveEnd, "yyyy-MM-dd");

      let budgetFromDate: string;
      let budgetToDate: string;
      let weeklyFromDate: string;
      let weeklyToDate: string;

      budgetFromDate = format(startOfMonth(effectiveStart), "yyyy-MM-dd");
      budgetToDate = format(endOfMonth(effectiveEnd), "yyyy-MM-dd");

      // Weekly needs to cover the weeks involved accurately. 
      // Fix: Subtract 1 day from endOfWeek to avoid capturing the *start* of the next week if it falls on Sunday.
      weeklyFromDate = format(startOfWeek(effectiveStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
      weeklyToDate = format(subDays(endOfWeek(effectiveEnd, { weekStartsOn: 1 }), 1), "yyyy-MM-dd");

      // --- Budget (planejado)
      const budgetSelectCols = Array.from(
        new Set(
          [budgetCols.monthCol, budgetCols.plannedCol, budgetCols.platformCol, budgetCols.unitCol].filter(Boolean) as string[]
        )
      ).join(",");

      let budgetQ = (client as SupabaseClient)
        .from("fact_ads_budget")
        .select(budgetSelectCols)
        .gte(budgetCols.monthCol, budgetFromDate)
        .lte(budgetCols.monthCol, budgetToDate);

      if (budgetCols.platformCol && filters.platform) {
        budgetQ = budgetQ.eq(budgetCols.platformCol, filters.platform);
      }

      // Helper to match Filter Unit -> Budget Unit Aliases
      // This ensures that when user filters by "Ulbra Institucional", we still fetch the budget for "2. Branding"
      const expandUnitFilter = (unitFilter: string) => {
        const u = unitFilter.toLowerCase();
        if (u.includes("institucional") || u.includes("branding")) {
          return ["Ulbra Institucional", "Institucional", "Branding", "2. Branding", "Ulbra Branding"];
        }
        if (u.includes("ead") || u.includes("ulbra pop")) {
          return ["1. EAD", "Ulbra EAD", "EAD", "Ulbra Pop", "Ulbra Ead"];
        }

        // For other units, include both raw and "Ulbra " prefixed versions
        const clean = unitFilter.replace(/^ulbra\s+/i, "").trim();
        return [clean, `Ulbra ${clean}`, `ulbra ${clean.toLowerCase()}`, clean.toLowerCase()];
      };

      if (budgetCols.unitCol && filters.businessUnit) {
        const units = expandUnitFilter(filters.businessUnit);
        budgetQ = budgetQ.in(budgetCols.unitCol, units);
      }

      const { data: budgetRows, error: budgetErr } = await budgetQ;
      if (budgetErr) throw budgetErr;

      // --- Exact Daily Data for KPI Cards (Realized Spend & Leads) ---

      // Select Columns from View instead of raw TABLE
      const viewDateCol = "data_referencia";
      const viewSpendCol = "investimento";
      const viewLeadsCol = "leads";
      const viewUnitCol = "unidade";
      const viewCourseCol = "curso";
      const viewPlatformCol = "platform";
      const viewFunnelCol = "funnel_stage"; // Needed for branding check? "funnel_stage" might not be in view, checking Performance.tsx logic...
      // Performance.tsx uses: r.unidade === "Branding" || r.curso === "Branding" ...

      const selectCols = [viewDateCol, viewSpendCol, viewLeadsCol, viewUnitCol, viewCourseCol, viewPlatformCol];

      let dailyQ = (client as SupabaseClient)
        .from("vw_performance_diaria2")
        .select(selectCols.join(", "))
        .gte(viewDateCol, effectiveStartStr)
        .lte(viewDateCol, effectiveEndStr);
      // Note: View already excludes Ultec, no need for manual exclusion unless paranoid. Let's trust the view.

      if (filters.platform) dailyQ = dailyQ.eq(viewPlatformCol, filters.platform);

      // Keep Daily Query STRICT (Show spend only for selected unit)
      if (filters.businessUnit) dailyQ = dailyQ.eq(viewUnitCol, filters.businessUnit);

      if (filters.course) dailyQ = dailyQ.eq(viewCourseCol, filters.course);

      const { data: dailyRows, error: dailyErr } = await dailyQ;
      if (dailyErr) throw dailyErr;

      const exactSpend = (dailyRows ?? []).reduce((acc, r) => acc + (Number(r[viewSpendCol]) || 0), 0);
      const exactLeads = (dailyRows ?? []).reduce((acc, r) => acc + (Number(r[viewLeadsCol]) || 0), 0);

      const brandingRows = (dailyRows ?? []).filter((r) => {
        const u = (r[viewUnitCol] ?? "").toString().toLowerCase();
        const c = (r[viewCourseCol] ?? "").toString().toLowerCase();
        return u.includes("branding") || u.includes("institucional") || c.includes("branding");
      });

      const exactBrandingSpend = brandingRows.reduce((acc, r) => acc + (Number(r[viewSpendCol]) || 0), 0);
      const exactBrandingLeads = brandingRows.reduce((acc, r) => acc + (Number(r[viewLeadsCol]) || 0), 0);

      // --- Realizado (view semanal: vw_dashboard_semanal_detalhado2) - Mantido para os Gráficos de Pacing
      let weeklyQ = (client as SupabaseClient)
        .from("vw_dashboard_semanal_detalhado2")
        .select("*")
        .gte("data_inicio_semana", weeklyFromDate)
        .lte("data_inicio_semana", weeklyToDate);



      if (filters.platform) weeklyQ = weeklyQ.eq("plataforma", filters.platform);

      // Expand Weekly Query Filters (Bring Budget for synonyms)
      if (filters.businessUnit) {
        const units = expandUnitFilter(filters.businessUnit);
        weeklyQ = weeklyQ.in("unidade", units);
      }

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
          .gte(budgetCols.monthCol, budgetFromDate)
          .lte(budgetCols.monthCol, budgetToDate);

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
          orcamento_semanal: safeNumber(r.orcamento_semanal),
          gasto_real: safeNumber(r.gasto_real),
          diferenca: safeNumber(r.diferenca),
          leads: Number(leadsVal),
          percentual_consumido: safeNumber(r.percentual_consumido),
          funnel_stage: meta.funnel ?? null,
          location: meta.location ?? null,
        };
      });


      const plannedTotal = (weeklyRows ?? []).reduce((acc: number, r: any) => acc + safeNumber(r?.orcamento_semanal), 0);

      // Use exact spend from daily data (already calculated above)
      const spendTotal = exactSpend;

      // Legacy block removed: branding spend is now calculated from daily rows.
      // let spendBranding = 0; 

      /* Legacy strategyQ block removed. spendBranding is already calculated via dailyRows. */

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

      // Filter weeks based on week filter (if set)
      const filteredWeeks = weeksSorted;

      let dailySeries: { day: string; label: string; spendCum: number; idealCum: number }[] = [];
      const showDailyGranularity = !!filters.week;

      if (showDailyGranularity) {
        const byDay = new Map<string, number>();
        for (const r of (dailyRows ?? [])) {
          const d = String(r[viewDateCol]).slice(0, 10);
          if (!d) continue;
          byDay.set(d, (byDay.get(d) ?? 0) + (Number(r[viewSpendCol]) || 0));
        }
        const startD = effectiveStart;
        const endD = effectiveEnd;
        const totalDays = Math.max(1, (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);
        let running = 0;
        let currentD = new Date(startD);
        while (currentD <= endD) {
          const dayStr = format(currentD, "yyyy-MM-dd");
          const spend = byDay.get(dayStr) ?? 0;
          running += spend;
          const daysElapsed = (currentD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1;
          const ideal = plannedTotal > 0 ? (plannedTotal * daysElapsed) / totalDays : 0;
          dailySeries.push({
            day: dayStr,
            label: format(currentD, "dd/MM"),
            spendCum: running,
            idealCum: ideal
          });
          currentD.setDate(currentD.getDate() + 1);
        }
      } else {
        let running = 0;
        dailySeries = filteredWeeks.map((w) => {
          running += w.spend;

          // Calculate ideal based on Effective Period
          const startD = effectiveStart;
          const endD = effectiveEnd;
          const totalDays = Math.max(1, (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);

          // Week End relative to Period Start
          const weekEnd = endOfWeek(new Date(w.weekStart), { weekStartsOn: 1 });
          const cappedWeekEnd = weekEnd > endD ? endD : weekEnd;

          const daysElapsed = Math.max(0, (cappedWeekEnd.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);

          const ideal = plannedTotal > 0 ? (plannedTotal * daysElapsed) / totalDays : 0;
          return { day: w.weekStart, label: w.label, spendCum: running, idealCum: ideal };
        });
      }

      // Matriz por unidade (detalhe Unidade > Curso > Plataforma) usando a view semanal
      const labelOr = (v: string | null | undefined, fallback: string) => {
        const s = String(v ?? "").trim();
        return s ? s : fallback;
      };

      type Agg = { budget: number; spend: number };
      const unitAgg = new Map<string, Agg>();
      const courseAgg = new Map<string, Agg>(); // key: unit||course
      const platformAgg = new Map<string, Agg>(); // key: unit||course||platform

      // Pass 1: Budget from Weekly Data
      for (const r of (weeklyRows ?? []) as WeeklyViewRow[]) {
        const unit = labelOr(r.unidade, "(Sem unidade)");
        const platform = labelOr(r.plataforma, "(Sem plataforma)");
        const course = labelOr(r.curso, "(Sem curso)");
        const budget = safeNumber(r.orcamento_semanal);

        const uKey = unit;
        const cKey = `${unit}||${course}`;
        const pKey = `${unit}||${course}||${platform}`;

        const u = unitAgg.get(uKey) ?? { budget: 0, spend: 0 };
        u.budget += budget;
        unitAgg.set(uKey, u);

        const c = courseAgg.get(cKey) ?? { budget: 0, spend: 0 };
        c.budget += budget;
        courseAgg.set(cKey, c);

        const p = platformAgg.get(pKey) ?? { budget: 0, spend: 0 };
        p.budget += budget;
        platformAgg.set(pKey, p);
      }

      // Pass 2: Spend from Daily Data (Precision)
      for (const r of (dailyRows ?? [])) {
        const unit = labelOr(r[viewUnitCol], "(Sem unidade)");
        const platform = labelOr(r[viewPlatformCol], "(Sem plataforma)");
        const course = labelOr(r[viewCourseCol], "(Sem curso)");
        const spend = safeNumber(r[viewSpendCol]);

        const uKey = unit;
        const cKey = `${unit}||${course}`;
        const pKey = `${unit}||${course}||${platform}`;

        // Ensure nodes exist even if no budget (Pass 1 might have missed them if spend-only)
        if (!unitAgg.has(uKey)) unitAgg.set(uKey, { budget: 0, spend: 0 });
        if (!courseAgg.has(cKey)) courseAgg.set(cKey, { budget: 0, spend: 0 });
        if (!platformAgg.has(pKey)) platformAgg.set(pKey, { budget: 0, spend: 0 });

        unitAgg.get(uKey)!.spend += spend;
        courseAgg.get(cKey)!.spend += spend;
        platformAgg.get(pKey)!.spend += spend;
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

      // Chart Aggregation aligned with InvestmentTreeTable logic
      // Hybrid Source: Budget from Weekly (Context), Spend from Daily (Precision)
      const chartAgg = new Map<string, { planned: number; spend: number }>();

      const getClassifiedKey = (u?: string | null, c?: string | null, f?: string | null) => {
        const unitRaw = (u || "").toLowerCase();
        const courseRaw = (c || "").toLowerCase();
        const funnelRaw = (f || "").toLowerCase();

        const isEad = unitRaw.includes("ead") || courseRaw.includes("ead") || unitRaw === "1. ead" || unitRaw.startsWith("ead ") || unitRaw.includes("ulbra pop");
        const isBranding = funnelRaw === "branding" || funnelRaw === "brand" || unitRaw.includes("branding") || unitRaw.includes("institucional");
        const isMedicinaOnly = courseRaw === "medicina" || (courseRaw.includes("medicina") && !courseRaw.includes("bio"));

        if (isEad) return "1. EAD";
        if (isBranding) return "2. Branding";
        if (isMedicinaOnly) return "3.1 Medicina";
        return u || "(Sem unidade)";
      };

      // 1. Accumulate PLANNED from Weekly Data
      for (const r of (weeklyRows ?? []) as WeeklyViewRow[]) {
        const key = getClassifiedKey(r.unidade, r.curso, r.funnel_stage);
        const curr = chartAgg.get(key) ?? { planned: 0, spend: 0 };
        curr.planned += safeNumber(r.orcamento_semanal);
        chartAgg.set(key, curr);
      }

      // 2. Accumulate SPEND from Daily Data (Precision)
      for (const r of (dailyRows ?? [])) {
        const u = r[viewUnitCol] as string;
        const c = r[viewCourseCol] as string;
        // Look up funnel from metadata since daily view might lack it
        const f = metadataMap.get(u)?.funnel;

        const key = getClassifiedKey(u, c, f);
        const curr = chartAgg.get(key) ?? { planned: 0, spend: 0 };
        curr.spend += (Number(r[viewSpendCol]) || 0); // Exact Daily Spend
        chartAgg.set(key, curr);
      }

      const unitRows: UnitRow[] = Array.from(chartAgg.entries())
        .map(([unit, v]) => ({
          unit,
          planned: v.planned,
          spend: v.spend
        }))
        .sort((a, b) => (b.planned || b.spend) - (a.planned || a.spend));

      // KPIs (forecast simples)
      // KPI Forecast Logic
      const startD = effectiveStart;
      const endD = effectiveEnd;
      const today = new Date();
      // Ensure time part doesn't mess up differenceInDays
      today.setHours(0, 0, 0, 0);

      const totalDaysInPeriod = Math.max(1, (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);

      let daysElapsed = 0;
      if (today > endD) {
        daysElapsed = totalDaysInPeriod; // Period passed
      } else if (today < startD) {
        daysElapsed = 0; // Period in future
      } else {
        // Period currently active
        daysElapsed = Math.max(1, (today.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);
      }

      const spendToDate = spendTotal;

      const forecast = daysElapsed > 0 ? (spendToDate / daysElapsed) * totalDaysInPeriod : spendTotal;
      const pacing = plannedTotal > 0 ? spendTotal / plannedTotal : null;
      const netVariance = plannedTotal > 0 ? plannedTotal - forecast : null;

      // Use Exact Metrics from Daily Query
      // const totalLeads = exactLeads; // Provided by query logic via `data` prop now? No, we need to lift it from data.
      // Wait, we are inside `useMemo` or `queryFn`? 
      // We are inside `useMemo`? No, this code block is inside the transformation logic, likely inside `useMemo` in the original file, BUT here we are looking at lines 350-500 which is seemingly inside `useQuery`'s `queryFn`?
      // actually the previous Tool view showed this logic inside `budgetDataQuery.queryFn`.
      // SO we return these values calculated in `queryFn`.

      const totalLeads = exactLeads;
      const brandingLeads = exactBrandingLeads;
      const performanceLeads = totalLeads - brandingLeads;

      const cpl = totalLeads > 0 ? spendTotal / totalLeads : null;
      const spendBranding = exactBrandingSpend;

      const kpis: BudgetKpis = {
        plannedTotal,
        spendTotal,
        spendSemEad,
        spendBranding,
        forecast: plannedTotal > 0 ? forecast : null,
        netVariance,
        pacing,
        totalLeads,
        performanceLeads,  // NOVO
        cpl,
      };

      return {
        kpis,
        dailySeries,
        unitRows,
        investmentMatrix,
        weeklyRows,
        dailyRows, // Returning raw daily rows for Hybrid Matrix
        budgetHasUnitGranularity: !!budgetCols.unitCol,
      };
    },
  });

  const isLoading = budgetColsQuery.isLoading || budgetDataQuery.isLoading;

  const error = (budgetColsQuery.error || budgetDataQuery.error) as any;

  const kpis = budgetDataQuery.data?.kpis;

  const handleDownload = React.useCallback(async (node: any) => {
    try {
      if (!client) return;

      // Build valid courses set from WeeklyRows (which mirrors SQL View logic)
      // If a course is NOT in this set (and not an exception), it should be "Geral"
      const weeklyRows = budgetDataQuery.data?.weeklyRows || [];
      const validCourses = new Set<string>();
      weeklyRows.forEach((r: any) => {
        if (r.unidade && r.curso && r.curso !== "Geral") {
          validCourses.add(`${r.unidade}|${r.curso}`);
        }
      });

      // Resolver colunas dinamicamente
      const {
        dateCol,
        businessUnitCol: campaignCol,
      } = await resolvePerformanceDailyColumns(client);

      const {
        spendCol,
        platformCol,
        impressionsCol,
        clicksCol,
        conversionsCol,
      } = await resolvePerformanceMetricColumns(client);

      const fromDate = format(rangeStart, "yyyy-MM-dd");
      const toDate = format(rangeEnd, "yyyy-MM-dd");

      const cols = [
        dateCol,
        platformCol,
        "account_name",
        campaignCol,
        spendCol,
        impressionsCol,
        clicksCol,
        "cpc",
        "ctr",
        conversionsCol,
        "conversion_value"
      ].filter(Boolean).join(",");

      // Buscar dados BRUTOS de campanhas (não agregados)
      // CRITICAL: Supabase limita a 1000 linhas por default - aumentamos para pegar tudo
      let q = client
        .from("fact_ads_performance_daily")
        .select(cols)
        .gte(dateCol, fromDate)
        .lte(dateCol, toDate)
        .limit(50000);

      const f = { ...node.filters } || {};

      // Fallback: Recuperar filtros do ID se não estiverem explícitos
      // Ex: unit-Ulbra Canoas-Geral
      if (node.id && String(node.id).startsWith("unit-")) {
        const parts = String(node.id).split("-");

        // parts[0] = "unit"
        // parts[1] = Unit Name (Assume no dashes in unit name)
        // parts[2+] = Course Name (can have dashes)

        if (!f.unit && parts.length >= 2) {
          f.unit = parts[1];
        }
        if (!f.course && parts.length >= 3) {
          f.course = parts.slice(2).join("-");
        }
      }

      // Aplicar filtro de plataforma via SQL (ilike para case-insensitive)
      if (f.platform && platformCol) {
        q = q.ilike(platformCol, f.platform);
      }

      const { data, error } = await q;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert("Nenhum dado encontrado para este período/filtro.");
        return;
      }

      // Função de classificação - REPLICA EXATAMENTE a lógica da VIEW SQL
      const classifyRow = (r: any) => {
        const camp = (r[campaignCol] || "").toLowerCase();
        const acc = (r["account_name"] || "").toLowerCase();

        // 0. Filtro Global: Ultec (WHERE !~~* '%Ultec%')
        if (camp.includes("ultec")) {
          return { unidade: "EXCLUDE", curso: "EXCLUDE" };
        }

        // 1. Classificação de Unidade (unidade_temp) - ORDEM IMPORTA
        let unidade = "Outros / Não Identificado";

        // REGRA EAD ATUALIZADA: Inclui "Ulbra Pop" e valida Leads
        const isEadLogic = (camp.includes("ead") && !camp.includes("lead")) || acc.includes("ead") || camp.includes("google pix") || camp.includes("ulbra pop");

        if (isEadLogic) unidade = "EAD";
        else if (camp.includes("medicina")) unidade = "Ulbra Medicina";
        else if (camp.includes("visitas") || camp.includes("branding") || camp.includes("institucional")) unidade = "Branding";
        else if (camp.includes("canoas") || camp.includes("| rs |")) unidade = "Ulbra Canoas";
        else if (camp.includes("torres")) unidade = "Ulbra Torres";
        else if (camp.includes("itumbiara")) unidade = "Ulbra Itumbiara";
        else if (camp.includes("manaus")) unidade = "Ulbra Manaus";
        else if (camp.includes("palmas")) unidade = "Ulbra Palmas";
        else if (camp.includes("santarém") || camp.includes("santarem")) unidade = "Ulbra Santarém";
        else if (camp.includes("gravataí") || camp.includes("gravatai")) unidade = "Ulbra Gravataí";
        else if (camp.includes("são jerônimo") || camp.includes("jeronimo")) unidade = "Ulbra São Jerônimo";
        else if (camp.includes("cachoeira") || camp.includes("cach do sul")) unidade = "Ulbra Cachoeira do Sul";
        else if (camp.includes("santa maria")) unidade = "Ulbra Santa Maria";
        else if (camp.includes("guaíba") || camp.includes("guaiba")) unidade = "Ulbra Guaíba";
        else if (camp.includes("carazinho")) unidade = "Ulbra Carazinho";

        // 2. Classificação de Curso (curso_tentativa) - ORDEM IMPORTA
        let curso = "Geral";

        // Checks específicos que devem ser avaliados ANTES de "medicina"
        if (camp.includes("biomedicina") || camp.includes("biomed")) curso = "Biomedicina";
        else if (camp.includes("medvet") || camp.includes("veterinaria") || camp.includes("veterinária")) curso = "MedVet";

        else if (isEadLogic) curso = "EAD";

        // Mudei para cá: Medicina antes de Branding (pois pode ter 'Medicina' e 'Branding' no nome)
        // SQL View prioriza Medicina, então nós devemos também.
        else if (camp.includes("medicina")) curso = "Medicina";

        else if (camp.includes("branding") || camp.includes("institucional") || camp.includes("visitas")) curso = "Branding";
        else if (camp.includes("direito")) curso = "Direito";
        else if (camp.includes("odonto") || camp.includes("odontologia")) curso = "Odonto";
        else if (camp.includes("psicologia") || camp.includes("psico")) curso = "Psicologia";
        else if (camp.includes("enfermagem")) curso = "Enfermagem";
        else if (camp.includes("fisioterapia") || camp.includes("fisio")) curso = "Fisioterapia";
        else if (camp.includes("estética") || camp.includes("estetica")) curso = "Estética";
        else if (camp.includes("agronomia") || camp.includes("agro")) curso = "Agronomia";
        else if (camp.includes("terapia ocupacional") || camp.includes("t.o")) curso = "Terapia Ocupacional";
        else if (camp.includes("engenharia") || camp.includes("eng ")) curso = "Engenharias";

        // Lógica de Fallback para Geral (Replicando SQL: LEFT JOIN lista_cursos_validos)
        if (unidade !== "EAD" && unidade !== "Ulbra Medicina" && unidade !== "Branding" && curso !== "Geral") {
          const key = `${unidade}|${curso}`;
          if (!validCourses.has(key)) {
            curso = "Geral";
          }
        }

        if (unidade === "Outros / Não Identificado") {
          curso = "Geral";
        }

        return { unidade, curso };
      };

      // Filtrar dados aplicando a mesma lógica da árvore/matriz
      const filteredData = data.filter((r: any) => {
        const { unidade, curso } = classifyRow(r);

        // Excluir Ultec globalmente
        if (unidade === "EXCLUDE") return false;

        // Aplicar filtros da hierarquia
        if (f.isEad) return unidade === "EAD";
        if (f.isBranding) return unidade === "Branding";

        // ---- Checks Cumulativos (AND) ----

        // 1. Regra de Curso
        if (f.course && f.course.toLowerCase() !== "cursos") {
          const cFilter = f.course.toLowerCase();
          const cRow = curso.toLowerCase();

          let matchesCourse = false;
          if (cFilter === "medicina") {
            matchesCourse = cRow === "medicina";
          } else {
            matchesCourse = cRow.includes(cFilter);
          }

          if (!matchesCourse) return false;
          // NÃO RETORNA TRUE AQUI! Continua para checar Unidade...
        }

        // 2. Regra de Unidade
        if (f.unit) {
          const uFilter = f.unit.toLowerCase();
          const uRow = unidade.toLowerCase();
          if (!uRow.includes(uFilter)) return false;
        }

        // Funil de Conversão (catch-all OU explícito)
        // Se passamos pelos checks acima e temos funnel=conversion, ou se a label diz "Cursos"
        const isConversionContext = f.funnel === "conversion" || (node.label && node.label.toLowerCase().includes("cursos"));

        if (isConversionContext) {
          // Excluir EAD e Branding
          if (unidade === "EAD" || unidade === "Branding") return false;

          // Se estamos no nó "Cursos" (but not Medicina, which would have been caught in the course check above)
          if (node.label && node.label.toLowerCase().includes("cursos")) {
            // Excluir Medicina
            if (curso === "Medicina") return false;
          }

          return true;
        }

        // Default para fallback (se não bateu nada específico)
        // Se é node raiz "Mkt de Conversão", exclui EAD/Branding
        if (node.label && node.label.toLowerCase().includes("mkt de conversão")) {
          if (unidade === "EAD" || unidade === "Branding") return false;
          return true;
        }

        // Se chegou aqui e não tem filtro nenhum, retorna true (cuidado!)
        return true;
      });

      // Gerar CSV com campanhas individuais + classificações
      const csvRows = [
        ["Data", "Plataforma", "Conta", "Campanha", "Unidade (Calc)", "Curso (Calc)", "Spend", "Impressions", "Clicks", "CPC", "CTR", "Conversions", "Conv. Value"]
      ];

      filteredData.forEach((r: any) => {
        const { unidade, curso } = classifyRow(r);
        csvRows.push([
          r[dateCol] || "",
          r[platformCol] || "",
          r["account_name"] || "",
          r[campaignCol] || "",
          unidade,
          curso,
          safeNumber(r[spendCol]).toFixed(2).replace(".", ","),
          safeNumber(r[impressionsCol]).toString(),
          safeNumber(r[clicksCol]).toString(),
          safeNumber(r["cpc"]).toFixed(2).replace(".", ","),
          (safeNumber(r["ctr"]) * 100).toFixed(2).replace(".", ",") + "%",
          safeNumber(r[conversionsCol]).toString(),
          safeNumber(r["conversion_value"]).toFixed(2).replace(".", ",")
        ]);
      });

      const csvContent = "\uFEFF" + csvRows.map(e => e.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;

      const filters = node.filters || {};
      const parts = [];

      // Adicionar partes da hierarquia ao nome
      if (filters.isEad) {
        parts.push("ead");
      } else if (filters.isBranding) {
        parts.push("branding");
      } else {
        parts.push("conversao");

        const labelLower = (node.label || "").toLowerCase();
        // Verifica se é Medicina (filtro ou label)
        const hasMedicina = String(filters.course || "").toLowerCase().includes("medicina") || labelLower.includes("medicina");

        // Se NÃO é medicina, e (tem unidade OU label diz 'cursos')
        if (!hasMedicina) {
          if (filters.unit || labelLower.includes("cursos")) {
            parts.push("cursos");
          }
        }
      }

      if (filters.unit) parts.push(filters.unit);
      if (filters.course) parts.push(filters.course);
      if (filters.platform) parts.push(filters.platform);

      // Fallback
      if (parts.length === 0 && node.label) parts.push(node.label);

      // Data final
      parts.push(format(new Date(), "yyyyMMdd"));

      const safeLabel = (s: any) => {
        if (!s) return "";
        let str = String(s).toLowerCase();

        // Mapa manual de substituição para garantir compatibilidade
        const map: Record<string, string> = {
          "á": "a", "à": "a", "ã": "a", "â": "a", "ä": "a",
          "é": "e", "è": "e", "ê": "e", "ë": "e",
          "í": "i", "ì": "i", "î": "i", "ï": "i",
          "ó": "o", "ò": "o", "õ": "o", "ô": "o", "ö": "o",
          "ú": "u", "ù": "u", "û": "u", "ü": "u",
          "ç": "c", "ñ": "n"
        };

        str = str.replace(/[áàãâäéèêëíìîïóòõôöúùûüçñ]/g, (match) => map[match] || match);
        // Fallback NFD se sobrar algo e replace final
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_');
      };

      const filename = parts
        .map(p => safeLabel(p))
        .join("_") + ".csv";

      link.setAttribute("download", filename);
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      // alert("Arquivo gerado: " + filename); // Debug removido, vamos confiar no timeout.

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 60000);


    } catch (e: any) {
      console.error(e);
      alert("Erro ao baixar dados: " + e.message);
    }
  }, [client, rangeStart, rangeEnd]);

  // --- Hybrid Data Construction for Matrix ---
  // Merges Weekly Budget (from weeklyRows) + Daily Spend (from dailyRows)
  // This ensures units with Spend but No Budget (e.g. Ulbra Institucional) appear in the Matrix.
  const hybridRowsClean = React.useMemo(() => {
    if (!budgetDataQuery.data) return [];
    const rowMap = new Map<string, WeeklyViewRow>();

    const normalizeUnit = (u: any) => {
      const lower = String(u || "").toLowerCase();
      if (lower.includes("canoas")) return "ulbra canoas";
      if (lower.includes("gravataí")) return "ulbra gravataí";
      if (lower.includes("itumbiara")) return "ulbra itumbiara";
      if (lower.includes("palmas")) return "ulbra palmas";
      if (lower.includes("santarem") || lower.includes("santarém")) return "ulbra santarém";
      if (lower.includes("torres")) return "ulbra torres";
      if (lower.includes("manaus")) return "ulbra manaus";
      if (lower.includes("santa maria")) return "ulbra santa maria";
      if (lower.includes("guaiba") || lower.includes("guaíba")) return "ulbra guaíba";
      if (lower.includes("são jerônimo")) return "ulbra são jerônimo";
      if (lower.includes("carazinho")) return "ulbra carazinho";
      if (lower.includes("ead") || lower.includes("ulbra pop") || lower.includes("pop")) return "ulbra ead";
      if (lower.includes("branding") || lower.includes("institucional")) return "branding";
      return lower;
    };

    // Pass 1: Budget from WeeklyRows
    (budgetDataQuery.data.weeklyRows ?? []).forEach(r => {
      const week = r.data_inicio_semana ? String(r.data_inicio_semana).slice(0, 10) : "";
      const u = normalizeUnit(r.unidade);
      const c = (r.curso || "").toLowerCase();
      const p = (r.plataforma || "").toLowerCase();
      const key = `${week}|${u}|${c}|${p}`;

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          ...r,
          unidade: u,
          curso: c,
          plataforma: p,
          gasto_real: 0,
          leads: 0,
          diferenca: 0,
          percentual_consumido: 0
        });
      }
      const row = rowMap.get(key)!;
      row.orcamento_semanal = row.orcamento_semanal; // already set, just clarifying we rely on Pass 1 for budget
    });

    // Pass 2: Spend from DailyRows
    (budgetDataQuery.data.dailyRows ?? []).forEach((r: any) => {

      // Safe Date Parsing (YYYY-MM-DD -> Noon to avoid timezone shifts)
      const parts = String(r.data_referencia).split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);

      // Force Monday start to match SQL View (vw_dashboard_semanal_detalhado2)
      const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const u = normalizeUnit(r.unidade);
      const c = (r.curso || "").toLowerCase();
      const p = (r.platform || r.plataforma || "").toLowerCase();
      const key = `${weekStart}|${u}|${c}|${p}`;

      if (!rowMap.has(key)) {
        // New row (Spend only, no budget)
        rowMap.set(key, {
          data_inicio_semana: weekStart,
          semana_label: format(new Date(weekStart), "dd MMM"),
          unidade: r.unidade,
          plataforma: r.plataforma || r.platform, // Ensure mapping valid
          curso: r.curso,
          orcamento_semanal: 0,
          gasto_real: 0,
          diferenca: 0,
          leads: 0,
          percentual_consumido: 0,
          funnel_stage: null,
          location: null
        });
      }
      const row = rowMap.get(key)!;
      row.gasto_real += safeNumber(r.investimento || r.spend);
      row.leads += safeNumber(r.leads);
    });

    return Array.from(rowMap.values()).map(r => ({
      ...r,
      diferenca: r.orcamento_semanal - r.gasto_real
    }));
  }, [budgetDataQuery.data]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Controle de Budget</h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva de orçado vs realizado (mês, unidade, curso e plataforma).
        </p>
      </header>

      {/* Filtros em destaque */}
      <DashboardFilterBar />

      {error && !String(error?.message).toLowerCase().includes("abort") ? (
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

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPIs Financeiros">
        <KpiCard
          title="Budget Total"
          value={isLoading ? "…" : kpis?.plannedTotal != null ? brl(kpis.plannedTotal) : "-"}
          hint="Soma do budget planejado"
          tooltip="Valor total planejado para investimento em mídia no período selecionado."
          status="neutral"
        />
        <KpiCard
          title="Gasto Realizado"
          value={isLoading ? "…" : kpis?.spendTotal != null ? brl(kpis.spendTotal) : "-"}
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

            // Re-calc pacing expectation based on Period
            const startD = effectiveStart;
            const endD = effectiveEnd;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const totalDays = Math.max(1, (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);
            const daysElapsed = today > endD ? totalDays : (today < startD ? 0 : (today.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24) + 1);

            const expectedPacing = daysElapsed / totalDays;
            return getPacingStatus(kpis.pacing, expectedPacing);
          })()}
        />
        <KpiCard
          title="Variância (R$)"
          value={isLoading ? "…" : kpis?.netVariance != null ? brl(kpis.netVariance) : "-"}
          hint="Budget - Forecast"
          tooltip="Diferença entre Budget e Forecast. Positivo (Verde/Amarelo) = Economia prevista. Negativo (Vermelho) = Possível estouro."
          status={(() => {
            if (isLoading || kpis?.netVariance == null || kpis?.plannedTotal == null) return "neutral";
            const variance = kpis.netVariance;
            const threshold = kpis.plannedTotal * 0.05; // 5% de tolerância

            // Se sobrar muito dinheiro (Positivo > 5%), é ruim (Amarelo - Atenção Sub-investimento)
            if (variance > threshold) return "warning";

            // Se estourar o budget (Negativo < -5%), é ruim (Vermelho - Estouro)
            if (variance < -threshold) return "danger";

            // Se estiver próximo de 0 (dentro de +/- 5%), é bom (Verde - Execução Perfeita)
            return "success";
          })()}
        />
      </section>

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-3 pt-2" aria-label="KPIs Performance">
        <KpiCard
          title="Forecast"
          value={isLoading ? "…" : kpis?.forecast != null ? brl(kpis.forecast) : "-"}
          hint="Projeção de fechamento"
          tooltip="Quanto vamos gastar se continuarmos no ritmo atual."
          status="neutral"
        />
        <KpiCard
          title="Leads Totais"
          value={isLoading ? "…" : kpis?.performanceLeads != null ? kpis.performanceLeads.toLocaleString('pt-BR') : "-"}
          hint="Volume de inscritos (Performance)"
          tooltip="Total de leads gerados por campanhas de performance (excluindo Branding)."
          status="neutral"
        />
        <KpiCard
          title="CPL Médio"
          value={(() => {
            if (isLoading) return "…";
            if (!kpis?.cpl) return "-";

            // Sempre calcular CPL sem Branding (apenas campanhas de performance)
            if (budgetDataQuery.data?.investmentMatrix) {
              const investmentMatrix = budgetDataQuery.data.investmentMatrix;

              // Calcular gasto de Branding baseado na categorização do FunnelStrategyChart
              let brandingSpend = 0;
              investmentMatrix.forEach((unitGroup) => {
                const name = unitGroup.unit.toLowerCase();
                if (name.includes("branding") || name.includes("institucional")) {
                  brandingSpend += unitGroup.spend;
                }
              });

              // CPL sem Branding = (Gasto sem Branding) / (Leads sem Branding)
              const totalSpend = kpis.spendTotal || 0;
              const performanceLeads = kpis.performanceLeads || 0;
              const spendWithoutBranding = totalSpend - brandingSpend;

              if (performanceLeads > 0 && spendWithoutBranding > 0) {
                const cplWithoutBranding = spendWithoutBranding / performanceLeads;
                return brl(cplWithoutBranding);
              }
            }

            return brl(kpis.cpl);
          })()}
          hint="Custo por Lead (Performance)"
          tooltip="CPL calculado excluindo investimento de Branding. Mostra apenas eficiência de campanhas de performance (Conversão + EAD)."
          status={(() => {
            // Regra de exemplo: Abaixo de 50 é bom, acima de 100 é ruim? 
            // Como não temos meta definida no banco, deixamos neutro ou fixo por enquanto.
            // O usuário disse: Se CPL R$ 200 é fracasso.
            return "neutral" as KpiStatus;
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
              <div className="h-64 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(budgetDataQuery.data?.unitRows ?? []).slice(0, 12)}
                    margin={{ top: 8, right: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 30, bottom: 8, left: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 45 }}
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
              <div className="h-64 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={budgetDataQuery.data?.dailySeries ?? []}
                    margin={{ top: 8, right: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 30, bottom: 8, left: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 45 }}
                  >
                    <defs>
                      {/* Gradient for underpacing (red) */}
                      <linearGradient id="underpacingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                      </linearGradient>
                      {/* Gradient for overpacing (green) */}
                      <linearGradient id="overpacingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                      width={80}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        const ideal = data.idealCum || 0;
                        const real = data.spendCum || 0;
                        const gap = real - ideal;
                        const gapPct = ideal > 0 ? (gap / ideal) * 100 : 0;

                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">Dia {format(new Date(data.day), "dd/MM")}</span>
                              </div>
                              <div className="grid gap-1">
                                <div className="flex items-center justify-between gap-8">
                                  <span className="text-xs text-muted-foreground">Ideal:</span>
                                  <span className="text-xs font-medium">{brl(ideal)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-8">
                                  <span className="text-xs text-muted-foreground">Real:</span>
                                  <span className="text-xs font-medium">{brl(real)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-8 border-t pt-1">
                                  <span className="text-xs font-medium">Gap:</span>
                                  <span className={`text-xs font-bold ${gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {gap >= 0 ? '+' : ''}{brl(gap)} ({gapPct >= 0 ? '+' : ''}{gapPct.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    {/* Area for the gap - will be filled conditionally */}
                    <Area
                      type="monotone"
                      dataKey="spendCum"
                      fill="url(#underpacingGradient)"
                      stroke="none"
                      fillOpacity={1}
                    />
                    {/* Ideal line (dashed reference) */}
                    <Line
                      type="monotone"
                      dataKey="idealCum"
                      name="Ideal"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    {/* Real line (solid) */}
                    <Line
                      type="monotone"
                      dataKey="spendCum"
                      name="Realizado"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </section>

      <section aria-label="Visão Estratégica" className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <WeeklyComparisonChart data={budgetDataQuery.data?.weeklyRows ?? []} />
        </div>
        <div>
          <FunnelStrategyChart data={budgetDataQuery.data?.investmentMatrix ?? []} />
        </div>
        <div>
          <PlatformDonutChart data={budgetDataQuery.data?.investmentMatrix ?? []} />
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
                Carregando… (Verifique se vw_dashboard_semanal_detalhado2 existe)
              </div>
            ) : (
              <InvestmentTreeTable
                data={hybridRowsClean}
                monthDate={filters.month}
                dateRange={{ from: effectiveStart, to: effectiveEnd }}
                onViewWeekly={(node: any) => {
                  /* 
                    Using node.filters provided by InvestmentTreeTable to guarantee alignment.
                    TreeNode type is now exported but using 'any' for quick fix to allow node.filters access without full type import ceremony if not needed.
                    Actually, let's trust node.filters.
                  */
                  const filters = node.filters || {};

                  let filtered = (hybridRowsClean || []).filter((r: any) => {
                    let match = true;
                    const u = (r.unidade || "").toLowerCase();
                    const c = (r.curso || "").toLowerCase();
                    const p = (r.plataforma || "").toLowerCase();
                    const f = (r.funnel_stage || "").toLowerCase();

                    // 1. Group level
                    if (filters.isEad) {
                      match = match && (u.includes("ead") || c.includes("ead") || u.includes("pop"));
                    } else if (filters.isBranding) {
                      match = match && (f.includes("brand") || u.includes("branding") || u.includes("institucional"));
                    } else if (filters.funnel === "conversion") {
                      const isEad = u.includes("ead") || c.includes("ead");
                      const isBranding = f.includes("brand") || u.includes("branding") || u.includes("institucional");
                      match = match && (!isEad && !isBranding);
                    }

                    // 2. Unit
                    if (filters.unit) {
                      match = match && u === filters.unit.toLowerCase();
                    }

                    // 3. Course
                    if (filters.course) {
                      const target = filters.course.toLowerCase();
                      if (target === "medicina") {
                        match = match && (c.includes("medicina") && !c.includes("bio"));
                      } else if (target === "geral" || target === "mkt de conversão") {
                        match = match && (c === "" || c === "geral" || !r.course || !r.curso);
                      } else {
                        match = match && c === target;
                      }
                    }

                    // 4. Platform
                    if (filters.platform) {
                      match = match && p === filters.platform.toLowerCase();
                    }

                    return match;
                  });

                  setSelectedUnit({
                    unit: node.label,
                    rows: filtered
                  });
                }}

              />
            )}
          </CardContent>
        </Card>
      </section>



      {/* Drawer de drill-down semanal */}
      <WeeklyDrawer
        open={selectedUnit !== null}
        onOpenChange={(open) => !open && setSelectedUnit(null)}
        unitName={selectedUnit?.unit ?? null}
        monthDate={filters.month}
        weeklyData={(() => {
          if (!selectedUnit) return [];
          const byWeek = new Map<string, { semana: string; weekStart: string; orcado: number; realizado: number; leads: number; cpl: number }>();

          for (const r of selectedUnit.rows) {
            // Already filtered by onViewWeekly logic
            const weekStart = String(r?.data_inicio_semana ?? "").slice(0, 10);
            if (!weekStart) continue;

            const curr = byWeek.get(weekStart) ?? {
              semana: r?.semana_label ?? weekStart,
              weekStart,
              orcado: 0,
              realizado: 0,
              leads: 0,
              cpl: 0
            };
            curr.orcado += Number(r?.orcamento_semanal ?? 0) || 0;
            curr.realizado += Number(r?.gasto_real ?? 0) || 0;
            curr.leads += Number(r?.leads ?? 0) || 0;
            if (r?.semana_label) curr.semana = r.semana_label;
            byWeek.set(weekStart, curr);
          }

          // Calculate CPL for each week after aggregation
          const result = Array.from(byWeek.values()).map(w => ({
            ...w,
            cpl: w.leads > 0 ? w.realizado / w.leads : 0
          }));

          return result.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        })()}
      />
    </div >
  );
}
