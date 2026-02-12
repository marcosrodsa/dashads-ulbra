-- Investigate Spend Discrepancy for 2026-02-10 (META)

-- 1. Total Spend in raw table for META
SELECT 
    'Raw Table (META)' as source,
    SUM(spend) as total_spend,
    COUNT(*) as rows
FROM fact_ads_performance_daily
WHERE date = '2026-02-10'
  AND platform = 'META'
  AND campaign_name NOT ILIKE '%Ultec%';

-- 2. Total Spend where entity_id IS NULL
SELECT 
    'Raw Table (META) - NULL Entity ID' as source,
    SUM(spend) as total_spend,
    COUNT(*) as rows,
    string_agg(DISTINCT campaign_name, ', ') as campaigns
FROM fact_ads_performance_daily
WHERE date = '2026-02-10'
  AND platform = 'META'
  AND campaign_name NOT ILIKE '%Ultec%'
  AND entity_id IS NULL;

-- 3. Total Spend in View (Matches Creatives Page?)
SELECT 
    'vw_creative_analysis_complete' as source,
    SUM(investimento) as total_spend
FROM vw_creative_analysis_complete
WHERE data_referencia = '2026-02-10';

-- 4. Identify campaigns with spend but NO matching creative view rows
SELECT 
    p.campaign_name,
    SUM(p.spend) as raw_spend,
    p.entity_id
FROM fact_ads_performance_daily p
WHERE p.date = '2026-02-10'
  AND p.platform = 'META'
  AND p.campaign_name NOT ILIKE '%Ultec%'
  AND NOT EXISTS (
      SELECT 1 FROM vw_creative_analysis_complete v 
      WHERE v.ad_id = p.entity_id AND v.data_referencia = p.date
  )
GROUP BY 1, 3
HAVING SUM(p.spend) > 0
ORDER BY 2 DESC;
