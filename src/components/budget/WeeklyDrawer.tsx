import * as React from "react";
import { CalendarDays } from "lucide-react";
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
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";

export type WeeklyData = {
    semana: string;
    weekStart: string;
    orcado: number;
    realizado: number;
};

interface WeeklyDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unitName: string | null;
    weeklyData: WeeklyData[];
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function getStatus(orcado: number, realizado: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (orcado === 0 && realizado > 0) return { label: "Sem budget", variant: "destructive" };
    if (orcado === 0) return { label: "-", variant: "outline" };
    const ratio = realizado / orcado;
    if (ratio <= 0.9) return { label: "OK", variant: "secondary" };
    if (ratio <= 1.1) return { label: "No limite", variant: "default" };
    return { label: "Estouro", variant: "destructive" };
}

export function WeeklyDrawer({ open, onOpenChange, unitName, weeklyData }: WeeklyDrawerProps) {
    // Dados para o gráfico
    const chartData = weeklyData.map((w) => ({
        name: w.semana,
        Orçado: w.orcado,
        Realizado: w.realizado,
    }));

    // Totais
    const totalOrcado = weeklyData.reduce((acc, w) => acc + w.orcado, 0);
    const totalRealizado = weeklyData.reduce((acc, w) => acc + w.realizado, 0);
    const variance = totalOrcado - totalRealizado;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <div className="grid grid-cols-3 gap-3">
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
                                    <Tooltip
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
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {weeklyData.map((w) => {
                                        const var_ = w.orcado - w.realizado;
                                        const status = getStatus(w.orcado, w.realizado);
                                        return (
                                            <TableRow key={w.weekStart}>
                                                <TableCell className="font-medium text-sm">{w.semana}</TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">{brl(w.orcado)}</TableCell>
                                                <TableCell className="text-right tabular-nums text-sm">{brl(w.realizado)}</TableCell>
                                                <TableCell className={`text-right tabular-nums text-sm ${var_ >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                    {brl(var_)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
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
