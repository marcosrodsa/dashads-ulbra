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
    reach?: number | null;
    frequency?: number | null;
    hook_rate?: number | null;
    hold_rate?: number | null;
    dailyHistory?: { date: string; cpl: number | null; conversions: number; investimento: number; impressoes: number }[];
    healthScore?: {
        score: number;
        pillars: any;
        action: string;
        color: string;
    };
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

    const getCreativeStatus = (row: CreativeRow, avgCpl: number | null) => {
        const { cpl, conversoes, investimento, dailyHistory, reach, frequency, hook_rate } = row;
        const history = dailyHistory || [];

        if (conversoes < 5 || history.length < 3) return "Em Aprendizado";

        const totalSpend = investimento || 0;
        const isHighHook = hook_rate && hook_rate > 25;
        const isEfficient = avgCpl && cpl && cpl < avgCpl * 1.05;

        // === B. Marginal Efficiency Scaling (Sliding Window 3d vs 3d) ===
        const sortedHistory = [...history]
            .filter(d => d.investimento > 0)
            .sort((a, b) => a.date.localeCompare(b.date));

        let scalingStatus: string | null = null;
        if (sortedHistory.length >= 6 && isEfficient) {
            const recent3 = sortedHistory.slice(-3);
            const previous3 = sortedHistory.slice(-6, -3);

            const recentSpend = recent3.reduce((s, d) => s + d.investimento, 0);
            const previousSpend = previous3.reduce((s, d) => s + d.investimento, 0);

            const recentCPL = recent3.reduce((s, d) => s + (d.cpl || 0), 0) / recent3.length;
            const previousCPL = previous3.reduce((s, d) => s + (d.cpl || 0), 0) / previous3.length;

            if (previousSpend > 0 && previousCPL > 0) {
                const spendGrowth = (recentSpend - previousSpend) / previousSpend;
                const cplGrowth = (recentCPL - previousCPL) / previousCPL;

                if (spendGrowth > 0.20 && cplGrowth < 0.10) {
                    scalingStatus = "Scaling (Top Perform)";
                } else if (spendGrowth > 0.20 && cplGrowth >= spendGrowth) {
                    scalingStatus = "Teto de Escala";
                }
            }
        }

        if (scalingStatus) return scalingStatus;

        // === C. Hook Rate Safety Lock ===
        if (totalSpend > 200 && hook_rate !== null && hook_rate !== undefined && hook_rate < 10) {
            return "Rejeição de Recuperação";
        }

        // Andromeda Lifecycle Logic
        if (isEfficient) {
            if (frequency && frequency > 2.5) return "Estável (Saturando)";
            return "Stable Contributor";
        }

        if (cpl && avgCpl && cpl > avgCpl * 1.4) {
            return "Fadigado (Trocar)";
        }

        if (totalSpend < 50 && history.length > 7) return "Redundante (Sem Entrega)";

        return "Em Teste";
    };

    const calculateHealthScore = (row: CreativeRow, avgCpl: number) => {
        const cpl = row.cpl;
        const conversions = row.conversoes || 0;
        const frequency = row.frequency;
        const hookRate = row.hook_rate;
        const isImage = row.creative_type?.toUpperCase().includes('IMAG');
        const hasFrequency = frequency !== null && frequency !== undefined;
        const hasHookRate = hookRate !== null && hookRate !== undefined;

        // 1. Efficiency Pillar (40%) - CPL vs Account Avg (Continuous Score)
        let efficiencyScore = 0;
        let efficiencyReason = '';

        if (!cpl || !avgCpl) {
            efficiencyScore = 50;
            efficiencyReason = 'Sem dados de CPL para comparação';
        } else {
            // Calculate deviation percentage: (Avg - CPL) / Avg
            // Positive deviation means CPL is lower (better)
            const deviation = (avgCpl - cpl) / avgCpl;

            // Base score 70 (Average). 
            // +30% deviation (CPL 30% lower) = 100 Score.
            // -40% deviation (CPL 40% higher) = 30 Score.
            efficiencyScore = Math.min(Math.max(Math.round(70 + (deviation * 100)), 0), 100);

            const pctText = Math.abs(Math.round(deviation * 100));

            if (deviation >= 0.3) efficiencyReason = `CPL ${brl(cpl)} é elite (-${pctText}% vs média ${brl(avgCpl)}). Nota Máxima.`;
            else if (deviation > 0) efficiencyReason = `CPL ${brl(cpl)} está bom (-${pctText}% vs média ${brl(avgCpl)}).`;
            else if (deviation === 0) efficiencyReason = `CPL ${brl(cpl)} está na média.`;
            else if (deviation > -0.2) efficiencyReason = `CPL ${brl(cpl)} está acima da média (+${pctText}% vs ${brl(avgCpl)}). Atenção.`;
            else efficiencyReason = `CPL ${brl(cpl)} está crítico (+${pctText}% vs média ${brl(avgCpl)}).`;
        }

        // 2. Volume Pillar (25%) - Data Reliability
        // Keep linear up to 20 conversions for statistical confidence
        let volumeScore = Math.min((conversions / 20) * 100, 100);
        const volumeReason = conversions >= 20
            ? `${conversions} conversões — dados estatisticamente confiáveis (Nota Máxima)`
            : `${conversions}/20 conversões — confiança parcial (${Math.round(volumeScore)}%)`;

        // 3. Attention/Stability Pillar (20%) - Hook Rate (Vídeo) ou CTR (Imagem)
        let stabilityScore = 50; // Neutral default
        let stabilityReason = '';
        let stabilityLabel = ''; // Used by tooltip
        const ctrAll = row.ctr || 0;

        if (isImage) {
            // IMAGEM: Mixed Pillar (Hook 60% / Hold 40%)
            // Hook = CTR All / Hold = Link Click Ratio (Calculados na View)
            const hRate = row.hook_rate || 0;
            const hlRate = row.hold_rate || 0;

            const hookScore = Math.min((hRate / 1.5) * 100, 100);
            const holdScore = Math.min((hlRate / 80) * 100, 100); // 80% de cliques All virando Link (Elite)

            stabilityScore = (hookScore * 0.6) + (holdScore * 0.4);
            stabilityLabel = `Atenção/Ret. 🖼️`;

            stabilityReason = `Hook ${hRate.toFixed(2)}% | Hold ${hlRate.toFixed(1)}%. `;

            if (hRate < 0.8) stabilityReason += "⚠ Imagem não para o scroll.";
            else if (hlRate < 50) stabilityReason += "⚠ Link pouco atrativo.";
            else stabilityReason += "✅ Imagem validada.";

        } else if (hasHookRate) {
            // VÍDEO: Mixed Pillar (Hook 60% / Hold 40%)
            // Hook = 3s/Imp / Hold = ThruPlay/3s (Calculados na View)
            const hRate = row.hook_rate || 0;
            const hlRate = row.hold_rate || 0;

            const hookScore = Math.min((hRate / 30) * 100, 100);
            const holdScore = Math.min((hlRate / 40) * 100, 100); // 40% ThruPlay rate meta sênior

            stabilityScore = (hookScore * 0.6) + (holdScore * 0.4);
            stabilityLabel = `Atenção/Ret. 🎬`;

            stabilityReason = `Hook ${hRate.toFixed(1)}% | Hold ${hlRate.toFixed(1)}%. `;

            if (hRate < 15) stabilityReason += "⚠ Melhore os primeiros 3s.";
            else if (hlRate < 20) stabilityReason += "⚠ Conteúdo não retém.";
            else stabilityReason += "✅ Vídeo de alta qualidade.";
        } else {
            stabilityLabel = 'Atenção (—)';
            stabilityReason = 'Sem dados de métrica primária (Hook/CTR).';
        }

        // 4. Fatigue Warning (15%) - Frequency
        // Linear Decay from 1.8x to 3.0x
        // < 1.8 = 100 Score
        // 2.4 = 50 Score
        // > 3.0 = 0 Score
        let fatigueScore = 100;
        let fatigueReason = '';
        const freqVal = frequency || 1; // Default to 1 if null for calc, but handle null reasoning

        if (!hasFrequency) {
            fatigueScore = 70; // Neutral
            fatigueReason = 'Sem dados de frequência. Score neutro.';
        } else if (freqVal <= 1.8) {
            fatigueScore = 100;
            fatigueReason = `Frequência ${freqVal.toFixed(2)}x — Saudável (Abaixo de 1.8x). Nota Máxima.`;
        } else if (freqVal >= 3.0) {
            fatigueScore = 0;
            fatigueReason = `Frequência ${freqVal.toFixed(2)}x — Saturado (Acima de 3.0x). Score zerado.`;
        } else {
            // Interpolate between 1.8 (100) and 3.0 (0)
            const range = 3.0 - 1.8; // 1.2
            const excess = freqVal - 1.8;
            const penalty = (excess / range) * 100;
            fatigueScore = Math.max(0, Math.round(100 - penalty));
            fatigueReason = `Frequência ${freqVal.toFixed(2)}x — em elevação (Alerta em 2.5x).`;
        }

        // Final Weighted Score
        const totalScore = Math.round(
            (efficiencyScore * 0.40) +
            (volumeScore * 0.25) +
            (stabilityScore * 0.20) +
            (fatigueScore * 0.15)
        );

        // Round pillars for display
        const roundedPillars = {
            efficiency: Math.round(efficiencyScore),
            volume: Math.round(volumeScore),
            stability: Math.round(stabilityScore),
            fatigue: Math.round(fatigueScore)
        };

        // Learning Guardrail
        const isLearning = conversions < 5 || (row.dailyHistory?.length || 0) < 3;

        let action = "";
        let color = "";

        if (isLearning) {
            action = "Aguardar";
            color = "blue";
        } else if (totalScore >= 80) {
            action = "Escalar";
            color = "emerald";
        } else if (totalScore >= 50) {
            action = "Manter";
            color = "blue";
        } else if (totalScore >= 30) {
            action = "Otimizar";
            color = "amber";
        } else {
            action = "Trocar";
            color = "red";
        }

        return {
            score: totalScore,
            pillars: {
                efficiency: Math.round(efficiencyScore),
                volume: Math.round(volumeScore),
                stability: Math.round(stabilityScore),
                fatigue: Math.round(fatigueScore)
            },
            reasons: {
                efficiency: efficiencyReason,
                stability: stabilityReason,
                stabilityLabel: stabilityLabel,
                fatigue: fatigueReason,
                volume: volumeReason
            },
            action,
            color
        };
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
                acc[row.ad_id] = {
                    ...row,
                    investimento: 0,
                    impressoes: 0,
                    cliques: 0,
                    conversoes: 0,
                    // Internal accumulators for weighted averages
                    _weighted_hook: 0,
                    _weighted_hold: 0,
                    _hold_denominator: 0
                } as CreativeRow & { _weighted_hook: number; _weighted_hold: number; _hold_denominator: number };
            }
            acc[row.ad_id].investimento += row.investimento || 0;
            acc[row.ad_id].impressoes += row.impressoes || 0;
            acc[row.ad_id].cliques += row.cliques || 0;
            acc[row.ad_id].conversoes += row.conversoes || 0;

            // WEIGHTED AVERAGE CALCULATION (Fix for Daily vs Period discrepancy)
            const dailyImp = row.impressoes || 0;
            const dailyHookRate = row.hook_rate || 0;
            const dailyHoldRate = row.hold_rate || 0;

            // Hook Numerator (3s Views or Clicks All) = (Rate * Imp) / 100
            const dailyHookAction = (dailyHookRate * dailyImp) / 100;

            // Hold Numerator (ThruPlays or Link Clicks) = (Hold Rate * Denom) / 100
            // For Video, Denom = Hook Action (3s Views). For Image, Denom = Hook Action (Clicks All)
            const dailyHoldAction = (dailyHoldRate * dailyHookAction) / 100;

            (acc[row.ad_id] as any)._weighted_hook += dailyHookAction;
            (acc[row.ad_id] as any)._weighted_hold += dailyHoldAction;
            (acc[row.ad_id] as any)._hold_denominator += dailyHookAction;

            // Sync metadata (Keep latest status if available)
            acc[row.ad_id].effective_status = row.effective_status || acc[row.ad_id].effective_status;
            acc[row.ad_id].preview_shareable_link = row.preview_shareable_link || acc[row.ad_id].preview_shareable_link;
            acc[row.ad_id].image_url = row.image_url || acc[row.ad_id].image_url;
            acc[row.ad_id].creative_type = row.creative_type || acc[row.ad_id].creative_type;

            return acc;
        }, {} as Record<string, CreativeRow & { _weighted_hook: number; _weighted_hold: number; _hold_denominator: number }>);

        Object.keys(dailyByAd).forEach(adId => {
            dailyByAd[adId].sort((a, b) => a.date.localeCompare(b.date));
        });

        return Object.values(grouped).map(r => {
            const dailyHistory = dailyByAd[r.ad_id] || [];

            // Calculate final weighted rates
            // Safety check: impressions > 0
            const finalHookRate = (r.impressoes || 0) > 0
                ? ((r as any)._weighted_hook / (r.impressoes || 1)) * 100
                : 0;

            // Safety check: hold denominator > 0
            const finalHoldRate = ((r as any)._hold_denominator || 0) > 0
                ? ((r as any)._weighted_hold / (r as any)._hold_denominator) * 100
                : 0;

            return {
                ...r,
                dailyHistory,
                // Override with calculated weighted averages
                hook_rate: Number(finalHookRate.toFixed(2)),
                hold_rate: Number(finalHoldRate.toFixed(2))
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

                const baseRow = {
                    ...r,
                    ctr: r.impressoes > 0 ? (r.cliques / r.impressoes) * 100 : 0,
                    cpl: cplValue
                };

                const healthData = calculateHealthScore(baseRow, stableBenchmarks.avgCPL || 0);

                return {
                    ...baseRow,
                    computedStatus: getCreativeStatus(baseRow, stableBenchmarks.avgCPL || 0),
                    healthScore: healthData
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
                const getValue = (row: any): string | number => {
                    switch (sortBy) {
                        case "status": return row.computedStatus || "";
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
                        case "hook_rate": return row.hook_rate || 0;
                        case "hold_rate": return row.hold_rate || 0;
                        case "effective_status": return row.effective_status || "";
                        default: return row.conversoes || 0;
                    }
                };
                const aVal = getValue(a);
                const bVal = getValue(b);

                if (sortBy === "status") {
                    const statusWeights: Record<string, number> = {
                        "Scaling (Top Perform)": 1,
                        "Stable Contributor": 2,
                        "Em Teste": 3,
                        "Em Aprendizado": 4,
                        "Estável (Saturando)": 5,
                        "Redundante (Sem Entrega)": 6,
                        "Fadigado (Trocar)": 7
                    };
                    const aWeight = statusWeights[aVal.toString()] || 99;
                    const bWeight = statusWeights[bVal.toString()] || 99;
                    return sortDir === "asc" ? aWeight - bWeight : bWeight - aWeight;
                }

                if (sortBy === "effective_status") {
                    const statusWeight = (s: string | number) => s === "ACTIVE" ? 1 : s === "PAUSED" ? 2 : 3;
                    const aWeight = statusWeight(aVal);
                    const bWeight = statusWeight(bVal);
                    if (aWeight !== bWeight) return sortDir === "asc" ? aWeight - bWeight : bWeight - aWeight;
                    return 0;
                }

                if (typeof aVal === "string" && typeof bVal === "string") {
                    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }

                // Ensure numeric comparison
                const nA = Number(aVal);
                const nB = Number(bVal);
                return sortDir === "asc" ? nA - nB : nB - nA;
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

                                    <TableHead className="text-right w-[80px] p-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[12px]">Reach/Freq</span>
                                            <span className="text-[9px] text-muted-foreground">Alcance/Saturação</span>
                                        </div>
                                    </TableHead>

                                    <TableHead className="text-right w-[80px] cursor-pointer p-2" onClick={() => toggleSort("hook_rate")}>
                                        <div className="flex flex-col items-end group">
                                            <span className="flex items-center text-[12px]">Hook % {getSortIcon("hook_rate")}</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-[9px] text-muted-foreground border-b border-dotted cursor-help">Gancho</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[200px] text-[11px]">
                                                        <p><strong>Vídeo:</strong> % que viu 3s (3s/Imp).</p>
                                                        <p><strong>Imagem:</strong> CTR Todos (Impacto).</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableHead>

                                    <TableHead className="text-right w-[80px] cursor-pointer p-2" onClick={() => toggleSort("hold_rate")}>
                                        <div className="flex flex-col items-end group">
                                            <span className="flex items-center text-[12px]">Hold % {getSortIcon("hold_rate")}</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-[9px] text-muted-foreground border-b border-dotted cursor-help">Retenção</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[200px] text-[11px]">
                                                        <p><strong>Vídeo:</strong> % ThruPlay (ThruPlay/3s).</p>
                                                        <p className="text-[10px] text-muted-foreground mb-1">ThruPlay: Vídeos assistidos por 15s ou até o fim.</p>
                                                        <p><strong>Imagem:</strong> Qualidade (Link/Todos).</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableHead>

                                    <TableHead className="text-right w-[90px] cursor-pointer p-2" onClick={() => toggleSort("investimento")}>
                                        <span className="flex items-center justify-end text-[13px]">Invest. {getSortIcon("investimento")}</span>
                                    </TableHead>

                                    <TableHead className="w-[120px] p-2 text-center text-[13px]">Histórico CPL</TableHead>

                                    <TableHead className="text-center w-[120px] cursor-pointer p-2" onClick={() => toggleSort("status")}>
                                        <div className="flex flex-col items-center justify-center gap-0.5 text-[12px] font-bold group">
                                            <span className="text-foreground/70 uppercase tracking-tighter">Saúde Senior</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-medium text-muted-foreground/60">Andrômeda 2026</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-2.5 w-2.5 cursor-help text-muted-foreground/40 group-hover:text-purple-400 transition-colors" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-[240px] p-3 text-[11px] leading-relaxed">
                                                            <p className="font-bold mb-1">Algoritmo de Decisão Senior:</p>
                                                            <p>Score 0-100 ponderado por:</p>
                                                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                                                <li><strong>Eficiência (35%):</strong> CPL vs Meta da Conta</li>
                                                                <li><strong>Momentum (30%):</strong> Slope da tendência (CPL subindo/caindo)</li>
                                                                <li><strong>Confiança (20%):</strong> Correlação R² ajustada por MAE</li>
                                                                <li><strong>Volume (15%):</strong> Amostragem de conversões</li>
                                                            </ul>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
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
                                            <TableCell className="p-2 text-right"><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell className="p-2"><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                                            <TableCell className="p-2 text-center"><Skeleton className="h-10 w-10 mx-auto rounded-full" /></TableCell>
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

                                            {/* Reach/Frequency Column */}
                                            <TableCell className="p-2 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-mono text-[11px] font-medium">{row.reach?.toLocaleString() || "-"}</span>
                                                    <Badge variant="outline" className="px-1 py-0 h-3 text-[9px] border-slate-200 text-slate-500">
                                                        {row.frequency?.toFixed(2) || "1.00"}x
                                                    </Badge>
                                                </div>
                                            </TableCell>

                                            {/* Hook Rate Column */}
                                            <TableCell className="p-2 text-right">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={cn(
                                                                "font-mono text-[11px] font-bold cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-2",
                                                                (row.hook_rate || 0) > 30 ? "text-emerald-600" :
                                                                    (row.hook_rate || 0) > 15 ? "text-blue-600" : "text-muted-foreground"
                                                            )}>
                                                                {(row.hook_rate !== null && row.hook_rate !== undefined) ? `${row.hook_rate}%` : "-"}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="text-[10px] p-2 space-y-1 bg-popover border-border shadow-xl">
                                                            {row.creative_type?.toUpperCase().includes('IMAG') ? (
                                                                <>
                                                                    <p className="font-bold border-b pb-1 mb-1">Hook Imagem (Meta 1.5%)</p>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 opacity-90">
                                                                        <span>&lt; 0.5%</span><span className="text-red-500 font-mono text-right">0-30 pts</span>
                                                                        <span>0.5% - 1.0%</span><span className="text-amber-500 font-mono text-right">30-60 pts</span>
                                                                        <span>&gt; 1.0%</span><span className="text-emerald-500 font-mono text-right">60-100 pts</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="font-bold border-b pb-1 mb-1">Hook Vídeo (Meta 30%)</p>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 opacity-90">
                                                                        <span>&lt; 15%</span><span className="text-red-500 font-mono text-right">0-50 pts</span>
                                                                        <span>15% - 25%</span><span className="text-amber-500 font-mono text-right">50-80 pts</span>
                                                                        <span>&gt; 25%</span><span className="text-emerald-500 font-mono text-right">80-100 pts</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>

                                            {/* Hold Rate Column */}
                                            <TableCell className="p-2 text-right">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className={cn(
                                                                "font-mono text-[11px] font-bold cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-2",
                                                                (row.hold_rate || 0) > 30 ? "text-emerald-600 center" :
                                                                    (row.hold_rate || 0) > 15 ? "text-blue-600" : "text-muted-foreground"
                                                            )}>
                                                                {(row.hold_rate !== null && row.hold_rate !== undefined) ? `${row.hold_rate}%` : "-"}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="text-[10px] p-2 space-y-1 bg-popover border-border shadow-xl">
                                                            {row.creative_type?.toUpperCase().includes('IMAG') ? (
                                                                <>
                                                                    <p className="font-bold border-b pb-1 mb-1">Hold Imagem (Meta 80%)</p>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 opacity-90">
                                                                        <span>&lt; 40%</span><span className="text-red-500 font-mono text-right">0-50 pts</span>
                                                                        <span>40% - 65%</span><span className="text-amber-500 font-mono text-right">50-80 pts</span>
                                                                        <span>&gt; 65%</span><span className="text-emerald-500 font-mono text-right">80-100 pts</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="font-bold border-b pb-1 mb-1">Hold Vídeo (Meta 40%)</p>
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 opacity-90">
                                                                        <span>&lt; 20%</span><span className="text-red-500 font-mono text-right">0-50 pts</span>
                                                                        <span>20% - 35%</span><span className="text-amber-500 font-mono text-right">50-85 pts</span>
                                                                        <span>&gt; 35%</span><span className="text-emerald-500 font-mono text-right">85-100 pts</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>

                                            {/* 10. Investimento */}
                                            <TableCell className="p-2 text-right text-muted-foreground font-mono text-[12px]">
                                                {brl(row.investimento)}
                                            </TableCell>

                                            <TableCell className="p-2 w-[120px]">
                                                <CplSparkline
                                                    data={row.dailyHistory || []}
                                                    avgCpl={stableBenchmarks.avgCPL}
                                                    width={100}
                                                    height={32}
                                                />
                                            </TableCell>

                                            {/* 11. Senior Health Widget */}
                                            <TableCell className="p-2 text-center">
                                                <HoverCard openDelay={200} closeDelay={100}>
                                                    <HoverCardTrigger asChild>
                                                        <div className="flex flex-col items-center gap-1.5 cursor-help group">
                                                            <div className="relative flex items-center justify-center">
                                                                {/* Score Ring */}
                                                                <svg className="w-10 h-10 transform -rotate-90">
                                                                    <circle
                                                                        cx="20" cy="20" r="16"
                                                                        stroke="currentColor"
                                                                        strokeWidth="3.5"
                                                                        fill="transparent"
                                                                        className="text-muted/20"
                                                                    />
                                                                    <circle
                                                                        cx="20" cy="20" r="16"
                                                                        stroke="currentColor"
                                                                        strokeWidth="3.5"
                                                                        strokeDasharray={100}
                                                                        strokeDashoffset={100 - (row.healthScore?.score || 0)}
                                                                        strokeLinecap="round"
                                                                        fill="transparent"
                                                                        className={cn(
                                                                            "transition-all duration-1000",
                                                                            row.healthScore?.color === 'emerald' ? "text-emerald-500" :
                                                                                row.healthScore?.color === 'emerald-light' ? "text-emerald-400" :
                                                                                    row.healthScore?.color === 'amber' ? "text-amber-500" :
                                                                                        row.healthScore?.color === 'red' ? "text-red-500" : "text-blue-500"
                                                                        )}
                                                                    />
                                                                </svg>
                                                                <span className="absolute text-[10px] font-bold">{row.healthScore?.score}</span>
                                                            </div>
                                                            <Badge className={cn(
                                                                "text-[9px] px-1.5 py-0 min-w-[70px] justify-center uppercase font-black tracking-tighter shadow-sm",
                                                                row.healthScore?.color === 'emerald' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                                                                    row.healthScore?.color === 'emerald-light' ? "bg-emerald-500/80 hover:bg-emerald-600 text-white" :
                                                                        row.healthScore?.color === 'amber' ? "bg-amber-500 hover:bg-amber-600 text-white" :
                                                                            row.healthScore?.color === 'red' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 text-white"
                                                            )}>
                                                                {row.healthScore?.action}
                                                            </Badge>
                                                        </div>
                                                    </HoverCardTrigger>
                                                    <HoverCardContent side="left" className="w-[240px] p-3 space-y-3 shadow-2xl border-border/50 bg-popover text-popover-foreground z-50">
                                                        <TooltipProvider>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-2">Pilar de Saúde</p>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-[10px] max-w-[200px]">
                                                                            Pontuação final ponderada de 0-100 refletindo a saúde matemática geral do criativo.
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                    <p className="text-[10px] font-mono font-bold text-foreground">{row.healthScore?.score}/100</p>
                                                                </div>
                                                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                                    <div className={cn("h-full transition-all duration-1000",
                                                                        row.healthScore?.color === 'emerald' ? "bg-emerald-500" :
                                                                            row.healthScore?.color === 'emerald-light' ? "bg-emerald-400" :
                                                                                row.healthScore?.color === 'amber' ? "bg-amber-500" : "bg-red-500"
                                                                    )} style={{ width: `${row.healthScore?.score}%` }} />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {[
                                                                    {
                                                                        label: `Eficiência (${brl(row.cpl)})`,
                                                                        val: row.healthScore?.pillars?.efficiency,
                                                                        color: 'bg-emerald-500',
                                                                        desc: (row.healthScore as any)?.reasons?.efficiency || 'CPL vs Média da conta'
                                                                    },
                                                                    {
                                                                        label: (row.healthScore as any)?.reasons?.stabilityLabel || 'Atenção (—)',
                                                                        val: row.healthScore?.pillars?.stability,
                                                                        color: 'bg-blue-500',
                                                                        desc: (row.healthScore as any)?.reasons?.stability || 'Índice de atenção do criativo'
                                                                    },
                                                                    {
                                                                        label: row.frequency != null ? `Frequência (${row.frequency.toFixed(2)}x)` : 'Frequência (—)',
                                                                        val: row.healthScore?.pillars?.fatigue,
                                                                        color: 'bg-purple-500',
                                                                        desc: (row.healthScore as any)?.reasons?.fatigue || 'Saturação de público'
                                                                    },
                                                                    {
                                                                        label: `Volume (${row.conversoes || 0} conv.)`,
                                                                        val: row.healthScore?.pillars?.volume,
                                                                        color: 'bg-amber-500',
                                                                        desc: (row.healthScore as any)?.reasons?.volume || 'Conversões para confiança estatística'
                                                                    }
                                                                ].map((p, i) => (
                                                                    <Tooltip key={i}>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="space-y-1 cursor-help group/pill">
                                                                                <div className="flex justify-between text-[9px] uppercase font-medium">
                                                                                    <span className="group-hover/pill:text-foreground transition-colors">{p.label}</span>
                                                                                    <span>{p.val}%</span>
                                                                                </div>
                                                                                <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                                                                                    <div className={cn("h-full", p.color)} style={{ width: `${p.val}%` }} />
                                                                                </div>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="right" className="text-[10px] max-w-[220px]">
                                                                            {p.desc}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ))}
                                                            </div>

                                                            <div className="pt-2 border-t border-border/50">
                                                                <p className="text-[10px] leading-tight text-muted-foreground italic font-medium">
                                                                    <span className="text-foreground font-bold italic-none">Nota do Especialista: </span>
                                                                    {row.healthScore?.action === 'Escalar Agreste' ? "Oportunidade rara: alta correlação de queda e custo ultra-eficiente. Siga com +20%." :
                                                                        row.healthScore?.action === 'Pausar' ? "Hemorragia de investimento: CPL fora da meta com tendência de alta severa." :
                                                                            row.healthScore?.action === 'Aprendizado' ? "Aguardando 7 dias de dados para estabilizar a telemetria Andrômeda." :
                                                                                "Performance estável: manter vigilância e otimizar funil se o CPL subir."}
                                                                </p>
                                                            </div>
                                                        </TooltipProvider>
                                                    </HoverCardContent>
                                                </HoverCard>
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
                    avgCPL: kpis.avgCPL
                } : null}
            />
        </div>
    );
}
