-- ============================================================================
-- MANUAL UPDATE: Sync Active Status for Creatives with Data on 2026-02-10
-- Purpose: Set active status for creatives that had performance logs yesterday.
-- ============================================================================

UPDATE fact_creative_assets
SET effective_status = 'ACTIVE'
WHERE ad_id IN (
    SELECT DISTINCT entity_id 
    FROM fact_ads_performance_daily 
    WHERE date = '2026-02-10'
);

-- OPTIONAL: Set others that didn't run recently to PAUSED (Optional block)
/*
UPDATE fact_creative_assets
SET effective_status = 'PAUSED'
WHERE ad_id NOT IN (
    SELECT DISTINCT entity_id 
    FROM fact_ads_performance_daily 
    WHERE date >= CURRENT_DATE - INTERVAL '2 days'
);
*/
