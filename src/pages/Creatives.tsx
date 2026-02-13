import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, isSameDay, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Sparkles, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Users, Image, Video, LayoutGrid, RefreshCw, CalendarIcon, Info, ArrowUpDown, ArrowUp, ArrowDown, Wand2, ExternalLink, ChevronLeft, ChevronRight, AlertTriangle, CalendarDays, Building2, GraduationCap, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CplEvolutionChart } from "@/components/performance/PerformanceCharts";
import { CreativeCPLHeatmap } from "@/components/creatives/CreativeCPLHeatmap";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreativeInsightsModal } from "@/components/creatives/CreativeInsightsModal";
import { CplSparkline } from "@/components/creatives/CplSparkline";
import { useFilters } from "@/contexts/filters-context";
import { cn } from "@/lib/utils";

// Types
interface CreativeRow {
    ad_id: string;
    ad_name: string | null;
    campaign_id: string | null;
    data_referencia: string;
    campaign_name: string;
    unidade: string;
    curso: string;
    investimento: number;
    impressoes: number;
    cliques: number;
    conversoes: number;
    ctr: number;
    cpl: number | null;
    creative_type?: string | null;
    title: string | null;
    body: string | null;
    image_url?: string | null;
    thumbnail_url?: string;
    preview_shareable_link?: string | null;
    effective_status: string | null;
    status?: string;
    has_assets: boolean;
    has_insights: boolean;
    predicted_cpl?: number | null;
    predicted_cpl_confidence?: number | null;
    predicted_slope?: number | null;
}

interface KPIs {
    totalCreatives: number;
    totalConversions: number;
    avgCPL: number | null;
    avgCTR: number;
    totalSpend: number;
}

// Helpers
const brl = (v: number | null) => {
    if (v === null || v === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
};

const pct = (v: number | null) => {
    if (v === null || v === undefined) return "-";
    return `${v.toFixed(2)}%`;
};

const getCreativeIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
        case "vídeo":
        case "video":
            return <Video className="h-4 w-4" />;
        case "carrossel":
        case "carousel":
            return <LayoutGrid className="h-4 w-4" />;
        default:
            return <Image className="h-4 w-4" />;
    }
};

const CreativeAnalysisHover = ({ row, onOpenInsights }: { row: CreativeRow, onOpenInsights: () => void }) => {
    const [analysis, setAnalysis] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const supabase = getSupabaseClient();

    const handleMouseEnter = async () => {
        // Allow re-fetch if currently showing the "placeholder" text or error
        const isPlaceholder = analysis === "Nenhuma análise encontrada. Clique para gerar." ||
            analysis === "Erro ao carregar análise." ||
            analysis === "Nenhuma análise detalhada encontrada.";

        if ((analysis && !isPlaceholder) || loading) return;

        setLoading(true);
        console.log(`[GaiaHover] Buscando análise para ad_id: ${row.ad_id}`);

        try {
            // Fetch from both tables in parallel
            const [quickRes, contextRes] = await Promise.all([
                supabase
                    .from("fact_creative_insights")
                    .select("analyzed_at, diagnostico, visual_description")
                    .eq("ad_id", String(row.ad_id))
                    .order("analyzed_at", { ascending: false })
                    .limit(1),
                supabase
                    .from("creative_contextual_insights")
                    .select("analyzed_at, why_performs, visual_description")
                    .eq("ad_id", String(row.ad_id))
                    .order("analyzed_at", { ascending: false })
                    .limit(1)
            ]);

            const quickData = quickRes.data?.[0];
            const contextData = contextRes.data?.[0];

            console.log(`[GaiaHover] Resultados para ${row.ad_id}:`, {
                quick: quickData ? "Encontrado" : "Nulo",
                context: contextData ? "Encontrado" : "Nulo"
            });

            // Determine effective latest analysis
            let bestContent = "Nenhuma análise detalhada encontrada.";
            let latestDate = 0;

            if (quickData?.analyzed_at) {
                const date = new Date(quickData.analyzed_at).getTime();
                if (!isNaN(date) && date > latestDate) {
                    latestDate = date;
                    // Parse Quick Analysis
                    try {
                        if (quickData.diagnostico && (quickData.diagnostico.includes('[') || quickData.diagnostico.includes('{'))) {
                            const parsed = JSON.parse(quickData.diagnostico);
                            const insights = Array.isArray(parsed) ? parsed : (parsed.insights || []);
                            const text = insights.map((i: { description: string }) => i.description).join(" ");
                            bestContent = text || quickData.visual_description || "Análise sem texto.";
                        } else {
                            bestContent = quickData.diagnostico || quickData.visual_description || "Análise visual concluída.";
                        }
                    } catch {
                        bestContent = quickData.diagnostico || quickData.visual_description || "Erro ao ler análise.";
                    }
                }
            }

            if (contextData?.analyzed_at) {
                const date = new Date(contextData.analyzed_at).getTime();
                if (!isNaN(date) && date > latestDate) {
                    latestDate = date; // CRUCIAL: Update latestDate so the check below doesn't override bestContent
                    // Prefer Contextual Analysis
                    bestContent = contextData.why_performs || contextData.visual_description || "Análise contextual sem resumo textual.";
                }
            }

            // If neither returned data
            if (latestDate === 0) {
                bestContent = "Nenhuma análise encontrada. Clique para gerar.";
            }

            setAnalysis(bestContent);

        } catch (e) {
            console.error(e);
            setAnalysis("Erro ao carregar análise.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <HoverCard onOpenChange={(open) => { if (open) handleMouseEnter(); }}>
            <HoverCardTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); onOpenInsights(); }}
                >
                    <Wand2 className={cn("h-4 w-4", row.has_insights ? "text-purple-600" : "text-muted-foreground/30")} />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-3">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <h4 className="text-sm font-semibold">Última Análise IA</h4>
                    </div>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ) : analysis ? (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">
                            {analysis}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">
                            {row.has_insights ? "Carregando..." : "Nenhuma análise disponível. Clique para gerar."}
                        </p>
                    )}
                    <p className="text-[10px] text-purple-600 pt-2 border-t mt-2">
                        Clique no ícone para ver detalhes completos
                    </p>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};

