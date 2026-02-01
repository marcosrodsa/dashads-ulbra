CREATE OR REPLACE VIEW vw_auditoria_diaria AS
SELECT 
    fa.date AS data_referencia,
    fa.platform AS plataforma,
    fa.account_name AS conta,
    COUNT(*) as qtd_registros,
    SUM(fa.spend) as investimento_total,
    SUM(fa.conversions) as leads_total,
    MAX(fa.loaded_at) as ultima_atualizacao
FROM fact_ads_performance_daily fa
GROUP BY 1, 2, 3

-- FILTRO MÁGICO AQUI 👇
HAVING SUM(fa.spend) > 0 OR SUM(fa.conversions) > 0

ORDER BY 1 DESC, 5 DESC;