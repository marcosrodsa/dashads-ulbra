DROP VIEW IF EXISTS vw_logs_resumidos CASCADE;
CREATE OR REPLACE VIEW vw_logs_resumidos AS
SELECT 
    -- 1. Agrupa por Hora (Convertendo UTC -> Brasil para exibir certo no Dash)
    date_trunc('hour', start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') as data_hora,
    
    platform as plataforma,
    
    -- 2. Nome da Conta (ou Geral se for nulo)
    COALESCE(additional_info, 'Geral / Sistema') as conta,
    
    -- 3. Resumo das Etapas (Ex: "Request Job + Data Import")
    STRING_AGG(DISTINCT step_name, ' + ') as etapas_concluidas,
    
    -- 4. Status Inteligente (Com detecção de Timeout)
    CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'ERROR') > 0 THEN 'ERROR'
        -- Se está rodando há mais de 3 horas, marca como TIMEOUT (Travou)
        WHEN COUNT(*) FILTER (WHERE status = 'RUNNING') > 0 
             AND MAX(start_time) < (NOW() - INTERVAL '3 hours') THEN 'TIMEOUT'
        WHEN COUNT(*) FILTER (WHERE status = 'RUNNING') > 0 THEN 'RUNNING' 
        ELSE 'SUCCESS'
    END as status_final,
    
    -- 5. Totais
    SUM(COALESCE(records_processed, 0)) as total_registros,
    
    -- 6. Mensagem de Erro (Se houver)
    STRING_AGG(DISTINCT error_message, ' | ') as mensagens_erro

FROM sys_integration_logs
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2;
