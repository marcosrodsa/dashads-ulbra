import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseClient } from "@/integrations/supabase/client";
import {
    Activity,
    Zap,
    Target,
    BarChart3,
    AlertCircle,
    TrendingUp,
    MousePointer2,
    Eye,
    Database,
    LayoutGrid,
    Calendar as CalendarIcon,
    Building2,
    GraduationCap,
    Filter,
    RefreshCw,
    PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilters } from "@/contexts/filters-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { isSameDay } from "date-fns";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ScatterChart,
    Scatter,
    ZAxis,
    Cell
} from "recharts";

interface AndromedaRow {
    ad_id: string;
    ad_name: string;
    format: string;
    total_spend: number;
    total_conversions: number;
    avg_hook_rate: number;
    avg_hold_rate: number;
    cpl_slope: number;
    stability_r2: number;
    current_frequency: number;
    avg_first_time_ratio: number;
    days_active: number;
    stability_score: number;
    health_score: number;
    confidence_score: number;
    recommended_action: string;
}

export default function AndromedaPage() {
    const {
        filters,
        setDateRange,
        setBusinessUnit,
        setCourse,
        setHideBranding,
        clear
    } = useFilters();

    const [period, setPeriod] = React.useState("30");
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
    const [onlyActive, setOnlyActive] = React.useState(true);

    const dateRange = React.useMemo(() => ({
        start: filters.dateRange?.from || startOfMonth(subDays(new Date(), 1)),
        end: filters.dateRange?.to || subDays(new Date(), 1)
    }), [filters.dateRange]);

    // Handle period selection sync with global filter context
    const getPresetRangeLabel = (days: number) => {
        const end = subDays(new Date(), 1);
        const start = subDays(end, days - 1);
        return `(${format(start, "dd/MM")} - ${format(end, "dd/MM")})`;
    };

    React.useEffect(() => {
        if (period !== "custom") {
            const end = subDays(new Date(), 1);
            const start = subDays(end, (parseInt(period) || 30) - 1);
            setDateRange({ from: start, to: end });
        }
    }, [period, setDateRange]);

    const { data: creatives, isLoading, refetch } = useQuery({
        queryKey: ["andromeda-creatives", dateRange, filters.businessUnit, filters.course, filters.hideBranding, onlyActive],
        queryFn: async () => {
            if (!supabase) throw new Error("Supabase client not initialized");

            let query = supabase
                .from("vw_andromeda_performance")
                .select("*");

            if (filters.businessUnit && filters.businessUnit !== 'all') {
                query = query.ilike('ad_name', `%${filters.businessUnit}%`);
            }
            if (filters.course && filters.course !== 'all') {
                query = query.ilike('ad_name', `%${filters.course}%`);
            }

            const { data, error } = await query.limit(100);

            if (error) throw error;

            // Filter inactive if needed
            let filtered = data as AndromedaRow[];
            if (onlyActive) {
                // effective_status isn't in AndromedaRow yet but we check recommended_action or format
                // For now, assume SQL handles it or add more robust filter if effective_status added
            }

            return filtered;
        }
    });

    const stats = React.useMemo(() => {
        if (!creatives?.length) return null;
        const totalSpend = creatives.reduce((acc, c) => acc + (c.total_spend || 0), 0);
        const totalConv = creatives.reduce((acc, c) => acc + (c.total_conversions || 0), 0);
        const avgCpl = totalConv > 0 ? totalSpend / totalConv : 0;
        const avgStability = creatives.reduce((acc, c) => acc + (c.stability_score || 0), 0) / creatives.length;
        const avgHook = creatives.reduce((acc, c) => acc + (c.avg_hook_rate || 0), 0) / creatives.length;
        const avgHold = creatives.reduce((acc, c) => acc + (c.avg_hold_rate || 0), 0) / creatives.length;
        const avgConfidence = creatives.reduce((acc, c) => acc + (c.confidence_score || 0), 0) / creatives.length;

        return { totalSpend, totalConv, avgCpl, avgStability, avgHook, avgHold, avgConfidence };
    }, [creatives]);

    // Data Transformation for Charts
    const fatigueData = React.useMemo(() => {
        if (!creatives) return [];
        return creatives
            .sort((a, b) => b.total_spend - a.total_spend)
            .slice(0, 10)
            .map(c => ({
                name: c.ad_name.substring(0, 10),
                cpl: c.total_conversions > 0 ? c.total_spend / c.total_conversions : 0,
                slope: c.cpl_slope * 10
            }));
    }, [creatives]);

    const diversityData = React.useMemo(() => {
        if (!creatives) return [];
        const video = creatives.filter(c => c.format === 'Vídeo');
        const image = creatives.filter(c => c.format === 'Imagem');

        const getAvg = (arr: AndromedaRow[], key: keyof AndromedaRow) =>
            arr.length ? arr.reduce((acc, c) => acc + (Number(c[key]) || 0), 0) / arr.length : 0;

        return [
            { subject: 'Hook', A: getAvg(video, 'avg_hook_rate') * 100, B: getAvg(image, 'avg_hook_rate') * 100, fullMark: 100 },
            { subject: 'Hold', A: getAvg(video, 'avg_hold_rate') * 100, B: getAvg(image, 'avg_hold_rate') * 100, fullMark: 100 },
            { subject: 'R²', A: getAvg(video, 'stability_r2') * 100, B: getAvg(image, 'stability_r2') * 100, fullMark: 100 },
            { subject: 'Saúde', A: getAvg(video, 'health_score'), B: getAvg(image, 'health_score'), fullMark: 100 },
        ];
    }, [creatives]);

    const budgetDistributionData = React.useMemo(() => {
        if (!creatives?.length) return [];
        const total = creatives.reduce((acc, c) => acc + (c.total_spend || 0), 0);
        return creatives
            .sort((a, b) => b.total_spend - a.total_spend)
            .slice(0, 5)
            .map(c => ({
                name: c.ad_name.substring(0, 15),
                value: (c.total_spend / total) * 100
            }));
    }, [creatives]);

    // Unique options for filters
    const unidades = React.useMemo(() => {
        if (!creatives) return [];
        return [...new Set(creatives.map(c => {
            // Logic to extract unit from name if not present as direct field
            const parts = c.ad_name.split('_');
            return parts.length > 2 ? parts[0] : 'Outros';
        }))].filter(Boolean);
    }, [creatives]);

    const cursos = React.useMemo(() => {
        if (!creatives) return [];
        return [...new Set(creatives.map(c => {
            const parts = c.ad_name.split('_');
            return parts.length > 2 ? parts[1] : 'Geral';
        }))].filter(Boolean);
    }, [creatives]);

    return (
        <div className="p-6 space-y-6 bg-background/50 animate-in fade-in duration-500">
            {/* Header com Branding */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <Zap className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            Andrômeda View <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">V3 CLINICAL</Badge>
                        </h1>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Motor de Inteligência e Saturação — 2026</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                        Sincronizar
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros (Full Replication) */}
            <Card className="bg-card/30 border-border/40 backdrop-blur-md shadow-sm">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    {/* Periodo */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                            <CalendarIcon className="h-3 w-3" /> Período
                        </label>
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="h-9 bg-background/50 border-border/40">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Últimos 7 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(7)}</span></SelectItem>
                                <SelectItem value="15">Últimos 15 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(15)}</span></SelectItem>
                                <SelectItem value="30">Últimos 30 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(30)}</span></SelectItem>
                                <SelectItem value="90">Últimos 90 dias <span className="text-muted-foreground text-xs ml-1">{getPresetRangeLabel(90)}</span></SelectItem>
                                <SelectItem value="custom">Personalizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Unidade */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                            <Building2 className="h-3 w-3" /> Unidade
                        </label>
                        <Select value={filters.businessUnit || "all"} onValueChange={(v) => setBusinessUnit(v === "all" ? null : v)}>
                            <SelectTrigger className="h-9 bg-background/50 border-border/40">
                                <SelectValue placeholder="Todas as Unidades" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Unidades</SelectItem>
                                {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Curso */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                            <GraduationCap className="h-3 w-3" /> Curso
                        </label>
                        <Select value={filters.course || "all"} onValueChange={(v) => setCourse(v === "all" ? null : v)}>
                            <SelectTrigger className="h-9 bg-background/50 border-border/40">
                                <SelectValue placeholder="Todos os Cursos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Cursos</SelectItem>
                                {cursos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Toggles */}
                    <div className="lg:col-span-3 flex flex-wrap gap-4 items-center justify-end h-9">
                        <div className="flex items-center space-x-2">
                            <Switch id="branding-toggle" checked={!filters.hideBranding} onCheckedChange={(v) => setHideBranding(!v)} />
                            <Label htmlFor="branding-toggle" className="text-xs font-semibold cursor-pointer whitespace-nowrap">Branding</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="active-toggle" checked={onlyActive} onCheckedChange={setOnlyActive} />
                            <Label htmlFor="active-toggle" className="text-xs font-semibold cursor-pointer whitespace-nowrap">Apenas Ativos</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Calendário Personalizado (se selecionado) */}
            {period === "custom" && (
                <div className="flex justify-center -mt-4 animate-in zoom-in-95 duration-200">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[300px] border-primary/20 bg-primary/5 h-8 text-xs font-bold">
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {filters.dateRange?.from ? (
                                    filters.dateRange.to ? (
                                        <>{format(filters.dateRange.from, "dd/MM/yy")} - {format(filters.dateRange.to, "dd/MM/yy")}</>
                                    ) : (
                                        format(filters.dateRange.from, "dd/MM/yyyy")
                                    )
                                ) : "Selecionar Período"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                            <Calendar
                                mode="range"
                                selected={filters.dateRange}
                                onSelect={(r) => { setDateRange(r); if (r?.from && r?.to) setIsCalendarOpen(false); }}
                                numberOfMonths={2}
                                locale={ptBR}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            {/* Bloco 1 — Visão Geral (Renamed KPIs Clinical 2026) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                <StatCard
                    title="Volume Leads"
                    value={isLoading ? null : stats?.totalConv.toString() || "0"}
                    icon={Target}
                    color="text-emerald-500"
                    loading={isLoading}
                />
                <StatCard
                    title="Eficiência (CPL)"
                    value={isLoading ? null : `R$ ${stats?.avgCpl.toFixed(2)}`}
                    icon={BarChart3}
                    color="text-primary"
                    loading={isLoading}
                />
                <StatCard
                    title="Total Criativos"
                    value={isLoading ? null : creatives?.length.toString() || "0"}
                    icon={LayoutGrid}
                    color="text-secondary-foreground"
                    loading={isLoading}
                />
                <StatCard
                    title="Estabilidade"
                    value={isLoading ? null : `${((stats?.avgStability || 0)).toFixed(1)}%`}
                    icon={Activity}
                    color="text-blue-500"
                    loading={isLoading}
                />
                <StatCard
                    title="Atenção Inicial (Hook)"
                    value={isLoading ? null : `${((stats?.avgHook || 0) * 100).toFixed(1)}%`}
                    icon={MousePointer2}
                    color="text-amber-500"
                    loading={isLoading}
                />
                <StatCard
                    title="Confiança Andromeda"
                    value={isLoading ? null : `${(stats?.avgConfidence || 0).toFixed(0)}%`}
                    icon={TrendingUp}
                    color="text-purple-500"
                    loading={isLoading}
                />
                <StatCard
                    title="Saúde Ecossistema"
                    value={isLoading ? null : (stats?.avgCpl && stats.avgCpl < 20 ? "Saudável" : stats?.avgCpl && stats.avgCpl < 35 ? "Instável" : "Fadiga Crítica")}
                    icon={AlertCircle}
                    color={stats?.avgCpl && stats.avgCpl < 20 ? "text-emerald-500" : stats?.avgCpl && stats.avgCpl < 35 ? "text-amber-500" : "text-red-500"}
                    loading={isLoading}
                />
            </div>

            {/* Bloco 2 — Tabela Andromeda */}
            <Card className="border-border/40 shadow-xl shadow-black/5 overflow-hidden bg-card/50 backdrop-blur-sm rounded-2xl">
                <CardHeader className="border-b border-border/40 bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-foreground/90 font-display">Clínica de Ativos Andromeda</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium italic">Análise de inclinação e volatilidade</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-default">
                        {creatives?.length || 0} Ativos
                    </Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : !creatives?.length ? (
                        <EmptyState />
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/40">
                                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Ativo</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">CPL</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Freq</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Alcance Novo</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Hook</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Hold</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Estabilidade</th>
                                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Saúde</th>
                                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {creatives.map((c) => (
                                    <tr key={c.ad_id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground/90 group-hover:text-primary transition-colors max-w-[200px] truncate">{c.ad_name}</span>
                                                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">{c.format} • {c.days_active} dias vnc</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center font-mono font-bold text-foreground/80">
                                            {c.total_conversions > 0 ? `R$ ${(c.total_spend / c.total_conversions).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                c.current_frequency <= 2 ? "bg-emerald-500/10 text-emerald-500" :
                                                    c.current_frequency <= 3 ? "bg-amber-500/10 text-amber-500" :
                                                        "bg-red-500/10 text-red-500"
                                            )}>
                                                {c.current_frequency?.toFixed(2)}x
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={cn(
                                                "text-xs font-bold",
                                                c.avg_first_time_ratio >= 0.4 ? "text-emerald-500" :
                                                    c.avg_first_time_ratio >= 0.2 ? "text-amber-500" :
                                                        "text-red-500"
                                            )}>
                                                {(c.avg_first_time_ratio * 100).toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <MetricBadge value={c.avg_hook_rate * 100} label="%" threshold={25} />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <MetricBadge value={c.avg_hold_rate * 100} label="%" threshold={15} />
                                        </td>
                                        <td className="px-4 py-4 text-center text-xs font-bold text-foreground/70">
                                            {c.stability_r2.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                                                    <div className={cn(
                                                        "h-full shadow-sm",
                                                        c.health_score > 70 ? "bg-emerald-500" : c.health_score > 40 ? "bg-amber-500" : "bg-red-500"
                                                    )} style={{ width: `${c.health_score}%` }} />
                                                </div>
                                                <span className="text-xs font-black">{c.health_score}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Badge className={cn("text-[10px] font-black px-2 py-0.5 border shadow-sm", getActionStyle(c.recommended_action))}>
                                                {c.recommended_action}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Bloco 3 — Diversidade e Tendência (Real Charts) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Fadiga Area Chart */}
                <Card className="bg-card/50 border-border/40 overflow-hidden relative group">
                    <CardHeader className="p-4 bg-muted/20 border-b border-border/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-primary" /> Tendência de Fadiga
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] p-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={fatigueData}>
                                <defs>
                                    <linearGradient id="colorCpl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" hide />
                                <YAxis hide />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="cpl" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCpl)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Format Radar Chart */}
                <Card className="bg-card/50 border-border/40 overflow-hidden relative group">
                    <CardHeader className="p-4 bg-muted/20 border-b border-border/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <LayoutGrid className="h-3 w-3 text-blue-500" /> Comparativo de Ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] p-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={diversityData}>
                                <PolarGrid stroke="hsla(var(--border), 0.5)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                <Radar name="Vídeo" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                <Radar name="Imagem" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Distribution Chart (Budget) */}
                <Card className="bg-card/50 border-border/40 overflow-hidden relative group">
                    <CardHeader className="p-4 bg-muted/20 border-b border-border/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <PieChart className="h-3 w-3 text-amber-500" /> Distribuição de Verba
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] p-0 flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={budgetDistributionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border), 0.3)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" hide />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                                <RechartsTooltip />
                            </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-[10px] text-muted-foreground font-medium pb-2">Top 5 Criativos por Gasto</p>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

function StatCard({ title, value, icon: Icon, color, loading }: { title: string, value: string | null, icon: any, color: string, loading?: boolean }) {
    return (
        <Card className="bg-card/50 border-border/40 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all group overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <Icon className={cn("h-12 w-12", color)} />
            </div>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {loading ? <Skeleton className="h-8 w-24 bg-muted/50" /> : <div className="text-2xl font-black">{value}</div>}
            </CardContent>
        </Card>
    );
}

function MetricBadge({ value, label, threshold }: { value: number, label: string, threshold: number }) {
    const isGood = value >= threshold;
    return (
        <div className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold",
            isGood ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
        )}>
            {value.toFixed(1)}{label}
        </div>
    );
}

function getActionStyle(action: string) {
    switch (action) {
        case 'PAUSAR': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'TROCAR CRIATIVO': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'LIMITAR CPA': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'AGUARDAR': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'MANTER': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        default: return 'bg-secondary/50 text-muted-foreground border-border/50';
    }
}

function TableSkeleton() {
    return (
        <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Database className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
                <h3 className="text-sm font-semibold">Sem dados Andromeda no período</h3>
                <p className="text-xs text-muted-foreground">O sistema requer pelo menos 24h de veiculação para gerar métricas de saúde.</p>
            </div>
        </div>
    );
}
