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
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Reutilizar tipo se exportado, ou redefinir compativel
export type TreeDataRow = {
    unidade: string | null;
    plataforma: string | null;
    curso: string | null;
    orcamento_semanal: number | string | null;
    gasto_real: number | string | null;
    funnel_stage?: string | null;
    location?: string | null;
};

interface InvestmentTreeTableProps {
    data: TreeDataRow[];
}

type NodeStatus = "success" | "warning" | "error";

interface TreeNode {
    id: string; // Unique key
    label: string;
    level: number;
    budget: number;
    spend: number;
    children: TreeNode[];
    isLeaf: boolean;
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

export function InvestmentTreeTable({ data }: InvestmentTreeTableProps) {
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
        const eadGroup: TreeNode = { id: "1-ead", label: "1. EAD", level: 0, budget: 0, spend: 0, children: [], isLeaf: false };
        const brandingGroup: TreeNode = { id: "2-branding", label: "2. Branding", level: 0, budget: 0, spend: 0, children: [], isLeaf: false };
        const conversionGroup: TreeNode = { id: "3-conversion", label: "3. Mkt de Conversão", level: 0, budget: 0, spend: 0, children: [], isLeaf: false };

        // Subgroups of Conversion
        const medSubGroup: TreeNode = { id: "3.1-med", label: "3.1 Medicina", level: 1, budget: 0, spend: 0, children: [], isLeaf: false };
        const coursesSubGroup: TreeNode = { id: "3.2-courses", label: "3.2 Cursos", level: 1, budget: 0, spend: 0, children: [], isLeaf: false };

        // Temporary Maps for aggregation
        const eadPlatforms = new Map<string, TreeNode>();
        const brandingPlatforms = new Map<string, TreeNode>();
        const medPlatforms = new Map<string, TreeNode>();
        const unitMap = new Map<string, TreeNode>();

        data.forEach(row => {
            const budget = safeNumber(row.orcamento_semanal);
            const spend = safeNumber(row.gasto_real);
            const unit = (row.unidade || "").toLowerCase();
            const course = (row.curso || "Outros").toLowerCase();
            const platform = row.plataforma || "Outras";
            const funnel = (row.funnel_stage || "").toLowerCase();
            const location = row.location || "Sem localização";

            // Classification Logic
            let isEad = unit.includes("ead") || course.includes("ead") || unit === "1. ead" || unit.startsWith("ead ");
            let isBranding = funnel === "branding" || funnel === "brand" || unit.includes("branding") || unit.includes("institucional");
            // Se conflitar (ex: EAD Branding), prioridade EAD? Plano diz: 
            // - EAD: unit/course contains EAD.
            // - Branding: funnel = branding (se não for EAD).

            if (isEad) {
                // Grupo 1: EAD -> Agrupar por Platform
                eadGroup.budget += budget;
                eadGroup.spend += spend;

                if (!eadPlatforms.has(platform)) {
                    eadPlatforms.set(platform, { id: `ead-${platform}`, label: platform, level: 1, budget: 0, spend: 0, children: [], isLeaf: true });
                }
                const pNode = eadPlatforms.get(platform)!;
                pNode.budget += budget;
                pNode.spend += spend;

            } else if (isBranding) {
                // Grupo 2: Branding -> Agrupar por Platform
                brandingGroup.budget += budget;
                brandingGroup.spend += spend;

                if (!brandingPlatforms.has(platform)) {
                    brandingPlatforms.set(platform, { id: `brand-${platform}`, label: platform, level: 1, budget: 0, spend: 0, children: [], isLeaf: true });
                }
                const pNode = brandingPlatforms.get(platform)!;
                pNode.budget += budget;
                pNode.spend += spend;

            } else {
                // Grupo 3: Conversão
                conversionGroup.budget += budget;
                conversionGroup.spend += spend;

                if (course.includes("medicina")) {
                    // 3.1 Medicina -> Agrupar por Platform
                    medSubGroup.budget += budget;
                    medSubGroup.spend += spend;

                    if (!medPlatforms.has(platform)) {
                        medPlatforms.set(platform, { id: `med-${platform}`, label: platform, level: 2, budget: 0, spend: 0, children: [], isLeaf: true });
                    }
                    const pNode = medPlatforms.get(platform)!;
                    pNode.budget += budget;
                    pNode.spend += spend;

                } else {
                    // 3.2 Cursos -> Agrupar por Unidade -> Curso -> Plataforma
                    coursesSubGroup.budget += budget;
                    coursesSubGroup.spend += spend;

                    const unitLabel = row.unidade || "Sem Unidade";
                    if (!unitMap.has(unitLabel)) {
                        unitMap.set(unitLabel, { id: `unit-${unitLabel}`, label: unitLabel, level: 2, budget: 0, spend: 0, children: [], isLeaf: false });
                    }
                    const uNode = unitMap.get(unitLabel)!;
                    uNode.budget += budget;
                    uNode.spend += spend;

                    // Nível Curso dentro da Unidade
                    let courseLabel = row.curso || "Geral";
                    if (courseLabel.toLowerCase() === "mkt de conversão") courseLabel = "Geral";

                    let courseNode = uNode.children.find(c => c.label.toLowerCase() === courseLabel.toLowerCase());
                    if (!courseNode) {
                        courseNode = { id: `unit-${unitLabel}-${courseLabel}`, label: courseLabel, level: 3, budget: 0, spend: 0, children: [], isLeaf: false };
                        uNode.children.push(courseNode);
                    }
                    courseNode.budget += budget;
                    courseNode.spend += spend;

                    // Nível Plataforma dentro do Curso
                    let platNode = courseNode.children.find(p => p.label === platform);
                    if (!platNode) {
                        platNode = { id: `unit-${unitLabel}-${courseLabel}-${platform}`, label: platform, level: 4, budget: 0, spend: 0, children: [], isLeaf: true };
                        courseNode.children.push(platNode);
                    }
                    platNode.budget += budget;
                    platNode.spend += spend;
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

        conversionGroup.children = [medSubGroup, coursesSubGroup];

        return [eadGroup, brandingGroup, conversionGroup];
    }, [data]);

    // Recursive Renderer
    const renderNode = (node: TreeNode) => {
        const isOpen = expanded.has(node.id);
        const utilization = node.budget > 0 ? (node.spend / node.budget) : 0;
        const variance = node.budget - node.spend; // Positivo = Sobrou budget (Good), Negativo = Estourou (Bad)

        // Status Pacing Logic (simplified)
        let status: NodeStatus = "success";
        if (utilization > 1.05) status = "error"; // > 105% spend
        else if (utilization < 0.8) status = "warning"; // Underpacing

        const statusColor = status === "error" ? "text-red-500" : status === "warning" ? "text-yellow-500" : "text-emerald-500";
        const statusLabel = status === "error" ? "Over" : status === "warning" ? "Under" : "On Track";

        return (
            <React.Fragment key={node.id}>
                <TableRow
                    className="hover:bg-muted/50 cursor-pointer"
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
                    <TableCell className="text-right py-2">{brl(node.budget)}</TableCell>
                    <TableCell className="text-right py-2">{brl(node.spend)}</TableCell>
                    <TableCell className="text-right py-2">
                        <Badge variant="outline" className={utilization > 1 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                            {pct(utilization)}
                        </Badge>
                    </TableCell>
                    <TableCell className={`text-right py-2 ${variance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {brl(variance)}
                    </TableCell>
                    <TableCell className="text-center py-2">
                        <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                    </TableCell>
                </TableRow>
                {isOpen && !node.isLeaf && node.children.map(child => renderNode(child))}
            </React.Fragment>
        );
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[400px]">Hierarquia</TableHead>
                        <TableHead className="text-right">Budget Planejado</TableHead>
                        <TableHead className="text-right">Gasto Realizado</TableHead>
                        <TableHead className="text-right">Utilização</TableHead>
                        <TableHead className="text-right">Variância (R$)</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rootNodes.map(node => renderNode(node))}
                </TableBody>
            </Table>
        </div>
    );
}
