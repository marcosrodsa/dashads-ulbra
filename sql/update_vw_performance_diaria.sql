CREATE OR REPLACE VIEW vw_performance_diaria2 AS

WITH raw_data AS (
    SELECT 
        date::date as data_referencia, 
        platform,
        campaign_name,
        
        -- 1. LÓGICA DE UNIDADE (Idêntica à mensal)
        CASE 
            WHEN (campaign_name ILIKE '%EAD%' AND campaign_name NOT ILIKE '%Lead%') 
                 OR account_name ILIKE '%EAD%' 
                 OR campaign_name ILIKE '%Google Pix%' 
                 OR campaign_name ILIKE '%Ulbra Pop%' THEN 'EAD'
            WHEN campaign_name ILIKE '%Medicina%' THEN 'Ulbra Medicina'
            WHEN campaign_name ILIKE '%Visitas%' OR campaign_name ILIKE '%Branding%' OR campaign_name ILIKE '%Institucional%' THEN 'Institucional'
            WHEN campaign_name ILIKE '%Canoas%' OR campaign_name ILIKE '%| RS |%' THEN 'Ulbra Canoas'
            WHEN campaign_name ILIKE '%Torres%' THEN 'Ulbra Torres'
            WHEN campaign_name ILIKE '%Itumbiara%' THEN 'Ulbra Itumbiara'
            WHEN campaign_name ILIKE '%Manaus%' THEN 'Ulbra Manaus'
            WHEN campaign_name ILIKE '%Palmas%' THEN 'Ulbra Palmas'
            WHEN campaign_name ILIKE '%Santarém%' OR campaign_name ILIKE '%Santarem%' THEN 'Ulbra Santarém'
            WHEN campaign_name ILIKE '%Gravataí%' OR campaign_name ILIKE '%Gravatai%' THEN 'Ulbra Gravataí'
            WHEN campaign_name ILIKE '%São Jerônimo%' OR campaign_name ILIKE '%Jeronimo%' THEN 'Ulbra São Jerônimo'
            WHEN campaign_name ILIKE '%Cachoeira%' OR campaign_name ILIKE '%Cach do Sul%' THEN 'Ulbra Cachoeira do Sul'
            WHEN campaign_name ILIKE '%Santa Maria%' THEN 'Ulbra Santa Maria'
            WHEN campaign_name ILIKE '%Guaíba%' OR campaign_name ILIKE '%Guaiba%' THEN 'Ulbra Guaíba'
            WHEN campaign_name ILIKE '%Carazinho%' THEN 'Ulbra Carazinho'
            ELSE 'Outros / Não Identificado' 
        END as unidade,

        -- 2. LÓGICA DE CURSO (Idêntica à mensal)
        CASE
            WHEN platform = 'GOOGLE' AND channel_type = 'video' THEN 'Branding'
            WHEN campaign_name ILIKE '%Medicina%' THEN 'Medicina'
            WHEN (campaign_name ILIKE '%EAD%' AND campaign_name NOT ILIKE '%Lead%') 
                 OR campaign_name ILIKE '%Google Pix%' 
                 OR campaign_name ILIKE '%Ulbra Pop%' THEN 'EAD'
            WHEN campaign_name ILIKE '%Branding%' OR campaign_name ILIKE '%Institucional%' OR campaign_name ILIKE '%Visitas%' THEN 'Branding'
            WHEN campaign_name ILIKE '%Direito%' THEN 'Direito'
            WHEN campaign_name ILIKE '%Odonto%' OR campaign_name ILIKE '%Odontologia%' THEN 'Odonto'
            WHEN campaign_name ILIKE '%Psicologia%' OR campaign_name ILIKE '%Psico%' THEN 'Psicologia'
            WHEN campaign_name ILIKE '%Enfermagem%' THEN 'Enfermagem'
            WHEN campaign_name ILIKE '%MedVet%' OR campaign_name ILIKE '%Veterinaria%' OR campaign_name ILIKE '%Veterinária%' THEN 'MedVet'
            WHEN campaign_name ILIKE '%Fisioterapia%' OR campaign_name ILIKE '%Fisio%' THEN 'Fisioterapia'
            WHEN campaign_name ILIKE '%Biomedicina%' OR campaign_name ILIKE '%Biomed%' THEN 'Biomedicina'
            WHEN campaign_name ILIKE '%Estética%' OR campaign_name ILIKE '%Estetica%' THEN 'Estética'
            WHEN campaign_name ILIKE '%Agronomia%' OR campaign_name ILIKE '%Agro%' THEN 'Agronomia'
            WHEN campaign_name ILIKE '%Terapia Ocupacional%' OR campaign_name ILIKE '%T.O%' THEN 'Terapia Ocupacional'
            WHEN campaign_name ILIKE '%Engenharia%' OR campaign_name ILIKE '%Eng %' THEN 'Engenharias'
            ELSE 'Geral'
        END as curso,

        spend,
        conversions as leads,
        clicks,
        impressions
    FROM fact_ads_performance_daily
    WHERE campaign_name NOT ILIKE '%Ultec%'
)

SELECT 
    data_referencia,
    unidade,
    curso,
    platform,
    campaign_name,
    SUM(spend) as investimento,
    SUM(leads) as leads,
    SUM(clicks) as clicks,
    SUM(impressions) as impressoes,
    CASE WHEN SUM(leads) > 0 THEN ROUND(SUM(spend) / SUM(leads), 2) ELSE 0 END as cpl,
    CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(spend) / SUM(clicks), 2) ELSE 0 END as cpc,
    CASE WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::numeric / SUM(impressions)) * 100, 2) ELSE 0 END as ctr
FROM raw_data
GROUP BY 1, 2, 3, 4, 5
ORDER BY data_referencia DESC;
