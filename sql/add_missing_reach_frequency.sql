-- Add reach and frequency columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_creative_assets' AND column_name = 'reach') THEN
        ALTER TABLE fact_creative_assets ADD COLUMN reach BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fact_creative_assets' AND column_name = 'frequency') THEN
        ALTER TABLE fact_creative_assets ADD COLUMN frequency DECIMAL(10, 4);
    END IF;
END $$;
