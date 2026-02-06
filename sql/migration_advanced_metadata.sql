-- ============================================================================
-- ADVANCED CREATIVE FIELDS & REFINED METRICS
-- ============================================================================

-- 1. Adding advanced metadata fields to fact_creative_assets
ALTER TABLE fact_creative_assets 
ADD COLUMN IF NOT EXISTS preview_shareable_link TEXT,
ADD COLUMN IF NOT EXISTS ad_labels TEXT[],
ADD COLUMN IF NOT EXISTS recommendations JSONB,
ADD COLUMN IF NOT EXISTS effective_status VARCHAR;

-- 2. Add comments for clarity
COMMENT ON COLUMN fact_creative_assets.preview_shareable_link IS 'URL para visualizar o anúncio no feed do Meta';
COMMENT ON COLUMN fact_creative_assets.ad_labels IS 'Etiquetas organizacionais do anúncio no Meta';
COMMENT ON COLUMN fact_creative_assets.recommendations IS 'Sugestões de qualidade e auditoria da Meta';
COMMENT ON COLUMN fact_creative_assets.effective_status IS 'Status real de veiculação do anúncio';

-- 3. Update view to include new fields for the UI
DROP VIEW IF EXISTS vw_creative_analysis_complete;

CREATE VIEW vw_creative_analysis_complete AS
SELECT 
    p.entity_id as ad_id,
    p.entity_name as ad_name,
    p.campaign_id,
    p.campaign_name,
    p.date as data_referencia,
    p.platform,
    COALESCE(m.unidade_nome, 'Outros / Não Identificado') as unidade,
    COALESCE(m.curso_nome, 'Geral') as curso,
    SUM(p.spend) as investimento,
    SUM(p.impressions) as impressoes,
    SUM(p.clicks) as cliques,
    SUM(p.conversions) as conversoes,
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
    COALESCE(
        CASE 
            WHEN a.creative_type = 'VIDEO' THEN 'Vídeo'
            WHEN a.creative_type = 'CAROUSEL' THEN 'Carrossel'
            WHEN a.creative_type = 'IMAGE' THEN 'Imagem'
        END,
        CASE 
            WHEN p.entity_name ILIKE '%video%' OR p.entity_name ILIKE '%vídeo%' THEN 'Vídeo'
            WHEN p.entity_name ILIKE '%carrossel%' OR p.entity_name ILIKE '%carousel%' THEN 'Carrossel'
            ELSE 'Imagem'
        END
    ) as creative_type,
    a.title,
    a.body,
    COALESCE(a.image_url, a.video_thumbnail_url) as image_url,
    a.preview_shareable_link,
    a.effective_status,
    a.hook_rate,
    a.hold_rate,
    (a.ad_id IS NOT NULL) as has_assets,
    (i.id IS NOT NULL) as has_insights
FROM fact_ads_performance_daily p
LEFT JOIN vw_campaign_mapping_readable m ON p.platform = m.platform AND p.campaign_id = m.campaign_id
LEFT JOIN fact_creative_assets a ON p.entity_id = a.ad_id
LEFT JOIN LATERAL (
    SELECT id FROM fact_creative_insights 
    WHERE ad_id = p.entity_id 
    ORDER BY analyzed_at DESC 
    LIMIT 1
) i ON TRUE
WHERE p.platform = 'META'
  AND p.entity_id IS NOT NULL
GROUP BY 
    p.entity_id, p.entity_name, p.campaign_id, p.campaign_name, p.date, p.platform,
    m.unidade_nome, m.curso_nome, a.title, a.body, a.image_url, a.preview_shareable_link, 
    a.effective_status, a.hook_rate, a.hold_rate, a.ad_id, i.id;
