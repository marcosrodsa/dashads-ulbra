import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, History, Video as VideoIcon, BarChart3, Wand2, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, Eye, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CreativeInsight {
    type: "success" | "warning" | "danger" | "tip";
    title: string;
    description: string;
}

interface CreativeAsset {
    title?: string;
    body?: string;
    image_url?: string;
    creative_type?: string;
    hook_rate?: number;
    hold_rate?: number;
}

interface HistoricalInsight {
    analyzed_at: string;
    llm_model: string;
    diagnostico?: string;
    insights?: CreativeInsight[];
    visual_description?: string; // NEW: Store per-event visual description
    // Contextual specific
    why_performs?: string;
    recommended_action?: string;
    is_contextual: boolean;
}

interface CreativeVector {
    visual_description: string;
    created_at: string;
}

// NEW: Contextual Analysis with performance KPIs
interface ContextualAnalysis {
    performance: {
        ctr: number;
        cpa: number | null; // Keep raw for API compatibility but label as CPL
        conversions: number;
        impressions: number;
        clicks: number;
        spend: number;
        trend: "improving" | "stable" | "declining";
    };
    analysis: {
        visual_description: string;
        why_performs: string;
        improvement_suggestions: string[];
        fatigue_risk: "low" | "medium" | "high";
        recommended_action: "scale" | "pause" | "iterate" | "test";
        confidence_score: number;
    };
    tokensUsed?: number;
}

interface InsightsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    creativeName: string | null;
    creativeId: string | null;
    campaignName?: string | null;
    metrics: {
        conversoes: number;
        cpl: number | null;
        ctr: number;
        investimento: number;
        avgCPL: number | null;
        predictedCpl?: number | null;
    } | null;
    onGenerate?: () => void;
}

interface GenerationResult {
    insights: CreativeInsight[];
    visualDescription?: string;
    debug?: any;
}

// Helper for Brazil/Sao Paulo timezone formatting
function formatDateBR(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    try {
        const safeDateStr = (dateStr.endsWith('Z') || dateStr.includes('+')) ? dateStr : dateStr + 'Z';
        return new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(safeDateStr));
    } catch (e) {
        return "-";
    }
}

// Fetch Historical Insights (Unified)
async function fetchHistory(adId: string): Promise<HistoricalInsight[]> {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        // 1. Fetch Quick Insights
        const { data: quickData, error: quickError } = await supabase
            .from("fact_creative_insights")
            .select("analyzed_at, llm_model, diagnostico, visual_description")
            .eq("ad_id", adId)
            .order("analyzed_at", { ascending: false })
            .limit(10);

        // 2. Fetch Contextual Insights
        const { data: contextData, error: contextError } = await supabase
            .from("creative_contextual_insights")
            .select("analyzed_at, llm_model, why_performs, recommended_action, visual_description")
            .eq("ad_id", adId)
            .order("analyzed_at", { ascending: false })
            .limit(10);

        const history: HistoricalInsight[] = [];

        if (!quickError && quickData) {
            quickData.forEach(item => {
                let insights: CreativeInsight[] = [];
                try {
                    // Try to parse the diagnostico if it's a JSON string of insights
                    if (item.diagnostico.startsWith('[') || item.diagnostico.startsWith('{')) {
                        const parsed = JSON.parse(item.diagnostico);
                        insights = Array.isArray(parsed) ? parsed : (parsed.insights || []);
                    } else {
                        const jsonMatch = item.diagnostico.match(/\[[\s\S]*\]/);
                        if (jsonMatch) insights = JSON.parse(jsonMatch[0]);
                    }
                } catch (e) { }

                history.push({
                    analyzed_at: item.analyzed_at,
                    llm_model: item.llm_model,
                    diagnostico: item.diagnostico,
                    visual_description: item.visual_description,
                    insights,
                    is_contextual: false
                });
            });
        }

        if (!contextError && contextData) {
            contextData.forEach(item => {
                history.push({
                    analyzed_at: item.analyzed_at,
                    llm_model: item.llm_model,
                    why_performs: item.why_performs,
                    visual_description: item.visual_description,
                    recommended_action: item.recommended_action,
                    is_contextual: true
                });
            });
        }

        // Sort combined history by date descending (ensure strict descending order)
        const sortedHistory = [...history].sort((a, b) => {
            const parseDate = (d: string | null | undefined) => {
                if (!d) return 0;
                const safe = (d.endsWith('Z') || d.includes('+')) ? d : d + 'Z';
                return new Date(safe).getTime();
            };
            return parseDate(b.analyzed_at) - parseDate(a.analyzed_at);
        });

        return sortedHistory.slice(0, 15);
    } catch (e) {
        console.error("fetchHistory error:", e);
        return [];
    }
}

