export interface SystemIntegrationLog {
    id: string;
    start_time: string;
    end_time: string | null;
    workflow_name: string;
    step_name: string;
    platform: string;
    status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING' | 'RUNNING';
    error_message?: string;
    records_processed?: number;
    execution_id?: string;
    additional_info?: string;
}

export interface FinancialAuditDaily {
    data_referencia: string;
    plataforma: string;
    conta: string;
    qtd_registros: number;
    investimento_total: number;
    leads_total: number;
    ultima_atualizacao: string;
}
