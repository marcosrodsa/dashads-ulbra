-- ============================================================================
-- FIX DEFINITIVO: GAIA CHAT RPC (BYPASS VIEW) - V2
-- Corrige erro "column impressions does not exist" na subquery
-- ============================================================================

DROP FUNCTION IF EXISTS get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION get_gaia_data(
  p_start_date DATE, 
  p_end_date DATE,
  p_unidade TEXT DEFAULT NULL,
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
  v_where := format('p.date BETWEEN %L AND %L', p_start_date, p_end_date);
  
  IF p_unidade IS NOT NULL AND p_unidade <> '' THEN
    v_where := v_where || format(' AND m.unidade_nome = %L', p_unidade);
  END IF;
  
  IF p_hide_branding THEN
    v_where := v_where || ' AND p.campaign_name NOT ILIKE ''%Branding%'' AND p.campaign_name NOT ILIKE ''%Brand%''';
  END IF;
  
  IF p_exclude_ead THEN
    v_where := v_where || ' AND m.unidade_nome NOT ILIKE ''%EAD%''';
  END IF;

  v_where := v_where || ' AND p.platform = ''META'' AND (m.is_ignored IS NULL OR m.is_ignored = false) AND p.campaign_name NOT ILIKE ''%Ultec%''';

  -- 2. Buscar Dados Diários Aggregados (Forecast)
  -- CORREÇÃO: Incluir impressions e clicks na subquery!
  EXECUTE format('
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
        SUM(p.impressions) as impressions,  -- ADICIONADO
        SUM(p.clicks) as clicks            -- ADICIONADO
      FROM fact_ads_performance_daily p
      LEFT JOIN vw_campaign_mapping_readable m 
        ON p.platform = m.platform AND p.campaign_id = m.campaign_id
      WHERE %s
      GROUP BY p.date
      ORDER BY p.date
    ) sub', v_where)
  INTO v_daily;

  -- 3. Buscar Top Creatives (Top 5)
  EXECUTE format('
    SELECT COALESCE(jsonb_agg(sub), ''[]''::jsonb)
    FROM (
      SELECT 
        COALESCE(p.entity_name, p.campaign_name) as ad_name,
        COALESCE(m.unidade_nome, ''Outros'') as unidade,
        COALESCE(m.curso_nome, ''Geral'') as curso,
        SUM(p.conversions) as conversions,
        SUM(p.spend) as spend,
        CASE WHEN SUM(p.conversions) > 0 THEN SUM(p.spend)/SUM(p.conversions) ELSE 0 END as cpl,
        CASE WHEN SUM(p.impressions) > 0 THEN (SUM(p.clicks)::numeric/SUM(p.impressions))*100 ELSE 0 END as ctr
      FROM fact_ads_performance_daily p
      LEFT JOIN vw_campaign_mapping_readable m 
        ON p.platform = m.platform AND p.campaign_id = m.campaign_id
      WHERE %s
      GROUP BY 
        COALESCE(p.entity_name, p.campaign_name),
        m.unidade_nome,
        m.curso_nome,
        p.campaign_id
      ORDER BY conversions DESC
      LIMIT 10
    ) sub', v_where)
  INTO v_creatives;

  -- 4. Retornar JSON
  RETURN jsonb_build_object(
    'stats', v_daily,
    'top_creatives', v_creatives
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN) TO anon;

COMMENT ON FUNCTION get_gaia_data IS 'Retorna dados agregados para Gaia Chat direto da tabela base (Fixed Impressions)';
