-- Function to Aggregate Gaia Data for Chat
-- Returns lightweight JSON with Daily Stats (for Forecast) and Top Creatives
-- Usage: select get_gaia_data('2024-01-01', '2024-01-31', 'Unit A', false, false);

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
  v_result JSONB;
  v_daily JSONB;
  v_creatives JSONB;
  v_query_base TEXT;
  v_where TEXT;
BEGIN
  -- 1. Base WHERE clause
  v_where := format('data_referencia BETWEEN %L AND %L', p_start_date, p_end_date);
  
  IF p_unidade IS NOT NULL AND p_unidade <> '' THEN
    v_where := v_where || format(' AND unidade = %L', p_unidade);
  END IF;
  
  IF p_hide_branding THEN
    v_where := v_where || ' AND campaign_name NOT ILIKE ''%Branding%'' AND campaign_name NOT ILIKE ''%Brand%''';
  END IF;
  
  IF p_exclude_ead THEN
    v_where := v_where || ' AND unidade NOT ILIKE ''%EAD%''';
  END IF;

  -- 2. Daily Stats & Totals
  EXECUTE format('
    SELECT jsonb_build_object(
      ''totals'', jsonb_build_object(
          ''spend'', COALESCE(SUM(investimento), 0),
          ''conversions'', COALESCE(SUM(conversoes), 0),
          ''impressions'', COALESCE(SUM(impressoes), 0),
          ''clicks'', COALESCE(SUM(cliques), 0)
      ),
      ''daily'', COALESCE(jsonb_agg(sub), ''[]''::jsonb)
    )
    FROM (
      SELECT 
        data_referencia, 
        SUM(investimento) as spend, 
        SUM(conversoes) as conversions
      FROM vw_creative_analysis_complete
      WHERE %s
      GROUP BY data_referencia
      ORDER BY data_referencia
    ) sub', v_where)
  INTO v_daily;

  -- 3. Top Creatives
  EXECUTE format('
    SELECT COALESCE(jsonb_agg(sub), ''[]''::jsonb)
    FROM (
      SELECT 
        ad_name,
        SUM(conversoes) as conversions,
        SUM(investimento) as spend,
        CASE WHEN SUM(conversoes) > 0 THEN SUM(investimento)/SUM(conversoes) ELSE 0 END as cpl,
        CASE WHEN SUM(impressoes) > 0 THEN (SUM(cliques)::numeric/SUM(impressoes))*100 ELSE 0 END as ctr,
        ROUND(AVG(hook_rate), 2) as hook_rate,
        ROUND(AVG(hold_rate), 2) as hold_rate
      FROM vw_creative_analysis_complete
      WHERE %s
      GROUP BY ad_name
      ORDER BY conversions DESC
      LIMIT 5
    ) sub', v_where)
  INTO v_creatives;

  -- 4. Combine Results
  RETURN jsonb_build_object(
    'stats', v_daily,
    'top_creatives', v_creatives
  );
END;
$$;

-- Grant permissions to execute the function
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION get_gaia_data(DATE, DATE, TEXT, BOOLEAN, BOOLEAN) TO anon;
