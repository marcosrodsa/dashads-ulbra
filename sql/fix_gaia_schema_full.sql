-- ============================================================================
-- FIX DEFINITIVO: GAIA CHAT RPC (BYPASS VIEW) - V2
-- Corrige erro "column impressions does not exist" na subquery
-- ============================================================================

DROP FUNCTION IF EXISTS get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION get_gaia_data(
  p_start_date DATE, 
  p_end_date DATE,
  p_unidade TEXT DEFAULT NULL,
  p_curso TEXT DEFAULT NULL,
  p_hide_branding BOOLEAN DEFAULT FALSE,
  p_exclude_ead BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily JSONB;
  v_creatives JSONB;
  v_where TEXT;
BEGIN
  -- 1. Construir Cláusula WHERE Dinâmica
  -- Note: p.date is expected in fact_ads_performance_daily
  v_where := format('p.date BETWEEN %L AND %L', p_start_date, p_end_date);
  
  -- Use ILIKE with wildcards for flexible matching (handles 'Santarém' vs 'Ulbra Santarém')
  IF p_unidade IS NOT NULL AND p_unidade <> '' AND p_unidade <> 'Todas' THEN
    v_where := v_where || format(' AND (m.unidade_nome ILIKE %1$L OR m.unit_id::text = %2$L)', '%' || p_unidade || '%', p_unidade);
  END IF;

  IF p_curso IS NOT NULL AND p_curso <> '' AND p_curso <> 'Todos' THEN
    v_where := v_where || format(' AND (m.curso_nome ILIKE %1$L OR m.course_id::text = %2$L)', '%' || p_curso || '%', p_curso);
  END IF;
  
  IF p_hide_branding THEN
    v_where := v_where || ' AND p.campaign_name NOT ILIKE ''%Branding%'' AND p.campaign_name NOT ILIKE ''%Brand%''';
  END IF;
  
  IF p_exclude_ead THEN
    v_where := v_where || ' AND m.unidade_nome NOT ILIKE ''%EAD%''';
  END IF;

  v_where := v_where || ' AND p.platform = ''META'' AND (m.is_ignored IS NULL OR m.is_ignored = false) AND p.campaign_name NOT ILIKE ''%Ultec%''';

  -- 2. Buscar Dados Diários Aggregados
  -- Crucial: Use a subquery with DISTINCT to avoid duplicating performance data due to multiple mappings
  EXECUTE format('
    WITH mapping AS (
      SELECT DISTINCT ON (platform, campaign_id) 
        platform, campaign_id, unidade_nome, curso_nome, unit_id, course_id, is_ignored
      FROM vw_campaign_mapping_readable
    )
    SELECT jsonb_build_object(
      ''totals'', jsonb_build_object(
          ''spend'', COALESCE(SUM(spend), 0),
          ''conversions'', COALESCE(SUM(conversions), 0),
          ''impressions'', COALESCE(SUM(impressions), 0),
          ''clicks'', COALESCE(SUM(clicks), 0)
      ),
      ''daily'', COALESCE(jsonb_agg(sub), ''[]''::jsonb)
    )
    FROM (
      SELECT 
        p.date as data_referencia, 
        SUM(p.spend) as spend, 
        SUM(p.conversions) as conversions,
        SUM(p.impressions) as impressions,
        SUM(p.clicks) as clicks
      FROM fact_ads_performance_daily p
      LEFT JOIN mapping m 
        ON p.platform = m.platform AND p.campaign_id = m.campaign_id
      WHERE %s
      GROUP BY p.date
      ORDER BY p.date
    ) sub', v_where)
  INTO v_daily;

  -- 3. Buscar Top Creatives
  EXECUTE format('
    WITH mapping AS (
      SELECT DISTINCT ON (platform, campaign_id) 
        platform, campaign_id, unidade_nome, curso_nome, unit_id, course_id, is_ignored
      FROM vw_campaign_mapping_readable
    )
    SELECT COALESCE(jsonb_agg(sub), ''[]''::jsonb)
    FROM (
      SELECT 
        COALESCE(p.entity_name, p.campaign_name) as ad_name,
        COALESCE(m.unidade_nome, ''Outros'') as unidade,
        COALESCE(m.curso_nome, ''Geral'') as curso,
        SUM(p.conversions) as conversions,
        SUM(p.spend) as spend,
        CASE WHEN SUM(p.conversions) > 0 THEN SUM(p.spend)/SUM(p.conversions) ELSE 0 END as cpl
      FROM fact_ads_performance_daily p
      LEFT JOIN mapping m 
        ON p.platform = m.platform AND p.campaign_id = m.campaign_id
      WHERE %s
      GROUP BY 1, 2, 3
      ORDER BY conversions DESC, spend DESC
      LIMIT 10
    ) sub', v_where)
  INTO v_creatives;

  RETURN jsonb_build_object(
    'stats', v_daily,
    'top_creatives', v_creatives,
    'context_applied', jsonb_build_object(
        'unidade', p_unidade,
        'curso', p_curso,
        'period', p_start_date || ' a ' || p_end_date
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, TEXT, BOOLEAN, BOOLEAN) TO anon;

COMMENT ON FUNCTION get_gaia_data IS 'Retorna dados agregados para Gaia Chat direto da tabela base (Fixed Impressions)';
