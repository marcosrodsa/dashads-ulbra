import * as React from "react";
import { format, subMonths, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Building2, GraduationCap, Globe, CalendarDays, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";
import { resolvePerformanceMetricColumns } from "@/integrations/supabase/performanceMetricsSchema";

// --- Helpers copiados de AppFilters.tsx ---

function monthOptions(count = 18) {
    const now = startOfMonth(new Date());
    return Array.from({ length: count }).map((_, idx) => {
        const d = subMonths(now, idx);
        return {
            value: d.toISOString(),
            label: format(d, "MMMM yyyy", { locale: ptBR }),
            date: d,
        };
    }).filter(option => option.date.getFullYear() >= 2026);
}

function weekOptions(month: Date) {
    const secureMonth = new Date(month.getFullYear(), month.getMonth(), 15);
    const start = startOfMonth(secureMonth);
    const end = endOfMonth(secureMonth);

    const weeks = eachWeekOfInterval({
        start: startOfWeek(start, { weekStartsOn: 1 }),
        end: endOfWeek(end, { weekStartsOn: 1 })
    }, { weekStartsOn: 1 });

    return weeks.map(w => {
        const s = startOfWeek(w, { weekStartsOn: 1 });
        const e = endOfWeek(w, { weekStartsOn: 1 });

        let label = "";
        if (isSameMonth(s, e)) {
            label = `${format(s, "dd")} a ${format(e, "dd MMM", { locale: ptBR })}`;
        } else {
            label = `${format(s, "dd MMM", { locale: ptBR })} a ${format(e, "dd MMM", { locale: ptBR })}`;
        }

        return {
            value: s.toISOString(),
            label: label.toLowerCase(),
            startDate: s
        };
    });
}

function asMonthKey(d: Date) {
    return startOfMonth(d).toISOString();
}

async function fetchBusinessUnits(client: SupabaseClient, month: Date) {
    const cols = await resolvePerformanceDailyColumns(client);
    const from = startOfMonth(month);
    const to = endOfMonth(month);

    const { data, error } = await client
        .from("fact_ads_performance_daily")
        .select(cols.businessUnitCol)
        .gte(cols.dateCol, format(from, "yyyy-MM-dd"))
        .lte(cols.dateCol, format(to, "yyyy-MM-dd"));

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.[cols.businessUnitCol]).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchCourses(client: SupabaseClient, month: Date, businessUnit: string | null) {
    if (!businessUnit) return [] as string[];
    const cols = await resolvePerformanceDailyColumns(client);
    const from = startOfMonth(month);
    const to = endOfMonth(month);

    const { data, error } = await client
        .from("fact_ads_performance_daily")
        .select(cols.courseCol)
        .eq(cols.businessUnitCol, businessUnit)
        .gte(cols.dateCol, format(from, "yyyy-MM-dd"))
        .lte(cols.dateCol, format(to, "yyyy-MM-dd"));

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.[cols.courseCol]).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchPlatforms(client: SupabaseClient, month: Date) {
    const metrics = await resolvePerformanceMetricColumns(client);
    if (!metrics.platformCol) return [] as string[];
    const cols = await resolvePerformanceDailyColumns(client);
    const from = startOfMonth(month);
    const to = endOfMonth(month);

    const { data, error } = await client
        .from("fact_ads_performance_daily")
        .select(metrics.platformCol)
        .gte(cols.dateCol, format(from, "yyyy-MM-dd"))
        .lte(cols.dateCol, format(to, "yyyy-MM-dd"));

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.[metrics.platformCol!]).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchBusinessUnitsWeeklyView(client: SupabaseClient, month: Date) {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    const { data, error } = await client
        .from("vw_dashboard_semanal_detalhado")
        .select("unidade")
        .gte("data_inicio_semana", format(from, "yyyy-MM-dd"))
        .lte("data_inicio_semana", format(to, "yyyy-MM-dd"));

    if (error) throw error;
    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.unidade).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchCoursesWeeklyView(client: SupabaseClient, month: Date, businessUnit: string | null) {
    if (!businessUnit) return [] as string[];
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    const { data, error } = await client
        .from("vw_dashboard_semanal_detalhado")
        .select("curso")
        .eq("unidade", businessUnit)
        .gte("data_inicio_semana", format(from, "yyyy-MM-dd"))
        .lte("data_inicio_semana", format(to, "yyyy-MM-dd"));

    if (error) throw error;
    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.curso).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchPlatformsWeeklyView(client: SupabaseClient, month: Date) {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    const { data, error } = await client
        .from("vw_dashboard_semanal_detalhado")
        .select("plataforma")
        .gte("data_inicio_semana", format(from, "yyyy-MM-dd"))
        .lte("data_inicio_semana", format(to, "yyyy-MM-dd"));

    if (error) throw error;
    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.plataforma).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

export function DashboardFilterBar() {
    const location = useLocation();
    const isBudgetRoute = location.pathname.startsWith("/budget");
    const {
        filters,
        setMonth,
        setBusinessUnit,
        setCourse,
        setPlatform,
        setWeek,
        clear
    } = useFilters();

    // Estado para controlar expansão no mobile
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);

    // Contagem de filtros ativos para feedback visual
    const activeFiltersCount = [
        filters.businessUnit,
        filters.course,
        filters.platform,
        filters.week
    ].filter(Boolean).length;

    const client = getSupabaseClient();
    const months = React.useMemo(() => monthOptions(18), []);
    const weeks = React.useMemo(() => weekOptions(filters.month), [filters.month]);

    const columnsQuery = useQuery({
        queryKey: ["filters", "performanceDailyColumns"],
        queryFn: () => resolvePerformanceDailyColumns(client as SupabaseClient),
        enabled: !!client && !isBudgetRoute,
        staleTime: 1000 * 60 * 60,
    });

    const sameUnitAndCourse = !isBudgetRoute && !!columnsQuery.data && columnsQuery.data.businessUnitCol === columnsQuery.data.courseCol;

    const businessUnitsQuery = useQuery({
        queryKey: ["filters", "businessUnits", isBudgetRoute ? "budget" : "performance", asMonthKey(filters.month)],
        queryFn: () =>
            isBudgetRoute
                ? fetchBusinessUnitsWeeklyView(client as SupabaseClient, filters.month)
                : fetchBusinessUnits(client as SupabaseClient, filters.month),
        enabled: !!client,
    });

    const coursesQuery = useQuery({
        queryKey: ["filters", "courses", isBudgetRoute ? "budget" : "performance", asMonthKey(filters.month), filters.businessUnit],
        queryFn: () =>
            isBudgetRoute
                ? fetchCoursesWeeklyView(client as SupabaseClient, filters.month, filters.businessUnit)
                : fetchCourses(client as SupabaseClient, filters.month, filters.businessUnit),
        enabled: !!client && !!filters.businessUnit && (isBudgetRoute || !sameUnitAndCourse),
    });

    const platformsQuery = useQuery({
        queryKey: ["filters", "platforms", isBudgetRoute ? "budget" : "performance", asMonthKey(filters.month)],
        queryFn: () =>
            isBudgetRoute
                ? fetchPlatformsWeeklyView(client as SupabaseClient, filters.month)
                : fetchPlatforms(client as SupabaseClient, filters.month),
        enabled: !!client,
    });

    return (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm sticky top-0 z-10 mb-6">
            <CardContent className="p-4">
                <div className="flex flex-col gap-4">

                    {/* Linha de Título + Botão Limpar (Mobile - Interativo) */}
                    <div
                        className="flex items-center justify-between lg:hidden cursor-pointer select-none py-1"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">Filtros</span>
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-5 flex justify-center">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                            {isMobileOpen ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                            )}
                        </div>
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clear();
                                }}
                            >
                                Limpar
                            </Button>
                        )}
                    </div>

                    {/* Grid de Filtros - Oculto no mobile se fechado, sempre visível no desktop */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 ${!isMobileOpen ? 'hidden lg:grid' : ''}`}>

                        {/* Mês */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Mês
                            </label>
                            <Select
                                value={asMonthKey(filters.month)}
                                onValueChange={(v) => setMonth(new Date(v))}
                            >
                                <SelectTrigger className="h-9 w-full bg-background/50">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Semana */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Semana
                            </label>
                            <Select
                                value={filters.week ?? "__all__"}
                                onValueChange={(v) => setWeek(v === "__all__" ? null : v)}
                            >
                                <SelectTrigger className="h-9 w-full bg-background/50">
                                    <SelectValue placeholder="Todas as Semanas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Todas as Semanas</SelectItem>
                                    {weeks.map((w) => (
                                        <SelectItem key={w.value} value={w.value}>
                                            {w.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Unidade */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                Unidade
                            </label>
                            {businessUnitsQuery.isLoading ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select
                                    value={filters.businessUnit ?? "__all__"}
                                    onValueChange={(v) => setBusinessUnit(v === "__all__" ? null : v)}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background/50">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todas</SelectItem>
                                        {businessUnitsQuery.data?.map((u) => (
                                            <SelectItem key={u} value={u}>
                                                {u}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Curso */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <GraduationCap className="h-3.5 w-3.5" />
                                Curso
                            </label>
                            {coursesQuery.isLoading ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select
                                    value={filters.course ?? "__all__"}
                                    onValueChange={(v) => setCourse(v === "__all__" ? null : v)}
                                    disabled={!filters.businessUnit || sameUnitAndCourse}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background/50">
                                        <SelectValue
                                            placeholder={
                                                !filters.businessUnit
                                                    ? "Selecione unidade"
                                                    : sameUnitAndCourse
                                                        ? "-"
                                                        : "Todos"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todos</SelectItem>
                                        {!sameUnitAndCourse &&
                                            coursesQuery.data?.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Plataforma */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                Plataforma
                            </label>
                            {platformsQuery.isLoading ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select
                                    value={filters.platform ?? "__all__"}
                                    onValueChange={(v) => setPlatform(v === "__all__" ? null : v)}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background/50">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todas</SelectItem>
                                        {(platformsQuery.data ?? []).map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* Botão Limpar Desktop - Visível apenas quando há filtros e tela large */}
                    <div className="hidden lg:flex justify-end">
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clear}
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="mr-1 h-3 w-3" />
                                Limpar filtros
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
