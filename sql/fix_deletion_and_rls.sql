-- 1. Atualizar políticas de RLS para permitir INSERT, UPDATE e DELETE
-- Unidades
DROP POLICY IF EXISTS "Enable read for all" ON public.units;
CREATE POLICY "Enable all for all" ON public.units FOR ALL USING (true) WITH CHECK (true);

-- Cursos
DROP POLICY IF EXISTS "Enable read for all" ON public.courses;
CREATE POLICY "Enable all for all" ON public.courses FOR ALL USING (true) WITH CHECK (true);

-- Linhas de Curso (caso existam restrições semelhantes)
-- Note: Substitua se a tabela tiver outro nome
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_lines') THEN
        ALTER TABLE public.course_lines ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable read for all" ON public.course_lines;
        CREATE POLICY "Enable all for all" ON public.course_lines FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Atualizar Chaves Estrangeiras para permitir exclusão (ON DELETE SET NULL)
-- Remove as constraints antigas se existirem e adiciona com a regra de deleção

DO $$ 
BEGIN
    -- Update Unit ID FK
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'dim_campaign_mapping_unit_id_fkey') THEN
        ALTER TABLE public.dim_campaign_mapping DROP CONSTRAINT dim_campaign_mapping_unit_id_fkey;
    END IF;
    ALTER TABLE public.dim_campaign_mapping 
        ADD CONSTRAINT dim_campaign_mapping_unit_id_fkey 
        FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

    -- Update Course ID FK
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'dim_campaign_mapping_course_id_fkey') THEN
        ALTER TABLE public.dim_campaign_mapping DROP CONSTRAINT dim_campaign_mapping_course_id_fkey;
    END IF;
    ALTER TABLE public.dim_campaign_mapping 
        ADD CONSTRAINT dim_campaign_mapping_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
END $$;
