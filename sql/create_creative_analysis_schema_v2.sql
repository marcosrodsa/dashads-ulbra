-- ============================================================================
-- CREATIVE ANALYSIS MODULE - SIMPLIFIED VIEW (Campaign Level)
-- ============================================================================
-- Autor: @data-engineer (Flux)
-- Data: 05/02/2026
-- Nota: Esta é uma versão simplificada que funciona sem ad_id
--       Para granularidade de criativo, será necessário adicionar ad_id à ingestão
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
    ab_test_suggestions TEXT[],
    analyzed_at TIMESTAMP DEFAULT NOW(),
    llm_model VARCHAR DEFAULT 'gemini-2.0-flash-exp',
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
-- 3. VIEW: vw_creative_analysis_complete (CAMPAIGN LEVEL - Simplificada)
-- Funciona sem ad_id, usando campaign_id como identificador único
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_creative_analysis_complete AS
SELECT 
    -- Identificador (usando campaign_id como proxy para ad_id até termos granularidade real)
    p.campaign_id as ad_id,
    p.date as data_referencia,
    p.campaign_name,
    p.platform,
    
    -- Classificação via mapping
    COALESCE(m.unidade_nome, 'Outros / Não Identificado') as unidade,
    COALESCE(m.curso_nome, 'Geral') as curso,
    
    -- Métricas agregadas
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
    
    -- Tipo inferido do nome da campanha (placeholder até termos dados reais)
    CASE 
        WHEN p.campaign_name ILIKE '%video%' OR p.campaign_name ILIKE '%vídeo%' THEN 'Vídeo'
        WHEN p.campaign_name ILIKE '%carrossel%' OR p.campaign_name ILIKE '%carousel%' THEN 'Carrossel'
        ELSE 'Imagem'
    END as creative_type,
    
    -- Placeholders para assets (serão populados quando tivermos Graph API)
    NULL::TEXT as title,
    NULL::TEXT as body,
    FALSE as has_assets,
    FALSE as has_insights

FROM fact_ads_performance_daily p

LEFT JOIN vw_campaign_mapping_readable m 
    ON p.platform = m.platform 
    AND p.campaign_id = m.campaign_id

WHERE p.platform = 'META'
  AND p.campaign_name NOT ILIKE '%Ultec%'
  AND (m.is_ignored IS NULL OR m.is_ignored = false)

GROUP BY 
    p.campaign_id,
    p.date,
    p.campaign_name,
    p.platform,
    m.unidade_nome,
    m.curso_nome

ORDER BY p.date DESC;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE fact_creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_creative_insights ENABLE ROW LEVEL SECURITY;

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
-- COMENTÁRIO: Para obter granularidade real de criativo (ad_id):
-- 1. Adicionar coluna ad_id à tabela fact_ads_performance_daily
-- 2. Ajustar o conector Meta para trazer o ad_id na ingestão
-- 3. Atualizar esta view para usar p.ad_id ao invés de p.campaign_id
-- ============================================================================
