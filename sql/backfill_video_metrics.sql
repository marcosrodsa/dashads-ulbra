-- ============================================================================
-- SCRIPT: Backfill Video Metrics from raw_data
-- ============================================================================
-- Objective: Populate the dedicated columns from the JSON fields if they are zero/null
-- ============================================================================

UPDATE fact_ads_performance_daily
SET 
    video_3_sec_watched_actions = COALESCE(
        (
            SELECT (elem->>'value')::BIGINT
            FROM jsonb_array_elements(raw_data->'actions') AS elem
            WHERE elem->>'action_type' = 'video_view'
            LIMIT 1
        ), 
        0
    ),
    video_p100_watched_actions = COALESCE(
        (
            SELECT (elem->>'value')::BIGINT
            FROM jsonb_array_elements(raw_data->'video_p100_watched_actions') AS elem
            WHERE elem->>'action_type' = 'video_view'
            LIMIT 1
        ), 
        0
    ),
    video_p75_watched_actions = COALESCE(
        (
            SELECT (elem->>'value')::BIGINT
            FROM jsonb_array_elements(raw_data->'video_p75_watched_actions') AS elem
            WHERE elem->>'action_type' = 'video_view'
            LIMIT 1
        ), 
        0
    ),
    video_p50_watched_actions = COALESCE(
        (
            SELECT (elem->>'value')::BIGINT
            FROM jsonb_array_elements(raw_data->'video_p50_watched_actions') AS elem
            WHERE elem->>'action_type' = 'video_view'
            LIMIT 1
        ), 
        0
    ),
    video_p25_watched_actions = COALESCE(
        (
            SELECT (elem->>'value')::BIGINT
            FROM jsonb_array_elements(raw_data->'video_p25_watched_actions') AS elem
            WHERE elem->>'action_type' = 'video_view'
            LIMIT 1
        ), 
        0
    ),
    -- Clicks (All) e CTR (All) do topo do JSON (Meta Insights v25.0)
    clicks_all = COALESCE(NULLIF(clicks_all, 0), (raw_data->>'clicks')::BIGINT, 0),
    ctr_all = COALESCE(NULLIF(ctr_all, 0), (raw_data->>'ctr')::DECIMAL, 0),
    -- Tenta pegar reach e frequency do raw_data se estiverem nulos
    reach = COALESCE(NULLIF(reach, 0), (raw_data->>'reach')::BIGINT, 0),
    frequency = COALESCE(NULLIF(frequency, 0), (raw_data->>'frequency')::DECIMAL, 0)
WHERE platform = 'META'
  AND (video_3_sec_watched_actions = 0 OR video_3_sec_watched_actions IS NULL OR reach = 0);

-- NOTA: p100 e outros pXX geralmente não vêm no array 'actions', 
-- mas sim como campos diretos. Se o ETL não os estava solicitando,
-- eles não estarão no raw_data original.