// Fetch Creative Assets (Miniatura/Copy) from Cache
async function fetchCreativeAssets(adId: string): Promise<CreativeAsset | null> {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from("fact_creative_assets")
            .select("title, body, image_url, creative_type, hook_rate, hold_rate")
            .eq("ad_id", adId)
            .maybeSingle();

        if (error) return null;
        return data as CreativeAsset;
    } catch (e) {
        return null;
    }
}

// Fetch Creative Vision (Detailed AI Diagnosis)
async function fetchCreativeVision(adId: string): Promise<CreativeVector | null> {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from("fact_creative_vectors")
            .select("visual_description, created_at")
            .eq("ad_id", adId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) return null;
        return data as CreativeVector;
    } catch (e) {
        return null;
    }
}

// NEW: Call Edge Function for contextual analysis with performance KPIs
async function generateContextualInsights(
    creativeId: string,
    periodStart?: string,
    periodEnd?: string
): Promise<ContextualAnalysis | null> {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn("Supabase client not available");
            return null;
        }

        const { data, error } = await supabase.functions.invoke("gaia-contextual-analysis", {
            body: {
                creativeId,
                periodStart,
                periodEnd
            }
        });

        if (error || !data || data.error) {
            console.error("Contextual Analysis Error:", error || data?.error);
            return null;
        }

        return {
            performance: data.performance,
            analysis: data.analysis,
            tokensUsed: data.tokensUsed
        };
    } catch (e) {
        console.error("Exception invoking Contextual Analysis:", e);
        return null;
    }
}

// Call Edge Function to generate insights with Gemini
async function generateInsights(
    creativeName: string,
    creativeId: string,
    metrics: {
        conversoes: number;
        cpl: number | null;
        ctr: number;
        investimento: number;
        avgCPL: number | null;
        imageUrl?: string;
        title?: string;
        body?: string;
    }
): Promise<GenerationResult> {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn("Supabase client not available");
            throw new Error("Supabase not configured");
        }

        const { data, error } = await supabase.functions.invoke("analyze-creative", {
            body: {
                metrics: {
                    creativeName,
                    creativeId,
                    ...metrics
                }
            }
        });

        if (error || !data || data.error) {
            console.error("Gaia Error details:", error || data?.error);
            // Fallback to mock insights but log for debugging
            return {
                insights: generateMockInsights(metrics.cpl, metrics.avgCPL, metrics.conversoes, metrics.ctr),
                debug: data?.debug || { msg: error?.message || "Unknown error" }
            };
        }

        return {
            insights: data.insights || [],
            visualDescription: data.visualDescription || "",
            debug: data.debug || null
        };
    } catch (e) {
        console.error("Exception invoking Gaia:", e);
        return {
            insights: generateMockInsights(metrics.cpl, metrics.avgCPL, metrics.conversoes, metrics.ctr),
            debug: { msg: e.message }
        };
    }
}

