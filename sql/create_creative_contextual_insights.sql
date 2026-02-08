-- Migration: Create creative_contextual_insights table
-- Purpose: Store Gaia analysis with performance context (KPIs)
-- Date: 2026-02-06

CREATE TABLE IF NOT EXISTS creative_contextual_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id VARCHAR NOT NULL,
  
  -- Período analisado
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  
  -- Contexto de performance no momento da análise
  performance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Exemplo: {"ctr": 2.5, "cpa": 28.50, "conversions": 45, "impressions": 12000}
  
  -- Resultado da análise Gaia
  why_performs TEXT,
  improvement_suggestions TEXT[],
  fatigue_risk VARCHAR(10) CHECK (fatigue_risk IN ('low', 'medium', 'high')),
  recommended_action VARCHAR(20) CHECK (recommended_action IN ('scale', 'pause', 'iterate', 'test')),
  confidence_score DECIMAL(3,2),
  
  -- Metadados
  llm_model VARCHAR DEFAULT 'gemini-flash-latest',
  tokens_used INTEGER,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT fk_creative_asset FOREIGN KEY (ad_id) 
    REFERENCES fact_creative_assets(ad_id) ON DELETE CASCADE,
  CONSTRAINT unique_analysis_period UNIQUE(ad_id, analysis_period_start, analysis_period_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contextual_insights_ad 
  ON creative_contextual_insights(ad_id);
CREATE INDEX IF NOT EXISTS idx_contextual_insights_date 
  ON creative_contextual_insights(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_contextual_insights_action 
  ON creative_contextual_insights(recommended_action);

-- P1 Improvement: Composite index for filtering by action + date
CREATE INDEX IF NOT EXISTS idx_contextual_insights_action_date 
  ON creative_contextual_insights(recommended_action, analyzed_at DESC);

-- RLS Policies (inherit from fact_creative_assets pattern)
ALTER TABLE creative_contextual_insights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid "already exists" error)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON creative_contextual_insights;
DROP POLICY IF EXISTS "Enable insert for service role" ON creative_contextual_insights;

CREATE POLICY "Enable read access for authenticated users" 
  ON creative_contextual_insights FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert for service role" 
  ON creative_contextual_insights FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE creative_contextual_insights IS 
  'Análises Gaia contextualizadas com KPIs de performance';
COMMENT ON COLUMN creative_contextual_insights.performance_snapshot IS 
  'Snapshot dos KPIs no momento da análise: ctr, cpa, conversions, impressions';
COMMENT ON COLUMN creative_contextual_insights.why_performs IS 
  'Explicação da Gaia sobre por que o criativo performa bem/mal';
COMMENT ON COLUMN creative_contextual_insights.recommended_action IS 
  'Ação recomendada: scale (escalar), pause (pausar), iterate (iterar), test (testar)';
