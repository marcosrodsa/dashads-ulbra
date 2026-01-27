CREATE OR REPLACE VIEW vw_campaign_mapping_readable AS
SELECT 
    m.id,
    m.platform,
    m.campaign_id,
    m.campaign_name,
    m.updated_at,
    m.is_ignored, -- Adding is_ignored as it is needed for the frontend
    
    -- Trazendo o nome da Unidade
    u.id as unit_id,
    u.name as unidade_nome, -- Ex: "Ulbra Canoas"
    
    -- Trazendo o nome do Curso
    c.id as course_id,
    c.name as curso_nome   -- Ex: "Direito"

FROM dim_campaign_mapping m
LEFT JOIN units u ON m.unit_id = u.id
LEFT JOIN courses c ON m.course_id = c.id;
