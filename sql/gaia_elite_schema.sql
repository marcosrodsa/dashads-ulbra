-- ============================================================================
-- GAIA ELITE: Infrastructure for Breakdown Tools (Campaign Level)
-- ============================================================================

-- 1. Performance by Breakdowns (Demographics/Geography)
-- Design: Granularity optimized at Campaign Level to save storage
CREATE TABLE IF NOT EXISTS fact_ads_performance_breakdown (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL,
    campaign_id VARCHAR NOT NULL,
    campaign_name TEXT,
    date DATE NOT NULL,
    
    -- Dimension: Age & Gender (Meta returns these combined often)
    age_range VARCHAR(20),
    gender VARCHAR(20),
    
    -- Dimension: Region (Stored separately to avoid cartesian explosion)
    region TEXT,
    
    -- Metrics
    spend DECIMAL DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Gaia's high-speed queries
CREATE INDEX IF NOT EXISTS idx_ads_breakdown_lookup 
    ON fact_ads_performance_breakdown(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_ads_breakdown_dim 
    ON fact_ads_performance_breakdown(region, age_range);

-- ============================================================================
-- RPCs for Gaia Tools (Function Calling)
-- ============================================================================

-- Tool: get_breakdown_data
-- Used by Gaia to answer: "Qual o público dessa campanha?" or "Onde estamos convertendo?"
CREATE OR REPLACE FUNCTION get_breakdown_data(
    p_campaign_id VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_dimension VARCHAR DEFAULT 'age_range' -- 'age_range', 'gender', 'region'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    EXECUTE format('
        SELECT jsonb_agg(sub)
        FROM (
            SELECT 
                %I as label,
                SUM(spend) as spend,
                SUM(conversions) as conversions,
                SUM(impressions) as impressions,
                CASE WHEN SUM(impressions) > 0 THEN (SUM(clicks)::numeric/SUM(impressions))*100 ELSE 0 END as ctr
            FROM fact_ads_performance_breakdown
            WHERE (campaign_id = %L OR %L IS NULL)
              AND (date BETWEEN %L AND %L)
              AND %I IS NOT NULL
            GROUP BY %I
            ORDER BY conversions DESC, spend DESC
            LIMIT 10
        ) sub', p_dimension, p_campaign_id, p_campaign_id, p_start_date, p_end_date, p_dimension, p_dimension)
    INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_breakdown_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_breakdown_data TO service_role;

COMMENT ON FUNCTION get_breakdown_data IS 'Gaia Tool: Fetches demographic/geographic breakdown for campaigns';
