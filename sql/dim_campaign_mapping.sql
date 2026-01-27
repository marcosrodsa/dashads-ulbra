-- Tabela de Mapeamento de Campanhas (De/Para)
-- Esta tabela armazena as regras manuais para classificar campanhas
-- que não são identificadas automaticamente pelas regras de texto.

-- Remove tabela existente (se houver) para recriar do zero
DROP TABLE IF EXISTS public.dim_campaign_mapping CASCADE;

CREATE TABLE public.dim_campaign_mapping (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Chaves da Campanha (Vêm do Ads)
    platform text NOT NULL, -- 'META' ou 'GOOGLE'
    campaign_id text NOT NULL, -- ID original da plataforma
    campaign_name text, -- Salvo apenas para referência visual/histórico
    
    -- Chaves de Negócio (Foreign Keys para tabelas oficiais)
    unit_id uuid REFERENCES public.units(id),
    course_id uuid REFERENCES public.courses(id),
    
    -- Flags de Controle
    is_ignored boolean DEFAULT false, -- Se true, essa campanha não aparece nos dashs
    
    -- Auditoria
    updated_at timestamptz DEFAULT now(),
    updated_by text, -- Email do usuário (se houver auth)
    
    -- Garante que 1 campanha tenha apenas 1 regra
    CONSTRAINT unique_mapping_per_campaign UNIQUE (platform, campaign_id)
);

-- Índices para performance
CREATE INDEX idx_campaign_mapping_platform ON public.dim_campaign_mapping(platform);
CREATE INDEX idx_campaign_mapping_campaign_id ON public.dim_campaign_mapping(campaign_id);

-- RLS (Row Level Security)
ALTER TABLE public.dim_campaign_mapping ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY "Enable all for anon" ON public.dim_campaign_mapping 
    FOR ALL USING (true) WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.dim_campaign_mapping IS 'Tabela de mapeamento manual de campanhas para Unidades e Cursos';
COMMENT ON COLUMN public.dim_campaign_mapping.platform IS 'Plataforma de anúncios: META ou GOOGLE';
COMMENT ON COLUMN public.dim_campaign_mapping.is_ignored IS 'Se true, a campanha é ignorada nos relatórios (ex: testes)';
