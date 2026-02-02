DROP VIEW IF EXISTS vw_auditoria_diaria CASCADE;
CREATE OR REPLACE VIEW vw_auditoria_diaria AS
SELECT 
    fa.date AS data_referencia,
    fa.platform AS plataforma,
    fa.account_name AS conta,
    fa.account_id AS conta_id,
    COUNT(*) as qtd_registros,
    SUM(fa.spend) as investimento_total,
    SUM(fa.conversions) as leads_total,
    MAX(fa.created_at) as data_criacao,
    MAX(fa.updated_at) as data_atualizacao
FROM fact_ads_performance_daily fa
GROUP BY 1, 2, 3, 4

-- FILTRO MÁGICO AQUI 👇
HAVING SUM(fa.spend) > 0 OR SUM(fa.conversions) > 0

ORDER BY 1 DESC, 5 DESC;