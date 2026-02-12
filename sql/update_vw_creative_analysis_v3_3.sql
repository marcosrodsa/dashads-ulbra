-- ============================================================================
-- UPDATE: vw_creative_analysis_complete (v3.3) - FIX MISSING SPEND
-- Purpose: Include rows with NULL entity_id to match Budget Page total spend.
--          Generates a synthetic ad_id for these rows to prevent UI errors.
-- ============================================================================

DROP VIEW IF EXISTS vw_creative_analysis_complete;

CREATE OR REPLACE VIEW vw_creative_analysis_complete AS
WITH latest_quick AS (
    SELECT DISTINCT ON (ad_id) ad_id, id, analyzed_at
    FROM fact_creative_insights
    ORDER BY ad_id, analyzed_at DESC
),
latest_contextual AS (
    SELECT DISTINCT ON (ad_id) ad_id, id, analyzed_at
    FROM creative_contextual_insights
    ORDER BY ad_id, analyzed_at DESC
)
SELECT 
    -- Identificadores de Criativo (Synthetic ID if NULL)
    COALESCE(p.entity_id, 'UNKNOWN-' || p.campaign_id || '-' || p.date) as ad_id,
    COALESCE(p.entity_name, 'Anúncio Não Identificado') as ad_name,
    p.campaign_id,
    p.campaign_name,
    p.date as data_referencia,
    p.platform,
    
    -- Classificação via mapping
    COALESCE(m.unidade_nome, 'Outros / Não Identificado') as unidade,
    COALESCE(m.curso_nome, 'Geral') as curso,
    
    -- Métricas agregadas por criativo
    SUM(p.spend) as investimento,
    SUM(p.impressions) as impressoes,
    SUM(p.clicks) as cliques,
    SUM(p.conversions) as conversoes,
    
    -- Métricas calculadas
    CASE 
        WHEN SUM(p.impressions) > 0 
        THEN ROUND((SUM(p.clicks)::DECIMAL / SUM(p.impressions)) * 100, 2)
        ELSE 0 
    END as ctr,
    
    CASE 
        WHEN SUM(p.conversions) > 0 
        THEN ROUND(SUM(p.spend) / SUM(p.conversions), 2)
        ELSE NULL 
    END as cpl,
    
    -- Tipo inferido
    CASE 
        WHEN p.entity_name ILIKE '%video%' OR p.entity_name ILIKE '%vídeo%' THEN 'Vídeo'
        WHEN p.entity_name ILIKE '%carrossel%' OR p.entity_name ILIKE '%carousel%' THEN 'Carrossel'
        WHEN p.entity_name ILIKE '%alcance%' THEN 'Alcance'
        ELSE 'Imagem'
    END as creative_type,
    
    -- Assets reais
    a.title,
    a.body,
    a.image_url,
    a.preview_shareable_link,  -- Link do preview
    a.effective_status,        -- Status (ACTIVE/PAUSED)

    (a.ad_id IS NOT NULL) as has_assets,
    (lq.id IS NOT NULL OR lc.id IS NOT NULL) as has_insights

FROM fact_ads_performance_daily p

LEFT JOIN vw_campaign_mapping_readable m 
    ON p.platform = m.platform 
    AND p.campaign_id = m.campaign_id

LEFT JOIN fact_creative_assets a
    ON p.entity_id = a.ad_id

LEFT JOIN latest_quick lq ON p.entity_id = lq.ad_id
LEFT JOIN latest_contextual lc ON p.entity_id = lc.ad_id

WHERE p.platform = 'META'
  -- REMOVED: AND p.entity_id IS NOT NULL (This was hiding spend)
  AND p.campaign_name NOT ILIKE '%Ultec%'
  AND (m.is_ignored IS NULL OR m.is_ignored = false)

GROUP BY 
    p.entity_id,
    p.entity_name,
    p.campaign_id,
    p.campaign_name,
    p.date,
    p.platform,
    m.unidade_nome,
    m.curso_nome,
    a.title,
    a.body,
    a.image_url,
    a.preview_shareable_link,
    a.effective_status,
    a.ad_id,
    lq.id,
    lc.id

ORDER BY p.date DESC;
