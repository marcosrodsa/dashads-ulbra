import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

type WeeklyRow = {
    data_inicio_semana: string;
    semana_label?: string;
    orcamento_semanal: number;
    gasto_real: number;
};

interface WeeklyComparisonChartProps {
    data: WeeklyRow[];
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function WeeklyComparisonChart({ data }: WeeklyComparisonChartProps) {
    // 1. Agrupar dados por semana (somar todas as unidades)
    const aggregated = React.useMemo(() => {
        const map = new Map<string, { name: string; weekStart: string; Orçado: number; Realizado: number }>();

        data.forEach((row) => {
            const weekStart = String(row.data_inicio_semana || "").slice(0, 10);
            if (!weekStart) return;

            const label = row.semana_label || weekStart; // Use simplified label if available

            if (!map.has(weekStart)) {
                map.set(weekStart, { name: label, weekStart, Orçado: 0, Realizado: 0 });
            }

            const entry = map.get(weekStart)!;
            entry.Orçado += Number(row.orcamento_semanal || 0);
            entry.Realizado += Number(row.gasto_real || 0);
        });

        return Array.from(map.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    }, [data]);

    if (!data || data.length === 0) return null;

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-0">
                <CardTitle className="text-base">Evolução Semanal (Global)</CardTitle>
                <CardDescription className="text-xs">Comparativo de Budget vs Realizado por semana</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={aggregated}
                            barGap={0}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                                dataKey="name"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                content={<ChartTooltip />}
                                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "20px" }} />
                            <Bar dataKey="Orçado" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={80} />
                            <Bar dataKey="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={80} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
