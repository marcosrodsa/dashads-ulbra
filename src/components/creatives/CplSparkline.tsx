import * as React from "react";
import { ComposedChart, Line, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CplSparklineProps {
    data: { date: string; cpl: number; conversions?: number }[];
    creativeName?: string;
    width?: number;
    height?: number;
    avgCpl?: number | null;
    predictedCpl?: number | null;
    currentCpl?: number | null;
    predictionConfidence?: number | null;
}

// Format currency
const brl = (value: number | null) =>
    value != null ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";

// Format date for display
const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}`;
};

export function CplSparkline({ data, creativeName, width = 80, height = 24, avgCpl, predictedCpl, currentCpl, predictionConfidence }: CplSparklineProps) {
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

    const firstValue = validData[0].cpl || 0;
    const lastValue = validData[validData.length - 1].cpl || 0;
    const variation = firstValue > 0 ? ((lastValue / firstValue) - 1) * 100 : 0;

    let recentAvg = 0;
    let prevAvg = 0;

    if (recentPart.length > 0 && prevPart.length > 0) {
        recentAvg = recentPart.reduce((sum, d) => sum + (d.cpl || 0), 0) / recentPart.length;
        prevAvg = prevPart.reduce((sum, d) => sum + (d.cpl || 0), 0) / prevPart.length;
    } else {
        recentAvg = lastValue;
        prevAvg = firstValue;
    }

    const overallAvg = validData.reduce((sum, d) => sum + (d.cpl || 0), 0) / validData.length;

    // Determine color based on windowed trend (Harmonized with overall variation)
    const isImproving = recentAvg < prevAvg * 0.92; // 8% improvement threshold

    // Squad Tip + Sanity Lock: 
    // Only mark as "Declining" if:
    // 1. CPL increased significantly (>12%) or had an extreme last-day spike
    // 2. It's NOT extremely cheap compared to account average (at the moment)
    // 3. Current Price is NOT lower than the Starting Price (Sanity Lock)
    const isHealthy = avgCpl ? (lastValue < avgCpl * 1.05) : true;
    const isCheap = avgCpl ? (recentAvg < avgCpl * 0.85 && lastValue < avgCpl * 1.1) : false;
    const isLastDaySpike = avgCpl ? (lastValue > avgCpl * 1.25) : (lastValue > overallAvg * 1.5);
    const isDeclining = ((recentAvg > prevAvg * 1.12) || isLastDaySpike) && !isCheap && (lastValue >= firstValue) && !isHealthy;

    // UX Refinement: Long-term sanity check
    const isOverallBetter = variation < -10; // Significant improvement from start

    // Threshold Definitions
    const isHighCost = avgCpl ? (recentAvg > avgCpl * 2.0) : false;
    const isOverCost = avgCpl ? (recentAvg > avgCpl * 1.15) : false; // 15% margin

    // UX Refinement: If it's overall better but recently bouncy, it's "Otimizando"
    const isOptimizing = (variation < -5 || isOverallBetter) && !isImproving && !isDeclining && !isOverCost;

    // Critical: Ultra High Cost
    const isCriticalRecovery = isImproving && isHighCost;

    // Fatigued: High Cost & Not Improving & NOT Overall better (New Safety)
    // Mandatory Dual-Factor: Only suggest Red (Pausar) if it's already high AND forecast would likely stay high (using variance/trend)
    // For the sparkline, if it's improving or overall better, it's not truly fatigued yet.
    const isFatigued = isOverCost && !isImproving && !isOverallBetter && !isHealthy;

    // Recovering: Improving OR Overall Better but still High Cost (but not Critical)
    const isRecovering = (isImproving || isOverallBetter) && avgCpl && (recentAvg > avgCpl) && !isCriticalRecovery;

    const lineColor = isCriticalRecovery
        ? "#f97316" // orange-500 (Alerta)
        : isFatigued || isDeclining
            ? "#ef4444" // red-500 (Pausar)
            : isRecovering
                ? "#3b82f6" // blue-500 (Observar)
                : isImproving || isOptimizing
                    ? "#10b981" // emerald-500 (Escalar)
                    : "#3b82f6"; // blue-500 (Estável -> Observar)

    // Format data with formatted date for tooltip
    const chartData = data.map(d => ({
        ...d,
        // For Recharts to connect points properly across nulls, we can use connectNulls prop
        dateFormatted: formatDate(d.date)
    }));

    // Prepare data for the trend projection
    const hasPrediction = predictedCpl && predictedCpl > 0;

    // Create extended data for Recharts: history + prediction point
    const extendedData = hasPrediction ? [
        ...chartData.map((d, idx) => ({
            ...d,
            // Only the LAST historical item gets the forecast key to connect the lines
            cplForecast: idx === chartData.length - 1 ? d.cpl : null
        })),
        {
            dateFormatted: "Proj.",
            cpl: null,
            conversions: null,
            cplForecast: predictedCpl,
            isPrediction: true
        }
    ] : chartData;

    // SYNC COLOR LOGIC: Use the same logic as the "Prev:" badge in the table
    // amber-600 = #d97706, emerald-600 = #059669
    const compValue = currentCpl || lastValue;
    const predictionColor = hasPrediction
        ? (predictedCpl > compValue * 1.1 ? "#d97706" : predictedCpl < compValue * 0.9 ? "#059669" : "#64748b")
        : "#94a3b8";

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
                    <div className={`flex items-center gap-1 text-xs font-medium ${isCriticalRecovery ? "text-orange-600" :
                        isFatigued || isDeclining ? "text-red-600" :
                            isRecovering ? "text-blue-600" :
                                isImproving || isOptimizing ? "text-emerald-600" :
                                    "text-blue-600"
                        }`}>
                        {isCriticalRecovery ? (
                            <><TrendingDown className="h-3 w-3" /> Crítico (Melhorando)</>
                        ) : isFatigued ? (
                            <><TrendingUp className="h-3 w-3" /> Fadigado</>
                        ) : isDeclining ? (
                            <><TrendingUp className="h-3 w-3" /> Piorando</>
                        ) : isRecovering ? (
                            <><TrendingDown className="h-3 w-3" /> Em Recuperação</>
                        ) : isImproving ? (
                            <><TrendingDown className="h-3 w-3" /> Melhorando</>
                        ) : isOptimizing ? (
                            <><RefreshCw className="h-3 w-3" /> Otimizando</>
                        ) : (
                            <><Minus className="h-3 w-3" /> Estável</>
                        )}
                    </div>
                </div>

                {/* Chart */}
                <div className="h-36 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={extendedData} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="dateFormatted"
                                tick={{ fontSize: 9 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                interval={0} // Show all ticks to ensure "Proj." is visible
                                tickFormatter={(val, index) => {
                                    // Logic to avoid crowding: only show every 2nd or 3rd day, but ALWAYS show the last date and "Proj."
                                    if (val === "Proj.") return val;
                                    const total = extendedData.length;
                                    const isLastHistorical = index === total - 2;
                                    const isFirst = index === 0;
                                    if (isFirst || isLastHistorical || index % 3 === 0) return val;
                                    return "";
                                }}
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
                                formatter={(value: number, name: string, entry: any) => {
                                    if (name === "cpl") return [brl(value), 'CPL'];
                                    if (name === "cplForecast") {
                                        // Somente mostra a projeção se for o ponto de projeção (Proj.)
                                        // ou se não houver CPL real (conexão)
                                        if (entry.payload.isPrediction) {
                                            const label = 'CPL (Projeção Linear)';
                                            const confidenceSuffix = predictionConfidence ? ` [R²: ${predictionConfidence}%]` : '';
                                            return [brl(value), `${label}${confidenceSuffix}`];
                                        }
                                        return [null, null];
                                    }
                                    return [value, 'Leads'];
                                }}
                                labelFormatter={(label) => label === "Proj." ? "Projeção D+1" : `Data: ${label}`}
                            />
                            <ReferenceLine
                                yAxisId="left"
                                y={overallAvg}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ value: 'Média Anúncio', fontSize: 8, fill: '#94a3b8', position: 'insideBottomRight' }}
                            />
                            {avgCpl && (
                                <ReferenceLine
                                    yAxisId="left"
                                    y={avgCpl}
                                    stroke="#8b5cf6" // Violet for Account Average
                                    strokeDasharray="5 5"
                                    label={{ value: 'Média Conta', fontSize: 8, fill: '#8b5cf6', position: 'insideTopRight' }}
                                />
                            )}
                            <Bar
                                yAxisId="right"
                                dataKey="conversions"
                                fill="#e2e8f0"
                                radius={[2, 2, 0, 0]}
                                barSize={12}
                                isAnimationActive={false}
                            />
                            {/* SOLID LINE: History */}
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
                            {/* DASHED LINE: Projection segment */}
                            {hasPrediction && (
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="cplForecast"
                                    stroke={predictionColor}
                                    strokeWidth={2.5}
                                    strokeDasharray="5 5"
                                    dot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        // Só renderiza o ponto se for o ponto de predição
                                        if (payload.isPrediction) {
                                            return <circle cx={cx} cy={cy} r={4} fill={predictionColor} stroke="#fff" strokeWidth={1.5} />;
                                        }
                                        return null;
                                    }}
                                    activeDot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (payload.isPrediction) {
                                            return <circle cx={cx} cy={cy} r={5} fill={predictionColor} stroke="#fff" strokeWidth={2} />;
                                        }
                                        return null;
                                    }}
                                    isAnimationActive={false}
                                    connectNulls
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats */}
                {/* Stats Row 1: Variation */}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t text-xs">
                    <div className="text-center">
                        <div className="text-muted-foreground text-[10px]">Início</div>
                        <div className="font-medium text-slate-600">{brl(firstValue)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-muted-foreground text-[10px]">Fim</div>
                        <div className="font-medium text-slate-600">{brl(lastValue)}</div>
                    </div>
                    <div className="text-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-help">
                                    <div className="text-muted-foreground text-[10px] flex items-center justify-center gap-0.5">
                                        Variação
                                    </div>
                                    <div className={`font-medium ${variation > 0 ? "text-red-500" : "text-emerald-500"}`}>
                                        {variation > 0 ? "+" : ""}{variation.toFixed(0)}%
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-[10px] leading-tight">
                                Análise de Momentum: Variação percentual entre o ponto de entrada e a performance atual nesta janela.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Stats Row 2: Averages & Prediction */}
                <div className={cn(
                    "grid gap-2 mt-2 pt-2 border-t border-dashed text-xs bg-muted/20 -mx-3 px-3 pb-1",
                    avgCpl && predictedCpl ? "grid-cols-3" : (avgCpl || predictedCpl) ? "grid-cols-2" : "grid-cols-1"
                )}>
                    <div className="text-center">
                        <div className="text-muted-foreground text-[10px]">Média Anúncio</div>
                        <div className="font-medium text-slate-600 font-mono">{brl(overallAvg)}</div>
                    </div>
                    {avgCpl && (
                        <div className="text-center border-l border-dashed pl-2">
                            <div className="text-muted-foreground text-[10px]">Média Conta</div>
                            <div className="font-medium text-purple-600 font-mono">{brl(avgCpl)}</div>
                        </div>
                    )}
                    {predictedCpl && predictedCpl > 0 && (
                        <div className="text-center border-l border-dashed pl-2 flex flex-col items-center">
                            <div className="text-muted-foreground text-[10px]">Previsto</div>
                            <div className={cn(
                                "font-medium font-mono",
                                predictedCpl > compValue * 1.1 ? "text-amber-600" : predictedCpl < compValue * 0.9 ? "text-emerald-600" : "text-slate-600"
                            )}>
                                {brl(predictedCpl)}
                            </div>
                            {predictionConfidence !== null && (
                                <div className="text-[8px] font-bold text-muted-foreground/70 mt-0.5">
                                    Confiança: {predictionConfidence}%
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
