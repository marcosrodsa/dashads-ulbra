import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Platform = "meta" | "google" | "all";

export type DashboardFilters = {
  month: string; // YYYY-MM
  unidades: string[];
  cursos: string[];
  platform: Platform;
};

function monthRange(monthYYYYMM: string) {
  const [yStr, mStr] = monthYYYYMM.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  // first day of month (UTC-ish, but we serialize as YYYY-MM-DD)
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toYMD(start), end: toYMD(end) };
}

function platformToDb(platform: Platform) {
  if (platform === "meta") return "META";
  if (platform === "google") return "GOOGLE";
  return null;
}

function applyConsolidadoFilters(query: any, filters: DashboardFilters) {
  // v_dashboard_consolidado
  // - mês: coluna `mes` (DATE) -> filtramos por intervalo [start, end)
  // - plataforma: coluna `plataforma` (ex.: META/GOOGLE)
  // - unidade: coluna `unidade`
  // - curso: coluna `curso`
  const { start, end } = monthRange(filters.month);

  // PostgREST aceita gte/lt para DATE/TEXT (YYYY-MM-DD)
  query = query.gte("mes", start).lt("mes", end);

  const p = platformToDb(filters.platform);
  if (p) query = query.eq("plataforma", p);

  if (filters.unidades?.length) {
    query = query.in("unidade", filters.unidades);
  }

  if (filters.cursos?.length) {
    // Você confirmou que a view já tem a coluna de curso.
    query = query.in("curso", filters.cursos);
  }

  return query;
}

function applySemanalFilters(query: any, filters: DashboardFilters) {
  // v_dashboard_semanal
  // - mês: filtra por intervalo [start, end) na coluna `data` (YYYY-MM-DD)
  // - plataforma/unidade/curso: mesmas colunas do consolidado
  // Pré-requisito: a view deve expor a coluna `curso`.
  const { start, end } = monthRange(filters.month);

  query = query.gte("data", start).lt("data", end);

  const p = platformToDb(filters.platform);
  if (p) query = query.eq("plataforma", p);

  if (filters.unidades?.length) {
    query = query.in("unidade", filters.unidades);
  }

  if (filters.cursos?.length) {
    query = query.in("curso", filters.cursos);
  }

  return query;
}

export function useDashboardConsolidado(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "consolidado", filters],
    queryFn: async () => {
      let q = supabase.from("v_dashboard_consolidado").select("*");
      q = applyConsolidadoFilters(q, filters);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardSemanal(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "semanal", filters.month, filters.platform, filters.unidades, filters.cursos],
    queryFn: async () => {
      let q = supabase.from("v_dashboard_semanal").select("*");
      q = applySemanalFilters(q, filters);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDashboardFilterOptions(params: { month: string; platform: Platform }) {
  return useQuery({
    queryKey: ["dashboard", "filter-options", params],
    queryFn: async () => {
      const { start, end } = monthRange(params.month);

      let q = supabase.from("v_dashboard_consolidado").select("unidade,curso,plataforma,mes");
      q = q.gte("mes", start).lt("mes", end);

      const p = platformToDb(params.platform);
      if (p) q = q.eq("plataforma", p);

      const { data, error } = await q;
      if (error) throw error;

      const unidades = new Set<string>();
      const cursos = new Set<string>();

      for (const r of data ?? []) {
        if (r?.unidade) unidades.add(String(r.unidade));
        if (r?.curso) cursos.add(String(r.curso));
      }

      const toSortedArray = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));

      return {
        unidades: toSortedArray(unidades),
        cursos: toSortedArray(cursos),
      };
    },
  });
}
