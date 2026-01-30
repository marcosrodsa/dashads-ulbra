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
}

export interface FinancialAuditDaily {
    data_referencia: string;
    platform: string;
    account_name: string;
    investimento: number;
    leads: number;
    campaign_count: number;
}
