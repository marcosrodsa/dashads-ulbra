-- ============================================================================
-- UPDATE: vw_creative_analysis_complete (v3.6) - DAILY METRICS & CALCULATED RATES
-- ============================================================================
-- Purpose: 
-- 1. Source 'Reach', 'Frequency', 'Video Views' from fact_ads_performance_daily
-- 2. Calculate Hook Rate and Hold Rate dynamically (SUM/SUM) instead of static.
-- 3. Retain 'Ultec' logic and entity_id fixes from v3.5.
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
    -- Identificadores de Criativo
    COALESCE(p.entity_id, 'UNKNOWN-' || p.campaign_id || '-' || p.date) as ad_id,
    COALESCE(p.entity_name, 'Anúncio Não Identificado') as ad_name,
    p.campaign_id,
    p.campaign_name,
    p.date as data_referencia,
    p.platform,
    
    -- Classificação via mapping
    COALESCE(m.unidade_nome, 'Outros / Não Identificado') as unidade,
    COALESCE(m.curso_nome, 'Geral') as curso,
    
    -- Métricas Financeiras
    SUM(p.spend) as investimento,
    SUM(p.impressions) as impressoes,
    SUM(p.clicks) as cliques, -- Estritamente Cliques no Link
    SUM(p.conversions) as conversoes,
    
    -- Métricas de Alcance (Daily Source)
    -- Reach is additive for a single day, but usually not across days. 
    -- Since this view is grouped by Date, SUM(Reach) is correct for that day.
    SUM(p.reach) as reach,
    
    -- Frequência Calculada (Impressions / Reach)
    CASE 
        WHEN SUM(p.reach) > 0 
        THEN ROUND((SUM(p.impressions)::DECIMAL / SUM(p.reach)), 2)
        ELSE 0 
    END as frequency,
    
    -- CTR (Link)
    CASE 
        WHEN SUM(p.impressions) > 0 
        THEN ROUND((SUM(p.clicks)::DECIMAL / SUM(p.impressions)) * 100, 2)
        ELSE 0 
    END as ctr,
    
    -- CPL
    CASE 
        WHEN SUM(p.conversions) > 0 
        THEN ROUND(SUM(p.spend) / SUM(p.conversions), 2)
        ELSE NULL 
    END as cpl,
    
    -- HOOK RATE
    -- Vídeos: (3-Sec Video Views / Impressions) * 100
    -- Imagens: (Clicks All / Impressions) * 100 -> Mede parada de scroll
    CASE 
        -- Se for Vídeo
        WHEN (p.entity_name ILIKE '%video%' OR p.entity_name ILIKE '%vídeo%' OR SUM(p.video_3_sec_watched_actions) > 0)
        THEN 
            CASE 
                WHEN SUM(p.impressions) > 0 
                THEN 
                    ROUND(
                        (
                            SUM(
                                CASE 
                                    WHEN p.video_3_sec_watched_actions > 0 THEN p.video_3_sec_watched_actions
                                    ELSE COALESCE(
                                        (
                                            SELECT (elem->>'value')::DECIMAL
                                            FROM jsonb_array_elements(p.raw_data->'actions') AS elem
                                            WHERE elem->>'action_type' = 'video_view'
                                            LIMIT 1
                                        ), 
                                        0
                                    )
                                END
                            )::DECIMAL / SUM(p.impressions)
                        ) * 100, 2
                    )
                ELSE 0 
            END
        -- Se for Imagem: Usa o CTR All (Proxy de parada de scroll)
        ELSE 
            CASE 
                WHEN SUM(p.impressions) > 0 
                THEN ROUND((SUM(COALESCE(NULLIF(p.clicks_all, 0), p.clicks, 0))::DECIMAL / SUM(p.impressions)) * 100, 2)
                ELSE 0 
            END
    END as hook_rate,
    
    -- HOLD RATE
    -- Vídeos: (ThruPlays / 3-Sec Video Views) * 100 -> Mede retenção pós-gancho
    -- Imagens: (Cliques no Link / Cliques Todos) * 100 -> Mede engajamento com a peça
    CASE 
        -- Se for Vídeo
        WHEN (p.entity_name ILIKE '%video%' OR p.entity_name ILIKE '%vídeo%' OR SUM(p.video_3_sec_watched_actions) > 0)
        THEN
            CASE 
                WHEN SUM(
                    CASE 
                        WHEN p.video_3_sec_watched_actions > 0 THEN p.video_3_sec_watched_actions
                        ELSE COALESCE(
                            (
                                SELECT (elem->>'value')::DECIMAL
                                FROM jsonb_array_elements(p.raw_data->'actions') AS elem
                                WHERE elem->>'action_type' = 'video_view'
                                LIMIT 1
                            ), 
                            0
                        )
                    END
                ) > 0 
                THEN 
                    ROUND(
                        (
                            SUM(
                                CASE 
                                    WHEN p.video_thru_plays > 0 THEN p.video_thru_plays
                                    ELSE COALESCE(
                                        (
                                            SELECT (elem->>'value')::DECIMAL
                                            FROM jsonb_array_elements(p.raw_data->'actions') AS elem
                                            WHERE elem->>'action_type' = 'video_thruplay'
                                            LIMIT 1
                                        ), 
                                        0
                                    )
                                END
                            )::DECIMAL / 
                            SUM(
                                CASE 
                                    WHEN p.video_3_sec_watched_actions > 0 THEN p.video_3_sec_watched_actions
                                    ELSE COALESCE(
                                        (
                                            SELECT (elem->>'value')::DECIMAL
                                            FROM jsonb_array_elements(p.raw_data->'actions') AS elem
                                            WHERE elem->>'action_type' = 'video_view'
                                            LIMIT 1
                                        ), 
                                        0
                                    )
                                END
                            )
                        ) * 100, 2
                    )
                ELSE 0 
            END
        -- Se for Imagem: Hold = (Link Clicks / All Clicks) -> Mede quem "prosseguiu" da imagem para o link
        ELSE 
            CASE 
                WHEN SUM(COALESCE(NULLIF(p.clicks_all, 0), p.clicks, 0)) > 0 
                THEN ROUND((SUM(p.clicks)::DECIMAL / SUM(COALESCE(NULLIF(p.clicks_all, 0), p.clicks, 0))) * 100, 2)
                ELSE 0 
            END
    END as hold_rate,
    
    -- Tipo inferido
    CASE 
        WHEN p.entity_name ILIKE '%video%' OR p.entity_name ILIKE '%vídeo%' THEN 'Vídeo'
        WHEN p.entity_name ILIKE '%carrossel%' OR p.entity_name ILIKE '%carousel%' THEN 'Carrossel'
        WHEN p.entity_name ILIKE '%alcance%' THEN 'Alcance'
        ELSE 'Imagem'
    END as creative_type,
    
    -- Assets Estáticos (Metadata only)
    a.title,
    a.body,
    a.image_url,
    a.preview_shareable_link,
    a.effective_status,
    
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
  AND (
      (m.is_ignored IS NULL OR m.is_ignored = false) 
      OR 
      p.campaign_name ILIKE '%Ultec%'
  )

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
