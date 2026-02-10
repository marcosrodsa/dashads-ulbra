-- ============================================================================
-- ROUTINE: UPDATE ACTIVE CREATIVES (STATUS)
-- ============================================================================
-- Purpose: Update fact_creative_assets.effective_status based on recent performance.
-- Logic: 
-- 1. Standard: If ad ran yesterday (D-1), it is ACTIVE.
-- 2. Weekend Handling: If today is Monday, we look back at Friday (D-3) 
--    because conversion campaigns might be paused on weekends.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_active_creatives_status()
RETURNS void AS $$
DECLARE
    v_reference_date DATE;
    v_start_window DATE;
    v_today DATE := CURRENT_DATE;
    v_dow INTEGER; -- 0=Sunday, 1=Monday, ..., 6=Saturday
BEGIN
    -- Get Day of Week (0-6)
    v_dow := EXTRACT(DOW FROM v_today);

    -- Logic for Reference Window
    IF v_dow = 1 THEN -- MONDAY
        -- On Monday, we look for activity since Friday
        v_start_window := v_today - INTERVAL '3 days'; -- Friday
    ELSE
        -- Normally, we look for activity yesterday
        v_start_window := v_today - INTERVAL '1 day';
    END IF;

    -- 1. Reset all to 'PAUSED' first (or 'UNKNOWN' if you prefer)
    --    This ensures we catch things that stopped running.
    UPDATE fact_creative_assets
    SET effective_status = 'PAUSED'
    WHERE effective_status != 'ARCHIVED'; -- Don't touch archived if we have that status

    -- 2. Update to 'ACTIVE' if they had spend in the window
    UPDATE fact_creative_assets a
    SET effective_status = 'ACTIVE',
        last_updated = NOW()
    FROM (
        SELECT DISTINCT entity_id 
        FROM fact_ads_performance_daily
        WHERE date >= v_start_window
          AND date < v_today
          AND spend > 0 -- Must have spent money to be active
    ) p
    WHERE a.ad_id = p.entity_id;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION update_active_creatives_status IS 'Atualiza status dos criativos baseado no spend recente (considerando pausa de fim de semana)';

-- Permissions for n8n/API
GRANT EXECUTE ON FUNCTION update_active_creatives_status() TO service_role;
GRANT EXECUTE ON FUNCTION update_active_creatives_status() TO authenticated;
