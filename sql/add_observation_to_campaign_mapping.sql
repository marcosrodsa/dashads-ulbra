-- Adiciona coluna de observação na tabela de mapeamento
ALTER TABLE public.dim_campaign_mapping 
ADD COLUMN IF NOT EXISTS observation text;

COMMENT ON COLUMN public.dim_campaign_mapping.observation IS 'Observações manuais sobre a classificação da campanha';
