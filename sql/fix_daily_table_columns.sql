-- ============================================================================
-- MIGRATION: ADD MISSING COLUMNS TO fact_ads_performance_daily
-- ============================================================================
-- Objective: Support Reach, Frequency, and Video percentage metrics (p25-p100)
-- ============================================================================

DO $$
BEGIN
    -- 1. Alcance e Frequência
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'reach') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN reach BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'frequency') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN frequency DECIMAL(10, 4) DEFAULT 0;
    END IF;

    -- 1.1 Clicks (All) e CTR (All)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'clicks_all') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN clicks_all BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'ctr_all') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN ctr_all DECIMAL(10, 4) DEFAULT 0;
    END IF;

    -- 2. Métricas de Vídeo (Contagens Absolutas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'video_3_sec_watched_actions') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN video_3_sec_watched_actions BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'video_p100_watched_actions') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN video_p100_watched_actions BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'video_p25_watched_actions') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN video_p25_watched_actions BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'video_p50_watched_actions') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN video_p50_watched_actions BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'video_p75_watched_actions') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN video_p75_watched_actions BIGINT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_ads_performance_daily' AND column_name = 'video_thru_plays') THEN
        ALTER TABLE fact_ads_performance_daily ADD COLUMN video_thru_plays BIGINT DEFAULT 0;
    END IF;

END $$;

COMMENT ON COLUMN fact_ads_performance_daily.video_3_sec_watched_actions IS 'Mapear de insights->actions onde action_type = video_view';
COMMENT ON COLUMN fact_ads_performance_daily.video_p100_watched_actions IS 'Mapear de insights->video_p100_watched_actions (contagem onde action_type = video_view)';
