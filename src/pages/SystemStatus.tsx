import { useQuery } from "@tanstack/react-query";
import { Activity, AlertOctagon, CheckCircle2, AlertTriangle, Clock, Database, DollarSign, RefreshCcw, RotateCcw, ChevronRight, ChevronDown, ListFilter, FileText } from "lucide-react";
import * as React from "react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSupabaseClient } from "@/integrations/supabase/client";
import type { LogDetailed, FinancialAuditDaily } from "@/integrations/supabase/systemStatusSchema";

const client = getSupabaseClient();

// --- Helpers ---
function formatCurrency(val: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function formatDateLiteral(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function formatDateBR(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    try {
        const safeDateStr = (dateStr.endsWith('Z') || dateStr.includes('+')) ? dateStr : dateStr + 'Z';
        return new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(new Date(safeDateStr));
    } catch (e) {
        return "-";
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'SUCCESS': return <Badge variant="default" className="bg-green-600 hover:bg-green-700 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>;
        case 'ERROR': return <Badge variant="destructive"><AlertOctagon className="w-3 h-3 mr-1" /> Error</Badge>;
        case 'WARNING': return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
        case 'TIMEOUT': return <Badge variant="destructive" className="bg-red-700 hover:bg-red-800"><RotateCcw className="w-3 h-3 mr-1" /> Timeout</Badge>;
        case 'RUNNING': return <Badge variant="outline" className="text-blue-600 border-blue-600"><Activity className="w-3 h-3 mr-1 animate-pulse" /> Running</Badge>;
        default: return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
}

function getPlatformIcon(platform: string) {
    const p = (platform || "").toLowerCase();
    if (p.includes("meta") || p.includes("facebook")) return <span className="text-blue-700 font-bold">META</span>;
    if (p.includes("google")) return <span className="text-emerald-700 font-bold">GOOGLE</span>;
    return <span className="text-muted-foreground">{platform}</span>;
}

// --- Grouping Logic ---
interface LogGroup {
    dateLabel: string;
    platforms: Record<string, AccountGroup[]>;
}

// Updated Interface: logs are flat, no sub-workflow grouping
interface AccountGroup {
    accountName: string;
    logs: LogDetailed[];
    latestStatus: string;
    latestTime: string;
    hasError: boolean;
    totalLogs: number;
}

// Helper for Status Severity
function getStatusSeverity(status: string): number {
    switch (status) {
        case 'ERROR':
        case 'TIMEOUT': return 3;
        case 'WARNING': return 2;
        case 'RUNNING':
        case 'PENDING': return 1;
        default: return 0; // SUCCESS
    }
}

function normalizeAccountKey(name: string): string {
    if (!name) return "sem-conta";
    return name.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

function groupLogsByAccount(logs: LogDetailed[]): LogGroup[] {
    const groupedByDate: Record<string, Record<string, Record<string, LogDetailed[]>>> = {};
    const accountNameMap: Record<string, string> = {};

    logs.forEach(log => {
        // Date Grouping
        let dateKey = log.data_hora.split('T')[0];
        try {
            const d = new Date(log.data_hora.endsWith('Z') || log.data_hora.includes('+') ? log.data_hora : log.data_hora + 'Z');
            dateKey = d.toLocaleDateString("pt-BR").split('/').reverse().join('-');
        } catch { }

        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = {};

        // Platform Grouping
        const platformKey = log.plataforma || (log as any).platform || "OUTROS";
        if (!groupedByDate[dateKey][platformKey]) groupedByDate[dateKey][platformKey] = {};

        // Account Grouping - Normalized
        const rawAccount = log.conta || "Sem Conta";
        const accountKey = normalizeAccountKey(rawAccount);

        if (!accountNameMap[accountKey]) {
            accountNameMap[accountKey] = rawAccount;
        }

        if (!groupedByDate[dateKey][platformKey][accountKey]) groupedByDate[dateKey][platformKey][accountKey] = [];

        // Push detailed log directly to account group
        groupedByDate[dateKey][platformKey][accountKey].push(log);
    });

    // Transform to Array Structure
    return Object.entries(groupedByDate)
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort by Date Desc
        .map(([dateKey, platforms]) => {
            const processedPlatforms: Record<string, AccountGroup[]> = {};

            Object.entries(platforms).forEach(([platform, accountsMap]) => {
                const accountGroups: AccountGroup[] = Object.entries(accountsMap).map(([accountKey, logs]) => {

                    // Sort logs by time ASC (Chronological: Oldest -> Newest)
                    logs.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

                    const latestLog = logs[logs.length - 1]; // Last item is now the latest
                    const hasError = logs.some(l => l.status === 'ERROR' || l.status === 'TIMEOUT');

                    // Calculate Worst Case Status
                    const worstLog = logs.reduce((prev, current) => {
                        return getStatusSeverity(current.status) > getStatusSeverity(prev.status) ? current : prev;
                    }, logs[0]);

                    return {
                        accountName: accountNameMap[accountKey] || accountKey,
                        logs, // Flat list
                        latestStatus: worstLog?.status || 'UNKNOWN',
                        latestTime: latestLog?.data_hora || new Date().toISOString(),
                        hasError,
                        totalLogs: logs.length
                    };
                });

                // Sort accounts by time too
                accountGroups.sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());

                processedPlatforms[platform] = accountGroups;
            });

            return {
                dateLabel: formatDateLabel(dateKey),
                platforms: processedPlatforms
            };
        });
}

function formatDateLabel(dateStr: string) {
    const date = new Date(dateStr + "T12:00:00");
    if (isToday(date)) return "Hoje, " + format(date, "dd 'de' MMMM", { locale: ptBR });
    if (isYesterday(date)) return "Ontem, " + format(date, "dd 'de' MMMM", { locale: ptBR });
    return format(date, "dd 'de' MMMM", { locale: ptBR });
}

// --- Sub-components ---
function LogAccountItem({ group, onSelectLog }: { group: AccountGroup, onSelectLog: (log: LogDetailed) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border rounded-md bg-card overflow-hidden">
            {/* Header */}
            <div
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${group.hasError ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-full ${isOpen ? 'bg-muted' : ''}`}>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                        <div className="font-medium text-sm">{group.accountName}</div>
                        <div className="text-xs text-muted-foreground">
                            {group.totalLogs} execuções
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">
                        {formatDateBR(group.latestTime).split(' ')[1]}
                    </span>
                    {getStatusBadge(group.latestStatus)}
                </div>
            </div>

            {/* Expanded Body - Flat List */}
            {isOpen && (
                <div className="border-t bg-muted/10 p-2 space-y-2">
                    {group.logs.map((log, i) => (
                        <div
                            key={log.log_id || i}
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-xs ml-2 border-l-2 border-border/30 pl-3"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="font-mono text-muted-foreground w-14 shrink-0">
                                    {formatDateBR(log.data_hora).split(' ')[1]}
                                </span>
                                <span className="text-muted-foreground/40 hidden sm:inline">|</span>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 bg-muted/50 px-1 rounded w-fit">
                                        {log.workflow || (log as any).workflow_name}
                                    </div>
                                    <div className="font-medium truncate text-foreground/80">
                                        {log.etapa || (log as any).step_name}
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={(e) => { e.stopPropagation(); onSelectLog(log); }}
                            >
                                <FileText className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SystemStatus() {
    const [selectedLog, setSelectedLog] = React.useState<LogDetailed | null>(null);

    // 1. Logs Query (Updated to fetch vw_logs_detalhados)
    const logsQuery = useQuery({
        queryKey: ["sys-logs-detailed"],
        queryFn: async () => {
            const { data, error } = await client
                .from("vw_logs_detalhados")
                .select("*")
                .limit(100); // Higher limit for detailed view

            if (error) {
                console.warn("vw_logs_detalhados mock used", error);
                return [
                    { log_id: '1', data_hora: new Date().toISOString(), plataforma: "META", conta: "Ulbra Geral", workflow: "Meta Ads ETL", etapa: "Data Import", status: "SUCCESS", registros: 1500, error_message: null },
                    { log_id: '2', data_hora: new Date(Date.now() - 1000 * 60 * 60).toISOString(), plataforma: "GOOGLE", conta: "Ulbra Search", workflow: "Google Ads ETL", etapa: "Request Job", status: "ERROR", registros: 0, error_message: "Timeout Connection | API Error 500", execution_id: "exc_123" },
                ] as LogDetailed[];
            }
            return data as LogDetailed[];
        },
        refetchInterval: 30000
    });

    // 2. Audit Query
    const auditQuery = useQuery({
        queryKey: ["sys-audit"],
        queryFn: async () => {
            const { data, error } = await client
                .from("vw_auditoria_diaria")
                .select("*")
                .order("data_referencia", { ascending: false });

            if (error) {
                return [] as FinancialAuditDaily[];
            }
            return data as FinancialAuditDaily[];
        }
    });

    // 3. Stats Calculation
    const stats = React.useMemo(() => {
        const logs = logsQuery.data || [];
        const failures24h = logs.filter(l => l.status === 'ERROR' || l.status === 'TIMEOUT').length;
        const todayExecutions = logs.filter(l => isToday(new Date(l.data_hora))).length;

        const audit = auditQuery.data || [];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const d1Audit = audit.filter(a => a.data_referencia === yesterdayStr);
        const d1Volume = d1Audit.reduce((acc, curr) => acc + (Number(curr.investimento_total) || 0), 0);

        return { todayExecutions, failures24h, d1Volume };
    }, [logsQuery.data, auditQuery.data]);

    const groupedLogs = React.useMemo(() => groupLogsByAccount(logsQuery.data || []), [logsQuery.data]);

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Status do Sistema</h1>
                    <p className="text-muted-foreground">Monitoramento de integrações e auditoria de dados.</p>
                </div>
                <Button variant="outline" onClick={() => { logsQuery.refetch(); auditQuery.refetch(); }} disabled={logsQuery.isFetching}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${logsQuery.isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* Health Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Logs Hoje (Detalhado)</CardTitle>
                        <ListFilter className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayExecutions}</div>
                        <p className="text-xs text-muted-foreground">Entradas registradas hoje</p>
                    </CardContent>
                </Card>
                <Card className={stats.failures24h > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${stats.failures24h > 0 ? "text-red-600" : ""}`}>Falhas (Logadas)</CardTitle>
                        <AlertOctagon className={`h-4 w-4 ${stats.failures24h > 0 ? "text-red-600" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.failures24h > 0 ? "text-red-600" : ""}`}>{stats.failures24h}</div>
                        <p className="text-xs text-muted-foreground">Erros/Timeouts na lista</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume Processado (D-1)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.d1Volume)}</div>
                        <p className="text-xs text-muted-foreground">Investimento total ontem</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Logs Grouped List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Histórico de Execuções</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {logsQuery.isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-40" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : groupedLogs.map((group, idx) => (
                            <div key={idx} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-foreground/80 bg-muted/30 px-3 py-1 rounded inline-block">
                                        {group.dateLabel}
                                    </h3>
                                    <div className="h-[1px] flex-1 bg-border/50"></div>
                                </div>

                                {Object.entries(group.platforms).map(([platform, accountGroups]) => (
                                    <div key={platform} className="ml-2 pl-4 border-l-2 border-border/40 space-y-2">
                                        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground font-medium uppercase tracking-wider">
                                            {getPlatformIcon(platform)}
                                            <span className="text-[10px]">•</span>
                                            {accountGroups.length} contas
                                        </div>

                                        <div className="grid gap-2">
                                            {accountGroups.map((accountGroup: AccountGroup, i: number) => (
                                                <LogAccountItem
                                                    key={accountGroup.accountName + i}
                                                    group={accountGroup}
                                                    onSelectLog={setSelectedLog}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Financial Audit */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Auditoria Financeira</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {auditQuery.isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-40" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : (
                            Object.entries(
                                (auditQuery.data || []).reduce((acc, row) => {
                                    const dateKey = row.data_referencia;
                                    const dateLabel = formatDateLiteral(dateKey); // Use helper or improved label logic if needed

                                    if (!acc[dateKey]) acc[dateKey] = { label: dateLabel, platforms: {}, totalSpend: 0, totalLeads: 0 };

                                    const platform = row.plataforma || (row as any).platform || "OUTROS";
                                    if (!acc[dateKey].platforms[platform]) acc[dateKey].platforms[platform] = [];

                                    acc[dateKey].platforms[platform].push(row);

                                    // Aggregate Totals
                                    acc[dateKey].totalSpend += Number(row.investimento_total || (row as any).investimento || 0);
                                    acc[dateKey].totalLeads += Number(row.leads_total || (row as any).leads || 0);

                                    return acc;
                                }, {} as Record<string, { label: string, platforms: Record<string, FinancialAuditDaily[]>, totalSpend: number, totalLeads: number }>)
                            )
                                .sort((a, b) => b[0].localeCompare(a[0])) // Sort by Date Desc
                                .map(([dateKey, group]) => (
                                    <div key={dateKey} className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/40 p-2 rounded-md border">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-base font-semibold px-3 py-1 bg-background">
                                                    {formatDateLabel(dateKey)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mr-2">
                                                <span className="flex items-center gap-1">
                                                    Investimento: <span className="text-foreground">{formatCurrency(group.totalSpend)}</span>
                                                </span>
                                                <div className="h-4 w-[1px] bg-border"></div>
                                                <span className="flex items-center gap-1">
                                                    Leads: <span className="text-foreground">{Math.round(group.totalLeads)}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            {Object.entries(group.platforms).map(([platform, rows]) => {
                                                const isMeta = platform.toLowerCase().includes('meta') || platform.toLowerCase().includes('facebook');
                                                const isGoogle = platform.toLowerCase().includes('google');

                                                // Dynamic Border Color
                                                let borderClass = "border-l-4 border-l-gray-400";
                                                if (isMeta) borderClass = "border-l-4 border-l-blue-600 dark:border-l-blue-500";
                                                if (isGoogle) borderClass = "border-l-4 border-l-amber-500 dark:border-l-amber-400";

                                                return (
                                                    <div key={platform} className={`border rounded-md p-3 bg-card/50 shadow-sm ${borderClass}`}>
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {getPlatformIcon(platform)}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-background px-2 py-0.5 rounded border">
                                                                {rows.length} contas
                                                            </span>
                                                        </div>

                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="hover:bg-transparent border-none">
                                                                    <TableHead className="h-7 text-xs pl-0">Conta</TableHead>
                                                                    <TableHead className="h-7 text-xs text-center w-[60px]">Data</TableHead>
                                                                    <TableHead className="h-7 text-xs text-right">Invest.</TableHead>
                                                                    <TableHead className="h-7 text-xs text-right pr-0">Leads</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {rows.map((row, i) => (
                                                                    <TableRow key={i} className="hover:bg-muted/50 border-none">
                                                                        <TableCell className="py-1.5 text-xs font-medium pl-0">
                                                                            <div className="flex flex-col">
                                                                                <span className="truncate max-w-[160px]" title={row.conta}>{row.conta || "Sem Conta"}</span>
                                                                                {row.conta_id && <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[160px]">{row.conta_id}</span>}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs text-center text-muted-foreground">
                                                                            {formatDateLiteral(row.data_referencia).slice(0, 5)}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs text-right">
                                                                            {formatCurrency(Number(row.investimento_total || (row as any).investimento || 0))}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs text-right pr-0">
                                                                            {Math.round(Number(row.leads_total || (row as any).leads || 0))}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error Details Modal */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedLog?.status === 'ERROR' || selectedLog?.status === 'TIMEOUT' ? (
                                <AlertOctagon className="h-5 w-5 text-red-600" />
                            ) : (
                                <FileText className="h-5 w-5 text-blue-600" />
                            )}
                            Detalhes da Execução
                        </DialogTitle>
                        <DialogDescription>
                            Informações completas sobre o registro de log.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Conta:</span>
                                    <p className="font-medium">{selectedLog.conta || "Sem Conta"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Workflow:</span>
                                    <p className="font-medium">{selectedLog.workflow}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Etapa:</span>
                                    <p className="font-medium">{selectedLog.etapa}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Execution ID:</span>
                                    <p className="font-mono text-xs">{selectedLog.execution_id || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Horário:</span>
                                    <p className="font-medium">{formatDateBR(selectedLog.data_hora)}</p>
                                </div>
                            </div>

                            <div className="rounded-md bg-muted/50 p-3">
                                <span className="text-sm font-medium text-muted-foreground mb-1 block">Mensagem de Erro:</span>
                                <ScrollArea className="h-[150px] w-full rounded border bg-card p-2">
                                    <code className="text-xs text-red-600 dark:text-red-400 font-mono break-all whitespace-pre-wrap">
                                        {selectedLog.error_message || "Sem mensagem de erro capturada."}
                                    </code>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