export default function CreativesPage() {
    const supabase = getSupabaseClient();

    const { filters, setBusinessUnit, setCourse, setDateRange, setHideBranding } = useFilters();
    const { businessUnit: unidade, course: curso, dateRange: globalRange, hideBranding } = filters;

    // Sort and pagination
    const [sortBy, setSortBy] = React.useState<string>("status");
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [minConversions, setMinConversions] = React.useState<number>(0);
    const [minInvestment, setMinInvestment] = React.useState<number>(0);
    const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
    const [onlyActive, setOnlyActive] = React.useState(true);
    const itemsPerPage = 100;

    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    // --- State and Logic for Split Date UX ---
    const nowRef = React.useRef(new Date());
    const todayStable = React.useMemo(() => {
        const d = nowRef.current;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }, []);

    // DERIVED STATE: period is calculated directly from global dateRange
    const period = React.useMemo(() => {
        if (!globalRange?.from || !globalRange?.to) return "custom";

        const yesterday = subDays(todayStable, 1);
        if (!isSameDay(globalRange.to, yesterday)) return "custom";

        const diff = differenceInCalendarDays(globalRange.to, globalRange.from) + 1;
        if ([1, 7, 15, 30, 90].includes(diff)) return diff.toString();

        return "custom";
    }, [globalRange, todayStable]);

    // Default hideBranding to true when entering this page
    React.useEffect(() => {
        setHideBranding(true);
    }, [setHideBranding]);

    // Helper function to filter branding
    const filterBranding = React.useCallback((row: CreativeRow) => {
        if (!hideBranding) return true;

        const u = (row.unidade || "").toLowerCase();
        const c = (row.curso || "").toLowerCase();
        const campName = (row.campaign_name || "").toLowerCase();
        const adName = (row.ad_name || "").toLowerCase();
        const body = (row.body || "").toLowerCase();

        // Keywords that identify branding/institutional/awareness ads
        const brandingKeywords = ["branding", "institucional", "reconhecimento", "alcance", "awareness", "topo de funil", "marca"];

        const isBranding = brandingKeywords.some(key =>
            u.includes(key) ||
            c.includes(key) ||
            campName.includes(key) ||
            adName.includes(key) ||
            body.includes(key)
        );

        return !isBranding;
    }, [hideBranding]);

    const getCreativeStatus = (cpl: number | null, avgCpl: number | null, dailyHistory: { date: string, cpl: number | null }[] = [], predictedCpl: number | null = null, confidence: number | null = null, slope: number | null = null) => {
        if (!cpl || !avgCpl || dailyHistory.length < 2) return "Em Aprendizado";

        const cleanHistory = dailyHistory.filter(d => {
            const date = new Date(d.date + 'T12:00:00');
            const day = date.getDay();
            const isWeekend = day === 0 || day === 6;
            return !isWeekend && d.cpl !== null && d.cpl > 0;
        });

        if (cleanHistory.length < 7) return "Testando";

        // Logic refined with Confidence: 
        // We only trust the forecast if confidence is above 50%
        const isConfidenceReliable = confidence !== null && confidence >= 50;
        const isForecastBad = isConfidenceReliable && predictedCpl && avgCpl && predictedCpl > avgCpl * 1.3;
        const isForecastExcellent = isConfidenceReliable && predictedCpl && avgCpl && predictedCpl < avgCpl * 0.8;

        const lastDayPerformance = cleanHistory[cleanHistory.length - 1];
        const lastCpl = lastDayPerformance.cpl || 0;
        const isCurrentBad = lastCpl > avgCpl * 1.05;

        const WINDOW_RECENT = 2;
        const WINDOW_PREV = 4;
        const recentPart = cleanHistory.slice(-WINDOW_RECENT);
        const previousPart = cleanHistory.slice(-WINDOW_RECENT - WINDOW_PREV, -WINDOW_RECENT);

        let trend = 1.0;
        if (recentPart.length > 0 && previousPart.length > 0) {
            const recentAvg = recentPart.reduce((sum, d) => sum + (d.cpl || 0), 0) / recentPart.length;
            const prevAvg = previousPart.reduce((sum, d) => sum + (d.cpl || 0), 0) / previousPart.length;
            trend = recentAvg / prevAvg;
        } else {
            const first = cleanHistory[0].cpl || 0;
            const last = cleanHistory[cleanHistory.length - 1].cpl || 0;
            trend = last / first;
        }

        const firstValue = cleanHistory[0]?.cpl || 0;
        const lastValue = cleanHistory[cleanHistory.length - 1]?.cpl || 0;
        const isOverallBetter = lastValue < firstValue && firstValue > 0;

        const ownAvgCpl = cleanHistory.reduce((sum, d) => sum + (d.cpl || 0), 0) / cleanHistory.length;
        const isOwnSpike = lastCpl > ownAvgCpl * 1.4;

        const isLowCPL = cpl <= avgCpl * 0.85;
        const isHighCPL = cpl >= avgCpl * 1.15;

        if (trend < 0.92 || isOverallBetter) {
            if (isForecastBad) {
                if (isHighCPL) return "Crítico";
                return "Curva de Fadiga";
            }
            if (isForecastExcellent && isHealthy) return "Estrela";
            if (isHighCPL) {
                if (cpl > avgCpl * 2.0) return "Crítico";
                return "Em Recuperação";
            }
            return "Em Otimização";
        }

        if (isLowCPL) {
            const isForecastRising = predictedCpl && predictedCpl > cpl * 1.1;
            if (isForecastBad || (isOwnSpike && isForecastRising)) return "Curva de Fadiga";
            if (isCurrentBad || (trend > 1.10 && isForecastRising)) return "Curva de Fadiga";
            return "Estrela";
        }

        if (isForecastExcellent && isHealthy) return "Estrela";

        const isExtremelyHigh = cpl > avgCpl * 1.8;
        const isVeryHigh = cpl > avgCpl * 1.4;
        const isBetterThanAccount = (ownAvgCpl || cpl) < avgCpl * 0.9;
        const isHealthy = cpl < avgCpl * 1.05;

        if (!isHealthy && (isExtremelyHigh || (isVeryHigh && isForecastBad && !isBetterThanAccount))) {
            return "Fadigado";
        }

        if (trend > 1.15 || isForecastBad) {
            const isForecastActuallyGood = predictedCpl && predictedCpl < avgCpl * 1.1;
            if (isForecastActuallyGood || isHealthy) return "CPL em Alta";
            if (isBetterThanAccount && cpl < avgCpl * 1.2) return "CPL em Alta";
            return "Fadigado";
        }

        if (isCurrentBad || trend > 1.15) return "CPL em Alta";
        return "Estável";
    };

    const calculateCPLForecast = (dailyHistory: { date: string, cpl: number | null }[]) => {
        const dailyData = dailyHistory
            .filter(d => d.cpl !== null && d.cpl > 0)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14);

        const n = dailyData.length;
        if (n < 5) return null;

        const x = dailyData.map((_, i) => i + 1);
        const y = dailyData.map(d => d.cpl as number);

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
        const sumXX = x.reduce((s, xi) => s + xi * xi, 0);

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return null;

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R² (Coefficient of Determination)
        const yMean = sumY / n;
        let ssRes = 0;
        let ssTot = 0;
        for (let i = 0; i < n; i++) {
            const yHat = slope * x[i] + intercept;
            ssRes += Math.pow(y[i] - yHat, 2);
            ssTot += Math.pow(y[i] - yMean, 2);
        }

        const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

        // Confidence formula: R² adjusted by data volume (rewarding more days)
        // We normalize to 10 days for max volume boost
        const volumeFactor = Math.min(n, 10) / 10;
        const confidence = Math.max(0, Math.min(1, rSquared * volumeFactor));

        const forecast = Math.max(0, slope * (n + 1) + intercept);

        return {
            forecast,
            confidence: Math.round(confidence * 100),
            slope
        };
    };

    const getStatusBadge = (status: string, row?: any) => {
        let content = "";
        let icon: React.ReactNode = null;

        const cplValue = row?.cpl;
        const avgValue = stableBenchmarks.avgCPL || 0;
        const diffPercent = cplValue && avgValue ? Math.round(((cplValue / avgValue) - 1) * 100) : 0;
        const hasPrediction = row?.predicted_cpl && row?.predicted_cpl_confidence !== null;
        const confidence = row?.predicted_cpl_confidence;

        const slope = row?.predicted_slope || 0;
        const trendIcon = slope > 0.05 ? <TrendingUp className="h-3 w-3 text-red-500" /> : slope < -0.05 ? <TrendingDown className="h-3 w-3 text-emerald-500" /> : <RefreshCw className="h-3 w-3 text-blue-400" />;

        // Analytical Engine: Generate non-generic sentences
        const generateAdvice = () => {
            const isCritical = cplValue > avgValue * 1.8;
            const isHigh = cplValue > avgValue * 1.3;
            const isScale = cplValue < avgValue * 0.8 && confidence > 70;
            const isVolatile = (confidence || 0) < 40;

            let sentences = [];

            // 1. Momentum Analysis
            if (Math.abs(slope) > 0.01) {
                const direction = slope > 0 ? "subida" : "queda";
                sentences.push(`Trajetória: Momentum de ${direction} de ${brl(Math.abs(slope))}/dia.`);

                if (slope > 0 && isHigh) {
                    const daysToLimit = Math.max(1, Math.round((avgValue * 2.0 - cplValue) / slope));
                    if (daysToLimit < 5) sentences.push(`Risco: Limite crítico de ${brl(avgValue * 2)} deve ser atingido em aprox. ${daysToLimit} dias.`);
                }
            } else {
                sentences.push("Estabilidade: Custo operando em zona de baixa volatilidade estatística.");
            }

            // 2. Benchmarking
            if (diffPercent > 40) {
                sentences.push(`Anomalia: Custo ${diffPercent}% acima da média. Eficiência do criativo está severamente comprometida.`);
            } else if (diffPercent < -20) {
                sentences.push(`Eficiência: Criativo ${Math.abs(diffPercent)}% mais barato que a conta. Ótima saúde financeira.`);
            }

            // 3. Actionable Advice
            if (isScale && slope <= 0) {
                sentences.push("Ação: Recomendamos escala agressiva (+25% budget) devido à compressão do CPL.");
            } else if (isCritical) {
                sentences.push("Ação: Interromper imediatamente. Saturação irreversível detectada pelo modelo.");
            } else if (slope > 0.1 && isHigh) {
                sentences.push("Ação: Trocar criativo ou testar novo público. Perda de tração acelerada.");
            } else {
                sentences.push("Ação: Manter observação. Padrão de performance está dentro da margem de segurança.");
            }

            return sentences.join(" ");
        };

        const analyticalContent = generateAdvice();

        switch (status) {
            case "Estrela":
                icon = <Sparkles className="h-3 w-3 mr-1" />;
                break;
            case "Curva de Fadiga":
            case "CPL em Alta":
            case "Fadigado":
                icon = <TrendingUp className="h-3 w-3 mr-1" />;
                break;
            case "Em Otimização":
                icon = <TrendingDown className="h-3 w-3 mr-1" />;
                break;
            case "Em Recuperação":
            case "Testando":
                icon = <RefreshCw className="h-3 w-3 mr-1" />;
                break;
            case "Crítico":
                icon = <AlertTriangle className="h-3 w-3 mr-1" />;
                break;
            case "Estável":
                icon = <Filter className="h-3 w-3 mr-1" />;
                break;
            default:
                icon = <RefreshCw className="h-3 w-3 mr-1" />;
        }

        const badge = (() => {
            switch (status) {
                case "Estrela":
                case "Em Otimização":
                    return <Badge className="bg-emerald-500/20 text-emerald-800 hover:bg-emerald-500/30 dark:text-emerald-300 border-0 flex items-center gap-1.5 px-2.5 py-1 ring-2 ring-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold">
                        <Sparkles className="h-3.5 w-3.5" /> Escalar
                    </Badge>;
                case "Em Recuperação":
                case "Testando":
                case "Estável":
                    return <Badge className="bg-blue-600/20 text-blue-800 hover:bg-blue-600/30 dark:text-blue-300 border-0 flex items-center gap-1.5 px-2.5 py-1 ring-1 ring-blue-500/30 font-semibold">
                        <Eye className="h-3.5 w-3.5" /> Observar
                    </Badge>;
                case "Crítico":
                case "CPL em Alta":
                case "Curva de Fadiga":
                    return <Badge className="bg-amber-500/20 text-amber-800 hover:bg-amber-500/30 dark:text-amber-300 border-0 flex items-center gap-1.5 px-2.5 py-1 ring-1 ring-amber-500/40 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" /> Alerta
                    </Badge>;
                case "Fadigado":
                    return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400 border-0 flex items-center gap-1.5 px-2">
                        <TrendingUp className="h-3 w-3" /> Pausar
                    </Badge>;
                default:
                    return <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin-slow" /> Aprendendo</Badge>;
            }
        })();

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-help w-fit mx-auto">{badge}</div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 max-w-[260px] space-y-2">
                    <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Diagnóstico Detalhado</p>
                        <div className="font-bold text-sm flex items-center justify-between text-foreground">
                            <div className="flex items-center gap-1.5">
                                {icon}<span>{status}</span>
                            </div>
                            {trendIcon}
                        </div>
                    </div>
                    <div className="w-full h-px bg-border/50" />
                    <p className="text-xs leading-relaxed text-muted-foreground/90">{analyticalContent}</p>
                </TooltipContent>
            </Tooltip>
        );
    };

    const toggleSort = (column: string) => {
        if (sortBy === column) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortDir("desc");
        }
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground" />;
        return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
    };

    const [insightsModal, setInsightsModal] = React.useState<{ open: boolean; creative: CreativeRow | null; }>({ open: false, creative: null });
    const openInsightsModal = (row: CreativeRow) => setInsightsModal({ open: true, creative: row });

    // Calculate date range (Local period selection updates global range)
    const dateRange = React.useMemo(() => {
        return {
            start: globalRange?.from || startOfMonth(new Date()),
            end: globalRange?.to || globalRange?.from || endOfMonth(new Date())
        };
    }, [globalRange]);

    // Helper to get formatted range label
    const getPresetRangeLabel = (days: number) => {
        const end = subDays(new Date(), 1);
        const start = subDays(end, days - 1);
        return `(${format(start, "dd/MM")} - ${format(end, "dd/MM")})`;
    };

    // Handle period change (Sync with globalRange)
    React.useEffect(() => {
        if (period !== "custom") {
            const today = new Date();
            const end = subDays(today, 1); // D-1 (Yesterday)
            // Calculate start based on period length relative to end date
            // e.g. for 30 days: [End - 29 days, End] = 30 days total
            const start = subDays(end, (parseInt(period) || 30) - 1);
            setDateRange({ from: start, to: end });
        }
    }, [period, setDateRange]);


    // Fetch creatives
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["creatives", dateRange.start.toISOString(), dateRange.end.toISOString(), unidade, curso],
        queryFn: async () => {
            let query = supabase
                .from("vw_creative_analysis_complete")
                .select("*")
                .gte("data_referencia", format(dateRange.start, "yyyy-MM-dd"))
                .lte("data_referencia", format(dateRange.end, "yyyy-MM-dd"))
                .order("investimento", { ascending: false })
                .limit(10000);

            if (unidade && unidade !== "all") {
                query = query.eq("unidade", unidade);
            }
            if (curso && curso !== "all") {
                query = query.eq("curso", curso);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data as CreativeRow[];
        },
    });

    // Unique filter options
    const unidades = React.useMemo(() => {
        if (!data) return [];
        return [...new Set(data.map((r) => r.unidade).filter(Boolean))];
    }, [data]);

    const cursos = React.useMemo(() => {
        if (!data) return [];
        return [...new Set(data.map((r) => r.curso).filter(Boolean))];
    }, [data]);


    // Aggregate by ad_id for table (sum metrics across dates)
    // 1. Group daily data by ad_id and apply high-level filters (Benchmark Data)
    const allAggregated = React.useMemo(() => {
        if (!data) return [];

        const filteredByBranding = data.filter(row => filterBranding(row));


        const dailyByAd: Record<string, { date: string; cpl: number | null; conversions: number; investimento: number; impressoes: number }[]> = {};
        const dailyTemp: Record<string, Record<string, { conversions: number; investimento: number; impressoes: number }>> = {};

        filteredByBranding.forEach(row => {
            if (!dailyTemp[row.ad_id]) dailyTemp[row.ad_id] = {};
            const d = row.data_referencia;
            if (!dailyTemp[row.ad_id][d]) {
                dailyTemp[row.ad_id][d] = { conversions: 0, investimento: 0, impressoes: 0 };
            }
            dailyTemp[row.ad_id][d].conversions += row.conversoes || 0;
            dailyTemp[row.ad_id][d].investimento += row.investimento || 0;
            dailyTemp[row.ad_id][d].impressoes += row.impressoes || 0;
        });

        Object.keys(dailyTemp).forEach(adId => {
            dailyByAd[adId] = Object.entries(dailyTemp[adId]).map(([date, metrics]) => ({
                date,
                conversions: metrics.conversions,
                investimento: metrics.investimento,
                impressoes: metrics.impressoes,
                cpl: metrics.conversions > 0 ? metrics.investimento / metrics.conversions : null
            }));
        });

        const grouped = filteredByBranding.reduce((acc, row) => {
            if (!acc[row.ad_id]) {
                acc[row.ad_id] = { ...row, investimento: 0, impressoes: 0, cliques: 0, conversoes: 0 };
            }
            acc[row.ad_id].investimento += row.investimento || 0;
            acc[row.ad_id].impressoes += row.impressoes || 0;
            acc[row.ad_id].cliques += row.cliques || 0;
            acc[row.ad_id].conversoes += row.conversoes || 0;

            // Sync metadata
            acc[row.ad_id].effective_status = row.effective_status || acc[row.ad_id].effective_status;
            acc[row.ad_id].preview_shareable_link = row.preview_shareable_link || acc[row.ad_id].preview_shareable_link;
            acc[row.ad_id].image_url = row.image_url || acc[row.ad_id].image_url;
            acc[row.ad_id].creative_type = row.creative_type || acc[row.ad_id].creative_type;

            return acc;
        }, {} as Record<string, CreativeRow>);

        Object.keys(dailyByAd).forEach(adId => {
            dailyByAd[adId].sort((a, b) => a.date.localeCompare(b.date));
        });

        return Object.values(grouped).map(r => {
            const dailyHistory = dailyByAd[r.ad_id] || [];
            const forecastResult = calculateCPLForecast(dailyHistory);

            return {
                ...r,
                dailyHistory,
                predicted_cpl: forecastResult?.forecast || null,
                predicted_cpl_confidence: forecastResult?.confidence || null
            };
        });
    }, [data, filterBranding, hideBranding]);

    // 2. STABLE Account Benchmarks (Unfiltered - stable reference for IA status)
    const stableBenchmarks = React.useMemo(() => {
        if (!allAggregated || allAggregated.length === 0) {
            return { avgCPL: 0, avgCTR: 0 };
        }

        const performanceData = allAggregated.filter(r => filterBranding(r));

        const performanceSpend = performanceData.reduce((acc, r) => acc + (r.investimento || 0), 0);
        const performanceConversions = performanceData.reduce((acc, r) => acc + (r.conversoes || 0), 0);

        const totalImpressions = allAggregated.reduce((acc, r) => acc + (r.impressoes || 0), 0);
        const totalClicks = allAggregated.reduce((acc, r) => acc + (r.cliques || 0), 0);

        return {
            avgCPL: performanceConversions > 0 ? performanceSpend / performanceConversions : 0,
            avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        };
    }, [allAggregated, filterBranding]);

    // 2b. DISPLAY KPIs (Filtered - matches what user sees on screen)
    const kpis: KPIs = React.useMemo(() => {
        if (!data || !allAggregated) {
            return { totalCreatives: 0, totalConversions: 0, avgCPL: null, avgCTR: 0, totalSpend: 0 };
        }

        // 1. DATA FOR KPIs
        // We now respect the hideBranding toggle for the dashboard cards to make it "work"
        // as the user expects. If hideBranding is true, we only sum non-branding ads.
        const filteredData = data.filter(r => filterBranding(r));

        const totalSpend = filteredData.reduce((acc, r) => acc + (r.investimento || 0), 0);
        const totalConversions = filteredData.reduce((acc, r) => acc + (r.conversoes || 0), 0);
        const totalImpressions = filteredData.reduce((acc, r) => acc + (r.impressoes || 0), 0);
        const totalClicks = filteredData.reduce((acc, r) => acc + (r.cliques || 0), 0);

        // 2. DATA FOR UI/ANALYSIS (Table Count)
        const displaySet = allAggregated.filter(r => {
            if (onlyActive && r.effective_status !== 'ACTIVE') return false;
            return true;
        });

        return {
            totalCreatives: displaySet.length, // Only count what is shown in the list
            totalConversions,
            totalSpend,
            avgCPL: totalConversions > 0 ? totalSpend / totalConversions : null,
            avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
        };
    }, [data, allAggregated, onlyActive, filterBranding]);

    // 3. Final Table Data (Applying Table-specific filters and sorting)
    const aggregatedData = React.useMemo(() => {
        if (!allAggregated) return [];

        return allAggregated
            .map((r) => {
                const cplValue = r.conversoes > 0 ? r.investimento / r.conversoes : null;
                const history = r.dailyHistory || [];
                const forecastResult = calculateCPLForecast(history);
                const predictedCpl = forecastResult?.forecast || null;
                const confidence = forecastResult?.confidence || null;
                const slope = forecastResult?.slope || null;

                return {
                    ...r,
                    ctr: r.impressoes > 0 ? (r.cliques / r.impressoes) * 100 : 0,
                    cpl: cplValue,
                    computedStatus: getCreativeStatus(cplValue, stableBenchmarks.avgCPL || 0, history, predictedCpl, confidence, slope),
                    predicted_cpl: predictedCpl,
                    predicted_cpl_confidence: confidence,
                    predicted_slope: slope
                };
            })
            .filter((r) => {
                // BRANDING FILTER (Applied to aggregated ad)
                if (!filterBranding(r)) return false;

                if (minConversions > 0 && r.conversoes < minConversions) return false;
                if (minInvestment > 0 && (r.investimento || 0) < minInvestment) return false;
                // TABLE-ONLY STATUS FILTER: Apply here so it doesn't affect KPIs
                if (onlyActive && r.effective_status !== 'ACTIVE') return false;
                return true;
            })
            .sort((a, b) => {
                const getValue = (row: CreativeRow & { ctr: number; cpl: number | null; computedStatus: string; predicted_cpl: number | null; predicted_cpl_confidence: number | null }) => {
                    switch (sortBy) {
                        case "status": return row.computedStatus;
                        case "ad_name": return row.ad_name || row.ad_id || "";
                        case "campaign_name": return row.campaign_name || "";
                        case "unidade": return row.unidade || "";
                        case "curso": return row.curso || "";
                        case "impressoes": return row.impressoes || 0;
                        case "cliques": return row.cliques || 0;
                        case "ctr": return row.ctr || 0;
                        case "cpm": return (row.investimento / (row.impressoes || 1)) * 1000;
                        case "conversoes": return row.conversoes || 0;
                        case "cpl": return row.cpl || 9999999;
                        case "investimento": return row.investimento || 0;
                        case "effective_status": return row.effective_status || "";
                        default: return row.conversoes || 0;
                    }
                };
                const aVal = getValue(a);
                const bVal = getValue(b);

                if (sortBy === "status") {
                    const statusWeights: Record<string, number> = {
                        // Priority 1: PAUSAR (Red)
                        "Fadigado": 1,
                        "Piorando": 1,
                        // Priority 2: ALERTA (Amber)
                        "Crítico": 2,
                        "CPL em Alta": 2,
                        "Curva de Fadiga": 2,
                        // Priority 3: ESCALAR (Green)
                        "Estrela": 3,
                        "Em Otimização": 3,
                        // Priority 4: OBSERVAR (Blue)
                        "Estável": 4,
                        "Em Recuperação": 4,
                        "Testando": 4,
                        "Em Aprendizado": 5
                    };
                    const aWeight = statusWeights[aVal] || 99;
                    const bWeight = statusWeights[bVal] || 99;
                    return sortDir === "asc" ? aWeight - bWeight : bWeight - aWeight;
                }

                if (sortBy === "effective_status") {
                    const statusWeight = (s: string) => s === "ACTIVE" ? 1 : s === "PAUSED" ? 2 : 3;
                    const aWeight = statusWeight(aVal);
                    const bWeight = statusWeight(bVal);
                    if (aWeight !== bWeight) return sortDir === "asc" ? aWeight - bWeight : bWeight - aWeight;
                    return 0;
                }

                if (typeof aVal === "string") {
                    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            });
    }, [allAggregated, sortBy, sortDir, minConversions, minInvestment, onlyActive, stableBenchmarks.avgCPL, filterBranding, hideBranding]);

    // Paginated data
    const totalPages = Math.ceil(aggregatedData.length / itemsPerPage);
    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return aggregatedData.slice(start, start + itemsPerPage);
    }, [aggregatedData, currentPage, itemsPerPage]);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [data, sortBy, sortDir]);



    // Daily aggregation for evolution chart (applies branding AND active filter for consistency)
    const evolutionData = React.useMemo(() => {
        if (!data) return [];

        const filteredData = data.filter(row => {
            if (!filterBranding(row)) return false;
            // SYNC CHART WITH DISPLAY FILTER
            if (onlyActive && row.effective_status !== 'ACTIVE') return false;
            return true;
        });

        const byDate = filteredData.reduce((acc, row) => {
            const date = row.data_referencia;
            if (!acc[date]) {
                acc[date] = { leads: 0, spend: 0 };
            }
            acc[date].leads += row.conversoes || 0;
            acc[date].spend += row.investimento || 0;
            return acc;
        }, {} as Record<string, { leads: number; spend: number }>);

        return Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0])) // Sort by raw date (YYYY-MM-DD)
            .map(([date, values]) => ({
                period: format(new Date(date), "dd/MM", { locale: ptBR }),
                leads: values.leads,
                cpl: values.leads > 0 ? values.spend / values.leads : 0,
            }));
    }, [data, filterBranding, onlyActive]);

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-purple-500" />
                        Inteligência de Criativos
                    </h1>
                    <p className="text-muted-foreground">Análise de performance por criativo (Meta Ads)</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6 bg-slate-50/50 p-3 rounded-lg border">
                {/* Período */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Período
                    </label>
                    <div className="flex flex-col gap-2 relative">
                        <Select
                            value={period}
                            onValueChange={(v) => {
                                if (v === "custom") {
                                    setDateRange(undefined);
                                } else {
                                    const days = parseInt(v);
                                    const end = subDays(todayStable, 1);
                                    const start = subDays(end, days - 1);
                                    const preciseEnd = new Date(end);
                                    preciseEnd.setHours(23, 59, 59, 999);
                                    setDateRange({ from: start, to: preciseEnd });
                                }
                            }}
                        >
                            <SelectTrigger className="h-9 w-full bg-background/50">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Ontem <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(1)}</span></SelectItem>
                                <SelectItem value="7">Últimos 7 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(7)}</span></SelectItem>
                                <SelectItem value="15">Últimos 15 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(15)}</span></SelectItem>
                                <SelectItem value="30">Últimos 30 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(30)}</span></SelectItem>
                                <SelectItem value="90">Últimos 90 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(90)}</span></SelectItem>
                                <SelectItem value="custom">Personalizado</SelectItem>
                            </SelectContent>
                        </Select>

                        {period === "custom" && (
                            <div className="absolute top-[38px] left-0 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-background shadow-md border-primary/20 h-9">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {globalRange?.from ? (
                                                globalRange.to && !isSameDay(globalRange.from, globalRange.to) ? (
                                                    <>{format(globalRange.from, "dd/MM/yy", { locale: ptBR })} - {format(globalRange.to, "dd/MM/yy", { locale: ptBR })}</>
                                                ) : (
                                                    format(globalRange.from, "dd/MM/yyyy", { locale: ptBR })
                                                )
                                            ) : (
                                                <span>Selecione o período</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="range"
                                            selected={globalRange}
                                            onSelect={(range) => {
                                                setDateRange(range);
                                                if (range?.from && range?.to) {
                                                    setIsCalendarOpen(false);
                                                }
                                            }}
                                            numberOfMonths={2}
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                </div>

                {/* Unidade */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Unidade
                    </label>
                    <Select value={unidade || "all"} onValueChange={(val) => setBusinessUnit(val === "all" ? null : val)}>
                        <SelectTrigger className="h-9 w-full bg-background/50">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Unidades</SelectItem>
                            {unidades.map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Curso */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Curso
                    </label>
                    <Select value={curso || "all"} onValueChange={(val) => setCourse(val === "all" ? null : val)}>
                        <SelectTrigger className="h-9 w-full bg-background/50">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Cursos</SelectItem>
                            {cursos.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Toggles Group */}
                <div className="space-y-3 flex flex-col justify-end pb-1 lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        {/* Branding Toggle */}
                        <div className="flex items-center gap-2">
                            <Switch
                                id="hideBranding"
                                checked={hideBranding}
                                onCheckedChange={setHideBranding}
                            />
                            <Label
                                htmlFor="hideBranding"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Ocultar Branding
                            </Label>
                        </div>

                        {/* Active Only Toggle */}
                        <div className="flex items-center gap-2">
                            <Switch
                                id="onlyActive"
                                checked={onlyActive}
                                onCheckedChange={setOnlyActive}
                            />
                            <Label
                                htmlFor="onlyActive"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Apenas Ativos
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">Criativos</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px]">
                                    <p className="text-xs">Quantidade de anúncios únicos ativos no período selecionado.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <Image className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : kpis.totalCreatives}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px]">
                                    <p className="text-xs">Total de leads gerados pelos criativos no período (soma de todas as conversões).</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : kpis.totalConversions.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">CPL Médio</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px]">
                                    <p className="text-xs"><strong>Custo Por Lead.</strong> Investimento total dividido pelo número de conversões. Quanto menor, melhor.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-24" /> : brl(kpis.avgCPL)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">CTR Médio</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px]">
                                    <p className="text-xs"><strong>Click-Through Rate.</strong> Percentual de pessoas que clicaram após ver o anúncio. CTR alto indica criativo atrativo.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-16" /> : pct(kpis.avgCTR)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-medium">Investimento</CardTitle>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px]">
                                    <p className="text-xs">Valor total investido no período. Respeita os filtros de "Unidade", "Curso" e "Ocultar Branding".</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? <Skeleton className="h-8 w-24" /> : brl(kpis.totalSpend)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Charts */}
            <div className="flex flex-col gap-4">
                <CplEvolutionChart data={evolutionData} />
                <CreativeCPLHeatmap data={aggregatedData} avgCPL={kpis.avgCPL} />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle>Detalhamento por Criativo</CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                        <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            placeholder="Mín. Leads"
                                            value={minConversions || ""}
                                            onChange={(e) => setMinConversions(Number(e.target.value))}
                                            className="h-8 w-32 pl-8 text-xs"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Filtrar por número mínimo de conversões</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            placeholder="Mín. Invest."
                                            value={minInvestment || ""}
                                            onChange={(e) => setMinInvestment(Number(e.target.value))}
                                            className="h-8 w-32 pl-8 text-xs"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Filtrar por investimento mínimo</TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/50">
                            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}>
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}>
                                <Image className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent text-[13px]">
                                    <TableHead className="w-[280px] cursor-pointer p-2" onClick={() => toggleSort("campaign_name")}>
                                        <span className="flex items-center text-[13px]">Campanha {getSortIcon("campaign_name")}</span>
                                    </TableHead>

                                    <TableHead className="w-[240px] cursor-pointer p-2" onClick={() => toggleSort("ad_name")}>
                                        <span className="flex items-center text-[13px]">Criativo {getSortIcon("ad_name")}</span>
                                    </TableHead>

                                    <TableHead className="w-[120px] cursor-pointer p-2" onClick={() => toggleSort("unidade")}>
                                        <span className="flex items-center text-[13px]">Unidade {getSortIcon("unidade")}</span>
                                    </TableHead>

                                    <TableHead className="text-right w-[70px] cursor-pointer p-2" onClick={() => toggleSort("ctr")}>
                                        <span className="flex items-center justify-end text-[13px]">CTR {getSortIcon("ctr")}</span>
                                    </TableHead>

                                    <TableHead className="text-right w-[80px] cursor-pointer p-2" onClick={() => toggleSort("cpm")}>
                                        <span className="flex items-center justify-end text-[13px]">CPM {getSortIcon("cpm")}</span>
                                    </TableHead>

                                    <TableHead className="text-right w-[80px] cursor-pointer p-2" onClick={() => toggleSort("cpl")}>
                                        <span className="flex items-center justify-end text-[13px]">CPL {getSortIcon("cpl")}</span>
                                    </TableHead>

                                    <TableHead className="text-right w-[70px] cursor-pointer p-2" onClick={() => toggleSort("conversoes")}>
                                        <span className="flex items-center justify-end text-[13px]">Conv. {getSortIcon("conversoes")}</span>
                                    </TableHead>

                                    <TableHead className="text-right w-[90px] cursor-pointer p-2" onClick={() => toggleSort("investimento")}>
                                        <span className="flex items-center justify-end text-[13px]">Invest. {getSortIcon("investimento")}</span>
                                    </TableHead>

                                    <TableHead className="text-center w-[200px] cursor-pointer p-2" onClick={() => toggleSort("status")}>
                                        <div className="flex items-center justify-center gap-1 text-[13px]">
                                            Saúde & Tendência {getSortIcon("status")}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 cursor-help text-muted-foreground/50" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[200px] p-2 text-[11px]">
                                                        <p> Fluxo Temporal de Decisão:</p>
                                                        <ul className="list-disc pl-3 mt-1 space-y-0.5">
                                                            <li><strong>Passado:</strong> Gráfico (Tendência)</li>
                                                            <li><strong>Presente:</strong> Badge (Diagnóstico Atual)</li>
                                                            <li><strong>Futuro:</strong> Previsão (Projeção CPL)</li>
                                                        </ul>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableHead>

                                    <TableHead className="w-[60px] text-center p-2 text-[13px]" onClick={() => toggleSort("effective_status")}>Status</TableHead>
                                    <TableHead className="w-[40px] text-center p-2 text-[13px]">IA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell className="p-2 flex gap-2"><Skeleton className="h-10 w-10" /><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-8" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-8" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-8" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-8 w-40" /></TableCell>
                                            <TableCell className="p-2 text-center"><Skeleton className="h-4 w-7 mx-auto" /></TableCell>
                                            <TableCell className="p-2 text-center"><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">
                                            Nenhum criativo encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((row) => (
                                        <TableRow key={row.ad_id} className="group hover:bg-muted/50 text-[13px]">

                                            {/* 1. Campanha */}
                                            <TableCell className="p-2 max-w-[200px]">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="text-foreground truncate cursor-help" title={row.campaign_name}>
                                                                {row.campaign_name}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-[300px] text-[11px]">
                                                            {row.campaign_name}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>

                                            {/* 4. Criativo (Thumb + Name) */}
                                            <TableCell className="p-2 max-w-[240px]">
                                                <div className="flex gap-2 min-w-0 items-center">
                                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted group/image">
                                                        {row.thumbnail_url || row.image_url ? (
                                                            <HoverCard>
                                                                <HoverCardTrigger asChild>
                                                                    <div className="h-full w-full cursor-pointer">
                                                                        <img
                                                                            src={row.thumbnail_url || row.image_url}
                                                                            alt={row.ad_name || ""}
                                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover/image:scale-110"
                                                                            loading="lazy"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                            <Eye className="h-4 w-4 text-white drop-shadow-md" />
                                                                        </div>
                                                                    </div>
                                                                </HoverCardTrigger>
                                                                <HoverCardContent className="w-[320px] p-0 overflow-hidden" side="right" align="center">
                                                                    <img
                                                                        src={row.thumbnail_url || row.image_url}
                                                                        alt={row.ad_name || ""}
                                                                        className="w-full h-auto object-cover"
                                                                        loading="lazy"
                                                                    />
                                                                </HoverCardContent>
                                                            </HoverCard>
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center bg-secondary">
                                                                {getCreativeIcon(row.creative_type)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <a
                                                                        href={row.preview_shareable_link || row.image_url || `https://www.facebook.com/ads/library/?id=${row.ad_id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                                    >
                                                                        {row.ad_name || "Sem Nome"}
                                                                        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    </a>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    <p className="text-[10px] font-mono">ID: {row.ad_id}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant="outline" className="px-1 py-0 h-4 text-[9px] border-primary/20 text-muted-foreground">
                                                                {row.creative_type || "Anúncio"}
                                                            </Badge>
                                                            {(() => {
                                                                // Simple Fatigue logic for UI indicator
                                                                const history = row.dailyHistory || [];
                                                                const isFatigued = history.length >= 7 &&
                                                                    stableBenchmarks.avgCPL && row.cpl && row.cpl > stableBenchmarks.avgCPL * 1.5;

                                                                if (isFatigued) {
                                                                    return (
                                                                        <Badge variant="outline" className="px-1 py-0 h-4 text-[9px] border-red-200 bg-red-50 text-red-600 flex items-center gap-0.5">
                                                                            <AlertTriangle className="h-2 w-2" /> Fadiga
                                                                        </Badge>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            {row.has_insights && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-[9px] text-purple-600 font-medium flex items-center gap-0.5 cursor-help">
                                                                                <Sparkles className="h-2 w-2" /> IA
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="text-[10px]">IA já analisou este criativo</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* 5. Unidade */}
                                            <TableCell className="p-2 text-muted-foreground max-w-[120px]">
                                                <div className="flex flex-col min-w-0" title={`${row.unidade} - ${row.curso}`}>
                                                    <div className="font-medium text-foreground leading-tight text-[12px]">{row.unidade}</div>
                                                    <div className="text-[11px] leading-tight opacity-80">{row.curso}</div>
                                                </div>
                                            </TableCell>

                                            {/* 6. CTR */}
                                            <TableCell className="p-2 text-right">
                                                <div className={cn(
                                                    "font-medium font-mono text-[12px]",
                                                    (row.ctr || 0) > 0.015 ? "text-emerald-600" : ""
                                                )}>
                                                    {pct(row.ctr)}
                                                </div>
                                            </TableCell>

                                            {/* 7. CPM */}
                                            <TableCell className="p-2 text-right">
                                                <div className="font-medium font-mono text-[12px] text-muted-foreground">
                                                    {brl((row.investimento / (row.impressoes || 1)) * 1000)}
                                                </div>
                                            </TableCell>

                                            {/* 8. CPL */}
                                            <TableCell className="p-2 text-right">
                                                <div className={cn(
                                                    "font-medium font-mono text-[12px]",
                                                    !row.cpl ? "text-muted-foreground" :
                                                        stableBenchmarks.avgCPL && row.cpl <= stableBenchmarks.avgCPL ? "text-emerald-600" :
                                                            stableBenchmarks.avgCPL && row.cpl <= stableBenchmarks.avgCPL * 1.3 ? "text-amber-500" :
                                                                "text-red-600"
                                                )}>
                                                    {brl(row.cpl)}
                                                </div>
                                            </TableCell>

                                            {/* 9. Conversões */}
                                            <TableCell className="p-2 text-right">
                                                <div className="font-medium font-mono text-[12px]">{row.conversoes}</div>
                                            </TableCell>

                                            {/* 10. Investimento */}
                                            <TableCell className="p-2 text-right text-muted-foreground font-mono text-[12px]">
                                                {brl(row.investimento)}
                                            </TableCell>

                                            {/* 10. Saúde & Tendência */}
                                            <TableCell className="p-2 text-center">
                                                <div className="flex flex-col items-center gap-1 w-full max-w-[180px] mx-auto">
                                                    {/* PASSADO */}
                                                    <div className="w-full">
                                                        <CplSparkline
                                                            data={row.dailyHistory || []}
                                                            width={150}
                                                            height={24}
                                                            avgCpl={stableBenchmarks.avgCPL}
                                                            predictedCpl={row.predicted_cpl}
                                                            currentCpl={row.cpl}
                                                            predictionConfidence={row.predicted_cpl_confidence}
                                                        />
                                                    </div>
                                                    {/* PRESENTE and FUTURO Row */}
                                                    <div className="flex items-center gap-2 scale-90">
                                                        {/* PRESENTE: Badge */}
                                                        {getStatusBadge(row.computedStatus, row)}

                                                        {/* FUTURO: Projection */}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex flex-col items-center gap-0.5 bg-muted/30 px-1.5 py-1 rounded-md border border-border/50 cursor-help min-w-[70px]">
                                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground leading-none">
                                                                        <span>Prev:</span>
                                                                        <span className={cn(
                                                                            row.predicted_cpl && row.cpl && row.predicted_cpl > row.cpl * 1.1 ? "text-amber-600 font-bold" :
                                                                                row.predicted_cpl && row.cpl && row.predicted_cpl < row.cpl * 0.9 ? "text-emerald-600 font-bold" :
                                                                                    "text-foreground"
                                                                        )}>
                                                                            {row.predicted_cpl ? brl(row.predicted_cpl) : "-"}
                                                                        </span>
                                                                    </div>
                                                                    {row.predicted_cpl_confidence !== null && (
                                                                        <div className="flex items-center gap-1 w-full mt-0.5">
                                                                            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={cn(
                                                                                        "h-full transition-all duration-500",
                                                                                        row.predicted_cpl_confidence > 75 ? "bg-emerald-500" :
                                                                                            row.predicted_cpl_confidence > 50 ? "bg-amber-500" :
                                                                                                "bg-slate-400"
                                                                                    )}
                                                                                    style={{ width: `${row.predicted_cpl_confidence}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-[8px] font-bold text-muted-foreground leading-none">
                                                                                {row.predicted_cpl_confidence}%
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="bottom" className="max-w-[220px] p-2 space-y-1">
                                                                <p className="font-semibold text-[10px] uppercase text-muted-foreground">Projeção (D+1)</p>
                                                                <p className="text-xs italic">Estimativa do CPL para amanhã baseada na regressão linear dos últimos 14 dias.</p>

                                                                <div className="pt-1.5 space-y-1 border-t mt-1">
                                                                    <p className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                                                        Confiança: {row.predicted_cpl_confidence}%
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                                                        Indica o nível de previsibilidade dos dados. Valores maiores significam um padrão histórico mais estável e confiável.
                                                                    </p>
                                                                </div>

                                                                <div className="text-[10px] pt-1.5 space-y-0.5 border-t mt-1">
                                                                    <div className="flex items-center gap-1 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Queda esperada &gt; 10%</div>
                                                                    <div className="flex items-center gap-1 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Alta esperada &gt; 10%</div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* 10. Status */}
                                            <TableCell className="p-2 text-center">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center justify-center">
                                                                <Switch
                                                                    checked={row.effective_status === 'ACTIVE'}
                                                                    className="data-[state=checked]:bg-blue-600 h-4 w-7 pointer-events-none scale-75"
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="text-[10px]">
                                                            {row.effective_status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>

                                            {/* 11. IA */}
                                            <TableCell className="p-2 text-center">
                                                <CreativeAnalysisHover row={row} onOpenInsights={() => openInsightsModal(row)} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between py-4">
                            <span className="text-sm text-muted-foreground">
                                Mostrando <strong>{(currentPage - 1) * itemsPerPage + 1}</strong>-<strong>{Math.min(currentPage * itemsPerPage, aggregatedData.length)}</strong> de <strong>{aggregatedData.length}</strong> criativos
                            </span>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Insights Modal */}
            <CreativeInsightsModal
                open={insightsModal.open}
                onOpenChange={(open) => setInsightsModal({ ...insightsModal, open })}
                creativeId={insightsModal.creative?.ad_id || null}
                creativeName={insightsModal.creative?.ad_name || null}
                campaignName={insightsModal.creative?.campaign_name || null}
                dateRange={{ from: dateRange.start, to: dateRange.end }}
                filters={{ unidade, curso, hideBranding }}
                metrics={insightsModal.creative ? {
                    conversoes: insightsModal.creative.conversoes || 0,
                    cpl: insightsModal.creative.cpl,
                    ctr: insightsModal.creative.ctr || 0,
                    investimento: insightsModal.creative.investimento || 0,
                    avgCPL: kpis.avgCPL,
                    predictedCpl: insightsModal.creative.predicted_cpl || null
                } : null}
            />
        </div>
    );
}
