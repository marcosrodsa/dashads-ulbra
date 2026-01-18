import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Chrome, Facebook, RotateCcw } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { MultiSelect } from "@/components/filters/MultiSelect";
import { WeeklyPacingMatrix } from "@/components/dashboard/WeeklyPacingMatrix";
import { formatBRL, formatPercent, safeNumber } from "@/lib/format";
import {
  computeForecast,
  computeSemaphoreStatus,
  computeUtilizationPct,
  monthMeta,
  type SemaphoreStatus,
  useStableNow,
} from "@/lib/pacing";
import {
  useDashboardConsolidado,
  useDashboardFilterOptions,
  useDashboardSemanal,
  type DashboardFilters,
} from "@/hooks/use-dashboard";

type PlatformDb = "META" | "GOOGLE" | string;

type ConsolidadoRow = {
  mes?: string;
  unidade?: string;
  curso?: string;
  plataforma?: PlatformDb;
  orcamento?: unknown;
  gasto_real?: unknown;
};

function statusBadgeProps(status: SemaphoreStatus) {
  switch (status) {
    case "CRITICAL":
      return { label: "Estouro", variant: "destructive" as const, pulse: true };
    case "WARNING":
      return { label: "Abaixo do ritmo", variant: "secondary" as const, pulse: false };
    default:
      return { label: "No ritmo", variant: "default" as const, pulse: false };
  }
}

function platformIcon(p: PlatformDb) {
  if (String(p).toUpperCase() === "META") return <Facebook className="h-4 w-4" />;
  if (String(p).toUpperCase() === "GOOGLE") return <Chrome className="h-4 w-4" />;
  return null;
}

function moneyClassBySign(value: number) {
  if (value < 0) return "text-destructive";
  if (value > 0) return "text-emerald-600"; // TODO: tokenizar com variável se quiser levar pro design system
  return "text-foreground";
}

