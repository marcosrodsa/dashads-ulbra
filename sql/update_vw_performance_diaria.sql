DROP VIEW IF EXISTS vw_performance_diaria2;
CREATE OR REPLACE VIEW vw_performance_diaria2 AS

WITH raw_data AS (
    SELECT 
        date::date as data_referencia, 
        p.platform,
        p.campaign_name,
        p.campaign_id,
        p.spend,
        p.conversions as leads,
        p.clicks,
        p.impressions
    FROM fact_ads_performance_daily p
    WHERE p.campaign_name NOT ILIKE '%Ultec%'
),

-- Join with the mapping table to get user-defined classifications
mapped_data AS (
    SELECT 
        r.data_referencia,
        r.platform,
        r.campaign_name,
        r.campaign_id,
        r.spend,
        r.leads,
        r.clicks,
        r.impressions,
        
        -- Use mapped values, or fallback to 'Outros / Não Identificado' if no mapping exists
        COALESCE(m.unidade_nome, 'Outros / Não Identificado') as unidade,
        COALESCE(m.curso_nome, 'Geral') as curso,
        m.is_ignored
        
    FROM raw_data r
    LEFT JOIN vw_campaign_mapping_readable m 
        ON r.platform = m.platform 
        AND r.campaign_id = m.campaign_id
    
    -- Filter out ignored campaigns (as per mapping rules)
    WHERE (m.is_ignored IS NULL OR m.is_ignored = false)
)

SELECT 
    data_referencia,
    unidade,
    curso,
    platform,
    campaign_name,
    campaign_id,
    
    SUM(spend) as investimento,
    SUM(leads) as leads,
    SUM(clicks) as clicks,
    SUM(impressions) as impressoes,
    
    CASE WHEN SUM(leads) > 0 THEN ROUND(SUM(spend) / SUM(leads), 2) ELSE 0 END as cpl,
    CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(spend) / SUM(clicks), 2) ELSE 0 END as cpc,
    CASE WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::numeric / SUM(impressions)) * 100, 2) ELSE 0 END as ctr
    
FROM mapped_data
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY data_referencia DESC;
