import * as React from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d",
    "#a4de6c", "#d0ed57", "#ffc658", "#8dd1e1", "#83a6ed", "#8e43e7"
];

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function number(v: number) {
    return new Intl.NumberFormat("pt-BR").format(v);
}

// --- Evolution Chart ---

interface EvolutionData {
    period: string; // Day or Week label
    leads: number;
    cpl: number;
}

interface CplEvolutionChartProps {
    data: EvolutionData[];
}

export function CplEvolutionChart({ data }: CplEvolutionChartProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Evolução: CPL x Leads</CardTitle>
                <CardDescription>
                    Relação entre volume de leads (barras) e custo por lead (linha).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="period" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => number(v)}
                                label={{ value: "Leads", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fill: 'hsl(var(--muted-foreground))', fontSize: 10 } }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `R$${v}`}
                                label={{ value: "CPL", angle: 90, position: "insideRight", style: { textAnchor: "middle", fill: 'hsl(var(--muted-foreground))', fontSize: 10 } }}
                            />
                            <Tooltip
                                formatter={(value: any, name: any) => {
                                    if (name === "CPL") return [brl(Number(value)), name];
                                    return [number(Number(value)), name];
                                }}
                                labelStyle={{ color: "black" }}
                            />
                            <Legend />
                            <Bar
                                yAxisId="left"
                                dataKey="leads"
                                name="Leads"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cpl"
                                name="CPL"
                                stroke="#f43f5e" // Rose-500 for CPL
                                strokeWidth={3}
                                dot={{ r: 3, fill: "#f43f5e" }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Donut Chart ---

interface ShareData {
    name: string;
    value: number; // Leads count
}

interface LeadsShareChartProps {
    data: ShareData[];
}

export function LeadsShareChart({ data }: LeadsShareChartProps) {
    // 1. Sort by value desc
    const sortedAll = [...data].sort((a, b) => b.value - a.value);

    // 2. Take Top 5
    const top5 = sortedAll.slice(0, 5);

    // 3. Sum Others
    const others = sortedAll.slice(5);
    const othersValue = others.reduce((acc, curr) => acc + curr.value, 0);

    // 4. Combine
    const finalData = [...top5];
    if (othersValue > 0) {
        finalData.push({ name: "Demais Unidades", value: othersValue });
    }

    const total = finalData.reduce((acc, curr) => acc + curr.value, 0);

    // Custom colors: Top 5 get vibrant colors, Others get Gray
    // We map based on index in finalData
    // If name is "Demais Unidades", force Gray
    const getCellColor = (entry: ShareData, index: number) => {
        if (entry.name === "Demais Unidades") return "#94a3b8"; // Gray-400
        return COLORS[index % COLORS.length];
    };

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Share de Leads por Unidade</CardTitle>
                <CardDescription>Participação de cada unidade no volume total.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={finalData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {finalData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getCellColor(entry, index)} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any, name: any, props: any) => {
                                    const percent = total > 0 ? (Number(value) / total) : 0;
                                    return [
                                        `${number(Number(value))} (${(percent * 100).toFixed(1)}%)`,
                                        name
                                    ];
                                }}
                            />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                formatter={(value, entry: any) => {
                                    const { payload } = entry;
                                    const percent = total > 0 ? (payload.value / total) : 0;
                                    return (
                                        <span className="text-xs text-muted-foreground ml-2 mr-4">
                                            {value} ({(percent * 100).toFixed(0)}%)
                                        </span>
                                    );
                                }}
                            />
                            {/* Central Label */}
                            <text
                                x="50%"
                                y="50%"
                                dy={-10}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-foreground text-2xl font-bold"
                            >
                                {total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                            </text>
                            <text
                                x="50%"
                                y="50%"
                                dy={24}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-muted-foreground text-xs"
                            >
                                Leads
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
