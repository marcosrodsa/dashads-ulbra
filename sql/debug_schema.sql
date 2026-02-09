-- ============================================================================
-- DIAGNOSTICO DE SCHEMA E PERMISSÕES
-- ============================================================================
-- Execute este script no SQL Editor para vermos o estado real das tabelas.
-- Copie o resultado (formato texto ou CSV) e me mande.
-- ============================================================================

-- 1. Listar colunas da tabela de Orçamento
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'fact_ads_budget'
ORDER BY ordinal_position;

-- 2. Listar colunas da tabela de Performance
SELECT 
    table_name, 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'fact_ads_performance_daily'
ORDER BY ordinal_position;

-- 3. Verificar Policies (RLS)
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename IN ('fact_ads_budget', 'fact_ads_performance_daily');

-- 4. Verificar se a função gaia-chat (get_gaia_data) existe e seus argumentos
SELECT 
    routine_name, 
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'get_gaia_data';
