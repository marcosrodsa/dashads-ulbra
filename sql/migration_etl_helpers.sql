-- ============================================================================
-- ETL HELPERS: Creative Asset Discovery
-- ============================================================================

-- Function to get creatives that are MISSION assets but have performance data
CREATE OR REPLACE FUNCTION get_missing_creatives(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (ad_id VARCHAR) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.entity_id::VARCHAR
    FROM fact_ads_performance_daily p
    LEFT JOIN fact_creative_assets a ON p.entity_id = a.ad_id
    WHERE p.platform = 'META'
      AND p.entity_id IS NOT NULL
      AND a.ad_id IS NULL
    LIMIT limit_count;
END;
$$;

-- Grant execution to authenticated users (and service role)
GRANT EXECUTE ON FUNCTION get_missing_creatives TO authenticated;
GRANT EXECUTE ON FUNCTION get_missing_creatives TO service_role;

-- ============================================================================
-- PREPARING FOR VISION: Vector Schema
-- ============================================================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for semantic search and visual descriptions
CREATE TABLE IF NOT EXISTS fact_creative_vectors (
    ad_id VARCHAR PRIMARY KEY REFERENCES fact_creative_assets(ad_id),
    visual_description TEXT,
    content_embedding vector(1536), -- Optimized for Gemini/Vertex embeddings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector search (HNSW is faster for large sets)
CREATE INDEX IF NOT EXISTS idx_creative_vectors_embedding 
    ON fact_creative_vectors USING hnsw (content_embedding vector_cosine_ops);

-- RLS for Vector table
ALTER TABLE fact_creative_vectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON fact_creative_vectors;
CREATE POLICY "Enable read for authenticated users" 
    ON fact_creative_vectors
    FOR SELECT
    USING (auth.role() = 'authenticated');
