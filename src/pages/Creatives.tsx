import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
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
import { Sparkles, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Users, Image, Video, LayoutGrid, RefreshCw, CalendarIcon, Info, ArrowUpDown, ArrowUp, ArrowDown, Wand2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CplEvolutionChart } from "@/components/performance/PerformanceCharts";
import { CreativeCPLHeatmap } from "@/components/creatives/CreativeCPLHeatmap";
import { Switch } from "@/components/ui/switch";
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
    creative_type: string | null;
    title: string | null;
    body: string | null;
    image_url: string | null;
    thumbnail_url?: string;
    preview_shareable_link: string | null;
    effective_status: string | null;
    status?: string;
    has_assets: boolean;
    has_insights: boolean;
    predicted_cpl?: number | null;
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

export default function CreativesPage() {
    const supabase = getSupabaseClient();

    const { filters, setBusinessUnit, setCourse, setDateRange, setHideBranding } = useFilters();
    const { businessUnit: unidade, course: curso, dateRange: globalRange, hideBranding } = filters;

    // Sort and pagination
    const [sortBy, setSortBy] = React.useState<string>("conversoes");
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [statusFilter, setStatusFilter] = React.useState<string>("all");
    const [minConversions, setMinConversions] = React.useState<number>(0);
    const [minInvestment, setMinInvestment] = React.useState<number>(0);
    const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
    const itemsPerPage = 50;

    const [period, setPeriod] = React.useState<string>("30");

    // Helper function to filter branding
    const filterBranding = React.useCallback((row: CreativeRow) => {
        if (!hideBranding) return true;

        const u = (row.unidade || "").toLowerCase();
        const c = (row.curso || "").toLowerCase();
        const campName = (row.campaign_name || "").toLowerCase();

        const isEad = u.includes("ead") || c.includes("ead");
        const isBranding = u.includes("branding") || u.includes("institucional") ||
            c.includes("branding") || campName.includes("branding") ||
            campName.includes("institucional");

        // Keep EAD even if has branding
        if (isEad) return true;
        return !isBranding;
    }, [hideBranding]);

    const getCreativeStatus = (cpl: number | null, avgCpl: number | null, dailyHistory: { date: string, cpl: number | null }[] = []) => {
        if (!cpl || !avgCpl || dailyHistory.length < 2) return "Em Aprendizado";

        const cleanHistory = dailyHistory.filter(d => {
            const date = new Date((d as any).date + 'T12:00:00');
            const day = date.getDay();
            const isWeekend = day === 0 || day === 6;
            return !isWeekend && d.cpl !== null && d.cpl > 0;
        });

        // SAMPLE GUARD: If history is too short (< 7 active days), we are still testing
        if (cleanHistory.length < 7) return "Testando";

        // PERFORMANCE GUARD: Check last active day
        const lastDayPerformance = cleanHistory[cleanHistory.length - 1];
        const lastCpl = lastDayPerformance.cpl || 0;
        const isCurrentBad = lastCpl > avgCpl * 1.05; // 5% over avg is a hard limit for "good" statuses

        // Windowed Trend: Compare last 2 days vs previous 4 days (more reactive)
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

        const isLowCPL = cpl <= avgCpl * 0.85;
        const isHighCPL = cpl >= avgCpl * 1.15;

        // STATUS LOGIC (Prioritize Trend over Absolute Value when recovering)
        if (trend < 0.92 || isOverallBetter) {
            return isHighCPL ? "Em Recuperação" : "Em Otimização";
        }

        if (isLowCPL) {
            if (isCurrentBad || trend > 1.10) return "Curva de Fadiga";
            return "Estrela";
        }

        if (isHighCPL) {
            return "Fadigado";
        }

        // Mid-range CPL
        if (isCurrentBad || trend > 1.15) return "CPL em Alta";

        return "Estável";
    };

    const calculateCPLForecast = (dailyHistory: { date: string, cpl: number | null }[]) => {
        // Limit to last 14 days to be more reactive to recent trends
        const dailyData = dailyHistory
            .filter(d => d.cpl !== null && d.cpl > 0)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14);

        if (dailyData.length < 5) return null;

        const x = dailyData.map((_, i) => i + 1);
        const y = dailyData.map(d => d.cpl as number);
        const n = x.length;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
        const sumXX = x.reduce((s, xi) => s + xi * xi, 0);

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return null;

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        // Project for tomorrow (n + 1)
        const forecast = Math.max(0, slope * (n + 1) + intercept);
        return forecast;
    };

    const getStatusBadge = (status: string) => {
        let content = "";
        let icon: React.ReactNode = null;

        switch (status) {
            case "Estrela":
                content = "O modelo estatístico detectou performance excelente com custo estável. Ideal para aumentar o investimento.";
                icon = <Sparkles className="h-3 w-3 mr-1" />;
                break;
            case "Curva de Fadiga":
                content = "Sinal estatístico de cansaço da audiência. O CPL ainda está baixo, mas o modelo projeta uma subida iminente.";
                icon = <TrendingUp className="h-3 w-3 mr-1 text-amber-500" />;
                break;
            case "CPL em Alta":
                content = "O padrão matemático indica uma subida acentuada no custo. Requer ajuste ou troca de criativo.";
                icon = <TrendingUp className="h-3 w-3 mr-1" />;
                break;
            case "Em Otimização":
                content = "Tendência estatística positiva: o custo está caindo de forma consistente nos últimos dias.";
                icon = <TrendingDown className="h-3 w-3 mr-1" />;
                break;
            case "Em Recuperação":
                content = "O modelo identificou uma reversão positiva. O desempenho está voltando ao normal, não pause agora.";
                icon = <RefreshCw className="h-3 w-3 mr-1" />;
                break;
            case "Fadigado":
                content = "CPL persistentemente alto. A regressão matemática mostra que a audiência parou de responder a este anúncio.";
                icon = <TrendingUp className="h-3 w-3 mr-1" />;
                break;
            case "Testando":
                content = "Criativo novo. Ainda não há histórico suficiente para o modelo estatístico traçar uma tendência confiável.";
                icon = <RefreshCw className="h-3 w-3 mr-1 animate-spin-slow" />;
                break;
            case "Estável":
                content = "Desempenho dentro do padrão esperado, com variações normais identificadas pelo modelo.";
                break;
            default:
                content = "Aguardando mais dados para o processamento do modelo estatístico.";
        }

        const badge = (() => {
            switch (status) {
                case "Estrela":
                    return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400 border-0 flex items-center">🚀 Estrela</Badge>;
                case "Curva de Fadiga":
                case "CPL em Alta":
                    return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400 border-0 flex items-center">⚠️ {status}</Badge>;
                case "Em Otimização":
                    return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-400 border-0 flex items-center">📈 Otimizando</Badge>;
                case "Em Recuperação":
                    return <Badge className="bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 dark:text-purple-400 border-0 flex items-center">🩹 Recuperando</Badge>;
                case "Fadigado":
                    return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400 border-0 flex items-center">🔴 Fadigado</Badge>;
                case "Testando":
                    return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50 flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" /> Testando
                    </Badge>;
                case "Estável":
                    return <Badge variant="secondary" className="text-muted-foreground opacity-70">Estável</Badge>;
                default:
                    return <Badge variant="outline" className="text-xs text-muted-foreground">Em Aprendizado</Badge>;
            }
        })();

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-help w-fit mx-auto">
                        {badge}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 max-w-[250px] space-y-1">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Status: {status}</p>
                    <p className="text-xs leading-relaxed">{content}</p>
                </TooltipContent>
            </Tooltip>
        );
    };

    const CreativeAnalysisHover = ({ row }: { row: CreativeRow }) => {
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
                                const text = insights.map((i: any) => i.description).join(" ");
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
                        onClick={(e) => { e.stopPropagation(); openInsightsModal(row); }}
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

    // Helper function to filter by status
    const filterStatus = React.useCallback((row: CreativeRow) => {
        if (statusFilter === "all") return true;
        return row.effective_status === statusFilter;
    }, [statusFilter]);

    // Toggle sort function
    const toggleSort = (column: string) => {
        if (sortBy === column) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortDir("desc");
        }
    };

    // Get sort icon
    const getSortIcon = (column: string) => {
        if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground" />;
        return sortDir === "asc"
            ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
            : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
    };

    const [insightsModal, setInsightsModal] = React.useState<{
        open: boolean;
        creative: CreativeRow | null;
    }>({ open: false, creative: null });

    const openInsightsModal = (row: CreativeRow) => {
        setInsightsModal({ open: true, creative: row });
    };



    // Calculate date range (Local period selection updates global range)
    const dateRange = React.useMemo(() => {
        return {
            start: globalRange?.from || startOfMonth(new Date()),
            end: globalRange?.to || endOfMonth(new Date())
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
                .order("conversoes", { ascending: false });

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

    const statusOptions = React.useMemo(() => {
        if (!data) return [];
        return [...new Set(data.map((r) => r.effective_status).filter(Boolean))].sort();
    }, [data]);

    // Aggregate by ad_id for table (sum metrics across dates)
    const aggregatedData = React.useMemo(() => {
        if (!data) return [];

        // Apply branding filter only here (status filter will be applied after aggregation)
        const filteredData = data.filter(row => filterBranding(row));

        // Group daily data by ad_id for sparklines
        const dailyByAd: Record<string, { date: string; cpl: number; conversions: number }[]> = {};
        filteredData.forEach(row => {
            if (!dailyByAd[row.ad_id]) {
                dailyByAd[row.ad_id] = [];
            }
            dailyByAd[row.ad_id].push({
                date: row.data_referencia,
                cpl: (row.conversoes && row.conversoes > 0) ? (row.investimento / row.conversoes) : null,
                conversions: row.conversoes || 0
            });
        });
        // Sort daily data by date
        Object.keys(dailyByAd).forEach(adId => {
            dailyByAd[adId].sort((a, b) => a.date.localeCompare(b.date));
        });

        const grouped = filteredData.reduce((acc, row) => {
            if (!acc[row.ad_id]) {
                acc[row.ad_id] = {
                    ...row,
                    investimento: 0,
                    impressoes: 0,
                    cliques: 0,
                    conversoes: 0,
                };
            }
            // Accumulate metrics
            acc[row.ad_id].investimento += row.investimento || 0;
            acc[row.ad_id].impressoes += row.impressoes || 0;
            acc[row.ad_id].cliques += row.cliques || 0;
            acc[row.ad_id].conversoes += row.conversoes || 0;

            // Keep/Update metadata (pick any non-null value)
            acc[row.ad_id].effective_status = row.effective_status || acc[row.ad_id].effective_status;
            acc[row.ad_id].preview_shareable_link = row.preview_shareable_link || acc[row.ad_id].preview_shareable_link;
            acc[row.ad_id].image_url = row.image_url || acc[row.ad_id].image_url;
            acc[row.ad_id].creative_type = row.creative_type || acc[row.ad_id].creative_type;

            return acc;
        }, {} as Record<string, CreativeRow>);

        // Pre-calculate reference avgCPL for status logic (to avoid circular dependency with kpis)
        const performanceRows = Object.values(grouped).filter(r => {
            const u = (r.unidade || "").toLowerCase();
            const c = (r.curso || "").toLowerCase();
            const campName = (r.campaign_name || "").toLowerCase();
            const isBranding = u.includes("branding") || u.includes("institucional") ||
                c.includes("branding") || campName.includes("branding") ||
                campName.includes("institucional");
            return !isBranding;
        });
        const perfSpend = performanceRows.reduce((acc, r) => acc + (r.investimento || 0), 0);
        const perfConversions = performanceRows.reduce((acc, r) => acc + (r.conversoes || 0), 0);
        const referenceAvgCpl = perfConversions > 0 ? perfSpend / perfConversions : 0;

        return Object.values(grouped)
            .map((r) => {
                const cplValue = r.conversoes > 0 ? r.investimento / r.conversoes : null;
                const history = dailyByAd[r.ad_id] || [];
                const predictedCpl = calculateCPLForecast(history);
                return {
                    ...r,
                    ctr: r.impressoes > 0 ? (r.cliques / r.impressoes) * 100 : 0,
                    cpl: cplValue,
                    dailyHistory: history,
                    computedStatus: getCreativeStatus(cplValue, referenceAvgCpl, history),
                    predicted_cpl: predictedCpl
                };
            })
            .filter((r) => {
                if (minConversions > 0 && r.conversoes < minConversions) return false;
                if (minInvestment > 0 && (r.investimento || 0) < minInvestment) return false;
                return true;
            })
            .sort((a, b) => {
                const getValue = (row: any) => {
                    switch (sortBy) {
                        case "status": return row.computedStatus;
                        case "ad_name": return row.ad_name || row.ad_id || "";
                        case "campaign_name": return row.campaign_name || "";
                        case "unidade": return row.unidade || "";
                        case "curso": return row.curso || "";
                        case "impressoes": return row.impressoes || 0;
                        case "cliques": return row.cliques || 0;
                        case "ctr": return row.ctr || 0;
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
                        "Estrela": 1,
                        "Em Recuperação": 2,
                        "Em Otimização": 3,
                        "Testando": 4,
                        "Estável": 5,
                        "CPL em Alta": 6,
                        "Curva de Fadiga": 7,
                        "Fadigado": 8
                    };
                    const aWeight = statusWeights[aVal] || 99;
                    const bWeight = statusWeights[bVal] || 99;
                    return sortDir === "asc" ? aWeight - bWeight : bWeight - aWeight;
                }

                if (sortBy === "effective_status") {
                    const statusWeight = (s: string) => {
                        if (s === "ACTIVE") return 1;
                        if (s === "PAUSED") return 2;
                        return 3;
                    };
                    const aWeight = statusWeight(aVal);
                    const bWeight = statusWeight(bVal);
                    if (aWeight !== bWeight) {
                        return sortDir === "asc" ? aWeight - bWeight : bWeight - aWeight;
                    }
                    return 0;
                }

                if (typeof aVal === "string") {
                    return sortDir === "asc"
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            })
            // Apply status filter AFTER aggregation (using consolidated effective_status)
            .filter(row => filterStatus(row));
    }, [data, sortBy, sortDir, filterBranding, filterStatus]);

    // Aggregate KPIs - derive from aggregatedData which has proper status filtering
    const kpis: KPIs = React.useMemo(() => {
        if (!aggregatedData || aggregatedData.length === 0) {
            return { totalCreatives: 0, totalConversions: 0, avgCPL: null, avgCTR: 0, totalSpend: 0 };
        }

        const totalCreatives = aggregatedData.length;
        const totalConversions = aggregatedData.reduce((acc, r) => acc + (r.conversoes || 0), 0);
        const totalSpend = aggregatedData.reduce((acc, r) => acc + (r.investimento || 0), 0);

        // CPL Calculation: Explicitly exclude Branding investment/conversions
        // This ensures "Avg CPL" always reflects Performance CPL
        const performanceData = aggregatedData.filter(r => {
            const u = (r.unidade || "").toLowerCase();
            const c = (r.curso || "").toLowerCase();
            const campName = (r.campaign_name || "").toLowerCase();

            const isBranding = u.includes("branding") || u.includes("institucional") ||
                c.includes("branding") || campName.includes("branding") ||
                campName.includes("institucional");
            return !isBranding;
        });

        const performanceSpend = performanceData.reduce((acc, r) => acc + (r.investimento || 0), 0);
        const performanceConversions = performanceData.reduce((acc, r) => acc + (r.conversoes || 0), 0);

        const avgCPL = performanceConversions > 0 ? performanceSpend / performanceConversions : null;

        const totalImpressions = aggregatedData.reduce((acc, r) => acc + (r.impressoes || 0), 0);
        const totalClicks = aggregatedData.reduce((acc, r) => acc + (r.cliques || 0), 0);
        const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        return { totalCreatives, totalConversions, avgCPL, avgCTR, totalSpend };
    }, [aggregatedData]);

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



    // Daily aggregation for evolution chart (applies branding filter)
    const evolutionData = React.useMemo(() => {
        if (!data) return [];

        // Apply branding filter (status filter not applicable for daily aggregation)
        const filteredData = data.filter(row => filterBranding(row));

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
    }, [data, filterBranding]);

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
            <div className="flex flex-wrap gap-4 items-center">
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[260px]">
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">
                            Ontem <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(1)}</span>
                        </SelectItem>
                        <SelectItem value="7">
                            Últimos 7 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(7)}</span>
                        </SelectItem>
                        <SelectItem value="15">
                            Últimos 15 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(15)}</span>
                        </SelectItem>
                        <SelectItem value="30">
                            Últimos 30 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(30)}</span>
                        </SelectItem>
                        <SelectItem value="90">
                            Últimos 90 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(90)}</span>
                        </SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                </Select>

                {period === "custom" && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {globalRange?.from ? (
                                    globalRange.to ? (
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
                                onSelect={(range) => setDateRange(range)}
                                numberOfMonths={2}
                                locale={ptBR}
                            />
                        </PopoverContent>
                    </Popover>
                )}

                <Select value={unidade || "all"} onValueChange={(val) => setBusinessUnit(val === "all" ? null : val)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Unidades</SelectItem>
                        {unidades.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={curso || "all"} onValueChange={(val) => setCourse(val === "all" ? null : val)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Curso" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Cursos</SelectItem>
                        {cursos.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        {statusOptions.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Branding Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                    <Switch
                        id="hideBranding"
                        checked={hideBranding}
                        onCheckedChange={setHideBranding}
                    />
                    <label
                        htmlFor="hideBranding"
                        className="text-sm text-muted-foreground cursor-pointer select-none"
                    >
                        Ocultar Branding
                    </label>
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
                            {/* Force branding exclusion in KPI logic, regardless of hideBranding toggle */}
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
                                <TooltipContent side="top" className="max-w-[200px]">
                                    <p className="text-xs">Valor total investido em mídia paga no período selecionado.</p>
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
                                <TableRow>

                                    <TableHead className="w-[500px] cursor-pointer" onClick={() => toggleSort("ad_name")}>
                                        <span className="flex items-center">Criativo {getSortIcon("ad_name")}</span>
                                    </TableHead>
                                    <TableHead className="w-[100px] cursor-pointer" onClick={() => toggleSort("unidade")}>
                                        <span className="flex items-center">Unidade {getSortIcon("unidade")}</span>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("conversoes")}>
                                        <span className="flex items-center justify-end">Conversões {getSortIcon("conversoes")}</span>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("cpl")}>
                                        <span className="flex items-center justify-end">CPL {getSortIcon("cpl")}</span>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            CPL Previsto
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-3 w-3 cursor-help text-muted-foreground/50" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[200px] p-2 text-[11px]">
                                                        <p>Este é o custo futuro que o <strong>modelo estatístico de regressão</strong> prevê para este anúncio.</p>
                                                        <p className="mt-1 text-muted-foreground italic text-[10px]"><strong>O que é regressão:</strong> Uma técnica que encontra padrões no passado para traçar uma "linha de tendência" e projetar o futuro.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right w-[140px]">
                                        Histórico (CPL)
                                    </TableHead>
                                    <TableHead className="text-center w-[80px] cursor-pointer" onClick={() => toggleSort("ctr")}>
                                        <span className="flex items-center justify-center pl-4">CTR {getSortIcon("ctr")}</span>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("investimento")}>
                                        <span className="flex items-center justify-end">Investimento {getSortIcon("investimento")}</span>
                                    </TableHead>
                                    <TableHead className="w-[120px] text-center cursor-pointer" onClick={() => toggleSort("status")}>
                                        <span className="flex items-center justify-center">Status {getSortIcon("status")}</span>
                                    </TableHead>
                                    <TableHead className="w-[60px] text-center">IA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            Nenhum criativo encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((row) => (
                                        <TableRow key={row.ad_id} className="group hover:bg-muted/50">

                                            <TableCell>
                                                <div className="flex gap-3 min-w-0">
                                                    {/* Thumbnail with Hover Zoom */}
                                                    {/* Thumbnail with Hover Zoom */}
                                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted group/image">
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
                                                                            <Eye className="h-6 w-6 text-white drop-shadow-md" />
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

                                                    <div className="flex flex-col gap-1 min-w-0 justify-center">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="w-fit gap-1 px-1.5 py-0 h-5 text-[10px] font-normal text-muted-foreground border-primary/20">
                                                                {getCreativeIcon(row.creative_type)}
                                                                {row.creative_type || "Anúncio"}
                                                            </Badge>
                                                            {row.campaign_name && (
                                                                <span className="text-[10px] text-muted-foreground truncate max-w-[400px]" title={row.campaign_name}>
                                                                    {row.campaign_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <a
                                                            href={row.preview_shareable_link || row.image_url || `https://www.facebook.com/ads/library/?id=${row.ad_id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-sm truncate text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                                                            title={row.ad_name || row.ad_id}
                                                        >
                                                            {row.ad_name || "Sem Nome"}
                                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            ID: {row.ad_id}
                                                        </span>
                                                        {row.has_insights && (
                                                            <div className="flex items-center gap-1 text-[10px] text-purple-600 font-medium animate-pulse">
                                                                <Sparkles className="h-2.5 w-2.5" />
                                                                IA: Análise disponível
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[100px]">
                                                <div className="flex flex-col gap-0.5 truncate">
                                                    <span className="truncate" title={row.unidade}>{row.unidade}</span>
                                                    <span className="opacity-70 text-[10px] truncate" title={row.curso}>{row.curso}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-medium">{row.conversoes}</div>
                                                <div className="text-[10px] text-muted-foreground">leads</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className={cn(
                                                    "font-medium",
                                                    (row.cpl || 0) < 30 ? "text-emerald-600" : (row.cpl || 0) > 100 ? "text-red-600" : ""
                                                )}>
                                                    {brl(row.cpl)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "font-bold",
                                                    row.predicted_cpl && row.cpl && row.predicted_cpl > row.cpl * 1.1 ? "text-amber-600" :
                                                        row.predicted_cpl && row.cpl && row.predicted_cpl < row.cpl * 0.9 ? "text-emerald-600" :
                                                            "text-muted-foreground"
                                                )}>
                                                    {row.predicted_cpl ? brl(row.predicted_cpl) : "-"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pl-4">
                                                <CplSparkline
                                                    data={row.dailyHistory || []}
                                                    width={120}
                                                    height={32}
                                                    avgCpl={kpis.avgCPL}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center text-xs pl-6">
                                                {pct(row.ctr)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {brl(row.investimento)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(row.computedStatus)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <CreativeAnalysisHover row={row} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
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
                metrics={insightsModal.creative ? {
                    conversoes: insightsModal.creative.conversoes || 0,
                    cpl: insightsModal.creative.cpl,
                    ctr: insightsModal.creative.ctr || 0,
                    investimento: insightsModal.creative.investimento || 0,
                    avgCPL: kpis.avgCPL
                } : null}
            />
        </div>
    );
}
