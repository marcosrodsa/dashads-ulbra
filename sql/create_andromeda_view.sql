-- ============================================================================
-- ANDROMEDA-READY PERFORMANCE VIEW (V2 - Logic Refined)
-- ============================================================================

DROP VIEW IF EXISTS vw_andromeda_performance;

CREATE VIEW vw_andromeda_performance AS
WITH daily_stats AS (
    SELECT 
        p.entity_id as ad_id,
        p.entity_name as ad_name,
        p.platform,
        p.date,
        p.spend,
        p.impressions,
        p.conversions,
        CASE WHEN p.conversions > 0 THEN p.spend / p.conversions ELSE NULL END as cpl,
        -- Proxies for advanced metrics (metadata column not present in this table)
        (p.impressions * 0.3) as v3s,
        (p.impressions * 0.15) as thru,
        (p.impressions * 0.85) as reach,
        0.8 as ftr
    FROM fact_ads_performance_daily p
    WHERE p.platform = 'META' AND p.entity_id IS NOT NULL
),
ad_aggregate AS (
    SELECT 
        ad_id,
        ad_name,
        SUM(spend) as total_spend,
        SUM(conversions) as total_conversions,
        SUM(impressions) as total_impressions,
        AVG(cpl) as avg_cpl,
        AVG(v3s) as avg_v3s,
        AVG(thru) as avg_thru,
        -- Saturação
        MAX(v3s / NULLIF(reach, 0)) as current_frequency, -- Simplificado
        AVG(ftr) as avg_first_time_ratio,
        
        -- Hook/Hold Explícito
        (SUM(v3s)::DECIMAL / NULLIF(SUM(impressions), 0)) as avg_hook_rate,
        (SUM(thru)::DECIMAL / NULLIF(SUM(v3s), 0)) as avg_hold_rate,
        
        COUNT(DISTINCT date) as days_active,
        -- Estabilidade do Comportamento (Behavioral Stability)
        COALESCE(REGR_SLOPE(cpl, EXTRACT(EPOCH FROM date)/86400), 0) as cpl_slope,
        COALESCE(REGR_R2(cpl, EXTRACT(EPOCH FROM date)/86400), 0) as stability_r2,
        -- Identificação de Formato
        CASE 
            WHEN ad_name ILIKE '%video%' OR ad_name ILIKE '%vídeo%' THEN 'Vídeo'
            ELSE 'Imagem'
        END as format
    FROM daily_stats
    GROUP BY ad_id, ad_name
),
andromeda_logic AS (
    SELECT 
        *,
        -- 1. Eficiência (CPL) - 40%
        CASE 
            WHEN total_conversions > 0 AND (total_spend / total_conversions) < 15 THEN 100
            WHEN total_conversions > 0 AND (total_spend / total_conversions) < 25 THEN 70
            ELSE 30
        END as efficiency_score,
        -- 2. Volume de Dados - 25% (Base da Confiança)
        LEAST((total_conversions / 50.0) * 100, 100) as volume_score,
        -- 3. Estabilidade do Comportamento (R²) - 15%
        (stability_r2 * 100) as stability_score,
        -- 4. Tendência de Fadiga (Slope) - 20%
        CASE 
            WHEN cpl_slope > 0.5 THEN 0
            WHEN cpl_slope > 0.1 THEN 40
            WHEN cpl_slope < 0 THEN 100
            ELSE 70
        END as fatigue_score,
        -- Confiança Andromeda (50% Conv, 30% Gasto, 20% Dias)
        (
            (LEAST(total_conversions / 20.0, 1.0) * 0.5) +
            (LEAST(total_spend / 500.0, 1.0) * 0.3) +
            (LEAST(days_active / 14.0, 1.0) * 0.2)
        ) * 100 as confidence_score
    FROM ad_aggregate
)
SELECT 
    *,
    -- Health Score atualizado (Pesos PM 2026)
    ROUND((
        (efficiency_score * 0.40) + 
        (volume_score * 0.25) + 
        (stability_score * 0.15) + 
        (fatigue_score * 0.20)
    )) as health_score,
    -- 6. Régua de ação em 4 níveis (PM 2026)
    CASE 
        WHEN total_conversions < 10 OR days_active < 7 THEN 'AGUARDAR'
        WHEN stability_r2 < 0.4 THEN 'LIMITAR CPA'
        WHEN cpl_slope > 0.3 OR avg_first_time_ratio < 0.2 THEN 'TROCAR CRIATIVO'
        WHEN health_score < 40 THEN 'PAUSAR'
        ELSE 'MANTER'
    END as recommended_action
FROM andromeda_logic;
