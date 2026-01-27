-- Tabelas de Domínio para o Classificador de Campanhas
-- Execute este SQL se as tabelas units e courses não existirem

-- Tabela de Unidades (Business Units)
CREATE TABLE IF NOT EXISTS public.units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Inserir unidades padrão (baseado na view vw_performance_diaria)
INSERT INTO public.units (name) VALUES 
    ('EAD'),
    ('Ulbra Medicina'),
    ('Institucional'),
    ('Ulbra Canoas'),
    ('Ulbra Torres'),
    ('Ulbra Itumbiara'),
    ('Ulbra Manaus'),
    ('Ulbra Palmas'),
    ('Ulbra Santarém'),
    ('Ulbra Gravataí'),
    ('Ulbra São Jerônimo'),
    ('Ulbra Cachoeira do Sul'),
    ('Ulbra Santa Maria'),
    ('Ulbra Guaíba'),
    ('Ulbra Carazinho'),
    ('Outros / Não Identificado')
ON CONFLICT (name) DO NOTHING;

-- RLS para units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.units;
CREATE POLICY "Enable read for all" ON public.units FOR SELECT USING (true);

-- Tabela de Cursos
CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Inserir cursos padrão (baseado na view vw_performance_diaria)
INSERT INTO public.courses (name) VALUES 
    ('Branding'),
    ('Medicina'),
    ('EAD'),
    ('Direito'),
    ('Odonto'),
    ('Psicologia'),
    ('Enfermagem'),
    ('MedVet'),
    ('Fisioterapia'),
    ('Biomedicina'),
    ('Estética'),
    ('Agronomia'),
    ('Terapia Ocupacional'),
    ('Engenharias'),
    ('Geral')
ON CONFLICT (name) DO NOTHING;

-- RLS para courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all" ON public.courses;
CREATE POLICY "Enable read for all" ON public.courses FOR SELECT USING (true);
