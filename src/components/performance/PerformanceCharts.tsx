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

// --- CPL by Platform Chart ---

interface CplPlatformData {
    platform: string;
    cpl: number;
    leads: number;
    spend: number;
}

interface CplByPlatformChartProps {
    data: CplPlatformData[];
}

export function CplByPlatformChart({ data }: CplByPlatformChartProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>CPL por Plataforma</CardTitle>
                <CardDescription>
                    Comparativo de CPL entre Meta e Google.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="platform"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.charAt(0) + val.slice(1).toLowerCase()}
                            />
                            <YAxis
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `R$${v}`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload as CplPlatformData;
                                        return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Plataforma
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {data.platform}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            CPL
                                                        </span>
                                                        <span className="font-bold">
                                                            {brl(data.cpl)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Leads
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {number(data.leads)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Investimento
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {brl(data.spend)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="cpl" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                {data.map((entry, index) => {
                                    const plat = (entry.platform || "").toUpperCase();
                                    let color = "#8884d8"; // Default
                                    if (plat.includes("META") || plat.includes("FACEBOOK") || plat.includes("INSTAGRAM")) {
                                        color = "#8b5cf6"; // Violet-500
                                    } else if (plat.includes("GOOGLE") || plat.includes("YOUTUBE") || plat.includes("SEARCH")) {
                                        color = "#10b981"; // Emerald-500
                                    }
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Bar>
                        </BarChart>
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
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0];
                                        const percent = total > 0 ? (Number(data.value) / total) : 0;
                                        return (
                                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col col-span-2 border-b pb-1 mb-1">
                                                        <span className="font-bold text-foreground">
                                                            {data.name}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Leads
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {number(Number(data.value))}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Share
                                                        </span>
                                                        <span className="font-bold text-muted-foreground">
                                                            {(percent * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
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
                                            {value} {(percent * 100).toFixed(0)}%
                                        </span>
                                    );
                                }}
                            />
                            {/* Central Label */}

                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
