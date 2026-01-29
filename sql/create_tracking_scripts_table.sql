-- Create table for tracking scripts (GTM, Pixels, Analytics)
CREATE TABLE IF NOT EXISTS public.tracking_scripts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    script_location text NOT NULL CHECK (script_location IN ('HEAD', 'BODY')),
    script_code text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_scripts ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Everyone (authenticated) can READ active scripts to load them
CREATE POLICY "Enable read access for authenticated users" 
ON public.tracking_scripts
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Only Admins can INSERT/UPDATE/DELETE
CREATE POLICY "Enable write access for admins only" 
ON public.tracking_scripts
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
