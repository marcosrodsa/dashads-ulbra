DROP VIEW IF EXISTS vw_logs_detalhados CASCADE;
CREATE OR REPLACE VIEW vw_logs_detalhados AS
SELECT 
    id as log_id,
    start_time as data_hora, -- Mantém timestamp com timezone para o front tratar
    TO_CHAR(start_time AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') as horario_brasilia,
    platform as plataforma,
    COALESCE(additional_info, 'Geral / Sistema') as conta,
    workflow_name as workflow,
    step_name as etapa,
    status,
    COALESCE(records_processed, 0) as registros,
    error_message,
    execution_id
FROM sys_integration_logs
ORDER BY start_time DESC;
