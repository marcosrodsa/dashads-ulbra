
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, AlertOctagon, CheckCircle2, AlertTriangle, Clock, RotateCcw, Database, DollarSign, RefreshCcw } from "lucide-react";
import * as React from "react";

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
import { getSupabaseClient } from "@/integrations/supabase/client";
import type { SystemIntegrationLog, FinancialAuditDaily } from "@/integrations/supabase/systemStatusSchema";

const client = getSupabaseClient();

// --- Helpers ---
function formatCurrency(val: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function formatDateBR(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    try {
        return new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit" // Added seconds for logs precision
        }).format(new Date(dateStr));
    } catch (e) {
        return "-";
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'SUCCESS': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>;
        case 'ERROR': return <Badge variant="destructive"><AlertOctagon className="w-3 h-3 mr-1" /> Error</Badge>;
        case 'WARNING': return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
        case 'RUNNING': return <Badge variant="outline" className="text-blue-600 border-blue-600"><Activity className="w-3 h-3 mr-1 animate-pulse" /> Running</Badge>;
        default: return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
}

function getPlatformIcon(platform: string) {
    const p = (platform || "").toLowerCase();
    if (p.includes("meta") || p.includes("facebook")) return <span className="text-blue-600 font-bold">META</span>;
    if (p.includes("google")) return <span className="text-green-600 font-bold">GOOGLE</span>;
    return <span className="text-muted-foreground">{platform}</span>;
}

export default function SystemStatus() {
    // 1. Logs Query
    const logsQuery = useQuery({
        queryKey: ["sys-logs"],
        queryFn: async () => {
            const { data, error } = await client
                .from("sys_integration_logs")
                .select("*")
                .order("start_time", { ascending: false })
                .limit(50);

            if (error) {
                // Mock return if table doesn't exist yet for dev
                console.warn("sys_integration_logs mock used", error);
                return [
                    { id: '123', start_time: new Date().toISOString(), end_time: new Date().toISOString(), workflow_name: "Meta Ads ETL - Processor", step_name: "Data Import", platform: "META", status: "SUCCESS", error_message: null, records_processed: 50, additional_info: "Ulbra Geral (123456)" },
                    { id: '124', start_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(), end_time: null, workflow_name: "Google Ads ETL", step_name: "Request Job", platform: "GOOGLE", status: "ERROR", error_message: "Timeout Connection", records_processed: 0, additional_info: "Ulbra Search (987654)" },
                ] as SystemIntegrationLog[];
            }
            return data as SystemIntegrationLog[];
        },
        refetchInterval: 30000 // Auto refresh every 30s
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
                console.warn("vw_auditoria_diaria mock used", error);
                return [
                    { data_referencia: "2024-01-29", plataforma: "Meta", conta: "Ulbra Geral", investimento_total: 1250.50, leads_total: 45, qtd_registros: 5, ultima_atualizacao: new Date().toISOString() },
                    { data_referencia: "2024-01-29", plataforma: "Google", conta: "Ulbra Search", investimento_total: 890.00, leads_total: 22, qtd_registros: 3, ultima_atualizacao: new Date().toISOString() },
                    { data_referencia: "2024-01-28", plataforma: "Meta", conta: "Ulbra Geral", investimento_total: 1100.00, leads_total: 40, qtd_registros: 5, ultima_atualizacao: new Date().toISOString() },
                ] as FinancialAuditDaily[];
            }
            return data as FinancialAuditDaily[];
        }
    });

    // 3. Stats Calculation
    const stats = React.useMemo(() => {
        const logs = logsQuery.data || [];
        const todayStr = new Date().toISOString().split('T')[0];

        const todayLogs = logs.filter(l => l.start_time.startsWith(todayStr));
        const todayExecutions = todayLogs.length; // Approximate since we only fetch 50, but usually enough for "Recent" status
        const failures24h = logs.filter(l => l.status === 'ERROR').length; // In last 50 logs

        // Financial Volume Today
        const audit = auditQuery.data || [];
        const todayAudit = audit.filter(a => a.data_referencia === todayStr);
        const todayVolume = todayAudit.reduce((acc, curr) => {
            const val = Number(curr.investimento_total) || Number((curr as any).investimento) || Number((curr as any).spend) || 0;
            return acc + val;
        }, 0);

        return { todayExecutions, failures24h, todayVolume };
    }, [logsQuery.data, auditQuery.data]);

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
                        <CardTitle className="text-sm font-medium">Execuções Hoje (Estimado)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayExecutions}</div>
                        <p className="text-xs text-muted-foreground">Baseado nos últimos logs</p>
                    </CardContent>
                </Card>
                <Card className={stats.failures24h > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${stats.failures24h > 0 ? "text-red-600" : ""}`}>Falhas Recentes (24h)</CardTitle>
                        <AlertOctagon className={`h-4 w-4 ${stats.failures24h > 0 ? "text-red-600" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.failures24h > 0 ? "text-red-600" : ""}`}>{stats.failures24h}</div>
                        <p className="text-xs text-muted-foreground">Últimas 50 execuções</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume Processado (Hoje)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.todayVolume)}</div>
                        <p className="text-xs text-muted-foreground">Total contabilizado nas views</p>
                    </CardContent>
                </Card>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Logs de Execução</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Horário</TableHead>
                                    <TableHead>Plataforma</TableHead>
                                    <TableHead>Conta</TableHead>
                                    <TableHead>Workflow / Passo</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Infos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logsQuery.isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : logsQuery.data?.map((log) => (
                                    <TableRow key={log.id} className={log.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                        <TableCell className="font-mono text-xs whitespace-nowrap">
                                            {formatDateBR(log.start_time)}
                                        </TableCell>
                                        <TableCell>{getPlatformIcon(log.platform)}</TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {log.additional_info || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{log.workflow_name}</span>
                                                <span className="text-xs text-muted-foreground">{log.step_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[250px]">
                                            {log.error_message ? (
                                                <span className="text-red-600 font-medium" title={log.error_message}>{log.error_message}</span>
                                            ) : (
                                                <span>{log.records_processed} registros</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Plataforma</TableHead>
                                    <TableHead>Conta</TableHead>
                                    <TableHead>Investimento</TableHead>
                                    <TableHead>Leads</TableHead>
                                    <TableHead>Atualização</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditQuery.isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : auditQuery.data?.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{format(new Date(row.data_referencia), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{getPlatformIcon(row.plataforma || (row as any).platform)}</TableCell>
                                        <TableCell>{row.conta || (row as any).account_name || (row as any).account || "-"}</TableCell>
                                        <TableCell className="font-medium">
                                            {formatCurrency(Number(row.investimento_total || (row as any).investimento || 0))}
                                        </TableCell>
                                        <TableCell>{row.leads_total || (row as any).leads || 0}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDateBR(row.ultima_atualizacao)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
