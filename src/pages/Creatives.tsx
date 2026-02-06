import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sparkles, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, Users, Image, Video, LayoutGrid, RefreshCw, CalendarIcon, Info, ArrowUpDown, ArrowUp, ArrowDown, Wand2, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CplEvolutionChart } from "@/components/performance/PerformanceCharts";
import { CreativeCPLHeatmap } from "@/components/creatives/CreativeCPLHeatmap";
import { Switch } from "@/components/ui/switch";
import { CreativeInsightsModal } from "@/components/creatives/CreativeInsightsModal";

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
    preview_shareable_link: string | null;
    effective_status: string | null;
    has_assets: boolean;
    has_insights: boolean;
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

    // Filters
    const [period, setPeriod] = React.useState<string>("30");
    const [customRange, setCustomRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    });
    const [unidade, setUnidade] = React.useState<string>("all");
    const [curso, setCurso] = React.useState<string>("all");
    const [sortBy, setSortBy] = React.useState<string>("conversoes");
    const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

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



    // Calculate date range
    const dateRange = React.useMemo(() => {
        if (period === "custom" && customRange.from && customRange.to) {
            return { start: customRange.from, end: customRange.to };
        }
        const end = new Date();
        const start = subDays(end, parseInt(period) || 30);
        return { start, end };
    }, [period, customRange]);

    // Fetch creatives
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["creatives", period, customRange.from?.toISOString(), customRange.to?.toISOString(), unidade, curso],
        queryFn: async () => {
            let query = supabase
                .from("vw_creative_analysis_complete")
                .select("*")
                .gte("data_referencia", format(dateRange.start, "yyyy-MM-dd"))
                .lte("data_referencia", format(dateRange.end, "yyyy-MM-dd"))
                .order("conversoes", { ascending: false });

            if (unidade !== "all") {
                query = query.eq("unidade", unidade);
            }
            if (curso !== "all") {
                query = query.eq("curso", curso);
            }

            const { data, error } = await query.limit(100);
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

    // Aggregate KPIs
    const kpis: KPIs = React.useMemo(() => {
        if (!data || data.length === 0) {
            return { totalCreatives: 0, totalConversions: 0, avgCPL: null, avgCTR: 0, totalSpend: 0 };
        }

        const uniqueAds = new Set(data.map((r) => r.ad_id)).size;
        const totalConversions = data.reduce((acc, r) => acc + (r.conversoes || 0), 0);
        const totalSpend = data.reduce((acc, r) => acc + (r.investimento || 0), 0);
        const avgCPL = totalConversions > 0 ? totalSpend / totalConversions : null;
        const totalImpressions = data.reduce((acc, r) => acc + (r.impressoes || 0), 0);
        const totalClicks = data.reduce((acc, r) => acc + (r.cliques || 0), 0);
        const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        return { totalCreatives: uniqueAds, totalConversions, avgCPL, avgCTR, totalSpend };
    }, [data]);

    // Aggregate by ad_id for table (sum metrics across dates)
    const aggregatedData = React.useMemo(() => {
        if (!data) return [];

        const grouped = data.reduce((acc, row) => {
            if (!acc[row.ad_id]) {
                acc[row.ad_id] = {
                    ...row,
                    investimento: 0,
                    impressoes: 0,
                    cliques: 0,
                    conversoes: 0,
                    // Initialize these to null if they might not be present in the first row
                    // or to ensure they are picked up correctly by the OR logic below.
                    // The spread `...row` already handles initial values if present.
                    // We just need to ensure the OR logic works for subsequent rows.
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

        return Object.values(grouped)
            .map((r) => ({
                ...r,
                ctr: r.impressoes > 0 ? (r.cliques / r.impressoes) * 100 : 0,
                cpl: r.conversoes > 0 ? r.investimento / r.conversoes : null,
            }))
            .sort((a, b) => {
                const getValue = (row: any) => {
                    switch (sortBy) {
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
                        default: return row.conversoes || 0;
                    }
                };
                const aVal = getValue(a);
                const bVal = getValue(b);

                if (typeof aVal === "string") {
                    return sortDir === "asc"
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            })
            .slice(0, 50);
    }, [data, sortBy, sortDir]);



    // Daily aggregation for evolution chart
    const evolutionData = React.useMemo(() => {
        if (!data) return [];

        const byDate = data.reduce((acc, row) => {
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
    }, [data]);

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
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Últimos 7 dias</SelectItem>
                        <SelectItem value="30">Últimos 30 dias</SelectItem>
                        <SelectItem value="90">Últimos 90 dias</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                </Select>

                {period === "custom" && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {customRange.from ? (
                                    customRange.to ? (
                                        <>{format(customRange.from, "dd/MM/yy", { locale: ptBR })} - {format(customRange.to, "dd/MM/yy", { locale: ptBR })}</>
                                    ) : (
                                        format(customRange.from, "dd/MM/yyyy", { locale: ptBR })
                                    )
                                ) : (
                                    <span>Selecione o período</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                selected={{ from: customRange.from, to: customRange.to }}
                                onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
                                numberOfMonths={2}
                                locale={ptBR}
                            />
                        </PopoverContent>
                    </Popover>
                )}

                <Select value={unidade} onValueChange={setUnidade}>
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

                <Select value={curso} onValueChange={setCurso}>
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

            {/* Evolution Chart */}
            {!isLoading && evolutionData.length > 0 && (
                <div className="grid gap-4 md:grid-cols-1">
                    <CplEvolutionChart data={evolutionData} />
                </div>
            )}



            {/* CPL Heatmap */}
            {!isLoading && aggregatedData.length > 0 && (
                <CreativeCPLHeatmap data={aggregatedData} avgCPL={kpis.avgCPL} />
            )}

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 50 Criativos por Conversões</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>

                                    <TableHead className="min-w-[300px]">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                className="flex items-center hover:text-foreground transition-colors"
                                                onClick={() => toggleSort("ad_name")}
                                            >
                                                Criativo {getSortIcon("ad_name")}
                                            </button>
                                        </div>
                                    </TableHead>
                                    <TableHead className="min-w-[200px]">
                                        <button
                                            className="flex items-center hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("campaign_name")}
                                        >
                                            Campanha {getSortIcon("campaign_name")}
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("unidade")}
                                        >
                                            Unidade {getSortIcon("unidade")}
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <button
                                            className="flex items-center hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("curso")}
                                        >
                                            Curso {getSortIcon("curso")}
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <button
                                            className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("impressoes")}
                                        >
                                            Impressões {getSortIcon("impressoes")}
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <button
                                            className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("cliques")}
                                        >
                                            Cliques {getSortIcon("cliques")}
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <button
                                            className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("ctr")}
                                        >
                                            CTR {getSortIcon("ctr")}
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <button
                                            className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("conversoes")}
                                        >
                                            Conversões {getSortIcon("conversoes")}
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <button
                                            className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("cpl")}
                                        >
                                            CPL {getSortIcon("cpl")}
                                        </button>
                                    </TableHead>
                                    <TableHead className="text-right">
                                        <button
                                            className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("investimento")}
                                        >
                                            Investimento {getSortIcon("investimento")}
                                        </button>
                                    </TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1.5">
                                            Análise IA
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[280px]">
                                                    <div className="text-xs space-y-1">
                                                        <p><strong>🔴 Fadiga:</strong> CPL 30% acima da média — criativo perdendo eficiência.</p>
                                                        <p><strong>🟢 Top:</strong> CPL 30% abaixo da média — excelente performance.</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[50px] text-center">IA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aggregatedData.map((row) => (
                                    <TableRow key={row.ad_id}>

                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative h-10 w-10 flex-shrink-0 group/zoom z-0 hover:z-[100]">
                                                    <div className="absolute inset-0 h-10 w-10 rounded bg-slate-100 overflow-hidden border flex items-center justify-center transition-all duration-300 origin-left group-hover/zoom:scale-[8] group-hover/zoom:translate-x-12 group-hover/zoom:shadow-2xl group-hover/zoom:rounded-sm cursor-zoom-in bg-white dark:bg-slate-800 pointer-events-auto">
                                                        {row.image_url ? (
                                                            <img
                                                                src={row.image_url}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = "";
                                                                    (e.target as HTMLImageElement).style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            getCreativeIcon(row.creative_type)
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm line-clamp-2">
                                                            {row.ad_name || `Anúncio: ${row.ad_id}`}
                                                        </span>
                                                        {row.preview_shareable_link && (
                                                            <a
                                                                href={row.preview_shareable_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-muted-foreground hover:text-purple-500 transition-colors"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {row.effective_status && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex items-center cursor-default">
                                                                        <div
                                                                            className={`relative h-[12px] w-[24px] rounded-full transition-colors duration-200 ${row.effective_status === 'ACTIVE'
                                                                                ? 'bg-[#0081C9]'
                                                                                : 'bg-[#E9EBEE] border border-[#BEC3C9]'
                                                                                }`}
                                                                        >
                                                                            <div
                                                                                className={`absolute top-1/2 -translate-y-1/2 h-[8px] w-[8px] rounded-full transition-all duration-200 ${row.effective_status === 'ACTIVE'
                                                                                    ? 'right-[2px] bg-white'
                                                                                    : 'left-[2px] bg-[#4B4F56]'
                                                                                    }`}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right">
                                                                    <p className="text-[10px] uppercase font-bold">{row.effective_status}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                            ID: {row.ad_id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[250px]">
                                            <span className="block truncate text-muted-foreground text-sm" title={row.campaign_name || undefined}>
                                                {row.campaign_name}
                                            </span>
                                        </TableCell>
                                        <TableCell>{row.unidade}</TableCell>
                                        <TableCell>{row.curso}</TableCell>
                                        <TableCell className="text-right">{row.impressoes?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{row.cliques?.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{pct(row.ctr)}</TableCell>
                                        <TableCell className="text-right font-bold">{row.conversoes}</TableCell>
                                        <TableCell className="text-right">{brl(row.cpl)}</TableCell>
                                        <TableCell className="text-right">{brl(row.investimento)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {/* Fatigue Indicator */}
                                                {row.cpl && kpis.avgCPL && row.cpl > kpis.avgCPL * 1.3 && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        <TrendingDown className="h-3 w-3 mr-1" />
                                                        Fadiga
                                                    </Badge>
                                                )}
                                                {/* High Performance Indicator */}
                                                {row.cpl && kpis.avgCPL && row.cpl < kpis.avgCPL * 0.7 && (
                                                    <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600">
                                                        <TrendingUp className="h-3 w-3 mr-1" />
                                                        Top
                                                    </Badge>
                                                )}
                                                {row.has_assets && (
                                                    <Badge variant="outline" className="text-xs">Enriquecido</Badge>
                                                )}
                                                {row.has_insights && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                        IA
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => openInsightsModal(row)}
                                                        className="p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                                                    >
                                                        <Wand2 className="h-4 w-4 text-purple-500" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">Analisar com IA</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* AI Insights Modal */}
            <CreativeInsightsModal
                open={insightsModal.open}
                onOpenChange={(open) => setInsightsModal({ ...insightsModal, open })}
                creativeName={insightsModal.creative?.ad_name || insightsModal.creative?.ad_id || null}
                creativeId={insightsModal.creative?.ad_id || null}
                metrics={insightsModal.creative ? {
                    conversoes: insightsModal.creative.conversoes,
                    cpl: insightsModal.creative.cpl,
                    ctr: insightsModal.creative.ctr,
                    investimento: insightsModal.creative.investimento,
                    avgCPL: kpis.avgCPL
                } : null}
                onGenerate={() => {
                    // Future: Save insights to database
                    console.log("Insights generated for:", insightsModal.creative?.ad_id);
                }}
            />
        </div>
    );
}
