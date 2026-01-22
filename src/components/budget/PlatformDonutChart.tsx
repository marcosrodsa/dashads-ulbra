import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Label,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import type { InvestmentMatrixUnitGroup } from "@/components/budget/InvestmentMatrix";

interface PlatformDonutChartProps {
    data: InvestmentMatrixUnitGroup[];
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

const PLATFORM_COLORS: Record<string, string> = {
    META: "#7c3aed",    // Roxo
    GOOGLE: "#10b981",  // Verde
};

export function PlatformDonutChart({ data }: PlatformDonutChartProps) {
    const aggregated = React.useMemo(() => {
        const totals: Record<string, number> = {};

        // Agregar por plataforma
        data.forEach((unitGroup) => {
            unitGroup.courses.forEach((course) => {
                course.platforms.forEach((platform) => {
                    const platformName = platform.platform.toUpperCase();
                    if (!totals[platformName]) {
                        totals[platformName] = 0;
                    }
                    totals[platformName] += platform.spend; // Usando gasto real
                });
            });
        });

        // Converter para array e calcular porcentagens
        const total = Object.values(totals).reduce((acc, val) => acc + val, 0);

        return Object.entries(totals)
            .map(([name, value]) => ({
                name,
                value,
                percentage: total > 0 ? value / total : 0,
            }))
            .sort((a, b) => b.value - a.value); // Ordenar por valor decrescente
    }, [data]);

    const totalSpend = aggregated.reduce((acc, curr) => acc + curr.value, 0);

    if (!data || data.length === 0 || totalSpend === 0) {
        return (
            <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Investimento por Plataforma</CardTitle>
                    <CardDescription>Distribuição META vs GOOGLE</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">
                        Sem dados disponíveis
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Investimento por Plataforma</CardTitle>
                <CardDescription>Distribuição META vs GOOGLE</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <div className="h-[350px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={aggregated}
                                cx="50%"
                                cy="50%"
                                innerRadius={100}
                                outerRadius={130}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {aggregated.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={PLATFORM_COLORS[entry.name] || "#64748b"}
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                    />
                                ))}
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-2xl font-bold"
                                                    >
                                                        {brl(totalSpend)}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 24}
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        Total
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}
                                    position="center"
                                />
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const data = payload[0].payload;
                                    return (
                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                            <div className="grid gap-2">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold">{data.name}</span>
                                                </div>
                                                <div className="grid gap-1">
                                                    <div className="flex items-center justify-between gap-8">
                                                        <span className="text-xs text-muted-foreground">Valor:</span>
                                                        <span className="text-xs font-medium">{brl(data.value)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-8">
                                                        <span className="text-xs text-muted-foreground">Percentual:</span>
                                                        <span className="text-xs font-bold">{pct(data.percentage)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }}
                                cursor={{ fill: "transparent" }}
                                wrapperStyle={{ zIndex: 100 }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value, entry: any) => {
                                    const percentage = entry.payload?.percentage || 0;
                                    return `${value} (${pct(percentage)})`;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
