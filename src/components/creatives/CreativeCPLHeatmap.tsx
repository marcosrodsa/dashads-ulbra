import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Info, Image as ImageIcon } from "lucide-react";


interface CreativeHeatmapData {
    ad_id: string;
    ad_name: string | null;
    campaign_name: string | null;
    conversoes: number;
    cpl: number | null;
    investimento: number;
    image_url?: string | null;
}

interface CreativeHeatmapProps {
    data: CreativeHeatmapData[];
    avgCPL: number | null;
}

function brl(v: number | null) {
    if (v === null || v === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

/**
 * Calculates color based on CPL performance relative to average.
 * Green = below average (good), Yellow = around average, Red = above average (bad)
 */
function getCPLColor(cpl: number | null, avgCPL: number | null): string {
    if (cpl === null || avgCPL === null || avgCPL === 0) return "bg-gray-100 dark:bg-gray-800";

    const ratio = cpl / avgCPL;

    if (ratio <= 0.7) return "bg-emerald-500"; // Excellent: 30% below average
    if (ratio <= 0.9) return "bg-emerald-400"; // Good: 10-30% below average
    if (ratio <= 1.1) return "bg-yellow-400"; // Average: within 10%
    if (ratio <= 1.3) return "bg-orange-400"; // Warning: 10-30% above average
    return "bg-rose-500"; // Critical: 30%+ above average
}

function getCPLTextColor(cpl: number | null, avgCPL: number | null): string {
    if (cpl === null || avgCPL === null || avgCPL === 0) return "text-gray-600 dark:text-gray-300";

    const ratio = cpl / avgCPL;

    if (ratio <= 0.9) return "text-white";
    if (ratio <= 1.1) return "text-gray-900";
    return "text-white";
}

export function CreativeCPLHeatmap({ data, avgCPL }: CreativeHeatmapProps) {
    // Take top 15 by conversions for heatmap
    const top15 = React.useMemo(() => {
        return [...data]
            .filter(d => d.cpl !== null && d.conversoes > 0)
            .sort((a, b) => (b.conversoes || 0) - (a.conversoes || 0))
            .slice(0, 15);
    }, [data]);

    if (top15.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CardTitle>Mapa de Calor: CPL por Criativo</CardTitle>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[300px]">
                            <div className="text-xs space-y-1">
                                <p><strong>Como interpretrar:</strong></p>
                                <p>Cada quadrado representa um criativo. A cor indica performance do CPL comparado à média ({brl(avgCPL)}):</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li><strong>🟢 Verde escuro:</strong> CPL ≤70% da média (excelente)</li>
                                    <li><strong>🟢 Verde claro:</strong> CPL 70-90% da média (bom)</li>
                                    <li><strong>🟡 Amarelo:</strong> CPL 90-110% da média (na média)</li>
                                    <li><strong>🟠 Laranja:</strong> CPL 110-130% da média (alerta)</li>
                                    <li><strong>🔴 Vermelho:</strong> CPL &gt;130% da média (crítico)</li>
                                </ul>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <CardDescription>
                    Top 15 criativos por conversões. Clique para ver detalhes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-2">
                    {top15.map((item) => (
                        <HoverCard key={item.ad_id} openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                                <div
                                    className={`
                                        ${getCPLColor(item.cpl, avgCPL)}
                                        ${getCPLTextColor(item.cpl, avgCPL)}
                                        rounded-lg p-3 cursor-pointer transition-all hover:scale-105 hover:shadow-lg
                                        flex flex-col items-center justify-center text-center min-h-[80px]
                                    `}
                                >
                                    <span className="text-lg font-bold">{brl(item.cpl)}</span>
                                    <span className="text-xs opacity-80 truncate max-w-full">
                                        {item.conversoes} conv.
                                    </span>
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-[350px] p-0 overflow-hidden shadow-2xl border-primary/10">
                                {/* Image Preview */}
                                {item.image_url ? (
                                    <div className="relative h-[350px] w-full bg-white dark:bg-slate-800 border-b">
                                        <img
                                            src={item.image_url}
                                            alt={item.ad_name || "Criativo"}
                                            className="h-full w-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b">
                                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                )}
                                {/* Info */}
                                <div className="p-4 space-y-2">
                                    <p className="font-bold text-base line-clamp-2 leading-tight">{item.ad_name || item.ad_id}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">
                                        ID: {item.ad_id}
                                    </p>
                                    {item.campaign_name && (
                                        <p className="text-xs text-muted-foreground italic line-clamp-1 border-l-2 border-primary/20 pl-2">
                                            {item.campaign_name}
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
                                        <span className="text-muted-foreground">CPL:</span>
                                        <span className="font-medium">{brl(item.cpl)}</span>
                                        <span className="text-muted-foreground">Conversões:</span>
                                        <span className="font-medium">{item.conversoes}</span>
                                        <span className="text-muted-foreground">Investimento:</span>
                                        <span className="font-medium">{brl(item.investimento)}</span>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-muted-foreground cursor-help flex items-center gap-0.5">
                                                    vs Média:
                                                    <Info className="h-3 w-3" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[200px]">
                                                <p className="text-xs">Comparativo do CPL deste criativo com a média geral ({brl(avgCPL)}). Negativo = abaixo da média (bom).</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <span className={`font-medium ${(item.cpl && avgCPL && item.cpl < avgCPL)
                                            ? "text-emerald-600"
                                            : "text-rose-600"
                                            }`}>
                                            {item.cpl && avgCPL
                                                ? `${((item.cpl / avgCPL - 1) * 100).toFixed(0)}%`
                                                : "-"
                                            }
                                        </span>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500"></div>
                        <span>Excelente</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-400"></div>
                        <span>Bom</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-400"></div>
                        <span>Médio</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-orange-400"></div>
                        <span>Alerta</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-rose-500"></div>
                        <span>Crítico</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
