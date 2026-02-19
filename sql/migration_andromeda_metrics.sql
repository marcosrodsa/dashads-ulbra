-- Adiciona colunas de Alcance e Frequência para suporte ao modelo Andromeda
ALTER TABLE fact_creative_assets 
ADD COLUMN IF NOT EXISTS reach INTEGER,
ADD COLUMN IF NOT EXISTS frequency DECIMAL(10,2);
