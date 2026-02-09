-- Consolidation: Add visual_description to history tables
-- Allows history to be self-contained without depending on the current state in fact_creative_vectors

-- 1. Add visual_description to creative_contextual_insights
ALTER TABLE creative_contextual_insights 
ADD COLUMN IF NOT EXISTS visual_description TEXT;

-- 2. Add visual_description to fact_creative_insights (as a column for better querying/indexing)
ALTER TABLE fact_creative_insights 
ADD COLUMN IF NOT EXISTS visual_description TEXT;

COMMENT ON COLUMN creative_contextual_insights.visual_description IS 'Descrição visual gerada pela Gaia no momento desta análise específica.';
COMMENT ON COLUMN fact_creative_insights.visual_description IS 'Descrição visual gerada pela Gaia no momento desta análise específica.';
