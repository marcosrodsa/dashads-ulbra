-- ============================================================================
-- ROUTINE: UPDATE ACTIVE CREATIVES (STATUS) - V2 (Robust)
-- ============================================================================
-- Changes:
-- 1. Returns JSON instead of VOID (helps n8n confirm success).
-- 2. SECURITY DEFINER: Runs with privileges of the creator (bypasses RLS issues).
-- 3. Set search_path: Good practice for SECURITY DEFINER functions.
-- ============================================================================

-- DROP first to allow return type change (VOID -> JSONB)
DROP FUNCTION IF EXISTS update_active_creatives_status();

CREATE OR REPLACE FUNCTION update_active_creatives_status()
RETURNS jsonb
SECURITY DEFINER -- Run as owner (admin) to ensure permissions
SET search_path = public, extensions -- Safety path
AS $$
DECLARE
    v_reference_date DATE;
    v_start_window DATE;
    v_today DATE := CURRENT_DATE;
    v_dow INTEGER;
    v_updated_count INTEGER;
    v_paused_count INTEGER;
BEGIN
    -- Get Day of Week (0-6)
    v_dow := EXTRACT(DOW FROM v_today);

    -- Logic for Reference Window
    IF v_dow = 1 THEN -- MONDAY (Looking back Fri-Sun)
        v_start_window := v_today - INTERVAL '3 days'; 
    ELSE -- Display (Looking back Yesterday)
        v_start_window := v_today - INTERVAL '1 day';
    END IF;

    -- 1. Reset all to 'PAUSED' first (returning count)
    WITH rows_paused AS (
        UPDATE fact_creative_assets
        SET effective_status = 'PAUSED'
        WHERE effective_status != 'ARCHIVED' OR effective_status IS NULL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_paused_count FROM rows_paused;

    -- 2. Update to 'ACTIVE' if they had spend in the window
    WITH rows_active AS (
        UPDATE fact_creative_assets a
        SET effective_status = 'ACTIVE',
            last_updated = NOW()
        FROM (
            SELECT DISTINCT entity_id 
            FROM fact_ads_performance_daily
            WHERE date >= v_start_window
              AND date < v_today
              AND spend > 0 
        ) p
        WHERE a.ad_id = p.entity_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_updated_count FROM rows_active;

    -- Return success object for n8n
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Status updated successfully',
        'active_count', v_updated_count,
        'paused_count', v_paused_count,
        'window_start', v_start_window
    );

EXCEPTION WHEN OTHERS THEN
    -- Return error object instead of crashing hard
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION update_active_creatives_status() TO service_role;
GRANT EXECUTE ON FUNCTION update_active_creatives_status() TO authenticated;
GRANT EXECUTE ON FUNCTION update_active_creatives_status() TO anon; -- Allow anon if using public API key (optional)
