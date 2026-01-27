import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Calendar, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDynamicPacingStatus, getPacingStatusLabel, getDynamicThresholds, formatExpectedRange, type PacingStatus } from "@/lib/pacing-utils";

// Reutilizar tipo se exportado, ou redefinir compativel
export type TreeDataRow = {
    unidade: string | null;
    plataforma: string | null;
    curso: string | null;
    orcamento_semanal: number | string | null;
    gasto_real: number | string | null;
    leads: number | string | null;
    funnel_stage?: string | null;
    location?: string | null;
};

interface InvestmentTreeTableProps {
    data: TreeDataRow[];
    onViewWeekly: (node: TreeNode) => void;
    monthDate: Date; // Month being analyzed for dynamic pacing
}

type NodeStatus = "success" | "warning" | "error";

export interface TreeNode {
    id: string; // Unique key
    label: string;
    level: number;
    budget: number;
    spend: number;
    leads: number;
    children: TreeNode[];
    isLeaf: boolean;
    filters?: {
        platform?: string;
        unit?: string;
        course?: string;
        funnel?: string;
        isEad?: boolean;
        isBranding?: boolean;
    };
    // Expanded state is controlled by component
}

function safeNumber(v: any) {
    if (typeof v === "number") return v;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

export function InvestmentTreeTable({ data, onViewWeekly, monthDate }: InvestmentTreeTableProps) {
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

    const toggle = (id: string) => {
        const newSet = new Set(expanded);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpanded(newSet);
    };

    // --- Build Tree Logic ---
    const rootNodes = React.useMemo(() => {
        // Groups
        const eadGroup: TreeNode = { id: "1-ead", label: "1. EAD", level: 0, budget: 0, spend: 0, leads: 0, children: [], isLeaf: false };
        const brandingGroup: TreeNode = { id: "2-branding", label: "2. Branding", level: 0, budget: 0, spend: 0, leads: 0, children: [], isLeaf: false };
        const conversionGroup: TreeNode = { id: "3-conversion", label: "3. Mkt de Conversão", level: 0, budget: 0, spend: 0, leads: 0, children: [], isLeaf: false };

        // Subgroups of Conversion
        const medSubGroup: TreeNode = { id: "3.1-med", label: "3.1 Medicina", level: 1, budget: 0, spend: 0, leads: 0, children: [], isLeaf: false };
        const coursesSubGroup: TreeNode = { id: "3.2-courses", label: "3.2 Cursos", level: 1, budget: 0, spend: 0, leads: 0, children: [], isLeaf: false };

        // Temporary Maps for aggregation
        const eadPlatforms = new Map<string, TreeNode>();
        const brandingPlatforms = new Map<string, TreeNode>();
        const medPlatforms = new Map<string, TreeNode>();
        const unitMap = new Map<string, TreeNode>();

        data.forEach(row => {
            const budget = safeNumber(row.orcamento_semanal);
            const spend = safeNumber(row.gasto_real);
            const leads = safeNumber(row.leads);
            const unit = (row.unidade || "").toLowerCase();
            const course = (row.curso || "Outros").toLowerCase();
            const platform = row.plataforma || "Outras";
            const funnel = (row.funnel_stage || "").toLowerCase();
            const location = row.location || "Sem localização";

            // Classification Logic
            let isEad = unit.includes("ead") || course.includes("ead") || unit === "1. ead" || unit.startsWith("ead ") || unit.includes("ulbra pop");
            let isBranding = funnel === "branding" || funnel === "brand" || unit.includes("branding") || unit.includes("institucional");
            // Se conflitar (ex: EAD Branding), prioridade EAD? Plano diz: 
            // - EAD: unit/course contains EAD.
            // - Branding: funnel = branding (se não for EAD).

            if (isEad) {
                // Grupo 1: EAD -> Agrupar por Platform
                eadGroup.budget += budget;
                eadGroup.spend += spend;
                eadGroup.leads += leads;
                eadGroup.filters = { isEad: true };

                if (!eadPlatforms.has(platform)) {
                    eadPlatforms.set(platform, {
                        id: `ead-${platform}`,
                        label: platform,
                        level: 1,
                        budget: 0,
                        spend: 0,
                        leads: 0,
                        children: [],
                        isLeaf: true,
                        filters: { isEad: true, platform }
                    });
                }
                const pNode = eadPlatforms.get(platform)!;
                pNode.budget += budget;
                pNode.spend += spend;
                pNode.leads += leads;

            } else if (isBranding) {
                // Grupo 2: Branding -> Agrupar por Platform
                brandingGroup.budget += budget;
                brandingGroup.spend += spend;
                brandingGroup.leads += leads;
                brandingGroup.filters = { isBranding: true, funnel: "branding" };

                if (!brandingPlatforms.has(platform)) {
                    brandingPlatforms.set(platform, {
                        id: `brand-${platform}`,
                        label: platform,
                        level: 1,
                        budget: 0,
                        spend: 0,
                        leads: 0,
                        children: [],
                        isLeaf: true,
                        filters: { isBranding: true, funnel: "branding", platform }
                    });
                }
                const pNode = brandingPlatforms.get(platform)!;
                pNode.budget += budget;
                pNode.spend += spend;
                pNode.leads += leads;

            } else {
                // Grupo 3: Conversão
                conversionGroup.budget += budget;
                conversionGroup.spend += spend;
                conversionGroup.leads += leads;
                conversionGroup.filters = { funnel: "conversion" }; // Generic conversion filter

                // Check if it's specifically "Medicina" (not Biomedicina)
                const isMedicinaOnly = course.toLowerCase() === "medicina" ||
                    (course.toLowerCase().includes("medicina") && !course.toLowerCase().includes("bio"));

                if (isMedicinaOnly) {
                    // 3.1 Medicina -> Agrupar por Platform
                    medSubGroup.budget += budget;
                    medSubGroup.spend += spend;
                    medSubGroup.leads += leads;
                    medSubGroup.filters = { course: "medicina" };

                    if (!medPlatforms.has(platform)) {
                        medPlatforms.set(platform, {
                            id: `med-${platform}`,
                            label: platform,
                            level: 2,
                            budget: 0,
                            spend: 0,
                            leads: 0,
                            children: [],
                            isLeaf: true,
                            filters: { course: "medicina", platform }
                        });
                    }
                    const pNode = medPlatforms.get(platform)!;
                    pNode.budget += budget;
                    pNode.spend += spend;
                    pNode.leads += leads;

                } else {
                    // 3.2 Cursos -> Agrupar por Unidade -> Curso -> Plataforma
                    coursesSubGroup.budget += budget;
                    coursesSubGroup.spend += spend;
                    coursesSubGroup.leads += leads;
                    coursesSubGroup.filters = { funnel: "conversion", isEad: false };

                    const unitLabel = row.unidade || "Sem Unidade";
                    if (!unitMap.has(unitLabel)) {
                        unitMap.set(unitLabel, {
                            id: `unit-${unitLabel}`,
                            label: unitLabel,
                            level: 2,
                            budget: 0,
                            spend: 0,
                            leads: 0,
                            children: [],
                            isLeaf: false,
                            filters: { unit: unitLabel }
                        });
                    }
                    const uNode = unitMap.get(unitLabel)!;
                    uNode.budget += budget;
                    uNode.spend += spend;
                    uNode.leads += leads;

                    // Nível Curso dentro da Unidade
                    let courseLabel = row.curso || "Geral";
                    if (courseLabel.toLowerCase() === "mkt de conversão") courseLabel = "Geral";

                    let courseNode = uNode.children.find(c => c.label.toLowerCase() === courseLabel.toLowerCase());
                    if (!courseNode) {
                        courseNode = {
                            id: `unit-${unitLabel}-${courseLabel}`,
                            label: courseLabel,
                            level: 3,
                            budget: 0,
                            spend: 0,
                            leads: 0,
                            children: [],
                            isLeaf: false,
                            filters: { unit: unitLabel, course: courseLabel }
                        };
                        uNode.children.push(courseNode);
                    }
                    courseNode.budget += budget;
                    courseNode.spend += spend;
                    courseNode.leads += leads;

                    // Nível Plataforma dentro do Curso
                    let platNode = courseNode.children.find(p => p.label === platform);
                    if (!platNode) {
                        platNode = {
                            id: `unit-${unitLabel}-${courseLabel}-${platform}`,
                            label: platform,
                            level: 4,
                            budget: 0,
                            spend: 0,
                            leads: 0,
                            children: [],
                            isLeaf: true,
                            filters: { unit: unitLabel, course: courseLabel, platform }
                        };
                        courseNode.children.push(platNode);
                    }
                    platNode.budget += budget;
                    platNode.spend += spend;
                    platNode.leads += leads;
                }
            }
        });

        // Assemble Children
        eadGroup.children = Array.from(eadPlatforms.values()).sort((a, b) => b.budget - a.budget);
        brandingGroup.children = Array.from(brandingPlatforms.values()).sort((a, b) => b.budget - a.budget);

        medSubGroup.children = Array.from(medPlatforms.values()).sort((a, b) => b.budget - a.budget);

        // Sort Units -> Courses -> Platforms
        const sortedUnits = Array.from(unitMap.values()).sort((a, b) => b.budget - a.budget);
        sortedUnits.forEach(u => {
            u.children.sort((a, b) => b.budget - a.budget);
            u.children.forEach(c => {
                c.children.sort((a, b) => b.budget - a.budget);
            });
        });
        coursesSubGroup.children = sortedUnits;

        // Debug: Ulbra Canoas courses in tree
        const ulbraCanoasNode = sortedUnits.find(u => u.label.toLowerCase().includes("canoas"));
        if (ulbraCanoasNode) {
            console.log("🌳 Ulbra Canoas Tree:", {
                unit: ulbraCanoasNode.label,
                totalCourses: ulbraCanoasNode.children.length,
                courses: ulbraCanoasNode.children.map(c => ({
                    name: c.label,
                    budget: c.budget,
                    spend: c.spend,
                    platforms: c.children.length
                }))
            });
        }

        conversionGroup.children = [medSubGroup, coursesSubGroup];

        return [eadGroup, brandingGroup, conversionGroup];
    }, [data]);

    // Recursive Renderer
    // Recursive Renderer
    const renderNode = (node: TreeNode, isDimmed: boolean = false) => {
        const isOpen = expanded.has(node.id);
        const utilization = node.budget > 0 ? (node.spend / node.budget) : 0;
        const variance = node.budget - node.spend; // Positivo = Sobrou budget (Good), Negativo = Estourou (Bad)

        // Dynamic Status Logic based on month progress
        const currentDate = new Date();
        const status: PacingStatus = getDynamicPacingStatus(utilization, currentDate, monthDate);

        const statusColor = status === "error" ? "text-red-500" : status === "warning" ? "text-yellow-500" : "text-emerald-500";
        const statusLabel = getPacingStatusLabel(status);

        const cpl = node.leads > 0 ? node.spend / node.leads : 0;

        // Progress Bar Color
        const progressBarColor = status === "error" ? "bg-red-500" : status === "warning" ? "bg-yellow-500" : "bg-emerald-500";
        const progressBgColor = status === "error" ? "bg-red-100" : status === "warning" ? "bg-yellow-100" : "bg-emerald-100";
        const percentValue = Math.min(utilization * 100, 100);

        // Calculate Children Dimming Logic
        // IF I am dimmed, my children are dimmed.
        // IF I am NOT dimmed, check if any of my children are expanded.
        // If yes, dim the non-expanded ones.
        const childrenLoaded = node.children && node.children.length > 0;
        let childrenHasExpanded = false;
        if (childrenLoaded) {
            childrenHasExpanded = node.children.some(c => expanded.has(c.id));
        }

        return (
            <React.Fragment key={node.id}>
                <TableRow
                    className={`hover:bg-muted/50 cursor-pointer transition-opacity duration-300 ${isDimmed ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
                    onClick={() => !node.isLeaf && toggle(node.id)}
                >
                    <TableCell className="py-2">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${node.level * 24}px` }}>
                            {!node.isLeaf && (
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent">
                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                            )}
                            {node.isLeaf && <span className="w-4" />} {/* Spacer for leaves */}
                            <span className={node.level === 0 ? "font-bold" : "font-medium"}>
                                {node.label}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right py-2 font-mono text-sm">{brl(node.budget)}</TableCell>
                    <TableCell className="text-right py-2 font-mono text-sm">{brl(node.spend)}</TableCell>
                    <TableCell className="text-right py-2" style={{ minWidth: '140px' }}>
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex justify-end">
                                <span className={`text-xs font-semibold ${status === "error" ? "text-red-700" : status === "warning" ? "text-yellow-700" : "text-emerald-700"}`}>
                                    {pct(utilization)}
                                </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full ${progressBgColor} overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full ${progressBarColor}`}
                                    style={{ width: `${percentValue}%` }}
                                />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className={`text-right py-2 font-mono text-sm ${variance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {brl(variance)}
                    </TableCell>
                    <TableCell className="text-right py-2 font-mono text-sm max-w-[80px]">
                        {node.leads > 0 ? node.leads.toLocaleString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-right py-2 font-mono text-sm max-w-[100px]">
                        {cpl > 0 ? brl(cpl) : '-'}
                    </TableCell>
                    <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center gap-1">
                            <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <div className="space-y-1 text-xs">
                                            <p className="font-semibold">Status: {statusLabel}</p>
                                            <p>Utilização: {pct(utilization)}</p>
                                            <p>Faixa ideal: {formatExpectedRange(getDynamicThresholds(new Date(), monthDate))}</p>
                                            <p className="text-muted-foreground">
                                                {status === "error" && "Fora da margem aceitável para o dia atual."}
                                                {status === "warning" && "Próximo aos limites, requer atenção."}
                                                {status === "success" && "Dentro do ritmo esperado para o dia atual."}
                                            </p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </TableCell>
                    <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewWeekly(node);
                                            }}
                                        >
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Ver detalhamento semanal</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </TableCell>
                </TableRow>
                {isOpen && !node.isLeaf && node.children.map(child => {
                    const shouldDimChild = isDimmed || (childrenHasExpanded && !expanded.has(child.id));
                    return renderNode(child, shouldDimChild);
                })}
            </React.Fragment>
        );
    };

    return (
        <div className="rounded-md border overflow-x-auto min-w-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[400px]">Hierarquia</TableHead>
                        <TableHead className="text-right">Budget Planejado</TableHead>
                        <TableHead className="text-right">Gasto Realizado</TableHead>
                        <TableHead className="text-right">Utilização</TableHead>
                        <TableHead className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                Variância (R$)
                                <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[200px] text-xs font-normal">
                                            Diferença entre Budget Planejado e Gasto Realizado. Positivo = Saldo disponível. Negativo = Valor excedido.
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </TableHead>
                        <TableHead className="text-right max-w-[80px]">Leads</TableHead>
                        <TableHead className="text-right max-w-[100px]">CPL</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center w-[50px]">Semana</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rootNodes.map(node => {
                        const hasExpandedRoot = rootNodes.some(n => expanded.has(n.id));
                        const shouldDim = hasExpandedRoot && !expanded.has(node.id);
                        return renderNode(node, shouldDim);
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
