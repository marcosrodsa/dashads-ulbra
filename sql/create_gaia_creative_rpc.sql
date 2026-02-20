-- Function to query creatives dynamically for Gaia chat
-- Allows sorting by different metrics (conversoes, cpl, hook_rate, hold_rate, etc)

CREATE OR REPLACE FUNCTION query_creatives_analysis(
  p_start_date DATE, 
  p_end_date DATE,
  p_unidade TEXT DEFAULT NULL,
  p_metric TEXT DEFAULT 'conversoes',
  p_order TEXT DEFAULT 'desc',
  p_limit INT DEFAULT 5,
  p_hide_branding BOOLEAN DEFAULT FALSE,
  p_exclude_ead BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creatives JSONB;
  v_where TEXT;
  v_order_clause TEXT;
BEGIN
  -- 1. Base WHERE clause
  v_where := format('data_referencia BETWEEN %L AND %L', p_start_date, p_end_date);
  
  IF p_unidade IS NOT NULL AND p_unidade <> '' AND p_unidade <> 'Todas' THEN
    v_where := v_where || format(' AND unidade ILIKE %L', '%' || p_unidade || '%');
  END IF;
  
  IF p_hide_branding THEN
    v_where := v_where || ' AND campaign_name NOT ILIKE ''%Branding%'' AND campaign_name NOT ILIKE ''%Brand%''';
  END IF;
  
  IF p_exclude_ead THEN
    v_where := v_where || ' AND unidade NOT ILIKE ''%EAD%''';
  END IF;

  -- 2. Determine Order Clause
  -- Safe default
  v_order_clause := 'conversions DESC';
  
  IF p_metric = 'cpl' THEN
    v_order_clause := format('cpl %s', p_order);
  ELSIF p_metric = 'hook_rate' THEN
    v_order_clause := format('hook_rate %s', p_order);
  ELSIF p_metric = 'hold_rate' THEN
    v_order_clause := format('hold_rate %s', p_order);
  ELSIF p_metric = 'investimento' THEN
    v_order_clause := format('spend %s', p_order);
  ELSIF p_metric = 'conversoes' THEN
    v_order_clause := format('conversions %s', p_order);
  END IF;

  -- 3. Top/Worst Creatives Aggregation
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
      ORDER BY %s NULLS LAST
      LIMIT %s
    ) sub', v_where, v_order_clause, p_limit)
  INTO v_creatives;

  RETURN jsonb_build_object('creatives', v_creatives);
END;
$$;

-- Grant permissions to execute the function
GRANT EXECUTE ON FUNCTION query_creatives_analysis(DATE, DATE, TEXT, TEXT, TEXT, INT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION query_creatives_analysis(DATE, DATE, TEXT, TEXT, TEXT, INT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION query_creatives_analysis(DATE, DATE, TEXT, TEXT, TEXT, INT, BOOLEAN, BOOLEAN) TO anon;
