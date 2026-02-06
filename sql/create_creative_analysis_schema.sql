-- ============================================================================
-- CREATIVE ANALYSIS MODULE - DATABASE SCHEMA
-- ============================================================================
-- Autor: @data-engineer
-- Data: 04/02/2026
-- Projeto: DashAds ULBRA - Creative Intelligence
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA: fact_creative_assets
-- Armazena assets criativos buscados da Meta Graph API (cache)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_creative_assets (
    -- Identificadores
    ad_id VARCHAR PRIMARY KEY,
    
    -- Dados do Creative (Meta Graph API)
    title TEXT,                          -- Título do anúncio
    body TEXT,                           -- Corpo do texto
    cta_type VARCHAR,                    -- Tipo de CTA (LEARN_MORE, SIGN_UP, etc)
    image_url TEXT,                      -- URL da imagem
    video_id VARCHAR,                    -- ID do vídeo (se aplicável)
    video_thumbnail_url TEXT,            -- Thumbnail do vídeo
    creative_type VARCHAR,               -- 'image', 'video', 'carousel'
    
    -- Metadata de Cache
    fetched_at TIMESTAMP DEFAULT NOW(),  -- Quando foi buscado
    last_updated TIMESTAMP,              -- Última atualização
    is_stale BOOLEAN DEFAULT FALSE,      -- Marcar para re-fetch
    
    -- Controle de Erro
    fetch_error TEXT,                    -- Mensagem de erro (se houver)
    fetch_attempts INTEGER DEFAULT 0,    -- Tentativas de fetch
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_creative_assets_fetched_at 
    ON fact_creative_assets(fetched_at);
CREATE INDEX IF NOT EXISTS idx_creative_assets_creative_type 
    ON fact_creative_assets(creative_type);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_creative_assets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creative_assets_timestamp
    BEFORE UPDATE ON fact_creative_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_creative_assets_timestamp();

-- ----------------------------------------------------------------------------
-- 2. TABELA: fact_creative_insights
-- Armazena análises qualitativas geradas pelo Gemini LLM
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_creative_insights (
    -- Identificadores
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id VARCHAR NOT NULL,
    
    -- Análise de Copy
    copy_tone VARCHAR,                   -- 'urgente', 'emocional', 'racional'
    mental_triggers TEXT[],              -- ['escassez', 'prova_social', 'autoridade']
    copy_score INTEGER CHECK (copy_score BETWEEN 1 AND 10),
    copy_suggestions TEXT,               -- Sugestões de otimização
    
    -- Análise Visual
    visual_elements TEXT[],              -- ['pessoa', 'texto_overlay', 'logo']
    dominant_colors TEXT[],              -- ['azul', 'branco', 'vermelho']
    visual_emotion VARCHAR,              -- 'aspiracional', 'confiança', 'urgência'
    visual_score INTEGER CHECK (visual_score BETWEEN 1 AND 10),
    visual_suggestions TEXT,             -- Sugestões visuais
    
    -- Análise Comparativa
    pattern_insights TEXT,               -- Insights de padrões vs. outros criativos
    ab_test_suggestions TEXT[],          -- Sugestões de variações para teste A/B
    
    -- Metadata da Análise
    analyzed_at TIMESTAMP DEFAULT NOW(),
    llm_model VARCHAR DEFAULT 'gemini-2.0-flash-exp',
    processing_time_ms INTEGER,          -- Tempo de processamento
    
    -- Performance Context (snapshot do momento da análise)
    conversions_at_analysis INTEGER,
    cpl_at_analysis DECIMAL(10,2),
    ctr_at_analysis DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Key
    CONSTRAINT fk_creative_insights_ad_id 
        FOREIGN KEY (ad_id) 
        REFERENCES fact_creative_assets(ad_id)
        ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_creative_insights_ad_id 
    ON fact_creative_insights(ad_id);
CREATE INDEX IF NOT EXISTS idx_creative_insights_analyzed_at 
    ON fact_creative_insights(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_creative_insights_copy_score 
    ON fact_creative_insights(copy_score DESC);
CREATE INDEX IF NOT EXISTS idx_creative_insights_visual_score 
    ON fact_creative_insights(visual_score DESC);

-- ----------------------------------------------------------------------------
-- 3. VIEW: vw_creative_analysis_complete
-- Combina performance + assets + insights para dashboard
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_creative_analysis_complete AS
SELECT 
    -- Performance Data (fact_ads_performance_daily)
    p.ad_id,
    p.date as data_referencia,
    p.campaign_name,
    p.platform,
    
    -- Classificação (reutilizar lógica existente de vw_performance_diaria2)
    COALESCE(m.unidade_nome, 'Outros / Não Identificado') as unidade,
    COALESCE(m.curso_nome, 'Geral') as curso,
    
    -- Métricas de Performance (agregadas)
    SUM(p.spend) as investimento,
    SUM(p.impressions) as impressoes,
    SUM(p.clicks) as cliques,
    SUM(p.conversions) as conversoes,
    
    -- Métricas Calculadas
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
    
    -- Creative Assets (fact_creative_assets)
    ca.title,
    ca.body,
    ca.cta_type,
    ca.image_url,
    ca.video_id,
    ca.video_thumbnail_url,
    ca.creative_type,
    ca.fetched_at as assets_fetched_at,
    
    -- Insights LLM (fact_creative_insights) - pegar a análise mais recente
    ci.copy_tone,
    ci.mental_triggers,
    ci.copy_score,
    ci.copy_suggestions,
    ci.visual_emotion,
    ci.visual_score,
    ci.visual_suggestions,
    ci.pattern_insights,
    ci.ab_test_suggestions,
    ci.analyzed_at as insights_analyzed_at,
    
    -- Status Flags
    CASE 
        WHEN ca.ad_id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as has_assets,
    
    CASE 
        WHEN ci.id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as has_insights

FROM fact_ads_performance_daily p

-- Join com mapping de campanhas (unidade/curso)
LEFT JOIN vw_campaign_mapping_readable m 
    ON p.platform = m.platform 
    AND p.campaign_id = m.campaign_id

-- Join com creative assets
LEFT JOIN fact_creative_assets ca 
    ON p.ad_id = ca.ad_id

-- Join com insights (pegar apenas a análise mais recente)
LEFT JOIN LATERAL (
    SELECT *
    FROM fact_creative_insights
    WHERE ad_id = p.ad_id
    ORDER BY analyzed_at DESC
    LIMIT 1
) ci ON TRUE

WHERE p.platform = 'META'  -- Apenas Meta Ads
  AND p.ad_id IS NOT NULL
  AND p.campaign_name NOT ILIKE '%Ultec%'
  AND (m.is_ignored IS NULL OR m.is_ignored = false)

GROUP BY 
    p.ad_id,
    p.date,
    p.campaign_name,
    p.platform,
    m.unidade_nome,
    m.curso_nome,
    ca.title,
    ca.body,
    ca.cta_type,
    ca.image_url,
    ca.video_id,
    ca.video_thumbnail_url,
    ca.creative_type,
    ca.fetched_at,
    ci.id,
    ci.copy_tone,
    ci.mental_triggers,
    ci.copy_score,
    ci.copy_suggestions,
    ci.visual_emotion,
    ci.visual_score,
    ci.visual_suggestions,
    ci.pattern_insights,
    ci.ab_test_suggestions,
    ci.analyzed_at

ORDER BY p.date DESC;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- Garantir que apenas usuários autenticados possam acessar
-- ----------------------------------------------------------------------------

-- Habilitar RLS nas novas tabelas
ALTER TABLE fact_creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_creative_insights ENABLE ROW LEVEL SECURITY;

-- Política: Leitura para usuários autenticados
CREATE POLICY "Enable read for authenticated users" 
    ON fact_creative_assets
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" 
    ON fact_creative_insights
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política: Escrita apenas via service role (Edge Functions)
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

-- ----------------------------------------------------------------------------
-- 5. FUNÇÕES AUXILIARES
-- ----------------------------------------------------------------------------

-- Função para marcar assets como stale (forçar re-fetch)
CREATE OR REPLACE FUNCTION mark_creative_assets_stale(ad_ids VARCHAR[])
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE fact_creative_assets
    SET is_stale = TRUE
    WHERE ad_id = ANY(ad_ids);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar cache antigo (> 30 dias sem uso)
CREATE OR REPLACE FUNCTION cleanup_stale_creative_assets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM fact_creative_assets
    WHERE fetched_at < NOW() - INTERVAL '30 days'
      AND ad_id NOT IN (
          SELECT DISTINCT ad_id 
          FROM fact_ads_performance_daily 
          WHERE date > NOW() - INTERVAL '30 days'
      );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- COMENTÁRIOS FINAIS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE fact_creative_assets IS 
'Cache de assets criativos buscados da Meta Graph API. TTL: 7 dias.';

COMMENT ON TABLE fact_creative_insights IS 
'Análises qualitativas de criativos geradas pelo Gemini LLM. Permanente.';

COMMENT ON VIEW vw_creative_analysis_complete IS 
'View consolidada para dashboard de análise de criativos (performance + assets + insights).';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
