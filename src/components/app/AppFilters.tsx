
import * as React from "react";
import { format, subMonths, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Building2, GraduationCap, Globe, CalendarDays } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";
import { resolvePerformanceMetricColumns } from "@/integrations/supabase/performanceMetricsSchema";

// --- Fetch Helpers (Migrated from AppSidebar) ---

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
    // Safety: Create a date in the middle of the selected month to avoid timezone edge cases (e.g. UTC vs Local)
    const secureMonth = new Date(month.getFullYear(), month.getMonth(), 15);
    const start = startOfMonth(secureMonth);
    const end = endOfMonth(secureMonth);

    // Explicitly using weekStartsOn: 1 (Monday) to match user's Excel view
    const weeks = eachWeekOfInterval({
        start: startOfWeek(start, { weekStartsOn: 1 }),
        end: endOfWeek(end, { weekStartsOn: 1 })
    }, { weekStartsOn: 1 });

    return weeks.map(w => {
        const s = startOfWeek(w, { weekStartsOn: 1 });
        const e = endOfWeek(w, { weekStartsOn: 1 });

        let label = "";
        if (isSameMonth(s, e)) {
            // Same month: "12 a 18 jan" (0 padded day)
            label = `${format(s, "dd")} a ${format(e, "dd MMM", { locale: ptBR })}`;
        } else {
            // Cross month: "26 jan a 01 fev"
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
        .from("vw_dashboard_semanal_detalhado2")
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
        .from("vw_dashboard_semanal_detalhado2")
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
        .from("vw_dashboard_semanal_detalhado2")
        .select("plataforma")
        .gte("data_inicio_semana", format(from, "yyyy-MM-dd"))
        .lte("data_inicio_semana", format(to, "yyyy-MM-dd"));

    if (error) throw error;
    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.plataforma).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}


export function AppFilters() {
    const location = useLocation();
    const isBudgetRoute = location.pathname.startsWith("/budget");
    const {
        filters,
        setMonth,
        setBusinessUnit,
        setCourse,
        setPlatform,
        setWeek,
        setExcludeEad,
        clear,
        isFiltersOpen,
        setIsFiltersOpen
    } = useFilters();
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
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetContent side="right" className="w-full max-w-md sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Segmentação</SheetTitle>
                    <SheetDescription>
                        Aplique filtros globais para refinar os dados.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                    {/* Mês */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Filter className="size-3" />
                            <span>Mês</span>
                        </div>
                        <Select
                            value={asMonthKey(filters.month)}
                            onValueChange={(v) => setMonth(new Date(v))}
                        >
                            <SelectTrigger>
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

                    {/* Unidade */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="size-3" />
                            <span>Unidade</span>
                        </div>
                        {businessUnitsQuery.isLoading ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select
                                value={filters.businessUnit ?? "__all__"}
                                onValueChange={(v) => setBusinessUnit(v === "__all__" ? null : v)}
                            >
                                <SelectTrigger>
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
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <GraduationCap className="size-3" />
                            <span>Curso</span>
                        </div>
                        {coursesQuery.isLoading ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select
                                value={filters.course ?? "__all__"}
                                onValueChange={(v) => setCourse(v === "__all__" ? null : v)}
                                disabled={!filters.businessUnit || sameUnitAndCourse}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            !filters.businessUnit
                                                ? "Selecione a unidade"
                                                : sameUnitAndCourse
                                                    ? "Mesmo nível de Unidade"
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
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Globe className="size-3" />
                            <span>Plataforma</span>
                        </div>
                        {platformsQuery.isLoading ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select
                                value={filters.platform ?? "__all__"}
                                onValueChange={(v) => setPlatform(v === "__all__" ? null : v)}
                            >
                                <SelectTrigger>
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

                    {/* Semana */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="size-3" />
                            <span>Semana</span>
                        </div>
                        <Select
                            value={filters.week ?? "__all__"}
                            onValueChange={(v) => setWeek(v === "__all__" ? null : v)}
                        >
                            <SelectTrigger>
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

                    <Button variant="secondary" className="w-full" onClick={clear}>
                        Limpar filtros
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
