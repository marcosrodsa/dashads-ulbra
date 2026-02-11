-- ============================================================================
-- DIAGNOSTIC: Active Creatives Discrepancy Investigation
-- ============================================================================
-- Purpose: Understand why only 176 creatives are marked as ACTIVE when 247 ran yesterday
-- Date: 2026-02-11
-- ============================================================================

-- 1. Check how many creatives ran yesterday (2026-02-10) with spend
SELECT 
    '1. Creatives with spend on 2026-02-10' as check_description,
    COUNT(DISTINCT entity_id) as count
FROM fact_ads_performance_daily
WHERE date = '2026-02-10'
  AND platform = 'META'
  AND spend > 0;

-- 2. Check if entity_id matches ad_id in fact_creative_assets
SELECT 
    '2. Mapping check: entity_id in fact_daily vs ad_id in creative_assets' as check_description,
    COUNT(DISTINCT f.entity_id) as entity_ids_in_fact_daily,
    COUNT(DISTINCT c.ad_id) as matching_in_creative_assets
FROM fact_ads_performance_daily f
LEFT JOIN fact_creative_assets c ON f.entity_id = c.ad_id
WHERE f.date = '2026-02-10'
  AND f.platform = 'META'
  AND f.spend > 0;

-- 3. List creatives from yesterday NOT in fact_creative_assets
SELECT 
    '3. Entity IDs from yesterday NOT in fact_creative_assets' as check_description,
    entity_id,
    entity_name,
    spend,
    impressions
FROM fact_ads_performance_daily f
WHERE f.date = '2026-02-10'
  AND f.platform = 'META'
  AND f.spend > 0
  AND NOT EXISTS (
      SELECT 1 
      FROM fact_creative_assets c 
      WHERE c.ad_id = f.entity_id
  )
ORDER BY spend DESC
LIMIT 20;

-- 4. Current effective_status distribution in fact_creative_assets
SELECT 
    '4. Current status distribution in fact_creative_assets' as check_description,
    effective_status,
    COUNT(*) as count
FROM fact_creative_assets
GROUP BY effective_status
ORDER BY count DESC;

-- 5. Simulate what the function would do today
WITH reference_window AS (
    SELECT 
        CASE 
            WHEN EXTRACT(DOW FROM CURRENT_DATE) = 1 THEN CURRENT_DATE - INTERVAL '3 days'  -- Monday looks back 3 days
            ELSE CURRENT_DATE - INTERVAL '1 day'  -- Other days look back 1 day
        END as start_window,
        CURRENT_DATE as today
)
SELECT 
    '5. Simulated function result (what would be marked ACTIVE)' as check_description,
    COUNT(DISTINCT entity_id) as would_be_active
FROM fact_ads_performance_daily f,
     reference_window w
WHERE f.date >= w.start_window
  AND f.date < w.today
  AND f.spend > 0;

-- 6. Check for potential platform filtering issue
SELECT 
    '6. Creatives by platform on 2026-02-10' as check_description,
    platform,
    COUNT(DISTINCT entity_id) as count
FROM fact_ads_performance_daily
WHERE date = '2026-02-10'
  AND spend > 0
GROUP BY platform;
