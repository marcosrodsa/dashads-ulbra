-- ============================================================================
-- ETL & VECTOR SCHEMA CONSOLIDATION
-- ============================================================================

-- 1. Ensure fact_creative_assets has all enrichment columns
ALTER TABLE fact_creative_assets 
ADD COLUMN IF NOT EXISTS video_id VARCHAR,
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fetch_error TEXT,
ADD COLUMN IF NOT EXISTS fetch_attempts INTEGER DEFAULT 0;

-- 2. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Table for semantic search and visual descriptions
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

-- 4. ETL Helper: get_missing_creatives
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

-- RLS & Grants
ALTER TABLE fact_creative_vectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON fact_creative_vectors;
CREATE POLICY "Enable read for authenticated users" 
    ON fact_creative_vectors FOR SELECT USING (auth.role() = 'authenticated');

GRANT EXECUTE ON FUNCTION get_missing_creatives TO authenticated;
GRANT EXECUTE ON FUNCTION get_missing_creatives TO service_role;