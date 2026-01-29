-- Enable RLS on the table (good practice to be explicit)
ALTER TABLE public.fact_ads_performance_daily ENABLE ROW LEVEL SECURITY;

-- Remove conflicting policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.fact_ads_performance_daily;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.fact_ads_performance_daily;

-- Create a permissive policy for authenticated users (Traffic Managers/Admins)
CREATE POLICY "Enable read for authenticated" ON public.fact_ads_performance_daily
    FOR SELECT
    TO authenticated
    USING (true);

-- Also fix fact_ads_budget just in case
ALTER TABLE public.fact_ads_budget ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.fact_ads_budget;
CREATE POLICY "Enable read for authenticated" ON public.fact_ads_budget
    FOR SELECT
    TO authenticated
    USING (true);
