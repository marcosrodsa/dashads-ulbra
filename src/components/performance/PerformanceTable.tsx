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
import { ArrowUpDown, ArrowUp, ArrowDown, Globe, TriangleAlert } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PerformanceRow {
    unidade: string;
    curso: string;
    platform: string;
    spend: number;
    leads: number;
    cpl: number;
    clicks: number;
    impressions: number;
    ctr: number;
}

interface PerformanceTableProps {
    data: PerformanceRow[];
}

type SortField = keyof PerformanceRow;
type SortDirection = "asc" | "desc";

function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function number(v: number) {
    return new Intl.NumberFormat("pt-BR").format(v);
}

function pct(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(v);
}

export function PerformanceTable({ data }: PerformanceTableProps) {
    const [sortField, setSortField] = React.useState<SortField>("spend");
    const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc"); // Default desc for new field usually better for metrics
        }
    };

    const sortedData = React.useMemo(() => {
        return [...data].sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];

            if (typeof valA === "string" && typeof valB === "string") {
                return sortDirection === "asc"
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            const numA = Number(valA);
            const numB = Number(valB);
            return sortDirection === "asc" ? numA - numB : numB - numA;
        });
    }, [data, sortField, sortDirection]);

    // Calculate Heatmap thresholds for CPL
    // Simple logic: Min/Max of current view
    // Red (Bad) = High CPL. Green (Good) = Low CPL.
    const cplValues = data.map(r => r.cpl).filter(v => v > 0);
    const minCpl = Math.min(...cplValues, 0);
    const maxCpl = Math.max(...cplValues, 1);

    const getCplStyle = (val: number) => {
        if (val === 0) return {};
        // Normalize 0-1
        const ratio = (val - minCpl) / (maxCpl - minCpl || 1);
        // If ratio is high -> Red (hsl 0). Low -> Green (hsl 120).
        // Let's us simple text color classes for robustness
        // Top 25% -> Red
        // Bottom 25% -> Green
        if (ratio > 0.75) return "text-red-600 font-bold";
        if (ratio < 0.25) return "text-emerald-600 font-bold";
        return "";
    };

    const renderHeader = (label: string, field: SortField, align: "left" | "right" | "center" = "right") => {
        let alignClass = "";
        let btnClass = "flex items-center gap-1 hover:bg-transparent px-0 font-semibold";

        if (align === "right") {
            alignClass = "text-right";
            btnClass += " ml-auto";
        } else if (align === "center") {
            alignClass = "text-center";
            btnClass += " mx-auto justify-center";
        } else {
            alignClass = "text-left";
        }

        return (
            <TableHead className={alignClass}>
                <Button
                    variant="ghost"
                    onClick={() => handleSort(field)}
                    className={btnClass}
                >
                    {label}
                    {sortField === field ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                </Button>
            </TableHead>
        );
    };

    const renderPlatformIcon = (platform: string) => {
        const p = platform.toUpperCase();
        if (p.includes("META") || p.includes("FACEBOOK") || p.includes("INSTAGRAM")) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex justify-center w-full">
                                <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Meta Ads</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        if (p.includes("GOOGLE") || p.includes("YOUTUBE")) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex justify-center w-full">
                                <FcGoogle className="h-5 w-5" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Google Ads</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex justify-center w-full">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{platform}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        {renderHeader("Unidade", "unidade", "left")}
                        {renderHeader("Curso", "curso", "left")}
                        {renderHeader("Plataforma", "platform", "center")}
                        {renderHeader("Investimento", "spend")}
                        {renderHeader("Leads", "leads")}
                        {renderHeader("CPL", "cpl")}
                        {renderHeader("CTR", "ctr")}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                Nenhum resultado encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedData.map((row, idx) => {
                            const isOutros = row.unidade === "Outros" || row.unidade === "Outros / Não Identificado" || !row.unidade;

                            return (
                                <TableRow key={idx} className="hover:bg-muted/50">
                                    <TableCell className={`font-medium ${isOutros ? "text-muted-foreground flex items-center gap-2" : ""}`}>
                                        {row.unidade || "Outros / Não Identificado"}
                                        {isOutros && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <TriangleAlert className="h-4 w-4 text-amber-500" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Unidade não identificada no link</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </TableCell>
                                    <TableCell>{row.curso}</TableCell>
                                    <TableCell className="flex justify-center py-4">
                                        {renderPlatformIcon(row.platform)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{brl(row.spend)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{number(row.leads)}</TableCell>
                                    <TableCell className={`text-right tabular-nums ${getCplStyle(row.cpl)}`}>
                                        {row.leads > 0 ? brl(row.cpl) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                        {pct(row.ctr)}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
