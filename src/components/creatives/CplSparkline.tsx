import * as React from "react";
import { ComposedChart, Line, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, CartesianGrid } from "recharts";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CplSparklineProps {
    data: { date: string; cpl: number; conversions?: number }[];
    creativeName?: string;
    width?: number;
    height?: number;
}

// Format currency
const brl = (value: number | null) =>
    value != null ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";

// Format date for display
const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}`;
};

export function CplSparkline({ data, creativeName, width = 80, height = 24 }: CplSparklineProps) {
    if (!data || data.length < 2) {
        return <span className="text-xs text-muted-foreground">-</span>;
    }

    // Calculate trend: compare first half avg vs second half avg
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.cpl, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.cpl, 0) / secondHalf.length;
    const overallAvg = data.reduce((sum, d) => sum + d.cpl, 0) / data.length;

    // Determine color: green if CPL is decreasing (good), red if increasing (bad)
    const isImproving = secondAvg < firstAvg * 0.95; // 5% threshold
    const isDeclining = secondAvg > firstAvg * 1.05;

    const lineColor = isImproving
        ? "#10b981" // emerald-500
        : isDeclining
            ? "#ef4444" // red-500
            : "#f59e0b"; // amber-500

    // Calculate min/max for chart domain
    const minCpl = Math.min(...data.map(d => d.cpl)) * 0.9;
    const maxCpl = Math.max(...data.map(d => d.cpl)) * 1.1;

    // Calculate variation
    const firstValue = data[0].cpl;
    const lastValue = data[data.length - 1].cpl;
    const variation = ((lastValue / firstValue) - 1) * 100;

    // Format data with formatted date for tooltip
    const chartData = data.map(d => ({
        ...d,
        dateFormatted: formatDate(d.date)
    }));

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <div style={{ width, height }} className="inline-block cursor-pointer">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data}>
                            <Line
                                type="monotone"
                                dataKey="cpl"
                                stroke={lineColor}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </HoverCardTrigger>
            <HoverCardContent side="left" className="w-80 p-3 shadow-xl border-purple-100 dark:border-purple-900">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold truncate max-w-[200px]">
                        Evolução CPL & Leads
                    </span>
                    <div className={`flex items-center gap-1 text-xs font-medium ${isImproving ? "text-emerald-600" : isDeclining ? "text-red-600" : "text-amber-600"
                        }`}>
                        {isImproving ? (
                            <><TrendingDown className="h-3 w-3" /> Melhorando</>
                        ) : isDeclining ? (
                            <><TrendingUp className="h-3 w-3" /> Piorando</>
                        ) : (
                            <><Minus className="h-3 w-3" /> Estável</>
                        )}
                    </div>
                </div>

                {/* Chart */}
                <div className="h-36 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="dateFormatted"
                                tick={{ fontSize: 9 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                yAxisId="left"
                                domain={[0, 'auto']}
                                tick={{ fontSize: 9, fill: lineColor }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `R$${v.toFixed(0)}`}
                                width={35}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 'auto']}
                                tick={{ fontSize: 9, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={false}
                                width={20}
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    fontSize: 11,
                                    borderRadius: 8,
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: number, name: string) => {
                                    if (name === "cpl") return [brl(value), 'CPL'];
                                    return [value, 'Leads'];
                                }}
                                labelFormatter={(label) => `Data: ${label}`}
                            />
                            <ReferenceLine
                                yAxisId="left"
                                y={overallAvg}
                                stroke="#94a3b8"
                                strokeDasharray="2 2"
                                label={{ value: 'Média', fontSize: 8, fill: '#94a3b8', position: 'insideRight' }}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="conversions"
                                fill="#e2e8f0"
                                radius={[2, 2, 0, 0]}
                                barSize={12}
                                isAnimationActive={false}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="cpl"
                                stroke={lineColor}
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                                activeDot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-xs">
                    <div className="text-center">
                        <div className="text-muted-foreground">Início</div>
                        <div className="font-medium">{brl(firstValue)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Fim</div>
                        <div className="font-medium">{brl(lastValue)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground">Variação</div>
                        <div className={`font-medium ${variation > 0 ? "text-red-600" : variation < 0 ? "text-emerald-600" : ""}`}>
                            {variation > 0 ? "+" : ""}{variation.toFixed(0)}%
                        </div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
