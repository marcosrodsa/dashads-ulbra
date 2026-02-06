-- Adiciona colunas para métricas de vídeo
ALTER TABLE fact_creative_assets 
ADD COLUMN IF NOT EXISTS hook_rate DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS hold_rate DECIMAL(10,4);
