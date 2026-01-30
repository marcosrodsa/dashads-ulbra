import * as React from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";

import { PerformanceFilterBar } from "@/components/performance/PerformanceFilterBar";
import { PerformanceKpiGrid, type PerformanceKpis } from "@/components/performance/PerformanceKpiGrid";
import { CplEvolutionChart, LeadsShareChart, CplByPlatformChart } from "@/components/performance/PerformanceCharts";
import { PerformanceTable, type PerformanceRow } from "@/components/performance/PerformanceTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function PerformancePage() {
  const { filters } = useFilters();
  const client = getSupabaseClient();

  // Use selected range or fallback to current month
  const rangeStart = filters.dateRange?.from ?? startOfMonth(new Date());
  const rangeEnd = filters.dateRange?.to ?? filters.dateRange?.from ?? endOfMonth(rangeStart);

  // --- Daily Data Query for All Metrics (KPIs, Table, Charts) ---
  const dailyQuery = useQuery({
    queryKey: ["performance-daily-view", format(rangeStart, "yyyy-MM-dd"), format(rangeEnd, "yyyy-MM-dd"), filters.businessUnit, filters.course, filters.platform],
    enabled: !!client,
    queryFn: async () => {
      let q = (client as SupabaseClient)
        .from("vw_performance_diaria2")
        .select("*")
        .gte("data_referencia", format(rangeStart, "yyyy-MM-dd"))
        .lte("data_referencia", format(rangeEnd, "yyyy-MM-dd"))
        .order("data_referencia", { ascending: true });

      if (filters.businessUnit) q = q.eq("unidade", filters.businessUnit);
      if (filters.course) q = q.eq("curso", filters.course);
      if (filters.platform) q = q.eq("platform", filters.platform);

      const { data, error } = await q;
      if (error) {
        console.warn("Daily View Query Error:", error);
        throw error;
      }
      return data || [];
    }
  });

  // --- Transform Data ---
  const { kpis, tableRows, evolutionData, shareData, cplData } = React.useMemo(() => {
    const rows = dailyQuery.data ?? [];

    // 1. KPIs Agregados
    const kpis: PerformanceKpis = {
      spend: 0,
      filteredSpend: 0,
      leads: 0,
      clicks: 0,
      impressions: 0
    };

    const activeRows = rows.filter((r: any) => {
      // 1. If filter is OFF, show everything
      if (!filters.hideBranding) return true;

      const u = (r.unidade || "").toLowerCase();
      const c = (r.curso || "").toLowerCase();
      const f = (r.funnel_stage || "").toLowerCase();

      const isEad = u.includes("ead") || c.includes("ead") || u === "1. ead" || u.startsWith("ead ");
      const isBranding = f === "branding" || f === "brand" || u.includes("branding") || u.includes("institucional") || c.includes("branding");

      // Matrix Logic: EAD takes precedence over Branding.
      // So we only hide logic that falls into "Group 2: Branding" (which is !EAD && Branding).
      if (isEad) return true; // Keep EAD even if it has branding name

      return !isBranding;
    });

    // Aggregate Daily Rows into Table Rows (Group by Unidade, Curso, Platform)
    // We need to sum up metrics for unique Unidade/Curso/Platform combinations
    const tableMap = new Map<string, PerformanceRow>();

    activeRows.forEach((r: any) => {
      // Key defines row uniqueness in the table
      const key = `${r.unidade}|${r.curso}|${r.platform}`;
      if (!tableMap.has(key)) {
        tableMap.set(key, {
          unidade: r.unidade,
          curso: r.curso,
          platform: r.platform,
          spend: 0,
          leads: 0,
          cpl: 0,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          campaigns: []
        });
      }
      const entry = tableMap.get(key)!;
      const invest = Number(r.investimento || r.spend || 0);
      const leads = Number(r.leads || 0);
      const clicks = Number(r.clicks || 0);
      const impressions = Number(r.impressoes || 0);

      entry.spend += invest;
      entry.leads += leads;
      entry.clicks += clicks;
      entry.impressions += impressions;

      // Descer um nível até a campanha (caso exista no retorno da query)
      const cName = r.campaign_name || "Campanha não identificada";
      let cEntry = entry.campaigns!.find(c => c.name === cName);
      if (!cEntry) {
        cEntry = { name: cName, spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0 };
        entry.campaigns!.push(cEntry);
      }
      cEntry.spend += invest;
      cEntry.leads += leads;
      cEntry.clicks += clicks;
      cEntry.impressions += impressions;
    });

    const tableRows: PerformanceRow[] = Array.from(tableMap.values()).map(r => ({
      ...r,
      cpl: r.leads > 0 ? r.spend / r.leads : 0,
      ctr: (r.clicks && r.impressions) ? r.clicks / r.impressions : 0,
      // Calcula métricas para cada campanha individualmente
      campaigns: r.campaigns!.map(c => ({
        ...c,
        cpl: c.leads > 0 ? c.spend / c.leads : 0,
        ctr: (c.clicks && c.impressions) ? c.clicks / c.impressions : 0
      })).sort((a, b) => b.spend - a.spend) // Ordena por investimento no modal
    }));

    // KPIs Calculation (aggregated from daily)
    activeRows.forEach((r: any) => {
      kpis.spend += Number(r.investimento || r.spend || 0);
      kpis.leads += Number(r.leads || 0);
      kpis.filteredSpend = (kpis.filteredSpend || 0) + Number(r.investimento || r.spend || 0);
      kpis.clicks += Number(r.clicks || 0);
      kpis.impressions += Number(r.impressoes || 0);
    });

    // 3. Evolution Chart
    const dailyMap = new Map<string, { leads: number; spend: number }>();

    // For charts, we rely on the same activeRows to ensure consistency (e.g. hiding Branding)
    activeRows.forEach((r: any) => {
      // Fix Timezone: Manually parse YYYY-MM-DD to Avoid UTC shift
      const [year, month, day] = r.data_referencia.split("-");
      const d = `${day}/${month}`;
      const curr = dailyMap.get(d) ?? { leads: 0, spend: 0 };
      const spendVal = Number(r.investimento || r.spend || 0);

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

    // Grouping by Unit for Donut
    activeRows.forEach((r: any) => {
      const u = r.unidade || "Outros";
      shareMap.set(u, (shareMap.get(u) || 0) + (r.leads || 0));
    });
    const shareData = Array.from(shareMap.entries()).map(([name, value]) => ({ name, value }));



    // 5. CPL By Platform (New Chart)
    const cplMap = new Map<string, { leads: number; spend: number }>();

    activeRows.forEach((r: any) => {
      const plat = (r.platform || "Outros").toUpperCase();
      const curr = cplMap.get(plat) ?? { leads: 0, spend: 0 };
      curr.leads += Number(r.leads || 0);
      curr.spend += Number(r.investimento || r.spend || 0);
      cplMap.set(plat, curr);
    });

    const cplData = Array.from(cplMap.entries()).map(([platform, v]) => ({
      platform,
      leads: v.leads,
      spend: v.spend,
      cpl: v.leads > 0 ? v.spend / v.leads : 0
    }));

    return { kpis, tableRows, evolutionData, shareData, cplData };
  }, [dailyQuery.data, filters.hideBranding]);

  if (dailyQuery.error) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-lg font-bold">Erro ao carregar dados</h2>
        <p>Verifique se a View <code>vw_performance_diaria2</code> existe no Supabase e está acessível.</p>
        <pre className="mt-4 text-xs bg-muted p-4 rounded text-left inline-block">
          {String(dailyQuery.error)}
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

      {dailyQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <PerformanceKpiGrid data={kpis} />

          <div className="grid gap-4 md:grid-cols-3">
            <LeadsShareChart data={shareData} />
            {dailyQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <CplByPlatformChart data={cplData} />
            )}
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
