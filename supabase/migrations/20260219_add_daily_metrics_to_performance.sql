-- ============================================================================
-- MIGRATION: ADD DAILY METRICS TO PERFORMANCE FACT TABLE
-- ============================================================================
-- Objective: Support daily tracking of Reach, Frequency, and Video Metrics
-- Ticket: Data Pipeline Optimization
-- ============================================================================

-- 1. Add columns for Daily Reach & Frequency
ALTER TABLE fact_ads_performance_daily 
ADD COLUMN IF NOT EXISTS reach BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency DECIMAL(10, 4) DEFAULT 0;

-- 2. Add columns for Video Metrics (Raw Counts)
-- We store raw counts so we can sum them up for any time period to calculate rates
ALTER TABLE fact_ads_performance_daily 
ADD COLUMN IF NOT EXISTS video_3_sec_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p100_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p25_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p50_watched_actions BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p75_watched_actions BIGINT DEFAULT 0;

-- 3. Comment on columns for documentation
COMMENT ON COLUMN fact_ads_performance_daily.reach IS 'The number of unique people who saw your ads at least once.';
COMMENT ON COLUMN fact_ads_performance_daily.frequency IS 'The average number of times each person saw your ad (Impressions / Reach).';
COMMENT ON COLUMN fact_ads_performance_daily.video_3_sec_watched_actions IS 'Number of times your video was played for at least 3 seconds (or nearly all if shorter).';
COMMENT ON COLUMN fact_ads_performance_daily.video_p100_watched_actions IS 'Number of times your video was played to 100% of its length (Completions).';

-- ============================================================================
-- NOTE FOR ETL (n8n):
-- You must now map these fields from the Meta Insights API to these columns.
-- ============================================================================
