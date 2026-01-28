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

type FunnelCategory = "Branding" | "Conversão" | "EAD";

interface FunnelStrategyChartProps {
    data: InvestmentMatrixUnitGroup[];
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

const COLORS = {
    Branding: "hsl(var(--primary))", // Roxo
    Conversão: "#000000",            // Preto
    EAD: "#52525B",                  // Cinza Escuro (Zinc 600)
};

export function FunnelStrategyChart({ data }: FunnelStrategyChartProps) {
    const aggregated = React.useMemo(() => {
        const totals = {
            Branding: { budget: 0, spend: 0 },
            Conversão: { budget: 0, spend: 0 },
            EAD: { budget: 0, spend: 0 },
        };

        data.forEach((unitGroup) => {
            let category: FunnelCategory = "Conversão";

            // Lógica de categorização baseada no nome
            const name = unitGroup.unit.toLowerCase();
            if (name.includes("branding") || name.includes("institucional")) {
                category = "Branding";
            } else if (
                name.includes("ead") ||
                name.includes("pop") ||
                name === "1. ead" ||
                unitGroup.courses.some(c => {
                    const cName = c.course.toLowerCase();
                    return cName.includes("ead") || cName.includes("pop");
                })
            ) {
                category = "EAD";
            }

            totals[category].budget += unitGroup.budget;
            totals[category].spend += unitGroup.spend;
        });

        return Object.entries(totals).map(([name, values]) => ({
            name,
            value: values.spend, // Focando no realizado
            budget: values.budget,
        }));
    }, [data]);

    const totalSpend = aggregated.reduce((acc, curr) => acc + curr.value, 0);

    if (!data || data.length === 0) return null;

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle className="text-base">Investimento por Estratégia</CardTitle>
                <CardDescription className="text-xs">Share of Wallet (Realizado)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={aggregated}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {aggregated.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as FunnelCategory]} stroke="#ffffff" strokeWidth={2} />
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
                                                        className="fill-foreground text-lg font-bold"
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
                                    const percentage = totalSpend > 0 ? (data.value / totalSpend) : 0;
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
                                                        <span className="text-xs font-bold">{pct(percentage)}</span>
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
                                wrapperStyle={{ fontSize: '11px' }}
                                formatter={(value, entry: any) => {
                                    const percentage = totalSpend > 0 ? (entry.payload.value / totalSpend) : 0;
                                    return `${value} (${pct(percentage)})`;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

            </CardContent>
        </Card >
    );
}
