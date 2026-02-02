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
    conta_id?: string;
    qtd_registros: number;
    investimento_total: number;
    leads_total: number;
    data_criacao: string;
    data_atualizacao: string;
}

export interface LogSummary {
    data_hora: string;
    plataforma: string;
    conta: string;
    etapas_concluidas: string;
    status_final: 'SUCCESS' | 'ERROR' | 'RUNNING' | 'TIMEOUT';
    total_registros: number;
    mensagens_erro?: string;
}

export interface LogDetailed {
    log_id: string;
    data_hora: string;
    plataforma: string;
    conta: string;
    workflow: string;
    etapa: string;
    status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING' | 'RUNNING' | 'TIMEOUT';
    registros: number;
    error_message?: string;
    execution_id?: string;
}
