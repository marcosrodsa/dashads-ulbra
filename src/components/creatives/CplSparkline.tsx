import * as React from "react";
import { ComposedChart, Line, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

interface CplSparklineProps {
    data: { date: string; cpl: number; conversions?: number }[];
    creativeName?: string;
    width?: number;
    height?: number;
    avgCpl?: number | null;
}

// Format currency
const brl = (value: number | null) =>
    value != null ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";

// Format date for display
const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}`;
};

export function CplSparkline({ data, creativeName, width = 80, height = 24, avgCpl }: CplSparklineProps) {
    // Safe data for line chart: ignore nulls AND weekends for trend/variation calculation
    const validData = data.filter(d => {
        const date = new Date(d.date + 'T12:00:00');
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;
        return !isWeekend && d.cpl !== null && d.cpl > 0;
    });

    if (validData.length < 1) {
        return <span className="text-xs text-muted-foreground">-</span>;
    }

    // Weighted Window Trend: Last 2 vs Previous 4 (Momentum 3.0)
    const WINDOW_RECENT = 2;
    const WINDOW_PREV = 4;
    const recentPart = validData.slice(-WINDOW_RECENT);
    const prevPart = validData.slice(-WINDOW_RECENT - WINDOW_PREV, -WINDOW_RECENT);

    let recentAvg = 0;
    let prevAvg = 0;

    if (recentPart.length > 0 && prevPart.length > 0) {
        recentAvg = recentPart.reduce((sum, d) => sum + (d.cpl || 0), 0) / recentPart.length;
        prevAvg = prevPart.reduce((sum, d) => sum + (d.cpl || 0), 0) / prevPart.length;
    } else {
        recentAvg = validData[validData.length - 1]?.cpl || 0;
        prevAvg = validData[0]?.cpl || 0;
    }

    const overallAvg = validData.reduce((sum, d) => sum + (d.cpl || 0), 0) / validData.length;

    const firstValue = validData[0].cpl || 0;
    const lastValue = validData[validData.length - 1].cpl || 0;
    const variation = firstValue > 0 ? ((lastValue / firstValue) - 1) * 100 : 0;

    // Determine color based on windowed trend (Harmonized with overall variation)
    const isImproving = recentAvg < prevAvg * 0.92; // 8% improvement threshold

    // Squad Tip + Sanity Lock: 
    // Only mark as "Declining" if:
    // 1. CPL increased significantly (>12%)
    // 2. It's NOT extremely cheap compared to account average
    // 3. Current Price is NOT lower than the Starting Price (Sanity Lock)
    const isCheap = avgCpl ? (recentAvg < avgCpl * 0.85) : false;
    const isDeclining = (recentAvg > prevAvg * 1.12) && !isCheap && (lastValue >= firstValue);

    // UX Refinement: If it's overall better but recently bouncy, it's "Otimizando"
    const isOptimizing = variation < -5 && !isImproving && !isDeclining;

    const lineColor = isImproving || isOptimizing
        ? "#10b981" // emerald-500
        : isDeclining
            ? "#ef4444" // red-500
            : "#64748b"; // slate-500

    // Format data with formatted date for tooltip
    const chartData = data.map(d => ({
        ...d,
        // For Recharts to connect points properly across nulls, we can use connectNulls prop
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
                                connectNulls
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
                    <div className={`flex items-center gap-1 text-xs font-medium ${isImproving ? "text-emerald-600" :
                        isOptimizing ? "text-blue-600" :
                            isDeclining ? "text-red-600" : "text-slate-600"
                        }`}>
                        {isImproving ? (
                            <><TrendingDown className="h-3 w-3" /> Melhorando</>
                        ) : isOptimizing ? (
                            <><RefreshCw className="h-3 w-3" /> Otimizando</>
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
                                connectNulls
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-muted-foreground flex items-center justify-center gap-0.5 cursor-help">
                                    Variação
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-[10px]">
                                Comparativo entre o primeiro e o último dia com leads no período.
                            </TooltipContent>
                        </Tooltip>
                        <div className={`font-medium ${variation > 0 ? "text-red-600" : variation < 0 ? "text-emerald-600" : ""}`}>
                            {variation > 0 ? "+" : ""}{variation.toFixed(0)}%
                        </div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
