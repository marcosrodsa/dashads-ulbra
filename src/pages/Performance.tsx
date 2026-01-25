import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";

import { PerformanceFilterBar } from "@/components/performance/PerformanceFilterBar";
import { PerformanceKpiGrid, type PerformanceKpis } from "@/components/performance/PerformanceKpiGrid";
import { CplEvolutionChart, LeadsShareChart } from "@/components/performance/PerformanceCharts";
import { PerformanceTable, type PerformanceRow } from "@/components/performance/PerformanceTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function dateOnly(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function PerformancePage() {
  const { filters } = useFilters();
  const client = getSupabaseClient();

  const monthStart = startOfMonth(filters.month);
  // View aggregates by month, but we might filter by view's month column
  const monthKey = dateOnly(monthStart);

  const performanceQuery = useQuery({
    queryKey: ["performance-view-data", monthKey, filters.businessUnit, filters.course, filters.platform],
    enabled: !!client,
    queryFn: async () => {
      let q = (client as SupabaseClient)
        .from("vw_performance_mensal")
        .select("*")
        .eq("mes_referencia", monthKey);

      if (filters.businessUnit) q = q.eq("unidade", filters.businessUnit);
      if (filters.course) q = q.eq("curso", filters.course);
      if (filters.platform) q = q.eq("platform", filters.platform);

      const { data, error } = await q;
      if (error) {
        console.error("View Query Error:", error);
        throw error;
      }
      return data || [];
    }
  });

  // --- Daily Data Query for Evolution Chart ---
  const dailyQuery = useQuery({
    queryKey: ["performance-daily-view", dateOnly(monthStart), filters.businessUnit, filters.course, filters.platform],
    enabled: !!client,
    queryFn: async () => {
      let q = (client as SupabaseClient)
        .from("vw_performance_diaria")
        .select("*")
        .gte("data_referencia", format(monthStart, "yyyy-MM-dd"))
        .lte("data_referencia", format(endOfMonth(monthStart), "yyyy-MM-dd"))
        .order("data_referencia", { ascending: true });

      if (filters.businessUnit) q = q.eq("unidade", filters.businessUnit);
      if (filters.course) q = q.eq("curso", filters.course);
      if (filters.platform) q = q.eq("platform", filters.platform);

      const { data, error } = await q;
      if (error) {
        console.warn("Daily View Query Error (Chart might be empty):", error);
        return [];
      }
      return data || [];
    }
  });

  const isDailyLoading = dailyQuery.isLoading;

  // --- Transform Data ---
  const { kpis, tableRows, evolutionData, shareData } = React.useMemo(() => {
    const rows = performanceQuery.data ?? [];

    // 1. KPIs Agregados
    const kpis: PerformanceKpis = {
      spend: 0,
      filteredSpend: 0,
      leads: 0,
      clicks: 0,
      impressions: 0
    };

    const activeRows = rows.filter((r: any) => {
      if (!filters.hideBranding) return true;
      const isBranding = r.unidade === "Branding" || r.curso === "Branding" || r.unidade === "Institucional" || r.curso === "Institucional";
      return !isBranding;
    });

    // 2. Table Rows
    const tableRows: PerformanceRow[] = activeRows.map((r: any) => {
      // If branding is hidden, activeRows won't have it. If not hidden, we show it.
      // Logic for leads: Branding usually has 0 leads, but if it has, we show it if not hidden.

      return {
        unidade: r.unidade,
        curso: r.curso,
        platform: r.platform,
        spend: Number(r.investimento || 0),
        leads: r.leads || 0,
        cpl: r.leads > 0 ? Number(r.investimento || 0) / r.leads : 0,
        clicks: r.clicks || 0,
        impressions: r.impressoes || 0,
        ctr: (r.clicks && r.impressoes) ? r.clicks / r.impressoes : 0
      };
    });

    activeRows.forEach((r: any) => {
      kpis.spend += r.investimento || 0;
      kpis.leads += r.leads || 0;
      kpis.filteredSpend = (kpis.filteredSpend || 0) + (r.investimento || 0);
      kpis.clicks += r.clicks || 0;
      kpis.impressions += r.impressoes || 0;
    });

    // 3. Evolution Chart
    // View is MONTHLY aggregated? PRD says "vw_performance_mensal... agrega os dados diários".
    // Wait. If the view groups by Month (GROUP BY 1), then I assume a single row per Unit/Course/Platform PER MONTH.
    // If that's the case, I CANNOT show "Evolution" chart BY DAY/WEEK using just this view properly, unless the view 
    // has daily granularity OR I query `fact_ads_performance_daily` for the chart specifically?
    // PRD 3.4: "Evolução de CPL x Leads".
    // If the view is monthly, and I select "October", I get ONE point? That's not an evolution chart.
    // I likely need `fact_ads_performance_daily` for the Evolution Chart to show daily/weekly trend within the month.
    // BUT, I'll stick to the view for everything else.
    // For the Evolution Chart, I'll simulate it with a dummy or use daily data if reachable.
    // Actually, let's assume the user wants the "Evolution" of the selected period. If its a single month, maybe "By Unit"? 
    // No "Evolution" implies time.
    // I will fallback to querying `fact_ads_performance_daily` JUST for the chart if I can't get it from view.
    // OR the view returns multiple rows? The view checks `DATE_TRUNC('month', mes)`. So distinct months.
    // If I filter by ONE month, I get 1 time point.
    // Maybe the chart logic needs `fact_ads_performance_daily`.
    // I will construct `evolutionData` as distinct Units for now (as a bar chart) OR just skip it if I can't query daily.
    // Actually, strictly following PRD View: it is MONTHLY. 
    // I'll show "Share Chart" (Donut) which works fine.
    // For Evolution, I'll populate it with empty or single point for now to avoid breaking constraints, noting the limitation.

    const dailyRows = dailyQuery.data ?? [];
    const dailyMap = new Map<string, { leads: number; spend: number }>();

    dailyRows.forEach((r: any) => {
      const isBranding = r.unidade === "Branding" || r.curso === "Branding" || r.unidade === "Institucional" || r.curso === "Institucional";

      // If hiding branding, skip
      if (filters.hideBranding && isBranding) return;

      // Note: Originally we always excluded branding from CPL trend. Now we allow it if toggle is off.


      // Fix Timezone: Manually parse YYYY-MM-DD to Avoid UTC shift
      const [year, month, day] = r.data_referencia.split("-");
      const d = `${day}/${month}`;
      const curr = dailyMap.get(d) ?? { leads: 0, spend: 0 };
      const spendVal = Number(r.investimento ?? r.spend ?? 0);

      curr.leads += Number(r.leads || 0);
      curr.spend += spendVal;
      dailyMap.set(d, curr);
    });

    const evolutionData = Array.from(dailyMap.entries()).map(([period, v]) => ({
      period,
      leads: v.leads,
      cpl: v.leads > 0 ? v.spend / v.leads : 0
    }));

    // 4. Share Data (Donut)
    const shareMap = new Map<string, number>();
    rows.forEach((r: any) => {
      const isBranding = r.unidade === "Branding" || r.curso === "Branding" || r.unidade === "Institucional" || r.curso === "Institucional";
      if (filters.hideBranding && isBranding) return;

      const u = r.unidade || "Outros";
      shareMap.set(u, (shareMap.get(u) || 0) + (r.leads || 0));
    });
    const shareData = Array.from(shareMap.entries()).map(([name, value]) => ({ name, value }));

    return { kpis, tableRows, evolutionData, shareData };
  }, [performanceQuery.data, dailyQuery.data, filters.hideBranding]);

  // Separate Query for Evolution Chart (Daily) - Optional enhancement
  // I'll skip it for strict MVP adherence to "Use View" unless requested, or use empty.

  if (performanceQuery.error) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-lg font-bold">Erro ao carregar dados</h2>
        <p>Verifique se a View <code>vw_performance_mensal</code> existe no Supabase.</p>
        <pre className="mt-4 text-xs bg-muted p-4 rounded text-left inline-block">
          {String(performanceQuery.error)}
        </pre>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Performance de Captação</h1>
        <p className="text-muted-foreground">
          Acompanhamento de funil, custos e eficiência por unidade e curso.
        </p>
      </div>

      <PerformanceFilterBar />

      {performanceQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <PerformanceKpiGrid data={kpis} />

          <div className="grid gap-4 md:grid-cols-2">
            {/* Evolution Chart requires daily data. Reusing Donut for now. */}
            <LeadsShareChart data={shareData} />
            {dailyQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <CplEvolutionChart data={evolutionData} />
            )}
          </div>

          <PerformanceTable data={tableRows} />
        </>
      )}
    </div>
  );
}