// Fallback mock function
function generateMockInsights(
    cpl: number | null,
    avgCPL: number | null,
    conversoes: number,
    ctr: number
): CreativeInsight[] {
    const insights: CreativeInsight[] = [];
    const cplRatio = cpl && avgCPL ? cpl / avgCPL : 1;

    if (cplRatio < 0.7) {
        insights.push({
            type: "success",
            title: "Excelente Performance de CPL",
            description: `CPL ${((1 - cplRatio) * 100).toFixed(0)}% abaixo da média. Considere aumentar investimento.`
        });
    } else if (cplRatio > 1.3) {
        insights.push({
            type: "danger",
            title: "CPL Crítico - Sinais de Fadiga",
            description: `CPL ${((cplRatio - 1) * 100).toFixed(0)}% acima da média. Considere pausar ou renovar.`
        });
    }

    if (ctr < 0.5) {
        insights.push({
            type: "warning",
            title: "CTR Baixo",
            description: "CTR abaixo de 0.5%. Teste novas imagens ou headlines."
        });
    } else if (ctr > 2) {
        insights.push({
            type: "success",
            title: "CTR Excepcional",
            description: `CTR de ${ctr.toFixed(2)}% indica alta atratividade.`
        });
    }

    insights.push({
        type: "tip",
        title: "IA Indisponível",
        description: "Usando análise básica. Deploy a Edge Function para insights avançados com Gemini."
    });

    return insights;
}

function getInsightIcon(type: CreativeInsight["type"]) {
    switch (type) {
        case "success": return <CheckCircle className="h-5 w-5 text-emerald-500" />;
        case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        case "danger": return <TrendingDown className="h-5 w-5 text-rose-500" />;
        case "tip": return <Lightbulb className="h-5 w-5 text-blue-500" />;
    }
}

function getInsightBadge(type: CreativeInsight["type"]) {
    switch (type) {
        case "success": return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Positivo</Badge>;
        case "warning": return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Alerta</Badge>;
        case "danger": return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">Crítico</Badge>;
        case "tip": return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Dica</Badge>;
    }
}

