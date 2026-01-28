import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FaFacebook } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Pencil, Search, Tag, X, ArrowUpDown, MessageSquareText } from "lucide-react";

import { getSupabaseClient } from "@/integrations/supabase/client";
import type {
    AggregatedCampaign,
    Unit,
    Course,
    MappingStatus,
    PlatformFilter,
    CourseLine,
} from "@/integrations/supabase/campaignMappingSchema";

import { CampaignMappingDialog } from "@/components/campaign-classifier/CampaignMappingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CampaignClassifierPage() {
    const client = getSupabaseClient();

    // Filters
    const [status, setStatus] = React.useState<MappingStatus>("pending");
    const [platform, setPlatform] = React.useState<PlatformFilter>("all");
    const [unitFilter, setUnitFilter] = React.useState<string>("all");
    const [courseFilter, setCourseFilter] = React.useState<string>("all");
    const [search, setSearch] = React.useState("");
    const [sortConfig, setSortConfig] = React.useState<{
        key: keyof AggregatedCampaign | "classification";
        direction: "asc" | "desc";
    }>({ key: "total_spend", direction: "desc" });

    // Modal state
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [selectedCampaign, setSelectedCampaign] = React.useState<AggregatedCampaign | null>(null);

    // Bulk selection state
    const [selectedCampaigns, setSelectedCampaigns] = React.useState<Set<string>>(new Set());
    const [isBulkMode, setIsBulkMode] = React.useState(false);

    // Query: Units
    const unitsQuery = useQuery({
        queryKey: ["units"],
        enabled: !!client,
        queryFn: async () => {
            try {
                const { data, error } = await (client as SupabaseClient)
                    .from("units")
                    .select("id, name")
                    .order("name");
                if (error) {
                    console.warn("Units table query error:", error);
                    return [];
                }
                return (data as Unit[]) || [];
            } catch (e) {
                console.warn("Units table may not exist:", e);
                return [];
            }
        },
    });

    // Query: Courses
    const coursesQuery = useQuery({
        queryKey: ["courses"],
        enabled: !!client,
        queryFn: async () => {
            try {
                const { data, error } = await (client as SupabaseClient)
                    .from("courses")
                    .select("id, name")
                    .order("name");
                if (error) {
                    console.warn("Courses table query error:", error);
                    return [];
                }
                return (data as Course[]) || [];
            } catch (e) {
                console.warn("Courses table may not exist:", e);
                return [];
            }
        },
    });

    // Query: Course Lines
    const courseLinesQuery = useQuery({
        queryKey: ["course-lines"],
        enabled: !!client,
        queryFn: async () => {
            const { data, error } = await (client as SupabaseClient)
                .from("course_lines")
                .select("id, name")
                .eq("status", "active")
                .order("name");
            if (error) return [];
            return (data as CourseLine[]) || [];
        },
    });

    // Query: Aggregated Campaigns
    const campaignsQuery = useQuery({
        // Removed status from key so we don't refetch on tab change
        queryKey: ["campaigns-aggregated", platform, search],
        enabled: !!client,
        queryFn: async () => {
            // Step 1: Get all mappings from readable view
            const { data: mappings, error: mappingsError } = await (client as SupabaseClient)
                .from("vw_campaign_mapping_readable")
                .select("*");

            if (mappingsError) {
                console.warn("Mappings query error (table may not exist yet):", mappingsError);
            }

            // Using strict types would satisfy lint, but referencing the view's return type is safer
            const mappingsMap = new Map(
                (mappings || []).map((m) => [`${m.platform}|${m.campaign_id}`, m])
            );

            // Step 2: Get aggregated campaigns from fact_ads_performance_daily
            // Using a raw RPC call or direct query since we need aggregation
            let query = (client as SupabaseClient)
                .from("fact_ads_performance_daily")
                .select("platform, campaign_id, campaign_name, spend");

            if (platform !== "all") {
                query = query.eq("platform", platform);
            }

            const { data: rawData, error: rawError } = await query;

            if (rawError) {
                console.warn("Raw campaigns query error:", rawError);
                throw rawError;
            }

            // Aggregate by platform + campaign_id
            const aggregated = new Map<string, AggregatedCampaign>();

            (rawData || []).forEach((row) => {
                const key = `${row.platform}|${row.campaign_id}`;
                const mapping = mappingsMap.get(key);

                if (!aggregated.has(key)) {
                    aggregated.set(key, {
                        platform: row.platform,
                        campaign_id: row.campaign_id,
                        campaign_name: row.campaign_name,
                        total_spend: 0,
                        mapping_id: mapping?.id || null,
                        unit_id: mapping?.unit_id || null, // from view
                        unit_name: mapping?.unidade_nome || null, // directly from view!
                        course_id: mapping?.course_id || null, // from view
                        course_name: mapping?.curso_nome || null, // directly from view!
                        observation: mapping?.observation || null,
                        is_ignored: mapping?.is_ignored || false, // from view
                    });
                }

                const entry = aggregated.get(key)!;
                entry.total_spend += Number(row.spend || 0);
            });

            // Enrich with unit/course names (only for unmapped items or fallbacks if view failed)
            // Since we use the view, mapped items already have names.
            // We just return the values directly.

            const result = Array.from(aggregated.values());

            // Apply filters (only platform and search, NOT status)
            let filtered = result;

            // PREVIOUSLY filtering by status here - NO LONGER doing this in query
            // so we can count them all.

            if (search) {
                const searchLower = search.toLowerCase();
                filtered = filtered.filter((c) =>
                    (c.campaign_name || "").toLowerCase().includes(searchLower) ||
                    c.campaign_id.toLowerCase().includes(searchLower)
                );
            }

            // Sort by highest spend (Pareto) - initial sort
            filtered.sort((a, b) => b.total_spend - a.total_spend);

            return filtered;
        },
    });

    // Handle sort click
    const handleSort = (key: keyof AggregatedCampaign | "classification") => {
        setSortConfig((current) => ({
            key,
            direction:
                current.key === key && current.direction === "asc" ? "desc" : "asc",
        }));
    };

    // Derive counts and filtered list for current view
    const { displayedCampaigns, counts } = React.useMemo(() => {
        let all = campaignsQuery.data || [];

        // Apply Unit and Course filters
        if (unitFilter !== "all") {
            if (unitFilter === "none") {
                all = all.filter(c => !c.unit_id);
            } else {
                all = all.filter(c => c.unit_id === unitFilter);
            }
        }

        if (courseFilter !== "all") {
            if (courseFilter === "none") {
                all = all.filter(c => !c.course_id);
            } else {
                all = all.filter(c => c.course_id === courseFilter);
            }
        }

        const pending = all.filter(c => !c.mapping_id);
        const mapped = all.filter(c => !!c.mapping_id);

        // Decide what to show based on current tab
        let toShow: AggregatedCampaign[] = [];
        if (status === "pending") toShow = pending;
        else if (status === "mapped") toShow = mapped;
        else toShow = all;

        // Apply sorting
        toShow.sort((a, b) => {
            const direction = sortConfig.direction === "asc" ? 1 : -1;

            if (sortConfig.key === "total_spend") {
                return (a.total_spend - b.total_spend) * direction;
            }

            if (sortConfig.key === "campaign_name") {
                return (a.campaign_name || "").localeCompare(b.campaign_name || "") * direction;
            }

            if (sortConfig.key === "classification") {
                // Priority 1: Unmapped Unit (should be first)
                const hasUnitA = !!a.unit_name;
                const hasUnitB = !!b.unit_name;
                if (hasUnitA !== hasUnitB) {
                    return (hasUnitA ? 1 : -1) * direction;
                }

                // Priority 2: Unmapped Course
                const hasCourseA = !!a.course_name;
                const hasCourseB = !!b.course_name;
                if (hasCourseA !== hasCourseB) {
                    return (hasCourseA ? 1 : -1) * direction;
                }

                // Priority 3: Alphabetical Unit
                const unitDiff = (a.unit_name || "").localeCompare(b.unit_name || "");
                if (unitDiff !== 0) return unitDiff * direction;

                // Priority 4: Alphabetical Course
                const nameA = a.course_name || "";
                const nameB = b.course_name || "";
                return nameA.localeCompare(nameB) * direction;
            }

            return 0;
        });

        return {
            displayedCampaigns: toShow.slice(0, 100), // Apply limit here for rendering
            counts: {
                all: all.length,
                pending: pending.length,
                mapped: mapped.length
            }
        };
    }, [campaignsQuery.data, status, sortConfig, unitFilter, courseFilter]);

    // Single campaign edit
    const handleEdit = (campaign: AggregatedCampaign) => {
        setSelectedCampaign(campaign);
        setIsBulkMode(false);
        setDialogOpen(true);
    };

    // Bulk classification
    const handleBulkEdit = () => {
        if (selectedCampaigns.size === 0) return;
        setSelectedCampaign(null);
        setIsBulkMode(true);
        setDialogOpen(true);
    };

    // Toggle selection
    const toggleCampaignSelection = (campaignKey: string) => {
        const newSelection = new Set(selectedCampaigns);
        if (newSelection.has(campaignKey)) {
            newSelection.delete(campaignKey);
        } else {
            newSelection.add(campaignKey);
        }
        setSelectedCampaigns(newSelection);
    };

    // Select all visible campaigns
    const toggleSelectAll = () => {
        if (selectedCampaigns.size === displayedCampaigns.length) {
            setSelectedCampaigns(new Set());
        } else {
            const allKeys = new Set(
                displayedCampaigns.map(c => `${c.platform}|${c.campaign_id}`)
            );
            setSelectedCampaigns(allKeys);
        }
    };

    // Get selected campaigns data
    const getSelectedCampaignsData = (): AggregatedCampaign[] => {
        return (campaignsQuery.data || []).filter(c =>
            selectedCampaigns.has(`${c.platform}|${c.campaign_id}`)
        );
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);

    const PlatformIcon = ({ platform }: { platform: string }) => {
        if (platform === "META") return <FaFacebook className="h-4 w-4 text-blue-500" />;
        if (platform === "GOOGLE") return <FcGoogle className="h-4 w-4" />;
        return <Tag className="h-4 w-4 text-muted-foreground" />;
    };

    if (!client) {
        return (
            <div className="p-8 text-center text-destructive">
                <h2 className="text-lg font-bold">Sem conexão com Supabase</h2>
                <p>Configure as variáveis de ambiente para conectar ao banco de dados.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6 pb-32">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Classificação de Campanhas</h1>
                </div>
                <p className="text-muted-foreground">
                    Vincule campanhas de anúncios às Unidades e Cursos oficiais para corrigir classificações automáticas.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={status} onValueChange={(v) => setStatus(v as MappingStatus)}>
                    <TabsList>
                        <TabsTrigger value="pending">
                            Pendentes
                            <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                {counts.pending}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="mapped">
                            Classificadas
                            <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                {counts.mapped}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="all">
                            Todas
                            <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                {counts.all}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex gap-2">
                    <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformFilter)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Plataforma" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="META">Meta</SelectItem>
                            <SelectItem value="GOOGLE">Google</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={unitFilter} onValueChange={setUnitFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas Unidades</SelectItem>
                            <SelectItem value="none">Não definidas</SelectItem>
                            {(unitsQuery.data || []).map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Curso" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos Cursos</SelectItem>
                            <SelectItem value="none">Não definidos</SelectItem>
                            {(coursesQuery.data || []).map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar campanha..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-[200px]"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            {campaignsQuery.isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : campaignsQuery.error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                    <p className="font-medium">Erro ao carregar campanhas</p>
                    <p className="text-sm">{String(campaignsQuery.error)}</p>
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={displayedCampaigns.length > 0 && selectedCampaigns.size === displayedCampaigns.length}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Selecionar todas"
                                    />
                                </TableHead>
                                <TableHead className="w-[60px]">Plataforma</TableHead>
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        className="-ml-4 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort("campaign_name")}
                                    >
                                        Campanha
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right w-[120px]">
                                    <Button
                                        variant="ghost"
                                        className="-mr-4 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort("total_spend")}
                                    >
                                        Investimento
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[180px]">
                                    <Button
                                        variant="ghost"
                                        className="-ml-4 h-8 data-[state=open]:bg-accent"
                                        onClick={() => handleSort("classification")}
                                    >
                                        Classificação
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[60px]">Obs.</TableHead>
                                <TableHead className="w-[80px] text-center">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCampaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        Nenhuma campanha encontrada com os filtros atuais.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                displayedCampaigns.map((campaign) => (
                                    <TableRow key={`${campaign.platform}|${campaign.campaign_id}`}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedCampaigns.has(`${campaign.platform}|${campaign.campaign_id}`)}
                                                onCheckedChange={() => toggleCampaignSelection(`${campaign.platform}|${campaign.campaign_id}`)}
                                                aria-label={`Selecionar ${campaign.campaign_name}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                <PlatformIcon platform={campaign.platform} />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="block max-w-[450px] truncate cursor-help">
                                                        {campaign.campaign_name || campaign.campaign_id}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-[400px]">
                                                    <p className="font-medium">{campaign.campaign_name}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {campaign.campaign_id}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(campaign.total_spend)}
                                        </TableCell>
                                        <TableCell>
                                            {campaign.is_ignored ? (
                                                <Badge variant="outline" className="bg-muted text-muted-foreground">
                                                    Ignorada
                                                </Badge>
                                            ) : campaign.mapping_id ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        {campaign.unit_name ? (
                                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                                {campaign.unit_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] uppercase tracking-wider text-destructive font-bold">
                                                                Unidade não def.
                                                            </span>
                                                        )}
                                                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-1 py-0 h-4 rounded-sm">
                                                            Manual
                                                        </Badge>
                                                    </div>
                                                    {campaign.course_name ? (
                                                        <span className="text-sm font-bold text-primary">
                                                            {campaign.course_name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm font-bold text-destructive">
                                                            Sem Vínculo
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                                    Pendente
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {campaign.observation && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex justify-center items-center cursor-help w-full">
                                                            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-[300px] text-sm">{campaign.observation}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(campaign)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Editar</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total Geral:</TableCell>
                                <TableCell className="text-right font-bold text-primary">
                                    {formatCurrency(displayedCampaigns.reduce((acc, c) => acc + c.total_spend, 0))}
                                </TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            )}

            {/* Mapping Dialog */}
            <CampaignMappingDialog
                campaign={selectedCampaign}
                bulkCampaigns={isBulkMode ? getSelectedCampaignsData() : []}
                isBulkMode={isBulkMode}
                units={unitsQuery.data || []}
                courses={coursesQuery.data || []}
                courseLines={courseLinesQuery.data || []}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={() => {
                    setSelectedCampaigns(new Set()); // Clear selection on success
                    setIsBulkMode(false);
                }}
            />

            {/* Floating Bulk Action Bar */}
            {selectedCampaigns.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-popover border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
                        <span className="text-sm font-medium whitespace-nowrap">
                            {selectedCampaigns.size} campanhas selecionadas
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <Button onClick={handleBulkEdit} size="sm" className="rounded-full">
                            Classificar
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            onClick={() => setSelectedCampaigns(new Set())}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancelar seleção</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
