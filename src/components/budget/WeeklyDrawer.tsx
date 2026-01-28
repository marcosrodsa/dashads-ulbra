import * as React from "react";
import { CalendarDays, Info } from "lucide-react";
import { getDynamicPacingStatus, getPacingStatusLabel, getDynamicThresholds, formatExpectedRange, type PacingStatus } from "@/lib/pacing-utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";

export type WeeklyData = {
    semana: string;
    weekStart: string;
    orcado: number;
    realizado: number;
    leads: number;
    cpl: number;
};

interface WeeklyDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unitName: string | null;
    weeklyData: WeeklyData[];
    monthDate: Date; // Month being analyzed for dynamic pacing
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function getStatus(orcado: number, realizado: number, weekStart: Date, weekEndDate: Date, monthDate: Date): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (orcado === 0 && realizado > 0) return { label: "Sem budget", variant: "destructive" };
    if (orcado === 0) return { label: "-", variant: "outline" };

    const utilization = realizado / orcado;
    const today = new Date();
    // Use smaller of today vs week end to get current pacing within the week
    const pacingDate = today < weekEndDate ? today : weekEndDate;

    // Use dynamic pacing status with week range
    const status: PacingStatus = getDynamicPacingStatus(utilization, pacingDate, monthDate, { from: weekStart, to: weekEndDate });
    const label = getPacingStatusLabel(status);

    const variant = status === "error" ? "destructive" : status === "warning" ? "default" : "secondary";
    return { label, variant };
}

export function WeeklyDrawer({ open, onOpenChange, unitName, weeklyData, monthDate }: WeeklyDrawerProps) {
    // Dados para o gráfico
    const chartData = weeklyData.map((w) => ({
        name: w.semana,
        Orçado: w.orcado,
        Realizado: w.realizado,
    }));

    // Totais
    const totalOrcado = weeklyData.reduce((acc, w) => acc + w.orcado, 0);
    const totalRealizado = weeklyData.reduce((acc, w) => acc + w.realizado, 0);
    const totalLeads = weeklyData.reduce((acc, w) => acc + w.leads, 0);
    const avgCpl = totalLeads > 0 ? totalRealizado / totalLeads : 0;
    const variance = totalOrcado - totalRealizado;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Detalhamento Semanal
                    </DialogTitle>
                    <DialogDescription>
                        {unitName || "Unidade"}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-6">
                    {/* KPIs resumidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="p-3">
                            <p className="text-xs text-muted-foreground">Orçado</p>
                            <p className="text-lg font-semibold">{brl(totalOrcado)}</p>
                        </Card>
                        <Card className="p-3">
                            <p className="text-xs text-muted-foreground">Realizado</p>
                            <p className="text-lg font-semibold">{brl(totalRealizado)}</p>
                        </Card>
                        <Card className={`p-3 ${variance >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                            <p className="text-xs text-muted-foreground">Variação</p>
                            <p className={`text-lg font-semibold ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {brl(variance)}
                            </p>
                        </Card>
                    </div>

                    {/* Gráfico de Barras */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Orçado vs Realizado por Semana</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                    />
                                    <RechartsTooltip
                                        formatter={(value: number) => brl(value)}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "var(--radius)"
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="Orçado" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.Realizado > 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--muted)/0.3)"}
                                            />
                                        ))}
                                    </Bar>
                                    <Bar dataKey="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Tabela detalhada */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Dados por Semana</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Semana</TableHead>
                                        <TableHead className="text-right">Orçado</TableHead>
                                        <TableHead className="text-right">Realizado</TableHead>
                                        <TableHead className="text-right">Var</TableHead>
                                        <TableHead className="text-right">Leads</TableHead>
                                        <TableHead className="text-right">CPL</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {weeklyData.map((w) => {
                                        const var_ = w.orcado - w.realizado;
                                        // Calculate week end date (week start + 6 days)
                                        const weekStart = new Date(w.weekStart);
                                        const weekEndDate = new Date(weekStart);
                                        weekEndDate.setDate(weekEndDate.getDate() + 6);
                                        const status = getStatus(w.orcado, w.realizado, weekStart, weekEndDate, monthDate);
                                        return (
                                            <TableRow key={w.weekStart}>
                                                <TableCell className="font-medium text-sm">{w.semana}</TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">{brl(w.orcado)}</TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">{brl(w.realizado)}</TableCell>
                                                <TableCell className={`text-right tabular-nums text-sm ${var_ >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                    {brl(var_)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">
                                                    {w.leads > 0 ? w.leads.toLocaleString('pt-BR') : '-'}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">
                                                    {w.cpl > 0 ? brl(w.cpl) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                                                        <TooltipProvider delayDuration={0}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-sm whitespace-normal">
                                                                    <div className="space-y-1 text-xs">
                                                                        <p className="font-semibold">Status: {status.label}</p>
                                                                        <p>Utilização: {((w.realizado / w.orcado) * 100).toFixed(1)}%</p>
                                                                        <p>Faixa ideal: {formatExpectedRange(getDynamicThresholds(new Date() < weekEndDate ? new Date() : weekEndDate, monthDate, { from: weekStart, to: weekEndDate }))}</p>
                                                                        <p className="text-muted-foreground">
                                                                            {status.variant === "destructive" && "Fora da margem aceitável para esta semana."}
                                                                            {status.variant === "default" && "Próximo aos limites, requer atenção."}
                                                                            {status.variant === "secondary" && "Dentro do ritmo esperado para esta semana."}
                                                                        </p>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