export function CreativeInsightsModal({
    open,
    onOpenChange,
    creativeName,
    creativeId,
    campaignName,
    metrics,
    onGenerate
}: InsightsModalProps) {
    const [insights, setInsights] = React.useState<CreativeInsight[]>([]);
    const [visualDescription, setVisualDescription] = React.useState<string>("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasGenerated, setHasGenerated] = React.useState(false);
    const [debugInfo, setDebugInfo] = React.useState<any>(null);
    const [assets, setAssets] = React.useState<CreativeAsset | null>(null);
    const [history, setHistory] = React.useState<HistoricalInsight[]>([]);
    const [activeTab, setActiveTab] = React.useState<string>("analysis");
    // NEW: Contextual analysis state
    const [contextualAnalysis, setContextualAnalysis] = React.useState<ContextualAnalysis | null>(null);
    const [isContextualLoading, setIsContextualLoading] = React.useState(false);

    React.useEffect(() => {
        if (open && creativeId) {
            handleInitialFetch();
        } else if (!open) {
            setInsights([]);
            setHasGenerated(false);
            setAssets(null);
            setHistory([]);
            setActiveTab("analysis");
            setContextualAnalysis(null);
        }
    }, [open, creativeId]);

    const handleInitialFetch = async () => {
        if (!creativeId) return;
        const [enriched, hist] = await Promise.all([
            fetchCreativeAssets(creativeId),
            fetchHistory(creativeId)
        ]);
        setAssets(enriched);
        setHistory(hist);
    };

    const handleGenerate = async () => {
        if (!metrics || !creativeName || !creativeId) return;

        setIsLoading(true);
        setDebugInfo(null);
        try {
            const { insights: results, visualDescription: visDesc, debug } = await generateInsights(creativeName, creativeId, {
                ...metrics,
                imageUrl: assets?.image_url,
                title: assets?.title,
                body: assets?.body
            });
            setInsights(results);
            setVisualDescription(visDesc || "");
            setDebugInfo(debug);
            onGenerate?.();

            // Refresh history
            const updatedHistory = await fetchHistory(creativeId);
            setHistory(updatedHistory);
            setHasGenerated(true);
        } catch (error) {
            console.error("Error generating insights:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Handle contextual analysis generation
    const handleContextualGenerate = async () => {
        if (!creativeId) return;

        setIsContextualLoading(true);
        try {
            const result = await generateContextualInsights(creativeId);
            setContextualAnalysis(result);

            // Refresh history
            const updatedHistory = await fetchHistory(creativeId);
            setHistory(updatedHistory);
        } catch (error) {
            console.error("Error generating contextual analysis:", error);
        } finally {
            setIsContextualLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-y-auto p-4 md:p-6">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <DialogTitle className="text-xl">
                            Análise IA: {creativeName || "Criativo"}
                        </DialogTitle>
                    </div>
                    {campaignName && (
                        <div className="text-xs text-muted-foreground font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit italic">
                            Campanha: {campaignName}
                        </div>
                    )}
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Insights gerados pela Gaia (@creative-analyst-ai) para otimização de performance.
                    </DialogDescription>
                </DialogHeader>

                {assets && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 md:p-4 border rounded-lg bg-slate-50/50">
                        {assets.image_url && (
                            <div className="md:col-span-1 rounded-md overflow-hidden h-40 md:h-full bg-slate-200">
                                <img src={assets.image_url} alt="Creative Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className={assets.image_url ? "md:col-span-2 space-y-2" : "md:col-span-3 space-y-2"}>
                            {assets.title && <p className="text-sm font-semibold text-slate-900 leading-tight">{assets.title}</p>}
                            {assets.body && <p className="text-xs text-slate-600 line-clamp-4">{assets.body}</p>}
                            <Badge variant="outline" className="text-[10px] uppercase">
                                {assets.creative_type || "AD ASSET"}
                            </Badge>
                        </div>
                    </div>
                )}

                <div className="space-y-4 mt-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50">
                            <TabsTrigger value="analysis" className="gap-2 py-2 text-xs md:text-sm px-1 md:px-3">
                                <Sparkles className="h-4 w-4 shrink-0" /> <span className="truncate">Análise Gaia</span>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="gap-2 py-2 text-xs md:text-sm px-1 md:px-3">
                                <History className="h-4 w-4 shrink-0" /> <span className="truncate">Histórico ({history.length})</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="analysis" className="space-y-4 mt-4">
                            {assets && assets.creative_type === "VIDEO" && (assets.hook_rate || assets.hold_rate) && (
                                <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">Hook Rate (3s)</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold">{assets.hook_rate?.toFixed(1)}%</span>
                                            <span className="text-[10px] text-muted-foreground">ideal &gt; 25%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">Hold Rate (100%)</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold">{assets.hold_rate?.toFixed(1)}%</span>
                                            <span className="text-[10px] text-muted-foreground">ideal &gt; 15%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!hasGenerated && !isLoading && (
                                <div className="text-center py-8">
                                    <Sparkles className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Pronto para analisar?</h3>
                                    <p className="text-muted-foreground mb-4 text-sm">
                                        Escolha o tipo de análise que deseja realizar.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <Button onClick={handleGenerate} variant="outline" className="gap-2">
                                            <Wand2 className="h-4 w-4" />
                                            Análise Rápida
                                        </Button>
                                        <Button onClick={handleContextualGenerate} className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                                            <BarChart3 className="h-4 w-4" />
                                            Análise Contextualizada (KPIs)
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-3">
                                        A análise contextualizada usa dados de performance dos últimos 30 dias.
                                    </p>
                                </div>
                            )}

                            {isLoading && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>Gaia está analisando os dados...</span>
                                    </div>
                                    {[1, 2].map((i) => (
                                        <div key={i} className="border rounded-lg p-4 space-y-2">
                                            <Skeleton className="h-5 w-1/3" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* NEW: Contextual Analysis Loading */}
                            {isContextualLoading && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-purple-600">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>Gaia está analisando com contexto de performance...</span>
                                    </div>
                                    <div className="border-2 border-purple-200 rounded-lg p-4 space-y-3 bg-purple-50/50">
                                        <Skeleton className="h-6 w-1/2" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                </div>
                            )}

                            {/* NEW: Contextual Analysis Result */}
                            {contextualAnalysis && !isContextualLoading && (
                                <div className="space-y-4">
                                    {/* Performance Context */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                                        <div className="text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">Impressões</p>
                                            <p className="text-lg font-bold">{contextualAnalysis.performance.impressions.toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">CTR</p>
                                            <p className="text-lg font-bold">{contextualAnalysis.performance.ctr}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">Conversões</p>
                                            <p className="text-lg font-bold">{contextualAnalysis.performance.conversions}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase">CPL Atual</p>
                                            <p className="text-lg font-bold">
                                                {metrics?.cpl ? `R$ ${metrics.cpl.toFixed(2)}` : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                                                CPL Projetado
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 cursor-help text-purple-400" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-[200px] p-2 text-[11px]">
                                                            <p>Estimativa do CPL para amanhã baseada na <strong>regressão linear</strong> dos últimos 14 dias.</p>
                                                            <p className="mt-1 text-muted-foreground italic text-[10px]"><strong>O que é regressão:</strong> Uma técnica que encontra padrões no passado para traçar uma "linha de tendência" e projetar o futuro.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </p>
                                            <p className="text-lg font-bold">
                                                {metrics?.predictedCpl ? `R$ ${metrics.predictedCpl.toFixed(2)}` : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Recommended Action Banner */}
                                    <div className={`p-4 rounded-lg border-2 ${contextualAnalysis.analysis.recommended_action === 'scale'
                                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                        : contextualAnalysis.analysis.recommended_action === 'pause'
                                            ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
                                            : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Ação Recomendada</span>
                                            <Badge className={
                                                contextualAnalysis.analysis.recommended_action === 'scale'
                                                    ? 'bg-emerald-500'
                                                    : contextualAnalysis.analysis.recommended_action === 'pause'
                                                        ? 'bg-rose-500'
                                                        : 'bg-amber-500'
                                            }>
                                                {contextualAnalysis.analysis.recommended_action === 'scale' && '📈 ESCALAR'}
                                                {contextualAnalysis.analysis.recommended_action === 'pause' && '⏸️ PAUSAR'}
                                                {contextualAnalysis.analysis.recommended_action === 'iterate' && '🔄 ITERAR'}
                                                {contextualAnalysis.analysis.recommended_action === 'test' && '🧪 TESTAR'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1">
                                                    Tendência:
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-3 w-3 cursor-help text-slate-400" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-[200px] p-2 text-[11px]">
                                                                <p>A <strong>tendência</strong> é calculada encontrando um padrão matemático (proxy de regressão linear) nos últimos dados para saber se o desempenho está subindo ou descendo.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </span>
                                                {contextualAnalysis.performance.trend === 'improving' && <span className="text-emerald-600 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Melhorando</span>}
                                                {contextualAnalysis.performance.trend === 'declining' && <span className="text-rose-600 flex items-center gap-1"><TrendingDown className="h-4 w-4" /> Caindo</span>}
                                                {contextualAnalysis.performance.trend === 'stable' && <span className="text-amber-600">➡️ Estável</span>}
                                            </div>
                                            {contextualAnalysis.analysis.confidence_score && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <span>Confiança:</span>
                                                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${contextualAnalysis.analysis.confidence_score >= 0.8 ? 'bg-emerald-500' :
                                                                contextualAnalysis.analysis.confidence_score >= 0.6 ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`}
                                                            style={{ width: `${contextualAnalysis.analysis.confidence_score * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-mono">{Math.round(contextualAnalysis.analysis.confidence_score * 100)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Why It Performs */}
                                    <div className="border rounded-lg p-4 space-y-2 bg-slate-50/30">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-5 w-5 text-purple-500" />
                                            <h4 className="font-semibold italic">Visão Gaia: O que vemos aqui?</h4>
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 pl-7 border-l-2 border-purple-200 ml-2">
                                            {contextualAnalysis.analysis.visual_description}
                                        </p>
                                    </div>

                                    <div className="border rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 text-purple-500" />
                                            <h4 className="font-semibold">Por que este criativo performa assim?</h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground pl-7">
                                            {contextualAnalysis.analysis.why_performs}
                                        </p>
                                    </div>

                                    {/* Improvement Suggestions */}
                                    {contextualAnalysis.analysis.improvement_suggestions.length > 0 && (
                                        <div className="border rounded-lg p-4 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-blue-500" />
                                                <h4 className="font-semibold">Sugestões de Melhoria</h4>
                                            </div>
                                            <ul className="space-y-1 pl-7">
                                                {contextualAnalysis.analysis.improvement_suggestions.map((suggestion, idx) => (
                                                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                                        <span className="text-purple-500">•</span>
                                                        {suggestion}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2">
                                        <span>Análise contextualizada com dados dos últimos 30 dias</span>
                                        <button
                                            onClick={handleContextualGenerate}
                                            disabled={isContextualLoading}
                                            className="flex items-center gap-1 hover:text-purple-500 transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${isContextualLoading ? "animate-spin" : ""}`} />
                                            Regerar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {hasGenerated && !isLoading && (
                                <>
                                    {/* Visual Description (Quick) */}
                                    {visualDescription && (
                                        <div className="border rounded-lg p-4 space-y-2 bg-slate-50/30">
                                            <div className="flex items-center gap-2">
                                                <Eye className="h-5 w-5 text-purple-500" />
                                                <h4 className="font-semibold italic font-serif">Análise Visual</h4>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 pl-7 border-l-2 border-purple-200 ml-2 leading-relaxed">
                                                {visualDescription}
                                            </p>
                                        </div>
                                    )}

                                    {insights.map((insight, index) => (
                                        <div key={index} className="border rounded-lg p-4 space-y-2 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getInsightIcon(insight.type)}
                                                    <h4 className="font-semibold">{insight.title}</h4>
                                                </div>
                                                {getInsightBadge(insight.type)}
                                            </div>
                                            <p className="text-sm text-muted-foreground pl-7">
                                                {insight.description}
                                            </p>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2">
                                        <span>Sugestões automáticas baseadas em padrões de performance.</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isLoading}
                                                className="flex items-center gap-1 hover:text-purple-500 transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                                                Regerar
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </TabsContent>



                        <TabsContent value="history" className="space-y-4 mt-4">
                            {history.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <History className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-muted-foreground">Nenhuma análise anterior encontrada.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {history.map((item, i) => (
                                        <div key={i} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[10px]">
                                                    {formatDateBR(item.analyzed_at)}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.llm_model}</span>
                                            </div>
                                            <div className="space-y-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                                                {/* Visual Description in History */}
                                                {item.visual_description && (
                                                    <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded text-xs text-slate-600 dark:text-slate-400 border-l-2 border-purple-300">
                                                        <div className="flex items-center gap-1 mb-1 font-semibold text-purple-600">
                                                            <Eye className="h-3 w-3" /> Gaia Vision
                                                        </div>
                                                        <p className="italic text-slate-700 dark:text-slate-300 leading-relaxed">
                                                            "{item.visual_description}"
                                                        </p>
                                                    </div>
                                                )}

                                                {item.is_contextual ? (
                                                    <div className="text-sm">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Análise Contextual</Badge>
                                                            {item.recommended_action && (
                                                                <Badge className="text-[10px] uppercase">{item.recommended_action}</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-muted-foreground leading-relaxed">{item.why_performs}</p>
                                                    </div>
                                                ) : (
                                                    item.insights?.map((ins, idx) => (
                                                        <div key={idx} className="text-sm border-b border-slate-50 last:border-0 pb-1 mb-1">
                                                            <span className="font-medium inline-flex items-center gap-1">
                                                                {getInsightIcon(ins.type)} {ins.title}:
                                                            </span>
                                                            <span className="text-muted-foreground ml-1">{ins.description}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
