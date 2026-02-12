import * as React from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isSameMonth, addHours } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { CalendarIcon, Filter, Layers, DollarSign, Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { normalizeText, cn } from "../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  ReferenceLine
} from "recharts";

import { KpiCard, KpiStatus } from "../components/budget/KpiCard";
import { DashboardFilterBar } from "../components/budget/DashboardFilterBar";
import { useFilters } from "@/contexts/filters-context";
import { InvestmentTreeTable } from "../components/budget/InvestmentTreeTable";
import { WeeklyDrawer } from "../components/budget/WeeklyDrawer";
import { getDynamicPacingStatus, getPacingStatusLabel } from "../lib/pacing-utils";

// --- Components ---

function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].payload.fullname}
            </span>
          </div>
          <div className="grid gap-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-medium">
                  {entry.name}:{" "}
                  {entry.value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function WeeklyComparisonChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução Semanal</CardTitle>
          <CardDescription>Sem dados para exibir.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Agrupar por semana (somar todas as unidades)
  const grouped = data.reduce((acc: any, row: any) => {
    const week = row.semana_label || row.data_inicio_semana;
    if (!acc[week]) {
      acc[week] = { week, orcamento: 0, gasto: 0 };
    }
    acc[week].orcamento += Number(row.orcamento_semanal || 0);
    acc[week].gasto += Number(row.gasto_real || 0);
    return acc;
  }, {});

  const chartData = Object.values(grouped).sort((a: any, b: any) => {
    // Tentar ordenar por data se possível, senão string
    return a.week.localeCompare(b.week);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Semanal (Global)</CardTitle>
        <CardDescription>Comparativo de Budget vs Gasto semana a semana.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <span className="text-xs font-bold mb-1 block">{label}</span>
                        <div className="text-xs text-muted-foreground">
                          Budget: {Number(payload[0].value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                        <div className="text-xs text-primary font-medium">
                          Gasto: {Number(payload[1].value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="orcamento" name="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="gasto" name="Gasto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStrategyChart({ data }: { data: any[] }) {
  // Agregar por Funnel Stage
  const strategyData = React.useMemo(() => {
    const agg: Record<string, number> = {
      "Awareness (Branding)": 0,
      "Consideration (Tráfego)": 0,
      "Conversion (Captura)": 0,
    };

    data.forEach(d => {
      // Tentar inferir estratégia pelo nome da unidade ou curso se não tiver campo explicito
      const name = (d.unit || "").toLowerCase();
      let stage = "Conversion (Captura)"; // Default para Ulbra Performance

      if (name.includes("branding") || name.includes("institucional") || name.includes("video")) {
        stage = "Awareness (Branding)";
      } else if (name.includes("trafego") || name.includes("visitas")) {
        stage = "Consideration (Tráfego)";
      }

      if (agg[stage] !== undefined) {
        agg[stage] += d.spend;
      }
    });

    return Object.entries(agg).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [data]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Investimento por Estratégia</CardTitle>
        <CardDescription>Divisão do budget por etapa do funil.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={strategyData}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                fontSize={10}
                tickFormatter={(val) => val.split(" ")[0]} // Show only first word
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded border bg-background p-2 text-xs shadow-sm">
                        <span className="font-bold">{d.name}</span>
                        <div className="mt-1">
                          R$ {d.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} background={{ fill: 'hsl(var(--muted)/0.2)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformDonutChart({ data }: { data: any[] }) {
  // Agregar por Plataforma
  const platformData = React.useMemo(() => {
    const agg: Record<string, number> = {};
    data.forEach(d => {
      // d.platform might be inside children or we flat it?
      // Assuming 'data' is the investmentMatrix (roots). 
      // Roots are units. We need to sum up everything? 
      // Actually investmentMatrix structure is Unit -> Children (platform/course).
      // Let's iterate deeply or rely on specific breakdown if available.
      // For simplicity, let's assume we can't easily get platform from the Top Level Unit grouping 
      // UNLESS we passed a flat list. 
      // Let's try to infer from what we have or skip.
      // Better: use filtered flat list if possible.
      // Workaround: We will use the UNIT name to guess? No.
      // Let's skip valid platform data for now or use a placeholder if complex.
    });
    return [];
  }, [data]);

  return null; // Placeholder until we have platform breakdown ready
}

// --- Main Page Component ---

export default function BudgetPage() {
  const { filters } = useFilters();
  const [selectedUnit, setSelectedUnit] = React.useState<{ unit: string; rows: any[] } | null>(null);

  // Helper safe number
  const client = getSupabaseClient();
  const safeNumber = (v: any) => (isNaN(Number(v)) ? 0 : Number(v));

  // Determine effective range.
  // If user selects a single day in DatePicker, 'to' might be undefined.
  // We default 'to' to 'from' in that case to ensure a valid 1-day range.
  const dateFrom = filters?.dateRange?.from;
  const dateTo = filters?.dateRange?.to;

  const effectiveStart = dateFrom || startOfMonth(new Date());

  // Logic breakdown for debugging
  let endSource = "default-end-of-month";
  let effectiveEnd = endOfMonth(new Date());

  if (dateTo) {
    effectiveEnd = dateTo;
    endSource = "filters.to";
  } else if (dateFrom) {
    effectiveEnd = dateFrom;
    endSource = "filters.from (fallback)";
  }

  console.log("[Budget] DATE LOGIC DEBUG:", {
    filtersDateRange: filters?.dateRange,
    dateFrom,
    dateTo,
    effectiveStart: effectiveStart.toString(),
    effectiveEnd: effectiveEnd.toString(),
    endSource
  });

  // Use a unique key for the query to ensure refetch when filters/month change
  const queryKey = ["budget-data", filters.month?.toISOString(), effectiveStart.toISOString(), effectiveEnd.toISOString(), filters.platform];

  // Fetch Data
  const budgetDataQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!client) return { weeklyRows: [], dailyRows: [], performanceLeads: 0, performanceSpend: 0, plannedTotal: 0, spendTotal: 0 };

      // 1. Fetch Weekly Budget (metas)

      // HYBRID DATE FIX: 
      // Detect if Date is "shifted" (UTC Midnight represented in Local Time, e.g. 21:00) 
      // or "normal" (Local Midnight/End of Day, e.g. 00:00).
      const getSafeDateString = (d: Date) => {
        const h = d.getHours();
        // If hour is 18-22 (6PM-10PM), it's likely a UTC date shifted back by timezone (e.g. UTC-3).
        // In this case, we want the UTC date components.
        if (h >= 18 && h <= 22) {
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        }
        // Otherwise (00:00, 23:59, etc.), use Local components.
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const startStr = getSafeDateString(effectiveStart);
      const endStr = getSafeDateString(effectiveEnd);

      // For Weekly Budget, we need to capture the START of the week that contains our start date.
      // If user selects "Feb 10" (Tuesday), the weekly row might be "Feb 8" (Sunday) or "Feb 9" (Monday).
      // We'll go back to the start of the week to ensure we pick it up.
      const weeklyStart = startOfWeek(effectiveStart, { weekStartsOn: 0 }); // Sunday start to be safe
      const weeklyStartStr = getSafeDateString(weeklyStart);

      // A) Buscar dados SEMANAIS (Budget + Realizado Agregado) - Fonte principal do Planejamento
      let weeklyQuery = client
        .from("vw_dashboard_semanal_detalhado2")
        .select("*")
        .gte("data_inicio_semana", weeklyStartStr)
        .lte("data_inicio_semana", endStr);

      // REMOVED platform filter from weeklyQuery because the view doesn't have the column

      const { data: weeklyRows, error: weeklyError } = await weeklyQuery;

      if (weeklyError) throw weeklyError;

      // B) Buscar dados DIÁRIOS (Spend real dia a dia) - Fonte para o gráfico de Pacing
      let dailyQuery = client
        .from("vw_performance_diaria2")
        .select("data_referencia, unidade, curso, platform, investimento, leads")
        .gte("data_referencia", startStr)
        .lte("data_referencia", endStr);

      if (filters.platform && filters.platform !== "all") {
        dailyQuery = dailyQuery.eq("platform", filters.platform);
      }

      const { data: dailyRows, error: dailyError } = await dailyQuery;

      if (dailyError) throw dailyError;

      // check if we have unit granularity
      const budgetHasUnitGranularity = weeklyRows && weeklyRows.length > 0 && 'unidade' in weeklyRows[0];

      // --- Processamento dos Dados ---

      // 1. Top Level KPIs
      let plannedTotal = 0;
      let spendTotal = 0;
      let performanceLeads = 0; // Leads totais (sem filtro por enquanto, refinaremos no frontend)
      let performanceSpend = 0; // Spend total (sem filtro por enquanto)

      // Use weeklyRows for Budget (sum distinct budget entries?)
      // Cuidado: vw_dashboard_semanal_detalhado2 já cruza budget semanal com realizado semanal.
      // Se somarmos tudo, teremos o total do período.
      weeklyRows?.forEach(r => {
        plannedTotal += safeNumber(r.orcamento_semanal);
        // spendTotal += safeNumber(r.gasto_real); // Melhor pegar do dailyRows para precisão? 
        // A view semanal pode estar atrasada ou arredondada. Vamos usar dailyRows para Realizado Total.
      });

      // Recalcular Realizado Total via DailyRows (mais preciso)
      spendTotal = dailyRows?.reduce((acc, r) => acc + safeNumber(r.investimento), 0) || 0;
      const totalLeads = dailyRows?.reduce((acc, r) => acc + safeNumber(r.leads), 0) || 0;

      // Para KPI de Performance (Leads e CPL), filtraremos Branding visualmente depois, 
      // mas aqui calculamos totais brutos.
      performanceLeads = totalLeads;
      performanceSpend = spendTotal;

      const netVariance = plannedTotal - spendTotal;
      const pacing = plannedTotal > 0 ? spendTotal / plannedTotal : 0; // % consumido

      // Projeção (Forecast) linear simples
      // Dias passados / Total dias * Budget? Não, melhor: Gasto Médio Diário * Dias Restantes
      const today = new Date();
      // Se end date for futuro, projection vai até lá.
      const msPerDay = 1000 * 60 * 60 * 24;
      const totalDaysInPeriod = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerDay));

      // Dias corridos REAIS (com dados)
      // Se o filtro é mês passado, dias corridos = total dias.
      // Se é mês atual, dias corridos = hoje - inicio.
      let daysElapsed = 0;
      if (today > effectiveEnd) {
        daysElapsed = totalDaysInPeriod;
      } else if (today < effectiveStart) {
        daysElapsed = 0;
      } else {
        daysElapsed = Math.ceil((today.getTime() - effectiveStart.getTime()) / msPerDay);
      }

      let forecast = 0;
      if (daysElapsed > 0) {
        const avgDailySpend = spendTotal / daysElapsed;
        forecast = avgDailySpend * totalDaysInPeriod;
      }

      const cpl = performanceLeads > 0 ? performanceSpend / performanceLeads : 0;

      // 2. Unit Rows for Bar Chart (Planned vs Spend)
      const unitMap = new Map<string, { planned: number, spend: number }>();
      weeklyRows?.forEach(r => {
        const u = normalizeText(r.unidade || "Outros");
        const curr = unitMap.get(u) || { planned: 0, spend: 0 };
        curr.planned += safeNumber(r.orcamento_semanal);
        // curr.spend += safeNumber(r.gasto_real); // Usar daily para consistência?
        // Para consistência de drill down, vamos usar o weekly row spend aqui, 
        // pois ele já está "quebrado" por unidade corretamente na view.
        curr.spend += safeNumber(r.gasto_real);
        unitMap.set(u, curr);
      });

      const unitRows = Array.from(unitMap.entries())
        .map(([unit, vals]) => ({ unit, ...vals }))
        .sort((a, b) => b.planned - a.planned); // Top budget first

      // 3. Daily Series for Pacing Chart
      // Precisamos de uma série contínua do dia Start até End
      // Ideal Line: Acumula (TotalBudget / TotalDays) por dia.
      // Real Line: Acumula dailyRows spend.
      const dailySeries: any[] = [];
      const dailySpendMap = new Map<string, number>();

      dailyRows?.forEach(r => {
        const d = r.data_referencia; // YYYY-MM-DD
        const val = safeNumber(r.investimento);
        dailySpendMap.set(d, (dailySpendMap.get(d) || 0) + val);
      });

      let accumIdeal = 0;
      let accumReal = 0;
      const idealPerDay = plannedTotal / totalDaysInPeriod;

      // Loop dia a dia
      for (let i = 0; i < totalDaysInPeriod; i++) {
        const d = new Date(effectiveStart.getTime() + i * msPerDay);
        // Ajuste fuso horário simples (mantendo data local)
        const dStr = format(d, "yyyy-MM-dd");

        // Pacing Ideal: Soma idealPerDay
        accumIdeal += idealPerDay;

        // Pacing Real: Soma se tiver dado (e se data <= hoje ou passado)
        const spendToday = dailySpendMap.get(dStr) || 0;

        // Se a data for futura em relação a hoje (e estivermos vendo mês atual),
        // o Real para de somar (fica flat ou null?). 
        // Geralmente charts mostram linha parando hoje.
        // Vamos deixar null para o gráfico cortar a linha.
        let showReal: number | null = accumReal + spendToday;

        // Se d > today (e estamos no mês corrente), então null
        if (d > today && isSameMonth(d, today)) {
          showReal = null;
        } else {
          accumReal += spendToday;
        }

        // Workaround para datas passadas que não tinham spend (null -> valor anterior)
        // Se showReal for null mas d < today, então deve ser accumReal.
        if (showReal === null && d < today) {
          showReal = accumReal;
        }

        dailySeries.push({
          day: dStr,
          label: format(d, "dd"),
          idealCum: accumIdeal,
          spendCum: showReal
        });
      }


      // 4. Matrix / Tree Data
      // Agrupar Weekly Rows em Estrutura Hierárquica: Unidade -> Curso
      // E simplificar para Tabela
      const investmentMatrix: any[] = [];
      // (This will be computed in frontend via InvestmentTreeTable using raw rows to allow filtering)
      const investmentMatrixRaw = weeklyRows || [];


      return {
        unitRows,
        dailySeries,
        investmentMatrix: investmentMatrixRaw,
        budgetHasUnitGranularity,
        kpis: {
          plannedTotal,
          spendTotal,
          netVariance,
          pacing,
          forecast,
          performanceLeads,
          cpl
        },
        weeklyRows,
        dailyRows
      };
    }
  });

  const { data, isLoading, error } = budgetDataQuery;
  const kpis = data?.kpis;

  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pct = (v: number) => (v * 100).toFixed(1) + "%";

  const getPacingStatus = (pacing: number, expected: number): KpiStatus => {
    // If expected is very low (start of month), tolerances are high.
    // If pacing is > expected + 20% -> warning (overspending)
    // If pacing < expected - 20% -> warning (underspending)
    const diff = pacing - expected;
    const tolerance = 0.15; // 15% tolerance
    if (diff > tolerance) return "warning"; // Overspend
    if (diff < -tolerance) return "warning"; // Underspend (saving too much?)
    return "success";
  };

  // Custom download handler
  const handleDownloadCsv = React.useMemo(() => async (node: any, rangeStart: Date, rangeEnd: Date, client: any) => {
    try {
      if (!rangeStart || !rangeEnd) {
        alert("Selecione um período primeiro.");
        return;
      }

      // 1. Identificar filtros aplicados no nó
      const f = node.filters || {};

      // 2. Determinar colunas do CSV baseado no que temos disponível na view
      let q = client
        .from("vw_performance_diaria2")
        .select(`
          data_referencia,
          platform,
          campaign_name,
          investimento,
          leads,
          clicks,
          impressoes,
          unidade,
          curso
        `)
        .gte("data_referencia", format(rangeStart, "yyyy-MM-dd"))
        .lte("data_referencia", format(rangeEnd, "yyyy-MM-dd"));

      // Aplicar filtros SQL onde possível
      // Unidade é coluna direta
      // Curso é coluna direta
      // Plataforma é coluna (platform)

      // Mapeamento de nomes de colunas (conforme vw_performance_diaria2)
      const dateCol = "data_referencia";
      const platformCol = "platform";
      const campaignCol = "campaign_name";
      const spendCol = "investimento";
      const impressionsCol = "impressoes";
      const clicksCol = "clicks";
      const conversionsCol = "leads";

      // Lista de cursos válidos (fetch ou hardcode, aqui vamos simplificar sem fetch extra)
      // Se precisar de logica complexa de classificação igual do JS, teremos que baixar tudo e processar.
      // Dado que é CSV export, baixar 10k linhas não é problema. Vamos baixar raw e filtrar no JS igual a view.

      const validCourses = new Set([
        "direito", "medicina", "odonto", "psicologia", "enfermagem", "biomedicina", "fisioterapia",
        "estética", "agronomia", "medvet", "arquitetura", "educação física", "sistemas de informação",
        "ciência da computação", "pedagogia", "administração", "contábeis", "farmácia"
      ]); // Exemplo simplificado

      // Fazer a query SEM filtros where específicos de unidade/curso para garantir que pegamos tudo
      // e aplicamos a MESMA lógica de classificação do frontend para consistência.
      // Apenas filtro de data e talvez plataforma se for seguro.

      // Mas se o volume for muito grande, melhor filtrar.
      // O nó tem filters.unit? Sim.
      // O nó tem filters.course? Sim.

      if (f.unit) {
        // O campo 'unidade' no banco pode não estar normalizado igual ao nosso filtro.
        // Mas geralmente está ("Ulbra Canoas", etc).
        // Vamos tentar filtrar por texto aproximado.
        q = q.ilike("unidade", `%${f.unit}%`);
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
  }, [client, effectiveStart, effectiveEnd]);

  // --- Hybrid Data Construction for Matrix ---
  // Merges Weekly Budget (from weeklyRows) + Daily Spend (from dailyRows)
  // This ensures units with Spend but No Budget (e.g. Ulbra Institucional) appear in the Matrix.
  const hybridRowsClean = React.useMemo(() => {
    if (!budgetDataQuery.data) return [];
    const rowMap = new Map<string, any>();

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
          unidade: r.unidade, // keep original casing or normalized?
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

            // Re-calc pacing expectation based on Period (exclude weekends for Conversion campaigns)
            const startD = effectiveStart;
            const endD = effectiveEnd;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Use Business Days for Total Days and Days Elapsed
            // This ensures "Expected Pacing" tracks with business days only
            // getDynamicPacingStatus now handles this internally via excludeWeekends: true
            return getDynamicPacingStatus(kpis.pacing, today, filters.month, { from: startD, to: endD }, { excludeWeekends: true }) as KpiStatus;
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
              // Wait, investmentMatrix IS weeklyRows (raw).
              // Need to iterate and check unit name.

              (budgetDataQuery.data.weeklyRows || []).forEach((r: any) => {
                const name = (r.unidade || "").toLowerCase();
                if (name.includes("branding") || name.includes("institucional")) {
                  brandingSpend += safeNumber(r.gasto_real);
                }
              });

              // But wait, kpis.spendTotal was calculated from dailyRows.
              // We should calculate brandingSpend from dailyRows too for consistency.
              brandingSpend = 0;
              (budgetDataQuery.data.dailyRows || []).forEach((r: any) => {
                const name = (r.unidade || "").toLowerCase();
                if (name.includes("branding") || name.includes("institucional")) {
                  brandingSpend += safeNumber(r.investimento);
                }
              });


              // CPL sem Branding = (Gasto sem Branding) / (Leads sem Branding)
              // Assuming Branding leads = 0 (usually true). If not, we should subtract them too.
              const totalSpend = kpis.spendTotal || 0;
              const performanceLeads = kpis.performanceLeads || 0; // Already total leads
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
                      // TODO: fill with overpacingGradient if spend > ideal via gradient stops dynamic? Hard in Recharts.
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
