-- ============================================================================
-- CREATIVE ANALYSIS MODULE - COMPLETE SCHEMA (v3)
-- ============================================================================
-- Autor: @data-engineer (Flux)
-- Data: 05/02/2026
-- Correção: Usando entity_id e entity_name (colunas corretas da tabela)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA: fact_creative_assets (Cache da Graph API)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_creative_assets (
    ad_id VARCHAR PRIMARY KEY,
    title TEXT,
    body TEXT,
    cta_type VARCHAR,
    image_url TEXT,
    video_id VARCHAR,
    video_thumbnail_url TEXT,
    creative_type VARCHAR,
    fetched_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP,
    is_stale BOOLEAN DEFAULT FALSE,
    fetch_error TEXT,
    fetch_attempts INTEGER DEFAULT 0,
    hook_rate DECIMAL(10,2),
    hold_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_assets_fetched_at 
    ON fact_creative_assets(fetched_at);

-- ----------------------------------------------------------------------------
-- 2. TABELA: fact_creative_insights (Cache do LLM)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_creative_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id VARCHAR NOT NULL,
    copy_tone VARCHAR,
    mental_triggers TEXT[],
    copy_score INTEGER CHECK (copy_score BETWEEN 1 AND 10),
    copy_suggestions TEXT,
    visual_elements TEXT[],
    dominant_colors TEXT[],
    visual_emotion VARCHAR,
    visual_score INTEGER CHECK (visual_score BETWEEN 1 AND 10),
    visual_suggestions TEXT,
    pattern_insights TEXT,
    diagnostico TEXT,
    ab_test_suggestions TEXT[],
    analyzed_at TIMESTAMP DEFAULT NOW(),
    llm_model VARCHAR DEFAULT 'gemini-2.5-flash',
    processing_time_ms INTEGER,
    conversions_at_analysis INTEGER,
    cpl_at_analysis DECIMAL(10,2),
    ctr_at_analysis DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_insights_ad_id 
    ON fact_creative_insights(ad_id);
CREATE INDEX IF NOT EXISTS idx_creative_insights_analyzed_at 
    ON fact_creative_insights(analyzed_at DESC);

-- ----------------------------------------------------------------------------
-- 3. VIEW: vw_creative_analysis_complete (AD LEVEL - REAL!)
-- Agora usando entity_id e entity_name para granularidade de criativo
-- IMPORTANTE: DROP primeiro porque estamos mudando nomes de colunas
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS vw_creative_analysis_complete;

CREATE VIEW vw_creative_analysis_complete AS
SELECT 
    -- Identificadores de Criativo (entity = ad/creative no Meta)
    p.entity_id as ad_id,
    p.entity_name as ad_name,
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
    
    -- Tipo inferido do nome do criativo
    CASE 
        WHEN p.entity_name ILIKE '%video%' OR p.entity_name ILIKE '%vídeo%' THEN 'Vídeo'
        WHEN p.entity_name ILIKE '%carrossel%' OR p.entity_name ILIKE '%carousel%' THEN 'Carrossel'
        WHEN p.entity_name ILIKE '%alcance%' THEN 'Alcance'
        ELSE 'Imagem'
    END as creative_type,
    
    -- Assets reais do cache
    a.title,
    a.body,
    a.image_url,
    (a.ad_id IS NOT NULL) as has_assets,
    (i.id IS NOT NULL) as has_insights

FROM fact_ads_performance_daily p

LEFT JOIN vw_campaign_mapping_readable m 
    ON p.platform = m.platform 
    AND p.campaign_id = m.campaign_id

LEFT JOIN fact_creative_assets a
    ON p.entity_id = a.ad_id

LEFT JOIN LATERAL (
    SELECT id FROM fact_creative_insights 
    WHERE ad_id = p.entity_id 
    ORDER BY analyzed_at DESC 
    LIMIT 1
) i ON TRUE

WHERE p.platform = 'META'
  AND p.entity_id IS NOT NULL
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
    a.ad_id,
    i.id

ORDER BY p.date DESC;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE fact_creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_creative_insights ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read for authenticated users" ON fact_creative_assets;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON fact_creative_insights;
DROP POLICY IF EXISTS "Enable insert for service role" ON fact_creative_assets;
DROP POLICY IF EXISTS "Enable update for service role" ON fact_creative_assets;
DROP POLICY IF EXISTS "Enable insert for service role" ON fact_creative_insights;

CREATE POLICY "Enable read for authenticated users" 
    ON fact_creative_assets
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" 
    ON fact_creative_insights
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" 
    ON fact_creative_assets
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" 
    ON fact_creative_assets
    FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Enable insert for service role" 
    ON fact_creative_insights
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- COMENTÁRIO: Agora temos granularidade REAL de criativo!
-- entity_id = ID do anúncio/criativo no Meta
-- entity_name = Nome do anúncio/criativo no Meta
-- ============================================================================
