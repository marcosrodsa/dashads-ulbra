-- Migration: Final UI/DB Synchronization
-- This adds all columns required by the current frontend implementation

-- 1. Fix fact_creative_insights (Missing analysis content)
ALTER TABLE fact_creative_insights 
ADD COLUMN IF NOT EXISTS diagnostico TEXT;

-- 2. Fix fact_creative_assets (Missing video performance metrics)
ALTER TABLE fact_creative_assets 
ADD COLUMN IF NOT EXISTS hook_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hold_rate DECIMAL(10,2);

-- Update RLS and Cache
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN fact_creative_insights.diagnostico IS 'Complete LLM analysis text';
COMMENT ON COLUMN fact_creative_assets.hook_rate IS '3s Video View / Impressions ratio';
COMMENT ON COLUMN fact_creative_assets.hold_rate IS '100% Video View / Impressions ratio';
