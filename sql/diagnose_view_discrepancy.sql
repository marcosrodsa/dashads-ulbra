-- ============================================================================
-- DIAGNOSTIC: FIND DISCREPANCY SOURCE
-- Run this in Supabase SQL Editor to see exactly what is missing from the view.
-- ============================================================================

WITH RawStats AS (
    SELECT 
        campaign_name, 
        entity_id,
        SUM(spend) as raw_spend
    FROM fact_ads_performance_daily
    WHERE date = '2026-02-10' 
      AND platform = 'META'
    GROUP BY campaign_name, entity_id
),
ViewStats AS (
    SELECT 
        campaign_name,
        ad_id as entity_id,
        SUM(investimento) as view_spend
    FROM vw_creative_analysis_complete
    WHERE data_referencia = '2026-02-10'
    GROUP BY campaign_name, ad_id
)
SELECT 
    r.campaign_name,
    r.entity_id,
    r.raw_spend,
    COALESCE(v.view_spend, 0) as view_spend,
    (r.raw_spend - COALESCE(v.view_spend, 0)) as diff,
    CASE WHEN r.campaign_name ILIKE '%Ultec%' THEN 'YES' ELSE 'NO' END as is_ultec,
    m.is_ignored as mapping_is_ignored,
    m.unidade_nome
FROM RawStats r
LEFT JOIN ViewStats v ON r.entity_id = v.entity_id
LEFT JOIN vw_campaign_mapping_readable m ON m.campaign_name = r.campaign_name -- Approximate join for checking
WHERE (r.raw_spend - COALESCE(v.view_spend, 0)) > 0.01
ORDER BY diff DESC;
