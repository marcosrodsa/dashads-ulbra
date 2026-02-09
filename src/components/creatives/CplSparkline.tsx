import * as React from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine } from "recharts";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CplSparklineProps {
    data: { date: string; cpl: number }[];
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
                        <LineChart data={data}>
                            <Line
                                type="monotone"
                                dataKey="cpl"
                                stroke={lineColor}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </HoverCardTrigger>
            <HoverCardContent side="left" className="w-80 p-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold truncate max-w-[200px]">
                        Evolução CPL
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
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <XAxis
                                dataKey="dateFormatted"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={[minCpl, maxCpl]}
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `R$${v.toFixed(0)}`}
                                width={45}
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: number) => [brl(value), 'CPL']}
                                labelFormatter={(label) => `Data: ${label}`}
                            />
                            <ReferenceLine
                                y={overallAvg}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ value: 'Média', fontSize: 10, fill: '#94a3b8', position: 'right' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="cpl"
                                stroke={lineColor}
                                strokeWidth={2}
                                dot={{ r: 3, fill: lineColor }}
                                activeDot={{ r: 5, fill: lineColor }}
                                isAnimationActive={false}
                            />
                        </LineChart>
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
