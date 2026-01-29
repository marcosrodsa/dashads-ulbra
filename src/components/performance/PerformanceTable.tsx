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
import { ArrowUpDown, ArrowUp, ArrowDown, Globe, TriangleAlert, Info } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface CampaignMetric {
    name: string;
    spend: number;
    leads: number;
    cpl: number;
    clicks: number;
    impressions: number;
    ctr: number;
}

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
    campaigns?: CampaignMetric[];
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

    // Modal state
    const [selectedRow, setSelectedRow] = React.useState<PerformanceRow | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
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

    const cplValues = data.map(r => r.cpl).filter(v => v > 0);
    const minCpl = Math.min(...cplValues, 0);
    const maxCpl = Math.max(...cplValues, 1);

    const getCplStyle = (val: number) => {
        if (val === 0) return "";
        const ratio = (val - minCpl) / (maxCpl - minCpl || 1);
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
                <Button variant="ghost" onClick={() => handleSort(field)} className={btnClass}>
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

    const renderPlatformIcon = (platform: string, row: PerformanceRow) => {
        const p = platform.toUpperCase();
        let icon = <Globe className="h-4 w-4 text-muted-foreground" />;
        let label = platform;

        if (p.includes("META") || p.includes("FACEBOOK") || p.includes("INSTAGRAM")) {
            icon = <FaFacebook className="h-5 w-5 text-[#1877F2]" />;
            label = "Meta Ads";
        } else if (p.includes("GOOGLE") || p.includes("YOUTUBE")) {
            icon = <FcGoogle className="h-5 w-5" />;
            label = "Google Ads";
        }

        return (
            <div
                className="flex items-center justify-center cursor-pointer group hover:scale-110 transition-transform"
                onClick={() => {
                    setSelectedRow(row);
                    setIsModalOpen(true);
                }}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative">
                                {icon}
                                <div className="absolute -top-1 -right-1 bg-primary text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Info className="w-2 h-2" />
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Clique para ver detalhes das campanhas ({label})</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
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
                                    <TableCell className="py-4">
                                        {renderPlatformIcon(row.platform, row)}
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            {selectedRow?.platform.toUpperCase().includes("META") ? <FaFacebook className="text-[#1877F2]" /> : <FcGoogle />}
                            Detalhes por Campanha
                        </DialogTitle>
                        <DialogDescription>
                            Listagem de performance para <strong>{selectedRow?.unidade}</strong> - {selectedRow?.curso}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto mt-4 border rounded-lg bg-slate-50/50">
                        <Table>
                            <TableHeader className="bg-white sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[400px]">Nome da Campanha</TableHead>
                                    <TableHead className="text-right">Investimento</TableHead>
                                    <TableHead className="text-right">Leads</TableHead>
                                    <TableHead className="text-right">CPL</TableHead>
                                    <TableHead className="text-right">CTR</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedRow?.campaigns?.map((c, i) => (
                                    <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium text-sm truncate max-w-[400px]" title={c.name}>
                                            {c.name}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{brl(c.spend)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{number(c.leads)}</TableCell>
                                        <TableCell className="text-right tabular-nums font-semibold">
                                            {c.leads > 0 ? brl(c.cpl) : "-"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">
                                            {pct(c.ctr)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!selectedRow?.campaigns || selectedRow.campaigns.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Nenhum dado de campanha disponível para este grupo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            {selectedRow && selectedRow.campaigns && selectedRow.campaigns.length > 0 && (
                                <TableFooter className="bg-slate-100/50">
                                    <TableRow className="font-bold">
                                        <TableCell>Total do Grupo</TableCell>
                                        <TableCell className="text-right">{brl(selectedRow.spend)}</TableCell>
                                        <TableCell className="text-right">{number(selectedRow.leads)}</TableCell>
                                        <TableCell className="text-right">{brl(selectedRow.cpl)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{pct(selectedRow.ctr)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TableFooter({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <tfoot className={`border-t bg-muted/50 font-medium [&>tr]:last:border-b-0 ${className}`}>
            {children}
        </tfoot>
    );
}
