-- ============================================================================
-- DIAGNOSTICO DE GAIA VIEW E RPC
-- ============================================================================

-- 1. Verificar se a VIEW vw_campaign_mapping_readable existe e está válida
SELECT 
    table_name, 
    view_definition 
FROM information_schema.views 
WHERE table_name = 'vw_campaign_mapping_readable';

-- 2. Verificar colunas da VIEW vw_campaign_mapping_readable
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_campaign_mapping_readable';

-- 3. Testar a execução da função get_gaia_data (Simulação)
-- Se isso falhar, o problema é SQL, não Auth
BEGIN;
    SELECT get_gaia_data('2025-01-01', '2025-01-31', NULL, FALSE, FALSE);
ROLLBACK;
