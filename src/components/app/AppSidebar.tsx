import * as React from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, Gauge, Filter, Building2, GraduationCap, Globe } from "lucide-react";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilters } from "@/contexts/filters-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { resolvePerformanceDailyColumns } from "@/integrations/supabase/performanceSchema";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

const navItems = [
  { title: "Controle de Budget", url: "/budget", icon: Gauge },
  { title: "Inteligência Tática", url: "/performance", icon: BarChart3 },
];

function monthOptions(count = 18) {
  const now = startOfMonth(new Date());
  return Array.from({ length: count }).map((_, idx) => {
    const d = subMonths(now, idx);
    return {
      value: d.toISOString(),
      label: format(d, "MMMM yyyy", { locale: ptBR }),
      date: d,
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

  // Preferimos performance_daily porque sempre tem granularidade diária.
  const { data, error } = await client
    .from("fact_ads_performance_daily")
    .select(cols.businessUnitCol)
    .gte(cols.dateCol, from.toISOString())
    .lte(cols.dateCol, to.toISOString());

  if (error) throw error;

  const unique = Array.from(
    new Set((data ?? []).map((r: any) => r?.[cols.businessUnitCol]).filter(Boolean))
  );
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
    .gte(cols.dateCol, from.toISOString())
    .lte(cols.dateCol, to.toISOString());

  if (error) throw error;

  const unique = Array.from(new Set((data ?? []).map((r: any) => r?.[cols.courseCol]).filter(Boolean)));
  unique.sort((a, b) => String(a).localeCompare(String(b)));
  return unique as string[];
}


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { filters, setMonth, setBusinessUnit, setCourse, setPlatform, clear } = useFilters();

  const client = getSupabaseClient();

  const months = React.useMemo(() => monthOptions(18), []);

  const columnsQuery = useQuery({
    queryKey: ["filters", "performanceDailyColumns"],
    queryFn: () => resolvePerformanceDailyColumns(client as SupabaseClient),
    enabled: !!client,
    staleTime: 1000 * 60 * 60, // 1h
  });

  const sameUnitAndCourse =
    !!columnsQuery.data && columnsQuery.data.businessUnitCol === columnsQuery.data.courseCol;

  const businessUnitsQuery = useQuery({
    queryKey: ["filters", "businessUnits", asMonthKey(filters.month)],
    queryFn: () => fetchBusinessUnits(client as SupabaseClient, filters.month),
    enabled: !!client,
  });

  const coursesQuery = useQuery({
    queryKey: ["filters", "courses", asMonthKey(filters.month), filters.businessUnit],
    queryFn: () => fetchCourses(client as SupabaseClient, filters.month, filters.businessUnit),
    enabled: !!client && !!filters.businessUnit && !sameUnitAndCourse,
  });

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-80"}>
      <SidebarHeader className="gap-2">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
            <Filter className="size-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Filtros</p>
              <p className="truncate text-xs text-muted-foreground">Aplicam em todas as páginas</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="text-sidebar-primary"
                    >
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Segmentação</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2">
            {/* Mês */}
            <div className="space-y-1">
              {!collapsed && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="size-3" />
                  <span>Mês</span>
                </div>
              )}
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
              {!collapsed && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="size-3" />
                  <span>Unidade</span>
                </div>
              )}
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

            {/* Curso (depende de unidade) */}
            <div className="space-y-1">
              {!collapsed && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="size-3" />
                  <span>Curso</span>
                </div>
              )}
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
              {!collapsed && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="size-3" />
                  <span>Plataforma</span>
                </div>
              )}
              <Select
                value={filters.platform ?? "__all__"}
                onValueChange={(v) => setPlatform(v === "__all__" ? null : (v as any))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  <SelectItem value="Meta">Meta</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="secondary" className="w-full" onClick={clear}>
              Limpar filtros
            </Button>

            {!client && !collapsed && (
              <p className="text-xs text-destructive">
                Supabase n e3o configurado: confira os Secrets (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) e recarregue o preview.
              </p>
            )}

            {businessUnitsQuery.isError && client && !collapsed && (
              <p className="text-xs text-destructive">
                Erro ao carregar op e7 f5es: {(businessUnitsQuery.error as any)?.message ?? "desconhecido"}
              </p>
            )}

          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
