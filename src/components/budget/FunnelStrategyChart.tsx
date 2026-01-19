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
            } else if (name.includes("ead") || unitGroup.courses.some(c => c.course.toLowerCase().includes("ead"))) {
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
                <CardTitle>Investimento por Estratégia</CardTitle>
                <CardDescription>Share of Wallet (Realizado)</CardDescription>
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
                                content={<ChartTooltip />}
                                cursor={{ fill: "transparent" }}
                                wrapperStyle={{ zIndex: 100 }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

            </CardContent>
        </Card >
    );
}