export default function DashboardPage() {
  const now = useStableNow();

  const [filters, setFilters] = useState<DashboardFilters>({
    month: new Date().toISOString().slice(0, 7),
    unidades: [],
    cursos: [],
    platform: "all",
  });

  const consolidado = useDashboardConsolidado(filters);
  const semanal = useDashboardSemanal(filters);

  const options = useDashboardFilterOptions({ month: filters.month, platform: filters.platform });

  const computedRows = useMemo(() => {
    const rows = (consolidado.data ?? []) as ConsolidadoRow[];
    return rows.map((r) => {
      const budget = safeNumber(r.orcamento);
      const spend = safeNumber(r.gasto_real);
      const forecast = computeForecast(spend, filters.month, now);
      const utilizationPct = computeUtilizationPct(spend, budget);
      const status = computeSemaphoreStatus(forecast, budget);
      const variance = forecast - budget;
      return {
        unidade: String(r.unidade ?? ""),
        curso: String(r.curso ?? ""),
        plataforma: String(r.plataforma ?? ""),
        budget,
        spend,
        forecast,
        utilizationPct,
        variance,
        status,
      };
    });
  }, [consolidado.data, filters.month, now]);

  const execKpis = useMemo(() => {
    const totalBudget = computedRows.reduce((acc, r) => acc + r.budget, 0);
    const totalSpend = computedRows.reduce((acc, r) => acc + r.spend, 0);
    const projectedClosing = computedRows.reduce((acc, r) => acc + r.forecast, 0);
    const netVariance = totalBudget - projectedClosing; // positivo = sobra

    const { totalDays, daysPassed, isCurrent } = monthMeta(filters.month, now);
    const timePassed = totalDays > 0 ? daysPassed / totalDays : 0;
    const budgetConsumed = totalBudget > 0 ? totalSpend / totalBudget : 0;

    return {
      totalBudget,
      totalSpend,
      projectedClosing,
      netVariance,
      timePassed,
      budgetConsumed,
      isCurrent,
    };
  }, [computedRows, filters.month, now]);

  const grouped = useMemo(() => {
    // unidade -> curso -> rows
    const byUnit = new Map<string, Map<string, typeof computedRows>>();

    for (const r of computedRows) {
      const u = r.unidade || "(Sem unidade)";
      const c = r.curso || "(Sem curso)";
      if (!byUnit.has(u)) byUnit.set(u, new Map());
      const byCourse = byUnit.get(u)!;
      if (!byCourse.has(c)) byCourse.set(c, []);
      byCourse.get(c)!.push(r);
    }

    const unitEntries = Array.from(byUnit.entries()).map(([unidade, coursesMap]) => {
      const courses = Array.from(coursesMap.entries()).map(([curso, rows]) => {
        const budget = rows.reduce((a, x) => a + x.budget, 0);
        const spend = rows.reduce((a, x) => a + x.spend, 0);
        const forecast = rows.reduce((a, x) => a + x.forecast, 0);
        const variance = forecast - budget;
        const status = computeSemaphoreStatus(forecast, budget);

        // Ordena linhas (plataformas) por variance desc
        const sortedRows = [...rows].sort((a, b) => b.variance - a.variance);

        return { curso, rows: sortedRows, budget, spend, forecast, variance, status };
      });

      // Ordena cursos por variance desc
      courses.sort((a, b) => b.variance - a.variance);

      const budget = courses.reduce((a, x) => a + x.budget, 0);
      const spend = courses.reduce((a, x) => a + x.spend, 0);
      const forecast = courses.reduce((a, x) => a + x.forecast, 0);
      const variance = forecast - budget;
      const status = computeSemaphoreStatus(forecast, budget);

      return { unidade, courses, budget, spend, forecast, variance, status };
    });

    // Ordena unidades por variance desc
    unitEntries.sort((a, b) => b.variance - a.variance);

    return unitEntries;
  }, [computedRows]);

  const scatterData = useMemo(() => {
    return computedRows.map((r) => ({
      name: `${r.unidade} • ${r.curso} • ${r.plataforma}`,
      budget: r.budget,
      utilization: r.utilizationPct,
    }));
  }, [computedRows]);

  const top5OverspendUnits = useMemo(() => {
    const map = new Map<string, { unidade: string; overspend: number }>();
    for (const u of grouped) {
      const overspend = Math.max(0, u.forecast - u.budget);
      map.set(u.unidade, { unidade: u.unidade, overspend });
    }
    return Array.from(map.values())
      .sort((a, b) => b.overspend - a.overspend)
      .slice(0, 5);
  }, [grouped]);

  const weeklyChartData = useMemo(() => {
    return (semanal.data ?? []).map((r: any) => {
      const planned = safeNumber(r?.orcamento_semanal);
      const realized = safeNumber(r?.gasto_real);
      const label = String(r?.semana_label ?? "");

      return { label, planned, realized };
    });
  }, [semanal.data]);

  const loading = consolidado.isLoading || semanal.isLoading || options.isLoading;

  const unitOptions = (options.data?.unidades ?? []).map((u) => ({ value: u, label: u }));
  const courseOptions = (options.data?.cursos ?? []).map((c) => ({ value: c, label: c }));

  const resetFilters = () =>
    setFilters({
      month: new Date().toISOString().slice(0, 7),
      unidades: [],
      cursos: [],
      platform: "all",
    });

  const arrow = execKpis.projectedClosing > execKpis.totalBudget ? <ArrowUpRight /> : <ArrowDownRight />;

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/95 p-4 backdrop-blur md:-mx-6 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Gestão de Budget</h1>
              <p className="text-sm text-muted-foreground">Unidade • Curso • Plataforma — projeção e pacing</p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs text-muted-foreground">Mês</label>
                <Input
                  type="month"
                  value={filters.month}
                  onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                />
              </div>

              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs text-muted-foreground">Unidades</label>
                <MultiSelect
                  value={filters.unidades}
                  options={unitOptions}
                  onChange={(unidades) => setFilters((f) => ({ ...f, unidades }))}
                  placeholder="Todas"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs text-muted-foreground">Cursos</label>
                <MultiSelect
                  value={filters.cursos}
                  options={courseOptions}
                  onChange={(cursos) => setFilters((f) => ({ ...f, cursos }))}
                  placeholder="Todos"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs text-muted-foreground">Plataforma</label>
                <ToggleGroup
                  type="single"
                  value={filters.platform}
                  onValueChange={(v) => v && setFilters((f) => ({ ...f, platform: v as any }))}
                  className="justify-start"
                >
                  <ToggleGroupItem value="all" aria-label="Todas">Todas</ToggleGroupItem>
                  <ToggleGroupItem value="meta" aria-label="Meta">Meta</ToggleGroupItem>
                  <ToggleGroupItem value="google" aria-label="Google">Google</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="lg:col-span-1">
                <label className="mb-1 block text-xs text-muted-foreground">Ações</label>
                <Button type="button" variant="outline" className="w-full" onClick={resetFilters}>
                  <RotateCcw /> Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs de Gestão */}
        <div className="grid gap-4 md:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{formatBRL(execKpis.totalBudget)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Projected Closing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold tabular-nums">{formatBRL(execKpis.projectedClosing)}</p>
                    <span className="text-muted-foreground">{arrow}</span>
                  </div>
                  {!execKpis.isCurrent && (
                    <p className="mt-1 text-xs text-muted-foreground">Mês fechado — projeção desativada</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Variance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={"text-2xl font-semibold tabular-nums " + moneyClassBySign(execKpis.netVariance)}>
                    {formatBRL(execKpis.netVariance)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Budget − Forecast</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Global Pacing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Tempo</span>
                      <span className="tabular-nums">{formatPercent(execKpis.timePassed)}</span>
                    </div>
                    <Progress value={Math.min(100, execKpis.timePassed * 100)} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Consumo</span>
                      <span className="tabular-nums">{formatPercent(execKpis.budgetConsumed)}</span>
                    </div>
                    <Progress value={Math.min(100, execKpis.budgetConsumed * 100)} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Investment Matrix */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investment Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {consolidado.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : computedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados para os filtros selecionados.</p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {grouped.map((unit) => {
                    const unitBadge = statusBadgeProps(unit.status);
                    return (
                      <AccordionItem key={unit.unidade} value={unit.unidade}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex w-full items-center justify-between gap-3 pr-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{unit.unidade}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                Budget {formatBRL(unit.budget)} • Forecast {formatBRL(unit.forecast)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={"text-sm tabular-nums " + moneyClassBySign(unit.budget - unit.forecast)}>
                                {formatBRL(unit.budget - unit.forecast)}
                              </p>
                              <Badge
                                variant={unitBadge.variant}
                                className={unitBadge.pulse ? "animate-pulse" : undefined}
                              >
                                {unitBadge.label}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pb-0">
                          <Accordion type="multiple" className="w-full">
                            {unit.courses.map((course) => {
                              const courseBadge = statusBadgeProps(course.status);
                              return (
                                <AccordionItem key={`${unit.unidade}__${course.curso}`} value={`${unit.unidade}__${course.curso}`}>
                                  <AccordionTrigger className="py-3 text-sm hover:no-underline">
                                    <div className="flex w-full items-center justify-between gap-3 pr-2">
                                      <div className="min-w-0">
                                        <p className="truncate">{course.curso}</p>
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                          Budget {formatBRL(course.budget)} • Forecast {formatBRL(course.forecast)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <p className={"text-sm tabular-nums " + moneyClassBySign(course.budget - course.forecast)}>
                                          {formatBRL(course.budget - course.forecast)}
                                        </p>
                                        <Badge
                                          variant={courseBadge.variant}
                                          className={courseBadge.pulse ? "animate-pulse" : undefined}
                                        >
                                          {courseBadge.label}
                                        </Badge>
                                      </div>
                                    </div>
                                  </AccordionTrigger>

                                  <AccordionContent className="pb-3">
                                    <div className="rounded-md border">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Contexto</TableHead>
                                            <TableHead>Plataforma</TableHead>
                                            <TableHead className="text-right">Budget</TableHead>
                                            <TableHead className="text-right">Realizado</TableHead>
                                            <TableHead className="text-right">Forecast</TableHead>
                                            <TableHead className="text-right">Utilização</TableHead>
                                            <TableHead className="text-right">Var. R$</TableHead>
                                            <TableHead>Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {course.rows.map((r, idx) => {
                                            const badge = statusBadgeProps(r.status);
                                            const util = Math.min(100, Math.max(0, r.utilizationPct));
                                            return (
                                              <TableRow key={`${course.curso}-${r.plataforma}-${idx}`}>
                                                <TableCell className="max-w-[280px]">
                                                  <p className="truncate">{unit.unidade} / {course.curso}</p>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-2">
                                                    {platformIcon(r.plataforma)}
                                                    <span className="text-sm">{String(r.plataforma).toUpperCase()}</span>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{formatBRL(r.budget)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatBRL(r.spend)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatBRL(r.forecast)}</TableCell>
                                                <TableCell className="text-right">
                                                  <div className="space-y-1">
                                                    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground tabular-nums">
                                                      <span>{formatPercent(r.utilizationPct / 100, { maximumFractionDigits: 0 })}</span>
                                                    </div>
                                                    <Progress value={util} />
                                                  </div>
                                                </TableCell>
                                                <TableCell className={"text-right tabular-nums " + moneyClassBySign(r.variance)}>
                                                  {formatBRL(r.variance)}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge
                                                    variant={badge.variant}
                                                    className={badge.pulse ? "animate-pulse" : undefined}
                                                  >
                                                    {badge.label}
                                                  </Badge>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visual Analytics */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget x Utilização (Scatter)</CardTitle>
            </CardHeader>
            <CardContent>
              {consolidado.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="budget"
                      tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(Number(v))}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="utilization"
                      tickFormatter={(v) => `${Math.round(Number(v))}%`}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <RechartsTooltip
                      cursor={{ stroke: "hsl(var(--border))" }}
                      formatter={(val: any, name: any, props: any) => {
                        if (name === "utilization") return [`${Math.round(Number(val))}%`, "% Utilização"];
                        if (name === "budget") return [formatBRL(Number(val)), "Budget"];
                        return [val, name];
                      }}
                      labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.name ?? ""}
                    />
                    <Scatter data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 Unidades por Estouro Projetado</CardTitle>
            </CardHeader>
            <CardContent>
              {consolidado.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={top5OverspendUnits} layout="vertical" margin={{ left: 18, right: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(Number(v))}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="unidade"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      formatter={(v: any) => [formatBRL(Number(v)), "Estouro"]}
                      cursor={{ fill: "hsl(var(--accent))" }}
                    />
                    <Bar dataKey="overspend" fill="hsl(var(--destructive))" radius={[6, 6, 6, 6]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mantém a visão semanal existente */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pacing semanal</CardTitle>
            </CardHeader>
            <CardContent>
              {semanal.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyChartData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={44} />
                    <RechartsTooltip
                      formatter={(v: any, name: any) => [formatBRL(Number(v)), name === "planned" ? "Planejado" : "Realizado"]}
                    />
                    <Bar dataKey="planned" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="realized" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Pacing Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {semanal.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <WeeklyPacingMatrix
                  data={(semanal.data ?? []) as any[]}
                  moneyClassBySign={moneyClassBySign}
                  formatBRL={formatBRL}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {(consolidado.error || semanal.error || options.error) && (
          <div className="mt-4 space-y-1">
            <p className="text-sm text-destructive">Erro ao carregar dados.</p>
            <p className="text-xs text-muted-foreground">
              {String((consolidado.error as any)?.message ?? "")}
              {(consolidado.error as any)?.message && (semanal.error || options.error) ? " • " : ""}
              {String((semanal.error as any)?.message ?? "")}
              {(semanal.error as any)?.message && options.error ? " • " : ""}
              {String((options.error as any)?.message ?? "")}
            </p>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
