import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, isSameMonth, differenceInDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Building2, GraduationCap, Globe, CalendarDays, X, ChevronDown, ChevronUp, Calendar as CalendarIcon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";

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

function weekOptions(range: { from: Date; to: Date } | undefined) {
    if (!range || !range.from || !range.to) return [];

    // Capturar todos os meses no intervalo para gerar semanas de cada um
    const start = startOfMonth(range.from);
    const end = endOfMonth(range.to);

    const weeks = eachWeekOfInterval({
        start: startOfWeek(start, { weekStartsOn: 1 }),
        end: endOfWeek(end, { weekStartsOn: 1 })
    }, { weekStartsOn: 1 });

    // Mapa para evitar duplicatas de semanas que podem cruzar meses
    const seen = new Set<string>();

    return weeks
        .map(w => {
            const s = startOfWeek(w, { weekStartsOn: 1 });
            const e = endOfWeek(w, { weekStartsOn: 1 });
            const val = s.toISOString();

            if (seen.has(val)) return null;
            seen.add(val);

            let label = "";
            if (isSameMonth(s, e)) {
                label = `${format(s, "dd")} a ${format(e, "dd MMM", { locale: ptBR })}`;
            } else {
                label = `${format(s, "dd MMM", { locale: ptBR })} a ${format(e, "dd MMM", { locale: ptBR })}`;
            }

            return {
                value: val,
                label: label.toLowerCase(),
                startDate: s
            };
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);
}

function subMonths(date: Date, amount: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - amount);
    return result;
}


// Simplified Fetchers using vw_performance_diaria2 (consistent with PerformanceFilterBar)
async function fetchBusinessUnits(client: SupabaseClient, from: Date, to: Date) {
    const start = format(from, "yyyy-MM-dd");
    const end = format(to, "yyyy-MM-dd");

    const { data, error } = await client
        .from("vw_performance_diaria2")
        .select("unidade")
        .gte("data_referencia", start)
        .lte("data_referencia", end);

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.unidade).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchCourses(client: SupabaseClient, from: Date, to: Date, businessUnit: string | null) {
    if (!businessUnit) return [] as string[];
    const start = format(from, "yyyy-MM-dd");
    const end = format(to, "yyyy-MM-dd");

    const { data, error } = await client
        .from("vw_performance_diaria2")
        .select("curso")
        .gte("data_referencia", start)
        .lte("data_referencia", end)
        .eq("unidade", businessUnit);

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.curso).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchPlatforms(client: SupabaseClient, from: Date, to: Date) {
    const start = format(from, "yyyy-MM-dd");
    const end = format(to, "yyyy-MM-dd");

    const { data, error } = await client
        .from("vw_performance_diaria2")
        .select("platform")
        .gte("data_referencia", start)
        .lte("data_referencia", end);

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.platform).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

