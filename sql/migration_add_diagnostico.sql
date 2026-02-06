-- Migration: Add diagnostico column to fact_creative_insights
-- This column stores the raw output/analysis from the LLM

ALTER TABLE fact_creative_insights 
ADD COLUMN IF NOT EXISTS diagnostico TEXT;

-- Update default llm_model to match current implementation
ALTER TABLE fact_creative_insights 
ALTER COLUMN llm_model SET DEFAULT 'gemini-2.5-flash';

-- Comment for documentation
COMMENT ON COLUMN fact_creative_insights.diagnostico IS 'Raw output or complete analysis text from the LLM';
