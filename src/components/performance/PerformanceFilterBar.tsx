import * as React from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, Building2, GraduationCap, Globe, CalendarDays, X, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ModernDateFilter } from "@/components/common/ModernDateFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";


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

function asMonthKey(d: Date) {
    return startOfMonth(d).toISOString();
}

// Queries using the new View
async function fetchBusinessUnits(client: SupabaseClient, month: Date) {
    const from = format(startOfMonth(month), "yyyy-MM-dd");

    const { data, error } = await client
        .from("vw_performance_mensal")
        .select("unidade")
        .eq("mes_referencia", from);

    if (error) {
        console.error("Error fetching units from view", error);
        throw error;
    }

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.unidade).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchCourses(client: SupabaseClient, month: Date, businessUnit: string | null) {
    if (!businessUnit) return [] as string[];
    const from = format(startOfMonth(month), "yyyy-MM-dd");

    const { data, error } = await client
        .from("vw_performance_mensal")
        .select("curso")
        .eq("mes_referencia", from)
        .eq("unidade", businessUnit);

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.curso).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

async function fetchPlatforms(client: SupabaseClient, month: Date) {
    const from = format(startOfMonth(month), "yyyy-MM-dd");

    const { data, error } = await client
        .from("vw_performance_mensal")
        .select("platform")
        .eq("mes_referencia", from);

    if (error) throw error;

    const unique = Array.from(new Set((data ?? []).map((r: any) => r?.platform).filter(Boolean)));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique as string[];
}

export function PerformanceFilterBar() {
    const {
        filters,
        setMonth,
        setBusinessUnit,
        setCourse,
        setPlatform,
        setHideBranding,
        clear
    } = useFilters();

    const [isMobileOpen, setIsMobileOpen] = React.useState(false);

    const activeFiltersCount = [
        filters.businessUnit,
        filters.course,
        filters.platform
    ].filter(Boolean).length;

    const client = getSupabaseClient();
    const months = React.useMemo(() => monthOptions(18), []);

    const businessUnitsQuery = useQuery({
        queryKey: ["perf-filters", "units", asMonthKey(filters.month)],
        queryFn: () => fetchBusinessUnits(client as SupabaseClient, filters.month),
        enabled: !!client,
    });

    const coursesQuery = useQuery({
        queryKey: ["perf-filters", "courses", asMonthKey(filters.month), filters.businessUnit],
        queryFn: () => fetchCourses(client as SupabaseClient, filters.month, filters.businessUnit),
        enabled: !!client && !!filters.businessUnit,
    });

    const platformsQuery = useQuery({
        queryKey: ["perf-filters", "platforms", asMonthKey(filters.month)],
        queryFn: () => fetchPlatforms(client as SupabaseClient, filters.month),
        enabled: !!client,
    });

    return (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm sticky top-0 z-10 mb-6">
            <CardContent className="p-4">
                <div className="flex flex-col gap-4">

                    <div
                        className="flex items-center justify-between lg:hidden cursor-pointer select-none py-1"
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-sm">Filtros (Performance)</span>
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

                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${!isMobileOpen ? 'hidden lg:grid' : ''}`}>

                        {/* Mês - Replaced DatePicker with Select */}
                        <ModernDateFilter
                            date={filters.month}
                            onSelect={(d) => setMonth(d)}
                        />

                        {/* Branding Toggle */}
                        <div className="space-y-1.5 flex flex-col justify-end h-full pb-1">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="hide-branding"
                                    checked={filters.hideBranding}
                                    onCheckedChange={setHideBranding}
                                />
                                <Label htmlFor="hide-branding" className="text-sm font-medium cursor-pointer">
                                    Ocultar Branding
                                </Label>
                            </div>
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
                                        {(businessUnitsQuery.data ?? []).map((u) => (
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
                                    disabled={!filters.businessUnit}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background/50">
                                        <SelectValue
                                            placeholder={
                                                !filters.businessUnit
                                                    ? "Selecione unidade"
                                                    : "Todos"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todos</SelectItem>
                                        {(coursesQuery.data ?? []).map((c) => (
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