export function DashboardFilterBar() {
    const location = useLocation();
    const isBudgetRoute = location.pathname.startsWith("/budget");
    const {
        filters,
        setDateRange,
        setBusinessUnit,
        setCourse,
        setPlatform,
        setWeek,
        clear
    } = useFilters();

    // Estado para controlar expansão no mobile
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    // Contagem de filtros ativos para feedback visual
    const activeFiltersCount = [
        filters.businessUnit,
        filters.course,
        filters.platform,
        filters.week
    ].filter(Boolean).length;

    const client = getSupabaseClient();
    const weeks = React.useMemo(() => weekOptions(filters.dateRange as any), [filters.dateRange]);

    const columnsQuery = useQuery({
        queryKey: ["filters", "performanceDailyColumns"],
        queryFn: () => resolvePerformanceDailyColumns(client as SupabaseClient),
        enabled: !!client && !isBudgetRoute,
        staleTime: 1000 * 60 * 60,
    });

    const sameUnitAndCourse = !isBudgetRoute && !!columnsQuery.data && columnsQuery.data.businessUnitCol === columnsQuery.data.courseCol;

    const rangeStart = filters.dateRange?.from ?? startOfMonth(new Date());
    const rangeEnd = filters.dateRange?.to ?? filters.dateRange?.from ?? endOfMonth(rangeStart);

    // --- State and Logic for Split Date UX (Period Select + Custom Date Picker) ---

    // Helper to get formatted range label for presets
    const getPresetRangeLabel = (days: number) => {
        const end = subDays(new Date(), 1); // Yesterday
        const start = subDays(end, days - 1);
        return `(${format(start, "dd/MM")} - ${format(end, "dd/MM")})`;
    };

    // Detect initial period from filters
    const detectPeriod = React.useCallback(() => {
        if (!filters.dateRange?.from || !filters.dateRange?.to) return "30"; // Default

        const end = new Date();
        const yesterday = subDays(end, 1);
        // Check if TO is Yesterday (ignoring time)
        if (!isSameDay(filters.dateRange.to, yesterday)) return "custom";

        const diff = differenceInDays(filters.dateRange.to, filters.dateRange.from) + 1;
        if ([1, 7, 15, 30, 90].includes(diff)) return diff.toString();

        return "custom";
    }, [filters.dateRange]);

    const [period, setPeriod] = React.useState<string>(detectPeriod());

    // 1. Sync DateRange -> Local Period State (When global filters change)
    React.useEffect(() => {
        const detected = detectPeriod();
        if (detected !== period) {
            setPeriod(detected);
        }
    }, [filters.dateRange, detectPeriod, period]);

    // 2. Sync Local Period Dropdown -> Global Filter State
    React.useEffect(() => {
        if (period !== "custom") {
            const today = new Date();
            const end = subDays(today, 1); // D-1 (Yesterday)
            const days = parseInt(period) || 30;
            const start = subDays(end, days - 1);

            // Avoid infinite loop by checking if range is already same
            const currentStart = filters.dateRange?.from;
            const currentEnd = filters.dateRange?.to;

            if (!currentStart || !currentEnd || !isSameDay(currentStart, start) || !isSameDay(currentEnd, end)) {
                setDateRange({ from: start, to: end });
            }
        }
    }, [period, setDateRange]);


    const businessUnitsQuery = useQuery({
        queryKey: ["filters", "businessUnits", isBudgetRoute ? "budget" : "performance", rangeStart.toISOString(), rangeEnd.toISOString()],
        queryFn: () => fetchBusinessUnits(client as SupabaseClient, rangeStart, rangeEnd),
        enabled: !!client,
    });

    const coursesQuery = useQuery({
        queryKey: ["filters", "courses", isBudgetRoute ? "budget" : "performance", rangeStart.toISOString(), rangeEnd.toISOString(), filters.businessUnit],
        queryFn: () => fetchCourses(client as SupabaseClient, rangeStart, rangeEnd, filters.businessUnit),
        enabled: !!client && !!filters.businessUnit,
    });

    const platformsQuery = useQuery({
        queryKey: ["filters", "platforms", isBudgetRoute ? "budget" : "performance", rangeStart.toISOString(), rangeEnd.toISOString()],
        queryFn: () => fetchPlatforms(client as SupabaseClient, rangeStart, rangeEnd),
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
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 ${!isMobileOpen ? 'hidden lg:grid' : ''}`}>

                        {/* Período (Split UX) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Período
                            </label>

                            <div className="flex gap-2">
                                <Select
                                    value={period}
                                    onValueChange={(v) => {
                                        setPeriod(v);
                                        if (v === "custom") {
                                            // Limpa o range ao entrar no modo personalizado para facilitar a escolha de um dia único
                                            setDateRange(undefined);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background/50">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Ontem <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(1)}</span></SelectItem>
                                        <SelectItem value="7">Últimos 7 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(7)}</span></SelectItem>
                                        <SelectItem value="15">Últimos 15 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(15)}</span></SelectItem>
                                        <SelectItem value="30">Últimos 30 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(30)}</span></SelectItem>
                                        <SelectItem value="90">Últimos 90 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(90)}</span></SelectItem>
                                        <SelectItem value="custom">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Custom Date Picker - Only shows if 'custom' is selected */}
                            {period === "custom" && (
                                <div className="absolute top-[68px] z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-background shadow-md border-primary/20">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.dateRange?.from ? (
                                                    filters.dateRange.to && !isSameDay(filters.dateRange.from, filters.dateRange.to) ? (
                                                        <>{format(filters.dateRange.from, "dd/MM/yy", { locale: ptBR })} - {format(filters.dateRange.to, "dd/MM/yy", { locale: ptBR })}</>
                                                    ) : (
                                                        format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                                                    )
                                                ) : (
                                                    <span>Selecione o período</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="range"
                                                selected={filters.dateRange}
                                                onSelect={(range) => {
                                                    setDateRange(range);
                                                    if (range?.from && range?.to) {
                                                        setIsCalendarOpen(false);
                                                    }
                                                }}
                                                numberOfMonths={2}
                                                locale={ptBR}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}
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
